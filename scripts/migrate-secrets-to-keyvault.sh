#!/bin/bash
################################################################################
# Azure Key Vault Secret Migration Script
# Purpose: Migrate secrets from GitHub to Azure Key Vault
# Usage: ./migrate-secrets-to-keyvault.sh <environment> <secrets-file>
#        Example: ./migrate-secrets-to-keyvault.sh dev secrets-dev.env
################################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/migration-$(date +%Y%m%d-%H%M%S).log"

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to show usage
usage() {
    cat << EOF
Usage: $0 <environment> <secrets-file>

Arguments:
    environment    Environment to migrate (dev, staging, prod, common)
    secrets-file   Path to file containing secrets (KEY=VALUE format)

Example:
    $0 dev secrets-dev.env
    $0 staging secrets-staging.env
    $0 prod secrets-prod.env

Note:
    - Secrets file should be in .gitignore
    - Format: KEY=VALUE (one per line)
    - Comments starting with # are ignored
    - Empty lines are ignored

EOF
    exit 1
}

# Check arguments
if [ $# -ne 2 ]; then
    print_error "Invalid number of arguments"
    usage
fi

ENVIRONMENT=$1
SECRETS_FILE=$2

# Validate environment
case $ENVIRONMENT in
    dev|staging|prod|common)
        ;;
    *)
        print_error "Invalid environment: $ENVIRONMENT"
        print_error "Valid environments: dev, staging, prod, common"
        exit 1
        ;;
esac

# Determine Key Vault name based on environment
case $ENVIRONMENT in
    dev)
        KEY_VAULT_NAME="dating-app-dev-kv"
        SECRET_PREFIX="dev"
        ;;
    staging)
        KEY_VAULT_NAME="dating-app-staging-kv"
        SECRET_PREFIX="staging"
        ;;
    prod)
        KEY_VAULT_NAME="dating-app-prod-kv"
        SECRET_PREFIX="prod"
        ;;
    common)
        KEY_VAULT_NAME="dating-app-common-kv"
        SECRET_PREFIX=""
        ;;
esac

print_info "=========================================="
print_info "Azure Key Vault Secret Migration"
print_info "=========================================="
print_info "Environment: $ENVIRONMENT"
print_info "Key Vault: $KEY_VAULT_NAME"
print_info "Secrets File: $SECRETS_FILE"
print_info "Log File: $LOG_FILE"
print_info "=========================================="

# Check if secrets file exists
if [ ! -f "$SECRETS_FILE" ]; then
    print_error "Secrets file not found: $SECRETS_FILE"
    exit 1
fi

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed"
    print_error "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
print_info "Checking Azure CLI login status..."
if ! az account show &> /dev/null; then
    print_error "Not logged in to Azure CLI"
    print_error "Run: az login"
    exit 1
fi

AZURE_ACCOUNT=$(az account show --query "name" -o tsv)
print_success "Logged in to Azure: $AZURE_ACCOUNT"

# Check if Key Vault exists
print_info "Checking if Key Vault exists: $KEY_VAULT_NAME"
if ! az keyvault show --name "$KEY_VAULT_NAME" &> /dev/null; then
    print_error "Key Vault not found: $KEY_VAULT_NAME"
    print_error "Create it first with: az keyvault create --name $KEY_VAULT_NAME --resource-group dating-app-keyvault-rg"
    exit 1
fi

print_success "Key Vault found: $KEY_VAULT_NAME"

# Function to convert secret name to Key Vault format
# Rules: lowercase, replace underscores with hyphens, add prefix
convert_secret_name() {
    local key=$1
    local kv_name=$(echo "$key" | tr '_' '-' | tr '[:upper:]' '[:lower:]')

    if [ -n "$SECRET_PREFIX" ]; then
        echo "${SECRET_PREFIX}-${kv_name}"
    else
        echo "$kv_name"
    fi
}

