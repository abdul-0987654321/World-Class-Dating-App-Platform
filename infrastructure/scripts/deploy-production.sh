#!/bin/bash

# =============================================================================
# Flamoral Dating Platform - Production Deployment Script
# =============================================================================
# This script handles the complete deployment process:
# 1. Build all Docker images
# 2. Push to Azure Container Registry (geo-replicated)
# 3. Deploy to AKS clusters (multi-region)
# 4. Verify deployment health
#
# Usage: ./deploy-production.sh [OPTIONS]
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Default configuration
ACR_NAME="${ACR_NAME:-flamoralacr}"
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
TAG="${TAG:-$(date +%Y%m%d%H%M%S)}"
ENVIRONMENT="${ENVIRONMENT:-production}"
HELM_RELEASE_NAME="flamoral-platform"
NAMESPACE="${NAMESPACE:-production}"

# Regions configuration
declare -A REGIONS
REGIONS["americas"]="eastus"
REGIONS["europe"]="westeurope"
REGIONS["africa"]="southafricanorth"

# AKS cluster names
declare -A AKS_CLUSTERS
AKS_CLUSTERS["americas"]="flamoral-aks-americas"
AKS_CLUSTERS["europe"]="flamoral-aks-europe"
AKS_CLUSTERS["africa"]="flamoral-aks-africa"

# Parse arguments
DRY_RUN=false
SKIP_BUILD=false
SKIP_PUSH=false
SKIP_DEPLOY=false
REGION="all"

while [[ $# -gt 0 ]]; do
  case $1 in
    --tag|-t)
      TAG="$2"
      shift 2
      ;;
    --region|-r)
      REGION="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-push)
      SKIP_PUSH=true
      shift
      ;;
    --skip-deploy)
      SKIP_DEPLOY=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -t, --tag <tag>        Image tag (default: timestamp)"
      echo "  -r, --region <region>  Deploy to specific region (americas|europe|africa|all)"
      echo "  --dry-run              Show what would be done without executing"
      echo "  --skip-build           Skip Docker build step"
      echo "  --skip-push            Skip ACR push step"
      echo "  --skip-deploy          Skip Kubernetes deployment step"
      echo "  -h, --help             Show this help"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../.."
DOCKER_DIR="$PROJECT_ROOT/infrastructure/docker"
HELM_DIR="$PROJECT_ROOT/infrastructure/helm/flamoral-platform"

# Print header
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Flamoral Dating Platform - Production Deployment            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Configuration:${NC}"
echo -e "  ACR:          ${GREEN}${ACR_LOGIN_SERVER}${NC}"
echo -e "  Tag:          ${GREEN}${TAG}${NC}"
echo -e "  Environment:  ${GREEN}${ENVIRONMENT}${NC}"
echo -e "  Region:       ${GREEN}${REGION}${NC}"
echo -e "  Dry Run:      ${GREEN}${DRY_RUN}${NC}"
echo ""

