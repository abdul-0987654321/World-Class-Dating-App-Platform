# Security Fixes Quick Start Guide

## Installation (5 Minutes)

### Option 1: PowerShell (Windows)
```powershell
.\apply-security-fixes-complete.ps1
```

### Option 2: Bash (Linux/Mac/WSL)
```bash
chmod +x apply-security-fixes-complete.sh
./apply-security-fixes-complete.sh
```

### Option 3: Manual Installation
```bash
cd backend/services/auth-service
npm install jwks-rsa
```

---

## Configuration (10 Minutes)

### 1. Generate JWT Secrets
```bash
# Generate JWT Access Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT Refresh Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Update Auth Service Environment
Edit `backend/services/auth-service/.env`:
```env
# Replace with generated secrets
JWT_ACCESS_SECRET=<paste-first-secret-here>
JWT_REFRESH_SECRET=<paste-second-secret-here>
```

### 3. Enable CSRF Protection
Edit `backend/services/api-gateway/.env`:
```env
ENABLE_CSRF_PROTECTION=true
```

### 4. Configure OAuth (Optional)
Edit `backend/services/auth-service/.env`:
```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Facebook OAuth
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Apple OAuth
APPLE_CLIENT_ID=com.flamoral.app
APPLE_TEAM_ID=your-apple-team-id
```

---

## Restart Services (2 Minutes)

```bash
# Terminal 1 - Auth Service
cd backend/services/auth-service
npm run dev

# Terminal 2 - API Gateway
cd backend/services/api-gateway
npm run dev
```

---

## Verify Installation (3 Minutes)

### 1. Check Logs
Auth service should show:
```
Connected to Redis for rate limiting
Redis ready for rate limiting operations
```

No OAuth errors should appear (only warnings if not configured).

### 2. Test OAuth (if configured)
```bash
curl -X POST http://localhost:3001/api/auth/oauth/google \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "test-token"}'
```

Should return proper error (not crash):
```json
{
  "success": false,
  "error": "Invalid Google access token"
}
```

### 3. Test CSRF Protection
```bash
# Should return CSRF token in header
curl -i http://localhost:4000/api/v1/api/health
```

Look for: `X-CSRF-Token: <token>`

---

## What Was Fixed

✅ **OAuth Security (CRITICAL)**
- Google: Added token audience validation
- Facebook: Added debug_token verification
- Apple: Added proper JWT signature verification (was completely insecure!)

✅ **Password Security (HIGH)**
- Increased bcrypt from 12 to 14 rounds
- Added secure password generation for OAuth users

✅ **JWT Security (HIGH)**
- Reduced token expiry (15m access, 7d refresh)
- Added token rotation and reuse detection
- Enforced minimum 32-character secrets

✅ **CSRF Protection (HIGH)**
- Enabled by default
- Cryptographically secure tokens
- Double-submit cookie pattern

✅ **Session Management (MEDIUM)**
- Verified: Already implements best practices
- Device tracking and suspicious login detection

✅ **Rate Limiting (MEDIUM)**
- Verified: Already implements comprehensive limits
- Redis-backed with in-memory fallback

✅ **Input Sanitization (MEDIUM)**
- Verified: Comprehensive XSS and injection protection

✅ **Security Headers (MEDIUM)**
- Verified: CSP, HSTS, and all recommended headers

---

## Troubleshooting

### OAuth Not Working
1. Check logs for configuration warnings
2. Verify credentials in `.env` file
3. Test with valid tokens from actual OAuth providers

### CSRF Errors
1. Check `ENABLE_CSRF_PROTECTION=true` in API Gateway .env
2. Verify cookies are enabled in client
3. Check CORS configuration allows credentials

### JWT Errors
1. Verify secrets are set and at least 32 characters
2. Check Redis is running for token blacklist
3. Verify token expiry times are acceptable

### Rate Limiting Issues
1. Check Redis connection
2. Verify rate limit configuration in .env
3. Check for IP-based limits (whitelist if needed)

---

## Production Deployment

### Before Deploying:
- [ ] All JWT secrets are set to strong random values (32+ chars)
- [ ] OAuth credentials are configured (if using social login)
- [ ] CSRF protection is enabled
- [ ] Redis is configured and running
- [ ] Environment-specific .env files are created
- [ ] All secrets are stored in Azure Key Vault (production)

### After Deploying:
- [ ] Verify OAuth login works with real credentials
- [ ] Test JWT token rotation
- [ ] Verify CSRF protection doesn't break legitimate requests
- [ ] Monitor logs for security events
- [ ] Test rate limiting doesn't block legitimate users

---

## Security Checklist

### Development
- [ ] Use strong JWT secrets (not defaults)
- [ ] Test OAuth with actual providers
- [ ] Verify CSRF tokens are generated
- [ ] Check password hashing uses 14 rounds

### Staging
- [ ] All OAuth providers configured
- [ ] CSRF protection enabled
- [ ] Rate limiting tested
- [ ] Security headers verified

### Production
- [ ] All secrets in Azure Key Vault
- [ ] OAuth production credentials configured
- [ ] CSRF protection enabled
- [ ] Rate limiting appropriate for production traffic
- [ ] Monitoring and alerting configured
- [ ] Security headers enforced
- [ ] HTTPS enforced

---

## Getting Help

### Issues with OAuth:
- Check: `backend/services/auth-service/src/domain/services/oauth.service.ts`
- Logs will show specific OAuth errors

### Issues with JWT:
- Check: `backend/services/auth-service/src/utils/jwt.ts`
- Check: `backend/services/auth-service/src/config/index.ts`

### Issues with CSRF:
- Check: `backend/services/api-gateway/src/middleware/csrf.middleware.ts`
- Check: `backend/services/api-gateway/.env`

### Full Report:
See `SECURITY_FIXES_COMPLETE_REPORT.md` for comprehensive details.

---

## Next Steps

1. **Install dependencies**: Run the installation script
2. **Configure secrets**: Generate and set JWT secrets
3. **Enable CSRF**: Update API Gateway .env
4. **Configure OAuth**: Add provider credentials (optional)
5. **Test**: Verify all services start without errors
6. **Deploy**: Follow production deployment checklist

---

**Total Time: ~20 minutes**
**Difficulty: Easy**
**Impact: Critical security improvements**

---

*Last Updated: 2025-12-15*
