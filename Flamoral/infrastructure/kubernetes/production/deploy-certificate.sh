#!/bin/bash
# =============================================================================
# Deploy Flamoral TLS Certificate
# =============================================================================
# This script deploys the TLS certificate for flamoral.com
# Prerequisites: kubectl configured, cert-manager installed
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Flamoral TLS Certificate Deployment"
echo "========================================="
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed or not in PATH${NC}"
    exit 1
fi

# Check if we can connect to the cluster
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Cannot connect to Kubernetes cluster${NC}"
    exit 1
fi

echo -e "${GREEN}✓ kubectl is configured and connected${NC}"
echo ""

# Check if cert-manager is installed
echo "Checking cert-manager installation..."
if kubectl get namespace cert-manager &> /dev/null; then
    echo -e "${GREEN}✓ cert-manager namespace exists${NC}"
else
    echo -e "${RED}Error: cert-manager namespace not found${NC}"
    echo "Please install cert-manager first"
    exit 1
fi

# Check if cert-manager pods are running
if kubectl get pods -n cert-manager | grep -q "cert-manager.*Running"; then
    echo -e "${GREEN}✓ cert-manager pods are running${NC}"
else
    echo -e "${YELLOW}Warning: cert-manager pods may not be running${NC}"
fi
echo ""

# Check if flamoral namespace exists
echo "Checking flamoral namespace..."
if kubectl get namespace flamoral &> /dev/null; then
    echo -e "${GREEN}✓ flamoral namespace exists${NC}"
else
    echo -e "${YELLOW}Warning: flamoral namespace not found, creating it...${NC}"
    kubectl create namespace flamoral
    echo -e "${GREEN}✓ flamoral namespace created${NC}"
fi
echo ""

# Deploy ClusterIssuer (if not already deployed)
echo "Deploying ClusterIssuer..."
ISSUER_PATH="../../../../letsencrypt-prod-issuer.yaml"
if [ -f "$ISSUER_PATH" ]; then
    kubectl apply -f "$ISSUER_PATH"
    echo -e "${GREEN}✓ ClusterIssuer applied${NC}"
else
    echo -e "${YELLOW}Warning: ClusterIssuer file not found at $ISSUER_PATH${NC}"
    echo "Checking if ClusterIssuer already exists..."
fi

# Check ClusterIssuer status
echo "Verifying ClusterIssuer..."
sleep 2
if kubectl get clusterissuer letsencrypt-prod &> /dev/null; then
    ISSUER_STATUS=$(kubectl get clusterissuer letsencrypt-prod -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
    if [ "$ISSUER_STATUS" = "True" ]; then
        echo -e "${GREEN}✓ ClusterIssuer letsencrypt-prod is ready${NC}"
    else
        echo -e "${YELLOW}Warning: ClusterIssuer exists but may not be ready${NC}"
    fi
else
    echo -e "${RED}Error: ClusterIssuer letsencrypt-prod not found${NC}"
    exit 1
fi
echo ""

# Deploy Certificate
echo "Deploying Certificate resource..."
kubectl apply -f flamoral-certificate.yaml
echo -e "${GREEN}✓ Certificate resource applied${NC}"
echo ""

# Wait for certificate to be ready
echo "Waiting for certificate to be issued (this may take 2-5 minutes)..."
echo "You can press Ctrl+C to exit, the certificate will continue to process in the background"
echo ""

# Monitor certificate status
TIMEOUT=300  # 5 minutes
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    if kubectl get certificate flamoral-tls -n flamoral &> /dev/null; then
        CERT_READY=$(kubectl get certificate flamoral-tls -n flamoral -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "False")

        if [ "$CERT_READY" = "True" ]; then
            echo -e "${GREEN}✓ Certificate issued successfully!${NC}"
            echo ""
            echo "Certificate details:"
            kubectl get certificate flamoral-tls -n flamoral
            echo ""
            echo "Secret created:"
            kubectl get secret flamoral-tls -n flamoral
            echo ""
            exit 0
        else
            echo -n "."
            sleep 5
            ELAPSED=$((ELAPSED + 5))
        fi
    else
        echo -e "${RED}Error: Certificate resource not found${NC}"
        exit 1
    fi
done

echo ""
echo -e "${YELLOW}Certificate issuance is taking longer than expected${NC}"
echo "Check the status with: kubectl describe certificate flamoral-tls -n flamoral"
echo "Check challenges with: kubectl get challenges -n flamoral"
echo "Check cert-manager logs with: kubectl logs -n cert-manager -l app=cert-manager"
echo ""

# Show current status
echo "Current certificate status:"
kubectl describe certificate flamoral-tls -n flamoral

exit 1
