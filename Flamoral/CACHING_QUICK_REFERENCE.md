# Caching Configuration - Quick Reference Guide

**Last Updated:** December 15, 2025

---

## Quick Start

### Run Verification
```bash
chmod +x scripts/verify-cache-config.sh
./scripts/verify-cache-config.sh
```

### Deploy All Changes
```bash
# Backend services
cd backend && npm run build
kubectl rollout restart deployment/auth-service
kubectl rollout restart deployment/matching-service
kubectl rollout restart deployment/api-gateway

# Frontend
cd apps/web-app && npm run build && npm run deploy

# Nginx
sudo cp infrastructure/nginx/cache-headers.conf /etc/nginx/conf.d/
sudo nginx -t && sudo nginx -s reload
```

---

## Cache Duration Reference

### Content Type | Cache Duration | Strategy
| Content Type | Duration | Strategy | Notes |
|--------------|----------|----------|-------|
| Static JS/CSS (versioned) | 1 year | immutable | Hash in filename |
| Images | 30 days | stale-while-revalidate | Background refresh |
| Videos | 30 days | cache-first | Range requests enabled |
| HTML Pages | 1 hour | network-first | Revalidation required |
| Service Worker | no cache | network-only | Always fresh |
| Public API Data | 5 minutes | stale-while-revalidate | Background refresh |
| User-specific API | 1 minute | private cache | Must revalidate |
| Sensitive Endpoints | no cache | no-store | Auth, payment, etc. |
| Manifest/JSON | 1 hour | must-revalidate | Config files |

---

## Redis Configuration

### Database Separation
- **DB 0**: Pub/Sub
- **DB 1**: Application Cache
- **DB 2**: User Sessions
- **DB 3**: Rate Limiting

### Key Operations
```typescript
// Use SCAN instead of KEYS
const keys: string[] = [];
let cursor = '0';
do {
  const [newCursor, foundKeys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
  cursor = newCursor;
  keys.push(...foundKeys);
} while (cursor !== '0');
```

### Connection Configuration
```typescript
// Always enable TLS in production
tls: process.env.NODE_ENV === 'production',
connectTimeout: 10000,
keepAlive: 30000,
```

---

## Service Worker Strategies

### Cache Strategy Selection
```javascript
// Static assets (.js, .css, fonts) → cache-first
// Images (.jpg, .png, etc.) → stale-while-revalidate
// API calls (/api/*) → network-first
// HTML pages → network-first
```

### Cache Limits
```javascript
const MAX_CACHE_SIZE = {
  RUNTIME: 100,  // General runtime cache
  IMAGES: 50,    // Image cache
};

const CACHE_MAX_AGE = {
  STATIC: 30 * 24 * 60 * 60 * 1000, // 30 days
  IMAGES: 7 * 24 * 60 * 60 * 1000,  // 7 days
  API: 5 * 60 * 1000,                // 5 minutes
  HTML: 1 * 60 * 60 * 1000,          // 1 hour
};
```

---

## Nginx Cache Headers

### Static Assets
```nginx
location ~* ^/assets/.+\.(js|css|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

### Images
```nginx
location ~* \.(jpg|jpeg|png|gif|webp)$ {
    expires 30d;
    add_header Cache-Control "public, max-age=2592000, stale-while-revalidate=86400";
}
```

### API Endpoints
```nginx
# Public data
location ~ ^/api/v1/(interests|passions|config)/ {
    expires 5m;
    add_header Cache-Control "public, max-age=300, stale-while-revalidate=60";
}

# User-specific
location ~ ^/api/v1/(users|profiles|matches)/ {
    expires 1m;
    add_header Cache-Control "private, max-age=60, must-revalidate";
}

# Sensitive
location ~ ^/(auth|payment)/ {
    add_header Cache-Control "no-store, no-cache, must-revalidate, private";
}
```

---

## CDN Configuration

### Cache Hit Ratio Targets
- Static assets: **95%**
- Media files: **95%**
- HTML pages: **70%**
- API responses: **40%**
- **Overall: 80%**

### Key Features Enabled
- ✅ Origin shielding (70-90% origin request reduction)
- ✅ Request coalescing (20-40% reduction during spikes)
- ✅ Brotli + Gzip compression
- ✅ Stale-while-revalidate
- ✅ Query string normalization

### Expected Cost Savings
- Front Door: **40-60% reduction**
- Origin bandwidth: **85-90% reduction**
- Origin compute: **30-40% reduction**
- **Monthly savings: ~$800**

---

## API Gateway Cache Middleware

### Cache Control by Endpoint Type
```typescript
// Static assets
'public, max-age=31536000, immutable'

// Public data endpoints
'public, max-age=300, must-revalidate'

// User-specific data
'private, max-age=60, must-revalidate'

// Sensitive endpoints
'no-cache, no-store, must-revalidate'
```

---

## Memory Cache Configuration

### Response Cache Service
```typescript
maxMemoryCacheSize: 100  // Max entries in memory

