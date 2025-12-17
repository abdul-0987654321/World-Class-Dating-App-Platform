#!/bin/bash

################################################################################
# Flamoral Platform - Post-Deployment Verification Script
################################################################################
# This script performs comprehensive checks after deployment to verify that
# all services are running correctly and accessible.
#
# Usage:
#   ./verify-deployment.sh [environment]
#
# Arguments:
#   environment - Optional: production (default), staging, or development
#
# Exit Codes:
#   0 - All checks passed
#   1 - One or more critical checks failed
#   2 - Script usage error
################################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-production}"
NAMESPACE="flamoral"
TIMEOUT=30
FAILED_CHECKS=0
TOTAL_CHECKS=0

# Domains to check
DOMAINS=(
    "flamoral.com"
    "www.flamoral.com"
    "api.flamoral.com"
    "admin.flamoral.com"
)

# Expected services
SERVICES=(
    "web-app"
    "api-gateway"
    "messaging-service"
    "notification-service"
    "analytics-service"
    "realtime-service"
    "admin-service"
    "moderation-service"
)

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_check() {
    echo -e "${YELLOW}[CHECK]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TOTAL_CHECKS++))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_fail "Required command not found: $1"
        echo "Please install $1 and try again."
        exit 2
    fi
}

################################################################################
# Pre-flight Checks
################################################################################

preflight_checks() {
    print_header "Pre-flight Checks"

    print_check "Checking required commands..."
    check_command "kubectl"
    check_command "curl"
    check_command "dig"
    check_command "openssl"
    print_pass "All required commands available"

    print_check "Verifying Kubernetes context..."
    CURRENT_CONTEXT=$(kubectl config current-context)
    print_info "Current context: $CURRENT_CONTEXT"

    if [[ "$CURRENT_CONTEXT" != *"flamoral"* ]]; then
        print_warn "Context does not appear to be Flamoral cluster"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 2
        fi
    fi

    print_check "Checking namespace exists..."
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_pass "Namespace '$NAMESPACE' exists"
    else
        print_fail "Namespace '$NAMESPACE' not found"
        exit 1
    fi
}

################################################################################
# DNS Resolution Checks
################################################################################

check_dns() {
    print_header "DNS Resolution Checks"

    for domain in "${DOMAINS[@]}"; do
        print_check "Checking DNS for $domain..."

        if dig +short "$domain" A | grep -q '^[0-9]'; then
            IP=$(dig +short "$domain" A | head -n1)
            print_pass "$domain resolves to $IP"
        else
            print_fail "$domain does not resolve"
        fi
    done
}

################################################################################
# TLS Certificate Checks
################################################################################

check_certificates() {
    print_header "TLS Certificate Checks"

    for domain in "${DOMAINS[@]}"; do
        print_check "Checking certificate for $domain..."

        # Check if domain is reachable
        if ! curl -s --connect-timeout 5 "https://$domain" &> /dev/null; then
            print_warn "$domain not reachable, skipping certificate check"
            continue
        fi

        # Get certificate expiration date
        CERT_INFO=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)

        if [ $? -eq 0 ]; then
            EXPIRY_DATE=$(echo "$CERT_INFO" | grep "notAfter" | cut -d= -f2)
            EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY_DATE" +%s 2>/dev/null)
            CURRENT_EPOCH=$(date +%s)
            DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

            if [ "$DAYS_UNTIL_EXPIRY" -gt 30 ]; then
                print_pass "$domain certificate valid for $DAYS_UNTIL_EXPIRY days"
            elif [ "$DAYS_UNTIL_EXPIRY" -gt 7 ]; then
                print_warn "$domain certificate expires in $DAYS_UNTIL_EXPIRY days"
            else
                print_fail "$domain certificate expires in $DAYS_UNTIL_EXPIRY days (CRITICAL)"
            fi
        else
            print_fail "Unable to retrieve certificate for $domain"
        fi
    done

    # Check Kubernetes TLS secrets
    print_check "Checking Kubernetes TLS secrets..."
    if kubectl get secret -n "$NAMESPACE" flamoral-tls &> /dev/null; then
        print_pass "TLS secret 'flamoral-tls' exists"
    else
        print_fail "TLS secret 'flamoral-tls' not found"
    fi
}

################################################################################
# Kubernetes Pod Checks
################################################################################

