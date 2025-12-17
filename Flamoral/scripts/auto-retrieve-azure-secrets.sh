#!/bin/bash
# =============================================================================
# Flamoral Dating Platform - Auto-Retrieve Azure Secrets
# =============================================================================
# This script automatically retrieves connection strings and keys from Azure
# resources and updates Key Vault secrets.
#
# Usage: ./auto-retrieve-azure-secrets.sh [--dry-run]
#
# Prerequisites:
#   - Azure CLI installed and authenticated (az login)
#   - Key Vault Secrets Officer or Administrator role
# =============================================================================

set -e

# Configuration
RESOURCE_GROUP="flamoral-prod-rg"
STORAGE_ACCOUNT="flamoralprodzcqqgc"

# Vault names
DATA_VAULT="flamoral-prod-data-kv"
INFRA_VAULT="flamoral-prod-infra-kv"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Parse arguments
DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
fi

# Counters
UPDATED=0
SKIPPED=0
FAILED=0

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  $1${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

print_skip() {
    echo -e "${GRAY}⊘${NC} $1"
}

# Update Key Vault secret
update_secret() {
    local vault="$1"
    local secret_name="$2"
    local secret_value="$3"
    local description="$4"

    if [[ -z "$secret_value" ]]; then
        print_error "Empty value for $secret_name"
        FAILED=$((FAILED + 1))
        return 1
    fi

    if [[ "$DRY_RUN" == true ]]; then
        print_info "[DRY RUN] Would update: $vault/$secret_name"
        UPDATED=$((UPDATED + 1))
        return 0
    fi

    if az keyvault secret set \
        --vault-name "$vault" \
        --name "$secret_name" \
        --value "$secret_value" \
        --description "$description" \
        --output none 2>/dev/null; then
        print_success "Updated: $secret_name"
        UPDATED=$((UPDATED + 1))
        return 0
    else
        print_error "Failed to update: $secret_name"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Check if Azure resource exists
resource_exists() {
    local resource_type="$1"
    local resource_name="$2"

    case "$resource_type" in
        "storage")
            az storage account show \
                --name "$resource_name" \
                --resource-group "$RESOURCE_GROUP" \
                --output none 2>/dev/null
            ;;
        "redis")
            az redis show \
                --name "$resource_name" \
                --resource-group "$RESOURCE_GROUP" \
                --output none 2>/dev/null
            ;;
        "cosmos")
            az cosmosdb show \
                --name "$resource_name" \
                --resource-group "$RESOURCE_GROUP" \
                --output none 2>/dev/null
            ;;
        "postgres")
            az postgres flexible-server show \
                --name "$resource_name" \
                --resource-group "$RESOURCE_GROUP" \
                --output none 2>/dev/null
            ;;
        "insights")
            az monitor app-insights component show \
                --app "$resource_name" \
                --resource-group "$RESOURCE_GROUP" \
                --output none 2>/dev/null
            ;;
        "servicebus")
            az servicebus namespace show \
                --name "$resource_name" \
                --resource-group "$RESOURCE_GROUP" \
                --output none 2>/dev/null
            ;;
        "cognitiveservices")
            az cognitiveservices account show \
                --name "$resource_name" \
                --resource-group "$RESOURCE_GROUP" \
                --output none 2>/dev/null
            ;;
        *)
            return 1
            ;;
    esac
}

# =============================================================================
# Main Script
# =============================================================================

print_header "Flamoral - Auto-Retrieve Azure Secrets"

if [[ "$DRY_RUN" == true ]]; then
    print_warning "DRY RUN MODE - No changes will be made"
fi

print_info "Resource Group: $RESOURCE_GROUP"
print_info "Data Vault: $DATA_VAULT"
print_info "Infrastructure Vault: $INFRA_VAULT"

# Check authentication
echo ""
print_info "Checking Azure authentication..."
if ! az account show &>/dev/null; then
    print_error "Not authenticated to Azure"
    echo "Please run: az login"
    exit 1
fi

ACCOUNT_NAME=$(az account show --query "user.name" --output tsv)
SUBSCRIPTION_NAME=$(az account show --query "name" --output tsv)
print_success "Authenticated as: $ACCOUNT_NAME"
print_info "Subscription: $SUBSCRIPTION_NAME"

