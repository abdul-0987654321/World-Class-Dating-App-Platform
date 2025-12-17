# Media Service Fix - Implementation Checklist

## Pre-Deployment Checklist

### 1. Backup Current State
- [ ] Backup `azure-storage.service.ts`
- [ ] Backup `index.ts`
- [ ] Backup `.env` file
- [ ] Note current git commit hash: ________________

### 2. Obtain Azure Credentials
- [ ] Access Azure Portal (https://portal.azure.com)
- [ ] Navigate to Storage Accounts → flamoralstorage
- [ ] Copy Storage Account Name: ________________
- [ ] Copy Access Key 1: ________________
- [ ] Verify container "media" exists

### 3. Review Changes
- [ ] Read `MEDIA_SERVICE_FIX.md`
- [ ] Review `azure-storage.service.fixed.ts`
- [ ] Understand rollback procedure

## Deployment Steps

### Step 1: Apply Code Fixes
```bash
cd backend/services/media-service

# Option A: Automated
chmod +x apply-fixes.sh
./apply-fixes.sh

# Option B: Manual
cp src/infrastructure/storage/azure-storage.service.fixed.ts \
   src/infrastructure/storage/azure-storage.service.ts
```
- [ ] Code files updated
- [ ] No syntax errors
- [ ] Builds successfully: `npm run build`

### Step 2: Configure Environment
Edit `.env` file:
```env
AZURE_STORAGE_ACCOUNT_NAME=flamoralstorage
AZURE_STORAGE_ACCOUNT_KEY=<your-key>
AZURE_CONTAINER_NAME=media
AZURE_CDN_URL=https://flamoral-cdn.azureedge.net

CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://flamoral.com,https://www.flamoral.com
```
- [ ] Azure credentials added
- [ ] CORS origins configured
- [ ] JWT secrets set
- [ ] Redis configuration verified

### Step 3: Test Locally
```bash
# Start service
npm run dev

# Test health endpoint
curl http://localhost:3006/health

# Test detailed health
curl http://localhost:3006/health/detailed
```
- [ ] Service starts without errors
- [ ] `/health` returns 200 OK
- [ ] `/health/detailed` shows storage status
- [ ] Storage health = `true` (or `false` with clear error message)

### Step 4: Test Upload Functionality
```bash
# Get JWT token first (from auth service)
TOKEN="your-jwt-token"

# Test upload
curl -X POST http://localhost:3006/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "photo=@test-image.jpg"
```
- [ ] Upload returns 201 Created
- [ ] Response includes media metadata
- [ ] File appears in Azure Storage
- [ ] File accessible via returned URL

### Step 5: Verify Circuit Breaker Recovery
```bash
# Check API Gateway circuit breakers
curl http://localhost:3001/health/circuits

# Check services health
curl http://localhost:3001/health/services
```
- [ ] Media service circuit state: `CLOSED`
- [ ] No failures recorded
- [ ] Success rate > 95%

## Post-Deployment Verification

### Immediate Checks (T+5 minutes)
- [ ] Service running without crashes
- [ ] No errors in logs
- [ ] Health endpoint responding
- [ ] Circuit breaker CLOSED

### Short-term Checks (T+30 minutes)
- [ ] Upload functionality working
- [ ] Download/retrieval working
- [ ] No CORS errors from frontend
- [ ] Response times < 500ms

### Long-term Monitoring (T+24 hours)
- [ ] Circuit breaker remains CLOSED
- [ ] No increase in error rate
- [ ] Azure Storage costs normal
- [ ] User complaints resolved

## Testing Matrix

### Test Cases
| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| Basic health | GET /health | 200 OK | ⬜ |
| Detailed health | GET /health/detailed | 200 OK with storage status | ⬜ |
| Upload photo | POST /api/media/upload | 201 Created | ⬜ |
| Get user photos | GET /api/media/photos | 200 OK with photo list | ⬜ |
| Delete photo | DELETE /api/media/photos/:id | 200 OK | ⬜ |
| Set profile photo | PUT /api/media/photos/:id/profile | 200 OK | ⬜ |
| CORS preflight | OPTIONS /api/media/upload | 200 OK | ⬜ |

### Integration Tests
- [ ] Upload from production frontend
- [ ] View uploaded photo in profile
- [ ] Delete photo from profile
- [ ] Change profile photo
- [ ] Upload maximum allowed photos
- [ ] Reject oversized files

## Monitoring Setup

### Metrics to Track
- [ ] Circuit breaker state (Grafana/Prometheus)
- [ ] Upload success rate
- [ ] Azure Storage API latency
- [ ] Error rate per endpoint
- [ ] Request volume

### Alerts to Configure
- [ ] Circuit breaker OPEN for > 5 minutes
- [ ] Upload success rate < 90%
- [ ] Azure Storage errors > 10/minute
- [ ] Service down for > 1 minute

## Rollback Procedure

If issues occur:

### Step 1: Restore Backups
```bash
cp src/infrastructure/storage/azure-storage.service.ts.backup \
   src/infrastructure/storage/azure-storage.service.ts

cp src/index.ts.backup src/index.ts
```
- [ ] Original files restored

### Step 2: Restart Service
```bash
npm run dev
```
- [ ] Service restarted with original code

### Step 3: Verify Rollback
- [ ] Service running
- [ ] Previous behavior restored
- [ ] No new errors introduced

### Step 4: Document Issue
- [ ] Error logs captured
- [ ] Screenshot of failure
- [ ] Steps to reproduce documented

## Troubleshooting Guide

### Issue: Service Won't Start

**Symptoms**: Process crashes immediately

**Check**:
- [ ] `.env` file exists
- [ ] No syntax errors in code
- [ ] Dependencies installed: `npm install`
- [ ] Port 3006 not in use

**Fix**:
```bash
# Check logs
npm run dev 2>&1 | tee error.log

# Verify dependencies
npm install

# Check port
lsof -i :3006  # Kill if occupied
```

### Issue: Storage Health = False

**Symptoms**: `/health/detailed` shows unhealthy storage

**Check**:
- [ ] Azure credentials set in `.env`
- [ ] Credentials are correct
- [ ] Network can reach Azure (not blocked by firewall)
- [ ] Storage account exists in Azure Portal

**Fix**:
```bash
# Test credentials with Azure CLI
az storage account show \
  --name $AZURE_STORAGE_ACCOUNT_NAME

# Or use Azurite for local dev
azurite --silent &
# Remove Azure credentials from .env
```

### Issue: Circuit Breaker Won't Close

**Symptoms**: Media service circuit stuck in OPEN state

**Check**:
- [ ] Media service health endpoint returns 200
- [ ] No errors in media service logs
- [ ] API Gateway can reach media service
- [ ] Circuit breaker timeout hasn't expired

**Fix**:
1. Wait 60 seconds for automatic recovery
2. Restart API Gateway: `pm2 restart api-gateway`
3. Manually reset circuit (if admin endpoint available)

### Issue: CORS Errors

**Symptoms**: Browser console shows CORS errors

**Check**:
- [ ] `CORS_ORIGINS` includes frontend URL
- [ ] URL format is exact (http vs https)
- [ ] No trailing slashes in URLs
- [ ] Credentials included in frontend requests

**Fix**:
```env
# Update .env
CORS_ORIGINS=http://localhost:3000,https://your-frontend.com,https://flamoral.com
```
```bash
# Restart service
npm run dev
```

### Issue: Upload Fails

**Symptoms**: Upload returns 400 or 500 error

**Check**:
- [ ] File size within limit (10MB)
- [ ] File type allowed (JPEG, PNG, WebP)
- [ ] JWT token valid
- [ ] Azure Storage healthy
- [ ] User hasn't exceeded max photos (9)

**Fix**:
- Check error message in response
- Review service logs for details
- Test with smaller file
- Verify JWT token not expired

## Success Metrics

### Immediate Success
- ✅ Service starts without errors
- ✅ Health endpoints return 200
- ✅ Circuit breaker CLOSED
- ✅ Basic upload works

### 24-Hour Success
- ✅ No service restarts required
- ✅ Circuit breaker remains CLOSED
- ✅ Upload success rate > 95%
- ✅ No user complaints
- ✅ Azure Storage costs normal

### 1-Week Success
- ✅ Stable service operation
- ✅ No circuit breaker incidents
- ✅ Performance metrics normal
- ✅ No code rollbacks needed

## Sign-off

### Development Team
- [ ] Code reviewed
- [ ] Tests passed locally
- [ ] Documentation updated
- [ ] Ready for deployment

**Developer**: ________________
**Date**: ________________

### DevOps/Operations
- [ ] Environment configured
- [ ] Monitoring in place
- [ ] Alerts configured
- [ ] Rollback plan ready

**Operator**: ________________
**Date**: ________________

### Final Approval
- [ ] All checks passed
- [ ] Team notified
- [ ] Deployment scheduled

**Approver**: ________________
**Date**: ________________
**Deployment Time**: ________________

## Notes & Observations

**Issues Encountered**:
___________________________________________________________________
___________________________________________________________________
___________________________________________________________________

**Solutions Applied**:
___________________________________________________________________
___________________________________________________________________
___________________________________________________________________

**Follow-up Actions**:
___________________________________________________________________
___________________________________________________________________
___________________________________________________________________

---

**Checklist Version**: 1.0
**Last Updated**: December 15, 2025
**Related Docs**: MEDIA_SERVICE_FIX.md, MEDIA_SERVICE_FIX_SUMMARY.md
