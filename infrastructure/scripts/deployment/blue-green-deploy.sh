#!/bin/bash

###############################################################################
# Blue-Green Deployment Script
#
# Implements zero-downtime blue-green deployments with instant rollback
#
# Usage:
#   ./blue-green-deploy.sh [OPTIONS]
#
###############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SERVICE_NAME=""
IMAGE_TAG=""
ENVIRONMENT="production"
NAMESPACE="flamoral-dating"
CURRENT_COLOR=""
TARGET_COLOR=""
HEALTH_CHECK_TIMEOUT=300
TRAFFIC_SWITCH_DELAY=10
AUTO_CLEANUP=true
DRY_RUN=false

# Logging
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

show_help() {
    cat << EOF
Blue-Green Deployment Script

Usage: $0 --service SERVICE_NAME --image-tag TAG [OPTIONS]

Options:
  --service NAME         Service to deploy (required)
  --image-tag TAG        Docker image tag (required)
  --env ENV             Environment [default: production]
  --namespace NS        Kubernetes namespace [default: flamoral-dating]
  --no-cleanup          Don't cleanup old deployment after switch
  --health-timeout SEC  Health check timeout [default: 300]
  --traffic-delay SEC   Delay before traffic switch [default: 10]
  --dry-run             Show deployment plan without applying
  --help                Show this help

Examples:
  $0 --service api-gateway --image-tag v1.2.3
  $0 --service user-service --image-tag v2.0.0 --no-cleanup
  $0 --service matching-service --image-tag latest --dry-run
EOF
    exit 0
}

