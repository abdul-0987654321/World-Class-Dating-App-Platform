#!/bin/bash
# =============================================================================
# Flamoral Dating Platform - Build and Push to Azure Container Registry
# =============================================================================
# This script builds and pushes all Docker images to Azure Container Registry
# Usage: ./build-and-push-to-acr.sh [options]
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="${ENVIRONMENT:-dev}"
TAG="${TAG:-latest}"
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
VERSION="${VERSION:-1.0.0}"
PUSH=true
BUILD_CACHE=true
PARALLEL_BUILDS=false
MAX_PARALLEL=4
DRY_RUN=false

# ACR configurations for different environments
declare -A ACR_REGISTRIES=(
    ["dev"]="flamoraldevacr"
    ["staging"]="flamoralstagingacr"
    ["prod"]="flamoralprodacr"
)

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --environment|-e)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --tag|-t)
      TAG="$2"
      shift 2
      ;;
    --version|-v)
      VERSION="$2"
      shift 2
      ;;
    --no-push)
      PUSH=false
      shift
      ;;
    --no-cache)
      BUILD_CACHE=false
      shift
      ;;
    --parallel)
      PARALLEL_BUILDS=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -e, --environment <env>  Target environment: dev, staging, prod (default: dev)"
      echo "  -t, --tag <tag>          Docker image tag (default: latest)"
      echo "  -v, --version <version>  Application version (default: 1.0.0)"
      echo "  --no-push                Build only, don't push to ACR"
      echo "  --no-cache               Build without cache"
      echo "  --parallel               Build services in parallel"
      echo "  --dry-run                Show what would be done without executing"
      echo "  -h, --help               Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0 --environment prod --tag v1.2.3"
      echo "  $0 --environment staging --no-cache"
      echo "  $0 --dry-run"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Validate environment
if [[ ! "${!ACR_REGISTRIES[@]}" =~ "$ENVIRONMENT" ]]; then
    echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'. Must be one of: dev, staging, prod${NC}"
    exit 1
fi

# Set ACR details
ACR_NAME="${ACR_REGISTRIES[$ENVIRONMENT]}"
ACR_URL="${ACR_NAME}.azurecr.io"

# Get project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
BACKEND_DIR="$PROJECT_ROOT/backend"
SERVICES_DIR="$BACKEND_DIR/services"

# Print banner
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Flamoral Dating Platform - Build & Push to ACR                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Environment:   ${GREEN}${ENVIRONMENT}${NC}"
echo -e "  ACR Registry:  ${GREEN}${ACR_URL}${NC}"
echo -e "  Tag:           ${GREEN}${TAG}${NC}"
echo -e "  Version:       ${GREEN}${VERSION}${NC}"
echo -e "  Build Date:    ${GREEN}${BUILD_DATE}${NC}"
echo -e "  VCS Ref:       ${GREEN}${VCS_REF}${NC}"
echo -e "  Push:          ${GREEN}${PUSH}${NC}"
echo -e "  Cache:         ${GREEN}${BUILD_CACHE}${NC}"
echo -e "  Parallel:      ${GREEN}${PARALLEL_BUILDS}${NC}"
echo -e "  Dry Run:       ${GREEN}${DRY_RUN}${NC}"
echo ""

# Node.js Backend Services
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
AI_SERVICES=(
  "ai-services/recommendation-service"
  "ai-services/photo-analysis"
  "ai-services/nlp-service"
  "ai-services/fraud-detection"
  "ai-services/dating-coach-service"
  "ai-services/content-generator"
)

# Build statistics
TOTAL_SERVICES=0
SUCCESSFUL_BUILDS=0
FAILED_BUILDS=0
declare -a FAILED_SERVICE_NAMES=()

# Function to execute command (with dry-run support)
execute() {
    if [ "$DRY_RUN" = true ]; then
        echo -e "${CYAN}[DRY-RUN]${NC} $@"
    else
        "$@"
    fi
}

