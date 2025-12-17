#!/bin/bash
# =============================================================================
# Flamoral Dating Platform - Terraform Deployment Script
# =============================================================================
# This script deploys the Flamoral infrastructure using Terraform
# Usage: ./deploy.sh [environment] [action]
#   environment: dev, staging, prod (default: dev)
#   action: plan, apply, destroy (default: plan)
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Default values
ENVIRONMENT="${1:-dev}"
ACTION="${2:-plan}"

# Map environment to directory
case "$ENVIRONMENT" in
    dev|development)
        ENV_DIR="dating-dev"
        ;;
    staging)
        ENV_DIR="staging"
        ;;
    prod|production)
        ENV_DIR="production"
        ;;
    *)
        echo -e "${RED}Error: Unknown environment '$ENVIRONMENT'${NC}"
        echo "Valid environments: dev, staging, prod"
        exit 1
        ;;
esac

# Validate action
case "$ACTION" in
    plan|apply|destroy|init|validate|output)
        ;;
    *)
        echo -e "${RED}Error: Unknown action '$ACTION'${NC}"
        echo "Valid actions: init, plan, apply, destroy, validate, output"
        exit 1
        ;;
esac

# Environment directory
ENV_PATH="$ROOT_DIR/environments/$ENV_DIR"

# Check if environment directory exists
if [ ! -d "$ENV_PATH" ]; then
    echo -e "${RED}Error: Environment directory not found: $ENV_PATH${NC}"
    exit 1
fi

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}  Flamoral Infrastructure Deployment${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""
echo -e "Environment: ${GREEN}$ENVIRONMENT${NC} ($ENV_DIR)"
echo -e "Action:      ${GREEN}$ACTION${NC}"
echo -e "Path:        $ENV_PATH"
echo ""

# Check for required environment variables
check_env_vars() {
    local missing=0

    if [ -z "$ARM_CLIENT_ID" ]; then
        echo -e "${YELLOW}Warning: ARM_CLIENT_ID not set${NC}"
        missing=1
    fi

    if [ -z "$ARM_CLIENT_SECRET" ]; then
        echo -e "${YELLOW}Warning: ARM_CLIENT_SECRET not set${NC}"
        missing=1
    fi

    if [ -z "$ARM_TENANT_ID" ]; then
        echo -e "${YELLOW}Warning: ARM_TENANT_ID not set${NC}"
        missing=1
    fi

    if [ -z "$ARM_SUBSCRIPTION_ID" ]; then
        echo -e "${YELLOW}Warning: ARM_SUBSCRIPTION_ID not set${NC}"
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        echo ""
        echo -e "${YELLOW}Environment variables may be required for authentication.${NC}"
        echo "Set them using:"
        echo "  export ARM_CLIENT_ID=\"your-client-id\""
        echo "  export ARM_CLIENT_SECRET=\"your-client-secret\""
        echo "  export ARM_TENANT_ID=\"your-tenant-id\""
        echo "  export ARM_SUBSCRIPTION_ID=\"your-subscription-id\""
        echo ""
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Change to environment directory
cd "$ENV_PATH"

# Execute based on action
case "$ACTION" in
    init)
        echo -e "${YELLOW}Initializing Terraform...${NC}"
        terraform init -upgrade
        echo -e "${GREEN}Initialization complete.${NC}"
        ;;

    validate)
        echo -e "${YELLOW}Validating Terraform configuration...${NC}"
        terraform validate
        echo -e "${GREEN}Validation complete.${NC}"
        ;;

    plan)
        check_env_vars
        echo -e "${YELLOW}Creating Terraform plan...${NC}"
        terraform plan -out=tfplan
        echo ""
        echo -e "${GREEN}Plan created successfully.${NC}"
        echo "To apply this plan, run: ./deploy.sh $ENVIRONMENT apply"
        ;;

    apply)
        check_env_vars
        if [ -f "tfplan" ]; then
            echo -e "${YELLOW}Applying saved plan...${NC}"
            terraform apply tfplan
            rm -f tfplan
        else
            echo -e "${YELLOW}No saved plan found. Creating and applying...${NC}"
            read -p "Continue with apply? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                terraform apply -auto-approve
            else
                echo "Apply cancelled."
                exit 0
            fi
        fi
        echo -e "${GREEN}Apply complete.${NC}"
        ;;

    destroy)
        check_env_vars
        echo -e "${RED}WARNING: This will destroy all resources in $ENVIRONMENT!${NC}"
        read -p "Are you sure? Type 'yes' to confirm: " confirm
        if [ "$confirm" = "yes" ]; then
            terraform destroy -auto-approve
            echo -e "${GREEN}Destroy complete.${NC}"
        else
            echo "Destroy cancelled."
        fi
        ;;

    output)
        echo -e "${YELLOW}Terraform outputs:${NC}"
        terraform output
        ;;
esac

echo ""
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}  Done!${NC}"
echo -e "${BLUE}=============================================${NC}"
