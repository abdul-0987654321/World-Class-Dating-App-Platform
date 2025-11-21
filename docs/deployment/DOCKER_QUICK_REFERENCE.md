# Docker Hub - Quick Reference Guide

## Current Situation

### ❌ OLD (Disorganized - 4 Separate Repositories)
```
citadelcloud1/world-class-dating-platform-matching-service
citadelcloud1/world-class-dating-platform-user-service
citadelcloud1/world-class-dating-platform-media-service
citadelcloud1/world-class-dating-platform
```

### ✅ NEW (Organized - 1 Repository with Tags)
```
citadelcloud1/world-class-dating-platform
├── api-gateway-latest
├── api-gateway-v1.0.0
├── api-gateway-prod
├── user-service-latest
├── user-service-v1.0.0
├── user-service-prod
└── ... (all 9 services)
```

---

## Quick Commands

### Build and Push All Services (Latest Tags)
```powershell
cd "C:\Users\Dell\OneDrive\Desktop\World-Class-Dating-App-Platform\World-Class-Dating-App-Platform"
.\build-and-push-organized.ps1
```

### Build and Push for Production (with Version)
```powershell
.\build-and-push-organized.ps1 -Environment prod -Version "v1.0.0"
```

### Build and Push with Date Tag
```powershell
.\build-and-push-organized.ps1 -Environment prod -Version "v1.0.0" -IncludeDateTag
```

### Preview Without Executing (Dry Run)
```powershell
.\build-and-push-organized.ps1 -DryRun
```

### Re-tag Existing Images (No Rebuild)
```powershell
.\build-and-push-organized.ps1 -SkipBuild -Environment staging
```

---

## Tag Naming Convention

| Tag Pattern | Use Case | Example |
|-------------|----------|---------|
| `<service>-latest` | Development/CI builds | `api-gateway-latest` |
| `<service>-v<version>` | Production releases | `api-gateway-v1.0.0` |
| `<service>-prod` | Current production | `api-gateway-prod` |
| `<service>-staging` | Staging environment | `api-gateway-staging` |
| `<service>-dev` | Development environment | `api-gateway-dev` |
| `<service>-YYYY-MM-DD` | Date-based rollback | `api-gateway-2025-01-19` |

---

## All 9 Services

1. **api-gateway** (Port 4000) - Main API Gateway
2. **user-service** (Port 3001) - User Management
3. **messaging-service** (Port 3003) - Real-time Messaging
4. **matching-service** (Port 3002) - Matching Algorithm
5. **media-service** (Port 3004) - Media Uploads
6. **payment-service** (Port 3005) - Payment Processing
7. **notification-service** (Port 3006) - Notifications
8. **analytics-service** (Port 3007) - Analytics
9. **moderation-service** (Port 3008) - Content Moderation

---

## Docker Compose Example

### docker-compose.prod.yml (Production)
```yaml
version: '3.8'

services:
  api-gateway:
    image: citadelcloud1/world-class-dating-platform:api-gateway-prod
    ports:
      - "4000:4000"

  user-service:
    image: citadelcloud1/world-class-dating-platform:user-service-prod
    ports:
      - "3001:3001"

  messaging-service:
    image: citadelcloud1/world-class-dating-platform:messaging-service-prod
    ports:
      - "3003:3003"

  matching-service:
    image: citadelcloud1/world-class-dating-platform:matching-service-prod
    ports:
      - "3002:3002"

  media-service:
    image: citadelcloud1/world-class-dating-platform:media-service-prod
    ports:
      - "3004:3004"

  payment-service:
    image: citadelcloud1/world-class-dating-platform:payment-service-prod
    ports:
      - "3005:3005"

  notification-service:
    image: citadelcloud1/world-class-dating-platform:notification-service-prod
    ports:
      - "3006:3006"

  analytics-service:
    image: citadelcloud1/world-class-dating-platform:analytics-service-prod
    ports:
      - "3007:3007"

  moderation-service:
    image: citadelcloud1/world-class-dating-platform:moderation-service-prod
    ports:
      - "3008:3008"
```

