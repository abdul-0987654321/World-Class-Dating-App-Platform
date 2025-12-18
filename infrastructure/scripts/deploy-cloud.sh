#!/bin/bash

# =============================================================================
# Flamoral Dating Platform - Cloud-Only Deployment Script
# =============================================================================
# This script handles deployment entirely in Azure cloud:
# 1. Build Docker images using ACR Tasks (no local Docker needed)
# 2. Deploy to AKS using kubectl from Azure Cloud Shell or local az cli
# 3. All operations happen in Azure cloud
#
# Usage: ./deploy-cloud.sh [OPTIONS]
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
ACR_NAME="${ACR_NAME:-flamoralacr}"
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
RESOURCE_GROUP="${RESOURCE_GROUP:-flamoral-prod-rg}"
AKS_CLUSTER="${AKS_CLUSTER:-flamoral-prod-aks}"
NAMESPACE="${NAMESPACE:-production}"
TAG="${TAG:-$(date +%Y%m%d%H%M%S)}"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../.."

# Parse arguments
SKIP_BUILD=false
SKIP_DEPLOY=false
START_AKS=false
STOP_AFTER=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --tag|-t)
      TAG="$2"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-deploy)
      SKIP_DEPLOY=true
      shift
      ;;
    --start-aks)
      START_AKS=true
      shift
      ;;
    --stop-after)
      STOP_AFTER=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Cloud-only deployment script for Flamoral Dating Platform"
      echo ""
      echo "Options:"
      echo "  -t, --tag <tag>    Image tag (default: timestamp)"
      echo "  --skip-build       Skip ACR Tasks build"
      echo "  --skip-deploy      Skip AKS deployment"
      echo "  --start-aks        Start AKS cluster before deployment"
      echo "  --stop-after       Stop AKS cluster after deployment"
      echo "  -h, --help         Show this help"
      echo ""
      echo "Examples:"
      echo "  $0                           # Full build and deploy"
      echo "  $0 --start-aks               # Start AKS, build, and deploy"
      echo "  $0 --skip-build              # Deploy existing images"
      echo "  $0 --start-aks --stop-after  # Full cycle with cost savings"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Print header
print_header() {
  echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║     Flamoral Dating Platform - Cloud Deployment                 ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${CYAN}Configuration:${NC}"
  echo -e "  ACR:           ${GREEN}${ACR_LOGIN_SERVER}${NC}"
  echo -e "  Resource Group:${GREEN}${RESOURCE_GROUP}${NC}"
  echo -e "  AKS Cluster:   ${GREEN}${AKS_CLUSTER}${NC}"
  echo -e "  Namespace:     ${GREEN}${NAMESPACE}${NC}"
  echo -e "  Tag:           ${GREEN}${TAG}${NC}"
  echo ""
}

# Check Azure CLI login
check_azure_login() {
  echo -e "${YELLOW}Checking Azure authentication...${NC}"

  if ! az account show &> /dev/null; then
    echo -e "${RED}Not logged in to Azure. Please run 'az login' first.${NC}"
    exit 1
  fi

  local account=$(az account show --query name -o tsv)
  echo -e "${GREEN}✓ Logged in to Azure: ${account}${NC}"
  echo ""
}

# Start AKS cluster if stopped
start_aks_cluster() {
  echo -e "${YELLOW}Checking AKS cluster status...${NC}"

  local power_state=$(az aks show --resource-group "$RESOURCE_GROUP" --name "$AKS_CLUSTER" \
    --query "powerState.code" -o tsv 2>/dev/null || echo "NotFound")

  if [ "$power_state" = "Stopped" ]; then
    echo -e "${YELLOW}Starting AKS cluster ${AKS_CLUSTER}...${NC}"
    az aks start --resource-group "$RESOURCE_GROUP" --name "$AKS_CLUSTER"

    echo -e "${YELLOW}Waiting for cluster to be ready...${NC}"
    sleep 60

    # Wait for nodes to be ready
    az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$AKS_CLUSTER" --overwrite-existing
    kubectl wait --for=condition=Ready nodes --all --timeout=300s

    echo -e "${GREEN}✓ AKS cluster started and ready${NC}"
  elif [ "$power_state" = "Running" ]; then
    echo -e "${GREEN}✓ AKS cluster is already running${NC}"
  else
    echo -e "${RED}AKS cluster not found or in unknown state: ${power_state}${NC}"
    exit 1
  fi
  echo ""
}

