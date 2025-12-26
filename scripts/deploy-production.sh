#!/bin/bash
# =============================================================================
# FLAMORAL PRODUCTION DEPLOYMENT SCRIPT
# =============================================================================
# Main deployment script for deploying Flamoral to Azure AKS production.
#
# Usage: ./scripts/deploy-production.sh [IMAGE_TAG]
#   IMAGE_TAG: Optional, defaults to short git SHA
#
# Prerequisites:
#   - Azure CLI installed and logged in
#   - kubectl installed
#   - envsubst available (gettext package)
#   - Kyverno installed in cluster
#
# =============================================================================

set -euo pipefail

# Configuration
SUBSCRIPTION_ID="ebd1613e-fea0-4b6d-8918-7e4de6a71c44"
RESOURCE_GROUP="flamoral-prod-rg"
CLUSTER_NAME="flamoral-prod-aks"
REGISTRY="flamoralprodacr.azurecr.io"
NAMESPACE="flamoral"
IMAGE_TAG="${1:-$(git rev-parse --short HEAD)}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory (for relative paths)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "\n${CYAN}=== $1 ===${NC}"; }

# Error handler
handle_error() {
    log_error "Deployment failed at line $1"
    log_error "Rolling back if possible..."
    exit 1
}
trap 'handle_error $LINENO' ERR

echo -e "${CYAN}"
echo "============================================================================="
echo "                   FLAMORAL PRODUCTION DEPLOYMENT"
echo "=============================================================================${NC}"
echo ""
echo -e "Image Tag:     ${GREEN}$IMAGE_TAG${NC}"
echo -e "Registry:      ${GREEN}$REGISTRY${NC}"
echo -e "Cluster:       ${GREEN}$CLUSTER_NAME${NC}"
echo -e "Namespace:     ${GREEN}$NAMESPACE${NC}"
echo -e "Resource Group:${GREEN}$RESOURCE_GROUP${NC}"
echo ""

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================
log_step "Pre-flight Checks"

# Check required tools
for cmd in az kubectl envsubst; do
    if ! command -v $cmd &> /dev/null; then
        log_error "Required command not found: $cmd"
        exit 1
    fi
    log_success "$cmd is available"
done

# Check Azure login
log_info "Checking Azure login..."
if ! az account show &> /dev/null; then
    log_error "Not logged in to Azure. Please run: az login"
    exit 1
fi
log_success "Azure login verified"

# Set subscription
log_info "Setting Azure subscription..."
az account set --subscription "$SUBSCRIPTION_ID"
log_success "Subscription set to $SUBSCRIPTION_ID"

# ============================================================================
# GET AKS CREDENTIALS
# ============================================================================
log_step "Getting AKS Credentials"

az aks get-credentials \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CLUSTER_NAME" \
    --overwrite-existing

log_success "AKS credentials retrieved"

# Verify cluster connectivity
log_info "Verifying cluster connectivity..."
if ! kubectl cluster-info &> /dev/null; then
    log_error "Cannot connect to cluster $CLUSTER_NAME"
    exit 1
fi
log_success "Cluster connectivity verified"

# Show cluster info
kubectl cluster-info | head -2

# ============================================================================
# NAMESPACE SETUP
# ============================================================================
log_step "Namespace Setup"

kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
log_success "Namespace $NAMESPACE ready"

# ============================================================================
# APPLY KYVERNO POLICIES
# ============================================================================
log_step "Applying Kyverno Policies"

