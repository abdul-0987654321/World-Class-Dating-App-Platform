#!/bin/bash
# =============================================================================
# Azure Key Vault Secret Rotation Script for Flamoral Dating Platform
# =============================================================================
# This script rotates secrets in Azure Key Vault for security best practices
# Usage: ./azure-keyvault-rotate.sh <environment> <secret-type>
# Example: ./azure-keyvault-rotate.sh production jwt
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
SECRET_TYPE=${2:-all}
KEY_VAULT_NAME="flamoral-${ENVIRONMENT}-kv"

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}Azure Key Vault Secret Rotation for Flamoral Dating Platform${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Secret Type: ${SECRET_TYPE}${NC}"
echo -e "${BLUE}=====================================================================${NC}"

# Safety check for production
if [ "$ENVIRONMENT" == "production" ]; then
    echo -e "${RED}WARNING: You are about to rotate PRODUCTION secrets!${NC}"
    echo -e "${YELLOW}This will affect live services and require immediate deployment.${NC}"
    read -p "Are you sure you want to continue? (type 'ROTATE PRODUCTION' to confirm): " confirm
    if [ "$confirm" != "ROTATE PRODUCTION" ]; then
        echo -e "${RED}Aborted.${NC}"
        exit 1
    fi
fi

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI is not installed${NC}"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}Not logged in to Azure. Logging in...${NC}"
    az login
fi

# Function to generate secure random string
generate_secret() {
    openssl rand -base64 48 | tr -d "=+/" | cut -c1-64
}

# Function to rotate a secret
rotate_secret() {
    local secret_name=$1
    local new_value=$2

    echo -e "${BLUE}  Rotating: ${secret_name}${NC}"

    # Get current secret for backup
    current_value=$(az keyvault secret show \
        --vault-name "$KEY_VAULT_NAME" \
        --name "$secret_name" \
        --query value \
        -o tsv 2>/dev/null || echo "")

    if [ -n "$current_value" ]; then
        # Create backup with timestamp
        backup_name="${secret_name}-backup-$(date +%Y%m%d%H%M%S)"
        az keyvault secret set \
            --vault-name "$KEY_VAULT_NAME" \
            --name "$backup_name" \
            --value "$current_value" \
            --description "Backup before rotation" \
            --output none

        echo -e "${GREEN}    ✓ Backed up to: ${backup_name}${NC}"
    fi

    # Set new secret
    az keyvault secret set \
        --vault-name "$KEY_VAULT_NAME" \
        --name "$secret_name" \
        --value "$new_value" \
        --description "Rotated on $(date)" \
        --output none

    echo -e "${GREEN}    ✓ Rotated successfully${NC}"
}

# Rotate JWT secrets
rotate_jwt_secrets() {
    echo -e "${GREEN}Rotating JWT secrets...${NC}"

    JWT_SECRET=$(generate_secret)
    rotate_secret "jwt-secret" "$JWT_SECRET"

    JWT_ACCESS_SECRET=$(generate_secret)
    rotate_secret "jwt-access-secret" "$JWT_ACCESS_SECRET"

    JWT_REFRESH_SECRET=$(generate_secret)
    rotate_secret "jwt-refresh-secret" "$JWT_REFRESH_SECRET"

    echo -e "${YELLOW}⚠ IMPORTANT: Restart all services to use new JWT secrets${NC}"
    echo -e "${YELLOW}  Existing JWT tokens will be invalidated${NC}"
    echo -e "${YELLOW}  Users will need to re-authenticate${NC}"
}

# Rotate service authentication secrets
rotate_service_secrets() {
    echo -e "${GREEN}Rotating service authentication secrets...${NC}"

    SERVICE_API_KEY=$(generate_secret)
    rotate_secret "service-api-key" "$SERVICE_API_KEY"

    SESSION_SECRET=$(generate_secret)
    rotate_secret "session-secret" "$SESSION_SECRET"

    echo -e "${YELLOW}⚠ IMPORTANT: Update all microservices with new service API key${NC}"
    echo -e "${YELLOW}  Services won't be able to communicate until updated${NC}"
}

# Rotate database passwords
rotate_database_secrets() {
    echo -e "${GREEN}Rotating database secrets...${NC}"
    echo -e "${RED}WARNING: Database password rotation requires coordination${NC}"
    echo -e "${YELLOW}Steps:${NC}"
    echo -e "1. Generate new password"
    echo -e "2. Update database user password in Azure Portal"
    echo -e "3. Update Key Vault secret"
    echo -e "4. Deploy services with new password"
    echo ""
    read -p "Have you updated the database password in Azure? (y/n): " db_updated

    if [ "$db_updated" == "y" ] || [ "$db_updated" == "Y" ]; then
        read -sp "Enter new database password: " new_db_password
        echo

        rotate_secret "database-password" "$new_db_password"

        # Update DATABASE_URL
        DB_USER="flamoral_admin"
        DB_HOST="flamoral-${ENVIRONMENT}-postgres.postgres.database.azure.com"
        DB_NAME="flamoral_${ENVIRONMENT}"
        DATABASE_URL="postgresql://${DB_USER}:${new_db_password}@${DB_HOST}:5432/${DB_NAME}?ssl=true"

        rotate_secret "database-url" "$DATABASE_URL"

        echo -e "${GREEN}✓ Database secrets rotated${NC}"
    else
        echo -e "${YELLOW}Skipping database password rotation${NC}"
    fi
}

# Rotate encryption keys
rotate_encryption_secrets() {
    echo -e "${GREEN}Rotating encryption secrets...${NC}"
    echo -e "${RED}WARNING: Encryption key rotation requires data re-encryption${NC}"
    echo -e "${YELLOW}This is a complex operation. Consult documentation first.${NC}"

    read -p "Continue with encryption key rotation? (y/n): " continue_rotation

    if [ "$continue_rotation" == "y" ] || [ "$continue_rotation" == "Y" ]; then
        ENCRYPTION_KEY=$(generate_secret)
        rotate_secret "encryption-key" "$ENCRYPTION_KEY"

        echo -e "${YELLOW}⚠ CRITICAL: Run data re-encryption job immediately${NC}"
    else
        echo -e "${YELLOW}Skipping encryption key rotation${NC}"
    fi
}

# Rotate API keys (external services)
rotate_api_keys() {
    echo -e "${GREEN}Rotating external API keys...${NC}"
    echo -e "${YELLOW}Note: You must rotate these in the external service first${NC}"

    services=("stripe" "sendgrid" "twilio" "sentry" "openai")

    for service in "${services[@]}"; do
        echo -e "${BLUE}Rotate ${service} API key?${NC}"
        read -p "Have you rotated the key in ${service}? (y/n/skip): " rotated

        if [ "$rotated" == "y" ] || [ "$rotated" == "Y" ]; then
            read -sp "Enter new ${service} API key: " new_key
            echo

            case $service in
                stripe)
                    rotate_secret "stripe-secret-key" "$new_key"
                    ;;
                sendgrid)
                    rotate_secret "sendgrid-api-key" "$new_key"
                    ;;
                twilio)
                    rotate_secret "twilio-auth-token" "$new_key"
                    ;;
                sentry)
                    rotate_secret "sentry-dsn" "$new_key"
                    ;;
                openai)
                    rotate_secret "openai-api-key" "$new_key"
                    ;;
            esac

            echo -e "${GREEN}✓ ${service} key rotated${NC}"
        else
            echo -e "${YELLOW}Skipping ${service}${NC}"
        fi
    done
}

