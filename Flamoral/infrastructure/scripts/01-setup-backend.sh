#!/bin/bash
# Script to setup Terraform backend storage in Azure
# Run this after installing Azure CLI

set -e

echo "========================================="
echo "Terraform Backend Setup"
echo "========================================="
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "ERROR: Azure CLI is not installed."
    echo ""
    echo "Install Azure CLI:"
    echo "  Windows: https://aka.ms/installazurecliwindows"
    echo "  Mac: brew install azure-cli"
    echo "  Linux: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash"
    echo ""
    exit 1
fi

echo "✓ Azure CLI is installed"
echo ""

# Login check
echo "Checking Azure authentication..."
if ! az account show &> /dev/null; then
    echo "You need to login to Azure first."
    echo "Running: az login"
    az login
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

read -p "Is this the correct subscription? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please set the correct subscription:"
    echo "  az account list --output table"
    echo "  az account set --subscription <subscription-id>"
    exit 1
fi

echo ""
echo "Creating Terraform backend resources..."
echo ""

# Variables
RESOURCE_GROUP="datingapp-tfstate-rg"
STORAGE_ACCOUNT="datingapptfstate"
CONTAINER_NAME="tfstate"
LOCATION="eastus"

# Create resource group
echo "1. Creating resource group: $RESOURCE_GROUP"
if az group show --name $RESOURCE_GROUP &> /dev/null; then
    echo "   ✓ Resource group already exists"
else
    az group create \
      --name $RESOURCE_GROUP \
      --location $LOCATION \
      --output none
    echo "   ✓ Resource group created"
fi

# Create storage account
echo "2. Creating storage account: $STORAGE_ACCOUNT"
if az storage account show --name $STORAGE_ACCOUNT --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo "   ✓ Storage account already exists"
else
    az storage account create \
      --name $STORAGE_ACCOUNT \
      --resource-group $RESOURCE_GROUP \
      --location $LOCATION \
      --sku Standard_LRS \
      --encryption-services blob \
      --output none
    echo "   ✓ Storage account created"
fi

# Create container
echo "3. Creating blob container: $CONTAINER_NAME"
ACCOUNT_KEY=$(az storage account keys list \
  --resource-group $RESOURCE_GROUP \
  --account-name $STORAGE_ACCOUNT \
  --query '[0].value' -o tsv)

if az storage container show \
  --name $CONTAINER_NAME \
  --account-name $STORAGE_ACCOUNT \
  --account-key $ACCOUNT_KEY &> /dev/null; then
    echo "   ✓ Container already exists"
else
    az storage container create \
      --name $CONTAINER_NAME \
      --account-name $STORAGE_ACCOUNT \
      --account-key $ACCOUNT_KEY \
      --output none
    echo "   ✓ Container created"
fi

echo ""
echo "========================================="
echo "✓ Terraform Backend Setup Complete!"
echo "========================================="
echo ""
echo "Backend Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Storage Account: $STORAGE_ACCOUNT"
echo "  Container: $CONTAINER_NAME"
echo "  Location: $LOCATION"
echo ""
echo "Next Steps:"
echo "  1. Run: ./02-setup-github-secrets.sh"
echo "  2. Initialize Terraform: cd ../infrastructure && terraform init"
echo ""
