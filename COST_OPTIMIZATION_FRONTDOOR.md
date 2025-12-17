# Azure Front Door Cost Optimization Guide
## Flamoral Dating Platform

**Last Updated:** December 13, 2025
**Environment:** Production
**Optimization Target:** 40-60% cost reduction in Azure Front Door expenses

---

## Executive Summary

This document outlines the comprehensive cost optimization strategy implemented for Azure Front Door and CDN services on the Flamoral platform. By implementing aggressive caching, enhanced compression, and origin shielding, we target a **40-60% reduction in Front Door costs** while maintaining or improving performance.

### Key Metrics

| Metric | Before Optimization | After Optimization | Improvement |
|--------|-------------------|-------------------|-------------|
| Static Assets Cache Hit Ratio | 60-70% | >95% | +35% |
| Media Cache Hit Ratio | 70-80% | >95% | +20% |
| HTML Cache Hit Ratio | 30-40% | >70% | +35% |
| API Cache Hit Ratio | 0% | >40% | +40% |
| Origin Bandwidth | Baseline | -85 to -90% | Massive savings |
| Monthly Front Door Cost | $2,000 | $1,100-1,200 | **40-45% reduction** |

---

## 1. Implementation Overview

### Files Modified

1. **Terraform Configuration**
   - `infrastructure/terraform/environments/prod/frontdoor-routes.tf`
   - Enhanced caching rules with extended TTLs
   - Expanded compression types
   - Additional query string filtering

2. **Caching Rules**
   - `infrastructure/azure/frontdoor-caching-rules.yaml`
   - Comprehensive caching policy document
   - Origin shielding configuration
   - Request coalescing settings

3. **Nginx Configuration**
   - `apps/web-app/nginx.conf.optimized`
   - `infrastructure/docker/nginx/nginx.conf.optimized`
   - Proper Cache-Control headers for all content types
   - ETag support for conditional requests
   - Enhanced compression settings

---

## 2. Caching Strategy

### 2.1 Static Assets (CSS, JS, Fonts)

**Cache Duration:** 7 days
**Cache Hit Ratio Target:** >95%
**Cost Impact:** Reduces origin requests by 90%+

```terraform
cache {
  query_string_caching_behavior = "IgnoreQueryString"
  compression_enabled           = true
}
```

**Nginx Headers:**
```nginx
location ~* \.(css|js)$ {
    expires 7d;
    add_header Cache-Control "public, max-age=604800, immutable" always;
    add_header Vary "Accept-Encoding" always;
}
```

**Benefits:**
- Static assets are cached for 7 days at Front Door edge
- Immutable content doesn't require revalidation
- 90%+ of static asset requests served from edge cache
- Reduces origin bandwidth by ~85%

---

### 2.2 Media Files (Images, Videos)

**Cache Duration:** 30 days
**Cache Hit Ratio Target:** >95%
**Cost Impact:** Reduces origin bandwidth by 95%+

```terraform
cache {
  query_string_caching_behavior = "IgnoreQueryString"
  compression_enabled           = false # Already compressed
}
```

**Nginx Headers:**
```nginx
location ~* \.(jpg|jpeg|png|gif|webp|avif|svg|mp4|webm|mov)$ {
    expires 30d;
    add_header Cache-Control "public, max-age=2592000, immutable" always;
}
```

**Benefits:**
- Longest cache duration for rarely-changing content
- No compression overhead (media is already compressed)
- 95%+ cache hit ratio
- Massive reduction in storage egress costs

**Patterns Matched:**
- `/media/*`, `/uploads/*`, `/images/*`, `/videos/*`
- `/thumbnails/*`, `/avatars/*`
- File extensions: `.jpg`, `.png`, `.webp`, `.avif`, `.mp4`, `.webm`

---

### 2.3 HTML Pages

**Cache Duration:** 1 hour with revalidation
**Cache Hit Ratio Target:** >70%
**Cost Impact:** Reduces origin hits by 60-70%

```terraform
cache {
  query_string_caching_behavior = "IgnoreSpecifiedQueryStrings"
  query_strings = [
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "fbclid", "gclid", "msclkid", "mc_cid", "mc_eid",
    "ref", "source", "_ga", "_gid", "_gl", "igshid"
  ]
}
```

