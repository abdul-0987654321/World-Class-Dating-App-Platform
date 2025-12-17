# Flamoral Verification System

## Overview

The Flamoral verification system provides comprehensive identity and authenticity verification for users. It includes email, phone, photo, and identity (KYC) verification with automatic badge management and verification scoring.

## Quick Start

### 1. Install Dependencies
```bash
cd backend/services/user-service
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

**Minimum Required (for development):**
```env
# Email verification (required)
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@flamoral.com

# Phone verification (optional in dev)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
```

**Production Requirements:**
- All email, phone, and photo verification services
- Choose one KYC provider (recommended: Stripe)

### 3. Run Migrations
```bash
npm run migrate
```

### 4. Start Service
```bash
npm run dev
```

## Verification Types

### 1. Email Verification
**Status:** Production Ready
**Provider:** SendGrid
**Auto-Award Badge:** ✅ Yes

Verifies user email addresses through token-based verification.

**Endpoints:**
- `POST /api/verification/verify-email` - Verify email
- `POST /api/verification/resend` - Resend verification

**Scoring:** 20 points

### 2. Phone Verification
**Status:** Production Ready
**Provider:** Twilio
**Auto-Award Badge:** ✅ Yes

Verifies phone numbers through SMS code verification.

**Endpoints:**
- `POST /api/phone/send-code` - Send verification code
- `POST /api/phone/verify-code` - Verify code
- `POST /api/phone/resend-code` - Resend code
- `GET /api/phone/status` - Get status
- `PUT /api/phone` - Update phone number

**Scoring:** 30 points

### 3. Photo Verification
**Status:** Production Ready
**Provider:** Azure Cognitive Services
**Auto-Award Badge:** ✅ Yes

Verifies user identity through selfie photo matching.

**Endpoints:**
- `POST /api/photo-verification/submit` - Submit selfie
- `GET /api/photo-verification/status` - Get status
- `GET /api/photo-verification/admin/pending` - Admin: Get pending
- `POST /api/photo-verification/admin/approve/:id` - Admin: Approve
- `POST /api/photo-verification/admin/reject/:id` - Admin: Reject

**Features:**
- Liveness detection (anti-spoofing)
- Pose verification (smile, neutral, look left/right)
- Face matching with profile photos
- Auto-approval at 70% similarity
- Manual review for borderline cases

**Scoring:** 40 points

### 4. Identity Verification (KYC)
**Status:** Production Ready
**Providers:** Stripe, Persona, Onfido, Jumio, Manual
**Auto-Award Badge:** ✅ Yes

Full identity verification using government-issued documents.

**Supported Providers:**
1. **Stripe Identity** (Recommended) - Easy integration, reliable
2. **Persona** - Flexible, customizable
3. **Onfido** - Global coverage
4. **Jumio** - High security
5. **Manual Review** - Fallback for all

**Features:**
- Document verification (passport, driver's license, national ID)
- Selfie matching with document photo
- Age verification
- Address verification
- Fraud detection
- Real-time webhooks

**Scoring:** 10 bonus points

## Verification Status API

### Get Complete Status
```bash
GET /api/verification/status/complete
```

Returns comprehensive verification status including:
- All verification types (email, phone, photo, identity)
- Verification timestamps
- Overall verification score (0-100)
- Verification level (none/basic/standard/full)
- Next recommended step

**Example Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": {
      "verified": true,
      "verifiedAt": "2025-12-15T10:00:00Z"
    },
    "phone": {
      "verified": true,
      "verifiedAt": "2025-12-15T11:00:00Z",
      "phoneNumber": "+1234567890",
      "hasPendingVerification": false
    },
    "photo": {
      "verified": true,
      "verifiedAt": "2025-12-15T12:00:00Z",
      "status": "approved"
    },
    "identity": {
      "verified": false,
      "verifiedAt": null
    },
    "overall": {
      "isFullyVerified": true,
      "verificationScore": 90,
      "hasAnyVerification": true,
      "verificationLevel": "full"
    }
  }
}
```

### Get Verification Badges
```bash
GET /api/verification/badges
```

Returns all earned verification badges with display information.

### Get Next Step
```bash
GET /api/verification/next-step
```

Returns recommended next verification step.

### Sync Badges
```bash
POST /api/verification/badges/sync
```

Synchronizes badges with current verification status.

## Verification Levels

### None (0 points)
- No verifications complete
- Limited platform access

### Basic (1-49 points)
- Email verified
- Basic platform features

### Standard (50-89 points)
- Email + Phone verified
- Access to messaging and matching
- Recommended minimum for dating features

### Full (90-100 points)
- Email + Phone + Photo verified
- Full platform access
- Trusted user status
- Priority in matching algorithm

## Verification Badges

### Available Badges

