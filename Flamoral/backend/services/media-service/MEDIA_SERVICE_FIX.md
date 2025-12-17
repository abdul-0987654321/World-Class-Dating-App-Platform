# Media Service Circuit Breaker Fix

## Issue Summary

The media service is showing 1 failure in the circuit breaker, causing the API gateway to fail fast for media upload requests. This document outlines the fixes needed to restore full functionality.

## Root Causes Identified

1. **Azure Storage Credentials Not Configured** - The service likely lacks proper Azure Storage credentials
2. **No Health Check Endpoint** - API gateway cannot monitor media service health
3. **Poor Error Handling** - Azure Storage initialization errors crash the service
4. **Missing Graceful Degradation** - Service doesn't handle missing credentials gracefully
5. **CORS Configuration** - Production domains may not be properly configured

## Fixes Applied

### 1. Improved Azure Storage Service (CRITICAL)

**File**: `src/infrastructure/storage/azure-storage.service.ts`

**Changes**:
- Added health check methods (`isHealthy()`, `getHealthStatus()`)
- Graceful degradation when credentials are missing
- Service won't crash if Azure Storage is unavailable
- Better error messages for debugging
- Added `ensureInitialized()` guard on all operations

**Key Improvements**:
```typescript
// Before: Crashes on missing credentials
constructor() {
  this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
}

// After: Graceful degradation
constructor() {
  this.initializeClients(); // Won't crash, stores error
}

isHealthy(): boolean {
  return this.initialized && !this.initializationError && this.containerClient !== null;
}
```

**To Apply**:
```bash
# Replace the file
cp src/infrastructure/storage/azure-storage.service.fixed.ts src/infrastructure/storage/azure-storage.service.ts

# Or manually apply changes from azure-storage.service.fixed.ts
```

### 2. Add Health Check Endpoint

**File**: `src/index.ts`

**Add after line 40** (after existing health check):
```typescript
// Detailed health check with Azure Storage status
app.get('/health/detailed', (_req: Request, res: Response) => {
  const storageHealth = azureStorageService.getHealthStatus();

  res.status(storageHealth.healthy ? 200 : 503).json({
    status: storageHealth.healthy ? 'healthy' : 'degraded',
    service: 'media-service',
    timestamp: new Date().toISOString(),
    storage: {
      healthy: storageHealth.healthy,
      initialized: storageHealth.initialized,
      error: storageHealth.error,
    },
    uptime: process.uptime(),
  });
});
```

### 3. Fix CORS Configuration

**File**: `src/index.ts` (lines 22-29)

**Replace**:
```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**With**:
```typescript
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://flamoral.com',
  'https://www.flamoral.com',
  'https://admin.flamoral.com'
];

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
```

### 4. Environment Configuration

**File**: `.env` (Create if doesn't exist)

**Required Variables**:
```env
# Server Configuration
SERVICE_NAME=media-service
PORT=3006
NODE_ENV=development

# JWT Configuration (REQUIRED)
JWT_ACCESS_SECRET=your-jwt-access-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key-min-32-chars

# Azure Storage (CRITICAL - MUST BE SET)
AZURE_STORAGE_ACCOUNT_NAME=flamoralstorage
AZURE_STORAGE_ACCOUNT_KEY=your-azure-storage-key-here
AZURE_CONTAINER_NAME=media
AZURE_CDN_URL=https://flamoral-cdn.azureedge.net

# Azure Computer Vision (Optional - for content moderation)
AZURE_CV_ENDPOINT=https://your-region.api.cognitive.microsoft.com/
AZURE_CV_API_KEY=your-computer-vision-api-key

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://flamoral.com,https://www.flamoral.com,https://admin.flamoral.com

# Redis (for Bull queue and caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=3

# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_media
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_SSL=false
```

### 5. Update Index.ts to Handle Storage Errors

**File**: `src/index.ts` (lines 81-89)

**Replace**:
```typescript
// Initialize Azure Storage
azureStorageService
  .initialize()
  .then(() => {
    logger.info('Azure Storage initialized successfully');
  })
  .catch((error) => {
    logger.error('Failed to initialize Azure Storage', error);
  });
```

**With**:
```typescript
// Initialize Azure Storage
azureStorageService
  .initialize()
  .then(() => {
    const status = azureStorageService.getHealthStatus();
    if (status.healthy) {
      logger.info('Azure Storage initialized successfully');
    } else {
      logger.warn('Azure Storage initialized in degraded mode:', status.error);
      logger.warn('Uploads will fail until Azure Storage credentials are configured');
    }
  })
  .catch((error) => {
    logger.error('Failed to initialize Azure Storage', error);
    logger.warn('Media service running without Azure Storage - uploads will fail');
  });
```

## Testing the Fixes

### 1. Test Health Check

```bash
# Basic health check
curl http://localhost:3006/health

# Detailed health check
curl http://localhost:3006/health/detailed
```

**Expected Response (Healthy)**:
```json
{
  "status": "healthy",
  "service": "media-service",
  "timestamp": "2025-12-15T....",
  "storage": {
    "healthy": true,
    "initialized": true
  },
  "uptime": 123.456
}
```

**Expected Response (Degraded - Missing Credentials)**:
```json
{
  "status": "degraded",
  "service": "media-service",
  "timestamp": "2025-12-15T....",
  "storage": {
    "healthy": false,
    "initialized": false,
    "error": "Azure Storage credentials not configured. Please set AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY"
  },
  "uptime": 123.456
}
```

### 2. Test Upload (When Healthy)

```bash
curl -X POST http://localhost:3006/api/media/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "photo=@test-image.jpg"
```

### 3. Test Circuit Breaker Reset

```bash
# Check API Gateway circuit breakers
curl http://localhost:3001/health/circuits

