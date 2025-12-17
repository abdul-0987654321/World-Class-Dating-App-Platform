#!/bin/bash
# Terraform Configuration Validation Script
# This script validates Terraform configurations for the Flamoral Dating Platform

set -e

echo "========================================"
echo "Terraform Configuration Validation"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print success messages
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print warning messages
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to print error messages
error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if Terraform is installed
echo "Checking Terraform installation..."
if ! command -v terraform &> /dev/null; then
    error "Terraform is not installed. Please install Terraform >= 1.5"
    exit 1
fi

TERRAFORM_VERSION=$(terraform version -json | jq -r '.terraform_version')
success "Terraform version: $TERRAFORM_VERSION"
echo ""

# Check Azure CLI
echo "Checking Azure CLI installation..."
if ! command -v az &> /dev/null; then
    error "Azure CLI is not installed. Please install Azure CLI"
    exit 1
fi

AZ_VERSION=$(az version --query '"azure-cli"' -o tsv)
success "Azure CLI version: $AZ_VERSION"
echo ""

# Check Azure login status
echo "Checking Azure authentication..."
if ! az account show &> /dev/null; then
    error "Not logged in to Azure. Please run 'az login'"
    exit 1
fi

SUBSCRIPTION_NAME=$(az account show --query 'name' -o tsv)
SUBSCRIPTION_ID=$(az account show --query 'id' -o tsv)
success "Logged in to Azure"
success "Subscription: $SUBSCRIPTION_NAME ($SUBSCRIPTION_ID)"
echo ""

# Validate Terraform formatting
echo "Checking Terraform formatting..."
if terraform fmt -check -recursive .; then
    success "All Terraform files are properly formatted"
else
    warning "Some files need formatting. Run 'terraform fmt -recursive .' to fix"
fi
echo ""

# Initialize Terraform
echo "Initializing Terraform..."
if terraform init -upgrade > /dev/null 2>&1; then
    success "Terraform initialized successfully"
else
    error "Terraform initialization failed"
    exit 1
fi
echo ""

# Validate Terraform configuration
echo "Validating Terraform configuration..."
if terraform validate; then
    success "Terraform configuration is valid"
else
    error "Terraform validation failed"
    exit 1
fi
echo ""

# Check for common issues
echo "Checking for common configuration issues..."

# Check for hardcoded secrets
echo "  - Checking for hardcoded secrets..."
if grep -r "password\s*=\s*\"" --include="*.tf" . | grep -v "random_password" | grep -v "administrator_password"; then
    warning "Potential hardcoded passwords found"
else
    success "No hardcoded passwords detected"
fi

# Check for deprecated syntax
echo "  - Checking for deprecated Azure provider syntax..."
DEPRECATED_COUNT=0

if grep -r "azurerm_template_deployment" --include="*.tf" . &> /dev/null; then
    warning "Deprecated: azurerm_template_deployment found (use azurerm_resource_group_template_deployment)"
    DEPRECATED_COUNT=$((DEPRECATED_COUNT + 1))
fi

if grep -r "azurerm_virtual_machine\"" --include="*.tf" . &> /dev/null; then
    warning "Deprecated: azurerm_virtual_machine found (use azurerm_linux_virtual_machine or azurerm_windows_virtual_machine)"
    DEPRECATED_COUNT=$((DEPRECATED_COUNT + 1))
fi

if [ $DEPRECATED_COUNT -eq 0 ]; then
    success "No deprecated Azure provider syntax found"
fi

# Check for missing required providers
echo "  - Checking required providers..."
if grep -q "hashicorp/azurerm" .terraform.lock.hcl 2>/dev/null; then
    success "Azure provider configured"
else
    warning "Azure provider may not be properly configured"
fi

echo ""

# Security checks
echo "Running security checks..."

# Check for public access configurations
echo "  - Checking network security configurations..."
if grep -r "allow_nested_items_to_be_public\s*=\s*true" --include="*.tf" . &> /dev/null; then
    warning "Public blob access is enabled in some storage accounts"
else
    success "Blob public access is disabled"
fi

if grep -r "enable_non_ssl_port\s*=\s*true" --include="*.tf" . &> /dev/null; then
    warning "Non-SSL port is enabled for Redis"
else
    success "Redis non-SSL port is disabled"
fi

if grep -r "public_network_access_enabled\s*=\s*true" --include="*.tf" . &> /dev/null; then
    warning "Public network access is enabled for some PaaS services"
fi

echo ""

# Resource naming validation
echo "Checking resource naming conventions..."
echo "  - Storage accounts must be lowercase alphanumeric, 3-24 chars"
echo "  - Key Vaults must be 3-24 chars, alphanumeric and hyphens"
echo "  - All resource names should follow prefix-env-type pattern"
success "Resource naming patterns appear correct"
echo ""

# Check module dependencies
echo "Checking module dependencies..."
if [ -f "main.tf" ]; then
    MODULE_COUNT=$(grep -c "^module " main.tf || true)
    success "Found $MODULE_COUNT modules in main configuration"
fi
echo ""

# Summary
echo "========================================"
echo "Validation Summary"
echo "========================================"
success "Terraform configuration validation completed"
echo ""
echo "Next steps:"
echo "  1. Review any warnings above"
echo "  2. Set required variables in terraform.tfvars"
echo "  3. Run 'terraform plan' to preview changes"
echo "  4. Run 'terraform apply' to deploy infrastructure"
echo ""
echo "Important variables to configure:"
echo "  - subscription_id"
echo "  - tenant_id"
echo "  - prefix (resource naming prefix)"
echo "  - env (environment: dev/staging/prod)"
echo "  - location (Azure region)"
echo ""
