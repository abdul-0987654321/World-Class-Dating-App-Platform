# Flamoral Dating Platform - Policy Content Repository

## Overview

This directory contains all legal policies and compliance documents for the Flamoral Dating Platform, organized by region and jurisdiction. Policies are maintained in Markdown format with YAML frontmatter for metadata and automated processing.

## Directory Structure

```
policies/
├── README.md (this file)
├── global/
│   ├── privacy-policy.md
│   ├── terms-of-service.md
│   ├── cookie-policy.md
│   ├── community-guidelines.md
│   ├── content-policy.md
│   └── data-processing-addendum.md
├── us/
│   ├── general/
│   │   ├── privacy-policy.md
│   │   ├── terms-of-service.md
│   │   └── cookie-policy.md
│   ├── california/
│   │   ├── privacy-policy.md
│   │   ├── ccpa-addendum.md
│   │   ├── cpra-addendum.md
│   │   └── do-not-sell-notice.md
│   └── washington/
│       ├── privacy-policy.md
│       └── wpa-addendum.md
├── eu/
│   ├── privacy-policy.md
│   ├── privacy-policy.de.md
│   ├── privacy-policy.fr.md
│   ├── privacy-policy.es.md
│   ├── privacy-policy.it.md
│   ├── gdpr-notice.md
│   ├── dpo-contact.md
│   ├── data-subject-rights.md
│   └── cookie-policy.md
├── uk/
│   ├── privacy-policy.md
│   ├── gdpr-notice.md
│   ├── ico-registration.md
│   └── terms-of-service.md
├── canada/
│   ├── privacy-policy.md
│   ├── privacy-policy.fr.md
│   ├── pipeda-notice.md
│   └── terms-of-service.md
├── australia/
│   ├── privacy-policy.md
│   ├── privacy-act-notice.md
│   └── terms-of-service.md
├── nigeria/
│   ├── privacy-policy.md
│   ├── ndpr-notice.md
│   └── terms-of-service.md
├── brazil/
│   ├── privacy-policy.md
│   ├── privacy-policy.pt.md
│   ├── lgpd-notice.md
│   ├── lgpd-notice.pt.md
│   └── terms-of-service.md
├── asia-pacific/
│   ├── singapore/
│   │   ├── privacy-policy.md
│   │   ├── pdpa-notice.md
│   │   └── terms-of-service.md
│   ├── japan/
│   │   ├── privacy-policy.md
│   │   ├── privacy-policy.ja.md
│   │   └── terms-of-service.md
│   ├── india/
│   │   ├── privacy-policy.md
│   │   ├── dpdp-notice.md
│   │   └── terms-of-service.md
│   └── south-korea/
│       ├── privacy-policy.md
│       ├── privacy-policy.ko.md
│       └── pipa-notice.md
├── middle-east/
│   ├── uae/
│   │   ├── privacy-policy.md
│   │   ├── privacy-policy.ar.md
│   │   └── terms-of-service.md
│   └── saudi-arabia/
│       ├── privacy-policy.md
│       ├── privacy-policy.ar.md
│       └── terms-of-service.md
└── latin-america/
    ├── mexico/
    │   ├── privacy-policy.md
    │   ├── privacy-policy.es.md
    │   └── terms-of-service.md
    └── argentina/
        ├── privacy-policy.md
        ├── privacy-policy.es.md
        └── terms-of-service.md
```

## Hierarchical Policy System

Flamoral uses a hierarchical policy structure:

1. **Global Policies**: Base policies applicable worldwide
2. **Regional Overrides**: Region-specific modifications to global policies
3. **Jurisdiction-Specific**: Additional requirements for specific jurisdictions
4. **Language Variants**: Translations for regional languages

### Policy Resolution Order

When serving a policy to a user:

1. Check for jurisdiction-specific policy (e.g., `us/california/privacy-policy.md`)
2. If not found, check regional policy (e.g., `us/general/privacy-policy.md`)
3. If not found, fall back to global policy (e.g., `global/privacy-policy.md`)
4. Apply language preference if available (e.g., `.es.md`, `.fr.md`)

## Frontmatter Schema

Every policy document MUST include YAML frontmatter with the following structure:

