# Docker Build & Push - Manual Instructions

**Issue:** Docker Desktop API compatibility error (500 Internal Server Error)

**Solution:** Manual Docker Desktop restart and build process

---

## Step 1: Completely Restart Docker Desktop

### Option A: UI Restart (Recommended)

1. **Open Docker Desktop** application
2. Click the **Settings** icon (gear icon) in top-right
3. Go to **Troubleshoot** tab
4. Click **"Restart Docker Desktop"**
5. Wait 90-120 seconds for full initialization
6. Verify whale icon in system tray is **steady** (not animating)

### Option B: Complete Reinstall (If restart fails)

1. **Uninstall Docker Desktop:**
   - Settings → Apps → Docker Desktop → Uninstall
   - Delete: `C:\Program Files\Docker`
   - Delete: `C:\Users\<username>\.docker`

2. **Reinstall Docker Desktop:**
   - Download from: https://www.docker.com/products/docker-desktop
   - Install and start
   - Wait for complete initialization

---

## Step 2: Verify Docker is Working

Open a **new PowerShell** window as Administrator:

```powershell
# Test Docker
docker ps

# Should show empty list or running containers
# If you get any error, Docker is NOT ready - go back to Step 1
```

---

## Step 3: Login to Docker Hub

```powershell
# Navigate to project directory
cd C:\Users\Dell\OneDrive\Desktop\World-Class-Dating-App-Platform\World-Class-Dating-App-Platform

# Login to Docker Hub
docker login -u citadelcloud1

# When prompted for password, paste this token:
# dckr_pat_ouIaa9OjRdEf-s-lPeHDqkcufpI

# You should see: "Login Succeeded"
```

---

## Step 4: Build and Push Services

### Option A: Automated Script (Fastest)

```powershell
# Run the build script
.\build-and-push-fixed.ps1

# This will build and push all 10 services automatically
# Expected time: 20-50 minutes total
```

### Option B: Manual Build (One at a Time)

If the script fails, build each service manually:

```powershell
# Set date tag
$DATE = Get-Date -Format "yyyyMMdd"

# 1. Analytics Service (NEW - with all advertising integrations)
docker build -t citadelcloud1/world-class-dating-platform:analytics-service-latest -t citadelcloud1/world-class-dating-platform:analytics-service-$DATE ./backend/services/analytics-service
docker push citadelcloud1/world-class-dating-platform:analytics-service-latest
docker push citadelcloud1/world-class-dating-platform:analytics-service-$DATE

# 2. User Service
docker build -t citadelcloud1/world-class-dating-platform:user-service-latest -t citadelcloud1/world-class-dating-platform:user-service-$DATE ./backend/services/user-service
docker push citadelcloud1/world-class-dating-platform:user-service-latest
docker push citadelcloud1/world-class-dating-platform:user-service-$DATE

# 3. Matching Service
docker build -t citadelcloud1/world-class-dating-platform:matching-service-latest -t citadelcloud1/world-class-dating-platform:matching-service-$DATE ./backend/services/matching-service
docker push citadelcloud1/world-class-dating-platform:matching-service-latest
docker push citadelcloud1/world-class-dating-platform:matching-service-$DATE

# 4. Messaging Service
docker build -t citadelcloud1/world-class-dating-platform:messaging-service-latest -t citadelcloud1/world-class-dating-platform:messaging-service-$DATE ./backend/services/messaging-service
docker push citadelcloud1/world-class-dating-platform:messaging-service-latest
docker push citadelcloud1/world-class-dating-platform:messaging-service-$DATE

# 5. Media Service
docker build -t citadelcloud1/world-class-dating-platform:media-service-latest -t citadelcloud1/world-class-dating-platform:media-service-$DATE ./backend/services/media-service
docker push citadelcloud1/world-class-dating-platform:media-service-latest
docker push citadelcloud1/world-class-dating-platform:media-service-$DATE

# 6. Moderation Service
docker build -t citadelcloud1/world-class-dating-platform:moderation-service-latest -t citadelcloud1/world-class-dating-platform:moderation-service-$DATE ./backend/services/moderation-service
docker push citadelcloud1/world-class-dating-platform:moderation-service-latest
docker push citadelcloud1/world-class-dating-platform:moderation-service-$DATE

# 7. Notification Service
docker build -t citadelcloud1/world-class-dating-platform:notification-service-latest -t citadelcloud1/world-class-dating-platform:notification-service-$DATE ./backend/services/notification-service
docker push citadelcloud1/world-class-dating-platform:notification-service-latest
docker push citadelcloud1/world-class-dating-platform:notification-service-$DATE

# 8. Payment Service
docker build -t citadelcloud1/world-class-dating-platform:payment-service-latest -t citadelcloud1/world-class-dating-platform:payment-service-$DATE ./backend/services/payment-service
docker push citadelcloud1/world-class-dating-platform:payment-service-latest
docker push citadelcloud1/world-class-dating-platform:payment-service-$DATE

# 9. API Gateway
docker build -t citadelcloud1/world-class-dating-platform:api-gateway-latest -t citadelcloud1/world-class-dating-platform:api-gateway-$DATE ./backend/services/api-gateway
docker push citadelcloud1/world-class-dating-platform:api-gateway-latest
docker push citadelcloud1/world-class-dating-platform:api-gateway-$DATE

# 10. Web Frontend (with analytics integration)
docker build -t citadelcloud1/world-class-dating-platform:web-frontend-latest -t citadelcloud1/world-class-dating-platform:web-frontend-$DATE ./frontend/web
docker push citadelcloud1/world-class-dating-platform:web-frontend-latest
docker push citadelcloud1/world-class-dating-platform:web-frontend-$DATE
```

