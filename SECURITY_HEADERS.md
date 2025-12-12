# Security Headers Implementation

This document describes the comprehensive security headers implementation for the Flamoral Dating Platform.

## Overview

The platform implements defense-in-depth security with multiple layers:
1. **Backend API Gateway** - Security headers middleware (NestJS)
2. **Frontend HTML** - Meta tag security headers (fallback)
3. **Kubernetes Ingress** - NGINX security headers (infrastructure level)

## Implemented Security Headers

### 1. Content Security Policy (CSP)

**Purpose**: Prevents XSS attacks, code injection, and unauthorized resource loading.

**Implementation**:
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: https: blob:;
font-src 'self' data: https://fonts.gstatic.com;
connect-src 'self' wss: ws: https://api.flamoral.com;
media-src 'self' blob: data: https:;
object-src 'none';
frame-src 'none';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests;
block-all-mixed-content;
```

**Key Points**:
- ✅ No inline scripts in production (`script-src 'self'`)
- ✅ `unsafe-inline` only for styles (required for styled-components/CSS-in-JS)
- ✅ Blocks all plugins (`object-src 'none'`)
- ✅ Prevents iframe embedding (`frame-ancestors 'none'`)
- ✅ Forces HTTPS upgrades (`upgrade-insecure-requests`)
- ✅ CSP violation reporting to `/api/v1/security/csp-report`

**Development Mode**: Allows `unsafe-inline` and `unsafe-eval` for Hot Module Replacement (HMR)

### 2. X-Frame-Options: DENY

**Purpose**: Prevents clickjacking attacks by preventing the site from being embedded in iframes.

**Value**: `DENY`

**Alternative**: CSP `frame-ancestors 'none'` provides the same protection with more flexibility.

### 3. X-Content-Type-Options: nosniff

**Purpose**: Prevents MIME type sniffing attacks where browsers try to detect file types.

**Value**: `nosniff`

**Protection**: Blocks requests if:
- Destination is `style` and MIME type is not `text/css`
- Destination is `script` and MIME type is not JavaScript

### 4. X-XSS-Protection: 1; mode=block

**Purpose**: Legacy XSS protection for older browsers (deprecated in modern browsers).

**Value**: `1; mode=block`

**Behavior**: Enables XSS filtering and blocks page rendering if attack detected.

**Note**: Modern browsers rely on CSP instead, but this provides backward compatibility.

### 5. Referrer-Policy: strict-origin-when-cross-origin

**Purpose**: Controls how much referrer information is sent with requests.

**Value**: `strict-origin-when-cross-origin`

**Behavior**:
- Same-origin requests: Send full URL
- Cross-origin HTTPS requests: Send only origin
- HTTP requests: Send nothing

### 6. Permissions-Policy

**Purpose**: Controls which browser features and APIs can be used.

**Enabled Features** (self only):
- `camera` - For video calls
- `microphone` - For video/voice calls
- `geolocation` - For location-based matching
- `payment` - For subscription payments
- `autoplay` - For media playback
- `fullscreen` - For video calls
- `picture-in-picture` - For video calls
- `encrypted-media` - For media playback

**Disabled Features**:
- `usb`, `magnetometer`, `accelerometer`, `gyroscope` - Not needed
- `ambient-light-sensor` - Not needed
- `display-capture` - Screen capture blocked
- `document-domain` - Security risk
- `midi` - Not needed
- `sync-xhr` - Deprecated
- `interest-cohort` - Privacy protection (blocks FLoC)

### 7. Strict-Transport-Security (HSTS)

**Purpose**: Forces HTTPS connections and prevents downgrade attacks.

**Value**: `max-age=31536000; includeSubDomains; preload`

**Configuration**:
- `max-age=31536000` - 1 year (365 days)
- `includeSubDomains` - Apply to all subdomains
- `preload` - Eligible for browser preload lists

**Note**: Only set in production (not development).

### 8. Additional Security Headers

#### X-Permitted-Cross-Domain-Policies: none
Restricts Adobe Flash and PDF cross-domain requests.

#### X-Download-Options: noopen
Prevents Internet Explorer from executing downloads in site's context.

#### Cross-Origin-Embedder-Policy: unsafe-none
Controls what resources can be loaded cross-origin (API gateway allows embedding).

#### Cross-Origin-Opener-Policy: same-origin-allow-popups
Isolates browsing context while allowing popups (needed for OAuth flows).

#### Cross-Origin-Resource-Policy: same-site
Controls who can load the resource.

## CSP Violation Reporting

### Endpoint
`POST /api/v1/security/csp-report`

### Purpose
Receives and logs Content Security Policy violations from browsers.

### Report Format
```json
{
  "csp-report": {
    "document-uri": "https://flamoral.com/page",
    "violated-directive": "script-src 'self'",
    "effective-directive": "script-src",
    "original-policy": "default-src 'self'; ...",
    "blocked-uri": "https://evil.com/script.js",
    "source-file": "https://flamoral.com/app.js",
    "line-number": 42,
    "column-number": 15
  }
}
```

### Monitoring
The endpoint logs all violations and marks critical violations (script-src, default-src, frame-ancestors) for alerts.

## Implementation Files

### Backend (API Gateway)
```
DatingPlatform/backend/services/api-gateway/src/
├── middleware/
│   └── security-headers.middleware.ts   # Main security headers middleware
├── controllers/
│   └── security.controller.ts           # CSP reporting endpoint
├── app.module.ts                         # Module registration
└── main.ts                               # Middleware configuration
```

### Frontend (Web App)
```
DatingPlatform/apps/web-app/
└── index.html                            # Security meta tags (fallback)
```

### Infrastructure (Kubernetes)
```
DatingPlatform/infrastructure/kubernetes/
└── base/
    └── ingress.yaml                      # NGINX security headers
