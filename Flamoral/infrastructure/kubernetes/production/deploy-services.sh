#!/bin/bash

# =============================================================================
# Flamoral Platform - Production Services Deployment Script
# =============================================================================
# This script deploys all backend services to Kubernetes in the correct order
# with health checks and validation
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="flamoral"
TIMEOUT=300  # 5 minutes timeout for deployments
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=10

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="${SCRIPT_DIR}/deployments"
SERVICES_DIR="${SCRIPT_DIR}/services"

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if kubectl is available
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        log_warning "jq is not installed. Health checks will be limited."
    fi

    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Verify namespace exists
verify_namespace() {
    log_info "Verifying namespace: ${NAMESPACE}"

    if ! kubectl get namespace ${NAMESPACE} &> /dev/null; then
        log_error "Namespace '${NAMESPACE}' does not exist"
        log_info "Creating namespace..."
        kubectl create namespace ${NAMESPACE}
    fi

    log_success "Namespace verified"
}

# Wait for deployment to be ready
wait_for_deployment() {
    local deployment=$1
    local namespace=$2
    local timeout=${3:-$TIMEOUT}

    log_info "Waiting for deployment ${deployment} to be ready (timeout: ${timeout}s)..."

    if kubectl rollout status deployment/${deployment} -n ${namespace} --timeout=${timeout}s; then
        log_success "Deployment ${deployment} is ready"
        return 0
    else
        log_error "Deployment ${deployment} failed to become ready within ${timeout}s"
        return 1
    fi
}