**Nginx Headers:**
```nginx
location ~* \.html$ {
    expires 1h;
    add_header Cache-Control "public, max-age=3600, stale-while-revalidate=300, stale-if-error=3600" always;
    add_header Vary "Accept-Encoding" always;
}
```

**Benefits:**
- Short cache duration ensures content freshness
- `stale-while-revalidate` allows serving stale content while fetching fresh
- Query string filtering improves cache hit ratio by 15-25%
- Marketing parameters ignored for better cache performance

**Query Parameters Ignored:**
- UTM tracking parameters: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- Social media tracking: `fbclid` (Facebook), `gclid` (Google), `msclkid` (Microsoft)
- Analytics: `_ga`, `_gid`, `_gl` (Google Analytics)
- Email marketing: `mc_cid`, `mc_eid` (Mailchimp)
- Generic tracking: `ref`, `source`, `igshid` (Instagram)

---

### 2.4 API Responses

**Cache Duration:** 5 minutes (for cacheable endpoints)
**Cache Hit Ratio Target:** >40%
**Cost Impact:** Reduces database/compute load by 30-40%

```terraform
cache {
  query_string_caching_behavior = "UseQueryString"
  compression_enabled           = true
}
```

**Benefits:**
- Caches GET requests only (respects Cache-Control from origin)
- Query strings included in cache key for proper differentiation
- Reduces database queries for read-heavy endpoints
- Compression reduces payload size by 70-80% for JSON

**Cacheable Endpoints:**
- Public profile data
- Search results
- Static lists (categories, tags, etc.)
- Non-personalized recommendations

**Non-Cacheable:**
- User-specific data (authenticated endpoints)
- Real-time messaging
- Payment/transaction endpoints
- Any endpoint with `Cache-Control: no-cache` or `private`

---

## 3. Compression Optimization

### 3.1 Brotli vs Gzip

Azure Front Door supports both Brotli and Gzip compression. Brotli provides **15-25% better compression** than Gzip.

**Compression Comparison:**

| Content Type | Uncompressed | Gzip | Brotli | Brotli Savings |
|-------------|--------------|------|--------|----------------|
| HTML (100KB) | 100KB | 20KB (80%) | 15KB (85%) | 25% smaller |
| CSS (50KB) | 50KB | 10KB (80%) | 7.5KB (85%) | 25% smaller |
| JSON (75KB) | 75KB | 18KB (76%) | 14KB (81%) | 22% smaller |
| JS (200KB) | 200KB | 60KB (70%) | 50KB (75%) | 17% smaller |

**Content Types Compressed:**
- Text: `text/plain`, `text/html`, `text/css`, `text/xml`, `text/javascript`
- JavaScript: `application/javascript`, `application/x-javascript`
- JSON: `application/json`
- XML: `application/xml`, `application/rss+xml`, `application/atom+xml`
- Fonts (text-based): `application/x-font-ttf`, `font/ttf`, `font/otf`
- SVG: `image/svg+xml`

**Not Compressed (already compressed):**
- Images: JPEG, PNG, GIF, WebP, AVIF
- Videos: MP4, WebM, MOV
- Fonts: WOFF, WOFF2
- Archives: ZIP, GZIP

---

### 3.2 Compression Configuration

**Front Door (Automatic):**
- Brotli compression: Level 6 (automatic)
- Gzip compression: Level 6 (automatic)
- Client negotiation via `Accept-Encoding` header

**Nginx (Origin):**
```nginx
# Gzip
gzip on;
gzip_vary on;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript ...;

# Brotli (requires nginx-module-brotli)
# brotli on;
# brotli_comp_level 6;
# brotli_types text/plain text/css application/json application/javascript ...;

# ETag for conditional requests
etag on;
```

**Benefits:**
- Reduces bandwidth by 70-85% for compressible content
- Lower data transfer costs
- Faster page load times
- Better user experience

---

## 4. Advanced Optimization Features

### 4.1 Origin Shielding

