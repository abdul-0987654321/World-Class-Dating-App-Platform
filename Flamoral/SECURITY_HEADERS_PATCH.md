# Security Headers and HSTS Improvements - Implementation Guide

## Overview
This document outlines the security improvements needed for flamoral.com to fix HSTS configuration, add security.txt, and document CSP unsafe-inline usage.

## Changes Required

### 1. Update HSTS max-age from 1 year to 2 years

#### File: `backend/services/api-gateway/src/middleware/security-headers.middleware.ts`

**Line 52:** Change comment from:
```typescript
// max-age=31536000: 1 year
```
To:
```typescript
// max-age=63072000: 2 years (recommended for preload list eligibility)
```

**Line 58:** Change HSTS header value from:
```typescript
'max-age=31536000; includeSubDomains; preload'
```
To:
```typescript
'max-age=63072000; includeSubDomains; preload'
```

**Line 97:** Add comprehensive documentation for unsafe-inline. Replace:
```typescript
      'style-src': ["'self'", "'unsafe-inline'"], // unsafe-inline needed for styled-components
```
With:
```typescript
      'style-src': ["'self'", "'unsafe-inline'"], // unsafe-inline needed for styled-components (see NOTE in method doc)
```

**Add documentation comment before `buildCSPDirectives` method (after line 89):**
```typescript
  /**
   * Build Content Security Policy directives
   *
   * NOTE: 'unsafe-inline' for style-src
   * We use 'unsafe-inline' for styles because the application uses CSS-in-JS (styled-components).
   * This is a known tradeoff between security and functionality:
   * - styled-components generates inline styles dynamically at runtime
   * - Implementing nonce-based CSP would require SSR changes and significant refactoring
   * - The risk is partially mitigated by:
   *   1. Strict script-src policy (no unsafe-inline for scripts in production)
   *   2. X-XSS-Protection header
   *   3. noSniff content type enforcement
   *   4. Input validation and sanitization throughout the application
   *
   * Future improvement: Migrate to a CSS solution that supports nonce-based CSP,
   * or implement SSR with nonce injection for styled-components.
   */
```

---

#### File: `backend/services/api-gateway/src/config/security.config.ts`

**Line 194:** Change comment and value from:
```typescript
      maxAge: 31536000, // 1 year
```
To:
```typescript
      maxAge: 63072000, // 2 years (recommended for preload list eligibility)
```

---

#### File: `apps/web-app/nginx.conf`

**Line 30:** Change HSTS header from:
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```
To:
```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

**Update comment on line 29 from:**
```nginx
        # HSTS - Enforce HTTPS (preload requires submission to hstspreload.org)
```
To:
```nginx
        # HSTS - Enforce HTTPS for 2 years (preload requires submission to hstspreload.org)
```

---

### 2. Create security.txt for Responsible Disclosure

#### Create directory: `apps/web-app/public/.well-known/`

```bash
mkdir -p apps/web-app/public/.well-known
```

#### Create file: `apps/web-app/public/.well-known/security.txt`

```
# Security Policy for Flamoral.com
# This file follows RFC 9116: https://www.rfc-editor.org/rfc/rfc9116.html

Contact: mailto:security@flamoral.com
Contact: https://flamoral.com/security/report
Expires: 2026-12-31T23:59:59.000Z
Preferred-Languages: en
Canonical: https://flamoral.com/.well-known/security.txt

# Security Acknowledgments
Acknowledgments: https://flamoral.com/security/hall-of-fame

# Policy
Policy: https://flamoral.com/security/disclosure-policy

# Encryption
# Encryption: https://flamoral.com/.well-known/pgp-key.txt

# Scope
# This security policy applies to:
# - flamoral.com
# - app.flamoral.com
# - api.flamoral.com
# - All subdomains of flamoral.com

# Please report security vulnerabilities responsibly.
# We aim to respond to security reports within 48 hours.
```

**Note:** Update the email address, URLs, and expiration date as needed for your actual deployment.

---

### 3. Add GET endpoint for security.txt in API Gateway

#### File: `backend/services/api-gateway/src/controllers/security.controller.ts`

**Add after the reportSecurityEvent method (around line 148):**

