# Quick Deployment Checklist - Browser Caching & Compatibility Fixes

## Pre-Deployment Verification

### 1. Build the Web App
```bash
cd apps/web-app
npm run build
```
**Expected:** Clean build with no errors, optimized chunks created

### 2. Verify nginx Configurations
```bash
# Check all nginx configs for correct HSTS
grep -r "max-age=63072000" apps/web-app/nginx.conf infrastructure/docker/nginx/default.conf infrastructure/kubernetes/ingress/ingress-nginx.yaml
```
**Expected:** 4+ matches with "max-age=63072000"

### 3. Build API Gateway
```bash
cd backend/services/api-gateway
npm run build
```
**Expected:** TypeScript compilation successful, new middleware included

---

## Post-Deployment Verification

### Quick Tests (Run after deployment)

```bash
# 1. Test HSTS Header (2 years)
curl -I https://flamoral.com | grep -i strict-transport-security
# Expected: max-age=63072000; includeSubDomains; preload

# 2. Test Static Asset Caching
curl -I https://flamoral.com/assets/index.js | grep -i cache-control
# Expected: Cache-Control: public, max-age=31536000, immutable

# 3. Test HTML Shell (No Cache)
curl -I https://flamoral.com/ | grep -i cache-control
# Expected: Cache-Control: no-cache, no-store, must-revalidate

# 4. Test API Public Endpoint
curl -I https://api.flamoral.com/api/v1/api/health | grep -i cache-control
# Expected: Cache-Control: public, max-age=300, must-revalidate

# 5. Test robots.txt caching
curl -I https://flamoral.com/robots.txt | grep -i cache-control
# Expected: Cache-Control: public, max-age=3600, must-revalidate
```

---

## Browser Testing

### Manual Browser Checks:

1. **Chrome DevTools:**
   - Open Network tab
   - Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
   - Check "Disable cache" is OFF
   - Reload page normally
   - Verify static assets show "(from disk cache)" or "(from memory cache)"

2. **Safari:**
   - Open Web Inspector → Network
   - Clear cache
   - Reload page twice
   - Second load should use cached assets

3. **Firefox:**
   - Open Developer Tools → Network
   - Verify cached resources show "cached" status

### Browser Compatibility Test:
- ✅ Chrome 88+ (desktop & mobile)
- ✅ Safari 14+ (macOS & iOS)
- ✅ Edge 88+
- ✅ Firefox 78 ESR+

---

## Performance Validation

### Lighthouse Audit (Chrome DevTools):
```
1. Open Chrome DevTools (F12)
2. Navigate to "Lighthouse" tab
3. Select "Performance" and "Best Practices"
4. Click "Generate Report"
```

**Expected Improvements:**
- ✅ Cache Policy score: 100/100
- ✅ Efficient Cache Policy: Pass
- ✅ Uses long cache lifetimes: Pass
- ✅ Browser compatibility: No warnings

### Bundle Analysis:
```bash
cd apps/web-app
npm run build

# Check chunk sizes
ls -lh dist/assets/
```

**Expected:**
- Separate vendor chunks (react-vendor, ui-vendor, state-vendor, utils-vendor)
- Main bundle < 500KB
- Vendor bundles cached separately

---

## Rollback Plan (If Issues Occur)

### Revert HSTS to 1 year:
```bash
# Replace max-age=63072000 with max-age=31536000
sed -i 's/max-age=63072000/max-age=31536000/g' apps/web-app/nginx.conf
sed -i 's/max-age=63072000/max-age=31536000/g' infrastructure/docker/nginx/default.conf
sed -i 's/max-age=63072000/max-age=31536000/g' infrastructure/kubernetes/ingress/ingress-nginx.yaml
```

### Disable Cache-Control Middleware:
```typescript
// In backend/services/api-gateway/src/main.ts
// Comment out lines 28-30:
// const cacheControlMiddleware = app.get(CacheControlMiddleware);
// app.use(cacheControlMiddleware.use.bind(cacheControlMiddleware));
```

---

## Monitoring Points

### 1. Server Load:
- Monitor API response times (should decrease with caching)
- Check request volume (should decrease for cached endpoints)

### 2. User Experience:
- Page load times (should improve for returning users)
- Time to Interactive (TTI) should decrease
- First Contentful Paint (FCP) unchanged

### 3. CDN/Cache Hit Rates:
- Monitor CDN cache hit ratio (if using CDN)
- Browser cache effectiveness (check analytics)

---

## Common Issues & Solutions

### Issue: Assets not caching
**Solution:** Clear CDN cache, verify nginx config is applied

### Issue: HSTS not working
**Solution:** Verify HTTPS is enabled, check certificate validity

### Issue: Browser shows old version
**Solution:** HTML shell cache is disabled, likely browser issue - hard refresh

### Issue: API responses too slow
**Solution:** Check cache middleware is loaded before security middleware

---

## Success Criteria

✅ HSTS header shows 63072000 seconds (2 years)
✅ Static assets cached for 1 year with immutable flag
✅ HTML shell never cached
✅ API public endpoints cached for 5 minutes
✅ Sensitive endpoints never cached
✅ Browser compatibility verified on all major browsers
✅ Lighthouse performance score improved
✅ No console errors related to polyfills or compatibility

---

## Next Steps After Successful Deployment

1. **Monitor for 24 hours:**
   - Check error rates
   - Monitor performance metrics
   - Review user feedback

2. **Optional: Submit to HSTS Preload:**
   - Visit: https://hstspreload.org/
   - Enter: flamoral.com
   - Submit for preload list inclusion

3. **Update Documentation:**
   - Mark deployment date
   - Note any issues encountered
   - Document performance improvements

---

## Contact Information

**If Issues Arise:**
- Revert changes using rollback plan
- Check logs: `kubectl logs -f deployment/api-gateway`
- Review nginx logs: `kubectl logs -f deployment/nginx`

**Emergency Rollback:**
```bash
# Full rollback to previous deployment
kubectl rollout undo deployment/api-gateway
kubectl rollout undo deployment/frontend
```
