# API Endpoint Fixes for Flamoral.com

## Problem Identified

The API Gateway had a **double `/api/` prefix issue** causing 404 errors for many endpoints.

### Root Cause

In `main.ts` (line 107), a global prefix `'api/v1'` is applied to all routes:
```typescript
app.setGlobalPrefix('api/v1', {
  exclude: [
    { path: 'health', method: RequestMethod.ALL },
    { path: 'health/(.*)', method: RequestMethod.ALL },
  ],
});
```

Some controllers had `'api/'` in their `@Controller()` decorator:
```typescript
@Controller('api/auth')  // ❌ WRONG - Creates /api/v1/api/auth/*
```

This resulted in URLs like:
- `/api/v1/api/auth/*` instead of `/api/v1/auth/*`
- `/api/v1/api/safety/*` instead of `/api/v1/safety/*`

## Solutions Implemented

### 1. Fixed Existing Controllers

**Files Modified:**
- `auth.controller.ts` - Changed `@Controller('api/auth')` → `@Controller('auth')`
- `auth.controller.secure.ts` - Changed `@Controller('api/auth')` → `@Controller('auth')`
- `safety.controller.ts` - Changed `@Controller('api/safety')` → `@Controller('safety')`

**Additional Fix:**
- Changed `verify-email` endpoint from `@Post()` to `@Get()` in auth controllers

### 2. Created Missing Controllers

Created new controllers for endpoints that were returning 404:

#### ProfilesController (`profiles.controller.ts`)
- **Route:** `/api/v1/profiles`
- **Endpoints:**
  - `GET /api/v1/profiles` - Get all profiles
  - `GET /api/v1/profiles/:profileId` - Get profile by ID
  - `POST /api/v1/profiles/search` - Search profiles
  - `GET /api/v1/profiles/recommendations` - Get recommendations

#### AdminController (`admin.controller.ts`)
- **Route:** `/api/v1/admin`
- **Endpoints:**
  - `GET /api/v1/admin/users` - Get all users (admin)
  - `GET /api/v1/admin/users/:userId` - Get user by ID
  - `PUT /api/v1/admin/users/:userId` - Update user
  - `POST /api/v1/admin/users/:userId/suspend` - Suspend user
  - `POST /api/v1/admin/users/:userId/ban` - Ban user
  - `DELETE /api/v1/admin/users/:userId` - Delete user
  - `GET /api/v1/admin/stats` - Platform statistics
  - `GET /api/v1/admin/analytics/users` - User analytics
  - `GET /api/v1/admin/moderation/queue` - Moderation queue
  - `POST /api/v1/admin/moderation/:itemId/review` - Review content

#### AdvertisingController (`advertising.controller.ts`)
- **Route:** `/api/v1/advertising`
- **Endpoints:**
  - `GET /api/v1/advertising/campaigns` - Get campaigns
  - `POST /api/v1/advertising/campaigns` - Create campaign
  - `GET /api/v1/advertising/campaigns/:campaignId` - Get campaign
  - `PUT /api/v1/advertising/campaigns/:campaignId` - Update campaign
  - `DELETE /api/v1/advertising/campaigns/:campaignId` - Delete campaign
  - `GET /api/v1/advertising/campaigns/:campaignId/analytics` - Campaign analytics

#### AIController (`ai.controller.ts`)
- **Route:** `/api/v1/ai`
- **Endpoints:**
  - `GET /api/v1/ai/suggestions` - AI profile suggestions
  - `GET /api/v1/ai/conversation-starters/:matchId` - Conversation starters
  - `GET /api/v1/ai/profile/optimize` - Profile optimization tips
  - `POST /api/v1/ai/bio/generate` - Generate bio suggestions
  - `GET /api/v1/ai/compatibility/:userId` - Compatibility analysis
  - `POST /api/v1/ai/moderate` - Content moderation

### 3. Updated Module Registration

Updated `controllers.module.ts` to register all controllers:
```typescript
@Module({
  controllers: [
    AuthController,
    UserController,
    MatchingController,
    MessagingController,
    PaymentController,
    MediaController,
    NotificationController,
    ModerationController,
    AnalyticsController,
    CsrfController,
    SafetyController,
    ProfilesController,        // ✅ NEW
    AdminController,           // ✅ NEW
    AdvertisingController,     // ✅ NEW
    AIController,              // ✅ NEW
  ],
})
```

## Endpoint Mapping Reference

### Previously Missing Endpoints (Now Fixed)

