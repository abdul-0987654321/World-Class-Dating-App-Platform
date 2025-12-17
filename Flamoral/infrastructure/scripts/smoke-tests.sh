#!/bin/bash

################################################################################
# Flamoral Platform - Smoke Tests Script
################################################################################
# This script performs comprehensive smoke tests on the deployed application
# to verify that critical functionality is working correctly.
#
# Usage:
#   ./smoke-tests.sh [options]
#
# Options:
#   -e, --environment ENV    Environment to test (production, staging, dev)
#   -v, --verbose           Enable verbose output
#   -h, --help              Show this help message
#
# Exit Codes:
#   0 - All tests passed
#   1 - One or more tests failed
#   2 - Script usage error
################################################################################

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="production"
VERBOSE=false
BASE_URL=""
API_URL=""
WS_URL=""
TIMEOUT=30
MAX_RESPONSE_TIME=2000  # milliseconds

# Test results
PASSED_TESTS=0
FAILED_TESTS=0
TOTAL_TESTS=0

# Response time tracking
TOTAL_RESPONSE_TIME=0
RESPONSE_COUNT=0

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${CYAN}[TEST]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

print_info() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

show_help() {
    cat << EOF
Flamoral Platform Smoke Tests

Usage: $0 [options]

Options:
    -e, --environment ENV    Environment to test (production, staging, dev)
    -v, --verbose           Enable verbose output
    -h, --help              Show this help message

Examples:
    $0 --environment production
    $0 -e staging -v

EOF
    exit 0
}

################################################################################
# Parse Arguments
################################################################################

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                show_help
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                ;;
        esac
    done

    # Set URLs based on environment
    case $ENVIRONMENT in
        production)
            BASE_URL="https://flamoral.com"
            API_URL="https://api.flamoral.com"
            WS_URL="wss://api.flamoral.com"
            ;;
        staging)
            BASE_URL="https://staging.flamoral.com"
            API_URL="https://api-staging.flamoral.com"
            WS_URL="wss://api-staging.flamoral.com"
            ;;
        dev)
            BASE_URL="https://dev.flamoral.com"
            API_URL="https://api-dev.flamoral.com"
            WS_URL="wss://api-dev.flamoral.com"
            ;;
        *)
            echo "Invalid environment: $ENVIRONMENT"
            exit 2
            ;;
    esac
}

################################################################################
# HTTP Request Helper
################################################################################

make_request() {
    local method="$1"
    local url="$2"
    local expected_code="${3:-200}"
    local data="${4:-}"

    local start_time=$(date +%s%N)
    local response_file=$(mktemp)
    local header_file=$(mktemp)

    if [ -n "$data" ]; then
        HTTP_CODE=$(curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -o "$response_file" \
            -D "$header_file" \
            -w "%{http_code}" \
            --connect-timeout 10 \
            --max-time "$TIMEOUT" \
            "$url" 2>/dev/null || echo "000")
    else
        HTTP_CODE=$(curl -s -X "$method" \
            -o "$response_file" \
            -D "$header_file" \
            -w "%{http_code}" \
            --connect-timeout 10 \
            --max-time "$TIMEOUT" \
            "$url" 2>/dev/null || echo "000")
    fi

    local end_time=$(date +%s%N)
    RESPONSE_TIME=$(( ($end_time - $start_time) / 1000000 ))
    RESPONSE_BODY=$(cat "$response_file")
    RESPONSE_HEADERS=$(cat "$header_file")

    rm -f "$response_file" "$header_file"

    # Track response time
    if [ "$HTTP_CODE" != "000" ]; then
        TOTAL_RESPONSE_TIME=$((TOTAL_RESPONSE_TIME + RESPONSE_TIME))
        ((RESPONSE_COUNT++))
    fi

    print_info "Response Time: ${RESPONSE_TIME}ms | Status: $HTTP_CODE"

    if [ "$HTTP_CODE" = "$expected_code" ]; then
        return 0
    else
        return 1
    fi
}

################################################################################
# Test: Main API Endpoints
################################################################################

test_api_endpoints() {
    print_header "API Endpoint Tests"

    # Health endpoint
    print_test "Testing API health endpoint..."
    if make_request "GET" "$API_URL/health" "200"; then
        print_pass "API health endpoint responding (${RESPONSE_TIME}ms)"
    else
        print_fail "API health endpoint failed (HTTP $HTTP_CODE)"
    fi

    # API status endpoint
    print_test "Testing API status endpoint..."
    if make_request "GET" "$API_URL/api/v1/status" "200"; then
        print_pass "API status endpoint responding (${RESPONSE_TIME}ms)"
        print_info "Response: $RESPONSE_BODY"
    else
        print_fail "API status endpoint failed (HTTP $HTTP_CODE)"
    fi

    # Version endpoint
    print_test "Testing API version endpoint..."
    if make_request "GET" "$API_URL/api/v1/version" "200"; then
        VERSION=$(echo "$RESPONSE_BODY" | jq -r '.version' 2>/dev/null || echo "unknown")
        print_pass "API version endpoint responding - Version: $VERSION (${RESPONSE_TIME}ms)"
    else
        print_fail "API version endpoint failed (HTTP $HTTP_CODE)"
    fi
}

