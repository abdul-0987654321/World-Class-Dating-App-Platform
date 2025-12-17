# Manual Profile Service Fix Guide

## Issue
Profile service shows 1 failure in circuit breaker. Endpoints returning 404 errors.

## Quick Fix Checklist

### Fix 1: Register ProfilesController (5 minutes)

**File**: `backend/services/api-gateway/src/controllers/controllers.module.ts`

1. Open the file in your editor
2. Add this import at the top (line 4, after UserController import):
```typescript
import { ProfilesController } from './profiles.controller';
```

3. Add `ProfilesController,` to the controllers array (line 18, after UserController):
```typescript
@Module({
  controllers: [
    AuthController,
    UserController,
    ProfilesController,  // ← ADD THIS LINE
    MatchingController,
    // ... rest
  ],
})
```

**Before**:
```typescript
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UserController } from './user.controller';
import { MatchingController } from './matching.controller';
// ...

@Module({
  controllers: [
    AuthController,
    UserController,
    MatchingController,
    // ...
  ],
})
```

**After**:
```typescript
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UserController } from './user.controller';
import { ProfilesController } from './profiles.controller'; // ← ADDED
import { MatchingController } from './matching.controller';
// ...

@Module({
  controllers: [
    AuthController,
    UserController,
    ProfilesController,  // ← ADDED
    MatchingController,
    // ...
  ],
})
```

---

### Fix 2: Add /profile Endpoints to UserController (10 minutes)

**File**: `backend/services/api-gateway/src/controllers/user.controller.ts`

Add these methods after line 28 (right after `// ==================== User Profile Endpoints ====================`):

```typescript
  /**
   * Get current user profile (alias endpoint)
   */
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getUserProfile(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/profile', {
      Authorization: authorization,
    });
  }

  /**
   * Update current user profile (alias endpoint)
   */
  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateUserProfile(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.put('userService', '/api/profile', body, {
      Authorization: authorization,
    });
  }
```

**Insert Location**:
```typescript
  // ==================== User Profile Endpoints ====================

  // ← INSERT NEW METHODS HERE

  /**
   * Get current user profile
   */
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getCurrentUser(@Headers('authorization') authorization: string) {
    // ...
  }
```

---

### Fix 3: Rebuild and Restart (5 minutes)

1. **Build API Gateway**:
```bash
cd backend/services/api-gateway
npm run build
```

2. **Restart Service**:
```bash
# If using PM2
pm2 restart api-gateway

# If using npm
npm run start:prod

# If using Docker
docker-compose restart api-gateway
```

3. **Reset Circuit Breaker** (Optional - or wait 15 seconds):
```bash
curl -X POST http://localhost:4000/api/v1/admin/circuit-breaker/profileService/reset \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### Verification (5 minutes)

1. **Check Service Health**:
```bash
curl http://localhost:4000/health
curl http://localhost:3002/health
```

2. **Test Profile Endpoints**:
```bash
# Get current user profile
curl -X GET http://localhost:4000/api/v1/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return 200 with profile data

# Get profiles list
curl -X GET http://localhost:4000/api/v1/api/profiles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return 200
```

3. **Check Circuit Breaker Status**:
```bash
curl http://localhost:4000/health/circuit-breaker

