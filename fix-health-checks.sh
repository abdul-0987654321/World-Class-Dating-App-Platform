#!/bin/bash
# Flamoral Dating Platform - Health Check Fix Script
# This script patches all service deployments to use correct health check paths

set -e  # Exit on error

NAMESPACE="flamoral-dating"
CLUSTER_NAME="flamoral-prod-aks"
RESOURCE_GROUP="flamoral-prod-rg"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if deployment exists
deployment_exists() {
    kubectl get deployment "$1" -n "$NAMESPACE" &> /dev/null
    return $?
}

# Function to patch deployment
patch_deployment() {
    local SERVICE=$1
    local LIVENESS_PATH=$2
    local READINESS_PATH=$3

    print_info "Patching $SERVICE..."

    if ! deployment_exists "$SERVICE"; then
        print_warning "$SERVICE deployment not found, skipping..."
        return 1
    fi

    # Try to patch
    if kubectl patch deployment "$SERVICE" -n "$NAMESPACE" --type='json' -p="[
      {\"op\": \"replace\", \"path\": \"/spec/template/spec/containers/0/livenessProbe/httpGet/path\", \"value\": \"$LIVENESS_PATH\"},
      {\"op\": \"replace\", \"path\": \"/spec/template/spec/containers/0/readinessProbe/httpGet/path\", \"value\": \"$READINESS_PATH\"}
    ]" 2>/dev/null; then
        print_success "$SERVICE patched successfully"
        return 0
    else
        print_error "Failed to patch $SERVICE - it may not have health probes defined"
        return 1
    fi
}

# Main script
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   Flamoral Dating Platform - Health Check Fix Script          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed or not in PATH"
    exit 1
fi

# Check if connected to correct cluster
CURRENT_CONTEXT=$(kubectl config current-context 2>/dev/null || echo "none")
print_info "Current kubectl context: $CURRENT_CONTEXT"

# Optionally connect to AKS cluster (uncomment if needed)
# print_info "Connecting to AKS cluster..."
# az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME" --overwrite-existing

# Verify namespace exists
if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
    print_error "Namespace $NAMESPACE does not exist"
    exit 1
fi

print_success "Namespace $NAMESPACE found"
echo ""

# List of Node.js/TypeScript services that use only /health
NODE_SERVICES=(
    "api-gateway"
    "user-service"
    "auth-service"
    "matching-service"
    "messaging-service"
    "media-service"
    "payment-service"
    "notification-service"
    "analytics-service"
    "moderation-service"
    "admin-service"
    "advertising-service"
    "automation-service"
    "realtime-service"
    "workflow-engine"
)

# List of AI services that support both /health and /ready
AI_SERVICES=(
    "ai-recommendation-service"
    "nlp-service"
    "content-generator"
    "photo-analysis"
    "fraud-detection"
)

SUCCESS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

print_info "Patching Node.js/TypeScript services with /health endpoint..."
echo ""

for SERVICE in "${NODE_SERVICES[@]}"; do
    if patch_deployment "$SERVICE" "/health" "/health"; then
        ((SUCCESS_COUNT++))
    else
        if deployment_exists "$SERVICE"; then
            ((FAIL_COUNT++))
        else
            ((SKIP_COUNT++))
        fi
    fi
    echo ""
done

print_info "Patching AI services with /health (liveness) and /ready (readiness)..."
echo ""

for SERVICE in "${AI_SERVICES[@]}"; do
    if patch_deployment "$SERVICE" "/health" "/ready"; then
        ((SUCCESS_COUNT++))
    else
        if deployment_exists "$SERVICE"; then
            ((FAIL_COUNT++))
        else
            ((SKIP_COUNT++))
        fi
    fi
    echo ""
done

# Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                        Summary                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
print_success "Successfully patched: $SUCCESS_COUNT services"
print_error "Failed to patch: $FAIL_COUNT services"
print_warning "Skipped (not found): $SKIP_COUNT services"
echo ""

# Wait for rollouts
if [ $SUCCESS_COUNT -gt 0 ]; then
    print_info "Waiting for rollouts to complete..."
    echo ""

    for SERVICE in "${NODE_SERVICES[@]}" "${AI_SERVICES[@]}"; do
        if deployment_exists "$SERVICE"; then
            print_info "Checking rollout status for $SERVICE..."
            if kubectl rollout status deployment/"$SERVICE" -n "$NAMESPACE" --timeout=30s 2>/dev/null; then
                print_success "$SERVICE rollout complete"
            else
                print_warning "$SERVICE rollout still in progress (check manually)"
            fi
        fi
    done
fi

echo ""
print_info "Verification commands:"
echo "  kubectl get pods -n $NAMESPACE"
echo "  kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | grep -i health"
echo ""

if [ $FAIL_COUNT -gt 0 ]; then
    print_warning "Some services failed to patch. This may be because:"
    echo "  1. The deployment doesn't have health probes defined"
    echo "  2. The container structure is different than expected"
    echo "  3. Permissions issues"
    echo ""
    echo "Check the fix document for troubleshooting steps:"
    echo "  KUBERNETES_HEALTH_CHECK_FIX.md"
    exit 1
fi

print_success "All health checks fixed successfully!"
exit 0