# Function to build a service
build_service() {
  local service_path=$1
  local service_name=$(basename $service_path)
  local full_path="$SERVICES_DIR/$service_path"

  ((TOTAL_SERVICES++))

  # Check if service directory exists
  if [ ! -d "$full_path" ]; then
    echo -e "${RED}✗ Service directory not found: $full_path${NC}"
    ((FAILED_BUILDS++))
    FAILED_SERVICE_NAMES+=("$service_name (directory not found)")
    return 1
  fi

  # Check if Dockerfile exists
  if [ ! -f "$full_path/Dockerfile" ]; then
    echo -e "${YELLOW}⚠ No Dockerfile found for $service_name, skipping...${NC}"
    ((TOTAL_SERVICES--))
    return 0
  fi

  # Determine if it's an AI service
  local image_prefix=""
  if [[ "$service_path" == ai-services/* ]]; then
    image_prefix="flamoral/"
  else
    image_prefix="flamoral/"
  fi

  # Image names with multiple tags
  local image_base="${ACR_URL}/${image_prefix}${service_name}"
  local image_latest="${image_base}:latest"
  local image_tag="${image_base}:${TAG}"
  local image_version="${image_base}:${VERSION}"
  local image_env="${image_base}:${ENVIRONMENT}-latest"

  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Building: ${CYAN}${service_name}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  # Build arguments
  local build_args=""
  if [ "$BUILD_CACHE" = false ]; then
    build_args="--no-cache"
  fi

  # Build the Docker image
  echo -e "${YELLOW}Building image...${NC}"

  if execute docker build $build_args \
    --build-arg BUILD_DATE="$BUILD_DATE" \
    --build-arg VCS_REF="$VCS_REF" \
    --build-arg VERSION="$VERSION" \
    -t "$image_latest" \
    -t "$image_tag" \
    -t "$image_version" \
    -t "$image_env" \
    -f "$full_path/Dockerfile" \
    "$PROJECT_ROOT"; then

    echo -e "${GREEN}✓ Successfully built $service_name${NC}"
    echo -e "  Tags:"
    echo -e "    - ${image_latest}"
    echo -e "    - ${image_tag}"
    echo -e "    - ${image_version}"
    echo -e "    - ${image_env}"

    ((SUCCESSFUL_BUILDS++))
    return 0
  else
    echo -e "${RED}✗ Failed to build $service_name${NC}"
    ((FAILED_BUILDS++))
    FAILED_SERVICE_NAMES+=("$service_name")
    return 1
  fi
}

# Function to push images for a service
push_service_images() {
  local service_path=$1
  local service_name=$(basename $service_path)

  # Determine if it's an AI service
  local image_prefix="flamoral/"

  # Image names
  local image_base="${ACR_URL}/${image_prefix}${service_name}"
  local images=(
    "${image_base}:latest"
    "${image_base}:${TAG}"
    "${image_base}:${VERSION}"
    "${image_base}:${ENVIRONMENT}-latest"
  )

  echo -e "${BLUE}Pushing: ${CYAN}${service_name}${NC}"

  for image in "${images[@]}"; do
    echo -e "${YELLOW}  Pushing ${image}...${NC}"
    if execute docker push "$image"; then
      echo -e "${GREEN}  ✓ Pushed successfully${NC}"
    else
      echo -e "${RED}  ✗ Failed to push${NC}"
      return 1
    fi
  done

  return 0
}

# Login to ACR
if [ "$PUSH" = true ] && [ "$DRY_RUN" = false ]; then
  echo -e "${YELLOW}Logging in to Azure Container Registry...${NC}"
  if az acr login --name $ACR_NAME; then
    echo -e "${GREEN}✓ Successfully logged in to ACR${NC}"
    echo ""
  else
    echo -e "${RED}✗ Failed to login to ACR. Make sure you're authenticated with Azure CLI.${NC}"
    echo -e "${YELLOW}Run: az login${NC}"
    exit 1
  fi
fi

# Build all Node.js services
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Building Node.js Backend Services                              ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

for service in "${NODE_SERVICES[@]}"; do
  build_service "$service"
  echo ""
done

# Build all AI services
echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Building Python AI Services                                    ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

for service in "${AI_SERVICES[@]}"; do
  build_service "$service"
  echo ""
done

# Build Frontend (if exists)
echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Building Frontend Web Application                              ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

FRONTEND_DOCKERFILE="$PROJECT_ROOT/apps/web-app/Dockerfile"
if [ -f "$FRONTEND_DOCKERFILE" ]; then
  ((TOTAL_SERVICES++))

  image_base="${ACR_URL}/flamoral/frontend-web"

  echo -e "${BLUE}Building: ${CYAN}frontend-web${NC}"

  if execute docker build \
    --build-arg BUILD_DATE="$BUILD_DATE" \
    --build-arg VCS_REF="$VCS_REF" \
    --build-arg VERSION="$VERSION" \
    -t "${image_base}:latest" \
    -t "${image_base}:${TAG}" \
    -t "${image_base}:${VERSION}" \
    -t "${image_base}:${ENVIRONMENT}-latest" \
    -f "$FRONTEND_DOCKERFILE" \
    "$PROJECT_ROOT/apps/web-app"; then

    echo -e "${GREEN}✓ Successfully built frontend-web${NC}"
    ((SUCCESSFUL_BUILDS++))
  else
    echo -e "${RED}✗ Failed to build frontend-web${NC}"
    ((FAILED_BUILDS++))
    FAILED_SERVICE_NAMES+=("frontend-web")
  fi
else
  echo -e "${YELLOW}⚠ No frontend Dockerfile found, skipping...${NC}"
fi

# Print build summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Build Summary                                                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Total Services:  ${CYAN}${TOTAL_SERVICES}${NC}"
echo -e "  Successful:      ${GREEN}${SUCCESSFUL_BUILDS}${NC}"
echo -e "  Failed:          ${RED}${FAILED_BUILDS}${NC}"
echo ""

# Show failed services
if [ ${FAILED_BUILDS} -gt 0 ]; then
  echo -e "${RED}Failed Services:${NC}"
  for failed_service in "${FAILED_SERVICE_NAMES[@]}"; do
    echo -e "  ${RED}✗${NC} $failed_service"
  done
  echo ""
fi

# Push images if requested and all builds succeeded
if [ "$PUSH" = true ]; then
  if [ ${FAILED_BUILDS} -eq 0 ]; then
    echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Pushing Images to ACR                                          ║${NC}"
    echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Push Node.js services
    for service in "${NODE_SERVICES[@]}"; do
      service_name=$(basename $service)
      full_path="$SERVICES_DIR/$service"
      if [ -f "$full_path/Dockerfile" ]; then
        push_service_images "$service"
        echo ""
      fi
    done

    # Push AI services
    for service in "${AI_SERVICES[@]}"; do
      service_name=$(basename $service)
      full_path="$SERVICES_DIR/$service"
      if [ -f "$full_path/Dockerfile" ]; then
        push_service_images "$service"
        echo ""
      fi
    done

    # Push frontend
    if [ -f "$FRONTEND_DOCKERFILE" ]; then
      image_base="${ACR_URL}/flamoral/frontend-web"
      echo -e "${BLUE}Pushing: ${CYAN}frontend-web${NC}"
      for tag in "latest" "$TAG" "$VERSION" "${ENVIRONMENT}-latest"; do
        echo -e "${YELLOW}  Pushing ${image_base}:${tag}...${NC}"
        execute docker push "${image_base}:${tag}"
      done
      echo ""
    fi

    echo -e "${GREEN}✓ All images pushed successfully${NC}"
  else
    echo -e "${RED}✗ Cannot push images - some builds failed${NC}"
    exit 1
  fi
fi

# Verify images in ACR
if [ "$PUSH" = true ] && [ "$DRY_RUN" = false ] && [ ${FAILED_BUILDS} -eq 0 ]; then
  echo ""
  echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║  Verifying Images in ACR                                        ║${NC}"
  echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  echo -e "${CYAN}Repositories in ${ACR_NAME}:${NC}"
  az acr repository list --name $ACR_NAME --output table

  echo ""
  echo -e "${CYAN}Recent images (showing tags):${NC}"
  # Show tags for a few key services
  for service in "user-service" "api-gateway" "auth-service"; do
    echo ""
    echo -e "${YELLOW}Tags for flamoral/${service}:${NC}"
    az acr repository show-tags --name $ACR_NAME --repository "flamoral/${service}" --orderby time_desc --output table 2>/dev/null || echo "  (No images found)"
  done
fi

# Final status
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
if [ ${FAILED_BUILDS} -eq 0 ]; then
  echo -e "${BLUE}║  ${GREEN}✓ All builds and pushes completed successfully!${BLUE}                ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${GREEN}Next steps:${NC}"
  echo -e "  1. Deploy to Kubernetes: kubectl set image deployment/<name> <container>=${ACR_URL}/flamoral/<service>:${TAG}"
  echo -e "  2. Update Helm values: --set image.tag=${TAG}"
  echo -e "  3. Verify deployment: kubectl rollout status deployment/<name>"
  exit 0
else
  echo -e "${BLUE}║  ${RED}✗ Some builds failed - check output above${BLUE}                       ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
  exit 1
fi
