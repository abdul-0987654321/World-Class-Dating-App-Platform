#!/bin/bash
# =============================================================================
# Flamoral Dating Platform - Production Key Vault Secrets Population
# =============================================================================
# This script populates all 5 production Key Vaults with required secrets
# Run this after the Key Vaults have been created by Terraform
#
# Prerequisites:
#   - Azure CLI installed and logged in
#   - Sufficient permissions on Key Vaults (Key Vault Secrets Officer or Administrator)
#   - OpenSSL installed for random generation
# =============================================================================

set -e

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-flamoral-prod-rg}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}Flamoral Production Key Vaults Setup${NC}"
echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}Resource Group: $RESOURCE_GROUP${NC}"
echo ""

# Function to set a secret in Key Vault
set_secret() {
    local vault_name=$1
    local secret_name=$2
    local secret_value=$3
    local is_placeholder=$4

    if az keyvault secret set \
        --vault-name "$vault_name" \
        --name "$secret_name" \
        --value "$secret_value" \
        --output none 2>/dev/null; then

        if [ "$is_placeholder" = "true" ]; then
            echo -e "${YELLOW}  [$vault_name] Set $secret_name (PLACEHOLDER - needs replacement)${NC}"
            PLACEHOLDER_COUNT=$((PLACEHOLDER_COUNT + 1))
        else
            echo -e "${GREEN}  [$vault_name] Set $secret_name${NC}"
        fi
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo -e "${RED}  [$vault_name] Failed to set $secret_name${NC}"
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
    fi
}

# =============================================================================
# Generate Secure Values
# =============================================================================
echo -e "${CYAN}Generating secure random values...${NC}"

JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
JWT_ACCESS_SECRET=$(openssl rand -base64 48 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d '\n')
SESSION_SECRET=$(openssl rand -base64 24 | tr -d '\n')
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')
REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')
SERVICE_API_KEY=$(openssl rand -base64 48 | tr -d '\n')
ENCRYPTION_KEY=$(openssl rand -hex 32)

echo -e "${GREEN}Secure values generated successfully!${NC}"
echo ""

# =============================================================================
# Vault Names
# =============================================================================
AUTH_VAULT="flamoralprodauthkv"
PAYMENT_VAULT="flamoralprodpaymentkv"
DATA_VAULT="flamoralproddatakv"
EXTERNAL_VAULT="flamoralprodexternalkv"
INFRA_VAULT="flamoralprodinfrakv"

# Track results
SUCCESS_COUNT=0
FAILURE_COUNT=0
PLACEHOLDER_COUNT=0

# =============================================================================
# 1. AUTH VAULT - JWT, OAuth, Session Secrets
# =============================================================================
echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}1. Populating Auth Vault ($AUTH_VAULT)${NC}"
echo -e "${CYAN}==========================================${NC}"

set_secret "$AUTH_VAULT" "jwt-secret" "$JWT_SECRET" "false"
set_secret "$AUTH_VAULT" "jwt-access-secret" "$JWT_ACCESS_SECRET" "false"
set_secret "$AUTH_VAULT" "jwt-refresh-secret" "$JWT_REFRESH_SECRET" "false"
set_secret "$AUTH_VAULT" "session-secret" "$SESSION_SECRET" "false"

echo ""

# =============================================================================
# 2. PAYMENT VAULT - Stripe, IAP Secrets
# =============================================================================
echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}2. Populating Payment Vault ($PAYMENT_VAULT)${NC}"
echo -e "${CYAN}==========================================${NC}"

set_secret "$PAYMENT_VAULT" "stripe-secret-key" "REPLACE_WITH_STRIPE_SECRET_KEY_sk_live_XXXX" "true"
set_secret "$PAYMENT_VAULT" "stripe-webhook-secret" "REPLACE_WITH_STRIPE_WEBHOOK_SECRET_whsec_XXXX" "true"

echo ""

# =============================================================================
# 3. DATA VAULT - Database, Redis Connection Secrets
# =============================================================================
echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}3. Populating Data Vault ($DATA_VAULT)${NC}"
echo -e "${CYAN}==========================================${NC}"

