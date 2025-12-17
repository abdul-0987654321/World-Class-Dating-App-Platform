# CDN and API URL Configuration Summary

## Executive Summary

This document summarizes the CDN and API URL configuration for the Flamoral dating platform frontend applications (web and mobile). All configuration files have been reviewed and documented with scripts provided to apply the necessary updates.

## Current Status

### ✅ Already Configured Correctly

1. **Web App Production** (`apps/web-app/.env.production`)
   - API URL: `https://api.flamoral.com/api/v1` ✓
   - Socket URL: `https://api.flamoral.com` ✓
   - CDN URL: `https://cdn.flamoral.com` ✓
   - Media CDN URL: `https://media.flamoral.com` ✓

2. **Source Code**
   - `apps/web-app/src/services/socket.service.ts` - Uses `import.meta.env.VITE_SOCKET_URL` ✓
   - `apps/web-app/vite.config.ts` - Uses `env.VITE_API_URL` ✓
   - `apps/mobile-app/src/services/api/config.ts` - Uses `process.env.*` ✓
   - No hardcoded URLs found ✓

### ⚠️ Needs Update

1. **Web App Development** (`apps/web-app/.env.development`)
   - **Missing:** CDN URL variables
   - **Action:** Add `VITE_CDN_URL` and `VITE_MEDIA_CDN_URL`

2. **Web App Staging** (`apps/web-app/.env.staging`)
   - **Issue:** Incorrect CDN URL format
   - **Current:** `https://staging-cdn.flamoral.com` and `https://staging-media.flamoral.com`
   - **Required:** `https://cdn-staging.flamoral.com` and `https://media-staging.flamoral.com`
   - **Action:** Update to match the standard naming convention

3. **Web App Example** (`apps/web-app/.env.example`)
   - **Missing:** CDN URL variables
   - **Missing:** Many feature flag and configuration variable examples
   - **Action:** Add comprehensive documentation of all variables

4. **Mobile App Example** (`apps/mobile-app/.env.example`)
   - **Missing:** CDN URL variables
   - **Action:** Add `CDN_URL` and `MEDIA_CDN_URL`

## Configuration Requirements

### Web App (.env files with VITE_ prefix)

| Environment | CDN URL | Media CDN URL |
|------------|---------|---------------|
| Development | `http://localhost:8080` | `http://localhost:8080` |
| Staging | `https://cdn-staging.flamoral.com` | `https://media-staging.flamoral.com` |
| Production | `https://cdn.flamoral.com` | `https://media.flamoral.com` |

### Mobile App (.env files without prefix)

| Environment | CDN URL | Media CDN URL |
|------------|---------|---------------|
| Development | `http://localhost:8080` | `http://localhost:8080` |
| Staging | `https://cdn-staging.flamoral.com` | `https://media-staging.flamoral.com` |
| Production | `https://cdn.flamoral.com` | `https://media.flamoral.com` |

## Complete Environment Variable List

### Required for All Environments

#### Core API & Backend
- `VITE_API_URL` - Main API Gateway endpoint
- `VITE_SOCKET_URL` - Socket.IO WebSocket endpoint
- `VITE_WS_URL` - Alternative WebSocket URL
- `VITE_GRAPHQL_URL` - GraphQL endpoint

#### CDN Configuration
- `VITE_CDN_URL` - Static assets CDN
- `VITE_MEDIA_CDN_URL` - User-uploaded media CDN

#### App Configuration
- `VITE_APP_NAME` - Application name
- `VITE_APP_VERSION` - Version number
- `VITE_APP_ENV` - Environment (development/staging/production)
- `VITE_APP_DOMAIN` - Application domain

#### External Services
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe payment key
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API
- `VITE_AGORA_APP_ID` - Video calling
- `VITE_TENOR_API_KEY` - GIF search

