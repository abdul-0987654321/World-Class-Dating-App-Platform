# Flamoral Deployment Configuration Guide

## Overview

This document describes the deployment configuration for flamoral.com, which is deployed on **Vercel** for the frontend (with Azure Static Web Apps as fallback) and uses **Nginx** for Docker-based deployments.

## Deployment Platforms

### Primary: Vercel
- **Domain**: https://flamoral.com
- **Configuration**: `vercel.json`
- **Framework**: Vite + React
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Fallback: Azure Static Web Apps
- **Configuration**: `staticwebapp.config.json`
- **Workflow**: `.github/workflows/azure-static-web-app.yml`

### Docker/Kubernetes: Nginx
- **Configuration**: `nginx.conf` (apps/web-app)
- **Infrastructure Config**: `infrastructure/docker/nginx/default.conf`

---

## Configuration Files

### 1. vercel.json (Vercel Deployment)

Location: `apps/web-app/vercel.json`

**Key Features:**
- SPA routing with fallback to `index.html`
- Static file caching (1 year for assets, fonts, images)
- Direct serving of `robots.txt` and `sitemap.xml`
- API proxying to `https://api.flamoral.com`
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Proper MIME types for fonts and static assets

**Routes Configuration:**
```json
{
  "routes": [
    {
      "src": "/robots.txt",
      "dest": "/robots.txt"
    },
    {
      "src": "/sitemap.xml",
      "dest": "/sitemap.xml"
    },
    {
      "src": "/assets/(.*)",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

---

### 2. nginx.conf (Docker/Nginx Deployment)

Location: `apps/web-app/nginx.conf`

**Key Features:**
- Gzip compression for text/CSS/JS files
- Long-term caching for static assets (1 year)
- Direct serving of `robots.txt` and `sitemap.xml` (NOT through SPA)
- Security headers (HSTS, CSP, X-Frame-Options)
- SPA fallback routing
- Health check endpoint at `/health`

**Critical Configuration:**
```nginx
# Serve robots.txt directly - DO NOT fallback to SPA
location = /robots.txt {
    try_files $uri =404;
    add_header Content-Type text/plain;
    add_header Cache-Control "public, max-age=3600, must-revalidate";
    access_log off;
}

# Serve sitemap.xml directly - DO NOT fallback to SPA
location = /sitemap.xml {
    try_files $uri =404;
    add_header Content-Type application/xml;
    add_header Cache-Control "public, max-age=3600, must-revalidate";
    access_log off;
}

# SPA fallback - serve index.html for all routes
location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

---

### 3. infrastructure/docker/nginx/default.conf

Location: `infrastructure/docker/nginx/default.conf`

**Key Features:**
- Reverse proxy to API Gateway and Frontend
- SSL/TLS termination
- Rate limiting for API and auth endpoints
- WebSocket support for Socket.io
- Static file serving with long-term caching
- Direct serving of `robots.txt` and `sitemap.xml`

---

## Static Files (SEO & Crawlers)

### robots.txt

Location: `apps/web-app/public/robots.txt`

**Purpose:** Controls search engine crawler access

**Key Rules:**
- Allow all crawlers by default
- Disallow admin, dashboard, settings, messages, checkout, payment
- Disallow API endpoints
- Points to sitemap at `https://flamoral.com/sitemap.xml`

### sitemap.xml

Location: `apps/web-app/public/sitemap.xml`

**Purpose:** Helps search engines discover and index pages

**Included Pages:**
- Homepage (priority 1.0, daily updates)
- About, Features, Pricing (priority 0.8-0.9)
- Blog, Contact, Safety (priority 0.6-0.7)
- Legal pages (Privacy, Terms) (priority 0.5)
- Auth pages (Login, Register) (priority 0.6)

**Update Schedule:**
Remember to update `lastmod` dates when deploying major changes!

---

## Build Configuration

### vite.config.ts

**Key Settings:**
```typescript
build: {
  outDir: 'dist',
  copyPublicDir: true,  // Ensures robots.txt and sitemap.xml are copied
  sourcemap: false,     // Disabled in production for security
  minify: 'esbuild',
  chunkSizeWarningLimit: 1000,
  target: ['es2020', 'edge88', 'firefox78', 'chrome88', 'safari14'],
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'ui-vendor': ['framer-motion', 'styled-components'],
        'state-vendor': ['@reduxjs/toolkit', 'react-redux', 'redux-persist'],
        'utils-vendor': ['axios', 'date-fns', 'dompurify'],
      },
    },
  },
}
```

---

## Caching Strategy

### Assets (JS, CSS, Images, Fonts)
- **Cache-Control**: `public, max-age=31536000, immutable`
- **Duration**: 1 year
- **Reasoning**: Content-hashed filenames allow long-term caching

### HTML Files (index.html)
- **Cache-Control**: `no-cache, no-store, must-revalidate`
- **Reasoning**: Always fetch latest version to ensure updated JS/CSS references

