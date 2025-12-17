# Quick Fix Guide - Backend Services Port Configuration

## Problem
All backend services failing on first request - circuit breaker detecting connectivity issues.

## Root Cause
API Gateway connecting to services on **wrong ports**.

## Quick Fix (30 seconds)

### Automated Fix
```bash
cd backend/services
chmod +x fix-port-configs.sh
./fix-port-configs.sh
```

Then restart all services.

### Manual Fix (5 minutes)

1. **API Gateway Configuration:**
   ```bash
   cd backend/services/api-gateway/src/config
   mv configuration.ts configuration.ts.backup
   mv configuration.ts.new configuration.ts
   ```

2. **Fix Individual Services:**
   - **Media Service** `src/config/index.ts` line 6: `'3004'` → `'3006'`
   - **Notification Service** `src/config/index.ts` line 6: `3008` → `3012`
   - **Advertising Service** `src/index.ts` line 35: `3010` → `3011`
   - **Payment Service** `src/index.ts` line 19: `3006` → `3005`

3. **Restart Services**

## Port Reference (Correct Mapping)

```
Auth:         3001    Analytics:    3007
User:         3002    Moderation:   3008
Messaging:    3004    Matching:     3009
Payment:      3005    Admin:        3010
Media:        3006    Advertising:  3011
              ----    Notification: 3012

API Gateway:  4000
AI Service:   8000
Realtime:     8081
```

## Verify Fix

```bash
# Check API Gateway
curl http://localhost:4000/health

# Check services directly
curl http://localhost:3006/health  # Media
curl http://localhost:3011/health  # Advertising
curl http://localhost:3012/health  # Notification
```

All should return: `{"status":"healthy",...}`

## More Info

- Full details: `CONNECTIVITY_FIX_SUMMARY.md`
- Technical breakdown: `PORT_CONFIGURATION_FIXES.md`
