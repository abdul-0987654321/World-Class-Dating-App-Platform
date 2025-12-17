#!/bin/bash
# Build all services to ACR using ACR Tasks
# This script handles the monorepo postinstall issue

set -e

ACR_NAME="flamoralacr"
PROJECT_ROOT="C:/Users/citad/OneDrive/Documents/Dating/Flamoral"

echo "========================================="
echo "Building ALL Services to Azure Container Registry"
echo "ACR: $ACR_NAME"
echo "========================================="

# Backup original package.json
echo "Backing up package.json..."
cp "$PROJECT_ROOT/package.json" "$PROJECT_ROOT/package.json.backup.acr"

# Remove postinstall hook temporarily
echo "Removing postinstall hook..."
cat "$PROJECT_ROOT/package.json" | grep -v '"postinstall"' > "$PROJECT_ROOT/package.json.tmp"
mv "$PROJECT_ROOT/package.json.tmp" "$PROJECT_ROOT/package.json"

# Function to restore package.json on exit
cleanup() {
    echo "Restoring original package.json..."
    mv "$PROJECT_ROOT/package.json.backup.acr" "$PROJECT_ROOT/package.json"
}
trap cleanup EXIT

# Define all services with their paths
declare -a SERVICES=(
    "api-gateway:backend/services/api-gateway/Dockerfile"
    "auth-service:backend/services/auth-service/Dockerfile"
    "user-service:backend/services/user-service/Dockerfile"
    "matching-service:backend/services/matching-service/Dockerfile"
    "messaging-service:backend/services/messaging-service/Dockerfile"
    "media-service:backend/services/media-service/Dockerfile"
    "payment-service:backend/services/payment-service/Dockerfile"
    "notification-service:backend/services/notification-service/Dockerfile"
    "analytics-service:backend/services/analytics-service/Dockerfile"
    "moderation-service:backend/services/moderation-service/Dockerfile"
    "admin-service:backend/services/admin-service/Dockerfile"
    "advertising-service:backend/services/advertising-service/Dockerfile"
    "realtime-service:backend/services/realtime-service/Dockerfile"
    "workflow-engine:backend/services/workflow-engine/Dockerfile"
    "automation-service:backend/services/automation-service/Dockerfile"
    "recommendation-service:backend/services/ai-services/recommendation-service/Dockerfile"
    "nlp-service:backend/services/ai-services/nlp-service/Dockerfile"
    "photo-analysis:backend/services/ai-services/photo-analysis/Dockerfile"
    "fraud-detection:backend/services/ai-services/fraud-detection/Dockerfile"
    "dating-coach-service:backend/services/ai-services/dating-coach-service/Dockerfile"
    "content-generator:backend/services/ai-services/content-generator/Dockerfile"
)

# Counter
TOTAL=${#SERVICES[@]}
CURRENT=0
FAILED=()

echo ""
echo "Building $TOTAL services..."
echo ""

cd "$PROJECT_ROOT"

# Build each service
for SERVICE_INFO in "${SERVICES[@]}"; do
    IFS=':' read -r SERVICE_NAME DOCKERFILE_PATH <<< "$SERVICE_INFO"
    CURRENT=$((CURRENT + 1))

    echo "[$CURRENT/$TOTAL] Building $SERVICE_NAME..."

    if az acr build \
        --registry "$ACR_NAME" \
        --image "$SERVICE_NAME:latest" \
        --image "$SERVICE_NAME:v1.0.0" \
        --image "$SERVICE_NAME:prod" \
        --file "$DOCKERFILE_PATH" \
        . > "/tmp/acr-build-$SERVICE_NAME.log" 2>&1; then
        echo "[$CURRENT/$TOTAL] ✓ $SERVICE_NAME built successfully"
    else
        echo "[$CURRENT/$TOTAL] ✗ $SERVICE_NAME failed"
        FAILED+=("$SERVICE_NAME")
    fi
    echo ""
done

echo "========================================="
echo "Build Summary"
echo "========================================="
echo "Total: $TOTAL"
echo "Successful: $((TOTAL - ${#FAILED[@]}))"
echo "Failed: ${#FAILED[@]}"

if [ ${#FAILED[@]} -gt 0 ]; then
    echo ""
    echo "Failed services:"
    for SERVICE in "${FAILED[@]}"; do
        echo "  - $SERVICE"
    done
    exit 1
fi

echo ""
echo "All services built successfully!"
