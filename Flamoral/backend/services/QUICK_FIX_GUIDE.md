# Quick Fix Guide - API Endpoints 404 Errors

## Problem
Many API endpoints returning 404 Not Found due to double `/api/` prefix.

## Quick Fix (2 Steps)

### Step 1: Run the Fix Script

**PowerShell (Windows):**
```powershell
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services
./fix-api-routes.ps1
```

**Bash (Git Bash/Linux):**
```bash
cd backend/services
./fix-api-routes.sh
```

### Step 2: Rebuild & Restart

```bash
cd api-gateway
npm run build
npm run start:dev
```

## What Gets Fixed

### Route Path Issues (Double /api/)
- ❌ `/api/v1/api/auth/*` → ✅ `/api/v1/auth/*`
- ❌ `/api/v1/api/safety/*` → ✅ `/api/v1/safety/*`

### Missing Endpoints
- ✅ `/api/v1/profiles` - Profile listing
- ✅ `/api/v1/admin/users` - Admin user management
- ✅ `/api/v1/advertising` - Advertising campaigns
- ✅ `/api/v1/ai` - AI features

### Endpoint Type Fixes
- ✅ `/api/v1/auth/verify-email` - Changed from POST to GET

## Files Modified

The script will modify:
1. `auth.controller.ts` - Fix route prefix
2. `auth.controller.secure.ts` - Fix route prefix
3. `safety.controller.ts` - Fix route prefix
4. `controllers.module.ts` - Add new controllers

## Files Created

New controllers already created:
1. `profiles.controller.ts` ✅
2. `admin.controller.ts` ✅
3. `advertising.controller.ts` ✅
4. `ai.controller.ts` ✅

## Verify Fixes Work

Test these endpoints after restart:

```bash
# Should return 200/401 instead of 404
curl http://localhost:4000/api/v1/auth/login
curl http://localhost:4000/api/v1/profiles
curl http://localhost:4000/api/v1/admin/users
curl http://localhost:4000/api/v1/advertising/campaigns
curl http://localhost:4000/api/v1/ai/suggestions
```

## Troubleshooting

**If script fails:**
Manually update these lines:

**auth.controller.ts (line 13):**
```typescript
@Controller('auth')  // Remove 'api/' prefix
```

**auth.controller.secure.ts (line 16):**
```typescript
@Controller('auth')  // Remove 'api/' prefix
```

**safety.controller.ts (line 25):**
```typescript
@Controller('safety')  // Remove 'api/' prefix
```

**If new endpoints still 404:**
Check that new controller files exist in:
- `backend/services/api-gateway/src/controllers/`

## Complete Endpoint List

After fixes, all these will work:

| Endpoint | Service | Status |
|----------|---------|--------|
| `/api/v1/auth/*` | auth-service | ✅ Fixed |
| `/api/v1/users/*` | user-service | ✅ Works |
| `/api/v1/profiles` | user-service | ✅ Added |
| `/api/v1/messages` | messaging-service | ✅ Works |
| `/api/v1/conversations` | messaging-service | ✅ Works |
| `/api/v1/matches` | matching-service | ✅ Works |
| `/api/v1/discovery/*` | matching-service | ✅ Works |
| `/api/v1/subscriptions` | payment-service | ✅ Works |
| `/api/v1/media` | media-service | ✅ Works |
| `/api/v1/analytics` | analytics-service | ✅ Works |
| `/api/v1/moderation` | moderation-service | ✅ Works |
| `/api/v1/notifications` | notification-service | ✅ Works |
| `/api/v1/admin/*` | admin-service | ✅ Added |
| `/api/v1/advertising/*` | advertising-service | ✅ Added |
| `/api/v1/ai/*` | ai-services | ✅ Added |
| `/api/v1/safety/*` | user-service | ✅ Fixed |

## Need More Help?

See detailed documentation in `API_ENDPOINT_FIXES.md`