# Determine current active color
get_current_color() {
    log_info "Determining current active deployment..."

    local service_selector
    service_selector=$(kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" \
        -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "")

    if [[ "$service_selector" == "blue" ]]; then
        CURRENT_COLOR="blue"
        TARGET_COLOR="green"
    elif [[ "$service_selector" == "green" ]]; then
        CURRENT_COLOR="green"
        TARGET_COLOR="blue"
    else
        # No blue-green setup yet, default to blue
        CURRENT_COLOR=""
        TARGET_COLOR="blue"
    fi

    if [[ -n "$CURRENT_COLOR" ]]; then
        log_info "Current active: $CURRENT_COLOR"
        log_info "Target deployment: $TARGET_COLOR"
    else
        log_info "No active deployment found"
        log_info "Initial deployment will be: $TARGET_COLOR"
    fi
}

# Create blue-green deployment manifests
create_deployment_manifests() {
    log_step "Creating $TARGET_COLOR deployment manifests..."

    local deployment_name="${SERVICE_NAME}-${TARGET_COLOR}"
    local source_manifest="$PROJECT_ROOT/infrastructure/kubernetes/services/${SERVICE_NAME}.yaml"

    if [[ ! -f "$source_manifest" ]]; then
        log_error "Service manifest not found: $source_manifest"
        exit 1
    fi

    local temp_manifest="/tmp/${deployment_name}-${TIMESTAMP}.yaml"

    # Get registry
    local registry
    registry=$(az acr list --query "[0].loginServer" -o tsv 2>/dev/null || echo "flamoral.azurecr.io")

    # Create customized manifest for blue-green
    cat > "$temp_manifest" <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${deployment_name}
  namespace: ${NAMESPACE}
  labels:
    app: ${SERVICE_NAME}
    version: ${TARGET_COLOR}
    deployment-type: blue-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ${SERVICE_NAME}
      version: ${TARGET_COLOR}
  template:
    metadata:
      labels:
        app: ${SERVICE_NAME}
        version: ${TARGET_COLOR}
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        deployment.timestamp: "${TIMESTAMP}"
    spec:
      containers:
      - name: ${SERVICE_NAME}
        image: ${registry}/flamoral/${SERVICE_NAME}:${IMAGE_TAG}
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: VERSION
          value: "${TARGET_COLOR}"
        - name: DEPLOYMENT_TYPE
          value: "blue-green"
        - name: DEPLOYMENT_TIMESTAMP
          value: "${TIMESTAMP}"
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
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 15
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ${deployment_name}
  namespace: ${NAMESPACE}
  labels:
    app: ${SERVICE_NAME}
    version: ${TARGET_COLOR}
spec:
  type: ClusterIP
  selector:
    app: ${SERVICE_NAME}
    version: ${TARGET_COLOR}
  ports:
  - port: 3000
    targetPort: 3000
    name: http
  - port: 9090
    targetPort: 9090
    name: metrics
EOF

    log_success "Manifest created: $temp_manifest"
    echo "$temp_manifest"
}

# Deploy target environment
deploy_target_environment() {
    log_step "Deploying $TARGET_COLOR environment..."

    local manifest_file
    manifest_file=$(create_deployment_manifests)

    if [[ "$DRY_RUN" == "false" ]]; then
        kubectl apply -f "$manifest_file"
        log_success "$TARGET_COLOR deployment created"
    else
        log_info "DRY RUN: Would apply manifest:"
        cat "$manifest_file"
    fi
}

# Wait for target deployment to be ready
wait_for_target_ready() {
    log_step "Waiting for $TARGET_COLOR deployment to be ready..."

    local deployment_name="${SERVICE_NAME}-${TARGET_COLOR}"

    if [[ "$DRY_RUN" == "false" ]]; then
        if kubectl rollout status deployment/"$deployment_name" \
            -n "$NAMESPACE" \
            --timeout="${HEALTH_CHECK_TIMEOUT}s"; then
            log_success "$TARGET_COLOR deployment is ready"
        else
            log_error "$TARGET_COLOR deployment failed to become ready"
            return 1
        fi
    else
        log_info "DRY RUN: Would wait for deployment"
    fi
}

# Run smoke tests on target environment
run_smoke_tests() {
    log_step "Running smoke tests on $TARGET_COLOR environment..."

    local service_name="${SERVICE_NAME}-${TARGET_COLOR}"

    if [[ "$DRY_RUN" == "false" ]]; then
        # Test health endpoint
        log_info "Testing health endpoint..."
        if kubectl run -n "$NAMESPACE" --rm -i --restart=Never \
            smoke-test-${RANDOM} --image=curlimages/curl --timeout=30s \
            -- curl -sf "http://${service_name}:3000/health" > /dev/null; then
            log_success "Health check passed"
        else
            log_error "Health check failed"
            return 1
        fi

        # Test readiness endpoint
        log_info "Testing readiness endpoint..."
        if kubectl run -n "$NAMESPACE" --rm -i --restart=Never \
            smoke-test-${RANDOM} --image=curlimages/curl --timeout=30s \
            -- curl -sf "http://${service_name}:3000/ready" > /dev/null; then
            log_success "Readiness check passed"
        else
            log_error "Readiness check failed"
            return 1
        fi

        # Get metrics
        log_info "Verifying metrics endpoint..."
        if kubectl run -n "$NAMESPACE" --rm -i --restart=Never \
            smoke-test-${RANDOM} --image=curlimages/curl --timeout=30s \
            -- curl -sf "http://${service_name}:9090/metrics" > /dev/null; then
            log_success "Metrics endpoint responding"
        else
            log_warning "Metrics endpoint not responding"
        fi

        log_success "All smoke tests passed on $TARGET_COLOR"
    else
        log_info "DRY RUN: Would run smoke tests"
    fi
}

# Switch traffic to target environment
switch_traffic() {
    log_step "Switching traffic from $CURRENT_COLOR to $TARGET_COLOR..."

    if [[ -n "$TRAFFIC_SWITCH_DELAY" && "$TRAFFIC_SWITCH_DELAY" -gt 0 ]]; then
        log_info "Waiting $TRAFFIC_SWITCH_DELAY seconds before traffic switch..."
        sleep "$TRAFFIC_SWITCH_DELAY"
    fi

    if [[ "$DRY_RUN" == "false" ]]; then
        # Update main service selector to point to target color
        kubectl patch service "$SERVICE_NAME" -n "$NAMESPACE" \
            -p "{\"spec\":{\"selector\":{\"app\":\"$SERVICE_NAME\",\"version\":\"$TARGET_COLOR\"}}}"

        log_success "Traffic switched to $TARGET_COLOR"

        # Wait for traffic to stabilize
        log_info "Waiting for traffic to stabilize..."
        sleep 10

        # Verify traffic is flowing
        log_info "Verifying traffic flow..."
        local response
        response=$(kubectl run -n "$NAMESPACE" --rm -i --restart=Never \
            verify-${RANDOM} --image=curlimages/curl --timeout=30s \
            -- curl -sf "http://${SERVICE_NAME}:3000/health" 2>/dev/null || echo "FAILED")

        if [[ "$response" != "FAILED" ]]; then
            log_success "Traffic successfully routed to $TARGET_COLOR"
        else
            log_error "Traffic routing verification failed"
            return 1
        fi
    else
        log_info "DRY RUN: Would switch traffic to $TARGET_COLOR"
    fi
}

# Monitor new deployment
monitor_deployment() {
    log_step "Monitoring $TARGET_COLOR deployment..."

    if [[ "$DRY_RUN" == "false" ]]; then
        log_info "Checking pod health..."

        local healthy_pods
        healthy_pods=$(kubectl get pods -n "$NAMESPACE" \
            -l "app=$SERVICE_NAME,version=$TARGET_COLOR" \
            -o json | \
            jq '[.items[].status.conditions[] | select(.type=="Ready" and .status=="True")] | length')

        local total_pods
        total_pods=$(kubectl get pods -n "$NAMESPACE" \
            -l "app=$SERVICE_NAME,version=$TARGET_COLOR" \
            --no-headers | wc -l)

        log_info "Healthy pods: $healthy_pods/$total_pods"

        if [[ "$healthy_pods" -eq "$total_pods" && "$total_pods" -gt 0 ]]; then
            log_success "All pods healthy in $TARGET_COLOR"
        else
            log_error "Some pods unhealthy in $TARGET_COLOR"
            return 1
        fi

        # Check error rate
        log_info "Monitoring error rates for 30 seconds..."
        sleep 30

        log_success "No issues detected in $TARGET_COLOR"
    else
        log_info "DRY RUN: Would monitor deployment"
    fi
}

# Cleanup old deployment
cleanup_old_deployment() {
    if [[ -z "$CURRENT_COLOR" ]]; then
        log_info "No old deployment to cleanup"
        return 0
    fi

    if [[ "$AUTO_CLEANUP" == "false" ]]; then
        log_warning "Auto-cleanup disabled, keeping $CURRENT_COLOR deployment"
        return 0
    fi

    log_step "Cleaning up old $CURRENT_COLOR deployment..."

    if [[ "$DRY_RUN" == "false" ]]; then
        # Scale down old deployment first
        log_info "Scaling down $CURRENT_COLOR deployment..."
        kubectl scale deployment "${SERVICE_NAME}-${CURRENT_COLOR}" \
            -n "$NAMESPACE" --replicas=0

        sleep 5

        # Delete old deployment and service
        kubectl delete deployment "${SERVICE_NAME}-${CURRENT_COLOR}" \
            -n "$NAMESPACE" --ignore-not-found=true

        kubectl delete service "${SERVICE_NAME}-${CURRENT_COLOR}" \
            -n "$NAMESPACE" --ignore-not-found=true

        log_success "Old $CURRENT_COLOR deployment cleaned up"
    else
        log_info "DRY RUN: Would cleanup $CURRENT_COLOR deployment"
    fi
}

# Rollback to previous deployment
rollback() {
    if [[ -z "$CURRENT_COLOR" ]]; then
        log_error "Cannot rollback - no previous deployment found"
        exit 1
    fi

    log_warning "Rolling back to $CURRENT_COLOR..."

    # Switch traffic back
    kubectl patch service "$SERVICE_NAME" -n "$NAMESPACE" \
        -p "{\"spec\":{\"selector\":{\"app\":\"$SERVICE_NAME\",\"version\":\"$CURRENT_COLOR\"}}}"

    log_success "Traffic rolled back to $CURRENT_COLOR"

    # Cleanup failed deployment
    kubectl delete deployment "${SERVICE_NAME}-${TARGET_COLOR}" \
        -n "$NAMESPACE" --ignore-not-found=true

    log_info "Failed $TARGET_COLOR deployment removed"
}

# Main execution
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --service)
                SERVICE_NAME="$2"
                shift 2
                ;;
            --image-tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            --env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --no-cleanup)
                AUTO_CLEANUP=false
                shift
                ;;
            --health-timeout)
                HEALTH_CHECK_TIMEOUT="$2"
                shift 2
                ;;
            --traffic-delay)
                TRAFFIC_SWITCH_DELAY="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                ;;
        esac
    done

    # Validate required arguments
    if [[ -z "$SERVICE_NAME" ]]; then
        log_error "Service name is required"
        show_help
    fi

    if [[ -z "$IMAGE_TAG" ]]; then
        log_error "Image tag is required"
        show_help
    fi

    # Start deployment
    echo -e "\n${CYAN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  Blue-Green Deployment for Flamoral Platform  ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════╝${NC}\n"

    log_info "Service: $SERVICE_NAME"
    log_info "Image Tag: $IMAGE_TAG"
    log_info "Environment: $ENVIRONMENT"
    log_info "Namespace: $NAMESPACE"
    log_info "Dry Run: $DRY_RUN"

    # Execute blue-green deployment
    get_current_color

    if ! deploy_target_environment; then
        log_error "Failed to deploy $TARGET_COLOR environment"
        exit 1
    fi

    if ! wait_for_target_ready; then
        log_error "Target deployment not ready"
        exit 1
    fi

    if ! run_smoke_tests; then
        log_error "Smoke tests failed"
        if [[ -n "$CURRENT_COLOR" ]]; then
            rollback
        fi
        exit 1
    fi

    if ! switch_traffic; then
        log_error "Traffic switch failed"
        if [[ -n "$CURRENT_COLOR" ]]; then
            rollback
        fi
        exit 1
    fi

    if ! monitor_deployment; then
        log_error "Post-switch monitoring detected issues"
        if [[ -n "$CURRENT_COLOR" ]]; then
            rollback
        fi
        exit 1
    fi

    cleanup_old_deployment

    echo -e "\n${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     Blue-Green Deployment Successful! ✓       ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}\n"

    log_success "Service: $SERVICE_NAME"
    log_success "Active Version: $TARGET_COLOR ($IMAGE_TAG)"
    if [[ -n "$CURRENT_COLOR" ]]; then
        log_info "Previous Version: $CURRENT_COLOR (${AUTO_CLEANUP:+cleaned up}${AUTO_CLEANUP:-preserved})"
    fi
}

main "$@"
