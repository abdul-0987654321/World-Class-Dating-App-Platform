#!/bin/bash
################################################################################
# Azure DevOps Variable Group Creation Script
# Purpose: Create variable groups linked to Azure Key Vault
# Usage: ./create-azure-variable-groups.sh
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Configuration - UPDATE THESE VALUES
AZURE_DEVOPS_ORG="https://dev.azure.com/yourorg"
AZURE_DEVOPS_PROJECT="dating-app"
AZURE_SUBSCRIPTION_ID="your-subscription-id"
SERVICE_ENDPOINT_NAME="Azure-Production-ServiceConnection"

print_info "=========================================="
print_info "Azure DevOps Variable Group Setup"
print_info "=========================================="
print_info "Organization: $AZURE_DEVOPS_ORG"
print_info "Project: $AZURE_DEVOPS_PROJECT"
print_info "=========================================="

# Check Azure DevOps CLI extension
if ! az extension show --name azure-devops &> /dev/null; then
    print_info "Installing Azure DevOps CLI extension..."
    az extension add --name azure-devops --yes
fi

# Login to Azure DevOps
print_info "Configuring Azure DevOps defaults..."
az devops configure --defaults organization="$AZURE_DEVOPS_ORG" project="$AZURE_DEVOPS_PROJECT"

# Function to create variable group
create_variable_group() {
    local group_name=$1
    local description=$2
    local key_vault_name=$3

    print_info ""
    print_info "Creating variable group: $group_name"

    # Check if variable group already exists
    if az pipelines variable-group list --query "[?name=='$group_name']" -o tsv | grep -q .; then
        print_warning "Variable group '$group_name' already exists. Skipping..."
        return
    fi

    # Create variable group
    GROUP_ID=$(az pipelines variable-group create \
        --name "$group_name" \
        --description "$description" \
        --authorize true \
        --query "id" -o tsv)

    if [ -n "$GROUP_ID" ]; then
        print_success "Created variable group: $group_name (ID: $GROUP_ID)"

        # Link to Key Vault if specified
        if [ -n "$key_vault_name" ]; then
            print_info "Linking to Key Vault: $key_vault_name"

            # Note: Azure CLI doesn't support linking to Key Vault directly
            # This must be done via Azure DevOps UI or REST API
            print_warning "Please manually link this variable group to Key Vault:"
            print_warning "1. Go to: $AZURE_DEVOPS_ORG/$AZURE_DEVOPS_PROJECT/_library?itemType=VariableGroups&view=VariableGroupView&variableGroupId=$GROUP_ID"
            print_warning "2. Click 'Link secrets from an Azure key vault as variables'"
            print_warning "3. Select subscription and Key Vault: $key_vault_name"
            print_warning "4. Add required secrets"
        fi
    else
        print_error "Failed to create variable group: $group_name"
    fi
}

# Function to add non-secret variables
add_variable() {
    local group_name=$1
    local var_name=$2
    local var_value=$3
    local is_secret=$4

    print_info "Adding variable: $var_name to $group_name"

    if [ "$is_secret" = "true" ]; then
        az pipelines variable-group variable create \
            --group-name "$group_name" \
            --name "$var_name" \
            --value "$var_value" \
            --secret true \
            --output none
    else
        az pipelines variable-group variable create \
            --group-name "$group_name" \
            --name "$var_name" \
            --value "$var_value" \
            --output none
    fi
}

# Create Common Secrets Variable Group
print_info ""
print_info "=========================================="
print_info "Creating common-secrets variable group"
print_info "=========================================="

create_variable_group \
    "common-secrets" \
    "Shared secrets across all environments" \
    "dating-app-common-kv"

# Add non-secret variables to common-secrets
GROUP_NAME="common-secrets"
if az pipelines variable-group list --query "[?name=='$GROUP_NAME']" -o tsv | grep -q .; then
    print_info "Adding non-secret variables to common-secrets..."

    add_variable "$GROUP_NAME" "DOCKER_USERNAME" "citadelcloud1" "false"
    add_variable "$GROUP_NAME" "TF_STATE_RG" "dating-app-tfstate-rg" "false"
    add_variable "$GROUP_NAME" "TF_STATE_STORAGE" "datingapptfstate" "false"
    add_variable "$GROUP_NAME" "SONAR_HOST_URL" "https://sonarqube.yourcompany.com" "false"

    print_success "Added non-secret variables"
fi

# Create Dev Secrets Variable Group
print_info ""
print_info "=========================================="
print_info "Creating dev-secrets variable group"
print_info "=========================================="

create_variable_group \
    "dev-secrets" \
    "Development environment secrets" \
    "dating-app-dev-kv"