# Should show media service circuit recovering
```

## Deployment Steps

### Development Environment

1. **Copy the fixed file**:
   ```bash
   cd backend/services/media-service
   cp src/infrastructure/storage/azure-storage.service.fixed.ts src/infrastructure/storage/azure-storage.service.ts
   ```

2. **Update src/index.ts** with the changes above

3. **Create/Update .env file** with proper credentials

4. **Restart the service**:
   ```bash
   npm run dev
   ```

5. **Verify health**:
   ```bash
   curl http://localhost:3006/health/detailed
   ```

### Production Environment

1. **Set Azure Storage credentials** in production environment variables:
   ```bash
   AZURE_STORAGE_ACCOUNT_NAME=flamoralstorage
   AZURE_STORAGE_ACCOUNT_KEY=<actual-key-from-azure-portal>
   ```

2. **Deploy the updated code**:
   ```bash
   npm run build
   npm start
   ```

3. **Monitor circuit breaker recovery**:
   - Check API Gateway health endpoint
   - Circuit should transition from OPEN → HALF_OPEN → CLOSED
   - Takes approximately 15-30 seconds

## Azure Storage Setup (If Not Configured)

### Option 1: Use Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to Storage Accounts
3. Find "flamoralstorage" (or create new)
4. Click "Access keys" in left menu
5. Copy "Storage account name" and "key1"
6. Set in environment variables

### Option 2: Use Azure CLI

```bash
# Create storage account
az storage account create \
  --name flamoralstorage \
  --resource-group flamoral-rg \
  --location eastus \
  --sku Standard_LRS

# Get connection keys
az storage account keys list \
  --account-name flamoralstorage \
  --resource-group flamoral-rg
```

### Option 3: Local Development with Azurite

```bash
# Install Azurite
npm install -g azurite

# Start Azurite
azurite --silent --location ./azurite-data --debug ./azurite-debug.log

# Leave Azure credentials empty in .env
# Service will automatically use Azurite
```

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Circuit Breaker State**:
   - Check: `GET /health/circuits` on API Gateway
   - Alert if: State = OPEN for > 5 minutes

2. **Azure Storage Health**:
   - Check: `GET /health/detailed` on Media Service
   - Alert if: `storage.healthy = false`

3. **Upload Success Rate**:
   - Monitor upload endpoint responses
   - Alert if: Success rate < 95%

### Prometheus Metrics (If Available)

```
# Media service health
media_service_health{service="media"} 1

# Azure Storage health
azure_storage_health{service="media"} 1

# Upload success rate
media_uploads_total{status="success"} 1234
media_uploads_total{status="failure"} 12
```

## Common Issues & Solutions

### Issue: "Azure Storage credentials not configured"

**Solution**: Set environment variables:
```bash
export AZURE_STORAGE_ACCOUNT_NAME=flamoralstorage
export AZURE_STORAGE_ACCOUNT_KEY=your-key-here
```

### Issue: Circuit breaker won't close

**Solutions**:
1. Verify media service is healthy: `curl http://localhost:3006/health/detailed`
2. Check logs for errors
3. Manually reset circuit: `POST /api/admin/circuits/mediaService/reset` (if available)
4. Restart API Gateway to reset all circuits

### Issue: CORS errors from frontend

**Solution**: Add frontend URL to CORS_ORIGINS:
```env
CORS_ORIGINS=http://localhost:3000,https://your-frontend.com
```

### Issue: "Container not found"

**Solution**: Service will auto-create container on first initialization. If it fails:
```bash
# Manually create container
az storage container create \
  --name media \
  --account-name flamoralstorage \
  --public-access blob
```

## Rollback Plan

If fixes cause issues:

1. **Revert azure-storage.service.ts**:
   ```bash
   git checkout HEAD -- src/infrastructure/storage/azure-storage.service.ts
   ```

2. **Restart service**:
   ```bash
   npm run dev
   ```

3. **Check original behavior** and re-diagnose

## Success Criteria

- [ ] Media service starts without crashing
- [ ] `/health` endpoint returns 200 OK
- [ ] `/health/detailed` shows storage status
- [ ] Circuit breaker state transitions to CLOSED
- [ ] File uploads work successfully
- [ ] CORS allows requests from all configured origins
- [ ] No errors in service logs

## Next Steps

After applying these fixes:

1. Monitor circuit breaker for 24 hours
2. Test file uploads from production frontend
3. Check Azure Storage costs (should be minimal during development)
4. Consider implementing caching layer for frequently accessed images
5. Set up alerting for circuit breaker state changes

## Support

For issues or questions:
- Check logs: `npm run dev` output
- Azure Storage logs: Azure Portal → Storage Account → Monitoring
- Circuit breaker status: `curl http://localhost:3001/health/circuits`

---

**Last Updated**: 2025-12-15
**Version**: 1.0
**Author**: Claude (AI Assistant)