################################################################################
# Test: Authentication Flow
################################################################################

test_authentication() {
    print_header "Authentication Flow Tests"

    # Test registration endpoint exists
    print_test "Testing registration endpoint availability..."
    if make_request "POST" "$API_URL/api/v1/auth/register" "400" '{"email":"test@example.com"}'; then
        print_pass "Registration endpoint responding (${RESPONSE_TIME}ms)"
    else
        print_fail "Registration endpoint failed (HTTP $HTTP_CODE)"
    fi

    # Test login endpoint exists
    print_test "Testing login endpoint availability..."
    if make_request "POST" "$API_URL/api/v1/auth/login" "400" '{"email":"test@example.com","password":"test"}'; then
        print_pass "Login endpoint responding (${RESPONSE_TIME}ms)"
    else
        print_fail "Login endpoint failed (HTTP $HTTP_CODE)"
    fi

    # Test token validation endpoint
    print_test "Testing token validation endpoint..."
    if make_request "POST" "$API_URL/api/v1/auth/validate" "401" '{"token":"invalid"}'; then
        print_pass "Token validation endpoint responding correctly (${RESPONSE_TIME}ms)"
    else
        print_fail "Token validation endpoint failed (HTTP $HTTP_CODE)"
    fi

    # Test logout endpoint
    print_test "Testing logout endpoint..."
    if make_request "POST" "$API_URL/api/v1/auth/logout" "401"; then
        print_pass "Logout endpoint responding correctly (requires auth) (${RESPONSE_TIME}ms)"
    else
        print_fail "Logout endpoint failed (HTTP $HTTP_CODE)"
    fi
}

################################################################################
# Test: WebSocket Connection
################################################################################

test_websocket() {
    print_header "WebSocket Connection Tests"

    if ! command -v websocat &> /dev/null; then
        print_warn "websocat not installed, skipping WebSocket tests"
        print_info "Install: cargo install websocat"
        return
    fi

    print_test "Testing WebSocket connection..."
    WS_TEST_URL="$WS_URL/ws"

    # Try to connect to WebSocket
    TIMEOUT_CMD="timeout"
    if ! command -v timeout &> /dev/null; then
        TIMEOUT_CMD="gtimeout"  # macOS alternative
    fi

    if command -v $TIMEOUT_CMD &> /dev/null; then
        WS_RESULT=$($TIMEOUT_CMD 5 websocat -n -1 "$WS_TEST_URL" 2>&1 || echo "timeout")

        if echo "$WS_RESULT" | grep -q "timeout"; then
            print_warn "WebSocket connection timeout (may require authentication)"
        elif echo "$WS_RESULT" | grep -q "error"; then
            print_fail "WebSocket connection failed: $WS_RESULT"
        else
            print_pass "WebSocket connection successful"
        fi
    else
        print_warn "timeout command not available, skipping WebSocket test"
    fi
}

################################################################################
# Test: Static Asset Delivery
################################################################################

test_static_assets() {
    print_header "Static Asset Delivery Tests"

    # Test main page
    print_test "Testing main web page delivery..."
    if make_request "GET" "$BASE_URL" "200"; then
        # Check if response contains expected HTML
        if echo "$RESPONSE_BODY" | grep -q "<!DOCTYPE html>" || echo "$RESPONSE_BODY" | grep -q "<html"; then
            print_pass "Main page delivered successfully (${RESPONSE_TIME}ms)"
        else
            print_fail "Main page response doesn't appear to be HTML"
        fi
    else
        print_fail "Main page delivery failed (HTTP $HTTP_CODE)"
    fi

    # Test favicon
    print_test "Testing favicon delivery..."
    if make_request "GET" "$BASE_URL/favicon.ico" "200"; then
        print_pass "Favicon delivered successfully (${RESPONSE_TIME}ms)"
    else
        print_warn "Favicon delivery failed (HTTP $HTTP_CODE) - not critical"
    fi

    # Test robots.txt
    print_test "Testing robots.txt delivery..."
    if make_request "GET" "$BASE_URL/robots.txt" "200"; then
        print_pass "robots.txt delivered successfully (${RESPONSE_TIME}ms)"
    else
        print_warn "robots.txt delivery failed (HTTP $HTTP_CODE) - not critical"
    fi
}

