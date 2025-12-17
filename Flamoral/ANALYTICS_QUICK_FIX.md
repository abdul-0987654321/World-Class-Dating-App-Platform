# Analytics Service - Quick Fix Guide

## Problem
- Analytics endpoint returns 404: `GET /api/v1/api/analytics`
- Circuit breaker shows 1 failure for analytics service

## Root Cause
API Gateway analytics controller missing `api/` prefix in route decorator.

## Quick Fix (30 seconds)

### Option 1: PowerShell Script (Recommended)
```powershell
cd C:\Users\citad\OneDrive\Documents\Dating\Flamoral
.\deploy-analytics-fix.ps1
```

### Option 2: Manual Fix
```bash
# 1. Edit file
code backend/services/api-gateway/src/controllers/analytics.controller.ts

# 2. Find line 17:
@Controller('analytics')

# 3. Change to:
@Controller('api/analytics')

# 4. Rebuild
cd backend/services/api-gateway
npm run build
```

## Verify Fix

### Local
```bash
curl http://localhost:4000/api/v1/api/analytics/dashboard
```

### Production
```bash
curl https://api.flamoral.com/api/v1/api/analytics/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected: 200 OK (instead of 404)

## Files Created

1. **ANALYTICS_SERVICE_FIX_REPORT.md** - Complete analysis and fix documentation
2. **apps/web-app/src/utils/analytics.ts** - Frontend analytics tracking utility
3. **deploy-analytics-fix.ps1** - Automated deployment script (Windows)
4. **deploy-analytics-fix.sh** - Automated deployment script (Linux/Mac)
5. **fix-analytics-service.ps1** - Simple fix script

## Available Analytics Endpoints

After fix, these endpoints will work:

### User Analytics
- `GET /api/v1/api/analytics/dashboard`
- `GET /api/v1/api/analytics/profile/views`
- `GET /api/v1/api/analytics/matches/stats`
- `GET /api/v1/api/analytics/messages/stats`
- `GET /api/v1/api/analytics/likes/stats`

### Event Tracking
- `POST /api/v1/api/analytics/events`
- `POST /api/v1/api/analytics/pageviews`
- `POST /api/v1/api/analytics/actions`

### Engagement Metrics
- `GET /api/v1/api/analytics/engagement`
- `GET /api/v1/api/analytics/engagement/response-rate`
- `GET /api/v1/api/analytics/activity/timeline`

### Admin Analytics
- `GET /api/v1/api/analytics/platform/stats`
- `GET /api/v1/api/analytics/platform/demographics`
- `GET /api/v1/api/analytics/platform/revenue`
- `GET /api/v1/api/analytics/platform/retention`

## Frontend Integration

Add to your React components:

```typescript
import { analytics } from '@/utils/analytics';

// Initialize on app load
analytics.init();

// Track page view
analytics.trackPageView('/discover');

// Track user action
analytics.trackAction('profile_view', 'user', userId);

// Track match
analytics.trackMatch(matchedUserId, 'swipe_right');

// Track message
analytics.trackMessage(conversationId, 'sent');
```

## Environment Variables

Add to `.env.production`:
```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ANALYTICS_ENABLED=true
```

## Monitoring

Check circuit breaker:
```bash
# Should show 0 failures after fix
curl https://api.flamoral.com/api/v1/health
```

Check analytics service:
```bash
# Analytics service health check
curl http://localhost:3007/health
```

## Support

For detailed information, see:
- **ANALYTICS_SERVICE_FIX_REPORT.md** - Full technical documentation
- **apps/web-app/src/utils/analytics.ts** - Frontend integration code

---

**Status:** ✅ FIX READY TO DEPLOY
**Priority:** HIGH
**Impact:** Enables all analytics and reporting functionality
