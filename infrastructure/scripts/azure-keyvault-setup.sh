#!/bin/bash
# =============================================================================
# Azure Key Vault Setup Script for Flamoral Dating Platform
# =============================================================================
# This script creates and configures Azure Key Vault with all required secrets
# Usage: ./azure-keyvault-setup.sh <environment>
# Example: ./azure-keyvault-setup.sh staging
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
RESOURCE_GROUP="flamoral-${ENVIRONMENT}-rg"
LOCATION="eastus"
KEY_VAULT_NAME="flamoral-${ENVIRONMENT}-kv"

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}Azure Key Vault Setup for Flamoral Dating Platform${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}=====================================================================${NC}"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI is not installed${NC}"
    echo -e "${YELLOW}Please install Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli${NC}"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}Not logged in to Azure. Logging in...${NC}"
    az login
fi

# Create Resource Group if it doesn't exist
echo -e "${GREEN}[1/5] Creating/Verifying Resource Group...${NC}"
if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    az group create \
        --name "$RESOURCE_GROUP" \
        --location "$LOCATION"
    echo -e "${GREEN}✓ Resource Group created: $RESOURCE_GROUP${NC}"
else
    echo -e "${GREEN}✓ Resource Group already exists: $RESOURCE_GROUP${NC}"
fi

# Create Key Vault
echo -e "${GREEN}[2/5] Creating/Verifying Key Vault...${NC}"
if ! az keyvault show --name "$KEY_VAULT_NAME" &> /dev/null; then
    az keyvault create \
        --name "$KEY_VAULT_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --enable-rbac-authorization false \
        --enable-soft-delete true \
        --soft-delete-retention-days 90 \
        --enabled-for-deployment true \
        --enabled-for-template-deployment true
    echo -e "${GREEN}✓ Key Vault created: $KEY_VAULT_NAME${NC}"
else
    echo -e "${GREEN}✓ Key Vault already exists: $KEY_VAULT_NAME${NC}"
fi

# Set access policies for current user
echo -e "${GREEN}[3/5] Setting access policies...${NC}"
CURRENT_USER_ID=$(az ad signed-in-user show --query id -o tsv)
az keyvault set-policy \
    --name "$KEY_VAULT_NAME" \
    --object-id "$CURRENT_USER_ID" \
    --secret-permissions get list set delete backup restore recover purge

echo -e "${GREEN}✓ Access policies configured${NC}"

# Function to generate secure random string
generate_secret() {
    openssl rand -base64 48 | tr -d "=+/" | cut -c1-64
}

# Function to set secret in Key Vault
set_secret() {
    local secret_name=$1
    local secret_value=$2
    local secret_description=$3

    echo -e "${BLUE}  Setting: ${secret_name}${NC}"
    az keyvault secret set \
        --vault-name "$KEY_VAULT_NAME" \
        --name "$secret_name" \
        --value "$secret_value" \
        --description "$secret_description" \
        --output none
}

# Function to prompt for secret value
prompt_secret() {
    local secret_name=$1
    local description=$2
    local generate_option=$3

    echo -e "${YELLOW}$description${NC}"

    if [ "$generate_option" == "generate" ]; then
        read -p "Generate automatically? (y/n): " generate
        if [ "$generate" == "y" ] || [ "$generate" == "Y" ]; then
            echo $(generate_secret)
            return
        fi
    fi

    read -sp "Enter value for $secret_name (hidden): " value
    echo
    echo "$value"
}

echo -e "${GREEN}[4/5] Setting secrets...${NC}"

# Database Secrets
echo -e "${BLUE}==== Database Secrets ====${NC}"
DB_PASSWORD=$(prompt_secret "database-password" "PostgreSQL database password" "generate")
set_secret "database-password" "$DB_PASSWORD" "PostgreSQL database password"

DATABASE_URL="postgresql://flamoral_admin:${DB_PASSWORD}@flamoral-${ENVIRONMENT}-postgres.postgres.database.azure.com:5432/flamoral_${ENVIRONMENT}?ssl=true"
set_secret "database-url" "$DATABASE_URL" "PostgreSQL connection string"

MONGODB_PASSWORD=$(prompt_secret "mongodb-password" "MongoDB password" "generate")
MONGODB_URI="mongodb://flamoral:${MONGODB_PASSWORD}@flamoral-${ENVIRONMENT}-cosmos.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000"
set_secret "mongodb-uri" "$MONGODB_URI" "MongoDB connection string"

# Redis Secrets
echo -e "${BLUE}==== Redis Secrets ====${NC}"
REDIS_PASSWORD=$(prompt_secret "redis-password" "Redis password (from Azure Cache for Redis)" "manual")
set_secret "redis-password" "$REDIS_PASSWORD" "Redis password"

