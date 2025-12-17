#!/bin/bash

###############################################################################
# Rollback Script - Rollback deployments to previous versions
###############################################################################

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

SERVICE_NAME=""
REVISION=""
DEPLOYMENT_ID=""
NAMESPACE="flamoral-dating"
ALL_SERVICES=false

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
    cat << EOF
Rollback Deployment Script

Usage: $0 [OPTIONS]

Options:
  --service NAME         Rollback specific service
  --revision NUM         Rollback to specific revision
  --deployment-id ID     Rollback entire deployment by ID
  --all                  Rollback all services
  --namespace NS         Kubernetes namespace
  --help                 Show this help
EOF
    exit 0
}

rollback_service() {
    local service=$1
    local rev=${2:-""}

    log_info "Rolling back $service..."

    if [[ -n "$rev" ]]; then
        kubectl rollout undo deployment/"$service" --to-revision="$rev" -n "$NAMESPACE"
    else
        kubectl rollout undo deployment/"$service" -n "$NAMESPACE"
    fi

    kubectl rollout status deployment/"$service" -n "$NAMESPACE" --timeout=300s
    log_success "$service rolled back successfully"
}

main() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --service) SERVICE_NAME="$2"; shift 2 ;;
            --revision) REVISION="$2"; shift 2 ;;
            --deployment-id) DEPLOYMENT_ID="$2"; shift 2 ;;
            --all) ALL_SERVICES=true; shift ;;
            --namespace) NAMESPACE="$2"; shift 2 ;;
            --help) show_help ;;
            *) log_error "Unknown: $1"; exit 1 ;;
        esac
    done

    if [[ -n "$SERVICE_NAME" ]]; then
        rollback_service "$SERVICE_NAME" "$REVISION"
    elif [[ "$ALL_SERVICES" == "true" ]]; then
        for svc in user-service auth-service api-gateway matching-service messaging-service; do
            rollback_service "$svc" "$REVISION"
        done
    else
        log_error "Specify --service, --all, or --deployment-id"
        exit 1
    fi

    log_success "Rollback completed"
}

main "$@"
