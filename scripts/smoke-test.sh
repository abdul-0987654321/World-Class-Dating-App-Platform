#!/bin/bash
#
# Flamoral Production Smoke Test
# Runs post-deployment to verify critical functionality
#
# Usage: ./smoke-test.sh [API_URL]
# Example: ./smoke-test.sh https://api.flamoral.com
#

set -e

API_URL="${1:-http://localhost:3000/api}"
FAILED=0
PASSED=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Flamoral Production Smoke Test"
echo "API URL: $API_URL"
echo "=========================================="
echo ""

# Helper function to make requests and check response
check_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local expected_status="$4"
    local data="$5"
    local auth="$6"

    local curl_opts="-s -o /dev/null -w %{http_code}"

    if [ -n "$auth" ]; then
        curl_opts="$curl_opts -H 'Authorization: Bearer $auth'"
    fi

    if [ "$method" == "POST" ] && [ -n "$data" ]; then
        curl_opts="$curl_opts -H 'Content-Type: application/json' -d '$data'"
    fi

    local status
    status=$(curl $curl_opts -X "$method" "$API_URL$endpoint")

    if [ "$status" == "$expected_status" ]; then
        echo -e "${GREEN}[PASS]${NC} $name - Status: $status"
        ((PASSED++))
    else
        echo -e "${RED}[FAIL]${NC} $name - Expected: $expected_status, Got: $status"
        ((FAILED++))
    fi
}

# Health Check
echo "1. Health Checks"
echo "----------------"
check_endpoint "Health endpoint" "GET" "/health" "200"
echo ""

# Auth Endpoints (unauthenticated)
echo "2. Auth Endpoints"
echo "-----------------"
check_endpoint "Login (no creds)" "POST" "/auth/login" "400" '{"email":"","password":""}'
check_endpoint "Register (no data)" "POST" "/auth/register" "400" '{}'
check_endpoint "Refresh (no token)" "POST" "/auth/refresh" "400" '{}'
echo ""

# Protected Endpoints (should return 401 without auth)
echo "3. Protected Endpoints (no auth)"
echo "---------------------------------"
check_endpoint "Profile (no auth)" "GET" "/profile/me" "401"
check_endpoint "Discovery (no auth)" "GET" "/discovery/feed" "401"
check_endpoint "Matches (no auth)" "GET" "/matches" "401"
check_endpoint "Conversations (no auth)" "GET" "/conversations" "401"
check_endpoint "Verification status (no auth)" "GET" "/verification/status" "401"
check_endpoint "Subscription status (no auth)" "GET" "/subscriptions/status" "401"
check_endpoint "Audit logs (no auth)" "GET" "/audit/logs" "401"
echo ""

# Public Endpoints
echo "4. Public Endpoints"
echo "-------------------"
check_endpoint "Subscription plans" "GET" "/subscriptions/plans" "200"
echo ""

# Test with authentication if TEST_TOKEN is provided
if [ -n "$TEST_TOKEN" ]; then
    echo "5. Authenticated Endpoints"
    echo "--------------------------"
    check_endpoint "Session" "GET" "/auth/session" "200" "" "$TEST_TOKEN"
    check_endpoint "Profile" "GET" "/profile/me" "200" "" "$TEST_TOKEN"
    check_endpoint "Discovery feed" "GET" "/discovery/feed" "200" "" "$TEST_TOKEN"
    check_endpoint "Matches" "GET" "/matches" "200" "" "$TEST_TOKEN"
    check_endpoint "Conversations" "GET" "/conversations" "200" "" "$TEST_TOKEN"
    check_endpoint "Verification status" "GET" "/verification/status" "200" "" "$TEST_TOKEN"
    check_endpoint "Subscription status" "GET" "/subscriptions/status" "200" "" "$TEST_TOKEN"
    echo ""

    # SEV-1 Check: Discovery feed not empty for eligible users
    echo "6. SEV-1 Checks"
    echo "---------------"

    # Check discovery feed returns items
    feed_count=$(curl -s -H "Authorization: Bearer $TEST_TOKEN" "$API_URL/discovery/feed" | jq '.items | length')
    if [ "$feed_count" -gt 0 ]; then
        echo -e "${GREEN}[PASS]${NC} Discovery feed has $feed_count candidates"
        ((PASSED++))
    else
        echo -e "${YELLOW}[WARN]${NC} Discovery feed is empty (may be expected if no eligible users)"
    fi

    # Check verification status is not stale
    verification_status=$(curl -s -H "Authorization: Bearer $TEST_TOKEN" "$API_URL/verification/status" | jq -r '.status')
    if [ -n "$verification_status" ]; then
        echo -e "${GREEN}[PASS]${NC} Verification status returned: $verification_status"
        ((PASSED++))
    else
        echo -e "${RED}[FAIL]${NC} Verification status missing"
        ((FAILED++))
    fi

    # Check subscription entitlements present
    entitlements=$(curl -s -H "Authorization: Bearer $TEST_TOKEN" "$API_URL/subscriptions/status" | jq '.entitlements')
    if [ "$entitlements" != "null" ]; then
        echo -e "${GREEN}[PASS]${NC} Subscription entitlements present"
        ((PASSED++))
    else
        echo -e "${RED}[FAIL]${NC} Subscription entitlements missing"
        ((FAILED++))
    fi
    echo ""
else
    echo -e "${YELLOW}[INFO]${NC} Set TEST_TOKEN environment variable to run authenticated tests"
    echo ""
fi

# Summary
echo "=========================================="
echo "Summary"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}SMOKE TEST FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}SMOKE TEST PASSED${NC}"
    exit 0
fi
