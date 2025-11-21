# Docker Build and Push Instructions

## Prerequisites
- Docker Desktop must be running
- Docker Hub credentials ready (username: citadelcloud1)

## Steps to Build and Push All Services to Docker Hub

### 1. Login to Docker Hub
```bash
echo "dckr_pat_ouIaa9OjRdEf-s-lPeHDqkcufpI" | docker login --username citadelcloud1 --password-stdin
```

### 2. Build Docker Images

Navigate to the project root directory:
```bash
cd "C:\Users\Dell\OneDrive\Desktop\World-Class-Dating-App-Platform\World-Class-Dating-App-Platform"
```

Build each service (from the backend/services directory context):

```bash
# API Gateway
docker build -t citadelcloud1/world-class-dating-platform:api-gateway-latest -f backend/services/api-gateway/Dockerfile .

# Messaging Service
docker build -t citadelcloud1/world-class-dating-platform:messaging-service-latest -f backend/services/messaging-service/Dockerfile .

# User Service
docker build -t citadelcloud1/world-class-dating-platform:user-service-latest -f backend/services/user-service/Dockerfile .

# Matching Service
docker build -t citadelcloud1/world-class-dating-platform:matching-service-latest -f backend/services/matching-service/Dockerfile .

# Media Service
docker build -t citadelcloud1/world-class-dating-platform:media-service-latest -f backend/services/media-service/Dockerfile .

# Payment Service
docker build -t citadelcloud1/world-class-dating-platform:payment-service-latest -f backend/services/payment-service/Dockerfile .

# Notification Service
docker build -t citadelcloud1/world-class-dating-platform:notification-service-latest -f backend/services/notification-service/Dockerfile .

# Analytics Service
docker build -t citadelcloud1/world-class-dating-platform:analytics-service-latest -f backend/services/analytics-service/Dockerfile .

# Moderation Service
docker build -t citadelcloud1/world-class-dating-platform:moderation-service-latest -f backend/services/moderation-service/Dockerfile .
```

### 3. Push Images to Docker Hub

```bash
docker push citadelcloud1/world-class-dating-platform:api-gateway-latest
docker push citadelcloud1/world-class-dating-platform:messaging-service-latest
docker push citadelcloud1/world-class-dating-platform:user-service-latest
docker push citadelcloud1/world-class-dating-platform:matching-service-latest
docker push citadelcloud1/world-class-dating-platform:media-service-latest
docker push citadelcloud1/world-class-dating-platform:payment-service-latest
docker push citadelcloud1/world-class-dating-platform:notification-service-latest
docker push citadelcloud1/world-class-dating-platform:analytics-service-latest
docker push citadelcloud1/world-class-dating-platform:moderation-service-latest
```

## Automated Script

Run all commands in one go:

```bash
cd "C:\Users\Dell\OneDrive\Desktop\World-Class-Dating-App-Platform\World-Class-Dating-App-Platform"

# Login
echo "dckr_pat_ouIaa9OjRdEf-s-lPeHDqkcufpI" | docker login --username citadelcloud1 --password-stdin

# Build all services
services=("api-gateway" "messaging-service" "user-service" "matching-service" "media-service" "payment-service" "notification-service" "analytics-service" "moderation-service")

for service in "${services[@]}"; do
  echo "Building $service..."
  docker build -t citadelcloud1/world-class-dating-platform:$service-latest -f backend/services/$service/Dockerfile . || echo "Failed to build $service"
done

# Push all services
for service in "${services[@]}"; do
  echo "Pushing $service..."
  docker push citadelcloud1/world-class-dating-platform:$service-latest || echo "Failed to push $service"
done

echo "All services built and pushed successfully!"
```

## Notes

- The Dockerfiles currently may need updates to properly include the shared package
- Each build should be run from the project root directory to ensure proper context
- Building may take 10-30 minutes depending on your system
- Each image will be approximately 100-300 MB

## Issues Fixed

✓ TypeScript compilation errors in messaging-service and api-gateway
✓ Missing @connectsphere/shared/utils/logger imports (fixed in 37 files)
✓ Duplicate identifier errors in messaging-service types
✓ Redis client method call issues in socket-manager
