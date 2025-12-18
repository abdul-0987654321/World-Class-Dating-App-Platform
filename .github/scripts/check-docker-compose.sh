#!/bin/bash
# CI Check: Ensure docker-compose files are not in root directory
# Docker compose files should only be in infrastructure/local-dev/

set -e

echo "Checking for misplaced docker-compose files..."

# Check for docker-compose files in root
ROOT_COMPOSE_FILES=$(find . -maxdepth 1 -name "docker-compose*.yml" 2>/dev/null || true)

if [ -n "$ROOT_COMPOSE_FILES" ]; then
    echo "ERROR: Docker Compose files found in root directory!"
    echo "Docker Compose is for LOCAL DEVELOPMENT ONLY."
    echo "Production deployments use Azure AKS with Kubernetes manifests."
    echo ""
    echo "Found files:"
    echo "$ROOT_COMPOSE_FILES"
    echo ""
    echo "Action required:"
    echo "  1. Move these files to infrastructure/local-dev/"
    echo "  2. Update any scripts to reference the new location"
    echo "  3. See infrastructure/local-dev/README.md for details"
    echo ""
    exit 1
fi

# Check for docker-compose files in backend/services (except in local-dev)
BACKEND_COMPOSE_FILES=$(find backend/services -name "docker-compose*.yml" 2>/dev/null || true)

if [ -n "$BACKEND_COMPOSE_FILES" ]; then
    echo "WARNING: Docker Compose files found in backend/services/"
    echo "These should be moved to infrastructure/local-dev/ or removed."
    echo ""
    echo "Found files:"
    echo "$BACKEND_COMPOSE_FILES"
    echo ""
fi

# Check for docker-compose files in infrastructure/docker
INFRA_DOCKER_COMPOSE=$(find infrastructure/docker -name "docker-compose*.yml" 2>/dev/null || true)

if [ -n "$INFRA_DOCKER_COMPOSE" ]; then
    echo "WARNING: Docker Compose files found in infrastructure/docker/"
    echo "These should be in infrastructure/local-dev/"
    echo ""
    echo "Found files:"
    echo "$INFRA_DOCKER_COMPOSE"
    echo ""
fi

echo "Docker compose file location check passed!"
echo "Note: Production uses Azure AKS, not docker-compose"
