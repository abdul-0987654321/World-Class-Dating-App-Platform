# JWT and Authentication Token Security Fixes

## Overview
This document outlines the critical security vulnerabilities that have been fixed in the Flamoral Dating Platform's JWT authentication system.

## Security Fixes Implemented

### 1. Mandatory JWT Secrets (CRITICAL)
**Problem:** Hardcoded default JWT secrets in configuration files
**Fix:**
- Removed all hardcoded default secrets
- Made `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` mandatory environment variables
- Added validation to ensure secrets are at least 32 characters long
- Application will throw error on startup if secrets are missing in production

**Files Modified:**
- `backend/services/auth-service/src/config/index.ts`
- `backend/services/user-service/src/utils/jwt.ts`

**Required Environment Variables:**
```bash
JWT_ACCESS_SECRET=<minimum 32 characters, use cryptographically secure random string>
JWT_REFRESH_SECRET=<minimum 32 characters, different from access secret>
JWT_ISSUER=flamoral-auth-service  # Optional, defaults provided
JWT_AUDIENCE=flamoral-platform     # Optional, defaults provided
```

**Generate Secure Secrets:**
```bash
# Generate a secure 64-character secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Reduced Access Token Lifetime
**Problem:** Access tokens valid for 24 hours - too long
**Fix:** Reduced to 15 minutes (industry best practice)

**Configuration:**
- Default: `15m` (15 minutes)
- Configurable via: `JWT_ACCESS_EXPIRES_IN` environment variable
- Refresh token lifetime also reduced from 30 days to 7 days

**Impact:**
- Shorter window for token theft exploitation
- More frequent token refresh required (handled automatically by refresh token flow)

### 3. Explicit JWT Algorithm Specification
**Problem:** No algorithm specified, vulnerable to algorithm confusion attacks
**Fix:**
- Explicitly set algorithm to `HS256`
- Validate algorithm during token verification
- Prevent "none" algorithm and RS256/HS256 confusion attacks

**Technical Details:**
```typescript
const signOptions: SignOptions = {
  algorithm: 'HS256',  // Explicit specification
  // ... other options
};

const verifyOptions: VerifyOptions = {
  algorithms: ['HS256'],  // Only accept HS256
  // ... other options
};
```

### 4. JWT Audience and Issuer Validation
**Problem:** No validation of token origin or intended recipient
**Fix:**
- Added `issuer` claim to all JWTs
- Added `audience` claim to all JWTs
- Validate both during token verification

**Configuration:**
```bash
JWT_ISSUER=flamoral-auth-service    # Who issued the token
JWT_AUDIENCE=flamoral-platform      # Who should accept the token
```

### 5. Refresh Token Rotation with Reuse Detection
**Problem:** Refresh tokens could be reused indefinitely, no detection of token theft
**Fix:**
- Implemented automatic token rotation on refresh
- Each refresh token has unique JWT ID (`jti` claim)
- Token family tracking in Redis
- Automatic detection and invalidation on reuse

**How It Works:**
1. User refreshes access token with refresh token A
2. System generates new refresh token B and invalidates A
3. If token A is used again, system detects reuse
4. All tokens for that user are immediately invalidated
5. User must re-authenticate

**Files Modified:**
- `backend/services/auth-service/src/infrastructure/cache/redis.ts`
- `backend/services/auth-service/src/domain/services/auth.service.ts`

### 6. Token Blacklisting on Security Events
**Problem:** No way to invalidate tokens before expiry
**Fix:** Implemented token blacklisting for:
- User logout
- Password change/reset
- Security breach detection

**Implementation:**
- Access tokens blacklisted in Redis until expiry
- Refresh tokens removed from whitelist
- Token family invalidation on security events

**Storage:**
```
Redis Keys:
- blacklist:<access_token> - Blacklisted until token expiry
- refresh_token:<user_id> - Current valid refresh token
- refresh_token_family:<jti> - Token family tracking
```

### 7. Comprehensive Error Handling
**Problem:** Generic error messages, difficult to debug
**Fix:**
- Specific error messages for different token failures
- Proper error type detection (expired, invalid, not yet valid)
- Security-conscious error messages (no information leakage)

**Error Types:**
```typescript
- "Access token has expired"
- "Invalid access token"
- "Access token not yet valid"
- "Refresh token has expired"
- "Invalid refresh token"
- "Token reuse detected. All sessions have been invalidated for security."
- "Token verification failed"
```

## Environment Setup

### Required Environment Variables
Create a `.env` file in each service directory:

```bash
# JWT Configuration (REQUIRED)
JWT_ACCESS_SECRET=<64-character hex string>
JWT_REFRESH_SECRET=<64-character hex string>

# JWT Configuration (Optional)
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=flamoral-auth-service
JWT_AUDIENCE=flamoral-platform

