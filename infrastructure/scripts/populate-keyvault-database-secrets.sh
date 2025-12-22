#!/bin/bash

# =============================================================================
# Flamoral Dating Platform - Populate Key Vault with Database Secrets
# =============================================================================
# This script populates Azure Key Vault with the required database secrets
# after PostgreSQL and Redis have been provisioned.
#
# Usage: ./populate-keyvault-database-secrets.sh [OPTIONS]
#
# Prerequisites:
# - Azure CLI installed and logged in
# - PostgreSQL server flamoral-prod-db exists
# - Redis cache flamoral-prod-redis exists
# - Key Vault flamoral-prod-kv exists
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-flamoral-prod-rg}"
KEYVAULT_NAME="${KEYVAULT_NAME:-flamoral-prod-kv}"
PG_SERVER_NAME="${PG_SERVER_NAME:-flamoral-prod-db}"
PG_ADMIN_USER="${PG_ADMIN_USER:-flamoraladmin}"
REDIS_NAME="${REDIS_NAME:-flamoral-prod-redis}"

# Parse arguments
DRY_RUN=false
PG_PASSWORD=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --password|-p)
      PG_PASSWORD="$2"
      shift 2
      ;;
    --keyvault|-k)
      KEYVAULT_NAME="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Populates Azure Key Vault with database secrets"
      echo ""
      echo "Options:"
      echo "  --dry-run               Show what would be done without executing"
      echo "  -p, --password <pass>   PostgreSQL admin password"
      echo "  -k, --keyvault <name>   Key Vault name (default: flamoral-prod-kv)"
      echo "  -h, --help              Show this help"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Print header
echo -e "${BLUE}+======================================================================+${NC}"
echo -e "${BLUE}|     Flamoral - Populate Key Vault with Database Secrets            |${NC}"
echo -e "${BLUE}+======================================================================+${NC}"
echo ""
echo -e "${CYAN}Configuration:${NC}"
echo -e "  Resource Group: ${GREEN}${RESOURCE_GROUP}${NC}"
echo -e "  Key Vault:      ${GREEN}${KEYVAULT_NAME}${NC}"
echo -e "  PostgreSQL:     ${GREEN}${PG_SERVER_NAME}${NC}"
echo -e "  Redis:          ${GREEN}${REDIS_NAME}${NC}"
echo ""

# Check Azure CLI login
echo -e "${YELLOW}Checking Azure authentication...${NC}"
if ! az account show &> /dev/null; then
  echo -e "${RED}Not logged in to Azure. Please run 'az login' first.${NC}"
  exit 1
fi
echo -e "${GREEN}[OK] Azure authentication verified${NC}"
echo ""

# Check Key Vault exists
echo -e "${YELLOW}Checking Key Vault...${NC}"
if ! az keyvault show --name "$KEYVAULT_NAME" &> /dev/null; then
  echo -e "${RED}Key Vault ${KEYVAULT_NAME} not found.${NC}"
  exit 1
fi
echo -e "${GREEN}[OK] Key Vault found${NC}"
echo ""

