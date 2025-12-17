# Verification Service Configuration Guide

This document provides comprehensive setup instructions for all verification services in the Flamoral user service.

## Overview

The verification system includes four types of verification:

1. **Email Verification** - Verifies user email addresses
2. **Phone Verification** - Verifies phone numbers via SMS
3. **Photo Verification** - Verifies user identity through selfie photos
4. **Identity Verification (KYC)** - Full identity verification using government-issued documents

## Table of Contents

- [Email Verification Setup](#email-verification-setup)
- [Phone Verification Setup](#phone-verification-setup)
- [Photo Verification Setup](#photo-verification-setup)
- [Identity Verification (KYC) Setup](#identity-verification-kyc-setup)
- [Verification Badges](#verification-badges)
- [Database Requirements](#database-requirements)
- [Testing Verification](#testing-verification)

---

## Email Verification Setup

### Requirements
- SendGrid account and API key

### Configuration

1. **Get SendGrid API Key:**
   - Sign up at [SendGrid](https://sendgrid.com/)
   - Create an API key with "Mail Send" permissions
   - Verify your sender email address

2. **Environment Variables:**
   ```env
   SENDGRID_API_KEY=SG.your_api_key_here
   FROM_EMAIL=noreply@flamoral.com
   FROM_NAME=Flamoral
   ```

3. **Email Templates:**
   - Verification email templates are configured in `infrastructure/email/email.service.ts`
   - Customize templates as needed

### How It Works

1. User registers with email address
2. System generates a unique verification token (24-hour expiry)
3. Verification email sent with token link
4. User clicks link to verify email
5. Email verified badge awarded automatically

### API Endpoints

- `POST /api/verification/verify-email` - Verify email with token
- `POST /api/verification/resend` - Resend verification email

---

## Phone Verification Setup

### Requirements
- Twilio account with Verify API enabled

### Configuration

1. **Get Twilio Credentials:**
   - Sign up at [Twilio](https://www.twilio.com/)
   - Get Account SID and Auth Token from dashboard
   - Create a Verify Service
   - Get a phone number (optional if using Verify API)

2. **Environment Variables:**
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. **Configuration Options:**
   - Code length: 6 digits (configured in service)
   - Code expiry: 10 minutes
   - Rate limiting: 1 minute between code requests
   - Max attempts: 3 per code

### How It Works

1. User enters phone number
2. System generates 6-digit verification code
3. SMS sent via Twilio
4. User enters code within 10 minutes
5. Phone verified, badge awarded

### API Endpoints

- `POST /api/phone/send-code` - Send verification code
- `POST /api/phone/verify-code` - Verify code
- `POST /api/phone/resend-code` - Resend code
- `GET /api/phone/status` - Get verification status
- `PUT /api/phone` - Update phone number

---

## Photo Verification Setup

### Requirements
- Azure Cognitive Services account (Computer Vision + Face API)

### Configuration

1. **Create Azure Resources:**
   - Create Computer Vision resource
   - Create Face API resource
   - Get API keys and endpoints

2. **Environment Variables:**
   ```env
   AZURE_FACE_API_KEY=your_face_api_key
   AZURE_FACE_API_ENDPOINT=https://your-region.api.cognitive.microsoft.com
   AZURE_CV_KEY=your_computer_vision_key
   AZURE_CV_ENDPOINT=https://your-region.api.cognitive.microsoft.com
   ```

3. **Azure Blob Storage:**
   - Already configured for photo storage
   - Verification selfies stored in `verification/` folder

### How It Works

1. User uploads selfie photo
2. System detects face using Azure Computer Vision
3. Face compared with profile photos using Face API
4. Auto-approval if similarity >= 70%
5. Manual review if similarity < 70%
6. Photo verified badge awarded on approval

### Verification Criteria

- **Liveness Detection:** Checks photo quality (blur, exposure, noise)
- **Pose Verification:** Validates requested pose (smile, neutral, look left/right, etc.)
- **Face Matching:** Compares selfie with existing profile photos
- **Similarity Threshold:** 90% for face match, 85% overall confidence

### API Endpoints

- `POST /api/photo-verification/submit` - Submit verification selfie
- `GET /api/photo-verification/status` - Get verification status
- `GET /api/photo-verification/admin/pending` - Get pending verifications (admin)
- `POST /api/photo-verification/admin/approve/:id` - Approve verification (admin)
- `POST /api/photo-verification/admin/reject/:id` - Reject verification (admin)

### Development Mode

In development mode (`NODE_ENV=development`):
- Liveness checks auto-pass with 90% confidence
- Pose verification auto-passes
- Face matching returns simulated high similarity
- No Azure API calls required

---

## Identity Verification (KYC) Setup

### Supported Providers

The system supports multiple KYC providers:
1. **Stripe Identity** (Recommended)
2. **Persona**
3. **Onfido**
4. **Jumio**
5. **Manual Review** (Fallback)

### Provider Selection

Choose your provider in `.env`:
```env
KYC_PROVIDER=stripe  # or persona, onfido, jumio, or leave empty for manual
```

### Stripe Identity Setup (Recommended)

1. **Requirements:**
   - Stripe account
   - Identity verification enabled

2. **Configuration:**
   ```env
   KYC_PROVIDER=stripe
   STRIPE_SECRET_KEY=sk_test_your_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_key
   ```

3. **Features:**
   - Government ID verification
   - Selfie verification
   - Automatic fraud detection
   - Real-time results

### Persona Setup

1. **Requirements:**
   - Persona account
   - Inquiry template created

2. **Configuration:**
   ```env
   KYC_PROVIDER=persona
   PERSONA_API_KEY=your_api_key
   PERSONA_TEMPLATE_ID=your_template_id
   ```

### Onfido Setup

1. **Requirements:**
   - Onfido account
   - API credentials

2. **Configuration:**
   ```env
   KYC_PROVIDER=onfido
   ONFIDO_API_KEY=your_api_key
   ```

### Jumio Setup

1. **Requirements:**
   - Jumio account
   - API credentials

2. **Configuration:**
   ```env
   KYC_PROVIDER=jumio
   JUMIO_API_TOKEN=your_api_token
   JUMIO_API_SECRET=your_api_secret
   ```

### Manual Review Setup

If no KYC provider is configured, the system falls back to manual review:
- All verifications marked as "requires_review"
- Admin can approve/reject from dashboard
- Typical turnaround: 1-2 business days

### Webhook Configuration

Configure webhooks for real-time verification updates:

**Stripe:**
- Webhook URL: `https://your-domain.com/api/verification/webhook/stripe`
- Events: `identity.verification_session.verified`, `identity.verification_session.requires_input`

**Persona:**
- Webhook URL: `https://your-domain.com/api/verification/webhook/persona`
- Events: `inquiry.completed`, `inquiry.expired`

**Onfido:**
- Webhook URL: `https://your-domain.com/api/verification/webhook/onfido`
- Events: `check.completed`

**Jumio:**
- Callback URL: `https://your-domain.com/api/verification/webhook/jumio`

---

## Verification Badges

### Badge Types

1. **email_verified** - Email address verified
2. **phone_verified** - Phone number verified
3. **photo_verified** - Photo/selfie verified
4. **identity_verified** - Government ID verified (KYC)
5. **fully_verified** - All verifications complete (email + phone + photo)

### Badge Management

Badges are automatically awarded when verifications complete:

```typescript
import verificationBadgeService from './domain/services/verification-badge.service';

// Award badge
await verificationBadgeService.onEmailVerified(userId);
await verificationBadgeService.onPhoneVerified(userId);
await verificationBadgeService.onPhotoVerified(userId);
await verificationBadgeService.onIdentityVerified(userId);

// Sync all badges (ensures consistency)
await verificationBadgeService.syncVerificationBadges(userId);

// Check badge status
const hasBadge = await verificationBadgeService.hasBadge(userId, 'photo_verified');
```

### Verification Levels

Based on verification score (0-100):

- **None (0)**: No verifications
- **Basic (1-49)**: Email verified only
- **Standard (50-89)**: Email + Phone verified
- **Full (90-100)**: Email + Phone + Photo verified

Score calculation:
- Email: 20 points
- Phone: 30 points
- Photo: 40 points
- Identity: 10 bonus points

---

## Database Requirements

### Required Tables

1. **users** - Add verification columns:
   ```sql
   ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false;
   ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;
   ALTER TABLE users ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT false;
   ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP;
   ALTER TABLE users ADD COLUMN IF NOT EXISTS is_photo_verified BOOLEAN DEFAULT false;
   ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_verified_at TIMESTAMP;
   ALTER TABLE users ADD COLUMN IF NOT EXISTS is_identity_verified BOOLEAN DEFAULT false;
   ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMP;
   ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_provider VARCHAR(50);
   ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_reference_id VARCHAR(255);
   ```

2. **verification_tokens** - Email/phone verification codes
3. **photo_verification_requests** - Photo verification records
4. **photo_verifications** - Photo verification history (alternate table)
5. **identity_verifications** - KYC verification records
6. **user_badges** - Verification badges

### Database Migrations

Run migrations to create required tables:
```bash
npm run migrate
```

---

## Testing Verification

### Email Verification

```bash
# Send verification email
curl -X POST http://localhost:3002/api/verification/resend \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'

# Verify email
curl -X POST http://localhost:3002/api/verification/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"your_token_here"}'
```

### Phone Verification

```bash
# Send verification code
curl -X POST http://localhost:3002/api/phone/send-code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"phoneNumber":"+1234567890"}'

# Verify code
curl -X POST http://localhost:3002/api/phone/verify-code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"code":"123456"}'
```

### Photo Verification

```bash
# Submit verification selfie
curl -X POST http://localhost:3002/api/photo-verification/submit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "selfie=@/path/to/selfie.jpg"

# Check status
curl -X GET http://localhost:3002/api/photo-verification/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Complete Verification Status

```bash
# Get all verification statuses
curl -X GET http://localhost:3002/api/verification/status/complete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Troubleshooting

### Email Verification Issues

**Problem:** Emails not sending
- Check SendGrid API key is valid
- Verify sender email is authenticated in SendGrid
- Check SendGrid dashboard for errors
- Ensure FROM_EMAIL matches verified domain

**Problem:** Verification links expired
- Tokens expire after 24 hours
- User must request new verification email
- Check system time is correct

### Phone Verification Issues

**Problem:** SMS not received
- Verify Twilio credentials are correct
- Check phone number format (must be E.164: +1234567890)
- Ensure Twilio account has credit
- Check Twilio logs for delivery errors

**Problem:** "Invalid verification code"
- Codes expire after 10 minutes
- Maximum 3 attempts per code
- Request new code if expired

### Photo Verification Issues

**Problem:** "No face detected"
- Ensure photo contains exactly one face
- Photo must be well-lit and in focus
- Face must be clearly visible
- Try different angle or better lighting

**Problem:** "Face does not match profile photos"
- Ensure profile photos are approved
- Selfie must match profile photos
- Remove glasses/hats if not in profile photos
- Ensure consistent lighting and angle

### Identity Verification Issues

**Problem:** KYC verification pending too long
- Check KYC provider dashboard for status
- Ensure webhook is configured correctly
- Verify webhook URL is accessible
- Check webhook logs for errors

---

## Security Best Practices

1. **Never commit API keys** - Use environment variables only
2. **Use HTTPS in production** - Required for KYC providers
3. **Rotate API keys regularly** - Update in provider dashboard and .env
4. **Monitor verification attempts** - Watch for abuse patterns
5. **Implement rate limiting** - Already configured in routes
6. **Log all verifications** - Audit trail for compliance
7. **Secure webhook endpoints** - Validate signatures from providers

---

## Support

For additional help:
- Check service logs: `npm run logs`
- Review API documentation: `http://localhost:3002/api-docs`
- Check provider status pages:
  - [SendGrid Status](https://status.sendgrid.com/)
  - [Twilio Status](https://status.twilio.com/)
  - [Azure Status](https://status.azure.com/)
  - [Stripe Status](https://status.stripe.com/)

---

## Next Steps

1. Configure environment variables in `.env`
2. Run database migrations
3. Test each verification type
4. Configure webhooks for KYC provider
5. Set up monitoring and alerts
6. Review and customize email templates
7. Configure admin dashboard for manual reviews

---

**Last Updated:** December 2025
**Version:** 1.0.0
