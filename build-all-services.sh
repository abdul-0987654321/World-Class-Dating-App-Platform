#!/bin/bash

# Build All Backend Services Docker Images
# This script builds Docker images for all backend services

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track build results
declare -a SUCCEEDED=()
declare -a FAILED=()
declare -a MISSING=()

echo "=============================================="
echo "Building All Backend Docker Images"
echo "=============================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Docker is not running. Please start Docker Desktop first.${NC}"
    exit 1
fi

# Function to build a service
build_service() {
    local service_name=$1
    local service_path=$2
    local dockerfile_path="${service_path}/Dockerfile"

    echo -e "${YELLOW}Building: ${service_name}${NC}"

    if [ ! -f "$dockerfile_path" ]; then
        echo -e "${RED}  MISSING: No Dockerfile found${NC}"
        MISSING+=("$service_name")
        return
    fi

    if docker build -t "flamoral/${service_name}:latest" -f "$dockerfile_path" . 2>&1; then
        echo -e "${GREEN}  SUCCESS: ${service_name}${NC}"
        SUCCEEDED+=("$service_name")
    else
        echo -e "${RED}  FAILED: ${service_name}${NC}"
        FAILED+=("$service_name")
    fi
    echo ""
}

# Main services
echo "=== Main Backend Services ==="
build_service "api-gateway" "backend/services/api-gateway"
build_service "auth-service" "backend/services/auth-service"
build_service "user-service" "backend/services/user-service"
build_service "matching-service" "backend/services/matching-service"
build_service "messaging-service" "backend/services/messaging-service"
build_service "media-service" "backend/services/media-service"
build_service "payment-service" "backend/services/payment-service"
build_service "notification-service" "backend/services/notification-service"
build_service "analytics-service" "backend/services/analytics-service"
build_service "moderation-service" "backend/services/moderation-service"
build_service "admin-service" "backend/services/admin-service"
build_service "automation-service" "backend/services/automation-service"
build_service "advertising-service" "backend/services/advertising-service"
build_service "workflow-engine" "backend/services/workflow-engine"
build_service "policy-service" "backend/services/policy-service"
build_service "realtime-service" "backend/services/realtime-service"

# AI Services
echo "=== AI Services ==="
build_service "content-generator" "backend/services/ai-services/content-generator"
build_service "dating-coach-service" "backend/services/ai-services/dating-coach-service"
build_service "fraud-detection" "backend/services/ai-services/fraud-detection"
build_service "nlp-service" "backend/services/ai-services/nlp-service"
build_service "photo-analysis" "backend/services/ai-services/photo-analysis"
build_service "recommendation-service" "backend/services/ai-services/recommendation-service"

# Summary
echo "=============================================="
echo "BUILD SUMMARY"
echo "=============================================="
echo ""
echo -e "${GREEN}SUCCEEDED (${#SUCCEEDED[@]}):${NC}"
for s in "${SUCCEEDED[@]}"; do
    echo "  - $s"
done

if [ ${#FAILED[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}FAILED (${#FAILED[@]}):${NC}"
    for f in "${FAILED[@]}"; do
        echo "  - $f"
    done
fi

if [ ${#MISSING[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}MISSING DOCKERFILE (${#MISSING[@]}):${NC}"
    for m in "${MISSING[@]}"; do
        echo "  - $m"
    done
fi

echo ""
echo "Total: $((${#SUCCEEDED[@]} + ${#FAILED[@]} + ${#MISSING[@]})) services"
echo "=============================================="

# Exit with error if any failed
if [ ${#FAILED[@]} -gt 0 ]; then
    exit 1
fi
