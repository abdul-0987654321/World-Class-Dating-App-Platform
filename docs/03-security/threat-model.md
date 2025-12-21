# Flamoral Threat Model

## Overview

This document identifies key threats to the Flamoral platform and the mitigations in place.

## Assets to Protect

| Asset | Sensitivity | Impact if Compromised |
|-------|-------------|----------------------|
| User credentials | Critical | Account takeover, identity theft |
| Personal data (profiles) | High | Privacy violation, regulatory fines |
| Messages | High | Privacy violation, harassment |
| Payment information | Critical | Financial fraud, regulatory fines |
| Verification documents | Critical | Identity theft, legal liability |
| Media files | Medium | Privacy violation, harassment |
| Location data | High | Physical safety risk |

## Threat Actors

| Actor | Motivation | Capability | Targets |
|-------|------------|------------|---------|
| Script Kiddie | Notoriety | Low | Publicly known vulnerabilities |
| Stalker | Harassment | Low-Medium | Specific user data |
| Scammer | Financial gain | Medium | User accounts, payment info |
| Competitor | Business advantage | Medium | User data, trade secrets |
| State Actor | Surveillance | High | All data |
| Insider | Various | High | All data |

## STRIDE Analysis

### Spoofing

| Threat | Mitigation |
|--------|------------|
| Fake user registration | Email/phone verification required |
| Account impersonation | Multi-level identity verification |
| Session hijacking | Secure, HttpOnly, SameSite cookies; short-lived tokens |
| Credential stuffing | Rate limiting, breach detection, MFA option |

### Tampering

| Threat | Mitigation |
|--------|------------|
| Message modification | End-to-end message integrity (planned) |
| Profile data tampering | Server-side validation, versioned profiles |
| API request tampering | Input validation, schema enforcement |
| Log tampering | Append-only audit logs, log shipping |

### Repudiation

| Threat | Mitigation |
|--------|------------|
| Deny sending message | Append-only message log with timestamps |
| Deny report submission | Audit trail with correlation ID |
| Deny profile changes | Profile version history |
| Deny payment | Payment event log, Stripe records |

### Information Disclosure

| Threat | Mitigation |
|--------|------------|
| Data breach | Encryption at rest, access controls |
| API data leakage | Strict response filtering, no PII in logs |
| Media URL guessing | Signed URLs with short expiry |
| Verification doc exposure | Encrypted storage, strict access |

### Denial of Service

| Threat | Mitigation |
|--------|------------|
| API flooding | Rate limiting at gateway |
| Resource exhaustion | Request size limits, timeouts |
| Database overload | Connection pooling, query timeouts |
| Media upload abuse | Size limits, tier quotas |

### Elevation of Privilege

| Threat | Mitigation |
|--------|------------|
| User -> Admin access | Role-based access control, separate admin auth |
| Free -> Premium bypass | Server-side entitlement checks |
| Access other user's data | Owner checks on all resources |
| API key compromise | Rotation, minimal permissions |

## Attack Vectors

### Authentication Attacks

1. **Credential Stuffing**
   - Attack: Use leaked credentials from other breaches
   - Mitigation: Rate limiting, breach password check, MFA

2. **Brute Force**
   - Attack: Guess passwords repeatedly
   - Mitigation: Account lockout, rate limiting, captcha

3. **Session Fixation**
   - Attack: Set victim's session ID
   - Mitigation: Regenerate session on auth, secure cookies

### Application Attacks

1. **SQL Injection**
   - Attack: Inject SQL via user input
   - Mitigation: Parameterized queries, ORM usage

2. **XSS (Cross-Site Scripting)**
   - Attack: Inject scripts in user content
   - Mitigation: Output encoding, CSP headers

3. **CSRF (Cross-Site Request Forgery)**
   - Attack: Trick user into making requests
   - Mitigation: CSRF tokens, SameSite cookies

4. **IDOR (Insecure Direct Object Reference)**
   - Attack: Access other user's resources
   - Mitigation: Owner checks on all endpoints

### API Attacks

1. **Broken Object Level Authorization**
   - Attack: Access resources without permission
   - Mitigation: Authorization checks on every request

2. **Mass Assignment**
   - Attack: Set fields not intended (e.g., role)
   - Mitigation: Explicit field allowlisting

3. **Rate Limit Bypass**
   - Attack: Use multiple IPs to bypass limits
   - Mitigation: User-based limits in addition to IP

### Infrastructure Attacks

1. **Container Escape**
   - Mitigation: Minimal container images, security contexts

2. **Network Sniffing**
   - Mitigation: TLS everywhere, internal mTLS

3. **Secrets Exposure**
   - Mitigation: Azure Key Vault, no secrets in code

## High-Risk Scenarios

### Scenario 1: Account Takeover

```
Attack Flow:
1. Attacker obtains email from breach
2. Attempts credential stuffing
3. If successful, accesses account
4. Changes email/password
5. Accesses victim's matches, messages

Mitigations:
- Rate limiting on login
- Breach password detection
- Email change requires confirmation
- Session invalidation on password change
- Suspicious login alerts
```

### Scenario 2: Data Scraping

```
Attack Flow:
1. Create account
2. Use discovery to view all profiles
3. Scrape photos and profile data
4. Build dataset of users

Mitigations:
- Rate limiting on discovery
- Limited profile data per request
- Watermarking (future)
- Behavior analysis
```

### Scenario 3: Payment Fraud

```
Attack Flow:
1. Subscribe with stolen card
2. Use premium features
3. Chargeback after usage

Mitigations:
- 3D Secure verification
- Fraud detection (Stripe Radar)
- Account restriction on chargeback
- Verification requirement for premium
```

### Scenario 4: Harassment via Platform

```
Attack Flow:
1. Create account (maybe fake)
2. Match with victim
3. Send harassing messages
4. Create new account if banned

Mitigations:
- Phone verification
- ID verification option
- Quick report/block
- Message content analysis
- Device fingerprinting
```

## Security Controls Summary

### Preventive Controls
- Input validation
- Authentication
- Authorization
- Encryption
- Rate limiting

### Detective Controls
- Audit logging
- Anomaly detection
- Security monitoring
- Vulnerability scanning

### Corrective Controls
- Incident response
- Account suspension
- Rollback capability
- Breach notification

## Compliance Requirements

| Regulation | Requirement | Implementation |
|------------|-------------|----------------|
| GDPR | Data protection | Encryption, access controls |
| GDPR | Right to deletion | Account deletion with cascade |
| GDPR | Data portability | Export endpoint |
| CCPA | Do not sell | No data selling |
| PCI DSS | Payment security | Stripe (PCI compliant) |
| SOC 2 | Security controls | Access controls, monitoring |
