# Security Features Quick Start Guide
## Flamoral Dating Platform

This guide helps developers quickly get started with the security and safety features.

---

## 🚀 Quick Setup

### 1. Database Migration

Run the security features migration:

```bash
cd database
psql -U your_user -d flamoral_db -f migrations/20250120_add_security_features.sql
```

### 2. Environment Variables

Add these to your `.env` file:

```env
# Redis (Required for rate limiting)
REDIS_URL=redis://localhost:6379

# Twilio (Required for SMS 2FA)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid (Required for email 2FA)
SENDGRID_API_KEY=your_sendgrid_key

# Azure Face API (Required for photo verification)
AZURE_FACE_API_KEY=your_azure_key
AZURE_FACE_API_ENDPOINT=https://your-region.api.cognitive.microsoft.com

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
```

### 3. Install Dependencies

```bash
# Backend
cd backend/services/user-service
npm install

# If not already installed, add:
npm install redis twilio @sendgrid/mail jsonwebtoken
```

### 4. Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or install locally
brew install redis  # macOS
redis-server
```

---

## 🔐 Feature Usage Examples

### Two-Factor Authentication (2FA)

**Setup TOTP:**

```typescript
// Generate TOTP secret
const response = await fetch('/api/auth/2fa/setup/totp', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const { secret, qrCodeUrl } = await response.json();

// Display QR code to user
// User scans with Google Authenticator/Authy

// Verify and enable
const enableResponse = await fetch('/api/auth/2fa/enable', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    method: '2fa_totp',
    verificationCode: '123456', // From authenticator app
  }),
});

const { backupCodes } = await enableResponse.json();
// Save backup codes securely
```

**Verify TOTP during login:**

```typescript
// After password validation
const verifyResponse = await fetch('/api/auth/2fa/verify/totp', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${tempToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    code: '123456',
  }),
});
```

### Biometric Authentication

**Enroll Device:**

```typescript
// Mobile (React Native)
import BiometricAuth from './services/biometric-auth';

// Generate key pair on device
const { publicKey } = await BiometricAuth.generateKeyPair();

// Send to server
const enrollResponse = await fetch('/api/auth/biometric/enroll', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    deviceId: DeviceInfo.getUniqueId(),
    deviceName: await DeviceInfo.getDeviceName(),
    biometricType: 'face_id', // or 'touch_id', 'fingerprint'
    publicKey,
  }),
});
```

**Authenticate with Biometric:**

```typescript
// Request challenge
const challengeResponse = await fetch('/api/auth/biometric/challenge', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: user.id,
    deviceId: DeviceInfo.getUniqueId(),
  }),
});

const { challenge, expiresAt } = await challengeResponse.json();

// Sign challenge with biometric
const signature = await BiometricAuth.signChallenge(challenge);

// Verify
const verifyResponse = await fetch('/api/auth/biometric/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: user.id,
    deviceId: DeviceInfo.getUniqueId(),
    challenge,
    signature,
  }),
});

