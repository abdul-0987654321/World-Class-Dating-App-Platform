# Complete Verification System API Documentation

## Overview

The Flamoral verification system now includes **ALL 7 verification types** with complete API implementations:

1. Email Verification
2. Phone Verification (OTP)
3. Government ID Verification
4. Selfie Verification
5. Liveness Check
6. Video Verification
7. Biometric Verification

## Architecture

### Files Created/Modified

#### New Routes File
- `src/api/routes/verification-unified.routes.ts` - Unified routes for all 7 verification types

#### New Controller
- `src/api/controllers/identity-verification.controller.ts` - Government ID verification controller

#### New Migration
- `src/infrastructure/database/migrations/20251216000001_create_all_verification_tables.ts` - Creates:
  - `video_verifications` table
  - `biometric_verifications` table
  - `user_verifications` table (consolidated verification status)
  - Additional columns in `users` table

#### Modified Services
- `src/domain/services/verification-status.service.ts` - Updated to include all 7 verification types
- `src/domain/services/identity-verification.service.ts` - Already exists, integrated

### Database Schema

#### New Tables

**video_verifications**
```sql
- id (string, primary key)
- user_id (uuid, foreign key to users)
- session_id (string)
- video_url (text)
- status (enum: pending, approved, rejected)
- confidence_score (decimal)
- rejection_reason (text)
- reviewed_by (uuid, foreign key to users)
- submitted_at (timestamp)
- reviewed_at (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

**biometric_verifications**
```sql
- id (string, primary key)
- user_id (uuid, foreign key to users)
- session_id (string)
- biometric_type (enum: face_id, touch_id, fingerprint, iris)
- public_key (text)
- status (enum: pending, approved, rejected)
- verified_at (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

**user_verifications** (Consolidated Status Table)
```sql
- user_id (uuid, primary key)
- email_verified (boolean)
- email_verified_at (timestamp)
- phone_verified (boolean)
- phone_verified_at (timestamp)
- phone_number (string)
- photo_verified (boolean)
- photo_verified_at (timestamp)
- photo_status (enum: none, pending, approved, rejected)
- government_id_verified (boolean)
- government_id_verified_at (timestamp)
- government_id_status (enum: none, pending, approved, rejected)
- government_id_provider (string)
- liveness_verified (boolean)
- liveness_verified_at (timestamp)
- video_verified (boolean)
- video_verified_at (timestamp)
- video_status (enum: none, pending, approved, rejected)
- biometric_verified (boolean)
- biometric_verified_at (timestamp)
- biometric_type (string)
- verification_score (integer, 0-100)
- verification_level (enum: none, basic, standard, full)
- created_at (timestamp)
- updated_at (timestamp)
```

## API Endpoints

### 1. Email Verification

#### Initiate Email Verification
```
POST /api/verification/email/initiate
Content-Type: application/json
Authorization: Bearer <token>

{
  "email": "user@example.com"
}

Response 200:
{
  "success": true,
  "message": "Verification email sent successfully"
}
```

#### Submit Email Verification
```
POST /api/verification/email/submit
Content-Type: application/json

{
  "token": "verification_token_from_email"
}

Response 200:
{
  "success": true,
  "message": "Email verified successfully"
}
```

#### Get Email Verification Status
```
GET /api/verification/email/status
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "verified": true,
    "verifiedAt": "2025-12-16T10:00:00Z"
  }
}
```

### 2. Phone Verification (OTP)

#### Initiate Phone Verification
```
POST /api/verification/phone/initiate
Content-Type: application/json
Authorization: Bearer <token>

{
  "phoneNumber": "+1234567890"
}

Response 200:
{
  "success": true,
  "message": "Verification code sent via SMS"
}
```

#### Submit Phone Verification
```
POST /api/verification/phone/submit
Content-Type: application/json
Authorization: Bearer <token>

{
  "code": "123456"
}

Response 200:
{
  "success": true,
  "message": "Phone verified successfully"
}
```

#### Get Phone Verification Status
```
GET /api/verification/phone/status
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "verified": true,
    "verifiedAt": "2025-12-16T10:05:00Z",
    "phoneNumber": "+1234567890",
    "hasPendingVerification": false
  }
}
```

### 3. Government ID Verification

#### Initiate Government ID Verification
```
POST /api/verification/government-id/initiate
Content-Type: application/json
Authorization: Bearer <token>

{
  "documentType": "passport" // or "drivers_license", "national_id"
}

Response 200:
{
  "success": true,
  "verificationId": "stripe_session_id_123",
  "status": "pending",
  "message": "Verification session created"
}
```

#### Submit Government ID Documents
```
POST /api/verification/government-id/submit
Content-Type: multipart/form-data
Authorization: Bearer <token>

Fields:
- documentFront: file (required)
- documentBack: file (optional, not needed for passport)
- selfie: file (required)
- firstName: string (required)
- lastName: string (required)
- dateOfBirth: string (required, format: YYYY-MM-DD)
- documentType: string (required)
- documentNumber: string (optional)
- address: JSON string (optional)

Response 200:
{
  "success": true,
  "verificationId": "manual_1234567890_abcd1234",
  "status": "requires_review",
  "message": "Documents submitted for manual review"
}
```

#### Get Government ID Verification Status
```
GET /api/verification/government-id/status
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "verified": false,
    "verifiedAt": null,
    "latestVerification": {
      "id": "manual_1234567890_abcd1234",
      "provider": "manual",
      "status": "pending",
      "submittedAt": "2025-12-16T10:10:00Z",
      "reviewedAt": null,
      "rejectionReason": null
    }
  }
}
```

### 4. Selfie Verification

#### Initiate Selfie Verification
```
POST /api/verification/selfie/initiate
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "verificationId": "uuid-here",
  "pose": "smile",  // Random pose requirement
  "expiresAt": "2025-12-16T10:20:00Z"
}
```

#### Submit Selfie
```
POST /api/verification/selfie/submit
Content-Type: multipart/form-data
Authorization: Bearer <token>

Fields:
- verificationId: string (required)
- selfie: file (required)

Response 200:
{
  "success": true,
  "verified": true,
  "confidence": 0.95,
  "livenessDetected": true,
  "faceMatch": true
}
```

#### Get Selfie Verification Status
```
GET /api/verification/selfie/status
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "verified": true,
    "verifiedAt": "2025-12-16T10:15:00Z",
    "latestRequest": {
      "id": "uuid-here",
      "status": "approved",
      "createdAt": "2025-12-16T10:14:00Z"
    }
  }
}
```

### 5. Liveness Check

#### Initiate Liveness Check
```
POST /api/verification/liveness/initiate
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "sessionId": "liveness_1234567890_abcd1234",
  "expiresAt": "2025-12-16T10:20:00Z",
  "instructions": "Please follow the on-screen prompts..."
}
```

#### Submit Liveness Check
```
POST /api/verification/liveness/submit
Content-Type: multipart/form-data
Authorization: Bearer <token>

Fields:
- sessionId: string (required)
- media: file (required)

Response 200:
{
  "success": true,
  "passed": true,
  "confidence": 0.95,
  "message": "Liveness check passed successfully"
}
```

#### Get Liveness Check Status
```
GET /api/verification/liveness/status
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "passed": true,
    "verifiedAt": "2025-12-16T10:15:00Z",
    "latestCheck": {
      "id": "uuid-here",
      "status": "approved"
    }
  }
}
```

### 6. Video Verification

#### Initiate Video Verification
```
POST /api/verification/video/initiate
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "sessionId": "video_1234567890_abcd1234",
  "expiresAt": "2025-12-16T10:25:00Z",
  "challenges": [
    "Say your full name",
    "Show your face from the left side",
    "Smile at the camera"
  ],
  "maxDuration": 60  // seconds
}
```

#### Submit Video
```
POST /api/verification/video/submit
Content-Type: multipart/form-data
Authorization: Bearer <token>

Fields:
- sessionId: string (required)
- video: file (required)

Response 200:
{
  "success": true,
  "verificationId": "vid_1234567890_abcd1234",
  "status": "pending",
  "message": "Video submitted for review. This typically takes 1-2 business days."
}
```

#### Get Video Verification Status
```
GET /api/verification/video/status
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "verified": false,
    "status": "pending",
    "submittedAt": "2025-12-16T10:16:00Z",
    "reviewedAt": null,
    "rejectionReason": null
  }
}
```

### 7. Biometric Verification

#### Initiate Biometric Verification
```
POST /api/verification/biometric/initiate
Content-Type: application/json
Authorization: Bearer <token>

{
  "biometricType": "face_id"  // or "touch_id", "fingerprint", "iris"
}

Response 200:
{
  "success": true,
  "sessionId": "bio_1234567890_abcd1234",
  "challenge": "base64_encoded_challenge",
  "expiresAt": "2025-12-16T10:21:00Z"
}
```

#### Submit Biometric Data
```
POST /api/verification/biometric/submit
Content-Type: application/json
Authorization: Bearer <token>

{
  "sessionId": "bio_1234567890_abcd1234",
  "signature": "biometric_signature_from_device",
  "publicKey": "public_key_for_verification"
}

Response 200:
{
  "success": true,
  "verified": true,
  "message": "Biometric verification successful"
}
```

#### Get Biometric Verification Status
```
GET /api/verification/biometric/status
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "verified": true,
    "verifiedAt": "2025-12-16T10:17:00Z",
    "latestVerification": {
      "id": "bioverif_1234567890_abcd1234",
      "verifiedAt": "2025-12-16T10:17:00Z",
      "type": "biometric"
    }
  }
}
```

### Complete Verification Status

#### Get Complete Status (All Verification Types)
```
GET /api/verification/status/complete
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "userId": "uuid-here",
    "email": {
      "verified": true,
      "verifiedAt": "2025-12-16T10:00:00Z"
    },
    "phone": {
      "verified": true,
      "verifiedAt": "2025-12-16T10:05:00Z",
      "phoneNumber": "+1234567890",
      "hasPendingVerification": false
    },
    "governmentId": {
      "verified": true,
      "verifiedAt": "2025-12-16T11:00:00Z",
      "status": "approved",
      "provider": "stripe",
      "referenceId": "stripe_session_123"
    },
    "selfie": {
      "verified": true,
      "verifiedAt": "2025-12-16T10:15:00Z",
      "status": "approved",
      "submittedAt": "2025-12-16T10:14:00Z",
      "rejectionReason": null
    },
    "liveness": {
      "verified": true,
      "verifiedAt": "2025-12-16T10:15:00Z",
      "passed": true
    },
    "video": {
      "verified": true,
      "verifiedAt": "2025-12-16T12:00:00Z",
      "status": "approved",
      "submittedAt": "2025-12-16T10:16:00Z"
    },
    "biometric": {
      "verified": true,
      "verifiedAt": "2025-12-16T10:17:00Z",
      "type": "face_id"
    },
    "overall": {
      "isFullyVerified": true,
      "verificationScore": 100,
      "hasAnyVerification": true,
      "verificationLevel": "full"
    }
  }
}
```

## Verification Scoring System

The verification score is calculated out of 100 points:

| Verification Type | Points | Category |
|------------------|---------|----------|
| Email | 15 | Core |
| Phone (OTP) | 20 | Core |
| Selfie | 25 | Core |
| Government ID | 20 | Core |
| Liveness Check | 10 | Core |
| Video | 5 | Bonus |
| Biometric | 5 | Bonus |
| **Total** | **100** | |

### Verification Levels

- **None** (0 points): No verifications complete
- **Basic** (1-49 points): Email verified only
- **Standard** (50-89 points): Email + Phone + Selfie verified
- **Full** (90-100 points): All core verifications + optional bonus verifications

## Integration Steps

### 1. Run Database Migration

```bash
cd backend/services/user-service
npm run migrate
```

This will create:
- `video_verifications` table
- `biometric_verifications` table
- `user_verifications` table
- New columns in `users` table

### 2. Update Route Registration

In `src/index.ts`, replace the existing verification routes with:

```typescript
// Replace this:
// app.use('/api/verification', verificationRoutes);

// With this:
import verificationUnifiedRoutes from './api/routes/verification-unified.routes';
app.use('/api/verification', verificationUnifiedRoutes);
```

### 3. Configure Environment Variables

Add these to `.env`:

```env
# KYC Provider (choose one: stripe, persona, onfido, jumio, manual)
KYC_PROVIDER=stripe

# Stripe Identity (if using Stripe)
STRIPE_SECRET_KEY=sk_test_...

# Persona (if using Persona)
PERSONA_API_KEY=persona_...
PERSONA_TEMPLATE_ID=tmpl_...

# Onfido (if using Onfido)
ONFIDO_API_KEY=api_token_...

# Jumio (if using Jumio)
JUMIO_API_TOKEN=...
JUMIO_API_SECRET=...

# Storage URL for uploaded media
STORAGE_BASE_URL=https://storage.flamoral.com
```

### 4. Test Endpoints

Use the provided Postman collection or test manually:

```bash
# Get complete verification status
curl -X GET http://localhost:3002/api/verification/status/complete \
  -H "Authorization: Bearer <your_token>"

# Initiate phone verification
curl -X POST http://localhost:3002/api/verification/phone/initiate \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

## Testing

### Unit Tests

```bash
npm test -- verification-status.service.test.ts
npm test -- identity-verification.service.test.ts
```

### Integration Tests

```bash
npm run test:integration
```

### Manual Testing Checklist

- [ ] Email verification flow (initiate → submit → status)
- [ ] Phone verification flow (initiate → submit → status)
- [ ] Government ID flow (initiate → submit → status)
- [ ] Selfie flow (initiate → submit → status)
- [ ] Liveness check flow (initiate → submit → status)
- [ ] Video verification flow (initiate → submit → status)
- [ ] Biometric flow (initiate → submit → status)
- [ ] Complete status endpoint returns all 7 verification types
- [ ] Verification score calculation is correct
- [ ] Database persistence works for all types

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid input)
- `401`: Unauthorized (missing/invalid auth token)
- `404`: Resource not found
- `429`: Rate limit exceeded
- `500`: Internal server error

## Security Considerations

1. **Rate Limiting**: All endpoints use `authLimiter` middleware
2. **Authentication**: Most endpoints require valid JWT token
3. **File Upload**: Limited to 10MB, images/PDFs only
4. **Webhook Signature Verification**: Validate all KYC provider webhooks
5. **Data Encryption**: Store sensitive biometric data securely
6. **GDPR Compliance**: Include data retention policies

## Production Checklist

Before deploying to production:

- [ ] All environment variables configured
- [ ] Database migrations run successfully
- [ ] All verification flows tested end-to-end
- [ ] KYC provider webhooks set up and tested
- [ ] File storage configured (S3, Azure Blob, etc.)
- [ ] Rate limiting configured appropriately
- [ ] Monitoring and alerting set up
- [ ] Error logging configured
- [ ] Data retention policies implemented
- [ ] GDPR compliance verified

## Support

For issues or questions:
1. Check logs: `npm run logs`
2. Review this documentation
3. Check provider status pages
4. Contact the development team

## Version History

- **v2.0.0** (2025-12-16): Complete implementation of all 7 verification types
  - Added Government ID verification
  - Added Selfie verification (separate from photo)
  - Added Liveness check
  - Added Video verification
  - Added Biometric verification
  - Created unified verification routes
  - Updated verification scoring system
  - Created consolidated `user_verifications` table

---

**Last Updated**: December 16, 2025
**Status**: ✅ Complete - All 7 verification types implemented
