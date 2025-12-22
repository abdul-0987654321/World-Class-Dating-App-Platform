# Flamoral Dating Platform - Security Hardening Documentation

## Overview

This document outlines the comprehensive security hardening measures implemented for the Flamoral Dating Platform. All implementations follow industry best practices and OWASP security guidelines.

## Implemented Security Features

### 1. Account Lockout Protection

**Location**: `backend/services/auth-service/src/domain/services/account-lockout.service.ts`

**Features**:
- Automatic account lockout after 5 failed login attempts
- 15-minute lockout duration
- Failed attempt tracking with Redis
- Automatic unlock after timeout
- Email notifications for account lockouts
- Support for manual admin unlock
- Permanent lockout capability for severe security violations

**Configuration**:
```typescript
{
  maxAttempts: 5,
  lockoutDuration: 15 * 60, // seconds
  attemptWindow: 15 * 60 // seconds
}
```

### 2. Password Breach Checking

**Location**: `backend/services/auth-service/src/domain/services/password-breach-checker.service.ts`

**Features**:
- Integration with HaveIBeenPwned API
- K-anonymity model (only sends first 5 characters of password hash)
- Checks passwords during registration and reset
- In-memory caching with 24-hour TTL
- Fails open for availability (allows password if API unavailable)
- Detailed breach count reporting

**Usage**:
```typescript
const breachCheck = await passwordBreachCheckerService.checkPasswordBreach(password);
if (breachCheck.isBreached) {
  throw new Error(breachCheck.message);
}
```

### 3. Enhanced Password Reset

**Location**: `backend/services/auth-service/src/domain/services/auth.service.ts`

**Features**:
- Time-limited tokens (1 hour expiry)
- Single-use tokens
- All sessions invalidated on password change
- Password breach checking on reset
- Email notifications
- Secure token generation using crypto

**Security Measures**:
- Tokens stored in database with expiry
- Tokens marked as used after consumption
- Rate limiting on reset requests (5 per hour)
- No user enumeration (same response for existing/non-existing emails)

### 4. Login Notifications

**Location**: `backend/services/auth-service/src/domain/services/auth.service.ts`

**Features**:
- New device detection
- New location detection
- Suspicious login alerts
- Email notifications with login details
- IP address and user agent logging

**Triggers**:
- Login from unrecognized device
- Login from new location
- Suspicious activity score >= 50
- Impossible travel detected

### 5. Session Management with Device Tracking

**Location**: `backend/services/auth-service/src/domain/services/session-management.service.ts`

**Features**:
- Device fingerprinting
- Session tracking per device
- Maximum 5 concurrent sessions
- Session expiry (7 days)
- Idle timeout detection
- Manual session revocation
- Automatic cleanup of expired sessions

**Device Fingerprinting** (`device-fingerprint.service.ts`):
- User agent tracking
- IP address monitoring
- Browser fingerprinting
- Automatic trust after 5 successful logins
- Device management interface

### 6. Rate Limiting

**Location**: `backend/services/auth-service/src/api/middleware/enhanced-rate-limit.middleware.ts`

**Implementations**:

| Endpoint Type | Window | Max Requests |
|--------------|--------|--------------|
| Authentication | 15 min | 10 |
| Password Reset | 1 hour | 5 |
| Email Verification | 10 min | 3 |
| General API | 15 min | 100 |
| File Upload | 1 hour | 20 |
| Sensitive Operations | 1 hour | 10 |

**Features**:
- Redis-based distributed rate limiting
- Per-IP and per-user rate limits
- Custom rate limit headers
- Configurable skip on success/failure
- Automatic rate limit reset

### 7. IP-Based Anomaly Detection

**Location**: `backend/services/auth-service/src/domain/services/suspicious-login-detector.service.ts`

