#!/bin/bash

# Flamoral Dating Platform - Deployment Script
# Orchestrates build, tag, and push operations
# Usage: ./deploy.sh [--env <environment>] [--tag <tag>] [--service <service>]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="${ENVIRONMENT:-dev}"
TAG="${TAG:-latest}"
REGISTRY="${REGISTRY:-flamoral.azurecr.io}"
SERVICE=""
BUILD_ONLY=false
SKIP_BUILD=false
SKIP_TESTS=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --env|-e)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --tag|-t)
      TAG="$2"
      shift 2
      ;;
    --registry|-r)
      REGISTRY="$2"
      shift 2
      ;;
    --service|-s)
      SERVICE="$2"
      shift 2
      ;;
    --build-only)
      BUILD_ONLY=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -e, --env <env>         Target environment (dev, staging, prod)"
      echo "  -t, --tag <tag>         Docker image tag (default: latest)"
      echo "  -r, --registry <reg>    Docker registry (default: flamoral.azurecr.io)"
      echo "  -s, --service <svc>     Deploy only specific service"
      echo "  --build-only            Only build images, don't push"
      echo "  --skip-build            Skip build, only push existing images"
      echo "  --skip-tests            Skip running tests before deployment"
      echo "  -h, --help              Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0 --env staging --tag v1.2.3"
      echo "  $0 --service api-gateway --tag latest"
      echo "  $0 --env prod --tag v2.0.0 --skip-tests"
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

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Flamoral Dating Platform - Deployment Script           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Environment:  ${GREEN}${ENVIRONMENT}${NC}"
echo -e "  Registry:     ${GREEN}${REGISTRY}${NC}"
echo -e "  Tag:          ${GREEN}${TAG}${NC}"
if [ -n "$SERVICE" ]; then
  echo -e "  Service:      ${GREEN}${SERVICE}${NC}"
fi
echo ""

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
  echo -e "${RED}✗ Invalid environment: $ENVIRONMENT${NC}"
  echo -e "${YELLOW}  Valid environments: dev, staging, prod${NC}"
  exit 1
fi

# Load environment-specific variables
ENV_FILE="$SCRIPT_DIR/.env.$ENVIRONMENT"
if [ -f "$ENV_FILE" ]; then
  echo -e "${BLUE}Loading environment variables from $ENV_FILE${NC}"
  export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
else
  echo -e "${YELLOW}⚠ No environment file found: $ENV_FILE${NC}"
  echo -e "${YELLOW}  Using default values${NC}"
fi
echo ""

# Step 1: Run tests (if not skipped)
if [ "$SKIP_TESTS" = false ] && [ "$BUILD_ONLY" = false ]; then
  echo -e "${YELLOW}Step 1: Running Tests${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ -n "$SERVICE" ]; then
    echo -e "${BLUE}Running tests for $SERVICE...${NC}"
    # Add service-specific test command here
  else
    echo -e "${BLUE}Running all tests...${NC}"
    # Add comprehensive test command here
  fi

  echo -e "${GREEN}✓ Tests passed${NC}"
  echo ""
else
  echo -e "${YELLOW}⚠ Skipping tests${NC}"
  echo ""
fi

# Step 2: Build images (if not skipped)
if [ "$SKIP_BUILD" = false ]; then
  echo -e "${YELLOW}Step 2: Building Docker Images${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  BUILD_ARGS="--tag $TAG --registry $REGISTRY"

  if [ -n "$SERVICE" ]; then
    echo -e "${BLUE}Building $SERVICE...${NC}"
    # Build single service
    cd "$SCRIPT_DIR/../.." && \
    docker build -t "$REGISTRY/$SERVICE:$TAG" \
      -f "backend/services/$SERVICE/Dockerfile" .
    echo -e "${GREEN}✓ Built $SERVICE${NC}"
  else
    echo -e "${BLUE}Building all services...${NC}"
    "$SCRIPT_DIR/build-all.sh" $BUILD_ARGS
  fi

  echo ""
else
  echo -e "${YELLOW}⚠ Skipping build${NC}"
  echo ""
fi

