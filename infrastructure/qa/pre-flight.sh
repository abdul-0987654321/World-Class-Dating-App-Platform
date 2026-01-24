#!/bin/bash
#
# Flamoral Pre-Flight Validation Script
# Automated production readiness checks before deployment
#
# Usage: ./pre-flight.sh [OPTIONS]
#   --env=<environment>   Target environment (staging|production) [default: staging]
#   --api-url=<url>       Override API base URL
#   --web-url=<url>       Override Web app URL
#   --skip-ssl            Skip SSL certificate validation
#   --skip-db             Skip database connectivity checks
#   --verbose             Enable verbose output
#   --json                Output results in JSON format
#   --fail-fast           Exit on first failure
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed
#   2 - Script execution error
#

set -euo pipefail

# ==============================================================================
# Configuration
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="${SCRIPT_DIR}/logs/pre-flight-${TIMESTAMP}.log"

# Default configuration
ENVIRONMENT="${ENVIRONMENT:-staging}"
VERBOSE=false
JSON_OUTPUT=false
FAIL_FAST=false
SKIP_SSL=false
SKIP_DB=false

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNED_CHECKS=0
SKIPPED_CHECKS=0

# Results array for JSON output
declare -a RESULTS=()

# ==============================================================================
# Environment URLs
# ==============================================================================

declare -A ENV_URLS
ENV_URLS[staging_api]="https://api-staging.flamoral.com"
ENV_URLS[staging_web]="https://staging.flamoral.com"
ENV_URLS[production_api]="https://api.flamoral.com"
ENV_URLS[production_web]="https://www.flamoral.com"

# ==============================================================================
# Helper Functions
# ==============================================================================

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")

    if [[ "$VERBOSE" == "true" ]] || [[ "$level" != "DEBUG" ]]; then
        echo -e "${timestamp} [${level}] ${message}" >> "$LOG_FILE"
    fi
}

print_header() {
    echo ""
    echo -e "${CYAN}================================================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}================================================================${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${BLUE}--- $1 ---${NC}"
    echo ""
}

print_result() {
    local status="$1"
    local check_name="$2"
    local details="${3:-}"

    ((TOTAL_CHECKS++))

    case $status in
        PASS)
            echo -e "${GREEN}[PASS]${NC} $check_name"
            ((PASSED_CHECKS++))
            RESULTS+=("{\"check\": \"$check_name\", \"status\": \"pass\", \"details\": \"$details\"}")
            ;;
        FAIL)
            echo -e "${RED}[FAIL]${NC} $check_name"
            [[ -n "$details" ]] && echo -e "       ${RED}$details${NC}"
            ((FAILED_CHECKS++))
            RESULTS+=("{\"check\": \"$check_name\", \"status\": \"fail\", \"details\": \"$details\"}")
            if [[ "$FAIL_FAST" == "true" ]]; then
                print_summary
                exit 1
            fi
            ;;
        WARN)
            echo -e "${YELLOW}[WARN]${NC} $check_name"
            [[ -n "$details" ]] && echo -e "       ${YELLOW}$details${NC}"
            ((WARNED_CHECKS++))
            RESULTS+=("{\"check\": \"$check_name\", \"status\": \"warn\", \"details\": \"$details\"}")
            ;;
        SKIP)
            echo -e "${CYAN}[SKIP]${NC} $check_name"
            [[ -n "$details" ]] && echo -e "       ${CYAN}$details${NC}"
            ((SKIPPED_CHECKS++))
            RESULTS+=("{\"check\": \"$check_name\", \"status\": \"skip\", \"details\": \"$details\"}")
            ;;
    esac

    log "INFO" "[$status] $check_name - $details"
}

check_command() {
    command -v "$1" &> /dev/null
}

http_status() {
    local url="$1"
    local timeout="${2:-10}"
    curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$timeout" --max-time "$((timeout * 2))" "$url" 2>/dev/null || echo "000"
}

http_get() {
    local url="$1"
    local timeout="${2:-10}"
    curl -s --connect-timeout "$timeout" --max-time "$((timeout * 2))" "$url" 2>/dev/null
}