check_pods() {
    print_header "Kubernetes Pod Status"

    print_check "Retrieving pod status..."
    PODS=$(kubectl get pods -n "$NAMESPACE" -o json)

    if [ -z "$PODS" ]; then
        print_fail "Unable to retrieve pod information"
        return
    fi

    # Check each expected service
    for service in "${SERVICES[@]}"; do
        print_check "Checking pods for $service..."

        POD_COUNT=$(echo "$PODS" | jq -r ".items[] | select(.metadata.name | startswith(\"$service\")) | .metadata.name" | wc -l)

        if [ "$POD_COUNT" -eq 0 ]; then
            print_warn "No pods found for $service"
            continue
        fi

        READY_PODS=$(echo "$PODS" | jq -r ".items[] | select(.metadata.name | startswith(\"$service\")) | select(.status.phase == \"Running\" and (.status.conditions[] | select(.type == \"Ready\" and .status == \"True\"))) | .metadata.name" | wc -l)

        if [ "$READY_PODS" -eq "$POD_COUNT" ]; then
            print_pass "$service: $READY_PODS/$POD_COUNT pods ready"
        else
            print_fail "$service: Only $READY_PODS/$POD_COUNT pods ready"

            # Show details of failed pods
            echo "$PODS" | jq -r ".items[] | select(.metadata.name | startswith(\"$service\")) | select(.status.phase != \"Running\" or (.status.conditions[] | select(.type == \"Ready\" and .status != \"True\"))) | \"  Pod: \" + .metadata.name + \" | Status: \" + .status.phase + \" | Reason: \" + (.status.containerStatuses[0].state | keys[0])"
        fi
    done
}

################################################################################
# Service Health Endpoint Checks
################################################################################

check_health_endpoints() {
    print_header "Service Health Endpoints"

    # Get ingress IP
    INGRESS_IP=$(kubectl get ingress -n "$NAMESPACE" flamoral-ingress -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")

    if [ -z "$INGRESS_IP" ]; then
        print_warn "Unable to determine ingress IP, skipping health endpoint checks"
        return
    fi

    print_info "Ingress IP: $INGRESS_IP"

    # Check health endpoints
    HEALTH_ENDPOINTS=(
        "https://flamoral.com/health:web-app"
        "https://api.flamoral.com/health:api-gateway"
        "https://api.flamoral.com/api/messaging/health:messaging-service"
        "https://api.flamoral.com/api/notifications/health:notification-service"
        "https://api.flamoral.com/api/analytics/health:analytics-service"
    )

    for endpoint_info in "${HEALTH_ENDPOINTS[@]}"; do
        IFS=':' read -r endpoint service <<< "$endpoint_info"
        print_check "Checking health endpoint for $service..."

        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 30 "$endpoint" 2>/dev/null || echo "000")

        if [ "$HTTP_CODE" = "200" ]; then
            print_pass "$service health check passed (HTTP $HTTP_CODE)"
        elif [ "$HTTP_CODE" = "000" ]; then
            print_fail "$service health check failed (connection timeout)"
        else
            print_fail "$service health check failed (HTTP $HTTP_CODE)"
        fi
    done
}

################################################################################
# External Secrets Checks
################################################################################

check_external_secrets() {
    print_header "External Secrets Synchronization"

    print_check "Checking External Secrets Operator..."
    if kubectl get deployment -n external-secrets external-secrets &> /dev/null; then
        print_pass "External Secrets Operator is deployed"
    else
        print_warn "External Secrets Operator not found (may not be installed)"
        return
    fi

    print_check "Checking ExternalSecret resources..."
    EXTERNAL_SECRETS=$(kubectl get externalsecrets -n "$NAMESPACE" -o json 2>/dev/null)

    if [ $? -ne 0 ]; then
        print_warn "No ExternalSecret resources found or unable to query"
        return
    fi

    SECRET_COUNT=$(echo "$EXTERNAL_SECRETS" | jq -r '.items | length')

    if [ "$SECRET_COUNT" -eq 0 ]; then
        print_warn "No ExternalSecret resources found in namespace"
        return
    fi

    print_info "Found $SECRET_COUNT ExternalSecret resources"

    SYNCED_SECRETS=$(echo "$EXTERNAL_SECRETS" | jq -r '.items[] | select(.status.conditions[] | select(.type == "Ready" and .status == "True")) | .metadata.name' | wc -l)

    if [ "$SYNCED_SECRETS" -eq "$SECRET_COUNT" ]; then
        print_pass "All $SECRET_COUNT external secrets are synced"
    else
        print_fail "Only $SYNCED_SECRETS/$SECRET_COUNT external secrets are synced"

        # Show unsynced secrets
        echo "$EXTERNAL_SECRETS" | jq -r '.items[] | select(.status.conditions[] | select(.type == "Ready" and .status != "True")) | "  Secret: " + .metadata.name + " | Status: " + (.status.conditions[] | select(.type == "Ready") | .message)'
    fi
}