| Frontend Request | Backend Service | Controller | Status |
|-----------------|-----------------|------------|--------|
| `GET /api/v1/profiles` | user-service | ProfilesController | ✅ Fixed |
| `GET /api/v1/messages` | messaging-service | MessagingController | ✅ Already exists (conversations) |
| `GET /api/v1/media` | media-service | MediaController | ✅ Already exists |
| `GET /api/v1/payments` | payment-service | PaymentController | ✅ Already exists (subscriptions) |
| `GET /api/v1/analytics` | analytics-service | AnalyticsController | ✅ Already exists |
| `GET /api/v1/admin/users` | admin-service | AdminController | ✅ Fixed |
| `GET /api/v1/moderation` | moderation-service | ModerationController | ✅ Already exists |
| `GET /api/v1/advertising` | advertising-service | AdvertisingController | ✅ Fixed |
| `GET /api/v1/ai` | ai-services | AIController | ✅ Fixed |
| `GET /api/v1/subscriptions` | payment-service | PaymentController | ✅ Already exists |
| `GET /api/v1/matching/suggestions` | matching-service | MatchingController | ✅ Already exists (discovery/recommendations) |
| `GET /api/v1/auth/verify-email` | auth-service | AuthController | ✅ Fixed (changed to GET) |

## How to Apply Fixes

### Option 1: Run the Automated Script

**For PowerShell (Windows):**
```powershell
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services
./fix-api-routes.ps1
```

**For Bash (Linux/Mac/Git Bash):**
```bash
cd /c/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services
chmod +x fix-api-routes.sh
./fix-api-routes.sh
```

### Option 2: Manual Application

1. **Update auth.controller.ts:**
   - Change line 13: `@Controller('api/auth')` → `@Controller('auth')`
   - Change line 96: `@Post('verify-email')` → `@Get('verify-email')`

2. **Update auth.controller.secure.ts:**
   - Change line 16: `@Controller('api/auth')` → `@Controller('auth')`
   - Change line 153: `@Post('verify-email')` → `@Get('verify-email')`

3. **Update safety.controller.ts:**
   - Change line 25: `@Controller('api/safety')` → `@Controller('safety')`

4. **Update controllers.module.ts:**
   - Add imports for new controllers (ProfilesController, AdminController, AdvertisingController, AIController)
   - Add them to the controllers array

5. **Ensure new controller files exist:**
   - `profiles.controller.ts`
   - `admin.controller.ts`
   - `advertising.controller.ts`
   - `ai.controller.ts`

### Rebuild and Restart

After applying fixes:

```bash
cd backend/services/api-gateway
npm run build
npm run start:dev
```

## Verification

Test the following endpoints to verify fixes:

```bash
# Auth endpoints (fixed double /api/)
curl http://localhost:4000/api/v1/auth/login
curl http://localhost:4000/api/v1/auth/verify-email?token=xxx

# New endpoints
curl http://localhost:4000/api/v1/profiles
curl http://localhost:4000/api/v1/admin/users
curl http://localhost:4000/api/v1/advertising/campaigns
curl http://localhost:4000/api/v1/ai/suggestions

# Existing endpoints (verify still working)
curl http://localhost:4000/api/v1/users/me
curl http://localhost:4000/api/v1/analytics
curl http://localhost:4000/api/v1/messages
```

## Summary of Changes

### Files Created:
1. `backend/services/api-gateway/src/controllers/profiles.controller.ts`
2. `backend/services/api-gateway/src/controllers/admin.controller.ts`
3. `backend/services/api-gateway/src/controllers/advertising.controller.ts`
4. `backend/services/api-gateway/src/controllers/ai.controller.ts`
5. `backend/services/fix-api-routes.ps1` (PowerShell script)
6. `backend/services/fix-api-routes.sh` (Bash script)
7. `backend/services/API_ENDPOINT_FIXES.md` (this file)

### Files to Modify:
1. `backend/services/api-gateway/src/controllers/auth.controller.ts`
2. `backend/services/api-gateway/src/controllers/auth.controller.secure.ts`
3. `backend/services/api-gateway/src/controllers/safety.controller.ts`
4. `backend/services/api-gateway/src/controllers/controllers.module.ts`

### Impact:
- ✅ Fixes 404 errors for auth, safety, and profile endpoints
- ✅ Adds support for admin, advertising, and AI endpoints
- ✅ Makes verify-email accessible via GET (for email link clicks)
- ✅ Maintains backward compatibility with existing endpoints
- ✅ All routes now follow consistent `/api/v1/{resource}` pattern

## Notes

1. **Service Dependencies:** New controllers proxy to backend services (admin-service, advertising-service, ai-services). Ensure these services are running and configured in the proxy service.

2. **Authentication:** All endpoints except those marked with `@Public()` require JWT authentication.

3. **Rate Limiting:** ComprehensiveRateLimitGuard applies to all endpoints.

4. **CORS:** Configured to allow flamoral.com domains with credentials.

5. **Global Prefix:** The `api/v1` prefix is applied globally, so controllers should NOT include it in their decorators.

## Future Considerations

1. Consider removing the global prefix and using versioning middleware instead
2. Add OpenAPI/Swagger documentation for new endpoints
3. Implement proper DTOs for request validation
4. Add integration tests for new controllers
5. Monitor service-to-service communication for new proxy calls
