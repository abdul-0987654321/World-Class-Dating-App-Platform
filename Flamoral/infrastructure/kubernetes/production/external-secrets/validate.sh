#!/bin/bash
# =============================================================================
# Validation Script for External Secrets Configuration
# =============================================================================
# This script validates that all ExternalSecrets are properly configured
# and syncing successfully from Azure Key Vault
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NAMESPACE="flamoral"
KEY_VAULT_NAME="flamoral-prod-kv"

echo -e "${BLUE}=======================================================================${NC}"
echo -e "${BLUE}  External Secrets Validation${NC}"
echo -e "${BLUE}=======================================================================${NC}"
echo

# Check if namespace exists
echo -e "${YELLOW}[1/7] Checking namespace...${NC}"
if kubectl get namespace $NAMESPACE >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Namespace '$NAMESPACE' exists${NC}"
else
    echo -e "${RED}✗ Namespace '$NAMESPACE' does not exist${NC}"
    exit 1
fi
echo

# Check if External Secrets Operator is running
echo -e "${YELLOW}[2/7] Checking External Secrets Operator...${NC}"
ESO_PODS=$(kubectl get pods -n external-secrets-system -l app.kubernetes.io/name=external-secrets --no-headers 2>/dev/null | wc -l)
if [ "$ESO_PODS" -gt 0 ]; then
    echo -e "${GREEN}✓ External Secrets Operator is running ($ESO_PODS pod(s))${NC}"
    kubectl get pods -n external-secrets-system -l app.kubernetes.io/name=external-secrets
else
    echo -e "${RED}✗ External Secrets Operator is not running${NC}"
    exit 1
fi
echo

# Check SecretStore
echo -e "${YELLOW}[3/7] Checking SecretStore...${NC}"
if kubectl get secretstore azure-keyvault-store -n $NAMESPACE >/dev/null 2>&1; then
    echo -e "${GREEN}✓ SecretStore 'azure-keyvault-store' exists${NC}"
    # Check if SecretStore is ready
    STORE_STATUS=$(kubectl get secretstore azure-keyvault-store -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "Unknown")
    if [ "$STORE_STATUS" = "True" ]; then
        echo -e "${GREEN}✓ SecretStore is ready${NC}"
    else
        echo -e "${RED}✗ SecretStore is not ready (Status: $STORE_STATUS)${NC}"
    fi
else
    echo -e "${RED}✗ SecretStore 'azure-keyvault-store' does not exist${NC}"
fi
echo

# Check ExternalSecrets
echo -e "${YELLOW}[4/7] Checking ExternalSecrets...${NC}"
EXTERNAL_SECRETS=(
    "flamoral-auth-secrets"
    "flamoral-payment-secrets"
    "flamoral-notification-secrets"
    "flamoral-media-secrets"
    "flamoral-database-secrets"
)

ALL_READY=true
for ES in "${EXTERNAL_SECRETS[@]}"; do
    if kubectl get externalsecret "$ES" -n $NAMESPACE >/dev/null 2>&1; then
        STATUS=$(kubectl get externalsecret "$ES" -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "Unknown")
        REASON=$(kubectl get externalsecret "$ES" -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Ready")].reason}' 2>/dev/null || echo "")

        if [ "$STATUS" = "True" ]; then
            echo -e "${GREEN}✓ $ES is ready${NC}"
        else
            echo -e "${RED}✗ $ES is not ready (Status: $STATUS, Reason: $REASON)${NC}"
            ALL_READY=false
        fi
    else
        echo -e "${RED}✗ $ES does not exist${NC}"
        ALL_READY=false
    fi
done

if [ "$ALL_READY" = false ]; then
    echo -e "${RED}⚠ Some ExternalSecrets are not ready${NC}"
else
    echo -e "${GREEN}✓ All ExternalSecrets are ready${NC}"
fi
echo

# Check created Kubernetes secrets
echo -e "${YELLOW}[5/7] Checking Kubernetes secrets...${NC}"
K8S_SECRETS=(
    "flamoral-auth-secrets"
    "flamoral-payment-secrets"
    "flamoral-notification-secrets"
    "flamoral-media-secrets"
    "flamoral-database-secrets"
)

ALL_SECRETS_EXIST=true
for SECRET in "${K8S_SECRETS[@]}"; do
    if kubectl get secret "$SECRET" -n $NAMESPACE >/dev/null 2>&1; then
        KEY_COUNT=$(kubectl get secret "$SECRET" -n $NAMESPACE -o jsonpath='{.data}' | jq -r 'keys | length' 2>/dev/null || echo "0")
        echo -e "${GREEN}✓ Secret '$SECRET' exists with $KEY_COUNT key(s)${NC}"
    else
        echo -e "${RED}✗ Secret '$SECRET' does not exist${NC}"
        ALL_SECRETS_EXIST=false
    fi
done

if [ "$ALL_SECRETS_EXIST" = false ]; then
    echo -e "${RED}⚠ Some Kubernetes secrets are missing${NC}"
fi
echo

# Check Azure Key Vault access (optional, requires az CLI)
echo -e "${YELLOW}[6/7] Checking Azure Key Vault access (optional)...${NC}"
if command -v az >/dev/null 2>&1; then
    if az keyvault show --name $KEY_VAULT_NAME >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Can access Key Vault '$KEY_VAULT_NAME'${NC}"

        # Count secrets in Key Vault
        SECRET_COUNT=$(az keyvault secret list --vault-name $KEY_VAULT_NAME --query "length(@)" 2>/dev/null || echo "0")
        echo -e "${GREEN}  Found $SECRET_COUNT secret(s) in Key Vault${NC}"
    else
        echo -e "${YELLOW}⚠ Cannot access Key Vault (you may not have permission)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Azure CLI not installed, skipping Key Vault check${NC}"
fi
echo

# Show recent External Secrets Operator logs
echo -e "${YELLOW}[7/7] Recent External Secrets Operator logs...${NC}"
echo "Last 10 log lines:"
kubectl logs -n external-secrets-system -l app.kubernetes.io/name=external-secrets --tail=10 2>/dev/null || echo "Could not fetch logs"
echo

# Summary
echo -e "${BLUE}=======================================================================${NC}"
echo -e "${BLUE}  Validation Summary${NC}"
echo -e "${BLUE}=======================================================================${NC}"

if [ "$ALL_READY" = true ] && [ "$ALL_SECRETS_EXIST" = true ]; then
    echo -e "${GREEN}✓ All validations passed!${NC}"
    echo
    echo "Your External Secrets configuration is working correctly."
    exit 0
else
    echo -e "${RED}✗ Some validations failed${NC}"
    echo
    echo "Troubleshooting steps:"
    echo "  1. Check ExternalSecret details:"
    echo "     kubectl describe externalsecret -n $NAMESPACE"
    echo
    echo "  2. Check External Secrets Operator logs:"
    echo "     kubectl logs -n external-secrets-system -l app.kubernetes.io/name=external-secrets -f"
    echo
    echo "  3. Verify Azure Key Vault permissions:"
    echo "     az keyvault show --name $KEY_VAULT_NAME"
    echo
    echo "  4. Check workload identity configuration:"
    echo "     kubectl describe serviceaccount external-secrets-sa -n $NAMESPACE"
    exit 1
fi
