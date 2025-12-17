#!/bin/bash

# =============================================================================
# Flamoral Kubernetes Deployment Verification Script
# =============================================================================
# This script verifies that all fixes have been applied correctly and the
# deployment is ready for production.
#
# Usage: ./verify-deployment.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="flamoral"
KEY_VAULT_NAME="flamoral-prod-kv"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Flamoral Deployment Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        echo -e "${YELLOW}  Fix: $3${NC}"
    fi
}

# Function to check command exists
check_command() {
    if command -v $1 &> /dev/null; then
        print_status 0 "$1 is installed"
        return 0
    else
        print_status 1 "$1 is NOT installed" "Install $1"
        return 1
    fi
}

# =============================================================================
# 1. Check Prerequisites
# =============================================================================
echo -e "${BLUE}1. Checking Prerequisites...${NC}"
echo ""

check_command kubectl
check_command az
check_command jq

echo ""

# =============================================================================
# 2. Check Kubernetes Cluster Connection
# =============================================================================
echo -e "${BLUE}2. Checking Kubernetes Cluster Connection...${NC}"
echo ""

if kubectl cluster-info &> /dev/null; then
    print_status 0 "Connected to Kubernetes cluster"
    CLUSTER_NAME=$(kubectl config current-context)
    echo -e "   Cluster: ${CLUSTER_NAME}"
else
    print_status 1 "NOT connected to Kubernetes cluster" "Run: az aks get-credentials --resource-group <rg> --name <cluster>"
    exit 1
fi

echo ""

# =============================================================================
# 3. Check Namespace Exists
# =============================================================================
echo -e "${BLUE}3. Checking Namespace...${NC}"
echo ""

if kubectl get namespace $NAMESPACE &> /dev/null; then
    print_status 0 "Namespace '$NAMESPACE' exists"
else
    print_status 1 "Namespace '$NAMESPACE' does NOT exist" "Create with: kubectl create namespace $NAMESPACE"
fi

echo ""

# =============================================================================
# 4. Check External Secrets Operator
# =============================================================================
echo -e "${BLUE}4. Checking External Secrets Operator...${NC}"
echo ""

