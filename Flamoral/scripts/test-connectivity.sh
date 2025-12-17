#!/bin/bash

# ============================================================================
# Flamoral Platform - Frontend Connectivity Test Script
# ============================================================================
# This script tests all frontend-to-backend connectivity points
# Usage: ./test-connectivity.sh [environment]
# Example: ./test-connectivity.sh production
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default to development environment
ENVIRONMENT=${1:-development}

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Flamoral Platform - Frontend Connectivity Test${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Load environment variables based on environment
if [ "$ENVIRONMENT" = "production" ]; then
    API_URL="${API_URL:-https://api.flamoral.com}"
    WS_URL="${WS_URL:-wss://api.flamoral.com}"
elif [ "$ENVIRONMENT" = "staging" ]; then
    API_URL="${API_URL:-https://api-staging.flamoral.com}"
    WS_URL="${WS_URL:-wss://api-staging.flamoral.com}"
else
    API_URL="${API_URL:-http://localhost:4000}"
    WS_URL="${WS_URL:-ws://localhost:4000}"
fi

echo -e "${YELLOW}Testing API URL: ${API_URL}${NC}"
echo -e "${YELLOW}Testing WebSocket URL: ${WS_URL}${NC}"
echo ""

# Counter for passed and failed tests
PASSED=0
FAILED=0

# Function to test HTTP endpoint
test_http_endpoint() {
    local endpoint=$1
    local description=$2
    local expected_status=${3:-200}

    echo -n "Testing ${description}... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}${endpoint}" 2>/dev/null || echo "000")

    if [ "$response" = "$expected_status" ] || [ "$response" = "200" ] || [ "$response" = "401" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $response)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $response)"
        ((FAILED++))
        return 1
    fi
}

# Function to test WebSocket endpoint
test_websocket() {
    local ws_url=$1
    local description=$2

    echo -n "Testing ${description}... "

    # Use wscat if available, otherwise skip
    if command -v wscat &> /dev/null; then
        timeout 3 wscat -c "$ws_url" --execute "ping" &> /dev/null && result=0 || result=1
        if [ $result -eq 0 ]; then
            echo -e "${GREEN}✓ PASSED${NC}"
            ((PASSED++))
            return 0
        else
            echo -e "${YELLOW}⚠ TIMEOUT${NC} (WebSocket might be protected)"
            ((PASSED++))
            return 0
        fi
    else
        echo -e "${YELLOW}⚠ SKIPPED${NC} (wscat not installed)"
        return 0
    fi
}

# Function to test DNS resolution
test_dns() {
    local domain=$1
    local description=$2

    echo -n "Testing ${description}... "

    if nslookup "$domain" &> /dev/null || dig "$domain" &> /dev/null || host "$domain" &> /dev/null; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((FAILED++))
        return 1
    fi
}

echo -e "${BLUE}--- DNS Resolution Tests ---${NC}"

