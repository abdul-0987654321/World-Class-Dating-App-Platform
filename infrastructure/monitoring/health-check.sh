#!/bin/bash
# =============================================================================
# Flamoral Health Check Script
# Checks all service endpoints and outputs a status report
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
TIMEOUT=10
ENVIRONMENT="${1:-production}"

# Endpoints based on environment
if [ "$ENVIRONMENT" == "production" ]; then
    FRONTEND_URL="https://flamoral.com"
    API_URL="https://api.flamoral.com"
    RAILWAY_URL="https://world-class-dating-app-platform-production.up.railway.app"
elif [ "$ENVIRONMENT" == "staging" ]; then
    FRONTEND_URL="https://staging.flamoral.com"
    API_URL="https://world-class-dating-app-platform-staging.up.railway.app"
    RAILWAY_URL="https://world-class-dating-app-platform-staging.up.railway.app"
else
    FRONTEND_URL="http://localhost:5173"
    API_URL="http://localhost:4000"
    RAILWAY_URL="http://localhost:4000"
fi

# Results storage
declare -A RESULTS
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_CHECKS++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_CHECKS++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

check_http() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"

    ((TOTAL_CHECKS++))

    local start_time=$(date +%s%N)
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" 2>/dev/null || echo "000")
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))

    if [ "$response" == "$expected_status" ]; then
        log_success "$name: HTTP $response (${duration}ms)"
        RESULTS["$name"]="PASS"
    else
        log_fail "$name: HTTP $response (expected $expected_status)"
        RESULTS["$name"]="FAIL"
    fi
}

check_ssl() {
    local name="$1"
    local host="$2"

    ((TOTAL_CHECKS++))

    local expiry=$(echo | openssl s_client -servername "$host" -connect "$host:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

    if [ -n "$expiry" ]; then
        local expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$expiry" +%s 2>/dev/null)
        local now_epoch=$(date +%s)
        local days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

        if [ "$days_left" -gt 30 ]; then
            log_success "$name SSL: Valid for $days_left days"
            RESULTS["${name}_ssl"]="PASS"
        elif [ "$days_left" -gt 7 ]; then
            log_warn "$name SSL: Expires in $days_left days"
            RESULTS["${name}_ssl"]="WARN"
            ((PASSED_CHECKS++))
        else
            log_fail "$name SSL: Expires in $days_left days!"
            RESULTS["${name}_ssl"]="FAIL"
        fi
    else
        log_fail "$name SSL: Could not retrieve certificate"
        RESULTS["${name}_ssl"]="FAIL"
    fi
}

check_dns() {
    local name="$1"
    local domain="$2"

    ((TOTAL_CHECKS++))

    local result=$(dig +short "$domain" 2>/dev/null | head -1)

    if [ -n "$result" ]; then
        log_success "$name DNS: $domain -> $result"
        RESULTS["${name}_dns"]="PASS"
    else
        log_fail "$name DNS: $domain not resolving"
        RESULTS["${name}_dns"]="FAIL"
    fi
}

# =============================================================================
# Main Health Checks
# =============================================================================

echo ""
echo "=============================================="
echo "  Flamoral Health Check - $ENVIRONMENT"
echo "  $(date)"
echo "=============================================="
echo ""

# Frontend checks
log_info "Checking Frontend..."
check_http "Frontend Home" "$FRONTEND_URL"
check_http "Frontend Health" "$FRONTEND_URL/health" "200"

# API checks
log_info "Checking API..."
check_http "API Health" "$API_URL/health"
check_http "API Version" "$API_URL/api/v1/version" "200"

# Railway direct checks
log_info "Checking Railway Direct..."
check_http "Railway Health" "$RAILWAY_URL/health"

# SSL checks (production only)
if [ "$ENVIRONMENT" == "production" ]; then
    log_info "Checking SSL Certificates..."
    check_ssl "Frontend" "flamoral.com"
    check_ssl "API" "api.flamoral.com"
fi

# DNS checks (production only)
if [ "$ENVIRONMENT" == "production" ]; then
    log_info "Checking DNS..."
    check_dns "Root" "flamoral.com"
    check_dns "WWW" "www.flamoral.com"
    check_dns "API" "api.flamoral.com"
fi

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "=============================================="
echo "  Summary"
echo "=============================================="
echo ""
echo "Total Checks: $TOTAL_CHECKS"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
echo ""

# Generate JSON output
JSON_OUTPUT=$(cat <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "summary": {
    "total": $TOTAL_CHECKS,
    "passed": $PASSED_CHECKS,
    "failed": $FAILED_CHECKS
  },
  "status": "$([ $FAILED_CHECKS -eq 0 ] && echo 'healthy' || echo 'unhealthy')",
  "checks": {
EOF
)

first=true
for key in "${!RESULTS[@]}"; do
    if [ "$first" = true ]; then
        first=false
    else
        JSON_OUTPUT+=","
    fi
    JSON_OUTPUT+="
    \"$key\": \"${RESULTS[$key]}\""
done

JSON_OUTPUT+="
  }
}"

echo "$JSON_OUTPUT" > /tmp/flamoral-health-report.json
echo "JSON report saved to: /tmp/flamoral-health-report.json"
echo ""

# Exit with appropriate code
if [ $FAILED_CHECKS -gt 0 ]; then
    echo -e "${RED}Health check failed with $FAILED_CHECKS errors${NC}"
    exit 1
else
    echo -e "${GREEN}All health checks passed!${NC}"
    exit 0
fi
