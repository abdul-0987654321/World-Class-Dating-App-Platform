# Flamoral Performance Report
**Date:** December 15, 2025
**URL:** https://flamoral.com

---

## Executive Summary

The Flamoral website shows acceptable initial load performance but has significant room for optimization, particularly in JavaScript bundle size.

---

## Core Web Vitals (Estimated)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| LCP (Largest Contentful Paint) | ~2.5s | <2.5s | Borderline |
| FID (First Input Delay) | ~50ms | <100ms | Good |
| CLS (Cumulative Layout Shift) | ~0.05 | <0.1 | Good |
| TTFB (Time to First Byte) | 403ms | <200ms | Needs Work |

---

## Network Performance

### DNS & Connection
```
DNS Lookup:       94.8ms   (Target: <50ms)
TCP Connect:     183.2ms   (Acceptable)
TLS Handshake:   ~100ms    (Acceptable)
TTFB:            403ms     (Target: <200ms)
```

### Asset Sizes

| Asset Type | Size (Raw) | Size (Gzip) | Target | Status |
|------------|------------|-------------|--------|--------|
| HTML | 4KB | ~1.5KB | <10KB | Excellent |
| Main JS | 735KB | ~185KB | <200KB | Critical |
| Vendor JS | 163KB | ~53KB | <100KB | Good |
| CSS | ~97KB | ~13KB | <50KB | Needs Work |
| **Total** | ~1MB | ~252KB | <300KB | Acceptable |

---

## Bundle Analysis

### JavaScript Breakdown (Estimated)
```
react + react-dom:     ~140KB
react-router:          ~30KB
tailwind utilities:    ~100KB
application code:      ~300KB
other dependencies:    ~165KB
-------------------------------
Total:                 ~735KB
```

### Critical Dependencies
- React 18.x - Large but necessary
- React Router - Standard routing
- Tailwind CSS - Utility-first, consider purging

---

## Performance Opportunities

### High Impact

1. **Code Splitting** - Split by route
   - Potential savings: 200-300KB initial load
   - Effort: Medium
   ```javascript
   // Recommended approach
   const Discovery = React.lazy(() => import('./pages/Discovery'));
   const Profile = React.lazy(() => import('./pages/Profile'));
   ```

2. **Tree Shaking** - Remove unused code
   - Potential savings: 50-100KB
   - Effort: Low (verify Vite config)

3. **Dynamic Imports** - Heavy features on demand
   - Video call SDK
   - Payment processing
   - AI features

### Medium Impact

4. **Image Optimization**
   - Implement WebP format
   - Use responsive images
   - Add lazy loading

5. **Font Optimization**
   - Subset fonts to used characters
   - Use font-display: swap
   - Preload critical fonts

6. **CSS Purging**
   - Verify Tailwind purge config
   - Remove unused styles
   - Potential: ~50KB reduction

### Low Impact

7. **HTTP/2 Server Push**
   - Push critical CSS
   - Push main JS bundle

8. **Preconnect/Prefetch**
   - Already using preconnect for fonts
   - Add prefetch for API domain

---

## Server Configuration

### CDN (Azure Static Web Apps)
- ✓ Global edge distribution
- ✓ Automatic HTTPS
- ✓ Gzip compression
- ✗ Brotli compression (unknown)
- ✗ HTTP/3 support (unknown)

### Caching Headers
```
Cache-Control: Recommend max-age=31536000 for versioned assets
ETag: Should be enabled
Vary: Accept-Encoding
```

---

## Mobile Performance

### 3G Simulation (Estimated)
```
First Paint:        ~3.5s
First Contentful:   ~4.0s
Fully Interactive:  ~6.0s
```

### Recommendations for Mobile
1. Reduce initial bundle to <100KB critical
2. Implement skeleton loaders
3. Add service worker for caching
4. Consider AMP for landing page

---

## Performance Budget

### Recommended Budget
```yaml
performance_budget:
  javascript:
    initial: 150KB
    total: 500KB
  css:
    initial: 30KB
    total: 75KB
  images:
    hero: 100KB
    thumbnails: 20KB each
  fonts:
    critical: 30KB
    total: 100KB
  total_page_weight: 1MB
  time_to_interactive: 3s (3G)
```

---

## Lighthouse Scores (Estimated)

| Category | Score | Notes |
|----------|-------|-------|
| Performance | 65-75 | Bundle size hurts score |
| Accessibility | 70-80 | Needs verification |
| Best Practices | 85-95 | Good security headers |
| SEO | 50-60 | SPA without SSR |
| PWA | 30-40 | No service worker |

---

## Action Items

### Immediate (P0)
- [ ] Analyze bundle with `vite-bundle-analyzer`
- [ ] Implement route-based code splitting
- [ ] Verify tree shaking is working

### This Sprint (P1)
- [ ] Add lazy loading for non-critical routes
- [ ] Implement image optimization pipeline
- [ ] Add performance monitoring (Web Vitals)

### Backlog (P2)
- [ ] Implement SSR for landing page
- [ ] Add service worker
- [ ] Consider edge functions for API

---

## Tools for Further Analysis

1. **Chrome DevTools Performance Tab** - Runtime analysis
2. **Lighthouse** - Full audit
3. **WebPageTest** - Real device testing
4. **Bundle Analyzer** - Vite plugin for bundle visualization
5. **Calibre/SpeedCurve** - Ongoing monitoring

---

*Report generated from live site analysis on December 15, 2025*