#### Firebase Configuration
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_VAPID_KEY`

#### Analytics & Monitoring
- `VITE_GA_MEASUREMENT_ID` - Google Analytics
- `VITE_SENTRY_DSN` - Error tracking
- `VITE_SENTRY_ENVIRONMENT`
- `VITE_SENTRY_TRACES_SAMPLE_RATE`
- `VITE_MIXPANEL_TOKEN` - Product analytics
- `VITE_LOGROCKET_APP_ID` - Session replay

#### Social Login
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_FACEBOOK_APP_ID`
- `VITE_APPLE_CLIENT_ID`
- `VITE_APPLE_REDIRECT_URI`

#### Feature Flags
- `VITE_ENABLE_VIDEO_CALLS`
- `VITE_ENABLE_VOICE_CALLS`
- `VITE_ENABLE_EVENTS`
- `VITE_ENABLE_AI_FEATURES`
- `VITE_ENABLE_STORIES`
- `VITE_ENABLE_TRAVEL_MODE`
- `VITE_ENABLE_PREMIUM_SUBSCRIPTIONS`
- `VITE_ENABLE_BOOSTS`
- `VITE_ENABLE_SUPER_LIKES`
- `VITE_ENABLE_VIRTUAL_GIFTS`
- `VITE_ENABLE_PHOTO_VERIFICATION`
- `VITE_ENABLE_ID_VERIFICATION`
- `VITE_ENABLE_BACKGROUND_CHECKS`
- `VITE_ENABLE_GAMIFICATION`
- `VITE_ENABLE_AI_COACH`
- `VITE_ENABLE_BLOCKCHAIN_VERIFICATION`

#### Debug & Development
- `VITE_ENABLE_MOCK_API`
- `VITE_ENABLE_DEBUG`
- `VITE_ENABLE_REDUX_DEVTOOLS`
- `VITE_LOG_LEVEL`

#### Performance
- `VITE_API_TIMEOUT`
- `VITE_UPLOAD_TIMEOUT`
- `VITE_IMAGE_QUALITY`
- `VITE_IMAGE_MAX_SIZE`
- `VITE_ENABLE_LAZY_LOADING`

#### Security
- `VITE_CSP_ENABLED`
- `VITE_CSRF_ENABLED`
- `VITE_RATE_LIMIT_ENABLED`

#### Localization
- `VITE_DEFAULT_LANGUAGE`
- `VITE_SUPPORTED_LANGUAGES`

#### Legal & Support
- `VITE_TERMS_URL`
- `VITE_PRIVACY_URL`
- `VITE_COOKIE_POLICY_URL`
- `VITE_COMMUNITY_GUIDELINES_URL`
- `VITE_SUPPORT_EMAIL`
- `VITE_CONTACT_URL`

## Automated Update Scripts

### PowerShell (Windows)

```powershell
# Update all CDN configurations
.\update-cdn-urls.ps1

# Verify configuration
.\verify-cdn-config.ps1
```

### Bash (Linux/Mac)

```bash
# Make script executable
chmod +x update-cdn-urls.sh

# Update all CDN configurations
./update-cdn-urls.sh

# Verify configuration (if verification script is created)
./verify-cdn-config.sh
```

## Manual Update Instructions

If you prefer to update manually:

### 1. Update `apps/web-app/.env.development`

Add these lines after the App Configuration section:

```bash
# CDN Configuration
# For local development, CDN URLs point to local server
VITE_CDN_URL=http://localhost:8080
VITE_MEDIA_CDN_URL=http://localhost:8080
```

### 2. Update `apps/web-app/.env.staging`

Find and replace:

```bash
# Before:
VITE_CDN_URL=https://staging-cdn.flamoral.com
VITE_MEDIA_CDN_URL=https://staging-media.flamoral.com

# After:
VITE_CDN_URL=https://cdn-staging.flamoral.com
VITE_MEDIA_CDN_URL=https://media-staging.flamoral.com
```

### 3. Update `apps/web-app/.env.example`

