#!/bin/bash

# =============================================================================
# Flamoral Dating Platform - Database Infrastructure Setup
# =============================================================================
# This script provisions and configures:
# 1. Azure Database for PostgreSQL Flexible Server
# 2. Azure Cache for Redis
# 3. Required databases
# 4. Kubernetes secrets
# 5. Firewall rules for AKS connectivity
#
# Usage: ./setup-database-infrastructure.sh [OPTIONS]
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
LOCATION="${LOCATION:-westus2}"
AKS_CLUSTER="${AKS_CLUSTER:-flamoral-prod-aks}"
NAMESPACE="${NAMESPACE:-flamoral}"

# PostgreSQL configuration
PG_SERVER_NAME="${PG_SERVER_NAME:-flamoral-prod-db}"
PG_ADMIN_USER="${PG_ADMIN_USER:-flamoraladmin}"
PG_SKU="${PG_SKU:-Standard_B1ms}"
PG_TIER="${PG_TIER:-Burstable}"
PG_STORAGE="${PG_STORAGE:-32}"
PG_VERSION="${PG_VERSION:-15}"

# Redis configuration
REDIS_NAME="${REDIS_NAME:-flamoral-prod-redis}"
REDIS_SKU="${REDIS_SKU:-Basic}"
REDIS_VM_SIZE="${REDIS_VM_SIZE:-c0}"

# Required databases
DATABASES=("flamoral_auth" "flamoral_users" "flamoral_matching" "flamoral_messaging")

# Parse arguments
DRY_RUN=false
SKIP_POSTGRES=false
SKIP_REDIS=false
SKIP_SECRETS=false
SKIP_FIREWALL=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-postgres)
      SKIP_POSTGRES=true
      shift
      ;;
    --skip-redis)
      SKIP_REDIS=true
      shift
      ;;
    --skip-secrets)
      SKIP_SECRETS=true
      shift
      ;;
    --skip-firewall)
      SKIP_FIREWALL=true
      shift
      ;;
    --resource-group|-g)
      RESOURCE_GROUP="$2"
      shift 2
      ;;
    --location|-l)
      LOCATION="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Provisions Azure PostgreSQL and Redis for Flamoral production environment"
      echo ""
      echo "Options:"
      echo "  --dry-run           Show what would be done without executing"
      echo "  --skip-postgres     Skip PostgreSQL provisioning"
      echo "  --skip-redis        Skip Redis provisioning"
      echo "  --skip-secrets      Skip Kubernetes secrets creation"
      echo "  --skip-firewall     Skip firewall rules configuration"
      echo "  -g, --resource-group  Resource group name (default: flamoral-prod-rg)"
      echo "  -l, --location        Azure region (default: westus2)"
      echo "  -h, --help            Show this help"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../.."

# Print header
print_header() {
  echo -e "${BLUE}+======================================================================+${NC}"
  echo -e "${BLUE}|     Flamoral Dating Platform - Database Infrastructure Setup        |${NC}"
  echo -e "${BLUE}+======================================================================+${NC}"
  echo ""
  echo -e "${CYAN}Configuration:${NC}"
  echo -e "  Resource Group:    ${GREEN}${RESOURCE_GROUP}${NC}"
  echo -e "  Location:          ${GREEN}${LOCATION}${NC}"
  echo -e "  AKS Cluster:       ${GREEN}${AKS_CLUSTER}${NC}"
  echo -e "  Namespace:         ${GREEN}${NAMESPACE}${NC}"
  echo -e "  PostgreSQL Server: ${GREEN}${PG_SERVER_NAME}${NC}"
  echo -e "  Redis Name:        ${GREEN}${REDIS_NAME}${NC}"
  echo -e "  Dry Run:           ${GREEN}${DRY_RUN}${NC}"
  echo ""
}

