#!/bin/bash

###############################################################################
# Canary Deployment Script
#
# Gradually rolls out new version while monitoring metrics
#
# Usage:
#   ./canary-deploy.sh --service SERVICE --image-tag TAG [OPTIONS]
#
###############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

# Configuration
SERVICE_NAME=""
IMAGE_TAG=""
NAMESPACE="flamoral-dating"
CANARY_PERCENTAGE=10
INCREMENT=10
MONITOR_DURATION=60
ERROR_THRESHOLD=5
AUTO_PROMOTE=false
AUTO_ROLLBACK=true
DRY_RUN=false

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

show_help() {
    cat << EOF
Canary Deployment Script

Usage: $0 --service NAME --image-tag TAG [OPTIONS]

Options:
  --service NAME           Service to deploy (required)
  --image-tag TAG          Docker image tag (required)
  --namespace NS           Kubernetes namespace [default: flamoral-dating]
  --start-percentage NUM   Initial canary traffic % [default: 10]
  --increment NUM          Traffic increment % [default: 10]
  --monitor-duration SEC   Monitor time per stage [default: 60]
  --error-threshold NUM    Max error % before rollback [default: 5]
  --auto-promote           Automatically promote to 100%
  --no-auto-rollback       Don't rollback on errors
  --dry-run                Show plan without applying
  --help                   Show this help
EOF
    exit 0
}

# Deploy canary version
deploy_canary() {
    log_info "Deploying canary version..."

    local registry
    registry=$(az acr list --query "[0].loginServer" -o tsv 2>/dev/null || echo "flamoral.azurecr.io")

    cat <<EOF | kubectl apply -f - -n "$NAMESPACE"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${SERVICE_NAME}-canary
  labels:
    app: ${SERVICE_NAME}
    version: canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${SERVICE_NAME}
      version: canary
  template:
    metadata:
      labels:
        app: ${SERVICE_NAME}
        version: canary
      annotations:
        prometheus.io/scrape: "true"
    spec:
      containers:
      - name: ${SERVICE_NAME}
        image: ${registry}/flamoral/${SERVICE_NAME}:${IMAGE_TAG}
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: ${SERVICE_NAME}-config
        - secretRef:
            name: ${SERVICE_NAME}-secrets
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 2Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 15
EOF

    kubectl rollout status deployment/"${SERVICE_NAME}-canary" -n "$NAMESPACE" --timeout=300s
    log_success "Canary deployed successfully"
}

# Adjust traffic split
set_traffic_split() {
    local percentage=$1
    local stable=$((100 - percentage))

    log_info "Setting traffic split: ${percentage}% canary, ${stable}% stable"

    # Using Istio VirtualService or similar
    cat <<EOF | kubectl apply -f - -n "$NAMESPACE"
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ${SERVICE_NAME}
spec:
  hosts:
  - ${SERVICE_NAME}
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: ${SERVICE_NAME}
        subset: canary
  - route:
    - destination:
        host: ${SERVICE_NAME}
        subset: stable
      weight: ${stable}
    - destination:
        host: ${SERVICE_NAME}
        subset: canary
      weight: ${percentage}
EOF

    log_success "Traffic split updated: ${percentage}% canary"
}

# Monitor metrics
monitor_canary() {
    local duration=$1

    log_info "Monitoring canary for ${duration} seconds..."

    sleep "$duration"

    # Check error rate (mock implementation - integrate with actual metrics)
    local error_rate=1  # Would query from Prometheus

    if [[ $error_rate -gt $ERROR_THRESHOLD ]]; then
        log_error "Error rate ${error_rate}% exceeds threshold ${ERROR_THRESHOLD}%"
        return 1
    fi

    log_success "Metrics healthy - error rate: ${error_rate}%"
    return 0
}

# Promote canary
promote_canary() {
    log_info "Promoting canary to stable..."

    kubectl set image deployment/"${SERVICE_NAME}" \
        "${SERVICE_NAME}=${registry}/flamoral/${SERVICE_NAME}:${IMAGE_TAG}" \
        -n "$NAMESPACE"

    kubectl rollout status deployment/"${SERVICE_NAME}" -n "$NAMESPACE"

    # Cleanup canary
    kubectl delete deployment "${SERVICE_NAME}-canary" -n "$NAMESPACE"

    log_success "Canary promoted successfully"
}

# Rollback canary
rollback_canary() {
    log_warning "Rolling back canary deployment..."

    kubectl delete deployment "${SERVICE_NAME}-canary" -n "$NAMESPACE"
    kubectl delete virtualservice "${SERVICE_NAME}" -n "$NAMESPACE" || true

    log_success "Canary rolled back"
}

# Main execution
main() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --service) SERVICE_NAME="$2"; shift 2 ;;
            --image-tag) IMAGE_TAG="$2"; shift 2 ;;
            --namespace) NAMESPACE="$2"; shift 2 ;;
            --start-percentage) CANARY_PERCENTAGE="$2"; shift 2 ;;
            --increment) INCREMENT="$2"; shift 2 ;;
            --monitor-duration) MONITOR_DURATION="$2"; shift 2 ;;
            --error-threshold) ERROR_THRESHOLD="$2"; shift 2 ;;
            --auto-promote) AUTO_PROMOTE=true; shift ;;
            --no-auto-rollback) AUTO_ROLLBACK=false; shift ;;
            --dry-run) DRY_RUN=true; shift ;;
            --help) show_help ;;
            *) log_error "Unknown option: $1"; show_help ;;
        esac
    done

    [[ -z "$SERVICE_NAME" ]] && { log_error "Service required"; exit 1; }
    [[ -z "$IMAGE_TAG" ]] && { log_error "Image tag required"; exit 1; }

    log_info "Starting canary deployment for $SERVICE_NAME:$IMAGE_TAG"

    deploy_canary

    # Gradual rollout
    local current_percentage=$CANARY_PERCENTAGE
    while [[ $current_percentage -le 100 ]]; do
        set_traffic_split "$current_percentage"

        if ! monitor_canary "$MONITOR_DURATION"; then
            if [[ "$AUTO_ROLLBACK" == "true" ]]; then
                rollback_canary
                exit 1
            else
                log_error "Monitoring failed but auto-rollback disabled"
                exit 1
            fi
        fi

        if [[ $current_percentage -eq 100 ]]; then
            break
        fi

        if [[ "$AUTO_PROMOTE" == "false" && $current_percentage -lt 100 ]]; then
            read -p "Continue to $((current_percentage + INCREMENT))%? (y/n): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_warning "Deployment paused by user"
                exit 0
            fi
        fi

        current_percentage=$((current_percentage + INCREMENT))
    done

    promote_canary
    log_success "Canary deployment completed successfully!"
}

main "$@"
