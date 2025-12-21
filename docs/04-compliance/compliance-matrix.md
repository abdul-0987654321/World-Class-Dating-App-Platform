# Compliance Matrix

## Regulatory Framework

| Regulation | Jurisdiction | Applicability |
|------------|--------------|---------------|
| GDPR | EU/EEA | All EU users |
| CCPA/CPRA | California | CA residents |
| PIPEDA | Canada | Canadian users |
| LGPD | Brazil | Brazilian users |
| POPIA | South Africa | SA users |
| BIPA | Illinois | Biometric data (IL users) |
| TCPA | USA | SMS/calls |
| CAN-SPAM | USA | Email marketing |
| PCI DSS | Global | Payment processing |

## GDPR Compliance

### Lawful Basis for Processing

| Data Category | Lawful Basis | Documentation |
|---------------|--------------|---------------|
| Account data | Contract | Terms of Service |
| Profile data | Contract + Consent | ToS + Consent screen |
| Location data | Consent | Explicit opt-in |
| Marketing | Consent | Opt-in checkbox |
| Analytics | Legitimate Interest | Privacy policy |
| Safety/fraud | Legitimate Interest | Privacy policy |
| Verification | Consent | Verification consent |

### Data Subject Rights

| Right | Implementation | Response Time |
|-------|----------------|---------------|
| Access (Art. 15) | Export endpoint | 30 days |
| Rectification (Art. 16) | Profile edit | Immediate |
| Erasure (Art. 17) | Delete account | 30 days |
| Portability (Art. 20) | Export endpoint | 30 days |
| Object (Art. 21) | Marketing opt-out | Immediate |
| Restrict (Art. 18) | Account freeze | 72 hours |

### Data Protection Implementation

| Requirement | Implementation |
|-------------|----------------|
| Privacy by Design | Data minimization, encryption |
| Data Minimization | Only collect necessary data |
| Storage Limitation | Retention policies enforced |
| Integrity & Confidentiality | Encryption at rest and transit |
| Accountability | Audit logs, DPO appointed |

## CCPA/CPRA Compliance

### Consumer Rights

| Right | Implementation |
|-------|----------------|
| Know | Privacy policy, data inventory |
| Delete | Account deletion |
| Opt-out of Sale | "Do Not Sell" link (N/A - no data sale) |
| Non-discrimination | Equal service for opt-outs |
| Correct | Profile editing |
| Limit Use | Purpose limitation |

### Disclosure Requirements

- Categories of personal information collected
- Purposes for collection
- Categories of third parties
- No data selling

## Biometric Data (BIPA, CCPA, GDPR)

### Collection
- Explicit written consent required
- Purpose clearly stated
- Retention period disclosed

### Storage
- Encrypted at rest
- Separate from other data
- Access strictly controlled

### Deletion
- Deleted when purpose achieved
- Or within 3 years
- Upon user request

### Regional Restrictions
- Illinois: BIPA compliance required
- Texas: Similar to Illinois
- Washington: Biometric consent
- EU: Special category, explicit consent

## PCI DSS (Payment)

| Requirement | Implementation |
|-------------|----------------|
| No card storage | Stripe handles all card data |
| Secure transmission | TLS 1.3 |
| Access control | Role-based, MFA for admin |
| Monitoring | Transaction logging |
| Testing | Regular PCI scans (via Stripe) |

## Data Retention

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Active accounts | While active | N/A |
| Deleted accounts | 30 days grace | Hard delete |
| Messages | 2 years | Batch purge |
| Media (active) | While account active | N/A |
| Media (deleted) | 90 days | Background job |
| Verification artifacts | 30 days post-decision | Secure delete |
| Audit logs | 7 years | Archive to cold |
| Analytics | 2 years detailed | Aggregate after 90 days |
| Payment records | 7 years | Legal requirement |
| Error logs | 90 days | Auto-expire |

## Third-Party Data Processors

| Processor | Purpose | Data Shared | DPA Status |
|-----------|---------|-------------|------------|
| Azure | Infrastructure | All | Signed |
| Stripe | Payments | Name, email, payment | Signed |
| SendGrid | Email | Email address, name | Signed |
| Firebase | Push notifications | Device tokens | Signed |
| Onfido | Verification | ID documents, selfie | Signed |
| Twilio | Calls/SMS | Phone, call data | Signed |

## Consent Management

### Consent Types

| Consent | Required | Revocable | Impact of Revocation |
|---------|----------|-----------|----------------------|
| Terms of Service | Yes | No (account closure) | Cannot use service |
| Privacy Policy | Yes | No (account closure) | Cannot use service |
| Marketing Email | No | Yes | No marketing emails |
| Push Notifications | No | Yes | No push notifications |
| Location | No | Yes | Limited discovery |
| Biometric Verification | No | Yes | No verified badge |

### Consent Records

```sql
CREATE TABLE consent_records (
  consent_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(user_id),
  consent_type VARCHAR(50),
  version VARCHAR(20),
  granted BOOLEAN,
  granted_at TIMESTAMP,
  revoked_at TIMESTAMP,
  ip_address INET,
  user_agent TEXT
);
```

## International Data Transfers

| From | To | Mechanism |
|------|-----|-----------|
| EU | US (Azure) | Standard Contractual Clauses |
| EU | US (Stripe) | SCCs + Data Privacy Framework |
| Any | Any backup | Encrypted, no key transfer |

## Incident Response

### Breach Notification

| Jurisdiction | Authority | Timeline |
|--------------|-----------|----------|
| EU (GDPR) | Supervisory Authority | 72 hours |
| EU (GDPR) | Users (high risk) | Without undue delay |
| California | Attorney General | 72 hours |
| Various | Users | State-specific |

### Incident Classification

| Level | Description | Notification |
|-------|-------------|--------------|
| Critical | Mass data breach, credential leak | Authority + All users |
| High | Limited user data exposed | Authority + Affected users |
| Medium | Internal data exposure | Internal only |
| Low | No data exposure | Log only |

## Audit Trail Requirements

### Events Logged

- All authentication events
- All data access
- All data modifications
- All consent changes
- All admin actions
- All moderation actions

### Log Retention

- Immutable storage
- 7 year retention
- Tamper-evident
- Searchable by user_id, correlation_id

## Annual Compliance Tasks

- [ ] Privacy policy review and update
- [ ] Terms of service review and update
- [ ] DPIA (Data Protection Impact Assessment)
- [ ] Third-party processor audit
- [ ] Consent mechanism review
- [ ] Retention policy enforcement audit
- [ ] Security assessment
- [ ] Staff privacy training
- [ ] DPA renewal check