Add comprehensive documentation including CDN URLs and all feature flags (see complete list above).

### 4. Update `apps/mobile-app/.env.example`

Add these lines:

```bash
# CDN Configuration
CDN_URL=http://localhost:8080
MEDIA_CDN_URL=http://localhost:8080
```

## Infrastructure Setup Required

### Azure CDN Endpoints

Create the following CDN endpoints in Azure:

1. **Production**
   - `cdn.flamoral.com` → Azure Storage (static assets)
   - `media.flamoral.com` → Azure Storage (user media)

2. **Staging**
   - `cdn-staging.flamoral.com` → Azure Storage (staging static)
   - `media-staging.flamoral.com` → Azure Storage (staging media)

### DNS Configuration

Add CNAME records:

```
cdn.flamoral.com → [azure-cdn-endpoint].azureedge.net
media.flamoral.com → [azure-cdn-endpoint].azureedge.net
cdn-staging.flamoral.com → [azure-cdn-endpoint].azureedge.net
media-staging.flamoral.com → [azure-cdn-endpoint].azureedge.net
```

### CDN Configuration

- Enable HTTPS with managed certificates
- Configure caching rules (static assets: 1 year, media: 30 days)
- Set up cache purge webhooks
- Configure origin headers and CORS
- Enable compression (gzip/brotli)

## Testing Checklist

After applying changes:

- [ ] Development environment loads correctly (`npm run dev`)
- [ ] Static assets load from CDN in staging
- [ ] Media uploads work in staging
- [ ] Static assets load from CDN in production
- [ ] Media uploads work in production
- [ ] WebSocket connections work in all environments
- [ ] No console errors related to CORS or URL mismatches
- [ ] Mobile app connects to correct endpoints
- [ ] Image optimization works correctly

## Deployment Pipeline Updates

Ensure CI/CD pipelines inject correct environment variables:

### GitHub Actions / Azure DevOps

```yaml
env:
  VITE_CDN_URL: ${{ secrets.CDN_URL }}
  VITE_MEDIA_CDN_URL: ${{ secrets.MEDIA_CDN_URL }}
  # ... other environment variables
```

### Build Commands

```bash
# Development
npm run build -- --mode development

# Staging
npm run build -- --mode staging

# Production
npm run build -- --mode production
```

## Security Considerations

1. **Never commit actual API keys** - Use Azure Key Vault or GitHub Secrets
2. **Rotate keys regularly** - Especially for external services
3. **Use different keys per environment** - Development/Staging/Production
4. **Monitor CDN usage** - Set up alerts for unusual traffic
5. **Enable CDN security features** - DDoS protection, WAF rules

## Maintenance

### Regular Tasks

1. **Weekly:** Review CDN cache hit rates
2. **Monthly:** Audit environment variables for unused/deprecated values
3. **Quarterly:** Rotate external service API keys
4. **Per release:** Purge CDN cache for updated assets

### Cache Purge

```bash
# Azure CLI
az cdn endpoint purge \
  --resource-group flamoral-prod \
  --name cdn-flamoral \
  --profile-name flamoral-cdn \
  --content-paths '/*'
```

## Support & Documentation

- **Detailed Guide:** [CDN_ENV_CONFIGURATION_GUIDE.md](./CDN_ENV_CONFIGURATION_GUIDE.md)
- **Azure CDN Docs:** https://docs.microsoft.com/azure/cdn/
- **Vite Env Docs:** https://vitejs.dev/guide/env-and-mode.html

## Questions & Issues

If you encounter issues:

1. Check the verification script output
2. Review browser console for CORS errors
3. Verify DNS propagation (`nslookup cdn.flamoral.com`)
4. Test CDN endpoints directly in browser
5. Check Azure Portal for CDN metrics and logs

---

**Last Updated:** 2025-12-16
**Version:** 1.0
**Reviewed By:** Claude (AI Assistant)
