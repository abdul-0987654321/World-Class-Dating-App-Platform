#!/bin/bash
# =============================================================================
# Azure Key Vault Sync Script for Flamoral Dating Platform
# =============================================================================
# This script syncs environment variables from Key Vault to local .env file
# Usage: ./azure-keyvault-sync.sh <environment> [service]
# Example: ./azure-keyvault-sync.sh staging user-service
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
SERVICE=${2:-all}
KEY_VAULT_NAME="flamoral-${ENVIRONMENT}-kv"
OUTPUT_FILE=".env.${ENVIRONMENT}"

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}Azure Key Vault Sync for Flamoral Dating Platform${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Service: ${SERVICE}${NC}"
echo -e "${BLUE}=====================================================================${NC}"

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

# Check if Key Vault exists
if ! az keyvault show --name "$KEY_VAULT_NAME" &> /dev/null; then
    echo -e "${RED}Error: Key Vault '$KEY_VAULT_NAME' not found${NC}"
    echo -e "${YELLOW}Run azure-keyvault-setup.sh first to create the Key Vault${NC}"
    exit 1
fi

# Function to get secret from Key Vault
get_secret() {
    local secret_name=$1
    az keyvault secret show \
        --vault-name "$KEY_VAULT_NAME" \
        --name "$secret_name" \
        --query value \
        -o tsv 2>/dev/null || echo ""
}

echo -e "${GREEN}Fetching secrets from Azure Key Vault...${NC}"

# Create temporary env file
TMP_FILE=$(mktemp)

# Header
cat > "$TMP_FILE" << EOF
# =============================================================================
# Environment Configuration - Synced from Azure Key Vault
# =============================================================================
# Generated: $(date)
# Environment: ${ENVIRONMENT}
# Key Vault: ${KEY_VAULT_NAME}
# =============================================================================
# WARNING: This file contains sensitive information
# DO NOT commit this file to version control
# =============================================================================

EOF

# Database
echo -e "${BLUE}Fetching database secrets...${NC}"
cat >> "$TMP_FILE" << EOF
# Database Configuration
DB_PASSWORD=$(get_secret "database-password")
DATABASE_URL=$(get_secret "database-url")
MONGODB_URI=$(get_secret "mongodb-uri")

EOF

# Redis
echo -e "${BLUE}Fetching Redis secrets...${NC}"
cat >> "$TMP_FILE" << EOF
# Redis Configuration
REDIS_PASSWORD=$(get_secret "redis-password")
REDIS_URL=$(get_secret "redis-url")

EOF

# JWT
echo -e "${BLUE}Fetching JWT secrets...${NC}"
cat >> "$TMP_FILE" << EOF
# JWT Configuration
JWT_SECRET=$(get_secret "jwt-secret")
JWT_ACCESS_SECRET=$(get_secret "jwt-access-secret")
JWT_REFRESH_SECRET=$(get_secret "jwt-refresh-secret")

EOF

# Service Authentication
echo -e "${BLUE}Fetching service authentication secrets...${NC}"
cat >> "$TMP_FILE" << EOF
# Service Authentication
SERVICE_API_KEY=$(get_secret "service-api-key")
SESSION_SECRET=$(get_secret "session-secret")

EOF

# Azure Services
echo -e "${BLUE}Fetching Azure service secrets...${NC}"
cat >> "$TMP_FILE" << EOF
# Azure Services
AZURE_STORAGE_KEY=$(get_secret "azure-storage-key")
AZURE_STORAGE_CONNECTION_STRING=$(get_secret "azure-storage-connection-string")
AZURE_SERVICE_BUS_CONNECTION_STRING=$(get_secret "azure-servicebus-connection-string")
AZURE_FACE_API_KEY=$(get_secret "azure-face-api-key")
AZURE_CONTENT_MODERATOR_KEY=$(get_secret "azure-content-moderator-key")
APPLICATION_INSIGHTS_CONNECTION_STRING=$(get_secret "application-insights-connection-string")

EOF

# Payment Gateway
echo -e "${BLUE}Fetching payment gateway secrets...${NC}"
cat >> "$TMP_FILE" << EOF
# Stripe Payment Gateway
STRIPE_SECRET_KEY=$(get_secret "stripe-secret-key")
STRIPE_WEBHOOK_SECRET=$(get_secret "stripe-webhook-secret")

EOF

# Communication Services
echo -e "${BLUE}Fetching communication service secrets...${NC}"
cat >> "$TMP_FILE" << EOF
# Communication Services
SENDGRID_API_KEY=$(get_secret "sendgrid-api-key")
TWILIO_AUTH_TOKEN=$(get_secret "twilio-auth-token")

EOF

# Video/Voice Services
echo -e "${BLUE}Fetching video/voice service secrets...${NC}"
cat >> "$TMP_FILE" << EOF
# Agora Video/Voice
AGORA_APP_CERTIFICATE=$(get_secret "agora-app-certificate")
AGORA_CUSTOMER_KEY=$(get_secret "agora-customer-key")
AGORA_CUSTOMER_SECRET=$(get_secret "agora-customer-secret")

EOF

# Push Notifications
echo -e "${BLUE}Fetching push notification secrets...${NC}"
cat >> "$TMP_FILE" << EOF
# Firebase Push Notifications
FIREBASE_PRIVATE_KEY=$(get_secret "firebase-private-key")

EOF

# OAuth Providers
echo -e "${BLUE}Fetching OAuth provider secrets...${NC}"
cat >> "$TMP_FILE" << EOF
# OAuth Providers
GOOGLE_CLIENT_SECRET=$(get_secret "google-oauth-secret")
FACEBOOK_APP_SECRET=$(get_secret "facebook-oauth-secret")
APPLE_PRIVATE_KEY=$(get_secret "apple-oauth-key")

EOF

# AI/ML Services
echo -e "${BLUE}Fetching AI/ML service secrets...${NC}"
cat >> "$TMP_FILE" << EOF
# AI/ML Services
OPENAI_API_KEY=$(get_secret "openai-api-key")
AI_MODEL_API_KEY=$(get_secret "ai-model-api-key")

EOF

# Analytics and Monitoring
echo -e "${BLUE}Fetching analytics secrets...${NC}"
cat >> "$TMP_FILE" << EOF
# Analytics and Monitoring
SENTRY_DSN=$(get_secret "sentry-dsn")
MIXPANEL_TOKEN=$(get_secret "mixpanel-token")

EOF

# Geolocation Services
echo -e "${BLUE}Fetching geolocation service secrets...${NC}"
cat >> "$TMP_FILE" << EOF
# Geolocation Services
GOOGLE_MAPS_API_KEY=$(get_secret "google-maps-api-key")
MAPBOX_ACCESS_TOKEN=$(get_secret "mapbox-access-token")

EOF

# Support Services
echo -e "${BLUE}Fetching support service secrets...${NC}"
cat >> "$TMP_FILE" << EOF
# Support Services
ZENDESK_API_TOKEN=$(get_secret "zendesk-api-token")
PAGERDUTY_INTEGRATION_KEY=$(get_secret "pagerduty-integration-key")

EOF

# Search Service
ELASTICSEARCH_PASSWORD=$(get_secret "elasticsearch-password")
if [ -n "$ELASTICSEARCH_PASSWORD" ]; then
    cat >> "$TMP_FILE" << EOF
# Search Service
ELASTICSEARCH_PASSWORD=$(get_secret "elasticsearch-password")

EOF
fi

# Save to output file
if [ "$SERVICE" == "all" ]; then
    OUTPUT_PATH="$OUTPUT_FILE"
else
    OUTPUT_PATH="backend/services/$SERVICE/$OUTPUT_FILE"
    mkdir -p "backend/services/$SERVICE"
fi

mv "$TMP_FILE" "$OUTPUT_PATH"
chmod 600 "$OUTPUT_PATH"

echo -e "${GREEN}=====================================================================${NC}"
echo -e "${GREEN}Secrets synced successfully!${NC}"
echo -e "${GREEN}=====================================================================${NC}"
echo -e "${BLUE}Output file: ${OUTPUT_PATH}${NC}"
echo -e "${YELLOW}⚠ IMPORTANT: This file contains sensitive secrets${NC}"
echo -e "${YELLOW}  - DO NOT commit to version control${NC}"
echo -e "${YELLOW}  - Ensure it's listed in .gitignore${NC}"
echo -e "${YELLOW}  - Delete after use if no longer needed${NC}"
echo ""
echo -e "${GREEN}To use these secrets:${NC}"
echo -e "1. Copy to .env: cp ${OUTPUT_PATH} .env"
echo -e "2. Or source directly: source ${OUTPUT_PATH}"
