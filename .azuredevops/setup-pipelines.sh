#!/bin/bash
# ==============================================================================
# Flamoral Dating Platform - Azure DevOps Pipeline Setup Script
# ==============================================================================
# This script automates the setup of Azure DevOps pipelines
# Prerequisites: Azure CLI, Azure DevOps CLI extension
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ORG_URL="https://dev.azure.com/citadelcloudmanagement"
PROJECT_NAME="DatingPlatform"
SUBSCRIPTION_ID="d8afbfb0-0c60-4d11-a1c7-a614235f5eb6"
SERVICE_PRINCIPAL_ID="a85e4029-4e37-4399-9390-6e18922b38e7"
ACR_NAME="flamoralacr"
AKS_NAME="flamoral-aks"
RESOURCE_GROUP="flamoral-dating-app-rg"

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed. Please install it first."
        exit 1
    fi

    # Check Azure DevOps extension
    if ! az extension list | grep -q "azure-devops"; then
        print_info "Installing Azure DevOps CLI extension..."
        az extension add --name azure-devops
    fi

    print_info "Prerequisites check completed."
}

login_azure() {
    print_info "Logging into Azure..."

    # Check if already logged in
    if ! az account show &> /dev/null; then
        az login
    fi

    # Set subscription
    az account set --subscription "$SUBSCRIPTION_ID"
    print_info "Using subscription: $SUBSCRIPTION_ID"
}

login_azuredevops() {
    print_info "Logging into Azure DevOps..."

    # Check if already logged in
    if ! az devops project show --project "$PROJECT_NAME" --org "$ORG_URL" &> /dev/null; then
        print_warning "Please login to Azure DevOps..."
        az devops login --organization "$ORG_URL"
    fi

    # Set defaults
    az devops configure --defaults \
        organization="$ORG_URL" \
        project="$PROJECT_NAME"

    print_info "Azure DevOps configured."
}

create_service_connections() {
    print_info "Creating service connections..."

    # Note: Service connections must be created via UI or PAT token
    # This is a placeholder for documentation

    print_warning "Service connections must be created manually via Azure DevOps UI:"
    echo "  1. azure-datingapp-sp-connection (Azure RM)"
    echo "  2. azure-terraform-sp-connection (Azure RM)"
    echo "  3. acr-datingapp-connection (Docker Registry)"
    echo "  4. aks-flamoral-connection (Kubernetes)"
    echo ""
    echo "See .azuredevops/service-connections/README.md for detailed instructions."
    echo ""
    read -p "Press Enter after creating service connections..."
}

create_variable_groups() {
    print_info "Creating variable groups..."

    # Shared variables
    print_info "Creating flamoral-shared-vars..."
    az pipelines variable-group create \
        --name "flamoral-shared-vars" \
        --variables \
            AZURE_SUBSCRIPTION_ID="$SUBSCRIPTION_ID" \
            AZURE_CLIENT_ID="$SERVICE_PRINCIPAL_ID" \
        --authorize true \
        || print_warning "Variable group may already exist"

    # CI variables
    print_info "Creating flamoral-ci-vars..."
    az pipelines variable-group create \
        --name "flamoral-ci-vars" \
        --variables \
            DOCKER_BUILDKIT="1" \
            COMPOSE_DOCKER_CLI_BUILD="1" \
        --authorize true \
        || print_warning "Variable group may already exist"

    # CD variables
    print_info "Creating flamoral-cd-vars..."
    az pipelines variable-group create \
        --name "flamoral-cd-vars" \
        --variables \
            DEPLOYMENT_TIMEOUT="15m" \
            HEALTH_CHECK_TIMEOUT="300s" \
            ROLLBACK_ENABLED="true" \
        --authorize true \
        || print_warning "Variable group may already exist"

    # Terraform variables
    print_info "Creating flamoral-terraform-vars..."
    az pipelines variable-group create \
        --name "flamoral-terraform-vars" \
        --variables \
            TF_VERSION="1.6.0" \
            TF_LOG="ERROR" \
        --authorize true \
        || print_warning "Variable group may already exist"

    # Infrastructure variables
    print_info "Creating flamoral-infra-vars..."
    az pipelines variable-group create \
        --name "flamoral-infra-vars" \
        --variables \
            HELM_VERSION="3.12.0" \
            KUBECTL_VERSION="latest" \
        --authorize true \
        || print_warning "Variable group may already exist"

    print_warning "Environment-specific variable groups must be created manually."
    echo "See .azuredevops/variable-groups/README.md for details."
}

create_environments() {
    print_info "Creating deployment environments..."

    # Dev environment
    az pipelines environment create \
        --name "flamoral-dev" \
        || print_warning "Environment may already exist"

    # Test environment
    az pipelines environment create \
        --name "flamoral-test" \
        || print_warning "Environment may already exist"

    # Staging environment
    az pipelines environment create \
        --name "flamoral-staging" \
        || print_warning "Environment may already exist"

    # Production environment
    az pipelines environment create \
        --name "flamoral-production" \
        || print_warning "Environment may already exist"

    # Terraform environments
    for env in dev test staging production; do
        az pipelines environment create \
            --name "terraform-$env" \
            || print_warning "Environment may already exist"
    done

    # Infrastructure environment
    az pipelines environment create \
        --name "flamoral-infrastructure" \
        || print_warning "Environment may already exist"

    print_info "Environments created. Add manual approvals via UI for production."
}

