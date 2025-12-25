#!/bin/bash
# =============================================================================
# FLAMORAL Production Deployment Script
# =============================================================================
# Usage: ./scripts/deploy.sh [environment] [version]
#   environment: production (default), staging, development
#   version: git SHA (default) or semantic version (v1.2.3)
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ACR_NAME="flamoralprodacr"
ACR_REGISTRY="${ACR_NAME}.azurecr.io"
RESOURCE_GROUP_PREFIX="flamoral"

# Parse arguments
ENVIRONMENT="${1:-production}"
VERSION="${2:-$(git rev-parse HEAD)}"
SHORT_SHA=$(echo "$VERSION" | cut -c1-8)

# Set environment-specific values
case $ENVIRONMENT in
  production)
    RESOURCE_GROUP="${RESOURCE_GROUP_PREFIX}-prod-rg"
    AKS_CLUSTER="${RESOURCE_GROUP_PREFIX}-prod-aks"
    NAMESPACE="${RESOURCE_GROUP_PREFIX}-prod"
    ;;
  staging)
    RESOURCE_GROUP="${RESOURCE_GROUP_PREFIX}-staging-rg"
    AKS_CLUSTER="${RESOURCE_GROUP_PREFIX}-staging-aks"
    NAMESPACE="${RESOURCE_GROUP_PREFIX}-staging"
    ;;
  development)
    RESOURCE_GROUP="${RESOURCE_GROUP_PREFIX}-dev-rg"
    AKS_CLUSTER="${RESOURCE_GROUP_PREFIX}-dev-aks"
    NAMESPACE="${RESOURCE_GROUP_PREFIX}-dev"
    ;;
  *)
    echo -e "${RED}Error: Unknown environment '$ENVIRONMENT'${NC}"
    echo "Valid options: production, staging, development"
    exit 1
    ;;
esac

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}FLAMORAL Deployment Script${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""
echo -e "Environment:  ${GREEN}$ENVIRONMENT${NC}"
echo -e "Version:      ${GREEN}$VERSION${NC}"
echo -e "Short SHA:    ${GREEN}$SHORT_SHA${NC}"
echo -e "ACR:          ${GREEN}$ACR_REGISTRY${NC}"
echo -e "AKS Cluster:  ${GREEN}$AKS_CLUSTER${NC}"
echo -e "Namespace:    ${GREEN}$NAMESPACE${NC}"
echo ""

# Confirm deployment
if [ "$ENVIRONMENT" == "production" ]; then
  echo -e "${YELLOW}WARNING: You are about to deploy to PRODUCTION${NC}"
  read -p "Are you sure you want to continue? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
  fi
fi

# Step 1: Login to Azure
echo -e "\n${BLUE}Step 1: Logging in to Azure...${NC}"
az account show > /dev/null 2>&1 || az login
echo -e "${GREEN}Logged in to Azure${NC}"

# Step 2: Login to ACR
echo -e "\n${BLUE}Step 2: Logging in to Azure Container Registry...${NC}"
az acr login --name $ACR_NAME
echo -e "${GREEN}Logged in to ACR${NC}"

# Step 3: Build and push web-app image
echo -e "\n${BLUE}Step 3: Building and pushing web-app image...${NC}"
cd apps/web-app

echo "Building Docker image..."
docker build \
  -t ${ACR_REGISTRY}/web-app:${VERSION} \
  -t ${ACR_REGISTRY}/web-app:${SHORT_SHA} \
  -t ${ACR_REGISTRY}/web-app:latest \
  --build-arg CACHE_BUST=$(date +%s) \
  .

echo "Pushing images to ACR..."
docker push ${ACR_REGISTRY}/web-app:${VERSION}
docker push ${ACR_REGISTRY}/web-app:${SHORT_SHA}
docker push ${ACR_REGISTRY}/web-app:latest

cd ../..
echo -e "${GREEN}Images pushed successfully${NC}"

# Step 4: Get AKS credentials
echo -e "\n${BLUE}Step 4: Getting AKS credentials...${NC}"
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --overwrite-existing
echo -e "${GREEN}AKS credentials configured${NC}"

# Step 5: Deploy to Kubernetes
echo -e "\n${BLUE}Step 5: Deploying to Kubernetes...${NC}"

# Replace IMAGE_TAG placeholder in deployment manifest
export IMAGE_TAG=$VERSION
envsubst < infrastructure/kubernetes/web-app-deployment.yaml | kubectl apply -f -

echo -e "${GREEN}Deployment applied${NC}"

# Step 6: Wait for rollout
echo -e "\n${BLUE}Step 6: Waiting for rollout to complete...${NC}"
kubectl rollout status deployment/web-app -n $NAMESPACE --timeout=300s
echo -e "${GREEN}Rollout complete${NC}"

# Step 7: Verify deployment
echo -e "\n${BLUE}Step 7: Verifying deployment...${NC}"
echo ""
echo "Pods:"
kubectl get pods -n $NAMESPACE -l app=web-app
echo ""
echo "Deployment:"
kubectl get deployment web-app -n $NAMESPACE
echo ""

# Step 8: Health check
echo -e "\n${BLUE}Step 8: Running health check...${NC}"
POD_NAME=$(kubectl get pods -n $NAMESPACE -l app=web-app -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [ -n "$POD_NAME" ]; then
  echo "Checking health endpoint on pod $POD_NAME..."
  HEALTH_STATUS=$(kubectl exec -n $NAMESPACE $POD_NAME -- wget -qO- http://localhost:80/health 2>/dev/null || echo "FAILED")
  if [ "$HEALTH_STATUS" == "OK" ]; then
    echo -e "${GREEN}Health check passed${NC}"
  else
    echo -e "${YELLOW}Health check returned: $HEALTH_STATUS${NC}"
  fi
else
  echo -e "${YELLOW}No pods found, skipping health check${NC}"
fi

# Summary
echo -e "\n${BLUE}==============================================================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""
echo -e "Deployed version: ${GREEN}$VERSION${NC}"
echo -e "Environment:      ${GREEN}$ENVIRONMENT${NC}"
echo ""
echo "Useful commands:"
echo "  kubectl get pods -n $NAMESPACE"
echo "  kubectl logs -f deployment/web-app -n $NAMESPACE"
echo "  kubectl rollout undo deployment/web-app -n $NAMESPACE"
echo ""