---

## Step 5: Verify Upload

Go to Docker Hub:
https://hub.docker.com/repository/docker/citadelcloud1/world-class-dating-platform/tags

You should see these tags:
- ✅ `analytics-service-latest`
- ✅ `analytics-service-YYYYMMDD`
- ✅ `user-service-latest`
- ✅ `user-service-YYYYMMDD`
- ✅ `matching-service-latest`
- ✅ `matching-service-YYYYMMDD`
- ✅ `messaging-service-latest`
- ✅ `messaging-service-YYYYMMDD`
- ✅ `media-service-latest`
- ✅ `media-service-YYYYMMDD`
- ✅ `moderation-service-latest`
- ✅ `moderation-service-YYYYMMDD`
- ✅ `notification-service-latest`
- ✅ `notification-service-YYYYMMDD`
- ✅ `payment-service-latest`
- ✅ `payment-service-YYYYMMDD`
- ✅ `api-gateway-latest`
- ✅ `api-gateway-YYYYMMDD`
- ✅ `web-frontend-latest`
- ✅ `web-frontend-YYYYMMDD`

---

## Troubleshooting

### Issue: "docker ps" fails with error

**Solution:** Docker Desktop is not running properly
1. Close Docker Desktop completely
2. Wait 10 seconds
3. Open Docker Desktop again
4. Wait 90-120 seconds for initialization
5. Try again

### Issue: "Cannot connect to the Docker daemon"

**Solution:** Docker service is not started
1. Open Docker Desktop application
2. Wait for whale icon to become steady
3. Try again

### Issue: "permission denied" or "access denied"

**Solution:** Run PowerShell as Administrator
1. Right-click PowerShell
2. Select "Run as Administrator"
3. Navigate to project directory
4. Try again

### Issue: Build fails with "no such file or directory"

**Solution:** Wrong directory
1. Make sure you're in the project root:
   ```powershell
   cd C:\Users\Dell\OneDrive\Desktop\World-Class-Dating-App-Platform\World-Class-Dating-App-Platform
   ```
2. Verify path exists:
   ```powershell
   Test-Path ./backend/services/analytics-service
   # Should return: True
   ```

### Issue: Push fails with "unauthorized"

**Solution:** Not logged in to Docker Hub
1. Login again:
   ```powershell
   docker login -u citadelcloud1
   # Enter token when prompted
   ```

---

## What's Being Deployed

### Updated Services (with new features):
1. **analytics-service** - Complete advertising tracking:
   - Meta Pixel + Conversions API
   - TikTok Pixel + Events API
   - Google Analytics 4 + Measurement Protocol
   - Snapchat Pixel + Conversions API
   - Google Ads conversion tracking
   - Full database tracking
   - UTM and click ID capture

2. **web-frontend** - Integrated analytics:
   - Multi-platform event tracking
   - Automatic page view tracking
   - Conversion tracking
   - Session management

### Existing Services (no changes):
- user-service
- matching-service
- messaging-service
- media-service
- moderation-service
- notification-service
- payment-service
- api-gateway

---

## Expected Build Times

- **Analytics Service:** 3-5 minutes (first build)
- **Frontend:** 4-6 minutes (first build)
- **Other Services:** 2-4 minutes each
- **Total Time:** 25-50 minutes for all services
- **Push Time:** Depends on internet speed (1-5 minutes per service)

---

## Quick Command Reference

```powershell
# Check Docker status
docker ps

# Login to Docker Hub
docker login -u citadelcloud1

# Build single service
docker build -t citadelcloud1/world-class-dating-platform:SERVICE-NAME-latest ./path/to/service

# Push single service
docker push citadelcloud1/world-class-dating-platform:SERVICE-NAME-latest

# View local images
docker images | findstr citadelcloud1

# Remove local image (if needed)
docker rmi citadelcloud1/world-class-dating-platform:SERVICE-NAME-latest
```

---

## Support

If you continue to experience issues:
1. Try restarting your computer
2. Ensure Windows Subsystem for Linux (WSL2) is enabled
3. Update Docker Desktop to latest version
4. Check Docker Desktop logs: Settings → Troubleshoot → View logs

---

**Once Docker is working, you can run the automated script or build manually following the commands above.**