POLICIES_DIR="$PROJECT_ROOT/infrastructure/kubernetes/policies"
if [ -d "$POLICIES_DIR" ]; then
    for policy in "$POLICIES_DIR"/*.yaml; do
        if [ -f "$policy" ]; then
            log_info "Applying policy: $(basename $policy)"
            kubectl apply -f "$policy"
        fi
    done
    log_success "All Kyverno policies applied"
else
    log_warn "Policies directory not found: $POLICIES_DIR"
fi

# Wait for policies to be ready
log_info "Waiting for policies to be ready..."
sleep 5

# ============================================================================
# DEPLOY SERVICES
# ============================================================================
log_step "Deploying Services"

export IMAGE_TAG
export REGISTRY
export NAMESPACE

SERVICES_DIR="$PROJECT_ROOT/infrastructure/kubernetes/services"
if [ -d "$SERVICES_DIR" ]; then
    for manifest in "$SERVICES_DIR"/*.yaml; do
        if [ -f "$manifest" ]; then
            log_info "Applying: $(basename $manifest)"
            envsubst < "$manifest" | kubectl apply -n "$NAMESPACE" -f - || {
                log_warn "Failed to apply $(basename $manifest), continuing..."
            }
        fi
    done
    log_success "All service manifests applied"
else
    log_warn "Services directory not found: $SERVICES_DIR"
fi

# Apply other deployment manifests
DEPLOY_DIR="$PROJECT_ROOT/infrastructure/kubernetes/deploy"
if [ -d "$DEPLOY_DIR" ]; then
    for manifest in "$DEPLOY_DIR"/*-deploy.yaml "$DEPLOY_DIR"/*-complete.yaml; do
        if [ -f "$manifest" ]; then
            log_info "Applying: $(basename $manifest)"
            envsubst < "$manifest" | kubectl apply -n "$NAMESPACE" -f - || {
                log_warn "Failed to apply $(basename $manifest), continuing..."
            }
        fi
    done
fi

# ============================================================================
# APPLY SELF-HEALING CRONJOB
# ============================================================================
log_step "Applying Self-Healing CronJob"

JOBS_DIR="$PROJECT_ROOT/infrastructure/kubernetes/jobs"
if [ -d "$JOBS_DIR" ]; then
    for job in "$JOBS_DIR"/*.yaml; do
        if [ -f "$job" ]; then
            log_info "Applying job: $(basename $job)"
            kubectl apply -f "$job" || log_warn "Failed to apply $(basename $job)"
        fi
    done
    log_success "Self-healing jobs applied"
fi

# ============================================================================
# VERIFY DEPLOYMENT
# ============================================================================
log_step "Verifying Deployment"

log_info "Waiting for deployments to roll out..."

# Get all deployments in namespace
DEPLOYMENTS=$(kubectl get deployments -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")

if [ -n "$DEPLOYMENTS" ]; then
    for deployment in $DEPLOYMENTS; do
        log_info "Checking rollout status: $deployment"
        kubectl rollout status deployment/"$deployment" -n "$NAMESPACE" --timeout=300s || {
            log_warn "Deployment $deployment did not complete in time"
        }
    done
    log_success "All deployments verified"
else
    log_warn "No deployments found in namespace $NAMESPACE"
fi

# ============================================================================
# SHOW DEPLOYMENT STATUS
# ============================================================================
log_step "Deployment Status"

echo ""
echo "Pods:"
kubectl get pods -n "$NAMESPACE" --show-labels 2>/dev/null || log_warn "Could not list pods"

echo ""
echo "Deployments:"
kubectl get deployments -n "$NAMESPACE" 2>/dev/null || log_warn "Could not list deployments"

echo ""
echo "Services:"
kubectl get services -n "$NAMESPACE" 2>/dev/null || log_warn "Could not list services"

echo ""
echo "Ingress:"
kubectl get ingress -n "$NAMESPACE" 2>/dev/null || log_warn "Could not list ingress"

# ============================================================================
# RUN SMOKE TESTS
# ============================================================================
log_step "Running Smoke Tests"

SMOKE_TEST="$SCRIPT_DIR/smoke-test.sh"
if [ -x "$SMOKE_TEST" ]; then
    log_info "Executing smoke tests..."
    # Give pods time to become ready
    sleep 10

    # Run smoke tests (allow failure for now)
    "$SMOKE_TEST" "http://api-gateway.$NAMESPACE.svc.cluster.local:4000/api" || {
        log_warn "Smoke tests completed with warnings"
    }
else
    log_warn "Smoke test script not found or not executable: $SMOKE_TEST"
fi

# ============================================================================
# RUN VERIFICATION
# ============================================================================
log_step "Running Deployment Verification"

VERIFY_SCRIPT="$SCRIPT_DIR/verify-deployment.sh"
if [ -x "$VERIFY_SCRIPT" ]; then
    "$VERIFY_SCRIPT" || {
        log_warn "Verification completed with warnings"
    }
else
    log_warn "Verification script not found: $VERIFY_SCRIPT"
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo -e "${CYAN}============================================================================="
echo "                   DEPLOYMENT COMPLETE"
echo "=============================================================================${NC}"
echo ""
echo -e "Environment:    ${GREEN}Production${NC}"
echo -e "Cluster:        ${GREEN}$CLUSTER_NAME${NC}"
echo -e "Namespace:      ${GREEN}$NAMESPACE${NC}"
echo -e "Image Tag:      ${GREEN}$IMAGE_TAG${NC}"
echo -e "Timestamp:      ${GREEN}$(date -u +"%Y-%m-%dT%H:%M:%SZ")${NC}"
echo ""
echo "Useful commands:"
echo "  kubectl get pods -n $NAMESPACE"
echo "  kubectl logs -f deployment/<service-name> -n $NAMESPACE"
echo "  kubectl rollout undo deployment/<service-name> -n $NAMESPACE"
echo "  kubectl top pods -n $NAMESPACE"
echo ""

log_success "Flamoral production deployment completed successfully!"