const { token } = await verifyResponse.json();
```

### Photo Verification

**Request Verification:**

```typescript
const requestResponse = await fetch('/api/verification/photo/request', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const { verificationId, pose, expiresAt } = await requestResponse.json();

// Display pose instruction to user
// e.g., "Please smile for the camera"

// User takes selfie
const photoUri = await takePhoto();

// Upload and verify
const formData = new FormData();
formData.append('verificationId', verificationId);
formData.append('photo', {
  uri: photoUri,
  type: 'image/jpeg',
  name: 'verification.jpg',
});

const submitResponse = await fetch('/api/verification/photo/submit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

const { verified, confidence, reason } = await submitResponse.json();

if (verified) {
  // User is now verified with badge
  alert('Congratulations! You are now verified.');
} else {
  alert(`Verification failed: ${reason}`);
}
```

### Block/Report User

**Block User:**

```typescript
const blockResponse = await fetch(`/api/safety/block/${targetUserId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    reason: 'Inappropriate behavior',
  }),
});
```

**Report User:**

```typescript
const reportResponse = await fetch('/api/safety/report', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    reportedId: targetUserId,
    reportType: 'inappropriate_messages',
    description: 'User sent offensive messages',
    severity: 'high',
  }),
});
```

### Rate Limiting

**Apply Rate Limiting to Route:**

```typescript
import { authRateLimiter, reportRateLimiter } from './middleware/rate-limit.middleware';

// Apply to specific routes
router.post('/api/auth/login', authRateLimiter, loginController);
router.post('/api/safety/report', reportRateLimiter, reportController);

// Custom rate limiter
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';

const customLimiter = RateLimitMiddleware.createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  keyPrefix: 'custom',
  message: 'Too many requests',
});

router.post('/api/custom', customLimiter, customController);
```

---

## 🧪 Testing

### Run Security Tests

```bash
# All security tests
npm run test:security

# Specific tests
npm run test:security:2fa
npm run test:security:ratelimit
npm run test:security:moderation
npm run test:security:auth
```

### Manual Testing

**Test 2FA:**

```bash
# 1. Generate TOTP secret
curl -X POST http://localhost:3000/api/auth/2fa/setup/totp \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Use authenticator app to generate code

# 3. Enable 2FA
curl -X POST http://localhost:3000/api/auth/2fa/enable \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method":"2fa_totp","verificationCode":"123456"}'
```

**Test Rate Limiting:**

```bash
# Send multiple requests quickly
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' &
done
wait

# Should see 429 Too Many Requests after threshold
```

---

## 🔧 Troubleshooting

### Redis Connection Error

**Error:** `Redis Client Error: connect ECONNREFUSED`

**Solution:**
```bash
# Check if Redis is running
redis-cli ping

# If not, start Redis
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### 2FA Not Working

**Issue:** TOTP codes not validating

**Checklist:**
- ✅ Server time is synchronized (NTP)
- ✅ Secret is properly base32 encoded
- ✅ Code is 6 digits
- ✅ Using current timestamp
- ✅ Time drift tolerance set (±30 seconds)

**Test:**
```bash
# Check server time
date

# Sync time (if needed)
sudo ntpdate -s time.nist.gov
```

### Photo Verification Failing

**Issue:** All photos rejected

**Checklist:**
- ✅ Azure Face API credentials configured
- ✅ API endpoint is correct
- ✅ Photo is clear and well-lit
- ✅ Face is visible
- ✅ Photo is recent
- ✅ User has profile photos to match against

**Debug:**
```typescript
// Check API response
const result = await photoVerificationService.verifyPhoto(
  userId,
  photoUrl,
  'smile'
);
console.log('Verification result:', result);
```

### Rate Limiting Too Strict

**Issue:** Legitimate users getting rate limited

**Solution:**

```typescript
// Adjust thresholds in rate-limit.middleware.ts
export const authRateLimiter = RateLimitMiddleware.createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10, // Increase from 5
  keyPrefix: 'auth',
});

// Or implement tiered rate limiting
const tieredLimiter = RateLimitMiddleware.tieredRateLimiter({
  free: { windowMs: 60000, maxRequests: 10 },
  premium: { windowMs: 60000, maxRequests: 50 },
  vip: { windowMs: 60000, maxRequests: 1000 },
});
```

---

## 📊 Monitoring

### Check Security Logs

```sql
-- Recent login attempts
SELECT * FROM login_attempts
ORDER BY attempted_at DESC
LIMIT 100;

-- Failed logins by IP
SELECT ip_address, COUNT(*) as failed_count
FROM login_attempts
WHERE successful = false
  AND attempted_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
ORDER BY failed_count DESC;

-- Active 2FA users
SELECT COUNT(*) FROM user_two_factor_auth
WHERE is_enabled = true;

-- Photo verification stats
SELECT status, COUNT(*)
FROM photo_verification_requests
GROUP BY status;

-- Recent reports
SELECT report_type, COUNT(*)
FROM user_reports
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY report_type;
```

### Monitor Rate Limiting

```bash
# Check Redis rate limit keys
redis-cli KEYS "rate_limit:*"

# Check specific user rate limit
redis-cli GET "rate_limit:127.0.0.1:/api/auth/login"
```

---

## 🎯 Best Practices

### 1. Always Use HTTPS

```typescript
// Enforce HTTPS in production
if (process.env.NODE_ENV === 'production' && !req.secure) {
  return res.redirect('https://' + req.headers.host + req.url);
}
```

### 2. Rotate Secrets Regularly

```bash
# Generate new JWT secret monthly
openssl rand -base64 32

# Update in environment
export JWT_SECRET="new_secret_here"
```

### 3. Monitor Security Metrics

```typescript
// Log security events
logger.security('2FA_ENABLED', {
  userId,
  method: '2fa_totp',
  timestamp: new Date(),
});

logger.security('SUSPICIOUS_LOGIN', {
  userId,
  ip: req.ip,
  location: geolocate(req.ip),
  timestamp: new Date(),
});
```

### 4. Handle Errors Securely

```typescript
// DON'T expose sensitive info in errors
// ❌ Bad
res.status(401).json({
  error: 'User admin@example.com not found',
});

// ✅ Good
res.status(401).json({
  error: 'Invalid credentials',
});
```

### 5. Implement Proper Session Management

```typescript
// Set secure session options
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // HTTPS only
    httpOnly: true, // No JavaScript access
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict', // CSRF protection
  },
}));
```

---

## 📚 Additional Resources

- [API Documentation](./openapi.yaml)
- [Security Compliance](./SECURITY_COMPLIANCE.md)
- [Architecture](./ARCHITECTURE.md)
- [Testing Guide](./TESTING_GUIDE.md)

---

## 🆘 Need Help?

**Security Issues:**
- Email: security@flamoral.com
- Emergency: Available in app 24/7

**Development Questions:**
- Check `SECURITY_IMPLEMENTATION_SUMMARY.md`
- Review inline code comments
- Contact development team

---

**Last Updated:** December 11, 2025