# ==============================================================================
# Parse Arguments
# ==============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --env=*)
                ENVIRONMENT="${1#*=}"
                ;;
            --api-url=*)
                API_URL="${1#*=}"
                ;;
            --web-url=*)
                WEB_URL="${1#*=}"
                ;;
            --verbose)
                VERBOSE=true
                ;;
            --json)
                JSON_OUTPUT=true
                ;;
            --fail-fast)
                FAIL_FAST=true
                ;;
            --skip-ssl)
                SKIP_SSL=true
                ;;
            --skip-db)
                SKIP_DB=true
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit 2
                ;;
        esac
        shift
    done

    # Set URLs based on environment if not overridden
    API_URL="${API_URL:-${ENV_URLS[${ENVIRONMENT}_api]}}"
    WEB_URL="${WEB_URL:-${ENV_URLS[${ENVIRONMENT}_web]}}"
}

show_help() {
    head -n 20 "$0" | tail -n 18 | sed 's/^#//'
}

# ==============================================================================
# Pre-Flight Checks
# ==============================================================================

check_prerequisites() {
    print_section "Prerequisites"

    # Check required commands
    local required_commands=("curl" "jq" "openssl")
    for cmd in "${required_commands[@]}"; do
        if check_command "$cmd"; then
            print_result "PASS" "Command available: $cmd"
        else
            print_result "FAIL" "Command not found: $cmd" "Please install $cmd"
        fi
    done

    # Check optional commands
    local optional_commands=("psql" "redis-cli" "kubectl")
    for cmd in "${optional_commands[@]}"; do
        if check_command "$cmd"; then
            print_result "PASS" "Optional command available: $cmd"
        else
            print_result "WARN" "Optional command not found: $cmd" "Some checks may be skipped"
        fi
    done
}

check_health_endpoints() {
    print_section "Health Endpoints"

    # API Gateway health
    local api_health_status=$(http_status "${API_URL}/health")
    if [[ "$api_health_status" == "200" ]]; then
        print_result "PASS" "API Gateway health" "HTTP $api_health_status"
    else
        print_result "FAIL" "API Gateway health" "HTTP $api_health_status (expected 200)"
    fi

    # API readiness
    local api_ready_status=$(http_status "${API_URL}/ready")
    if [[ "$api_ready_status" == "200" ]]; then
        print_result "PASS" "API Gateway readiness" "HTTP $api_ready_status"
    else
        print_result "WARN" "API Gateway readiness" "HTTP $api_ready_status"
    fi

    # Service-specific health endpoints
    local services=("auth" "user" "matching" "messaging" "payment" "notification" "media")
    for service in "${services[@]}"; do
        local service_health_status=$(http_status "${API_URL}/api/v1/${service}/health")
        if [[ "$service_health_status" == "200" ]]; then
            print_result "PASS" "${service^} Service health" "HTTP $service_health_status"
        elif [[ "$service_health_status" == "404" ]]; then
            # Try alternative health endpoint
            service_health_status=$(http_status "${API_URL}/health/${service}")
            if [[ "$service_health_status" == "200" ]]; then
                print_result "PASS" "${service^} Service health" "HTTP $service_health_status"
            else
                print_result "WARN" "${service^} Service health" "Endpoint not found"
            fi
        else
            print_result "FAIL" "${service^} Service health" "HTTP $service_health_status"
        fi
    done

    # Web app health
    local web_status=$(http_status "${WEB_URL}")
    if [[ "$web_status" == "200" ]]; then
        print_result "PASS" "Web application" "HTTP $web_status"
    else
        print_result "FAIL" "Web application" "HTTP $web_status (expected 200)"
    fi
}