```

## Environment Variables

Add to `.env` file:

```bash
# CSP Violation Reporting
CSP_REPORT_URI=/api/v1/security/csp-report

# API Domain for CSP connect-src
API_DOMAIN=https://api.flamoral.com

# Enable/disable security features
ENABLE_HELMET=true
NODE_ENV=production
```

## Testing Security Headers

### Using curl
```bash
curl -I https://flamoral.com
```

### Using online tools
- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [SSL Labs](https://www.ssllabs.com/ssltest/)

### Expected Score
- **Security Headers**: A+ rating
- **Mozilla Observatory**: 100+ score
- **SSL Labs**: A+ rating

## CSP Testing

### Test for violations
Open browser console and try:
```javascript
// Should be blocked
eval('alert(1)');
document.write('<script src="https://evil.com/script.js"></script>');
```

### Monitor violations
Check logs for CSP violation reports:
```bash
# Backend logs
kubectl logs -f deployment/api-gateway -n flamoral | grep "CSP Violation"
```

## HSTS Preloading

To submit for HSTS preload list:
1. Ensure HSTS header includes `preload` directive
2. Serve HSTS header on base domain and all subdomains
3. Serve redirect from HTTP to HTTPS on all hosts
4. Submit to: https://hstspreload.org/

## Production Checklist

- [x] Content Security Policy (CSP) implemented
- [x] CSP violation reporting endpoint created
- [x] X-Frame-Options: DENY configured
- [x] X-Content-Type-Options: nosniff configured
- [x] X-XSS-Protection: 1; mode=block configured
- [x] Referrer-Policy: strict-origin-when-cross-origin configured
- [x] Permissions-Policy configured
- [x] HSTS with includeSubDomains and preload configured
- [x] Security headers in Kubernetes ingress
- [x] Security meta tags in HTML
- [x] No inline scripts in production (except styled-components)
- [x] All external scripts use HTTPS
- [x] TLS 1.2+ only (no TLS 1.0/1.1)
- [x] Strong cipher suites configured

## Monitoring and Alerts

### Metrics to Track
1. CSP violation count (by directive)
2. CSP violation trends over time
3. Blocked resource origins
4. User agents with violations

### Alerting Rules
- Critical CSP violations (script-src, default-src)
- Sudden spike in violations (possible attack)
- New violation patterns (new attack vector)

### Log Aggregation
CSP violations are logged with structured data for analysis:
```typescript
{
  documentUri: string,
  violatedDirective: string,
  blockedUri: string,
  userAgent: string,
  timestamp: string,
  ip: string
}
```

## Troubleshooting

### Issue: Styles not loading
**Cause**: CSP blocking inline styles
**Solution**: Ensure `style-src` includes `'unsafe-inline'` for styled-components

### Issue: WebSocket connection blocked
**Cause**: CSP not allowing WebSocket protocols
**Solution**: Ensure `connect-src` includes `wss:` and `ws:`

### Issue: Images not loading
**Cause**: CSP blocking external images
**Solution**: Ensure `img-src` includes `https:` and `blob:` for user uploads

### Issue: Google Fonts not loading
**Cause**: CSP blocking external fonts
**Solution**: Ensure `font-src` includes `https://fonts.gstatic.com`

## Security Header Precedence

When multiple layers set the same header:

1. **NGINX Ingress** (first - infrastructure level)
2. **Backend Middleware** (second - application level)
3. **HTML Meta Tags** (third - fallback only)

**Best Practice**: Set headers at infrastructure level (NGINX) as primary, with backend as backup.

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [HSTS Preload List](https://hstspreload.org/)
- [Can I Use - CSP](https://caniuse.com/contentsecuritypolicy2)

## Maintenance

### Regular Reviews
- Review CSP violations weekly
- Update CSP directives as needed
- Test new features against CSP
- Update documentation

### Updates
- Monitor security header best practices
- Update HSTS max-age periodically
- Review and update Permissions-Policy
- Keep dependencies updated (helmet, etc.)
