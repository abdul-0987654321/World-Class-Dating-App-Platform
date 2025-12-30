#!/bin/bash
# =============================================================================
# Terraform Backend Bootstrap Script
# =============================================================================
# This script creates the Azure Storage Account and Container needed for
# Terraform remote state storage. Run this before your first terraform init.
#
# Usage:
#   ./bootstrap-backend.sh <environment>
#
# Example:
#   ./bootstrap-backend.sh dev
# =============================================================================

set -e

ENVIRONMENT=${1:-dev}
LOCATION=${LOCATION:-eastus}

# Backend configuration
RESOURCE_GROUP="flamoral-terraform-state-rg"
STORAGE_ACCOUNT="flamoraltfstate"
CONTAINER_NAME="tfstate"

echo "=========================================="
echo "Terraform Backend Bootstrap"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "Resource Group: $RESOURCE_GROUP"
echo "Storage Account: $STORAGE_ACCOUNT"
echo "Container: $CONTAINER_NAME"
echo "Location: $LOCATION"
echo "=========================================="

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "ERROR: Azure CLI is not installed."
    echo "Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in
echo "Checking Azure CLI authentication..."
if ! az account show &> /dev/null; then
    echo "ERROR: Not logged into Azure. Please run 'az login' first."
    exit 1
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "Using subscription: $SUBSCRIPTION_ID"

# Create resource group if it doesn't exist
echo ""
echo "Creating resource group..."
if az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    echo "Resource group '$RESOURCE_GROUP' already exists"
else
    az group create \
        --name "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --tags "Purpose=TerraformState" "ManagedBy=Bootstrap" "Project=Flamoral"
    echo "Resource group '$RESOURCE_GROUP' created successfully"
fi

# Create storage account if it doesn't exist
echo ""
echo "Creating storage account..."
if az storage account show --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    echo "Storage account '$STORAGE_ACCOUNT' already exists"
else
    az storage account create \
        --name "$STORAGE_ACCOUNT" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --sku Standard_LRS \
        --encryption-services blob \
        --https-only true \
        --min-tls-version TLS1_2 \
        --allow-blob-public-access false \
        --tags "Purpose=TerraformState" "ManagedBy=Bootstrap" "Project=Flamoral"
    echo "Storage account '$STORAGE_ACCOUNT' created successfully"
fi

# Enable versioning on the storage account
echo ""
echo "Enabling blob versioning..."
az storage account blob-service-properties update \
    --account-name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --enable-versioning true

# Get storage account key
STORAGE_KEY=$(az storage account keys list \
    --resource-group "$RESOURCE_GROUP" \
    --account-name "$STORAGE_ACCOUNT" \
    --query '[0].value' -o tsv)

# Create container if it doesn't exist
echo ""
echo "Creating storage container..."
if az storage container show \
    --name "$CONTAINER_NAME" \
    --account-name "$STORAGE_ACCOUNT" \
    --account-key "$STORAGE_KEY" &> /dev/null; then
    echo "Container '$CONTAINER_NAME' already exists"
else
    az storage container create \
        --name "$CONTAINER_NAME" \
        --account-name "$STORAGE_ACCOUNT" \
        --account-key "$STORAGE_KEY" \
        --public-access off
    echo "Container '$CONTAINER_NAME' created successfully"
fi

# Enable soft delete for containers
echo ""
echo "Enabling soft delete for containers (7 days retention)..."
az storage account blob-service-properties update \
    --account-name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --enable-container-delete-retention true \
    --container-delete-retention-days 7

echo ""
echo "=========================================="
echo "Bootstrap Complete!"
echo "=========================================="
echo ""
echo "Backend configuration for terraform:"
echo "  resource_group_name  = \"$RESOURCE_GROUP\""
echo "  storage_account_name = \"$STORAGE_ACCOUNT\""
echo "  container_name       = \"$CONTAINER_NAME\""
echo "  key                  = \"flamoral-$ENVIRONMENT.tfstate\""
echo ""
echo "You can now run 'terraform init' with these backend settings."
echo "=========================================="
