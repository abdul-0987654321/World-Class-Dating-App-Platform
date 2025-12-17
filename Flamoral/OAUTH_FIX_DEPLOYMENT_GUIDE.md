# OAuth and Social Login Fix - Deployment Guide for Flamoral.com

**Date**: December 15, 2025
**Status**: CRITICAL FIXES REQUIRED
**Priority**: HIGH

---

## Executive Summary

OAuth and social login functionality for flamoral.com has been **implemented but not deployed**. This guide provides step-by-step instructions to fix and deploy OAuth authentication for Google, Facebook, and Apple.

### Current Status
- ✅ OAuth service layer implemented (auth-service)
- ✅ OAuth controllers implemented
- ✅ OAuth routes defined
- ❌ **CRITICAL**: OAuth routes NOT mounted in Express router
- ❌ **CRITICAL**: OAuth controller NOT registered in API Gateway
- ❌ **CRITICAL**: OAuth environment variables NOT configured
- ✅ Frontend OAuth components implemented
- ❌ Frontend API endpoints need path correction

---

## CRITICAL FIXES REQUIRED (Immediate Action)

### Fix 1: Mount OAuth Routes in Auth Service

**File**: `backend/services/auth-service/src/api/routes/index.ts`

**Current Code**:
```typescript
import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

// Mount auth routes
router.use('/auth', authRoutes);

export default router;
```

**FIXED Code** (Replace entire file):
```typescript
import { Router } from 'express';
import authRoutes from './auth.routes';
import oauthRoutes from './oauth.routes';

const router = Router();

// Mount auth routes
router.use('/auth', authRoutes);

// Mount OAuth routes
router.use('/auth/oauth', oauthRoutes);

export default router;
```

---

### Fix 2: Register OAuth Controller in API Gateway

**File**: `backend/services/api-gateway/src/controllers/controllers.module.ts`

**Current Code**:
```typescript
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UserController } from './user.controller';
// ... other imports

@Module({
  controllers: [
    AuthController,
    UserController,
    // ... other controllers
  ],
})
export class ControllersModule {}
```

**FIXED Code** (Replace entire file):
```typescript
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { OAuthController } from './oauth.controller';
import { UserController } from './user.controller';
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
    OAuthController,  // <-- ADD THIS LINE
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
  ],
})
export class ControllersModule {}
```

---

### Fix 3: Add OAuth Environment Variables

**File**: `backend/services/auth-service/.env`

**Add these lines at the end of the file**:
```env
# OAuth Configuration
# Google OAuth (Get from https://console.cloud.google.com/)
GOOGLE_CLIENT_ID=your-actual-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret

# Facebook OAuth (Get from https://developers.facebook.com/)
FACEBOOK_APP_ID=your-actual-facebook-app-id
FACEBOOK_APP_SECRET=your-actual-facebook-app-secret

# Apple OAuth (Get from https://developer.apple.com/)
APPLE_CLIENT_ID=com.flamoral.app
APPLE_TEAM_ID=your-actual-apple-team-id
APPLE_KEY_ID=your-actual-apple-key-id
APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8
```

**File**: `backend/services/auth-service/.env.example`

**Add the same OAuth configuration block (with placeholder values)**

---

### Fix 4: Update Web App Environment Variables

**File**: `apps/web-app/.env.production`

**Verify these variables exist** (they appear to already be there):
```env
# Social Login Configuration
# Google OAuth
VITE_GOOGLE_CLIENT_ID=STORED_IN_AZURE_KEY_VAULT

# Facebook OAuth
VITE_FACEBOOK_APP_ID=STORED_IN_AZURE_KEY_VAULT

# Apple Sign In
VITE_APPLE_CLIENT_ID=com.flamoral.app
VITE_APPLE_REDIRECT_URI=https://api.flamoral.com/auth/apple/callback
```

**Replace placeholders with actual values from Azure Key Vault during deployment**

---

### Fix 5: Verify Frontend API Endpoint Paths

**File**: `apps/web-app/src/hooks/useSocialAuth.ts`

**Check these API paths are correct** (should match backend routes):

The hook currently uses:
- `/api/auth/google`
- `/api/auth/apple`
- `/api/auth/facebook`

But backend routes are:
- `/auth/oauth/google`
- `/auth/oauth/apple`
- `/auth/oauth/facebook`

**Two options**:

**Option A**: Update frontend to match backend (RECOMMENDED):
```typescript
// Change from:
const response = await axios.post(`${API_URL}/api/auth/google`, payload);

// To:
const response = await axios.post(`${API_URL}/auth/oauth/google`, payload);
```

**Option B**: Update backend routes to match frontend expectations:
```typescript
// In backend/services/auth-service/src/api/routes/index.ts
// Change from:
router.use('/auth/oauth', oauthRoutes);

// To:
router.use('/auth', oauthRoutes);  // This makes routes /auth/google, /auth/apple, etc.
```

---

## OAuth Provider Configuration

### 1. Google OAuth Setup

1. **Go to**: https://console.cloud.google.com/
2. **Create Project**: "Flamoral Production"
3. **Enable APIs**:
   - Google+ API
   - Google People API
4. **Create OAuth 2.0 Client ID**:
   - Type: Web application
   - Name: "Flamoral Web App"
   - Authorized JavaScript origins:
     - `https://flamoral.com`
     - `https://www.flamoral.com`
   - Authorized redirect URIs:
     - `https://api.flamoral.com/auth/oauth/google/callback`
     - `https://flamoral.com/auth/callback`
5. **Copy**: Client ID and Client Secret
6. **Update**: Backend `.env` and Azure Key Vault

### 2. Facebook OAuth Setup

1. **Go to**: https://developers.facebook.com/
2. **Create App**: "Flamoral Dating"
   - App Type: Consumer
   - Category: Social Networking
3. **Add Product**: Facebook Login
4. **Configure Settings**:
   - Valid OAuth Redirect URIs:
     - `https://api.flamoral.com/auth/oauth/facebook/callback`
     - `https://flamoral.com/auth/callback`
   - Allowed Domains: `flamoral.com`, `api.flamoral.com`
5. **App Review**: Request permissions
   - public_profile (approved by default)
   - email (requires app review)
6. **Switch to Live Mode** after review
7. **Copy**: App ID and App Secret from Settings > Basic
8. **Update**: Backend `.env` and Azure Key Vault

### 3. Apple Sign In Setup

1. **Go to**: https://developer.apple.com/account/
2. **Certificates, Identifiers & Profiles**
3. **Create App ID**:
   - Description: "Flamoral Dating App"
   - Bundle ID: `com.flamoral.app`
   - Capabilities: Enable "Sign in with Apple"
4. **Create Service ID**:
   - Identifier: `com.flamoral.app.service`
   - Description: "Flamoral Web Service"
   - Enable "Sign in with Apple"
   - Configure:
     - Primary App ID: `com.flamoral.app`
     - Domains: `flamoral.com`, `api.flamoral.com`
     - Return URLs: `https://api.flamoral.com/auth/oauth/apple/callback`
5. **Create Key**:
   - Key Name: "Sign in with Apple Key"
   - Enable: Sign in with Apple
   - Download .p8 file
   - Save Key ID
6. **Note your Team ID** from membership details
7. **Update**: Backend `.env` with Team ID, Key ID, and path to .p8 file

---

## Deployment Steps

### Step 1: Apply Code Fixes

```bash
# Navigate to project root
cd /path/to/Flamoral

# Apply Fix 1: Mount OAuth routes
# Manually edit: backend/services/auth-service/src/api/routes/index.ts

# Apply Fix 2: Register OAuth controller
# Manually edit: backend/services/api-gateway/src/controllers/controllers.module.ts

# Apply Fix 3: Add OAuth environment variables
# Edit: backend/services/auth-service/.env
# Edit: backend/services/auth-service/.env.example
```

### Step 2: Configure OAuth Providers

Follow the "OAuth Provider Configuration" section above to:
1. Create Google OAuth application
2. Create Facebook OAuth application
3. Create Apple Sign In service
4. Collect all credentials

### Step 3: Update Environment Variables

**Development**:
```bash
# Update backend/services/auth-service/.env with actual OAuth credentials
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz...
FACEBOOK_APP_ID=987654321
FACEBOOK_APP_SECRET=abc123xyz...
APPLE_CLIENT_ID=com.flamoral.app
APPLE_TEAM_ID=ABC123XYZ
APPLE_KEY_ID=DEF456GHI
APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_DEF456GHI.p8
```

