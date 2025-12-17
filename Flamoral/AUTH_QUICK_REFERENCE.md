# Authentication Quick Reference Guide

## Installation & Setup

### 1. Install Dependencies
```bash
cd backend/services/auth-service
npm install
```

### 2. Set Environment Variables
Copy `.env.example` to `.env` and update:
```bash
# Generate secure secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update .env files in both services:
# - backend/services/auth-service/.env
# - backend/services/api-gateway/.env
```

### 3. Start Services
```bash
# Start Redis (required)
redis-server

# Start Auth Service
cd backend/services/auth-service
npm run dev

# Start API Gateway
cd backend/services/api-gateway
npm run dev
```

## API Endpoints

### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1990-01-01",
  "gender": "male"
}

# Response: Sets httpOnly cookies (accessToken, refreshToken)
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

# Response: Sets httpOnly cookies (accessToken, refreshToken)
```

### Logout
```bash
POST /api/auth/logout
Authorization: Bearer <access_token>
# OR cookies are automatically sent

# Response: Clears httpOnly cookies
```

### Refresh Token
```bash
POST /api/auth/refresh-token
# Cookies are automatically sent

# Response: Sets new httpOnly cookies
```

### Get Current User
```bash
GET /api/auth/me
Authorization: Bearer <access_token>
# OR cookies are automatically sent
```

## Authentication Methods

### Method 1: Cookie-Based (Recommended)
```javascript
// Frontend automatically sends cookies
fetch('http://localhost:4000/api/auth/me', {
  credentials: 'include'  // Required!
})
```

### Method 2: Header-Based (Backward Compatible)
```javascript
fetch('http://localhost:4000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
})
```

## Token Expiry

- **Access Token**: 15 minutes
- **Refresh Token**: 7 days
- **Verification Token**: 24 hours
- **Password Reset Token**: 1 hour

## Security Features

### ✅ Enabled by Default
- HttpOnly cookies (XSS protection)
- SameSite=lax (CSRF protection)
- Secure flag in production (HTTPS only)
- JWT algorithm validation (HS256 only)
- Token rotation on refresh
- Token reuse detection
- Account lockout after 5 failed attempts
- Device fingerprinting
- Suspicious login detection

## Environment Variables

### Required (Auth Service)
```env
JWT_ACCESS_SECRET=<64-char-hex>
JWT_REFRESH_SECRET=<different-64-char-hex>
INTERNAL_SERVICE_KEY=<32-char-minimum>
DB_HOST=localhost
DB_PORT=5433
DB_NAME=flamoral
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_URL=redis://localhost:6379
```

### Required (API Gateway)
```env
JWT_ACCESS_SECRET=<same-as-auth-service>
JWT_REFRESH_SECRET=<same-as-auth-service>
INTERNAL_SERVICE_KEY=<same-as-auth-service>
AUTH_SERVICE_URL=http://localhost:3001
```

## Common Issues & Solutions

### Issue: "No token provided"
**Solution**: Ensure `credentials: 'include'` in fetch requests

### Issue: "Invalid or expired token"
**Solution**: Token expired, call refresh endpoint

### Issue: "Token reuse detected"
**Solution**: User session was compromised, all tokens invalidated

### Issue: CORS errors
**Solution**: Check CORS_ORIGINS in .env includes your frontend URL

### Issue: Cookies not being set
**Solution**:
- Check if cookie-parser is installed
- Verify CORS credentials are enabled
- Ensure frontend uses `credentials: 'include'`

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "first_name": "Test",
    "last_name": "User",
    "date_of_birth": "1990-01-01",
    "gender": "male"
  }' \
  -c cookies.txt
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }' \
  -c cookies.txt
```

### Get Current User (with cookies)
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -b cookies.txt
```

### Logout
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -b cookies.txt
```

## OAuth Login

### Google
```bash
# Frontend redirects to:
GET /api/oauth/google

# Callback:
GET /api/oauth/google/callback?code=<code>
```

### Facebook
```bash
# Frontend redirects to:
GET /api/oauth/facebook

# Callback:
GET /api/oauth/facebook/callback?code=<code>
```

### Apple
```bash
# Frontend redirects to:
GET /api/oauth/apple

# Callback:
POST /api/oauth/apple/callback
```

## Database Schema

### Users Table
- id (UUID)
- email (unique)
- password_hash
- first_name, last_name
- date_of_birth, gender
- is_email_verified
- is_active
- created_at, updated_at
- last_login_at

### Tokens Table (PostgreSQL)
- id (UUID)
- user_id (FK)
- token (unique)
- type (email_verification, password_reset)
- expires_at
- used_at
- created_at

### Redis Keys
- `refresh_token:{userId}` - Current refresh token
- `refresh_token_family:{tokenId}` - Token family tracking
- `refresh_token_used:{tokenId}` - Used tokens (reuse detection)
- `blacklist:{accessToken}` - Blacklisted access tokens
- `failed_attempts:{userId}` - Failed login attempts
- `account_locked:{userId}` - Account lockout flag

## Monitoring

### Key Metrics to Monitor
- Login success/failure rate
- Token refresh rate
- Token reuse detection events
- Account lockout events
- OAuth provider failures
- API response times

### Log Locations
- Auth service: stdout/stderr
- API gateway: stdout/stderr
- Redis: /var/log/redis/

## Production Checklist

- [ ] Set secure JWT secrets (64+ characters)
- [ ] Enable HTTPS (secure cookies require it)
- [ ] Set VALIDATE_JWT_SECRETS=true
- [ ] Configure proper CORS origins
- [ ] Set up Redis with persistence
- [ ] Enable rate limiting
- [ ] Configure email service (SendGrid)
- [ ] Set up OAuth credentials
- [ ] Enable production logging
- [ ] Configure monitoring and alerts
- [ ] Test token rotation
- [ ] Test account lockout
- [ ] Verify cookie settings

## Troubleshooting Commands

### Check Redis Connection
```bash
redis-cli ping
# Should return: PONG
```

### View Redis Keys
```bash
redis-cli keys "*"
redis-cli get "refresh_token:{userId}"
```

### Check PostgreSQL Connection
```bash
psql -h localhost -p 5433 -U postgres -d flamoral -c "SELECT COUNT(*) FROM users;"
```

### View Auth Service Logs
```bash
# Development
npm run dev

# Production
pm2 logs auth-service
```

## Support & Documentation

- **Full Documentation**: See `AUTHENTICATION_FIXES.md`
- **API Reference**: http://localhost:4000/api/docs
- **Health Check**: http://localhost:3001/health
- **GitHub Issues**: Submit authentication issues with logs

---

**Last Updated**: 2025-12-15
