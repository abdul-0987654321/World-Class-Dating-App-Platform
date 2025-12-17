# Email Service Setup and Configuration Guide for Flamoral

**Date:** December 15, 2025
**Status:** Email services are configured but need proper SendGrid API keys for production

## Executive Summary

This guide provides comprehensive instructions for setting up and configuring email services across all Flamoral backend services. The platform uses three separate email service implementations:

1. **User Service** - Email verification, password reset, welcome emails
2. **Auth Service** - Email verification, password reset
3. **Notification Service** - All notification emails (matches, messages, marketing)

## Current Implementation Status

### ✅ What's Working
- Email service infrastructure is fully implemented
- Email templates are embedded in code (HTML + text)
- SMTP fallback for development (Mailhog support)
- SendGrid integration is coded and ready
- Queue system for email delivery
- Retry logic for failed emails

### ⚠️ What Needs Configuration
- SendGrid API keys need to be added to environment variables
- Sender domain verification in SendGrid
- SPF/DKIM DNS records for email authentication
- Production email templates (optional - using SendGrid dynamic templates)

## Email Service Locations

### 1. User Service Email Implementation
**Location:** `backend/services/user-service/src/infrastructure/email/email.service.ts`

**Features:**
- Email verification with 24-hour token expiry
- Password reset with 1-hour token expiry
- Welcome email after verification
- SMTP (Mailhog) support for development
- SendGrid support for production

**Key Methods:**
```typescript
sendVerificationEmail(email: string, firstName: string, verificationToken: string)
sendPasswordResetEmail(email: string, firstName: string, resetToken: string)
sendWelcomeEmail(email: string, firstName: string)
```

### 2. Auth Service Email Implementation
**Location:** `backend/services/auth-service/src/infrastructure/email/email.service.ts`

**Features:**
- Nodemailer-based implementation
- SMTP configuration via environment variables
- Verification and password reset emails

**Key Methods:**
```typescript
sendVerificationEmail(email: string, name: string, token: string)
sendPasswordResetEmail(email: string, name: string, token: string)
sendWelcomeEmail(email: string, name: string)
```

### 3. Notification Service Email Implementation
**Location:** `backend/services/notification-service/src/services/email-notification.service.ts`

**Features:**
- SendGrid integration for all notification emails
- Database-backed email templates
- Email queue with retry logic
- Preference-based email filtering
- Welcome, match, and digest emails

**Key Methods:**
```typescript
sendEmail(options: EmailOptions)
sendWelcomeEmail(userId: string, email: string, firstName: string)
sendMatchEmail(userId: string, email: string, matchName: string, matchPhotoUrl: string)
sendWeeklyDigest(userId: string, email: string, firstName: string, stats)
processEmailQueue(batchSize: number)
```

## Environment Variables Required

### User Service (.env)
```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
FROM_EMAIL=noreply@flamoral.com
FROM_NAME=Flamoral

# SMTP Configuration (Development/Fallback)
SMTP_HOST=localhost
SMTP_PORT=1025

# Frontend URL for email links
WEB_APP_URL=https://flamoral.com
```

### Auth Service (.env)
```bash
# SMTP Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your_sendgrid_api_key_here
EMAIL_FROM=noreply@flamoral.com

# Frontend URL
FRONTEND_URL=https://flamoral.com
```

### Notification Service (.env)
```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
EMAIL_FROM=noreply@flamoral.com
EMAIL_FROM_NAME=Flamoral

# Email Queue Settings
EMAIL_QUEUE_MODE=true
EMAIL_BATCH_SIZE=100
EMAIL_BATCH_INTERVAL_MS=3000

# Circuit Breaker Settings
SENDGRID_CIRCUIT_BREAKER_ENABLED=true
SENDGRID_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
SENDGRID_CIRCUIT_BREAKER_RESET_TIMEOUT=60000
```

## SendGrid Setup Steps

### Step 1: Create SendGrid Account
1. Go to https://sendgrid.com
2. Sign up for a free account (100 emails/day) or paid plan
3. Complete account verification

### Step 2: Create API Key
1. Navigate to Settings > API Keys
2. Click "Create API Key"
3. Name: `flamoral-production`
4. Permissions: **Full Access** (or minimum: Mail Send)
5. Copy the API key (starts with `SG.`)
6. Store securely - it won't be shown again

### Step 3: Verify Sender Domain
1. Navigate to Settings > Sender Authentication
2. Choose "Domain Authentication"
3. Select your DNS provider
4. Enter domain: `flamoral.com`
5. Add the provided DNS records to your domain:
   - CNAME records for authentication
   - TXT records for SPF
   - CNAME records for DKIM

### Step 4: Configure DNS Records
Add these records to your DNS provider (e.g., Cloudflare, Route53):

