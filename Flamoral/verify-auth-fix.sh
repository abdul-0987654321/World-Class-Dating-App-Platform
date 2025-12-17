#!/bin/bash
# verify-auth-fix.sh
# Verification script for auth service routing fix
# Usage: ./verify-auth-fix.sh [namespace]

set -e

NAMESPACE="${1:-production}"
DEPLOYMENT="flamoral-api-gateway"
SERVICE="flamoral-auth-service"

echo "=================================================="
echo "Auth Service Routing Fix - Verification Script"
echo "=================================================="
echo "Namespace: $NAMESPACE"
echo "Deployment: $DEPLOYMENT"
echo "Service: $SERVICE"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check 1: ConfigMap exists
echo "1. Checking ConfigMap..."
if kubectl get configmap ${DEPLOYMENT}-config -n $NAMESPACE &>/dev/null; then
    check_pass "ConfigMap exists"
else
    check_fail "ConfigMap not found"
    echo "   Run: helm upgrade flamoral . -f values-prod.yaml --namespace $NAMESPACE"
    exit 1
fi

# Check 2: API Gateway pods running
echo ""
echo "2. Checking API Gateway pods..."
PODS=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/component=api-gateway --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
if [ "$PODS" -gt 0 ]; then
    check_pass "$PODS pod(s) running"
else
    check_fail "No running pods found"
    exit 1
fi

# Check 3: Environment variables set
echo ""
echo "3. Checking environment variables..."
POD=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/component=api-gateway --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -z "$POD" ]; then
    check_fail "No pod found to check"
    exit 1
fi

AUTH_URL=$(kubectl exec -n $NAMESPACE $POD -- env 2>/dev/null | grep "^AUTH_SERVICE_URL=" | cut -d= -f2)
if [ -n "$AUTH_URL" ]; then
    check_pass "AUTH_SERVICE_URL is set: $AUTH_URL"

    # Verify it's using Kubernetes DNS
    if [[ $AUTH_URL == *"$SERVICE"* ]]; then
        check_pass "Using Kubernetes DNS name"
    else
        check_warn "Not using expected Kubernetes DNS name"
        echo "   Expected: http://${SERVICE}:3001"
        echo "   Actual: $AUTH_URL"
    fi
else
    check_fail "AUTH_SERVICE_URL not set"
    echo "   The deployment may not have envFrom configured"
    exit 1
fi

# Check 4: Circuit breaker config
echo ""
echo "4. Checking circuit breaker configuration..."
CIRCUIT_THRESHOLD=$(kubectl exec -n $NAMESPACE $POD -- env 2>/dev/null | grep "^CIRCUIT_FAILURE_THRESHOLD=" | cut -d= -f2)
if [ -n "$CIRCUIT_THRESHOLD" ]; then
    check_pass "Circuit breaker configured (threshold: $CIRCUIT_THRESHOLD)"
else
    check_warn "Circuit breaker config not found"
fi

# Check 5: Auth service exists and is running
echo ""
echo "5. Checking auth service..."
AUTH_PODS=$(kubectl get pods -n $NAMESPACE -l app.kubernetes.io/component=auth-service --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
if [ "$AUTH_PODS" -gt 0 ]; then
    check_pass "$AUTH_PODS auth service pod(s) running"
else
    check_fail "Auth service not running"
    exit 1
fi

# Check 6: Service endpoint exists
echo ""
echo "6. Checking service endpoint..."
if kubectl get service $SERVICE -n $NAMESPACE &>/dev/null; then
    check_pass "Service exists"
    ENDPOINTS=$(kubectl get endpoints $SERVICE -n $NAMESPACE -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null | wc -w)
    if [ "$ENDPOINTS" -gt 0 ]; then
        check_pass "$ENDPOINTS endpoint(s) available"
    else
        check_fail "No endpoints available"
    fi
else
    check_fail "Service not found"
    exit 1
fi

# Check 7: Connectivity test
echo ""
echo "7. Testing connectivity from API Gateway to Auth Service..."
HEALTH_CHECK=$(kubectl exec -n $NAMESPACE $POD -- wget -qO- http://${SERVICE}:3001/health 2>&1)
if [ $? -eq 0 ]; then
    check_pass "Health check successful"
    echo "   Response: $HEALTH_CHECK"
else
    check_fail "Health check failed"
    echo "   Error: $HEALTH_CHECK"
    exit 1
fi

# Check 8: DNS resolution
echo ""
echo "8. Testing DNS resolution..."
DNS_TEST=$(kubectl exec -n $NAMESPACE $POD -- nslookup $SERVICE 2>&1 | grep "Address:" | tail -1)
if [ -n "$DNS_TEST" ]; then
    check_pass "DNS resolves: $DNS_TEST"
else
    check_warn "DNS resolution test inconclusive"
fi

# Check 9: Recent logs check
echo ""
echo "9. Checking recent logs for errors..."
ERROR_COUNT=$(kubectl logs -n $NAMESPACE deployment/$DEPLOYMENT --tail=100 2>/dev/null | grep -i "error\|failed\|circuit.*open" | wc -l)
if [ "$ERROR_COUNT" -eq 0 ]; then
    check_pass "No recent errors in logs"
else
    check_warn "$ERROR_COUNT error-related log entries found"
    echo "   Run: kubectl logs -n $NAMESPACE deployment/$DEPLOYMENT --tail=100 | grep -i error"
fi

# Check 10: Circuit breaker status in logs
echo ""
echo "10. Checking circuit breaker status..."
CIRCUIT_STATUS=$(kubectl logs -n $NAMESPACE deployment/$DEPLOYMENT --tail=100 2>/dev/null | grep -i "circuit.*authService" | tail -1)
if [[ $CIRCUIT_STATUS == *"CLOSED"* ]]; then
    check_pass "Circuit breaker CLOSED (healthy)"
elif [[ $CIRCUIT_STATUS == *"OPEN"* ]]; then
    check_fail "Circuit breaker OPEN (unhealthy)"
    echo "   This indicates the service is still experiencing issues"
    echo "   Wait 15 seconds for automatic retry or investigate connectivity"
elif [[ $CIRCUIT_STATUS == *"HALF_OPEN"* ]]; then
    check_warn "Circuit breaker HALF_OPEN (recovering)"
    echo "   The service is being tested for recovery"
else
    check_warn "Circuit breaker status unknown"
    echo "   Status: ${CIRCUIT_STATUS:-No status found}"
fi

# Summary
echo ""
echo "=================================================="
echo "Verification Summary"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Test external endpoint:"
echo "   curl -X POST https://api.flamoral.com/api/v1/api/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"test@test.com\",\"password\":\"test\"}'"
echo ""
echo "2. Expected: 401 Unauthorized (NOT 503)"
echo ""
echo "3. Monitor logs:"
echo "   kubectl logs -n $NAMESPACE deployment/$DEPLOYMENT -f"
echo ""
echo "4. Check circuit breaker metrics:"
echo "   kubectl logs -n $NAMESPACE deployment/$DEPLOYMENT | grep -i circuit"
echo ""

echo "=================================================="
echo "Verification complete!"
echo "=================================================="
