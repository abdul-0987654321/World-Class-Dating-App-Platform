# CSAM Detection System - Deployment Checklist

## Pre-Deployment Requirements

### 1. Legal and Compliance
- [ ] Legal team review completed
- [ ] NCMEC ESP registration completed
- [ ] Microsoft PhotoDNA license obtained
- [ ] Privacy policy updated to include CSAM detection
- [ ] Terms of service updated
- [ ] Law enforcement liaison established
- [ ] Incident response plan documented
- [ ] Staff training completed

### 2. External Service Configuration
- [ ] Microsoft PhotoDNA account created
- [ ] PhotoDNA API key obtained and tested
- [ ] NCMEC CyberTipline account created
- [ ] NCMEC ESP ID obtained
- [ ] NCMEC API key obtained and tested
- [ ] NCMEC test submission successful
- [ ] Law enforcement portal access configured

### 3. Infrastructure Setup
- [ ] Production database created
- [ ] Database migrations run successfully
- [ ] Encrypted storage volume mounted
- [ ] Storage encryption keys generated and secured
- [ ] Backup strategy configured
- [ ] Disaster recovery plan documented
- [ ] Network security rules configured
- [ ] TLS certificates installed

### 4. Monitoring and Alerting
- [ ] Grafana dashboards deployed
- [ ] Prometheus metrics configured
- [ ] PagerDuty integration tested
- [ ] Slack webhook configured and tested
- [ ] Email notifications tested
- [ ] SMS notifications tested (if enabled)
- [ ] On-call rotation established
- [ ] Alert escalation policy defined

### 5. Security Configuration
- [ ] API keys stored in secrets manager
- [ ] Service authentication configured
- [ ] Access control policies implemented
- [ ] Audit logging enabled
- [ ] Encryption keys rotated
- [ ] Security audit completed
- [ ] Penetration testing completed
- [ ] Vulnerability scan passed

## Environment Configuration

### Critical Environment Variables

```bash
# Verify these are set correctly:
echo $CSAM_DETECTION_ENABLED          # Must be: true
echo $NCMEC_REPORTING_ENABLED         # Must be: true
echo $PHOTODNA_API_KEY               # Must be set
echo $NCMEC_API_KEY                  # Must be set
echo $NCMEC_ESP_ID                   # Must be set
echo $CSAM_ENCRYPTION_KEY            # Must be 64 hex chars
echo $AUDIT_SIGNING_KEY              # Must be 64 hex chars
```

### Configuration Validation

```bash
# Test configuration
curl http://localhost:3005/api/csam/config/status

# Expected output:
# {
#   "success": true,
#   "detection": { "enabled": true },
#   "reporting": { "enabled": true, "configured": true }
# }
```

## Database Setup

### 1. Run Migrations

```bash
cd DatingPlatform/backend/services/moderation-service
npm run knex migrate:latest
```

### 2. Verify Tables Created

```sql
-- Connect to database
psql -h localhost -U postgres -d flamoral_moderation

-- Verify CSAM tables exist
\dt csam*

-- Expected tables:
-- csam_detection_logs
-- csam_known_hashes
-- csam_quarantine
-- ncmec_reports
-- csam_audit_logs
-- csam_statistics
```

### 3. Load NCMEC Hash Database (if available)

```bash
# Import NCMEC hash database
npm run scripts:import-ncmec-hashes
```

## Service Deployment

### 1. Install Dependencies

```bash
cd DatingPlatform/backend/services/moderation-service
npm install
```

### 2. Build Service

```bash
npm run build
```

### 3. Run Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# CSAM-specific tests
npm run test -- --testPathPattern=csam
```

### 4. Start Service

```bash
# Development
npm run dev

# Production
npm start
```

### 5. Verify Service Health

```bash
# Check service is running
curl http://localhost:3005/health

# Check CSAM detection health
curl http://localhost:3005/api/csam/health
```

## Integration Testing

### 1. Test CSAM Detection Endpoint

```bash
# Test with safe test image
curl -X POST http://localhost:3005/api/csam/detect \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "test-001",
    "userId": "test-user",
    "imageData": "'$(base64 test-image.jpg)'",
    "contentType": "test"
  }'
```

### 2. Test Media Service Integration

```bash
# Upload test image through media service
curl -X POST http://localhost:3004/api/media/upload \
  -H "Authorization: Bearer test-token" \
  -F "image=@test-image.jpg"

# Should pass through CSAM detection middleware
```

### 3. Test Notification Channels

```bash
# Send test notifications
curl -X POST http://localhost:3005/api/csam/test-notifications
```

### 4. Test NCMEC Reporting (Staging Only)

```bash
# Test NCMEC submission (use staging endpoint)
# DO NOT test with production endpoint
```

## Monitoring Setup

### 1. Configure Metrics Collection

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'csam-detection'
    static_configs:
      - targets: ['localhost:3005']
    metrics_path: '/metrics'
```

### 2. Import Grafana Dashboards

```bash
# Import CSAM detection dashboard
grafana-cli dashboard import csam-detection-dashboard.json
```

### 3. Configure Alerts

```yaml
# alertmanager.yml
routes:
  - match:
      severity: critical
      service: csam-detection
    receiver: pagerduty-csam
    continue: true
  - match:
      severity: critical
      service: csam-detection
    receiver: slack-csam
```

