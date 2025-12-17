# Notification Service Health Check Guide

## Configuration Checklist

### 1. Email Service Configuration

The notification service supports **three email providers** (choose one):

#### Option A: SendGrid (Recommended for production)
```bash
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@flamoral.com
EMAIL_FROM_NAME=Flamoral
```

**Validation:**
- Sign up at https://sendgrid.com
- Create API key with "Mail Send" permission
- Verify sender email address
- Test sending: The service will automatically use SendGrid if API key is provided

#### Option B: AWS SES (Alternative for AWS users)
```bash
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
EMAIL_FROM=noreply@flamoral.com
EMAIL_FROM_NAME=Flamoral
```

**Validation:**
- AWS account with SES enabled
- Verify sender email in AWS SES console
- Move out of SES sandbox for production
- IAM user with SES send permissions

#### Option C: SMTP (Development/Custom)
```bash
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
EMAIL_FROM=noreply@flamoral.com
EMAIL_FROM_NAME=Flamoral
```

**Validation:**
- For development, use Mailhog or similar SMTP server
- For production, configure your SMTP server credentials
- Test connection before deploying

### 2. Push Notification Setup

#### Firebase Cloud Messaging (Android/Web)
```bash
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# OR
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/firebase-service-account.json
FCM_ENABLED=true
```

**Validation:**
1. Create Firebase project at https://console.firebase.google.com
2. Navigate to Project Settings > Service Accounts
3. Generate new private key (downloads JSON file)
4. Either:
   - Set `FIREBASE_SERVICE_ACCOUNT_PATH` to JSON file location
   - OR extract values and set individual env vars
5. Enable Firebase Cloud Messaging in Firebase Console

#### Apple Push Notification Service (iOS)
```bash
APNS_ENABLED=true
APNS_PRODUCTION=false  # Set to true for production
APNS_KEY_ID=your-apns-key-id
APNS_TEAM_ID=your-apple-team-id
APNS_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8
APNS_BUNDLE_ID=com.flamoral.app
```

**Validation:**
1. Apple Developer Account required
2. Create APNs Auth Key:
   - Go to https://developer.apple.com/account/resources/authkeys/list
   - Click "+" to create new key
   - Enable "Apple Push Notifications service (APNs)"
   - Download .p8 file (only available once!)
   - Note the Key ID and Team ID
3. Set `APNS_KEY_PATH` to .p8 file location
4. Configure your app's Bundle ID

### 3. SMS Configuration (Twilio)

```bash
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=+1234567890
```

**Validation:**
- Sign up at https://www.twilio.com
- Get Account SID and Auth Token from console
- Purchase a phone number or use trial number
- Verify phone numbers for trial accounts

### 4. Database Configuration

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_notifications
DB_USER=postgres
DB_PASSWORD=postgres
```

**Validation:**
```bash
# Connect to PostgreSQL
psql -h localhost -U postgres

# Create database
CREATE DATABASE flamoral_notifications;

# Run migrations
npm run migrate
```

### 5. Redis Configuration (Queue/Cache)

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**Validation:**
```bash
# Test Redis connection
redis-cli ping
# Should return: PONG

# Or with password
redis-cli -a your-password ping
```

### 6. Environment Variables Summary

Required for all deployments:
- `NODE_ENV` - development/production
- `PORT` - Service port (default: 3012)
- `DB_*` - Database connection
- `REDIS_*` - Redis connection
- `JWT_SECRET` - JWT signing key
- `WEB_APP_URL` - Frontend URL for email links

Optional (choose providers you need):
- Email: `SENDGRID_API_KEY` OR `AWS_SES_*` OR `SMTP_*`
- Push: `FIREBASE_*` and/or `APNS_*`
- SMS: `TWILIO_*`

## Service Startup Checklist

### 1. Install Dependencies
```bash
cd notification-service
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Run Database Migrations
```bash
npm run migrate
```

