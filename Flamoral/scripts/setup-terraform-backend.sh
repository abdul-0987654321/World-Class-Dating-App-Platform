#!/bin/bash
#
# Terraform Backend Setup Script
#
# Sets up Azure Storage backend for Terraform state management.
# Creates:
#   - Resource Group: rg-terraform-state-westus2
#   - Storage Account: sttfstatedatingplatform (with versioning enabled)
#   - Container: tfstate
#   - Enables soft delete and point-in-time recovery
#
# Usage:
#   ./setup-terraform-backend.sh
#   ./setup-terraform-backend.sh --subscription "your-subscription-id"
#

set -euo pipefail

# Default values
RESOURCE_GROUP_NAME="rg-terraform-state-westus2"
STORAGE_ACCOUNT_NAME="sttfstatedatingplatform"
CONTAINER_NAME="tfstate"
LOCATION="westus2"
SUBSCRIPTION_ID="${SUBSCRIPTION_ID:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --subscription)
            SUBSCRIPTION_ID="$2"
            shift 2
            ;;
        --location)
            LOCATION="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --subscription     Azure subscription ID (optional if already set)"
            echo "  --location         Azure region (default: westus2)"
            echo "  -h, --help         Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${CYAN}========================================"
echo "Terraform Backend Setup Script"
echo -e "========================================${NC}"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Azure CLI is not installed. Please install it from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli${NC}"
    exit 1
fi

AZ_VERSION=$(az version --query '"azure-cli"' -o tsv)
echo -e "${GREEN}Azure CLI Version: ${AZ_VERSION}${NC}"

# Check if logged in
echo -e "${YELLOW}Checking Azure login status...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${RED}Not logged in to Azure CLI.${NC}"
    echo -e "${YELLOW}Please run: az login${NC}"
    exit 1
fi

# Set subscription if provided
if [ -n "$SUBSCRIPTION_ID" ]; then
    echo -e "${YELLOW}Setting subscription to: ${SUBSCRIPTION_ID}${NC}"
    az account set --subscription "${SUBSCRIPTION_ID}"
fi

# Verify subscription
CURRENT_SUB=$(az account show --query "name" -o tsv)
CURRENT_SUB_ID=$(az account show --query "id" -o tsv)
echo -e "${GREEN}Current Subscription: ${CURRENT_SUB} (${CURRENT_SUB_ID})${NC}"

# Create Resource Group
echo ""
echo -e "${YELLOW}Creating Resource Group: ${RESOURCE_GROUP_NAME}${NC}"
if az group exists --name "${RESOURCE_GROUP_NAME}" | grep -q "true"; then
    echo -e "${GREEN}Resource Group already exists.${NC}"
else
    az group create \
        --name "${RESOURCE_GROUP_NAME}" \
        --location "${LOCATION}" \
        --tags "Purpose=TerraformState" "Project=DatingPlatform" "ManagedBy=Terraform" \
        --output none
    echo -e "${GREEN}Resource Group created successfully.${NC}"
fi

# Create Storage Account
echo ""
echo -e "${YELLOW}Creating Storage Account: ${STORAGE_ACCOUNT_NAME}${NC}"
if az storage account show --name "${STORAGE_ACCOUNT_NAME}" --resource-group "${RESOURCE_GROUP_NAME}" &> /dev/null; then
    echo -e "${GREEN}Storage Account already exists.${NC}"
else
    az storage account create \
        --name "${STORAGE_ACCOUNT_NAME}" \
        --resource-group "${RESOURCE_GROUP_NAME}" \
        --location "${LOCATION}" \
        --sku "Standard_GRS" \
        --kind "StorageV2" \
        --access-tier "Hot" \
        --https-only true \
        --min-tls-version "TLS1_2" \
        --allow-blob-public-access false \
        --tags "Purpose=TerraformState" "Project=DatingPlatform" "ManagedBy=Terraform" \
        --output none
    echo -e "${GREEN}Storage Account created successfully.${NC}"
fi

# Enable blob versioning
echo ""
echo -e "${YELLOW}Enabling blob versioning...${NC}"
az storage account blob-service-properties update \
    --account-name "${STORAGE_ACCOUNT_NAME}" \
    --resource-group "${RESOURCE_GROUP_NAME}" \
    --enable-versioning true \
    --output none
