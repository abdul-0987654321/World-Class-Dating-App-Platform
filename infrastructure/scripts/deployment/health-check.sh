#!/bin/bash

###############################################################################
# Health Check Verification Script
###############################################################################

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

NAMESPACE="flamoral-dating"
ENVIRONMENT="production"
VERBOSE=false
SERVICES=(
    "user-service:3001"
    "auth-service:3002"
    "matching-service:3003"
    "messaging-service:3004"
    "media-service:3005"
    "payment-service:3006"
    "notification-service:3007"
    "analytics-service:3008"
    "moderation-service:3009"
    "realtime-service:3010"
    "admin-service:3011"
    "api-gateway:3000"
)

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

show_help() {
    cat << EOF
Health Check Verification Script

Usage: $0 [OPTIONS]

Options:
  --env ENV          Environment (dev|staging|production)
  --namespace NS     Kubernetes namespace
  --verbose          Show detailed output
  --help             Show this help
EOF
    exit 0
}

check_pod_health() {
    local service=$1

    local pods_total
    pods_total=$(kubectl get pods -n "$NAMESPACE" -l "app=$service" --no-headers 2>/dev/null | wc -l)

    if [[ $pods_total -eq 0 ]]; then
        log_error "$service: No pods found"
        return 1
    fi

    local pods_ready
    pods_ready=$(kubectl get pods -n "$NAMESPACE" -l "app=$service" \
        -o json 2>/dev/null | \
        jq '[.items[].status.conditions[] | select(.type=="Ready" and .status=="True")] | length')

    if [[ $pods_ready -eq $pods_total ]]; then
        log_success "$service: All pods healthy ($pods_ready/$pods_total)"
        return 0
    else
        log_error "$service: Unhealthy pods ($pods_ready/$pods_total)"
        return 1
    fi
}

check_service_endpoint() {
    local service_port=$1
    IFS=':' read -r service port <<< "$service_port"

    log_info "Checking $service endpoint..."

    if kubectl run -n "$NAMESPACE" --rm -i --restart=Never --quiet \
        health-check-${RANDOM} --image=curlimages/curl --timeout=10s \
        -- curl -sf "http://${service}:${port}/health" &>/dev/null; then
        log_success "$service: Endpoint responding"
        return 0
    else
        log_error "$service: Endpoint not responding"
        return 1
    fi
}

main() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --env) ENVIRONMENT="$2"; shift 2 ;;
            --namespace) NAMESPACE="$2"; shift 2 ;;
            --verbose) VERBOSE=true; shift ;;
            --help) show_help ;;
            *) shift ;;
        esac
    done

    echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}  Health Check Verification${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

    log_info "Environment: $ENVIRONMENT"
    log_info "Namespace: $NAMESPACE"

    local failed=0

    # Check pod health
    echo -e "\n${BLUE}Checking Pod Health...${NC}"
    for service_port in "${SERVICES[@]}"; do
        IFS=':' read -r service port <<< "$service_port"
        if ! check_pod_health "$service"; then
            ((failed++))
        fi
    done

    # Check service endpoints
    echo -e "\n${BLUE}Checking Service Endpoints...${NC}"
    for service_port in "${SERVICES[@]}"; do
        if ! check_service_endpoint "$service_port"; then
            ((failed++))
        fi
    done

    # Summary
    echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
    if [[ $failed -eq 0 ]]; then
        echo -e "${GREEN}✓ All health checks passed${NC}"
        exit 0
    else
        echo -e "${RED}✗ $failed health check(s) failed${NC}"
        exit 1
    fi
}

main "$@"
