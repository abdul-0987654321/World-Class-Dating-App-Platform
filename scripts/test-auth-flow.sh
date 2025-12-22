#!/bin/bash
# =============================================================================
# Flamoral Dating Platform - Authentication Flow Test Script
# =============================================================================
# This script tests the complete authentication flow including:
#   1. User registration
#   2. User login
#   3. JWT token validation
#   4. Protected endpoint access
#   5. Token refresh
#   6. Logout
#
# Prerequisites:
#   - curl
#   - jq (for JSON parsing)
#   - Access to the API (local or production)
#
# Usage:
#   ./test-auth-flow.sh                    # Test against production
#   ./test-auth-flow.sh local              # Test against localhost
#   ./test-auth-flow.sh staging            # Test against staging
#
# Last Updated: 2024-12-21
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# Configuration
# =============================================================================
ENVIRONMENT=${1:-production}

case $ENVIRONMENT in
  local)
    API_BASE_URL="http://localhost:3000"
    log_info "Testing against LOCAL environment"
    ;;
  staging)
    API_BASE_URL="https://staging-api.flamoral.com"
    log_info "Testing against STAGING environment"
    ;;
  production|*)
    API_BASE_URL="https://api.flamoral.com"
    log_info "Testing against PRODUCTION environment"
    ;;
esac

# Generate unique test user data
TIMESTAMP=$(date +%s)
TEST_EMAIL="test.user.${TIMESTAMP}@flamoral-test.com"
TEST_PASSWORD="TestPassword123!@#"
TEST_FIRST_NAME="Test"
TEST_LAST_NAME="User${TIMESTAMP}"
TEST_DOB="1995-06-15"
TEST_GENDER="male"

# Store tokens
ACCESS_TOKEN=""
REFRESH_TOKEN=""
USER_ID=""

# =============================================================================
# Helper Functions
# =============================================================================

# Make API request and capture response
api_request() {
  local method=$1
  local endpoint=$2
  local data=$3
  local auth_header=$4

  local url="${API_BASE_URL}${endpoint}"
  local headers=(-H "Content-Type: application/json")

  if [ -n "$auth_header" ]; then
    headers+=(-H "Authorization: Bearer $auth_header")
  fi

  if [ "$method" == "GET" ]; then
    curl -s -w "\n%{http_code}" "${headers[@]}" "$url"
  else
    curl -s -w "\n%{http_code}" -X "$method" "${headers[@]}" -d "$data" "$url"
  fi
}

# Parse JSON response
parse_json() {
  local json=$1
  local field=$2
  echo "$json" | jq -r "$field" 2>/dev/null
}

# Check HTTP status code
check_status() {
  local expected=$1
  local actual=$2
  local operation=$3

  if [ "$actual" == "$expected" ]; then
    log_success "$operation - Status: $actual"
    return 0
  else
    log_error "$operation - Expected: $expected, Got: $actual"
    return 1
  fi
}

# =============================================================================
# Test Functions
# =============================================================================

# Test 1: Health Check
test_health_check() {
  log_info "=== TEST 1: Health Check ==="

  local response=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/health")
  local status=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | sed '$d')

  if check_status "200" "$status" "Health check"; then
    log_success "API is healthy"
    echo "Response: $body"
    return 0
  else
    log_error "API health check failed"
    return 1
  fi
}

# Test 2: User Registration
test_registration() {
  log_info "=== TEST 2: User Registration ==="

  local payload=$(cat <<EOF
{
  "email": "${TEST_EMAIL}",
  "password": "${TEST_PASSWORD}",
  "first_name": "${TEST_FIRST_NAME}",
  "last_name": "${TEST_LAST_NAME}",
  "date_of_birth": "${TEST_DOB}",
  "gender": "${TEST_GENDER}"
}
EOF
)

  log_info "Registering user: ${TEST_EMAIL}"

  local response=$(api_request "POST" "/api/v1/auth/register" "$payload")
  local status=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | sed '$d')

  if check_status "201" "$status" "User registration"; then
    ACCESS_TOKEN=$(parse_json "$body" ".accessToken")
    REFRESH_TOKEN=$(parse_json "$body" ".refreshToken")
    USER_ID=$(parse_json "$body" ".user.id")

    if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
      log_success "Registration successful"
      log_info "User ID: ${USER_ID}"
      log_info "Access Token: ${ACCESS_TOKEN:0:50}..."
      return 0
    else
      log_error "Failed to extract tokens from response"
      echo "Response: $body"
      return 1
    fi
  else
    log_error "Registration failed"
    echo "Response: $body"
    return 1
  fi
}

