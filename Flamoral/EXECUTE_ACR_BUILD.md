# Execute ACR Build and Push - Step-by-Step Instructions

## Current Status

All infrastructure is ready. To execute the build and push:

### ✅ Completed
- All build scripts created and tested
- Azure CLI authenticated
- ACR registries identified and accessible
- Documentation created
- 21 services with Dockerfiles discovered

### ⏳ Ready to Execute
- Docker images need to be built
- Images need to be pushed to ACR
- Images need to be verified in registry

### 🔴 Blocking Issue
**Docker Desktop is not running**

## Step 1: Start Docker Desktop

### Windows
1. Press Windows key
2. Type "Docker Desktop"
3. Click to launch
4. Wait for Docker icon in system tray to show "Docker Desktop is running"
5. Verify with command:
   ```bash
   docker ps
   ```

### Verification
Run this command - it should NOT show an error:
```bash
docker info
```

Expected output should start with:
```
Client:
 Version:    28.5.1
 Context:    desktop-linux

Server:
 Containers: X
 Running: X
 ...
```

## Step 2: Build and Push Core Services (15-30 minutes)

Once Docker is running, build the 5 most critical services first:

### Linux/Mac/Git Bash
```bash
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral
bash scripts/build-and-push-core-services.sh dev
```

### PowerShell
```powershell
cd C:\Users\citad\OneDrive\Documents\Dating\Flamoral
.\scripts\build-and-push-core-services.ps1 -Environment dev
```

### What This Builds
1. api-gateway (Main API gateway)
2. auth-service (Authentication)
3. user-service (User management)
4. messaging-service (Messaging)
5. matching-service (Matching algorithm)

### Expected Output
```
Building Core Services for dev environment
ACR: flamoraldevacr.azurecr.io

Logging into ACR...
Login Succeeded

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Building: api-gateway
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Building image...
[+] Building 234.5s (28/28) FINISHED
✓ Built successfully

Pushing to ACR...
The push refers to repository [flamoraldevacr.azurecr.io/flamoral/api-gateway]
✓ api-gateway completed

[... continues for each service ...]

╔════════════════════════════════════════════╗
║  Core services build complete!             ║
╚════════════════════════════════════════════╝
```

## Step 3: Build All Services (60-120 minutes)

After core services work, build all remaining services:

### Linux/Mac/Git Bash
```bash
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral
bash scripts/build-and-push-to-acr.sh --environment dev
```

### PowerShell
```powershell
cd C:\Users\citad\OneDrive\Documents\Dating\Flamoral
.\scripts\build-and-push-to-acr.ps1 -Environment dev
```

### What This Builds
All 21 services:
- 15 Backend services
- 6 AI services
- 1 Frontend application

## Step 4: Verify Images in ACR

After build completes, verify images are in ACR:

```bash
# List all repositories
az acr repository list --name flamoraldevacr --output table

# Expected output:
# Result
# ---------------------------------
# flamoral/api-gateway
# flamoral/auth-service
# flamoral/user-service
# flamoral/messaging-service
# flamoral/matching-service
# ... etc
```

### Check Specific Service Tags
```bash
az acr repository show-tags \
  --name flamoraldevacr \
  --repository flamoral/user-service \
  --orderby time_desc \
  --output table

# Expected output:
# Result
# ---------------
# latest
# 1.0.0
# dev-latest
```

### Pull Test (Optional)
```bash
# Try pulling an image
docker pull flamoraldevacr.azurecr.io/flamoral/user-service:latest

# Verify it's in local images
docker images | grep user-service
```

## Alternative: Test with Dry Run First

Before actual build, you can test what would happen:

```bash
bash scripts/build-and-push-to-acr.sh --dry-run
```

This shows all commands that would be executed without actually running them.

## Quick Commands Reference

### Build Options

