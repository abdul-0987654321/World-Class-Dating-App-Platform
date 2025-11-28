#!/bin/bash

# Flamoral - Docker Hub Deployment Script
# This script builds, tags, and pushes all Docker images to Docker Hub

set -e  # Exit on error

# Configuration
VERSION="1.0.0"
DOCKER_USERNAME="${DOCKER_USERNAME:-flamoral}"
SERVICES=("user-service" "frontend-web")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if logged in to Docker Hub
check_docker_login() {
    log_info "Checking Docker Hub login status..."
    if ! docker info | grep -q "Username"; then
        log_warn "Not logged in to Docker Hub"
        log_info "Logging in to Docker Hub..."
        docker login
    else
        log_info "Already logged in to Docker Hub"
    fi
}

# Build service image
build_service() {
    local service=$1
    local context_path=$2
    local image_name="${DOCKER_USERNAME}/${service}"

    log_info "Building ${service}..."

    if [ ! -d "$context_path" ]; then
        log_error "Directory not found: $context_path"
        return 1
    fi

    cd "$context_path"

    # Build image
    docker build -t "${image_name}:latest" -t "${image_name}:${VERSION}" .

    if [ $? -eq 0 ]; then
        log_info "Successfully built ${service}"
    else
        log_error "Failed to build ${service}"
        return 1
    fi

    cd - > /dev/null
}

# Push service image
push_service() {
    local service=$1
    local image_name="${DOCKER_USERNAME}/${service}"

    log_info "Pushing ${service} to Docker Hub..."

    # Push latest tag
    docker push "${image_name}:latest"

    # Push version tag
    docker push "${image_name}:${VERSION}"

    if [ $? -eq 0 ]; then
        log_info "Successfully pushed ${service}"
    else
        log_error "Failed to push ${service}"
        return 1
    fi
}

# Main execution
main() {
    log_info "Starting Docker Hub deployment..."
    log_info "Version: ${VERSION}"
    log_info "Docker Username: ${DOCKER_USERNAME}"
    echo ""

    # Check Docker login
    check_docker_login
    echo ""

    # Build User Service
    log_info "=== Building User Service ==="
    build_service "user-service" "backend/services/user-service"
    echo ""

    # Build Frontend Web
    log_info "=== Building Frontend Web ==="
    # Create optimized production Dockerfile if needed
    if [ ! -f "frontend/web/Dockerfile" ]; then
        log_warn "Creating production Dockerfile for frontend..."
        cat > frontend/web/Dockerfile << 'EOF'
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
EOF
    fi

    build_service "frontend-web" "frontend/web"
    echo ""

    # Push images
    log_info "=== Pushing Images to Docker Hub ==="

    push_service "user-service"
    echo ""

    push_service "frontend-web"
    echo ""

    # Summary
    log_info "=== Deployment Summary ==="
    log_info "Deployed images:"
    log_info "  - ${DOCKER_USERNAME}/user-service:latest"
    log_info "  - ${DOCKER_USERNAME}/user-service:${VERSION}"
    log_info "  - ${DOCKER_USERNAME}/frontend-web:latest"
    log_info "  - ${DOCKER_USERNAME}/frontend-web:${VERSION}"
    echo ""
    log_info "✅ Docker Hub deployment completed successfully!"
    log_info ""
    log_info "Next steps:"
    log_info "  1. Test images: docker pull ${DOCKER_USERNAME}/user-service:latest"
    log_info "  2. Deploy to production: docker-compose up -d"
    log_info "  3. Monitor services: docker-compose logs -f"
}

# Run main function
main "$@"