REDIS_URL="rediss://:${REDIS_PASSWORD}@flamoral-${ENVIRONMENT}-redis.redis.cache.windows.net:6380"
set_secret "redis-url" "$REDIS_URL" "Redis connection string with SSL"

# JWT Secrets
echo -e "${BLUE}==== JWT Secrets ====${NC}"
JWT_SECRET=$(generate_secret)
set_secret "jwt-secret" "$JWT_SECRET" "JWT signing secret"

JWT_ACCESS_SECRET=$(generate_secret)
set_secret "jwt-access-secret" "$JWT_ACCESS_SECRET" "JWT access token secret"

JWT_REFRESH_SECRET=$(generate_secret)
set_secret "jwt-refresh-secret" "$JWT_REFRESH_SECRET" "JWT refresh token secret"

# Service API Key
echo -e "${BLUE}==== Service Authentication ====${NC}"
SERVICE_API_KEY=$(generate_secret)
set_secret "service-api-key" "$SERVICE_API_KEY" "Service-to-service authentication key"

SESSION_SECRET=$(generate_secret)
set_secret "session-secret" "$SESSION_SECRET" "Session encryption secret"

# Azure Storage
echo -e "${BLUE}==== Azure Storage ====${NC}"
STORAGE_KEY=$(prompt_secret "azure-storage-key" "Azure Storage account key" "manual")
set_secret "azure-storage-key" "$STORAGE_KEY" "Azure Storage account key"

STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=flamoral${ENVIRONMENT}st;AccountKey=${STORAGE_KEY};EndpointSuffix=core.windows.net"
set_secret "azure-storage-connection-string" "$STORAGE_CONNECTION_STRING" "Azure Storage connection string"

# Azure Service Bus
echo -e "${BLUE}==== Azure Service Bus ====${NC}"
SERVICE_BUS_CONNECTION=$(prompt_secret "azure-servicebus-connection" "Azure Service Bus connection string" "manual")
set_secret "azure-servicebus-connection-string" "$SERVICE_BUS_CONNECTION" "Azure Service Bus connection string"

# Stripe (Payment Gateway)
echo -e "${BLUE}==== Stripe Payment Gateway ====${NC}"
STRIPE_SECRET_KEY=$(prompt_secret "stripe-secret-key" "Stripe secret key (sk_live_ or sk_test_)" "manual")
set_secret "stripe-secret-key" "$STRIPE_SECRET_KEY" "Stripe secret key"

STRIPE_WEBHOOK_SECRET=$(prompt_secret "stripe-webhook-secret" "Stripe webhook secret" "manual")
set_secret "stripe-webhook-secret" "$STRIPE_WEBHOOK_SECRET" "Stripe webhook signing secret"

# SendGrid (Email)
echo -e "${BLUE}==== SendGrid Email Service ====${NC}"
SENDGRID_API_KEY=$(prompt_secret "sendgrid-api-key" "SendGrid API key" "manual")
set_secret "sendgrid-api-key" "$SENDGRID_API_KEY" "SendGrid API key for email service"

# Twilio (SMS)
echo -e "${BLUE}==== Twilio SMS Service ====${NC}"
TWILIO_AUTH_TOKEN=$(prompt_secret "twilio-auth-token" "Twilio auth token" "manual")
set_secret "twilio-auth-token" "$TWILIO_AUTH_TOKEN" "Twilio authentication token"

# Azure Cognitive Services
echo -e "${BLUE}==== Azure Cognitive Services ====${NC}"
FACE_API_KEY=$(prompt_secret "azure-face-api-key" "Azure Face API key" "manual")
set_secret "azure-face-api-key" "$FACE_API_KEY" "Azure Face API key"

CONTENT_MODERATOR_KEY=$(prompt_secret "azure-content-moderator-key" "Azure Content Moderator key" "manual")
set_secret "azure-content-moderator-key" "$CONTENT_MODERATOR_KEY" "Azure Content Moderator key"

# Agora (Video/Voice)
echo -e "${BLUE}==== Agora Video/Voice ====${NC}"
AGORA_APP_CERTIFICATE=$(prompt_secret "agora-app-certificate" "Agora app certificate" "manual")
set_secret "agora-app-certificate" "$AGORA_APP_CERTIFICATE" "Agora app certificate"

AGORA_CUSTOMER_KEY=$(prompt_secret "agora-customer-key" "Agora customer key" "manual")
set_secret "agora-customer-key" "$AGORA_CUSTOMER_KEY" "Agora customer key"

AGORA_CUSTOMER_SECRET=$(prompt_secret "agora-customer-secret" "Agora customer secret" "manual")
set_secret "agora-customer-secret" "$AGORA_CUSTOMER_SECRET" "Agora customer secret"

# Firebase (Push Notifications)
echo -e "${BLUE}==== Firebase Push Notifications ====${NC}"
FIREBASE_PRIVATE_KEY=$(prompt_secret "firebase-private-key" "Firebase private key" "manual")
set_secret "firebase-private-key" "$FIREBASE_PRIVATE_KEY" "Firebase service account private key"

