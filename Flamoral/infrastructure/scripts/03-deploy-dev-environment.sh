#!/bin/bash
# Script to deploy the development environment
# Prerequisites: Terraform, Azure CLI (authenticated)

set -e

echo "========================================="
echo "Deploy Development Environment"
echo "========================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

# Check Terraform
if ! command -v terraform &> /dev/null; then
    echo "ERROR: Terraform is not installed."
    echo ""
    echo "Install Terraform:"
    echo "  Windows: choco install terraform"
    echo "  Mac: brew install terraform"
    echo "  Linux: https://learn.hashicorp.com/tutorials/terraform/install-cli"
    echo ""
    exit 1
fi

echo "✓ Terraform is installed ($(terraform version -json | jq -r '.terraform_version'))"

# Check Azure CLI
if ! command -v az &> /dev/null; then
    echo "ERROR: Azure CLI is not installed."
    echo "Please run ./01-setup-backend.sh first"
    exit 1
fi

echo "✓ Azure CLI is installed"

# Check Azure authentication
if ! az account show &> /dev/null; then
    echo "ERROR: Not authenticated with Azure."
    echo "Run: az login"
    exit 1
fi

echo "✓ Authenticated with Azure"
echo ""

# Get current subscription
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)

echo "Current Subscription:"
echo "  Name: $SUBSCRIPTION_NAME"
echo "  ID: $SUBSCRIPTION_ID"
echo ""

read -p "Deploy to this subscription? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

# Navigate to infrastructure directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"

cd "$INFRA_DIR"
echo ""
echo "Working directory: $(pwd)"
echo ""

# Initialize Terraform
echo "Step 1: Initializing Terraform..."
terraform init

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Terraform initialization failed."
    echo "Make sure the backend storage account exists."
    echo "Run: ./scripts/01-setup-backend.sh"
    exit 1
fi

echo "✓ Terraform initialized"
echo ""

# Validate configuration
echo "Step 2: Validating Terraform configuration..."
terraform validate

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Terraform validation failed."
    exit 1
fi

echo "✓ Configuration valid"
echo ""

# Check if dev.tfvars exists
if [ ! -f "envs/dev.tfvars" ]; then
    echo "ERROR: envs/dev.tfvars not found"
    exit 1
fi

# Format check
echo "Step 3: Checking Terraform formatting..."
terraform fmt -check -recursive || {
    echo ""
    echo "Warning: Some files need formatting."
    echo "Run: terraform fmt -recursive"
    echo ""
}

# Plan deployment
echo "Step 4: Creating deployment plan..."
terraform plan -var-file=envs/dev.tfvars -out=tfplan-dev

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Terraform plan failed."
    exit 1
fi

echo ""
echo "✓ Deployment plan created"
echo ""
echo "========================================="
echo "Plan Summary"
echo "========================================="
terraform show -no-color tfplan-dev | grep -A 50 "Plan:"
echo ""

# Confirm deployment
echo ""
read -p "Apply this plan? This will create real Azure resources. (yes/no) " -r
echo ""

if [[ ! $REPLY == "yes" ]]; then
    echo "Deployment cancelled."
    echo "Plan saved to: tfplan-dev"
    echo "To apply later: terraform apply tfplan-dev"
    exit 0
fi

# Apply deployment
echo ""
echo "Step 5: Applying deployment..."
echo "This may take 15-30 minutes..."
echo ""

terraform apply tfplan-dev

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Terraform apply failed."
    echo ""
    echo "Check the error messages above."
    echo "You may need to:"
    echo "  - Verify Azure permissions"
    echo "  - Check resource quotas"
    echo "  - Review naming conflicts"
    exit 1
fi

echo ""
echo "========================================="
echo "✓ Development Environment Deployed!"
echo "========================================="
echo ""

# Get outputs
echo "Infrastructure Outputs:"
terraform output -json | jq -r 'to_entries[] | "\(.key): \(.value.value)"'

echo ""
echo "Next Steps:"
echo ""
echo "1. Get AKS credentials:"
echo "   az aks get-credentials --resource-group datingapp-dev-rg --name datingapp-dev-aks"
echo ""
echo "2. Verify cluster:"
echo "   kubectl get nodes"
echo ""
echo "3. Deploy applications:"
echo "   Run: ./scripts/04-deploy-applications.sh"
echo "   Or use: gh workflow run helm-deploy.yml -f environment=dev"
echo ""
echo "4. Access monitoring:"
echo "   Application Insights: https://portal.azure.com"
echo "   Search for: datingapp-dev-appinsights"
echo ""