# =============================================================================
# 1. Azure Storage Account
# =============================================================================

print_section "1. Azure Storage Account"

if resource_exists "storage" "$STORAGE_ACCOUNT"; then
    print_info "Found storage account: $STORAGE_ACCOUNT"

    # Get connection string
    echo -n "  Retrieving connection string... "
    STORAGE_CONN=$(az storage account show-connection-string \
        --name "$STORAGE_ACCOUNT" \
        --resource-group "$RESOURCE_GROUP" \
        --output tsv 2>/dev/null)

    if [[ -n "$STORAGE_CONN" ]]; then
        echo -e "${GREEN}✓${NC}"
        update_secret "$INFRA_VAULT" \
            "azure-storage-connection-string" \
            "$STORAGE_CONN" \
            "Azure Storage connection string (auto-retrieved from $STORAGE_ACCOUNT)"
    else
        echo -e "${RED}✗${NC}"
        print_error "Failed to retrieve storage connection string"
        FAILED=$((FAILED + 1))
    fi

    # Get primary key
    echo -n "  Retrieving primary key... "
    STORAGE_KEY=$(az storage account keys list \
        --account-name "$STORAGE_ACCOUNT" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[0].value" \
        --output tsv 2>/dev/null)

    if [[ -n "$STORAGE_KEY" ]]; then
        echo -e "${GREEN}✓${NC}"
        update_secret "$INFRA_VAULT" \
            "azure-storage-key" \
            "$STORAGE_KEY" \
            "Azure Storage primary key (auto-retrieved)"
    else
        echo -e "${RED}✗${NC}"
        print_warning "Failed to retrieve storage key"
    fi

else
    print_skip "Storage account not found: $STORAGE_ACCOUNT"
    SKIPPED=$((SKIPPED + 1))
fi

# =============================================================================
# 2. Azure Redis Cache
# =============================================================================

print_section "2. Azure Redis Cache"

REDIS_NAME="flamoral-prod-redis"

if resource_exists "redis" "$REDIS_NAME"; then
    print_info "Found Redis cache: $REDIS_NAME"

    # Get hostname
    echo -n "  Retrieving hostname... "
    REDIS_HOST=$(az redis show \
        --name "$REDIS_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "hostName" \
        --output tsv 2>/dev/null)
    echo -e "${GREEN}✓${NC} $REDIS_HOST"

    # Get primary key
    echo -n "  Retrieving primary key... "
    REDIS_KEY=$(az redis list-keys \
        --name "$REDIS_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "primaryKey" \
        --output tsv 2>/dev/null)

    if [[ -n "$REDIS_KEY" ]]; then
        echo -e "${GREEN}✓${NC}"

        # Update password
        update_secret "$DATA_VAULT" \
            "redis-password" \
            "$REDIS_KEY" \
            "Redis primary key (auto-retrieved from $REDIS_NAME)"

        # Get SSL port
        REDIS_PORT=$(az redis show \
            --name "$REDIS_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --query "sslPort" \
            --output tsv 2>/dev/null)

        # Construct connection string
        REDIS_CONN="rediss://:${REDIS_KEY}@${REDIS_HOST}:${REDIS_PORT}/0"

        update_secret "$DATA_VAULT" \
            "redis-connection-string" \
            "$REDIS_CONN" \
            "Redis connection string (auto-generated)"
    else
        echo -e "${RED}✗${NC}"
        print_error "Failed to retrieve Redis key"
        FAILED=$((FAILED + 1))
    fi

else
    print_skip "Redis cache not found: $REDIS_NAME"
    SKIPPED=$((SKIPPED + 2))
fi

# =============================================================================
# 3. Azure Cosmos DB
# =============================================================================

print_section "3. Azure Cosmos DB"

COSMOS_NAME="flamoral-prod-cosmos"

if resource_exists "cosmos" "$COSMOS_NAME"; then
    print_info "Found Cosmos DB: $COSMOS_NAME"

    # Get primary key
    echo -n "  Retrieving primary master key... "
    COSMOS_KEY=$(az cosmosdb keys list \
        --name "$COSMOS_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --type keys \
        --query "primaryMasterKey" \
        --output tsv 2>/dev/null)

    if [[ -n "$COSMOS_KEY" ]]; then
        echo -e "${GREEN}✓${NC}"
        update_secret "$DATA_VAULT" \
            "cosmosdb-key" \
            "$COSMOS_KEY" \
            "Cosmos DB primary master key (auto-retrieved from $COSMOS_NAME)"
    else
        echo -e "${RED}✗${NC}"
        print_error "Failed to retrieve Cosmos DB key"
        FAILED=$((FAILED + 1))
    fi

    # Get MongoDB connection string
    echo -n "  Retrieving MongoDB connection string... "
    COSMOS_CONN=$(az cosmosdb keys list \
        --name "$COSMOS_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --type connection-strings \
        --query "connectionStrings[0].connectionString" \
        --output tsv 2>/dev/null)

    if [[ -n "$COSMOS_CONN" ]]; then
        echo -e "${GREEN}✓${NC}"
        update_secret "$DATA_VAULT" \
            "mongodb-uri" \
            "$COSMOS_CONN" \
            "Cosmos DB MongoDB connection string (auto-retrieved)"
    else
        echo -e "${RED}✗${NC}"
        print_warning "Failed to retrieve Cosmos DB connection string"
    fi

else
    print_skip "Cosmos DB not found: $COSMOS_NAME"
    SKIPPED=$((SKIPPED + 2))
fi

# =============================================================================
# 4. Azure PostgreSQL
# =============================================================================

print_section "4. Azure PostgreSQL Database"

POSTGRES_NAME="flamoral-prod-postgres"

if resource_exists "postgres" "$POSTGRES_NAME"; then
    print_info "Found PostgreSQL server: $POSTGRES_NAME"

    # Get FQDN
    echo -n "  Retrieving server FQDN... "
    POSTGRES_HOST=$(az postgres flexible-server show \
        --name "$POSTGRES_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "fullyQualifiedDomainName" \
        --output tsv 2>/dev/null)
    echo -e "${GREEN}✓${NC} $POSTGRES_HOST"

    # Get admin username
    echo -n "  Retrieving admin username... "
    POSTGRES_USER=$(az postgres flexible-server show \
        --name "$POSTGRES_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "administratorLogin" \
        --output tsv 2>/dev/null)
    echo -e "${GREEN}✓${NC} $POSTGRES_USER"

    print_warning "PostgreSQL admin password cannot be auto-retrieved"
    print_info "Connection string requires admin password to be set manually"
    print_info "Format: postgresql://$POSTGRES_USER:<password>@$POSTGRES_HOST:5432/flamoral?sslmode=require"

    SKIPPED=$((SKIPPED + 1))

else
    print_skip "PostgreSQL server not found: $POSTGRES_NAME"
    SKIPPED=$((SKIPPED + 1))
fi

# =============================================================================
# 5. Azure Application Insights
# =============================================================================

print_section "5. Azure Application Insights"

INSIGHTS_NAME="flamoral-prod-insights"

if resource_exists "insights" "$INSIGHTS_NAME"; then
    print_info "Found Application Insights: $INSIGHTS_NAME"

    # Get connection string
    echo -n "  Retrieving connection string... "
    INSIGHTS_CONN=$(az monitor app-insights component show \
        --app "$INSIGHTS_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "connectionString" \
        --output tsv 2>/dev/null)

    if [[ -n "$INSIGHTS_CONN" ]]; then
        echo -e "${GREEN}✓${NC}"
        update_secret "$INFRA_VAULT" \
            "application-insights-connection-string" \
            "$INSIGHTS_CONN" \
            "Application Insights connection string (auto-retrieved from $INSIGHTS_NAME)"
    else
        echo -e "${RED}✗${NC}"
        print_error "Failed to retrieve Application Insights connection string"
        FAILED=$((FAILED + 1))
    fi

else
    print_skip "Application Insights not found: $INSIGHTS_NAME"
    SKIPPED=$((SKIPPED + 1))
fi

# =============================================================================
# 6. Azure Service Bus
# =============================================================================

print_section "6. Azure Service Bus"

SERVICEBUS_NAME="flamoral-prod-servicebus"

if resource_exists "servicebus" "$SERVICEBUS_NAME"; then
    print_info "Found Service Bus namespace: $SERVICEBUS_NAME"

    # Get connection string
    echo -n "  Retrieving primary connection string... "
    SERVICEBUS_CONN=$(az servicebus namespace authorization-rule keys list \
        --name RootManageSharedAccessKey \
        --namespace-name "$SERVICEBUS_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "primaryConnectionString" \
        --output tsv 2>/dev/null)

    if [[ -n "$SERVICEBUS_CONN" ]]; then
        echo -e "${GREEN}✓${NC}"
        update_secret "$INFRA_VAULT" \
            "azure-service-bus-connection-string" \
            "$SERVICEBUS_CONN" \
            "Service Bus connection string (auto-retrieved from $SERVICEBUS_NAME)"
    else
        echo -e "${RED}✗${NC}"
        print_error "Failed to retrieve Service Bus connection string"
        FAILED=$((FAILED + 1))
    fi

else
    print_skip "Service Bus namespace not found: $SERVICEBUS_NAME"
    SKIPPED=$((SKIPPED + 1))
fi

# =============================================================================
# 7. Azure Face API (Cognitive Services)
# =============================================================================

print_section "7. Azure Face API"

FACE_API_NAME="flamoral-prod-face-api"

if resource_exists "cognitiveservices" "$FACE_API_NAME"; then
    print_info "Found Face API: $FACE_API_NAME"

    # Get primary key
    echo -n "  Retrieving primary key... "
    FACE_API_KEY=$(az cognitiveservices account keys list \
        --name "$FACE_API_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "key1" \
        --output tsv 2>/dev/null)

    if [[ -n "$FACE_API_KEY" ]]; then
        echo -e "${GREEN}✓${NC}"
        update_secret "$INFRA_VAULT" \
            "azure-face-api-key" \
            "$FACE_API_KEY" \
            "Azure Face API key (auto-retrieved from $FACE_API_NAME)"
    else
        echo -e "${RED}✗${NC}"
        print_error "Failed to retrieve Face API key"
        FAILED=$((FAILED + 1))
    fi

else
    print_skip "Face API not found: $FACE_API_NAME"
    SKIPPED=$((SKIPPED + 1))
fi

# =============================================================================
# 8. Azure Content Moderator
# =============================================================================

print_section "8. Azure Content Moderator"

MODERATOR_NAME="flamoral-prod-content-moderator"

if resource_exists "cognitiveservices" "$MODERATOR_NAME"; then
    print_info "Found Content Moderator: $MODERATOR_NAME"

    # Get primary key
    echo -n "  Retrieving primary key... "
    MODERATOR_KEY=$(az cognitiveservices account keys list \
        --name "$MODERATOR_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "key1" \
        --output tsv 2>/dev/null)

    if [[ -n "$MODERATOR_KEY" ]]; then
        echo -e "${GREEN}✓${NC}"
        update_secret "$INFRA_VAULT" \
            "azure-content-moderator-key" \
            "$MODERATOR_KEY" \
            "Azure Content Moderator key (auto-retrieved from $MODERATOR_NAME)"
    else
        echo -e "${RED}✗${NC}"
        print_error "Failed to retrieve Content Moderator key"
        FAILED=$((FAILED + 1))
    fi

else
    print_skip "Content Moderator not found: $MODERATOR_NAME"
    SKIPPED=$((SKIPPED + 1))
fi

# =============================================================================
# Summary
# =============================================================================

print_section "Summary"

echo ""
echo "Total secrets processed:"
echo -e "  ${GREEN}Updated:${NC}  $UPDATED"
echo -e "  ${GRAY}Skipped:${NC}  $SKIPPED (resources not found)"
echo -e "  ${RED}Failed:${NC}   $FAILED"
echo ""

if [[ "$DRY_RUN" == true ]]; then
    print_warning "This was a DRY RUN - no changes were made"
    print_info "Run without --dry-run to apply changes"
elif [[ $FAILED -eq 0 ]]; then
    print_success "All Azure secrets retrieved and updated successfully!"
else
    print_warning "Some secrets failed to update. Check errors above."
fi

echo ""

# Exit code
if [[ $FAILED -gt 0 ]]; then
    exit 1
else
    exit 0
fi
