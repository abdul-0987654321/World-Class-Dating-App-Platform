#!/bin/bash
# Build and push all Docker images to Azure Container Registry
# Usage: ./scripts/build-and-push-all.sh

set -e

ACR_NAME="flamoraldevacr"
ACR_URL="${ACR_NAME}.azurecr.io"

# Login to ACR
echo "Logging in to Azure Container Registry..."
az acr login --name $ACR_NAME

# Define all services to build
SERVICES=(
    "auth-service"
    "user-service"
    "payment-service"
    "messaging-service"
    "matching-service"
    "media-service"
    "notification-service"
    "moderation-service"
    "analytics-service"
    "admin-service"
    "api-gateway"
    "workflow-engine"
    "automation-service"
    "advertising-service"
    "realtime-service"
)

AI_SERVICES=(
    "dating-coach-service"
    "fraud-detection"
    "nlp-service"
    "photo-analysis"
    "recommendation-service"
    "content-generator"
)

BACKEND_DIR="C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/backend/services"

# Build and push regular services
for SERVICE in "${SERVICES[@]}"; do
    echo ""
    echo "=========================================="
    echo "Building $SERVICE..."
    echo "=========================================="

    SERVICE_DIR="$BACKEND_DIR/$SERVICE"

    if [ -f "$SERVICE_DIR/Dockerfile" ]; then
        docker build -t "$ACR_URL/$SERVICE:latest" -t "$ACR_URL/$SERVICE:$(date +%Y%m%d%H%M%S)" "$SERVICE_DIR"
        docker push "$ACR_URL/$SERVICE:latest"
        echo "✅ $SERVICE built and pushed successfully"
    else
        echo "⚠️ No Dockerfile found for $SERVICE, skipping..."
    fi
done

# Build and push AI services
for SERVICE in "${AI_SERVICES[@]}"; do
    echo ""
    echo "=========================================="
    echo "Building AI service: $SERVICE..."
    echo "=========================================="

    SERVICE_DIR="$BACKEND_DIR/ai-services/$SERVICE"

    if [ -f "$SERVICE_DIR/Dockerfile" ]; then
        docker build -t "$ACR_URL/ai-$SERVICE:latest" "$SERVICE_DIR"
        docker push "$ACR_URL/ai-$SERVICE:latest"
        echo "✅ AI $SERVICE built and pushed successfully"
    else
        echo "⚠️ No Dockerfile found for AI $SERVICE, skipping..."
    fi
done

# Build frontend
echo ""
echo "=========================================="
echo "Building frontend web app..."
echo "=========================================="
FRONTEND_DIR="C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/docker/frontend"
if [ -f "$FRONTEND_DIR/Dockerfile" ]; then
    docker build -t "$ACR_URL/frontend-web:latest" -f "$FRONTEND_DIR/Dockerfile" "C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/frontend/web"
    docker push "$ACR_URL/frontend-web:latest"
    echo "✅ Frontend web built and pushed successfully"
fi

echo ""
echo "=========================================="
echo "All images built and pushed successfully!"
echo "=========================================="

# List all images in ACR
echo ""
echo "Images in ACR:"
az acr repository list --name $ACR_NAME --output table
