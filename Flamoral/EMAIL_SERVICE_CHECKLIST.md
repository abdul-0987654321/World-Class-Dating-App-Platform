# Email Service Configuration Checklist

**Use this checklist to configure email services for Flamoral**

## Prerequisites

- [ ] Access to domain DNS settings (for flamoral.com)
- [ ] Credit card (for SendGrid account, if not using free tier)
- [ ] Access to backend server environment variables
- [ ] Terminal/SSH access to backend services

## Phase 1: SendGrid Account Setup (15 minutes)

### Step 1: Create Account
- [ ] Go to https://sendgrid.com
- [ ] Click "Sign Up"
- [ ] Fill in account details
- [ ] Verify email address
- [ ] Complete account setup wizard

### Step 2: Create API Key
- [ ] Navigate to Settings > API Keys
- [ ] Click "Create API Key"
- [ ] Name: `flamoral-production`
- [ ] Permissions: Select "Full Access"
- [ ] Click "Create & View"
- [ ] **IMPORTANT:** Copy API key (starts with `SG.`) - save it securely
- [ ] Store API key in password manager

### Step 3: Domain Authentication
- [ ] Navigate to Settings > Sender Authentication
- [ ] Click "Authenticate Your Domain"
- [ ] Select DNS provider (e.g., Cloudflare, Route53)
- [ ] Enter domain: `flamoral.com`
- [ ] Note down DNS records provided by SendGrid:
  ```
  Record 1: CNAME em1234.flamoral.com → u1234567.wl234.sendgrid.net
  Record 2: CNAME s1._domainkey.flamoral.com → s1.domainkey.u1234567.wl234.sendgrid.net
  Record 3: CNAME s2._domainkey.flamoral.com → s2.domainkey.u1234567.wl234.sendgrid.net
  ```

## Phase 2: DNS Configuration (10 minutes)

### Step 1: Add CNAME Records
- [ ] Log in to DNS provider (Cloudflare/Route53/etc.)
- [ ] Navigate to DNS settings for flamoral.com
- [ ] Add CNAME record for email subdomain
  - Type: `CNAME`
  - Name: `em1234` (use value from SendGrid)
  - Value: `u1234567.wl234.sendgrid.net` (use value from SendGrid)
  - TTL: `Auto` or `3600`

- [ ] Add CNAME record for DKIM 1
  - Type: `CNAME`
  - Name: `s1._domainkey`
  - Value: `s1.domainkey.u1234567.wl234.sendgrid.net`
  - TTL: `Auto` or `3600`

- [ ] Add CNAME record for DKIM 2
  - Type: `CNAME`
  - Name: `s2._domainkey`
  - Value: `s2.domainkey.u1234567.wl234.sendgrid.net`
  - TTL: `Auto` or `3600`

### Step 2: Add SPF Record
- [ ] Check if SPF record exists
  ```bash
  dig TXT flamoral.com | grep spf
  ```

- [ ] If SPF exists, append SendGrid:
  - Find existing record like: `v=spf1 include:_spf.google.com ~all`
  - Update to: `v=spf1 include:_spf.google.com include:sendgrid.net ~all`

- [ ] If no SPF, create new TXT record:
  - Type: `TXT`
  - Name: `@` or `flamoral.com`
  - Value: `v=spf1 include:sendgrid.net ~all`
  - TTL: `Auto` or `3600`

### Step 3: Add DMARC Record (Optional but Recommended)
- [ ] Create DMARC TXT record:
  - Type: `TXT`
  - Name: `_dmarc`
  - Value: `v=DMARC1; p=none; rua=mailto:dmarc@flamoral.com; ruf=mailto:dmarc@flamoral.com; fo=1`
  - TTL: `Auto` or `3600`

### Step 4: Verify DNS Propagation
- [ ] Wait 10-15 minutes for DNS propagation
- [ ] Check DNS records:
  ```bash
  dig CNAME em1234.flamoral.com
  dig CNAME s1._domainkey.flamoral.com
  dig TXT flamoral.com | grep spf
  dig TXT _dmarc.flamoral.com
  ```

### Step 5: Verify in SendGrid
- [ ] Return to SendGrid > Sender Authentication
- [ ] Click "Verify" next to your domain
- [ ] Wait for verification (may take up to 48 hours)
- [ ] Status should show "Verified" with green checkmark

## Phase 3: Environment Variable Configuration (5 minutes)

