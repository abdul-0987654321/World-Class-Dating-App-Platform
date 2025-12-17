# Flamoral Dating Platform - Docker Infrastructure

Complete Docker setup for building, deploying, and running all backend services of the Flamoral Dating Platform.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Directory Structure](#directory-structure)
- [Scripts](#scripts)
- [Docker Compose](#docker-compose)
- [Building Images](#building-images)
- [Pushing to Registry](#pushing-to-registry)
- [Deployment](#deployment)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)

## Overview

This infrastructure provides:

- **Multi-stage Dockerfiles** for all services (optimized for production)
- **Build automation** scripts for building all services
- **Push automation** for Azure Container Registry
- **Local development** environment using Docker Compose
- **Health check** utilities
- **Deployment** scripts for different environments

### Services Included

#### Node.js Services (15)
- api-gateway
- auth-service
- user-service
- matching-service
- messaging-service
- media-service
- payment-service
- notification-service
- analytics-service
- moderation-service
- realtime-service
- admin-service
- automation-service
- advertising-service
- workflow-engine

#### Python AI Services (6)
- recommendation-service
- nlp-service
- photo-analysis
- fraud-detection
- dating-coach-service
- content-generator

#### Infrastructure Services
- PostgreSQL (primary database)
- Redis (caching & sessions)
- MongoDB (messaging storage)
- MinIO (S3-compatible object storage)
- RabbitMQ (message queue)
- Elasticsearch (search & analytics)

## Prerequisites

- **Docker** >= 20.10
- **Docker Compose** >= 2.0
- **Azure CLI** >= 2.50 (for Azure deployments)
- **kubectl** (for Kubernetes deployments)
- **Bash** shell (Git Bash on Windows)

### Install Prerequisites

```bash
# Docker
# Download from: https://docs.docker.com/get-docker/

# Docker Compose (usually included with Docker Desktop)
docker-compose --version

# Azure CLI
# Download from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# kubectl
# Download from: https://kubernetes.io/docs/tasks/tools/
```

## Quick Start

### Local Development

1. **Clone the repository**
```bash
cd /path/to/DatingPlatform
```

2. **Setup environment variables**
```bash
cd infrastructure/docker
cp .env.example .env
# Edit .env with your configuration
```

3. **Start all services**
```bash
./dev-start.sh
```

4. **Check service health**
```bash
./health-check.sh
```

5. **View logs**
```bash
docker-compose -f docker-compose.yml logs -f
```

6. **Stop services**
```bash
./dev-stop.sh
```

### Building for Production

```bash
# Build all services
./build-all.sh --tag v1.0.0

# Build with no cache
./build-all.sh --tag v1.0.0 --no-cache

# Build in parallel (faster)
./build-all.sh --tag v1.0.0 --parallel

# Build and push
./build-all.sh --tag v1.0.0 --push
```

### Pushing to Azure Container Registry

```bash
# Login to Azure
az login

# Push all images
./push-all.sh --tag v1.0.0 --registry flamoral

# Dry run (see what would be pushed)
./push-all.sh --tag v1.0.0 --dry-run
```

## Directory Structure

```
infrastructure/docker/
├── README.md                  # This file
├── .env.example               # Environment variables template
├── docker-compose.yml         # Local development compose file
├── build-all.sh              # Build all Docker images
├── push-all.sh               # Push images to ACR
├── deploy.sh                 # Full deployment orchestration
├── dev-start.sh              # Start local development
├── dev-stop.sh               # Stop local development
├── health-check.sh           # Check service health
└── init-scripts/             # Database initialization scripts
    └── postgres/
        └── init.sql
```

## Scripts

### build-all.sh

Builds all Docker images for backend services.

**Usage:**
```bash
./build-all.sh [OPTIONS]

Options:
  -t, --tag <tag>         Docker image tag (default: latest)
  -r, --registry <reg>    Docker registry (default: flamoral)
  -p, --push              Push images after building
  --no-cache              Build without cache
  --parallel              Build services in parallel
  -h, --help              Show help message
```

**Examples:**
```bash
# Build all services with tag v1.0.0
./build-all.sh --tag v1.0.0

# Build and push to registry
./build-all.sh --tag v1.0.0 --push --registry flamoral.azurecr.io

# Build in parallel without cache
./build-all.sh --tag v1.0.0 --parallel --no-cache
```

### push-all.sh

Pushes all Docker images to Azure Container Registry.

**Usage:**
```bash
./push-all.sh [OPTIONS]

Options:
  -t, --tag <tag>            Docker image tag (default: latest)
  -r, --registry <acr-name>  Azure Container Registry name
  --acr-server <server>      Full ACR server URL
  --dry-run                  Show what would be pushed
  -h, --help                 Show help message
```

**Examples:**
```bash
# Push to ACR
./push-all.sh --tag v1.0.0 --registry flamoral

# Dry run
./push-all.sh --tag v1.0.0 --dry-run

# Using service principal
export AZURE_CLIENT_ID=xxx
export AZURE_CLIENT_SECRET=xxx
export AZURE_TENANT_ID=xxx
./push-all.sh --tag v1.0.0 --registry flamoral
```

### deploy.sh

Complete deployment orchestration (build, push, deploy).

**Usage:**
```bash
./deploy.sh [OPTIONS]

Options:
  -e, --env <env>         Target environment (dev, staging, prod)
  -t, --tag <tag>         Docker image tag
  -r, --registry <reg>    Docker registry
  -s, --service <svc>     Deploy only specific service
  --build-only            Only build, don't push
  --skip-build            Skip build, only push
  --skip-tests            Skip tests
  -h, --help              Show help message
```

**Examples:**
```bash
# Deploy to staging
./deploy.sh --env staging --tag v1.0.0

# Deploy single service to production
./deploy.sh --env prod --service api-gateway --tag v1.0.0

# Build only (no deployment)
./deploy.sh --build-only --tag v1.0.0
```

### dev-start.sh

Start local development environment.

**Usage:**
```bash
./dev-start.sh [OPTIONS]

Options:
  -b, --build             Build images before starting
  -s, --service <svc>     Start only specific service
  -f, --foreground        Run in foreground
  -l, --logs              Follow logs after starting
  -h, --help              Show help message
```

**Examples:**
```bash
# Start all services
./dev-start.sh

# Build and start
./dev-start.sh --build

# Start specific service with logs
./dev-start.sh --service api-gateway --logs
```

### dev-stop.sh

Stop local development environment.

**Usage:**
```bash
./dev-stop.sh [OPTIONS]

Options:
  -c, --clean             Remove volumes (deletes all data)
  -s, --service <svc>     Stop only specific service
  -h, --help              Show help message
```

**Examples:**
```bash
# Stop all services
./dev-stop.sh

# Stop and remove volumes
./dev-stop.sh --clean

# Stop specific service
./dev-stop.sh --service api-gateway
```

### health-check.sh

Check health status of all services.

**Usage:**
```bash
./health-check.sh [OPTIONS]

Options:
  -s, --service <svc>     Check only specific service
  -v, --verbose           Show detailed information
  -h, --help              Show help message
```

**Examples:**
```bash
# Check all services
./health-check.sh

# Check specific service
./health-check.sh --service api-gateway

# Verbose output
./health-check.sh --verbose
```

## Docker Compose

### Starting Services

```bash
# Start all services
docker-compose -f docker-compose.yml up -d

# Start specific service
docker-compose -f docker-compose.yml up -d api-gateway

# Build and start
docker-compose -f docker-compose.yml up -d --build
```

### Viewing Logs

```bash
# All services
docker-compose -f docker-compose.yml logs -f

# Specific service
docker-compose -f docker-compose.yml logs -f api-gateway

# Last 100 lines
docker-compose -f docker-compose.yml logs --tail=100
```

### Stopping Services

```bash
# Stop all services
docker-compose -f docker-compose.yml stop

# Stop and remove containers
docker-compose -f docker-compose.yml down

# Stop and remove containers + volumes
docker-compose -f docker-compose.yml down -v
```

### Scaling Services

```bash
# Scale specific service
docker-compose -f docker-compose.yml up -d --scale api-gateway=3
```

## Building Images

### Build Single Service

```bash
# From project root
docker build -t flamoral/api-gateway:latest \
  -f backend/services/api-gateway/Dockerfile .
```

### Build All Services

```bash
./build-all.sh --tag latest
```

### Dockerfile Features

All Dockerfiles include:

- **Multi-stage builds** - Smaller production images
- **Layer caching** - Faster builds
- **Non-root user** - Better security
- **Health checks** - Container health monitoring
- **dumb-init** - Proper signal handling
- **Production optimizations** - Minimal dependencies

## Pushing to Registry

### Azure Container Registry Setup

```bash
# Login to Azure
az login

# Create ACR (if not exists)
az acr create --name flamoral \
  --resource-group flamoral-rg \
  --sku Standard

# Get login server
az acr show --name flamoral --query loginServer

# Login to ACR
az acr login --name flamoral
```

### Push Images

```bash
# Using script
./push-all.sh --tag v1.0.0 --registry flamoral

# Manual push
docker tag flamoral/api-gateway:latest flamoral.azurecr.io/api-gateway:v1.0.0
docker push flamoral.azurecr.io/api-gateway:v1.0.0
```

## Deployment

### Local Development

```bash
# Start everything
./dev-start.sh

# Access services
curl http://localhost:4000/health  # API Gateway
curl http://localhost:4001/health  # Auth Service
# etc.
```

### Staging Deployment

```bash
# Full deployment
./deploy.sh --env staging --tag v1.0.0

# Single service
./deploy.sh --env staging --service api-gateway --tag v1.0.0
```

### Production Deployment

```bash
# With tests
./deploy.sh --env prod --tag v1.0.0

# Skip tests (not recommended)
./deploy.sh --env prod --tag v1.0.0 --skip-tests
```

## Health Checks

### Endpoint URLs

```
Infrastructure:
- PostgreSQL:        localhost:5432
- Redis:             localhost:6379
- MongoDB:           localhost:27017
- MinIO:             http://localhost:9000
- RabbitMQ:          http://localhost:15672
- Elasticsearch:     http://localhost:9200

Backend Services:
- API Gateway:       http://localhost:4000/health
- Auth Service:      http://localhost:4001/health
- User Service:      http://localhost:4002/health
- Matching Service:  http://localhost:4003/health
- Messaging Service: http://localhost:4004/health
- Media Service:     http://localhost:4005/health
- Payment Service:   http://localhost:4006/health
- Notification:      http://localhost:4007/health
- Analytics:         http://localhost:4008/health
- Moderation:        http://localhost:4009/health
- Admin Service:     http://localhost:4010/health
- Realtime Service:  http://localhost:4011/health

AI Services:
- Recommendation:    http://localhost:5000/health
- NLP Service:       http://localhost:5001/health
- Photo Analysis:    http://localhost:5002/health
- Fraud Detection:   http://localhost:5003/health
- Dating Coach:      http://localhost:5004/health
- Content Generator: http://localhost:5005/health
```

### Check Health

```bash
# All services
./health-check.sh

# Specific service
./health-check.sh --service api-gateway

# With curl
curl http://localhost:4000/health
```

## Troubleshooting

### Container Not Starting

```bash
# Check logs
docker-compose -f docker-compose.yml logs <service>

# Check container status
docker-compose -f docker-compose.yml ps

# Inspect container
docker inspect <container-id>
```

### Build Failures

```bash
# Clear Docker cache
docker builder prune -a

# Rebuild without cache
./build-all.sh --no-cache

# Check Dockerfile
docker build --progress=plain -f <Dockerfile> .
```

### Network Issues

```bash
# List networks
docker network ls

# Inspect network
docker network inspect flamoral-network

# Recreate network
docker-compose -f docker-compose.yml down
docker-compose -f docker-compose.yml up -d
```

### Database Connection Issues

```bash
# Check PostgreSQL
docker-compose -f docker-compose.yml exec postgres psql -U flamoral -d flamoral

# Check Redis
docker-compose -f docker-compose.yml exec redis redis-cli ping

# Check MongoDB
docker-compose -f docker-compose.yml exec mongodb mongosh
```

### Port Conflicts

```bash
# Check port usage
netstat -ano | findstr :4000  # Windows
lsof -i :4000                 # Linux/Mac

# Change ports in .env or docker-compose.yml
```

### Volume Issues

```bash
# Remove all volumes
docker-compose -f docker-compose.yml down -v

# Remove specific volume
docker volume rm <volume-name>

# List volumes
docker volume ls
```

### Azure ACR Login Issues

```bash
# Re-authenticate
az login
az acr login --name flamoral

# Check permissions
az role assignment list --assignee <user-id>

# Use admin credentials
az acr credential show --name flamoral
```

## Environment Variables

See `.env.example` for all available environment variables.

Key variables:

- `POSTGRES_PASSWORD` - PostgreSQL password
- `REDIS_PASSWORD` - Redis password
- `JWT_SECRET` - JWT signing secret
- `STRIPE_SECRET_KEY` - Stripe API key
- `AZURE_STORAGE_KEY` - Azure storage key
- `OPENAI_API_KEY` - OpenAI API key

## Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Use specific tags** - Avoid `latest` in production
3. **Run health checks** - Before and after deployment
4. **Monitor logs** - Check for errors after deployment
5. **Use multi-stage builds** - Keep images small
6. **Non-root users** - All containers run as non-root
7. **Resource limits** - Set memory and CPU limits
8. **Backup volumes** - Regular database backups
9. **Version control** - Tag images with git commit SHA
10. **Security scanning** - Scan images for vulnerabilities

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build images
        run: ./infrastructure/docker/build-all.sh --tag ${{ github.ref_name }}
      - name: Push to ACR
        env:
          AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
        run: ./infrastructure/docker/push-all.sh --tag ${{ github.ref_name }}
```

## Support

For issues or questions:

1. Check the [troubleshooting](#troubleshooting) section
2. Review service logs
3. Check Docker and Docker Compose versions
4. Verify environment variables
5. Contact DevOps team

## License

Proprietary - Flamoral Dating Platform