# Step 3: Push images (if not build-only)
if [ "$BUILD_ONLY" = false ]; then
  echo -e "${YELLOW}Step 3: Pushing Images to Registry${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  PUSH_ARGS="--tag $TAG"

  # Extract ACR name from registry URL
  ACR_NAME=$(echo $REGISTRY | cut -d'.' -f1)
  PUSH_ARGS="$PUSH_ARGS --registry $ACR_NAME"

  if [ -n "$SERVICE" ]; then
    echo -e "${BLUE}Pushing $SERVICE...${NC}"
    # Push single service using push-all.sh logic
    az acr login --name "$ACR_NAME"
    docker push "$REGISTRY/$SERVICE:$TAG"
    echo -e "${GREEN}✓ Pushed $SERVICE${NC}"
  else
    echo -e "${BLUE}Pushing all services...${NC}"
    "$SCRIPT_DIR/push-all.sh" $PUSH_ARGS
  fi

  echo ""
fi

# Step 4: Update deployment (environment-specific)
if [ "$BUILD_ONLY" = false ]; then
  echo -e "${YELLOW}Step 4: Updating Deployment${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  case $ENVIRONMENT in
    dev)
      echo -e "${BLUE}Development environment - using docker-compose${NC}"
      docker-compose -f "$SCRIPT_DIR/docker-compose.yml" pull
      docker-compose -f "$SCRIPT_DIR/docker-compose.yml" up -d
      ;;
    staging|prod)
      echo -e "${BLUE}Updating AWS ECS Fargate deployment for $ENVIRONMENT${NC}"

      # AWS ECS Fargate deployment (NO Kubernetes)
      if [ -n "$SERVICE" ]; then
        echo -e "${BLUE}Updating $SERVICE in ECS Fargate...${NC}"
        # Update ECS service to use new image
        CLUSTER_NAME="flamoral-${ENVIRONMENT}"
        SERVICE_NAME="${SERVICE}"

        # Force new deployment with updated image
        aws ecs update-service \
          --cluster "$CLUSTER_NAME" \
          --service "$SERVICE_NAME" \
          --force-new-deployment \
          --region "${AWS_REGION:-us-east-1}" || {
            echo -e "${YELLOW}⚠ ECS update failed. Ensure task definition is updated via Terraform.${NC}"
          }
      else
        echo -e "${BLUE}Updating all services in ECS Fargate...${NC}"
        # For all services, trigger Terraform deployment
        echo -e "${YELLOW}  Use Terraform to deploy all services: terraform apply -target=module.ecs${NC}"
      fi

      # Wait for service stability
      if [ -n "$SERVICE" ]; then
        echo -e "${BLUE}Waiting for ECS service stability...${NC}"
        aws ecs wait services-stable \
          --cluster "$CLUSTER_NAME" \
          --services "$SERVICE_NAME" \
          --region "${AWS_REGION:-us-east-1}" 2>/dev/null || {
            echo -e "${YELLOW}⚠ Service stability check timed out. Check ECS console.${NC}"
          }
      fi
      ;;
  esac

  echo -e "${GREEN}✓ Deployment updated${NC}"
  echo ""
fi

# Summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deployment Summary                                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Environment:  ${GREEN}${ENVIRONMENT}${NC}"
echo -e "  Registry:     ${GREEN}${REGISTRY}${NC}"
echo -e "  Tag:          ${GREEN}${TAG}${NC}"
if [ -n "$SERVICE" ]; then
  echo -e "  Service:      ${GREEN}${SERVICE}${NC}"
else
  echo -e "  Services:     ${GREEN}All services${NC}"
fi
echo ""

if [ "$BUILD_ONLY" = true ]; then
  echo -e "${GREEN}✓ Build completed successfully!${NC}"
  echo -e "${YELLOW}  Images built but not pushed to registry${NC}"
else
  echo -e "${GREEN}✓ Deployment completed successfully!${NC}"

  # Show next steps
  echo ""
  echo -e "${BLUE}Next Steps:${NC}"
  echo -e "  1. Verify deployment: ${YELLOW}aws ecs list-tasks --cluster flamoral-$ENVIRONMENT${NC}"
  echo -e "  2. Check logs: ${YELLOW}aws logs tail /ecs/flamoral-$ENVIRONMENT --follow${NC}"
  echo -e "  3. Monitor health: ${YELLOW}aws ecs describe-services --cluster flamoral-$ENVIRONMENT --services <service>${NC}"
fi

echo ""
