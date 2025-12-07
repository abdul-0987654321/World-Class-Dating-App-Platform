#!/bin/bash
# =============================================================================
# Flamoral Dating Platform - Azure DevOps Pipeline Setup Script
# =============================================================================
# This script helps set up the Azure DevOps pipelines and configurations
# Run this after configuring the Azure CLI and Azure DevOps extension
# =============================================================================

set -e

# Configuration
ORGANIZATION="citadelcloudmanagement"
PROJECT="DatingPlatform"
REPO_NAME="DatingPlatform"

echo "=============================================="
echo "Flamoral Azure DevOps Pipeline Setup"
echo "=============================================="
echo ""
echo "Organization: $ORGANIZATION"
echo "Project: $PROJECT"
echo ""

# Check if Azure DevOps CLI extension is installed
if ! az extension show --name azure-devops &> /dev/null; then
    echo "Installing Azure DevOps CLI extension..."
    az extension add --name azure-devops
fi

# Configure defaults
az devops configure --defaults organization=https://dev.azure.com/$ORGANIZATION project=$PROJECT

echo ""
echo "Step 1: Creating Variable Groups..."
echo "=============================================="

# Create variable groups (non-sensitive variables only)
# Sensitive variables should be added manually through the Azure DevOps UI

# Shared Variables
az pipelines variable-group create \
    --name "flamoral-shared-vars" \
    --variables \
        nodeVersion="20.x" \
        goVersion="1.21" \
        pythonVersion="3.11" \
        terraformVersion="1.6.0" \
        helmVersion="3.12.0" \
    --authorize true \
    2>/dev/null || echo "Variable group 'flamoral-shared-vars' may already exist"

# CI Variables
az pipelines variable-group create \
    --name "flamoral-ci-vars" \
    --variables \
        acrName="flamoralacr" \
        acrLoginServer="flamoralacr.azurecr.io" \
        imagePrefix="flamoral" \
    --authorize true \
    2>/dev/null || echo "Variable group 'flamoral-ci-vars' may already exist"

# CD Variables
az pipelines variable-group create \
    --name "flamoral-cd-vars" \
    --variables \
        aksClusterName="flamoral-aks" \
        resourceGroup="flamoral-dating-app-rg" \
    --authorize true \
    2>/dev/null || echo "Variable group 'flamoral-cd-vars' may already exist"

# Terraform Variables
az pipelines variable-group create \
    --name "flamoral-terraform-vars" \
    --variables \
        tfStateResourceGroup="flamoral-terraform-state-rg" \
        tfStateStorageAccount="flamoraltfstate" \
        tfStateContainer="tfstate" \
    --authorize true \
    2>/dev/null || echo "Variable group 'flamoral-terraform-vars' may already exist"

echo ""
echo "Step 2: Creating Pipelines..."
echo "=============================================="

# CI Pipeline
az pipelines create \
    --name "Flamoral-CI-Pipeline" \
    --repository $REPO_NAME \
    --repository-type tfsgit \
    --branch main \
    --yaml-path pipelines/ci-pipeline.yml \
    --skip-first-run true \
    2>/dev/null || echo "Pipeline 'Flamoral-CI-Pipeline' may already exist"

# CD Pipeline
az pipelines create \
    --name "Flamoral-CD-Pipeline" \
    --repository $REPO_NAME \
    --repository-type tfsgit \
    --branch main \
    --yaml-path pipelines/cd-pipeline.yml \
    --skip-first-run true \
    2>/dev/null || echo "Pipeline 'Flamoral-CD-Pipeline' may already exist"

# Infrastructure Pipeline
az pipelines create \
    --name "Flamoral-Infrastructure-Pipeline" \
    --repository $REPO_NAME \
    --repository-type tfsgit \
    --branch main \
    --yaml-path pipelines/infrastructure-pipeline.yml \
    --skip-first-run true \
    2>/dev/null || echo "Pipeline 'Flamoral-Infrastructure-Pipeline' may already exist"

# Security Pipeline
az pipelines create \
    --name "Flamoral-Security-Pipeline" \
    --repository $REPO_NAME \
    --repository-type tfsgit \
    --branch main \
    --yaml-path pipelines/security-pipeline.yml \
    --skip-first-run true \
    2>/dev/null || echo "Pipeline 'Flamoral-Security-Pipeline' may already exist"

echo ""
echo "Step 3: Creating Environments..."
echo "=============================================="

# Note: Environments are created automatically when first used in a pipeline
# Approval gates need to be configured manually through the UI

echo "Environments will be created automatically when pipelines run."
echo "Please configure approval gates manually:"
echo "  - flamoral-staging: ops-team@flamoral.com"
echo "  - flamoral-production: release-managers@flamoral.com, cto@flamoral.com"
echo "  - terraform-production: infrastructure-team@flamoral.com"

echo ""
echo "=============================================="
echo "MANUAL STEPS REQUIRED"
echo "=============================================="
echo ""
echo "1. Add secret variables to variable groups:"
echo "   - ACR_USERNAME (in flamoral-cd-vars)"
echo "   - ACR_PASSWORD (in flamoral-cd-vars)"
echo "   - SNYK_TOKEN (in flamoral-security-vars)"
echo ""
echo "2. Create service connections:"
echo "   - azure-terraform-sp-connection (Azure Resource Manager)"
echo "   - acr-datingapp-connection (Docker Registry)"
echo "   - aks-flamoral-connection (Kubernetes)"
echo ""
echo "3. Configure environment approval gates"
echo ""
echo "4. Disable or delete old pipelines:"
echo "   - Check /.azuredevops/pipelines/"
echo "   - Check /azure-pipelines/"
echo "   - Check root azure-pipelines.yml"
echo ""
echo "=============================================="
echo "Setup Complete!"
echo "=============================================="
echo ""
echo "Pipeline URLs:"
echo "  https://dev.azure.com/$ORGANIZATION/$PROJECT/_build?definitionName=Flamoral-CI-Pipeline"
echo "  https://dev.azure.com/$ORGANIZATION/$PROJECT/_build?definitionName=Flamoral-CD-Pipeline"
echo "  https://dev.azure.com/$ORGANIZATION/$PROJECT/_build?definitionName=Flamoral-Infrastructure-Pipeline"
echo "  https://dev.azure.com/$ORGANIZATION/$PROJECT/_build?definitionName=Flamoral-Security-Pipeline"
echo ""