# Main rotation logic
case $SECRET_TYPE in
    jwt)
        rotate_jwt_secrets
        ;;
    service)
        rotate_service_secrets
        ;;
    database)
        rotate_database_secrets
        ;;
    encryption)
        rotate_encryption_secrets
        ;;
    api)
        rotate_api_keys
        ;;
    all)
        echo -e "${YELLOW}Rotating all rotatable secrets (excludes database and encryption)${NC}"
        rotate_jwt_secrets
        rotate_service_secrets
        ;;
    *)
        echo -e "${RED}Error: Unknown secret type '${SECRET_TYPE}'${NC}"
        echo -e "${YELLOW}Valid types: jwt, service, database, encryption, api, all${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}=====================================================================${NC}"
echo -e "${GREEN}Secret rotation completed!${NC}"
echo -e "${GREEN}=====================================================================${NC}"
echo ""
echo -e "${YELLOW}POST-ROTATION STEPS:${NC}"
echo -e "1. Sync secrets to Kubernetes: ./azure-keyvault-to-k8s.sh ${ENVIRONMENT}"
echo -e "2. Update ConfigMaps/Secrets in AKS"
echo -e "3. Perform rolling restart of affected services"
echo -e "4. Verify service health and connectivity"
echo -e "5. Monitor logs for authentication errors"
echo ""
echo -e "${BLUE}To view rotation history:${NC}"
echo -e "az keyvault secret list --vault-name ${KEY_VAULT_NAME} --query \"[?contains(name, 'backup')].{Name:name, Created:attributes.created}\" -o table"
echo ""
echo -e "${BLUE}To rollback a secret:${NC}"
echo -e "az keyvault secret show --vault-name ${KEY_VAULT_NAME} --name <backup-name>"
echo -e "az keyvault secret set --vault-name ${KEY_VAULT_NAME} --name <original-name> --value <backup-value>"
