# Security & Compliance Quick Reference

## Quick Setup

### 1. Install Dependencies

```bash
npm install archiver  # For ZIP file creation in GDPR exports
```

### 2. Run Database Migrations

```bash
cd backend/services/user-service
npm run migrate
```

The following tables will be created:
- `encryption_keys` - User encryption keys
- `one_time_prekeys` - One-time pre-keys for Signal Protocol
- `session_keys` - Conversation session keys
- `gdpr_consent` - User consent tracking
- `data_export_requests` - Data export requests
- `deletion_requests` - Account deletion requests
- `ccpa_opt_outs` - CCPA opt-out preferences
- `data_access_logs` - Data access audit trail
- `login_attempts` - Login attempt tracking
- `account_lockouts` - Account lockout records
- `security_sessions` - Secure session management
- `data_retention_policies` - Data retention configurations

### 3. Add Routes to Main App

In `backend/services/user-service/src/index.ts`:

```typescript
import privacyComplianceRoutes from './api/routes/privacy-compliance.routes';
import securityRoutes from './api/routes/security.routes';
import { setSecurityHeaders, sanitizeBody, detectAttackPatterns } from './middleware/security.middleware';

// Apply security middleware globally
app.use(setSecurityHeaders);
app.use(sanitizeBody);
app.use(detectAttackPatterns);

// Register routes
app.use('/api/privacy', privacyComplianceRoutes);
app.use('/api/security', securityRoutes);
```

### 4. Setup Cron Jobs

Add to your cron scheduler (e.g., node-cron):

```typescript
import cron from 'node-cron';
import { KeyManagementService } from './services/key-management.service';
import { GDPRComplianceService } from './services/gdpr-compliance.service';
import { CCPAComplianceService } from './services/ccpa-compliance.service';
import { AccountSecurityService } from './services/account-security.service';
import { SessionManagementService } from './services/session-management.service';

// Daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  const keyService = new KeyManagementService(db);
  await keyService.cleanupExpiredKeys();

  const gdprService = new GDPRComplianceService(db);
  await gdprService.cleanupExpiredExports();
  await gdprService.processPendingDeletions();

  const ccpaService = new CCPAComplianceService(db);
  await ccpaService.cleanupOldAccessLogs();

  const securityService = new AccountSecurityService(db);
  await securityService.cleanupOldLoginAttempts();
  await securityService.unlockExpiredAccounts();

  const sessionService = new SessionManagementService(db);
  await sessionService.cleanupExpiredSessions();
  await sessionService.deleteOldSessions();
});
```

---

## Common Tasks

### Initialize User Encryption Keys

```typescript
import { KeyManagementService } from './services/key-management.service';

// On user registration
const keyService = new KeyManagementService(db);
await keyService.initializeUserKeys(userId);
```

### Record User Consent (Registration)

```typescript
import { ConsentManagementService } from './services/consent-management.service';

const consentService = new ConsentManagementService(db);
await consentService.recordBulkConsents(
  userId,
  {
    terms_of_service: true,
    privacy_policy: true,
    data_processing: true,
    profile_visibility: true,
  },
  req.ip,
  req.headers['user-agent']
);
```

### Record Login Attempt

```typescript
import { AccountSecurityService } from './services/account-security.service';

const securityService = new AccountSecurityService(db);
await securityService.recordLoginAttempt(
  email,
  req.ip,
  success,
  userId,
  req.headers['user-agent'],
  failureReason
);
```

### Create Secure Session

```typescript
import { SessionManagementService } from './services/session-management.service';

const sessionService = new SessionManagementService(db);
const session = await sessionService.createSession(
  userId,
  req.ip,
  req.headers['user-agent']
);

// Return session token to client
res.json({ sessionToken: session.session_token });
```

### Log Data Access (CCPA)

```typescript
import { CCPAComplianceService } from './services/ccpa-compliance.service';

const ccpaService = new CCPAComplianceService(db);
await ccpaService.logDataAccess(
  userId,
  'read',
  'personal_information',
  'system',
  'Profile view',
  req.ip
);
```

