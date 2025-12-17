#!/bin/bash
# =============================================================================
# Flamoral Dating Platform - Azure Key Vault Secrets Setup
# =============================================================================
# This script configures all required secrets in Azure Key Vault for production
# Run this ONCE after creating the Key Vault
#
# Prerequisites:
#   - Azure CLI installed and logged in
#   - Sufficient permissions on Key Vault
#   - All API keys obtained from respective providers
# =============================================================================

set -e

# Configuration
KEY_VAULT_NAME="${KEY_VAULT_NAME:-flamoral-prod-kv}"
RESOURCE_GROUP="${RESOURCE_GROUP:-flamoral-prod-rg}"
LOCATION="${LOCATION:-eastus}"

echo "=========================================="
echo "Flamoral Key Vault Secrets Setup"
echo "=========================================="
echo "Key Vault: $KEY_VAULT_NAME"
echo "Resource Group: $RESOURCE_GROUP"
echo ""

# Check if Key Vault exists, create if not
echo "Checking Key Vault..."
if ! az keyvault show --name "$KEY_VAULT_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    echo "Creating Key Vault..."
    az keyvault create \
        --name "$KEY_VAULT_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --sku standard
    echo "Key Vault created successfully!"
else
    echo "Key Vault already exists."
fi

echo ""
echo "=========================================="
echo "Setting Payment Provider Secrets"
echo "=========================================="

# Function to set secret interactively
set_secret() {
    local secret_name=$1
    local prompt=$2
    local current_value

    # Check if secret already exists
    current_value=$(az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "$secret_name" --query "value" -o tsv 2>/dev/null || echo "")

    if [ -n "$current_value" ]; then
        echo "[$secret_name] Already set. Skip? (y/n): "
        read -r skip
        if [ "$skip" = "y" ] || [ "$skip" = "Y" ]; then
            return
        fi
    fi

    echo "$prompt"
    read -rs secret_value
    echo ""

    if [ -n "$secret_value" ]; then
        az keyvault secret set \
            --vault-name "$KEY_VAULT_NAME" \
            --name "$secret_name" \
            --value "$secret_value" \
            --output none
        echo "  Set $secret_name"
    else
        echo "  Skipped $secret_name (empty value)"
    fi
}

# =============================================================================
# STRIPE (Primary Payment Provider)
# =============================================================================
echo ""
echo "--- STRIPE Configuration ---"
echo "Get keys from: https://dashboard.stripe.com/apikeys"
echo ""

set_secret "STRIPE-SECRET-KEY" "Enter Stripe Secret Key (sk_live_...):"
set_secret "STRIPE-PUBLISHABLE-KEY" "Enter Stripe Publishable Key (pk_live_...):"
set_secret "STRIPE-WEBHOOK-SECRET" "Enter Stripe Webhook Secret (whsec_...):"

# =============================================================================
# PAYSTACK (African Markets)
# =============================================================================
echo ""
echo "--- PAYSTACK Configuration ---"
echo "Get keys from: https://dashboard.paystack.com/#/settings/developers"
echo ""

set_secret "PAYSTACK-SECRET-KEY" "Enter Paystack Secret Key (sk_live_...):"
set_secret "PAYSTACK-PUBLIC-KEY" "Enter Paystack Public Key (pk_live_...):"

# =============================================================================
# FLUTTERWAVE (African Markets)
# =============================================================================
echo ""
echo "--- FLUTTERWAVE Configuration ---"
echo "Get keys from: https://dashboard.flutterwave.com/settings/apis"
echo ""

set_secret "FLUTTERWAVE-SECRET-KEY" "Enter Flutterwave Secret Key (FLWSECK_...):"
set_secret "FLUTTERWAVE-PUBLIC-KEY" "Enter Flutterwave Public Key (FLWPUBK_...):"
set_secret "FLUTTERWAVE-ENCRYPTION-KEY" "Enter Flutterwave Encryption Key:"

# =============================================================================
# DATABASE
# =============================================================================
echo ""
echo "--- DATABASE Configuration ---"
echo ""

set_secret "DB-PASSWORD" "Enter PostgreSQL Password:"
set_secret "DATABASE-URL" "Enter full DATABASE_URL connection string:"
set_secret "MONGODB-URI" "Enter MongoDB/CosmosDB connection string:"

# =============================================================================
# REDIS
# =============================================================================
echo ""
echo "--- REDIS Configuration ---"
echo ""

set_secret "REDIS-PASSWORD" "Enter Redis Password:"
set_secret "REDIS-URL" "Enter full REDIS_URL connection string:"

# =============================================================================
# JWT SECRETS
# =============================================================================
echo ""
echo "--- JWT Configuration ---"
echo "Generate with: openssl rand -base64 64"
echo ""

set_secret "JWT-SECRET" "Enter JWT Secret (64+ chars):"
set_secret "JWT-ACCESS-SECRET" "Enter JWT Access Secret (64+ chars):"
set_secret "JWT-REFRESH-SECRET" "Enter JWT Refresh Secret (64+ chars):"

# =============================================================================
# SERVICE-TO-SERVICE
# =============================================================================
echo ""
echo "--- Service Authentication ---"
echo ""

set_secret "SERVICE-API-KEY" "Enter Service API Key (64+ chars):"
set_secret "SESSION-SECRET" "Enter Session Secret (32+ chars):"

# =============================================================================
# OAUTH PROVIDERS
# =============================================================================
echo ""
echo "--- OAuth Providers ---"
echo ""

set_secret "GOOGLE-CLIENT-SECRET" "Enter Google OAuth Client Secret:"
set_secret "FACEBOOK-APP-SECRET" "Enter Facebook App Secret:"
set_secret "APPLE-PRIVATE-KEY" "Enter Apple Sign-In Private Key (paste full key):"

# =============================================================================
# EXTERNAL SERVICES
# =============================================================================
echo ""
echo "--- External Services ---"
echo ""

set_secret "SENDGRID-API-KEY" "Enter SendGrid API Key:"
set_secret "TWILIO-AUTH-TOKEN" "Enter Twilio Auth Token:"
set_secret "FIREBASE-PRIVATE-KEY" "Enter Firebase Private Key:"
set_secret "SENTRY-DSN" "Enter Sentry DSN:"
set_secret "AGORA-APP-CERTIFICATE" "Enter Agora App Certificate:"

# =============================================================================
# AZURE SERVICES
# =============================================================================
echo ""
echo "--- Azure Services ---"
echo ""

set_secret "AZURE-STORAGE-KEY" "Enter Azure Storage Key:"
set_secret "AZURE-STORAGE-CONNECTION-STRING" "Enter Azure Storage Connection String:"
set_secret "AZURE-FACE-API-KEY" "Enter Azure Face API Key:"
set_secret "AZURE-CONTENT-MODERATOR-KEY" "Enter Azure Content Moderator Key:"
set_secret "AZURE-SERVICE-BUS-CONNECTION-STRING" "Enter Azure Service Bus Connection String:"
set_secret "APPLICATION-INSIGHTS-CONNECTION-STRING" "Enter Application Insights Connection String:"

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Verify secrets with:"
echo "  az keyvault secret list --vault-name $KEY_VAULT_NAME --output table"
echo ""
echo "Next steps:"
echo "1. Grant AKS managed identity access to Key Vault"
echo "2. Update Kubernetes deployments to use Key Vault secrets"
echo "3. Verify secrets are accessible from pods"
