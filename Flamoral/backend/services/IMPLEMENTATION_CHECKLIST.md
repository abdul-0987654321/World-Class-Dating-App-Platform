# API Endpoint Fix Implementation Checklist

## Prerequisites
- [ ] Backup current code
- [ ] Stop API Gateway service if running
- [ ] Have access to code editor

## Step 1: Apply Controller Fixes

### Manual Method

#### Fix auth.controller.ts
- [ ] Open `backend/services/api-gateway/src/controllers/auth.controller.ts`
- [ ] Line 13: Change `@Controller('api/auth')` to `@Controller('auth')`
- [ ] Line 96: Change `@Post('verify-email')` to `@Get('verify-email')`
- [ ] Save file

#### Fix auth.controller.secure.ts
- [ ] Open `backend/services/api-gateway/src/controllers/auth.controller.secure.ts`
- [ ] Line 16: Change `@Controller('api/auth')` to `@Controller('auth')`
- [ ] Line 153: Change `@Post('verify-email')` to `@Get('verify-email')`
- [ ] Save file

#### Fix safety.controller.ts
- [ ] Open `backend/services/api-gateway/src/controllers/safety.controller.ts`
- [ ] Line 25: Change `@Controller('api/safety')` to `@Controller('safety')`
- [ ] Save file

### Automated Method (Alternative)
- [ ] Run PowerShell script: `./fix-api-routes.ps1`
- OR
- [ ] Run Bash script: `./fix-api-routes.sh`

## Step 2: Verify New Controllers Exist

Check these files exist in `backend/services/api-gateway/src/controllers/`:
- [ ] `profiles.controller.ts` (created)
- [ ] `admin.controller.ts` (created)
- [ ] `advertising.controller.ts` (created)
- [ ] `ai.controller.ts` (created)

If any are missing, they should have been created. Check the directory.

## Step 3: Update controllers.module.ts

- [ ] Open `backend/services/api-gateway/src/controllers/controllers.module.ts`
- [ ] Add these imports at the top:
  ```typescript
  import { ProfilesController } from './profiles.controller';
  import { AdminController } from './admin.controller';
  import { AdvertisingController } from './advertising.controller';
  import { AIController } from './ai.controller';
  ```
- [ ] Add to controllers array in @Module:
  ```typescript
  ProfilesController,
  AdminController,
  AdvertisingController,
  AIController,
  ```
- [ ] Save file

## Step 4: Rebuild API Gateway

```bash
cd backend/services/api-gateway
npm run build
```

- [ ] Build completed without errors
- [ ] No TypeScript compilation errors
- [ ] All imports resolved correctly

## Step 5: Start API Gateway

```bash
npm run start:dev
```

- [ ] Service started successfully
- [ ] No runtime errors in console
- [ ] Check log for "Heartly API Gateway running on: http://localhost:4000"

## Step 6: Test Endpoints

### Test Fixed Route Paths
```bash
# Should return proper response (not 404)
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```
- [ ] Returns 401/400 (not 404)

```bash
curl http://localhost:4000/api/v1/auth/verify-email?token=test
```
- [ ] Returns 200/400 (not 404)

```bash
curl http://localhost:4000/api/v1/safety/verification/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns 200/401 (not 404)

### Test New Endpoints

```bash
# Profiles endpoint
curl http://localhost:4000/api/v1/profiles \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns 200/401 (not 404)

```bash
# Admin endpoint
curl http://localhost:4000/api/v1/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns 200/401/403 (not 404)

```bash
# Advertising endpoint
curl http://localhost:4000/api/v1/advertising/campaigns \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns 200/401 (not 404)

```bash
# AI endpoint
curl http://localhost:4000/api/v1/ai/suggestions \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns 200/401 (not 404)

## Step 7: Verify Existing Endpoints Still Work

```bash
# Test existing endpoints haven't broken
curl http://localhost:4000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns 200/401 (not 404)

```bash
curl http://localhost:4000/api/v1/messages \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns 200/401 (not 404)

```bash
curl http://localhost:4000/api/v1/matches \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns 200/401 (not 404)

## Step 8: Check API Documentation

```bash
# Open in browser
http://localhost:4000/api/docs
```

- [ ] Swagger UI loads successfully
- [ ] New controllers appear in documentation
- [ ] Profiles endpoints listed
- [ ] Admin endpoints listed
- [ ] Advertising endpoints listed
- [ ] AI endpoints listed

## Step 9: Verify Backend Service Integration

### Check if backend services are configured
- [ ] Check `proxy.service.ts` has service URL mappings:
  - `userService`
  - `authService`
  - `adminService`
  - `advertisingService`
  - `aiServices`
  - `messagingService`
  - `matchingService`
  - `paymentService`
  - `mediaService`
  - `analyticsService`
  - `moderationService`

### Test service communication
- [ ] Auth service responds to proxied requests
- [ ] User service responds to profile requests
- [ ] Admin service responds (if available)
- [ ] Advertising service responds (if available)
- [ ] AI service responds (if available)

## Step 10: Error Handling Verification

Test that errors are properly handled:

```bash
# Invalid token
curl http://localhost:4000/api/v1/profiles \
  -H "Authorization: Bearer invalid_token"
```
- [ ] Returns 401 Unauthorized (not 500)

```bash
# Missing auth header
curl http://localhost:4000/api/v1/profiles
```
- [ ] Returns 401 Unauthorized (not 500)

```bash
# Malformed request
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d 'invalid json'
```
- [ ] Returns 400 Bad Request (not 500)

## Troubleshooting

### If endpoints still return 404:
1. Check controller @Controller() decorator has NO 'api/' prefix
2. Verify controller is registered in controllers.module.ts
3. Rebuild: `npm run build`
4. Restart: `npm run start:dev`
5. Check logs for any errors

### If build fails:
1. Check for TypeScript errors
2. Verify all imports are correct
3. Ensure new controller files exist
4. Check for syntax errors in modified files

### If service won't start:
1. Check port 4000 is not already in use
2. Verify .env configuration
3. Check database connections
4. Review startup logs for errors

### If backend services don't respond:
1. Check if services are running
2. Verify service URLs in proxy configuration
3. Check network connectivity
4. Review service logs

## Completion Checklist

- [ ] All controller fixes applied
- [ ] New controllers registered
- [ ] Build successful
- [ ] Service starts without errors
- [ ] All previously missing endpoints now work (return non-404)
- [ ] Existing endpoints still work
- [ ] API documentation updated
- [ ] Error handling works correctly
- [ ] Backend services communicate properly

## Rollback Plan

If issues occur:
1. Restore from backup
2. Or revert changes:
   - Change `@Controller('auth')` back to `@Controller('api/auth')`
   - Change `@Get('verify-email')` back to `@Post('verify-email')`
   - Remove new controllers from module
3. Rebuild and restart

## Post-Implementation

- [ ] Update frontend to use new endpoints
- [ ] Monitor logs for any errors
- [ ] Update API documentation
- [ ] Add integration tests
- [ ] Inform team of changes
- [ ] Update deployment scripts if needed

---

**Date:** 2025-12-15
**Status:** Ready for implementation
**Estimated Time:** 15-30 minutes
