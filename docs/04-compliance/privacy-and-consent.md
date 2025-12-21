# Privacy and Consent Management

## Privacy Principles

1. **Transparency**: Users know what data we collect and why
2. **Purpose Limitation**: Data used only for stated purposes
3. **Data Minimization**: Collect only what's necessary
4. **Accuracy**: Keep data up to date
5. **Storage Limitation**: Delete when no longer needed
6. **Security**: Protect data appropriately
7. **Accountability**: Document and demonstrate compliance

## Data Collection

### Registration Data

| Field | Required | Purpose | Retention |
|-------|----------|---------|-----------|
| Email | Yes | Account, communication | Account lifetime |
| Password | Yes | Authentication | Account lifetime |
| Date of Birth | Yes | Age verification | Account lifetime |
| Country | Yes | Legal compliance | Account lifetime |

### Profile Data

| Field | Required | Purpose | Retention |
|-------|----------|---------|-----------|
| Display Name | Yes | Identification | Account lifetime |
| Bio | No | Self-expression | Account lifetime |
| Gender | No | Matching | Account lifetime |
| Interests | No | Matching | Account lifetime |
| Photos | Yes (1+) | Profile display | Account lifetime |
| Location | No | Discovery | Account lifetime |

### Activity Data

| Data | Purpose | Retention |
|------|---------|-----------|
| Likes/Passes | Matching, improvement | 2 years |
| Messages | Communication | 2 years |
| Searches | Product improvement | 90 days |
| App usage | Analytics | 90 days |

### Verification Data

| Data | Purpose | Retention |
|------|---------|-----------|
| ID Document | Identity verification | 30 days post-decision |
| Selfie | Verification | 30 days post-decision |
| Biometric data | Liveness check | Immediately deleted |

## Consent Framework

### Layered Consent

```
Layer 1: Essential (Contract)
- Account creation
- Core functionality
- Security

Layer 2: Optional (Consent)
- Marketing emails
- Push notifications
- Location sharing
- Biometric verification

Layer 3: Preference
- Discovery visibility
- Read receipts
- Online status
```

### Consent Collection UI

```
Registration Screen:
┌─────────────────────────────────────────────┐
│ Create Account                              │
├─────────────────────────────────────────────┤
│ [Email field]                               │
│ [Password field]                            │
│ [Date of Birth]                             │
│ [Country]                                   │
│                                             │
│ ☑ I agree to the Terms of Service and      │
│   Privacy Policy (required)                 │
│                                             │
│ ☐ Send me updates and tips via email       │
│   (optional)                                │
│                                             │
│ [Create Account]                            │
└─────────────────────────────────────────────┘
```

### Consent Versioning

```sql
-- Track consent versions
CREATE TABLE consent_versions (
  version_id VARCHAR(20) PRIMARY KEY,
  consent_type VARCHAR(50),
  effective_date DATE,
  document_url TEXT,
  summary TEXT
);

-- Link user consent to version
CREATE TABLE user_consents (
  consent_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(user_id),
  consent_type VARCHAR(50),
  version_id VARCHAR(20) REFERENCES consent_versions(version_id),
  status VARCHAR(20), -- granted, revoked
  timestamp TIMESTAMP,
  method VARCHAR(50), -- ui_checkbox, api, implied
  ip_address INET
);
```

### Consent Withdrawal

```
Settings > Privacy:
┌─────────────────────────────────────────────┐
│ Privacy Settings                            │
├─────────────────────────────────────────────┤
│ Marketing Communications                    │
│ ┌─────────────────────────────────────────┐ │
│ │ ☑ Email updates and tips               │ │
│ │ ☐ Push notification promotions          │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Location Sharing                            │
│ ┌─────────────────────────────────────────┐ │
│ │ ◉ Precise location (recommended)        │ │
│ │ ○ City only                             │ │
│ │ ○ Country only                          │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Save Changes]                              │
└─────────────────────────────────────────────┘
```

## Privacy Controls

### Profile Visibility

| Setting | Options | Default |
|---------|---------|---------|
| Show in Discovery | Yes/No | Yes |
| Show Distance | Precise/Approximate/None | Approximate |
| Show Online Status | Everyone/Matches/Nobody | Matches |
| Show Last Active | Everyone/Matches/Nobody | Matches |

### Communication Controls

| Setting | Options | Default |
|---------|---------|---------|
| Who Can Message | Matches/Verified Only | Matches |
| Read Receipts | On/Off | On (if Premium) |
| Typing Indicator | On/Off | On |

### Data Controls

| Action | Implementation |
|--------|----------------|
| Download My Data | Export all personal data |
| Delete Account | Initiate 30-day deletion |
| Correct Data | Edit profile |
| Object to Processing | Contact support |

## Privacy Notice Requirements

### What to Include

1. **Identity**: Who is the data controller
2. **Contact**: How to reach DPO
3. **Categories**: What data we collect
4. **Purposes**: Why we collect it
5. **Legal Basis**: Our justification
6. **Recipients**: Who we share with
7. **Transfers**: International data flows
8. **Retention**: How long we keep data
9. **Rights**: User rights and how to exercise
10. **Complaints**: How to complain

### Accessibility

- Plain language (8th grade reading level)
- Available in user's language
- Mobile-friendly format
- Linked from all collection points
- Version history available

## Children's Privacy

### Age Verification

- Date of birth required at registration
- Server-side age calculation
- Minimum age: 18 years
- No marketing to minors
- Report mechanism for underage users

### If Minor Discovered

1. Immediately suspend account
2. Delete all user-generated content
3. Delete personal data
4. Log incident (without PII)
5. No notification to reported user

## Third-Party Data Sharing

### Categories of Recipients

| Category | Purpose | Data Shared |
|----------|---------|-------------|
| Infrastructure | Hosting | All (encrypted) |
| Payment | Processing | Name, email, payment token |
| Email | Communication | Email, name |
| Push | Notifications | Device token |
| Verification | Identity | ID, selfie |
| Analytics | Improvement | Anonymized usage |

### No Data Selling

- We do NOT sell personal data
- We do NOT share for cross-context advertising
- We do NOT share for third-party marketing

## Cookie Policy

### Cookie Categories

| Category | Purpose | Consent |
|----------|---------|---------|
| Essential | Login, security | Not required |
| Functional | Preferences | Implied consent |
| Analytics | Usage tracking | Consent required |
| Marketing | Ads (none currently) | Consent required |

### Cookie Banner

```
┌─────────────────────────────────────────────┐
│ 🍪 We use cookies                           │
├─────────────────────────────────────────────┤
│ We use essential cookies for functionality  │
│ and optional cookies for analytics.         │
│                                             │
│ [Accept All] [Essential Only] [Customize]  │
└─────────────────────────────────────────────┘
```

## Privacy by Design Checklist

### New Feature Review

- [ ] What personal data is collected?
- [ ] Is this data minimized?
- [ ] What is the lawful basis?
- [ ] Where is it stored?
- [ ] How long is it retained?
- [ ] Who has access?
- [ ] Is consent needed?
- [ ] Is privacy notice updated?
- [ ] Is DPIA needed?
- [ ] How is it deleted?

### Data Protection Impact Assessment (DPIA)

Required for:
- Large-scale profiling
- Biometric processing
- Location tracking
- New verification methods
- Any high-risk processing