# Enable secret validation in development
VALIDATE_JWT_SECRETS=true

# Redis (Required for token blacklisting)
REDIS_URL=redis://localhost:6379
```

### Generate Secure Secrets

**Using Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Using OpenSSL:**
```bash
openssl rand -hex 32
```

**Using Python:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## Testing the Security Fixes

### 1. Test Token Expiry
```bash
# Login and get tokens
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Wait 15+ minutes
# Try to use the access token - should fail with "Access token has expired"
```

### 2. Test Refresh Token Rotation
```bash
# Use refresh token to get new access token
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<old_refresh_token>"}'

# Try to use the same refresh token again - should fail
```

### 3. Test Token Reuse Detection
```bash
# Refresh token once to get new tokens
# Try to use the OLD refresh token again
# Should receive: "Token reuse detected. All sessions have been invalidated for security."
```

### 4. Test Password Change Token Invalidation
```bash
# Login and get tokens
# Change password
# Try to use old access token - should be blacklisted
```

### 5. Test Algorithm Confusion Attack Prevention
```bash
# Try to create token with "none" algorithm - should fail validation
# Try to use RS256 token with HS256 verification - should fail
```

## Migration Guide

### For Existing Deployments

1. **Generate Secure Secrets**
   ```bash
   JWT_ACCESS_SECRET=$(openssl rand -hex 32)
   JWT_REFRESH_SECRET=$(openssl rand -hex 32)
   ```

2. **Update Environment Variables**
   - Add secrets to your deployment environment
   - Update `.env` files for local development
   - Update Kubernetes secrets / Azure Key Vault / AWS Secrets Manager

3. **Deploy Services**
   - Deploy auth-service first
   - Deploy user-service
   - Monitor logs for any JWT-related errors

4. **Invalidate Existing Tokens**
   - All existing tokens will become invalid due to secret change
   - Users will need to re-authenticate
   - Communicate this to users in advance

### Zero-Downtime Migration (Advanced)

1. **Phase 1: Add new secrets without removing old**
   - Support both old and new secrets temporarily
   - Requires custom verification logic

2. **Phase 2: Issue new tokens with new secret**
   - New logins get new tokens
   - Old tokens still valid

3. **Phase 3: Remove old secret support**
   - After sufficient time (7 days), stop accepting old tokens
   - All users will have transitioned to new tokens

## Security Best Practices

### 1. Secret Rotation
- Rotate JWT secrets quarterly
- Use different secrets per environment (dev, staging, prod)
- Never commit secrets to version control

### 2. Token Lifetime
- Keep access tokens short (15 minutes recommended)
- Keep refresh tokens reasonable (7 days recommended)
- Consider user experience vs security trade-offs

### 3. HTTPS Only
- Always use HTTPS in production
- Set secure cookie flags
- Use HSTS headers

### 4. Monitoring
- Monitor for unusual token refresh patterns
- Alert on token reuse detection
- Track failed authentication attempts

### 5. Logging
- Log security events (password changes, token reuse)
- Don't log token values
- Log with user context for audit trails

## Troubleshooting

### Error: "JWT_ACCESS_SECRET is required"
**Cause:** Missing environment variable
**Solution:** Set `JWT_ACCESS_SECRET` in your environment

### Error: "JWT_ACCESS_SECRET must be at least 32 characters long"
**Cause:** Secret too short
**Solution:** Generate a new 32+ character secret

### Error: "Access token has expired"
**Cause:** Token older than 15 minutes
**Solution:** Use refresh token to get new access token

### Error: "Token reuse detected"
**Cause:** Attempted to reuse an old refresh token
**Solution:** Re-authenticate to get new tokens

### Error: "Invalid access token"
**Cause:** Token signature verification failed
**Solution:** Check that JWT_ACCESS_SECRET matches between token creation and verification

## Performance Considerations

### Redis Usage
- Token blacklisting requires Redis
- Keys auto-expire (no manual cleanup needed)
- Minimal performance impact

### Token Size
- Tokens slightly larger due to iss/aud claims
- Negligible impact on network traffic
- Benefits far outweigh size increase

## Compliance

These fixes help meet compliance requirements for:
- **OWASP Top 10**: Addresses A2 (Broken Authentication)
- **PCI DSS**: Strong authentication requirements
- **GDPR**: Data protection by design
- **SOC 2**: Access control requirements

## Additional Resources

- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [RFC 7519 - JSON Web Token](https://tools.ietf.org/html/rfc7519)
- [Auth0 JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

## Support

For issues or questions:
1. Check this documentation
2. Review server logs
3. Contact the security team
4. Open a ticket in the issue tracker

---

**Last Updated:** 2025-12-11
**Version:** 1.0
**Author:** Security Team
