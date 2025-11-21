# ConnectSphere - Docker Hub Deployment Guide

## Overview

This guide explains how to build, push, and deploy ConnectSphere platform images to/from Docker Hub.

**Docker Hub Repository**: https://hub.docker.com/r/citadelcloud1/world-class-dating-platform

## Available Images

### Backend
- `citadelcloud1/world-class-dating-platform:backend-latest`
- `citadelcloud1/world-class-dating-platform:backend-v1.0.0`

**Services**: REST API (3000), GraphQL (4000), WebSocket (5000)

### Frontend
- `citadelcloud1/world-class-dating-platform:frontend-latest`
- `citadelcloud1/world-class-dating-platform:frontend-v1.0.0`

**Technology**: React + Vite + NGINX

### NGINX Gateway
- `citadelcloud1/world-class-dating-platform:nginx-latest`
- `citadelcloud1/world-class-dating-platform:nginx-v1.0.0`

**Routes**: API Gateway with load balancing

## Quick Start - Deploy from Docker Hub

### 1. Pull All Images

```bash
docker pull citadelcloud1/world-class-dating-platform:backend-latest
docker pull citadelcloud1/world-class-dating-platform:frontend-latest
docker pull citadelcloud1/world-class-dating-platform:nginx-latest
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Start with Docker Compose

```bash
docker-compose -f docker-compose.hub.yml up -d
```

### 4. Verify Deployment

```bash
# Check all services are running
docker-compose -f docker-compose.hub.yml ps

# Check health
curl http://localhost/health
curl http://localhost/api/health

# View logs
docker-compose -f docker-compose.hub.yml logs -f
```

## Building and Pushing Images

### Prerequisites

- Docker Desktop installed and running
- Docker Hub account credentials
- Project cloned locally

### Method 1: Using Batch Script (Windows)

```batch
cd World-Class-Dating-App-Platform
QUICK_BUILD.bat
```

This will:
1. Configure Docker credentials
2. Build all 3 images
3. Tag with `latest` and version
4. Push to Docker Hub

### Method 2: Using PowerShell Script (Windows)

```powershell
cd World-Class-Dating-App-Platform
powershell -ExecutionPolicy Bypass -File build-and-push-all.ps1
```

Features:
- Detailed progress output
- Error handling
- Build and push summary

### Method 3: Manual Build (Any Platform)

#### Build Backend

```bash
cd backend-unified
docker build -t citadelcloud1/world-class-dating-platform:backend-latest \
             -t citadelcloud1/world-class-dating-platform:backend-v1.0.0 .
```

#### Build Frontend

```bash
docker build -f infrastructure/docker/frontend/Dockerfile \
             -t citadelcloud1/world-class-dating-platform:frontend-latest \
             -t citadelcloud1/world-class-dating-platform:frontend-v1.0.0 \
             frontend/web
```

#### Build NGINX

```bash
cd infrastructure/docker/nginx
docker build -t citadelcloud1/world-class-dating-platform:nginx-latest \
             -t citadelcloud1/world-class-dating-platform:nginx-v1.0.0 .
```

#### Push to Docker Hub

```bash
# Login
docker login -u citadelcloud1

# Push backend
docker push citadelcloud1/world-class-dating-platform:backend-latest
docker push citadelcloud1/world-class-dating-platform:backend-v1.0.0

# Push frontend
docker push citadelcloud1/world-class-dating-platform:frontend-latest
docker push citadelcloud1/world-class-dating-platform:frontend-v1.0.0

# Push nginx
docker push citadelcloud1/world-class-dating-platform:nginx-latest
docker push citadelcloud1/world-class-dating-platform:nginx-v1.0.0
```

## Image Details

### Backend Image

**Base**: `node:20-alpine`
**Multi-stage Build**:
1. Dependencies stage
2. Build stage (TypeScript compilation)
3. Runtime stage (production)

**Exposed Ports**:
- 3000 (REST API)
- 4000 (GraphQL)
- 5000 (WebSocket)

**Health Check**: `http://localhost:3000/health`

**Size**: ~200MB (compressed)

### Frontend Image

**Base**: `nginx:alpine`
**Multi-stage Build**:
1. Build stage (Vite build)
2. NGINX stage (serving)

**Exposed Ports**:
- 8080 (NGINX)

**Health Check**: `http://localhost:8080/health`

**Size**: ~50MB (compressed)

### NGINX Gateway Image

