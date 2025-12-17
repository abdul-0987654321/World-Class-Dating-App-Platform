#!/bin/bash
set -e

echo "=== Applying fixes and rebuilding services ==="

cd "C:/Users/citad/OneDrive/Documents/Dating/Flamoral"

# 1. Fix admin-service Redis TLS
echo "1. Fixing admin-service Redis TLS..."
cp backend/services/admin-service/src/infrastructure/redis-FIXED.ts backend/services/admin-service/src/infrastructure/redis.ts

# 2. Fix notification-service logger
echo "2. Fixing notification-service logger..."
cp backend/services/notification-service/src/utils/logger-fixed.ts backend/services/notification-service/src/utils/logger.ts

# 3. Build admin-service
echo "3. Building admin-service..."
az acr build --registry flamoraldevacr --image admin-service:latest --file backend/services/admin-service/Dockerfile .

# 4. Build notification-service
echo "4. Building notification-service..."
az acr build --registry flamoraldevacr --image notification-service:latest --file backend/services/notification-service/Dockerfile .

# 5. Restart deployments
echo "5. Restarting deployments..."
kubectl rollout restart deployment/admin-service -n flamoral
kubectl rollout restart deployment/notification-service -n flamoral

echo "=== Done! Wait for pods to restart ==="
kubectl get pods -n flamoral -w
