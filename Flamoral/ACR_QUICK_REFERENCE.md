# ACR Build & Push - Quick Reference

## Quick Commands

### Login to ACR
```bash
# Development
az acr login --name flamoraldevacr

# Staging
az acr login --name flamoralstagingacr

# Shared/Production
az acr login --name flamoralacr
```

### Build & Push All Services
```bash
# Linux/Mac
cd Flamoral
./scripts/build-and-push-to-acr.sh --environment dev

# Windows
cd Flamoral
.\scripts\build-and-push-to-acr.ps1 -Environment dev
```

### Build & Push Core Services Only
```bash
# Faster - only essential services
./scripts/build-and-push-core-services.sh dev
```

### Build Options
```bash
# Dry run (test without building)
./scripts/build-and-push-to-acr.sh --dry-run

# Build only (no push)
./scripts/build-and-push-to-acr.sh --no-push --environment dev

# Build without cache (clean build)
./scripts/build-and-push-to-acr.sh --no-cache --environment dev

# Build with custom tag
./scripts/build-and-push-to-acr.sh --environment prod --tag v1.2.3 --version 1.2.3
```

## ACR Information

| Environment | Registry Name | URL |
|-------------|---------------|-----|
| Development | `flamoraldevacr` | `flamoraldevacr.azurecr.io` |
| Staging | `flamoralstagingacr` | `flamoralstagingacr.azurecr.io` |
| Shared | `flamoralacr` | `flamoralacr.azurecr.io` |

## Services List

### Core Services (5)
- api-gateway
- auth-service
- user-service
- messaging-service
- matching-service

### All Backend Services (15)
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

### AI Services (6)
- recommendation-service
- photo-analysis
- nlp-service
- fraud-detection
- dating-coach-service
- content-generator

## Verification Commands

### List all repositories
```bash
az acr repository list --name flamoraldevacr --output table
```

### Show tags for a service
```bash
az acr repository show-tags \
  --name flamoraldevacr \
  --repository flamoral/user-service \
  --orderby time_desc \
  --output table
```

### Check registry health
```bash
az acr check-health --name flamoraldevacr --yes
```

### Show repository details
```bash
az acr repository show \
  --name flamoraldevacr \
  --repository flamoral/user-service
```

## Manual Build & Push

### Single Service
```bash
SERVICE="user-service"
ACR="flamoraldevacr.azurecr.io"

# Build
docker build \
  -t $ACR/flamoral/$SERVICE:latest \
  -f backend/services/$SERVICE/Dockerfile \
  .

# Push
docker push $ACR/flamoral/$SERVICE:latest
```

### With Custom Tags
```bash
docker build \
  --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  --build-arg VCS_REF="$(git rev-parse --short HEAD)" \
  --build-arg VERSION="1.0.0" \
  -t $ACR/flamoral/$SERVICE:latest \
  -t $ACR/flamoral/$SERVICE:v1.0.0 \
  -f backend/services/$SERVICE/Dockerfile \
  .

docker push $ACR/flamoral/$SERVICE:latest
docker push $ACR/flamoral/$SERVICE:v1.0.0
```

## Troubleshooting

### Login Issues
```bash
# Re-login to Azure
az login

# Check subscription
az account show

# Try ACR login again
az acr login --name flamoraldevacr
```

### Clean Docker Cache
```bash
# Remove old images
docker system prune -a

# Remove volumes
docker volume prune

# See disk usage
docker system df
```

### View Build Logs
```bash
# If using background build
tail -f /tmp/claude/tasks/*.output
```

## Image Naming Convention

Format: `{ACR_URL}/flamoral/{SERVICE}:{TAG}`

Examples:
```
flamoraldevacr.azurecr.io/flamoral/user-service:latest
flamoraldevacr.azurecr.io/flamoral/user-service:v1.2.3
flamoraldevacr.azurecr.io/flamoral/user-service:dev-latest
```

## Common Tags

- `latest` - Most recent build
- `v1.2.3` - Semantic version tag
- `dev-latest` - Latest dev build
- `staging-latest` - Latest staging build
- `prod-latest` - Latest production build
- `{git-sha}` - Specific commit

## Deploy to Kubernetes

After pushing to ACR:

```bash
# Update deployment
kubectl set image deployment/user-service \
  user-service=flamoraldevacr.azurecr.io/flamoral/user-service:v1.2.3

# Check rollout status
kubectl rollout status deployment/user-service

# Rollback if needed
kubectl rollout undo deployment/user-service
```

## Performance Tips

1. Use Docker build cache (default)
2. Build core services first for quick deploys
3. Use `--parallel` flag for multi-core systems
4. Clean cache periodically
5. Use `.dockerignore` to exclude unnecessary files

## Security Checklist

- ✓ Use Azure CLI authentication
- ✓ Never commit credentials
- ✓ Use managed identities in production
- ✓ Enable vulnerability scanning
- ✓ Keep base images updated
- ✓ Use multi-stage builds
- ✓ Run as non-root user

---

For detailed documentation, see [ACR_BUILD_AND_PUSH_GUIDE.md](./ACR_BUILD_AND_PUSH_GUIDE.md)