**Base**: `nginx:alpine`

**Exposed Ports**:
- 80 (HTTP)
- 443 (HTTPS)

**Health Check**: `http://localhost/health`

**Size**: ~10MB (compressed)

## Deployment Scenarios

### Development

Use local builds with docker-compose:

```bash
docker-compose up -d
```

### Staging

Use tagged versions:

```bash
# Update .env for staging
docker-compose -f docker-compose.hub.yml pull
docker-compose -f docker-compose.hub.yml up -d
```

### Production

Use specific versions (not `latest`):

```yaml
services:
  backend:
    image: citadelcloud1/world-class-dating-platform:backend-v1.0.0
  frontend:
    image: citadelcloud1/world-class-dating-platform:frontend-v1.0.0
  nginx:
    image: citadelcloud1/world-class-dating-platform:nginx-v1.0.0
```

## Kubernetes Deployment

### Pull Secrets

Create Docker Hub pull secret:

```bash
kubectl create secret docker-registry dockerhub-secret \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=citadelcloud1 \
  --docker-password=YOUR_TOKEN \
  --docker-email=YOUR_EMAIL
```

### Example Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: connectsphere-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      imagePullSecrets:
        - name: dockerhub-secret
      containers:
        - name: backend
          image: citadelcloud1/world-class-dating-platform:backend-v1.0.0
          ports:
            - containerPort: 3000
            - containerPort: 4000
            - containerPort: 5000
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push to Docker Hub

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_TOKEN }}

      - name: Build and Push Backend
        run: |
          cd backend-unified
          docker build -t citadelcloud1/world-class-dating-platform:backend-${GITHUB_SHA::8} .
          docker push citadelcloud1/world-class-dating-platform:backend-${GITHUB_SHA::8}
```

## Troubleshooting

### Docker Login Issues

If `docker login` fails:

**Option 1**: Manual config

```bash
mkdir -p ~/.docker
cat > ~/.docker/config.json << EOF
{
  "auths": {
    "https://index.docker.io/v1/": {
      "auth": "BASE64_ENCODED_CREDENTIALS"
    }
  }
}
EOF
```

**Option 2**: Use access token

```bash
echo "YOUR_ACCESS_TOKEN" | docker login -u citadelcloud1 --password-stdin
```

### Build Failures

**Problem**: Out of disk space

```bash
docker system prune -a
```

**Problem**: Build timeout

Increase timeout or build with more resources:

```bash
docker build --memory=4g --cpus=4 ...
```

### Push Failures

**Problem**: Rate limiting

Wait and retry, or use Docker Hub paid plan.

**Problem**: Unauthorized

Verify credentials and token permissions.

## Monitoring

### Check Image Status

```bash
# List local images
docker images | grep citadelcloud1

# Check image size
docker images citadelcloud1/world-class-dating-platform --format "{{.Repository}}:{{.Tag}} - {{.Size}}"

# Inspect image
docker inspect citadelcloud1/world-class-dating-platform:backend-latest
```

### View Build History

Visit: https://hub.docker.com/r/citadelcloud1/world-class-dating-platform/builds

## Best Practices

### Tagging Strategy

1. **Latest**: Always points to most recent build
   - `backend-latest`
   - `frontend-latest`
   - `nginx-latest`

2. **Version**: Semantic versioning
   - `backend-v1.0.0`
   - `backend-v1.1.0`

3. **Commit SHA**: For tracking
   - `backend-abc1234`

4. **Date**: For rollback
   - `backend-20250121`

### Security

1. Use multi-stage builds (reduces image size)
2. Run as non-root user
3. Scan images for vulnerabilities:
   ```bash
   docker scan citadelcloud1/world-class-dating-platform:backend-latest
   ```
4. Use specific base image versions
5. Regular updates

### Performance

1. Use `.dockerignore` to exclude unnecessary files
2. Leverage layer caching
3. Minimize number of layers
4. Use Alpine images when possible

## Support

- **Docker Hub Issues**: Contact Docker support
- **Image Issues**: Create GitHub issue
- **Build Help**: See `MIGRATION_GUIDE.md`

## References

- Docker Hub Repo: https://hub.docker.com/r/citadelcloud1/world-class-dating-platform
- Documentation: See `ARCHITECTURE.md`
- Migration Guide: See `MIGRATION_GUIDE.md`

---

**Last Updated**: 2025-01-13
**Version**: 1.0.0
