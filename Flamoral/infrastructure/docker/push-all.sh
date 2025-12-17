#!/bin/bash

# Flamoral Dating Platform - Docker Push Script
# Pushes all Docker images to Azure Container Registry
# Usage: ./push-all.sh [--tag <tag>] [--registry <acr-name>]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TAG="${TAG:-latest}"
ACR_NAME="${ACR_NAME:-flamoral}"
ACR_LOGIN_SERVER="${ACR_LOGIN_SERVER:-${ACR_NAME}.azurecr.io}"
DOCKER_REGISTRY="$ACR_LOGIN_SERVER"
DRY_RUN=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --tag|-t)
      TAG="$2"
      shift 2
      ;;
    --registry|-r)
      ACR_NAME="$2"
      ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
      DOCKER_REGISTRY="$ACR_LOGIN_SERVER"
      shift 2
      ;;
    --acr-server)
      ACR_LOGIN_SERVER="$2"
      DOCKER_REGISTRY="$ACR_LOGIN_SERVER"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -t, --tag <tag>            Docker image tag (default: latest)"
      echo "  -r, --registry <acr-name>  Azure Container Registry name (default: flamoral)"
      echo "  --acr-server <server>      Full ACR server URL"
      echo "  --dry-run                  Show what would be pushed without actually pushing"
      echo "  -h, --help                 Show this help message"
      echo ""
      echo "Environment Variables:"
      echo "  TAG                        Override default tag"
      echo "  ACR_NAME                   Azure Container Registry name"
      echo "  ACR_LOGIN_SERVER           Full ACR server URL"
      echo "  AZURE_CLIENT_ID            Service Principal Client ID (for authentication)"
      echo "  AZURE_CLIENT_SECRET        Service Principal Client Secret"
      echo "  AZURE_TENANT_ID            Azure Tenant ID"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Flamoral Dating Platform - Docker Push Script          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  ACR Name:     ${GREEN}${ACR_NAME}${NC}"
echo -e "  ACR Server:   ${GREEN}${ACR_LOGIN_SERVER}${NC}"
echo -e "  Tag:          ${GREEN}${TAG}${NC}"
echo -e "  Dry Run:      ${GREEN}${DRY_RUN}${NC}"
echo ""

# Node.js Services
NODE_SERVICES=(
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
  "realtime-service"
  "admin-service"
  "automation-service"
  "advertising-service"
  "workflow-engine"
)

# Python AI Services
PYTHON_SERVICES=(
  "recommendation-service"
  "photo-analysis"
  "nlp-service"
  "fraud-detection"
  "dating-coach-service"
  "content-generator"
)

# Combine all services
ALL_SERVICES=("${NODE_SERVICES[@]}" "${PYTHON_SERVICES[@]}")

# Function to check if Azure CLI is installed
check_azure_cli() {
  if ! command -v az &> /dev/null; then
    echo -e "${RED}✗ Azure CLI not found. Please install it first.${NC}"
    echo "  Visit: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
  fi
  echo -e "${GREEN}✓ Azure CLI found${NC}"
}

# Function to authenticate with ACR
authenticate_acr() {
  echo -e "${YELLOW}Authenticating with Azure Container Registry...${NC}"

  # Try service principal authentication first if credentials are provided
  if [ -n "$AZURE_CLIENT_ID" ] && [ -n "$AZURE_CLIENT_SECRET" ] && [ -n "$AZURE_TENANT_ID" ]; then
    echo -e "${BLUE}Using Service Principal authentication...${NC}"
    if az login --service-principal \
      -u "$AZURE_CLIENT_ID" \
      -p "$AZURE_CLIENT_SECRET" \
      --tenant "$AZURE_TENANT_ID" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Service Principal authentication successful${NC}"
    else
      echo -e "${RED}✗ Service Principal authentication failed${NC}"
      exit 1
    fi
  else
    echo -e "${BLUE}Using interactive Azure login...${NC}"
    if ! az account show > /dev/null 2>&1; then
      echo -e "${YELLOW}Please log in to Azure...${NC}"
      az login
    else
      echo -e "${GREEN}✓ Already logged in to Azure${NC}"
    fi
  fi

  # Login to ACR
  echo -e "${BLUE}Logging in to ACR: ${ACR_LOGIN_SERVER}${NC}"
  if az acr login --name "$ACR_NAME" 2>&1 | grep -q "Login Succeeded"; then
    echo -e "${GREEN}✓ Successfully logged in to ACR${NC}"
  else
    echo -e "${RED}✗ Failed to login to ACR${NC}"
    exit 1
  fi
}