**Detection Capabilities**:
- **New Device Detection**: Flags logins from unrecognized devices (Score: +20)
- **New Location Detection**: Flags logins from new IP addresses (Score: +15)
- **Impossible Travel**: Detects logins from geographically distant locations within short time periods (Score: +40)
- **Unusual Time Detection**: Flags logins during unusual hours (2 AM - 6 AM) (Score: +10)
- **Rapid Attempts**: Detects multiple login attempts in short time (Score: +25)
- **Multiple Failures**: Tracks failed login patterns (Score: +30)

**Alert Threshold**: Score >= 50 triggers security alert

### 8. Secure File Upload Validation

**Location**: `backend/services/user-service/src/utils/file-validation.util.ts`

**Features**:
- **Magic Number Checking**: Validates file type by checking file signature (first bytes)
- **MIME Type Verification**: Ensures declared type matches actual type
- **Size Validation**: 10MB for images, 100MB for videos
- **Malware Pattern Detection**: Basic checks for executable signatures and script content
- **Filename Sanitization**: Removes path traversal and dangerous characters
- **PHP/Script Detection**: Blocks files containing PHP or script tags

**Supported Formats**:
- Images: JPEG, PNG, GIF, WebP
- Videos: MP4

**Magic Numbers Validated**:
```typescript
JPEG: [0xFF, 0xD8, 0xFF]
PNG: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
GIF: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] or [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]
WebP: [0x52, 0x49, 0x46, 0x46, ..., 0x57, 0x45, 0x42, 0x50]
MP4: [0x00, 0x00, 0x00, ..., 0x66, 0x74, 0x79, 0x70]
```

### 9. Open Redirect Protection

**Location**: `backend/services/api-gateway/src/middleware/redirect-protection.middleware.ts`

**Features**:
- Domain whitelist validation
- Path traversal prevention
- XSS vector detection in URLs
- Protocol validation (only http/https)
- Automatic sanitization of unsafe URLs

**Allowed Redirect Domains**:
- localhost / 127.0.0.1 (development)
- flamoral.com
- *.flamoral.com subdomains

**Blocked Patterns**:
- javascript: protocol
- data: protocol
- vbscript: protocol
- Path traversal (..)
- Event handlers (onclick=, etc.)

### 10. Input Sanitization

**Frontend** (`apps/web-app/src/utils/sanitization.ts`):
- DOMPurify integration
- HTML sanitization with allowed tag whitelist
- URL validation and sanitization
- Search query sanitization
- Profile data validation

**Backend** (`backend/services/user-service/src/api/middleware/sanitization.middleware.ts`):
- XSS pattern detection and blocking
- SQL injection detection
- Command injection detection
- HTML entity encoding
- Recursive object sanitization

### 11. Secure Error Handling

**Location**: `backend/services/api-gateway/src/middleware/error-handler.middleware.ts`

**Features**:
- Generic error messages in production
- Stack traces hidden from responses
- Detailed logging for debugging
- Separate handling for operational vs programming errors
- Custom error types with severity levels
- Graceful error recovery
- Unhandled rejection catching

**Error Types**:
- VALIDATION_ERROR (400)
- AUTHENTICATION_ERROR (401)
- AUTHORIZATION_ERROR (403)
- NOT_FOUND (404)
- RATE_LIMIT_EXCEEDED (429)
- SERVER_ERROR (500)

**Production Behavior**:
- Never exposes stack traces
- Never exposes internal error details
- Uses generic, user-friendly messages
- Logs full error details server-side

### 12. Security Event Logging

**Location**: `backend/services/auth-service/src/utils/security-logger.ts`

**Logged Events**:

**Authentication**:
- LOGIN_SUCCESS
- LOGIN_FAILURE
- LOGOUT
- PASSWORD_RESET_REQUESTED
- PASSWORD_RESET_COMPLETED

**Account Security**:
- ACCOUNT_LOCKED
- ACCOUNT_UNLOCKED
- SUSPICIOUS_LOGIN_DETECTED
- NEW_DEVICE_LOGIN
- IMPOSSIBLE_TRAVEL_DETECTED

**Token Security**:
- TOKEN_REFRESH
- TOKEN_REUSE_DETECTED
- TOKEN_THEFT_SUSPECTED
- ALL_TOKENS_INVALIDATED

