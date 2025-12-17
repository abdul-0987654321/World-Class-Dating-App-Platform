# Profile Service Fix - Flamoral.com

## Issue Summary

The profile service shows **1 failure in the circuit breaker**. The following issues were identified:

1. **GET /api/v1/api/profiles** - Returns 404 (ProfilesController not registered)
2. **GET /api/v1/api/users/profile** - Returns 401 (correct behavior but missing endpoint)
3. ProfilesController exists but is not included in the ControllersModule
4. Circuit breaker may have opened due to repeated 404 errors

## Root Causes

### 1. Missing ProfilesController Registration
- **File**: `backend/services/api-gateway/src/controllers/controllers.module.ts`
- **Issue**: `ProfilesController` exists at `profiles.controller.ts` but is not imported or registered in the module
- **Impact**: All `/api/v1/api/profiles/*` endpoints return 404

### 2. Missing /users/profile Endpoint
- **File**: `backend/services/api-gateway/src/controllers/user.controller.ts`
- **Issue**: No `/profile` endpoint mapping to user-service's `/api/profile` route
- **Impact**: Frontend expecting `/api/v1/api/users/profile` gets 404

### 3. Circuit Breaker Status
- **Current Config**:
  - Failure Threshold: 5 failures
  - Failure Rate Threshold: 50%
  - Timeout: 15 seconds
  - Success Threshold: 5 consecutive successes needed to close
- **Likely Cause**: Repeated 404 errors triggered the circuit breaker to open

## Service Architecture

### User Service (Port 3002)
- **Routes Available**:
  - `GET /api/profile` - Get current user's profile (requires auth)
  - `PUT /api/profile` - Update current user's profile (requires auth)
- **Service**: ProfileService uses ProfileRepository
- **Database**: Profiles table with fields:
  - user_id, bio, occupation, education, height
  - city, state, country, latitude, longitude
  - interests (JSON array), languages (JSON array)

### API Gateway (Port 4000)
- **Global Prefix**: `/api/v1`
- **Expected Routes**:
  - `/api/v1/api/profiles` - List/search profiles
  - `/api/v1/api/profiles/:id` - Get profile by ID
  - `/api/v1/api/users/profile` - Get current user profile
- **Service Config**:
  - profileService URL: `http://localhost:3002` (same as userService)

## Fixes Required

### Fix 1: Register ProfilesController

**File**: `backend/services/api-gateway/src/controllers/controllers.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UserController } from './user.controller';
import { ProfilesController } from './profiles.controller'; // ADD THIS
import { MatchingController } from './matching.controller';
import { MessagingController } from './messaging.controller';
import { PaymentController } from './payment.controller';
import { MediaController } from './media.controller';
import { NotificationController } from './notification.controller';
import { ModerationController } from './moderation.controller';
import { AnalyticsController } from './analytics.controller';
import { CsrfController } from './csrf.controller';
import { SafetyController } from './safety.controller';

@Module({
  controllers: [
    AuthController,
    UserController,
    ProfilesController, // ADD THIS
    MatchingController,
    MessagingController,
    PaymentController,
    MediaController,
    NotificationController,
    ModerationController,
    AnalyticsController,
    CsrfController,
    SafetyController,
  ],
})
export class ControllersModule {}
```

### Fix 2: Add /profile Endpoint to UserController

**File**: `backend/services/api-gateway/src/controllers/user.controller.ts`

Add these endpoints after line 28 (before the existing `@Get('me')` endpoint):

```typescript
  // ==================== User Profile Endpoints ====================

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

### Fix 3: Update ProfilesController Mapping

**File**: `backend/services/api-gateway/src/controllers/profiles.controller.ts`

The current controller tries to route to `/api/users` which may not exist. Update line 37:

```typescript
// CURRENT (Line 37):
const path = `/api/users${queryString.toString() ? '?' + queryString.toString() : ''}`;

// CHANGE TO:
const path = `/api/profile${queryString.toString() ? '?' + queryString.toString() : ''}`;
```

### Fix 4: Reset Circuit Breaker

After deploying fixes, reset the circuit breaker using the admin API:

```bash
# Reset profileService circuit
curl -X POST http://localhost:4000/api/v1/admin/circuit-breaker/profileService/reset \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Or reset all circuits
curl -X POST http://localhost:4000/api/v1/admin/circuit-breaker/reset-all \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Expected Endpoint Behavior After Fix

### 1. GET /api/v1/api/profiles
- **Status**: 200 OK
- **Response**: Current user's profile
- **Proxies to**: `userService:/api/profile`

### 2. GET /api/v1/api/profiles/:profileId
- **Status**: 200 OK
- **Response**: Specific user's profile
- **Proxies to**: `userService:/api/users/:profileId`

### 3. GET /api/v1/api/users/profile
- **Status**: 200 OK
- **Response**: Current user's profile
- **Proxies to**: `userService:/api/profile`

### 4. PUT /api/v1/api/users/profile
- **Status**: 200 OK
- **Body**: Profile update data
- **Proxies to**: `userService:/api/profile`

## Profile Fields Supported

The user-service ProfileService supports the following fields:

```typescript
{
  bio?: string;              // Max 500 chars
  occupation?: string;       // Max 100 chars
  education?: string;        // Max 100 chars
  height?: number;           // 100-250 cm
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;         // -90 to 90
  longitude?: number;        // -180 to 180
  interests?: string[];      // Max 10 items
  languages?: string[];      // Max 10 items
}
```

## Validation

- Bio: Max 500 characters
- Occupation: Max 100 characters
- Education: Max 100 characters
- Height: 100-250 cm
- Coordinates: Valid latitude/longitude ranges
- Arrays: Max 10 items

## Integration Points

### Photo Upload Integration
- Photos are handled separately via `/api/users/me/photos`
- Uses Azure Blob Storage (via uploadService)
- Requires AZURE_STORAGE_CONNECTION_STRING environment variable

### Photo Moderation
- Photo moderation is handled by moderation-service
- Automatically triggered on photo upload
- Uses Azure Content Moderator

### Search Indexing
- Profile updates should trigger search index updates
- Currently handled via matching-service
- Uses `/api/discovery/search` endpoint

## Testing Steps

1. **Test Profile Endpoints**:
```bash
# Get current user profile
curl -X GET http://localhost:4000/api/v1/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update profile
curl -X PUT http://localhost:4000/api/v1/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Coffee enthusiast and adventure seeker",
    "occupation": "Software Engineer",
    "height": 175,
    "interests": ["hiking", "photography", "cooking"]
  }'

# Get profiles listing
curl -X GET http://localhost:4000/api/v1/api/profiles \
  -H "Authorization: Bearer YOUR_TOKEN"
```

2. **Verify Circuit Breaker Status**:
```bash
curl -X GET http://localhost:4000/api/v1/health/circuit-breaker
```

3. **Check Service Health**:
```bash
# User service health
curl -X GET http://localhost:3002/health

# API Gateway health
curl -X GET http://localhost:4000/health
```

## Deployment Steps

1. **Stop API Gateway**:
```bash
cd backend/services/api-gateway
npm run build
pm2 stop api-gateway  # or your process manager
```

2. **Apply Fixes**:
   - Update `controllers.module.ts` to include ProfilesController
   - Update `user.controller.ts` to add /profile endpoints
   - Update `profiles.controller.ts` to fix routing

3. **Restart API Gateway**:
```bash
pm2 start api-gateway
# or
npm run start:prod
```

4. **Reset Circuit Breaker**:
```bash
# Use admin API or wait 15 seconds for auto-recovery
```

5. **Verify**:
```bash
# Test endpoints
curl http://localhost:4000/api/v1/api/profiles -H "Authorization: Bearer TOKEN"
```

## Monitoring

### Circuit Breaker Metrics
- **State**: CLOSED (normal), HALF_OPEN (testing), OPEN (failing)
- **Failure Threshold**: 5 failures
- **Success Threshold**: 5 consecutive successes to close from HALF_OPEN
- **Timeout**: 15 seconds before attempting recovery

### Health Check Endpoints
- API Gateway: `http://localhost:4000/health`
- User Service: `http://localhost:3002/health`
- Circuit Breaker Status: `http://localhost:4000/health/circuit-breaker`

### Logs to Monitor
```bash
# API Gateway logs
tail -f backend/services/api-gateway/logs/combined.log | grep -i "profile\|circuit"

# User Service logs
tail -f backend/services/user-service/logs/combined.log | grep -i "profile"
```

## Environment Variables Required

### User Service (.env)
```bash
PORT=3002
DATABASE_URL=postgresql://...
AZURE_STORAGE_CONNECTION_STRING=...
JWT_SECRET=...
```

### API Gateway (.env)
```bash
PORT=4000
USER_SERVICE_URL=http://localhost:3002
PROFILE_SERVICE_URL=http://localhost:3002
CIRCUIT_FAILURE_THRESHOLD=5
CIRCUIT_TIMEOUT=15000
```

## Security Notes

- All profile endpoints require JWT authentication
- Profile updates are validated against schema
- Photo uploads are moderated automatically
- User can only update their own profile (enforced by auth middleware)
- Profile visibility is controlled by privacy settings

## Future Improvements

1. **Separate Profile Service**: Consider splitting profile logic into dedicated service
2. **Caching**: Add Redis caching for frequently accessed profiles
3. **Real-time Updates**: Implement WebSocket updates for profile changes
4. **Analytics**: Track profile completion percentage
5. **Recommendations**: Profile quality score for better matching

## Support

If issues persist after applying these fixes:

1. Check logs: `backend/services/api-gateway/logs/` and `backend/services/user-service/logs/`
2. Verify database connection: `backend/services/user-service/src/infrastructure/database/connection.ts`
3. Check circuit breaker status via health endpoint
4. Ensure JWT tokens are valid and not expired
5. Verify environment variables are set correctly

## Summary

The profile service issues are caused by:
1. ✅ ProfilesController not registered in ControllersModule
2. ✅ Missing /users/profile endpoint in UserController
3. ✅ Circuit breaker opened due to repeated 404 errors

All fixes are straightforward configuration changes that don't require database migrations or complex refactoring.
