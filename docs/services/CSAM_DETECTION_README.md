# CSAM Detection System - Implementation Guide

## CRITICAL LEGAL COMPLIANCE NOTICE

This system implements mandatory CSAM (Child Sexual Abuse Material) detection and reporting as required by:
- **18 U.S.C. § 2258A** - NCMEC reporting requirement
- **EARN IT Act** compliance
- **International child protection laws**

**Failure to implement and maintain this system can result in:**
- Civil penalties up to $150,000 per violation
- Criminal prosecution
- Loss of safe harbor protections
- Platform shutdown

## System Overview

The Flamoral CSAM Detection System provides comprehensive protection against child sexual abuse material through:

1. **Microsoft PhotoDNA Integration** - Industry-standard hash matching
2. **NCMEC Database Integration** - Known CSAM hash matching
3. **Perceptual Hashing (pHash)** - Duplicate and modified image detection
4. **Automatic Quarantine** - Immediate content blocking
5. **NCMEC CyberTipline Reporting** - Mandatory legal reporting
6. **Audit Trail** - Complete forensic logging
7. **Law Enforcement Portal** - Secure evidence access

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Media Upload Pipeline                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              CSAM Detection Middleware (MANDATORY)               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  1. PhotoDNA Hash Generation                              │ │
│  │  2. Perceptual Hash (pHash) Generation                    │ │
│  │  3. NCMEC Database Matching                               │ │
│  │  4. Internal Hash Database Matching                       │ │
│  │  5. PhotoDNA Cloud Matching                               │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                 CLEAN              DETECTED
                    │                   │
                    ▼                   ▼
            ┌──────────────┐   ┌──────────────────┐
            │ Allow Upload │   │  BLOCK UPLOAD    │
            └──────────────┘   │  Quarantine      │
                               │  NCMEC Report    │
                               │  Ban User        │
                               │  Notify Staff    │
                               └──────────────────┘
```

## Components

### 1. CSAM Detection Service
**File:** `src/services/csam-detection.service.ts`

Primary detection engine that:
- Generates PhotoDNA hashes
- Performs perceptual hashing
- Matches against NCMEC database
- Matches against internal database
- Performs cloud matching
- Coordinates all detection methods
- Triggers emergency protocols on positive detection

**Key Methods:**
- `detectCSAM()` - Main detection method
- `generatePhotoDNAHash()` - PhotoDNA integration
- `checkNCMECDatabase()` - NCMEC hash matching
- `handleCSAMDetection()` - Emergency response

### 2. Perceptual Hash Service
**File:** `src/services/perceptual-hash.service.ts`

Implements perceptual hashing (dHash) for detecting:
- Modified images (cropped, rotated, filtered)
- Near-duplicate content
- Common evasion techniques

**Key Methods:**
- `generateHash()` - Generate perceptual hash
- `generateHashVariants()` - Detect rotations/flips
- `calculateHammingDistance()` - Similarity comparison
- `findSimilarHashes()` - Database search

### 3. NCMEC Reporting Service
**File:** `src/services/ncmec-reporting.service.ts`

Handles mandatory reporting to NCMEC CyberTipline:
- Creates legally compliant reports
- Submits to NCMEC API
- Tracks report status
- Implements retry logic
- Preserves evidence

**Key Methods:**
- `createReport()` - Create and submit report
- `submitToNCMEC()` - API integration
- `retryFailedReports()` - Automatic retry

### 4. Quarantine Service
**File:** `src/services/csam-quarantine.service.ts`

Manages content quarantine and legal hold:
- Immediate content blocking
- Encrypted evidence storage
- Chain of custody tracking
- Law enforcement access
- Legal hold management

**Key Methods:**
- `quarantineContent()` - Immediate quarantine
- `grantLawEnforcementAccess()` - LE portal access
- `updateChainOfCustody()` - Evidence tracking

### 5. Audit Service
**File:** `src/services/csam-audit.service.ts`

Comprehensive audit logging:
- Immutable audit trail
- Cryptographic signatures
- Tamper detection
- Forensic analysis support
- Compliance reporting

**Key Methods:**
- `logDetectionEvent()` - Log all detections
- `logCSAMIncident()` - Log positive matches
- `verifyAuditChainIntegrity()` - Tamper detection

### 6. Staff Notification Service
**File:** `src/services/staff-notification.service.ts`

Emergency alerting system:
- Email notifications
- SMS alerts (critical)
- Slack integration
- PagerDuty escalation
- Multi-channel redundancy

**Key Methods:**
- `notifyCSAMDetection()` - Emergency alerts
- `notifyCSAMHandlingFailure()` - System failures
- `sendDailySummaryReport()` - Daily reports

## Database Schema

### CSAM Detection Logs
```sql
CREATE TABLE csam_detection_logs (
    id UUID PRIMARY KEY,
    content_id UUID NOT NULL,
    user_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL, -- clean, detected, pending, error
    is_csam BOOLEAN NOT NULL DEFAULT false,
    confidence_score DECIMAL(5,4),
    severity VARCHAR(50), -- unknown, low, medium, high, critical
    photodna_hash TEXT,
    perceptual_hash TEXT,
    ncmec_match BOOLEAN,
    detected_at TIMESTAMP NOT NULL,
    -- ... additional fields
);
```

### CSAM Quarantine
```sql
CREATE TABLE csam_quarantine (
    id UUID PRIMARY KEY,
    content_id UUID NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    status VARCHAR(50), -- quarantined, pending_review, released
    legal_hold_status VARCHAR(50), -- pending, active, released
    storage_location TEXT, -- Encrypted storage
    evidence_hash TEXT, -- Chain of custody
    chain_of_custody JSONB,
    quarantined_at TIMESTAMP NOT NULL,
    -- ... additional fields
);
```

### NCMEC Reports
```sql
CREATE TABLE ncmec_reports (
    id UUID PRIMARY KEY,
    detection_id UUID,
    quarantine_id UUID,
    status VARCHAR(50), -- pending, submitted, acknowledged, failed
    ncmec_report_id VARCHAR(255),
    ncmec_reference_number VARCHAR(255),
    submitted_at TIMESTAMP,
    -- ... additional fields
);
```

### CSAM Audit Logs
```sql
CREATE TABLE csam_audit_logs (
    id UUID PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    detection_id UUID,
    actor VARCHAR(255) NOT NULL,
    event_data JSONB NOT NULL,
    signature TEXT NOT NULL, -- Cryptographic signature
    timestamp TIMESTAMP NOT NULL,
    -- ... additional fields
);
```

## Configuration

### Environment Variables

**Required:**
```env
# CSAM Detection
CSAM_DETECTION_ENABLED=true

