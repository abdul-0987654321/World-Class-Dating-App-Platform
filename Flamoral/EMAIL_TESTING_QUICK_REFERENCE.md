# Email Testing Quick Reference

## Quick Test Commands

### 1. Test Email Verification (User Service)

```bash
# Register new user (triggers verification email)
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User",
    "dateOfBirth": "1990-01-01",
    "gender": "male"
  }'

# Resend verification email
curl -X POST http://localhost:3002/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### 2. Test Password Reset (Auth Service)

```bash
# Request password reset
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Reset password with token
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_FROM_EMAIL",
    "newPassword": "NewSecurePass123!"
  }'
```

### 3. Test Match Notification (Notification Service)

```bash
# Send match notification
curl -X POST http://localhost:3012/api/internal/notifications \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: dev-internal-service-key-32chars!" \
  -d '{
    "userId": "USER_ID_HERE",
    "type": "new_match",
    "channels": ["email", "push", "in_app"],
    "title": "Its a Match!",
    "body": "You matched with Sarah!",
    "priority": "high"
  }'
```

### 4. Check Email Queue Status

```bash
# PostgreSQL - Check queued emails
psql -h localhost -U postgres -d flamoral_notifications -c \
  "SELECT id, to_email, subject, status, created_at FROM email_queue ORDER BY created_at DESC LIMIT 10;"

# Check failed emails
psql -h localhost -U postgres -d flamoral_notifications -c \
  "SELECT id, to_email, subject, error_message, retry_count FROM email_queue WHERE status = 'failed';"
```

## Email Service Endpoints

### User Service (Port 3002)
- **POST** `/api/auth/register` - Sends verification email
- **POST** `/api/auth/resend-verification` - Resends verification
- **GET** `/api/auth/verify-email?token=XXX` - Verifies email

### Auth Service (Port 3001)
- **POST** `/api/auth/forgot-password` - Sends password reset
- **POST** `/api/auth/reset-password` - Resets password
- **POST** `/api/auth/resend-verification` - Resends verification

### Notification Service (Port 3012)
- **POST** `/api/internal/notifications` - Send any notification
- **POST** `/api/internal/notifications/email` - Send email only
- **GET** `/api/notifications/:userId` - Get user notifications

## Environment Variables Check

```bash
# Check if email is configured
echo "User Service:"
grep -E "SENDGRID|FROM_EMAIL" backend/services/user-service/.env

echo "Auth Service:"
grep -E "SMTP|EMAIL_FROM" backend/services/auth-service/.env

echo "Notification Service:"
grep -E "SENDGRID|EMAIL_FROM" backend/services/notification-service/.env
```

## Development Email Testing with Mailhog

### Start Mailhog
```bash
# Install Mailhog
brew install mailhog  # macOS
# OR
go get github.com/mailhog/MailHog  # Linux/Windows

# Run Mailhog
mailhog

# Access Web UI
open http://localhost:8025
```

### Configure Services for Mailhog
```bash
# User Service .env
SENDGRID_API_KEY=
SMTP_HOST=localhost
SMTP_PORT=1025

# Auth Service .env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_PASSWORD=development-disabled
```

## Production Email Testing with SendGrid

### Verify SendGrid Configuration
```bash
# Test SendGrid API Key
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer YOUR_SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{
      "to": [{"email": "your-email@example.com"}]
    }],
    "from": {"email": "noreply@flamoral.com"},
    "subject": "SendGrid Test",
    "content": [{
      "type": "text/plain",
      "value": "This is a test email from Flamoral"
    }]
  }'
```

### Check SendGrid Activity
1. Go to https://app.sendgrid.com
2. Navigate to Activity Feed
3. View recent email delivery status

## Database Queries for Email Debugging

### User Service Database
```sql
-- Check verification tokens
SELECT
  u.email,
  vt.token,
  vt.expires_at,
  vt.created_at,
  vt.used_at
FROM users u
LEFT JOIN verification_tokens vt ON u.id = vt.user_id
WHERE u.email = 'test@example.com'
ORDER BY vt.created_at DESC;

-- Check if email is verified
SELECT id, email, is_email_verified, email_verified_at
FROM users
WHERE email = 'test@example.com';
```

### Notification Service Database
```sql
-- Check email queue
SELECT
  eq.to_email,
  eq.subject,
  eq.status,
  eq.error_message,
  eq.retry_count,
  eq.created_at,
  eq.sent_at
FROM email_queue eq
ORDER BY created_at DESC
LIMIT 20;

-- Check notification preferences
SELECT
  user_id,
  email_enabled,
  email_new_match,
  email_new_message,
  email_weekly_digest
FROM notification_preferences
WHERE user_id = 'USER_ID_HERE';

-- Process pending emails manually
UPDATE email_queue
SET status = 'queued', retry_count = 0
WHERE status = 'failed' AND retry_count < 3;
```

## Common Issues and Fixes

### Issue: "Email not sent"

**Check 1: Service is running**
```bash
curl http://localhost:3002/health  # User Service
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3012/health  # Notification Service
```

**Check 2: Environment variables loaded**
```bash
# User Service
docker exec -it user-service env | grep SENDGRID