check_database_connectivity() {
    print_section "Database Connectivity"

    if [[ "$SKIP_DB" == "true" ]]; then
        print_result "SKIP" "Database checks" "Skipped via --skip-db flag"
        return
    fi

    # Check via health endpoint with db details
    local db_health=$(http_get "${API_URL}/health/db" 2>/dev/null)
    if [[ -n "$db_health" ]]; then
        local db_status=$(echo "$db_health" | jq -r '.status // "unknown"' 2>/dev/null)
        if [[ "$db_status" == "healthy" ]] || [[ "$db_status" == "ok" ]]; then
            print_result "PASS" "Database connectivity (via health endpoint)" "$db_status"
        else
            print_result "FAIL" "Database connectivity (via health endpoint)" "Status: $db_status"
        fi

        # Check replica lag if available
        local replica_lag=$(echo "$db_health" | jq -r '.replicaLag // "N/A"' 2>/dev/null)
        if [[ "$replica_lag" != "N/A" ]] && [[ "$replica_lag" != "null" ]]; then
            if (( $(echo "$replica_lag < 1" | bc -l 2>/dev/null || echo "0") )); then
                print_result "PASS" "Database replica lag" "${replica_lag}s"
            else
                print_result "WARN" "Database replica lag" "${replica_lag}s (> 1s threshold)"
            fi
        fi
    else
        print_result "WARN" "Database health endpoint not available" "Cannot verify database status"
    fi

    # Check Redis connectivity
    local redis_health=$(http_get "${API_URL}/health/redis" 2>/dev/null)
    if [[ -n "$redis_health" ]]; then
        local redis_status=$(echo "$redis_health" | jq -r '.status // "unknown"' 2>/dev/null)
        if [[ "$redis_status" == "healthy" ]] || [[ "$redis_status" == "ok" ]]; then
            print_result "PASS" "Redis connectivity" "$redis_status"
        else
            print_result "FAIL" "Redis connectivity" "Status: $redis_status"
        fi
    else
        print_result "WARN" "Redis health endpoint not available" "Cannot verify Redis status"
    fi
}

check_critical_api_endpoints() {
    print_section "Critical API Endpoints"

    # Auth endpoints (unauthenticated checks)
    local login_status=$(http_status "${API_URL}/api/v1/auth/login" 2>/dev/null)
    # Expect 400 or 401 for unauthenticated request (not 5xx)
    if [[ "$login_status" =~ ^(400|401|405)$ ]]; then
        print_result "PASS" "Auth login endpoint" "HTTP $login_status (expected error response)"
    elif [[ "$login_status" == "000" ]]; then
        print_result "FAIL" "Auth login endpoint" "Connection failed"
    else
        print_result "WARN" "Auth login endpoint" "HTTP $login_status (unexpected status)"
    fi

    local register_status=$(http_status "${API_URL}/api/v1/auth/register" 2>/dev/null)
    if [[ "$register_status" =~ ^(400|401|405)$ ]]; then
        print_result "PASS" "Auth register endpoint" "HTTP $register_status (expected error response)"
    elif [[ "$register_status" == "000" ]]; then
        print_result "FAIL" "Auth register endpoint" "Connection failed"
    else
        print_result "WARN" "Auth register endpoint" "HTTP $register_status"
    fi

    # Protected endpoints (should return 401)
    local protected_endpoints=("users/me" "discovery" "matches" "conversations")
    for endpoint in "${protected_endpoints[@]}"; do
        local status=$(http_status "${API_URL}/api/v1/${endpoint}" 2>/dev/null)
        if [[ "$status" == "401" ]]; then
            print_result "PASS" "Protected endpoint: ${endpoint}" "HTTP $status (auth required)"
        elif [[ "$status" == "000" ]]; then
            print_result "FAIL" "Protected endpoint: ${endpoint}" "Connection failed"
        elif [[ "$status" =~ ^5 ]]; then
            print_result "FAIL" "Protected endpoint: ${endpoint}" "HTTP $status (server error)"
        else
            print_result "WARN" "Protected endpoint: ${endpoint}" "HTTP $status (expected 401)"
        fi
    done

    # Public endpoints
    local plans_status=$(http_status "${API_URL}/api/v1/subscriptions/plans" 2>/dev/null)
    if [[ "$plans_status" == "200" ]]; then
        print_result "PASS" "Public endpoint: subscription plans" "HTTP $plans_status"
    else
        print_result "WARN" "Public endpoint: subscription plans" "HTTP $plans_status"
    fi
}