# PhotoDNA Configuration
PHOTODNA_ENDPOINT=https://api.microsoftphotodna.com
PHOTODNA_API_KEY=your_photodna_api_key

# NCMEC Configuration
NCMEC_ENDPOINT=https://report.cybertip.org/api
NCMEC_API_KEY=your_ncmec_api_key
NCMEC_ESP_ID=your_esp_id
NCMEC_ESP_NAME=Flamoral Dating Platform
NCMEC_CONTACT_EMAIL=legal@flamoral.com
NCMEC_CONTACT_PHONE=+1-XXX-XXX-XXXX
NCMEC_REPORTING_ENABLED=true

# Storage and Encryption
CSAM_QUARANTINE_STORAGE_PATH=/secure/csam-quarantine
CSAM_ENCRYPTION_KEY=generate_secure_256_bit_key

# Notifications
CSAM_EMERGENCY_EMAILS=safety@flamoral.com,legal@flamoral.com,ceo@flamoral.com
CSAM_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
CSAM_PAGERDUTY_KEY=your_pagerduty_integration_key

# Thresholds
CSAM_AUTO_QUARANTINE_THRESHOLD=0.70
CSAM_NCMEC_REPORTING_THRESHOLD=0.85
```

**Optional:**
```env
CSAM_SMS_NOTIFICATIONS_ENABLED=true
CSAM_EMERGENCY_PHONES=+1-XXX-XXX-XXXX
CSAM_PHASH_SIMILARITY_THRESHOLD=10
LAW_ENFORCEMENT_PORTAL_URL=https://le-portal.flamoral.com
```

## Integration

### Media Service Integration

1. **Add middleware to upload routes:**

```typescript
// src/api/routes/media.routes.ts
import csamDetectionMiddleware from '../middleware/csam-detection.middleware';

router.post(
  '/upload',
  authMiddleware,
  upload.single('image'),
  csamDetectionMiddleware,  // MANDATORY: Must run before storage
  uploadController.uploadPhoto
);
```

2. **Install dependencies:**

```bash
npm install sharp axios
```

3. **Environment configuration:**

Add to media service `.env`:
```env
MODERATION_SERVICE_URL=http://localhost:3005
CSAM_DETECTION_ENABLED=true
```

### Moderation Service Setup

1. **Register CSAM routes:**

```typescript
// src/index.ts
import csamRoutes from './routes/csam.routes';

app.use('/api/csam', csamRoutes);
```

2. **Run database migration:**

```bash
npm run knex migrate:latest
```

3. **Initialize services:**

Services auto-initialize on startup. Verify with:
```bash
curl http://localhost:3005/api/csam/health
```

## Testing

### Unit Tests

```bash
# Run all CSAM detection tests
npm run test -- --testPathPattern=csam

# Test specific service
npm run test -- src/services/csam-detection.service.test.ts
```

### Integration Tests

```bash
# Test full detection pipeline
npm run test:integration -- csam-detection

