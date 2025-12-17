# Security Configuration Guide - Flamoral Dating Platform

This document provides critical security configuration information for the Flamoral dating platform.

## Table of Contents
- [Environment Variables & Secrets Management](#environment-variables--secrets-management)
- [Email Verification Requirements](#email-verification-requirements)
- [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
- [Admin Account Security](#admin-account-security)
- [Deployment Checklist](#deployment-checklist)

---

## Environment Variables & Secrets Management

### CRITICAL: Azure Key Vault Integration

All production secrets MUST be stored in Azure Key Vault. Never commit actual credentials to version control.

#### Azure Key Vault Configuration

The platform uses Azure Key Vault for secure secrets management in production and staging environments.

**Key Vault Details:**
- **Production:** `flamoral-prod-kv` (https://flamoral-prod-kv.vault.azure.net/)
- **Staging:** `flamoral-staging-kv` (https://flamoral-staging-kv.vault.azure.net/)

**Required Secrets in Key Vault:**

1. **Database Credentials**
   - `DB-PASSWORD` - PostgreSQL database password
   - `DATABASE-URL` - Full PostgreSQL connection string
   - `MONGODB-URI` - MongoDB/Cosmos DB connection string
   - `DB-READ-REPLICA-1-URL` - Read replica connection string
   - `DB-READ-REPLICA-2-URL` - Read replica connection string

2. **Authentication & JWT**
   - `JWT-SECRET` - JWT signing secret (minimum 64 characters)
   - `JWT-ACCESS-SECRET` - Access token secret (minimum 64 characters)
   - `JWT-REFRESH-SECRET` - Refresh token secret (minimum 64 characters)
   - `SESSION-SECRET` - Session secret (minimum 32 characters)
   - `SERVICE-API-KEY` - Service-to-service authentication key

3. **Cache & Message Queue**
   - `REDIS-PASSWORD` - Redis password
   - `REDIS-URL` - Redis connection string
   - `AZURE-SERVICE-BUS-CONNECTION-STRING` - Azure Service Bus connection

4. **OAuth Providers**
   - `GOOGLE-CLIENT-SECRET` - Google OAuth client secret
   - `FACEBOOK-APP-SECRET` - Facebook OAuth app secret
   - `APPLE-PRIVATE-KEY` - Apple OAuth private key

5. **Payment Gateway**
   - `STRIPE-SECRET-KEY` - Stripe secret key (sk_live_... for production)
   - `STRIPE-WEBHOOK-SECRET` - Stripe webhook signing secret

6. **Email & SMS Services**
   - `SENDGRID-API-KEY` - SendGrid API key
   - `TWILIO-AUTH-TOKEN` - Twilio authentication token

7. **Azure Services**
   - `AZURE-STORAGE-KEY` - Azure Storage account key
   - `AZURE-STORAGE-CONNECTION-STRING` - Azure Storage connection string
   - `AZURE-FACE-API-KEY` - Azure Face API key
   - `AZURE-CONTENT-MODERATOR-KEY` - Azure Content Moderator key

8. **Video/Voice Services**
   - `AGORA-APP-CERTIFICATE` - Agora app certificate
   - `AGORA-CUSTOMER-KEY` - Agora customer key
   - `AGORA-CUSTOMER-SECRET` - Agora customer secret

9. **AI/ML Services**
   - `OPENAI-API-KEY` - OpenAI API key
   - `AI-MODEL-API-KEY` - Internal AI model API key

10. **Monitoring & Analytics**
    - `SENTRY-DSN` - Sentry error tracking DSN
    - `APPLICATION-INSIGHTS-CONNECTION-STRING` - Azure Application Insights
    - `MIXPANEL-TOKEN` - Mixpanel analytics token
    - `GOOGLE-MAPS-API-KEY` - Google Maps API key
    - `MAPBOX-ACCESS-TOKEN` - Mapbox access token

11. **Search & Elasticsearch**
    - `ELASTICSEARCH-PASSWORD` - Elasticsearch password

12. **Support & Incident Management**
    - `ZENDESK-API-TOKEN` - Zendesk API token
    - `PAGERDUTY-INTEGRATION-KEY` - PagerDuty integration key

#### Accessing Secrets from Key Vault

The application automatically fetches secrets from Azure Key Vault using Managed Identity in production.

**Configuration:**
```typescript
// Environment variables for Key Vault access
KEY_VAULT_NAME=flamoral-prod-kv
KEY_VAULT_URI=https://flamoral-prod-kv.vault.azure.net/
KEY_VAULT_MANAGED_IDENTITY_ENABLED=true
```

**For local development with Key Vault access:**
```bash
# Authenticate with Azure CLI
az login

# Set environment variables
export KEY_VAULT_NAME=flamoral-staging-kv
export AZURE_TENANT_ID=your-tenant-id
export AZURE_CLIENT_ID=your-client-id
export AZURE_CLIENT_SECRET=your-client-secret
```

### Environment Files

**Files Excluded from Version Control:**
- All `.env` files (except `.env.example` and `.env.*.template`)
- `infrastructure/config/.env.development`
- `infrastructure/config/.env.staging`
- `infrastructure/config/.env.production`
- `apps/web-app/.env.development`
- `apps/web-app/.env.production`
- `apps/web-app/.env.test`
- `backend/.env.test`
- Any service-specific `.env` files

**Files Committed to Repository:**
- `.env.example` - Example template with placeholder values
- `.env.*.template` - Environment-specific templates
- All files containing ONLY placeholder values (no actual secrets)

### .env File Structure

Each environment has template files showing the required structure:
- `infrastructure/config/.env.production.template` - Production configuration structure
- `infrastructure/config/.env.staging.template` - Staging configuration structure
- `infrastructure/config/.env.development.template` - Development configuration structure

**Important:** Never copy actual values into these template files. They should only contain:
- Placeholder values (e.g., `your_api_key_here`, `***`, `REPLACE_WITH_ACTUAL_VALUE`)
- Documentation comments
- Non-sensitive configuration values

---

## Email Verification Requirements

### Production Environment

**CRITICAL SECURITY REQUIREMENT:** Email verification is MANDATORY for all user accounts in production.

**Configuration:**
```typescript
// backend/services/api-gateway/src/config/security.config.ts
export const securityConfig: SecurityConfig = {
  auth: {
    requireEmailVerification: true, // ALWAYS true in production
    // ...
  }
}
```

**Enforcement:**

The auth service enforces email verification at login:

```typescript
// backend/services/auth-service/src/domain/services/auth.service.ts
if (process.env.NODE_ENV === 'production' && !user.is_email_verified) {
  throw new Error('Email verification required. Please verify your email before logging in.');
}
```

**Email Verification Flow:**

1. User registers → Account created with `is_email_verified: false`
2. Verification email sent automatically with unique token
3. User clicks verification link → Email marked as verified
4. User can now log in and access the platform

**Development Environment:**

Email verification can be disabled in development for easier testing:

```typescript
export const developmentSecurityConfig: Partial<SecurityConfig> = {
  auth: {
    requireEmailVerification: false, // Disabled for dev convenience
  }
}
```

**Kubernetes ConfigMap:**
```yaml
# infrastructure/kubernetes/configmaps/service-config-template.yaml
EMAIL_VERIFICATION_REQUIRED: "true"
```

---

## Two-Factor Authentication (2FA)

### Overview

The platform supports multiple 2FA methods for enhanced security:

1. **TOTP (Time-based One-Time Password)** - Authenticator apps (Google Authenticator, Authy, etc.)
2. **SMS** - Text message verification codes
3. **Email** - Email verification codes

### 2FA Implementation

**Service:** `backend/services/user-service/src/domain/services/two-factor-auth.service.ts`

**Supported Methods:**
- `2fa_totp` - TOTP authenticator apps
- `2fa_sms` - SMS verification
- `2fa_email` - Email verification

### Security Features

**TOTP Security:**
- Secrets encrypted before storage using AES-256-GCM
- 256 bits of entropy in TOTP secrets
- Key versioning for secret rotation
- Time-drift tolerance (±30 seconds)

**Backup Codes:**
- 10 backup codes generated per user
- 64 bits of entropy per code
- Hashed with bcrypt before storage
- One-time use only

**Code Generation:**
- Cryptographically secure random number generation
- 6-digit codes
- 10-minute expiration for SMS/Email codes

### Enabling 2FA for Users

**1. Generate TOTP Secret:**
```typescript
const { secret, qrCodeUrl } = await twoFactorAuthService.generateTOTPSecret(userId);
// User scans QR code with authenticator app
```

**2. Verify and Enable:**
```typescript
const { backupCodes } = await twoFactorAuthService.enableTwoFactorAuth(
  userId,
  '2fa_totp',
  verificationCode
);
// Store backup codes securely
```

**3. Verify During Login:**
```typescript
const isValid = await twoFactorAuthService.verifyTOTPCode(userId, code);
```

### Configuration

**Default Settings:**
```typescript
// backend/services/api-gateway/src/config/security.config.ts
auth: {
  require2FA: false, // Optional for regular users
}
```

**Per-User 2FA Status:**
```typescript
const { enabled, methods } = await twoFactorAuthService.is2FAEnabled(userId);
```

### Database Schema

**Tables:**
- `user_two_factor_auth` - Stores encrypted 2FA secrets and configuration
- `user_backup_codes` - Stores hashed backup codes
- `user_verification_codes` - Temporary verification codes for SMS/Email

---

## Admin Account Security

### MANDATORY Requirements for Admin Accounts

**Critical Security Policy:** All administrator accounts MUST have the following security measures enabled:

1. **Email Verification** ✓ MANDATORY
   - Cannot be disabled for admin accounts
   - Must be verified before any admin access

2. **Two-Factor Authentication (2FA)** ✓ MANDATORY
   - At minimum, TOTP-based 2FA required
   - SMS/Email 2FA acceptable as backup
   - Must be configured within 24 hours of account creation
   - Account access restricted until 2FA enabled

3. **Strong Password Requirements** ✓ MANDATORY
   - Minimum 12 characters (enforced)
   - Must contain uppercase, lowercase, numbers, and special characters
   - Cannot reuse last 5 passwords
   - Must change every 90 days
   - Checked against breach databases (HaveIBeenPwned)

4. **Session Security** ✓ MANDATORY
   - Maximum concurrent sessions: 3 devices
   - Absolute timeout: 7 days
   - Idle timeout: 24 hours
   - Automatic logout after 1 hour of inactivity

5. **Access Logging** ✓ MANDATORY
   - All admin actions logged
   - Login attempts tracked
   - IP address monitoring
   - New device notifications

### Admin Account Configuration

**Creating Admin Accounts:**

```typescript
// Mark user as admin
await db('users').where({ id: userId }).update({
  role: 'admin',
  require_2fa_setup: true, // Force 2FA setup
});

// Require 2FA for next login
await twoFactorAuthService.require2FAForNextLogin(userId);
```

**Admin Role Verification:**

```typescript
// Middleware to verify admin status and 2FA
export const requireAdmin = async (req, res, next) => {
  const user = await userService.getUserById(req.user.userId);

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { enabled } = await twoFactorAuthService.is2FAEnabled(user.id);
  if (!enabled) {
    return res.status(403).json({
      error: 'Two-factor authentication required for admin accounts'
    });
  }

  next();
};
```

### Admin Security Checklist

Before granting admin access:
- [ ] Email verified
- [ ] 2FA enabled (TOTP, SMS, or Email)
- [ ] Backup codes generated and stored securely
- [ ] Strong password set and verified against breaches
- [ ] Security training completed
- [ ] Access logging enabled
- [ ] Emergency contact information on file

### Monitoring Admin Activity

**Security Events Logged:**
- Login attempts (successful and failed)
- 2FA verification attempts
- Password changes
- Role changes
- Sensitive data access
- Admin action audit trail

**Alerts Triggered:**
- Multiple failed login attempts
- Login from new device
- Login from unusual location
- Disabled 2FA
- Suspicious activity patterns

---

## Deployment Checklist

### Pre-Deployment Security Verification

**Before deploying to production:**

#### 1. Environment Variables
- [ ] All `.env` files removed from version control
- [ ] Only `.env.example` and `.env.*.template` files committed
- [ ] All secrets stored in Azure Key Vault
- [ ] Key Vault access configured with Managed Identity
- [ ] No hardcoded credentials in source code

#### 2. Authentication & Authorization
- [ ] `requireEmailVerification: true` in production config
- [ ] Email verification enforced in auth service
- [ ] JWT secrets are cryptographically strong (64+ chars)
- [ ] Session secrets are cryptographically strong (32+ chars)
- [ ] Service-to-service API keys configured

#### 3. Two-Factor Authentication
- [ ] 2FA service deployed and functional
- [ ] TOTP secret encryption enabled
- [ ] Backup codes generation working
- [ ] Admin accounts have 2FA enabled
- [ ] 2FA requirement enforced for admin role

#### 4. Password Security
- [ ] Password breach checking enabled
- [ ] Minimum 12-character passwords enforced
- [ ] Password complexity requirements active
- [ ] Password reuse prevention enabled
- [ ] Password expiry configured (90 days)

#### 5. Rate Limiting & DDoS Protection
- [ ] Rate limiting enabled
- [ ] WAF (Web Application Firewall) configured
- [ ] DDoS protection enabled on Azure
- [ ] IP blocklist configured

#### 6. HTTPS & TLS
- [ ] SSL/TLS certificates installed and valid
- [ ] HTTPS forced for all connections
- [ ] HSTS headers configured
- [ ] TLS 1.2+ minimum version enforced

#### 7. Security Headers
- [ ] Helmet.js configured
- [ ] Content Security Policy (CSP) enabled
- [ ] X-Frame-Options set to DENY
- [ ] X-Content-Type-Options set to nosniff
- [ ] Referrer-Policy configured

#### 8. Database Security
- [ ] Database SSL/TLS enabled
- [ ] Firewall rules configured (whitelist only)
- [ ] Encryption at rest enabled
- [ ] Regular backups configured
- [ ] Point-in-time restore enabled

#### 9. Monitoring & Logging
- [ ] Sentry error tracking configured
- [ ] Azure Application Insights enabled
- [ ] Security event logging active
- [ ] Failed login tracking enabled
- [ ] Anomaly detection configured

#### 10. Third-Party Integrations
- [ ] Stripe webhook signatures verified
- [ ] OAuth redirect URIs validated
- [ ] API keys rotated and secure
- [ ] Service connection strings encrypted

### Post-Deployment Verification

After deployment:

1. **Test Email Verification**
   - Register new user
   - Verify email verification required before login
   - Confirm verification email sent

2. **Test 2FA**
   - Enable TOTP for test account
   - Verify QR code generation
   - Test backup codes
   - Verify SMS/Email codes

3. **Test Admin Security**
   - Create admin account
   - Verify 2FA requirement
   - Test admin access restrictions

4. **Security Scan**
   - Run vulnerability scanner
   - Review security headers
   - Test rate limiting
   - Verify HTTPS enforcement

5. **Monitor Logs**
   - Check error logs
   - Review security events
   - Verify audit trail

---

## Emergency Procedures

### Security Incident Response

If a security breach is suspected:

1. **Immediately:**
   - Rotate all secrets in Azure Key Vault
   - Invalidate all active sessions
   - Enable temporary rate limiting
   - Alert security team

2. **Within 1 Hour:**
   - Review access logs
   - Identify compromised accounts
   - Force password reset for affected users
   - Document incident timeline

3. **Within 24 Hours:**
   - Complete security audit
   - Implement additional security measures
   - Notify affected users if required
   - Update security procedures

### Key Rotation

**Regular Key Rotation Schedule:**
- JWT secrets: Every 90 days
- API keys: Every 180 days
- Database passwords: Every 180 days
- Service keys: Every 90 days

**Emergency Key Rotation:**
Use the encryption key rotation service:
```bash
npm run rotate-encryption-keys
```

---

## Contact Information

**Security Team:**
- Email: security@flamoral.com
- Emergency: +1-XXX-XXX-XXXX (24/7)
- PagerDuty: Configure in KEY_VAULT

**Resources:**
- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
- [OWASP Security Guidelines](https://owasp.org/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

Last Updated: 2025-12-17
Version: 1.0