**What it is:** A regional Point of Presence (POP) that sits between Front Door edge locations and your origin server.

**How it works:**
1. Edge POPs request content from shield POP instead of origin
2. Shield POP requests content from origin only if not cached
3. Multiple edge POPs share the shield cache

**Benefits:**
- **Reduces origin requests by 70-90%**
- Lower origin bandwidth costs
- Protects origin from traffic spikes
- Better cache efficiency

**Configuration:**
```yaml
originShield:
  enabled: true
  shieldingPopLocation: WestUS2 # Match origin location
```

**Cost Impact:**
- Adds small Front Door premium cost (~5%)
- Saves 70-90% on origin bandwidth
- Net savings: **60-85% on origin costs**

---

### 4.2 Request Coalescing

**What it is:** Combines multiple simultaneous requests for the same resource into a single origin request.

**How it works:**
1. First request arrives, sent to origin
2. Subsequent requests for same resource wait
3. All requests receive the same response

**Benefits:**
- Reduces origin load during traffic spikes
- **20-40% reduction in origin requests** during peak times
- Protects against cache stampedes
- Lower database/compute costs

**Scenarios:**
- Popular content being viewed by many users simultaneously
- Cache expiration during high traffic
- New content releases (e.g., feature launch)

---

### 4.3 Conditional Requests (ETag / Last-Modified)

**What it is:** HTTP mechanism for validating cached content freshness without transferring the full response.

**How it works:**
1. Origin sends `ETag` or `Last-Modified` header with response
2. Front Door caches response with headers
3. On revalidation, Front Door sends `If-None-Match` (ETag) or `If-Modified-Since`
4. Origin responds with:
   - `304 Not Modified` (no body) if unchanged
   - `200 OK` (with body) if changed

**Benefits:**
- **30-50% reduction in bandwidth** for revalidation requests
- Faster revalidation (smaller responses)
- Lower origin bandwidth costs
- Better user experience (faster updates)

**Nginx Configuration:**
```nginx
# Enable ETag generation
etag on;

# Add Last-Modified automatically (nginx does this by default)
```

**Example Flow:**
```http
# Initial Request
GET /index.html
Response: 200 OK
ETag: "abc123"
Content-Length: 50000

# Revalidation Request
GET /index.html
If-None-Match: "abc123"
Response: 304 Not Modified
Content-Length: 0  # 99% bandwidth savings!
```

---

## 5. Monitoring and Metrics

### 5.1 Key Performance Indicators (KPIs)

**Cache Hit Ratio:**
```
Cache Hit Ratio = (Cache Hits / Total Requests) × 100%

Targets:
- Static Assets: >95%
- Media Files: >95%
- HTML Pages: >70%
- API Responses: >40%
- Overall: >80%
```

**Origin Bandwidth Reduction:**
```
Bandwidth Reduction = ((Baseline - Current) / Baseline) × 100%

Target: >85% reduction
```

**Cost Savings:**
```
Monthly Savings = Baseline Cost - Optimized Cost

Target: $800-1,000/month (40-50% reduction)
```

---

### 5.2 Azure Monitor Queries

**Cache Hit Ratio by Route:**
```kusto
AzureFrontDoorAccessLog
| where TimeGenerated > ago(24h)
| summarize
    TotalRequests = count(),
    CacheHits = countif(CacheStatus == "HIT"),
    CacheMisses = countif(CacheStatus == "MISS")
    by RouteName
| extend CacheHitRatio = (CacheHits * 100.0) / TotalRequests
| project RouteName, TotalRequests, CacheHitRatio
| order by CacheHitRatio asc
```

**Origin Bandwidth Usage:**
```kusto
AzureFrontDoorAccessLog
| where TimeGenerated > ago(30d)
| where CacheStatus == "MISS" or CacheStatus == "PARTIAL_HIT"
| summarize
    OriginBandwidthGB = sum(ResponseBytes) / 1024 / 1024 / 1024
    by bin(TimeGenerated, 1d)
| render timechart
```

**Top Uncached Requests:**
```kusto
AzureFrontDoorAccessLog
| where TimeGenerated > ago(24h)
| where CacheStatus == "MISS"
| summarize Count = count() by RequestUri
| top 100 by Count desc
```

