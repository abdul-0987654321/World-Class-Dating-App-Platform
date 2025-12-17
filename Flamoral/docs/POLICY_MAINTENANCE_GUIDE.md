# Policy Maintenance Guide

## Overview

This guide provides comprehensive instructions for maintaining legal policies and compliance documents for the Flamoral Dating Platform. It covers both automated and manual processes for monitoring legal changes, updating policies, managing versions, and ensuring compliance across all supported regions.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Getting Started](#getting-started)
3. [Monitoring Legal Changes](#monitoring-legal-changes)
4. [Policy Update Workflow](#policy-update-workflow)
5. [Regional Variant Management](#regional-variant-management)
6. [Version Control](#version-control)
7. [Translation Management](#translation-management)
8. [Review and Approval Process](#review-and-approval-process)
9. [Publishing and Deployment](#publishing-and-deployment)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

## System Architecture

### Components

The Policy Maintenance System consists of four main components:

1. **Change Monitoring Service**: Continuously monitors legal data sources for updates
2. **Policy Update Engine**: Analyzes impact and generates policy updates
3. **Version Management System**: Tracks all policy versions and changes
4. **Content Delivery API**: Serves policies to applications and users

### Data Flow

```
Legal Sources → Change Detection → Impact Analysis → Policy Update → Review → Publication → API
```

### Technology Stack

- **Backend**: Node.js, TypeScript, Express
- **Database**: PostgreSQL (metadata), S3 (content)
- **Cache**: Redis
- **Queue**: RabbitMQ
- **AI**: OpenAI GPT-4 (content generation)
- **Monitoring**: Cheerio, Axios (web scraping)

## Getting Started

### Prerequisites

1. **Environment Setup**

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Configure required variables
OPENAI_API_KEY=your_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/flamoral_policies
LEGAL_API_KEYS='{"source_id": "api_key"}'
```

2. **Database Setup**

```bash
# Run migrations
npm run migrate:policies

# Seed initial data
npm run seed:policies
```

3. **Directory Structure**

Ensure the following directory structure exists:

```
content/policies/
├── global/
├── us/general/
├── us/california/
├── us/washington/
├── eu/
├── uk/
├── canada/
├── australia/
├── brazil/
├── nigeria/
├── asia-pacific/
├── middle-east/
└── latin-america/
```

### Initial Configuration

1. **Configure Monitoring Sources**

Edit `backend/services/policy-service/config/monitoring-sources.json`:

```json
{
  "sources": [
    {
      "id": "source-identifier",
      "name": "Human-readable name",
      "jurisdiction": "region-code",
      "type": "rss|api|scraper",
      "url": "https://...",
      "keywords": ["keyword1", "keyword2"],
      "interval": "6h|daily|weekly",
      "priority": "high|medium|low"
    }
  ]
}
```

2. **Configure Regions**

Edit `backend/services/policy-service/config/regions.json`:

```json
{
  "regions": [
    {
      "code": "us/california",
      "name": "California, United States",
      "laws": ["CCPA", "CPRA"],
      "languages": ["en", "es"],
      "parent": "us/general"
    }
  ]
}
```

## Monitoring Legal Changes

### Automated Monitoring

The system automatically monitors configured legal sources on a schedule.

#### Starting the Monitor

```bash
# Run once
node scripts/policy-maintenance/update-policies.js --mode=monitor

# Run as scheduled service (every 6 hours)
node scripts/policy-maintenance/update-policies.js --mode=schedule
```

#### Monitoring Process

1. **Source Polling**: System checks each configured source
2. **Content Extraction**: Parses RSS feeds, API responses, or web pages
3. **Keyword Matching**: Filters results based on configured keywords
4. **Change Detection**: Identifies new or updated legal content
5. **Notification**: Alerts legal team of detected changes
6. **Queuing**: Adds changes to processing queue

#### Supported Source Types

**RSS Feeds**
```json
{
  "type": "rss",
  "url": "https://eur-lex.europa.eu/oj/rss/en",
  "keywords": ["GDPR", "data protection"]
}
```

**REST APIs**
```json
{
  "type": "api",
  "url": "https://api.legislative.source/search",
  "keywords": ["privacy", "CCPA"],
  "auth": "api_key"
}
```

**Web Scrapers**
```json
{
  "type": "scraper",
  "url": "https://legislation.gov.uk/new",
  "selectors": {
    "item": ".legislation-item",
    "title": ".title",
    "link": "a",
    "date": ".date"
  },
  "keywords": ["data protection"]
}
```

### Manual Change Submission

To manually submit a legal change for processing:

```bash
curl -X POST http://localhost:3010/api/policies/update \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "manual",
    "legalChange": {
      "jurisdiction": "us/california",
      "law": "CPRA",
      "changeType": "amendment",
      "effectiveDate": "2025-07-01",
      "description": "New data retention requirements",
      "sourceUrl": "https://leginfo.legislature.ca.gov/..."
    },
    "affectedPolicies": ["privacy"],
    "region": "us/california",
    "policyType": "privacy"
  }'
```

### Monitoring Dashboard

Access the monitoring dashboard at:
```
http://localhost:3010/admin/monitoring
```

View:
- Active monitoring sources
- Recent legal changes detected
- Processing queue status
- Failed monitoring attempts

## Policy Update Workflow

### Automatic Updates

When a legal change is detected:

1. **Impact Analysis**
   - System determines which regions are affected
   - Identifies relevant policy types
   - Maps changes to policy sections

2. **Content Generation**
   - AI analyzes the legal change
   - Generates proposed policy updates
   - Identifies affected sections
   - Suggests version increment (major/minor/patch)

3. **Draft Creation**
   - Creates new policy version in draft status
   - Updates frontmatter metadata
   - Archives previous version
   - Generates change summary

4. **Review Queue**
   - Adds draft to legal review queue
   - Notifies legal team via email
   - Creates review task in dashboard

### Manual Updates

To manually update a policy:

#### Step 1: Create Branch

```bash
git checkout -b policy-update/privacy-california-v2.4.0
```

#### Step 2: Edit Policy File

```bash
# Edit the policy
nano content/policies/us/california/privacy-policy.md
```

#### Step 3: Update Frontmatter

```yaml
---
title: "Privacy Policy - California"
region: "us/california"
type: "privacy"
version: "2.4.0"  # INCREMENT VERSION
last_updated: "2025-01-20"  # UPDATE DATE
effective_date: "2025-02-15"
supersedes: "2.3.0"  # PREVIOUS VERSION
change_summary: "Added new user rights section per CPRA"  # DESCRIBE CHANGES
affected_sections:
  - user-rights
  - data-retention
legal_review:
  status: "pending"
  date: "2025-01-20"
---
```

#### Step 4: Validate

```bash
node scripts/policy-maintenance/update-policies.js --mode=validate --file=content/policies/us/california/privacy-policy.md
```

#### Step 5: Preview

```bash
npm run policy:preview us/california/privacy-policy.md
```

#### Step 6: Submit for Review

```bash
git add content/policies/us/california/privacy-policy.md
git commit -m "Update California privacy policy v2.4.0: Add CPRA user rights"
git push origin policy-update/privacy-california-v2.4.0

# Create pull request
gh pr create --title "Privacy Policy Update - California v2.4.0" \
  --body "Updates privacy policy to comply with new CPRA requirements"
```

### Version Increment Rules

Follow semantic versioning:

- **MAJOR (X.0.0)**: Breaking changes requiring user re-consent
  - New legal basis for processing
  - Removal of user rights
  - Significant data usage changes
  - Change in data controller

- **MINOR (1.X.0)**: New features or sections
  - Additional user rights
  - New data collection purposes
  - Updated contact information
  - Clarifications and expansions

- **PATCH (1.1.X)**: Bug fixes and corrections
  - Typo corrections
  - Formatting improvements
  - Link updates
  - Non-substantive edits

## Regional Variant Management

### Hierarchy System

Policies follow a parent-child hierarchy:

```
Global Policy
└── US General
    ├── California (CCPA/CPRA)
    ├── Washington (WPA)
    └── Virginia (CDPA)
```

### Creating Regional Variants

#### Step 1: Create Base Policy

Start with the parent policy (e.g., `us/general/privacy-policy.md`)

#### Step 2: Create Regional Directory

```bash
mkdir -p content/policies/us/virginia
```

#### Step 3: Copy and Customize

```bash
cp content/policies/us/general/privacy-policy.md content/policies/us/virginia/privacy-policy.md
```

#### Step 4: Update Frontmatter

```yaml
---
title: "Privacy Policy - Virginia"
region: "us/virginia"
parent_policy: "us/general/privacy-policy"
applicable_laws:
  - CDPA
  - GDPR
---
```

#### Step 5: Add Regional Sections

Add jurisdiction-specific content:

```markdown
## Virginia-Specific Rights {#virginia-rights}

Under the Virginia Consumer Data Protection Act (CDPA), you have the following rights:

1. **Right to Access**: Request access to your personal data
2. **Right to Delete**: Request deletion of your personal data
3. **Right to Correct**: Request correction of inaccurate data
4. **Right to Portability**: Obtain a copy in portable format
5. **Right to Opt-Out**: Opt out of targeted advertising and sales

To exercise these rights, contact us at privacy@flamoral.com.
```

### Cascading Updates

When a global or parent policy changes, regional variants should be updated:

#### Automated Cascade

The system automatically:
1. Detects parent policy update
2. Identifies child policies
3. Applies non-conflicting changes
4. Preserves regional-specific sections
5. Creates review tasks for manual verification

#### Manual Cascade

To manually cascade changes:

```bash
npm run policy:cascade --from=global/privacy-policy --to=all
```

### Conflict Resolution

When parent and regional policies conflict:

1. **Regional Wins**: Regional-specific sections take precedence
2. **Merge Required**: System flags conflicts for manual review
3. **Legal Review**: Legal team approves final version

## Version Control

### Version Tracking

Every policy version is tracked with:

- Version number (semver)
- Effective date
- Publication date
- Author/approver
- Change summary
- Full content snapshot
- Diff from previous version

### Viewing Version History

**API Request:**
```bash
curl http://localhost:3010/api/policies/us/california/privacy/versions
```

**Response:**
```json
{
  "success": true,
  "data": {
    "policy": "privacy-policy-us-california",
    "currentVersion": "2.4.0",
    "versions": [
      {
        "version": "2.4.0",
        "effectiveDate": "2025-02-15",
        "publishedDate": "2025-01-20",
        "changeType": "minor",
        "summary": "Added CPRA user rights section",
        "affectedSections": ["user-rights"]
      },
      {
        "version": "2.3.0",
        "effectiveDate": "2025-01-01",
        "publishedDate": "2024-12-15",
        "changeType": "minor",
        "summary": "Updated data retention periods"
      }
    ]
  }
}
```

### Comparing Versions

**API Request:**
```bash
curl http://localhost:3010/api/policies/us/california/privacy/diff/2.3.0/2.4.0
```

**Response:**
```json
{
  "success": true,
  "data": {
    "from": "2.3.0",
    "to": "2.4.0",
    "changes": [
      {
        "section": "user-rights",
        "type": "modified",
        "summary": "Added right to correction",
        "before": "You have the right to access and delete...",
        "after": "You have the right to access, delete, and correct...",
        "reason": "CPRA requirement"
      }
    ]
  }
}
```

### Rollback Procedure

To rollback to a previous version:

1. **Identify Target Version**
```bash
curl http://localhost:3010/api/policies/us/california/privacy/versions
```

2. **Create Rollback Request**
```bash
curl -X POST http://localhost:3010/api/policies/rollback \
  -H "X-API-Key: your_api_key" \
  -d '{
    "policyId": "privacy-policy-us-california",
    "targetVersion": "2.3.0",
    "reason": "Legal review identified issue in 2.4.0",
    "effectiveDate": "2025-01-22"
  }'
```

3. **Review and Approve**
Legal team reviews and approves rollback in dashboard

4. **Publish**
System publishes rollback version and notifies users

## Translation Management

### Translation Workflow

1. **Source Update**: English version updated
2. **Translation Queue**: System adds translation tasks
3. **Professional Translation**: Send to translation service
4. **Legal Review**: Local counsel reviews translation
5. **Verification**: Mark as verified in frontmatter
6. **Publication**: Deploy translated version

### Requesting Translations

**API Request:**
```bash
curl -X POST http://localhost:3010/api/policies/translation/request \
  -H "X-API-Key: your_api_key" \
  -d '{
    "policyId": "privacy-policy-us-california",
    "version": "2.4.0",
    "targetLanguages": ["es", "zh", "ko"],
    "priority": "high"
  }'
```

### Managing Translations

**File Naming Convention:**
```
privacy-policy.md      (English, default)
privacy-policy.es.md   (Spanish)
privacy-policy.zh.md   (Chinese)
privacy-policy.ko.md   (Korean)
```

**Frontmatter Tracking:**
```yaml
translations:
  - language: "es"
    file: "privacy-policy.es.md"
    translator: "Legal Translation Services Inc."
    verified: true
    last_updated: "2025-01-21"
  - language: "zh"
    file: "privacy-policy.zh.md"
    translator: "Legal Translation Services Inc."
    verified: false
    last_updated: "2025-01-22"
    notes: "Pending legal review"
```

### Translation Status

**Check Translation Status:**
```bash
curl http://localhost:3010/api/policies/translation/status \
  -H "X-API-Key: your_api_key"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pending": 5,
    "inProgress": 3,
    "review": 2,
    "completed": 15,
    "tasks": [
      {
        "policyId": "privacy-policy-eu",
        "version": "2.1.0",
        "targetLanguage": "de",
        "status": "in_progress",
        "assignedTo": "Legal Translation Services Inc.",
        "dueDate": "2025-01-25"
      }
    ]
  }
}
```

## Review and Approval Process

### Review Dashboard

Access at `http://localhost:3010/admin/reviews`

### Review Workflow

1. **Pending Review**: Legal team notified of new draft
2. **Assign Reviewer**: Manager assigns to attorney
3. **Legal Review**: Attorney reviews changes
4. **Comments**: Reviewer can request changes
5. **Revision**: If needed, policy is updated
6. **Approval**: Reviewer approves for publication
7. **Publication**: Approved policy is published

### Submitting Review

**API Request:**
```bash
curl -X POST http://localhost:3010/api/policies/review \
  -H "X-API-Key: your_api_key" \
  -d '{
    "policyId": "privacy-policy-us-california",
    "version": "2.4.0",
    "status": "approved",
    "reviewer": "Jane Smith, Esq.",
    "comments": "Reviewed and approved. Complies with CPRA requirements."
  }'
```

### Review Checklist

Before approving, verify:

- [ ] All legal requirements addressed
- [ ] Accurate and up-to-date information
- [ ] Clear and accessible language
- [ ] Proper frontmatter metadata
- [ ] Version number incremented correctly
- [ ] Effective date appropriate
- [ ] Related policies updated if needed
- [ ] Translations requested for non-English regions
- [ ] User notification plan in place (if required)
- [ ] Consent requirements determined

## Publishing and Deployment

### Publication Process

1. **Approval Obtained**: Legal review approved
2. **Effective Date Set**: Determine when policy takes effect
3. **User Notification**: If required, prepare notifications
4. **Publication**: Deploy to production

### Publishing a Policy

**API Request:**
```bash
curl -X POST http://localhost:3010/api/policies/publish \
  -H "X-API-Key: your_api_key" \
  -d '{
    "policyId": "privacy-policy-us-california",
    "version": "2.4.0",
    "effectiveDate": "2025-02-15",
    "notifyUsers": true,
    "requireConsent": false
  }'
```

### Notification Strategy

**When to Notify Users:**
- Major version changes (X.0.0)
- Changes affecting user rights
- Material changes to data practices
- Legally required notifications

**Notification Methods:**
- Email to all affected users
- In-app notification banner
- Push notification (for significant changes)
- Website banner on login

**Notification Template:**
```
Subject: Updated Privacy Policy

Dear Flamoral User,

We've updated our Privacy Policy to comply with new California privacy laws (CPRA). The updated policy takes effect on February 15, 2025.

What's Changed:
- Enhanced user rights (access, deletion, correction)
- Updated data retention periods
- New opt-out options for data sharing

You can review the full policy at: https://flamoral.com/legal/privacy

The policy will automatically apply on the effective date. If you have questions, contact us at privacy@flamoral.com.

Best regards,
The Flamoral Team
```

### Consent Management

**When Consent Required:**
- Processing new types of personal data
- New purposes for data processing
- Sharing data with new third parties
- Material changes to legal basis

**Consent Collection:**
```javascript
// User must actively consent before continuing
{
  "requireConsent": true,
  "consentType": "explicit",
  "consentVersion": "privacy-policy-v2.4.0",
  "consentText": "I have read and agree to the updated Privacy Policy",
  "consentDate": "2025-02-15T00:00:00Z"
}
```

### Deployment Checklist

- [ ] Policy approved by legal counsel
- [ ] Version number verified
- [ ] Effective date set
- [ ] Notification plan prepared
- [ ] Consent mechanism implemented (if needed)
- [ ] Translations completed and verified
- [ ] Related policies updated
- [ ] API cache cleared
- [ ] CDN updated
- [ ] User service notified
- [ ] Analytics tracking configured
- [ ] Rollback plan prepared

## Troubleshooting

### Common Issues

#### Issue: Policy Not Appearing in API

**Symptoms:**
- 404 error when requesting policy
- Policy not in version list

**Diagnosis:**
```bash
# Check file exists
ls -l content/policies/us/california/privacy-policy.md

# Validate policy
node scripts/policy-maintenance/update-policies.js --mode=validate \
  --file=content/policies/us/california/privacy-policy.md

# Check database
psql $DATABASE_URL -c "SELECT * FROM policies WHERE region='us/california' AND type='privacy';"
```

**Solution:**
1. Verify file exists in correct location
2. Check frontmatter is valid YAML
3. Ensure database record exists
4. Clear cache: `redis-cli FLUSHDB`
5. Restart policy service

#### Issue: Monitoring Not Detecting Changes

**Symptoms:**
- No changes detected when they should be
- Monitoring log shows errors

**Diagnosis:**
```bash
# Check monitoring logs
tail -f logs/policy-monitor.log

# Test source manually
curl -v "https://eur-lex.europa.eu/oj/rss/en"

# Verify API keys
echo $LEGAL_API_KEYS | jq
```

**Solution:**
1. Verify source URL is accessible
2. Check API keys are valid
3. Update keywords if too restrictive
4. Verify source selector configuration (for scrapers)
5. Check rate limits not exceeded

#### Issue: AI Update Generation Failing

**Symptoms:**
- Error in update-policies script
- No content generated

**Diagnosis:**
```bash
# Check OpenAI API key
echo $OPENAI_API_KEY

# Test API connection
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check usage limits
curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Solution:**
1. Verify OpenAI API key is valid
2. Check usage limits not exceeded
3. Reduce content length in prompt
4. Use fallback model (GPT-3.5)
5. Implement manual update if AI unavailable

#### Issue: Version Conflict

**Symptoms:**
- Multiple policies with same version
- Version number not incrementing

**Diagnosis:**
```bash
# Check for duplicate versions
psql $DATABASE_URL -c "
  SELECT region, type, version, COUNT(*)
  FROM policies
  GROUP BY region, type, version
  HAVING COUNT(*) > 1;
"

# Check version in file vs database
cat content/policies/us/california/privacy-policy.md | grep "version:"
```

**Solution:**
1. Manually increment version to next available
2. Resolve conflicts in database
3. Archive duplicate versions
4. Update frontmatter in file
5. Re-publish with correct version

### Debug Mode

Run policy service in debug mode:

```bash
NODE_ENV=development DEBUG=policy:* npm start
```

View detailed logs:
```bash
tail -f logs/policy-service.log | jq
```

### Getting Help

**Support Channels:**
- Email: policy-service@flamoral.com
- Slack: #legal-compliance
- Documentation: https://docs.flamoral.com/policy-service

**Emergency Contacts:**
- Legal Team Lead: Jane Smith (jane.smith@flamoral.com)
- Technical Lead: John Doe (john.doe@flamoral.com)
- On-Call: +1-555-FLAMORAL

## Best Practices

### Content Writing

1. **Use Plain Language**
   - Avoid legal jargon
   - Write at 8th-grade reading level
   - Use short sentences and paragraphs

2. **Be Specific**
   - Provide concrete examples
   - Use exact timeframes
   - Specify data types

3. **Stay Current**
   - Review policies quarterly
   - Monitor legal changes actively
   - Update promptly when laws change

4. **Maintain Consistency**
   - Use same terminology across policies
   - Follow house style guide
   - Keep formatting uniform

### Version Management

1. **Semantic Versioning**
   - Follow semver strictly
   - Document rationale for version type
   - Keep changelog updated

2. **Effective Dates**
   - Allow 30+ days for major changes
   - Consider user notification time
   - Align with legal requirements

3. **Archive Everything**
   - Never delete old versions
   - Maintain complete history
   - Keep all supporting documentation

### Legal Review

1. **Always Get Approval**
   - Never publish without legal review
   - Document reviewer and date
   - Keep approval records

2. **Multi-Jurisdiction Review**
   - Engage local counsel for regional policies
   - Verify translations legally accurate
   - Consider cultural differences

3. **Regular Audits**
   - Annual comprehensive review
   - Quarterly spot checks
   - Post-incident reviews

### Technical Operations

1. **Monitoring**
   - Set up alerts for monitoring failures
   - Review logs weekly
   - Test monitoring sources monthly

2. **Performance**
   - Cache aggressively
   - Use CDN for policy delivery
   - Optimize database queries

3. **Security**
   - Require API keys for admin endpoints
   - Audit all changes
   - Encrypt sensitive data

4. **Disaster Recovery**
   - Backup policies daily
   - Test rollback procedures
   - Maintain runbooks

### Compliance

1. **Documentation**
   - Document all decisions
   - Keep communication records
   - Maintain audit trail

2. **User Rights**
   - Make policies easily accessible
   - Provide clear contact information
   - Honor opt-out requests promptly

3. **Data Protection**
   - Implement privacy by design
   - Minimize data collection
   - Secure personal information

## Appendix

### Policy Templates

See `content/policies/templates/` for starter templates:
- `privacy-policy-template.md`
- `terms-of-service-template.md`
- `cookie-policy-template.md`
- `community-guidelines-template.md`

### Legal Resources

**GDPR:**
- Official Text: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- EDPB Guidelines: https://edpb.europa.eu/our-work-tools/general-guidance_en

**CCPA/CPRA:**
- Official Text: https://oag.ca.gov/privacy/ccpa
- Regulations: https://cppa.ca.gov/regulations/

**Other Jurisdictions:**
- UK GDPR: https://ico.org.uk/for-organisations/guide-to-data-protection/
- PIPEDA: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/
- LGPD: https://www.gov.br/anpd/pt-br

### Glossary

- **Data Controller**: Entity determining purposes and means of processing
- **Data Processor**: Entity processing data on behalf of controller
- **DPO**: Data Protection Officer
- **Legal Basis**: Lawful ground for processing personal data
- **GDPR**: General Data Protection Regulation
- **CCPA**: California Consumer Privacy Act
- **CPRA**: California Privacy Rights Act
- **PIPEDA**: Personal Information Protection and Electronic Documents Act
- **LGPD**: Lei Geral de Proteção de Dados (Brazil)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-20
**Maintained By**: Legal & Compliance Team
**Contact**: legal@flamoral.com
