# Docker Deployment Guide - Photo Verification System

Complete guide for building, testing, and deploying the Flamoral platform with Photo Verification System to Docker Hub.

**Last Updated**: November 18, 2025
**Version**: 2.0.0
**Status**: Production Ready

---

## Quick Start

### 1. Configure Azure Face API

```bash
# Add to backend/services/media-service/.env
AZURE_FACE_API_KEY=your-face-api-key
AZURE_FACE_ENDPOINT=https://your-region.api.cognitive.microsoft.com
```

### 2. Build Images

```bash
# Build all services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
```

### 3. Push to Docker Hub

```bash
# Login
docker login

# Tag and push
docker tag flamoral-media-service YOUR_USERNAME/flamoral-media-service:2.0.0
docker push YOUR_USERNAME/flamoral-media-service:2.0.0
```

---

## Photo Verification System Updates

### New Environment Variables

- `AZURE_FACE_API_KEY` - Azure Face API subscription key
- `AZURE_FACE_ENDPOINT` - Azure Face API endpoint URL
- `FACE_MATCH_THRESHOLD` - Face matching confidence (default: 0.7)
- `LIVENESS_THRESHOLD` - Liveness detection threshold (default: 0.6)
- `QUALITY_THRESHOLD` - Photo quality threshold (default: 0.5)

### New Database Tables

The photo verification system requires these new tables:
- `photo_verifications`
- `verification_attempts`
- `user_verification_status`
- `duplicate_profile_flags`

Run migrations after deployment:

```bash
docker exec flamoral-media-service npm run migrate:latest
```

---

## Building Docker Images

### Build All Services

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
```

### Build Media Service Only

```bash
docker build -t flamoral-media-service:2.0.0 ./backend/services/media-service
```

### Build with No Cache

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache media-service
```

---

## Pushing to Docker Hub

### 1. Login to Docker Hub

```bash
docker login
```

### 2. Tag Images

Replace `YOUR_USERNAME` with your Docker Hub username:

```bash
# Media Service
docker tag flamoral-media-service YOUR_USERNAME/flamoral-media-service:2.0.0
docker tag flamoral-media-service YOUR_USERNAME/flamoral-media-service:latest

# User Service
docker tag flamoral-user-service YOUR_USERNAME/flamoral-user-service:2.0.0
docker tag flamoral-user-service YOUR_USERNAME/flamoral-user-service:latest

# Matching Service
docker tag flamoral-matching-service YOUR_USERNAME/flamoral-matching-service:2.0.0
docker tag flamoral-matching-service YOUR_USERNAME/flamoral-matching-service:latest

# Messaging Service
docker tag flamoral-messaging-service YOUR_USERNAME/flamoral-messaging-service:2.0.0
docker tag flamoral-messaging-service YOUR_USERNAME/flamoral-messaging-service:latest

# API Gateway
docker tag flamoral-api-gateway YOUR_USERNAME/flamoral-api-gateway:2.0.0
docker tag flamoral-api-gateway YOUR_USERNAME/flamoral-api-gateway:latest
```

### 3. Push Images

```bash
# Push all with version 2.0.0
docker push YOUR_USERNAME/flamoral-media-service:2.0.0
docker push YOUR_USERNAME/flamoral-user-service:2.0.0
docker push YOUR_USERNAME/flamoral-matching-service:2.0.0
docker push YOUR_USERNAME/flamoral-messaging-service:2.0.0
docker push YOUR_USERNAME/flamoral-api-gateway:2.0.0

# Push latest tags
docker push YOUR_USERNAME/flamoral-media-service:latest
docker push YOUR_USERNAME/flamoral-user-service:latest
docker push YOUR_USERNAME/flamoral-matching-service:latest
docker push YOUR_USERNAME/flamoral-messaging-service:latest
docker push YOUR_USERNAME/flamoral-api-gateway:latest
```

---

## Testing Before Deployment

### 1. Run Locally

```bash
# Start infrastructure
docker-compose up -d

# Start application services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up media-service
```