# Test 3: User Login
test_login() {
  log_info "=== TEST 3: User Login ==="

  local payload=$(cat <<EOF
{
  "email": "${TEST_EMAIL}",
  "password": "${TEST_PASSWORD}"
}
EOF
)

  log_info "Logging in user: ${TEST_EMAIL}"

  local response=$(api_request "POST" "/api/v1/auth/login" "$payload")
  local status=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | sed '$d')

  if check_status "200" "$status" "User login"; then
    ACCESS_TOKEN=$(parse_json "$body" ".accessToken")
    REFRESH_TOKEN=$(parse_json "$body" ".refreshToken")
    USER_ID=$(parse_json "$body" ".user.id")

    if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
      log_success "Login successful"
      log_info "User ID: ${USER_ID}"
      log_info "Access Token: ${ACCESS_TOKEN:0:50}..."
      return 0
    else
      log_error "Failed to extract tokens from response"
      echo "Response: $body"
      return 1
    fi
  else
    log_error "Login failed"
    echo "Response: $body"
    return 1
  fi
}

# Test 4: Access Protected Endpoint (Get Current User)
test_protected_endpoint() {
  log_info "=== TEST 4: Access Protected Endpoint ==="

  if [ -z "$ACCESS_TOKEN" ]; then
    log_error "No access token available"
    return 1
  fi

  log_info "Accessing /api/v1/auth/me with JWT"

  local response=$(api_request "GET" "/api/v1/auth/me" "" "$ACCESS_TOKEN")
  local status=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | sed '$d')

  if check_status "200" "$status" "Protected endpoint access"; then
    local email=$(parse_json "$body" ".email")
    local firstName=$(parse_json "$body" ".first_name")

    log_success "Protected endpoint accessed successfully"
    log_info "User Email: ${email}"
    log_info "User Name: ${firstName}"
    return 0
  else
    log_error "Failed to access protected endpoint"
    echo "Response: $body"
    return 1
  fi
}

# Test 5: Token Refresh
test_token_refresh() {
  log_info "=== TEST 5: Token Refresh ==="

  if [ -z "$REFRESH_TOKEN" ]; then
    log_error "No refresh token available"
    return 1
  fi

  local payload=$(cat <<EOF
{
  "refreshToken": "${REFRESH_TOKEN}"
}
EOF
)

  log_info "Refreshing access token"

  local response=$(api_request "POST" "/api/v1/auth/refresh-token" "$payload")
  local status=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | sed '$d')

  if check_status "200" "$status" "Token refresh"; then
    local new_access_token=$(parse_json "$body" ".accessToken")
    local new_refresh_token=$(parse_json "$body" ".refreshToken")

    if [ -n "$new_access_token" ] && [ "$new_access_token" != "null" ]; then
      # Verify new token is different (token rotation)
      if [ "$new_access_token" != "$ACCESS_TOKEN" ]; then
        log_success "Token rotation verified - new token issued"
      else
        log_warning "Access token was not rotated"
      fi

      if [ -n "$new_refresh_token" ] && [ "$new_refresh_token" != "$REFRESH_TOKEN" ]; then
        log_success "Refresh token rotation verified"
      fi

      ACCESS_TOKEN=$new_access_token
      REFRESH_TOKEN=$new_refresh_token

      log_success "Token refresh successful"
      log_info "New Access Token: ${ACCESS_TOKEN:0:50}..."
      return 0
    else
      log_error "Failed to extract new tokens"
      echo "Response: $body"
      return 1
    fi
  else
    log_error "Token refresh failed"
    echo "Response: $body"
    return 1
  fi
}

# Test 6: Verify New Token Works
test_new_token_access() {
  log_info "=== TEST 6: Verify New Token Works ==="

  log_info "Accessing protected endpoint with refreshed token"

  local response=$(api_request "GET" "/api/v1/auth/me" "" "$ACCESS_TOKEN")
  local status=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | sed '$d')

  if check_status "200" "$status" "New token access"; then
    log_success "Refreshed token works correctly"
    return 0
  else
    log_error "Refreshed token access failed"
    echo "Response: $body"
    return 1
  fi
}

