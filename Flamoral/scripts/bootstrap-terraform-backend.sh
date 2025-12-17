#!/bin/bash
# =============================================================================
# Bootstrap Terraform Backend - Manual Script
# =============================================================================
# Run this script if the Azure DevOps pipeline cannot create the backend
# Requires: Azure CLI installed and logged in with appropriate permissions
# Usage: ./bootstrap-terraform-backend.sh
# =============================================================================

set -e  # Exit on error

RESOURCE_GROUP="flamoral-terraform-state-rg"
STORAGE_ACCOUNT="flamoraltfstate"
CONTAINER="tfstate"
LOCATION="eastus"

echo "============================================="
echo "Terraform Backend Bootstrap Script"
echo "============================================="
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "ERROR: Azure CLI is not installed!"
    echo "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in
if ! az account show &> /dev/null; then
    echo "Not logged in to Azure. Running 'az login'..."
    az login
fi

ACCOUNT=$(az account show -o json)
echo "Logged in as: $(echo $ACCOUNT | jq -r '.user.name')"
echo "Subscription: $(echo $ACCOUNT | jq -r '.name') ($(echo $ACCOUNT | jq -r '.id'))"
echo ""

# Create Resource Group
echo "Step 1: Creating Resource Group..."
if az group exists --name "$RESOURCE_GROUP" | grep -q "true"; then
    echo "  Resource Group already exists"
else
    az group create \
        --name "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --tags Purpose=TerraformState Project=Flamoral ManagedBy=Terraform
    echo "  Resource Group created"
fi

# Create Storage Account
echo ""
echo "Step 2: Creating Storage Account..."
if az storage account show --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    echo "  Storage Account already exists"
else
    az storage account create \
        --name "$STORAGE_ACCOUNT" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --sku Standard_LRS \
        --kind StorageV2 \
        --https-only true \
        --min-tls-version TLS1_2 \
        --allow-blob-public-access false \
        --tags Purpose=TerraformState Project=Flamoral ManagedBy=Terraform
    echo "  Storage Account created"
fi

# Create Blob Container
echo ""
echo "Step 3: Creating Blob Container..."
STORAGE_KEY=$(az storage account keys list \
    --resource-group "$RESOURCE_GROUP" \
    --account-name "$STORAGE_ACCOUNT" \
    --query '[0].value' -o tsv)

if az storage container exists \
    --name "$CONTAINER" \
    --account-name "$STORAGE_ACCOUNT" \
    --account-key "$STORAGE_KEY" \
    --query exists -o tsv | grep -q "true"; then
    echo "  Blob Container already exists"
else
    az storage container create \
        --name "$CONTAINER" \
        --account-name "$STORAGE_ACCOUNT" \
        --account-key "$STORAGE_KEY" \
        --public-access off
    echo "  Blob Container created"
fi

# Verify
echo ""
echo "============================================="
echo "Terraform Backend Created Successfully!"
echo "============================================="
echo ""
echo "Resource Group:   $RESOURCE_GROUP"
echo "Storage Account:  $STORAGE_ACCOUNT"
echo "Container:        $CONTAINER"
echo "Location:         $LOCATION"
echo ""
echo "Backend Configuration for Terraform:"
echo ""
echo 'terraform {'
echo '  backend "azurerm" {'
echo "    resource_group_name  = \"$RESOURCE_GROUP\""
echo "    storage_account_name = \"$STORAGE_ACCOUNT\""
echo "    container_name       = \"$CONTAINER\""
echo '    key                  = "flamoral-dev.tfstate"'
echo '  }'
echo '}'
echo ""
echo "You can now run the Infrastructure pipeline!"
