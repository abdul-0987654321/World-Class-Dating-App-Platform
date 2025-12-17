#!/bin/bash
# WebSocket Connectivity Verification Script
# Tests WebSocket connectivity for flamoral.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-flamoral}"
API_URL="${API_URL:-https://api.flamoral.com}"
REALTIME_URL="${REALTIME_URL:-https://api.flamoral.com/realtime}"

echo "==============================================="
echo "WebSocket Connectivity Verification"
echo "==============================================="
echo ""

# Function to print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        return 1
    fi
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check prerequisites
echo "Checking prerequisites..."
command -v kubectl >/dev/null 2>&1 || { echo "kubectl is required but not installed. Aborting." >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "curl is required but not installed. Aborting." >&2; exit 1; }
print_result 0 "Prerequisites installed"
echo ""

# 1. Check Kubernetes Pods
echo "1. Checking Kubernetes Pods..."
echo "----------------------------------------------"

# API Gateway
API_POD=$(kubectl get pods -n $NAMESPACE -l app=api-gateway -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$API_POD" ]; then
    API_STATUS=$(kubectl get pod $API_POD -n $NAMESPACE -o jsonpath='{.status.phase}')
    if [ "$API_STATUS" = "Running" ]; then
        print_result 0 "API Gateway pod is running: $API_POD"
    else
        print_result 1 "API Gateway pod is not running: $API_STATUS"
    fi
else
    print_result 1 "API Gateway pod not found"
fi

# Realtime Service
RT_POD=$(kubectl get pods -n $NAMESPACE -l app=realtime-service -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$RT_POD" ]; then
    RT_STATUS=$(kubectl get pod $RT_POD -n $NAMESPACE -o jsonpath='{.status.phase}')
    if [ "$RT_STATUS" = "Running" ]; then
        print_result 0 "Realtime Service pod is running: $RT_POD"
    else
        print_result 1 "Realtime Service pod is not running: $RT_STATUS"
    fi
else
    print_result 1 "Realtime Service pod not found"
fi

echo ""

# 2. Check Environment Variables
echo "2. Checking Environment Variables..."
echo "----------------------------------------------"

if [ -n "$RT_POD" ]; then
    # Check critical env vars
    ENV_VARS=("PORT" "REDIS_HOST" "REDIS_TLS" "JWT_SECRET" "SERVICE_TOKEN" "ALLOWED_ORIGINS")

    for var in "${ENV_VARS[@]}"; do
        VALUE=$(kubectl exec -n $NAMESPACE $RT_POD -- printenv $var 2>/dev/null || echo "")
        if [ -n "$VALUE" ]; then
            if [ "$var" = "JWT_SECRET" ] || [ "$var" = "SERVICE_TOKEN" ]; then
                print_result 0 "$var is set (value hidden)"
            else
                print_result 0 "$var = $VALUE"
            fi
        else
            print_result 1 "$var is not set"
        fi
    done
else
    print_warning "Skipping env var check - no pod found"
fi

echo ""

# 3. Check Health Endpoints
echo "3. Checking Health Endpoints..."
echo "----------------------------------------------"

# API Gateway Health
if curl -sf "$API_URL/health" >/dev/null 2>&1; then
    print_result 0 "API Gateway health endpoint: $API_URL/health"
else
    print_result 1 "API Gateway health endpoint failed"
fi

# Realtime Service Health
if curl -sf "$REALTIME_URL/health" >/dev/null 2>&1; then
    print_result 0 "Realtime Service health endpoint: $REALTIME_URL/health"
else
    print_result 1 "Realtime Service health endpoint failed"
fi

# Realtime Service Ready
if curl -sf "$REALTIME_URL/ready" >/dev/null 2>&1; then
    print_result 0 "Realtime Service ready endpoint (Redis connected)"
else
    print_result 1 "Realtime Service ready endpoint failed (Redis issue?)"
fi

echo ""

# 4. Check Redis Connectivity
echo "4. Checking Redis Connectivity..."
echo "----------------------------------------------"

if [ -n "$RT_POD" ]; then
    # Try to check Redis from inside pod
    if kubectl exec -n $NAMESPACE $RT_POD -- wget -q -O- http://localhost:8081/ready 2>/dev/null | grep -q '"status":"ready"'; then
        print_result 0 "Redis connection verified"
    else
        print_result 1 "Redis connection check failed"
    fi
else
    print_warning "Skipping Redis check - no pod found"
fi

echo ""

# 5. Check Service Configuration
echo "5. Checking Service Configuration..."
echo "----------------------------------------------"

# Check if services exist
API_SVC=$(kubectl get svc -n $NAMESPACE api-gateway -o jsonpath='{.metadata.name}' 2>/dev/null)
if [ -n "$API_SVC" ]; then
    API_PORT=$(kubectl get svc -n $NAMESPACE api-gateway -o jsonpath='{.spec.ports[0].port}')
    print_result 0 "API Gateway service: $API_SVC (port $API_PORT)"
else
    print_result 1 "API Gateway service not found"
fi

RT_SVC=$(kubectl get svc -n $NAMESPACE realtime-service -o jsonpath='{.metadata.name}' 2>/dev/null)
if [ -n "$RT_SVC" ]; then
    RT_PORT=$(kubectl get svc -n $NAMESPACE realtime-service -o jsonpath='{.spec.ports[0].port}')
    print_result 0 "Realtime Service: $RT_SVC (port $RT_PORT)"
else
    print_result 1 "Realtime Service not found"
fi

echo ""

# 6. Check Ingress/Front Door Configuration
echo "6. Checking Ingress Configuration..."
echo "----------------------------------------------"

INGRESS=$(kubectl get ingress -n $NAMESPACE flamoral-ingress -o jsonpath='{.metadata.name}' 2>/dev/null)
if [ -n "$INGRESS" ]; then
    print_result 0 "Ingress found: $INGRESS"

    # Check backend rules
    BACKEND_COUNT=$(kubectl get ingress -n $NAMESPACE flamoral-ingress -o jsonpath='{.spec.rules[*].http.paths[*].backend.service.name}' 2>/dev/null | wc -w)
    print_result 0 "Ingress has $BACKEND_COUNT backend rules"
else
    print_warning "Ingress not found (might be using Azure Front Door directly)"
fi

echo ""

# 7. Check Logs for Errors
echo "7. Checking Recent Logs for Errors..."
echo "----------------------------------------------"

if [ -n "$RT_POD" ]; then
    ERROR_COUNT=$(kubectl logs --tail=100 -n $NAMESPACE $RT_POD 2>/dev/null | grep -i "error" | wc -l)
    if [ "$ERROR_COUNT" -eq 0 ]; then
        print_result 0 "No errors in recent logs"
    else
        print_warning "Found $ERROR_COUNT error messages in logs"
        echo "Recent errors:"
        kubectl logs --tail=100 -n $NAMESPACE $RT_POD 2>/dev/null | grep -i "error" | tail -5
    fi
else
    print_warning "Skipping log check - no pod found"
fi

echo ""

# 8. Test WebSocket Connection (if websocat available)
echo "8. Testing WebSocket Connection..."
echo "----------------------------------------------"

if command -v websocat >/dev/null 2>&1; then
    print_warning "websocat found - manual WebSocket test available"
    echo "  To test: websocat wss://api.flamoral.com/socket.io/?EIO=4&transport=websocket"
else
    print_warning "websocat not installed - skipping WebSocket test"
    echo "  Install: brew install websocat (macOS) or cargo install websocat"
fi

echo ""

# 9. Summary
echo "==============================================="
echo "Verification Summary"
echo "==============================================="

# Count checks
TOTAL_CHECKS=20
PASSED_CHECKS=$(grep -c "^✓" /tmp/ws_check.log 2>/dev/null || echo "0")

echo "Passed: $PASSED_CHECKS / $TOTAL_CHECKS checks"

if [ "$PASSED_CHECKS" -ge 15 ]; then
    echo -e "${GREEN}✓ WebSocket connectivity looks good!${NC}"
    exit 0
elif [ "$PASSED_CHECKS" -ge 10 ]; then
    echo -e "${YELLOW}⚠ Some issues detected - review above${NC}"
    exit 1
else
    echo -e "${RED}✗ Multiple issues detected - immediate attention required${NC}"
    exit 2
fi