# Notification Service
docker exec -it notification-service env | grep EMAIL
```

**Check 3: Database connection**
```bash
# Test database connection
psql -h localhost -U postgres -d flamoral -c "SELECT 1;"
```

### Issue: "Emails going to spam"

**Fix:**
1. Verify sender domain in SendGrid
2. Add SPF record: `v=spf1 include:sendgrid.net ~all`
3. Add DKIM records (provided by SendGrid)
4. Set up DMARC policy
5. Test with mail-tester.com

### Issue: "Verification link expired"

**Extend token expiry:**
```sql
UPDATE verification_tokens
SET expires_at = NOW() + INTERVAL '24 hours'
WHERE token = 'EXPIRED_TOKEN';
```

**Or generate new token:**
```bash
curl -X POST http://localhost:3002/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## Service Logs for Email Debugging

### View Email-Related Logs
```bash
# User Service - Email verification logs
docker-compose logs user-service | grep -i "email\|verification"

# Auth Service - Password reset logs
docker-compose logs auth-service | grep -i "email\|password reset"

# Notification Service - All email activity
docker-compose logs notification-service | grep -i "email\|sendgrid"

# Follow logs in real-time
docker-compose logs -f notification-service
```

### Enable Debug Logging
```bash
# Add to .env
LOG_LEVEL=debug

# Restart service
docker-compose restart notification-service
```

## Email Template Testing

### Test Email Template Rendering
```typescript
// In notification service console
const emailService = require('./src/services/email-notification.service');

// Test welcome email
await emailService.sendWelcomeEmail(
  'user-id-123',
  'test@example.com',
  'Test User'
);

// Test match email
await emailService.sendMatchEmail(
  'user-id-123',
  'test@example.com',
  'Sarah',
  'https://example.com/photo.jpg'
);
```

## Performance Testing

### Send Bulk Test Emails
```bash
# Send 100 test emails
for i in {1..100}; do
  curl -X POST http://localhost:3012/api/internal/notifications/email \
    -H "Content-Type: application/json" \
    -H "X-Service-Key: dev-internal-service-key-32chars!" \
    -d "{
      \"userId\": \"test-user-$i\",
      \"subject\": \"Test Email $i\",
      \"body\": \"This is test email number $i\"
    }" &
done
wait
```

### Check Queue Processing Speed
```sql
-- Average processing time
SELECT
  AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as avg_seconds,
  COUNT(*) as total_sent
FROM email_queue
WHERE status = 'sent'
  AND created_at > NOW() - INTERVAL '1 hour';
```

## Email Delivery Metrics

### SendGrid Dashboard Metrics
- **Delivered Rate:** Should be > 95%
- **Bounce Rate:** Should be < 2%
- **Spam Reports:** Should be < 0.1%
- **Click Rate:** Varies by email type

### Database Metrics
```sql
-- Email success rate (last 7 days)
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM email_queue
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status;

-- Failed email reasons
SELECT
  error_message,
  COUNT(*) as count
FROM email_queue
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY error_message
ORDER BY count DESC;
```

## Security Testing

### Test Rate Limiting
```bash
# Try to send 10 verification emails quickly (should be rate limited)
for i in {1..10}; do
  curl -X POST http://localhost:3002/api/auth/resend-verification \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com"}'
  echo "Request $i sent"
  sleep 1
done
```

### Test Email Injection Prevention
```bash
# Try to inject headers (should be sanitized)
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com\nBcc: attacker@evil.com",
    "firstName": "Test\nX-Spam: true",
    "password": "SecurePass123!"
  }'
```

## Circuit Breaker Testing

### Trigger Circuit Breaker
```bash
# Set invalid SendGrid key to trigger failures
export SENDGRID_API_KEY="invalid_key"

# Send multiple emails (should fail)
for i in {1..10}; do
  curl -X POST http://localhost:3012/api/internal/notifications/email \
    -H "Content-Type: application/json" \
    -H "X-Service-Key: dev-internal-service-key-32chars!" \
    -d '{"userId": "test", "subject": "Test", "body": "Test"}'
done

# Check circuit breaker status in logs
docker-compose logs notification-service | grep -i "circuit"
```

## Useful Resources

- **Mailhog UI:** http://localhost:8025
- **SendGrid Dashboard:** https://app.sendgrid.com
- **SendGrid API Docs:** https://docs.sendgrid.com/api-reference/mail-send
- **Email Template Testing:** https://litmus.com
- **Spam Testing:** https://www.mail-tester.com
- **Email Validation:** https://www.zerobounce.net

## Support Contacts

- **Email Service Issues:** Check EMAIL_SERVICE_SETUP_GUIDE.md
- **SendGrid Support:** https://support.sendgrid.com
- **Flamoral Documentation:** /docs/email-service

---

**Last Updated:** December 15, 2025
