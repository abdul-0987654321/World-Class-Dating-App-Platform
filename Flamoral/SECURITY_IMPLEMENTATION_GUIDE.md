# Security Implementation Guide - Flamoral Dating Platform

## Overview

This guide provides step-by-step instructions to implement the security fixes across the Flamoral dating platform. All necessary corrected configuration files have been created in this directory.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Files to Replace](#files-to-replace)
3. [Environment Configuration](#environment-configuration)
4. [Verification Steps](#verification-steps)
5. [Deployment Checklist](#deployment-checklist)
6. [Rollback Procedures](#rollback-procedures)

---

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Access to all microservice repositories
- Redis instance running (for rate limiting)
- Environment variable access

### Installation Steps

```bash
# 1. Navigate to Flamoral root directory
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral

# 2. Generate JWT secrets
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# 3. Save the generated secrets securely

# 4. Apply the security fixes (see Files to Replace section)

# 5. Update environment variables

# 6. Run security scans
npm run security:scan

# 7. Test the changes
npm run test:security
```

---

## Files to Replace

### Critical Files (Must be updated immediately)

#### 1. API Gateway Security Headers
**Source**: `backend/services/api-gateway/src/middleware/security-headers.middleware.FIXED.ts`
**Destination**: `backend/services/api-gateway/src/middleware/security-headers.middleware.ts`

```bash
# Backup original
cp backend/services/api-gateway/src/middleware/security-headers.middleware.ts \
   backend/services/api-gateway/src/middleware/security-headers.middleware.ts.backup

# Apply fix
cp backend/services/api-gateway/src/middleware/security-headers.middleware.FIXED.ts \
   backend/services/api-gateway/src/middleware/security-headers.middleware.ts
```

**Changes Made**:
- Fixed `ConfigService.get('NODE_ENV')` usage instead of `process.env.NODE_ENV`
- Added `webDomain` and `cdnDomain` configuration
- Updated CSP report URI to `/api/v1/security/csp-report`
- Added CDN domain to CSP directives
- Added Google reCAPTCHA domains to frame-src and script-src
- Added API versioned paths to sensitive endpoint detection

#### 2. Gitleaks Configuration
**Source**: `.gitleaks.toml.ENHANCED`
**Destination**: `.gitleaks.toml`

```bash
# Backup original
cp .gitleaks.toml .gitleaks.toml.backup

# Apply enhancement
cp .gitleaks.toml.ENHANCED .gitleaks.toml
```

**Enhancements**:
- Added MongoDB Atlas connection string detection
- Added Google Service Account private key detection
- Added Firebase API key detection
- Enhanced test file exclusions
- Added `.FIXED` and `.ENHANCED` file patterns to exclusions

#### 3. Checkov Configuration
**Source**: `.checkov.yaml.ENHANCED`
**Destination**: `.checkov.yaml`

```bash
# Backup original
cp .checkov.yaml .checkov.yaml.backup

# Apply enhancement
cp .checkov.yaml.ENHANCED .checkov.yaml
```

**Enhancements**:
- Added PostgreSQL SSL enforcement checks
- Added Azure Active Directory authentication requirements
- Separated production and development profiles
- Enhanced hard-fail checks for production
- Better organization and documentation

### Important Files (Should be reviewed and updated)

#### 4. CORS Configuration (All Microservices)

Apply the standardized CORS configuration from `backend/services/CORS_CONFIG_STANDARD.ts` to all microservices:

**Services to Update**:
- `backend/services/auth-service/src/main.ts`
- `backend/services/user-service/src/main.ts`
- `backend/services/payment-service/src/main.ts`
- `backend/services/matching-service/src/main.ts`
- `backend/services/messaging-service/src/main.ts`
- `backend/services/media-service/src/main.ts`
- `backend/services/analytics-service/src/main.ts`
- `backend/services/moderation-service/src/main.ts`
- `backend/services/notification-service/src/main.ts`

**Implementation**:
1. Copy `setupCORS()` function from `CORS_CONFIG_STANDARD.ts`
2. Replace existing `app.enableCors()` call
3. Add import: `import { setupCORS } from './cors.config';` (after copying file)

**Alternative** (Inline implementation):
```typescript
// In each service's main.ts, replace CORS configuration with:

const corsOriginsString = configService.get<string>('CORS_ORIGINS');
const corsOrigins = corsOriginsString
  ? corsOriginsString.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000',
      'http://localhost:4000',
      'http://localhost:5173',
      'http://localhost:5174',
      'https://flamoral.com',
      'https://www.flamoral.com',
      'https://app.flamoral.com',
      'https://admin.flamoral.com',
    ];

app.enableCors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const isAllowed = corsOrigins.some(allowedOrigin => {
      if (allowedOrigin === '*') return true;
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return allowedOrigin === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS: Origin ${origin} not allowed`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-ID',
    'X-Correlation-ID',
    'X-CSRF-Token',
    'x-csrf-token',
    'X-API-Key',
    'X-Internal-Service-Key',
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-CSRF-Token',
  ],
  maxAge: 86400,
});
```

---

## Environment Configuration

### 1. Generate JWT Secrets

```bash
# Generate JWT Access Secret (save this output)
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT Refresh Secret (save this output, MUST be different from above)
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate Internal Service Key
node -e "console.log('INTERNAL_SERVICE_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate Admin Override Secret
node -e "console.log('ADMIN_OVERRIDE_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Update Environment Variables

#### API Gateway (.env)
```bash
# Add/Update in backend/services/api-gateway/.env
JWT_ACCESS_SECRET=<generated-64-char-hex-string>
JWT_REFRESH_SECRET=<different-64-char-hex-string>
INTERNAL_SERVICE_KEY=<generated-64-char-hex-string>
ADMIN_OVERRIDE_SECRET=<generated-64-char-hex-string>

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://flamoral.com,https://www.flamoral.com,https://app.flamoral.com,https://admin.flamoral.com
CORS_CREDENTIALS=true

# Security Headers
CSP_REPORT_URI=/api/v1/security/csp-report
API_DOMAIN=https://api.flamoral.com
WEB_DOMAIN=https://flamoral.com
CDN_DOMAIN=https://cdn.flamoral.com

# JWT Configuration
JWT_ISSUER=flamoral-auth-service
JWT_AUDIENCE=flamoral-platform
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis Configuration (for rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
RATE_LIMIT_USER_POINTS=1000
RATE_LIMIT_IP_POINTS=500
RATE_LIMIT_AUTH_POINTS=5
```

#### Auth Service (.env)
```bash
# Add/Update in backend/services/auth-service/.env
JWT_ACCESS_SECRET=<same-as-api-gateway>
JWT_REFRESH_SECRET=<same-as-api-gateway>
JWT_ISSUER=flamoral-auth-service
JWT_AUDIENCE=flamoral-platform
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
VALIDATE_JWT_SECRETS=true

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:4000,http://localhost:5173,https://flamoral.com,https://www.flamoral.com,https://app.flamoral.com
```

#### All Other Microservices (.env)
```bash
# Add to each service's .env file
JWT_ACCESS_SECRET=<same-as-api-gateway>
JWT_ISSUER=flamoral-auth-service
JWT_AUDIENCE=flamoral-platform
CORS_ORIGINS=http://localhost:3000,http://localhost:4000,http://localhost:5173,https://flamoral.com,https://www.flamoral.com,https://app.flamoral.com
INTERNAL_SERVICE_KEY=<same-as-api-gateway>
```

### 3. Environment Variable Checklist

Use this checklist to ensure all required environment variables are set:

- [ ] JWT_ACCESS_SECRET (64+ characters, same across all services)
- [ ] JWT_REFRESH_SECRET (64+ characters, different from access secret)
- [ ] JWT_ISSUER (same across all services)
- [ ] JWT_AUDIENCE (same across all services)
- [ ] INTERNAL_SERVICE_KEY (64+ characters, same across all services)
- [ ] CORS_ORIGINS (comma-separated list of allowed origins)
- [ ] REDIS_HOST (for rate limiting)
- [ ] REDIS_PORT (for rate limiting)
- [ ] CSP_REPORT_URI (API Gateway only)
- [ ] API_DOMAIN (API Gateway only)
- [ ] WEB_DOMAIN (API Gateway only)
- [ ] CDN_DOMAIN (API Gateway only)

---

## Verification Steps

### 1. Verify JWT Configuration

```bash
# Test JWT secret strength
node -e "
const secrets = [
  process.env.JWT_ACCESS_SECRET,
  process.env.JWT_REFRESH_SECRET,
  process.env.INTERNAL_SERVICE_KEY
];
secrets.forEach((s, i) => {
  if (!s || s.length < 32) {
    console.error(\`Secret \${i} is too weak! Length: \${s?.length || 0}\`);
    process.exit(1);
  } else {
    console.log(\`Secret \${i}: ✓ (\${s.length} chars)\`);
  }
});
console.log('All secrets meet minimum requirements ✓');
"
```

### 2. Test CORS Configuration

```bash
# Test CORS with allowed origin
curl -H "Origin: https://app.flamoral.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     -v \
     http://localhost:4000/api/v1/api/auth/login

# Expected: 204 No Content with Access-Control-Allow-Origin header

# Test CORS with disallowed origin
curl -H "Origin: https://malicious-site.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     -v \
     http://localhost:4000/api/v1/api/auth/login

# Expected: Error or no CORS headers
```

### 3. Test Rate Limiting

```bash
# Test rate limiting (should fail after configured limit)
for i in {1..150}; do
  echo "Request $i:"
  curl -w "%{http_code}\n" http://localhost:4000/api/v1/api/health
  sleep 0.1
done

# Expected: 200 responses until limit, then 429 Too Many Requests
```

### 4. Test Security Headers

```bash
# Check security headers are present
curl -I http://localhost:4000/api/v1/api/health

# Expected headers:
# Content-Security-Policy: ...
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: strict-origin-when-cross-origin
# Permissions-Policy: ...
```

### 5. Run Security Scans

```bash
# Scan for secrets with Gitleaks
gitleaks detect --config .gitleaks.toml --verbose --no-git

# Expected: No secrets found (or only false positives in test files)

# Scan infrastructure with Checkov
cd terraform
checkov --config-file ../.checkov.yaml --directory .

# Expected: All critical checks pass, warnings acceptable for development

# Run npm audit
npm audit --audit-level=moderate

# Expected: No critical or high vulnerabilities
```

### 6. Test JWT Token Generation and Validation

```bash
# Test token generation (requires auth service running)
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Save the access_token from response

# Test token validation (requires API gateway running)
curl -H "Authorization: Bearer <access_token>" \
     http://localhost:4000/api/v1/api/users/me

# Expected: 200 OK with user data
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All security fixes applied
- [ ] JWT secrets generated and securely stored
- [ ] Environment variables updated in all services
- [ ] CORS origins configured for production domains
- [ ] Redis instance configured for rate limiting
- [ ] Security scans completed (Gitleaks, Checkov, npm audit)
- [ ] All tests passing
- [ ] Code reviewed by security team

### Development Deployment

- [ ] Deploy to development environment
- [ ] Verify all services start successfully
- [ ] Test authentication flow
- [ ] Test token refresh flow
- [ ] Test CORS from frontend applications
- [ ] Test rate limiting behavior
- [ ] Verify security headers present
- [ ] Check logs for any errors

### Staging Deployment

- [ ] Deploy to staging environment
- [ ] Run full integration test suite
- [ ] Perform security penetration testing
- [ ] Test with production-like data
- [ ] Verify performance under load
- [ ] Test failover scenarios (Redis down, etc.)

### Production Deployment

- [ ] Schedule maintenance window
- [ ] Notify users of planned downtime
- [ ] Backup current configuration
- [ ] Deploy in rolling fashion (one service at a time)
- [ ] Monitor error rates and response times
- [ ] Verify authentication working
- [ ] Test critical user flows
- [ ] Monitor for 24 hours post-deployment

### Post-Deployment

- [ ] Document any issues encountered
- [ ] Update runbooks with new procedures
- [ ] Schedule secret rotation (quarterly)
- [ ] Review security metrics
- [ ] Update security documentation

---

## Rollback Procedures

### If Issues Arise

#### 1. API Gateway Rollback

```bash
# Restore backed up middleware
cp backend/services/api-gateway/src/middleware/security-headers.middleware.ts.backup \
   backend/services/api-gateway/src/middleware/security-headers.middleware.ts

# Restart service
pm2 restart api-gateway

# Or with Docker
docker-compose restart api-gateway
```

#### 2. Gitleaks Configuration Rollback

```bash
# Restore original configuration
cp .gitleaks.toml.backup .gitleaks.toml
```

#### 3. Checkov Configuration Rollback

```bash
# Restore original configuration
cp .checkov.yaml.backup .checkov.yaml
```

#### 4. Environment Variable Rollback

```bash
# Restore from backup (ensure you have backups!)
cp .env.backup .env

# Restart affected services
pm2 restart all
```

### Emergency Rollback (Complete)

```bash
# 1. Stop all services
pm2 stop all

# 2. Restore all backed up files
find . -name "*.backup" -exec bash -c 'cp "$1" "${1%.backup}"' _ {} \;

# 3. Restore environment variables
# (This must be done manually or from backup system)

# 4. Restart all services
pm2 restart all

# 5. Verify system is operational
curl http://localhost:4000/health
```

---

## Security Monitoring

### Metrics to Monitor

1. **Authentication Metrics**:
   - Login attempts (success/failure)
   - Token generation rate
   - Token validation failures
   - Refresh token usage

2. **Rate Limiting Metrics**:
   - 429 response rates
   - Redis health status
   - Fallback to in-memory cache events

3. **CORS Violations**:
   - Blocked origin attempts
   - Preflight request failures

4. **CSP Violations**:
   - CSP report endpoint hits
   - Types of violations

### Alerting Thresholds

- **Critical**: Token validation failure rate > 10%
- **High**: 429 rate > 5% of total requests
- **Medium**: Redis connection failures
- **Low**: CSP violations

### Log Analysis

```bash
# Check for authentication failures
grep "UnauthorizedException" logs/*.log

# Check for rate limiting
grep "Too Many Requests" logs/*.log

# Check for CORS violations
grep "CORS: Origin.*not allowed" logs/*.log
```

---

## Maintenance Schedule

### Weekly
- Review security logs
- Check for new npm vulnerabilities
- Monitor authentication metrics

### Monthly
- Run Gitleaks scan
- Run Checkov scan
- Review and update CORS origins
- Review rate limiting thresholds

### Quarterly
- Rotate JWT secrets
- Review and update security policies
- Security team review
- Penetration testing

### Annually
- Full security audit
- Update compliance documentation
- Review and update .checkov.yaml hard-fail checks
- Review and update .gitleaks.toml rules

---

## Support and Resources

### Documentation
- [SECURITY_FIXES.md](./SECURITY_FIXES.md) - Detailed security fix documentation
- [JWT_CONFIG.env.template](./backend/services/JWT_CONFIG.env.template) - JWT configuration template
- [CORS_CONFIG_STANDARD.ts](./backend/services/CORS_CONFIG_STANDARD.ts) - CORS configuration standard

### Security Tools
- Gitleaks: https://github.com/gitleaks/gitleaks
- Checkov: https://www.checkov.io/
- OWASP: https://owasp.org/

### Internal Contacts
- Security Team: security@flamoral.com
- DevOps Team: devops@flamoral.com
- On-call: oncall@flamoral.com

---

## Troubleshooting

### Common Issues

#### "Invalid token" errors after deployment

**Cause**: JWT_ACCESS_SECRET mismatch between services

**Solution**:
1. Verify JWT_ACCESS_SECRET is identical in all service .env files
2. Restart all services
3. Clear any cached tokens

```bash
# Verify secrets match
grep JWT_ACCESS_SECRET backend/services/*/.env | sort | uniq
# Should show only one unique value
```

#### CORS errors from frontend

**Cause**: Frontend origin not in CORS_ORIGINS

**Solution**:
1. Add frontend origin to CORS_ORIGINS
2. Restart API Gateway
3. Clear browser cache

```bash
# Update CORS_ORIGINS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://app.flamoral.com,<new-origin>
```

#### Rate limiting too aggressive

**Cause**: Thresholds too low for actual traffic

**Solution**:
1. Increase THROTTLE_LIMIT or RATE_LIMIT_USER_POINTS
2. Restart API Gateway
3. Monitor 429 response rates

```bash
# Increase limits
THROTTLE_LIMIT=200
RATE_LIMIT_USER_POINTS=2000
```

#### Redis connection failures

**Cause**: Redis not running or connection misconfigured

**Solution**:
1. Verify Redis is running: `redis-cli ping`
2. Check REDIS_HOST and REDIS_PORT
3. Rate limiter will fall back to in-memory cache

```bash
# Test Redis connection
redis-cli -h localhost -p 6379 ping
# Expected: PONG
```

---

## Success Criteria

Deployment is considered successful when:

- [ ] All services start without errors
- [ ] Authentication works end-to-end
- [ ] Token refresh works correctly
- [ ] Rate limiting is functional
- [ ] CORS allows correct origins and blocks others
- [ ] Security headers are present in responses
- [ ] No secret leaks detected by Gitleaks
- [ ] Infrastructure passes Checkov scans
- [ ] No regression in existing functionality
- [ ] Performance metrics are acceptable
- [ ] Error rates are within normal range

---

**Document Version**: 1.0
**Last Updated**: 2025-12-16
**Next Review**: 2026-01-16