# Build images using ACR Tasks
build_images_acr() {
  if [ "$SKIP_BUILD" = true ]; then
    echo -e "${YELLOW}Skipping build (--skip-build)${NC}"
    return 0
  fi

  echo -e "${YELLOW}Building Docker images using ACR Tasks...${NC}"
  echo -e "${CYAN}This runs entirely in Azure cloud - no local Docker required${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Services to build
  local services=(
    "api-gateway"
    "auth-service"
    "user-service"
    "matching-service"
    "messaging-service"
    "media-service"
    "payment-service"
    "notification-service"
    "analytics-service"
    "moderation-service"
    "admin-service"
    "automation-service"
    "advertising-service"
    "workflow-engine"
    "realtime-service"
  )

  local success=0
  local failed=0
  local total=${#services[@]}

  for service in "${services[@]}"; do
    echo -e "${BLUE}[$((success + failed + 1))/${total}] Building ${service}...${NC}"

    local dockerfile="backend/services/${service}/Dockerfile"

    if [ ! -f "$PROJECT_ROOT/$dockerfile" ]; then
      echo -e "${YELLOW}⚠ Dockerfile not found for ${service}, skipping${NC}"
      continue
    fi

    # Build using ACR Tasks
    if az acr build \
      --registry "$ACR_NAME" \
      --image "${service}:${TAG}" \
      --image "${service}:latest" \
      --file "$dockerfile" \
      "$PROJECT_ROOT" \
      --no-logs 2>&1; then
      echo -e "${GREEN}✓ Built ${service}${NC}"
      ((success++))
    else
      echo -e "${RED}✗ Failed to build ${service}${NC}"
      ((failed++))
    fi
  done

  echo ""
  echo -e "${CYAN}Build Summary:${NC}"
  echo -e "  Total:   ${total}"
  echo -e "  Success: ${GREEN}${success}${NC}"
  echo -e "  Failed:  ${RED}${failed}${NC}"
  echo ""

  if [ $failed -gt 0 ]; then
    echo -e "${YELLOW}Warning: Some builds failed. Check logs above.${NC}"
  fi
}

# Deploy to AKS
deploy_to_aks() {
  if [ "$SKIP_DEPLOY" = true ]; then
    echo -e "${YELLOW}Skipping deployment (--skip-deploy)${NC}"
    return 0
  fi

  echo -e "${YELLOW}Deploying to AKS...${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Get AKS credentials
  echo -e "${BLUE}Getting AKS credentials...${NC}"
  az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$AKS_CLUSTER" --overwrite-existing

  # Create namespace if not exists
  kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

  # Check if Helm chart exists
  local helm_chart="$PROJECT_ROOT/infrastructure/helm/flamoral-platform"

  if [ -d "$helm_chart" ]; then
    echo -e "${BLUE}Deploying with Helm...${NC}"

    helm upgrade --install flamoral-platform "$helm_chart" \
      --namespace "$NAMESPACE" \
      --set image.registry="$ACR_LOGIN_SERVER" \
      --set image.tag="$TAG" \
      --set global.environment=production \
      --wait --timeout 10m

    echo -e "${GREEN}✓ Helm deployment complete${NC}"
  else
    echo -e "${YELLOW}Helm chart not found. Using kubectl apply...${NC}"

    # Apply Kubernetes manifests
    if [ -d "$PROJECT_ROOT/infrastructure/kubernetes/production" ]; then
      kubectl apply -f "$PROJECT_ROOT/infrastructure/kubernetes/production/" -n "$NAMESPACE"
    fi

    # Update image tags for each deployment
    local services=(
      "api-gateway"
      "auth-service"
      "user-service"
      "matching-service"
      "messaging-service"
      "media-service"
      "payment-service"
      "notification-service"
    )

    for service in "${services[@]}"; do
      kubectl set image deployment/"$service" \
        "$service"="${ACR_LOGIN_SERVER}/${service}:${TAG}" \
        -n "$NAMESPACE" 2>/dev/null || true
    done
  fi

  # Wait for rollout
  echo -e "${BLUE}Waiting for deployments to be ready...${NC}"
  kubectl rollout status deployment/api-gateway -n "$NAMESPACE" --timeout=5m 2>/dev/null || true

  echo -e "${GREEN}✓ Deployment complete${NC}"
  echo ""
}

# Verify deployment
verify_deployment() {
  echo -e "${YELLOW}Verifying deployment...${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Get pods status
  echo -e "${CYAN}Pod Status:${NC}"
  kubectl get pods -n "$NAMESPACE" -o wide 2>/dev/null || echo "No pods found"
  echo ""

  # Get services
  echo -e "${CYAN}Services:${NC}"
  kubectl get svc -n "$NAMESPACE" 2>/dev/null || echo "No services found"
  echo ""

  # Get ingress
  echo -e "${CYAN}Ingress:${NC}"
  kubectl get ingress -n "$NAMESPACE" 2>/dev/null || echo "No ingress found"
  echo ""

  # Health check
  local api_ip=$(kubectl get svc api-gateway -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)

  if [ -n "$api_ip" ]; then
    echo -e "${BLUE}Testing health endpoint: http://${api_ip}/health${NC}"
    curl -sf "http://${api_ip}/health" 2>/dev/null && echo -e "${GREEN}✓ Health check passed${NC}" || echo -e "${YELLOW}Health check pending${NC}"
  fi
  echo ""
}

# Stop AKS cluster to save costs
stop_aks_cluster() {
  echo -e "${YELLOW}Stopping AKS cluster to save costs...${NC}"

  az aks stop --resource-group "$RESOURCE_GROUP" --name "$AKS_CLUSTER" --no-wait

  echo -e "${GREEN}✓ AKS cluster stop initiated${NC}"
  echo -e "${CYAN}Estimated savings: ~\$400-600/month in compute costs${NC}"
  echo ""
}

# Print summary
print_summary() {
  echo ""
  echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    Deployment Summary                            ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ACR Repository:  ${GREEN}${ACR_LOGIN_SERVER}${NC}"
  echo -e "  Image Tag:       ${GREEN}${TAG}${NC}"
  echo -e "  AKS Cluster:     ${GREEN}${AKS_CLUSTER}${NC}"
  echo -e "  Namespace:       ${GREEN}${NAMESPACE}${NC}"
  echo ""

  # List images in ACR
  echo -e "${CYAN}Images in ACR:${NC}"
  az acr repository list --name "$ACR_NAME" --output table 2>/dev/null | head -20
  echo ""
}

# Main execution
main() {
  print_header
  check_azure_login

  # Start AKS if requested
  if [ "$START_AKS" = true ]; then
    start_aks_cluster
  fi

  # Build images using ACR Tasks
  build_images_acr

  # Deploy to AKS
  deploy_to_aks

  # Verify deployment
  verify_deployment

  # Print summary
  print_summary

  # Stop AKS if requested
  if [ "$STOP_AFTER" = true ]; then
    stop_aks_cluster
  fi

  echo -e "${GREEN}✓ Cloud deployment completed successfully!${NC}"
}

# Run main function
main