echo -e "${GREEN}Blob versioning enabled.${NC}"

# Enable soft delete for blobs
echo ""
echo -e "${YELLOW}Enabling soft delete for blobs (30 days retention)...${NC}"
az storage account blob-service-properties update \
    --account-name "${STORAGE_ACCOUNT_NAME}" \
    --resource-group "${RESOURCE_GROUP_NAME}" \
    --enable-delete-retention true \
    --delete-retention-days 30 \
    --output none
echo -e "${GREEN}Blob soft delete enabled.${NC}"

# Enable soft delete for containers
echo ""
echo -e "${YELLOW}Enabling soft delete for containers (30 days retention)...${NC}"
az storage account blob-service-properties update \
    --account-name "${STORAGE_ACCOUNT_NAME}" \
    --resource-group "${RESOURCE_GROUP_NAME}" \
    --enable-container-delete-retention true \
    --container-delete-retention-days 30 \
    --output none
echo -e "${GREEN}Container soft delete enabled.${NC}"

# Get storage account key
STORAGE_KEY=$(az storage account keys list \
    --account-name "${STORAGE_ACCOUNT_NAME}" \
    --resource-group "${RESOURCE_GROUP_NAME}" \
    --query "[0].value" \
    --output tsv)

# Create container
echo ""
echo -e "${YELLOW}Creating blob container: ${CONTAINER_NAME}${NC}"
CONTAINER_EXISTS=$(az storage container exists \
    --name "${CONTAINER_NAME}" \
    --account-name "${STORAGE_ACCOUNT_NAME}" \
    --account-key "${STORAGE_KEY}" \
    --query "exists" \
    --output tsv)

if [ "${CONTAINER_EXISTS}" == "true" ]; then
    echo -e "${GREEN}Container already exists.${NC}"
else
    az storage container create \
        --name "${CONTAINER_NAME}" \
        --account-name "${STORAGE_ACCOUNT_NAME}" \
        --account-key "${STORAGE_KEY}" \
        --output none
    echo -e "${GREEN}Container created successfully.${NC}"
fi

# Enable resource lock to prevent accidental deletion
echo ""
echo -e "${YELLOW}Creating delete lock on Resource Group...${NC}"
if az lock show --name "DoNotDelete" --resource-group "${RESOURCE_GROUP_NAME}" &> /dev/null; then
    echo -e "${GREEN}Delete lock already exists.${NC}"
else
    az lock create \
        --name "DoNotDelete" \
        --resource-group "${RESOURCE_GROUP_NAME}" \
        --lock-type CanNotDelete \
        --notes "Protects Terraform state storage from accidental deletion" \
        --output none
    echo -e "${GREEN}Delete lock created.${NC}"
fi

# Output summary
echo ""
echo -e "${CYAN}========================================"
echo "Setup Complete!"
echo -e "========================================${NC}"
echo ""
echo -e "${YELLOW}Backend Configuration Details:${NC}"
echo "  Resource Group:    ${RESOURCE_GROUP_NAME}"
echo "  Storage Account:   ${STORAGE_ACCOUNT_NAME}"
echo "  Container:         ${CONTAINER_NAME}"
echo "  Location:          ${LOCATION}"
echo ""
echo -e "${YELLOW}Use these values in your Terraform backend configuration:${NC}"
cat << EOF
terraform {
  backend "azurerm" {
    resource_group_name  = "${RESOURCE_GROUP_NAME}"
    storage_account_name = "${STORAGE_ACCOUNT_NAME}"
    container_name       = "${CONTAINER_NAME}"
    key                  = "terraform.tfstate"
  }
}
EOF

echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Ensure you have authenticated to Azure (az login)"
echo "2. Initialize Terraform in your environment directory"
echo "3. Run 'terraform plan' to verify configuration"
echo ""
echo -e "${YELLOW}To verify the resources exist, run:${NC}"
echo "  az group show --name ${RESOURCE_GROUP_NAME}"
echo "  az storage account show --name ${STORAGE_ACCOUNT_NAME} --resource-group ${RESOURCE_GROUP_NAME}"
echo "  az storage container list --account-name ${STORAGE_ACCOUNT_NAME} --auth-mode login"
echo ""
