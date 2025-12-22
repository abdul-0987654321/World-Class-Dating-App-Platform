#!/bin/bash
# Flamoral Platform - Traffic Validation Script
# Run this script after starting Azure resources to validate service connectivity

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_GATEWAY_URL="${API_GATEWAY_URL:-http://localhost:4000}"
AUTH_SERVICE_URL="${AUTH_SERVICE_URL:-http://localhost:3001}"
USER_SERVICE_URL="${USER_SERVICE_URL:-http://localhost:3002}"
MATCHING_SERVICE_URL="${MATCHING_SERVICE_URL:-http://localhost:3003}"
MESSAGING_SERVICE_URL="${MESSAGING_SERVICE_URL:-http://localhost:5000}"
PAYMENT_SERVICE_URL="${PAYMENT_SERVICE_URL:-http://localhost:3005}"
NOTIFICATION_SERVICE_URL="${NOTIFICATION_SERVICE_URL:-http://localhost:3008}"
MEDIA_SERVICE_URL="${MEDIA_SERVICE_URL:-http://localhost:3009}"
ANALYTICS_SERVICE_URL="${ANALYTICS_SERVICE_URL:-http://localhost:3007}"

# Test results
PASSED=0
FAILED=0
WARNINGS=0

# Utility functions
log_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
}

log_failure() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Health check function
check_health() {
    local service_name=$1
    local url=$2
    local endpoint="${3:-/health}"

    log_info "Checking $service_name..."

    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${url}${endpoint}" 2>/dev/null || echo "000")

    if [ "$response" = "200" ]; then
        log_success "$service_name is healthy (HTTP $response)"
        return 0
    elif [ "$response" = "000" ]; then
        log_failure "$service_name is unreachable"
        return 1
    else
        log_warning "$service_name returned HTTP $response"
        return 1
    fi
}

# Readiness check function
check_readiness() {
    local service_name=$1
    local url=$2

    response=$(curl -s --connect-timeout 5 "${url}/health/ready" 2>/dev/null)

    if echo "$response" | grep -q '"status":"ok"\|"ready":true\|"status":"ready"'; then
        log_success "$service_name is ready"
        return 0
    else
        log_warning "$service_name readiness check: $response"
        return 1
    fi
}

# Database connectivity check
check_database() {
    log_header "Database Connectivity"

    # Check PostgreSQL via service health
    response=$(curl -s --connect-timeout 5 "${AUTH_SERVICE_URL}/health" 2>/dev/null)

    if echo "$response" | grep -q '"database":"connected"\|"postgres":"ok"'; then
        log_success "PostgreSQL connection verified"
    else
        log_warning "PostgreSQL connection status unclear"
    fi

    # Check Redis via service health
    if echo "$response" | grep -q '"redis":"connected"\|"cache":"ok"'; then
        log_success "Redis connection verified"
    else
        log_warning "Redis connection status unclear"
    fi
}

# API Gateway routes check
check_gateway_routes() {
    log_header "API Gateway Route Validation"

    routes=(
        "/api/auth/health"
        "/api/users/health"
        "/api/matches/health"
        "/api/messages/health"
    )

    for route in "${routes[@]}"; do
        response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${API_GATEWAY_URL}${route}" 2>/dev/null || echo "000")

        if [ "$response" = "200" ] || [ "$response" = "401" ] || [ "$response" = "404" ]; then
            log_success "Route ${route} is reachable (HTTP $response)"
        else
            log_failure "Route ${route} failed (HTTP $response)"
        fi
    done
}

# Auth flow validation
validate_auth_flow() {
    log_header "Authentication Flow Validation"

    # Test registration endpoint structure
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{"email":"test@invalid"}' \
        "${AUTH_SERVICE_URL}/api/auth/register" 2>/dev/null || echo "000")

    if [ "$response" = "400" ]; then
        log_success "Registration endpoint validates input (HTTP 400 for invalid data)"
    elif [ "$response" = "000" ]; then
        log_failure "Registration endpoint unreachable"
    else
        log_info "Registration endpoint returned HTTP $response"
    fi

    # Test login endpoint structure
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{"email":"test@invalid","password":"test"}' \
        "${AUTH_SERVICE_URL}/api/auth/login" 2>/dev/null || echo "000")

    if [ "$response" = "400" ] || [ "$response" = "401" ]; then
        log_success "Login endpoint validates credentials (HTTP $response)"
    elif [ "$response" = "000" ]; then
        log_failure "Login endpoint unreachable"
    else
        log_info "Login endpoint returned HTTP $response"
    fi
}

