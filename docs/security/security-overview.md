# Security Overview - Flamoral Platform

This document provides a comprehensive overview of security practices, compliance measures, and security features implemented in the Flamoral dating platform.

**Last Updated:** 2025-12-18
**Status:** Production Ready

---

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [API Security](#api-security)
5. [Infrastructure Security](#infrastructure-security)
6. [Compliance](#compliance)
7. [Security Testing](#security-testing)
8. [Incident Response](#incident-response)
9. [Quick Reference](#quick-reference)

---

## Security Architecture

### Overview

Flamoral implements a defense-in-depth security strategy with multiple layers of protection:

- **Zero-trust architecture** - No implicit trust, verify everything
- **End-to-end encryption** - Messages encrypted client-to-client
- **Secrets management** - Azure Key Vault for all sensitive data
- **Network security** - Azure Front Door, WAF, DDoS protection
- **Regular audits** - Automated scanning and manual penetration testing

### Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                              │
│  - TLS 1.3 encryption                                       │
│  - Certificate pinning (mobile)                             │
│  - Biometric authentication                                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Edge Layer                                │
│  - Azure Front Door                                         │
│  - Web Application Firewall (WAF)                           │
│  - DDoS protection                                          │
│  - Rate limiting                                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway                               │
│  - JWT authentication                                       │
│  - CSRF protection                                          │
│  - Request validation                                       │
│  - API rate limiting                                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  - Role-based access control (RBAC)                         │
│  - Input sanitization                                       │
│  - SQL injection prevention                                 │
│  - XSS protection                                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  - Encryption at rest (AES-256)                             │
│  - Encrypted backups                                        │
│  - Database access controls                                 │
│  - Audit logging                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication & Authorization

### Authentication Methods

#### 1. Email/Password Authentication
- **Password hashing**: bcrypt with 12 rounds
- **Password requirements**: Min 8 characters, complexity rules
- **Account verification**: Email verification required
- **Password reset**: Secure token-based flow with expiry

#### 2. Social Login (OAuth 2.0)
- **Providers**: Google, Facebook, Apple Sign-In
- **State parameter**: CSRF protection
- **Token validation**: ID token verification
- **Account linking**: Link social accounts to existing profiles

#### 3. Two-Factor Authentication (2FA)
- **TOTP**: Time-based One-Time Passwords (Google Authenticator, Authy)
- **SMS**: Twilio integration for SMS codes
- **Email**: Email-based 2FA codes
- **Backup codes**: 10 single-use recovery codes per user
- **Challenge window**: 30-second TOTP window with drift tolerance

#### 4. Biometric Authentication (Mobile)
- **Face ID** (iOS)
- **Touch ID** (iOS)
- **Fingerprint** (Android)
- **Challenge-response flow**: RSA signature verification
- **Device enrollment**: Multi-device support with trust management

### Authorization

#### Role-Based Access Control (RBAC)

```typescript
Roles:
- USER: Standard user (default)
- PREMIUM: Premium subscriber
- MODERATOR: Content moderator
- ADMIN: Platform administrator
- SUPER_ADMIN: Full system access

Permissions:
- read:profile
- write:profile
- read:messages
- write:messages
- moderate:content
- manage:users
- access:admin_dashboard
```

#### JWT Tokens

- **Access tokens**: Short-lived (15 minutes)
- **Refresh tokens**: Long-lived (7 days), securely stored
- **Token rotation**: Automatic refresh before expiry
- **Revocation**: Redis-based token blacklist
- **Claims**: User ID, roles, permissions, device fingerprint

---

## Data Protection

### End-to-End Message Encryption

Messages are encrypted using a Signal Protocol-like implementation.

#### Key Components

1. **Identity Key Pair** (Long-term)
   - Generated once per user
   - Ed25519 curve
   - Used to verify identity

2. **Signed Pre-Key** (Medium-term)
   - Rotates every 30 days
   - Signed by identity key
   - Used for initial key exchange

3. **One-Time Pre-Keys** (Short-term)
   - Pool of 100 keys per user
   - Used once per conversation
   - Automatically replenished

4. **Session Keys**
   - Generated per conversation
   - AES-256-GCM encryption
   - Perfect forward secrecy

#### Encryption Flow

```
1. User A initiates conversation with User B
2. User A fetches User B's public keys (IK, SPK, OPK)
3. X3DH key exchange establishes shared secret
4. Derive root key from DH outputs
5. Derive chain key and message key
6. Encrypt message with AES-256-GCM
7. Store encrypted message with IV and auth tag
```

### Data Encryption

#### Encryption at Rest
- **Database**: Transparent Data Encryption (TDE) on Azure PostgreSQL
- **Blob storage**: Server-side encryption (SSE) with customer-managed keys
- **Backups**: Encrypted with AES-256
- **Keys**: Stored in Azure Key Vault with HSM backing

#### Encryption in Transit
- **TLS 1.3**: All client-server communication
- **Perfect forward secrecy**: ECDHE key exchange
- **Certificate pinning**: Mobile apps pin server certificates
- **HSTS**: Strict-Transport-Security headers enabled

### Sensitive Data Handling

#### PII (Personally Identifiable Information)
- **Email addresses**: Hashed for indexing, encrypted for storage
- **Phone numbers**: Encrypted, access logged
- **Location data**: Approximate location only (city-level)
- **Payment info**: Never stored (Stripe tokenization)

#### Data Minimization
- Collect only necessary data
- Automatic deletion of inactive accounts (2 years)
- User-initiated data deletion (GDPR right to erasure)
- Anonymous analytics data

---

## API Security

### Rate Limiting

#### Tier-Based Limits

```typescript
Anonymous users:
- 10 requests per minute
- 100 requests per hour

Authenticated users:
- 100 requests per minute
- 1000 requests per hour

Premium users:
- 200 requests per minute
- 2000 requests per hour
```

#### Endpoint-Specific Limits

- `/api/auth/login`: 5 attempts per 15 minutes
- `/api/auth/register`: 3 attempts per hour
- `/api/messages/send`: 60 messages per minute
- `/api/matching/swipe`: 100 swipes per day (free), unlimited (premium)

### Request Validation

- **Input sanitization**: Strip HTML, SQL injection prevention
- **Schema validation**: Joi/Zod validation on all endpoints
- **File upload validation**: Type, size, malware scanning
- **Content-Type validation**: Strict MIME type checking

### CSRF Protection

- **Double-submit cookie pattern**: CSRF tokens in cookies and headers
- **SameSite cookies**: Strict SameSite policy
- **Origin validation**: Check Origin/Referer headers
- **Token rotation**: Generate new token per session

### CORS (Cross-Origin Resource Sharing)

```typescript
Allowed origins:
- https://flamoral.com
- https://www.flamoral.com
- https://app.flamoral.com
- Mobile apps (native://)

Allowed methods: GET, POST, PUT, DELETE, PATCH
Allowed headers: Authorization, Content-Type, X-CSRF-Token
Credentials: true (cookies allowed)
Max age: 86400 (24 hours)
```

---

## Infrastructure Security

### Azure Security Features

#### Network Security
- **Azure Virtual Network**: Isolated network environment
- **Network Security Groups (NSG)**: Firewall rules
- **Azure Front Door**: Global load balancing with WAF
- **Private endpoints**: Database accessible only via private network
- **DDoS protection**: Standard tier

#### Identity & Access
- **Azure AD**: Centralized identity management
- **Managed identities**: No hardcoded credentials
- **Service principals**: Least-privilege access for services
- **Azure Key Vault**: Centralized secrets management
- **RBAC**: Fine-grained Azure resource access control

#### Monitoring & Logging
- **Azure Monitor**: Centralized logging and metrics
- **Application Insights**: APM and error tracking
- **Security Center**: Threat detection and recommendations
- **Log Analytics**: Query and analyze security logs
- **Alerts**: Real-time security incident notifications

### Container Security

- **Base images**: Official, minimal images (distroless when possible)
- **Vulnerability scanning**: Trivy scans in CI/CD pipeline
- **Image signing**: Cosign for container image signing
- **Secrets**: Never in images, injected at runtime
- **Read-only root filesystem**: Containers run with minimal write access
- **Non-root user**: Containers run as unprivileged user

### Secret Management

#### Azure Key Vault
- **Secrets**: API keys, connection strings, tokens
- **Keys**: Encryption keys with HSM backing
- **Certificates**: TLS/SSL certificates
- **Access policies**: Granular access control per identity
- **Rotation**: Automatic secret rotation (30-90 days)
- **Audit logs**: All access logged to Azure Monitor

---

## Compliance

### GDPR (General Data Protection Regulation)

#### User Rights Implementation

1. **Right to Access** (`GET /api/user/data-export`)
   - Export all personal data in JSON format
   - Includes profile, messages, photos, interactions

2. **Right to Rectification** (`PUT /api/user/profile`)
   - Users can update their information
   - Audit log of changes maintained

3. **Right to Erasure** (`DELETE /api/user/account`)
   - Permanent account deletion
   - Data anonymization (cannot delete where legal obligation exists)
   - 30-day grace period before final deletion

4. **Right to Data Portability** (`GET /api/user/data-export`)
   - Machine-readable format (JSON)
   - Includes all user-generated content

5. **Right to Object** (Privacy settings)
   - Opt-out of profiling/automated decisions
   - Control over data processing

#### Consent Management
- **Explicit consent**: Clear opt-in for data processing
- **Granular consent**: Separate consent for different purposes
- **Withdraw consent**: Easy opt-out mechanism
- **Consent logs**: Audit trail of consent actions

#### Data Processing Records
- Data processing inventory maintained
- Data flow diagrams documented
- Third-party processors listed
- Legal basis for processing documented

### CCPA (California Consumer Privacy Act)

- **Do Not Sell My Personal Information**: Honor opt-out requests
- **Notice at collection**: Inform users about data collection
- **Disclosure**: Annual privacy report on data practices
- **Verification**: Two-step verification for deletion requests

### SOC 2 Type II (In Progress)

Compliance with Trust Services Criteria:
- **Security**: Protection against unauthorized access
- **Availability**: System availability for operation and use
- **Processing Integrity**: System processing is complete, valid, accurate
- **Confidentiality**: Confidential information protected as committed
- **Privacy**: Personal information collected, used, retained, disclosed per commitments

### Industry Standards

- **OWASP Top 10**: Mitigations implemented for all OWASP Top 10 risks
- **PCI DSS**: Compliance through Stripe (no direct card data handling)
- **NIST Cybersecurity Framework**: Aligned security controls

---

## Security Testing

### Automated Security Testing

#### Static Application Security Testing (SAST)
- **Tools**: SonarQube, ESLint security plugins
- **Frequency**: Every commit
- **Scope**: Code quality, security anti-patterns
- **CI/CD**: Automated in GitHub Actions

#### Dynamic Application Security Testing (DAST)
- **Tools**: OWASP ZAP, Burp Suite
- **Frequency**: Weekly on staging
- **Scope**: Running application vulnerabilities
- **Reports**: Automated reports to security team

#### Dependency Scanning
- **Tools**: Snyk, npm audit, Dependabot
- **Frequency**: Daily
- **Scope**: Known vulnerabilities in dependencies
- **Action**: Automated PRs for security updates

#### Container Scanning
- **Tools**: Trivy, Snyk Container
- **Frequency**: On every image build
- **Scope**: Base image and dependency vulnerabilities
- **Gate**: Block deployment on high/critical vulnerabilities

### Manual Security Testing

#### Penetration Testing
- **Frequency**: Quarterly
- **Scope**: Full platform (web, mobile, API)
- **Methodology**: OWASP Testing Guide
- **Reports**: Executive summary + detailed findings
- **Remediation**: Track and fix all findings

#### Security Code Review
- **Frequency**: All security-sensitive code changes
- **Reviewers**: Security team + senior engineers
- **Scope**: Authentication, authorization, encryption, payment
- **Tools**: GitHub code review with security checklist

### Bug Bounty Program

- **Platform**: HackerOne (planned)
- **Scope**: In-scope targets defined
- **Rewards**: $100-$10,000 based on severity
- **Response**: Acknowledge within 24 hours, fix within 90 days

---

## Incident Response

### Security Incident Response Plan

#### Incident Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| **P0 - Critical** | Active exploit, data breach | 15 minutes | Database exposed publicly |
| **P1 - High** | Security vulnerability in production | 2 hours | XSS vulnerability discovered |
| **P2 - Medium** | Security issue, no active exploit | 24 hours | Weak password policy |
| **P3 - Low** | Security improvement | 7 days | Missing security header |

#### Response Process

1. **Detection** (Automated alerts, bug reports, monitoring)
2. **Triage** (Severity assessment, impact analysis)
3. **Containment** (Isolate affected systems, block exploit)
4. **Eradication** (Fix vulnerability, patch systems)
5. **Recovery** (Restore normal operations, verify fix)
6. **Lessons Learned** (Post-mortem, improve processes)

#### Incident Response Team

- **Incident Commander**: VP Engineering
- **Security Lead**: Security Engineer
- **Technical Leads**: Service owners
- **Communications**: PR/Legal (for data breaches)
- **On-call rotation**: 24/7 security on-call

### Data Breach Response

In the event of a data breach:

1. **Immediate actions** (0-24 hours)
   - Contain the breach
   - Assess scope and impact
   - Preserve evidence
   - Notify incident response team

2. **Notification** (72 hours)
   - GDPR: Notify supervisory authority within 72 hours
   - CCPA: Notify California AG without unreasonable delay
   - Users: Notify affected users if high risk to rights

3. **Remediation** (7-30 days)
   - Implement fixes
   - Enhanced monitoring
   - Security audit
   - Update incident response plan

4. **Post-incident** (30+ days)
   - Detailed post-mortem report
   - Implement preventive measures
   - Security training for team
   - Update documentation

---

## Quick Reference

### Security Contacts

- **Security Team Email**: security@flamoral.com
- **Vulnerability Reports**: security@flamoral.com
- **Data Protection Officer**: dpo@flamoral.com
- **Security On-Call**: [PagerDuty integration]

### Security Endpoints

```
Authentication:
POST   /api/auth/register           - Register new user
POST   /api/auth/login              - User login
POST   /api/auth/logout             - User logout
POST   /api/auth/refresh-token      - Refresh access token
POST   /api/auth/forgot-password    - Request password reset
POST   /api/auth/reset-password     - Reset password

Two-Factor Authentication:
POST   /api/auth/2fa/enable         - Enable 2FA
POST   /api/auth/2fa/verify         - Verify 2FA code
POST   /api/auth/2fa/disable        - Disable 2FA
POST   /api/auth/2fa/backup/regenerate - Regenerate backup codes

User Privacy:
POST   /api/user/block/:userId      - Block user
POST   /api/user/report/:userId     - Report user
GET    /api/user/data-export        - Export user data (GDPR)
DELETE /api/user/account            - Delete account (GDPR)

Security Settings:
GET    /api/user/security/devices   - List enrolled devices
DELETE /api/user/security/devices/:deviceId - Revoke device
GET    /api/user/security/sessions  - List active sessions
DELETE /api/user/security/sessions/:sessionId - Revoke session
```

### Security Checklist for Developers

- [ ] Validate all user inputs
- [ ] Use parameterized queries (no string concatenation)
- [ ] Sanitize HTML output to prevent XSS
- [ ] Implement proper authentication on endpoints
- [ ] Check user authorization before data access
- [ ] Use HTTPS for all external communication
- [ ] Never log sensitive data (passwords, tokens, PII)
- [ ] Implement rate limiting on public endpoints
- [ ] Use secure random for tokens/IDs (crypto.randomBytes)
- [ ] Set secure HTTP headers (HSTS, CSP, X-Frame-Options)
- [ ] Encrypt sensitive data at rest
- [ ] Implement proper error handling (no stack traces in production)
- [ ] Use environment variables for secrets (never hardcode)
- [ ] Keep dependencies up-to-date
- [ ] Write security tests for sensitive features

### Common Security Headers

```typescript
// Set in API Gateway and all services

Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.flamoral.com wss://ws.flamoral.com
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(self), microphone=(), camera=()
```

---

## Related Documentation

- [OWASP Top 10 Checklist](../security-compliance/OWASP_TOP_10_CHECKLIST.md)
- [Penetration Testing Plan](../security-compliance/PENETRATION_TESTING_PLAN.md)
- [Security Incident Response Plan](../security-compliance/SECURITY_INCIDENT_RESPONSE_PLAN.md)
- [Vulnerability Disclosure Policy](../security-compliance/VULNERABILITY_DISCLOSURE_POLICY.md)
- [Security Test Cases](../security-compliance/SECURITY_TEST_CASES.md)
- [GDPR Privacy Audit](../security-compliance/GDPR_PRIVACY_AUDIT.md)
- [Operations Runbooks](../operations/)

---

**Document Owner:** Security Team
**Review Frequency:** Quarterly
**Last Security Audit:** 2025-12-10
**Next Audit Due:** 2026-03-10
