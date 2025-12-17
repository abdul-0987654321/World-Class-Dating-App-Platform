# Installation Guide - CORS & Browser Compatibility Fixes

This guide walks you through installing and deploying the CORS and browser compatibility fixes.

## Prerequisites

- Node.js 18+ installed
- Python 3.10+ installed (for AI services)
- npm or yarn package manager
- Access to deploy to production servers

---

## Step 1: Install Frontend Dependencies

Navigate to the web app directory and install the new dependencies:

```bash
cd C:\Users\citad\OneDrive\Documents\Dating\Flamoral\apps\web-app

# Install new dependencies (@vitejs/plugin-legacy and terser)
npm install

# Or if you prefer yarn
yarn install
```

**New packages installed:**
- `@vitejs/plugin-legacy@^5.2.0` - Adds legacy browser support with automatic polyfills
- `terser@^5.26.0` - Required for minifying legacy chunks

---

## Step 2: Test the Build

Ensure the build works with the new legacy plugin:

```bash
# Run a production build
npm run build

# Check the dist folder - you should see:
# - Modern chunks in assets/js/
# - Legacy chunks with -legacy suffix
# - Polyfill files
```

**Expected output:**
```
✓ built in 12.45s
✓ 123 modules transformed.
dist/index.html                     2.34 kB
dist/assets/index-legacy-abc123.js  234.56 kB
dist/assets/index-abc123.js         189.23 kB
dist/assets/polyfills-legacy-xyz789.js  89.12 kB
```

---

## Step 3: Test Development Server

Verify CORS works in development:

```bash
# Start the dev server
npm run dev

# In another terminal, test CORS
curl -X OPTIONS http://localhost:5173/api/v1/health \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

---

## Step 4: Update Backend Services

No package installation needed for backend services (Python), but you need to restart them to pick up the new CORS configuration.

### For Docker-based deployment:

```bash
cd C:\Users\citad\OneDrive\Documents\Dating\Flamoral

# Rebuild and restart all services
docker-compose down
docker-compose build
docker-compose up -d

# Or restart individual services
docker-compose restart dating-coach-service
docker-compose restart recommendation-service
docker-compose restart nlp-service
docker-compose restart photo-analysis
docker-compose restart fraud-detection
```

### For direct Python deployment:

```bash
# Restart each service
cd backend/services/ai-services/dating-coach-service
# Kill existing process and restart
python -m app.main

# Repeat for each service
```

---

## Step 5: Deploy Frontend

### Option A: Azure Static Web Apps

```bash
cd apps/web-app

# Build for production
npm run build

# Deploy using Azure CLI
az staticwebapp deploy \
  --name flamoral-web \
  --resource-group flamoral-rg \
  --source ./dist
```

### Option B: Vercel

```bash
cd apps/web-app

# Deploy to Vercel
vercel --prod
```

### Option C: Manual deployment

```bash
# Build the app
npm run build