# Get PostgreSQL FQDN
echo -e "${YELLOW}Getting PostgreSQL server details...${NC}"
PG_FQDN=$(az postgres flexible-server show \
  --name "$PG_SERVER_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "fullyQualifiedDomainName" -o tsv 2>/dev/null || echo "")

if [ -z "$PG_FQDN" ]; then
  echo -e "${RED}PostgreSQL server ${PG_SERVER_NAME} not found.${NC}"
  exit 1
fi
echo -e "${GREEN}PostgreSQL FQDN: ${PG_FQDN}${NC}"
echo ""

# Get Redis details
echo -e "${YELLOW}Getting Redis cache details...${NC}"
REDIS_HOSTNAME=$(az redis show \
  --name "$REDIS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "hostName" -o tsv 2>/dev/null || echo "")

if [ -z "$REDIS_HOSTNAME" ]; then
  echo -e "${RED}Redis cache ${REDIS_NAME} not found.${NC}"
  exit 1
fi

REDIS_PORT=$(az redis show \
  --name "$REDIS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "sslPort" -o tsv)

REDIS_KEY=$(az redis list-keys \
  --name "$REDIS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "primaryKey" -o tsv)

echo -e "${GREEN}Redis Hostname: ${REDIS_HOSTNAME}${NC}"
echo -e "${GREEN}Redis Port: ${REDIS_PORT}${NC}"
echo ""

# Prompt for PostgreSQL password if not provided
if [ -z "$PG_PASSWORD" ]; then
  echo -e "${YELLOW}PostgreSQL admin password not provided.${NC}"
  echo -n "Enter PostgreSQL admin password: "
  read -s PG_PASSWORD
  echo ""
  echo ""
fi

# Build connection strings
PG_CONNECTION_STRING="postgresql://${PG_ADMIN_USER}:${PG_PASSWORD}@${PG_FQDN}:5432/flamoral_users?sslmode=require"
AUTH_DB_URL="postgresql://${PG_ADMIN_USER}:${PG_PASSWORD}@${PG_FQDN}:5432/flamoral_auth?sslmode=require"
USERS_DB_URL="postgresql://${PG_ADMIN_USER}:${PG_PASSWORD}@${PG_FQDN}:5432/flamoral_users?sslmode=require"
MATCHING_DB_URL="postgresql://${PG_ADMIN_USER}:${PG_PASSWORD}@${PG_FQDN}:5432/flamoral_matching?sslmode=require"
MESSAGING_DB_URL="postgresql://${PG_ADMIN_USER}:${PG_PASSWORD}@${PG_FQDN}:5432/flamoral_messaging?sslmode=require"
REDIS_URL="rediss://:${REDIS_KEY}@${REDIS_HOSTNAME}:${REDIS_PORT}"

# Store secrets in Key Vault
echo -e "${YELLOW}Storing secrets in Key Vault...${NC}"
echo "------------------------------------------------------------------------"

store_secret() {
  local name=$1
  local value=$2

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would set secret: ${name}${NC}"
    return 0
  fi

  az keyvault secret set \
    --vault-name "$KEYVAULT_NAME" \
    --name "$name" \
    --value "$value" \
    --output none

  echo -e "${GREEN}[OK] Set secret: ${name}${NC}"
}

# PostgreSQL secrets
echo -e "${BLUE}Storing PostgreSQL secrets...${NC}"
store_secret "postgres-host" "$PG_FQDN"
store_secret "postgres-port" "5432"
store_secret "postgres-username" "$PG_ADMIN_USER"
store_secret "postgres-password" "$PG_PASSWORD"
store_secret "database-url" "$PG_CONNECTION_STRING"
store_secret "database-password" "$PG_PASSWORD"

# Per-service database URLs
echo -e "${BLUE}Storing per-service database URLs...${NC}"
store_secret "auth-database-url" "$AUTH_DB_URL"
store_secret "users-database-url" "$USERS_DB_URL"
store_secret "matching-database-url" "$MATCHING_DB_URL"
store_secret "messaging-database-url" "$MESSAGING_DB_URL"

# Redis secrets
echo -e "${BLUE}Storing Redis secrets...${NC}"
store_secret "redis-host" "$REDIS_HOSTNAME"
store_secret "redis-port" "$REDIS_PORT"
store_secret "redis-password" "$REDIS_KEY"
store_secret "redis-url" "$REDIS_URL"
store_secret "redis-tls-enabled" "true"

echo ""

# Verify secrets
echo -e "${YELLOW}Verifying secrets in Key Vault...${NC}"
echo "------------------------------------------------------------------------"

verify_secret() {
  local name=$1

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would verify secret: ${name}${NC}"
    return 0
  fi

  if az keyvault secret show --vault-name "$KEYVAULT_NAME" --name "$name" &> /dev/null; then
    echo -e "${GREEN}[OK] ${name}${NC}"
  else
    echo -e "${RED}[MISSING] ${name}${NC}"
  fi
}

SECRETS=(
  "postgres-host"
  "postgres-port"
  "postgres-username"
  "postgres-password"
  "database-url"
  "auth-database-url"
  "users-database-url"
  "matching-database-url"
  "messaging-database-url"
  "redis-host"
  "redis-port"
  "redis-password"
  "redis-url"
  "redis-tls-enabled"
)

for secret in "${SECRETS[@]}"; do
  verify_secret "$secret"
done

echo ""

# Print summary
echo -e "${BLUE}+======================================================================+${NC}"
echo -e "${BLUE}|                         Summary                                     |${NC}"
echo -e "${BLUE}+======================================================================+${NC}"
echo ""
echo -e "${CYAN}Key Vault Secrets Stored:${NC}"
echo "  - postgres-host, postgres-port, postgres-username, postgres-password"
echo "  - database-url (generic), database-password"
echo "  - auth-database-url, users-database-url, matching-database-url, messaging-database-url"
echo "  - redis-host, redis-port, redis-password, redis-url, redis-tls-enabled"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Apply External Secrets to sync with Kubernetes:"
echo "     kubectl apply -f infrastructure/kubernetes/secrets/database-external-secrets.yaml"
echo ""
echo "  2. Verify secrets in Kubernetes:"
echo "     kubectl get secrets -n flamoral"
echo ""
echo "  3. Run connectivity verification:"
echo "     ./infrastructure/scripts/verify-database-connectivity.sh"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}This was a dry run. No changes were made.${NC}"
fi

echo -e "${GREEN}[OK] Key Vault secrets population completed!${NC}"