# Function to validate secret value
validate_secret() {
    local key=$1
    local value=$2

    # Check if value is empty
    if [ -z "$value" ]; then
        print_warning "Empty value for $key, skipping..."
        return 1
    fi

    # Check if value contains placeholder text
    if [[ "$value" =~ ^(your_|your-|change_this|REPLACE_|TODO) ]]; then
        print_warning "Placeholder value detected for $key: $value"
        print_warning "Please update with actual value before migrating"
        return 1
    fi

    # Check minimum length for critical secrets
    case $key in
        *PASSWORD*|*SECRET*|*TOKEN*|*KEY*)
            if [ ${#value} -lt 16 ]; then
                print_warning "Secret $key is too short (${#value} chars). Minimum 16 recommended."
                return 1
            fi
            ;;
    esac

    return 0
}

# Parse secrets file and upload
print_info "Parsing secrets file..."
TOTAL_SECRETS=0
UPLOADED_SECRETS=0
SKIPPED_SECRETS=0
FAILED_SECRETS=0

while IFS='=' read -r key value; do
    # Skip empty lines
    [[ -z "$key" ]] && continue

    # Skip comments
    [[ "$key" =~ ^[[:space:]]*# ]] && continue

    # Trim whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)

    TOTAL_SECRETS=$((TOTAL_SECRETS + 1))

    # Validate secret
    if ! validate_secret "$key" "$value"; then
        SKIPPED_SECRETS=$((SKIPPED_SECRETS + 1))
        continue
    fi

    # Convert secret name
    kv_secret_name=$(convert_secret_name "$key")

    print_info "Uploading: $key → $kv_secret_name"

    # Upload to Key Vault
    if az keyvault secret set \
        --vault-name "$KEY_VAULT_NAME" \
        --name "$kv_secret_name" \
        --value "$value" \
        --output none 2>> "$LOG_FILE"; then

        UPLOADED_SECRETS=$((UPLOADED_SECRETS + 1))
        print_success "✓ Uploaded: $kv_secret_name"

        # Add tags for critical secrets in production
        if [ "$ENVIRONMENT" = "prod" ]; then
            case $key in
                *PASSWORD*|*SECRET*|*TOKEN*|DATABASE_URL|STRIPE_*)
                    az keyvault secret set-attributes \
                        --vault-name "$KEY_VAULT_NAME" \
                        --name "$kv_secret_name" \
                        --tags environment=production critical=true \
                        --output none 2>> "$LOG_FILE"
                    print_info "  Tagged as critical secret"
                    ;;
            esac
        fi
    else
        FAILED_SECRETS=$((FAILED_SECRETS + 1))
        print_error "✗ Failed to upload: $kv_secret_name"
    fi

done < "$SECRETS_FILE"

# Summary
print_info "=========================================="
print_info "Migration Summary"
print_info "=========================================="
print_info "Total secrets found: $TOTAL_SECRETS"
print_success "Successfully uploaded: $UPLOADED_SECRETS"
print_warning "Skipped (invalid/placeholder): $SKIPPED_SECRETS"
print_error "Failed: $FAILED_SECRETS"
print_info "=========================================="

# Verification
if [ $UPLOADED_SECRETS -gt 0 ]; then
    print_info "Verifying uploaded secrets..."

    SECRET_COUNT=$(az keyvault secret list --vault-name "$KEY_VAULT_NAME" --query "length([])" -o tsv)
    print_success "Total secrets in Key Vault: $SECRET_COUNT"

    print_info ""
    print_info "Next Steps:"
    print_info "1. Verify secrets in Azure Portal:"
    print_info "   https://portal.azure.com/#view/Microsoft_Azure_KeyVault/SecretMenuBlade/~/Overview/vaultResourceId/%2Fsubscriptions%2F{subscription}%2FresourceGroups%2Fdating-app-keyvault-rg%2Fproviders%2FMicrosoft.KeyVault%2Fvaults%2F${KEY_VAULT_NAME}"
    print_info "2. Link Key Vault to Azure DevOps Variable Group"
    print_info "3. Test pipeline with new secrets"
    print_info "4. Review skipped secrets and update placeholders"
fi

if [ $FAILED_SECRETS -gt 0 ]; then
    print_error ""
    print_error "Some secrets failed to upload. Check log file: $LOG_FILE"
    exit 1
fi

print_success ""
print_success "Migration completed successfully!"
exit 0
