# Vendor Data Processing Agreement (DPA) Register

**Document ID:** COMP-DPA-001
**Version:** 1.0
**Last Updated:** 2026-01-05
**Owner:** Legal & Compliance Team
**Classification:** Internal - Confidential

---

## PRE-PRODUCTION VALIDATION CHECKLIST

> **ACTION REQUIRED**: Before going to production, verify ALL items below are completed.

| Item | Status | Owner | Completed Date |
|------|--------|-------|----------------|
| All Tier 1 vendor DPAs obtained | [REQUIRED] | Legal Lead | |
| All Tier 2 vendor DPAs obtained | [REQUIRED] | Legal Lead | |
| DPA storage location configured | [REQUIRED] | Legal Lead | |
| Sub-processor notification subscriptions active | [REQUIRED] | Compliance | |
| Annual review calendar created | [REQUIRED] | Legal Lead | |
| Internal contacts populated below | [REQUIRED] | HR/Legal | |

**Validation Sign-off**: _________________________ Date: _____________

---

## Table of Contents

1. [Overview](#overview)
2. [Vendor DPA Register](#vendor-dpa-register)
3. [DPA Status Definitions](#dpa-status-definitions)
4. [Vendor Details](#vendor-details)
5. [DPA Request Process](#dpa-request-process)
6. [DPA Storage & Management](#dpa-storage--management)
7. [Annual Review Process](#annual-review-process)
8. [DPA Checklist Template](#dpa-checklist-template)
9. [Vendor DPA Quick Links](#vendor-dpa-quick-links)

---

## Overview

This document maintains a comprehensive register of all third-party data processors used by our dating platform and tracks the status of Data Processing Agreements (DPAs) with each vendor. Under GDPR Article 28, we are required to have written contracts with all processors that handle personal data on our behalf.

### Purpose

- Ensure GDPR/CCPA compliance for all data processing activities
- Track DPA status for all third-party vendors
- Maintain documentation of data flows to external processors
- Support audit and compliance verification activities

### Scope

This register covers all vendors that:
- Process personal data on behalf of our platform
- Have access to user data (directly or indirectly)
- Provide infrastructure or services where personal data is stored or transmitted

---

## Vendor DPA Register

| Vendor | Service Category | DPA Status | DPA Reference | Data Categories | Processing Locations | Sub-processor Policy | Annual Review Date | Owner |
|--------|------------------|------------|---------------|-----------------|---------------------|---------------------|-------------------|-------|
| AWS | Cloud Infrastructure | Required | AWS-DPA-2026-001 | All user data, PII, behavioral data | US, EU (configurable) | Published list with notification | 2026-06-01 | Infrastructure Lead |
| Stripe | Payments | Required | STRIPE-DPA-2026-001 | Payment data, PII (name, email, address) | US, EU | Published list | 2026-06-01 | Finance Lead |
| AWS SES | Email Delivery | Required | AWS-DPA-2026-001 | Email addresses, names, email content | US, EU (configurable) | Published list with notification | 2026-06-01 | Infrastructure Lead |
| SendGrid | Email Delivery (Backup) | Required | SENDGRID-DPA-2026-001 | Email addresses, names, email content | US | Published list | 2026-06-01 | Infrastructure Lead |
| Firebase (Google) | Push Notifications | Required | FIREBASE-DPA-2026-001 | Device tokens, user IDs, notification content | US, EU | Published list | 2026-06-01 | Mobile Lead |
| Twilio | SMS Communications | Required | TWILIO-DPA-2026-001 | Phone numbers, SMS content, user IDs | US, EU | Published list | 2026-06-01 | Infrastructure Lead |
| OpenAI | AI Features | Required | OPENAI-DPA-2026-001 | Anonymized conversation data, profile text | US | Business API terms apply | 2026-06-01 | AI/ML Lead |
| Segment | Analytics | Required | SEGMENT-DPA-2026-001 | Event data, user IDs, behavioral data | US | Published list | 2026-06-01 | Analytics Lead |

---

## DPA Status Definitions

| Status | Definition | Action Required |
|--------|------------|-----------------|
| **Required** | DPA is required and must be obtained/executed | Initiate DPA request process immediately |
| **In Progress** | DPA request submitted, awaiting execution | Follow up with vendor; track progress |
| **Completed** | DPA fully executed and on file | Schedule annual review |
| **Pending Review** | DPA exists but needs annual review/renewal | Conduct review within 30 days |
| **N/A** | No personal data processed; DPA not required | Document justification |

---

## Vendor Details

### 1. Amazon Web Services (AWS)

**Service Category:** Cloud Infrastructure
**Services Used:** EC2, RDS, S3, ElastiCache, SES, CloudFront, Lambda, SQS, SNS, Cognito

| Field | Details |
|-------|---------|
| **DPA Status** | Required |
| **DPA Location** | `/legal/dpas/aws/AWS-DPA-2026-001.pdf` |
| **Contract Type** | AWS Data Processing Addendum (Standard) |
| **Data Categories Shared** | All user personal data, profile information, photos, messages, behavioral data, payment metadata |
| **Special Categories (Art. 9)** | Sexual orientation, relationship preferences (encrypted at rest) |
| **Processing Locations** | US-East-1 (primary), EU-West-1 (EU users), configurable per region |
| **Data Residency Controls** | Available via region selection |
| **Sub-processor Policy** | Published list at aws.amazon.com/compliance/sub-processors; 30-day notification for changes |
| **Security Certifications** | SOC 1/2/3, ISO 27001, ISO 27017, ISO 27018, PCI DSS Level 1 |
| **Annual Review Date** | 2026-06-01 |
| **Owner** | Infrastructure Lead |
| **Notes** | Primary infrastructure provider; DPA covers all AWS services |

### 2. Stripe

**Service Category:** Payment Processing
**Services Used:** Payments, Subscriptions, Billing Portal, Radar (fraud detection)

| Field | Details |
|-------|---------|
| **DPA Status** | Required |
| **DPA Location** | `/legal/dpas/stripe/STRIPE-DPA-2026-001.pdf` |
| **Contract Type** | Stripe Data Processing Agreement |
| **Data Categories Shared** | Cardholder name, billing address, email, payment card details (tokenized), transaction history, subscription status |
| **Special Categories (Art. 9)** | None |
| **Processing Locations** | US (primary), EU (for EU cardholders) |
| **Data Residency Controls** | Limited; follows card network requirements |
| **Sub-processor Policy** | Published list at stripe.com/legal/service-providers |
| **Security Certifications** | PCI DSS Level 1, SOC 1/2, ISO 27001 |
| **Annual Review Date** | 2026-06-01 |
| **Owner** | Finance Lead |
| **Notes** | Acts as independent controller for fraud prevention activities |

### 3. AWS SES (Simple Email Service)

**Service Category:** Email Delivery
**Services Used:** Transactional email, marketing email delivery

| Field | Details |
|-------|---------|
| **DPA Status** | Required |
| **DPA Location** | `/legal/dpas/aws/AWS-DPA-2026-001.pdf` (covered under main AWS DPA) |
| **Contract Type** | AWS Data Processing Addendum |
| **Data Categories Shared** | Email addresses, names, email content, delivery metadata |
| **Special Categories (Art. 9)** | None (email content may reference preferences) |
| **Processing Locations** | US-East-1, EU-West-1 (configurable) |
| **Data Residency Controls** | Available via region selection |
| **Sub-processor Policy** | Covered under AWS sub-processor list |
| **Security Certifications** | Inherits AWS certifications |
| **Annual Review Date** | 2026-06-01 |
| **Owner** | Infrastructure Lead |
| **Notes** | Primary email provider; covered under main AWS DPA |

### 4. SendGrid (Twilio)

**Service Category:** Email Delivery (Backup/Marketing)
**Services Used:** Transactional email backup, marketing campaigns

| Field | Details |
|-------|---------|
| **DPA Status** | Required |
| **DPA Location** | `/legal/dpas/sendgrid/SENDGRID-DPA-2026-001.pdf` |
| **Contract Type** | Twilio Data Protection Addendum |
| **Data Categories Shared** | Email addresses, names, email content, engagement metrics |
| **Special Categories (Art. 9)** | None |
| **Processing Locations** | US (primary) |
| **Data Residency Controls** | Limited |
| **Sub-processor Policy** | Published at twilio.com/legal/sub-processors |
| **Security Certifications** | SOC 2 Type II, ISO 27001 |
| **Annual Review Date** | 2026-06-01 |
| **Owner** | Infrastructure Lead |
| **Notes** | Backup email provider; now owned by Twilio |

### 5. Firebase (Google Cloud)

**Service Category:** Mobile Services
**Services Used:** Firebase Cloud Messaging (FCM), Firebase Analytics, Crashlytics

| Field | Details |
|-------|---------|
| **DPA Status** | Required |
| **DPA Location** | `/legal/dpas/firebase/FIREBASE-DPA-2026-001.pdf` |
| **Contract Type** | Google Cloud Data Processing Addendum |
| **Data Categories Shared** | Device tokens, push notification content, app usage analytics, crash reports |
| **Special Categories (Art. 9)** | None (notification content is generic) |
| **Processing Locations** | US, EU (configurable for some services) |
| **Data Residency Controls** | Limited for FCM; available for Firestore |
| **Sub-processor Policy** | Published at cloud.google.com/terms/subprocessors |
| **Security Certifications** | SOC 1/2/3, ISO 27001, ISO 27017, ISO 27018 |
| **Annual Review Date** | 2026-06-01 |
| **Owner** | Mobile Lead |
| **Notes** | Google Cloud DPA covers Firebase services |

### 6. Twilio

**Service Category:** Communications
**Services Used:** SMS delivery, phone verification, WhatsApp messaging

| Field | Details |
|-------|---------|
| **DPA Status** | Required |
| **DPA Location** | `/legal/dpas/twilio/TWILIO-DPA-2026-001.pdf` |
| **Contract Type** | Twilio Data Protection Addendum |
| **Data Categories Shared** | Phone numbers, SMS content, verification codes, delivery status |
| **Special Categories (Art. 9)** | None |
| **Processing Locations** | US, EU, Singapore (regional endpoints available) |
| **Data Residency Controls** | Available via region selection |
| **Sub-processor Policy** | Published at twilio.com/legal/sub-processors |
| **Security Certifications** | SOC 2 Type II, ISO 27001, PCI DSS |
| **Annual Review Date** | 2026-06-01 |
| **Owner** | Infrastructure Lead |
| **Notes** | Used for 2FA and transactional SMS |

### 7. OpenAI

**Service Category:** AI/ML Services
**Services Used:** GPT API for conversation suggestions, profile optimization, icebreakers

| Field | Details |
|-------|---------|
| **DPA Status** | Required |
| **DPA Location** | `/legal/dpas/openai/OPENAI-DPA-2026-001.pdf` |
| **Contract Type** | OpenAI Business Terms + DPA |
| **Data Categories Shared** | Anonymized conversation snippets, profile text (anonymized), user preferences |
| **Special Categories (Art. 9)** | Relationship preferences may be inferred (anonymized) |
| **Processing Locations** | US |
| **Data Residency Controls** | Not available |
| **Sub-processor Policy** | Microsoft Azure infrastructure; limited sub-processor list |
| **Security Certifications** | SOC 2 Type II |
| **Annual Review Date** | 2026-06-01 |
| **Owner** | AI/ML Lead |
| **Notes** | Business API terms include data not used for training; implement PII stripping before API calls |

### 8. Segment (Twilio)

**Service Category:** Customer Data Platform / Analytics
**Services Used:** Event tracking, user identification, data routing

| Field | Details |
|-------|---------|
| **DPA Status** | Required |
| **DPA Location** | `/legal/dpas/segment/SEGMENT-DPA-2026-001.pdf` |
| **Contract Type** | Twilio Data Protection Addendum |
| **Data Categories Shared** | User IDs, event data, behavioral data, device information, IP addresses |
| **Special Categories (Art. 9)** | None directly; behavioral data may indicate preferences |
| **Processing Locations** | US (primary), EU (available) |
| **Data Residency Controls** | EU regional deployment available |
| **Sub-processor Policy** | Published at segment.com/legal/sub-processors |
| **Security Certifications** | SOC 2 Type II, ISO 27001 |
| **Annual Review Date** | 2026-06-01 |
| **Owner** | Analytics Lead |
| **Notes** | Now part of Twilio; routes data to downstream destinations |

---

## DPA Request Process

### Step 1: Identify DPA Requirement

Before engaging any new vendor that will process personal data:

1. Complete the **Vendor Privacy Assessment** form
2. Determine if personal data will be shared/accessed
3. Classify data categories (standard PII, special categories, etc.)
4. Document processing purposes and legal basis

### Step 2: Request DPA from Vendor

**For vendors with standard DPAs:**

Most enterprise vendors offer pre-signed or click-through DPAs:

1. Navigate to vendor's legal/compliance portal
2. Download or accept their standard DPA
3. Review terms against our minimum requirements (see checklist below)
4. If acceptable, execute/accept the DPA
5. Store executed copy in designated location

**For vendors requiring negotiation:**

1. Send DPA request to vendor legal contact using template below
2. Provide our standard DPA template if vendor doesn't have one
3. Track negotiation in the Legal Request tracker
4. Escalate to Legal team for non-standard terms
5. Obtain signatures from authorized signatories

### Step 3: DPA Request Email Template

```
Subject: Data Processing Agreement Request - [Your Company Name]

Dear [Vendor Name] Legal/Privacy Team,

We are [currently using / planning to use] [Vendor Name] services and need to
establish a Data Processing Agreement to comply with our obligations under GDPR
and other applicable data protection regulations.

Could you please provide:

1. Your standard Data Processing Agreement (DPA) or Data Processing Addendum
2. Your current list of sub-processors
3. Information about data processing locations
4. Relevant security certifications (SOC 2, ISO 27001, etc.)

Our requirements include:
- GDPR Article 28 compliant terms
- Standard Contractual Clauses (SCCs) for international transfers (if applicable)
- Sub-processor notification mechanisms
- Data deletion/return provisions
- Audit rights

Please send the DPA to: legal@[yourcompany].com

Thank you for your assistance.

Best regards,
[Your Name]
[Title]
[Company]
```

### Step 4: DPA Review Checklist

Before accepting any DPA, verify it includes:

- [ ] Clear definition of processing scope and purposes
- [ ] Data categories and data subjects identified
- [ ] Processing only on documented instructions
- [ ] Confidentiality obligations for personnel
- [ ] Appropriate technical and organizational measures
- [ ] Sub-processor engagement terms and notification
- [ ] Assistance with data subject rights
- [ ] Assistance with security incident notification
- [ ] Data deletion or return upon termination
- [ ] Audit and inspection rights
- [ ] Liability and indemnification terms
- [ ] Standard Contractual Clauses (for non-EU transfers)

---

## DPA Storage & Management

### Storage Location

All executed DPAs must be stored in:

```
/legal/dpas/[vendor-name]/[VENDOR]-DPA-[YEAR]-[SEQ].pdf
```

Example: `/legal/dpas/stripe/STRIPE-DPA-2026-001.pdf`

### Required Documentation Per Vendor

Each vendor folder should contain:

1. **Executed DPA** - Signed/accepted agreement
2. **Sub-processor List** - Current list with date retrieved
3. **Security Documentation** - Certifications, SOC 2 reports (if available)
4. **Processing Records** - Documentation of data categories shared
5. **Review History** - Notes from annual reviews

### Access Control

- DPA documents: Legal team + department owners
- Sub-processor lists: Compliance team + relevant stakeholders
- Security documentation: Security team + Infrastructure leads

### Version Control

- Maintain all versions of DPAs (do not delete superseded versions)
- Use clear naming convention with dates
- Document reason for any DPA amendments

---

## Annual Review Process

### Review Schedule

All DPAs must be reviewed annually. Standard review cycle:

| Quarter | Vendors for Review |
|---------|-------------------|
| Q1 (Jan-Mar) | AWS, Stripe |
| Q2 (Apr-Jun) | Firebase, Twilio |
| Q3 (Jul-Sep) | OpenAI, Segment |
| Q4 (Oct-Dec) | SendGrid, New vendors |

### Annual Review Checklist

For each vendor, complete the following:

#### 1. Service Review
- [ ] Confirm vendor is still in use
- [ ] Verify services used match DPA scope
- [ ] Identify any new services added during the year
- [ ] Review data categories currently shared

#### 2. DPA Compliance Review
- [ ] Confirm DPA is still in effect
- [ ] Check for any amendments or updates from vendor
- [ ] Verify sub-processor list is current
- [ ] Confirm processing locations haven't changed
- [ ] Review any security incidents reported

#### 3. Security Assessment
- [ ] Request updated SOC 2/security certifications
- [ ] Review any security questionnaire responses
- [ ] Verify encryption and security controls
- [ ] Check vendor's incident response history

#### 4. Regulatory Updates
- [ ] Confirm SCCs are current version (if applicable)
- [ ] Check for regulatory guidance affecting the vendor
- [ ] Update for any new legal requirements

#### 5. Documentation Update
- [ ] Update this register with any changes
- [ ] File updated documentation
- [ ] Set next review date

### Review Documentation

Complete the **DPA Annual Review Form** and store in:
```
/legal/dpas/[vendor-name]/reviews/[YEAR]-annual-review.pdf
```

---

## DPA Checklist Template

### New Vendor DPA Checklist

```markdown
## DPA Checklist: [Vendor Name]
Date: [YYYY-MM-DD]
Reviewer: [Name]

### Vendor Information
- Vendor Name:
- Service Category:
- Services Used:
- Contract Start Date:

### Data Processing Details
- [ ] Data categories documented
- [ ] Processing purposes defined
- [ ] Legal basis confirmed
- [ ] Data flow diagram created

### DPA Requirements
- [ ] GDPR Article 28 compliance
- [ ] Processing on instructions only
- [ ] Confidentiality obligations
- [ ] Security measures defined
- [ ] Sub-processor terms
- [ ] Data subject rights assistance
- [ ] Breach notification (72 hours)
- [ ] Audit rights included
- [ ] Data deletion/return terms

### International Transfers
- [ ] Processing locations identified
- [ ] SCCs included (if non-EU)
- [ ] Transfer Impact Assessment (if required)

### Security
- [ ] Security certifications verified
- [ ] Encryption requirements met
- [ ] Access controls documented

### Approval
- [ ] Legal review completed
- [ ] Privacy team sign-off
- [ ] DPA executed and filed
- [ ] Register updated
```

---

## Vendor DPA Quick Links

Use these links to access standard DPAs from major vendors:

| Vendor | DPA Link | Notes |
|--------|----------|-------|
| **AWS** | [AWS Data Processing Addendum](https://aws.amazon.com/compliance/data-processing-addendum/) | Automatically applies; download for records |
| **Stripe** | [Stripe Data Processing Agreement](https://stripe.com/legal/dpa) | Accept in Dashboard or request signed copy |
| **Google/Firebase** | [Google Cloud Data Processing Addendum](https://cloud.google.com/terms/data-processing-addendum) | Covers all Google Cloud & Firebase services |
| **Twilio** | [Twilio Data Protection Addendum](https://www.twilio.com/legal/data-protection-addendum) | Covers Twilio, SendGrid, and Segment |
| **SendGrid** | [SendGrid DPA (via Twilio)](https://www.twilio.com/legal/data-protection-addendum) | Now under Twilio umbrella |
| **Segment** | [Segment DPA (via Twilio)](https://segment.com/legal/data-protection-addendum/) | Now under Twilio umbrella |
| **OpenAI** | [OpenAI Data Processing Addendum](https://openai.com/policies/data-processing-addendum) | Available for business/enterprise customers |

### Sub-processor Lists

| Vendor | Sub-processor List URL |
|--------|----------------------|
| AWS | https://aws.amazon.com/compliance/sub-processors/ |
| Stripe | https://stripe.com/legal/service-providers |
| Google/Firebase | https://cloud.google.com/terms/subprocessors |
| Twilio | https://www.twilio.com/legal/sub-processors |
| Segment | https://segment.com/legal/sub-processors |
| OpenAI | Contact support or check enterprise agreement |

---

## Appendix A: GDPR Article 28 Requirements Summary

The DPA must include provisions addressing:

1. **Subject matter and duration** of processing
2. **Nature and purpose** of processing
3. **Type of personal data** and categories of data subjects
4. **Controller's obligations and rights**

The processor must:

1. Process only on documented instructions
2. Ensure authorized persons are bound by confidentiality
3. Take appropriate security measures (Article 32)
4. Respect conditions for engaging sub-processors
5. Assist controller with data subject rights
6. Assist with security obligations (Articles 32-36)
7. Delete or return data after services end
8. Make available information for audits

---

## Appendix B: Contact Information

### Internal Contacts

| Role | Name | Email |
|------|------|-------|
| Legal Lead | [REQUIRED: Full Name] | [REQUIRED: email@flamoral.com] |
| Privacy Officer | [REQUIRED: Full Name] | [REQUIRED: email@flamoral.com] |
| Infrastructure Lead | [REQUIRED: Full Name] | [REQUIRED: email@flamoral.com] |
| Security Lead | [REQUIRED: Full Name] | [REQUIRED: email@flamoral.com] |

### Vendor Legal Contacts

| Vendor | Contact Method |
|--------|---------------|
| AWS | aws.amazon.com/contact-us/compliance |
| Stripe | support.stripe.com (select Legal/Privacy) |
| Google/Firebase | cloud.google.com/contact |
| Twilio | twilio.com/help/contact |
| OpenAI | Contact via platform or enterprise support |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-05 | Compliance Team | Initial document creation |

---

**Next Review Date:** 2026-04-01
**Document Owner:** Legal & Compliance Team
**Approval Status:** Draft - Pending Legal Review
