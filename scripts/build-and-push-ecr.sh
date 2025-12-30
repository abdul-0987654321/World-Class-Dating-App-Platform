#!/bin/bash
# Build and Push All Docker Images to ECR
# Production-ready deployment script

set -e

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="992382449461"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_TAG="${IMAGE_TAG:-latest}"
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=============================================="
echo "Flamoral Platform - Docker Build & Push"
echo "=============================================="
echo "Registry: ${ECR_REGISTRY}"
echo "Tag: ${IMAGE_TAG}"
echo "Git SHA: ${GIT_SHA}"
echo "Build Date: ${BUILD_DATE}"
echo "=============================================="

# Authenticate with ECR
echo -e "${YELLOW}Authenticating with ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Service definitions: [service_name]="dockerfile_path:ecr_repo_name"
declare -A SERVICES=(
    # Core Node.js Services
    ["auth-service"]="backend/services/auth-service:dating-app/auth-service"
    ["user-service"]="backend/services/user-service:dating-app/user-service"
    ["payment-service"]="backend/services/payment-service:dating-app/payment-service"
    ["api-gateway"]="backend/services/api-gateway:dating-app/api-gateway"
    ["messaging-service"]="backend/services/messaging-service:dating-app/messaging-service"
    ["matching-service"]="backend/services/matching-service:dating-app/matching-service"
    ["notification-service"]="backend/services/notification-service:dating-app/notification-service"
    ["admin-service"]="backend/services/admin-service:dating-app/admin-service"
    ["media-service"]="backend/services/media-service:dating-app/media-service"
    ["moderation-service"]="backend/services/moderation-service:dating-app/moderation-service"
    ["analytics-service"]="backend/services/analytics-service:dating-app/analytics-service"

    # AI/ML Python Services
    ["recommendation-service"]="backend/services/ai-services/recommendation-service:dating-app/recommendation-service"

    # Go Services
    ["realtime-service"]="backend/services/realtime-service:dating-app/messaging-service"
)

# Track results
SUCCESSFUL=()
FAILED=()

build_and_push() {
    local service_name=$1
    local config=${SERVICES[$service_name]}
    local dockerfile_dir=$(echo $config | cut -d: -f1)
    local ecr_repo=$(echo $config | cut -d: -f2)
    local full_image="${ECR_REGISTRY}/${ecr_repo}"

    echo ""
    echo -e "${YELLOW}Building ${service_name}...${NC}"
    echo "  Dockerfile: ${dockerfile_dir}/Dockerfile"
    echo "  ECR Repo: ${ecr_repo}"

    # Build image
    if docker build \
        --build-arg BUILD_DATE="${BUILD_DATE}" \
        --build-arg GIT_SHA="${GIT_SHA}" \
        --build-arg VERSION="${IMAGE_TAG}" \
        -t "${full_image}:${IMAGE_TAG}" \
        -t "${full_image}:${GIT_SHA}" \
        -f "${dockerfile_dir}/Dockerfile" \
        . ; then

        echo -e "${GREEN}Build successful for ${service_name}${NC}"

        # Push to ECR
        echo "Pushing ${service_name} to ECR..."
        if docker push "${full_image}:${IMAGE_TAG}" && \
           docker push "${full_image}:${GIT_SHA}"; then
            echo -e "${GREEN}Push successful for ${service_name}${NC}"
            SUCCESSFUL+=("$service_name")
        else
            echo -e "${RED}Push failed for ${service_name}${NC}"
            FAILED+=("$service_name")
        fi
    else
        echo -e "${RED}Build failed for ${service_name}${NC}"
        FAILED+=("$service_name")
    fi
}

# Build all services
for service in "${!SERVICES[@]}"; do
    build_and_push "$service"
done

# Summary
echo ""
echo "=============================================="
echo "BUILD SUMMARY"
echo "=============================================="
echo -e "${GREEN}Successful (${#SUCCESSFUL[@]}):${NC}"
for s in "${SUCCESSFUL[@]}"; do
    echo "  - $s"
done

if [ ${#FAILED[@]} -gt 0 ]; then
    echo -e "${RED}Failed (${#FAILED[@]}):${NC}"
    for f in "${FAILED[@]}"; do
        echo "  - $f"
    done
    exit 1
fi

echo ""
echo -e "${GREEN}All services built and pushed successfully!${NC}"
echo "=============================================="
