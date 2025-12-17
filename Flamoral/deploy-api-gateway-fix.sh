#!/bin/bash
# =============================================================================
# API Gateway Routing Fix - Deployment Script
# =============================================================================
# This script applies all ingress configuration fixes to resolve the
# api.flamoral.com/health 404 error
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="flamoral"
INGRESS_NAME="flamoral-main-ingress"

echo "=========================================================================="
echo "API Gateway Routing Fix - Deployment"
echo "=========================================================================="
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed or not in PATH${NC}"
    exit 1
fi

# Check if connected to cluster
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Not connected to a Kubernetes cluster${NC}"
    exit 1
fi

echo -e "${GREEN}Connected to Kubernetes cluster${NC}"
echo ""

# Check if namespace exists
if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
    echo -e "${YELLOW}Warning: Namespace '$NAMESPACE' does not exist${NC}"
    echo "Do you want to create it? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        kubectl create namespace "$NAMESPACE"
        echo -e "${GREEN}Namespace '$NAMESPACE' created${NC}"
    else
        echo -e "${RED}Aborting deployment${NC}"
        exit 1
    fi
fi

echo "Current ingress configuration:"
kubectl get ingress -n "$NAMESPACE" 2>/dev/null || echo "No ingress found"
echo ""

# Function to apply ingress and verify
apply_and_verify() {
    local file=$1
    local name=$2

    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}Warning: File not found: $file${NC}"
        return 1
    fi

    echo -e "${YELLOW}Applying $name...${NC}"
    if kubectl apply -f "$file"; then
        echo -e "${GREEN}Successfully applied $name${NC}"
        return 0
    else
        echo -e "${RED}Failed to apply $name${NC}"
        return 1
    fi
}

# Apply ingress configurations
echo "=========================================================================="
echo "Applying Ingress Configurations"
echo "=========================================================================="
echo ""

# Apply production ingress (primary)
apply_and_verify "infrastructure/kubernetes/production/ingress.yaml" "Production Ingress"
echo ""

# Wait for ingress to be updated
echo "Waiting for ingress to be updated..."
sleep 5

# Verify ingress configuration
echo "=========================================================================="
echo "Verification"
echo "=========================================================================="
echo ""

echo "Current ingress status:"
kubectl get ingress -n "$NAMESPACE"
echo ""

echo "Ingress details for $INGRESS_NAME:"
kubectl describe ingress "$INGRESS_NAME" -n "$NAMESPACE" 2>/dev/null || echo "Ingress not found"
echo ""

# Check API Gateway pods
echo "API Gateway pod status:"
kubectl get pods -n "$NAMESPACE" -l app=api-gateway
echo ""

# Check API Gateway service
echo "API Gateway service:"
kubectl get svc -n "$NAMESPACE" api-gateway
echo ""

# Test health endpoint (if port-forward is possible)
echo "=========================================================================="
echo "Testing Health Endpoint"
echo "=========================================================================="
echo ""

echo "To test the health endpoint locally, run:"
echo "  kubectl port-forward -n $NAMESPACE svc/api-gateway 4000:4000"
echo "  curl http://localhost:4000/health"
echo ""

echo "To test through ingress (after DNS/cert is ready):"
echo "  curl https://api.flamoral.com/health"
echo ""

# Check if we can test via port-forward automatically
echo "Would you like to test the health endpoint via port-forward? (y/n)"
read -r response
if [[ "$response" == "y" ]]; then
    echo "Starting port-forward..."
    kubectl port-forward -n "$NAMESPACE" svc/api-gateway 4000:4000 &
    PF_PID=$!

    # Wait for port-forward to be ready
    sleep 3

    echo "Testing health endpoint..."
    if curl -f http://localhost:4000/health; then
        echo -e "\n${GREEN}Health endpoint is working!${NC}"
    else
        echo -e "\n${RED}Health endpoint failed${NC}"
    fi

    # Kill port-forward
    kill $PF_PID 2>/dev/null || true
fi

echo ""
echo "=========================================================================="
echo "Deployment Complete"
echo "=========================================================================="
echo ""
echo -e "${GREEN}API Gateway routing fixes have been applied${NC}"
echo ""
echo "Next steps:"
echo "1. Verify pods are running: kubectl get pods -n $NAMESPACE -l app=api-gateway"
echo "2. Check pod logs: kubectl logs -n $NAMESPACE -l app=api-gateway"
echo "3. Test health endpoint: curl https://api.flamoral.com/health"
echo "4. Monitor ingress: kubectl get ingress -n $NAMESPACE -w"
echo ""
echo "For detailed information, see: API_GATEWAY_ROUTING_FIX_COMPLETE.md"
echo ""