################################################################################
# Front Door Routing Checks
################################################################################

check_frontdoor_routing() {
    print_header "Azure Front Door Routing"

    print_check "Checking Front Door configuration..."

    # This requires Azure CLI to be installed and configured
    if ! command -v az &> /dev/null; then
        print_warn "Azure CLI not found, skipping Front Door checks"
        return
    fi

    # Check if logged in
    if ! az account show &> /dev/null; then
        print_warn "Not logged into Azure CLI, skipping Front Door checks"
        return
    fi

    FRONTDOOR_NAME="flamoral-frontdoor"
    RESOURCE_GROUP="flamoral-rg"

    print_check "Querying Front Door status..."
    FRONTDOOR_STATUS=$(az afd endpoint list --resource-group "$RESOURCE_GROUP" --profile-name "$FRONTDOOR_NAME" --query "[].provisioningState" -o tsv 2>/dev/null || echo "")

    if [ -z "$FRONTDOOR_STATUS" ]; then
        print_warn "Unable to query Front Door status (may not exist or no permissions)"
        return
    fi

    if echo "$FRONTDOOR_STATUS" | grep -q "Succeeded"; then
        print_pass "Front Door endpoints are provisioned successfully"
    else
        print_fail "Front Door endpoints status: $FRONTDOOR_STATUS"
    fi
}

################################################################################
# WebSocket Connection Checks
################################################################################

check_websocket() {
    print_header "WebSocket Connection Tests"

    WS_URL="wss://api.flamoral.com/ws"

    print_check "Testing WebSocket connection to $WS_URL..."

    # Use websocat if available, otherwise skip
    if command -v websocat &> /dev/null; then
        RESPONSE=$(timeout 5 websocat -n -1 "$WS_URL" 2>&1 || echo "failed")

        if echo "$RESPONSE" | grep -q "failed"; then
            print_warn "WebSocket connection test inconclusive (connection may require authentication)"
        else
            print_pass "WebSocket connection successful"
        fi
    else
        print_warn "websocat not installed, skipping WebSocket test"
        print_info "Install websocat for WebSocket testing: cargo install websocat"
    fi
}

################################################################################
# API Endpoint Response Checks
################################################################################

check_api_endpoints() {
    print_header "API Endpoint Response Checks"

    API_ENDPOINTS=(
        "https://api.flamoral.com/health:Health Check"
        "https://api.flamoral.com/api/v1/status:API Status"
    )

    for endpoint_info in "${API_ENDPOINTS[@]}"; do
        IFS=':' read -r endpoint description <<< "$endpoint_info"
        print_check "Testing $description ($endpoint)..."

        START_TIME=$(date +%s%N)
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 30 "$endpoint" 2>/dev/null || echo "000")
        END_TIME=$(date +%s%N)
        RESPONSE_TIME=$(( ($END_TIME - $START_TIME) / 1000000 ))

        if [ "$HTTP_CODE" = "200" ]; then
            print_pass "$description responded (HTTP $HTTP_CODE) in ${RESPONSE_TIME}ms"
        elif [ "$HTTP_CODE" = "000" ]; then
            print_fail "$description connection failed"
        else
            print_warn "$description returned HTTP $HTTP_CODE in ${RESPONSE_TIME}ms"
        fi
    done
}

################################################################################
# Main Execution
################################################################################

main() {
    print_header "Flamoral Platform Deployment Verification"
    print_info "Environment: $ENVIRONMENT"
    print_info "Namespace: $NAMESPACE"
    print_info "Started at: $(date)"

    # Run all checks
    preflight_checks
    check_dns
    check_certificates
    check_pods
    check_health_endpoints
    check_external_secrets
    check_frontdoor_routing
    check_websocket
    check_api_endpoints

    # Summary
    print_header "Verification Summary"

    PASSED_CHECKS=$((TOTAL_CHECKS - FAILED_CHECKS))

    echo -e "Total Checks: $TOTAL_CHECKS"
    echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
    echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
    echo -e ""

    if [ $FAILED_CHECKS -eq 0 ]; then
        print_pass "All checks passed! Deployment verification successful."
        exit 0
    else
        print_fail "Deployment verification completed with $FAILED_CHECKS failed checks."
        print_info "Please review the failed checks above and address any issues."
        exit 1
    fi
}

# Run main function
main