# Copy dist folder to your web server
# Ensure nginx.conf is updated on the server
scp -r dist/* user@server:/var/www/flamoral/
scp nginx.conf user@server:/etc/nginx/sites-available/flamoral
ssh user@server "sudo nginx -t && sudo systemctl reload nginx"
```

---

## Step 6: Verify Deployment

### Test CORS on Production

```bash
# Test from browser console or curl
curl -X OPTIONS https://api.flamoral.com/api/v1/health \
  -H "Origin: https://flamoral.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  -v

# Check for these headers in response:
# Access-Control-Allow-Origin: https://flamoral.com
# Access-Control-Allow-Credentials: true
# Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
```

### Test Browser Compatibility

1. Open https://flamoral.com in:
   - Chrome 88+
   - Safari 14+
   - Firefox 78+
   - Edge 88+
   - iOS Safari 14+
   - Android Chrome (Android 10+)

2. Check browser console for:
   - No CORS errors
   - No polyfill errors
   - No "fetch is not defined" errors
   - No "Promise is not defined" errors

### Test Cross-Domain Requests

From browser console on https://flamoral.com:

```javascript
// Test authenticated request
fetch('https://api.flamoral.com/api/v1/users/profile', {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }
})
.then(res => res.json())
.then(data => console.log('Success:', data))
.catch(err => console.error('Error:', err));
```

Expected result: No CORS errors, request completes successfully.

---

## Step 7: Monitor

After deployment, monitor for issues:

### Check Sentry

```bash
# Look for CORS-related errors in Sentry dashboard
# Search for: "CORS" OR "cross-origin" OR "Access-Control"
```

### Check Server Logs

```bash
# API Gateway logs
docker logs api-gateway --tail=100 -f

# Python service logs
docker logs dating-coach-service --tail=100 -f
docker logs recommendation-service --tail=100 -f
docker logs nlp-service --tail=100 -f
docker logs photo-analysis --tail=100 -f
docker logs fraud-detection --tail=100 -f
```

### Check nginx Access Logs

```bash
# On the web server
tail -f /var/log/nginx/access.log | grep OPTIONS
```

---

## Step 8: Environment Variables (Optional)

If you need to customize CORS origins for specific environments:

### API Gateway (.env)

```bash
# Add to backend/services/api-gateway/.env
CORS_ORIGINS=https://flamoral.com,https://www.flamoral.com,https://app.flamoral.com
```

### Python Services (.env)

```bash
# Add to each Python service's .env file
CORS_ORIGINS=https://flamoral.com,https://www.flamoral.com,https://app.flamoral.com,https://admin.flamoral.com
```

---

## Rollback Plan

If issues occur after deployment:

### Frontend Rollback

```bash
# Revert git changes
cd apps/web-app
git checkout HEAD~1 vite.config.ts package.json nginx.conf staticwebapp.config.json

# Rebuild and redeploy
npm install
npm run build
# Deploy dist folder
```

### Backend Rollback

```bash
# Revert Python service configs
cd backend/services/ai-services
git checkout HEAD~1 */app/config.py */main.py

# Restart services
docker-compose restart
```

---

## Troubleshooting

### Issue: Build fails with "Cannot find module '@vitejs/plugin-legacy'"

**Solution:**
```bash
cd apps/web-app
rm -rf node_modules package-lock.json
npm install
```

### Issue: CORS still failing after deployment

**Solution:**
1. Clear browser cache
2. Check nginx configuration was deployed: `sudo nginx -t`
3. Verify environment variables are set
4. Check origin is in allowed list
5. Verify credentials are enabled

### Issue: Legacy browsers still have errors

**Solution:**
1. Clear browser cache
2. Check if legacy chunks are being loaded (Network tab)
3. Verify polyfills are included in build
4. Test in incognito mode

### Issue: Python services return 500 errors

**Solution:**
```bash
# Check service logs for syntax errors
docker logs dating-coach-service --tail=100

# Verify CORS_ORIGINS format is correct (comma-separated string)
# Example: "https://flamoral.com,https://app.flamoral.com"
```

---

## Success Criteria

✅ All checks pass:

- [ ] Frontend builds without errors
- [ ] Legacy plugin generates polyfill chunks
- [ ] Dev server runs without errors
- [ ] Production build succeeds
- [ ] CORS preflight requests return 204
- [ ] CORS headers present in API responses
- [ ] No CORS errors in browser console
- [ ] Site works in Chrome 88+
- [ ] Site works in Safari 14+
- [ ] Site works in Firefox 78+
- [ ] Site works on iOS 14+
- [ ] Site works on Android 10+
- [ ] Authenticated requests work cross-domain
- [ ] WebSocket connections work cross-domain
- [ ] No errors in Sentry
- [ ] All backend services running

---

## Support

If you encounter issues:

1. Check the comprehensive guide: `CORS_BROWSER_COMPATIBILITY_FIXES.md`
2. Review error logs in Sentry
3. Test with curl commands from the main guide
4. Verify all environment variables are set
5. Check that nginx configuration is deployed correctly

---

**Last Updated:** 2025-12-15
**Status:** Ready for Deployment