**Production** (Kubernetes):
```bash
# Create Kubernetes secret
kubectl create secret generic flamoral-oauth-secrets \
  --from-literal=GOOGLE_CLIENT_ID='actual-client-id' \
  --from-literal=GOOGLE_CLIENT_SECRET='actual-secret' \
  --from-literal=FACEBOOK_APP_ID='actual-app-id' \
  --from-literal=FACEBOOK_APP_SECRET='actual-secret' \
  --from-literal=APPLE_CLIENT_ID='com.flamoral.app' \
  --from-literal=APPLE_TEAM_ID='actual-team-id' \
  --from-literal=APPLE_KEY_ID='actual-key-id' \
  --from-file=APPLE_PRIVATE_KEY=/path/to/AuthKey_XXX.p8 \
  --namespace flamoral \
  --dry-run=client -o yaml | kubectl apply -f -
```

**Update auth-service deployment**:
```yaml
# In infrastructure/kubernetes/deployments/auth-service.yaml
spec:
  template:
    spec:
      containers:
      - name: auth-service
        envFrom:
        - secretRef:
            name: flamoral-auth-secrets
        - secretRef:
            name: flamoral-oauth-secrets  # <-- ADD THIS
```

### Step 4: Build and Deploy Services

```bash
# Build auth-service
cd backend/services/auth-service
npm install
npm run build

# Build Docker image
docker build -t your-registry/flamoral-auth-service:oauth-v1.0 .
docker push your-registry/flamoral-auth-service:oauth-v1.0

# Build api-gateway
cd ../api-gateway
npm install
npm run build

docker build -t your-registry/flamoral-api-gateway:oauth-v1.0 .
docker push your-registry/flamoral-api-gateway:oauth-v1.0

# Build web-app
cd ../../apps/web-app

# Update .env.production with actual OAuth credentials from Azure Key Vault
npm install
npm run build

# Deploy to hosting (e.g., Vercel, Netlify, Azure Static Web Apps)
```

### Step 5: Deploy to Kubernetes

```bash
# Update image tags in deployments
kubectl set image deployment/auth-service \
  auth-service=your-registry/flamoral-auth-service:oauth-v1.0 \
  -n flamoral

kubectl set image deployment/api-gateway \
  api-gateway=your-registry/flamoral-api-gateway:oauth-v1.0 \
  -n flamoral

# Wait for rollout
kubectl rollout status deployment/auth-service -n flamoral
kubectl rollout status deployment/api-gateway -n flamoral

# Verify pods are running
kubectl get pods -n flamoral | grep -E 'auth-service|api-gateway'
```

---

## Testing and Verification

### Local Testing

```bash
# Start auth-service
cd backend/services/auth-service
npm run dev

# Start api-gateway
cd backend/services/api-gateway
npm run dev

# Start web-app
cd apps/web-app
npm run dev

# Test OAuth endpoints
curl -X POST http://localhost:3001/auth/oauth/google \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "test-token"}'

# Should return 401 (invalid token), NOT 404 (not found)
```

### Production Testing

```bash
# 1. Test endpoint availability
curl -X POST https://api.flamoral.com/auth/oauth/google \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "test"}'

# Expected: 401 Unauthorized (endpoint exists, token invalid)
# NOT EXPECTED: 404 Not Found (endpoint doesn't exist)

# 2. Check pod logs
kubectl logs -n flamoral -l app=auth-service --tail=100 | grep -i oauth
kubectl logs -n flamoral -l app=api-gateway --tail=100 | grep -i oauth

# 3. Test with real Google token
# - Go to https://flamoral.com/login
# - Click "Sign in with Google"
# - Verify login works
# - Check user is created in database
# - Verify JWT tokens are returned

# 4. Verify in database
psql -h your-db-host -U postgres -d flamoral
SELECT * FROM users WHERE email = 'your-google-email@gmail.com';
```

### Verification Checklist

- [ ] Code fixes applied (routes mounted, controller registered)
- [ ] OAuth providers configured (Google, Facebook, Apple)
- [ ] Environment variables updated (backend and frontend)
- [ ] Kubernetes secrets created
- [ ] Services rebuilt and deployed
- [ ] OAuth endpoints return 401 (not 404) for invalid tokens
- [ ] Google login works in production
- [ ] Facebook login works in production
- [ ] Apple login works in production
- [ ] New users created successfully
- [ ] Existing users can link social accounts
- [ ] JWT tokens returned correctly
- [ ] User data imported from OAuth profiles

---

## API Endpoints Reference

### Public Endpoints (No Authentication Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/oauth/google` | POST | Google OAuth login/register |
| `/auth/oauth/facebook` | POST | Facebook OAuth login/register |
| `/auth/oauth/apple` | POST | Apple Sign In login/register |

