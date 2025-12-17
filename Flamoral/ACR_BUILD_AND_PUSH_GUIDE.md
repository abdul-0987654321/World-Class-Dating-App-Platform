# Azure Container Registry (ACR) - Build and Push Guide

This guide provides comprehensive instructions for building and pushing Docker images to Azure Container Registry for the Flamoral Dating Platform.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [ACR Registries](#acr-registries)
- [Quick Start](#quick-start)
- [Build Scripts](#build-scripts)
- [Available Services](#available-services)
- [Build and Push Process](#build-and-push-process)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

The Flamoral platform consists of multiple microservices, each with its own Docker image. These images are stored in Azure Container Registry (ACR) and deployed to Azure Kubernetes Service (AKS).

### Architecture

- **Backend Services**: 15 Node.js/NestJS microservices
- **AI Services**: 6 Python-based AI/ML services
- **Frontend**: React-based web application
- **Infrastructure**: Multi-environment setup (dev, staging, prod)

## Prerequisites

Before building and pushing images, ensure you have:

### Required Tools

1. **Docker Desktop** (v20.10+)
   ```bash
   docker --version
   ```

2. **Azure CLI** (v2.40+)
   ```bash
   az --version
   ```

3. **Git** (for VCS references)
   ```bash
   git --version
   ```

### Azure Authentication

Login to Azure:
```bash
az login
```

Verify your subscription:
```bash
az account show
```

Set the correct subscription (if needed):
```bash
az account set --subscription "Dating-Prod"
```

## ACR Registries

The platform uses separate ACR registries for each environment:

| Environment | ACR Name | Login Server | Resource Group |
|-------------|----------|--------------|----------------|
| Development | `flamoraldevacr` | `flamoraldevacr.azurecr.io` | `flamoral-dev-rg` |
| Staging | `flamoralstagingacr` | `flamoralstagingacr.azurecr.io` | `flamoral-staging-rg` |
| Shared | `flamoralacr` | `flamoralacr.azurecr.io` | `flamoral-shared-rg` |

### Verify ACR Access

List available registries:
```bash
az acr list --query "[].{Name:name, LoginServer:loginServer}" -o table
```

Check if you have push access:
```bash
az acr check-health --name flamoraldevacr --yes
```

## Quick Start

### Option 1: Build Core Services Only (Fastest)

Build and push just the essential services:

```bash
# Linux/Mac
cd Flamoral
./scripts/build-and-push-core-services.sh dev

# Windows PowerShell
cd Flamoral
.\scripts\build-and-push-core-services.ps1 -Environment dev
```

### Option 2: Build All Services

Build and push all services:

```bash
# Linux/Mac
cd Flamoral
./scripts/build-and-push-to-acr.sh --environment dev

# Windows PowerShell
cd Flamoral
.\scripts\build-and-push-to-acr.ps1 -Environment dev
```

### Option 3: Build Without Pushing (Testing)

Test builds without pushing to ACR:

```bash
# Dry run
./scripts/build-and-push-to-acr.sh --dry-run

# Build only, no push
./scripts/build-and-push-to-acr.sh --no-push
```

## Build Scripts

### Main Build Script

**Location**: `scripts/build-and-push-to-acr.sh` (Linux/Mac) or `scripts/build-and-push-to-acr.ps1` (Windows)

**Features**:
- Multi-stage Docker builds
- Build caching support
- Multiple tag generation (latest, version, environment-specific)
- Parallel build option
- Dry-run mode
- Comprehensive error handling
- Build statistics and summary

**Usage**:

```bash
# Basic usage
./scripts/build-and-push-to-acr.sh --environment dev

# With custom tag and version
./scripts/build-and-push-to-acr.sh --environment prod --tag v1.2.3 --version 1.2.3

# Build without cache (clean build)
./scripts/build-and-push-to-acr.sh --environment staging --no-cache

# Dry run (see what would happen)
./scripts/build-and-push-to-acr.sh --dry-run

# Build only, don't push
./scripts/build-and-push-to-acr.sh --no-push

# Show help
./scripts/build-and-push-to-acr.sh --help
```

**PowerShell Usage**:

```powershell
# Basic usage
.\scripts\build-and-push-to-acr.ps1 -Environment dev

# With custom tag
.\scripts\build-and-push-to-acr.ps1 -Environment prod -Tag "v1.2.3" -Version "1.2.3"

# Build without cache
.\scripts\build-and-push-to-acr.ps1 -Environment staging -NoCache

# Dry run
.\scripts\build-and-push-to-acr.ps1 -DryRun

# Build only
.\scripts\build-and-push-to-acr.ps1 -NoPush

# Show help
.\scripts\build-and-push-to-acr.ps1 -Help
```

### Core Services Script

**Location**: `scripts/build-and-push-core-services.sh`

Builds only the essential services for quick deployments:
- api-gateway
- auth-service
- user-service
- messaging-service
- matching-service

**Usage**:
```bash
./scripts/build-and-push-core-services.sh [environment]
# Example: ./scripts/build-and-push-core-services.sh dev
```

## Available Services

### Node.js Backend Services (15)

1. **api-gateway** - Main API gateway and routing
2. **auth-service** - Authentication and authorization
3. **user-service** - User profile management
4. **matching-service** - Dating matching algorithm
5. **messaging-service** - Real-time messaging
6. **media-service** - Photo/video upload and processing
7. **payment-service** - Stripe payment integration
8. **notification-service** - Push notifications and emails
9. **analytics-service** - Analytics and metrics
10. **moderation-service** - Content moderation
11. **realtime-service** - WebSocket connections
12. **admin-service** - Admin dashboard backend
13. **automation-service** - Automated workflows
14. **advertising-service** - Ad management
15. **workflow-engine** - Business process automation

### Python AI Services (6)

1. **recommendation-service** - ML-based recommendations
2. **photo-analysis** - Image analysis and validation
3. **nlp-service** - Natural language processing
4. **fraud-detection** - Fraud prevention ML
5. **dating-coach-service** - AI dating coach
6. **content-generator** - AI content generation

### Frontend

1. **frontend-web** - React web application

## Build and Push Process

### Step-by-Step Process

1. **Authentication**
   ```bash
   az login
   az acr login --name flamoraldevacr
   ```

2. **Build Images**
   - Multi-stage Docker build
   - Copies shared modules
   - Compiles TypeScript/Python
   - Creates optimized production images

3. **Tag Images**
   Each image receives multiple tags:
   - `latest` - Latest build
   - `{TAG}` - Custom tag (e.g., `v1.2.3`)
   - `{VERSION}` - Semantic version
   - `{ENVIRONMENT}-latest` - Environment-specific latest (e.g., `dev-latest`)

4. **Push to ACR**
   - Pushes all tags to registry
   - Verifies push success
   - Updates repository listings

5. **Verification**
   - Lists repositories
   - Shows recent tags
   - Confirms availability

### Image Naming Convention

```
{ACR_URL}/flamoral/{SERVICE_NAME}:{TAG}
```

Examples:
```
flamoraldevacr.azurecr.io/flamoral/user-service:latest
flamoraldevacr.azurecr.io/flamoral/user-service:v1.2.3
flamoraldevacr.azurecr.io/flamoral/user-service:1.2.3
flamoraldevacr.azurecr.io/flamoral/user-service:dev-latest
```

### Build Arguments

Each image is built with the following build arguments:

- `BUILD_DATE` - UTC timestamp of build
- `VCS_REF` - Git commit SHA (short)
- `VERSION` - Application version

Example:
```bash
docker build \
  --build-arg BUILD_DATE="2025-12-16T03:00:00Z" \
  --build-arg VCS_REF="44edaac" \
  --build-arg VERSION="1.0.0" \
  -t flamoraldevacr.azurecr.io/flamoral/user-service:latest \
  ...
```

## Verification

### List All Repositories

```bash
az acr repository list --name flamoraldevacr --output table
```

### List Tags for a Service

```bash
az acr repository show-tags \
  --name flamoraldevacr \
  --repository flamoral/user-service \
  --orderby time_desc \
  --output table
```

### Get Image Manifest

```bash
az acr repository show \
  --name flamoraldevacr \
  --repository flamoral/user-service \
  --output json
```

### Pull an Image (Test)

```bash
# Login first
az acr login --name flamoraldevacr

# Pull image
docker pull flamoraldevacr.azurecr.io/flamoral/user-service:latest

# Verify
docker images | grep user-service
```

### Check Image Size

```bash
az acr repository show-manifests \
  --name flamoraldevacr \
  --repository flamoral/user-service \
  --output table
```

## Troubleshooting

### Common Issues

#### 1. ACR Login Fails

**Problem**: `az acr login` fails with authentication error

**Solution**:
```bash
# Re-authenticate with Azure
az login

# Check your subscription
az account show

# Try login again
az acr login --name flamoraldevacr
```

#### 2. Docker Build Fails - Shared Module Not Found

**Problem**: Build fails with "Module '@flamoral/shared' not found"

**Solution**:
- Ensure you're building from the project root
- The Dockerfile copies shared modules during build
- Check that `backend/shared` directory exists

#### 3. Push Fails - Unauthorized

**Problem**: `docker push` fails with 401 Unauthorized

**Solution**:
```bash
# Re-login to ACR
az acr login --name flamoraldevacr

# Verify credentials
az acr credential show --name flamoraldevacr
```

#### 4. Build Fails - Out of Disk Space

**Problem**: Build fails due to insufficient disk space

**Solution**:
```bash
# Clean up old images
docker system prune -a

# Remove unused volumes
docker volume prune

# Check disk space
df -h
```

#### 5. Build is Slow

**Problem**: Builds take a very long time

**Solution**:
```bash
# Use build cache (default)
./scripts/build-and-push-to-acr.sh --environment dev

# For faster rebuilds, Docker will reuse layers

# If cache is corrupted, rebuild without cache
./scripts/build-and-push-to-acr.sh --environment dev --no-cache
```

### Debug Mode

To see detailed build output:

```bash
# Set Docker debug logging
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain

# Run build
./scripts/build-and-push-to-acr.sh --environment dev
```

## Best Practices

### 1. Version Tagging

Always use semantic versioning for production builds:

```bash
./scripts/build-and-push-to-acr.sh \
  --environment prod \
  --tag v1.2.3 \
  --version 1.2.3
```

### 2. Environment Separation

Use separate registries for different environments:
- **Dev**: Frequent builds, `latest` tag
- **Staging**: Release candidates, `rc-*` tags
- **Prod**: Stable releases, semantic version tags

### 3. Build Order

Build services in dependency order:
1. Shared libraries
2. Core services (auth, user)
3. Feature services (messaging, matching)
4. Frontend

### 4. Cache Management

- Use cache for incremental builds (default)
- Disable cache for clean builds after major changes
- Clean Docker cache periodically

### 5. Security

- Never commit ACR credentials to Git
- Use Azure Managed Identity for production
- Enable vulnerability scanning on ACR
- Keep base images updated

### 6. CI/CD Integration

For automated builds, use GitHub Actions:

```yaml
- name: Build and push to ACR
  run: |
    ./scripts/build-and-push-to-acr.sh \
      --environment ${{ github.event.inputs.environment }} \
      --tag ${{ github.sha }} \
      --version ${{ github.ref_name }}
```

### 7. Monitoring

After pushing images:
1. Verify all tags are present
2. Check image sizes (should be optimized)
3. Review build logs for warnings
4. Test pull from AKS cluster

## Advanced Usage

### Building Specific Services

To build only specific services, modify the script or build manually:

```bash
# Manual build for a single service
SERVICE="user-service"
ACR_URL="flamoraldevacr.azurecr.io"

docker build \
  -t $ACR_URL/flamoral/$SERVICE:latest \
  -f backend/services/$SERVICE/Dockerfile \
  .

docker push $ACR_URL/flamoral/$SERVICE:latest
```

### Parallel Builds

For faster builds on multi-core systems:

```bash
./scripts/build-and-push-to-acr.sh --parallel
```

### Cross-Platform Builds

For building multi-architecture images:

```bash
docker buildx create --use
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t flamoraldevacr.azurecr.io/flamoral/user-service:latest \
  --push \
  .
```

## Next Steps

After building and pushing images:

1. **Deploy to AKS**:
   ```bash
   kubectl set image deployment/user-service \
     user-service=flamoraldevacr.azurecr.io/flamoral/user-service:v1.2.3
   ```

2. **Update Helm Charts**:
   ```bash
   helm upgrade flamoral ./helm/flamoral \
     --set image.tag=v1.2.3
   ```

3. **Monitor Deployment**:
   ```bash
   kubectl rollout status deployment/user-service
   ```

## Resources

- [Azure Container Registry Documentation](https://docs.microsoft.com/en-us/azure/container-registry/)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Project README](./README.md)
- [Deployment Guide](./DEPLOYMENT_CHECKLIST.md)

## Support

For issues or questions:
- Check the troubleshooting section above
- Review build logs in `/tmp/claude/tasks/`
- Contact DevOps team
- Create an issue in the repository

---

**Last Updated**: 2025-12-16
**Version**: 1.0.0
**Maintained By**: Flamoral DevOps Team