### Option A: Automated Setup (Recommended)
- [ ] SSH into backend server
- [ ] Navigate to services directory:
  ```bash
  cd /path/to/Dating/Flamoral/backend/services
  ```
- [ ] Make script executable:
  ```bash
  chmod +x setup-email-config.sh
  ```
- [ ] Run setup script:
  ```bash
  ./setup-email-config.sh
  ```
- [ ] Follow prompts and enter:
  - SendGrid API key
  - Sender email: `noreply@flamoral.com`
  - Sender name: `Flamoral`
  - Frontend URL: `https://flamoral.com`

### Option B: Manual Setup

#### User Service
- [ ] Edit `backend/services/user-service/.env`:
  ```bash
  nano backend/services/user-service/.env
  ```
- [ ] Add/update these variables:
  ```bash
  SENDGRID_API_KEY=SG.your_api_key_here
  FROM_EMAIL=noreply@flamoral.com
  FROM_NAME=Flamoral
  WEB_APP_URL=https://flamoral.com
  ```
- [ ] Save and exit

#### Auth Service
- [ ] Edit `backend/services/auth-service/.env`:
  ```bash
  nano backend/services/auth-service/.env
  ```
- [ ] Add/update these variables:
  ```bash
  SMTP_HOST=smtp.sendgrid.net
  SMTP_PORT=587
  SMTP_USER=apikey
  SMTP_PASSWORD=SG.your_api_key_here
  EMAIL_FROM=noreply@flamoral.com
  FRONTEND_URL=https://flamoral.com
  ```
- [ ] Save and exit

#### Notification Service
- [ ] Edit `backend/services/notification-service/.env`:
  ```bash
  nano backend/services/notification-service/.env
  ```
- [ ] Add/update these variables:
  ```bash
  SENDGRID_API_KEY=SG.your_api_key_here
  EMAIL_FROM=noreply@flamoral.com
  EMAIL_FROM_NAME=Flamoral
  ```
- [ ] Save and exit

## Phase 4: Service Restart (2 minutes)

### Docker Compose
- [ ] Restart services:
  ```bash
  docker-compose restart user-service
  docker-compose restart auth-service
  docker-compose restart notification-service
  ```

- [ ] Verify services are running:
  ```bash
  docker-compose ps | grep -E "user-service|auth-service|notification-service"
  ```

- [ ] Check logs for errors:
  ```bash
  docker-compose logs user-service | tail -20
  docker-compose logs auth-service | tail -20
  docker-compose logs notification-service | tail -20
  ```

### PM2 (if not using Docker)
- [ ] Restart services:
  ```bash
  pm2 restart user-service
  pm2 restart auth-service
  pm2 restart notification-service
  ```

- [ ] Check status:
  ```bash
  pm2 status
  ```

- [ ] View logs:
  ```bash
  pm2 logs user-service --lines 20
  ```

## Phase 5: Testing (10 minutes)

### Test 1: Email Verification
- [ ] Register a new test user:
  ```bash
  curl -X POST https://flamoral.com/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@youremail.com",
      "password": "SecurePass123!",
      "firstName": "Test",
      "lastName": "User",
      "dateOfBirth": "1990-01-01",
      "gender": "male"
    }'
  ```

- [ ] Check your email inbox for verification email
- [ ] Verify email contains:
  - [ ] Welcome message
  - [ ] Verification button/link
  - [ ] Correct sender (noreply@flamoral.com)
  - [ ] Not marked as spam

- [ ] Click verification link
- [ ] Verify user email is confirmed in database

### Test 2: Password Reset
- [ ] Request password reset:
  ```bash
  curl -X POST https://flamoral.com/api/auth/forgot-password \
    -H "Content-Type: application/json" \
    -d '{"email": "test@youremail.com"}'
  ```

- [ ] Check email for password reset link
- [ ] Verify email contains:
  - [ ] Reset password button/link
  - [ ] Security warning
  - [ ] Expiry time (1 hour)

- [ ] Click reset link and set new password
- [ ] Verify password was changed

### Test 3: SendGrid Activity Feed
- [ ] Log in to SendGrid dashboard
- [ ] Navigate to Activity Feed
- [ ] Verify you see:
  - [ ] 2 emails (verification + welcome OR password reset)
  - [ ] Status: "Delivered" (green)
  - [ ] No bounces or spam reports

### Test 4: Email Queue (if using Notification Service)
- [ ] Connect to database:
  ```bash
  psql -h localhost -U postgres -d flamoral_notifications
  ```

