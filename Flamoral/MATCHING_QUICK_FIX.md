# Quick Fix Guide for Matching Service

## Problem Summary
The matching service is showing 1 failure in the circuit breaker because the API Gateway routing is misconfigured.

## Root Cause
1. The `MatchingController` in the API Gateway has no path prefix (`@Controller()` instead of `@Controller('matching')`)
2. The `/api/matching/suggestions` endpoint doesn't exist
3. Several proxy paths are incorrect

## Quick Fix (5 minutes)

### Step 1: Backup Current File
```bash
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral
cp backend/services/api-gateway/src/controllers/matching.controller.ts backend/services/api-gateway/src/controllers/matching.controller.ts.backup
```

### Step 2: Replace with Fixed Version
```bash
cp MATCHING_CONTROLLER_FIXED.ts backend/services/api-gateway/src/controllers/matching.controller.ts
```

### Step 3: Restart API Gateway
```bash
cd backend/services/api-gateway
npm run build
npm run start
```

Or if using Docker:
```bash
docker-compose restart api-gateway
```

### Step 4: Verify Fix
```bash
# Test health endpoint
curl http://localhost:4000/health

# Test suggestions endpoint (will return 401 without auth - that's correct!)
curl http://localhost:4000/api/v1/matching/suggestions

# Expected: {"statusCode":401,"message":"Unauthorized"}
# This is GOOD - it means the endpoint exists and requires auth
```

## What Was Fixed

### 1. Added Controller Prefix
**Before:**
```typescript
@Controller()
export class MatchingController {
```

**After:**
```typescript
@Controller('matching')
export class MatchingController {
```

**Result:** All endpoints now accessible at `/api/v1/matching/*`

### 2. Added Missing Endpoints

#### New `/suggestions` endpoint:
```typescript
@Get('suggestions')
async getSuggestions(...) {
  // Proxies to /api/recommendations on matching service
}
```

#### New `/swipe` endpoint:
```typescript
@Post('swipe')
async swipe(...) {
  // Proxies to /api/swipes on matching service
}
```

### 3. Fixed Proxy Paths

| Endpoint | Old Proxy Path | New Proxy Path |
|----------|----------------|----------------|
| Search | `/api/discovery/search` | `/api/search` |
| Nearby | `/api/discovery/nearby` | `/api/search/nearby` |
| Boost Activate | `/api/boost` | `/api/boosts/activate` |
| Boost Status | `/api/boost/status` | `/api/boosts/active` |
| Super Likes Quota | `/api/super-likes/remaining` | `/api/super-likes/quota` |
| Undo | `/api/actions/undo` | `/api/swipes/undo` |

## Endpoints Now Working

After the fix, these endpoints will work correctly:

### Discovery
- `GET /api/v1/matching/suggestions` - Get recommendations
- `GET /api/v1/matching/discovery/recommendations` - Get recommendations
- `POST /api/v1/matching/discovery/search` - Search profiles
- `GET /api/v1/matching/discovery/nearby` - Get nearby users

### Swipes
- `POST /api/v1/matching/swipe` - Record swipe action
- `POST /api/v1/matching/likes` - Like a profile
- `POST /api/v1/matching/passes` - Pass on a profile
- `POST /api/v1/matching/actions/undo` - Undo last swipe

### Matches
- `GET /api/v1/matching/matches` - Get all matches
- `GET /api/v1/matching/matches/:matchId` - Get specific match
- `DELETE /api/v1/matching/matches/:matchId` - Unmatch
- `GET /api/v1/matching/matches/count` - Get match count

### Premium Features
- `POST /api/v1/matching/super-likes` - Send super like
- `GET /api/v1/matching/super-likes/remaining` - Get quota
- `POST /api/v1/matching/boost` - Activate boost
- `GET /api/v1/matching/boost/status` - Get boost status

## Verification Checklist

After applying the fix:

- [ ] API Gateway restarts successfully
- [ ] `/health` endpoint responds
- [ ] `/api/v1/matching/suggestions` returns 401 (auth required) - GOOD
- [ ] `/api/v1/matching/matches` returns 401 (auth required) - GOOD
- [ ] Circuit breaker shows 0 failures
- [ ] Frontend matching features work

## If Something Goes Wrong

### Rollback
```bash
cd backend/services/api-gateway/src/controllers
cp matching.controller.ts.backup matching.controller.ts
cd ../../..
npm run build
npm run start
```

### Check Logs
```bash
# API Gateway logs
docker-compose logs -f api-gateway

# Matching Service logs
docker-compose logs -f matching-service
```

### Common Issues

**Issue:** Endpoints still return 404
**Solution:** Make sure you restarted the API Gateway after making changes

**Issue:** 500 Internal Server Error
**Solution:** Check that matching-service is running:
```bash
curl http://localhost:3009/health
```

**Issue:** Still getting circuit breaker failures
**Solution:**
1. Clear circuit breaker state (restart API Gateway)
2. Verify matching service database connection
3. Check matching service logs for errors

## Additional Configuration

### Environment Variables

Make sure these are set in `backend/services/matching-service/.env`:
```env
PORT=3009
DB_HOST=localhost
DB_PORT=5432
DB_NAME=matching_service_dev
DB_USER=postgres
DB_PASSWORD=your_password
JWT_ACCESS_SECRET=your_jwt_secret
REDIS_HOST=localhost
REDIS_PORT=6379
USER_SERVICE_URL=http://localhost:3002
NOTIFICATION_SERVICE_URL=http://localhost:3012
ANALYTICS_SERVICE_URL=http://localhost:3007
```

### Database Setup

If database tables are missing:
```bash
cd backend/services/matching-service
npm run migrate:latest
```

## Success Criteria

The fix is successful when:

1. All matching endpoints return 401 (unauthorized) without a token
2. Matching endpoints return data with a valid auth token
3. Circuit breaker shows 0 failures
4. Frontend can browse matches and swipe on profiles

## Support

If you encounter issues:

1. Check `MATCHING_SERVICE_FIX_SUMMARY.md` for detailed information
2. Review logs in `docker-compose logs -f`
3. Verify all services are running with `docker-compose ps`
4. Check database connectivity with `psql -h localhost -U postgres -d matching_service_dev`

---

**Estimated Fix Time:** 5 minutes
**Estimated Testing Time:** 5 minutes
**Total Time:** 10 minutes