# Function to check prerequisites
check_prerequisites() {
  echo -e "${YELLOW}Checking prerequisites...${NC}"

  local missing=()

  # Check Docker
  if ! command -v docker &> /dev/null; then
    missing+=("docker")
  fi

  # Check Azure CLI
  if ! command -v az &> /dev/null; then
    missing+=("az (Azure CLI)")
  fi

  # Check kubectl
  if ! command -v kubectl &> /dev/null; then
    missing+=("kubectl")
  fi

  # Check Helm
  if ! command -v helm &> /dev/null; then
    missing+=("helm")
  fi

  if [ ${#missing[@]} -gt 0 ]; then
    echo -e "${RED}Missing required tools: ${missing[*]}${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ All prerequisites met${NC}"
  echo ""
}

# Function to authenticate with Azure
authenticate_azure() {
  echo -e "${YELLOW}Authenticating with Azure...${NC}"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would authenticate with Azure${NC}"
    return 0
  fi

  # Check if already logged in
  if ! az account show &> /dev/null; then
    echo -e "${YELLOW}Please log in to Azure...${NC}"
    az login
  fi

  # Login to ACR
  echo -e "${BLUE}Logging in to ACR: ${ACR_LOGIN_SERVER}${NC}"
  az acr login --name "$ACR_NAME"

  echo -e "${GREEN}✓ Azure authentication successful${NC}"
  echo ""
}

# Function to build Docker images
build_images() {
  if [ "$SKIP_BUILD" = true ]; then
    echo -e "${YELLOW}Skipping Docker build (--skip-build)${NC}"
    return 0
  fi

  echo -e "${YELLOW}Building Docker images...${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would run: $DOCKER_DIR/build-all.sh --tag $TAG --registry $ACR_LOGIN_SERVER${NC}"
    return 0
  fi

  cd "$DOCKER_DIR"
  ./build-all.sh --tag "$TAG" --registry "$ACR_LOGIN_SERVER"

  echo -e "${GREEN}✓ Docker images built successfully${NC}"
  echo ""
}

# Function to push images to ACR
push_images() {
  if [ "$SKIP_PUSH" = true ]; then
    echo -e "${YELLOW}Skipping ACR push (--skip-push)${NC}"
    return 0
  fi

  echo -e "${YELLOW}Pushing images to ACR...${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would run: $DOCKER_DIR/push-all.sh --tag $TAG --registry $ACR_NAME${NC}"
    return 0
  fi

  cd "$DOCKER_DIR"
  ./push-all.sh --tag "$TAG" --registry "$ACR_NAME"

  echo -e "${GREEN}✓ Images pushed to ACR successfully${NC}"
  echo ""
}

# Function to deploy to a specific AKS cluster
deploy_to_cluster() {
  local region_name=$1
  local azure_region=${REGIONS[$region_name]}
  local cluster_name=${AKS_CLUSTERS[$region_name]}

  echo -e "${YELLOW}Deploying to ${region_name} (${azure_region})...${NC}"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would deploy to AKS cluster: $cluster_name${NC}"
    return 0
  fi

  # Get AKS credentials
  echo -e "${BLUE}Getting AKS credentials for $cluster_name...${NC}"
  az aks get-credentials --resource-group "flamoral-prod-${region_name}-rg" \
    --name "$cluster_name" --overwrite-existing

  # Create namespace if not exists
  kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

  # Deploy using Helm
  echo -e "${BLUE}Deploying Helm chart...${NC}"
  helm upgrade --install "$HELM_RELEASE_NAME" "$HELM_DIR" \
    --namespace "$NAMESPACE" \
    --values "$HELM_DIR/values-prod.yaml" \
    --set image.tag="$TAG" \
    --set image.repository="$ACR_LOGIN_SERVER" \
    --set region="$region_name" \
    --wait --timeout 10m

  # Verify deployment
  echo -e "${BLUE}Verifying deployment...${NC}"
  kubectl rollout status deployment/api-gateway -n "$NAMESPACE" --timeout=5m

  echo -e "${GREEN}✓ Deployment to ${region_name} successful${NC}"
}

# Function to deploy to all or specific regions
deploy_to_aks() {
  if [ "$SKIP_DEPLOY" = true ]; then
    echo -e "${YELLOW}Skipping AKS deployment (--skip-deploy)${NC}"
    return 0
  fi

  echo -e "${YELLOW}Deploying to AKS clusters...${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ "$REGION" = "all" ]; then
    for region in "${!REGIONS[@]}"; do
      deploy_to_cluster "$region"
      echo ""
    done
  else
    if [ -z "${REGIONS[$REGION]}" ]; then
      echo -e "${RED}Invalid region: $REGION${NC}"
      echo -e "Valid regions: ${!REGIONS[*]}"
      exit 1
    fi
    deploy_to_cluster "$REGION"
  fi

  echo -e "${GREEN}✓ AKS deployment completed${NC}"
  echo ""
}

# Function to verify deployment health
verify_health() {
  echo -e "${YELLOW}Verifying deployment health...${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would verify health endpoints${NC}"
    return 0
  fi

  local endpoints=(
    "https://api.flamoral.com/health"
    "https://americas.flamoral.com/health"
    "https://eu.flamoral.com/health"
    "https://africa.flamoral.com/health"
  )

  for endpoint in "${endpoints[@]}"; do
    echo -e "${BLUE}Checking: $endpoint${NC}"
    if curl -sf "$endpoint" > /dev/null; then
      echo -e "${GREEN}✓ $endpoint is healthy${NC}"
    else
      echo -e "${RED}✗ $endpoint is not responding${NC}"
    fi
  done

  echo ""
}

# Function to print summary
print_summary() {
  echo ""
  echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    Deployment Summary                            ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ACR Repository:  ${GREEN}${ACR_LOGIN_SERVER}${NC}"
  echo -e "  Image Tag:       ${GREEN}${TAG}${NC}"
  echo -e "  Regions:         ${GREEN}${REGION}${NC}"
  echo ""
  echo -e "${CYAN}Deployed Endpoints:${NC}"
  echo -e "  • https://api.flamoral.com"
  echo -e "  • https://americas.flamoral.com"
  echo -e "  • https://eu.flamoral.com"
  echo -e "  • https://africa.flamoral.com"
  echo ""

  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}This was a dry run. No changes were made.${NC}"
  fi
}

# Main execution
main() {
  check_prerequisites
  authenticate_azure
  build_images
  push_images
  deploy_to_aks
  verify_health
  print_summary

  echo -e "${GREEN}✓ Production deployment completed successfully!${NC}"
}

# Run main function
main
