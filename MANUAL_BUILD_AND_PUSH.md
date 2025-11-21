# Manual Build and Push - Complete Guide

## Docker Desktop Issue

Your Docker Desktop has an API version compatibility issue that prevents automated execution.
You'll need to complete these steps manually after fixing Docker.

---

## STEP 1: Fix Docker Desktop (REQUIRED)

### Option A: System Restart (Recommended)
```
1. Save all work
2. Windows Start → Power → Restart
3. After restart, launch Docker Desktop from Start menu
4. Wait for "Docker Desktop is running" in system tray
```

### Option B: Docker Desktop Reset
```
1. Open Docker Desktop (even with errors)
2. Click Settings (gear icon)
3. Go to "Troubleshoot"
4. Click "Reset to factory defaults"
5. Restart Docker Desktop
```

### Verify Docker Works
Open PowerShell and run:
```powershell
docker ps
```
**Expected:** Empty table or list of containers (NOT an error)
**If error persists:** Restart your computer before proceeding

---

## STEP 2: Navigate to Project Directory

Open PowerShell and run:
```powershell
cd "C:\Users\Dell\OneDrive\Desktop\World-Class-Dating-App-Platform\World-Class-Dating-App-Platform"
```

---

## STEP 3: Login to Docker Hub

```powershell
echo "dckr_pat_ouIaa9OjRdEf-s-lPeHDqkcufpI" | docker login --username citadelcloud1 --password-stdin
```

**Expected output:** `Login Succeeded`

---

## STEP 4: Build and Push All Services

### Method A: Automated PowerShell Script (Recommended)

```powershell
.\build-and-push-organized.ps1
```

This will:
- Build all 9 services
- Tag with organized naming
- Push to Docker Hub
- Show progress for each service

**Time:** 1-2 hours for all services

---

### Method B: Manual Commands (If Script Fails)

Copy and paste these commands one by one:

#### 1. API Gateway
```powershell
docker build -t citadelcloud1/world-class-dating-platform:api-gateway-latest -f backend\services\api-gateway\Dockerfile .
docker push citadelcloud1/world-class-dating-platform:api-gateway-latest
```

#### 2. User Service
```powershell
docker build -t citadelcloud1/world-class-dating-platform:user-service-latest -f backend\services\user-service\Dockerfile .
docker push citadelcloud1/world-class-dating-platform:user-service-latest
```

#### 3. Messaging Service
```powershell
docker build -t citadelcloud1/world-class-dating-platform:messaging-service-latest -f backend\services\messaging-service\Dockerfile .
docker push citadelcloud1/world-class-dating-platform:messaging-service-latest
```

#### 4. Matching Service
```powershell
docker build -t citadelcloud1/world-class-dating-platform:matching-service-latest -f backend\services\matching-service\Dockerfile .
docker push citadelcloud1/world-class-dating-platform:matching-service-latest
```

#### 5. Media Service
```powershell
docker build -t citadelcloud1/world-class-dating-platform:media-service-latest -f backend\services\media-service\Dockerfile .
docker push citadelcloud1/world-class-dating-platform:media-service-latest
```

#### 6. Payment Service
```powershell
docker build -t citadelcloud1/world-class-dating-platform:payment-service-latest -f backend\services\payment-service\Dockerfile .
docker push citadelcloud1/world-class-dating-platform:payment-service-latest
```

#### 7. Notification Service
```powershell
docker build -t citadelcloud1/world-class-dating-platform:notification-service-latest -f backend\services\notification-service\Dockerfile .
docker push citadelcloud1/world-class-dating-platform:notification-service-latest
```

#### 8. Analytics Service
```powershell
docker build -t citadelcloud1/world-class-dating-platform:analytics-service-latest -f backend\services\analytics-service\Dockerfile .
docker push citadelcloud1/world-class-dating-platform:analytics-service-latest
```

#### 9. Moderation Service
```powershell
docker build -t citadelcloud1/world-class-dating-platform:moderation-service-latest -f backend\services\moderation-service\Dockerfile .
docker push citadelcloud1/world-class-dating-platform:moderation-service-latest
```

---

## STEP 5: Verify in Docker Hub

After all builds and pushes complete:

1. Go to: https://hub.docker.com/r/citadelcloud1/world-class-dating-platform/tags