check_ssl_certificates() {
    print_section "SSL Certificates"

    if [[ "$SKIP_SSL" == "true" ]]; then
        print_result "SKIP" "SSL certificate checks" "Skipped via --skip-ssl flag"
        return
    fi

    local domains=("${API_URL#https://}" "${WEB_URL#https://}")

    for domain in "${domains[@]}"; do
        # Remove port if present
        domain="${domain%%:*}"
        # Remove path if present
        domain="${domain%%/*}"

        if [[ -z "$domain" ]]; then
            continue
        fi

        # Get certificate expiration
        local cert_info=$(echo | openssl s_client -servername "$domain" -connect "${domain}:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)

        if [[ -n "$cert_info" ]]; then
            local expiry_date=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
            local expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry_date" +%s 2>/dev/null)
            local now_epoch=$(date +%s)
            local days_remaining=$(( (expiry_epoch - now_epoch) / 86400 ))

            if [[ $days_remaining -gt 30 ]]; then
                print_result "PASS" "SSL certificate: $domain" "Expires in $days_remaining days"
            elif [[ $days_remaining -gt 7 ]]; then
                print_result "WARN" "SSL certificate: $domain" "Expires in $days_remaining days (< 30 days)"
            else
                print_result "FAIL" "SSL certificate: $domain" "Expires in $days_remaining days (CRITICAL)"
            fi

            # Check TLS version
            local tls_check=$(echo | openssl s_client -tls1_2 -connect "${domain}:443" 2>&1)
            if echo "$tls_check" | grep -q "CONNECTED"; then
                print_result "PASS" "TLS 1.2 supported: $domain"
            else
                print_result "WARN" "TLS 1.2 check: $domain" "Could not verify"
            fi
        else
            print_result "FAIL" "SSL certificate: $domain" "Could not retrieve certificate"
        fi
    done
}

check_environment_variables() {
    print_section "Environment Variables"

    # Check critical env vars via config endpoint (if available)
    local config_check=$(http_get "${API_URL}/health/config" 2>/dev/null)

    if [[ -n "$config_check" ]]; then
        # Check for required variables
        local required_vars=("JWT_SECRET" "DATABASE_URL" "REDIS_URL" "STRIPE_SECRET_KEY")
        for var in "${required_vars[@]}"; do
            local is_set=$(echo "$config_check" | jq -r ".envVars.${var} // \"not_found\"" 2>/dev/null)
            if [[ "$is_set" == "set" ]] || [[ "$is_set" == "configured" ]]; then
                print_result "PASS" "Environment variable: $var" "Configured"
            elif [[ "$is_set" == "not_found" ]]; then
                print_result "WARN" "Environment variable: $var" "Could not verify"
            else
                print_result "FAIL" "Environment variable: $var" "Not configured"
            fi
        done
    else
        print_result "WARN" "Config endpoint not available" "Cannot verify environment variables remotely"
        echo "       Ensure these are set: JWT_SECRET, DATABASE_URL, REDIS_URL, STRIPE_SECRET_KEY"
    fi
}

check_secrets_not_exposed() {
    print_section "Secrets Exposure Check"

    # Check that health endpoints don't leak secrets
    local health_response=$(http_get "${API_URL}/health" 2>/dev/null)

    local secret_patterns=("password" "secret" "api_key" "apikey" "token" "credential" "private_key")
    local secrets_found=false

    for pattern in "${secret_patterns[@]}"; do
        if echo "$health_response" | grep -iq "$pattern"; then
            # Further check if it contains actual values (not just labels)
            if echo "$health_response" | grep -iE "\"${pattern}\":\s*\"[^\"]+\"" > /dev/null 2>&1; then
                print_result "FAIL" "Potential secret exposed in /health" "Pattern: $pattern"
                secrets_found=true
            fi
        fi
    done

    if [[ "$secrets_found" == "false" ]]; then
        print_result "PASS" "No secrets exposed in health endpoints"
    fi

    # Check error responses don't leak stack traces in production
    local error_response=$(curl -s "${API_URL}/api/v1/nonexistent-endpoint-12345" 2>/dev/null)
    if echo "$error_response" | grep -q "at .*\.js:" || echo "$error_response" | grep -q "Error:"; then
        if [[ "$ENVIRONMENT" == "production" ]]; then
            print_result "FAIL" "Stack traces exposed in error responses" "Production should hide stack traces"
        else
            print_result "WARN" "Stack traces in error responses" "Acceptable in $ENVIRONMENT"
        fi
    else
        print_result "PASS" "Error responses do not expose stack traces"
    fi
}

check_security_headers() {
    print_section "Security Headers"

    local headers=$(curl -sI "${WEB_URL}" 2>/dev/null)

    # Check required security headers
    declare -A required_headers
    required_headers["X-Frame-Options"]="DENY|SAMEORIGIN"
    required_headers["X-Content-Type-Options"]="nosniff"
    required_headers["X-XSS-Protection"]="1"
    required_headers["Strict-Transport-Security"]="max-age"

    for header in "${!required_headers[@]}"; do
        local expected="${required_headers[$header]}"
        if echo "$headers" | grep -iq "^${header}:"; then
            local value=$(echo "$headers" | grep -i "^${header}:" | cut -d: -f2- | tr -d ' \r')
            if echo "$value" | grep -iqE "$expected"; then
                print_result "PASS" "Security header: $header" "$value"
            else
                print_result "WARN" "Security header: $header" "Value: $value (expected pattern: $expected)"
            fi
        else
            print_result "FAIL" "Security header: $header" "Not present"
        fi
    done

    # Check optional headers
    if echo "$headers" | grep -iq "^Content-Security-Policy:"; then
        print_result "PASS" "Security header: Content-Security-Policy" "Present"
    else
        print_result "WARN" "Security header: Content-Security-Policy" "Not present (recommended)"
    fi

    if echo "$headers" | grep -iq "^Referrer-Policy:"; then
        print_result "PASS" "Security header: Referrer-Policy" "Present"
    else
        print_result "WARN" "Security header: Referrer-Policy" "Not present (recommended)"
    fi
}

check_cors_configuration() {
    print_section "CORS Configuration"

    # Test CORS with a valid origin
    local cors_response=$(curl -sI -H "Origin: https://www.flamoral.com" "${API_URL}/health" 2>/dev/null)

    if echo "$cors_response" | grep -iq "Access-Control-Allow-Origin"; then
        local allowed_origin=$(echo "$cors_response" | grep -i "Access-Control-Allow-Origin" | cut -d: -f2- | tr -d ' \r')
        if [[ "$allowed_origin" == "*" ]]; then
            if [[ "$ENVIRONMENT" == "production" ]]; then
                print_result "FAIL" "CORS: Wildcard origin in production" "Should restrict to specific domains"
            else
                print_result "WARN" "CORS: Wildcard origin" "Acceptable in $ENVIRONMENT"
            fi
        else
            print_result "PASS" "CORS: Specific origin allowed" "$allowed_origin"
        fi
    else
        print_result "WARN" "CORS: No Access-Control-Allow-Origin header"
    fi

    # Test CORS with an invalid origin
    local invalid_cors=$(curl -sI -H "Origin: https://malicious-site.com" "${API_URL}/health" 2>/dev/null)
    if echo "$invalid_cors" | grep -iq "Access-Control-Allow-Origin: https://malicious-site.com"; then
        print_result "FAIL" "CORS: Accepts arbitrary origins" "Security vulnerability"
    else
        print_result "PASS" "CORS: Rejects unknown origins"
    fi
}

check_rate_limiting() {
    print_section "Rate Limiting"

    # Make multiple rapid requests and check for rate limit headers
    local has_rate_limit_headers=false

    for i in {1..5}; do
        local response=$(curl -sI "${API_URL}/health" 2>/dev/null)
        if echo "$response" | grep -iq "X-RateLimit\|RateLimit"; then
            has_rate_limit_headers=true
            break
        fi
    done

    if [[ "$has_rate_limit_headers" == "true" ]]; then
        print_result "PASS" "Rate limiting headers present"
    else
        print_result "WARN" "Rate limiting headers not detected" "Ensure rate limiting is configured"
    fi
}

check_websocket_connectivity() {
    print_section "WebSocket Connectivity"

    # Basic WebSocket endpoint check
    if check_command "wscat"; then
        local ws_url="${API_URL/https/wss}/ws"
        # Note: This is a basic check - full WS testing requires authentication
        print_result "WARN" "WebSocket check" "Requires manual verification at $ws_url"
    else
        print_result "SKIP" "WebSocket check" "wscat not installed"
    fi
}

# ==============================================================================
# Summary and Output
# ==============================================================================

print_summary() {
    print_header "Pre-Flight Check Summary"

    echo -e "Environment: ${CYAN}${ENVIRONMENT}${NC}"
    echo -e "API URL:     ${CYAN}${API_URL}${NC}"
    echo -e "Web URL:     ${CYAN}${WEB_URL}${NC}"
    echo ""
    echo -e "Total Checks:   ${TOTAL_CHECKS}"
    echo -e "Passed:         ${GREEN}${PASSED_CHECKS}${NC}"
    echo -e "Failed:         ${RED}${FAILED_CHECKS}${NC}"
    echo -e "Warnings:       ${YELLOW}${WARNED_CHECKS}${NC}"
    echo -e "Skipped:        ${CYAN}${SKIPPED_CHECKS}${NC}"
    echo ""

    if [[ $FAILED_CHECKS -eq 0 ]]; then
        echo -e "${GREEN}============================================${NC}"
        echo -e "${GREEN}  PRE-FLIGHT CHECK: PASSED                  ${NC}"
        echo -e "${GREEN}============================================${NC}"
        if [[ $WARNED_CHECKS -gt 0 ]]; then
            echo -e "${YELLOW}  Note: $WARNED_CHECKS warning(s) should be reviewed${NC}"
        fi
    else
        echo -e "${RED}============================================${NC}"
        echo -e "${RED}  PRE-FLIGHT CHECK: FAILED                  ${NC}"
        echo -e "${RED}  $FAILED_CHECKS critical issue(s) found     ${NC}"
        echo -e "${RED}============================================${NC}"
        echo ""
        echo -e "${RED}DO NOT PROCEED WITH DEPLOYMENT${NC}"
        echo "Review failed checks and resolve before retrying."
    fi

    echo ""
    echo "Full log available at: $LOG_FILE"
}

output_json() {
    local status="passed"
    if [[ $FAILED_CHECKS -gt 0 ]]; then
        status="failed"
    elif [[ $WARNED_CHECKS -gt 0 ]]; then
        status="passed_with_warnings"
    fi

    echo "{"
    echo "  \"timestamp\": \"$(date -Iseconds)\","
    echo "  \"environment\": \"${ENVIRONMENT}\","
    echo "  \"apiUrl\": \"${API_URL}\","
    echo "  \"webUrl\": \"${WEB_URL}\","
    echo "  \"status\": \"${status}\","
    echo "  \"summary\": {"
    echo "    \"total\": ${TOTAL_CHECKS},"
    echo "    \"passed\": ${PASSED_CHECKS},"
    echo "    \"failed\": ${FAILED_CHECKS},"
    echo "    \"warnings\": ${WARNED_CHECKS},"
    echo "    \"skipped\": ${SKIPPED_CHECKS}"
    echo "  },"
    echo "  \"checks\": ["

    local first=true
    for result in "${RESULTS[@]}"; do
        if [[ "$first" == "true" ]]; then
            first=false
        else
            echo ","
        fi
        echo -n "    $result"
    done

    echo ""
    echo "  ]"
    echo "}"
}

# ==============================================================================
# Main Execution
# ==============================================================================

main() {
    parse_args "$@"

    # Create logs directory
    mkdir -p "${SCRIPT_DIR}/logs"

    # Start logging
    echo "Pre-flight validation started at $(date)" > "$LOG_FILE"
    echo "Environment: ${ENVIRONMENT}" >> "$LOG_FILE"
    echo "API URL: ${API_URL}" >> "$LOG_FILE"
    echo "Web URL: ${WEB_URL}" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"

    if [[ "$JSON_OUTPUT" == "false" ]]; then
        print_header "Flamoral Pre-Flight Validation"
        echo "Environment: ${ENVIRONMENT}"
        echo "API URL: ${API_URL}"
        echo "Web URL: ${WEB_URL}"
        echo "Timestamp: $(date)"
    fi

    # Run all checks
    check_prerequisites
    check_health_endpoints
    check_database_connectivity
    check_critical_api_endpoints
    check_ssl_certificates
    check_environment_variables
    check_secrets_not_exposed
    check_security_headers
    check_cors_configuration
    check_rate_limiting
    check_websocket_connectivity

    # Output results
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        output_json
    else
        print_summary
    fi

    # Exit with appropriate code
    if [[ $FAILED_CHECKS -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function
main "$@"
