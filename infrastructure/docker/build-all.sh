#!/bin/bash

# Flamoral Dating Platform - Docker Build Script
# Builds all backend service Docker images
# Usage: ./build-all.sh [--tag <tag>] [--registry <registry>] [--push]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TAG="${TAG:-latest}"
REGISTRY="${REGISTRY:-flamoral}"
PUSH=false
BUILD_CACHE=true
PARALLEL_BUILDS=false
MAX_PARALLEL=4

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --tag|-t)
      TAG="$2"
      shift 2
      ;;
    --registry|-r)
      REGISTRY="$2"
      shift 2
      ;;
    --push|-p)
      PUSH=true
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
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -t, --tag <tag>         Docker image tag (default: latest)"
      echo "  -r, --registry <reg>    Docker registry (default: flamoral)"
      echo "  -p, --push              Push images after building"
      echo "  --no-cache              Build without cache"
      echo "  --parallel              Build services in parallel"
      echo "  -h, --help              Show this help message"
      echo ""
      echo "Environment Variables:"
      echo "  TAG                     Override default tag"
      echo "  REGISTRY                Override default registry"
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
BACKEND_DIR="$PROJECT_ROOT/backend"
SERVICES_DIR="$BACKEND_DIR/services"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Flamoral Dating Platform - Docker Build Script         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Registry: ${GREEN}${REGISTRY}${NC}"
echo -e "  Tag:      ${GREEN}${TAG}${NC}"
echo -e "  Push:     ${GREEN}${PUSH}${NC}"
echo -e "  Cache:    ${GREEN}${BUILD_CACHE}${NC}"
echo -e "  Parallel: ${GREEN}${PARALLEL_BUILDS}${NC}"
echo ""

# Build arguments
BUILD_ARGS=""
if [ "$BUILD_CACHE" = false ]; then
  BUILD_ARGS="--no-cache"
fi

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
  "ai-services/recommendation-service"
  "ai-services/photo-analysis"
  "ai-services/nlp-service"
  "ai-services/fraud-detection"
  "ai-services/dating-coach-service"
  "ai-services/content-generator"
)

# Function to build a service
build_service() {
  local service_path=$1
  local service_name=$(basename $service_path)
  local full_path="$SERVICES_DIR/$service_path"

  if [ ! -d "$full_path" ]; then
    echo -e "${RED}✗ Service directory not found: $full_path${NC}"
    return 1
  fi

  if [ ! -f "$full_path/Dockerfile" ]; then
    echo -e "${YELLOW}⚠ No Dockerfile found for $service_name, skipping...${NC}"
    return 0
  fi

  local image_name="$REGISTRY/$service_name:$TAG"

  echo -e "${BLUE}Building $service_name...${NC}"

  # Build the image
  if docker build $BUILD_ARGS \
    -t "$image_name" \
    -f "$full_path/Dockerfile" \
    "$PROJECT_ROOT" 2>&1 | sed "s/^/  /"; then
    echo -e "${GREEN}✓ Successfully built $image_name${NC}"

    # Tag with latest if not already
    if [ "$TAG" != "latest" ]; then
      docker tag "$image_name" "$REGISTRY/$service_name:latest"
      echo -e "${GREEN}✓ Tagged as $REGISTRY/$service_name:latest${NC}"
    fi

    return 0
  else
    echo -e "${RED}✗ Failed to build $service_name${NC}"
    return 1
  fi
}

# Function to build services in parallel
build_parallel() {
  local services=("$@")
  local pids=()
  local failed=()

  for service in "${services[@]}"; do
    while [ $(jobs -r | wc -l) -ge $MAX_PARALLEL ]; do
      sleep 1
    done

    build_service "$service" &
    pids+=($!)
  done

  # Wait for all background jobs
  for pid in "${pids[@]}"; do
    if ! wait $pid; then
      failed+=($pid)
    fi
  done

  return ${#failed[@]}
}

# Function to build services sequentially
build_sequential() {
  local services=("$@")
  local failed=0

  for service in "${services[@]}"; do
    if ! build_service "$service"; then
      ((failed++))
    fi
    echo ""
  done

  return $failed
}

# Build all Node.js services
echo -e "${YELLOW}Building Node.js Services...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$PARALLEL_BUILDS" = true ]; then
  build_parallel "${NODE_SERVICES[@]}"
  NODE_FAILED=$?
else
  build_sequential "${NODE_SERVICES[@]}"
  NODE_FAILED=$?
fi

# Build all Python AI services
echo ""
echo -e "${YELLOW}Building Python AI Services...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$PARALLEL_BUILDS" = true ]; then
  build_parallel "${PYTHON_SERVICES[@]}"
  PYTHON_FAILED=$?
else
  build_sequential "${PYTHON_SERVICES[@]}"
  PYTHON_FAILED=$?
fi

# Summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Build Summary                                           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

TOTAL_SERVICES=$((${#NODE_SERVICES[@]} + ${#PYTHON_SERVICES[@]}))
TOTAL_FAILED=$((NODE_FAILED + PYTHON_FAILED))
TOTAL_SUCCESS=$((TOTAL_SERVICES - TOTAL_FAILED))

echo -e "  Total Services:  ${BLUE}$TOTAL_SERVICES${NC}"
echo -e "  Successful:      ${GREEN}$TOTAL_SUCCESS${NC}"
echo -e "  Failed:          ${RED}$TOTAL_FAILED${NC}"
echo ""

# Push images if requested
if [ "$PUSH" = true ] && [ $TOTAL_FAILED -eq 0 ]; then
  echo -e "${YELLOW}Pushing images to registry...${NC}"
  echo ""

  # Push Node.js services
  for service in "${NODE_SERVICES[@]}"; do
    service_name=$(basename $service)
    echo -e "${BLUE}Pushing $service_name...${NC}"
    docker push "$REGISTRY/$service_name:$TAG"
    if [ "$TAG" != "latest" ]; then
      docker push "$REGISTRY/$service_name:latest"
    fi
  done

  # Push Python services
  for service in "${PYTHON_SERVICES[@]}"; do
    service_name=$(basename $service)
    echo -e "${BLUE}Pushing $service_name...${NC}"
    docker push "$REGISTRY/$service_name:$TAG"
    if [ "$TAG" != "latest" ]; then
      docker push "$REGISTRY/$service_name:latest"
    fi
  done

  echo -e "${GREEN}✓ All images pushed successfully${NC}"
fi

# Exit with appropriate code
if [ $TOTAL_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All builds completed successfully!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some builds failed. Check the output above for details.${NC}"
  exit 1
fi
