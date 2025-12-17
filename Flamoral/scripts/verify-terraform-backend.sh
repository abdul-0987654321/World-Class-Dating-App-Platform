#!/bin/bash
#
# Verify Terraform Backend Resources
#
# This script checks if the Azure Storage backend resources exist:
#   - Resource Group: rg-terraform-state-westus2
#   - Storage Account: sttfstatedatingplatform
#   - Container: tfstate
#
# Usage:
#   ./verify-terraform-backend.sh
#

set -euo pipefail

# Configuration
RESOURCE_GROUP_NAME="rg-terraform-state-westus2"
STORAGE_ACCOUNT_NAME="sttfstatedatingplatform"
CONTAINER_NAME="tfstate"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================"
echo "Terraform Backend Verification"
echo -e "========================================${NC}"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Azure CLI is not installed.${NC}"
    echo "Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in
echo -e "${YELLOW}Checking Azure login status...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${RED}Not logged in to Azure CLI.${NC}"
    echo -e "${YELLOW}Please run: az login${NC}"
    exit 1
fi

# Get current subscription
CURRENT_SUB=$(az account show --query "name" -o tsv)
CURRENT_SUB_ID=$(az account show --query "id" -o tsv)
echo -e "${GREEN}Current Subscription: ${CURRENT_SUB} (${CURRENT_SUB_ID})${NC}"
echo ""

# Initialize status flags
ALL_EXIST=true

# Check Resource Group
echo -e "${YELLOW}Checking Resource Group: ${RESOURCE_GROUP_NAME}${NC}"
if az group show --name "${RESOURCE_GROUP_NAME}" &> /dev/null; then
    LOCATION=$(az group show --name "${RESOURCE_GROUP_NAME}" --query location -o tsv)
    echo -e "${GREEN}✓ Resource Group exists${NC}"
    echo "  Location: ${LOCATION}"
else
    echo -e "${RED}✗ Resource Group does NOT exist${NC}"
    ALL_EXIST=false
fi

echo ""

# Check Storage Account
echo -e "${YELLOW}Checking Storage Account: ${STORAGE_ACCOUNT_NAME}${NC}"
if az storage account show --name "${STORAGE_ACCOUNT_NAME}" --resource-group "${RESOURCE_GROUP_NAME}" &> /dev/null; then
    echo -e "${GREEN}✓ Storage Account exists${NC}"

    # Get storage account properties
    SA_LOCATION=$(az storage account show --name "${STORAGE_ACCOUNT_NAME}" --resource-group "${RESOURCE_GROUP_NAME}" --query location -o tsv)
    SA_SKU=$(az storage account show --name "${STORAGE_ACCOUNT_NAME}" --resource-group "${RESOURCE_GROUP_NAME}" --query sku.name -o tsv)
    SA_KIND=$(az storage account show --name "${STORAGE_ACCOUNT_NAME}" --resource-group "${RESOURCE_GROUP_NAME}" --query kind -o tsv)

    echo "  Location: ${SA_LOCATION}"
    echo "  SKU: ${SA_SKU}"
    echo "  Kind: ${SA_KIND}"

    # Check versioning
    VERSIONING=$(az storage account blob-service-properties show \
        --account-name "${STORAGE_ACCOUNT_NAME}" \
        --resource-group "${RESOURCE_GROUP_NAME}" \
        --query isVersioningEnabled \
        -o tsv 2>/dev/null || echo "false")

    if [ "${VERSIONING}" == "true" ]; then
        echo -e "  ${GREEN}✓ Versioning: Enabled${NC}"
    else
        echo -e "  ${YELLOW}⚠ Versioning: Disabled${NC}"
    fi

else
    echo -e "${RED}✗ Storage Account does NOT exist${NC}"
    ALL_EXIST=false
fi

echo ""

# Check Container
echo -e "${YELLOW}Checking Container: ${CONTAINER_NAME}${NC}"
if [ "$ALL_EXIST" == "true" ]; then
    # Get storage account key
    STORAGE_KEY=$(az storage account keys list \
        --account-name "${STORAGE_ACCOUNT_NAME}" \
        --resource-group "${RESOURCE_GROUP_NAME}" \
        --query "[0].value" \
        --output tsv 2>/dev/null)

    if [ -n "$STORAGE_KEY" ]; then
        CONTAINER_EXISTS=$(az storage container exists \
            --name "${CONTAINER_NAME}" \
            --account-name "${STORAGE_ACCOUNT_NAME}" \
            --account-key "${STORAGE_KEY}" \
            --query "exists" \
            --output tsv 2>/dev/null || echo "false")

        if [ "${CONTAINER_EXISTS}" == "true" ]; then
            echo -e "${GREEN}✓ Container exists${NC}"
        else
            echo -e "${RED}✗ Container does NOT exist${NC}"
            ALL_EXIST=false
        fi
    else
        echo -e "${YELLOW}⚠ Could not retrieve storage account key${NC}"
        ALL_EXIST=false
    fi
else
    echo -e "${YELLOW}⚠ Skipping container check (prerequisite resources missing)${NC}"
fi

echo ""

# Check for resource lock
if [ "$ALL_EXIST" == "true" ]; then
    echo -e "${YELLOW}Checking Resource Lock...${NC}"
    if az lock show --name "DoNotDelete" --resource-group "${RESOURCE_GROUP_NAME}" &> /dev/null; then
        echo -e "${GREEN}✓ Delete lock exists${NC}"
    else
        echo -e "${YELLOW}⚠ Delete lock not found${NC}"
    fi
    echo ""
fi

# Summary
echo -e "${CYAN}========================================"
echo "Summary"
echo -e "========================================${NC}"
echo ""

if [ "$ALL_EXIST" == "true" ]; then
    echo -e "${GREEN}✓ All Terraform backend resources exist!${NC}"
    echo ""
    echo -e "${CYAN}Backend Configuration:${NC}"
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
    echo -e "${GREEN}You can now run 'terraform init' to initialize Terraform with this backend.${NC}"
else
    echo -e "${RED}✗ One or more backend resources are missing!${NC}"
    echo ""
    echo -e "${YELLOW}To create the missing resources, run:${NC}"
    echo "  ./scripts/setup-terraform-backend.sh"
    echo ""
    exit 1
fi