cacheTTL: {
  profile: 5 * 60 * 1000,      // 5 minutes
  matches: 10 * 60 * 1000,     // 10 minutes
  analytics: 15 * 60 * 1000,   // 15 minutes
  notifications: 2 * 60 * 1000, // 2 minutes
  default: 5 * 60 * 1000,      // 5 minutes
}
```

### Fallback Strategy
1. Try Redis
2. If Redis down → use memory cache
3. If both down → fetch from service
4. Store in both caches

---

## Common Issues & Solutions

### Issue: Redis Blocking on High Load
**Solution:** Use SCAN instead of KEYS
```typescript
// ❌ Bad - blocks Redis
const keys = await redis.keys(pattern);

// ✅ Good - non-blocking
let cursor = '0';
do {
  const [newCursor, foundKeys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
  // process keys...
} while (cursor !== '0');
```

### Issue: Service Worker Not Updating
**Solution:** Increment version number
```javascript
const CACHE_VERSION = 'v1.1.0'; // Bump version
```

### Issue: CDN Cache Hit Ratio Low
**Solution:** Check cache headers and query strings
```bash
# Verify Cache-Control headers
curl -I https://flamoral.com/assets/main.js

# Check query string normalization
# Remove tracking parameters: utm_*, fbclid, gclid, etc.
```

### Issue: Memory Cache Growing Too Large
**Solution:** Verify max size limits enforced
```typescript
if (this.memoryCache.size >= this.maxMemoryCacheSize) {
  const firstKey = this.memoryCache.keys().next().value;
  this.memoryCache.delete(firstKey);
}
```

---

## Monitoring Commands

### Redis
```bash
# Check connection
redis-cli -h localhost -p 6379 PING

# Monitor commands
redis-cli -h localhost -p 6379 MONITOR

# Check memory usage
redis-cli -h localhost -p 6379 INFO memory

# Check keyspace stats
redis-cli -h localhost -p 6379 INFO stats
```

### Nginx Cache
```bash
# Check cache status header
curl -I https://flamoral.com/assets/main.js | grep X-Cache-Status

# Monitor access log for cache hits
tail -f /var/log/nginx/access.log | grep "X-Cache-Status"
```

### Azure Front Door
```bash
# Check cache hit ratio
az monitor metrics list \
  --resource /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Network/frontDoors/flamoral-frontdoor \
  --metric CacheHitRatio \
  --interval PT1H

# Check origin requests
az monitor metrics list \
  --resource /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Network/frontDoors/flamoral-frontdoor \
  --metric OriginRequestCount \
  --interval PT1H
```

---

## Testing Checklist

### Pre-Deployment
- [ ] Run `verify-cache-config.sh`
- [ ] Test Redis connection with TLS
- [ ] Build and test service worker locally
- [ ] Verify nginx config with `nginx -t`

### Post-Deployment
- [ ] Check service worker version updated
- [ ] Verify Redis non-blocking operations
- [ ] Test cache headers on different endpoints
- [ ] Monitor CDN cache hit ratio (target: 80%+)
- [ ] Check memory cache size limits
- [ ] Verify stale-while-revalidate working

### Performance Testing
- [ ] Measure page load time (target: <2s)
- [ ] Test offline functionality
- [ ] Verify background cache updates
- [ ] Load test Redis (no blocking)
- [ ] Check origin request reduction (target: 85%+)

---

## Key Files Reference

### Redis Configuration
- `backend/shared/infrastructure/redis-config.ts`
- `backend/services/matching-service/src/infrastructure/cache/redis.client.ts`
- `backend/services/auth-service/src/infrastructure/cache/redis.ts`
- `backend/shared/services/cache-invalidation.service.ts`

### Service Worker
- `apps/web-app/public/service-worker.js`

### CDN Configuration
- `infrastructure/azure/frontdoor-caching-rules.yaml`

### Nginx
- `infrastructure/nginx/cache-headers.conf`

### API Gateway
- `backend/services/api-gateway/src/middleware/cache-control.middleware.ts`
- `backend/services/api-gateway/src/services/response-cache.service.ts`

### Utilities
- `apps/web-app/src/utils/cdn.ts`
- `backend/shared/utils/api-cache.ts`

### Verification
- `scripts/verify-cache-config.sh`

---

## Emergency Rollback

If critical issues occur:

1. **Service Worker**: Increment version to force update
2. **Backend**: `kubectl rollout undo deployment/{service-name}`
3. **Nginx**: `rm /etc/nginx/conf.d/cache-headers.conf && nginx -s reload`
4. **CDN**: Disable caching rules in Azure Portal

---

## Support

For issues or questions:
- Check logs: `kubectl logs -f deployment/{service-name}`
- Monitor metrics in Azure Portal
- Review this guide and main documentation
- Contact: DevOps team

---

**Remember:** Always test in staging before deploying to production!