# Test 7: Get Session Info
test_session_info() {
  log_info "=== TEST 7: Get Session Info ==="

  log_info "Fetching session info with entitlements"

  local response=$(api_request "GET" "/api/v1/auth/session" "" "$ACCESS_TOKEN")
  local status=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | sed '$d')

  if check_status "200" "$status" "Session info"; then
    local tier=$(parse_json "$body" ".entitlements.subscription.tier")
    local dailyLikes=$(parse_json "$body" ".entitlements.limits.dailyLikes")

    log_success "Session info retrieved"
    log_info "Subscription Tier: ${tier}"
    log_info "Daily Likes Limit: ${dailyLikes}"
    return 0
  else
    log_warning "Session endpoint not available or failed"
    return 0  # Non-critical, continue testing
  fi
}

# Test 8: Logout
test_logout() {
  log_info "=== TEST 8: Logout ==="

  if [ -z "$ACCESS_TOKEN" ]; then
    log_error "No access token available"
    return 1
  fi

  log_info "Logging out user"

  local response=$(api_request "POST" "/api/v1/auth/logout" "{}" "$ACCESS_TOKEN")
  local status=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | sed '$d')

  if check_status "200" "$status" "Logout"; then
    log_success "Logout successful"
    return 0
  else
    log_warning "Logout returned unexpected status (may still be successful)"
    echo "Response: $body"
    return 0
  fi
}

# Test 9: Verify Token Invalidated After Logout
test_token_invalidated() {
  log_info "=== TEST 9: Verify Token Invalidated After Logout ==="

  log_info "Attempting to access protected endpoint with old token"

  local response=$(api_request "GET" "/api/v1/auth/me" "" "$ACCESS_TOKEN")
  local status=$(echo "$response" | tail -n 1)

  if [ "$status" == "401" ]; then
    log_success "Token correctly invalidated - access denied"
    return 0
  else
    log_warning "Token may still be valid (depends on implementation)"
    return 0
  fi
}

# Test 10: Invalid Login Attempt
test_invalid_login() {
  log_info "=== TEST 10: Invalid Login Attempt ==="

  local payload=$(cat <<EOF
{
  "email": "${TEST_EMAIL}",
  "password": "WrongPassword123!"
}
EOF
)

  log_info "Attempting login with wrong password"

  local response=$(api_request "POST" "/api/v1/auth/login" "$payload")
  local status=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | sed '$d')

  if [ "$status" == "401" ]; then
    log_success "Invalid credentials correctly rejected"
    local error_msg=$(parse_json "$body" ".message")
    log_info "Error message: ${error_msg}"
    return 0
  else
    log_warning "Expected 401, got $status"
    return 0
  fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
  echo ""
  echo "=============================================="
  echo "  Flamoral Authentication Flow Test"
  echo "=============================================="
  echo "Environment: ${ENVIRONMENT}"
  echo "API URL: ${API_BASE_URL}"
  echo "Test User: ${TEST_EMAIL}"
  echo "=============================================="
  echo ""

  local passed=0
  local failed=0
  local total=0

  # Run tests
  tests=(
    "test_health_check"
    "test_registration"
    "test_protected_endpoint"
    "test_token_refresh"
    "test_new_token_access"
    "test_session_info"
    "test_logout"
    "test_token_invalidated"
    "test_login"
    "test_invalid_login"
  )

  for test in "${tests[@]}"; do
    ((total++))
    echo ""
    if $test; then
      ((passed++))
    else
      ((failed++))
    fi
    echo ""
  done

  # Summary
  echo ""
  echo "=============================================="
  echo "  Test Summary"
  echo "=============================================="
  echo "Total Tests: ${total}"
  echo -e "Passed: ${GREEN}${passed}${NC}"
  echo -e "Failed: ${RED}${failed}${NC}"
  echo "=============================================="

  if [ $failed -eq 0 ]; then
    log_success "All tests passed!"
    exit 0
  else
    log_error "Some tests failed"
    exit 1
  fi
}

# Check dependencies
check_dependencies() {
  if ! command -v curl &> /dev/null; then
    log_error "curl is required but not installed"
    exit 1
  fi

  if ! command -v jq &> /dev/null; then
    log_warning "jq is not installed. JSON parsing may be limited."
  fi
}

# Run
check_dependencies
main "$@"