# Add non-secret variables to dev-secrets
GROUP_NAME="dev-secrets"
if az pipelines variable-group list --query "[?name=='$GROUP_NAME']" -o tsv | grep -q .; then
    print_info "Adding non-secret variables to dev-secrets..."

    add_variable "$GROUP_NAME" "DEV_API_URL" "https://api-dev.flamoral.com" "false"
    add_variable "$GROUP_NAME" "DEV_WS_URL" "wss://ws-dev.flamoral.com" "false"
    add_variable "$GROUP_NAME" "DEV_URL" "https://dev.flamoral.com" "false"
    add_variable "$GROUP_NAME" "AZURE_RESOURCE_GROUP" "dating-app-dev-rg" "false"
    add_variable "$GROUP_NAME" "AZURE_AKS_CLUSTER" "dating-app-dev-aks" "false"
    add_variable "$GROUP_NAME" "ACR_NAME" "datingappdevacr" "false"
    add_variable "$GROUP_NAME" "ACR_LOGIN_SERVER" "datingappdevacr.azurecr.io" "false"

    print_success "Added non-secret variables"
fi

# Create Test/Staging Secrets Variable Group
print_info ""
print_info "=========================================="
print_info "Creating test-secrets variable group"
print_info "=========================================="

create_variable_group \
    "test-secrets" \
    "Test/Staging environment secrets" \
    "dating-app-staging-kv"

# Add non-secret variables to test-secrets
GROUP_NAME="test-secrets"
if az pipelines variable-group list --query "[?name=='$GROUP_NAME']" -o tsv | grep -q .; then
    print_info "Adding non-secret variables to test-secrets..."

    add_variable "$GROUP_NAME" "STAGING_API_URL" "https://api-staging.flamoral.com" "false"
    add_variable "$GROUP_NAME" "STAGING_WS_URL" "wss://ws-staging.flamoral.com" "false"
    add_variable "$GROUP_NAME" "STAGING_URL" "https://staging.flamoral.com" "false"
    add_variable "$GROUP_NAME" "AZURE_RESOURCE_GROUP" "dating-app-staging-rg" "false"
    add_variable "$GROUP_NAME" "AZURE_AKS_CLUSTER" "dating-app-staging-aks" "false"
    add_variable "$GROUP_NAME" "AKS_CLUSTER_NAME_STAGING" "dating-app-staging-aks" "false"
    add_variable "$GROUP_NAME" "AKS_RESOURCE_GROUP_STAGING" "dating-app-staging-rg" "false"
    add_variable "$GROUP_NAME" "ACR_NAME" "datingappstagingacr" "false"
    add_variable "$GROUP_NAME" "ACR_LOGIN_SERVER" "datingappstagingacr.azurecr.io" "false"
    add_variable "$GROUP_NAME" "TEST_USER_EMAIL" "test@flamoral.com" "false"

    print_success "Added non-secret variables"
fi

# Create Production Secrets Variable Group
print_info ""
print_info "=========================================="
print_info "Creating prod-secrets variable group"
print_info "=========================================="

create_variable_group \
    "prod-secrets" \
    "Production environment secrets - CRITICAL" \
    "dating-app-prod-kv"

# Add non-secret variables to prod-secrets
GROUP_NAME="prod-secrets"
if az pipelines variable-group list --query "[?name=='$GROUP_NAME']" -o tsv | grep -q .; then
    print_info "Adding non-secret variables to prod-secrets..."

    add_variable "$GROUP_NAME" "PROD_API_URL" "https://api.flamoral.com" "false"
    add_variable "$GROUP_NAME" "PROD_URL" "https://flamoral.com" "false"
    add_variable "$GROUP_NAME" "PROD_CANARY_URL" "https://canary.flamoral.com" "false"
    add_variable "$GROUP_NAME" "AZURE_RESOURCE_GROUP" "dating-app-prod-rg" "false"
    add_variable "$GROUP_NAME" "AZURE_AKS_CLUSTER" "dating-app-prod-aks" "false"
    add_variable "$GROUP_NAME" "AKS_CLUSTER_NAME_PRODUCTION" "dating-app-prod-aks" "false"
    add_variable "$GROUP_NAME" "AKS_RESOURCE_GROUP_PRODUCTION" "dating-app-prod-rg" "false"
    add_variable "$GROUP_NAME" "ACR_NAME" "datingappprodacr" "false"
    add_variable "$GROUP_NAME" "ACR_LOGIN_SERVER" "datingappprodacr.azurecr.io" "false"
    add_variable "$GROUP_NAME" "AZURE_CONTAINER_REGISTRY" "datingappprodacr.azurecr.io" "false"

    print_success "Added non-secret variables"
fi

# Summary
print_info ""
print_info "=========================================="
print_info "Variable Groups Created"
print_info "=========================================="

VARIABLE_GROUPS=$(az pipelines variable-group list --query "[].{Name:name, ID:id}" -o table)
echo "$VARIABLE_GROUPS"

print_info ""
print_info "=========================================="
print_info "Next Steps"
print_info "=========================================="
print_info "1. Link each variable group to its corresponding Key Vault:"
print_info "   - Go to Azure DevOps → Pipelines → Library"
print_info "   - Select each variable group"
print_info "   - Enable 'Link secrets from an Azure key vault as variables'"
print_info "   - Select the appropriate Key Vault"
print_info "   - Import secrets from Key Vault"
print_info ""
print_info "2. Configure security for prod-secrets:"
print_info "   - Enable approval requirement"
print_info "   - Restrict pipeline access to production pipelines only"
print_info "   - Add authorized approvers"
print_info ""
print_info "3. Test variable groups in pipelines"
print_info ""
print_success "Setup complete!"
