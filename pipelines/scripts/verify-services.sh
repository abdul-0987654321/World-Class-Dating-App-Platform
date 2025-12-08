#!/bin/bash
# =============================================================================
# Service Path Verification Script
# =============================================================================
# This script validates that all service directories referenced in the CI
# pipeline actually exist in the repository before attempting to build them.
# =============================================================================

set -e

echo "=========================================="
echo "Verifying Backend Service Directories"
echo "=========================================="

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

SERVICES=(
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
  "advertising-service"
  "realtime-service"
  "ai-services"
)

MISSING_SERVICES=()
MISSING_DOCKERFILES=()
MISSING_PACKAGE_JSON=()

for SERVICE in "${SERVICES[@]}"; do
  SERVICE_PATH="backend/services/$SERVICE"

  echo -n "Checking $SERVICE... "

  # Check if service directory exists
  if [ ! -d "$SERVICE_PATH" ]; then
    echo "MISSING DIRECTORY"
    MISSING_SERVICES+=("$SERVICE_PATH")
    continue
  fi

  # Check for Node.js services (all except ai-services and realtime-service)
  if [ "$SERVICE" != "ai-services" ] && [ "$SERVICE" != "realtime-service" ]; then
    if [ ! -f "$SERVICE_PATH/package.json" ]; then
      echo "MISSING package.json"
      MISSING_PACKAGE_JSON+=("$SERVICE_PATH/package.json")
    fi
  fi

  # Check if Dockerfile exists (required for Docker build stage)
  if [ ! -f "$SERVICE_PATH/Dockerfile" ]; then
    echo "MISSING Dockerfile"
    MISSING_DOCKERFILES+=("$SERVICE_PATH/Dockerfile")
  else
    echo "OK"
  fi
done

echo ""
echo "=========================================="
echo "Verification Results"
echo "=========================================="

EXIT_CODE=0

if [ ${#MISSING_SERVICES[@]} -gt 0 ]; then
  echo "ERROR: Missing service directories:"
  for DIR in "${MISSING_SERVICES[@]}"; do
    echo "  - $DIR"
  done
  EXIT_CODE=1
fi

if [ ${#MISSING_PACKAGE_JSON[@]} -gt 0 ]; then
  echo "WARNING: Missing package.json files:"
  for FILE in "${MISSING_PACKAGE_JSON[@]}"; do
    echo "  - $FILE"
  done
fi

if [ ${#MISSING_DOCKERFILES[@]} -gt 0 ]; then
  echo "WARNING: Missing Dockerfiles (required for Docker build stage):"
  for FILE in "${MISSING_DOCKERFILES[@]}"; do
    echo "  - $FILE"
  done
fi

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "SUCCESS: All service directories verified!"
  echo "Total services checked: ${#SERVICES[@]}"
else
  echo ""
  echo "FAILED: One or more service directories are missing!"
fi

echo "=========================================="

exit $EXIT_CODE