# Test NCMEC reporting
npm run test:integration -- ncmec-reporting
```

### Manual Testing (DEVELOPMENT ONLY)

**NEVER use real CSAM for testing!**

Use test images provided by:
- Microsoft PhotoDNA Test Suite
- NCMEC Test Portal
- Internal test image dataset

```bash
curl -X POST http://localhost:3005/api/csam/detect \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "test-001",
    "userId": "test-user",
    "imageData": "base64_encoded_test_image",
    "contentType": "test"
  }'
```

## Monitoring and Alerting

### Key Metrics

1. **Detection Metrics:**
   - Total scans per day
   - Positive detections
   - False positive rate
   - Average processing time

2. **System Health:**
   - PhotoDNA API availability
   - NCMEC API availability
   - Detection failure rate
   - Quarantine success rate

3. **Compliance Metrics:**
   - Reports submitted within 24 hours
   - Audit log integrity
   - Staff notification delivery rate

### Dashboards

Access monitoring at:
- Grafana: `http://localhost:3000/d/csam-detection`
- Admin Panel: `https://admin.flamoral.com/csam/dashboard`

### Alerts

Critical alerts trigger:
- **CSAM Detection:** Immediate Slack + Email + PagerDuty
- **System Failure:** Immediate staff notification
- **Report Failure:** Escalated retry + manual intervention

## Incident Response

### Positive Detection Protocol

1. **Automatic Actions (< 1 second):**
   - Block upload
   - Quarantine content
   - Apply legal hold
   - Block user content
   - Ban user account

2. **Reporting (< 24 hours):**
   - NCMEC report created
   - Staff notified
   - Audit trail created

3. **Manual Review (< 48 hours):**
   - Staff review quarantined content
   - Verify detection accuracy
   - Prepare for LE cooperation

### Detection Failure Protocol

1. **Immediate:**
   - Block upload
   - Quarantine for manual review
   - Alert staff

2. **Investigation:**
   - Review failure logs
   - Test detection system
   - Escalate if needed

## Legal Compliance

### Mandatory Reporting Timeline

- **Detection to Quarantine:** < 1 second
- **Detection to NCMEC Report:** < 24 hours
- **Evidence Preservation:** 90+ days minimum
- **Law Enforcement Response:** < 24 hours

### Evidence Preservation

All quarantined content includes:
- Original encrypted content
- PhotoDNA hash
- Perceptual hash
- Detection metadata
- User information
- IP address logs
- Complete audit trail
- Chain of custody

### Safe Harbor Protection

Maintain safe harbor under 18 U.S.C. § 2258 by:
1. Implementing good faith detection
2. Reporting within required timeframe
3. Preserving evidence
4. Cooperating with law enforcement
5. Not notifying uploader

## Security

### Encryption

- **Content:** AES-256-GCM encryption
- **Storage:** Encrypted at rest
- **Transit:** TLS 1.3
- **Keys:** HSM-backed (production)

### Access Control

- **Quarantine Access:** Admin + LE only
- **Evidence Access:** Token-based, time-limited
- **Audit Logs:** Read-only, immutable
- **API Access:** Service authentication required

### Audit Trail

- Cryptographic signatures on all logs
- Tamper detection
- Integrity verification
- Chain of custody tracking

## Support and Resources

### Internal Resources
- Security Team: security@flamoral.com
- Legal Team: legal@flamoral.com
- On-Call: PagerDuty escalation

### External Resources
- NCMEC CyberTipline: https://report.cybertip.org
- Microsoft PhotoDNA: https://www.microsoft.com/photodna
- FBI ICAC Task Force: https://www.fbi.gov/investigate/violent-crime/cac

### Documentation
- NCMEC Reporting Guide: `/docs/ncmec-reporting-guide.pdf`
- PhotoDNA Integration: `/docs/photodna-integration.pdf`
- Legal Compliance: `/docs/legal-compliance.pdf`

## Maintenance

### Daily Tasks (Automated)
- Monitor detection statistics
- Verify NCMEC report submissions
- Check audit log integrity
- Review quarantine queue

### Weekly Tasks
- Review false positive rate
- Update hash databases
- Test notification channels
- Verify backup integrity

### Monthly Tasks
- Compliance audit
- System performance review
- Staff training updates
- Legal consultation

## Emergency Contacts

**CSAM Detection Emergency:**
- PagerDuty: Auto-escalation
- Slack: #csam-alerts (immediate)
- Phone: On-call rotation

**Legal Emergency:**
- General Counsel: legal@flamoral.com
- External Counsel: [law-firm]@lawfirm.com

**Law Enforcement:**
- FBI ICAC: 1-800-CALL-FBI
- NCMEC CyberTipline: 1-800-THE-LOST

## Version History

- v1.0.0 (2025-02-11) - Initial implementation
  - PhotoDNA integration
  - NCMEC reporting
  - Perceptual hashing
  - Quarantine system
  - Audit logging
  - Staff notifications

---

**REMINDER: This system protects children. It must NEVER be disabled in production.**

For questions or issues: csam-support@flamoral.com