---

### 5.3 Alerting Thresholds

Configure Azure Monitor alerts for:

1. **Low Cache Hit Ratio** (Warning: <75%, Critical: <60%)
2. **High Origin Bandwidth** (Warning: >150% of baseline)
3. **High Cache Miss Rate** (Critical: >30%)
4. **Slow Origin Response** (Warning: >2s avg)

**Alert Configuration:**
```yaml
alerts:
  - name: low-cache-hit-ratio
    metric: CacheHitRatio
    threshold: 0.75
    severity: warning
    action: notify-ops-team

  - name: high-origin-bandwidth
    metric: OriginBandwidthGB
    threshold: baseline * 1.5
    severity: warning
    action: notify-ops-team
```

---

## 6. Cost Projections

### 6.1 Baseline Costs (Before Optimization)

**Monthly Costs:**
```
Azure Front Door Premium: $1,500
- Data transfer out: $1,000
- Requests: $300
- WAF processing: $200

Origin Bandwidth (Storage Egress): $500
Total: $2,000/month
```

---

### 6.2 Optimized Costs (After Implementation)

**Monthly Costs:**
```
Azure Front Door Premium: $900 (-40%)
- Data transfer out: $400 (-60%, due to higher cache hit ratio)
- Requests: $300 (same, but more from cache)
- WAF processing: $200 (same)

Origin Bandwidth (Storage Egress): $100 (-80%)
- 85% reduction in origin requests

Total: $1,000/month

Monthly Savings: $1,000 (50% reduction)
Annual Savings: $12,000
```

---

### 6.3 Traffic-Based Projection

**Assumptions:**
- 10M requests/month
- 500GB total data transfer
- 60% static assets, 25% media, 10% HTML, 5% API

**Before Optimization:**
```
Static (60%, 300GB):
- Cache hit: 70% → 210GB from edge, 90GB from origin
- Cost: Origin bandwidth (90GB) = $180

Media (25%, 125GB):
- Cache hit: 80% → 100GB from edge, 25GB from origin
- Cost: Origin bandwidth (25GB) = $50

HTML (10%, 50GB):
- Cache hit: 40% → 20GB from edge, 30GB from origin
- Cost: Origin bandwidth (30GB) = $60

API (5%, 25GB):
- Cache hit: 0% → 0GB from edge, 25GB from origin
- Cost: Origin bandwidth (25GB) = $50

Total Origin Bandwidth: 170GB = $340/month
```

**After Optimization:**
```
Static (60%, 300GB):
- Cache hit: 95% → 285GB from edge, 15GB from origin
- Cost: Origin bandwidth (15GB) = $30

Media (25%, 125GB):
- Cache hit: 95% → 119GB from edge, 6GB from origin
- Cost: Origin bandwidth (6GB) = $12

HTML (10%, 50GB):
- Cache hit: 70% → 35GB from edge, 15GB from origin
- Cost: Origin bandwidth (15GB) = $30

API (5%, 25GB):
- Cache hit: 40% → 10GB from edge, 15GB from origin
- Cost: Origin bandwidth (15GB) = $30

Total Origin Bandwidth: 51GB = $102/month

Savings: $238/month (70% reduction in origin bandwidth costs)
```

---

## 7. Implementation Checklist

### Phase 1: Infrastructure Updates (Week 1)

- [ ] Review and update `frontdoor-routes.tf`
- [ ] Apply Terraform changes to production Front Door
- [ ] Verify routes are configured correctly
- [ ] Test caching behavior for each route

### Phase 2: Nginx Configuration (Week 1)

- [ ] Backup existing nginx.conf files
- [ ] Deploy optimized nginx configuration:
  - [ ] `apps/web-app/nginx.conf.optimized` → `nginx.conf`
  - [ ] `infrastructure/docker/nginx/nginx.conf.optimized` → `nginx.conf`
- [ ] Restart nginx containers
- [ ] Verify Cache-Control headers are set correctly
- [ ] Test ETag functionality

### Phase 3: Monitoring Setup (Week 2)