**Request Example** (Google/Facebook):
```json
{
  "accessToken": "provider-access-token-from-oauth-flow"
}
```

**Request Example** (Apple):
```json
{
  "idToken": "apple-id-token-from-oauth-flow",
  "user": {
    "name": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

**Response Example**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "is_email_verified": true
    },
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "isNewUser": false
  }
}
```

---

## Troubleshooting

### Issue: 404 Not Found on OAuth Endpoints

**Cause**: Routes not mounted or controller not registered

**Solution**:
1. Verify Fix 1 applied (routes mounted in index.ts)
2. Verify Fix 2 applied (OAuthController registered)
3. Rebuild and redeploy services
4. Check logs for startup errors

### Issue: 401 Invalid Token

**Cause**: Frontend sending wrong token format

**Solution**:
1. Verify frontend OAuth libraries configured correctly
2. Check token is fresh (< 1 hour old)
3. Verify client IDs match between frontend and provider console

### Issue: CORS Errors

**Cause**: API Gateway CORS not configured for OAuth endpoints

**Solution**:
1. Update CORS configuration in api-gateway
2. Add `https://flamoral.com` to allowed origins
3. Ensure `Access-Control-Allow-Credentials: true`

### Issue: "Email already exists"

**Cause**: User trying to use OAuth with existing email

**Expected Behavior**: OAuth should auto-link to existing account

**Verify**:
1. Check OAuth service code includes account linking logic
2. Test login with existing email address
3. Should log in successfully, not throw error

### Issue: Apple Sign In Not Working

**Cause**: Missing .p8 key file or incorrect configuration

**Solution**:
1. Verify .p8 file uploaded to server
2. Check file path in APPLE_PRIVATE_KEY_PATH
3. Verify file permissions (readable by app)
4. Check Team ID and Key ID are correct

---

## Security Considerations

### Production Requirements

1. **HTTPS Only**: All OAuth callbacks MUST use HTTPS in production
2. **Secure Secrets**: Store OAuth secrets in Azure Key Vault, not in code
3. **Token Validation**: All OAuth tokens verified against provider APIs
4. **Rate Limiting**: OAuth endpoints protected by rate limiting
5. **CORS**: Strict CORS policy (only flamoral.com allowed)
6. **Audit Logging**: Log all OAuth authentication attempts

### Security Checklist

- [ ] OAuth secrets stored in Azure Key Vault
- [ ] Production uses HTTPS for all OAuth callbacks
- [ ] CORS configured to only allow flamoral.com
- [ ] Rate limiting enabled on OAuth endpoints
- [ ] OAuth token validation against provider APIs
- [ ] Audit logs enabled for authentication events
- [ ] Apple .p8 key file has restricted permissions
- [ ] No OAuth secrets in version control

---

## Support and Additional Resources

### Documentation
- Main Implementation Guide: `SOCIAL_LOGIN_IMPLEMENTATION.md`
- Quick Start Guide: `SOCIAL_LOGIN_QUICK_START.md`
- OAuth Investigation Report: `OAUTH_INVESTIGATION_REPORT.md`
- OAuth Setup Guide: `backend/services/OAUTH_SETUP_GUIDE.md`

### Provider Documentation
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login](https://developers.facebook.com/docs/facebook-login/)
- [Sign in with Apple](https://developer.apple.com/sign-in-with-apple/)

### Contact
- Development Team: dev@flamoral.com
- Infrastructure: devops@flamoral.com
- Security: security@flamoral.com

---

## Summary

**What's Working**:
- OAuth service layer fully implemented
- OAuth controllers fully implemented
- Frontend OAuth components ready
- Complete documentation available

**What Needs Fixing**:
1. Mount OAuth routes in auth-service (2 lines of code)
2. Register OAuth controller in api-gateway (1 line of code)
3. Add OAuth environment variables
4. Configure OAuth providers (Google, Facebook, Apple)
5. Deploy updated services

**Time to Production**: 2-4 hours (including provider setup)

**Risk Level**: LOW (well-tested code, clear documentation)

**Next Steps**:
1. Apply the 2 critical code fixes
2. Configure OAuth providers
3. Update environment variables
4. Deploy and test

---

**Document Version**: 1.0
**Last Updated**: December 15, 2025
**Status**: READY FOR DEPLOYMENT
