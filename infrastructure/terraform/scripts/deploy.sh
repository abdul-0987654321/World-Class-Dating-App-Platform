#!/bin/bash
# =============================================================================
# AWS Terraform Deployment Script
# Deploys infrastructure to specified environment
# =============================================================================

set -e

# Parse arguments
ENVIRONMENT=${1:-dev}
ACTION=${2:-plan}

# Validate environment
case $ENVIRONMENT in
    dev|staging)
        echo "Environment: $ENVIRONMENT"
        ;;
    prod)
        echo "ERROR: Production deployment is disabled via this script."
        echo "Production changes must go through GitOps workflow."
        exit 1
        ;;
    *)
        echo "ERROR: Invalid environment: $ENVIRONMENT"
        echo "Usage: $0 [dev|staging] [plan|apply|destroy]"
        exit 1
        ;;
esac

# Validate action
case $ACTION in
    plan|apply|destroy)
        echo "Action: $ACTION"
        ;;
    *)
        echo "ERROR: Invalid action: $ACTION"
        echo "Usage: $0 [dev|staging] [plan|apply|destroy]"
        exit 1
        ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="$SCRIPT_DIR/../environments/$ENVIRONMENT"

if [ ! -d "$ENV_DIR" ]; then
    echo "ERROR: Environment directory not found: $ENV_DIR"
    exit 1
fi

cd "$ENV_DIR"

echo ""
echo "=============================================="
echo "Terraform Deployment"
echo "=============================================="
echo "Environment: $ENVIRONMENT"
echo "Action:      $ACTION"
echo "Directory:   $ENV_DIR"
echo "=============================================="
echo ""

# Check for Azure providers (safety check)
echo "Checking for forbidden Azure providers..."
if grep -rE "(azurerm|azuread|azure)" *.tf 2>/dev/null | grep -v "# Azure" | grep -v "azure-to-aws"; then
    echo "ERROR: Azure providers detected! This is forbidden."
    exit 1
fi
echo "No Azure providers detected"
echo ""

# Initialize
echo "Running terraform init..."
terraform init -upgrade

# Validate
echo ""
echo "Running terraform validate..."
terraform validate

# Execute action
echo ""
case $ACTION in
    plan)
        echo "Running terraform plan..."
        terraform plan -out=tfplan
        echo ""
        echo "Plan saved to: tfplan"
        echo "To apply: terraform apply tfplan"
        ;;
    apply)
        echo "Running terraform plan..."
        terraform plan -out=tfplan
        echo ""
        read -p "Apply these changes? (yes/no): " CONFIRM
        if [ "$CONFIRM" = "yes" ]; then
            echo "Applying..."
            terraform apply tfplan
        else
            echo "Apply cancelled"
        fi
        ;;
    destroy)
        echo "WARNING: This will destroy all resources in $ENVIRONMENT!"
        echo ""
        read -p "Type '$ENVIRONMENT' to confirm destruction: " CONFIRM
        if [ "$CONFIRM" = "$ENVIRONMENT" ]; then
            terraform destroy
        else
            echo "Destroy cancelled"
        fi
        ;;
esac

echo ""
echo "=============================================="
echo "Deployment Complete"
echo "=============================================="