- [ ] Configure Azure Monitor queries
- [ ] Set up cache hit ratio dashboards
- [ ] Configure alerting thresholds
- [ ] Establish baseline metrics
- [ ] Document monitoring procedures

### Phase 4: Validation & Optimization (Week 3-4)

- [ ] Monitor cache hit ratios for 2 weeks
- [ ] Identify low-performing routes
- [ ] Adjust caching rules as needed
- [ ] Fine-tune TTLs based on real traffic
- [ ] Document findings and adjustments

---

## 8. Best Practices

### 8.1 Cache Invalidation Strategy

**When to Invalidate:**
1. Content updates (blog posts, product info)
2. Design changes (CSS/JS updates)
3. Bug fixes
4. Feature releases

**How to Invalidate:**
```bash
# Azure CLI - Purge specific path
az afd endpoint purge \
  --resource-group flamoral-prod-rg \
  --profile-name flamoral-prod-afd \
  --endpoint-name flamoral-prod \
  --content-paths "/index.html" "/assets/*"

# Purge all content (use sparingly!)
az afd endpoint purge \
  --resource-group flamoral-prod-rg \
  --profile-name flamoral-prod-afd \
  --endpoint-name flamoral-prod \
  --content-paths "/*"
```

**Best Practices:**
- Use versioned URLs for static assets (`/assets/app.v123.js`)
- Purge only what changed, not everything
- Use stale-while-revalidate for gradual updates
- Monitor cache hit ratio after purges

---

### 8.2 Content Versioning

**Why Version:**
- Avoids cache invalidation
- Enables long cache durations
- Simplifies deployments
- Better rollback capability

**Implementation:**
```html
<!-- Bad: No versioning -->
<link rel="stylesheet" href="/assets/styles.css">

<!-- Good: Version in filename -->
<link rel="stylesheet" href="/assets/styles.v1.2.3.css">

<!-- Better: Hash-based versioning -->
<link rel="stylesheet" href="/assets/styles.abc123def.css">
```

**Webpack/Build Tool Configuration:**
```javascript
// webpack.config.js
output: {
  filename: '[name].[contenthash].js',
  chunkFilename: '[name].[contenthash].chunk.js'
}
```

---

### 8.3 Testing Cache Configuration

**Curl Commands:**
```bash
# Test cache headers
curl -I https://flamoral.com/assets/styles.css

# Test with specific Accept-Encoding
curl -I -H "Accept-Encoding: br" https://flamoral.com/index.html

# Test ETag validation
curl -I -H "If-None-Match: \"abc123\"" https://flamoral.com/index.html
```

**Expected Headers:**
```http
# Static Asset
HTTP/2 200
cache-control: public, max-age=604800, immutable
vary: Accept-Encoding
etag: "abc123"
content-encoding: br

# HTML Page
HTTP/2 200
cache-control: public, max-age=3600, stale-while-revalidate=300
vary: Accept-Encoding
etag: "def456"
content-encoding: br
```

---

## 9. Troubleshooting

### 9.1 Low Cache Hit Ratio

**Symptoms:**
- Cache hit ratio below targets
- High origin bandwidth usage
- Slow response times

**Possible Causes:**
1. Query strings not being ignored
2. Vary headers causing cache fragmentation
3. Short TTLs
4. Frequent cache purges
5. High traffic to uncacheable content

**Solutions:**
- Review query string caching behavior
- Limit Vary headers (only Accept-Encoding)
- Increase TTLs where appropriate
- Reduce purge frequency
- Identify and optimize uncacheable routes

---

### 9.2 Stale Content

**Symptoms:**
- Users seeing old content after updates
- CSS/JS not updating

**Possible Causes:**
1. TTLs too long
2. Cache not purged after deployment
3. Browser cache + CDN cache combined

**Solutions:**
- Implement content versioning (hash-based URLs)
- Purge cache after deployments
- Use stale-while-revalidate
- Reduce TTLs for frequently-updated content
- Add `?v=timestamp` for emergency updates

---

### 9.3 High Origin Load

**Symptoms:**
- Origin servers under high load
- Database query spikes
- Slow API responses