################################################################################
# Test: CDN Caching Headers
################################################################################

test_caching_headers() {
    print_header "CDN Caching Headers Tests"

    print_test "Testing Cache-Control headers on static assets..."
    make_request "GET" "$BASE_URL" "200" > /dev/null

    # Check for Cache-Control header
    if echo "$RESPONSE_HEADERS" | grep -qi "cache-control:"; then
        CACHE_CONTROL=$(echo "$RESPONSE_HEADERS" | grep -i "cache-control:" | cut -d: -f2- | tr -d '\r\n' | xargs)
        print_pass "Cache-Control header present: $CACHE_CONTROL"
    else
        print_warn "Cache-Control header not found"
    fi

    # Check for ETag header
    if echo "$RESPONSE_HEADERS" | grep -qi "etag:"; then
        ETAG=$(echo "$RESPONSE_HEADERS" | grep -i "etag:" | cut -d: -f2- | tr -d '\r\n' | xargs)
        print_pass "ETag header present: $ETAG"
    else
        print_info "ETag header not found (optional)"
    fi

    # Check for X-Cache header (CDN)
    if echo "$RESPONSE_HEADERS" | grep -qi "x-cache:"; then
        X_CACHE=$(echo "$RESPONSE_HEADERS" | grep -i "x-cache:" | cut -d: -f2- | tr -d '\r\n' | xargs)
        print_pass "X-Cache header present: $X_CACHE"
    else
        print_info "X-Cache header not found (CDN may not be configured)"
    fi

    # Check compression
    if echo "$RESPONSE_HEADERS" | grep -qi "content-encoding: gzip"; then
        print_pass "Response is gzip compressed"
    else
        print_warn "Response is not gzip compressed"
    fi
}

################################################################################
# Test: Response Time Performance
################################################################################

test_response_times() {
    print_header "Response Time Performance Tests"

    # Test multiple endpoints and measure response times
    ENDPOINTS=(
        "$API_URL/health"
        "$API_URL/api/v1/status"
        "$BASE_URL"
    )

    print_test "Running performance tests (5 requests per endpoint)..."

    for endpoint in "${ENDPOINTS[@]}"; do
        local total_time=0
        local success_count=0

        for i in {1..5}; do
            if make_request "GET" "$endpoint" "200" > /dev/null 2>&1; then
                total_time=$((total_time + RESPONSE_TIME))
                ((success_count++))
            fi
        done

        if [ $success_count -gt 0 ]; then
            local avg_time=$((total_time / success_count))
            if [ $avg_time -lt $MAX_RESPONSE_TIME ]; then
                print_pass "$(basename $endpoint): Average ${avg_time}ms (target: <${MAX_RESPONSE_TIME}ms)"
            else
                print_warn "$(basename $endpoint): Average ${avg_time}ms (exceeds target of ${MAX_RESPONSE_TIME}ms)"
            fi
        else
            print_fail "$(basename $endpoint): All requests failed"
        fi
    done
}

################################################################################
# Test: Core Business Logic Endpoints
################################################################################

test_business_endpoints() {
    print_header "Core Business Logic Tests"

    # User profile endpoint
    print_test "Testing user profile endpoint..."
    if make_request "GET" "$API_URL/api/v1/users/profile" "401"; then
        print_pass "User profile endpoint responding (requires auth) (${RESPONSE_TIME}ms)"
    else
        print_fail "User profile endpoint failed (HTTP $HTTP_CODE)"
    fi

    # Matching service endpoint
    print_test "Testing matching service endpoint..."
    if make_request "GET" "$API_URL/api/v1/matches" "401"; then
        print_pass "Matching endpoint responding (requires auth) (${RESPONSE_TIME}ms)"
    else
        print_fail "Matching endpoint failed (HTTP $HTTP_CODE)"
    fi

    # Messaging endpoint
    print_test "Testing messaging endpoint..."
    if make_request "GET" "$API_URL/api/v1/messages" "401"; then
        print_pass "Messaging endpoint responding (requires auth) (${RESPONSE_TIME}ms)"
    else
        print_fail "Messaging endpoint failed (HTTP $HTTP_CODE)"
    fi

    # Notifications endpoint
    print_test "Testing notifications endpoint..."
    if make_request "GET" "$API_URL/api/v1/notifications" "401"; then
        print_pass "Notifications endpoint responding (requires auth) (${RESPONSE_TIME}ms)"
    else
        print_fail "Notifications endpoint failed (HTTP $HTTP_CODE)"
    fi
}

################################################################################
# Test: Security Headers
################################################################################