### Required Fields

```yaml
---
title: string                    # Human-readable title
region: string                   # Region code (e.g., "us/california", "eu", "global")
type: string                     # Policy type: "privacy", "terms", "cookie", "community-guidelines"
version: string                  # Semantic version (e.g., "2.3.0")
last_updated: date               # ISO 8601 date (YYYY-MM-DD)
language: string                 # ISO 639-1 code (e.g., "en", "es", "fr")
effective_date: date             # When this version becomes effective
supersedes: string|null          # Previous version number, null if first version
---
```

### Optional Fields

```yaml
parent_policy: string            # Path to parent policy if this is a regional override
applicable_laws: string[]        # Relevant legal frameworks
data_controller:
  name: string
  address: string
  email: string
  dpo_email: string              # Data Protection Officer (if applicable)
retention_period: string         # Default data retention period
change_summary: string           # Brief description of changes from previous version
affected_sections: string[]      # Section identifiers that changed
legal_review:
  reviewer: string               # Name and credentials
  date: date
  status: string                 # "draft", "review", "approved", "published"
translations:
  - language: string
    file: string                 # Filename of translation
    translator: string
    verified: boolean
notification_required: boolean   # Whether users must be notified of this update
consent_required: boolean        # Whether users must re-consent
related_policies: string[]       # Links to related policy documents
```

### Example Frontmatter

```yaml
---
title: "Privacy Policy - California"
region: "us/california"
type: "privacy"
version: "2.3.0"
last_updated: "2025-01-15"
language: "en"
effective_date: "2025-02-01"
supersedes: "2.2.0"
parent_policy: "us/general/privacy-policy"
applicable_laws:
  - CCPA
  - CPRA
  - GDPR
data_controller:
  name: "Flamoral Inc."
  address: "123 Main St, San Francisco, CA 94102"
  email: "privacy@flamoral.com"
  dpo_email: "dpo@flamoral.com"
retention_period: "18 months"
change_summary: "Updated data retention periods per CPRA requirements; added new user rights section"
affected_sections:
  - data-retention
  - user-rights
  - data-sharing
legal_review:
  reviewer: "Jane Smith, Esq., Partner at Legal Firm LLP"
  date: "2025-01-14"
  status: "approved"
translations:
  - language: "es"
    file: "privacy-policy.es.md"
    translator: "Legal Translation Services Inc."
    verified: true
  - language: "zh"
    file: "privacy-policy.zh.md"
    translator: "Legal Translation Services Inc."
    verified: false
notification_required: true
consent_required: false
related_policies:
  - "us/california/ccpa-addendum"
  - "global/cookie-policy"
  - "global/data-processing-addendum"
---
```

## Policy Types

### 1. Privacy Policy
**Filename**: `privacy-policy.md`

Covers:
- Data collection practices
- Data usage and processing
- Data sharing and third parties
- User rights (access, deletion, portability, etc.)
- Data retention and security
- Contact information for privacy inquiries
- Regional-specific requirements (GDPR, CCPA, etc.)

### 2. Terms of Service
**Filename**: `terms-of-service.md`

Covers:
- User agreement and acceptance
- Account creation and requirements
- User responsibilities and conduct
- Platform features and services
- Payment terms (for premium features)
- Intellectual property rights
- Limitation of liability
- Dispute resolution and governing law
- Termination and suspension

### 3. Cookie Policy
**Filename**: `cookie-policy.md`

Covers:
- Types of cookies used
- Purpose of each cookie category
- Third-party cookies
- Cookie management and opt-out
- Regional requirements (EU Cookie Directive, etc.)

### 4. Community Guidelines
**Filename**: `community-guidelines.md`

Covers:
- Acceptable behavior standards
- Prohibited content and conduct
- Safety and respect principles
- Reporting mechanisms
- Enforcement and consequences
- Appeal process

### 5. Content Policy
**Filename**: `content-policy.md`

Covers:
- User-generated content rules
- Photo and video requirements
- Profile content standards
- Intellectual property respect
- Content removal procedures

### 6. Jurisdiction-Specific Addendums