---

## API Endpoints Quick Reference

### Privacy & Compliance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/privacy/dashboard` | Privacy dashboard |
| GET | `/api/privacy/consents` | Get consent types |
| POST | `/api/privacy/consents/record` | Record consent |
| POST | `/api/privacy/consents/bulk` | Record multiple consents |
| GET | `/api/privacy/consents/history` | Consent history |
| POST | `/api/privacy/data-export/request` | Request data export |
| GET | `/api/privacy/data-export/status/:id` | Export status |
| GET | `/api/privacy/data-export/download/:id` | Download export |
| POST | `/api/privacy/account-deletion/request` | Request deletion |
| POST | `/api/privacy/account-deletion/cancel` | Cancel deletion |
| POST | `/api/privacy/ccpa/opt-out` | CCPA opt-out |
| POST | `/api/privacy/ccpa/opt-in` | CCPA opt-in |
| GET | `/api/privacy/ccpa/data-disclosure` | Data disclosure |
| GET | `/api/privacy/ccpa/access-logs` | Access logs |
| GET | `/api/privacy/ccpa/do-not-sell` | Do Not Sell info |
| GET | `/api/privacy/ccpa/compliance-status` | Compliance status |

### Security

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/security/sessions` | Active sessions |
| POST | `/api/security/sessions/revoke/:id` | Revoke session |
| POST | `/api/security/sessions/revoke-all` | Revoke all sessions |
| GET | `/api/security/login-attempts` | Login history |
| GET | `/api/security/lockout-history` | Lockout history |
| GET | `/api/security/account-status` | Security status |
| POST | `/api/security/unlock-account` | Unlock account |
| GET | `/api/security/session-statistics` | Session stats |

---

## Environment Variables

Add to `.env`:

```env
# Security
SESSION_DURATION_HOURS=24
MAX_SESSIONS_PER_USER=5
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
ATTEMPT_WINDOW_MINUTES=15

# GDPR
EXPORT_EXPIRY_DAYS=7
DELETION_GRACE_PERIOD_DAYS=30

# Encryption
KEY_ROTATION_DAYS=90
SIGNED_PREKEY_EXPIRY_DAYS=30
```

---

## Middleware Usage

### Protect All Routes

```typescript
import {
  setSecurityHeaders,
  sanitizeBody,
  detectAttackPatterns,
  preventParameterPollution,
  validateUserAgent,
} from './middleware/security.middleware';

// Apply globally
app.use(setSecurityHeaders);
app.use(sanitizeBody);
app.use(detectAttackPatterns);
app.use(preventParameterPollution);
app.use(validateUserAgent);
```

### Protect Specific Routes

```typescript
import {
  csrfProtection,
  validateFileUpload,
  preventTimingAttack,
} from './middleware/security.middleware';
import { AccountSecurityService } from './services/account-security.service';
import { SessionManagementService } from './services/session-management.service';

const securityService = new AccountSecurityService(db);
const sessionService = new SessionManagementService(db);

// Login endpoint
router.post('/login',
  securityService.rateLimitMiddleware(),
  preventTimingAttack,
  loginHandler
);

// File upload
router.post('/upload',
  authenticate,
  validateFileUpload,
  uploadHandler
);

// Session validation
router.use('/api/protected/*',
  authenticate,
  sessionService.sessionMiddleware(),
  securityService.lockoutCheckMiddleware()
);

// CSRF protection (web forms)
router.post('/form-submit',
  csrfProtection,
  formHandler
);
```

---

## Testing

### Test Encryption

```typescript
import encryptionService from './services/encryption.service';

const plaintext = 'Secret message';
const key = await encryptionService.generateSessionKey();

const encrypted = await encryptionService.encryptMessage(plaintext, key);
console.log('Encrypted:', encrypted.ciphertext);

