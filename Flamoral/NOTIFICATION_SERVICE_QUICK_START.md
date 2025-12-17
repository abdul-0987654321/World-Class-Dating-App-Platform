# Notification Service - Quick Start Guide

## 5-Minute Setup (Development)

### 1. Start Required Services

```bash
# Start PostgreSQL
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15-alpine

# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Start MailHog (for email testing)
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

### 2. Configure Environment

```bash
cd backend/services/notification-service
cp .env.example .env
```

**Edit .env for development:**
```bash
NODE_ENV=development
PORT=3012

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_notifications
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Email (MailHog)
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM=noreply@flamoral.dev
EMAIL_FROM_NAME=Flamoral
WEB_APP_URL=http://localhost:5173
```

### 3. Install and Run

```bash
npm install
npm run dev
```

### 4. Verify Setup

```bash
# Check health
curl http://localhost:3012/health

# View MailHog UI
open http://localhost:8025
```

---

## Production Setup (30 Minutes)

### 1. Email Provider Setup

**Option A: SendGrid (Recommended)**
```bash
# 1. Sign up at sendgrid.com
# 2. Create API key with Mail Send permission
# 3. Verify sender email/domain
# 4. Add to .env:
SENDGRID_API_KEY=SG.your-api-key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME="Your App"
WEB_APP_URL=https://yourdomain.com
```

**Option B: AWS SES**
```bash
# 1. Enable SES in AWS Console
# 2. Verify domain
# 3. Request production access
# 4. Create IAM user with SES permissions
# 5. Add to .env:
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
EMAIL_FROM=noreply@yourdomain.com
```

### 2. SMS Setup (Optional)

```bash
# 1. Sign up at twilio.com
# 2. Get phone number
# 3. Add to .env:
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_FROM_NUMBER=+1234567890
```

### 3. Push Notifications (Optional)

**Firebase (Android/Web):**
```bash
# 1. Create Firebase project
# 2. Download service account JSON
# 3. Add to .env:
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

**APNs (iOS):**
```bash
# 1. Create APNs key in Apple Developer
# 2. Download .p8 file
# 3. Add to .env:
APNS_KEY_ID=ABCDE12345
APNS_TEAM_ID=TEAM123456
APNS_KEY_PATH=/path/to/AuthKey.p8
APNS_BUNDLE_ID=com.yourapp.bundle
APNS_PRODUCTION=true
```

### 4. Database & Redis

```bash
# Production database
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=flamoral_notifications
DB_USER=your-user
DB_PASSWORD=strong-password
DB_SSL=true

# Production Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6380
REDIS_PASSWORD=strong-password
```

### 5. Deploy

```bash
npm run build
npm start
```

---

## Quick Test Commands

### Test Email
```bash
curl -X POST http://localhost:3012/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{
    "userId": "test-user",
    "type": "new_match",
    "channels": ["email"],
    "title": "Test",
    "body": "Test email"
  }'
```

### Test SMS
```bash
curl -X POST http://localhost:3012/api/internal/notifications/sms \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "phoneNumber": "+1234567890",
    "code": "123456"
  }'
```

### Test Push
```bash
curl -X POST http://localhost:3012/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{
    "userId": "test-user",
    "type": "new_match",
    "channels": ["push"],
    "title": "Test Push",
    "body": "Test notification"
  }'
```

---

## Common Issues & Fixes

### Email not sending?
1. Check provider credentials in .env
2. Verify sender email is verified
3. Check logs: `docker logs notification-service`
4. For MailHog: Check http://localhost:8025

### SMS failing?
1. Verify Twilio credentials
2. Check phone number format (+1234567890)
3. For trial: Verify recipient in Twilio Console
4. Check account balance

### Push notifications not working?
1. Verify Firebase/APNs configuration
2. Check device tokens are registered
3. Ensure app has notification permissions
4. Check logs for initialization errors

### Service won't start?
1. Check configuration validation errors in logs
2. Verify all required env vars are set
3. Ensure PostgreSQL and Redis are running
4. Check ports aren't already in use

---

## Environment Variables Checklist

**Required (Minimum):**
- [ ] NODE_ENV
- [ ] PORT
- [ ] DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
- [ ] REDIS_HOST, REDIS_PORT
- [ ] EMAIL_FROM, EMAIL_FROM_NAME
- [ ] WEB_APP_URL

**Email (Choose One):**
- [ ] SENDGRID_API_KEY (SendGrid)
- [ ] AWS_SES_REGION + AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY (SES)
- [ ] SMTP_HOST + SMTP_PORT (SMTP)

**Optional:**
- [ ] TWILIO_* (SMS)
- [ ] FIREBASE_* (Push - Android/Web)
- [ ] APNS_* (Push - iOS)

---

## Key Endpoints

- Health: `GET /health`
- Send Notification: `POST /api/notifications/send`
- Get Notifications: `GET /api/notifications`
- Preferences: `GET /api/notifications/preferences`
- Update Preferences: `PUT /api/notifications/preferences`
- Register Device: `POST /api/devices/register`
- Queue Stats: `GET /api/internal/queue/stats` (internal)

---

## Monitoring

**Key Metrics:**
- Email delivery rate (should be >98%)
- Push success rate (should be >95%)
- Queue processing time (should be <5s)
- Failed notification count (monitor spikes)

**Check Health:**
```bash
curl http://localhost:3012/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "notification-service",
  "database": "connected",
  "queue": {
    "status": "operational",
    "stats": { "waiting": 0, "active": 0 }
  }
}
```

---

## Documentation

- **Full Setup Guide:** `EMAIL_NOTIFICATION_SETUP.md`
- **Fix Summary:** `EMAIL_NOTIFICATION_FIXES_SUMMARY.md`
- **API Docs:** `http://localhost:3012/`

---

## Support

**Logs Location:**
- Development: Console output
- Production: `logs/combined.log`, `logs/error.log`

**Check Logs:**
```bash
# Docker
docker logs notification-service

# Direct
tail -f logs/combined.log
```

**Get Help:**
- Check configuration validation on startup
- Review health endpoint
- Check provider dashboards
- Review documentation files

---

**Quick Start Complete!** 🎉

For more details, see `EMAIL_NOTIFICATION_SETUP.md`