**Attack Detection**:
- BRUTE_FORCE_DETECTED
- SQL_INJECTION_ATTEMPT
- XSS_ATTEMPT
- PATH_TRAVERSAL_ATTEMPT
- MALICIOUS_FILE_UPLOAD

**Severity Levels**:
- LOW: Informational events
- MEDIUM: Potential security concerns
- HIGH: Confirmed security issues
- CRITICAL: Immediate threats requiring response

**Alert Thresholds**:
```typescript
LOGIN_FAILURE: 5 attempts
TOKEN_REUSE_DETECTED: 1 occurrence
BRUTE_FORCE_DETECTED: 1 occurrence
SQL_INJECTION_ATTEMPT: 1 occurrence
```

### 13. API Versioning

**Location**: `backend/services/api-gateway/src/middleware/api-versioning.middleware.ts`

**Features**:
- Header-based versioning (X-API-Version)
- URL path versioning (/api/v1/...)
- Query parameter versioning (?version=v1)
- Version deprecation warnings
- Sunset date management
- Migration documentation links

**Version Detection Priority**:
1. X-API-Version header (preferred)
2. URL path (/api/v1/...)
3. Query parameter (?version=v1)
4. Default to v1

**Response Headers**:
```
X-API-Version: v1
X-API-Version-Status: current|deprecated|sunset
Warning: 299 - "API version deprecated..."
Deprecation: true (if deprecated)
X-API-Replaced-By: v2 (if applicable)
Link: <docs-url>; rel="documentation"
```

### 14. Secure Defaults Configuration

**Location**: `backend/services/api-gateway/src/config/security.config.ts`

**Production Defaults**:

**Authentication**:
- Access token expiry: 15 minutes
- Refresh token expiry: 7 days
- Max login attempts: 5
- Lockout duration: 15 minutes
- Email verification: Required

**Password Policy**:
- Minimum length: 12 characters
- Complexity: Upper, lower, number, special char required
- Breach checking: Enabled
- Password expiry: 90 days
- Reuse prevention: Last 5 passwords

**Security Headers** (Helmet):
- HSTS: Enabled (1 year, includeSubDomains, preload)
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- X-Content-Type-Options: nosniff
- Content-Security-Policy: Enabled with strict directives

**Rate Limiting**:
- Enabled globally
- Window: 15 minutes
- Max requests: 100 per window
- Trust proxy: Enabled

**CORS**:
- Allowed origins: flamoral.com, app.flamoral.com
- Credentials: Enabled
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Exposed headers: Rate limit headers

## Security Testing

### Manual Testing Checklist

- [ ] Account lockout after 5 failed login attempts
- [ ] Account unlocks automatically after 15 minutes
- [ ] Password breach checking rejects compromised passwords
- [ ] Password reset tokens expire after 1 hour
- [ ] Login notifications sent for new devices
- [ ] Session management tracks devices correctly
- [ ] Rate limits enforce correctly across endpoints
- [ ] File upload rejects files with invalid magic numbers
- [ ] File upload blocks PHP/script content
- [ ] Open redirect protection blocks external domains
- [ ] XSS attempts blocked by sanitization
- [ ] SQL injection attempts detected and blocked
- [ ] Error messages don't expose stack traces in production
- [ ] Security events logged correctly
- [ ] API versioning headers returned correctly

### Automated Testing

Run security tests:
```bash
# Auth service tests
cd backend/services/auth-service
npm test

# User service tests
cd backend/services/user-service
npm test

# Integration tests
npm run test:integration

# Security-specific tests
npm run test:security
```

## Monitoring and Alerting

### Metrics to Monitor

1. **Failed Login Attempts**: Track per IP and per user
2. **Account Lockouts**: Monitor frequency and patterns
3. **Suspicious Login Score**: Alert on high scores
4. **Rate Limit Violations**: Track endpoints being abused
5. **Token Reuse Detection**: Critical security indicator
6. **File Upload Rejections**: Monitor malicious upload attempts
7. **XSS/SQL Injection Attempts**: Track attack patterns
8. **API Error Rates**: Monitor for anomalies

