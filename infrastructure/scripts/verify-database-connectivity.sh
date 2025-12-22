#!/bin/bash

# =============================================================================
# Flamoral Dating Platform - Database Connectivity Verification
# =============================================================================
# This script verifies connectivity to PostgreSQL and Redis from the AKS cluster
#
# Usage: ./verify-database-connectivity.sh [OPTIONS]
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
AKS_CLUSTER="${AKS_CLUSTER:-flamoral-prod-aks}"
NAMESPACE="${NAMESPACE:-flamoral}"
PG_SERVER_NAME="${PG_SERVER_NAME:-flamoral-prod-db}"
REDIS_NAME="${REDIS_NAME:-flamoral-prod-redis}"

# Parse arguments
CLEANUP=true

while [[ $# -gt 0 ]]; do
  case $1 in
    --no-cleanup)
      CLEANUP=false
      shift
      ;;
    --namespace|-n)
      NAMESPACE="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Verifies database connectivity from within the AKS cluster"
      echo ""
      echo "Options:"
      echo "  --no-cleanup        Don't delete test pods after verification"
      echo "  -n, --namespace     Kubernetes namespace (default: flamoral)"
      echo "  -h, --help          Show this help"
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
echo -e "${BLUE}|     Flamoral - Database Connectivity Verification                   |${NC}"
echo -e "${BLUE}+======================================================================+${NC}"
echo ""

# Check Azure CLI login
echo -e "${YELLOW}Checking Azure authentication...${NC}"
if ! az account show &> /dev/null; then
  echo -e "${RED}Not logged in to Azure. Please run 'az login' first.${NC}"
  exit 1
fi
echo -e "${GREEN}[OK] Azure authentication verified${NC}"
echo ""

# Get AKS credentials
echo -e "${YELLOW}Getting AKS credentials...${NC}"
az aks get-credentials \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_CLUSTER" \
  --overwrite-existing
echo -e "${GREEN}[OK] AKS credentials configured${NC}"
echo ""

# Check if secrets exist
echo -e "${YELLOW}Checking Kubernetes secrets...${NC}"

if kubectl get secret postgres-credentials -n "$NAMESPACE" &> /dev/null; then
  echo -e "${GREEN}[OK] postgres-credentials secret found${NC}"
else
  echo -e "${RED}[ERROR] postgres-credentials secret not found in namespace ${NAMESPACE}${NC}"
  exit 1
fi

if kubectl get secret redis-credentials -n "$NAMESPACE" &> /dev/null; then
  echo -e "${GREEN}[OK] redis-credentials secret found${NC}"
else
  echo -e "${RED}[ERROR] redis-credentials secret not found in namespace ${NAMESPACE}${NC}"
  exit 1
fi
echo ""

# Get connection details from Azure
echo -e "${YELLOW}Retrieving connection details from Azure...${NC}"