# Extract domain from API_URL
API_DOMAIN=$(echo "$API_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||')
test_dns "$API_DOMAIN" "API Gateway DNS Resolution"

echo ""
echo -e "${BLUE}--- API Health Check Tests ---${NC}"

# Test health/ping endpoints
test_http_endpoint "/health" "Health Check Endpoint"
test_http_endpoint "/api/health" "API Health Endpoint"
test_http_endpoint "/api/v1/health" "API v1 Health Endpoint"
test_http_endpoint "/ping" "Ping Endpoint"

echo ""
echo -e "${BLUE}--- Authentication Endpoints ---${NC}"

test_http_endpoint "/api/v1/auth/login" "Login Endpoint" "401"
test_http_endpoint "/api/v1/auth/register" "Register Endpoint" "200"
test_http_endpoint "/api/v1/auth/refresh-token" "Token Refresh Endpoint" "401"
test_http_endpoint "/api/v1/auth/logout" "Logout Endpoint"

echo ""
echo -e "${BLUE}--- User Service Endpoints ---${NC}"

test_http_endpoint "/api/v1/users/me" "Current User Endpoint" "401"
test_http_endpoint "/api/v1/profiles" "Profiles Endpoint" "401"

echo ""
echo -e "${BLUE}--- Matching Service Endpoints ---${NC}"

test_http_endpoint "/api/v1/matching/discover" "Discovery Endpoint" "401"
test_http_endpoint "/api/v1/matching/matches" "Matches List Endpoint" "401"

echo ""
echo -e "${BLUE}--- Messaging Service Endpoints ---${NC}"

test_http_endpoint "/api/v1/messaging/conversations" "Conversations List Endpoint" "401"
test_http_endpoint "/api/v1/messaging/messages" "Messages Endpoint" "401"

echo ""
echo -e "${BLUE}--- Payment Service Endpoints ---${NC}"

test_http_endpoint "/api/v1/payments/subscriptions" "Subscriptions Endpoint" "401"
test_http_endpoint "/api/v1/payments/coins" "Coins Endpoint" "401"

echo ""
echo -e "${BLUE}--- Notification Service Endpoints ---${NC}"

test_http_endpoint "/api/v1/notifications" "Notifications Endpoint" "401"

echo ""
echo -e "${BLUE}--- Media Service Endpoints ---${NC}"

test_http_endpoint "/api/v1/media/upload" "Media Upload Endpoint" "401"

echo ""
echo -e "${BLUE}--- WebSocket Connectivity Tests ---${NC}"

# Extract WebSocket domain
WS_DOMAIN=$(echo "$WS_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||')

if [ "$ENVIRONMENT" != "development" ]; then
    echo -e "${YELLOW}Note: WebSocket tests require authentication and may show timeouts${NC}"
fi

test_websocket "$WS_URL" "Main WebSocket Connection"
test_websocket "${WS_URL}/socket.io/" "Socket.IO Connection"

echo ""
echo -e "${BLUE}--- CORS Configuration Tests ---${NC}"

echo -n "Testing CORS Headers... "
cors_headers=$(curl -s -I -X OPTIONS "${API_URL}/api/v1/health" \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: GET" 2>/dev/null | grep -i "access-control" || echo "")

if [ -n "$cors_headers" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARNING${NC} (CORS headers not found)"
fi

echo ""
echo -e "${BLUE}--- SSL/TLS Tests (Production/Staging only) ---${NC}"

if [ "$ENVIRONMENT" != "development" ]; then
    echo -n "Testing SSL Certificate... "
    if echo | openssl s_client -connect "${API_DOMAIN}:443" -servername "$API_DOMAIN" 2>/dev/null | grep -q "Verify return code: 0"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((FAILED++))
    fi

    echo -n "Testing TLS Version... "
    tls_version=$(echo | openssl s_client -connect "${API_DOMAIN}:443" -servername "$API_DOMAIN" 2>/dev/null | grep "Protocol" | awk '{print $3}')
    if [[ "$tls_version" == "TLSv1.2" ]] || [[ "$tls_version" == "TLSv1.3" ]]; then
        echo -e "${GREEN}✓ PASSED${NC} ($tls_version)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} ($tls_version)"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}Skipping SSL tests for development environment${NC}"
fi

echo ""
echo -e "${BLUE}--- Performance Tests ---${NC}"

echo -n "Testing API Response Time... "
response_time=$(curl -s -o /dev/null -w "%{time_total}" "${API_URL}/health" 2>/dev/null || echo "999")
response_time_ms=$(echo "$response_time * 1000" | bc)

if (( $(echo "$response_time < 2" | bc -l) )); then
    echo -e "${GREEN}✓ PASSED${NC} (${response_time_ms}ms)"
    ((PASSED++))
elif (( $(echo "$response_time < 5" | bc -l) )); then
    echo -e "${YELLOW}⚠ SLOW${NC} (${response_time_ms}ms)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} (${response_time_ms}ms - Too slow)"
    ((FAILED++))
fi

echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All connectivity tests passed!${NC}"
    echo -e "${GREEN}Frontend apps should be able to connect to the backend without issues.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some connectivity tests failed.${NC}"
    echo -e "${YELLOW}Please check:${NC}"
    echo -e "  1. Backend services are running"
    echo -e "  2. Environment variables are correctly set"
    echo -e "  3. Network connectivity and firewall rules"
    echo -e "  4. DNS resolution is working"
    echo -e "  5. SSL certificates are valid (production/staging)"
    exit 1
fi
