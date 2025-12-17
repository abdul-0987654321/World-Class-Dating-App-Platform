# CDN and API URL Configuration Guide for Flamoral

## Overview
This document provides the complete configuration for all frontend environment files with proper CDN and API URLs.

## Configuration Summary

### 1. Web App Development (.env.development)
**Location:** `apps/web-app/.env.development`

**Required CDN Variables:**
```bash
VITE_CDN_URL=http://localhost:8080
VITE_MEDIA_CDN_URL=http://localhost:8080
```

**API Configuration:**
```bash
VITE_API_URL=http://localhost:4000/api/v1
VITE_SOCKET_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
VITE_GRAPHQL_URL=http://localhost:4000/graphql
```

**Status:**
- CDN URLs need to be added
- API URLs are correctly configured
- WebSocket URLs are correctly configured

---

### 2. Web App Staging (.env.staging)
**Location:** `apps/web-app/.env.staging`

**Required CDN Variables:**
```bash
VITE_CDN_URL=https://cdn-staging.flamoral.com
VITE_MEDIA_CDN_URL=https://media-staging.flamoral.com
```

**API Configuration:**
```bash
VITE_API_URL=https://staging-api.flamoral.com/api/v1
VITE_SOCKET_URL=https://staging-api.flamoral.com
VITE_WS_URL=wss://staging-api.flamoral.com
VITE_GRAPHQL_URL=https://staging-api.flamoral.com/graphql
```

**Current Issues:**
- CDN URLs are currently set to `https://staging-cdn.flamoral.com` and `https://staging-media.flamoral.com`
- Need to update to `https://cdn-staging.flamoral.com` and `https://media-staging.flamoral.com`

**Action Required:**
```bash
# Change FROM:
VITE_CDN_URL=https://staging-cdn.flamoral.com
VITE_MEDIA_CDN_URL=https://staging-media.flamoral.com

# Change TO:
VITE_CDN_URL=https://cdn-staging.flamoral.com
VITE_MEDIA_CDN_URL=https://media-staging.flamoral.com
```

---

### 3. Web App Production (.env.production)
**Location:** `apps/web-app/.env.production`

**Required CDN Variables:**
```bash
VITE_CDN_URL=https://cdn.flamoral.com
VITE_MEDIA_CDN_URL=https://media.flamoral.com
```

**API Configuration:**
```bash
VITE_API_URL=https://api.flamoral.com/api/v1
VITE_SOCKET_URL=https://api.flamoral.com
VITE_WS_URL=wss://api.flamoral.com
VITE_GRAPHQL_URL=https://api.flamoral.com/graphql
```

**Status:**
- CDN URLs are correctly configured
- API URLs are correctly configured
- WebSocket URLs are correctly configured

---

### 4. Web App Example (.env.example)
**Location:** `apps/web-app/.env.example`

**Required Variables (All documented):**
```bash
# API Configuration
VITE_API_URL=http://localhost:4000/api/v1
VITE_SOCKET_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000/ws
VITE_GRAPHQL_URL=http://localhost:4000/graphql

# CDN Configuration
VITE_CDN_URL=http://localhost:8080
VITE_MEDIA_CDN_URL=http://localhost:8080

# App Configuration
VITE_APP_NAME=Flamoral
VITE_APP_VERSION=1.0.0

# External Services
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_AGORA_APP_ID=your_agora_app_id
VITE_TENOR_API_KEY=your_tenor_key

# Firebase
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key

# Analytics
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_SENTRY_DSN=your_sentry_dsn
VITE_SENTRY_ENVIRONMENT=development
VITE_SENTRY_TRACES_SAMPLE_RATE=1.0
VITE_MIXPANEL_TOKEN=your_mixpanel_token
VITE_LOGROCKET_APP_ID=your_logrocket_id

# Social Login
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_FACEBOOK_APP_ID=your_facebook_app_id
VITE_APPLE_CLIENT_ID=com.flamoral.app
VITE_APPLE_REDIRECT_URI=http://localhost:4000/auth/apple/callback

# Feature Flags
VITE_ENABLE_VIDEO_CALLS=true
VITE_ENABLE_VOICE_CALLS=true
VITE_ENABLE_EVENTS=true
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_STORIES=true
VITE_ENABLE_TRAVEL_MODE=true
VITE_ENABLE_PREMIUM_SUBSCRIPTIONS=true
VITE_ENABLE_BOOSTS=true
VITE_ENABLE_SUPER_LIKES=true
VITE_ENABLE_VIRTUAL_GIFTS=true
VITE_ENABLE_PHOTO_VERIFICATION=true
VITE_ENABLE_ID_VERIFICATION=true
VITE_ENABLE_BACKGROUND_CHECKS=true
VITE_ENABLE_GAMIFICATION=true
VITE_ENABLE_AI_COACH=true
VITE_ENABLE_BLOCKCHAIN_VERIFICATION=false

# Debug Options
VITE_ENABLE_MOCK_API=false
VITE_ENABLE_DEBUG=true
VITE_ENABLE_REDUX_DEVTOOLS=true
VITE_LOG_LEVEL=debug

# Performance
VITE_API_TIMEOUT=30000
VITE_UPLOAD_TIMEOUT=120000
VITE_IMAGE_QUALITY=80
VITE_IMAGE_MAX_SIZE=5242880
VITE_ENABLE_LAZY_LOADING=true

# Security
VITE_CSP_ENABLED=true
VITE_CSRF_ENABLED=true
VITE_RATE_LIMIT_ENABLED=true

# Localization
VITE_DEFAULT_LANGUAGE=en
VITE_SUPPORTED_LANGUAGES=en,es,fr,de,it,pt,ja,ko,zh

# Legal & Support
VITE_TERMS_URL=https://flamoral.com/terms
VITE_PRIVACY_URL=https://flamoral.com/privacy
VITE_COOKIE_POLICY_URL=https://flamoral.com/cookies
VITE_COMMUNITY_GUIDELINES_URL=https://flamoral.com/guidelines
VITE_SUPPORT_EMAIL=support@flamoral.com
VITE_CONTACT_URL=https://flamoral.com/contact
```