```
Type: CNAME
Name: em1234.flamoral.com
Value: u1234567.wl234.sendgrid.net

Type: CNAME
Name: s1._domainkey.flamoral.com
Value: s1.domainkey.u1234567.wl234.sendgrid.net

Type: CNAME
Name: s2._domainkey.flamoral.com
Value: s2.domainkey.u1234567.wl234.sendgrid.net

Type: TXT
Name: flamoral.com
Value: v=spf1 include:sendgrid.net ~all
```

**Note:** Actual values will be provided by SendGrid during setup.

### Step 5: Verify Domain Status
1. Wait 24-48 hours for DNS propagation
2. Return to SendGrid > Sender Authentication
3. Click "Verify" next to your domain
4. Status should show "Verified" with green checkmark

## Local Development Setup

### Option 1: Mailhog (Recommended for Development)
Mailhog captures all outgoing emails locally for testing.

```bash
# Install Mailhog
# macOS
brew install mailhog

# Linux
go get github.com/mailhog/MailHog

# Windows
# Download from https://github.com/mailhog/MailHog/releases

# Run Mailhog
mailhog

# Web UI available at: http://localhost:8025
# SMTP server at: localhost:1025
```

**Environment Variables for Mailhog:**
```bash
NODE_ENV=development
SMTP_HOST=localhost
SMTP_PORT=1025
SENDGRID_API_KEY=  # Leave empty to use SMTP
```

### Option 2: SendGrid Test Mode
Use a test API key for development:

```bash
SENDGRID_API_KEY=SG.your_test_api_key_here
FROM_EMAIL=noreply@flamoral.com
NODE_ENV=development
```

## Email Templates

### Current Implementation
All email templates are embedded in the code with inline HTML and CSS. Templates include:

1. **Verification Email** - Welcome + email verification link
2. **Password Reset Email** - Reset link with security warnings
3. **Welcome Email** - Post-verification onboarding
4. **Match Notification** - New match announcement
5. **Weekly Digest** - Activity summary

### Template Variables
Templates support variable replacement using `{{variable}}` syntax:

- `{{first_name}}` - User's first name
- `{{verification_url}}` - Email verification link
- `{{reset_url}}` - Password reset link
- `{{match_name}}` - Match partner's name
- `{{match_photo_url}}` - Match partner's photo
- `{{likes_count}}` - Weekly likes received
- `{{matches_count}}` - Weekly matches
- `{{messages_count}}` - Weekly messages sent

### Using SendGrid Dynamic Templates (Optional)
To use SendGrid's template builder:

1. Create templates in SendGrid dashboard
2. Note the Template ID (e.g., `d-abc123def456`)
3. Update email service to use template ID:

```typescript
await sgMail.send({
  to: email,
  from: 'noreply@flamoral.com',
  templateId: 'd-abc123def456',
  dynamicTemplateData: {
    first_name: firstName,
    verification_url: verificationUrl,
  },
});
```

## Testing Email Functionality

### Test Email Verification Flow

```bash
# 1. Register a new user (generates verification email)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# 2. Check Mailhog (http://localhost:8025) or SendGrid Activity Feed
# 3. Click verification link in email
# 4. User email should be verified
```

### Test Password Reset Flow

```bash
# 1. Request password reset
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'

# 2. Check email for reset link
# 3. Click link and set new password
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset_token_from_email",
    "newPassword": "NewSecurePass123!"
  }'
```

### Test Notification Emails

```bash
# Send test match notification
curl -X POST http://localhost:3012/api/internal/notifications/email \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: your-service-key" \
  -d '{
    "userId": "user_id_here",
    "subject": "You have a new match!",
    "body": "Congratulations! You matched with someone special."
  }'
```

## Circuit Breaker Configuration

The notification service includes circuit breaker protection to prevent cascading failures:

```typescript
// Circuit Breaker Settings (in .env)
SENDGRID_CIRCUIT_BREAKER_ENABLED=true
SENDGRID_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5  // Open after 5 failures
SENDGRID_CIRCUIT_BREAKER_RESET_TIMEOUT=60000  // Try again after 1 minute
```

**States:**
- **CLOSED** - Normal operation, requests go through
- **OPEN** - Too many failures, requests blocked
- **HALF_OPEN** - Testing if service recovered

## Email Queue Management

The notification service uses a database queue for reliable email delivery:

### Queue Processing
```bash
# Emails are queued in the database
# Background worker processes queue every 30 seconds
# Failed emails retry up to 3 times with exponential backoff
```

### Manual Queue Processing
```typescript
// Trigger manual queue processing
await emailNotificationService.processEmailQueue(50); // Process 50 emails
```

### Check Queue Status
```sql
-- Check pending emails
SELECT COUNT(*) FROM email_queue WHERE status = 'queued';

-- Check failed emails
SELECT * FROM email_queue WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;

-- Retry failed emails
UPDATE email_queue SET status = 'queued', retry_count = 0 WHERE status = 'failed';
```