### 4. Start Services
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 5. Verify Service Health
```bash
# Health check endpoint
curl http://localhost:3012/health

# Expected response:
{
  "status": "healthy",
  "service": "notification-service",
  "timestamp": "2025-01-21T...",
  "database": "connected",
  "queue": {
    "status": "operational",
    "stats": { ... }
  }
}
```

## Common Issues and Solutions

### Issue: "Firebase not initialized"
**Solution:**
- Verify `FIREBASE_SERVICE_ACCOUNT_PATH` points to valid JSON file
- OR ensure `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` are set
- Check file permissions if using path

### Issue: "SendGrid API key invalid"
**Solution:**
- Verify API key is correct and not expired
- Ensure API key has "Mail Send" permission
- Check for extra spaces in .env file

### Issue: "Database connection failed"
**Solution:**
- Verify PostgreSQL is running: `pg_isready`
- Check credentials in .env
- Ensure database exists: `psql -l`
- Check network/firewall settings

### Issue: "Redis connection timeout"
**Solution:**
- Verify Redis is running: `redis-cli ping`
- Check Redis host and port
- Verify password if Redis requires authentication

### Issue: "Queue not processing notifications"
**Solution:**
- Check Redis connection
- Verify Bull queue is initialized
- Check queue stats: `GET http://localhost:3012/api/notifications/queue-stats`
- Review logs for errors

## Testing Notifications

### Test Email
```bash
curl -X POST http://localhost:3012/api/internal/notifications/send \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: your-service-key" \
  -d '{
    "userId": "user-123",
    "type": "new_match",
    "channels": ["email"],
    "title": "Test Notification",
    "body": "This is a test email notification"
  }'
```

### Test Push Notification
```bash
# First, register a device token
curl -X POST http://localhost:3012/api/devices/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{
    "deviceToken": "fcm-or-apns-token",
    "platform": "ios"
  }'

# Then send push notification
curl -X POST http://localhost:3012/api/internal/notifications/send \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: your-service-key" \
  -d '{
    "userId": "user-123",
    "type": "new_match",
    "channels": ["push"],
    "title": "Test Push",
    "body": "This is a test push notification"
  }'
```

### Test SMS
```bash
curl -X POST http://localhost:3012/api/internal/notifications/send \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: your-service-key" \
  -d '{
    "userId": "user-123",
    "type": "security_alert",
    "channels": ["sms"],
    "title": "Security Alert",
    "body": "Test SMS notification"
  }'
```

## Monitoring and Logs

### Check Service Logs
```bash
# Development
npm run dev

# Production (with PM2)
pm2 logs notification-service

# Check specific log level
tail -f logs/error.log
tail -f logs/combined.log
```

### Queue Monitoring
```bash
# Get queue statistics
curl http://localhost:3012/api/notifications/queue-stats

# Expected response:
{
  "waiting": 0,
  "active": 2,
  "completed": 150,
  "failed": 5,
  "delayed": 10,
  "total": 12
}
```

### Database Monitoring
```sql
-- Check notification counts
SELECT status, COUNT(*) FROM notifications GROUP BY status;

-- Check recent notifications
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;

-- Check device registrations
SELECT platform, COUNT(*) FROM user_devices WHERE is_active = true GROUP BY platform;

-- Check queue status
SELECT status, COUNT(*) FROM email_queue GROUP BY status;
SELECT status, COUNT(*) FROM sms_queue GROUP BY status;
```

## Production Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] Redis accessible and configured
- [ ] Email provider configured and tested
- [ ] Push notification providers configured (Firebase/APNs)
- [ ] SMS provider configured (if needed)
- [ ] HTTPS configured for production
- [ ] Rate limiting configured appropriately
- [ ] Monitoring and alerting set up
- [ ] Backup strategy in place
- [ ] Queue workers running
- [ ] Health check endpoint accessible
- [ ] Logs being collected and monitored

## Support and Documentation

- Main README: `./README.md`
- API Examples: `./EXAMPLES.md`
- Push Notifications Guide: `./PUSH_NOTIFICATIONS.md`
- Implementation Summary: `./IMPLEMENTATION_SUMMARY.md`

For issues, check logs and verify configuration against this checklist.