Examples:
- `ccpa-addendum.md`: California Consumer Privacy Act
- `cpra-addendum.md`: California Privacy Rights Act
- `gdpr-notice.md`: General Data Protection Regulation
- `lgpd-notice.md`: Lei Geral de Proteção de Dados (Brazil)
- `pipeda-notice.md`: Personal Information Protection and Electronic Documents Act (Canada)

## Regional Compliance Requirements

### United States

#### General (All States)
- Clear privacy policy
- Terms of service
- Children's Online Privacy Protection Act (COPPA) compliance
- CAN-SPAM compliance

#### California (CCPA/CPRA)
- Data collection notice
- Right to know
- Right to delete
- Right to opt-out of sale/sharing
- Right to correct
- Right to limit sensitive personal information
- Do Not Sell My Personal Information link
- Privacy policy updates within 30 days of changes

#### Washington (WPA)
- Similar to CCPA with state-specific requirements
- Consumer health data privacy requirements

### European Union (GDPR)

Required elements:
- Legal basis for processing
- Data Protection Officer contact
- Data subject rights (access, rectification, erasure, restriction, portability, objection)
- Data retention periods
- International data transfers
- Right to lodge complaint with supervisory authority
- Automated decision-making disclosures
- Cookie consent mechanism

### United Kingdom (UK GDPR + DPA 2018)