# Sentry (Error Tracking)
echo -e "${BLUE}==== Sentry Error Tracking ====${NC}"
SENTRY_DSN=$(prompt_secret "sentry-dsn" "Sentry DSN" "manual")
set_secret "sentry-dsn" "$SENTRY_DSN" "Sentry error tracking DSN"

# OAuth Providers
echo -e "${BLUE}==== OAuth Providers ====${NC}"
GOOGLE_CLIENT_SECRET=$(prompt_secret "google-oauth-secret" "Google OAuth client secret" "manual")
set_secret "google-oauth-secret" "$GOOGLE_CLIENT_SECRET" "Google OAuth client secret"

FACEBOOK_APP_SECRET=$(prompt_secret "facebook-oauth-secret" "Facebook OAuth app secret" "manual")
set_secret "facebook-oauth-secret" "$FACEBOOK_APP_SECRET" "Facebook OAuth app secret"

APPLE_PRIVATE_KEY=$(prompt_secret "apple-oauth-key" "Apple OAuth private key" "manual")
set_secret "apple-oauth-key" "$APPLE_PRIVATE_KEY" "Apple OAuth private key"

# AI/ML Services
echo -e "${BLUE}==== AI/ML Services ====${NC}"
OPENAI_API_KEY=$(prompt_secret "openai-api-key" "OpenAI API key" "manual")
set_secret "openai-api-key" "$OPENAI_API_KEY" "OpenAI API key for AI features"

# Analytics
echo -e "${BLUE}==== Analytics Services ====${NC}"
MIXPANEL_TOKEN=$(prompt_secret "mixpanel-token" "Mixpanel token" "manual")
set_secret "mixpanel-token" "$MIXPANEL_TOKEN" "Mixpanel analytics token"

# Google Maps
GOOGLE_MAPS_API_KEY=$(prompt_secret "google-maps-api-key" "Google Maps API key" "manual")
set_secret "google-maps-api-key" "$GOOGLE_MAPS_API_KEY" "Google Maps API key"

MAPBOX_ACCESS_TOKEN=$(prompt_secret "mapbox-access-token" "Mapbox access token" "manual")
set_secret "mapbox-access-token" "$MAPBOX_ACCESS_TOKEN" "Mapbox access token"

# Application Insights
APPLICATION_INSIGHTS_KEY=$(prompt_secret "application-insights-key" "Application Insights connection string" "manual")
set_secret "application-insights-connection-string" "$APPLICATION_INSIGHTS_KEY" "Application Insights connection string"

echo -e "${GREEN}✓ All secrets configured${NC}"

# Configure AKS to access Key Vault
echo -e "${GREEN}[5/5] Configuring AKS access to Key Vault...${NC}"

# Enable managed identity for AKS if it exists
AKS_NAME="flamoral-${ENVIRONMENT}-aks"
if az aks show --name "$AKS_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    echo -e "${BLUE}  Enabling managed identity for AKS...${NC}"

    # Get AKS managed identity
    AKS_IDENTITY=$(az aks show \
        --name "$AKS_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query identityProfile.kubeletidentity.objectId \
        -o tsv)

    # Grant Key Vault access to AKS managed identity
    az keyvault set-policy \
        --name "$KEY_VAULT_NAME" \
        --object-id "$AKS_IDENTITY" \
        --secret-permissions get list

    echo -e "${GREEN}✓ AKS can now access Key Vault secrets${NC}"
else
    echo -e "${YELLOW}⚠ AKS cluster not found. Skip AKS configuration.${NC}"
    echo -e "${YELLOW}  Run this script again after creating the AKS cluster.${NC}"
fi

echo -e "${GREEN}=====================================================================${NC}"
echo -e "${GREEN}Azure Key Vault setup completed successfully!${NC}"
echo -e "${GREEN}=====================================================================${NC}"
echo -e "${BLUE}Key Vault Name: ${KEY_VAULT_NAME}${NC}"
echo -e "${BLUE}Key Vault URI: https://${KEY_VAULT_NAME}.vault.azure.net/${NC}"
echo -e "${BLUE}Resource Group: ${RESOURCE_GROUP}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Update Kubernetes secrets to reference Key Vault"
echo -e "2. Deploy Azure Key Vault CSI driver to AKS"
echo -e "3. Test secret retrieval from applications"
echo ""
echo -e "${YELLOW}To list all secrets:${NC}"
echo -e "az keyvault secret list --vault-name ${KEY_VAULT_NAME}"
echo ""
echo -e "${YELLOW}To retrieve a secret:${NC}"
echo -e "az keyvault secret show --vault-name ${KEY_VAULT_NAME} --name <secret-name>"
