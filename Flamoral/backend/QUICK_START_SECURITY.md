# Quick Start - JWT Security Setup

## 1. Generate Secrets (DO THIS FIRST!)

```bash
# Generate two different 64-character secrets
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

## 2. Update .env File

Copy the output from above and add to your `.env` file:

```bash
# Auth Service: backend/services/auth-service/.env
JWT_ACCESS_SECRET=<your-generated-access-secret-here>
JWT_REFRESH_SECRET=<your-generated-refresh-secret-here>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
VALIDATE_JWT_SECRETS=true
```

```bash
# User Service: backend/services/user-service/.env
JWT_ACCESS_SECRET=<same-access-secret-as-above>
JWT_REFRESH_SECRET=<same-refresh-secret-as-above>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

⚠️ **IMPORTANT:** Use the SAME secrets in both services!

## 3. Start Services

```bash
# Start Redis (required for token blacklisting)
docker run -d -p 6379:6379 redis:alpine

# Start Auth Service
cd backend/services/auth-service
npm install
npm run dev

# Start User Service
cd backend/services/user-service
npm install
npm run dev
```

## 4. Test the Setup

```bash
# Test script
cd backend/services/auth-service
node test-jwt-security.js

# Should see:
# ✅ All security tests passed
# ✅ Tokens include issuer and audience
# ✅ Algorithm validation working
```

## 5. Verify in Your App

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'

# Response should include:
# - accessToken (expires in 15 minutes)
# - refreshToken (expires in 7 days)
```

## Common Issues

### Error: "JWT_ACCESS_SECRET is required"
**Fix:** Set the environment variable in your `.env` file

### Error: "JWT_ACCESS_SECRET must be at least 32 characters long"
**Fix:** Generate a new secret using the command in step 1

### Error: "Redis connection failed"
**Fix:** Make sure Redis is running (`docker ps` should show redis container)

### Tokens expire too quickly
**Expected:** Access tokens expire in 15 minutes (this is correct!)
**Solution:** Use the refresh token to get a new access token

## What Changed?

| Before | After | Why |
|--------|-------|-----|
| Access token: 24h | Access token: 15m | Reduce theft window |
| Hardcoded secrets | Mandatory secrets | Security |
| No rotation | Auto-rotation | Prevent token reuse |
| No algorithm check | Explicit HS256 | Prevent attacks |
| No blacklisting | Redis blacklisting | Logout/password change |

## Need More Info?

- Full documentation: `backend/SECURITY_FIXES_JWT.md`
- All changes: `backend/SECURITY_AUDIT_FIXES_SUMMARY.md`
- Questions? Contact security@flamoral.com

## Production Deployment

1. Generate production secrets (different from dev!)
2. Store in Azure Key Vault / AWS Secrets Manager
3. Update Kubernetes secrets
4. Deploy auth-service first, then user-service
5. Monitor logs for errors
6. All existing user sessions will be invalidated (expected)

---

**Last Updated:** 2025-12-11
**Ready for Development:** ✅ YES
**Ready for Production:** ✅ YES (after secret setup)
