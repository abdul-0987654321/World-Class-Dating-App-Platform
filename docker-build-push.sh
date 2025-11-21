#!/bin/bash

# Docker Build and Push Script for World-Class Dating Platform
# Builds all services and pushes to Docker Hub

set -e

# Configuration
DOCKER_USERNAME="citadelcloud1"
DOCKER_REPO="world-class-dating-platform"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Docker Build & Push Script${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not running${NC}"
  echo "Please start Docker Desktop and try again"
  exit 1
fi

# Login to Docker Hub
echo -e "${BLUE}Logging in to Docker Hub...${NC}"
docker login

# List of services to build
SERVICES=(
  "user-service:3001"
  "matching-service:3002"
  "messaging-service:3003"
  "media-service:3004"
  "moderation-service:3005"
  "notification-service:3006"
  "analytics-service:3007"
  "payment-service:3008"
  "api-gateway:4000"
)

# Build and push each service
for service_info in "${SERVICES[@]}"; do
  IFS=':' read -r service port <<< "$service_info"

  echo ""
  echo -e "${BLUE}================================${NC}"
  echo -e "${BLUE}Building ${service}${NC}"
  echo -e "${BLUE}================================${NC}"

  SERVICE_PATH="backend/services/${service}"

  if [ ! -d "$SERVICE_PATH" ]; then
    echo -e "${RED}Warning: ${SERVICE_PATH} not found, skipping...${NC}"
    continue
  fi

  # Build image
  echo -e "${GREEN}Building Docker image...${NC}"
  docker build \
    -t ${DOCKER_USERNAME}/${DOCKER_REPO}:${service}-latest \
    -t ${DOCKER_USERNAME}/${DOCKER_REPO}:${service}-$(date +%Y%m%d) \
    ${SERVICE_PATH}

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"

    # Push images
    echo -e "${GREEN}Pushing images to Docker Hub...${NC}"
    docker push ${DOCKER_USERNAME}/${DOCKER_REPO}:${service}-latest
    docker push ${DOCKER_USERNAME}/${DOCKER_REPO}:${service}-$(date +%Y%m%d)

    echo -e "${GREEN}✓ Push successful${NC}"
  else
    echo -e "${RED}✗ Build failed for ${service}${NC}"
    exit 1
  fi
done

# Build frontend
echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Building Frontend (Web)${NC}"
echo -e "${BLUE}================================${NC}"

if [ -d "frontend/web" ]; then
  docker build \
    -t ${DOCKER_USERNAME}/${DOCKER_REPO}:web-frontend-latest \
    -t ${DOCKER_USERNAME}/${DOCKER_REPO}:web-frontend-$(date +%Y%m%d) \
    frontend/web

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"

    docker push ${DOCKER_USERNAME}/${DOCKER_REPO}:web-frontend-latest
    docker push ${DOCKER_USERNAME}/${DOCKER_REPO}:web-frontend-$(date +%Y%m%d)

    echo -e "${GREEN}✓ Push successful${NC}"
  fi
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}All services built and pushed!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Docker Hub repository: https://hub.docker.com/repository/docker/${DOCKER_USERNAME}/${DOCKER_REPO}"
echo ""
echo "Tagged images:"
for service_info in "${SERVICES[@]}"; do
  IFS=':' read -r service port <<< "$service_info"
  echo "  - ${DOCKER_USERNAME}/${DOCKER_REPO}:${service}-latest"
done
echo "  - ${DOCKER_USERNAME}/${DOCKER_REPO}:web-frontend-latest"
echo ""