## Post-Deployment Verification

### 1. Functional Tests

- [ ] Upload test image (clean)
- [ ] Verify detection completes
- [ ] Verify image stored correctly
- [ ] Check audit log created
- [ ] Test quarantine workflow
- [ ] Test notification delivery
- [ ] Verify metrics collection
- [ ] Test admin dashboard access

### 2. Performance Tests

- [ ] Load test detection endpoint
- [ ] Verify < 2 second detection time
- [ ] Test concurrent uploads
- [ ] Verify database performance
- [ ] Check memory usage
- [ ] Monitor CPU usage

### 3. Security Tests

- [ ] Verify encrypted storage
- [ ] Test access controls
- [ ] Verify audit log immutability
- [ ] Test API authentication
- [ ] Verify TLS configuration
- [ ] Check for exposed secrets

### 4. Compliance Tests

- [ ] Verify detection logs all content
- [ ] Check quarantine workflow
- [ ] Verify NCMEC reporting pipeline
- [ ] Test law enforcement access
- [ ] Verify audit trail completeness
- [ ] Check evidence preservation

## Go-Live Checklist

### Final Pre-Launch

- [ ] All tests passing
- [ ] Monitoring operational
- [ ] Alerts configured
- [ ] On-call team briefed
- [ ] Legal team approval
- [ ] Executive approval
- [ ] Emergency contacts verified
- [ ] Runbook documented
- [ ] Rollback plan prepared

### Launch Day

- [ ] Enable CSAM detection
- [ ] Monitor for 1 hour continuously
- [ ] Verify detections working
- [ ] Check notification delivery
- [ ] Monitor error rates
- [ ] Verify database performance
- [ ] Check audit logs
- [ ] Team available for support

### Post-Launch (First 24 Hours)

- [ ] Monitor detection statistics
- [ ] Review false positive rate
- [ ] Verify NCMEC reports submitted
- [ ] Check system performance
- [ ] Review audit logs
- [ ] Verify backup completion
- [ ] Document any issues
- [ ] Team retrospective

## Emergency Procedures

### Service Failure

1. **Immediate:**
   - Alert on-call team
   - Check service logs
   - Verify database connectivity
   - Check external API status

2. **Temporary Mitigation:**
   - Enable fail-secure mode (blocks all uploads)
   - Manual review queue
   - Emergency notification

3. **Resolution:**
   - Fix root cause
   - Resume service
   - Process queued content
   - Incident report

### False Positive

1. **Immediate:**
   - Review detection logs
   - Verify user impact
   - Check confidence scores

2. **Investigation:**
   - Analyze detection method
   - Review hash matches
   - Consult legal team

3. **Resolution:**
   - Update thresholds if needed
   - Document learnings
   - User communication (if appropriate)

### NCMEC Reporting Failure

1. **Immediate:**
   - Alert legal team
   - Check NCMEC API status
   - Verify network connectivity

2. **Escalation:**
   - Manual report submission
   - Contact NCMEC support
   - Document timeline

3. **Resolution:**
   - Resume automatic reporting
   - Verify backlog submitted
   - Update procedures

## Maintenance Schedule

### Daily
- Monitor detection statistics
- Review quarantine queue
- Check notification delivery
- Verify NCMEC report status

### Weekly
- Review false positive rate
- Check system performance
- Test notification channels
- Review audit logs
- Update hash databases

### Monthly
- Compliance audit
- Security review
- Performance optimization
- Staff training update
- Legal consultation

### Quarterly
- Full system audit
- Disaster recovery test
- Penetration testing
- Policy review
- Executive briefing

## Rollback Plan

### Preparation
- Document current state
- Backup database
- Preserve audit logs
- Notify stakeholders

### Rollback Steps

1. **Stop new detections:**
   ```bash
   export CSAM_DETECTION_ENABLED=false
   systemctl restart moderation-service
   ```

2. **Preserve data:**
   ```bash
   # Backup all CSAM tables
   pg_dump -t 'csam_*' flamoral_moderation > csam_backup.sql
   ```

3. **Revert code:**
   ```bash
   git revert <commit-hash>
   npm install
   npm run build
   systemctl restart moderation-service
   ```

4. **Verify rollback:**
   - Test service health
   - Verify old functionality
   - Check audit logs
   - Monitor errors

5. **Communication:**
   - Notify legal team
   - Document reason
   - Plan forward

## Support Contacts

### Internal
- **On-Call Engineer:** PagerDuty escalation
- **Security Team:** security@flamoral.com
- **Legal Team:** legal@flamoral.com
- **Executive Team:** exec@flamoral.com

### External
- **NCMEC Support:** 1-800-THE-LOST
- **Microsoft PhotoDNA:** photodna-support@microsoft.com
- **FBI ICAC:** 1-800-CALL-FBI
- **External Counsel:** [law-firm]@lawfirm.com

## Sign-Off

**Technical Lead:** _________________ Date: _______

**Security Lead:** _________________ Date: _______

**Legal Counsel:** _________________ Date: _______

**CTO/VP Engineering:** _____________ Date: _______

**CEO:** __________________________ Date: _______

---

**NOTE:** This checklist must be completed before deploying CSAM detection to production. All checkboxes must be verified and signed off by appropriate stakeholders.
