#!/bin/bash
# =============================================================================
# Flamoral Dating Platform - Verify Placeholder Secrets
# =============================================================================
# This script checks all Key Vaults for remaining placeholder secrets
#
# Usage: ./verify-placeholder-secrets.sh
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Vault names
PAYMENT_VAULT="flamoral-prod-payment-kv"
EXTERNAL_VAULT="flamoral-prod-ext-kv"
INFRA_VAULT="flamoral-prod-infra-kv"

# Counters
TOTAL_CHECKED=0
TOTAL_PLACEHOLDERS=0
TOTAL_UPDATED=0
TOTAL_MISSING=0

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Flamoral - Placeholder Secrets Verification                      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if value is a placeholder
is_placeholder() {
    local value="$1"
    if [[ "$value" == *"REPLACE_WITH_"* ]]; then
        return 0
    fi
    return 1
}

# Function to check a single secret
check_secret() {
    local vault="$1"
    local secret="$2"
    local description="$3"

    TOTAL_CHECKED=$((TOTAL_CHECKED + 1))

    echo -n "  Checking $secret... "

    # Get secret value
    value=$(az keyvault secret show \
        --vault-name "$vault" \
        --name "$secret" \
        --query "value" \
        --output tsv 2>/dev/null || echo "")

    if [ -z "$value" ]; then
        echo -e "${RED}NOT FOUND${NC}"
        TOTAL_MISSING=$((TOTAL_MISSING + 1))
        return
    fi

    if is_placeholder "$value"; then
        echo -e "${YELLOW}PLACEHOLDER${NC} - $description"
        TOTAL_PLACEHOLDERS=$((TOTAL_PLACEHOLDERS + 1))
    else
        echo -e "${GREEN}UPDATED${NC}"
        TOTAL_UPDATED=$((TOTAL_UPDATED + 1))
    fi
}

# =============================================================================
# Check Payment Vault
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Payment Vault: $PAYMENT_VAULT${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

check_secret "$PAYMENT_VAULT" "stripe-secret-key" "Stripe API secret key"
check_secret "$PAYMENT_VAULT" "stripe-webhook-secret" "Stripe webhook signing secret"

echo ""

# =============================================================================
# Check External Services Vault
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}External Services Vault: $EXTERNAL_VAULT${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

check_secret "$EXTERNAL_VAULT" "sendgrid-api-key" "SendGrid email API key"
check_secret "$EXTERNAL_VAULT" "twilio-auth-token" "Twilio authentication token"
check_secret "$EXTERNAL_VAULT" "sentry-dsn" "Sentry error tracking DSN"
check_secret "$EXTERNAL_VAULT" "openai-api-key" "OpenAI API key"
check_secret "$EXTERNAL_VAULT" "firebase-private-key" "Firebase service account key"
check_secret "$EXTERNAL_VAULT" "agora-app-certificate" "Agora.io app certificate"

echo ""

# =============================================================================
# Check Infrastructure Vault
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Infrastructure Vault: $INFRA_VAULT${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

check_secret "$INFRA_VAULT" "azure-storage-connection-string" "Azure Storage connection string"

echo ""

# =============================================================================
# Summary
# =============================================================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}SUMMARY${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo "Total secrets checked:    $TOTAL_CHECKED"
echo -e "${GREEN}Updated:${NC}                  $TOTAL_UPDATED"
echo -e "${YELLOW}Still placeholders:${NC}       $TOTAL_PLACEHOLDERS"
echo -e "${RED}Not found/missing:${NC}        $TOTAL_MISSING"
echo ""

# Exit status
if [ $TOTAL_PLACEHOLDERS -eq 0 ] && [ $TOTAL_MISSING -eq 0 ]; then
    echo -e "${GREEN}✓ All secrets are properly configured!${NC}"
    echo ""
    exit 0
elif [ $TOTAL_PLACEHOLDERS -gt 0 ]; then
    echo -e "${YELLOW}⚠ $TOTAL_PLACEHOLDERS placeholder secret(s) need replacement${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review the guide: docs/SECRETS_REPLACEMENT_GUIDE.md"
    echo "  2. Run the update script: ./scripts/update-placeholder-secrets.ps1"
    echo ""
    exit 1
else
    echo -e "${RED}✗ $TOTAL_MISSING secret(s) not found${NC}"
    echo ""
    echo "Run the population script to create missing secrets:"
    echo "  ./scripts/populate-prod-keyvault-secrets.ps1"
    echo ""
    exit 2
fi
