#!/bin/bash

###############################################################################
# Individual Service Deployment Script
#
# Deploys a single microservice with proper validation and health checks
#
# Usage:
#   ./deploy-service.sh --service SERVICE_NAME [OPTIONS]
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
NC='\033[0m'

# Configuration
SERVICE_NAME=""
ENVIRONMENT="production"
IMAGE_TAG="latest"
REPLICAS=""
DRY_RUN=false
WAIT_TIMEOUT=300
NAMESPACE="flamoral-dating"

# Logging
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
    cat << EOF
Deploy Individual Service

Usage: $0 --service SERVICE_NAME [OPTIONS]

Options:
  --service NAME         Service name (required)
  --env ENV             Environment (dev|staging|production)
  --image-tag TAG       Docker image tag [default: latest]
  --replicas NUM        Number of replicas to deploy
  --dry-run             Show deployment without applying
  --wait-timeout SEC    Timeout for waiting (default: 300)
  --namespace NS        Kubernetes namespace [default: flamoral-dating]
  --help                Show this help

Examples:
  $0 --service user-service --env production
  $0 --service api-gateway --image-tag v1.2.3 --replicas 5
EOF
    exit 0
}

# Validate service exists
validate_service() {
    local manifest_path="$PROJECT_ROOT/infrastructure/kubernetes/services/${SERVICE_NAME}.yaml"

    if [[ ! -f "$manifest_path" ]]; then
        log_error "Service manifest not found: $manifest_path"
        exit 1
    fi

    log_success "Service manifest found: $SERVICE_NAME"
}

# Build and push Docker image
build_and_push_image() {
    log_info "Building Docker image for $SERVICE_NAME..."

    local service_dir="$PROJECT_ROOT/backend/services/$SERVICE_NAME"

    if [[ ! -d "$service_dir" ]]; then
        log_error "Service directory not found: $service_dir"
        exit 1
    fi

    cd "$service_dir"

    # Get container registry
    local registry
    registry=$(az acr list --query "[0].loginServer" -o tsv)

    if [[ -z "$registry" ]]; then
        log_error "No Azure Container Registry found"
        exit 1
    fi

    log_info "Using registry: $registry"

    # Build image
    local image_name="$registry/flamoral/$SERVICE_NAME:$IMAGE_TAG"

    if [[ "$DRY_RUN" == "false" ]]; then
        log_info "Building image: $image_name"
        docker build -t "$image_name" .

        # Push image
        log_info "Pushing image: $image_name"
        az acr login --name "${registry%%.*}"
        docker push "$image_name"

        log_success "Image built and pushed: $image_name"
    else
        log_info "DRY RUN: Would build and push: $image_name"
    fi

    cd "$PROJECT_ROOT"
}

# Apply Kubernetes manifests
apply_manifests() {
    log_info "Applying Kubernetes manifests for $SERVICE_NAME..."

    local manifest_path="$PROJECT_ROOT/infrastructure/kubernetes/services/${SERVICE_NAME}.yaml"
    local temp_manifest="/tmp/${SERVICE_NAME}-${TIMESTAMP}.yaml"

    # Copy and customize manifest
    cp "$manifest_path" "$temp_manifest"

    # Update image tag
    sed -i "s|image: flamoral/${SERVICE_NAME}:.*|image: $registry/flamoral/${SERVICE_NAME}:$IMAGE_TAG|g" "$temp_manifest"

    # Update replicas if specified
    if [[ -n "$REPLICAS" ]]; then
        sed -i "s|replicas: [0-9]*|replicas: $REPLICAS|g" "$temp_manifest"
    fi

    if [[ "$DRY_RUN" == "false" ]]; then
        kubectl apply -f "$temp_manifest" -n "$NAMESPACE"
        log_success "Manifests applied successfully"
    else
        log_info "DRY RUN: Would apply manifests"
        kubectl apply -f "$temp_manifest" -n "$NAMESPACE" --dry-run=client
    fi

    rm -f "$temp_manifest"
}

# Wait for deployment
wait_for_deployment() {
    log_info "Waiting for deployment to complete..."

    if [[ "$DRY_RUN" == "false" ]]; then
        if kubectl rollout status deployment/"$SERVICE_NAME" \
            -n "$NAMESPACE" \
            --timeout="${WAIT_TIMEOUT}s"; then
            log_success "Deployment completed successfully"
        else
            log_error "Deployment failed or timed out"
            return 1
        fi
    else
        log_info "DRY RUN: Would wait for deployment"
    fi
}

# Run health checks
run_health_checks() {
    log_info "Running health checks for $SERVICE_NAME..."

    if [[ "$DRY_RUN" == "false" ]]; then
        # Get pod count
        local pod_count
        pod_count=$(kubectl get pods -n "$NAMESPACE" \
            -l "app=$SERVICE_NAME" \
            --field-selector=status.phase=Running \
            --no-headers | wc -l)

        log_info "Running pods: $pod_count"

        # Check pod health
        local healthy_pods
        healthy_pods=$(kubectl get pods -n "$NAMESPACE" \
            -l "app=$SERVICE_NAME" \
            -o json | \
            jq '[.items[].status.conditions[] | select(.type=="Ready" and .status=="True")] | length')

        if [[ "$healthy_pods" -eq "$pod_count" && "$pod_count" -gt 0 ]]; then
            log_success "All pods are healthy: $healthy_pods/$pod_count"
        else
            log_error "Some pods are unhealthy: $healthy_pods/$pod_count"
            return 1
        fi

        # Test service endpoint
        local service_port
        service_port=$(kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" \
            -o jsonpath='{.spec.ports[0].port}' 2>/dev/null || echo "")

        if [[ -n "$service_port" ]]; then
            log_info "Testing service endpoint..."
            if kubectl run -n "$NAMESPACE" --rm -i --restart=Never \
                test-curl-${RANDOM} --image=curlimages/curl --timeout=30s \
                -- curl -sf "http://${SERVICE_NAME}:${service_port}/health" > /dev/null; then
                log_success "Service endpoint is responding"
            else
                log_warning "Service endpoint health check failed"
            fi
        fi
    else
        log_info "DRY RUN: Would run health checks"
    fi
}

# Create deployment backup
create_backup() {
    log_info "Creating backup of current deployment..."

    local backup_dir="$PROJECT_ROOT/backups/deployments/$SERVICE_NAME"
    mkdir -p "$backup_dir"

    if kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" &> /dev/null; then
        kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" -o yaml > \
            "$backup_dir/${SERVICE_NAME}-${TIMESTAMP}.yaml"
        log_success "Backup created: $backup_dir/${SERVICE_NAME}-${TIMESTAMP}.yaml"
    else
        log_info "No existing deployment to backup"
    fi
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
            --env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --image-tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            --replicas)
                REPLICAS="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --wait-timeout)
                WAIT_TIMEOUT="$2"
                shift 2
                ;;
            --namespace)
                NAMESPACE="$2"
                shift 2
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

    log_info "Deploying service: $SERVICE_NAME"
    log_info "Environment: $ENVIRONMENT"
    log_info "Image tag: $IMAGE_TAG"
    log_info "Dry run: $DRY_RUN"

    # Execute deployment steps
    validate_service
    create_backup
    build_and_push_image
    apply_manifests
    wait_for_deployment
    run_health_checks

    log_success "Service $SERVICE_NAME deployed successfully!"
}

main "$@"