**Possible Causes:**
1. Cache misses due to low hit ratio
2. Origin shielding not enabled
3. Request coalescing not working
4. Uncacheable traffic increased

**Solutions:**
- Enable origin shielding
- Verify request coalescing is enabled
- Increase cache TTLs
- Implement API response caching
- Add rate limiting at origin

---

## 10. Next Steps & Continuous Optimization

### 10.1 Short-term (1-3 months)

1. **Monitor and Adjust**
   - Track cache hit ratios weekly
   - Adjust TTLs based on real traffic patterns
   - Identify optimization opportunities

2. **API Caching Expansion**
   - Identify more cacheable API endpoints
   - Implement Vary headers for personalization
   - Test different TTLs for different endpoint types

3. **Image Optimization**
   - Implement WebP/AVIF conversion
   - Add responsive image serving
   - Optimize image compression

---

### 10.2 Long-term (3-12 months)

1. **Edge Computing**
   - Explore Azure Functions on Edge
   - Implement personalization at edge
   - A/B testing at CDN level

2. **Advanced Caching**
   - Predictive prefetching
   - Edge-side includes (ESI)
   - Dynamic content assembly at edge

3. **Global Expansion**
   - Optimize for international traffic
   - Regional cache configurations
   - Multi-region origin setup

---

## 11. References

### Documentation
- [Azure Front Door Caching](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-caching)
- [Azure Front Door Compression](https://learn.microsoft.com/en-us/azure/frontdoor/front-door-caching#file-compression)
- [HTTP Caching (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- [Cache-Control Best Practices](https://web.dev/http-cache/)

### Tools
- [Azure Front Door Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/)
- [Webpagetest.org](https://www.webpagetest.org/) - Test caching and compression
- [RedBot](https://redbot.org/) - HTTP cache validator

### Support
- Ops Team: ops@flamoral.com
- Azure Support: Enterprise Support Plan
- Documentation: https://docs.flamoral.com/cost-optimization

---

## Appendix A: Configuration Files

### A.1 Terraform - frontdoor-routes.tf
Location: `infrastructure/terraform/environments/prod/frontdoor-routes.tf`

**Key Changes:**
- Extended query string filtering (12 parameters instead of 5)
- Expanded compression types
- Additional patterns for static routes
- Added output for cache optimization summary

### A.2 Caching Rules YAML
Location: `infrastructure/azure/frontdoor-caching-rules.yaml`

**Includes:**
- Detailed caching rules for all content types
- Origin shielding configuration
- Request coalescing settings
- Compression configuration
- Monitoring targets

### A.3 Nginx Configuration
Locations:
- `apps/web-app/nginx.conf.optimized`
- `infrastructure/docker/nginx/nginx.conf.optimized`

**Key Changes:**
- Enhanced gzip compression
- Brotli compression (commented, ready to enable)
- ETag support
- Specific Cache-Control headers for each content type
- stale-while-revalidate for HTML

---

## Appendix B: Cost Calculation Methodology

### Data Transfer Costs
```
Azure Pricing (Simplified):
- First 10 TB: $0.081/GB
- Next 40 TB: $0.065/GB
- Next 100 TB: $0.060/GB

Storage Egress (from AKS to Front Door):
- First 5 GB: Free
- Next 10 TB: $0.087/GB
```

### Request Costs
```
Azure Front Door Premium:
- First 1B requests: $0.0036 per 10,000
- Over 1B requests: $0.0030 per 10,000
```

### Calculation Example
```
10M requests/month
500GB total data transfer
85% cache hit ratio

Origin bandwidth: 500GB × 15% = 75GB
Origin cost: 75GB × $0.087 = $6.53

Front Door data transfer: 500GB total
- From origin: 75GB × $0.081 = $6.08
- From cache: 425GB × $0 (edge-to-user is included in Front Door cost)

Front Door request cost: 10M × $0.36 = $3.60

Total optimized cost: ~$16/month for data transfer + base Front Door cost
```

---

**Document Version:** 1.0
**Author:** Flamoral DevOps Team
**Review Date:** January 13, 2026