const decrypted = await encryptionService.decryptMessage(
  encrypted.ciphertext,
  key,
  encrypted.iv,
  encrypted.authTag
);
console.log('Decrypted:', decrypted); // 'Secret message'
```

### Test Data Export

```bash
# Request export
curl -X POST http://localhost:3000/api/privacy/data-export/request \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check status
curl http://localhost:3000/api/privacy/data-export/status/REQUEST_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Download
curl http://localhost:3000/api/privacy/data-export/download/REQUEST_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o user_data.zip
```

### Test CCPA Opt-Out

```bash
curl -X POST http://localhost:3000/api/privacy/ccpa/opt-out \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"optOutType": "do_not_sell"}'
```

---

## Security Checklist

### Before Deployment

- [ ] All migrations run successfully
- [ ] Environment variables configured
- [ ] HTTPS enabled with valid certificate
- [ ] Cron jobs scheduled
- [ ] Security headers tested
- [ ] Rate limiting configured
- [ ] Session management tested
- [ ] CSRF protection enabled
- [ ] File upload restrictions tested
- [ ] SQL injection tests passed
- [ ] XSS prevention verified
- [ ] Error handling doesn't leak info
- [ ] Logs configured properly
- [ ] Backup system in place
- [ ] Monitoring alerts configured

### Post-Deployment

- [ ] Monitor login attempts
- [ ] Check lockout rates
- [ ] Review security logs daily
- [ ] Test data export flow
- [ ] Verify consent tracking
- [ ] Check session cleanup
- [ ] Monitor API rate limits
- [ ] Review access logs
- [ ] Test incident response
- [ ] Update documentation

---

## Troubleshooting

### Issue: User can't login (locked out)

```typescript
// Check lockout status
const { isLocked, lockout } = await securityService.isAccountLocked(userId);

// Unlock manually
await securityService.unlockAccount(userId, undefined, 'admin');
```

### Issue: Data export failed

```typescript
// Check export status
const request = await gdprService.getExportRequestStatus(requestId, userId);
console.log(request.error_message);

// Retry export
await gdprService.requestDataExport(userId);
```

### Issue: Session expired too quickly

```typescript
// Check session settings
console.log(process.env.SESSION_DURATION_HOURS);
console.log(process.env.INACTIVITY_TIMEOUT_MINUTES);

// Adjust in .env
SESSION_DURATION_HOURS=48
INACTIVITY_TIMEOUT_MINUTES=60
```

### Issue: Too many rate limit errors

```typescript
// Adjust rate limit settings
const securityService = new AccountSecurityService(db);
securityService.IP_RATE_LIMIT = 50; // Increase from 20
securityService.ATTEMPT_WINDOW_MINUTES = 30; // Increase window
```

---

## Monitoring Queries

### Active Sessions

```sql
SELECT
  COUNT(*) as total_sessions,
  device_type,
  COUNT(CASE WHEN last_activity_at > NOW() - INTERVAL '1 hour' THEN 1 END) as active_last_hour
FROM security_sessions
WHERE is_active = true
GROUP BY device_type;
```

### Failed Login Attempts (Last 24h)

```sql
SELECT
  COUNT(*) as attempts,
  email,
  ip_address
FROM login_attempts
WHERE success = false
  AND attempted_at > NOW() - INTERVAL '24 hours'
GROUP BY email, ip_address
HAVING COUNT(*) >= 5
ORDER BY attempts DESC;
```

### CCPA Opt-Out Statistics

```sql
SELECT
  opt_out_type,
  COUNT(*) as total,
  COUNT(CASE WHEN opted_out = true THEN 1 END) as opted_out_count
FROM ccpa_opt_outs
GROUP BY opt_out_type;
```

### Pending Data Exports

```sql
SELECT
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - requested_at))/60) as avg_minutes
FROM data_export_requests
WHERE requested_at > NOW() - INTERVAL '30 days'
GROUP BY status;
```

---

## Support

For security issues or questions:
- Review the full documentation: `SECURITY_COMPLIANCE.md`
- Check logs: `backend/services/user-service/logs/`
- Contact: security@example.com

**Last Updated**: December 2, 2025