### Alert Thresholds

- **CRITICAL**: Token reuse detected, impossible travel, SQL injection
- **HIGH**: Account locked, suspicious login (score >= 50)
- **MEDIUM**: Failed login (5+ attempts), breached password rejected
- **LOW**: Successful login, password reset requested

## Deployment Checklist

Before deploying to production:

- [ ] Update `ALLOWED_ORIGINS` environment variable
- [ ] Configure email service for notifications
- [ ] Set up Redis for distributed rate limiting
- [ ] Enable HTTPS (TLS 1.3)
- [ ] Configure database connection pooling
- [ ] Set up log aggregation service
- [ ] Configure monitoring and alerting
- [ ] Test all rate limits
- [ ] Verify error handling doesn't expose details
- [ ] Review and update security configuration
- [ ] Perform security health check
- [ ] Run penetration testing
- [ ] Review CORS configuration
- [ ] Verify CSP headers
- [ ] Enable virus scanning for file uploads (integrate ClamAV)

## Environment Variables

Required environment variables for security features:

```env
# Authentication
ACCESS_TOKEN_SECRET=<strong-secret-key>
REFRESH_TOKEN_SECRET=<strong-secret-key>
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Security
ALLOWED_ORIGINS=https://flamoral.com,https://app.flamoral.com
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900
SESSION_SECRET=<strong-secret-key>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>

# Email (for notifications)
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASSWORD=<smtp-password>
SMTP_FROM=noreply@flamoral.com

# Environment
NODE_ENV=production
```

## Compliance

This implementation addresses requirements for:

- **OWASP Top 10**: All major vulnerabilities covered
- **GDPR**: Data protection and user consent
- **PCI DSS**: If processing payments (implement additional controls)
- **SOC 2**: Security controls and monitoring
- **ISO 27001**: Information security management

## Maintenance

### Regular Security Tasks

**Daily**:
- Review security event logs
- Monitor failed login attempts
- Check rate limit violations

**Weekly**:
- Review suspicious login reports
- Analyze attack patterns
- Update IP blocklists

**Monthly**:
- Review password breach statistics
- Audit user sessions
- Update security configurations
- Review and update dependencies

**Quarterly**:
- Perform security audit
- Update security documentation
- Review and test incident response
- Penetration testing

## Incident Response

If a security incident is detected:

1. **Immediate Actions**:
   - Identify affected users
   - Lock compromised accounts
   - Invalidate all tokens for affected users
   - Block malicious IPs

2. **Investigation**:
   - Review security logs
   - Identify attack vector
   - Assess damage scope

3. **Remediation**:
   - Patch vulnerabilities
   - Notify affected users
   - Update security measures
   - Document lessons learned

4. **Follow-up**:
   - Monitor for repeat attempts
   - Implement additional controls
   - Update incident response plan

## Additional Recommendations

### Future Enhancements

1. **Integrate virus scanning**: Use ClamAV for real-time file scanning
2. **Add biometric authentication**: Face ID, Touch ID for mobile
3. **Implement CAPTCHA**: For login and sensitive operations
4. **Add IP reputation checking**: Use threat intelligence feeds
5. **Enable Web Application Firewall**: CloudFlare, AWS WAF
6. **Implement Security Information and Event Management (SIEM)**
7. **Add honeypot endpoints**: Detect automated attacks
8. **Implement certificate pinning**: For mobile apps
9. **Add geolocation verification**: Enhanced location tracking
10. **Enable audit logging**: Comprehensive audit trail

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [HaveIBeenPwned API](https://haveibeenpwned.com/API/v3)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## Support

For security concerns or questions:
- Email: security@flamoral.com
- Security Bug Bounty: https://flamoral.com/security

---

**Last Updated**: 2025-12-11
**Version**: 1.0.0
