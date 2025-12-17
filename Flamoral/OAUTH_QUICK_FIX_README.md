# OAuth Quick Fix for Flamoral.com - README

## TL;DR - Fix OAuth in 5 Minutes

OAuth is **implemented but not deployed**. Run this to fix it:

### Windows
```cmd
cd C:\Users\citad\OneDrive\Documents\Dating\Flamoral
fix-oauth-now.bat
```

### Linux/Mac
```bash
cd /path/to/Flamoral
chmod +x fix-oauth-now.sh
./fix-oauth-now.sh
```

Then:
1. Configure OAuth providers (see below)
2. Update credentials in `backend/services/auth-service/.env`
3. Rebuild and deploy services

---

## What's Broken

1. **OAuth routes not mounted** (2 lines of code missing)
2. **OAuth controller not registered** (1 line of code missing)
3. **OAuth credentials not configured** (need to setup providers)

---

## The Fixes

### Fix 1: Mount OAuth Routes

**File**: `backend/services/auth-service/src/api/routes/index.ts`

**Add these 2 lines**:
```typescript
import oauthRoutes from './oauth.routes';  // Line 3
router.use('/auth/oauth', oauthRoutes);    // After line 7
```

### Fix 2: Register OAuth Controller

**File**: `backend/services/api-gateway/src/controllers/controllers.module.ts`

**Add these 2 lines**:
```typescript
import { OAuthController } from './oauth.controller';  // Line 3
OAuthController,  // In controllers array
```

### Fix 3: Add OAuth Credentials

**File**: `backend/services/auth-service/.env`

**Add at the end**:
```env
# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
APPLE_CLIENT_ID=com.flamoral.app
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8
```

---

## OAuth Provider Setup (30 minutes)

### Google OAuth
1. Go to https://console.cloud.google.com/
2. Create OAuth 2.0 Client ID (Web application)
3. Add redirect URI: `https://api.flamoral.com/auth/oauth/google/callback`
4. Copy Client ID and Client Secret

### Facebook OAuth
1. Go to https://developers.facebook.com/
2. Create app, add Facebook Login
3. Add redirect URI: `https://api.flamoral.com/auth/oauth/facebook/callback`
4. Copy App ID and App Secret

### Apple Sign In
1. Go to https://developer.apple.com/account/
2. Create Service ID `com.flamoral.app`
3. Configure return URL: `https://api.flamoral.com/auth/oauth/apple/callback`
4. Create Key, download .p8 file
5. Note Team ID and Key ID

---

## Deployment (30 minutes)

```bash
# Build auth-service
cd backend/services/auth-service
npm install && npm run build
docker build -t your-registry/flamoral-auth-service:oauth-v1 .
docker push your-registry/flamoral-auth-service:oauth-v1

# Build api-gateway
cd ../api-gateway
npm install && npm run build
docker build -t your-registry/flamoral-api-gateway:oauth-v1 .
docker push your-registry/flamoral-api-gateway:oauth-v1

# Deploy to Kubernetes
kubectl set image deployment/auth-service auth-service=your-registry/flamoral-auth-service:oauth-v1 -n flamoral
kubectl set image deployment/api-gateway api-gateway=your-registry/flamoral-api-gateway:oauth-v1 -n flamoral

# Create OAuth secrets
kubectl create secret generic flamoral-oauth-secrets \
  --from-literal=GOOGLE_CLIENT_ID='...' \
  --from-literal=GOOGLE_CLIENT_SECRET='...' \
  --from-literal=FACEBOOK_APP_ID='...' \
  --from-literal=FACEBOOK_APP_SECRET='...' \
  --from-literal=APPLE_CLIENT_ID='...' \
  --from-literal=APPLE_TEAM_ID='...' \
  --from-literal=APPLE_KEY_ID='...' \
  --from-file=APPLE_PRIVATE_KEY=/path/to/key.p8 \
  --namespace flamoral
```

---

## Testing

### Test Locally
```bash
# Should return 401 (not 404)
curl -X POST http://localhost:3001/auth/oauth/google \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "test"}'
```

### Test Production
```bash
# Should return 401 (not 404)
curl -X POST https://api.flamoral.com/auth/oauth/google \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "test"}'
```

### Test with Real OAuth
1. Go to https://flamoral.com/login
2. Click "Sign in with Google"
3. Verify login works

---

## Verification Checklist

- [ ] Fix script executed successfully
- [ ] OAuth credentials configured in .env
- [ ] Google OAuth provider setup complete
- [ ] Facebook OAuth provider setup complete
- [ ] Apple Sign In provider setup complete
- [ ] Services rebuilt and deployed
- [ ] Kubernetes secrets created
- [ ] OAuth endpoints return 401 (not 404)
- [ ] Google login works in production
- [ ] Facebook login works in production
- [ ] Apple login works in production

---

## Need Help?

### Documentation
- **Detailed Guide**: `OAUTH_FIX_DEPLOYMENT_GUIDE.md`
- **Status Report**: `OAUTH_STATUS_AND_FIXES.md`
- **Investigation**: `OAUTH_INVESTIGATION_REPORT.md`

### Scripts
- **Windows**: `fix-oauth-now.bat`
- **Linux/Mac**: `fix-oauth-now.sh`

### Support
- Development Team: dev@flamoral.com
- Infrastructure: devops@flamoral.com

---

## Quick Commands

```bash
# Apply fixes
./fix-oauth-now.sh  # or fix-oauth-now.bat on Windows

# Configure providers (see sections above)
# Update .env with credentials

# Build and deploy
cd backend/services/auth-service && npm run build
cd ../api-gateway && npm run build

# Test
curl -X POST http://localhost:3001/auth/oauth/google -H "Content-Type: application/json" -d '{"accessToken": "test"}'
```

---

**Status**: ✅ Ready to fix
**Time**: 2-4 hours total
**Risk**: LOW
**Priority**: HIGH

**Last Updated**: December 15, 2025