## Troubleshooting

### Problem: Emails not sending

**Check 1: Verify SendGrid API Key**
```bash
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "noreply@flamoral.com"},
    "subject": "Test Email",
    "content": [{"type": "text/plain", "value": "Test"}]
  }'
```

**Check 2: Verify Environment Variables**
```bash
# In service directory
echo $SENDGRID_API_KEY
echo $FROM_EMAIL
```

**Check 3: Check Service Logs**
```bash
# User Service logs
docker-compose logs user-service | grep -i email

# Notification Service logs
docker-compose logs notification-service | grep -i email
```

### Problem: Emails going to spam

**Solutions:**
1. Complete domain authentication in SendGrid
2. Add SPF and DKIM records to DNS
3. Set up DMARC policy
4. Warm up sender reputation (start with low volume)
5. Ensure consistent "From" email address
6. Include unsubscribe link in marketing emails

### Problem: Email verification link expired

**Check token expiry settings:**
```typescript
// User Service - 24 hours
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

// Auth Service - Check config
console.log(config.jwt.accessExpiresIn);
```

**Manual token extension (database):**
```sql
UPDATE verification_tokens
SET expires_at = NOW() + INTERVAL '24 hours'
WHERE token = 'expired_token_here';
```

## Security Best Practices

1. **API Key Protection**
   - Never commit API keys to git
   - Use environment variables
   - Rotate keys quarterly
   - Use separate keys for dev/staging/production

2. **Email Rate Limiting**
   - User Service: Max 5 verification emails per hour per user
   - Auth Service: Max 3 password resets per hour per user
   - Notification Service: Configurable per user preferences

3. **Token Security**
   - Verification tokens: 24-hour expiry
   - Password reset tokens: 1-hour expiry
   - Tokens are single-use (deleted after verification)
   - Tokens are cryptographically random (32+ bytes)

4. **Email Content**
   - Never include sensitive data in emails
   - Use HTTPS for all links
   - Include clear unsubscribe options
   - Add security warnings for password resets

## Cost Optimization

### SendGrid Pricing Tiers
- **Free:** 100 emails/day forever
- **Essentials:** $19.95/month - 50K emails
- **Pro:** $89.95/month - 100K emails

### Optimization Strategies

1. **Email Batching**
   ```bash
   EMAIL_BATCH_SIZE=100
   EMAIL_BATCH_INTERVAL_MS=3000
   ```

2. **Preference-Based Filtering**
   - Check user preferences before sending
   - Respect quiet hours
   - Honor unsubscribe requests

3. **Queue Management**
   ```bash
   # Process non-urgent emails during off-peak hours
   QUEUE_NON_URGENT_UNDER_LOAD=true
   ```

4. **Template Caching**
   ```bash
   EMAIL_TEMPLATE_CACHE_TTL=3600  # 1 hour
   ```

## Monitoring and Analytics

### SendGrid Dashboard
1. Navigate to https://app.sendgrid.com
2. View metrics:
   - Sent emails
   - Delivered emails
   - Bounce rate
   - Spam reports
   - Opens (requires tracking enabled)
   - Clicks (requires tracking enabled)

### Database Metrics
```sql
-- Email delivery success rate
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM email_queue
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status;

-- Average delivery time
SELECT
  AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as avg_seconds
FROM email_queue
WHERE status = 'sent'
  AND created_at > NOW() - INTERVAL '7 days';
```

### Alerts Setup
Consider setting up alerts for:
- Email delivery failure rate > 5%
- Queue size > 1000 pending emails
- Circuit breaker opens
- SendGrid API errors

## Next Steps

1. **Immediate Actions**
   - [ ] Create SendGrid account
   - [ ] Generate API key
   - [ ] Update environment variables
   - [ ] Verify sender domain
   - [ ] Test email verification flow
   - [ ] Test password reset flow

2. **Production Readiness**
   - [ ] Complete DNS verification
   - [ ] Set up monitoring alerts
   - [ ] Test all email types
   - [ ] Document email templates
   - [ ] Create email content guidelines

3. **Optional Enhancements**
   - [ ] Create custom SendGrid templates
   - [ ] Add email analytics tracking
   - [ ] Implement A/B testing for email content
   - [ ] Set up email preference center
   - [ ] Add multilingual email support

## Support and Resources

- **SendGrid Documentation:** https://docs.sendgrid.com
- **SendGrid API Reference:** https://docs.sendgrid.com/api-reference/mail-send
- **Mailhog GitHub:** https://github.com/mailhog/MailHog
- **Nodemailer Documentation:** https://nodemailer.com

## Conclusion

The email service infrastructure is fully implemented and ready for production use. The main requirement is to:

1. Add SendGrid API key to environment variables
2. Verify sender domain in SendGrid
3. Add DNS records for email authentication

Once these steps are completed, all email functionality (verification, password reset, notifications) will work seamlessly.