# Check service health endpoint
check_health_endpoint() {
    local service=$1
    local port=$2
    local namespace=$3

    log_info "Checking health endpoint for ${service}:${port}..."

    # Get pod name for the service
    local pod=$(kubectl get pods -n ${namespace} -l app=${service} -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

    if [ -z "$pod" ]; then
        log_warning "No pods found for service ${service}"
        return 1
    fi

    # Try to check health endpoint
    for i in $(seq 1 ${HEALTH_CHECK_RETRIES}); do
        if kubectl exec -n ${namespace} ${pod} -- wget -q -O- http://localhost:${port}/health &> /dev/null; then
            log_success "Health check passed for ${service}"
            return 0
        fi

        if [ $i -lt ${HEALTH_CHECK_RETRIES} ]; then
            log_info "Health check attempt $i/${HEALTH_CHECK_RETRIES} failed, retrying in ${HEALTH_CHECK_INTERVAL}s..."
            sleep ${HEALTH_CHECK_INTERVAL}
        fi
    done

    log_warning "Health check failed for ${service} after ${HEALTH_CHECK_RETRIES} attempts"
    return 1
}

# Deploy a service
deploy_service() {
    local service=$1
    local port=$2

    log_info "===================================================================="
    log_info "Deploying ${service}..."
    log_info "===================================================================="

    # Apply deployment
    if kubectl apply -f "${DEPLOYMENT_DIR}/${service}.yaml" -n ${NAMESPACE}; then
        log_success "Deployment manifest applied for ${service}"
    else
        log_error "Failed to apply deployment manifest for ${service}"
        return 1
    fi

    # Wait for deployment to be ready
    if ! wait_for_deployment ${service} ${NAMESPACE}; then
        log_error "Deployment failed for ${service}"

        # Show recent events for troubleshooting
        log_info "Recent events for ${service}:"
        kubectl get events -n ${NAMESPACE} --field-selector involvedObject.name=${service} --sort-by='.lastTimestamp' | tail -10

        # Show pod logs
        local pod=$(kubectl get pods -n ${NAMESPACE} -l app=${service} -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
        if [ -n "$pod" ]; then
            log_info "Recent logs for ${service}:"
            kubectl logs -n ${NAMESPACE} ${pod} --tail=50 || true
        fi

        return 1
    fi

    # Check health endpoint (optional - don't fail deployment if health check fails)
    check_health_endpoint ${service} ${port} ${NAMESPACE} || true

    log_success "Successfully deployed ${service}"
    echo ""
    return 0
}

# Deploy all services
deploy_all_services() {
    log_info "===================================================================="
    log_info "Starting deployment of all Flamoral services"
    log_info "===================================================================="
    echo ""

    local failed_services=()

    # Phase 1: Deploy infrastructure services first (auth, database dependencies)
    log_info "Phase 1: Deploying critical infrastructure services..."

    if ! deploy_service "auth-service" "3001"; then
        failed_services+=("auth-service")
    fi

    # Phase 2: Deploy high-traffic services
    log_info "Phase 2: Deploying high-traffic services..."

    if ! deploy_service "user-service" "3002"; then
        failed_services+=("user-service")
    fi

    if ! deploy_service "api-gateway" "4000"; then
        failed_services+=("api-gateway")
    fi

    # Phase 3: Deploy medium-traffic services
    log_info "Phase 3: Deploying medium-traffic services..."

    deploy_service "matching-service" "3009" || failed_services+=("matching-service")
    deploy_service "messaging-service" "3004" || failed_services+=("messaging-service")
    deploy_service "payment-service" "3005" || failed_services+=("payment-service")
    deploy_service "media-service" "3006" || failed_services+=("media-service")
    deploy_service "notification-service" "3012" || failed_services+=("notification-service")
    deploy_service "realtime-service" "8081" || failed_services+=("realtime-service")

    # Phase 4: Deploy low-traffic services
    log_info "Phase 4: Deploying low-traffic services..."

    deploy_service "analytics-service" "3007" || failed_services+=("analytics-service")
    deploy_service "moderation-service" "3008" || failed_services+=("moderation-service")
    deploy_service "admin-service" "3010" || failed_services+=("admin-service")
    deploy_service "advertising-service" "3011" || failed_services+=("advertising-service")
    deploy_service "workflow-engine" "3013" || failed_services+=("workflow-engine")

    # Deploy all services at once
    log_info "Ensuring all services are created..."
    kubectl apply -f "${SERVICES_DIR}/all-services.yaml" -n ${NAMESPACE}

    # Summary
    echo ""
    log_info "===================================================================="
    log_info "Deployment Summary"
    log_info "===================================================================="

    if [ ${#failed_services[@]} -eq 0 ]; then
        log_success "All services deployed successfully!"
    else
        log_warning "Deployment completed with ${#failed_services[@]} failures:"
        for service in "${failed_services[@]}"; do
            log_error "  - ${service}"
        done
        echo ""
        log_warning "Please check the logs above for error details"
    fi
}

# Show deployment status
show_status() {
    log_info "===================================================================="
    log_info "Current Deployment Status"
    log_info "===================================================================="
    echo ""

    log_info "Deployments:"
    kubectl get deployments -n ${NAMESPACE} -o wide
    echo ""

    log_info "Pods:"
    kubectl get pods -n ${NAMESPACE} -o wide
    echo ""

    log_info "Services:"
    kubectl get services -n ${NAMESPACE}
    echo ""
}

# Validate all deployments
validate_deployments() {
    log_info "===================================================================="
    log_info "Validating Deployments"
    log_info "===================================================================="

    local services=(
        "api-gateway:4000"
        "auth-service:3001"
        "user-service:3002"
        "matching-service:3009"
        "messaging-service:3004"
        "payment-service:3005"
        "media-service:3006"
        "analytics-service:3007"
        "moderation-service:3008"
        "admin-service:3010"
        "advertising-service:3011"
        "notification-service:3012"
        "workflow-engine:3013"
        "realtime-service:8081"
    )

    local failed_validations=()

    for service_port in "${services[@]}"; do
        IFS=':' read -r service port <<< "$service_port"

        # Check if deployment exists
        if ! kubectl get deployment ${service} -n ${NAMESPACE} &> /dev/null; then
            log_error "Deployment ${service} not found"
            failed_validations+=("${service}")
            continue
        fi

        # Check if pods are running
        local ready_pods=$(kubectl get deployment ${service} -n ${NAMESPACE} -o jsonpath='{.status.readyReplicas}')
        local desired_pods=$(kubectl get deployment ${service} -n ${NAMESPACE} -o jsonpath='{.spec.replicas}')

        if [ "${ready_pods}" = "${desired_pods}" ]; then
            log_success "${service}: ${ready_pods}/${desired_pods} pods ready"
        else
            log_error "${service}: ${ready_pods:-0}/${desired_pods} pods ready"
            failed_validations+=("${service}")
        fi
    done

    echo ""
    if [ ${#failed_validations[@]} -eq 0 ]; then
        log_success "All deployments validated successfully!"
        return 0
    else
        log_error "Validation failed for ${#failed_validations[@]} services"
        return 1
    fi
}

# Rollback all services
rollback_all() {
    log_warning "Rolling back all deployments..."

    local services=(
        "api-gateway"
        "auth-service"
        "user-service"
        "matching-service"
        "messaging-service"
        "payment-service"
        "media-service"
        "analytics-service"
        "moderation-service"
        "admin-service"
        "advertising-service"
        "notification-service"
        "workflow-engine"
        "realtime-service"
    )

    for service in "${services[@]}"; do
        if kubectl get deployment ${service} -n ${NAMESPACE} &> /dev/null; then
            log_info "Rolling back ${service}..."
            kubectl rollout undo deployment/${service} -n ${NAMESPACE} || true
        fi
    done

    log_success "Rollback completed"
}

# =============================================================================
# Main Script
# =============================================================================

main() {
    local command=${1:-deploy}

    case $command in
        deploy)
            check_prerequisites
            verify_namespace
            deploy_all_services
            show_status
            validate_deployments
            ;;
        status)
            show_status
            ;;
        validate)
            validate_deployments
            ;;
        rollback)
            rollback_all
            ;;
        *)
            echo "Usage: $0 {deploy|status|validate|rollback}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Deploy all services to Kubernetes"
            echo "  status   - Show current deployment status"
            echo "  validate - Validate all deployments are healthy"
            echo "  rollback - Rollback all deployments to previous version"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