### SEO Files (robots.txt, sitemap.xml)
- **Cache-Control**: `public, max-age=3600, must-revalidate`
- **Duration**: 1 hour
- **Reasoning**: Allow updates while reducing unnecessary requests

### API Responses
- **Cache-Control**: `no-cache, no-store, must-revalidate`
- **Reasoning**: Dynamic data should never be cached

---

## Security Headers

### Strict-Transport-Security (HSTS)
```
max-age=31536000; includeSubDomains; preload
```
Forces HTTPS for 1 year, includes all subdomains

### Content-Security-Policy (CSP)
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.google-analytics.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: https: blob:;
connect-src 'self' wss://api.flamoral.com https://api.flamoral.com;
```

### Other Security Headers
- **X-Frame-Options**: `DENY` (prevent clickjacking)
- **X-Content-Type-Options**: `nosniff` (prevent MIME sniffing)
- **X-XSS-Protection**: `1; mode=block` (legacy XSS protection)
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Permissions-Policy**: Restricts camera, microphone, geolocation, etc.

---

## CI/CD Pipeline

### GitHub Actions Workflow

**File**: `.github/workflows/azure-static-web-app.yml`

**Deployment Steps:**
1. Checkout code
2. Setup Node.js 20.x
3. Install dependencies (`npm ci`)
4. Build production app (`npm run build`)
5. Deploy to Azure Static Web Apps / Vercel
6. Purge CDN cache (if Azure Front Door is used)

**Environment Variables:**
- `VITE_API_URL`: https://api.flamoral.com/api/v1
- `VITE_WS_URL`: wss://api.flamoral.com
- `VITE_APP_DOMAIN`: https://flamoral.com
- Feature flags, API keys (from GitHub Secrets)

---

## Deployment Checklist

### Pre-Deployment
- [ ] Update `sitemap.xml` with latest pages and `lastmod` dates
- [ ] Verify `robots.txt` rules are correct
- [ ] Test build locally: `npm run build && npm run preview`
- [ ] Check environment variables in `.env.production`
- [ ] Review security headers in `vercel.json` or `nginx.conf`

### Post-Deployment
- [ ] Verify robots.txt: https://flamoral.com/robots.txt
- [ ] Verify sitemap.xml: https://flamoral.com/sitemap.xml
- [ ] Test SPA routing (all routes should work)
- [ ] Verify API proxy: https://flamoral.com/api/health
- [ ] Check security headers: https://securityheaders.com
- [ ] Test static asset caching (check Network tab)
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools

### Troubleshooting
- **robots.txt returns 404**: Ensure `copyPublicDir: true` in `vite.config.ts`
- **robots.txt shows index.html**: Check nginx location priority (= /robots.txt should be before / location)
- **SPA routes return 404**: Verify fallback routing in vercel.json or nginx.conf
- **Assets not cached**: Check Cache-Control headers in browser DevTools

---

## Testing

### Local Testing with Docker
```bash
# Build Docker image
docker build -t flamoral-web:test -f apps/web-app/Dockerfile apps/web-app

# Run container
docker run -p 8080:80 flamoral-web:test

# Test endpoints
curl http://localhost:8080/robots.txt
curl http://localhost:8080/sitemap.xml
curl http://localhost:8080/health
```

### Local Testing with Vite
```bash
cd apps/web-app
npm run build
npm run preview
# Visit http://localhost:4173
```

---

## Monitoring & Analytics

### Vercel Analytics
- Automatically enabled for Vercel deployments
- Tracks Core Web Vitals (LCP, FID, CLS)
- Real user monitoring (RUM)

### Google Analytics
- **Measurement ID**: Set via `VITE_GA_MEASUREMENT_ID`
- Tracks page views, events, conversions

### Sentry Error Tracking
- **DSN**: Set via `VITE_SENTRY_DSN`
- Captures client-side errors and performance issues

---

## Production URLs

- **Frontend**: https://flamoral.com
- **API**: https://api.flamoral.com
- **WebSocket**: wss://api.flamoral.com
- **CDN**: https://cdn.flamoral.com (if applicable)
- **Media CDN**: https://media.flamoral.com (if applicable)

---

## Support & Maintenance

### Updating robots.txt
1. Edit `apps/web-app/public/robots.txt`
2. Commit and push changes
3. Deploy will automatically update

### Updating sitemap.xml
1. Edit `apps/web-app/public/sitemap.xml`
2. Update `<lastmod>` dates to current date
3. Add/remove URLs as needed
4. Commit and push changes
5. After deployment, submit to search engines

### Adding New Routes
1. Update sitemap.xml with new route
2. Update robots.txt if route should be disallowed
3. Ensure route works in SPA (React Router)
4. Test deployment in staging first

---

## Notes

- Vercel automatically handles SSL/TLS certificates
- Nginx configurations assume SSL termination at load balancer or reverse proxy
- Static files in `public/` are copied to `dist/` during build
- All static assets use content hashing for cache busting
- CSP headers include Vercel Insights and Stripe for payments

---

**Last Updated**: 2025-12-15
**Maintained By**: Flamoral DevOps Team