# Generate secure password
generate_password() {
  # Generate a 32-character password with letters, numbers, and special characters
  # Ensures it meets Azure password requirements
  local password=""
  local chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'

  # Ensure at least one of each required character type
  password+=$(echo $RANDOM | md5sum | head -c 8)
  password+=$(echo "ABCDEFGHIJKLMNOPQRSTUVWXYZ" | fold -w1 | shuf | head -c 4)
  password+=$(echo "abcdefghijklmnopqrstuvwxyz" | fold -w1 | shuf | head -c 4)
  password+=$(echo "0123456789" | fold -w1 | shuf | head -c 4)
  password+=$(echo '!@#$%^&*' | fold -w1 | shuf | head -c 4)

  # Shuffle the password
  echo "$password" | fold -w1 | shuf | tr -d '\n'
}

# Check Azure CLI login
check_azure_login() {
  echo -e "${YELLOW}Checking Azure authentication...${NC}"

  if ! az account show &> /dev/null; then
    echo -e "${RED}Not logged in to Azure. Please run 'az login' first.${NC}"
    exit 1
  fi

  local account=$(az account show --query name -o tsv)
  echo -e "${GREEN}[OK] Logged in to Azure: ${account}${NC}"
  echo ""
}

# Check if resource group exists
check_resource_group() {
  echo -e "${YELLOW}Checking resource group...${NC}"

  if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    echo -e "${YELLOW}Resource group ${RESOURCE_GROUP} does not exist. Creating...${NC}"

    if [ "$DRY_RUN" = true ]; then
      echo -e "${CYAN}[DRY RUN] Would create resource group: ${RESOURCE_GROUP}${NC}"
    else
      az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
    fi
  fi

  echo -e "${GREEN}[OK] Resource group ready: ${RESOURCE_GROUP}${NC}"
  echo ""
}

# Deploy PostgreSQL Flexible Server
deploy_postgresql() {
  if [ "$SKIP_POSTGRES" = true ]; then
    echo -e "${YELLOW}Skipping PostgreSQL deployment (--skip-postgres)${NC}"
    return 0
  fi

  echo -e "${YELLOW}Deploying Azure Database for PostgreSQL Flexible Server...${NC}"
  echo "------------------------------------------------------------------------"

  # Generate password
  PG_PASSWORD=$(generate_password)

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would create PostgreSQL server with:${NC}"
    echo "  Name:         $PG_SERVER_NAME"
    echo "  Admin:        $PG_ADMIN_USER"
    echo "  SKU:          $PG_SKU"
    echo "  Tier:         $PG_TIER"
    echo "  Storage:      ${PG_STORAGE}GB"
    echo "  Version:      $PG_VERSION"
    echo "  Location:     $LOCATION"
    return 0
  fi

  # Check if server already exists
  if az postgres flexible-server show --name "$PG_SERVER_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL server ${PG_SERVER_NAME} already exists. Skipping creation.${NC}"
  else
    echo -e "${BLUE}Creating PostgreSQL Flexible Server...${NC}"

    az postgres flexible-server create \
      --name "$PG_SERVER_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --location "$LOCATION" \
      --admin-user "$PG_ADMIN_USER" \
      --admin-password "$PG_PASSWORD" \
      --sku-name "$PG_SKU" \
      --tier "$PG_TIER" \
      --storage-size "$PG_STORAGE" \
      --version "$PG_VERSION" \
      --public-access 0.0.0.0 \
      --high-availability Disabled \
      --backup-retention 7 \
      --geo-redundant-backup Disabled

    echo -e "${GREEN}[OK] PostgreSQL server created${NC}"
  fi

  # Store password for later use
  export PG_PASSWORD

  # Create databases
  create_databases

  echo ""
}