create_pipelines() {
    print_info "Creating Azure DevOps pipelines..."

    # CI Pipeline
    print_info "Creating CI Pipeline..."
    az pipelines create \
        --name "Flamoral-CI-Pipeline" \
        --repository DatingPlatform \
        --repository-type tfsgit \
        --branch main \
        --yml-path .azuredevops/pipelines/azure-pipelines-ci.yml \
        --skip-first-run \
        || print_warning "CI Pipeline may already exist"

    # CD Pipeline
    print_info "Creating CD Pipeline..."
    az pipelines create \
        --name "Flamoral-CD-Pipeline" \
        --repository DatingPlatform \
        --repository-type tfsgit \
        --branch main \
        --yml-path .azuredevops/pipelines/azure-pipelines-cd.yml \
        --skip-first-run \
        || print_warning "CD Pipeline may already exist"

    # Terraform Pipeline
    print_info "Creating Terraform Pipeline..."
    az pipelines create \
        --name "Flamoral-Terraform-Pipeline" \
        --repository DatingPlatform \
        --repository-type tfsgit \
        --branch main \
        --yml-path .azuredevops/pipelines/azure-pipelines-terraform.yml \
        --skip-first-run \
        || print_warning "Terraform Pipeline may already exist"

    # Infrastructure Pipeline
    print_info "Creating Infrastructure Pipeline..."
    az pipelines create \
        --name "Flamoral-Infrastructure-Pipeline" \
        --repository DatingPlatform \
        --repository-type tfsgit \
        --branch main \
        --yml-path .azuredevops/pipelines/azure-pipelines-infra.yml \
        --skip-first-run \
        || print_warning "Infrastructure Pipeline may already exist"

    print_info "Pipelines created successfully!"
}

create_key_vaults() {
    print_info "Creating Azure Key Vaults for secrets..."

    for env in dev test staging prod; do
        print_info "Creating Key Vault: flamoral-${env}-kv"

        az keyvault create \
            --name "flamoral-${env}-kv" \
            --resource-group "$RESOURCE_GROUP" \
            --location eastus \
            --enable-rbac-authorization false \
            || print_warning "Key Vault may already exist"

        # Grant service principal access
        az keyvault set-policy \
            --name "flamoral-${env}-kv" \
            --spn "$SERVICE_PRINCIPAL_ID" \
            --secret-permissions get list set delete \
            --key-permissions get list create import \
            || print_warning "Policy may already exist"
    done

    print_info "Key Vaults created. Add secrets via Azure Portal or CLI."
}

setup_terraform_backend() {
    print_info "Setting up Terraform backend storage..."

    BACKEND_RG="flamoral-terraform-state-rg"
    STORAGE_ACCOUNT="flamoraltfstate"
    CONTAINER_NAME="tfstate"

    # Create resource group
    az group create \
        --name "$BACKEND_RG" \
        --location eastus \
        --tags Environment=Shared Purpose=TerraformState \
        || print_warning "Resource group may already exist"

    # Create storage account
    az storage account create \
        --name "$STORAGE_ACCOUNT" \
        --resource-group "$BACKEND_RG" \
        --location eastus \
        --sku Standard_LRS \
        --kind StorageV2 \
        --encryption-services blob \
        --https-only true \
        --min-tls-version TLS1_2 \
        || print_warning "Storage account may already exist"

    # Create container
    az storage container create \
        --name "$CONTAINER_NAME" \
        --account-name "$STORAGE_ACCOUNT" \
        --auth-mode login \
        || print_warning "Container may already exist"

    print_info "Terraform backend storage configured."
}

print_summary() {
    echo ""
    echo "========================================================================"
    echo "                    Setup Complete!"
    echo "========================================================================"
    echo ""
    echo "Azure DevOps Organization: $ORG_URL"
    echo "Project: $PROJECT_NAME"
    echo "Subscription: $SUBSCRIPTION_ID"
    echo ""
    echo "Next Steps:"
    echo "1. Configure service connections (see service-connections/README.md)"
    echo "2. Create environment-specific variable groups (see variable-groups/README.md)"
    echo "3. Add secrets to Azure Key Vaults"
    echo "4. Configure manual approvals for production environments"
    echo "5. Run the CI pipeline to test the setup"
    echo ""
    echo "Pipeline URLs:"
    echo "- Pipelines: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build"
    echo "- Boards: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_workitems"
    echo "- Repos: https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform"
    echo ""
    echo "Documentation:"
    echo "- Pipeline Architecture: .azuredevops/PIPELINE_ARCHITECTURE.md"
    echo "- Variable Groups: .azuredevops/variable-groups/README.md"
    echo "- Service Connections: .azuredevops/service-connections/README.md"
    echo ""
    echo "========================================================================"
}

# Main execution
main() {
    echo "========================================================================"
    echo "       Flamoral Dating Platform - Pipeline Setup Script"
    echo "========================================================================"
    echo ""

    check_prerequisites
    login_azure
    login_azuredevops

    echo ""
    print_info "Starting setup process..."
    echo ""

    create_variable_groups
    create_environments
    create_key_vaults
    setup_terraform_backend
    create_service_connections
    create_pipelines

    print_summary
}

# Run main function
main
