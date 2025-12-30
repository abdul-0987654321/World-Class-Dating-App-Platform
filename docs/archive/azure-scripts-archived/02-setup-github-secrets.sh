#!/bin/bash
# Script to configure GitHub Secrets for CI/CD
# Prerequisites: Azure CLI, GitHub CLI (gh)

set -e

echo "========================================="
echo "GitHub Secrets Configuration"
echo "========================================="
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "ERROR: GitHub CLI (gh) is not installed."
    echo ""
    echo "Install GitHub CLI:"
    echo "  Windows: winget install GitHub.cli"
    echo "  Mac: brew install gh"
    echo "  Linux: (deb) curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg"
    echo ""
    exit 1
fi

echo "✓ GitHub CLI is installed"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "ERROR: Azure CLI is not installed."
    echo "Please run ./01-setup-backend.sh first"
    exit 1
fi

echo "✓ Azure CLI is installed"
echo ""

# GitHub authentication check
echo "Checking GitHub authentication..."
if ! gh auth status &> /dev/null; then
    echo "You need to authenticate with GitHub first."
    echo "Running: gh auth login"
    gh auth login
fi

echo "✓ Authenticated with GitHub"
echo ""

# Azure authentication check
echo "Checking Azure authentication..."
if ! az account show &> /dev/null; then
    echo "You need to login to Azure first."
    echo "Running: az login"
    az login
fi

echo "✓ Authenticated with Azure"
echo ""

# Get Azure credentials
echo "Retrieving Azure credentials..."
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)

echo ""
echo "Current Azure Context:"
echo "  Subscription: $SUBSCRIPTION_NAME"
echo "  Subscription ID: $SUBSCRIPTION_ID"
echo "  Tenant ID: $TENANT_ID"
echo ""

# Check for existing service principal
echo "Checking for existing service principal..."
SP_NAME="datingapp-github-actions"

# Try to find existing service principal
SP_APP_ID=$(az ad sp list --display-name "$SP_NAME" --query "[0].appId" -o tsv 2>/dev/null || echo "")

if [ -z "$SP_APP_ID" ]; then
    echo "Creating new service principal: $SP_NAME"
    echo ""

    # Create service principal
    SP_OUTPUT=$(az ad sp create-for-rbac \
      --name "$SP_NAME" \
      --role contributor \
      --scopes "/subscriptions/$SUBSCRIPTION_ID" \
      --json-auth)

    SP_APP_ID=$(echo $SP_OUTPUT | jq -r '.clientId')
    echo "✓ Service principal created"
    echo "  Client ID: $SP_APP_ID"
else
    echo "✓ Service principal already exists"
    echo "  Client ID: $SP_APP_ID"
fi

echo ""

# Setup OIDC Federated Credentials
echo "Setting up OIDC federated credentials..."
echo ""

# Get current repository
REPO_FULL=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "Repository: $REPO_FULL"
echo ""

# Create federated credential for main branch
echo "1. Creating federated credential for main branch..."
CRED_NAME_MAIN="github-actions-main"

if az ad app federated-credential show --id $SP_APP_ID --federated-credential-id $CRED_NAME_MAIN &> /dev/null; then
    echo "   ✓ Federated credential for main branch already exists"
else
    az ad app federated-credential create \
      --id $SP_APP_ID \
      --parameters "{
        \"name\": \"$CRED_NAME_MAIN\",
        \"issuer\": \"https://token.actions.githubusercontent.com\",
        \"subject\": \"repo:$REPO_FULL:ref:refs/heads/main\",
        \"audiences\": [\"api://AzureADTokenExchange\"]
      }" \
      --output none
    echo "   ✓ Federated credential for main branch created"
fi

# Create federated credential for pull requests
echo "2. Creating federated credential for pull requests..."
CRED_NAME_PR="github-actions-pr"

if az ad app federated-credential show --id $SP_APP_ID --federated-credential-id $CRED_NAME_PR &> /dev/null; then
    echo "   ✓ Federated credential for PRs already exists"
else
    az ad app federated-credential create \
      --id $SP_APP_ID \
      --parameters "{
        \"name\": \"$CRED_NAME_PR\",
        \"issuer\": \"https://token.actions.githubusercontent.com\",
        \"subject\": \"repo:$REPO_FULL:pull_request\",
        \"audiences\": [\"api://AzureADTokenExchange\"]
      }" \
      --output none
    echo "   ✓ Federated credential for PRs created"
fi

echo ""
echo "Setting GitHub repository secrets..."
echo ""

# Set GitHub secrets
echo "1. Setting AZURE_CLIENT_ID..."
gh secret set AZURE_CLIENT_ID --body "$SP_APP_ID"
echo "   ✓ AZURE_CLIENT_ID set"

echo "2. Setting AZURE_TENANT_ID..."
gh secret set AZURE_TENANT_ID --body "$TENANT_ID"
echo "   ✓ AZURE_TENANT_ID set"

echo "3. Setting AZURE_SUBSCRIPTION_ID..."
gh secret set AZURE_SUBSCRIPTION_ID --body "$SUBSCRIPTION_ID"
echo "   ✓ AZURE_SUBSCRIPTION_ID set"

echo ""
echo "========================================="
echo "✓ GitHub Secrets Configuration Complete!"
echo "========================================="
echo ""
echo "Configured Secrets:"
echo "  AZURE_CLIENT_ID: $SP_APP_ID"
echo "  AZURE_TENANT_ID: $TENANT_ID"
echo "  AZURE_SUBSCRIPTION_ID: $SUBSCRIPTION_ID"
echo ""
echo "Verify secrets:"
echo "  gh secret list"
echo ""
echo "Next Steps:"
echo "  1. Initialize Terraform: cd ../infrastructure && terraform init"
echo "  2. Deploy infrastructure: terraform apply -var-file=envs/dev.tfvars"
echo "  3. Or use GitHub Actions: gh workflow run terraform-apply.yml -f environment=dev"
echo ""