**Current Issues:**
- Missing CDN URL variables
- Missing many feature flag and configuration variables

---

### 5. Mobile App Example (.env.example)
**Location:** `apps/mobile-app/.env.example`

**Required CDN Variables:**
```bash
CDN_URL=http://localhost:8080
MEDIA_CDN_URL=http://localhost:8080
```

**Note:** For staging:
```bash
CDN_URL=https://cdn-staging.flamoral.com
MEDIA_CDN_URL=https://media-staging.flamoral.com
```

**Note:** For production:
```bash
CDN_URL=https://cdn.flamoral.com
MEDIA_CDN_URL=https://media.flamoral.com
```

**Current Status:**
- CDN URLs are missing from the example file
- Need to add them with proper documentation

---

## Implementation Steps

### Step 1: Update Web App .env.development
Add the following lines after the App Configuration section:

```bash
# CDN Configuration
# For local development, CDN URLs point to local server
VITE_CDN_URL=http://localhost:8080
VITE_MEDIA_CDN_URL=http://localhost:8080
```

### Step 2: Update Web App .env.staging
Change the CDN URL format from `staging-cdn` to `cdn-staging`:

```bash
# Find and replace:
VITE_CDN_URL=https://staging-cdn.flamoral.com
VITE_MEDIA_CDN_URL=https://staging-media.flamoral.com

# With:
VITE_CDN_URL=https://cdn-staging.flamoral.com
VITE_MEDIA_CDN_URL=https://media-staging.flamoral.com
```

### Step 3: Verify Web App .env.production
Confirm it has the correct production CDN URLs (already correct):
```bash
VITE_CDN_URL=https://cdn.flamoral.com
VITE_MEDIA_CDN_URL=https://media.flamoral.com
```

### Step 4: Update Web App .env.example
Add comprehensive documentation of all environment variables including CDN URLs.

### Step 5: Update Mobile App .env.example
Add CDN URL variables with documentation for all environments.

---

## Hardcoded URL Verification

### Files Checked:
1. `apps/web-app/src/services/socket.service.ts` - ✅ Uses environment variables correctly
2. `apps/web-app/vite.config.ts` - ✅ Uses environment variables correctly
3. `apps/mobile-app/src/services/api/config.ts` - ✅ Uses environment variables correctly

### No hardcoded URLs found

All services properly use:
- `import.meta.env.VITE_*` for web app
- `process.env.*` for mobile app

---

## DNS/Infrastructure Notes

### Expected CDN Domain Patterns:

**Development:**
- Web: `http://localhost:8080`
- Mobile: `http://localhost:8080`

**Staging:**
- Web: `https://cdn-staging.flamoral.com` and `https://media-staging.flamoral.com`
- Mobile: `https://cdn-staging.flamoral.com` and `https://media-staging.flamoral.com`

**Production:**
- Web: `https://cdn.flamoral.com` and `https://media.flamoral.com`
- Mobile: `https://cdn.flamoral.com` and `https://media.flamoral.com`

### Azure CDN Configuration Required:
1. Create Azure CDN Profile for Flamoral
2. Create CDN endpoints:
   - `cdn.flamoral.com` → Azure Storage (static assets)
   - `media.flamoral.com` → Azure Storage (user media)
   - `cdn-staging.flamoral.com` → Azure Storage (staging static)
   - `media-staging.flamoral.com` → Azure Storage (staging media)
3. Configure DNS CNAME records
4. Enable HTTPS with managed certificates
5. Configure caching rules and purge policies

---

## Quick Fix Commands

### For Web App Development:
```bash
# Add to apps/web-app/.env.development
echo "" >> apps/web-app/.env.development
echo "# CDN Configuration" >> apps/web-app/.env.development
echo "# For local development, CDN URLs point to local server" >> apps/web-app/.env.development
echo "VITE_CDN_URL=http://localhost:8080" >> apps/web-app/.env.development
echo "VITE_MEDIA_CDN_URL=http://localhost:8080" >> apps/web-app/.env.development
```

### For Web App Staging:
```bash
# Use sed or manual edit to update:
# staging-cdn.flamoral.com → cdn-staging.flamoral.com
# staging-media.flamoral.com → media-staging.flamoral.com
```

### For Mobile App Example:
```bash
# Add to apps/mobile-app/.env.example
echo "" >> apps/mobile-app/.env.example
echo "# CDN Configuration" >> apps/mobile-app/.env.example
echo "CDN_URL=http://localhost:8080" >> apps/mobile-app/.env.example
echo "MEDIA_CDN_URL=http://localhost:8080" >> apps/mobile-app/.env.example
```

---

## Verification Checklist

- [ ] Web app .env.development has CDN URLs
- [ ] Web app .env.staging uses correct CDN URL format (cdn-staging/media-staging)
- [ ] Web app .env.production has correct production CDN URLs
- [ ] Web app .env.example documents all variables including CDN URLs
- [ ] Mobile app .env.example has CDN URL variables
- [ ] No hardcoded URLs in source code
- [ ] All services use environment variables correctly
- [ ] API URLs are correct for all environments
- [ ] WebSocket URLs are correct for all environments

---

## Next Steps

1. Apply the changes documented in this guide
2. Test each environment to ensure URLs resolve correctly
3. Configure Azure CDN and DNS as needed
4. Update deployment pipelines to inject proper environment variables
5. Document CDN purging and cache invalidation procedures

---

Generated: 2025-12-16
