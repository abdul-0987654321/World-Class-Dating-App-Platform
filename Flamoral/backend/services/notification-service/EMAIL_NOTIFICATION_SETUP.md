# Email and Notification Service Configuration Guide

This document provides a comprehensive guide to configuring and troubleshooting the email and notification services for Flamoral.

## Table of Contents
1. [Email Service Configuration](#email-service-configuration)
2. [Push Notification Configuration](#push-notification-configuration)
3. [Notification Preferences](#notification-preferences)
4. [Unsubscribe Functionality](#unsubscribe-functionality)
5. [Troubleshooting](#troubleshooting)

## Email Service Configuration

The Flamoral platform supports three email providers:
- **SendGrid** (recommended for production)
- **AWS SES** (cost-effective for high volume)
- **SMTP** (flexible, works with any SMTP server)

### SendGrid Configuration

**Environment Variables:**
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@flamoral.com
EMAIL_FROM_NAME=Flamoral
```

**Setup Steps:**
1. Create a SendGrid account at https://sendgrid.com
2. Navigate to Settings > API Keys
3. Create a new API key with "Full Access" or "Mail Send" permissions
4. Copy the API key and set it as `SENDGRID_API_KEY`
5. Verify your sender email address in SendGrid
6. Configure domain authentication for better deliverability

**Advantages:**
- Easy setup
- Excellent deliverability
- Real-time analytics
- Template management
- Webhook support

### AWS SES Configuration

**Environment Variables:**
```env
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
EMAIL_FROM=noreply@flamoral.com
EMAIL_FROM_NAME=Flamoral
```

**Setup Steps:**
1. Sign in to AWS Console
2. Navigate to Amazon SES
3. Verify your email address or domain
4. Request production access (required for sending to non-verified addresses)
5. Create an IAM user with `ses:SendEmail` permission
6. Generate access keys for the IAM user
7. Set the environment variables

**Advantages:**
- Cost-effective ($0.10 per 1,000 emails)
- High reliability
- Scales automatically
- Integration with other AWS services

### SMTP Configuration

**Environment Variables:**
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-username
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@flamoral.com
EMAIL_FROM_NAME=Flamoral
```

**Development (Mailhog):**
```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
EMAIL_FROM=noreply@flamoral.com
EMAIL_FROM_NAME=Flamoral
NODE_ENV=development
```

**Setup Steps:**
1. Obtain SMTP credentials from your email provider
2. Configure the environment variables
3. Test the connection

**Advantages:**
- Works with any email provider
- No vendor lock-in
- Local development with Mailhog
- Flexible configuration

### Email Template Features

All email templates include:
- ✅ Responsive HTML design
- ✅ Plain text fallback
- ✅ Professional branding
- ✅ Unsubscribe links (automatic)
- ✅ Preference management links
- ✅ Mobile-optimized layout
- ✅ Cross-client compatibility

## Push Notification Configuration

### Firebase Cloud Messaging (Android & Web)

**Environment Variables:**
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Alternative: Service Account File**
```env
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/firebase-service-account.json
```

**Alternative: JSON String**
```env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"..."}'
```

**Setup Steps:**
1. Go to Firebase Console (https://console.firebase.google.com)
2. Create or select your project
3. Navigate to Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file securely
6. Set the environment variable using one of the three methods above

**Key Features:**
- Multi-device support
- Message priority control
- Rich notifications (images, actions)
- Topic-based messaging
- Delivery tracking

### Apple Push Notification Service (iOS)

**Environment Variables:**
```env
APNS_KEY_ID=XXXXXXXXXX
APNS_TEAM_ID=YYYYYYYYYY
APNS_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8
APNS_BUNDLE_ID=com.flamoral.app
```

**Alternative: Inline Key**
```env
APNS_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

**Setup Steps:**
1. Sign in to Apple Developer account
2. Navigate to Certificates, Identifiers & Profiles
3. Create an APNs Auth Key:
   - Click Keys > (+) button
   - Name it "Flamoral APNs Key"
   - Enable Apple Push Notifications service (APNs)
   - Register and download the .p8 file
4. Note your Key ID (shown after creation)
5. Note your Team ID (in account settings)
6. Set the environment variables

**Key Features:**
- Token-based authentication
- High priority delivery
- Rich notifications
- Badge management
- Silent notifications

### Notification Types

The system supports the following notification types:

| Type | Push | Email | SMS | In-App |
|------|------|-------|-----|--------|
| New Match | ✅ | ✅ | ❌ | ✅ |
| New Message | ✅ | ⚠️ | ❌ | ✅ |
| New Like | ✅ | ❌ | ❌ | ✅ |
| Super Like | ✅ | ❌ | ❌ | ✅ |
| Profile View | ✅ | ❌ | ❌ | ✅ |
| Match Expiring | ✅ | ✅ | ❌ | ✅ |
| Daily Picks | ✅ | ⚠️ | ❌ | ✅ |
| Boost Active | ✅ | ❌ | ❌ | ✅ |
| Payment Success | ✅ | ✅ | ❌ | ✅ |
| Payment Failed | ✅ | ✅ | ❌ | ✅ |
| Security Alert | ✅ | ✅ | ✅ | ✅ |

✅ Always sent | ⚠️ Configurable | ❌ Not supported

## Notification Preferences

### Default Preferences

When a user signs up, the following default preferences are set:

```typescript
{
  // Push Notifications
  pushEnabled: true,
  pushNewMatch: true,
  pushNewMessage: true,
  pushNewLike: true,
  pushSuperLike: true,
  pushProfileView: false,
  pushBoostExpiring: true,
  pushMarketing: false,

  // Email Notifications
  emailEnabled: true,
  emailNewMatch: true,
  emailNewMessage: false,
  emailWeeklyDigest: true,
  emailPromotions: false,
  emailProductUpdates: true,

  // SMS Notifications
  smsEnabled: false,
  smsVerification: true,
  smsSecurityAlerts: true,

  // Quiet Hours
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  timezone: 'UTC'
}
```

### Quiet Hours

Users can configure quiet hours during which non-critical notifications are suppressed:

- Configurable start and end times
- Timezone-aware
- Critical notifications (payments, security) always sent
- Applies to push and email notifications

### Preference Management API

**Get User Preferences:**
```http
GET /api/notifications/preferences
Authorization: Bearer <token>
```

**Update Preferences:**
```http
PUT /api/notifications/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "pushNewMatch": true,
  "emailNewMatch": false,
  "quietHoursEnabled": true,
  "quietHoursStart": "23:00",
  "quietHoursEnd": "07:00"
}
```

## Unsubscribe Functionality

### Features

- One-click unsubscribe from emails
- Category-specific unsubscribing
- Global unsubscribe option
- Preference center link
- CAN-SPAM compliant
- GDPR compliant

### Implementation

Every email sent through the notification service automatically includes:

1. **Unsubscribe Link**: Allows users to unsubscribe from specific email categories
2. **Preference Center Link**: Directs users to manage all notification settings
3. **Footer**: Professional footer with legal information

### Unsubscribe Flow

1. User clicks "Unsubscribe" link in email
2. Token is validated (1-year expiry)
3. User sees confirmation page with options:
   - Unsubscribe from this category
   - Unsubscribe from all marketing emails
   - Manage all preferences
4. Preference is updated in database
5. Confirmation email sent (if not fully unsubscribed)

### Database Schema

```sql
CREATE TABLE email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token VARCHAR(64) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL DEFAULT 'all',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, category)
);

CREATE INDEX idx_unsubscribe_token ON email_unsubscribe_tokens(token);
CREATE INDEX idx_unsubscribe_user ON email_unsubscribe_tokens(user_id);
```

## Troubleshooting

### Email Issues

**Problem: Emails not being sent**

Solutions:
1. Check environment variables are set correctly
2. Verify API keys/credentials are valid
3. Check email provider dashboard for errors
4. Review application logs for error messages
5. Ensure sender email is verified
6. Check email queue status

**Problem: Emails going to spam**

Solutions:
1. Configure SPF records for your domain
2. Set up DKIM signing
3. Configure DMARC policy
4. Use verified sender domain
5. Monitor sender reputation
6. Avoid spam trigger words in content
7. Ensure proper unsubscribe mechanism

**Problem: SendGrid API errors**

Common errors:
- 401: Invalid API key
- 403: Insufficient permissions
- 429: Rate limit exceeded
- 500: SendGrid server error

**Problem: AWS SES sandbox mode**

If in sandbox mode:
1. You can only send to verified email addresses
2. Request production access in AWS SES console
3. May take 24 hours for approval
4. Provide use case details in request

### Push Notification Issues

**Problem: FCM notifications not delivered**

Solutions:
1. Verify Firebase project is configured correctly
2. Check device tokens are registered properly
3. Ensure Firebase service account has correct permissions
4. Verify notification payload format
5. Check device is online and app is installed
6. Review FCM logs in Firebase Console

**Problem: APNs notifications not delivered**

Solutions:
1. Verify APNs auth key is valid and not expired
2. Check bundle ID matches app configuration
3. Ensure device token is in correct format
4. Verify device has enabled notifications
5. Check APNs certificate is not expired
6. Test in production vs sandbox environment

**Problem: Invalid device tokens**

The system automatically:
1. Detects invalid tokens during send
2. Removes them from database
3. Logs cleanup operations

Users need to re-register devices after:
- App reinstallation
- Token refresh/rotation
- Device token invalidation

### Configuration Validation

**Check email configuration:**
```bash
# Test SendGrid
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"noreply@flamoral.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'

# Test AWS SES
aws ses send-email \
  --from noreply@flamoral.com \
  --to test@example.com \
  --subject "Test" \
  --text "Test message"
```

**Check Firebase configuration:**
```bash
# Validate service account JSON
cat firebase-service-account.json | jq .

# Test Firebase Admin SDK
node -e "const admin = require('firebase-admin'); const serviceAccount = require('./firebase-service-account.json'); admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }); console.log('Firebase initialized successfully');"
```

### Monitoring

**Key Metrics to Monitor:**

1. **Email Delivery Rate**: Should be >98%
2. **Email Bounce Rate**: Should be <2%
3. **Push Notification Success Rate**: Should be >95%
4. **Queue Processing Time**: Should be <5 seconds
5. **Failed Notification Count**: Monitor spikes
6. **Unsubscribe Rate**: Should be <1%

**Logging:**

All services log:
- Successful sends with message IDs
- Failed sends with error details
- Configuration initialization
- Provider selection
- Rate limiting events
- Token cleanup operations

Check logs at:
- `backend/services/auth-service/logs/`
- `backend/services/user-service/logs/`
- `backend/services/notification-service/logs/`

## Best Practices

### Email Best Practices

1. **Always include unsubscribe links** ✅ (Automatic)
2. **Use responsive email templates** ✅ (Implemented)
3. **Provide plain text alternative** ✅ (Implemented)
4. **Personalize with user's name** ✅ (In templates)
5. **Keep subject lines under 50 characters**
6. **Test across email clients**
7. **Monitor deliverability metrics**
8. **Respect user preferences** ✅ (Implemented)
9. **Implement retry logic** ✅ (Implemented)
10. **Use proper error handling** ✅ (Implemented)

### Push Notification Best Practices

1. **Request permission at the right time**
2. **Provide clear value proposition**
3. **Use appropriate notification priority**
4. **Include deep links for actions** ✅ (Implemented)
5. **Respect quiet hours** ✅ (Implemented)
6. **Clean up invalid tokens** ✅ (Automatic)
7. **Batch notifications when possible** ✅ (Implemented)
8. **Monitor delivery success rates**
9. **Handle token refresh properly**
10. **Test on multiple devices**

## Support

For additional help:
- Documentation: `/docs/notifications`
- Support: support@flamoral.com
- GitHub Issues: https://github.com/flamoral/platform/issues
- Slack: #notifications channel

## Changelog

### Version 2.0 (2025-01-15)
- ✅ Added multi-provider email support (SendGrid, SES, SMTP)
- ✅ Implemented unsubscribe functionality
- ✅ Enhanced email templates with responsive design
- ✅ Fixed Firebase initialization issues
- ✅ Improved error handling and logging
- ✅ Added delivery tracking
- ✅ Implemented quiet hours
- ✅ Added notification preferences API

### Version 1.0 (2024-12-01)
- Initial implementation
- Basic email and push notification support
- SendGrid integration only
- Simple notification preferences
