# Security & Compliance Implementation Guide

## Overview

This document outlines the comprehensive security and compliance features implemented in the dating app platform, including end-to-end encryption, GDPR/CCPA compliance, and security hardening measures.

## Table of Contents

1. [End-to-End Message Encryption](#end-to-end-message-encryption)
2. [GDPR Compliance](#gdpr-compliance)
3. [CCPA Compliance](#ccpa-compliance)
4. [Security Hardening](#security-hardening)
5. [Account Security](#account-security)
6. [Session Management](#session-management)
7. [API Endpoints](#api-endpoints)
8. [Database Schema](#database-schema)
9. [Best Practices](#best-practices)

---

## End-to-End Message Encryption

### Overview

Messages are encrypted using a Signal Protocol-like implementation, ensuring that only the sender and recipient can read message contents.

### Architecture

**Key Components:**
- **EncryptionService**: Core encryption/decryption operations
- **KeyManagementService**: Manages encryption keys lifecycle

### Key Types

1. **Identity Key Pair** (Long-term)
   - Generated once per user
   - Used to verify identity
   - Stored securely in database

2. **Signed Pre-Key** (Medium-term)
   - Rotates every 30 days
   - Signed by identity key
   - Used for initial key exchange

3. **One-Time Pre-Keys** (Short-term)
   - Pool of 100 keys per user
   - Used once per conversation initiation
   - Automatically replenished when low

4. **Session Keys**
   - Generated per conversation
   - Derived from DH key exchanges
   - Includes root key and chain key

### Encryption Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Message Encryption Flow                   │
└─────────────────────────────────────────────────────────────┘

1. User A initiates conversation with User B
   ↓
2. User A fetches User B's public keys:
   - Identity Key (IK_B)
   - Signed Pre-Key (SPK_B)
   - One-Time Pre-Key (OPK_B) [optional]
   ↓
3. User A performs X3DH key exchange:
   - DH1 = DH(IK_A, SPK_B)
   - DH2 = DH(EK_A, IK_B)
   - DH3 = DH(EK_A, SPK_B)
   - DH4 = DH(EK_A, OPK_B) [if OPK exists]
   ↓
4. Derive root key from DH outputs
   ↓
5. Derive chain key and message key
   ↓
6. Encrypt message with message key (AES-256-GCM)
   ↓
7. Store encrypted message with IV and auth tag
```

### Implementation

#### Initializing User Keys

```typescript
import { KeyManagementService } from './services/key-management.service';

const keyService = new KeyManagementService(db);

// Initialize keys on user registration
const keys = await keyService.initializeUserKeys(userId);
```

#### Encrypting a Message

```typescript
import encryptionService from './services/encryption.service';

// Get session key for conversation
const sessionKey = await keyService.getSessionKey(conversationId);

// Derive message key
const { messageKey, newChainKey } = await encryptionService.deriveMessageKey(
  Buffer.from(sessionKey.chain_key, 'base64')
);

// Encrypt message
const encrypted = await encryptionService.encryptMessage(
  plaintext,
  messageKey
);

// Update chain key
await keyService.updateSessionKey(
  conversationId,
  newChainKey,
  sessionKey.message_number + 1
);
```

#### Key Rotation

```typescript
// Rotate signed pre-key (run daily via cron)
await keyService.rotateSignedPreKey(userId);

// Replenish one-time pre-keys (when count < 20)
await keyService.replenishOneTimePreKeys(userId);

// Cleanup expired keys (run daily)
await keyService.cleanupExpiredKeys();
```

### Security Considerations

- Private keys are encrypted at rest
- Key exchange uses Diffie-Hellman for forward secrecy
- Message keys are derived using HKDF
- Each message uses a unique key (ratcheting)
- Keys are securely deleted after use

---

## GDPR Compliance

### Overview

Full compliance with EU General Data Protection Regulation (GDPR), including data subject rights.

### Key Features

1. **Right of Access (Article 15)**
   - Users can request all their data
   - Data exported as JSON in ZIP format
   - Includes README with data explanation

2. **Right to Erasure (Article 17)**
   - Complete account deletion
   - 30-day grace period
   - Cancellable with token
   - Cascading deletion of all user data

3. **Consent Management (Article 7)**
   - Granular consent tracking
   - Version control for terms updates
   - Audit trail with IP and user agent
   - Withdraw consent anytime

4. **Data Retention Policies**
   - Automatic deletion of old data
   - Configurable retention periods
   - Compliance with legal requirements

### Implementation

#### Request Data Export

```typescript
import { GDPRComplianceService } from './services/gdpr-compliance.service';

const gdprService = new GDPRComplianceService(db);

// Request export
const request = await gdprService.requestDataExport(userId);

// Check status
const status = await gdprService.getExportRequestStatus(requestId, userId);

// Export includes:
// - User profile and settings
// - Photos and media
// - Messages (without encryption keys)
// - Matches and swipes
// - Payment history
// - Consent records
// - Login history (last 90 days)
```

#### Request Account Deletion

```typescript
// Request deletion (30-day grace period)
const deletion = await gdprService.requestAccountDeletion(
  userId,
  ipAddress,
  userAgent
);

// User receives cancellation token
const cancellationToken = deletion.cancellation_token;

// Cancel deletion (within grace period)
await gdprService.cancelAccountDeletion(userId, cancellationToken);

// Automatic deletion (cron job)
await gdprService.processPendingDeletions();
```

#### Consent Management

```typescript
import { ConsentManagementService } from './services/consent-management.service';

const consentService = new ConsentManagementService(db);

// Record consent
await consentService.recordConsent(
  userId,
  'privacy_policy',
  true,
  ipAddress,
  userAgent
);

// Record bulk consents (registration)
await consentService.recordBulkConsents(
  userId,
  {
    terms_of_service: true,
    privacy_policy: true,
    data_processing: true,
    profile_visibility: true,
    location_data: true,
    push_notifications: false,
  },
  ipAddress,
  userAgent
);

// Check consent
const hasConsent = await consentService.hasConsent(userId, 'marketing_emails');

// Withdraw consent
await consentService.withdrawConsent(userId, 'marketing_emails');
```

### Consent Types

| Type | Required | Category | Description |
|------|----------|----------|-------------|
| terms_of_service | Yes | Essential | Terms acceptance |
| privacy_policy | Yes | Essential | Privacy policy acceptance |
| data_processing | Yes | Essential | Core service data processing |
| profile_visibility | Yes | Essential | Show profile to others |
| location_data | No | Functional | Location services |
| push_notifications | No | Functional | Push notifications |
| email_notifications | No | Functional | Email notifications |
| analytics | No | Analytics | Usage analytics |
| personalized_ads | No | Marketing | Targeted advertising |
| marketing_emails | No | Marketing | Marketing communications |
| third_party_sharing | No | Marketing | Share with partners |
| data_retention | Yes | Essential | Data retention policy |

---

## CCPA Compliance

### Overview

Compliance with California Consumer Privacy Act (CCPA), providing California residents with privacy rights.

### Key Features

1. **Right to Know**
   - What data is collected
   - How data is used
   - Who data is shared with

2. **Right to Delete**
   - Request deletion of personal information
   - Same as GDPR right to erasure

3. **Right to Opt-Out**
   - Do Not Sell My Personal Information
   - Do Not Share My Personal Information
   - Limit Use of Sensitive Personal Information

4. **Right to Non-Discrimination**
   - Equal service regardless of privacy choices

5. **Data Access Logging**
   - Track all data access
   - Maintain 2-year audit trail

### Implementation

#### Opt-Out Preferences

```typescript
import { CCPAComplianceService } from './services/ccpa-compliance.service';

const ccpaService = new CCPAComplianceService(db);

// Opt-out of data sale
await ccpaService.optOutOfSale(userId, ipAddress, userAgent);

// Opt-out of data sharing
await ccpaService.optOutOfSharing(userId, ipAddress, userAgent);

// Limit sensitive data use
await ccpaService.limitSensitiveDataUse(userId, ipAddress, userAgent);

// Opt back in
await ccpaService.optInToDataUse(userId, 'do_not_sell');
```

#### Data Access Logging

```typescript
// Log data access (automatic)
await ccpaService.logDataAccess(
  userId,
  'read',
  'personal_information',
  'system',
  'Profile view',
  ipAddress
);

// Get access logs
const logs = await ccpaService.getDataAccessLogs(userId, 100, 0);
```

#### Data Disclosure

```typescript
// Get CCPA-compliant data disclosure
const disclosure = await ccpaService.getDataDisclosure(userId);

// Includes:
// - Categories of data collected
// - Sources of data
// - Purposes of collection
// - Third parties data is shared with
// - User's opt-out status
```

### Data Categories

1. **Identifiers**: Name, email, phone, user ID
2. **Personal Information**: Profile, photos, bio
3. **Protected Classifications**: Age, gender, orientation
4. **Commercial Information**: Purchases, subscriptions
5. **Internet Activity**: App usage, clicks, swipes
6. **Geolocation**: Location data
7. **Inferences**: Preferences, compatibility scores

---

## Security Hardening

### Input Sanitization

Prevents XSS, SQL injection, and other injection attacks.

```typescript
import { SecurityMiddleware } from './middleware/security.middleware';

// Apply to all routes
app.use(SecurityMiddleware.sanitizeBody);
app.use(SecurityMiddleware.detectAttackPatterns);
app.use(SecurityMiddleware.preventParameterPollution);
```

**Features:**
- HTML entity encoding
- SQL pattern detection
- XSS prevention
- Command injection prevention
- NoSQL injection prevention
- Parameter pollution protection

### CSRF Protection

```typescript
// Set CSRF token
app.use(SecurityMiddleware.setCSRFToken);

// Validate CSRF token
app.post('/api/*', SecurityMiddleware.csrfProtection);
```

**How it works:**
1. Token generated and stored in session
2. Token sent to client via header
3. Client includes token in requests
4. Server validates token matches session

### Security Headers

```typescript
app.use(SecurityMiddleware.setSecurityHeaders);
```

**Headers set:**
- Content-Security-Policy
- X-XSS-Protection
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy
- Permissions-Policy
- Strict-Transport-Security (HSTS)

### File Upload Security

```typescript
app.use(SecurityMiddleware.validateFileUpload);
```

**Validations:**
- Allowed MIME types only
- File size limits (10MB)
- Extension matches MIME type
- No executable files

### Additional Protections

```typescript
// User agent validation
app.use(SecurityMiddleware.validateUserAgent);

// Request size limiter
app.use(SecurityMiddleware.limitRequestSize(10 * 1024 * 1024));

// Origin validation
app.use(SecurityMiddleware.validateOrigin(['https://app.example.com']));

// IP blacklist
app.use(SecurityMiddleware.checkIPBlacklist(blacklistedIPs));

// Timing attack prevention (auth endpoints)
app.post('/api/auth/*', SecurityMiddleware.preventTimingAttack);
```

---

## Account Security

### Features

1. **Login Attempt Tracking**
   - Record all login attempts
   - Track IP address and user agent
   - Distinguish success/failure

2. **Brute Force Protection**
   - Max 5 failed attempts in 15 minutes
   - Account lockout after threshold
   - IP-based rate limiting (20 attempts per IP)

3. **Account Lockout**
   - Temporary lockout (30 minutes)
   - Permanent lockout (admin action)
   - Unlock tokens for temporary locks
   - Automatic unlock when expired

### Implementation

```typescript
import { AccountSecurityService } from './services/account-security.service';

const securityService = new AccountSecurityService(db);

// Record login attempt
await securityService.recordLoginAttempt(
  email,
  ipAddress,
  success,
  userId,
  userAgent,
  failureReason
);

// Check account lock status
const { isLocked, lockout } = await securityService.isAccountLocked(userId);

// Lock account
await securityService.lockAccount(
  userId,
  'temporary',
  'Too many failed login attempts',
  30 // minutes
);

// Unlock account
await securityService.unlockAccount(userId, unlockToken);
```

### Rate Limiting

```typescript
// Apply to login endpoint
router.post('/login', securityService.rateLimitMiddleware());

// Apply to all sensitive endpoints
router.use('/api/auth/*', securityService.rateLimitMiddleware());
```

### Metrics

```typescript
// Get security metrics
const metrics = await securityService.getSecurityMetrics(24); // last 24 hours

// Returns:
// - Failed login attempts
// - Successful logins
// - Active lockouts
// - Top IPs with failed attempts
```

---

## Session Management

### Features

1. **Secure Session Tokens**
   - Cryptographically random
   - 48-byte base64url encoded
   - Unique per device

2. **Device Tracking**
   - Track device type (mobile/tablet/desktop)
   - Device fingerprinting
   - IP address tracking
   - User agent tracking

3. **Session Lifecycle**
   - 24-hour expiration
   - Inactivity timeout (30 minutes)
   - Session refresh (1 hour before expiry)
   - Max 5 sessions per user

4. **Security Features**
   - Session fingerprint verification
   - Hijacking detection
   - Revoke individual sessions
   - Revoke all sessions

### Implementation

```typescript
import { SessionManagementService } from './services/session-management.service';

const sessionService = new SessionManagementService(db);

// Create session
const session = await sessionService.createSession(
  userId,
  ipAddress,
  userAgent,
  deviceId,
  deviceName,
  'mobile'
);

// Validate session
const validation = await sessionService.validateSession(sessionToken);

// Refresh session
const refreshed = await sessionService.refreshSession(sessionToken);

// Revoke session
await sessionService.revokeSession(sessionId, 'user_logout');

// Revoke all sessions (except current)
await sessionService.revokeAllUserSessions(userId, currentSessionId);
```

### Session Middleware

```typescript
// Add to protected routes
router.use(sessionService.sessionMiddleware());
```

### Cleanup

```typescript
// Run via cron job (daily)
await sessionService.cleanupExpiredSessions();
await sessionService.deleteOldSessions(); // older than 90 days
```

---

## API Endpoints

### Privacy & Compliance Endpoints

#### Privacy Dashboard
```
GET /api/privacy/dashboard
```
Returns user's privacy dashboard with consents, opt-outs, and data requests.

#### Consent Management
```
GET    /api/privacy/consents                 - Get all consent types
POST   /api/privacy/consents/record          - Record single consent
POST   /api/privacy/consents/bulk            - Record multiple consents
GET    /api/privacy/consents/history         - Get consent history
```

#### Data Export (GDPR Article 15)
```
POST   /api/privacy/data-export/request             - Request data export
GET    /api/privacy/data-export/status/:requestId   - Check export status
GET    /api/privacy/data-export/download/:requestId - Download export
```

#### Account Deletion (GDPR Article 17)
```
POST   /api/privacy/account-deletion/request  - Request deletion
POST   /api/privacy/account-deletion/cancel   - Cancel deletion
```

#### CCPA Compliance
```
POST   /api/privacy/ccpa/opt-out              - Opt-out (sale/share/sensitive)
POST   /api/privacy/ccpa/opt-in               - Opt back in
GET    /api/privacy/ccpa/data-disclosure      - Get data disclosure
GET    /api/privacy/ccpa/access-logs          - Get access logs
GET    /api/privacy/ccpa/do-not-sell          - Do Not Sell link handler
GET    /api/privacy/ccpa/compliance-status    - Get compliance status
```

### Security Endpoints

#### Session Management
```
GET    /api/security/sessions                 - Get active sessions
POST   /api/security/sessions/revoke/:id      - Revoke specific session
POST   /api/security/sessions/revoke-all      - Revoke all sessions
GET    /api/security/session-statistics       - Get session stats
```

#### Account Security
```
GET    /api/security/login-attempts           - Get login history
GET    /api/security/lockout-history          - Get lockout history
GET    /api/security/account-status           - Get security status
POST   /api/security/unlock-account           - Request unlock
```

---

## Database Schema

### Encryption Keys Tables

```sql
-- User encryption keys (identity, signed pre-key)
CREATE TABLE encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  private_key_encrypted TEXT NOT NULL,
  key_type VARCHAR(20) NOT NULL, -- 'identity', 'signed_pre_key'
  key_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- One-time pre-keys
CREATE TABLE one_time_prekeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_id INTEGER NOT NULL,
  public_key TEXT NOT NULL,
  private_key_encrypted TEXT NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Session keys for conversations
CREATE TABLE session_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  root_key TEXT NOT NULL,
  chain_key TEXT NOT NULL,
  message_number INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW()
);
```

### GDPR Compliance Tables

```sql
-- Consent tracking
CREATE TABLE gdpr_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL,
  consent_given BOOLEAN NOT NULL,
  consent_version VARCHAR(10) NOT NULL,
  consent_text TEXT NOT NULL,
  given_at TIMESTAMP DEFAULT NOW(),
  withdrawn_at TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- Data export requests
CREATE TABLE data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  file_path TEXT,
  download_url TEXT,
  expires_at TIMESTAMP,
  requested_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_message TEXT
);

-- Deletion requests
CREATE TABLE deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  requested_at TIMESTAMP DEFAULT NOW(),
  scheduled_deletion_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  cancellation_token VARCHAR(64),
  ip_address VARCHAR(45),
  user_agent TEXT
);
```

### CCPA Compliance Tables

```sql
-- CCPA opt-outs
CREATE TABLE ccpa_opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opt_out_type VARCHAR(30) NOT NULL, -- 'do_not_sell', 'do_not_share', 'limit_sensitive_data'
  opted_out BOOLEAN NOT NULL,
  opted_out_at TIMESTAMP,
  opted_in_at TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  UNIQUE(user_id, opt_out_type)
);

-- Data access logs
CREATE TABLE data_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_type VARCHAR(20) NOT NULL, -- 'read', 'write', 'delete', 'export'
  data_category VARCHAR(50) NOT NULL,
  accessed_by VARCHAR(100) NOT NULL,
  accessed_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  purpose TEXT NOT NULL
);
```

### Security Tables

```sql
-- Login attempts
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  attempted_at TIMESTAMP DEFAULT NOW(),
  failure_reason VARCHAR(100)
);

-- Account lockouts
CREATE TABLE account_lockouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  locked_at TIMESTAMP DEFAULT NOW(),
  locked_until TIMESTAMP NOT NULL,
  reason TEXT NOT NULL,
  lock_type VARCHAR(20) NOT NULL, -- 'temporary', 'permanent'
  unlock_token VARCHAR(64),
  unlocked_at TIMESTAMP,
  unlocked_by VARCHAR(100)
);

-- Security sessions
CREATE TABLE security_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(100) NOT NULL UNIQUE,
  device_id VARCHAR(64) NOT NULL,
  device_name VARCHAR(100),
  device_type VARCHAR(20), -- 'mobile', 'tablet', 'desktop', 'web'
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMP,
  revoke_reason VARCHAR(100)
);
```

---

## Best Practices

### For Developers

1. **Always use parameterized queries**
   ```typescript
   // Good
   await db('users').where({ id: userId });

   // Bad
   await db.raw(`SELECT * FROM users WHERE id = '${userId}'`);
   ```

2. **Validate all inputs**
   ```typescript
   const schema = Joi.object({
     email: Joi.string().email().required(),
     password: Joi.string().min(8).required(),
   });

   const { error, value } = schema.validate(req.body);
   ```

3. **Log security events**
   ```typescript
   logger.warn(`Failed login attempt for ${email} from ${ipAddress}`);
   ```

4. **Use middleware for protection**
   ```typescript
   router.post('/sensitive',
     authenticate,
     SecurityMiddleware.csrfProtection,
     SecurityMiddleware.sanitizeBody,
     handler
   );
   ```

5. **Implement proper error handling**
   ```typescript
   try {
     // operation
   } catch (error) {
     logger.error(`Operation failed: ${error}`);
     // Return generic error to client
     res.status(500).json({ message: 'Operation failed' });
   }
   ```

### For Deployment

1. **Environment Variables**
   - Never commit secrets to repository
   - Use environment-specific configs
   - Rotate secrets regularly

2. **HTTPS Only**
   - Force HTTPS in production
   - Use HSTS headers
   - Valid SSL certificates

3. **Database Security**
   - Use connection pooling
   - Enable SSL for DB connections
   - Regular backups
   - Encrypt backups

4. **Monitoring**
   - Set up security alerts
   - Monitor failed login attempts
   - Track unusual patterns
   - Regular security audits

5. **Scheduled Tasks**
   ```typescript
   // Run daily via cron
   - cleanupExpiredKeys()
   - cleanupExpiredSessions()
   - cleanupOldLoginAttempts()
   - cleanupExpiredExports()
   - cleanupOldAccessLogs()
   - processPendingDeletions()
   - unlockExpiredAccounts()
   ```

### For Operations

1. **Incident Response**
   - Have a security incident plan
   - Document all incidents
   - Notify affected users
   - Report to authorities if required

2. **User Communications**
   - Clear privacy policy
   - Transparent data practices
   - Easy-to-use privacy controls
   - Prompt response to requests

3. **Compliance Audits**
   - Regular compliance reviews
   - Update policies as needed
   - Train staff on compliance
   - Document everything

---

## Testing

### Unit Tests

```typescript
describe('EncryptionService', () => {
  it('should encrypt and decrypt message', async () => {
    const plaintext = 'Hello, World!';
    const key = await encryptionService.generateSessionKey();

    const encrypted = await encryptionService.encryptMessage(plaintext, key);
    const decrypted = await encryptionService.decryptMessage(
      encrypted.ciphertext,
      key,
      encrypted.iv,
      encrypted.authTag
    );

    expect(decrypted).toBe(plaintext);
  });
});

describe('ConsentManagementService', () => {
  it('should record and retrieve consent', async () => {
    await consentService.recordConsent(userId, 'privacy_policy', true);
    const hasConsent = await consentService.hasConsent(userId, 'privacy_policy');
    expect(hasConsent).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Privacy API', () => {
  it('should request data export', async () => {
    const response = await request(app)
      .post('/api/privacy/data-export/request')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('pending');
  });
});
```

---

## Compliance Checklist

### GDPR Compliance

- [x] Right of access (Article 15)
- [x] Right to rectification (Article 16)
- [x] Right to erasure (Article 17)
- [x] Right to data portability (Article 20)
- [x] Consent management (Article 7)
- [x] Data retention policies
- [x] Privacy by design
- [x] Data protection impact assessment
- [x] Audit logging
- [x] Breach notification procedures

### CCPA Compliance

- [x] Right to know
- [x] Right to delete
- [x] Right to opt-out
- [x] Right to non-discrimination
- [x] Privacy policy disclosure
- [x] Data access logging
- [x] Do Not Sell link
- [x] Authorized agent requests
- [x] Verifiable consumer requests
- [x] 45-day response time

### Security Standards

- [x] Encryption at rest
- [x] Encryption in transit
- [x] End-to-end message encryption
- [x] Secure password storage (bcrypt)
- [x] XSS prevention
- [x] CSRF protection
- [x] SQL injection prevention
- [x] Rate limiting
- [x] Account lockout
- [x] Session management
- [x] Security headers
- [x] Input validation
- [x] Audit logging

---

## Support & Resources

### Documentation
- [GDPR Official Text](https://gdpr.eu/)
- [CCPA Official Text](https://oag.ca.gov/privacy/ccpa)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Signal Protocol](https://signal.org/docs/)

### Tools
- OWASP ZAP for security testing
- SQLMap for SQL injection testing
- Burp Suite for penetration testing

### Contact
For security issues: security@example.com
For privacy concerns: privacy@example.com

---

**Last Updated**: December 2, 2025
**Version**: 1.0
**Review Date**: March 2, 2026
