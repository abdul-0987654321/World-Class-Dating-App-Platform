#!/bin/bash

###############################################################################
# Service Scaling Script - Scale services for different traffic levels
###############################################################################

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

NAMESPACE="flamoral-dating"
PROFILE="normal"
SPECIFIC_SERVICE=""
REPLICAS=""

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
    cat << EOF
Service Scaling Script

Usage: $0 [OPTIONS]

Options:
  --profile PROFILE      Scaling profile (low|normal|high|peak|maintenance)
  --service NAME         Scale specific service
  --replicas NUM         Set specific replica count
  --namespace NS         Kubernetes namespace
  --help                 Show this help

Profiles:
  maintenance  - Minimal replicas (1 per service)
  low          - Low traffic (2 replicas)
  normal       - Normal traffic (3-5 replicas)
  high         - High traffic (5-10 replicas)
  peak         - Peak traffic (10-20 replicas)

Examples:
  $0 --profile peak
  $0 --service api-gateway --replicas 10
  $0 --profile maintenance
EOF
    exit 0
}

# Scaling profiles
declare -A MAINTENANCE_REPLICAS=(
    ["user-service"]=1 ["auth-service"]=1 ["api-gateway"]=1
    ["matching-service"]=1 ["messaging-service"]=1
    ["media-service"]=1 ["payment-service"]=1
    ["notification-service"]=1 ["analytics-service"]=1
    ["moderation-service"]=1 ["realtime-service"]=1
    ["admin-service"]=1
)

declare -A LOW_REPLICAS=(
    ["user-service"]=2 ["auth-service"]=2 ["api-gateway"]=2
    ["matching-service"]=2 ["messaging-service"]=2
    ["media-service"]=2 ["payment-service"]=2
    ["notification-service"]=2 ["analytics-service"]=1
    ["moderation-service"]=2 ["realtime-service"]=2
    ["admin-service"]=1
)

declare -A NORMAL_REPLICAS=(
    ["user-service"]=3 ["auth-service"]=3 ["api-gateway"]=5
    ["matching-service"]=3 ["messaging-service"]=4
    ["media-service"]=4 ["payment-service"]=3
    ["notification-service"]=3 ["analytics-service"]=2
    ["moderation-service"]=3 ["realtime-service"]=4
    ["admin-service"]=2
)

declare -A HIGH_REPLICAS=(
    ["user-service"]=5 ["auth-service"]=5 ["api-gateway"]=10
    ["matching-service"]=5 ["messaging-service"]=8
    ["media-service"]=8 ["payment-service"]=5
    ["notification-service"]=5 ["analytics-service"]=3
    ["moderation-service"]=5 ["realtime-service"]=8
    ["admin-service"]=2
)

declare -A PEAK_REPLICAS=(
    ["user-service"]=10 ["auth-service"]=10 ["api-gateway"]=20
    ["matching-service"]=10 ["messaging-service"]=15
    ["media-service"]=15 ["payment-service"]=10
    ["notification-service"]=10 ["analytics-service"]=5
    ["moderation-service"]=10 ["realtime-service"]=15
    ["admin-service"]=3
)

get_replicas_for_profile() {
    local service=$1
    local profile=$2

    case $profile in
        maintenance) echo "${MAINTENANCE_REPLICAS[$service]}" ;;
        low) echo "${LOW_REPLICAS[$service]}" ;;
        normal) echo "${NORMAL_REPLICAS[$service]}" ;;
        high) echo "${HIGH_REPLICAS[$service]}" ;;
        peak) echo "${PEAK_REPLICAS[$service]}" ;;
        *) echo "3" ;;
    esac
}

scale_service() {
    local service=$1
    local replicas=$2

    log_info "Scaling $service to $replicas replicas..."

    if kubectl scale deployment/"$service" \
        --replicas="$replicas" \
        -n "$NAMESPACE"; then
        log_success "$service scaled to $replicas"
    else
        log_error "Failed to scale $service"
        return 1
    fi
}

wait_for_scaling() {
    local service=$1

    log_info "Waiting for $service to stabilize..."

    if kubectl rollout status deployment/"$service" \
        -n "$NAMESPACE" \
        --timeout=300s; then
        log_success "$service scaled successfully"
    else
        log_error "$service scaling timed out"
        return 1
    fi
}

update_hpa_limits() {
    local profile=$1

    log_info "Updating HPA limits for profile: $profile"

    local min_replicas max_replicas
    case $profile in
        maintenance) min_replicas=1; max_replicas=2 ;;
        low) min_replicas=2; max_replicas=5 ;;
        normal) min_replicas=3; max_replicas=10 ;;
        high) min_replicas=5; max_replicas=20 ;;
        peak) min_replicas=10; max_replicas=50 ;;
    esac

    for service in user-service auth-service api-gateway matching-service; do
        kubectl patch hpa "$service" -n "$NAMESPACE" \
            -p "{\"spec\":{\"minReplicas\":$min_replicas,\"maxReplicas\":$max_replicas}}" \
            2>/dev/null || true
    done

    log_success "HPA limits updated"
}

show_current_status() {
    log_info "Current service replicas:"

    kubectl get deployments -n "$NAMESPACE" \
        -o custom-columns=NAME:.metadata.name,REPLICAS:.spec.replicas,READY:.status.readyReplicas

    log_info "Current resource usage:"
    kubectl top pods -n "$NAMESPACE" --sort-by=cpu | head -10
}

main() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --profile) PROFILE="$2"; shift 2 ;;
            --service) SPECIFIC_SERVICE="$2"; shift 2 ;;
            --replicas) REPLICAS="$2"; shift 2 ;;
            --namespace) NAMESPACE="$2"; shift 2 ;;
            --help) show_help ;;
            *) log_error "Unknown: $1"; exit 1 ;;
        esac
    done

    echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}  Service Scaling${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

    log_info "Profile: $PROFILE"
    log_info "Namespace: $NAMESPACE"

    show_current_status

    # Scale specific service or all services
    if [[ -n "$SPECIFIC_SERVICE" ]]; then
        local target_replicas
        if [[ -n "$REPLICAS" ]]; then
            target_replicas=$REPLICAS
        else
            target_replicas=$(get_replicas_for_profile "$SPECIFIC_SERVICE" "$PROFILE")
        fi

        scale_service "$SPECIFIC_SERVICE" "$target_replicas"
        wait_for_scaling "$SPECIFIC_SERVICE"
    else
        # Scale all services according to profile
        for service in "${!NORMAL_REPLICAS[@]}"; do
            local target_replicas
            target_replicas=$(get_replicas_for_profile "$service" "$PROFILE")

            scale_service "$service" "$target_replicas"
        done

        # Wait for all to stabilize
        log_info "Waiting for all services to stabilize..."
        sleep 10

        for service in "${!NORMAL_REPLICAS[@]}"; do
            wait_for_scaling "$service"
        done

        # Update HPA
        update_hpa_limits "$PROFILE"
    fi

    echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
    log_success "Scaling complete!"

    show_current_status
}

main "$@"
