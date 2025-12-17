#!/bin/bash
#
# Deployment Script for ConfigMap Database Credential Fix
# This script applies the corrected ConfigMap and restarts services
#

set -e  # Exit on error

echo "========================================"
echo "Flamoral ConfigMap Deployment Script"
echo "========================================"
echo ""

# Define paths and variables
CONFIGMAP_PATH="/c/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/kubernetes/configmaps/production-configmap.yaml"
NAMESPACE="flamoral"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "ERROR: kubectl is not installed or not in PATH"
    exit 1
fi

# Check if connected to cluster
echo "[1/6] Checking kubectl connectivity..."
if ! kubectl cluster-info &> /dev/null; then
    echo "ERROR: Cannot connect to Kubernetes cluster"
    echo "Please run: az aks get-credentials --resource-group flamoral-prod-rg --name flamoral-prod-aks"
    exit 1
fi

CONTEXT=$(kubectl config current-context)
echo "  Connected to context: $CONTEXT"
echo ""

# Verify ConfigMap file exists
echo "[2/6] Verifying ConfigMap file..."
if [ ! -f "$CONFIGMAP_PATH" ]; then
    echo "ERROR: ConfigMap file not found at $CONFIGMAP_PATH"
    exit 1
fi
echo "  ConfigMap file found"
echo ""

# Show what will be changed
echo "[3/6] Database Configuration Summary:"
echo "  DB_HOST: flamoral-prod-postgres.postgres.database.azure.com"
echo "  DB_NAME: flamoral (changed from flamoral_prod)"
echo "  DB_USER: flamoraladmin (changed from flamoral_admin@flamoral-prod-postgres)"
echo "  DB_PORT: 5432"
echo ""

# Apply the ConfigMap
echo "[4/6] Applying updated ConfigMap..."
kubectl apply -f "$CONFIGMAP_PATH" -n "$NAMESPACE"
if [ $? -eq 0 ]; then
    echo "  ConfigMap applied successfully"
else
    echo "ERROR: Failed to apply ConfigMap"
    exit 1
fi
echo ""

# Restart auth-service
echo "[5/6] Restarting auth-service deployment..."
kubectl rollout restart deployment/auth-service -n "$NAMESPACE"
if [ $? -eq 0 ]; then
    echo "  Auth service restart initiated"
else
    echo "ERROR: Failed to restart auth-service"
    exit 1
fi

# Wait for rollout to complete
echo "  Waiting for auth-service rollout to complete..."
kubectl rollout status deployment/auth-service -n "$NAMESPACE" --timeout=120s
echo ""

# Restart API Gateway
echo "[6/6] Restarting API Gateway deployment..."
kubectl rollout restart deployment/api-gateway -n "$NAMESPACE"
if [ $? -eq 0 ]; then
    echo "  API Gateway restart initiated"
else
    echo "ERROR: Failed to restart api-gateway"
    exit 1
fi

# Wait for rollout to complete
echo "  Waiting for api-gateway rollout to complete..."
kubectl rollout status deployment/api-gateway -n "$NAMESPACE" --timeout=120s
echo ""

# Verify pods are running
echo "========================================"
echo "Deployment Complete - Pod Status:"
echo "========================================"
echo ""
echo "Auth Service Pods:"
kubectl get pods -n "$NAMESPACE" -l app=auth-service
echo ""
echo "API Gateway Pods:"
kubectl get pods -n "$NAMESPACE" -l app=api-gateway
echo ""

echo "========================================"
echo "Testing Auth Endpoint..."
echo "========================================"
echo ""
echo "Waiting 10 seconds for services to stabilize..."
sleep 10

echo "Testing: POST https://api.flamoral.com/api/v1/api/auth/login"
curl -s -X POST "https://api.flamoral.com/api/v1/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "========================================"
echo "Deployment script completed!"
echo "========================================"
echo ""
echo "If you see HTTP Status: 401, the auth service is working correctly (invalid credentials)"
echo "If you see HTTP Status: 503, there may be a circuit breaker issue - wait a few minutes and try again"
echo ""
echo "To check logs:"
echo "  Auth Service: kubectl logs -n flamoral -l app=auth-service --tail=50"
echo "  API Gateway:  kubectl logs -n flamoral -l app=api-gateway --tail=50"
echo ""
