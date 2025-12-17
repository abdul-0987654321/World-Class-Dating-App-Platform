#!/bin/bash
################################################################################
# Azure Key Vault Secret Verification Script
# Purpose: Verify all required secrets exist in Key Vault
# Usage: ./verify-keyvault-secrets.sh <environment>
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

usage() {
    cat << EOF
Usage: $0 <environment>

Arguments:
    environment    Environment to verify (dev, staging, prod, common)

Example:
    $0 dev
    $0 staging
    $0 prod

EOF
    exit 1
}

# Check arguments
if [ $# -ne 1 ]; then
    usage
fi

ENVIRONMENT=$1

# Validate environment
case $ENVIRONMENT in
    dev|staging|prod|common)
        ;;
    *)
        print_error "Invalid environment: $ENVIRONMENT"
        exit 1
        ;;
esac

# Determine Key Vault name and required secrets
case $ENVIRONMENT in
    dev)
        KEY_VAULT_NAME="dating-app-dev-kv"
        REQUIRED_SECRETS=(
            "dev-database-url"
            "dev-postgres-password"
            "dev-redis-password"
            "dev-mongodb-uri"
            "dev-jwt-access-secret"
            "dev-jwt-refresh-secret"
            "dev-stripe-secret-key"
            "dev-sendgrid-api-key"
            "dev-twilio-auth-token"
            "dev-storage-account-key"
            "dev-face-api-key"
            "dev-cosmos-key"
            "dev-encryption-key"
            "dev-agora-app-certificate"
        )
        ;;
    staging)
        KEY_VAULT_NAME="dating-app-staging-kv"
        REQUIRED_SECRETS=(
            "staging-database-url"
            "staging-postgres-password"
            "staging-redis-password"
            "staging-mongodb-uri"
            "staging-jwt-access-secret"
            "staging-jwt-refresh-secret"
            "staging-stripe-secret-key"
            "staging-stripe-webhook-secret"
            "staging-sendgrid-api-key"
            "staging-twilio-auth-token"
            "staging-storage-account-key"
            "staging-face-api-key"
            "staging-cv-api-key"
            "staging-cosmos-key"
            "staging-encryption-key"
            "staging-agora-app-certificate"
            "staging-firebase-service-account"
            "staging-apns-key"
            "staging-test-user-password"
            "staging-kube-config"
        )
        ;;
    prod)
        KEY_VAULT_NAME="dating-app-prod-kv"
        REQUIRED_SECRETS=(
            "prod-database-url"
            "prod-postgres-password"
            "prod-redis-password"
            "prod-mongodb-uri"
            "prod-jwt-access-secret"
            "prod-jwt-refresh-secret"
            "prod-stripe-secret-key"
            "prod-stripe-webhook-secret"
            "prod-sendgrid-api-key"
            "prod-twilio-auth-token"
            "prod-storage-account-key"
            "prod-face-api-key"
            "prod-cv-api-key"
            "prod-cosmos-key"
            "prod-encryption-key"
            "prod-agora-app-certificate"
            "prod-firebase-service-account"
            "prod-apns-key"
            "prod-sentry-dsn"
            "prod-kube-config"
            "prod-acr-username"
            "prod-acr-password"
        )
        ;;
    common)
        KEY_VAULT_NAME="dating-app-common-kv"
        REQUIRED_SECRETS=(
            "docker-password"
            "azure-client-id"
            "azure-client-secret"
            "azure-tenant-id"
            "azure-subscription-id"
            "service-api-key"
            "internal-service-key"
            "sonar-token"
            "codecov-token"
            "snyk-token"
            "slack-webhook-url"
        )
        ;;
esac

print_info "=========================================="
print_info "Azure Key Vault Secret Verification"
print_info "=========================================="
print_info "Environment: $ENVIRONMENT"
print_info "Key Vault: $KEY_VAULT_NAME"
print_info "=========================================="

# Check Azure CLI
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed"
    exit 1
fi

# Check Azure login
if ! az account show &> /dev/null; then
    print_error "Not logged in to Azure CLI. Run: az login"
    exit 1
fi

# Check Key Vault exists
print_info "Checking Key Vault: $KEY_VAULT_NAME"
if ! az keyvault show --name "$KEY_VAULT_NAME" &> /dev/null; then
    print_error "Key Vault not found: $KEY_VAULT_NAME"
    exit 1
fi
print_success "Key Vault exists"

# Get all secrets from Key Vault
print_info "Fetching secrets from Key Vault..."
ALL_SECRETS=$(az keyvault secret list --vault-name "$KEY_VAULT_NAME" --query "[].name" -o tsv)

# Verify each required secret
MISSING_SECRETS=()
FOUND_SECRETS=0

print_info ""
print_info "Verifying required secrets..."

for secret in "${REQUIRED_SECRETS[@]}"; do
    if echo "$ALL_SECRETS" | grep -q "^${secret}$"; then
        print_success "$secret"
        FOUND_SECRETS=$((FOUND_SECRETS + 1))

        # Check secret value length (don't print value!)
        SECRET_LENGTH=$(az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "$secret" --query "value" -o tsv | wc -c)

        # Warn if secret seems too short
        case $secret in
            *password*|*secret*|*token*|*key*)
                if [ "$SECRET_LENGTH" -lt 16 ]; then
                    print_warning "  → Secret seems short ($SECRET_LENGTH chars). Verify it's correct."
                fi
                ;;
        esac
    else
        print_error "$secret - MISSING"
        MISSING_SECRETS+=("$secret")
    fi
done

# Check for extra secrets (not in required list)
print_info ""
print_info "Checking for extra secrets..."
EXTRA_SECRETS=0

while IFS= read -r secret; do
    found=false
    for required in "${REQUIRED_SECRETS[@]}"; do
        if [ "$secret" = "$required" ]; then
            found=true
            break
        fi
    done

    if [ "$found" = false ]; then
        print_warning "Extra secret (not in required list): $secret"
        EXTRA_SECRETS=$((EXTRA_SECRETS + 1))
    fi
done <<< "$ALL_SECRETS"

# Summary
print_info ""
print_info "=========================================="
print_info "Verification Summary"
print_info "=========================================="
print_success "Found: $FOUND_SECRETS / ${#REQUIRED_SECRETS[@]}"

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    print_error "Missing: ${#MISSING_SECRETS[@]}"
    print_error ""
    print_error "Missing secrets:"
    for secret in "${MISSING_SECRETS[@]}"; do
        print_error "  - $secret"
    done
fi

if [ $EXTRA_SECRETS -gt 0 ]; then
    print_warning "Extra secrets: $EXTRA_SECRETS"
fi

print_info "=========================================="

# Exit code
if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    print_error ""
    print_error "Verification FAILED: Missing required secrets"
    exit 1
else
    print_success ""
    print_success "Verification PASSED: All required secrets found"
    exit 0
fi