- [ ] Check queue status:
  ```sql
  SELECT status, COUNT(*) FROM email_queue GROUP BY status;
  ```

- [ ] Verify:
  - [ ] No emails stuck in "pending" status
  - [ ] Failed count is 0 or very low

## Phase 6: Monitoring Setup (Optional, 15 minutes)

### SendGrid Alerts
- [ ] Navigate to Settings > Alerts
- [ ] Set up alert for bounce rate > 5%
- [ ] Set up alert for spam reports > 0.1%
- [ ] Enter notification email

### Database Monitoring
- [ ] Set up cron job to monitor email queue:
  ```bash
  crontab -e
  ```

- [ ] Add monitoring script:
  ```bash
  */15 * * * * /path/to/check-email-queue.sh
  ```

### Log Monitoring
- [ ] Set up log aggregation (Datadog, Sentry, etc.)
- [ ] Create alert for email service errors
- [ ] Create dashboard for email metrics

## Phase 7: Production Validation (5 minutes)

### Validate Configuration
- [ ] All services show healthy status
- [ ] Environment variables loaded correctly
- [ ] SendGrid API key is valid
- [ ] Sender domain verified in SendGrid
- [ ] DNS records propagated
- [ ] Emails delivered successfully
- [ ] No errors in service logs

### Performance Check
- [ ] Email delivery time < 5 seconds
- [ ] Queue processing working
- [ ] No circuit breaker failures
- [ ] Rate limiting working correctly

### Security Check
- [ ] API keys stored securely (not in git)
- [ ] HTTPS enabled for all email links
- [ ] Rate limiting active
- [ ] Token expiry working correctly

## Rollback Plan (If Issues Occur)

If email sending fails after configuration:

### Step 1: Check SendGrid API Key
- [ ] Verify API key is correct
- [ ] Check API key has "Mail Send" permission
- [ ] Test API key with curl:
  ```bash
  curl -X POST https://api.sendgrid.com/v3/mail/send \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"noreply@flamoral.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'
  ```

### Step 2: Revert to Development Mode
- [ ] Update .env files to use SMTP:
  ```bash
  SENDGRID_API_KEY=
  SMTP_HOST=localhost
  SMTP_PORT=1025
  ```

- [ ] Install and run Mailhog:
  ```bash
  brew install mailhog
  mailhog
  ```

- [ ] Restart services

### Step 3: Check Service Logs
- [ ] View recent errors:
  ```bash
  docker-compose logs notification-service | grep -i error
  docker-compose logs user-service | grep -i email
  ```

- [ ] Check for common issues:
  - Database connection errors
  - Redis connection errors
  - Invalid environment variables

## Completion Checklist

- [ ] SendGrid account created and verified
- [ ] API key generated and stored securely
- [ ] Domain authentication completed in SendGrid
- [ ] DNS records added and verified
- [ ] Environment variables updated in all services
- [ ] Services restarted successfully
- [ ] Email verification tested and working
- [ ] Password reset tested and working
- [ ] SendGrid activity feed shows successful deliveries
- [ ] No errors in service logs
- [ ] Monitoring alerts configured
- [ ] Documentation updated with configuration details

## Time Estimates

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: SendGrid Setup | 15 minutes |
| Phase 2: DNS Configuration | 10 minutes |
| Phase 3: Environment Variables | 5 minutes |
| Phase 4: Service Restart | 2 minutes |
| Phase 5: Testing | 10 minutes |
| Phase 6: Monitoring (Optional) | 15 minutes |
| Phase 7: Validation | 5 minutes |
| **Total** | **47-62 minutes** |

## Support Resources

- **Setup Guide:** `/EMAIL_SERVICE_SETUP_GUIDE.md`
- **Testing Guide:** `/EMAIL_TESTING_QUICK_REFERENCE.md`
- **Fix Summary:** `/EMAIL_SERVICE_FIX_SUMMARY.md`
- **SendGrid Docs:** https://docs.sendgrid.com
- **Support:** Email engineering@flamoral.com

## Notes

- DNS propagation can take up to 48 hours in rare cases
- Free SendGrid tier: 100 emails/day (sufficient for testing)
- Recommended production tier: Essentials ($19.95/month, 50K emails)
- Keep API keys secure and rotate quarterly
- Monitor bounce rates and spam reports regularly

---

**Created:** December 15, 2025
**Status:** Ready for Implementation
**Priority:** Medium