if kubectl get deployment -n external-secrets-system external-secrets &> /dev/null 2>&1; then
    print_status 0 "External Secrets Operator is installed"

    # Check if running
    READY=$(kubectl get deployment -n external-secrets-system external-secrets -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    if [ "$READY" -gt 0 ]; then
        print_status 0 "External Secrets Operator is running"
    else
        print_status 1 "External Secrets Operator is NOT running" "Check logs: kubectl logs -n external-secrets-system -l app.kubernetes.io/name=external-secrets"
    fi
else
    print_status 1 "External Secrets Operator is NOT installed" "Install with Helm"
fi

echo ""

# =============================================================================
# 5. Check SecretStore
# =============================================================================
echo -e "${BLUE}5. Checking SecretStore Configuration...${NC}"
echo ""

if kubectl get secretstore azure-keyvault-store -n $NAMESPACE &> /dev/null; then
    print_status 0 "SecretStore 'azure-keyvault-store' exists"
else
    print_status 1 "SecretStore 'azure-keyvault-store' does NOT exist" "Create SecretStore configuration"
fi

echo ""

# =============================================================================
# 6. Check External Secrets
# =============================================================================
echo -e "${BLUE}6. Checking External Secrets...${NC}"
echo ""

# Check database secrets
if kubectl get externalsecret flamoral-database-secrets -n $NAMESPACE &> /dev/null; then
    print_status 0 "ExternalSecret 'flamoral-database-secrets' exists"

    # Check sync status
    STATUS=$(kubectl get externalsecret flamoral-database-secrets -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "Unknown")
    if [ "$STATUS" = "True" ]; then
        print_status 0 "Database secrets are synced from Key Vault"
    else
        print_status 1 "Database secrets are NOT synced" "Check: kubectl describe externalsecret flamoral-database-secrets -n $NAMESPACE"
    fi
else
    print_status 1 "ExternalSecret 'flamoral-database-secrets' does NOT exist" "Apply: kubectl apply -f production/external-secrets/database-secrets.yaml"
fi

echo ""

# =============================================================================
# 7. Check Secrets Created
# =============================================================================
echo -e "${BLUE}7. Checking Kubernetes Secrets...${NC}"
echo ""

if kubectl get secret flamoral-database-secrets -n $NAMESPACE &> /dev/null; then
    print_status 0 "Secret 'flamoral-database-secrets' exists"

    # Check for critical keys
    echo -e "${YELLOW}   Checking for critical secret keys...${NC}"

    SECRET_KEYS=$(kubectl get secret flamoral-database-secrets -n $NAMESPACE -o jsonpath='{.data}' | jq -r 'keys[]' 2>/dev/null || echo "")

    # Check DB_* keys
    echo "$SECRET_KEYS" | grep -q "DB_HOST" && print_status 0 "   DB_HOST key exists" || print_status 1 "   DB_HOST key missing" "Apply database-secrets-fix.yaml"
    echo "$SECRET_KEYS" | grep -q "DB_USER" && print_status 0 "   DB_USER key exists" || print_status 1 "   DB_USER key missing" "Apply database-secrets-fix.yaml"
    echo "$SECRET_KEYS" | grep -q "DB_PASSWORD" && print_status 0 "   DB_PASSWORD key exists" || print_status 1 "   DB_PASSWORD key missing" "Apply database-secrets-fix.yaml"
    echo "$SECRET_KEYS" | grep -q "DB_SSL" && print_status 0 "   DB_SSL key exists" || print_status 1 "   DB_SSL key missing" "Apply database-secrets-fix.yaml"

    # Check POSTGRES_* keys (critical for deployments)
    echo "$SECRET_KEYS" | grep -q "POSTGRES_HOST" && print_status 0 "   POSTGRES_HOST key exists" || print_status 1 "   POSTGRES_HOST key missing" "Apply database-secrets-fix.yaml"
    echo "$SECRET_KEYS" | grep -q "POSTGRES_USER" && print_status 0 "   POSTGRES_USER key exists" || print_status 1 "   POSTGRES_USER key missing" "Apply database-secrets-fix.yaml"

    # Check Redis keys
    echo "$SECRET_KEYS" | grep -q "REDIS_HOST" && print_status 0 "   REDIS_HOST key exists" || print_status 1 "   REDIS_HOST key missing" "Check Key Vault"
    echo "$SECRET_KEYS" | grep -q "REDIS_PASSWORD" && print_status 0 "   REDIS_PASSWORD key exists" || print_status 1 "   REDIS_PASSWORD key missing" "Check Key Vault"
else
    print_status 1 "Secret 'flamoral-database-secrets' does NOT exist" "Check External Secrets sync"
fi

echo ""

# =============================================================================
# 8. Check Azure Key Vault Secrets
# =============================================================================
echo -e "${BLUE}8. Checking Azure Key Vault Secrets...${NC}"
echo ""

if az keyvault show --name $KEY_VAULT_NAME &> /dev/null; then
    print_status 0 "Key Vault '$KEY_VAULT_NAME' is accessible"

    echo -e "${YELLOW}   Checking for critical Key Vault secrets...${NC}"

    # Check critical secrets
    az keyvault secret show --vault-name $KEY_VAULT_NAME --name db-host &> /dev/null && \
        print_status 0 "   db-host exists in Key Vault" || \
        print_status 1 "   db-host missing in Key Vault" "Set with: az keyvault secret set --vault-name $KEY_VAULT_NAME --name db-host --value <value>"

    az keyvault secret show --vault-name $KEY_VAULT_NAME --name db-name &> /dev/null && \
        print_status 0 "   db-name exists in Key Vault" || \
        print_status 1 "   db-name missing in Key Vault" "Set with: az keyvault secret set --vault-name $KEY_VAULT_NAME --name db-name --value flamoral"

    az keyvault secret show --vault-name $KEY_VAULT_NAME --name db-user &> /dev/null && \
        print_status 0 "   db-user exists in Key Vault" || \
        print_status 1 "   db-user missing in Key Vault" "Set with: az keyvault secret set --vault-name $KEY_VAULT_NAME --name db-user --value flamoraladmin"

    az keyvault secret show --vault-name $KEY_VAULT_NAME --name db-password &> /dev/null && \
        print_status 0 "   db-password exists in Key Vault" || \
        print_status 1 "   db-password missing in Key Vault" "Set with: az keyvault secret set --vault-name $KEY_VAULT_NAME --name db-password --value <password>"

    az keyvault secret show --vault-name $KEY_VAULT_NAME --name redis-host &> /dev/null && \
        print_status 0 "   redis-host exists in Key Vault" || \
        print_status 1 "   redis-host missing in Key Vault" "Set with: az keyvault secret set --vault-name $KEY_VAULT_NAME --name redis-host --value <value>"

    az keyvault secret show --vault-name $KEY_VAULT_NAME --name redis-password &> /dev/null && \
        print_status 0 "   redis-password exists in Key Vault" || \
        print_status 1 "   redis-password missing in Key Vault" "Set with: az keyvault secret set --vault-name $KEY_VAULT_NAME --name redis-password --value <password>"
else
    print_status 1 "Key Vault '$KEY_VAULT_NAME' is NOT accessible" "Check: az login and permissions"
fi

echo ""

# =============================================================================
# 9. Check Deployments
# =============================================================================
echo -e "${BLUE}9. Checking Deployments...${NC}"
echo ""

DEPLOYMENTS=("api-gateway" "auth-service" "user-service" "messaging-service")

for DEPLOYMENT in "${DEPLOYMENTS[@]}"; do
    if kubectl get deployment $DEPLOYMENT -n $NAMESPACE &> /dev/null; then
        READY=$(kubectl get deployment $DEPLOYMENT -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        DESIRED=$(kubectl get deployment $DEPLOYMENT -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")

        if [ "$READY" -eq "$DESIRED" ] && [ "$READY" -gt 0 ]; then
            print_status 0 "Deployment '$DEPLOYMENT' is ready ($READY/$DESIRED)"
        else
            print_status 1 "Deployment '$DEPLOYMENT' is NOT ready ($READY/$DESIRED)" "Check: kubectl describe deployment $DEPLOYMENT -n $NAMESPACE"
        fi
    else
        echo -e "${YELLOW}   Deployment '$DEPLOYMENT' not found (may not be deployed yet)${NC}"
    fi
done

echo ""

# =============================================================================
# 10. Check Services
# =============================================================================
echo -e "${BLUE}10. Checking Services...${NC}"
echo ""

SERVICES=("api-gateway" "auth-service" "user-service" "messaging-service")

for SERVICE in "${SERVICES[@]}"; do
    if kubectl get service $SERVICE -n $NAMESPACE &> /dev/null; then
        ENDPOINTS=$(kubectl get endpoints $SERVICE -n $NAMESPACE -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null | wc -w)

        if [ "$ENDPOINTS" -gt 0 ]; then
            print_status 0 "Service '$SERVICE' has $ENDPOINTS endpoint(s)"
        else
            print_status 1 "Service '$SERVICE' has NO endpoints" "Check pod status"
        fi
    else
        echo -e "${YELLOW}   Service '$SERVICE' not found (may not be deployed yet)${NC}"
    fi
done

echo ""

# =============================================================================
# 11. Check Ingress
# =============================================================================
echo -e "${BLUE}11. Checking Ingress Configuration...${NC}"
echo ""

if kubectl get ingress flamoral-ingress -n $NAMESPACE &> /dev/null; then
    print_status 0 "Ingress 'flamoral-ingress' exists"

    # Check API Gateway backend port
    API_PORT=$(kubectl get ingress flamoral-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[?(@.host=="api.flamoral.com")].http.paths[0].backend.service.port.number}' 2>/dev/null || echo "0")

    if [ "$API_PORT" -eq 4000 ]; then
        print_status 0 "API Gateway routes to correct port (4000)"
    else
        print_status 1 "API Gateway routes to WRONG port ($API_PORT)" "Apply ingress-fix.yaml"
    fi
else
    print_status 1 "Ingress 'flamoral-ingress' does NOT exist" "Apply: kubectl apply -f deploy/ingress.yaml"
fi

echo ""

# =============================================================================
# 12. Check cert-manager
# =============================================================================
echo -e "${BLUE}12. Checking cert-manager...${NC}"
echo ""

if kubectl get deployment cert-manager -n cert-manager &> /dev/null 2>&1; then
    print_status 0 "cert-manager is installed"

    # Check ClusterIssuer
    if kubectl get clusterissuer letsencrypt-prod &> /dev/null; then
        print_status 0 "ClusterIssuer 'letsencrypt-prod' exists"
    else
        print_status 1 "ClusterIssuer 'letsencrypt-prod' does NOT exist" "Create ClusterIssuer"
    fi
else
    print_status 1 "cert-manager is NOT installed" "Install with Helm"
fi

echo ""

# =============================================================================
# 13. Summary
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Count errors
TOTAL_CHECKS=0
FAILED_CHECKS=0

# Re-run critical checks silently to count
kubectl cluster-info &> /dev/null || ((FAILED_CHECKS++))
kubectl get namespace $NAMESPACE &> /dev/null || ((FAILED_CHECKS++))
kubectl get externalsecret flamoral-database-secrets -n $NAMESPACE &> /dev/null || ((FAILED_CHECKS++))
kubectl get secret flamoral-database-secrets -n $NAMESPACE &> /dev/null || ((FAILED_CHECKS++))

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    echo -e "${GREEN}✓ Deployment appears ready for production${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Apply all deployments: kubectl apply -f production/deployments/"
    echo "2. Monitor pod startup: watch kubectl get pods -n $NAMESPACE"
    echo "3. Check service health: kubectl get svc -n $NAMESPACE"
    echo "4. Test endpoints: curl https://api.flamoral.com/health"
else
    echo -e "${RED}✗ Some checks failed${NC}"
    echo -e "${YELLOW}Please review the errors above and apply necessary fixes${NC}"
    echo ""
    echo -e "${YELLOW}Common fixes:${NC}"
    echo "1. Apply database-secrets-fix.yaml"
    echo "2. Apply ingress-fix.yaml"
    echo "3. Configure Azure Key Vault secrets (see AZURE_KEY_VAULT_SECRETS_CHECKLIST.md)"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
