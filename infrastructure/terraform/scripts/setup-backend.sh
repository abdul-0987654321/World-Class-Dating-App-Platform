#!/bin/bash
# =============================================================================
# Flamoral Dating Platform - Terraform Backend Setup Script
# =============================================================================
# This script creates the Azure Storage Account required for Terraform state
# Run this ONCE before initializing Terraform
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP_NAME="flamoral-tfstate-rg"
STORAGE_ACCOUNT_NAME="flamoraltfstatedev"
CONTAINER_NAME="tfstate"
LOCATION="westus2"

# Service Principal Info
SP_NAME="terraform-datingapp-sp"
SP_CLIENT_ID="a85e4029-4e37-4399-9390-6e18922b38e7"
SUBSCRIPTION_ID="ba233460-2dbe-4603-a594-68f93ec9deb3"

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}  Flamoral Terraform Backend Setup${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI is not installed.${NC}"
    echo "Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in
echo -e "${YELLOW}Checking Azure CLI login status...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${RED}Error: Not logged into Azure CLI.${NC}"
    echo "Please run: az login"
    exit 1
fi

# Set subscription
echo -e "${YELLOW}Setting subscription to: ${SUBSCRIPTION_ID}${NC}"
az account set --subscription "$SUBSCRIPTION_ID"

# Create resource group
echo -e "${YELLOW}Creating resource group: ${RESOURCE_GROUP_NAME}${NC}"
if az group show --name "$RESOURCE_GROUP_NAME" &> /dev/null; then
    echo -e "${GREEN}Resource group already exists.${NC}"
else
    az group create \
        --name "$RESOURCE_GROUP_NAME" \
        --location "$LOCATION" \
        --tags Project=Flamoral ManagedBy=Terraform Purpose="Terraform State Storage"
    echo -e "${GREEN}Resource group created successfully.${NC}"
fi

# Create storage account
echo -e "${YELLOW}Creating storage account: ${STORAGE_ACCOUNT_NAME}${NC}"
if az storage account show --name "$STORAGE_ACCOUNT_NAME" --resource-group "$RESOURCE_GROUP_NAME" &> /dev/null; then
    echo -e "${GREEN}Storage account already exists.${NC}"
else
    az storage account create \
        --name "$STORAGE_ACCOUNT_NAME" \
        --resource-group "$RESOURCE_GROUP_NAME" \
        --location "$LOCATION" \
        --sku Standard_LRS \
        --kind StorageV2 \
        --https-only true \
        --allow-blob-public-access false \
        --min-tls-version TLS1_2 \
        --tags Project=Flamoral ManagedBy=Terraform Purpose="Terraform State Storage"
    echo -e "${GREEN}Storage account created successfully.${NC}"
fi

# Get storage account key
echo -e "${YELLOW}Getting storage account key...${NC}"
STORAGE_KEY=$(az storage account keys list \
    --account-name "$STORAGE_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP_NAME" \
    --query "[0].value" \
    --output tsv)

# Create blob container
echo -e "${YELLOW}Creating blob container: ${CONTAINER_NAME}${NC}"
if az storage container show --name "$CONTAINER_NAME" --account-name "$STORAGE_ACCOUNT_NAME" --account-key "$STORAGE_KEY" &> /dev/null; then
    echo -e "${GREEN}Container already exists.${NC}"
else
    az storage container create \
        --name "$CONTAINER_NAME" \
        --account-name "$STORAGE_ACCOUNT_NAME" \
        --account-key "$STORAGE_KEY"
    echo -e "${GREEN}Container created successfully.${NC}"
fi

# Enable versioning for state recovery
echo -e "${YELLOW}Enabling blob versioning...${NC}"
az storage account blob-service-properties update \
    --account-name "$STORAGE_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP_NAME" \
    --enable-versioning true &> /dev/null || true

# Grant Service Principal access
echo -e "${YELLOW}Granting Service Principal access to storage account...${NC}"
STORAGE_ACCOUNT_ID=$(az storage account show \
    --name "$STORAGE_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP_NAME" \
    --query id \
    --output tsv)

# Check if role assignment exists
if az role assignment list \
    --assignee "$SP_CLIENT_ID" \
    --scope "$STORAGE_ACCOUNT_ID" \
    --role "Storage Blob Data Contributor" \
    --query "[0].id" \
    --output tsv &> /dev/null; then
    echo -e "${GREEN}Role assignment already exists.${NC}"
else
    az role assignment create \
        --assignee "$SP_CLIENT_ID" \
        --role "Storage Blob Data Contributor" \
        --scope "$STORAGE_ACCOUNT_ID" &> /dev/null || echo -e "${YELLOW}Warning: Could not create role assignment. You may need to do this manually.${NC}"
fi

echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  Backend Setup Complete!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "${BLUE}Backend Configuration:${NC}"
echo "  Resource Group:  $RESOURCE_GROUP_NAME"
echo "  Storage Account: $STORAGE_ACCOUNT_NAME"
echo "  Container:       $CONTAINER_NAME"
echo "  Location:        $LOCATION"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Set the following environment variables:"
echo ""
echo "   export ARM_CLIENT_ID=\"$SP_CLIENT_ID\""
echo "   export ARM_CLIENT_SECRET=\"<your-service-principal-secret>\""
echo "   export ARM_TENANT_ID=\"<your-tenant-id>\""
echo "   export ARM_SUBSCRIPTION_ID=\"$SUBSCRIPTION_ID\""
echo ""
echo "2. Navigate to the environment directory:"
echo "   cd infrastructure/terraform/environments/dating-dev"
echo ""
echo "3. Initialize Terraform:"
echo "   terraform init"
echo ""
echo "4. Plan and apply:"
echo "   terraform plan"
echo "   terraform apply"
echo ""