set_secret "$DATA_VAULT" "postgres-password" "$POSTGRES_PASSWORD" "false"
set_secret "$DATA_VAULT" "redis-password" "$REDIS_PASSWORD" "false"

echo ""

# =============================================================================
# 4. EXTERNAL VAULT - Third-Party API Keys
# =============================================================================
echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}4. Populating External Services Vault ($EXTERNAL_VAULT)${NC}"
echo -e "${CYAN}==========================================${NC}"

set_secret "$EXTERNAL_VAULT" "sendgrid-api-key" "REPLACE_WITH_SENDGRID_API_KEY" "true"
set_secret "$EXTERNAL_VAULT" "twilio-auth-token" "REPLACE_WITH_TWILIO_AUTH_TOKEN" "true"
set_secret "$EXTERNAL_VAULT" "firebase-private-key" "REPLACE_WITH_FIREBASE_PRIVATE_KEY" "true"
set_secret "$EXTERNAL_VAULT" "agora-app-certificate" "REPLACE_WITH_AGORA_APP_CERTIFICATE" "true"
set_secret "$EXTERNAL_VAULT" "sentry-dsn" "REPLACE_WITH_SENTRY_DSN" "true"
set_secret "$EXTERNAL_VAULT" "openai-api-key" "REPLACE_WITH_OPENAI_API_KEY" "true"

echo ""

# =============================================================================
# 5. INFRA VAULT - Infrastructure Secrets
# =============================================================================
echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}5. Populating Infrastructure Vault ($INFRA_VAULT)${NC}"
echo -e "${CYAN}==========================================${NC}"

set_secret "$INFRA_VAULT" "service-api-key" "$SERVICE_API_KEY" "false"
set_secret "$INFRA_VAULT" "encryption-key" "$ENCRYPTION_KEY" "false"
set_secret "$INFRA_VAULT" "azure-storage-connection-string" "REPLACE_WITH_AZURE_STORAGE_CONNECTION_STRING" "true"

echo ""

# =============================================================================
# SUMMARY
# =============================================================================
echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}SUMMARY${NC}"
echo -e "${CYAN}==========================================${NC}"
echo -e "${GREEN}Successfully created: $SUCCESS_COUNT secrets${NC}"
if [ $PLACEHOLDER_COUNT -gt 0 ]; then
    echo -e "${YELLOW}Placeholder secrets (need replacement): $PLACEHOLDER_COUNT${NC}"
fi
if [ $FAILURE_COUNT -gt 0 ]; then
    echo -e "${RED}Failed to create: $FAILURE_COUNT secrets${NC}"
fi
echo ""

echo -e "${CYAN}Vault Details:${NC}"
echo -e "  1. Auth Vault:     $AUTH_VAULT"
echo -e "  2. Payment Vault:  $PAYMENT_VAULT"
echo -e "  3. Data Vault:     $DATA_VAULT"
echo -e "  4. External Vault: $EXTERNAL_VAULT"
echo -e "  5. Infra Vault:    $INFRA_VAULT"
echo ""

echo -e "${CYAN}Next Steps:${NC}"
echo "1. Update placeholder secrets with actual API keys:"
echo -e "${YELLOW}   - Stripe keys (stripe-secret-key, stripe-webhook-secret)${NC}"
echo -e "${YELLOW}   - SendGrid API key${NC}"
echo -e "${YELLOW}   - Twilio Auth Token${NC}"
echo -e "${YELLOW}   - Firebase Private Key${NC}"
echo -e "${YELLOW}   - Agora App Certificate${NC}"
echo -e "${YELLOW}   - Sentry DSN${NC}"
echo -e "${YELLOW}   - OpenAI API Key${NC}"
echo -e "${YELLOW}   - Azure Storage Connection String${NC}"
echo ""
echo "2. Verify secrets in each vault:"
echo "   az keyvault secret list --vault-name <vault-name> --output table"
echo ""
echo "3. Grant application identities access to vaults (if not done by Terraform)"
echo ""

if [ $FAILURE_COUNT -eq 0 ]; then
    echo -e "${GREEN}All secrets populated successfully!${NC}"
else
    echo -e "${RED}Some secrets failed to populate. Please check errors above.${NC}"
    exit 1
fi