---

## Cleanup Old Repositories

After migrating to the organized structure, delete the old repositories:

### Via Docker Hub Web UI
1. Go to https://hub.docker.com/repositories/citadelcloud1
2. For each old repository:
   - Click on repository name
   - Click "Settings" tab
   - Scroll to "Delete repository"
   - Confirm deletion

### Repositories to Delete
- ❌ `world-class-dating-platform-matching-service`
- ❌ `world-class-dating-platform-user-service`
- ❌ `world-class-dating-platform-media-service`

### Repository to Keep
- ✅ `world-class-dating-platform` (main repository with all tags)

---

## Pull Commands

### Pull Latest Version
```bash
docker pull citadelcloud1/world-class-dating-platform:api-gateway-latest
docker pull citadelcloud1/world-class-dating-platform:user-service-latest
```

### Pull Production Version
```bash
docker pull citadelcloud1/world-class-dating-platform:api-gateway-prod
docker pull citadelcloud1/world-class-dating-platform:user-service-prod
```

### Pull Specific Version
```bash
docker pull citadelcloud1/world-class-dating-platform:api-gateway-v1.0.0
docker pull citadelcloud1/world-class-dating-platform:user-service-v1.0.0
```

---

## View Your Repository

**Docker Hub Repository:**
https://hub.docker.com/r/citadelcloud1/world-class-dating-platform

**Tags Page:**
https://hub.docker.com/r/citadelcloud1/world-class-dating-platform/tags

---

## Workflow Examples

### Development Workflow
```powershell
# Make code changes
# ...

# Build and push with latest tags
.\build-and-push-organized.ps1

# Images are now available as:
# citadelcloud1/world-class-dating-platform:api-gateway-latest
# citadelcloud1/world-class-dating-platform:user-service-latest
# etc.
```

### Production Release Workflow
```powershell
# Build and tag for production
.\build-and-push-organized.ps1 -Environment prod -Version "v1.0.0" -IncludeDateTag

# This creates 3 tags per service:
# 1. service-prod (current production)
# 2. service-v1.0.0 (version for rollback)
# 3. service-2025-01-19 (date for rollback)
```

### Rollback Workflow
```powershell
# Don't rebuild, just re-tag previous version as prod
.\build-and-push-organized.ps1 -SkipBuild -Environment prod

# Or manually:
docker pull citadelcloud1/world-class-dating-platform:api-gateway-v0.9.0
docker tag citadelcloud1/world-class-dating-platform:api-gateway-v0.9.0 \
  citadelcloud1/world-class-dating-platform:api-gateway-prod
docker push citadelcloud1/world-class-dating-platform:api-gateway-prod
```

---

## Benefits Summary

✅ **Before:** 4+ separate repositories (disorganized)
✅ **After:** 1 repository with organized tags

✅ **Easier management** - All services in one place
✅ **Clear versioning** - Semantic version tags
✅ **Environment separation** - dev/staging/prod tags
✅ **Easy rollback** - Version and date tags
✅ **Professional structure** - Industry best practices
✅ **Docker Hub optimized** - Maximizes free tier

---

## Troubleshooting

### "Cannot connect to Docker daemon"
```powershell
# Restart Docker Desktop
Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
Start-Sleep 60
docker ps  # Verify it's running
```

### "Authentication required"
```powershell
# Re-login
echo "dckr_pat_ouIaa9OjRdEf-s-lPeHDqkcufpI" | docker login --username citadelcloud1 --password-stdin
```

### "Image not found"
```powershell
# Make sure you're using the correct repository name
# OLD (wrong): citadelcloud1/world-class-dating-platform-user-service
# NEW (correct): citadelcloud1/world-class-dating-platform:user-service-latest
```

---

*Use build-and-push-organized.ps1 for automated building and pushing with organized tags*
