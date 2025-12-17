#!/bin/bash

##############################################################################
# Security Headers Testing Script
# Tests all security headers implemented in the Flamoral Dating Platform
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:4000}"
WEB_URL="${WEB_URL:-http://localhost:5173}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Flamoral Dating Platform - Security Headers Test Suite      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if a header exists and has expected value
check_header() {
    local url=$1
    local header_name=$2
    local expected_value=$3
    local test_name=$4

    echo -ne "Testing: ${test_name}... "

    response=$(curl -s -I "$url" 2>/dev/null)

    if echo "$response" | grep -qi "^${header_name}:"; then
        header_value=$(echo "$response" | grep -i "^${header_name}:" | cut -d':' -f2- | tr -d '\r\n' | sed 's/^[[:space:]]*//')

        if [ -n "$expected_value" ]; then
            if echo "$header_value" | grep -q "$expected_value"; then
                echo -e "${GREEN}✓ PASS${NC}"
                echo -e "   Value: ${YELLOW}${header_value}${NC}"
                return 0
            else
                echo -e "${RED}✗ FAIL${NC}"
                echo -e "   Expected: ${expected_value}"
                echo -e "   Got: ${header_value}"
                return 1
            fi
        else
            echo -e "${GREEN}✓ PASS${NC}"
            echo -e "   Value: ${YELLOW}${header_value}${NC}"
            return 0
        fi
    else
        echo -e "${RED}✗ FAIL - Header not found${NC}"
        return 1
    fi
}

# Function to check if header is absent
check_header_absent() {
    local url=$1
    local header_name=$2
    local test_name=$3

    echo -ne "Testing: ${test_name}... "

    response=$(curl -s -I "$url" 2>/dev/null)

    if echo "$response" | grep -qi "^${header_name}:"; then
        echo -e "${RED}✗ FAIL - Header should not be present${NC}"
        return 1
    else
        echo -e "${GREEN}✓ PASS - Header correctly absent${NC}"
        return 0
    fi
}

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if "$@"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Testing API Gateway (${API_URL})${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. Content Security Policy
run_test check_header "$API_URL/api/v1/health" "Content-Security-Policy" "default-src" "CSP Header Present"

# 2. X-Frame-Options
run_test check_header "$API_URL/api/v1/health" "X-Frame-Options" "DENY" "X-Frame-Options: DENY"

# 3. X-Content-Type-Options
run_test check_header "$API_URL/api/v1/health" "X-Content-Type-Options" "nosniff" "X-Content-Type-Options: nosniff"

# 4. X-XSS-Protection
run_test check_header "$API_URL/api/v1/health" "X-XSS-Protection" "1; mode=block" "X-XSS-Protection: 1; mode=block"

# 5. Referrer-Policy
run_test check_header "$API_URL/api/v1/health" "Referrer-Policy" "strict-origin-when-cross-origin" "Referrer-Policy"

# 6. Permissions-Policy
run_test check_header "$API_URL/api/v1/health" "Permissions-Policy" "camera" "Permissions-Policy Present"

# 7. X-Permitted-Cross-Domain-Policies
run_test check_header "$API_URL/api/v1/health" "X-Permitted-Cross-Domain-Policies" "none" "X-Permitted-Cross-Domain-Policies"

# 8. X-Download-Options
run_test check_header "$API_URL/api/v1/health" "X-Download-Options" "noopen" "X-Download-Options"

# 9. Cross-Origin-Embedder-Policy
run_test check_header "$API_URL/api/v1/health" "Cross-Origin-Embedder-Policy" "unsafe-none" "Cross-Origin-Embedder-Policy"

# 10. Cross-Origin-Opener-Policy
run_test check_header "$API_URL/api/v1/health" "Cross-Origin-Opener-Policy" "same-origin-allow-popups" "Cross-Origin-Opener-Policy"

# 11. Cross-Origin-Resource-Policy
run_test check_header "$API_URL/api/v1/health" "Cross-Origin-Resource-Policy" "same-site" "Cross-Origin-Resource-Policy"

# 12. Server header should be removed
run_test check_header_absent "$API_URL/api/v1/health" "Server" "Server Header Removed"

# 13. X-Powered-By should be removed
run_test check_header_absent "$API_URL/api/v1/health" "X-Powered-By" "X-Powered-By Header Removed"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Testing Specific CSP Directives${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Extract and display CSP header
echo -e "${YELLOW}Full Content Security Policy:${NC}"
CSP_HEADER=$(curl -s -I "$API_URL/api/v1/health" 2>/dev/null | grep -i "^Content-Security-Policy:" | cut -d':' -f2- | tr -d '\r\n' | sed 's/^[[:space:]]*//')
echo "$CSP_HEADER" | tr ';' '\n' | sed 's/^[[:space:]]*/  /'
echo ""

# Check critical CSP directives
echo -ne "Checking CSP: default-src 'self'... "
if echo "$CSP_HEADER" | grep -q "default-src 'self'"; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ FAIL${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

echo -ne "Checking CSP: script-src 'self' (no unsafe-inline/eval)... "
if echo "$CSP_HEADER" | grep -q "script-src 'self'" && ! echo "$CSP_HEADER" | grep -q "script-src.*unsafe-inline"; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${YELLOW}⚠ WARNING - May allow unsafe scripts${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

echo -ne "Checking CSP: object-src 'none'... "
if echo "$CSP_HEADER" | grep -q "object-src 'none'"; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ FAIL${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

echo -ne "Checking CSP: frame-ancestors 'none'... "
if echo "$CSP_HEADER" | grep -q "frame-ancestors 'none'"; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ FAIL${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

echo -ne "Checking CSP: upgrade-insecure-requests... "
if echo "$CSP_HEADER" | grep -q "upgrade-insecure-requests"; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ FAIL${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

echo -ne "Checking CSP: block-all-mixed-content... "
if echo "$CSP_HEADER" | grep -q "block-all-mixed-content"; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ FAIL${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Testing CSP Violation Reporting Endpoint${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -ne "Testing CSP violation report endpoint... "
CSP_REPORT='{"csp-report":{"document-uri":"https://example.com/test","violated-directive":"script-src","blocked-uri":"https://evil.com"}}'
RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$API_URL/api/v1/security/csp-report" \
    -H "Content-Type: application/json" \
    -d "$CSP_REPORT")

if [ "$RESPONSE" = "204" ] || [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $RESPONSE)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $RESPONSE)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test Results Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Total Tests:  ${TOTAL_TESTS}"
echo -e "Passed:       ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed:       ${RED}${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ ALL SECURITY HEADERS TESTS PASSED!                         ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ✗ SOME TESTS FAILED (${PASS_RATE}% pass rate)                          ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