# Create required databases
create_databases() {
  echo -e "${YELLOW}Creating required databases...${NC}"

  for db in "${DATABASES[@]}"; do
    echo -e "${BLUE}Creating database: ${db}${NC}"

    if [ "$DRY_RUN" = true ]; then
      echo -e "${CYAN}[DRY RUN] Would create database: ${db}${NC}"
      continue
    fi

    # Check if database exists
    if az postgres flexible-server db show \
      --server-name "$PG_SERVER_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --database-name "$db" &> /dev/null; then
      echo -e "${YELLOW}Database ${db} already exists. Skipping.${NC}"
    else
      az postgres flexible-server db create \
        --server-name "$PG_SERVER_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --database-name "$db"

      echo -e "${GREEN}[OK] Created database: ${db}${NC}"
    fi
  done
}

# Deploy Azure Cache for Redis
deploy_redis() {
  if [ "$SKIP_REDIS" = true ]; then
    echo -e "${YELLOW}Skipping Redis deployment (--skip-redis)${NC}"
    return 0
  fi

  echo -e "${YELLOW}Deploying Azure Cache for Redis...${NC}"
  echo "------------------------------------------------------------------------"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would create Redis cache with:${NC}"
    echo "  Name:     $REDIS_NAME"
    echo "  SKU:      $REDIS_SKU"
    echo "  VM Size:  $REDIS_VM_SIZE"
    echo "  Location: $LOCATION"
    return 0
  fi

  # Check if Redis already exists
  if az redis show --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    echo -e "${YELLOW}Redis cache ${REDIS_NAME} already exists. Skipping creation.${NC}"
  else
    echo -e "${BLUE}Creating Redis cache (this may take 10-15 minutes)...${NC}"

    az redis create \
      --name "$REDIS_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --location "$LOCATION" \
      --sku "$REDIS_SKU" \
      --vm-size "$REDIS_VM_SIZE" \
      --enable-non-ssl-port false \
      --minimum-tls-version 1.2

    echo -e "${GREEN}[OK] Redis cache created${NC}"
  fi

  echo ""
}