Similar to EU GDPR with:
- ICO (Information Commissioner's Office) registration
- UK-specific supervisory authority
- Post-Brexit data transfer mechanisms

### Canada (PIPEDA)

Required elements:
- Consent mechanisms
- Access to personal information
- Privacy officer contact
- Breach notification procedures
- Accountability principle

### Brazil (LGPD)

Required elements:
- Data controller and processor identification
- Legal basis for processing
- Data subject rights
- National Data Protection Authority (ANPD) information
- International data transfer basis

### Australia (Privacy Act 1988)

Required elements:
- Australian Privacy Principles (APPs) compliance
- Office of the Australian Information Commissioner (OAIC) contact
- Cross-border disclosure notice

### Singapore (PDPA)

Required elements:
- Data Protection Officer contact
- Consent and notification
- Access and correction rights
- Personal Data Protection Commission (PDPC) information

## Version Management

### Semantic Versioning

Policies use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Significant legal changes requiring user notification and/or re-consent
- **MINOR**: Moderate changes (clarifications, new sections, law updates)
- **PATCH**: Minor corrections (typos, formatting, non-substantive edits)

### Version History

All policy versions are maintained in the database with:
- Full content snapshot
- Metadata
- Change summary
- Diff from previous version
- Legal review status

### Archival

Previous versions are archived but remain accessible via API for:
- User reference
- Legal compliance
- Audit trails
- Historical comparison

## Content Guidelines

### Writing Style

- **Clear and Plain Language**: Avoid legal jargon where possible
- **Active Voice**: "We collect your data" not "Your data is collected"
- **Direct Address**: Use "you" and "your" for users, "we" and "our" for Flamoral
- **Short Paragraphs**: Break up dense text for readability
- **Bullet Points**: Use lists for clarity
- **Headings**: Logical hierarchy and clear section titles

### Accessibility

- Proper heading hierarchy (h1 -> h2 -> h3)
- Descriptive link text (not "click here")
- Tables with proper headers
- Alt text for any images/diagrams

### Legal Requirements

- Specific and accurate
- Comprehensive coverage
- Current and up-to-date
- Compliant with all applicable laws
- Reviewed by qualified legal counsel

## Markdown Conventions

### Section Anchors

Use explicit IDs for important sections:

```markdown
## Data We Collect {#data-collection}
```

### Internal Links

Reference other sections or policies:

```markdown
See our [Cookie Policy](../cookie-policy.md) for more information.

As described in the [Data Retention](#data-retention) section...
```

### Tables

Use tables for structured information:

```markdown
| Data Type | Purpose | Legal Basis | Retention |
|-----------|---------|-------------|-----------|
| Email | Account creation | Contract | Account lifetime + 30 days |
| Location | Matching | Legitimate interest | 90 days |
```

### Callouts

Use blockquotes for important notices:

```markdown
> **Important**: California residents have specific rights under CCPA. See our [CCPA Addendum](./ccpa-addendum.md).
```

## Translation Management

### Translation Workflow

1. **Source Update**: English version updated
2. **Translation Queue**: Non-English versions marked for update
3. **Professional Translation**: Sent to legal translation service
4. **Legal Review**: Translated version reviewed by local counsel
5. **Verification**: Mark as `verified: true` in frontmatter
6. **Publication**: Deploy translated version

### File Naming

Language variants use ISO 639-1 codes:
- `privacy-policy.md` (English, default)
- `privacy-policy.es.md` (Spanish)
- `privacy-policy.fr.md` (French)
- `privacy-policy.de.md` (German)
- `privacy-policy.pt.md` (Portuguese)
- `privacy-policy.ja.md` (Japanese)
- `privacy-policy.zh.md` (Chinese)
- `privacy-policy.ar.md` (Arabic)
- `privacy-policy.ko.md` (Korean)

### Translation Metadata

Track translation status in frontmatter:

```yaml
translations:
  - language: "es"
    file: "privacy-policy.es.md"
    translator: "Legal Translation Services Inc."
    verified: true
    last_updated: "2025-01-16"
  - language: "fr"
    file: "privacy-policy.fr.md"
    translator: "Legal Translation Services Inc."
    verified: false
    last_updated: "2025-01-17"
    notes: "Pending legal review"
```

## Update Process

### Manual Updates

1. Create new branch: `policy-update/privacy-ca-retention`
2. Edit policy file
3. Update version number in frontmatter
4. Add `change_summary` and `affected_sections`
5. Update `last_updated` date
6. Submit for legal review
7. Upon approval, merge to main
8. Policy service automatically detects change and publishes

### Automated Updates

The Policy Update Service monitors legal changes and:
1. Detects relevant legal updates
2. Analyzes impact on existing policies
3. Generates proposed changes
4. Creates draft update in review status
5. Notifies legal team
6. Upon approval, publishes update
7. Triggers cascading updates to regional variants
8. Queues translations for update

## Testing

### Validation

Before publishing, validate:
- Frontmatter schema compliance
- Markdown syntax
- Internal links
- Section anchors
- Required sections present
- Version number incremented
- Effective date valid

### Preview

Generate HTML preview:
```bash
npm run policy:preview us/california/privacy-policy.md
```

### Diff Review

Compare versions:
```bash
npm run policy:diff us/california/privacy-policy.md 2.2.0 2.3.0
```

## API Integration

Policies are served through the Policy Service API:

```
GET /api/policies/{region}/{policy-type}
GET /api/policies/{region}/{policy-type}/summary
GET /api/policies/{region}/{policy-type}/versions
GET /api/policies/{region}/{policy-type}/diff/{v1}/{v2}
```

See [Policy Service README](../../backend/services/policy-service/README.md) for full API documentation.

## Compliance Checklist

When creating or updating a policy:

- [ ] Frontmatter complete and accurate
- [ ] Version number follows semantic versioning
- [ ] Change summary provided (if update)
- [ ] Legal review completed
- [ ] All applicable laws addressed
- [ ] Clear and accessible language
- [ ] Internal links functional
- [ ] Contact information current
- [ ] Effective date set appropriately
- [ ] Parent policy reference (if regional variant)
- [ ] Translation needs identified
- [ ] User notification requirement determined
- [ ] Related policies linked
- [ ] Markdown validated
- [ ] Preview reviewed
- [ ] Approved by legal counsel

## Contact

For policy questions:
- **Legal Team**: legal@flamoral.com
- **Privacy Officer**: privacy@flamoral.com
- **Data Protection Officer**: dpo@flamoral.com
- **Policy Service Support**: policy-service@flamoral.com

## Resources

- [Policy Service Documentation](../../backend/services/policy-service/README.md)
- [Policy Maintenance Guide](../../docs/POLICY_MAINTENANCE_GUIDE.md)
- [Legal Compliance Framework](../../docs/LEGAL_COMPLIANCE_FRAMEWORK.md)
- [GDPR Compliance Guide](../../docs/GDPR_COMPLIANCE.md)
- [CCPA Compliance Guide](../../docs/CCPA_COMPLIANCE.md)
