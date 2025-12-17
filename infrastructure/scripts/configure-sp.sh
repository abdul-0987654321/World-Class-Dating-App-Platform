#!/bin/bash
#
# Service Principal Configuration Script
#
# Configures the service principal for Terraform authentication.
#
# Usage:
#   ./configure-sp.sh
#   ./configure-sp.sh --create-new
#   ./configure-sp.sh --sp-name "my-terraform-sp"
#

set -euo pipefail

# Default values
SERVICE_PRINCIPAL_NAME="${SERVICE_PRINCIPAL_NAME:-applyplatform-terraform-sp}"
SUBSCRIPTION_ID="${SUBSCRIPTION_ID:-ebd1613e-fea0-4b6d-8918-7e4de6a71c44}"
TENANT_DOMAIN="${TENANT_DOMAIN:-citadelcloudmanagementgmail.onmicrosoft.com}"
CREATE_NEW=false
SET_ENV_VARS=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --sp-name)
            SERVICE_PRINCIPAL_NAME="$2"
            shift 2
            ;;
        --subscription)
            SUBSCRIPTION_ID="$2"
            shift 2
            ;;
        --create-new)
            CREATE_NEW=true
            shift
            ;;
        --set-env)
            SET_ENV_VARS=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --sp-name        Service principal name (default: applyplatform-terraform-sp)"
            echo "  --subscription   Azure subscription ID"
            echo "  --create-new     Create new credentials even if SP exists"
            echo "  --set-env        Export environment variables"
            echo "  -h, --help       Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${CYAN}========================================"
echo "Service Principal Configuration Script"
echo -e "========================================${NC}"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Azure CLI is not installed. Please install it from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli${NC}"
    exit 1
fi

# Check login status
echo -e "${YELLOW}Checking Azure login status...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}Not logged in. Initiating login...${NC}"
    az login --tenant "${TENANT_DOMAIN}"
fi

# Set subscription
az account set --subscription "${SUBSCRIPTION_ID}"
TENANT_ID=$(az account show --query "tenantId" --output tsv)

echo -e "${GREEN}Subscription: ${SUBSCRIPTION_ID}${NC}"
echo -e "${GREEN}Tenant ID: ${TENANT_ID}${NC}"
echo ""

# Check if service principal exists
echo -e "${YELLOW}Checking for existing service principal: ${SERVICE_PRINCIPAL_NAME}${NC}"
SP_APP_ID=$(az ad sp list --display-name "${SERVICE_PRINCIPAL_NAME}" --query "[0].appId" --output tsv 2>/dev/null || echo "")

if [ -n "${SP_APP_ID}" ] && [ "${CREATE_NEW}" = false ]; then
    SP_OBJECT_ID=$(az ad sp list --display-name "${SERVICE_PRINCIPAL_NAME}" --query "[0].id" --output tsv)

    echo -e "${GREEN}Service Principal found!${NC}"
    echo -e "${CYAN}  App ID: ${SP_APP_ID}${NC}"
    echo -e "${CYAN}  Object ID: ${SP_OBJECT_ID}${NC}"

    CLIENT_ID="${SP_APP_ID}"

    echo ""
    echo -e "${YELLOW}NOTE: Cannot retrieve existing client secret.${NC}"
    echo -e "${YELLOW}If you need a new secret, run with --create-new flag or create manually:${NC}"
    echo -e "  az ad sp credential reset --id ${CLIENT_ID}"
else
    echo -e "${YELLOW}Creating new service principal...${NC}"

    SP_OUTPUT=$(az ad sp create-for-rbac \
        --name "${SERVICE_PRINCIPAL_NAME}" \
        --role "Contributor" \
        --scopes "/subscriptions/${SUBSCRIPTION_ID}" \
        --output json)

    CLIENT_ID=$(echo "${SP_OUTPUT}" | jq -r '.appId')
    CLIENT_SECRET=$(echo "${SP_OUTPUT}" | jq -r '.password')

    echo -e "${GREEN}Service Principal created!${NC}"
    echo ""
    echo -e "${RED}IMPORTANT: Save these credentials securely!${NC}"
    echo -e "${RED}========================================${NC}"
    echo -e "${YELLOW}  Client ID:     ${CLIENT_ID}${NC}"
    echo -e "${YELLOW}  Client Secret: ${CLIENT_SECRET}${NC}"
    echo -e "${YELLOW}  Tenant ID:     ${TENANT_ID}${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