PG_FQDN=$(az postgres flexible-server show \
  --name "$PG_SERVER_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "fullyQualifiedDomainName" -o tsv 2>/dev/null || echo "")

REDIS_HOSTNAME=$(az redis show \
  --name "$REDIS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "hostName" -o tsv 2>/dev/null || echo "")

echo -e "${CYAN}PostgreSQL: ${PG_FQDN:-Not found}${NC}"
echo -e "${CYAN}Redis: ${REDIS_HOSTNAME:-Not found}${NC}"
echo ""

# Create test pod for PostgreSQL
echo -e "${YELLOW}Testing PostgreSQL connectivity...${NC}"
echo "------------------------------------------------------------------------"

cat <<EOF | kubectl apply -f - 2>/dev/null
apiVersion: v1
kind: Pod
metadata:
  name: postgres-connectivity-test
  namespace: $NAMESPACE
  labels:
    app: connectivity-test
    type: postgres
spec:
  containers:
  - name: postgres
    image: postgres:15-alpine
    command: ["sleep", "600"]
    env:
    - name: PGPASSWORD
      valueFrom:
        secretKeyRef:
          name: postgres-credentials
          key: password
    - name: PGHOST
      valueFrom:
        secretKeyRef:
          name: postgres-credentials
          key: host
    - name: PGUSER
      valueFrom:
        secretKeyRef:
          name: postgres-credentials
          key: username
  restartPolicy: Never
EOF

echo -e "${BLUE}Waiting for PostgreSQL test pod to be ready...${NC}"
kubectl wait --for=condition=Ready pod/postgres-connectivity-test -n "$NAMESPACE" --timeout=120s 2>/dev/null || {
  echo -e "${YELLOW}Pod not ready yet, waiting additional time...${NC}"
  sleep 30
}

# Test each database
DATABASES=("flamoral_auth" "flamoral_users" "flamoral_matching" "flamoral_messaging")

echo ""
for db in "${DATABASES[@]}"; do
  echo -n "Testing connection to ${db}... "

  result=$(kubectl exec -n "$NAMESPACE" postgres-connectivity-test -- \
    psql -h "$PG_FQDN" -U flamoraladmin -d "$db" -c "SELECT 1 as test;" 2>&1) || true

  if echo "$result" | grep -q "1"; then
    echo -e "${GREEN}[OK]${NC}"
  else
    echo -e "${RED}[FAILED]${NC}"
    echo -e "${YELLOW}Error: $result${NC}"
  fi
done

echo ""

# Create test pod for Redis
echo -e "${YELLOW}Testing Redis connectivity...${NC}"
echo "------------------------------------------------------------------------"

cat <<EOF | kubectl apply -f - 2>/dev/null
apiVersion: v1
kind: Pod
metadata:
  name: redis-connectivity-test
  namespace: $NAMESPACE
  labels:
    app: connectivity-test
    type: redis
spec:
  containers:
  - name: redis
    image: redis:7-alpine
    command: ["sleep", "600"]
    env:
    - name: REDIS_HOST
      valueFrom:
        secretKeyRef:
          name: redis-credentials
          key: host
    - name: REDIS_PASSWORD
      valueFrom:
        secretKeyRef:
          name: redis-credentials
          key: password
  restartPolicy: Never
EOF

echo -e "${BLUE}Waiting for Redis test pod to be ready...${NC}"
kubectl wait --for=condition=Ready pod/redis-connectivity-test -n "$NAMESPACE" --timeout=120s 2>/dev/null || {
  echo -e "${YELLOW}Pod not ready yet, waiting additional time...${NC}"
  sleep 30
}

echo ""
echo -n "Testing Redis connection... "

# Get Redis password from secret
REDIS_PWD=$(kubectl get secret redis-credentials -n "$NAMESPACE" -o jsonpath='{.data.password}' | base64 -d)

result=$(kubectl exec -n "$NAMESPACE" redis-connectivity-test -- \
  redis-cli -h "$REDIS_HOSTNAME" -p 6380 --tls -a "$REDIS_PWD" PING 2>&1) || true

if echo "$result" | grep -q "PONG"; then
  echo -e "${GREEN}[OK] - PONG received${NC}"
else
  echo -e "${RED}[FAILED]${NC}"
  echo -e "${YELLOW}Error: $result${NC}"
fi

echo ""

# Test Redis operations
echo "Testing Redis SET/GET operations..."
SET_RESULT=$(kubectl exec -n "$NAMESPACE" redis-connectivity-test -- \
  redis-cli -h "$REDIS_HOSTNAME" -p 6380 --tls -a "$REDIS_PWD" SET flamoral:test "connectivity-test" EX 60 2>&1) || true

if echo "$SET_RESULT" | grep -q "OK"; then
  echo -e "${GREEN}[OK] SET operation successful${NC}"

  GET_RESULT=$(kubectl exec -n "$NAMESPACE" redis-connectivity-test -- \
    redis-cli -h "$REDIS_HOSTNAME" -p 6380 --tls -a "$REDIS_PWD" GET flamoral:test 2>&1) || true

  if echo "$GET_RESULT" | grep -q "connectivity-test"; then
    echo -e "${GREEN}[OK] GET operation successful${NC}"
  else
    echo -e "${YELLOW}[WARN] GET returned unexpected result${NC}"
  fi
else
  echo -e "${YELLOW}[WARN] SET operation returned: $SET_RESULT${NC}"
fi

echo ""

# Cleanup test pods
if [ "$CLEANUP" = true ]; then
  echo -e "${YELLOW}Cleaning up test pods...${NC}"
  kubectl delete pod postgres-connectivity-test redis-connectivity-test -n "$NAMESPACE" --ignore-not-found
  echo -e "${GREEN}[OK] Test pods deleted${NC}"
fi

# Print summary
echo ""
echo -e "${BLUE}+======================================================================+${NC}"
echo -e "${BLUE}|                    Connectivity Summary                             |${NC}"
echo -e "${BLUE}+======================================================================+${NC}"
echo ""
echo -e "${CYAN}PostgreSQL Server:${NC}"
echo "  FQDN: $PG_FQDN"
echo "  Port: 5432"
echo "  SSL:  Required"
echo ""
echo -e "${CYAN}Redis Cache:${NC}"
echo "  Hostname: $REDIS_HOSTNAME"
echo "  Port:     6380 (SSL)"
echo "  TLS:      Enabled"
echo ""
echo -e "${CYAN}Kubernetes Secrets:${NC}"
echo "  Namespace: $NAMESPACE"
echo "  Postgres:  postgres-credentials"
echo "  Redis:     redis-credentials"
echo ""
echo -e "${GREEN}Connectivity verification completed!${NC}"