# Function to tag and push an image
tag_and_push() {
  local service_name=$1
  local source_tag="${2:-flamoral/$service_name:$TAG}"
  local target_tag="$DOCKER_REGISTRY/$service_name:$TAG"

  # Check if source image exists
  if ! docker image inspect "$source_tag" > /dev/null 2>&1; then
    echo -e "${RED}✗ Source image not found: $source_tag${NC}"
    echo -e "${YELLOW}  Tip: Run build-all.sh first to build the images${NC}"
    return 1
  fi

  # Tag the image
  echo -e "${BLUE}Tagging: $source_tag -> $target_tag${NC}"
  if [ "$DRY_RUN" = false ]; then
    docker tag "$source_tag" "$target_tag"
  fi

  # Also tag as latest if not already latest
  if [ "$TAG" != "latest" ]; then
    local latest_tag="$DOCKER_REGISTRY/$service_name:latest"
    echo -e "${BLUE}Tagging: $source_tag -> $latest_tag${NC}"
    if [ "$DRY_RUN" = false ]; then
      docker tag "$source_tag" "$latest_tag"
    fi
  fi

  # Push the image
  if [ "$DRY_RUN" = false ]; then
    echo -e "${BLUE}Pushing: $target_tag${NC}"
    if docker push "$target_tag" 2>&1 | sed 's/^/  /'; then
      echo -e "${GREEN}✓ Successfully pushed $target_tag${NC}"

      # Push latest tag if applicable
      if [ "$TAG" != "latest" ]; then
        echo -e "${BLUE}Pushing: $latest_tag${NC}"
        docker push "$latest_tag" 2>&1 | sed 's/^/  /'
        echo -e "${GREEN}✓ Successfully pushed $latest_tag${NC}"
      fi
      return 0
    else
      echo -e "${RED}✗ Failed to push $target_tag${NC}"
      return 1
    fi
  else
    echo -e "${YELLOW}[DRY RUN] Would push: $target_tag${NC}"
    if [ "$TAG" != "latest" ]; then
      echo -e "${YELLOW}[DRY RUN] Would push: $latest_tag${NC}"
    fi
    return 0
  fi
}

# Check prerequisites
if [ "$DRY_RUN" = false ]; then
  check_azure_cli
  authenticate_acr
  echo ""
fi

# Push all images
echo -e "${YELLOW}Pushing Docker images to ACR...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOTAL=0
SUCCESS=0
FAILED=0

for service in "${ALL_SERVICES[@]}"; do
  ((TOTAL++))
  echo -e "${YELLOW}[$TOTAL/${#ALL_SERVICES[@]}] Processing $service...${NC}"

  if tag_and_push "$service"; then
    ((SUCCESS++))
  else
    ((FAILED++))
  fi
  echo ""
done

# Summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Push Summary                                            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Total Images:    ${BLUE}$TOTAL${NC}"
echo -e "  Successful:      ${GREEN}$SUCCESS${NC}"
echo -e "  Failed:          ${RED}$FAILED${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}This was a dry run. No images were actually pushed.${NC}"
  echo -e "${YELLOW}Run without --dry-run to push the images.${NC}"
  exit 0
fi

# Exit with appropriate code
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All images pushed successfully!${NC}"
  echo ""
  echo -e "${BLUE}ACR Repository:${NC} $ACR_LOGIN_SERVER"
  echo -e "${BLUE}Tag:${NC} $TAG"
  exit 0
else
  echo -e "${RED}✗ Some pushes failed. Check the output above for details.${NC}"
  exit 1
fi
