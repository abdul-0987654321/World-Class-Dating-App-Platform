#!/bin/bash
# =============================================================================
# Build and Push Core Services to ACR
# =============================================================================
# This is a quick script to build and push only the core services
# Usage: ./build-and-push-core-services.sh [environment]
# =============================================================================

set -e

ENVIRONMENT="${1:-dev}"
ACR_NAME="flamoral${ENVIRONMENT}acr"
ACR_URL="${ACR_NAME}.azurecr.io"
TAG="latest"
VERSION="1.0.0"
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Get project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."

# Core services to build (critical ones first)
CORE_SERVICES=(
    "api-gateway"
    "auth-service"
    "user-service"
    "messaging-service"
    "matching-service"
)

echo "Building Core Services for $ENVIRONMENT environment"
echo "ACR: $ACR_URL"
echo ""

# Login to ACR
echo "Logging into ACR..."
az acr login --name $ACR_NAME || { echo "Failed to login to ACR"; exit 1; }
echo ""

# Build and push each service
for SERVICE in "${CORE_SERVICES[@]}"; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Building: $SERVICE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    SERVICE_DIR="$PROJECT_ROOT/backend/services/$SERVICE"
    DOCKERFILE="$SERVICE_DIR/Dockerfile"

    if [ ! -f "$DOCKERFILE" ]; then
        echo "⚠️  Dockerfile not found: $DOCKERFILE"
        continue
    fi

    IMAGE_BASE="$ACR_URL/flamoral/$SERVICE"

    # Build
    echo "Building image..."
    docker build \
        --build-arg BUILD_DATE="$BUILD_DATE" \
        --build-arg VCS_REF="$VCS_REF" \
        --build-arg VERSION="$VERSION" \
        -t "$IMAGE_BASE:latest" \
        -t "$IMAGE_BASE:$TAG" \
        -t "$IMAGE_BASE:$VERSION" \
        -f "$DOCKERFILE" \
        "$PROJECT_ROOT" || { echo "Failed to build $SERVICE"; continue; }

    echo "✓ Built successfully"

    # Push
    echo "Pushing to ACR..."
    docker push "$IMAGE_BASE:latest" || echo "Failed to push :latest"
    docker push "$IMAGE_BASE:$TAG" || echo "Failed to push :$TAG"
    docker push "$IMAGE_BASE:$VERSION" || echo "Failed to push :$VERSION"

    echo "✓ $SERVICE completed"
    echo ""
done

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  Core services build complete!             ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# List repositories
echo "Repositories in ACR:"
az acr repository list --name $ACR_NAME --output table