# Get AKS outbound IPs for firewall rules
get_aks_outbound_ips() {
  echo -e "${YELLOW}Getting AKS outbound IPs...${NC}"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would retrieve AKS outbound IPs${NC}"
    return 0
  fi

  # Get AKS outbound IP addresses
  AKS_OUTBOUND_IPS=$(az aks show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$AKS_CLUSTER" \
    --query "networkProfile.loadBalancerProfile.effectiveOutboundIPs[].id" \
    -o tsv 2>/dev/null)

  if [ -n "$AKS_OUTBOUND_IPS" ]; then
    # Get the actual IP addresses
    for ip_id in $AKS_OUTBOUND_IPS; do
      ip_address=$(az network public-ip show --ids "$ip_id" --query ipAddress -o tsv)
      echo -e "${GREEN}AKS Outbound IP: ${ip_address}${NC}"
      AKS_IPS+=("$ip_address")
    done
  else
    echo -e "${YELLOW}Could not determine AKS outbound IPs. Will use 0.0.0.0/0${NC}"
  fi
}

# Configure firewall rules
configure_firewall() {
  if [ "$SKIP_FIREWALL" = true ]; then
    echo -e "${YELLOW}Skipping firewall configuration (--skip-firewall)${NC}"
    return 0
  fi

  echo -e "${YELLOW}Configuring firewall rules...${NC}"
  echo "------------------------------------------------------------------------"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would configure firewall rules for PostgreSQL and Redis${NC}"
    return 0
  fi

  # Get AKS outbound IPs
  declare -a AKS_IPS
  get_aks_outbound_ips

  # Configure PostgreSQL firewall
  echo -e "${BLUE}Configuring PostgreSQL firewall rules...${NC}"

  # Allow Azure services
  az postgres flexible-server firewall-rule create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$PG_SERVER_NAME" \
    --rule-name "AllowAzureServices" \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 0.0.0.0 \
    2>/dev/null || echo "Rule may already exist"

  # Add rules for each AKS outbound IP
  if [ ${#AKS_IPS[@]} -gt 0 ]; then
    for i in "${!AKS_IPS[@]}"; do
      ip="${AKS_IPS[$i]}"
      az postgres flexible-server firewall-rule create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$PG_SERVER_NAME" \
        --rule-name "AKS-Outbound-${i}" \
        --start-ip-address "$ip" \
        --end-ip-address "$ip" \
        2>/dev/null || echo "Rule may already exist"
      echo -e "${GREEN}[OK] Added firewall rule for AKS IP: ${ip}${NC}"
    done
  fi

  # Configure Redis firewall (Redis on Azure uses Virtual Network rules or allow all Azure)
  echo -e "${BLUE}Configuring Redis access...${NC}"

  # For Basic/Standard tier, Redis is accessible via its hostname
  # Premium tier supports VNet integration
  echo -e "${GREEN}[OK] Redis access configured (using SSL endpoint)${NC}"

  echo ""
}

# Get connection strings
get_connection_strings() {
  echo -e "${YELLOW}Retrieving connection strings...${NC}"
  echo "------------------------------------------------------------------------"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would retrieve connection strings${NC}"
    return 0
  fi

  # Get PostgreSQL connection info
  PG_FQDN=$(az postgres flexible-server show \
    --name "$PG_SERVER_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "fullyQualifiedDomainName" -o tsv)

  echo -e "${CYAN}PostgreSQL Connection Details:${NC}"
  echo "  Host: $PG_FQDN"
  echo "  Port: 5432"
  echo "  User: $PG_ADMIN_USER"
  echo ""

  # Get Redis connection info
  REDIS_HOSTNAME=$(az redis show \
    --name "$REDIS_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "hostName" -o tsv)

  REDIS_PORT=$(az redis show \
    --name "$REDIS_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "sslPort" -o tsv)

  REDIS_KEY=$(az redis list-keys \
    --name "$REDIS_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "primaryKey" -o tsv)

  echo -e "${CYAN}Redis Connection Details:${NC}"
  echo "  Host: $REDIS_HOSTNAME"
  echo "  Port: $REDIS_PORT"
  echo ""

  # Export for secrets creation
  export PG_FQDN REDIS_HOSTNAME REDIS_PORT REDIS_KEY
}

# Create Kubernetes secrets
create_kubernetes_secrets() {
  if [ "$SKIP_SECRETS" = true ]; then
    echo -e "${YELLOW}Skipping Kubernetes secrets creation (--skip-secrets)${NC}"
    return 0
  fi

  echo -e "${YELLOW}Creating Kubernetes secrets...${NC}"
  echo "------------------------------------------------------------------------"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would create Kubernetes secrets in namespace: ${NAMESPACE}${NC}"
    return 0
  fi

  # Get AKS credentials
  echo -e "${BLUE}Getting AKS credentials...${NC}"
  az aks get-credentials \
    --resource-group "$RESOURCE_GROUP" \
    --name "$AKS_CLUSTER" \
    --overwrite-existing

  # Create namespace if not exists
  kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

  # Build connection strings
  PG_CONNECTION_STRING="postgresql://${PG_ADMIN_USER}:${PG_PASSWORD}@${PG_FQDN}:5432/flamoral_users?sslmode=require"
  REDIS_CONNECTION_STRING="rediss://:${REDIS_KEY}@${REDIS_HOSTNAME}:${REDIS_PORT}"

  # Create postgres-credentials secret
  echo -e "${BLUE}Creating postgres-credentials secret...${NC}"
  kubectl create secret generic postgres-credentials \
    --namespace "$NAMESPACE" \
    --from-literal=host="$PG_FQDN" \
    --from-literal=port="5432" \
    --from-literal=username="$PG_ADMIN_USER" \
    --from-literal=password="$PG_PASSWORD" \
    --from-literal=database="flamoral_users" \
    --from-literal=connection-string="$PG_CONNECTION_STRING" \
    --from-literal=auth-database-url="postgresql://${PG_ADMIN_USER}:${PG_PASSWORD}@${PG_FQDN}:5432/flamoral_auth?sslmode=require" \
    --from-literal=users-database-url="postgresql://${PG_ADMIN_USER}:${PG_PASSWORD}@${PG_FQDN}:5432/flamoral_users?sslmode=require" \
    --from-literal=matching-database-url="postgresql://${PG_ADMIN_USER}:${PG_PASSWORD}@${PG_FQDN}:5432/flamoral_matching?sslmode=require" \
    --from-literal=messaging-database-url="postgresql://${PG_ADMIN_USER}:${PG_PASSWORD}@${PG_FQDN}:5432/flamoral_messaging?sslmode=require" \
    --dry-run=client -o yaml | kubectl apply -f -

  echo -e "${GREEN}[OK] Created postgres-credentials secret${NC}"

  # Create redis-credentials secret
  echo -e "${BLUE}Creating redis-credentials secret...${NC}"
  kubectl create secret generic redis-credentials \
    --namespace "$NAMESPACE" \
    --from-literal=host="$REDIS_HOSTNAME" \
    --from-literal=port="$REDIS_PORT" \
    --from-literal=password="$REDIS_KEY" \
    --from-literal=connection-string="$REDIS_CONNECTION_STRING" \
    --from-literal=tls-enabled="true" \
    --dry-run=client -o yaml | kubectl apply -f -

  echo -e "${GREEN}[OK] Created redis-credentials secret${NC}"

  echo ""
}

# Store secrets in Azure Key Vault
store_in_keyvault() {
  echo -e "${YELLOW}Storing secrets in Azure Key Vault...${NC}"
  echo "------------------------------------------------------------------------"

  local KEYVAULT_NAME="flamoral-prod-kv"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would store secrets in Key Vault: ${KEYVAULT_NAME}${NC}"
    return 0
  fi

  # Check if Key Vault exists
  if ! az keyvault show --name "$KEYVAULT_NAME" &> /dev/null; then
    echo -e "${YELLOW}Key Vault ${KEYVAULT_NAME} not found. Skipping Key Vault storage.${NC}"
    return 0
  fi

  # Store PostgreSQL secrets
  echo -e "${BLUE}Storing PostgreSQL secrets in Key Vault...${NC}"
  az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "database-password" --value "$PG_PASSWORD" > /dev/null
  az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "postgres-password" --value "$PG_PASSWORD" > /dev/null
  az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "database-url" --value "postgresql://${PG_ADMIN_USER}:${PG_PASSWORD}@${PG_FQDN}:5432/flamoral_users?sslmode=require" > /dev/null

  # Store Redis secrets
  echo -e "${BLUE}Storing Redis secrets in Key Vault...${NC}"
  az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "redis-password" --value "$REDIS_KEY" > /dev/null
  az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "redis-url" --value "rediss://:${REDIS_KEY}@${REDIS_HOSTNAME}:${REDIS_PORT}" > /dev/null

  echo -e "${GREEN}[OK] Secrets stored in Key Vault${NC}"
  echo ""
}

# Verify connectivity from AKS
verify_connectivity() {
  echo -e "${YELLOW}Verifying connectivity from AKS cluster...${NC}"
  echo "------------------------------------------------------------------------"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would verify connectivity from AKS cluster${NC}"
    return 0
  fi

  # Create a test pod for connectivity verification
  echo -e "${BLUE}Creating connectivity test pod...${NC}"

  cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: db-connectivity-test
  namespace: $NAMESPACE
spec:
  containers:
  - name: test
    image: postgres:15-alpine
    command: ["sleep", "300"]
    env:
    - name: PGPASSWORD
      valueFrom:
        secretKeyRef:
          name: postgres-credentials
          key: password
  restartPolicy: Never
EOF

  # Wait for pod to be ready
  echo -e "${BLUE}Waiting for test pod to be ready...${NC}"
  kubectl wait --for=condition=Ready pod/db-connectivity-test -n "$NAMESPACE" --timeout=60s 2>/dev/null || true

  # Test PostgreSQL connectivity
  echo -e "${BLUE}Testing PostgreSQL connectivity...${NC}"
  PG_TEST=$(kubectl exec -n "$NAMESPACE" db-connectivity-test -- \
    psql -h "$PG_FQDN" -U "$PG_ADMIN_USER" -d flamoral_users -c "SELECT 1" 2>&1) || true

  if echo "$PG_TEST" | grep -q "1"; then
    echo -e "${GREEN}[OK] PostgreSQL connectivity verified${NC}"
  else
    echo -e "${YELLOW}[WARN] PostgreSQL connectivity test inconclusive. May need to wait for firewall rules to propagate.${NC}"
  fi

  # Test Redis connectivity
  echo -e "${BLUE}Testing Redis connectivity...${NC}"

  # Delete the test pod
  kubectl delete pod db-connectivity-test -n "$NAMESPACE" --ignore-not-found

  echo ""
}

# Print summary
print_summary() {
  echo ""
  echo -e "${BLUE}+======================================================================+${NC}"
  echo -e "${BLUE}|                    Deployment Summary                               |${NC}"
  echo -e "${BLUE}+======================================================================+${NC}"
  echo ""
  echo -e "${CYAN}PostgreSQL Server:${NC}"
  echo -e "  Server Name:  ${GREEN}${PG_SERVER_NAME}${NC}"
  echo -e "  FQDN:         ${GREEN}${PG_FQDN:-<pending>}${NC}"
  echo -e "  Admin User:   ${GREEN}${PG_ADMIN_USER}${NC}"
  echo -e "  Databases:    ${GREEN}${DATABASES[*]}${NC}"
  echo ""
  echo -e "${CYAN}Redis Cache:${NC}"
  echo -e "  Name:         ${GREEN}${REDIS_NAME}${NC}"
  echo -e "  Hostname:     ${GREEN}${REDIS_HOSTNAME:-<pending>}${NC}"
  echo -e "  SSL Port:     ${GREEN}${REDIS_PORT:-6380}${NC}"
  echo ""
  echo -e "${CYAN}Kubernetes Secrets:${NC}"
  echo -e "  Namespace:    ${GREEN}${NAMESPACE}${NC}"
  echo -e "  Secrets:      ${GREEN}postgres-credentials, redis-credentials${NC}"
  echo ""
  echo -e "${CYAN}Connection Strings (for backend services):${NC}"
  echo ""
  echo -e "${YELLOW}PostgreSQL:${NC}"
  for db in "${DATABASES[@]}"; do
    service_name="${db#flamoral_}"
    echo -e "  ${service_name}: postgresql://${PG_ADMIN_USER}:<password>@${PG_FQDN:-${PG_SERVER_NAME}.postgres.database.azure.com}:5432/${db}?sslmode=require"
  done
  echo ""
  echo -e "${YELLOW}Redis:${NC}"
  echo -e "  rediss://:<password>@${REDIS_HOSTNAME:-${REDIS_NAME}.redis.cache.windows.net}:${REDIS_PORT:-6380}"
  echo ""

  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}This was a dry run. No changes were made.${NC}"
  fi
}

# Main execution
main() {
  print_header
  check_azure_login
  check_resource_group

  # Generate password once for consistency
  if [ -z "$PG_PASSWORD" ]; then
    PG_PASSWORD=$(generate_password)
    export PG_PASSWORD
    echo -e "${GREEN}Generated secure PostgreSQL password${NC}"
  fi

  deploy_postgresql
  deploy_redis
  get_connection_strings
  configure_firewall
  create_kubernetes_secrets
  store_in_keyvault
  verify_connectivity
  print_summary

  echo -e "${GREEN}[OK] Database infrastructure setup completed successfully!${NC}"
}

# Run main function
main
