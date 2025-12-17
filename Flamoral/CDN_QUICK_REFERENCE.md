# CDN Configuration Quick Reference

## Quick Update Commands

### Windows (PowerShell)
```powershell
cd C:\Users\citad\OneDrive\Documents\Dating\Flamoral
.\update-cdn-urls.ps1
```

### Linux/Mac (Bash)
```bash
cd ~/path/to/Flamoral
chmod +x update-cdn-urls.sh
./update-cdn-urls.sh
```

## CDN URLs at a Glance

### Development
```
Web:    VITE_CDN_URL=http://localhost:8080
        VITE_MEDIA_CDN_URL=http://localhost:8080

Mobile: CDN_URL=http://localhost:8080
        MEDIA_CDN_URL=http://localhost:8080
```

### Staging
```
Web:    VITE_CDN_URL=https://cdn-staging.flamoral.com
        VITE_MEDIA_CDN_URL=https://media-staging.flamoral.com

Mobile: CDN_URL=https://cdn-staging.flamoral.com
        MEDIA_CDN_URL=https://media-staging.flamoral.com
```

### Production
```
Web:    VITE_CDN_URL=https://cdn.flamoral.com
        VITE_MEDIA_CDN_URL=https://media.flamoral.com

Mobile: CDN_URL=https://cdn.flamoral.com
        MEDIA_CDN_URL=https://media.flamoral.com
```

## API URLs at a Glance

### Development
```
VITE_API_URL=http://localhost:4000/api/v1
VITE_SOCKET_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
VITE_GRAPHQL_URL=http://localhost:4000/graphql
```

### Staging
```
VITE_API_URL=https://staging-api.flamoral.com/api/v1
VITE_SOCKET_URL=https://staging-api.flamoral.com
VITE_WS_URL=wss://staging-api.flamoral.com
VITE_GRAPHQL_URL=https://staging-api.flamoral.com/graphql
```

### Production
```
VITE_API_URL=https://api.flamoral.com/api/v1
VITE_SOCKET_URL=https://api.flamoral.com
VITE_WS_URL=wss://api.flamoral.com
VITE_GRAPHQL_URL=https://api.flamoral.com/graphql
```

## Files to Update

### ✅ Already Correct
- `apps/web-app/.env.production`

### ⚠️ Needs Update
- `apps/web-app/.env.development` - Add CDN URLs
- `apps/web-app/.env.staging` - Fix CDN URL format
- `apps/web-app/.env.example` - Add CDN URLs + all variables
- `apps/mobile-app/.env.example` - Add CDN URLs

## Manual Updates

### Add CDN to Development
Add to `apps/web-app/.env.development`:
```bash
VITE_CDN_URL=http://localhost:8080
VITE_MEDIA_CDN_URL=http://localhost:8080
```

### Fix Staging CDN Format
In `apps/web-app/.env.staging`, change:
```bash
# FROM:
VITE_CDN_URL=https://staging-cdn.flamoral.com
VITE_MEDIA_CDN_URL=https://staging-media.flamoral.com

# TO:
VITE_CDN_URL=https://cdn-staging.flamoral.com
VITE_MEDIA_CDN_URL=https://media-staging.flamoral.com
```

## Verification

Run the verification script:
```powershell
.\verify-cdn-config.ps1
```

Check for:
- ✓ All env files have CDN URLs
- ✓ Correct URL format (cdn-staging, not staging-cdn)
- ✓ No hardcoded URLs in source code
- ✓ All API URLs are correct

## Common Issues

### Issue: 404 on static assets
**Fix:** Verify CDN URL is correct and CDN endpoint exists

### Issue: CORS errors
**Fix:** Configure CORS headers on Azure CDN origin

### Issue: Stale cached assets
**Fix:** Purge CDN cache:
```bash
az cdn endpoint purge \
  --resource-group flamoral-prod \
  --name cdn-flamoral \
  --profile-name flamoral-cdn \
  --content-paths '/*'
```

### Issue: WebSocket connection fails
**Fix:** Ensure VITE_SOCKET_URL points to API Gateway, not CDN

## Testing

### Test Development
```bash
npm run dev
# Open http://localhost:5173
# Check console for CDN URLs
```

### Test Staging
```bash
npm run build -- --mode staging
npm run preview
# Verify assets load from cdn-staging.flamoral.com
```

### Test Production
```bash
npm run build -- --mode production
# Deploy and verify assets load from cdn.flamoral.com
```

## Key Points to Remember

1. **Development** uses `localhost:8080` for CDN
2. **Staging** uses `cdn-staging` and `media-staging` (NOT `staging-cdn`)
3. **Production** uses `cdn` and `media` (simple format)
4. **Web app** uses `VITE_` prefix
5. **Mobile app** uses NO prefix
6. **Never commit** real API keys - use placeholders
7. **Source code** already uses env variables correctly

## Next Steps After Update

1. ✓ Run update script
2. ✓ Run verification script
3. ✓ Test in development
4. □ Configure Azure CDN endpoints
5. □ Update DNS CNAME records
6. □ Test in staging
7. □ Deploy to production

## Support Documents

- **Full Guide:** `CDN_ENV_CONFIGURATION_GUIDE.md`
- **Summary:** `CDN_CONFIGURATION_SUMMARY.md`
- **Update Script:** `update-cdn-urls.ps1` or `update-cdn-urls.sh`
- **Verify Script:** `verify-cdn-config.ps1`

---
*Quick Reference v1.0 | Last Updated: 2025-12-16*