test_security_headers() {
    print_header "Security Headers Tests"

    print_test "Checking security headers..."
    make_request "GET" "$BASE_URL" "200" > /dev/null

    # Required security headers
    REQUIRED_HEADERS=(
        "X-Content-Type-Options:nosniff"
        "X-Frame-Options"
        "Strict-Transport-Security"
    )

    for header_pattern in "${REQUIRED_HEADERS[@]}"; do
        IFS=':' read -r header_name expected_value <<< "$header_pattern"

        if echo "$RESPONSE_HEADERS" | grep -qi "$header_name:"; then
            HEADER_VALUE=$(echo "$RESPONSE_HEADERS" | grep -i "$header_name:" | cut -d: -f2- | tr -d '\r\n' | xargs)

            if [ -n "$expected_value" ] && ! echo "$HEADER_VALUE" | grep -qi "$expected_value"; then
                print_warn "$header_name header present but value unexpected: $HEADER_VALUE"
            else
                print_pass "$header_name header present: $HEADER_VALUE"
            fi
        else
            print_fail "$header_name header missing"
        fi
    done
}

################################################################################
# Test: Error Handling
################################################################################

test_error_handling() {
    print_header "Error Handling Tests"

    # Test 404 handling
    print_test "Testing 404 error handling..."
    if make_request "GET" "$API_URL/api/v1/nonexistent" "404"; then
        print_pass "404 errors handled correctly (${RESPONSE_TIME}ms)"
    else
        print_fail "404 error handling failed (HTTP $HTTP_CODE)"
    fi

    # Test method not allowed
    print_test "Testing method not allowed handling..."
    if make_request "PUT" "$API_URL/health" "405"; then
        print_pass "405 Method Not Allowed handled correctly (${RESPONSE_TIME}ms)"
    else
        print_warn "405 handling may not be configured (HTTP $HTTP_CODE)"
    fi

    # Test malformed JSON
    print_test "Testing malformed JSON handling..."
    if make_request "POST" "$API_URL/api/v1/auth/login" "400" '{invalid json}'; then
        print_pass "Malformed JSON handled correctly (${RESPONSE_TIME}ms)"
    else
        print_fail "Malformed JSON handling failed (HTTP $HTTP_CODE)"
    fi
}

################################################################################
# Generate Report
################################################################################

generate_report() {
    print_header "Smoke Test Summary Report"

    echo -e "Environment: ${CYAN}$ENVIRONMENT${NC}"
    echo -e "Base URL: ${CYAN}$BASE_URL${NC}"
    echo -e "API URL: ${CYAN}$API_URL${NC}"
    echo -e ""
    echo -e "Test Results:"
    echo -e "  Total Tests: $TOTAL_TESTS"
    echo -e "  ${GREEN}Passed: $PASSED_TESTS${NC}"
    echo -e "  ${RED}Failed: $FAILED_TESTS${NC}"

    if [ $RESPONSE_COUNT -gt 0 ]; then
        AVG_RESPONSE_TIME=$((TOTAL_RESPONSE_TIME / RESPONSE_COUNT))
        echo -e ""
        echo -e "Performance Metrics:"
        echo -e "  Average Response Time: ${AVG_RESPONSE_TIME}ms"

        if [ $AVG_RESPONSE_TIME -lt $MAX_RESPONSE_TIME ]; then
            echo -e "  Performance: ${GREEN}GOOD${NC} (target: <${MAX_RESPONSE_TIME}ms)"
        else
            echo -e "  Performance: ${YELLOW}NEEDS IMPROVEMENT${NC} (target: <${MAX_RESPONSE_TIME}ms)"
        fi
    fi

    echo -e ""

    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}ALL SMOKE TESTS PASSED!${NC}"
        echo -e "${GREEN}========================================${NC}"
        return 0
    else
        echo -e "${RED}========================================${NC}"
        echo -e "${RED}SOME TESTS FAILED${NC}"
        echo -e "${RED}========================================${NC}"
        echo -e "${YELLOW}Please review failed tests above${NC}"
        return 1
    fi
}

################################################################################
# Main Execution
################################################################################

main() {
    parse_args "$@"

    print_header "Flamoral Platform Smoke Tests"
    print_info "Testing environment: $ENVIRONMENT"
    print_info "Started at: $(date)"

    # Check prerequisites
    if ! command -v curl &> /dev/null; then
        echo "Error: curl is required but not installed."
        exit 2
    fi

    if ! command -v jq &> /dev/null; then
        print_warn "jq not installed, some response parsing will be limited"
    fi

    # Run all test suites
    test_api_endpoints
    test_authentication
    test_websocket
    test_static_assets
    test_caching_headers
    test_response_times
    test_business_endpoints
    test_security_headers
    test_error_handling

    # Generate and display report
    if generate_report; then
        exit 0
    else
        exit 1
    fi
}

# Run main function with all arguments
main "$@"