2. You should see all 9 tags:
   - ✅ api-gateway-latest
   - ✅ user-service-latest
   - ✅ messaging-service-latest
   - ✅ matching-service-latest
   - ✅ media-service-latest
   - ✅ payment-service-latest
   - ✅ notification-service-latest
   - ✅ analytics-service-latest
   - ✅ moderation-service-latest

---

## Troubleshooting Build Errors

### Error: "Cannot find module @connectsphere/shared"

**Cause:** Dockerfile doesn't include shared package

**Fix:** The Dockerfiles may need updating. Here's a template:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root files
COPY package*.json tsconfig.json ./

# Copy shared package
COPY backend/shared ./backend/shared

# Build shared
WORKDIR /app/backend/shared
RUN npm install && npm run build

# Copy and build service
WORKDIR /app/backend/services/SERVICE_NAME
COPY backend/services/SERVICE_NAME/package*.json ./
RUN npm install
COPY backend/services/SERVICE_NAME/src ./src
COPY backend/services/SERVICE_NAME/tsconfig.json ./
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy shared package
COPY --from=builder /app/backend/shared/dist ./node_modules/@connectsphere/shared/dist
COPY --from=builder /app/backend/shared/package.json ./node_modules/@connectsphere/shared/

# Install production dependencies
COPY backend/services/SERVICE_NAME/package*.json ./
RUN npm install --production && npm cache clean --force

# Copy built app
COPY --from=builder /app/backend/services/SERVICE_NAME/dist ./dist

RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE PORT

CMD ["node", "dist/index.js"]
```

### Error: "Cannot connect to Docker daemon"
- Docker Desktop is not running
- Restart Docker Desktop
- Wait 2-3 minutes for full initialization

### Error: "denied: requested access to the resource is denied"
- Token expired or incorrect
- Re-login: `echo "dckr_pat_ouIaa9OjRdEf-s-lPeHDqkcufpI" | docker login --username citadelcloud1 --password-stdin`

### Error: "No space left on device"
- Clean Docker: `docker system prune -a`
- Free up disk space (need ~10GB)

---

## Progress Tracking

Mark each service as you complete it:

- [ ] API Gateway built and pushed
- [ ] User Service built and pushed
- [ ] Messaging Service built and pushed
- [ ] Matching Service built and pushed
- [ ] Media Service built and pushed
- [ ] Payment Service built and pushed
- [ ] Notification Service built and pushed
- [ ] Analytics Service built and pushed
- [ ] Moderation Service built and pushed
- [ ] Verified all tags in Docker Hub

---

## Expected Build Times

| Service | Estimated Time |
|---------|---------------|
| API Gateway | 5-10 minutes |
| User Service | 5-10 minutes |
| Messaging Service | 5-10 minutes |
| Matching Service | 5-10 minutes |
| Media Service | 8-15 minutes |
| Payment Service | 5-10 minutes |
| Notification Service | 5-10 minutes |
| Analytics Service | 5-10 minutes |
| Moderation Service | 5-10 minutes |
| **TOTAL** | **1-2 hours** |

---

## After Successful Push

### Update docker-compose.yml

Replace old image names with new organized names:

**Old:**
```yaml
image: citadelcloud1/world-class-dating-platform-user-service:latest
```

**New:**
```yaml
image: citadelcloud1/world-class-dating-platform:user-service-latest
```

### Delete Old Repositories

Once you verify all services are in the main repository:
1. Go to https://hub.docker.com/repositories/citadelcloud1
2. Delete `world-class-dating-platform-matching-service`
3. Delete `world-class-dating-platform-user-service`
4. Delete `world-class-dating-platform-media-service`

See: `DOCKER_HUB_CLEANUP_INSTRUCTIONS.md`

---

## Summary

**What You're Doing:**
- Building all 9 microservices into Docker images
- Tagging with organized naming convention
- Pushing to ONE centralized Docker Hub repository
- Creating a professional, maintainable structure

**End Result:**
- ✅ One repository: `citadelcloud1/world-class-dating-platform`
- ✅ Nine organized tags (one per service)
- ✅ Easy to deploy and manage
- ✅ Professional structure

---

## Need Help?

If you encounter errors during build/push:
1. Check the error message carefully
2. Refer to "Troubleshooting Build Errors" section above
3. Google the specific error message
4. Check Dockerfile in the service directory
5. Verify shared package built successfully

---

**Ready to begin? Start with STEP 1 (Fix Docker Desktop) and work through each step!**