```typescript
  /**
   * Serve security.txt for responsible disclosure
   * @see RFC 9116: https://www.rfc-editor.org/rfc/rfc9116.html
   */
  @Public()
  @Get('.well-known/security.txt')
  @ApiOperation({
    summary: 'Get security.txt',
    description: 'Returns security.txt for responsible vulnerability disclosure',
  })
  @ApiResponse({
    status: 200,
    description: 'Security.txt content',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
        },
      },
    },
  })
  getSecurityTxt(@Res() res: Response): void {
    const securityTxt = `# Security Policy for Flamoral.com
# This file follows RFC 9116: https://www.rfc-editor.org/rfc/rfc9116.html

Contact: mailto:security@flamoral.com
Contact: https://flamoral.com/security/report
Expires: 2026-12-31T23:59:59.000Z
Preferred-Languages: en
Canonical: https://flamoral.com/.well-known/security.txt

# Security Acknowledgments
Acknowledgments: https://flamoral.com/security/hall-of-fame

# Policy
Policy: https://flamoral.com/security/disclosure-policy

# Scope
# This security policy applies to:
# - flamoral.com
# - app.flamoral.com
# - api.flamoral.com
# - All subdomains of flamoral.com

# Please report security vulnerabilities responsibly.
# We aim to respond to security reports within 48 hours.
`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(securityTxt);
  }
```

**Add required import at the top of the file:**
```typescript
import { Controller, Post, Get, Body, Logger, HttpCode, HttpStatus, Req, Res } from '@nestjs/common';
```

---

## Implementation Steps

1. **Update HSTS Configuration:**
   - Edit `backend/services/api-gateway/src/middleware/security-headers.middleware.ts`
   - Edit `backend/services/api-gateway/src/config/security.config.ts`
   - Edit `apps/web-app/nginx.conf`
   - Change all instances of `max-age=31536000` to `max-age=63072000`

2. **Add CSP Documentation:**
   - Update `security-headers.middleware.ts` with comprehensive documentation explaining why `unsafe-inline` is used for styles

3. **Create security.txt:**
   - Create directory `.well-known` in `apps/web-app/public/`
   - Create `security.txt` file with appropriate contact information
   - Add GET endpoint in security controller to serve security.txt dynamically

4. **Test Changes:**
   ```bash
   # Test HSTS header
   curl -I https://flamoral.com | grep -i strict-transport

   # Test security.txt
   curl https://flamoral.com/.well-known/security.txt
   curl https://api.flamoral.com/.well-known/security.txt

   # Verify CSP headers
   curl -I https://flamoral.com | grep -i content-security-policy
   ```

5. **Verify Deployment:**
   - Check headers with browser DevTools (Network tab)
   - Run security audit with: https://securityheaders.com/
   - Verify HSTS preload eligibility: https://hstspreload.org/

## Benefits

1. **HSTS 2-year max-age:**
   - Meets requirement for HSTS preload list submission
   - Stronger protection against SSL-stripping attacks
   - Better security posture for long-term users

2. **security.txt:**
   - Standardized way for security researchers to report vulnerabilities
   - Demonstrates security maturity and responsible disclosure program
   - Follows RFC 9116 standard

3. **CSP Documentation:**
   - Clear explanation of security tradeoffs
   - Documents technical debt for future improvement
   - Helps security auditors understand the rationale

## Security Considerations

- **HSTS Preload:** Once submitted to preload list, removal takes months. Ensure HTTPS is stable across all subdomains.
- **security.txt Email:** Use a monitored security@ email address. Set up proper incident response procedures.
- **CSP unsafe-inline:** While documented, consider migrating to nonce-based CSP in the future for better XSS protection.

## Post-Deployment

1. Submit to HSTS Preload List: https://hstspreload.org/
2. Monitor CSP violations through the reporting endpoint
3. Set calendar reminder to update security.txt expiration date
4. Review security headers quarterly with tools like securityheaders.com

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [RFC 9116: security.txt](https://www.rfc-editor.org/rfc/rfc9116.html)
- [HSTS Preload List](https://hstspreload.org/)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [styled-components CSP Considerations](https://styled-components.com/docs/advanced#content-security-policy)
