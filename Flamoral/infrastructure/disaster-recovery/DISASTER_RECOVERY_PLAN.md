# Flamoral Dating Platform - Disaster Recovery Plan

## Table of Contents
1. [Overview](#overview)
2. [Recovery Objectives](#recovery-objectives)
3. [Backup Strategy](#backup-strategy)
4. [Recovery Procedures](#recovery-procedures)
5. [Service-Specific Recovery](#service-specific-recovery)
6. [Database Recovery](#database-recovery)
7. [Testing and Validation](#testing-and-validation)
8. [Contact Information](#contact-information)

## Overview

This document outlines the disaster recovery (DR) procedures for the Flamoral Dating Platform. It provides step-by-step instructions for recovering from various failure scenarios.

### Disaster Scenarios Covered
- Complete data center failure
- Regional outage
- Kubernetes cluster failure
- Database corruption or loss
- Service-level failures
- Data breach or ransomware attack
- Network infrastructure failure

## Recovery Objectives

### RTO (Recovery Time Objective)
- **Critical Services (Auth, Payment):** 5 minutes
- **High Priority Services (Messaging, Matching):** 15 minutes
- **Standard Services (Analytics, Admin):** 1 hour
- **Complete Platform:** 4 hours

### RPO (Recovery Point Objective)
- **Transactional Data (Payments, Messages):** 0 minutes (real-time replication)
- **User Data:** 15 minutes (continuous backup)
- **Analytics Data:** 1 hour
- **Logs and Metrics:** 5 minutes

### Data Retention
- **Production Backups:** 30 days
- **Critical Transaction Logs:** 90 days
- **Compliance Data:** 7 years
- **User Data (deleted accounts):** 30 days soft delete

## Backup Strategy

### Automated Backups

#### Database Backups
```yaml
# PostgreSQL Continuous Archiving
Schedule: Continuous WAL archiving
Full Backup: Daily at 02:00 UTC
Incremental: Every 15 minutes
Retention: 30 days
Storage: S3 with cross-region replication

# MongoDB Backups
Schedule: Every 6 hours
Method: mongodump with oplog
Retention: 30 days
Storage: S3 us-east-1 + us-west-2

# Redis Persistence
RDB Snapshot: Every 5 minutes
AOF: appendfsync everysec
Retention: 7 days
```

#### Kubernetes Resources
```bash
# Velero backup schedule
velero schedule create daily-backup \
  --schedule="0 2 * * *" \
  --include-namespaces flamoral-dating,flamoral-ai \
  --ttl 720h0m0s

velero schedule create hourly-critical \
  --schedule="0 * * * *" \
  --include-namespaces flamoral-dating \
  --selector critical=true \
  --ttl 168h0m0s
```

#### Application State
- **User Sessions:** Redis with replication
- **Media Files:** S3 with versioning enabled
- **Configuration:** Stored in Git + External Secrets
- **Metrics:** Prometheus remote write to long-term storage

## Recovery Procedures

### 1. Complete Data Center Failure

#### Immediate Actions (First 5 Minutes)
```bash
# 1. Activate DR runbook
./scripts/dr-activate.sh --scenario=datacenter-failure

# 2. Verify secondary region health
kubectl config use-context flamoral-dr-cluster
kubectl get nodes
kubectl get pods -n flamoral-dating

# 3. Update DNS to point to DR region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://dns-failover.json

# 4. Scale up DR services
kubectl scale deployment --all --replicas=5 -n flamoral-dating

# 5. Verify database replication status
psql -h dr-postgres-primary -c "SELECT * FROM pg_stat_replication;"
```

#### Recovery Steps (15-30 Minutes)
```bash
# 6. Restore from latest backup if needed
velero restore create dr-restore-$(date +%Y%m%d-%H%M) \
  --from-backup daily-backup-latest \
  --wait

# 7. Verify all services are healthy
kubectl get pods -n flamoral-dating
./scripts/health-check-all.sh

# 8. Run smoke tests
./scripts/smoke-tests.sh --environment=dr

# 9. Monitor metrics and alerts
# Check Grafana dashboard: DR Recovery Overview
# Verify no critical alerts firing

# 10. Notify stakeholders
./scripts/notify-stakeholders.sh --status=recovered
```

### 2. Kubernetes Cluster Failure

```bash
# 1. Create new cluster from IaC
cd infrastructure/terraform
terraform apply -var-file=disaster-recovery.tfvars

# 2. Install essential operators
./scripts/install-operators.sh

# 3. Restore Velero backups
velero restore create cluster-restore-$(date +%Y%m%d) \
  --from-schedule daily-backup

# 4. Restore secrets from Vault
./scripts/restore-secrets.sh

# 5. Verify all namespaces and resources
kubectl get all --all-namespaces
```

### 3. Database Recovery

#### PostgreSQL Complete Recovery
```bash
# 1. Stop all services writing to database
kubectl scale deployment --all --replicas=0 -n flamoral-dating

# 2. Create new PostgreSQL instance
helm install postgres-recovery bitnami/postgresql \
  -f values-recovery.yaml \
  --namespace flamoral-dating

# 3. Restore from base backup
pg_basebackup -h s3://flamoral-backups/postgres/base \
  -D /var/lib/postgresql/data \
  -Fp -Xs -P

# 4. Restore WAL files
aws s3 sync s3://flamoral-backups/postgres/wal/ \
  /var/lib/postgresql/wal/

# 5. Configure recovery
cat > /var/lib/postgresql/data/recovery.signal <<EOF
restore_command = 'aws s3 cp s3://flamoral-backups/postgres/wal/%f %p'
recovery_target_time = '2024-12-11 10:00:00 UTC'
EOF

# 6. Start PostgreSQL and monitor recovery
pg_ctl start -D /var/lib/postgresql/data
tail -f /var/lib/postgresql/data/log/postgresql.log

# 7. Promote to primary when recovered
pg_ctl promote -D /var/lib/postgresql/data

# 8. Update services to use recovered database
kubectl patch deployment --all \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"*","env":[{"name":"POSTGRES_HOST","value":"postgres-recovery"}]}]}}}}'

# 9. Scale services back up
kubectl scale deployment --all --replicas=3 -n flamoral-dating
```

#### Point-in-Time Recovery (PITR)
```bash
# Recover to specific timestamp
RECOVERY_TIME="2024-12-11 09:45:00 UTC"

# 1. Stop application
kubectl scale deployment --all --replicas=0

# 2. Restore base backup
pg_basebackup -h s3://flamoral-backups/postgres/base/latest

# 3. Configure PITR
cat > recovery.conf <<EOF
restore_command = 'aws s3 cp s3://flamoral-backups/postgres/wal/%f %p'
recovery_target_time = '${RECOVERY_TIME}'
recovery_target_action = 'promote'
EOF

# 4. Start and promote
pg_ctl start
# Wait for recovery to complete
pg_ctl promote
```

### 4. Service-Specific Recovery

#### Payment Service Recovery (CRITICAL)
```bash
# Priority: HIGHEST - Financial impact

# 1. Check payment service health
kubectl get pods -n flamoral-dating -l app=payment-service

# 2. If pods are failing, check logs
kubectl logs -n flamoral-dating -l app=payment-service --tail=100

# 3. Restore from last known good state
kubectl rollout undo deployment/payment-service -n flamoral-dating

# 4. Verify Stripe webhook endpoints
curl -X GET https://api.stripe.com/v1/webhook_endpoints \
  -u ${STRIPE_SECRET_KEY}:

# 5. Check payment transaction queue
redis-cli -h redis-cluster LLEN payment:queue

# 6. Process any stuck transactions
./scripts/process-payment-queue.sh --retry-failed

# 7. Verify all pending payments
./scripts/verify-payments.sh --since="1 hour ago"
```

#### Auth Service Recovery (CRITICAL)
```bash
# 1. Verify auth service status
kubectl get pods -n flamoral-dating -l app=auth-service

# 2. Check JWT secret integrity
kubectl get secret auth-service-secrets -n flamoral-dating -o jsonpath='{.data.JWT_SECRET}' | base64 -d

# 3. Verify OAuth provider connectivity
./scripts/test-oauth-providers.sh

# 4. Check active sessions in Redis
redis-cli -h redis-cluster DBSIZE

# 5. If needed, force user re-authentication
redis-cli -h redis-cluster FLUSHDB

# 6. Scale up auth service
kubectl scale deployment auth-service --replicas=5 -n flamoral-dating
```

#### Messaging Service Recovery
```bash
# 1. Check message queue depth
kubectl exec -it -n flamoral-dating \
  deployment/messaging-service -- \
  redis-cli -h redis-cluster LLEN message:queue

# 2. Verify MongoDB connectivity
kubectl exec -it -n flamoral-dating \
  deployment/messaging-service -- \
  mongosh --eval "db.adminCommand('ping')"

# 3. Check for message delivery failures
kubectl logs -n flamoral-dating -l app=messaging-service \
  | grep -i "delivery failed"

# 4. Reprocess failed messages
./scripts/reprocess-messages.sh --status=failed --retry=3

# 5. Verify WebSocket connections
kubectl exec -it -n flamoral-dating \
  deployment/realtime-service -- \
  netstat -an | grep :8080 | wc -l
```

### 5. Data Breach Response

```bash
# IMMEDIATE ACTIONS (First 10 minutes)

# 1. Isolate affected systems
kubectl cordon <compromised-node>
kubectl drain <compromised-node> --ignore-daemonsets

# 2. Enable enhanced logging
kubectl patch configmap api-gateway-config -n flamoral-dating \
  -p '{"data":{"LOG_LEVEL":"debug"}}'

# 3. Force password reset for all users
./scripts/force-password-reset.sh --all-users

# 4. Rotate all secrets
./scripts/rotate-all-secrets.sh --force

# 5. Enable MFA requirement
./scripts/enforce-mfa.sh --all-users

# 6. Review access logs
./scripts/audit-access-logs.sh --since="24 hours ago"

# 7. Notify security team and stakeholders
./scripts/security-incident-notification.sh \
  --severity=high \
  --type=data-breach

# 8. Contact law enforcement if required
# See: SECURITY_COMPLIANCE.md

# FORENSICS (Next 24 hours)
# 9. Capture system state for analysis
./scripts/capture-forensics.sh --node=all

# 10. Review and patch vulnerabilities
./scripts/security-scan.sh --full

# 11. Update incident response documentation
# Document: docs/incidents/INCIDENT-$(date +%Y%m%d).md
```

## Testing and Validation

### Monthly DR Drills

```bash
# Schedule: First Saturday of each month, 02:00 UTC

# 1. Non-production DR test
./scripts/dr-test.sh --environment=staging --scenario=full-recovery

# 2. Verify backup integrity
./scripts/verify-backups.sh --all

# 3. Test database restore
./scripts/test-db-restore.sh --database=all --point-in-time

# 4. Test service failover
./scripts/test-failover.sh --service=all

# 5. Generate DR test report
./scripts/generate-dr-report.sh --output=reports/dr-test-$(date +%Y-%m).pdf
```

### Quarterly Full DR Exercise

```bash
# Schedule: Quarterly, communicated 2 weeks in advance

# 1. Full production failover to DR region
# 2. Run production traffic through DR for 4 hours
# 3. Test all recovery procedures
# 4. Measure actual RTO/RPO
# 5. Update runbooks based on findings
```

### Backup Verification

```bash
# Daily automated verification
0 4 * * * /scripts/verify-daily-backups.sh

# Weekly restore test
0 2 * * 0 /scripts/weekly-restore-test.sh

# Monthly full recovery test
0 2 1 * * /scripts/monthly-dr-drill.sh
```

## Recovery Time Estimates

| Scenario | Detection | Initial Response | Full Recovery | Total RTO |
|----------|-----------|------------------|---------------|-----------|
| Single service failure | 1 min | 2 min | 5 min | 8 min |
| Database primary failure | 1 min | 2 min | 10 min | 13 min |
| Availability zone failure | 2 min | 5 min | 20 min | 27 min |
| Region failure | 5 min | 10 min | 45 min | 60 min |
| Complete platform | 5 min | 15 min | 3 hours | 3.25 hours |

## Runbook Checklist

### Pre-Disaster Preparation
- [ ] All team members have access to DR documentation
- [ ] DR credentials are accessible via secure vault
- [ ] Contact tree is up to date
- [ ] Backups are running and verified
- [ ] DR infrastructure is provisioned and tested
- [ ] Monitoring and alerting is configured
- [ ] Communication channels are established

### During Disaster
- [ ] Incident declared and stakeholders notified
- [ ] DR team assembled (primary + backup contacts)
- [ ] Root cause identified (if possible)
- [ ] Recovery procedures initiated
- [ ] Progress updates sent every 30 minutes
- [ ] All actions logged in incident tracker

### Post-Recovery
- [ ] All services verified healthy
- [ ] Smoke tests passed
- [ ] Performance metrics normal
- [ ] Data integrity verified
- [ ] Post-mortem scheduled within 48 hours
- [ ] Runbooks updated based on lessons learned
- [ ] Stakeholders notified of resolution

## Contact Information

### Emergency Contacts (24/7)

**Incident Commander**
- Primary: John Smith - +1-555-0100 - john.smith@flamoral.com
- Backup: Sarah Johnson - +1-555-0101 - sarah.johnson@flamoral.com

**Technical Leads**
- Infrastructure: Mike Chen - +1-555-0102 - mike.chen@flamoral.com
- Database: Lisa Wong - +1-555-0103 - lisa.wong@flamoral.com
- Security: Robert Davis - +1-555-0104 - robert.davis@flamoral.com
- Application: Emily Brown - +1-555-0105 - emily.brown@flamoral.com

**External Contacts**
- AWS Support: Enterprise Support, Case Priority: Critical
- PagerDuty: +1-844-700-4487
- Stripe Support: +1-888-926-2289 (Priority support)

### Communication Channels
- **Slack:** #incident-response (primary)
- **Zoom:** DR War Room (always available)
- **Phone Bridge:** +1-555-0199 PIN: 123456#
- **Status Page:** https://status.flamoral.com

## Related Documents

- [SECURITY_COMPLIANCE.md](../SECURITY_COMPLIANCE.md)
- [ROLLBACK_PLAN.md](../ROLLBACK_PLAN.md)
- [Infrastructure Runbooks](../runbooks/)
- [Backup Procedures](./backup-procedures.md)
- [Incident Response Guide](./incident-response.md)

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-11 | DevOps Team | Initial disaster recovery plan |

---

**Last Updated:** 2024-12-11
**Next Review:** 2025-01-11
**Owner:** DevOps Team