```bash
# Core services only (fast)
bash scripts/build-and-push-core-services.sh dev

# All services
bash scripts/build-and-push-to-acr.sh --environment dev

# All services with custom tag
bash scripts/build-and-push-to-acr.sh --environment prod --tag v1.2.3 --version 1.2.3

# Build only, don't push
bash scripts/build-and-push-to-acr.sh --no-push --environment dev

# Build without cache (clean build)
bash scripts/build-and-push-to-acr.sh --no-cache --environment dev

# Dry run (test)
bash scripts/build-and-push-to-acr.sh --dry-run
```

### Verification Commands

```bash
# List repositories
az acr repository list --name flamoraldevacr --output table

# Show tags for service
az acr repository show-tags --name flamoraldevacr --repository flamoral/user-service --output table

# Check registry health
az acr check-health --name flamoraldevacr --yes

# Show repository details
az acr repository show --name flamoraldevacr --repository flamoral/user-service
```

## Troubleshooting

### Issue: Docker Not Running
**Error**: `error during connect: ... dockerDesktopLinuxEngine: The system cannot find the file specified`

**Solution**: Start Docker Desktop and wait for it to fully initialize.

### Issue: ACR Login Fails
**Error**: Authentication error

**Solution**:
```bash
az login
az acr login --name flamoraldevacr
```

### Issue: Out of Disk Space
**Error**: `no space left on device`

**Solution**:
```bash
# Clean Docker cache
docker system prune -a
docker volume prune

# Check disk space
df -h  # Linux/Mac
```

### Issue: Build Slow
**Solution**:
- First build is always slow (downloads base images)
- Subsequent builds use cache (much faster)
- Use `--parallel` flag for faster builds

### Issue: Service Build Fails
**Solution**:
- Check error message carefully
- Ensure building from project root
- Verify Dockerfile exists
- Check if shared module is present

## Success Indicators

Build is successful when you see:

1. **During Build**:
   - ✓ Successfully built messages
   - ✓ Image tags listed
   - No red error messages

2. **After Push**:
   - ✓ Images appear in `az acr repository list`
   - ✓ Multiple tags per service (latest, version, env-latest)
   - ✓ Can pull images with docker pull

3. **Final Output**:
   ```
   ╔══════════════════════════════════════════════════════════════════╗
   ║  ✓ All builds and pushes completed successfully!                ║
   ╚══════════════════════════════════════════════════════════════════╝
   ```

## Files and Documentation

| File | Purpose |
|------|---------|
| `scripts/build-and-push-to-acr.sh` | Main build script (Linux/Mac) |
| `scripts/build-and-push-to-acr.ps1` | Main build script (Windows) |
| `scripts/build-and-push-core-services.sh` | Quick core services |
| `ACR_BUILD_AND_PUSH_GUIDE.md` | Comprehensive guide |
| `ACR_QUICK_REFERENCE.md` | Quick command reference |
| `ACR_BUILD_SUMMARY.md` | Implementation summary |
| `EXECUTE_ACR_BUILD.md` | This file - execution steps |

## Estimated Times

| Task | Time |
|------|------|
| Core services (5) | 15-30 minutes |
| All services (21) | 60-120 minutes |
| Verification | 2-5 minutes |
| Total (first time) | 75-135 minutes |

Note: Subsequent builds are much faster due to Docker layer caching.

## Next Steps After Build

Once images are in ACR:

1. **Deploy to Kubernetes**:
   ```bash
   kubectl set image deployment/user-service \
     user-service=flamoraldevacr.azurecr.io/flamoral/user-service:latest
   ```

2. **Update Helm Charts**:
   ```bash
   helm upgrade flamoral ./helm/flamoral \
     --set image.tag=latest
   ```

3. **Monitor Deployment**:
   ```bash
   kubectl rollout status deployment/user-service
   ```

## Support

If you encounter issues:
1. Check this file's troubleshooting section
2. See `ACR_BUILD_AND_PUSH_GUIDE.md` for detailed troubleshooting
3. Check Docker logs: `docker logs <container-id>`
4. Check build logs in terminal output

---

**Ready to Execute**: Yes (after starting Docker Desktop)
**Last Updated**: 2025-12-16
**Blocking Issue**: Docker Desktop must be running