# Service-to-service communication check
check_internal_communication() {
    log_header "Internal Service Communication"

    # Check if API Gateway can reach Auth Service for token validation
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "X-Service-Key: test" \
        -d '{"token":"invalid"}' \
        "${AUTH_SERVICE_URL}/api/auth/validate-token" 2>/dev/null || echo "000")

    if [ "$response" = "401" ] || [ "$response" = "403" ]; then
        log_success "Internal auth validation endpoint accessible (HTTP $response)"
    elif [ "$response" = "000" ]; then
        log_failure "Internal auth validation endpoint unreachable"
    else
        log_info "Internal auth validation returned HTTP $response"
    fi
}

# Check Kubernetes services (if kubectl available)
check_kubernetes() {
    log_header "Kubernetes Service Status"

    if ! command -v kubectl &> /dev/null; then
        log_info "kubectl not available, skipping Kubernetes checks"
        return 0
    fi

    # Check if connected to cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_warning "Not connected to Kubernetes cluster"
        return 0
    fi

    log_info "Connected to Kubernetes cluster"

    # Check service endpoints
    services=("auth-service" "user-service" "matching-service" "messaging-service" "payment-service")

    for svc in "${services[@]}"; do
        endpoints=$(kubectl get endpoints "$svc" -n flamoral 2>/dev/null | grep -v "NAME" | awk '{print $2}')

        if [ -n "$endpoints" ] && [ "$endpoints" != "<none>" ]; then
            log_success "$svc has endpoints: $endpoints"
        else
            log_warning "$svc has no ready endpoints"
        fi
    done
}

# Check external dependencies
check_external_deps() {
    log_header "External Dependency Checks"

    # Check Stripe API
    stripe_response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "https://api.stripe.com/v1/charges" 2>/dev/null || echo "000")
    if [ "$stripe_response" = "401" ]; then
        log_success "Stripe API reachable (auth required as expected)"
    else
        log_warning "Stripe API check returned HTTP $stripe_response"
    fi

    # Check SendGrid API
    sendgrid_response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "https://api.sendgrid.com/v3/mail/send" 2>/dev/null || echo "000")
    if [ "$sendgrid_response" = "401" ] || [ "$sendgrid_response" = "403" ]; then
        log_success "SendGrid API reachable"
    else
        log_warning "SendGrid API check returned HTTP $sendgrid_response"
    fi

    # Check Firebase (for push notifications)
    firebase_response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "https://fcm.googleapis.com/fcm/send" 2>/dev/null || echo "000")
    if [ "$firebase_response" = "401" ] || [ "$firebase_response" = "400" ]; then
        log_success "Firebase FCM reachable"
    else
        log_warning "Firebase FCM check returned HTTP $firebase_response"
    fi
}

# Main execution
main() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Flamoral Platform - Traffic Validation Suite        ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Started at: $(date)"
    echo ""

    # Run all checks
    log_header "Service Health Checks"
    check_health "API Gateway" "$API_GATEWAY_URL"
    check_health "Auth Service" "$AUTH_SERVICE_URL"
    check_health "User Service" "$USER_SERVICE_URL"
    check_health "Matching Service" "$MATCHING_SERVICE_URL"
    check_health "Messaging Service" "$MESSAGING_SERVICE_URL"
    check_health "Payment Service" "$PAYMENT_SERVICE_URL"
    check_health "Notification Service" "$NOTIFICATION_SERVICE_URL"
    check_health "Media Service" "$MEDIA_SERVICE_URL"
    check_health "Analytics Service" "$ANALYTICS_SERVICE_URL"

    check_database
    check_gateway_routes
    validate_auth_flow
    check_internal_communication
    check_kubernetes
    check_external_deps

    # Summary
    log_header "Validation Summary"
    echo ""
    echo -e "  ${GREEN}Passed:${NC}   $PASSED"
    echo -e "  ${RED}Failed:${NC}   $FAILED"
    echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
    echo ""

    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}All critical checks passed!${NC}"
        exit 0
    else
        echo -e "${RED}Some checks failed. Review the output above.${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