### 2. Test Photo Verification

```bash
# Health check
curl http://localhost:3004/health

# Test verification endpoint
curl -X POST http://localhost:3004/api/verification/photo/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://test-image.jpg"}'
```

### 3. Run Database Migrations

```bash
docker exec -it flamoral-media-service npm run migrate:latest
```

---

## Automated Deployment Script

Create `scripts/deploy-to-dockerhub.sh`:

```bash
#!/bin/bash

DOCKER_USERNAME="YOUR_USERNAME"
VERSION="2.0.0"

echo "Building and pushing Flamoral services to Docker Hub..."

# Login
docker login

# Build
echo "Building images..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build

# Tag and Push Media Service
echo "Deploying media-service..."
docker tag flamoral-media-service $DOCKER_USERNAME/flamoral-media-service:$VERSION
docker tag flamoral-media-service $DOCKER_USERNAME/flamoral-media-service:latest
docker push $DOCKER_USERNAME/flamoral-media-service:$VERSION
docker push $DOCKER_USERNAME/flamoral-media-service:latest

# Tag and Push Other Services
for SERVICE in user-service matching-service messaging-service api-gateway; do
  echo "Deploying $SERVICE..."
  docker tag flamoral-$SERVICE $DOCKER_USERNAME/flamoral-$SERVICE:$VERSION
  docker tag flamoral-$SERVICE $DOCKER_USERNAME/flamoral-$SERVICE:latest
  docker push $DOCKER_USERNAME/flamoral-$SERVICE:$VERSION
  docker push $DOCKER_USERNAME/flamoral-$SERVICE:latest
done

echo "✅ All services deployed to Docker Hub!"
```

Make it executable:

```bash
chmod +x scripts/deploy-to-dockerhub.sh
./scripts/deploy-to-dockerhub.sh
```

---

## Production Deployment

### Pull and Run from Docker Hub

```bash
# Pull images
docker pull YOUR_USERNAME/flamoral-media-service:2.0.0

# Run with production config
docker run -d \
  --name flamoral-media-service \
  -p 3004:3004 \
  -e AZURE_FACE_API_KEY=$AZURE_FACE_API_KEY \
  -e AZURE_FACE_ENDPOINT=$AZURE_FACE_ENDPOINT \
  -e DB_HOST=your-db-host \
  -e REDIS_HOST=your-redis-host \
  YOUR_USERNAME/flamoral-media-service:2.0.0
```

---

## Rollback

If issues occur:

```bash
# Pull previous version
docker pull YOUR_USERNAME/flamoral-media-service:1.0.0

# Stop current
docker stop flamoral-media-service
docker rm flamoral-media-service

# Run previous version
docker run -d --name flamoral-media-service YOUR_USERNAME/flamoral-media-service:1.0.0
```

---

## Troubleshooting

### Azure Face API Errors

```bash
# Verify credentials are set
docker exec flamoral-media-service env | grep AZURE_FACE

# Test API manually
curl -X POST "https://your-region.api.cognitive.microsoft.com/face/v1.0/detect" \
  -H "Ocp-Apim-Subscription-Key: YOUR_KEY"
```

### Database Connection Issues

```bash
# Check database connection
docker exec flamoral-media-service ping postgres

# Verify credentials
docker exec flamoral-media-service env | grep DB_
```

---

## Deployment Checklist

- [ ] Azure Face API key configured
- [ ] Azure Storage configured
- [ ] Environment variables set
- [ ] Images built successfully
- [ ] Images tagged correctly
- [ ] Logged into Docker Hub
- [ ] Images pushed to Docker Hub
- [ ] Database migrations ready
- [ ] Health checks passing
- [ ] Documentation updated

---

**For complete documentation, see:**
- [PHOTO_VERIFICATION_COMPLETE.md](./PHOTO_VERIFICATION_COMPLETE.md)
- [Frontend Components README](./frontend/web/src/components/Verification/README.md)

**Built for Flamoral**
**Last Updated**: November 18, 2025
