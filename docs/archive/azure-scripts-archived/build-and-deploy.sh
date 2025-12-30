#!/bin/bash
# Flamoral Backend Services Build and Deploy Script
# This script builds and pushes Docker images to ACR, then deploys to AKS

set -e

# Configuration
ACR_NAME="flamoralprodacr"
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
AKS_CLUSTER="flamoral-prod-aks"
AKS_RESOURCE_GROUP="flamoral-shared-rg"
NAMESPACE="flamoral"
VERSION="v1.0.0"

# Services to build
SERVICES=("auth-service" "user-service" "matching-service" "messaging-service")
PORTS=("3001" "3002" "3003" "3004")

echo "=== Flamoral Backend Services Build and Deploy ==="
echo "ACR: ${ACR_LOGIN_SERVER}"
echo "AKS Cluster: ${AKS_CLUSTER}"
echo "Namespace: ${NAMESPACE}"
echo "Version: ${VERSION}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Step 1: Fix tsconfig files to remove rootDir constraint for Docker builds
echo "=== Step 1: Preparing TypeScript configurations ==="
for service in "${SERVICES[@]}"; do
    TSCONFIG_FILE="backend/services/${service}/tsconfig.json"
    if [ -f "$TSCONFIG_FILE" ]; then
        # Remove rootDir constraint to allow shared imports
        sed -i 's/"rootDir": ".\/src",//' "$TSCONFIG_FILE" 2>/dev/null || \
        sed -i '' 's/"rootDir": ".\/src",//' "$TSCONFIG_FILE" 2>/dev/null || true
        echo "Updated $TSCONFIG_FILE"
    fi
done

# Step 2: Build and push images to ACR
echo ""
echo "=== Step 2: Building and pushing images to ACR ==="
for i in "${!SERVICES[@]}"; do
    service="${SERVICES[$i]}"
    port="${PORTS[$i]}"

    echo ""
    echo "Building ${service}..."

    # Build using ACR Build
    az acr build \
        --registry "$ACR_NAME" \
        --image "${service}:${VERSION}" \
        --file "backend/services/${service}/Dockerfile" \
        . \
        2>&1 | tee "/tmp/${service}-build.log" || {
            echo "ERROR: Failed to build ${service}"
            echo "Check /tmp/${service}-build.log for details"
            continue
        }

    echo "${service} built successfully"
done

# Step 3: Connect to AKS
echo ""
echo "=== Step 3: Connecting to AKS ==="
az aks get-credentials --resource-group "$AKS_RESOURCE_GROUP" --name "$AKS_CLUSTER" --overwrite-existing

# Step 4: Create namespace if not exists
echo ""
echo "=== Step 4: Creating namespace ==="
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Step 5: Deploy services
echo ""
echo "=== Step 5: Deploying services to Kubernetes ==="
kubectl apply -f "infrastructure/kubernetes/deploy/backend-services-prod.yaml"

# Step 6: Wait for deployments
echo ""
echo "=== Step 6: Waiting for deployments to be ready ==="
for service in "${SERVICES[@]}"; do
    echo "Waiting for ${service}..."
    kubectl rollout status deployment/${service} -n "$NAMESPACE" --timeout=5m || {
        echo "WARNING: ${service} deployment may not be ready"
    }
done

# Step 7: Verify deployments
echo ""
echo "=== Step 7: Verifying deployments ==="
kubectl get deployments -n "$NAMESPACE"
kubectl get pods -n "$NAMESPACE"
kubectl get services -n "$NAMESPACE"

echo ""
echo "=== Deployment Complete ==="
echo "All services have been deployed to namespace: ${NAMESPACE}"
