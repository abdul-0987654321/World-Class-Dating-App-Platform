#!/bin/bash
# =============================================================================
# FLAMORAL Rollback Script
# =============================================================================
# Usage: ./scripts/rollback.sh [environment] [revision]
#   environment: production (default), staging, development
#   revision: specific revision number (optional, defaults to previous)
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP_PREFIX="flamoral"

# Parse arguments
ENVIRONMENT="${1:-production}"
REVISION="${2:-}"

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
echo -e "${BLUE}FLAMORAL Rollback Script${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""
echo -e "Environment:  ${GREEN}$ENVIRONMENT${NC}"
echo -e "AKS Cluster:  ${GREEN}$AKS_CLUSTER${NC}"
echo -e "Namespace:    ${GREEN}$NAMESPACE${NC}"

# Get AKS credentials
echo -e "\n${BLUE}Getting AKS credentials...${NC}"
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --overwrite-existing

# Show rollout history
echo -e "\n${BLUE}Deployment History:${NC}"
kubectl rollout history deployment/web-app -n $NAMESPACE

# Confirm rollback
if [ "$ENVIRONMENT" == "production" ]; then
  echo -e "\n${YELLOW}WARNING: You are about to rollback PRODUCTION${NC}"
fi

if [ -n "$REVISION" ]; then
  echo -e "Rolling back to revision: ${GREEN}$REVISION${NC}"
  read -p "Are you sure you want to continue? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Rollback cancelled."
    exit 0
  fi
  kubectl rollout undo deployment/web-app -n $NAMESPACE --to-revision=$REVISION
else
  echo -e "Rolling back to previous version"
  read -p "Are you sure you want to continue? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Rollback cancelled."
    exit 0
  fi
  kubectl rollout undo deployment/web-app -n $NAMESPACE
fi

# Wait for rollback
echo -e "\n${BLUE}Waiting for rollback to complete...${NC}"
kubectl rollout status deployment/web-app -n $NAMESPACE --timeout=300s

# Verify rollback
echo -e "\n${BLUE}Verifying rollback...${NC}"
kubectl get pods -n $NAMESPACE -l app=web-app
echo ""
kubectl get deployment web-app -n $NAMESPACE

echo -e "\n${GREEN}Rollback Complete!${NC}"
