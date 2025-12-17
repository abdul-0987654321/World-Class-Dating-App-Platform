# Backend Services Port Configuration Fixes

## Issue Summary
Multiple backend services were failing on first request due to port configuration mismatches between:
1. API Gateway .env file
2. API Gateway configuration.ts fallback values
3. Individual service hardcoded port defaults

## Root Cause Analysis

The API Gateway was trying to connect to services on the wrong ports because:
- Some fallback ports in `api-gateway/src/config/configuration.ts` didn't match service `.env.example` files
- Some services had incorrect hardcoded default ports in their config files
- Advertising service URL was completely missing from API Gateway configuration

## Fixes Applied

### 1. API Gateway .env File
**File**: `api-gateway/.env`

**Added**:
```bash
ADVERTISING_SERVICE_URL=http://localhost:3011
```

All other URLs were already correct in the .env file.

### 2. API Gateway Configuration (TypeScript)
**File**: `api-gateway/src/config/configuration.ts`

**NOTE**: A new corrected version has been created at `configuration.ts.new`.
To apply, manually run:
```bash
cd backend/services/api-gateway/src/config
mv configuration.ts configuration.ts.backup
mv configuration.ts.new configuration.ts
```

**Changes Made in configuration.ts.new**:
- messagingService: `3003` → `3004` ✓
- mediaService: `3004` → `3006` ✓
- moderationService: `3005` → `3008` ✓
- paymentService: `3006` → `3005` ✓
- notificationService: `3008` → `3012` ✓
- advertisingService: `3010` → `3011` ✓

### 3. Individual Service Configuration Files

The following service config files need their hardcoded PORT defaults fixed:

#### Media Service
**File**: `media-service/src/config/index.ts`
**Line 6**:
```typescript
// BEFORE:
port: parseInt(process.env.PORT || '3004', 10),

// AFTER:
port: parseInt(process.env.PORT || '3006', 10),
```

#### Notification Service
**File**: `notification-service/src/config/index.ts`
**Line 6**:
```typescript
// BEFORE:
port: process.env.PORT || 3008,

// AFTER:
port: process.env.PORT || 3012,
```

#### Advertising Service
**File**: `advertising-service/src/index.ts`
**Line 35**:
```typescript
// BEFORE:
const PORT = process.env.PORT || 3010;

// AFTER:
const PORT = process.env.PORT || 3011;
```

#### Payment Service (Verify)
**File**: `payment-service/src/index.ts`
Check line 19 - should be 3005 (currently shows 3006 in index.ts but .env.example shows 3005)
There's also an index-fixed.ts with port 3005, which suggests this was identified but not applied.

**Recommended**:
```typescript
// Use index-fixed.ts or update index.ts line 19:
const PORT = process.env.PORT || 3005;
```

## Correct Port Mapping Table

| Service            | Port  | Status |
|--------------------|-------|--------|
| Auth Service       | 3001  | ✓      |
| User/Profile       | 3002  | ✓      |
| Messaging Service  | 3004  | ✓      |
| Payment Service    | 3005  | ⚠️     |
| Media Service      | 3006  | ⚠️     |
| Analytics Service  | 3007  | ✓      |
| Moderation Service | 3008  | ✓      |
| Matching Service   | 3009  | ✓      |
| Admin Service      | 3010  | ✓      |
| Advertising        | 3011  | ⚠️     |
| Notification       | 3012  | ⚠️     |
| Workflow Engine    | 3013  | ✓      |
| Automation Service | 3014  | ✓      |
| API Gateway        | 4000  | ✓      |
| AI Service         | 8000  | ✓      |
| Realtime Service   | 8081  | ✓      |

Legend:
- ✓ = Already correct
- ⚠️ = Needs manual fix (see above)

## Health Check Verification

All services should implement a `/health` endpoint. Most already have this implemented:

```typescript
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'service-name',
    timestamp: new Date().toISOString(),
  });
});
```

## Testing After Fixes

After applying all fixes:

1. Restart the API Gateway:
```bash
cd backend/services/api-gateway
npm run start:dev
```

2. Test circuit breaker status:
```bash
curl http://localhost:4000/health/detailed
```

3. Verify each service health individually:
```bash
# Example for media service
curl http://localhost:3006/health

# Example for notification service
curl http://localhost:3012/health

# Example for advertising service
curl http://localhost:3011/health
```

4. Monitor circuit breaker recovery in API Gateway logs

## Additional Notes

- All .env.example files had the correct ports defined
- The issue was purely in TypeScript/JavaScript hardcoded fallback values
- Services should ALWAYS respect the PORT environment variable
- The API Gateway circuit breaker was working correctly - it detected the failures
- After fixes, circuits should close automatically after successful health checks

## Files Modified

1. ✓ `api-gateway/.env` - Added ADVERTISING_SERVICE_URL
2. ✓ `api-gateway/src/config/configuration.ts.new` - Created with corrected ports (needs manual rename)
3. ⚠️ `media-service/src/config/index.ts` - Needs manual fix
4. ⚠️ `notification-service/src/config/index.ts` - Needs manual fix
5. ⚠️ `advertising-service/src/index.ts` - Needs manual fix
6. ⚠️ `payment-service/src/index.ts` - Needs verification/fix