fi

# Assign additional roles
echo -e "${YELLOW}Assigning RBAC roles...${NC}"

ROLES=("Key Vault Administrator" "Storage Blob Data Contributor" "User Access Administrator")

for ROLE in "${ROLES[@]}"; do
    echo -e "${CYAN}  Assigning role: ${ROLE}${NC}"
    if az role assignment create \
        --assignee "${CLIENT_ID}" \
        --role "${ROLE}" \
        --scope "/subscriptions/${SUBSCRIPTION_ID}" \
        --output none 2>/dev/null; then
        echo -e "${GREEN}    Assigned successfully${NC}"
    else
        echo -e "${YELLOW}    Role may already be assigned or insufficient permissions${NC}"
    fi
done

# Set environment variables if requested or if we have a new secret
if [ "${SET_ENV_VARS}" = true ] || [ -n "${CLIENT_SECRET:-}" ]; then
    echo ""
    echo -e "${YELLOW}Setting environment variables for current session...${NC}"

    export ARM_CLIENT_ID="${CLIENT_ID}"
    export ARM_SUBSCRIPTION_ID="${SUBSCRIPTION_ID}"
    export ARM_TENANT_ID="${TENANT_ID}"

    if [ -n "${CLIENT_SECRET:-}" ]; then
        export ARM_CLIENT_SECRET="${CLIENT_SECRET}"
    fi

    echo -e "${GREEN}Environment variables set:${NC}"
    echo "  ARM_CLIENT_ID = ${ARM_CLIENT_ID}"
    echo "  ARM_SUBSCRIPTION_ID = ${ARM_SUBSCRIPTION_ID}"
    echo "  ARM_TENANT_ID = ${ARM_TENANT_ID}"
    if [ -n "${CLIENT_SECRET:-}" ]; then
        echo "  ARM_CLIENT_SECRET = [REDACTED]"
    fi
fi

# Output configuration for Azure DevOps
echo ""
echo -e "${CYAN}========================================"
echo "Azure DevOps Variable Group Configuration"
echo -e "========================================${NC}"
echo ""
echo -e "${YELLOW}Add these to your Azure DevOps variable groups:${NC}"
echo ""
echo "Variable Group: datingplatform-terraform-common"
echo "  ARM_SUBSCRIPTION_ID: ${SUBSCRIPTION_ID}"
echo "  ARM_TENANT_ID: ${TENANT_ID}"
echo "  TERRAFORM_STORAGE_ACCOUNT: sttfstatedatingplatform"
echo "  TERRAFORM_CONTAINER_NAME: tfstate"
echo "  TERRAFORM_RESOURCE_GROUP: rg-terraform-state-westus2"
echo ""
echo "Variable Group: datingplatform-terraform-<env>"
echo "  ARM_CLIENT_ID: ${CLIENT_ID}"
echo "  ARM_CLIENT_SECRET: <secret - mark as secret variable>"
echo ""

# Output for local development
echo -e "${CYAN}========================================"
echo "Local Development Setup"
echo -e "========================================${NC}"
echo ""
echo -e "${YELLOW}Add to your shell profile or .env file:${NC}"
echo ""
cat << EOF
export ARM_CLIENT_ID="${CLIENT_ID}"
export ARM_CLIENT_SECRET="<your-client-secret>"
export ARM_SUBSCRIPTION_ID="${SUBSCRIPTION_ID}"
export ARM_TENANT_ID="${TENANT_ID}"
EOF

echo ""
echo -e "${GREEN}Configuration complete!${NC}"