# Should show profileService as CLOSED
```

---

## What These Fixes Do

### Fix 1: ProfilesController Registration
- **Problem**: Controller exists but isn't registered, so routes don't work
- **Solution**: Import and register in ControllersModule
- **Result**: `/api/v1/api/profiles/*` endpoints now work

### Fix 2: /profile Endpoint Alias
- **Problem**: Frontend expects `/api/v1/api/users/profile` but it doesn't exist
- **Solution**: Add alias endpoints in UserController
- **Result**: Both `/users/me` and `/users/profile` work

### Fix 3: Circuit Breaker Recovery
- **Problem**: Repeated 404s caused circuit to open
- **Solution**: After fixing routes, reset or wait for auto-recovery
- **Result**: Service becomes available again

---

## Troubleshooting

### Build Fails
```bash
# Check for TypeScript errors
npm run build

# Common issues:
# - Missing imports
# - Typos in decorators
# - Missing @Put or @Get decorators
```

### Still Getting 404
```bash
# Check if routes are registered
curl http://localhost:4000/api/docs

# Look for:
# - /api/users/profile (GET, PUT)
# - /api/profiles (GET)
# - /api/profiles/{id} (GET)
```

### Circuit Breaker Still Open
```bash
# Check status
curl http://localhost:4000/health/circuit-breaker

# If OPEN, wait 15 seconds or reset:
curl -X POST http://localhost:4000/api/v1/admin/circuit-breaker/reset-all

# If HALF_OPEN, wait for 5 successful requests
```

### JWT 401 Errors
```bash
# This is expected for /users/profile - it requires authentication
# Make sure you're sending valid JWT token:
curl -H "Authorization: Bearer eyJhbGc..." http://localhost:4000/api/v1/api/users/profile
```

---

## Verification Checklist

- [ ] controllers.module.ts includes ProfilesController import
- [ ] controllers.module.ts includes ProfilesController in array
- [ ] user.controller.ts has getUserProfile() method
- [ ] user.controller.ts has updateUserProfile() method
- [ ] npm run build succeeds
- [ ] Service restarted successfully
- [ ] GET /api/v1/api/profiles returns 200 (not 404)
- [ ] GET /api/v1/api/users/profile returns 200 (not 404)
- [ ] Circuit breaker status shows CLOSED

---

## Time Estimate

| Task | Time |
|------|------|
| Fix 1: Register Controller | 5 min |
| Fix 2: Add Endpoints | 10 min |
| Fix 3: Rebuild & Restart | 5 min |
| Verification | 5 min |
| **Total** | **25 min** |

---

## If You Need Help

1. **Check Logs**:
```bash
# API Gateway logs
tail -f backend/services/api-gateway/logs/combined.log

# User Service logs
tail -f backend/services/user-service/logs/combined.log
```

2. **View Full Documentation**:
   - See `PROFILE_SERVICE_FIX.md` for detailed explanation
   - Check API docs: `http://localhost:4000/api/docs`

3. **Rollback** (if something breaks):
```bash
# Git rollback
git checkout backend/services/api-gateway/src/controllers/controllers.module.ts
git checkout backend/services/api-gateway/src/controllers/user.controller.ts

# Rebuild and restart
cd backend/services/api-gateway
npm run build
pm2 restart api-gateway
```

---

## Expected Results

### Before Fix
```bash
$ curl http://localhost:4000/api/v1/api/profiles
{"statusCode":404,"message":"Cannot GET /api/v1/api/profiles"}

$ curl http://localhost:4000/api/v1/api/users/profile
{"statusCode":404,"message":"Cannot GET /api/v1/api/users/profile"}
```

### After Fix
```bash
$ curl -H "Authorization: Bearer TOKEN" http://localhost:4000/api/v1/api/profiles
{"success":true,"data":{...profile data...}}

$ curl -H "Authorization: Bearer TOKEN" http://localhost:4000/api/v1/api/users/profile
{"success":true,"data":{...profile data...}}
```

---

## Notes

- ⚠️ **OneDrive Sync**: If files are in OneDrive, close OneDrive temporarily to avoid file locks
- ⚠️ **IDE Open**: Close the IDE while editing to avoid conflicts
- ✅ **No Database Changes**: These fixes don't require any database migrations
- ✅ **No Downtime**: Can be applied with rolling restart
- ✅ **Backward Compatible**: Existing `/users/me` endpoints still work

---

## Success Criteria

✅ All profile endpoints return 200 (not 404)
✅ Circuit breaker shows CLOSED state
✅ User can fetch and update their profile
✅ No errors in logs
✅ Frontend profile pages load correctly

---

Done! This should fix the profile service issues completely.