1. **email_verified**
   - Icon: mail-check
   - Color: Green (#4CAF50)
   - Awarded: Automatically on email verification

2. **phone_verified**
   - Icon: phone-check
   - Color: Blue (#2196F3)
   - Awarded: Automatically on phone verification

3. **photo_verified**
   - Icon: shield-check
   - Color: Orange (#FF9800)
   - Awarded: Automatically on photo verification

4. **identity_verified**
   - Icon: verified
   - Color: Purple (#9C27B0)
   - Awarded: Automatically on identity verification

5. **fully_verified**
   - Icon: badge-check
   - Color: Pink (#E91E63)
   - Awarded: Automatically when email + phone + photo verified

### Badge Management

Badges are automatically managed by the system:
- Awarded immediately upon verification
- Synced on user login
- Revoked if verification status changes
- Displayed on user profiles

## Architecture

### Services

1. **VerificationService** (`domain/services/verification.service.ts`)
   - Email verification logic
   - Token management

2. **PhoneVerificationService** (`domain/services/phone-verification.service.ts`)
   - Phone verification logic
   - SMS code management
   - Twilio integration

3. **PhotoVerificationService** (`domain/services/photo-verification.service.ts`)
   - Photo verification logic
   - Azure Cognitive Services integration
   - Face detection and matching
   - Liveness detection

4. **IdentityVerificationService** (`domain/services/identity-verification.service.ts`)
   - KYC verification logic
   - Multi-provider support
   - Webhook handling
   - Document verification

5. **VerificationStatusService** (`domain/services/verification-status.service.ts`)
   - Comprehensive status aggregation
   - Verification scoring
   - Level calculation
   - Next step recommendations

6. **VerificationBadgeService** (`domain/services/verification-badge.service.ts`)
   - Badge awarding
   - Badge revocation
   - Badge synchronization
   - Display information

### Database Schema

**users table:**
- `is_email_verified` (boolean)
- `email_verified_at` (timestamp)
- `is_phone_verified` (boolean)
- `phone_verified_at` (timestamp)
- `is_photo_verified` (boolean)
- `photo_verified_at` (timestamp)
- `is_identity_verified` (boolean)
- `identity_verified_at` (timestamp)
- `kyc_provider` (varchar)
- `kyc_reference_id` (varchar)

**verification_tokens table:**
- Email and phone verification codes
- Expiry tracking
- Usage tracking

**photo_verification_requests table:**
- Photo verification submissions
- Pose requirements
- Verification results

**identity_verifications table:**
- KYC verification records
- Provider information
- Verification status

**user_badges table:**
- Verification badges
- Award timestamps
- Active status

## Development

### Testing

```bash
# Run all tests
npm test

# Test specific verification type
npm test -- verification.service.test.ts
npm test -- phone-verification.service.test.ts
npm test -- photo-verification.service.test.ts

# Integration tests
npm run test:integration
```

### Development Mode

In development (`NODE_ENV=development`):
- Photo verification auto-passes without Azure API
- Liveness checks return mock data
- Reduced rate limiting
- Detailed error logging

### Debugging

Enable debug logging:
```env
LOG_LEVEL=debug
```

View verification logs:
```bash
npm run logs:verification
```

## Production Deployment

### Checklist

**Pre-Deployment:**
- [ ] Configure all environment variables
- [ ] Run database migrations
- [ ] Set up SendGrid with verified domain
- [ ] Configure Twilio with verified phone number
- [ ] Set up Azure Cognitive Services
- [ ] Choose and configure KYC provider
- [ ] Set up webhooks for KYC provider
- [ ] Test all verification flows
- [ ] Configure monitoring and alerts

**Post-Deployment:**
- [ ] Monitor verification success rates
- [ ] Check webhook deliveries
- [ ] Review manual verification queue
- [ ] Monitor API usage and costs
- [ ] Set up backup verification methods

### Monitoring

**Key Metrics:**
- Email verification rate
- Phone verification rate
- Photo verification success rate
- Photo verification auto-approval rate
- Identity verification approval rate
- Average verification time
- Verification abandonment rate

**Alerts:**
- Email delivery failures
- SMS delivery failures
- High photo verification rejection rate
- KYC webhook failures
- API rate limit warnings
- Unusual verification patterns

### Security

**Best Practices:**
- Never commit API keys (use environment variables)
- Use HTTPS in production (required)
- Validate all webhook signatures
- Implement rate limiting (already configured)
- Log all verification attempts
- Monitor for fraud patterns
- Rotate API keys regularly
- Use strong token generation
- Implement token expiry
- Secure verification endpoints

## Troubleshooting

See [VERIFICATION_SETUP.md](./VERIFICATION_SETUP.md) for detailed troubleshooting guide.

## Documentation

- [Setup Guide](./VERIFICATION_SETUP.md) - Complete setup instructions
- [Fixes Summary](./VERIFICATION_FIXES_SUMMARY.md) - Recent changes
- [API Documentation](http://localhost:3002/api-docs) - Swagger docs

## Support

**Issues:**
- Check logs: `npm run logs`
- Review error messages
- Check provider status pages
- Verify environment configuration

**Provider Status:**
- [SendGrid Status](https://status.sendgrid.com/)
- [Twilio Status](https://status.twilio.com/)
- [Azure Status](https://status.azure.com/)
- [Stripe Status](https://status.stripe.com/)

## License

Internal use only - Flamoral Dating Platform

---

**Last Updated:** December 15, 2025
**Version:** 2.0.0
**Status:** Production Ready ✅
