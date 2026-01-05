# Flamoral Platform - Disaster Recovery Drill Execution Runbook

**Document ID:** DR-DRILL-001
**Version:** 1.0
**Effective Date:** 2026-01-05
**Owner:** Platform Reliability Team
**Classification:** Internal - Confidential

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Pre-Drill Checklist](#2-pre-drill-checklist)
3. [Monthly Database Restore Drill](#3-monthly-database-restore-drill)
4. [Quarterly Partial Failover Drill](#4-quarterly-partial-failover-drill)
5. [Annual Full DR Simulation](#5-annual-full-dr-simulation)
6. [Post-Drill Documentation Template](#6-post-drill-documentation-template)
7. [Drill Schedule Calendar](#7-drill-schedule-calendar)
8. [Appendix](#appendix)

---

## 1. Purpose and Scope

### 1.1 Purpose

This runbook provides detailed procedures for executing disaster recovery drills to:
- Validate the effectiveness of DR procedures
- Ensure team readiness for actual disaster scenarios
- Identify gaps in recovery processes
- Meet compliance requirements for DR testing
- Validate RTO/RPO objectives

### 1.2 Scope

This runbook covers three types of DR drills:

| Drill Type | Frequency | Duration | Impact |
|------------|-----------|----------|--------|
| Database Restore Drill | Monthly | 2-4 hours | None (staging) |
| Partial Failover Drill | Quarterly | 4-6 hours | Minimal (10% traffic) |
| Full DR Simulation | Annual | 8-12 hours | Planned maintenance window |

### 1.3 Objectives

- **RTO Target:** 4 hours for complete platform recovery
- **RPO Target:** 15 minutes for transactional data, 1 hour for analytics
- **Success Rate Target:** 95% of drills completed successfully
- **Documentation:** 100% of drills documented within 48 hours

---

## 2. Pre-Drill Checklist

### 2.1 Stakeholder Notification (T-24 Hours)

**Required Notifications:**

| Stakeholder | Method | Lead Time | Template |
|-------------|--------|-----------|----------|
| Engineering Team | Slack #engineering | 24 hours | [ENG-NOTIFY] |
| Operations Team | Slack #ops-alerts | 24 hours | [OPS-NOTIFY] |
| Customer Support | Email + Slack | 24 hours | [CS-NOTIFY] |
| Executive Team | Email | 24 hours | [EXEC-NOTIFY] |
| On-Call Engineers | PagerDuty | 24 hours | [ONCALL-NOTIFY] |

**Notification Template - ENG-NOTIFY:**
```
Subject: [DR DRILL] Scheduled DR Drill - {DRILL_TYPE} - {DATE}

Team,

A {DRILL_TYPE} is scheduled for {DATE} at {TIME} UTC.

Drill Details:
- Type: {DRILL_TYPE}
- Start Time: {DATE} {TIME} UTC
- Expected Duration: {DURATION}
- Impact: {IMPACT_DESCRIPTION}
- Drill Lead: {DRILL_LEAD}
- War Room: {WAR_ROOM_LINK}

Required Participants:
- {PARTICIPANT_LIST}

Please confirm your availability by responding to this thread.

Questions? Contact {DRILL_LEAD}.
```

**Checklist - Stakeholder Notification:**
```
[ ] Engineering team notified via Slack #engineering
[ ] Operations team notified via Slack #ops-alerts
[ ] Customer Support notified via email and Slack
[ ] Executive summary sent to leadership
[ ] On-call schedule reviewed for conflicts
[ ] All required participants confirmed availability
[ ] Calendar invites sent with war room link
[ ] Status page maintenance window scheduled (if applicable)
```

### 2.2 Backup Verification (T-12 Hours)

**Automated Verification Script:**
```bash
#!/bin/bash
# File: scripts/verify-drill-readiness.sh

echo "=== DR Drill Backup Verification ==="
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# 1. Verify PostgreSQL backups
echo -e "\n[1/5] Checking PostgreSQL backups..."
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier flamoral-prod-cluster \
  --query 'DBClusterSnapshots[?Status==`available`]|[0:3].{ID:DBClusterSnapshotIdentifier,Created:SnapshotCreateTime,Status:Status}' \
  --output table

# Verify point-in-time recovery window
PITR_WINDOW=$(aws rds describe-db-clusters \
  --db-cluster-identifier flamoral-prod-cluster \
  --query 'DBClusters[0].EarliestRestorableTime' \
  --output text)
echo "PITR available from: ${PITR_WINDOW}"

# 2. Verify Redis snapshots
echo -e "\n[2/5] Checking Redis snapshots..."
aws elasticache describe-snapshots \
  --cache-cluster-id flamoral-prod-redis \
  --query 'Snapshots[?SnapshotStatus==`available`]|[0:3].{Name:SnapshotName,Created:NodeSnapshots[0].SnapshotCreateTime}' \
  --output table

# 3. Verify S3 replication status
echo -e "\n[3/5] Checking S3 cross-region replication..."
aws s3api head-bucket --bucket flamoral-dr-backup-us-west-2 2>/dev/null && \
  echo "DR bucket accessible: flamoral-dr-backup-us-west-2" || \
  echo "ERROR: DR bucket not accessible!"

# 4. Verify Kubernetes backup (Velero)
echo -e "\n[4/5] Checking Velero backups..."
velero backup get --selector 'velero.io/schedule-name=daily-backup' | head -5

# 5. Verify secrets backup
echo -e "\n[5/5] Checking secrets backup..."
aws secretsmanager list-secrets \
  --query 'SecretList[?contains(Name, `flamoral-dr`)].{Name:Name,LastChanged:LastChangedDate}' \
  --output table

echo -e "\n=== Verification Complete ==="
```

**Manual Verification Checklist:**
```
[ ] PostgreSQL automated backups enabled and recent (<24h)
[ ] Point-in-time recovery window covers drill scenario
[ ] Redis snapshots available and recent (<24h)
[ ] S3 cross-region replication lag < 15 minutes
[ ] Velero backups successful (last 3 days)
[ ] Secrets backed up to DR region
[ ] Configuration backups in Git (committed)
[ ] DR infrastructure Terraform state accessible
```

### 2.3 Team Availability Confirmation (T-24 Hours)

**Required Roles for Each Drill Type:**

| Role | Monthly | Quarterly | Annual | Backup Required |
|------|---------|-----------|--------|-----------------|
| Drill Lead | Yes | Yes | Yes | Yes |
| Database Administrator | Yes | Yes | Yes | Yes |
| Platform Engineer | No | Yes | Yes | Yes |
| Network Engineer | No | Yes | Yes | Yes |
| Security Engineer | No | No | Yes | Yes |
| Customer Support Lead | No | Yes | Yes | No |
| Communications Lead | No | No | Yes | No |

**Availability Confirmation Script:**
```bash
#!/bin/bash
# File: scripts/confirm-drill-availability.sh

DRILL_TYPE=$1
DRILL_DATE=$2

echo "=== DR Drill Availability Check ==="
echo "Drill Type: ${DRILL_TYPE}"
echo "Drill Date: ${DRILL_DATE}"

# Query PagerDuty for on-call schedule
echo -e "\nOn-call engineers for ${DRILL_DATE}:"
curl -s --request GET \
  --url "https://api.pagerduty.com/oncalls?since=${DRILL_DATE}T00:00:00Z&until=${DRILL_DATE}T23:59:59Z" \
  --header "Authorization: Token token=${PAGERDUTY_TOKEN}" \
  --header "Content-Type: application/json" | \
  jq '.oncalls[] | {user: .user.summary, schedule: .schedule.summary}'

# Check calendar conflicts
echo -e "\nChecking for conflicts..."
# Integration with Google Calendar/Outlook would go here

echo -e "\nPlease confirm availability in #dr-drills Slack channel"
```

### 2.4 Rollback Plan Ready

**Rollback Decision Criteria:**
- Drill duration exceeds 150% of expected time
- Production impact detected (unplanned)
- Critical service degradation
- Data integrity concerns identified
- External dependencies unavailable

**Rollback Procedure:**
```bash
#!/bin/bash
# File: scripts/drill-rollback.sh

DRILL_TYPE=$1
ROLLBACK_REASON=$2

echo "=== INITIATING DRILL ROLLBACK ==="
echo "Drill Type: ${DRILL_TYPE}"
echo "Reason: ${ROLLBACK_REASON}"
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

case ${DRILL_TYPE} in
  "database")
    echo "Rolling back database drill..."
    # Stop any restore operations
    aws rds stop-db-cluster --db-cluster-identifier flamoral-drill-restored 2>/dev/null
    # Cleanup drill resources
    aws rds delete-db-cluster --db-cluster-identifier flamoral-drill-restored \
      --skip-final-snapshot 2>/dev/null
    ;;

  "partial-failover")
    echo "Rolling back partial failover..."
    # Restore traffic to primary
    aws elbv2 modify-listener-rule \
      --listener-rule-arn ${PRIMARY_RULE_ARN} \
      --actions Type=forward,TargetGroupArn=${PRIMARY_TG_ARN}
    # Disable DR endpoints
    kubectl --context=flamoral-dr scale deployment --all --replicas=0 -n flamoral-dating
    ;;

  "full-dr")
    echo "Rolling back full DR simulation..."
    # Execute full failback procedure
    ./failback-to-primary.sh
    ;;
esac

# Notify team
./notify-team.sh "DR DRILL ROLLBACK: ${ROLLBACK_REASON}"

echo "=== ROLLBACK COMPLETE ==="
```

**Pre-Drill Readiness Checklist (Final):**
```
=== DRILL READINESS CHECKLIST ===

Stakeholder Notification:
[ ] All stakeholders notified 24+ hours in advance
[ ] All required participants confirmed
[ ] War room established and accessible
[ ] Communication channels tested

Backup Verification:
[ ] Database backups verified and accessible
[ ] PITR window validated
[ ] Cross-region replication confirmed
[ ] Velero backups healthy
[ ] Secrets accessible in DR region

Team Availability:
[ ] Drill Lead confirmed
[ ] All required roles have primary + backup
[ ] On-call schedule reviewed
[ ] No conflicting incidents/changes

Rollback Readiness:
[ ] Rollback scripts tested
[ ] Rollback decision criteria documented
[ ] Emergency contacts available
[ ] Executive escalation path confirmed

Infrastructure:
[ ] DR region infrastructure healthy
[ ] Network connectivity verified
[ ] Monitoring and alerting active
[ ] Sufficient capacity available

Sign-off:
[ ] Drill Lead: _________________ Date: _______
[ ] Platform Lead: ______________ Date: _______
```

---

## 3. Monthly Database Restore Drill

### 3.1 Overview

| Attribute | Value |
|-----------|-------|
| **Objective** | Validate database point-in-time recovery capability |
| **Frequency** | Monthly (First Tuesday) |
| **Duration** | 2-4 hours |
| **Environment** | DR/Staging environment |
| **Impact** | None to production |
| **RTO Target** | 4 hours |
| **RPO Target** | 15 minutes |

### 3.2 Prerequisites

```
[ ] Pre-drill checklist completed (Section 2)
[ ] DR environment available
[ ] Database credentials accessible
[ ] Sufficient storage in DR region
[ ] Verification queries prepared
[ ] Baseline metrics captured
```

### 3.3 Step-by-Step RDS Point-in-Time Recovery

#### Step 1: Initialize Drill (15 minutes)

```bash
#!/bin/bash
# File: scripts/monthly-db-drill-step1.sh

DRILL_ID="DB-DRILL-$(date +%Y%m%d-%H%M)"
TARGET_TIME=$(date -u -d "30 minutes ago" '+%Y-%m-%dT%H:%M:%SZ')

echo "=== Monthly Database Restore Drill ==="
echo "Drill ID: ${DRILL_ID}"
echo "Target Recovery Time: ${TARGET_TIME}"
echo "Started: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# Create drill tracking record
cat > /tmp/${DRILL_ID}.json << EOF
{
  "drill_id": "${DRILL_ID}",
  "type": "database_restore",
  "target_time": "${TARGET_TIME}",
  "started_at": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "status": "in_progress",
  "steps": []
}
EOF

# Log start to CloudWatch
aws logs put-log-events \
  --log-group-name /flamoral/dr-drills \
  --log-stream-name ${DRILL_ID} \
  --log-events timestamp=$(date +%s000),message="Drill started"

echo "Drill initialized. Proceeding to Step 2..."
```

#### Step 2: Capture Pre-Restore Baseline (10 minutes)

```bash
#!/bin/bash
# File: scripts/monthly-db-drill-step2.sh

DRILL_ID=$1

echo "=== Step 2: Capturing Pre-Restore Baseline ==="

# Connect to production database (read-only)
PROD_HOST="flamoral-prod-cluster.cluster-ro-xxxx.us-east-1.rds.amazonaws.com"

# Capture record counts
echo "Capturing baseline metrics..."

psql -h ${PROD_HOST} -U flamoral_readonly -d flamoral << 'EOSQL' > /tmp/${DRILL_ID}-baseline.txt
-- Table record counts
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'matches', COUNT(*) FROM matches
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'payments', COUNT(*) FROM payment_transactions
UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions;

-- Latest transaction timestamps
SELECT 'Latest user' as metric, MAX(created_at)::text as value FROM users
UNION ALL SELECT 'Latest message', MAX(created_at)::text FROM messages
UNION ALL SELECT 'Latest payment', MAX(created_at)::text FROM payment_transactions;

-- Active sessions
SELECT 'Active sessions' as metric, COUNT(*)::text as value
FROM user_sessions WHERE expires_at > NOW();
EOSQL

cat /tmp/${DRILL_ID}-baseline.txt

echo "Baseline captured. Proceeding to Step 3..."
```

#### Step 3: Initiate Point-in-Time Restore (30-60 minutes)

```bash
#!/bin/bash
# File: scripts/monthly-db-drill-step3.sh

DRILL_ID=$1
TARGET_TIME=$2
RESTORED_CLUSTER="flamoral-drill-restored-$(date +%Y%m%d)"

echo "=== Step 3: Initiating Point-in-Time Restore ==="
echo "Target Time: ${TARGET_TIME}"
echo "Restored Cluster: ${RESTORED_CLUSTER}"

# Start timer
START_TIME=$(date +%s)

# Initiate restore
echo "Starting RDS restore operation..."
aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier flamoral-prod-cluster \
  --db-cluster-identifier ${RESTORED_CLUSTER} \
  --restore-to-time ${TARGET_TIME} \
  --vpc-security-group-ids sg-0123456789abcdef0 \
  --db-subnet-group-name flamoral-dr-subnet-group \
  --engine aurora-postgresql \
  --engine-version 15.4 \
  --port 5432 \
  --tags Key=Purpose,Value=DR-Drill Key=DrillID,Value=${DRILL_ID}

echo "Restore initiated. Waiting for cluster to become available..."

# Wait for cluster to be available
while true; do
  STATUS=$(aws rds describe-db-clusters \
    --db-cluster-identifier ${RESTORED_CLUSTER} \
    --query 'DBClusters[0].Status' \
    --output text 2>/dev/null)

  echo "$(date '+%H:%M:%S') - Cluster status: ${STATUS:-pending}"

  if [ "${STATUS}" == "available" ]; then
    break
  fi

  sleep 30
done

# Create DB instance
echo "Creating database instance..."
aws rds create-db-instance \
  --db-instance-identifier ${RESTORED_CLUSTER}-instance \
  --db-cluster-identifier ${RESTORED_CLUSTER} \
  --db-instance-class db.r6g.large \
  --engine aurora-postgresql

# Wait for instance
while true; do
  STATUS=$(aws rds describe-db-instances \
    --db-instance-identifier ${RESTORED_CLUSTER}-instance \
    --query 'DBInstances[0].DBInstanceStatus' \
    --output text 2>/dev/null)

  echo "$(date '+%H:%M:%S') - Instance status: ${STATUS:-pending}"

  if [ "${STATUS}" == "available" ]; then
    break
  fi

  sleep 30
done

END_TIME=$(date +%s)
RESTORE_DURATION=$((END_TIME - START_TIME))

echo "=== Restore Complete ==="
echo "Duration: ${RESTORE_DURATION} seconds ($((RESTORE_DURATION / 60)) minutes)"

# Get endpoint
ENDPOINT=$(aws rds describe-db-clusters \
  --db-cluster-identifier ${RESTORED_CLUSTER} \
  --query 'DBClusters[0].Endpoint' \
  --output text)

echo "Restored Endpoint: ${ENDPOINT}"

# Record metrics
echo "${RESTORE_DURATION}" > /tmp/${DRILL_ID}-restore-duration.txt
echo "${ENDPOINT}" > /tmp/${DRILL_ID}-endpoint.txt
```

#### Step 4: Run Verification Queries (30 minutes)

```bash
#!/bin/bash
# File: scripts/monthly-db-drill-step4.sh

DRILL_ID=$1
RESTORED_ENDPOINT=$(cat /tmp/${DRILL_ID}-endpoint.txt)

echo "=== Step 4: Running Verification Queries ==="
echo "Endpoint: ${RESTORED_ENDPOINT}"

# Create verification report
REPORT_FILE="/tmp/${DRILL_ID}-verification.txt"

psql -h ${RESTORED_ENDPOINT} -U flamoral_admin -d flamoral << 'EOSQL' > ${REPORT_FILE}
-- ============================================
-- DATABASE RESTORE VERIFICATION QUERIES
-- ============================================

\echo '=== 1. Schema Integrity Check ==='
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

\echo '=== 2. Record Count Verification ==='
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL SELECT 'matches', COUNT(*) FROM matches
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'payment_transactions', COUNT(*) FROM payment_transactions
UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL SELECT 'media_files', COUNT(*) FROM media_files
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
ORDER BY table_name;

\echo '=== 3. Index Integrity Check ==='
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

\echo '=== 4. Foreign Key Constraint Check ==='
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

\echo '=== 5. Data Timestamp Verification ==='
SELECT 'users' as table_name, MAX(created_at) as latest_record FROM users
UNION ALL SELECT 'messages', MAX(created_at) FROM messages
UNION ALL SELECT 'matches', MAX(created_at) FROM matches
UNION ALL SELECT 'payment_transactions', MAX(created_at) FROM payment_transactions;

\echo '=== 6. Sequence Verification ==='
SELECT
    sequencename,
    last_value,
    start_value,
    increment_by
FROM pg_sequences
WHERE schemaname = 'public';

\echo '=== 7. Trigger Verification ==='
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';

\echo '=== 8. Sample Data Verification ==='
-- Verify user data integrity
SELECT
    id,
    email,
    created_at,
    updated_at,
    CASE WHEN password_hash IS NOT NULL THEN 'SET' ELSE 'NULL' END as password_status
FROM users
ORDER BY created_at DESC
LIMIT 5;

-- Verify message data
SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    m.created_at,
    LENGTH(m.content) as content_length
FROM messages m
ORDER BY m.created_at DESC
LIMIT 5;

\echo '=== 9. Database Size ==='
SELECT
    pg_size_pretty(pg_database_size('flamoral')) as database_size;

\echo '=== Verification Complete ==='
EOSQL

echo "Verification queries complete. Report saved to: ${REPORT_FILE}"
cat ${REPORT_FILE}
```

#### Step 5: Compare with Baseline (15 minutes)

```bash
#!/bin/bash
# File: scripts/monthly-db-drill-step5.sh

DRILL_ID=$1

echo "=== Step 5: Comparing with Baseline ==="

BASELINE_FILE="/tmp/${DRILL_ID}-baseline.txt"
VERIFICATION_FILE="/tmp/${DRILL_ID}-verification.txt"

# Parse and compare counts
echo "Comparing record counts..."

# Expected variance is based on target recovery time
# Records created after target time should not exist in restored DB

echo "
+------------------+---------------+---------------+----------+
| Table            | Baseline      | Restored      | Status   |
+------------------+---------------+---------------+----------+"

# This would be enhanced with actual parsing logic
# For drill purposes, manual verification is acceptable

echo "
Verification Notes:
- Minor count differences expected due to PITR target time
- Differences should align with ~30 minute data gap
- Any major discrepancies require investigation
"

# Generate comparison report
cat > /tmp/${DRILL_ID}-comparison.json << EOF
{
  "drill_id": "${DRILL_ID}",
  "baseline_captured_at": "$(cat /tmp/${DRILL_ID}.json | jq -r '.started_at')",
  "verification_completed_at": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "comparison_status": "MANUAL_REVIEW_REQUIRED",
  "notes": "Review baseline.txt and verification.txt for detailed comparison"
}
EOF
```

#### Step 6: Document Results and Cleanup (20 minutes)

```bash
#!/bin/bash
# File: scripts/monthly-db-drill-step6.sh

DRILL_ID=$1
RESTORED_CLUSTER="flamoral-drill-restored-$(date +%Y%m%d)"

echo "=== Step 6: Documenting Results and Cleanup ==="

# Calculate metrics
RESTORE_DURATION=$(cat /tmp/${DRILL_ID}-restore-duration.txt)
TARGET_RTO=14400  # 4 hours in seconds
TARGET_RPO=900    # 15 minutes in seconds

RTO_STATUS="PASS"
if [ ${RESTORE_DURATION} -gt ${TARGET_RTO} ]; then
  RTO_STATUS="FAIL"
fi

# Generate final report
REPORT_DATE=$(date +%Y-%m-%d)
REPORT_FILE="reports/dr-drills/monthly-db-drill-${REPORT_DATE}.md"

mkdir -p reports/dr-drills

cat > ${REPORT_FILE} << EOF
# Monthly Database Restore Drill Report

**Drill ID:** ${DRILL_ID}
**Date:** ${REPORT_DATE}
**Type:** Monthly Database Restore

## Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| RTO | 4 hours | $((RESTORE_DURATION / 60)) minutes | ${RTO_STATUS} |
| RPO | 15 minutes | 30 minutes (target) | PASS |

## Execution Timeline

- Drill Start: $(cat /tmp/${DRILL_ID}.json | jq -r '.started_at')
- Restore Complete: $(date -u '+%Y-%m-%dT%H:%M:%SZ')
- Total Duration: $((RESTORE_DURATION / 60)) minutes

## Verification Results

$(cat /tmp/${DRILL_ID}-verification.txt)

## Issues Encountered

- [ ] None / List issues here

## Action Items

- [ ] Review any discrepancies
- [ ] Update runbook if needed
- [ ] Schedule follow-up if required

## Sign-off

- Drill Lead: _________________ Date: _______
- DBA: _______________________ Date: _______
EOF

echo "Report generated: ${REPORT_FILE}"

# Cleanup restored cluster
echo "Cleaning up drill resources..."
read -p "Proceed with cleanup? (y/n): " CONFIRM

if [ "${CONFIRM}" == "y" ]; then
  aws rds delete-db-instance \
    --db-instance-identifier ${RESTORED_CLUSTER}-instance \
    --skip-final-snapshot

  # Wait for instance deletion
  echo "Waiting for instance deletion..."
  aws rds wait db-instance-deleted \
    --db-instance-identifier ${RESTORED_CLUSTER}-instance

  aws rds delete-db-cluster \
    --db-cluster-identifier ${RESTORED_CLUSTER} \
    --skip-final-snapshot

  echo "Cleanup complete."
fi

echo "=== Monthly Database Drill Complete ==="
```

### 3.4 Expected Duration

| Phase | Expected Duration | Maximum Duration |
|-------|-------------------|------------------|
| Initialization | 15 minutes | 20 minutes |
| Baseline Capture | 10 minutes | 15 minutes |
| PITR Restore | 45-60 minutes | 90 minutes |
| Verification | 30 minutes | 45 minutes |
| Comparison | 15 minutes | 20 minutes |
| Documentation & Cleanup | 20 minutes | 30 minutes |
| **Total** | **2-2.5 hours** | **4 hours** |

### 3.5 Success Criteria

```
=== DATABASE RESTORE DRILL SUCCESS CRITERIA ===

REQUIRED (All must pass):
[ ] Database cluster restored successfully
[ ] All tables present in restored database
[ ] Record counts within expected variance (based on PITR target)
[ ] Foreign key constraints intact
[ ] Indexes present and valid
[ ] Sequences restored correctly
[ ] RTO achieved (restore < 4 hours)

RECOMMENDED:
[ ] No errors in restore process
[ ] Data timestamps align with recovery target
[ ] Sample queries return valid data
[ ] No orphaned records detected

DRILL STATUS: [ ] PASS  [ ] FAIL  [ ] PARTIAL
```

### 3.6 Rollback Procedure

```bash
#!/bin/bash
# Monthly drill rollback - minimal impact, just cleanup

RESTORED_CLUSTER=$1

echo "=== Monthly Drill Rollback ==="

# Delete restored resources
aws rds delete-db-instance \
  --db-instance-identifier ${RESTORED_CLUSTER}-instance \
  --skip-final-snapshot 2>/dev/null

aws rds delete-db-cluster \
  --db-cluster-identifier ${RESTORED_CLUSTER} \
  --skip-final-snapshot 2>/dev/null

# Clean up temp files
rm -f /tmp/DB-DRILL-*.txt
rm -f /tmp/DB-DRILL-*.json

echo "Rollback complete. No production impact."
```

---

## 4. Quarterly Partial Failover Drill

### 4.1 Overview

| Attribute | Value |
|-----------|-------|
| **Objective** | Validate traffic routing to secondary region |
| **Frequency** | Quarterly (First week of Q2, Q3, Q4, Q1) |
| **Duration** | 4-6 hours |
| **Environment** | Production (limited traffic) |
| **Impact** | 10% of traffic routed to DR region |
| **RTO Target** | 30 minutes for traffic shift |
| **RPO Target** | 0 (real-time replication) |

### 4.2 Prerequisites

```
[ ] Pre-drill checklist completed (Section 2)
[ ] DR region services scaled and healthy
[ ] Database read replica in DR region synchronized
[ ] CDN and load balancer configurations verified
[ ] Monitoring dashboards prepared
[ ] Rollback tested in last 30 days
[ ] Customer support briefed
```

### 4.3 Step-by-Step Partial Failover

#### Step 1: Initialize and Verify DR Region (30 minutes)

```bash
#!/bin/bash
# File: scripts/quarterly-failover-step1.sh

DRILL_ID="PF-DRILL-$(date +%Y%m%d-%H%M)"

echo "=== Quarterly Partial Failover Drill ==="
echo "Drill ID: ${DRILL_ID}"
echo "Started: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# Verify DR region health
echo -e "\n[1/4] Verifying DR region infrastructure..."

# Check DR Kubernetes cluster
kubectl --context=flamoral-dr-us-west-2 get nodes
kubectl --context=flamoral-dr-us-west-2 get pods -n flamoral-dating

# Check database replica
echo -e "\n[2/4] Checking database replication status..."
aws rds describe-db-clusters \
  --db-cluster-identifier flamoral-dr-cluster \
  --query 'DBClusters[0].{Status:Status,ReplicationSourceIdentifier:ReplicationSourceIdentifier}'

# Check replication lag
psql -h flamoral-dr-cluster.cluster-ro-xxxx.us-west-2.rds.amazonaws.com \
  -U flamoral_readonly -d flamoral \
  -c "SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) AS replication_lag_seconds;"

# Check Redis replica
echo -e "\n[3/4] Checking Redis replication..."
aws elasticache describe-replication-groups \
  --replication-group-id flamoral-dr-redis \
  --query 'ReplicationGroups[0].{Status:Status,NodeGroups:NodeGroups}'

# Check service health
echo -e "\n[4/4] Checking DR service health endpoints..."
for service in api-gateway auth-service matching-service messaging-service; do
  HEALTH=$(curl -s -o /dev/null -w "%{http_code}" \
    https://dr.flamoral.internal/${service}/health)
  echo "${service}: HTTP ${HEALTH}"
done

echo -e "\n=== DR Region Verification Complete ==="
```

#### Step 2: Scale DR Services (15 minutes)

```bash
#!/bin/bash
# File: scripts/quarterly-failover-step2.sh

DRILL_ID=$1

echo "=== Step 2: Scaling DR Services ==="

# Scale services to handle 10% traffic
kubectl --context=flamoral-dr-us-west-2 -n flamoral-dating \
  scale deployment api-gateway --replicas=2

kubectl --context=flamoral-dr-us-west-2 -n flamoral-dating \
  scale deployment auth-service --replicas=2

kubectl --context=flamoral-dr-us-west-2 -n flamoral-dating \
  scale deployment matching-service --replicas=2

kubectl --context=flamoral-dr-us-west-2 -n flamoral-dating \
  scale deployment messaging-service --replicas=2

kubectl --context=flamoral-dr-us-west-2 -n flamoral-dating \
  scale deployment notification-service --replicas=2

# Wait for pods to be ready
echo "Waiting for pods to be ready..."
kubectl --context=flamoral-dr-us-west-2 -n flamoral-dating \
  wait --for=condition=ready pod -l app.kubernetes.io/part-of=flamoral --timeout=300s

# Verify scaling
kubectl --context=flamoral-dr-us-west-2 -n flamoral-dating get pods

echo "=== DR Services Scaled ==="
```

#### Step 3: Traffic Shift to Secondary Region - 10% (30 minutes)

```bash
#!/bin/bash
# File: scripts/quarterly-failover-step3.sh

DRILL_ID=$1

echo "=== Step 3: Initiating Traffic Shift (10%) ==="

# Record baseline metrics before shift
echo "Capturing baseline metrics..."
BASELINE_TIME=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

# Primary region metrics
PRIMARY_RPS=$(curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(http_requests_total{region='us-east-1'}[5m]))" | jq '.data.result[0].value[1]')
echo "Primary Region RPS: ${PRIMARY_RPS}"

# Modify Route53 weighted routing policy
echo "Updating Route53 weighted records..."

# Update DR region weight from 0 to 10
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "api.flamoral.com",
          "Type": "A",
          "SetIdentifier": "primary-us-east-1",
          "Weight": 90,
          "AliasTarget": {
            "HostedZoneId": "Z35SXDOTRQ7X7K",
            "DNSName": "flamoral-prod-alb-us-east-1.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      },
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "api.flamoral.com",
          "Type": "A",
          "SetIdentifier": "dr-us-west-2",
          "Weight": 10,
          "AliasTarget": {
            "HostedZoneId": "Z1H1FL5HABSF5",
            "DNSName": "flamoral-dr-alb-us-west-2.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      }
    ]
  }'

echo "Traffic shift initiated. Waiting for DNS propagation (60 seconds)..."
sleep 60

# Verify traffic is reaching DR region
echo "Verifying traffic distribution..."
for i in {1..10}; do
  REGION=$(curl -s https://api.flamoral.com/health | jq -r '.region')
  echo "Request ${i}: ${REGION}"
  sleep 2
done

echo "=== Traffic Shift Complete ==="
```

#### Step 4: Service Health Verification (30 minutes)

```bash
#!/bin/bash
# File: scripts/quarterly-failover-step4.sh

DRILL_ID=$1
DURATION_MINUTES=30

echo "=== Step 4: Service Health Verification ==="
echo "Monitoring for ${DURATION_MINUTES} minutes..."

START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION_MINUTES * 60))

while [ $(date +%s) -lt ${END_TIME} ]; do
  echo -e "\n--- $(date '+%H:%M:%S') Health Check ---"

  # Check primary region
  echo "Primary Region (us-east-1):"
  PRIMARY_HEALTH=$(curl -s -w "\n%{http_code}" https://api.flamoral.com/health \
    -H "X-Force-Region: us-east-1")
  echo "${PRIMARY_HEALTH}"

  # Check DR region
  echo "DR Region (us-west-2):"
  DR_HEALTH=$(curl -s -w "\n%{http_code}" https://api.flamoral.com/health \
    -H "X-Force-Region: us-west-2")
  echo "${DR_HEALTH}"

  # Check error rates
  echo "Error Rates (last 5 min):"
  curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(http_requests_total{status=~'5..'}[5m]))/sum(rate(http_requests_total[5m]))*100" | \
    jq '.data.result[0].value[1]'

  sleep 60
done

echo "=== Health Verification Complete ==="
```

#### Step 5: Latency Monitoring (Continuous during drill)

```bash
#!/bin/bash
# File: scripts/quarterly-failover-step5.sh

DRILL_ID=$1

echo "=== Step 5: Latency Monitoring Dashboard ==="

# Create Grafana annotations for drill period
curl -X POST http://grafana:3000/api/annotations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${GRAFANA_TOKEN}" \
  -d "{
    \"dashboardId\": 1,
    \"panelId\": 1,
    \"time\": $(date +%s000),
    \"tags\": [\"dr-drill\", \"partial-failover\"],
    \"text\": \"Partial Failover Drill Started - ${DRILL_ID}\"
  }"

# Monitor key latency metrics
echo "Key Latency Metrics to Monitor:"
echo "================================"
echo "1. API Response Time (p99)"
echo "   - Primary Region Target: < 200ms"
echo "   - DR Region Target: < 300ms (cross-region)"
echo ""
echo "2. Database Query Latency"
echo "   - Read Queries Target: < 50ms"
echo "   - Write Queries Target: < 100ms"
echo ""
echo "3. Cross-Region Data Sync"
echo "   - Replication Lag Target: < 5 seconds"

# Sample latency check
echo -e "\nCurrent Latency Samples:"

# API latency
for region in us-east-1 us-west-2; do
  LATENCY=$(curl -s -o /dev/null -w "%{time_total}" \
    https://api.flamoral.com/health -H "X-Force-Region: ${region}")
  echo "API ${region}: ${LATENCY}s"
done

# Database replication lag
LAG=$(psql -h flamoral-dr-cluster.cluster-ro-xxxx.us-west-2.rds.amazonaws.com \
  -U flamoral_readonly -d flamoral -t \
  -c "SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp()))::int;")
echo "DB Replication Lag: ${LAG}s"

echo -e "\nMonitor Grafana Dashboard: https://grafana.flamoral.internal/d/dr-drill"
```

#### Step 6: Data Consistency Checks (30 minutes)

```bash
#!/bin/bash
# File: scripts/quarterly-failover-step6.sh

DRILL_ID=$1

echo "=== Step 6: Data Consistency Checks ==="

PRIMARY_HOST="flamoral-prod-cluster.cluster-xxxx.us-east-1.rds.amazonaws.com"
DR_HOST="flamoral-dr-cluster.cluster-ro-xxxx.us-west-2.rds.amazonaws.com"

# Check 1: Record count consistency
echo "[1/5] Checking record counts..."

PRIMARY_USERS=$(psql -h ${PRIMARY_HOST} -U flamoral_readonly -d flamoral -t \
  -c "SELECT COUNT(*) FROM users;")
DR_USERS=$(psql -h ${DR_HOST} -U flamoral_readonly -d flamoral -t \
  -c "SELECT COUNT(*) FROM users;")

echo "Users - Primary: ${PRIMARY_USERS}, DR: ${DR_USERS}"

# Check 2: Recent record consistency
echo -e "\n[2/5] Checking recent records..."

PRIMARY_RECENT=$(psql -h ${PRIMARY_HOST} -U flamoral_readonly -d flamoral -t \
  -c "SELECT MAX(created_at) FROM users;")
DR_RECENT=$(psql -h ${DR_HOST} -U flamoral_readonly -d flamoral -t \
  -c "SELECT MAX(created_at) FROM users;")

echo "Latest User - Primary: ${PRIMARY_RECENT}, DR: ${DR_RECENT}"

# Check 3: Message consistency
echo -e "\n[3/5] Checking message replication..."

# Get a recent message from primary
MSG_ID=$(psql -h ${PRIMARY_HOST} -U flamoral_readonly -d flamoral -t \
  -c "SELECT id FROM messages ORDER BY created_at DESC LIMIT 1;")

# Check if it exists in DR
DR_MSG=$(psql -h ${DR_HOST} -U flamoral_readonly -d flamoral -t \
  -c "SELECT id FROM messages WHERE id = '${MSG_ID}';")

if [ -n "${DR_MSG}" ]; then
  echo "Message ${MSG_ID}: Replicated successfully"
else
  echo "WARNING: Message ${MSG_ID} not yet replicated to DR"
fi

# Check 4: Session consistency (Redis)
echo -e "\n[4/5] Checking Redis session consistency..."

PRIMARY_SESSIONS=$(redis-cli -h flamoral-prod-redis.cache.amazonaws.com \
  DBSIZE | awk '{print $2}')
DR_SESSIONS=$(redis-cli -h flamoral-dr-redis.cache.amazonaws.com \
  DBSIZE | awk '{print $2}')

echo "Sessions - Primary: ${PRIMARY_SESSIONS}, DR: ${DR_SESSIONS}"

# Check 5: Write verification (test write from DR)
echo -e "\n[5/5] Testing write operations from DR region..."

# This should be a non-destructive test record
TEST_RESULT=$(curl -s -X POST https://api.flamoral.com/internal/health-check-write \
  -H "X-Force-Region: us-west-2" \
  -H "X-Internal-Auth: ${INTERNAL_TOKEN}" \
  -d '{"test": true}')

echo "Write test result: ${TEST_RESULT}"

echo -e "\n=== Data Consistency Checks Complete ==="
```

#### Step 7: Rollback to Primary (30 minutes)

```bash
#!/bin/bash
# File: scripts/quarterly-failover-step7.sh

DRILL_ID=$1

echo "=== Step 7: Rollback to Primary ==="

# Restore Route53 weighted routing
echo "Restoring traffic to primary region..."

aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "api.flamoral.com",
          "Type": "A",
          "SetIdentifier": "primary-us-east-1",
          "Weight": 100,
          "AliasTarget": {
            "HostedZoneId": "Z35SXDOTRQ7X7K",
            "DNSName": "flamoral-prod-alb-us-east-1.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      },
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "api.flamoral.com",
          "Type": "A",
          "SetIdentifier": "dr-us-west-2",
          "Weight": 0,
          "AliasTarget": {
            "HostedZoneId": "Z1H1FL5HABSF5",
            "DNSName": "flamoral-dr-alb-us-west-2.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      }
    ]
  }'

echo "Waiting for DNS propagation (60 seconds)..."
sleep 60

# Verify all traffic back to primary
echo "Verifying traffic routing..."
for i in {1..10}; do
  REGION=$(curl -s https://api.flamoral.com/health | jq -r '.region')
  echo "Request ${i}: ${REGION}"
  sleep 2
done

# Scale down DR services
echo "Scaling down DR services..."
kubectl --context=flamoral-dr-us-west-2 -n flamoral-dating \
  scale deployment --all --replicas=1

# Verify primary region health
echo "Verifying primary region health..."
curl -s https://api.flamoral.com/health | jq

# Close Grafana annotation
curl -X POST http://grafana:3000/api/annotations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${GRAFANA_TOKEN}" \
  -d "{
    \"dashboardId\": 1,
    \"panelId\": 1,
    \"time\": $(date +%s000),
    \"tags\": [\"dr-drill\", \"partial-failover\"],
    \"text\": \"Partial Failover Drill Completed - ${DRILL_ID}\"
  }"

echo "=== Rollback Complete ==="
```

### 4.4 Expected Duration

| Phase | Expected Duration | Maximum Duration |
|-------|-------------------|------------------|
| Initialize & Verify DR | 30 minutes | 45 minutes |
| Scale DR Services | 15 minutes | 30 minutes |
| Traffic Shift (10%) | 30 minutes | 45 minutes |
| Health Verification | 30 minutes | 60 minutes |
| Latency Monitoring | Continuous | Continuous |
| Data Consistency | 30 minutes | 45 minutes |
| Rollback to Primary | 30 minutes | 45 minutes |
| Documentation | 30 minutes | 45 minutes |
| **Total** | **3.5-4 hours** | **6 hours** |

### 4.5 Success Criteria

```
=== PARTIAL FAILOVER DRILL SUCCESS CRITERIA ===

REQUIRED (All must pass):
[ ] DR region services healthy before traffic shift
[ ] Traffic successfully routed to DR region (10%)
[ ] No customer-facing errors during drill
[ ] API response times within acceptable range
[ ] Database replication lag < 5 seconds
[ ] All data consistency checks pass
[ ] Successful rollback to primary
[ ] No data loss or corruption

RECOMMENDED:
[ ] DR region latency within 50% of primary
[ ] Zero alerts triggered during drill
[ ] Rollback completed within 15 minutes
[ ] All services remain healthy throughout

DRILL STATUS: [ ] PASS  [ ] FAIL  [ ] PARTIAL
```

---

## 5. Annual Full DR Simulation

### 5.1 Overview

| Attribute | Value |
|-----------|-------|
| **Objective** | Complete region failover with RTO/RPO validation |
| **Frequency** | Annual (Scheduled maintenance window) |
| **Duration** | 8-12 hours |
| **Environment** | Production |
| **Impact** | Planned maintenance window |
| **RTO Target** | 4 hours |
| **RPO Target** | 15 minutes |

### 5.2 Prerequisites

```
[ ] Pre-drill checklist completed (Section 2)
[ ] Executive approval obtained
[ ] Maintenance window announced (2 weeks advance)
[ ] Status page maintenance notice posted
[ ] Customer communication sent
[ ] Full DR infrastructure deployed and tested
[ ] All runbooks reviewed in last 30 days
[ ] Rollback procedure tested in last 90 days
[ ] Support team staffed and briefed
[ ] External stakeholders notified (payment providers, partners)
```

### 5.3 Step-by-Step Complete Region Failover

#### Phase 1: Pre-Failover Preparation (T-2 hours)

```bash
#!/bin/bash
# File: scripts/annual-dr-phase1.sh

DRILL_ID="FULL-DR-$(date +%Y%m%d)"

echo "=== Annual Full DR Simulation - Phase 1 ==="
echo "Drill ID: ${DRILL_ID}"
echo "Phase: Pre-Failover Preparation"
echo "Started: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# T-2h: Final preparations
echo -e "\n[T-2h] Final Preparations"

# 1. Verify all team members are available
echo "1. Team availability check..."
./scripts/verify-team-availability.sh --drill=${DRILL_ID}

# 2. Capture baseline metrics
echo "2. Capturing baseline metrics..."
./scripts/capture-baseline-metrics.sh --output=/tmp/${DRILL_ID}-baseline.json

# 3. Verify DR infrastructure
echo "3. Verifying DR infrastructure..."
./scripts/verify-dr-infrastructure.sh --full

# 4. Post status page update
echo "4. Updating status page..."
curl -X POST https://api.statuspage.io/v1/pages/${PAGE_ID}/incidents \
  -H "Authorization: OAuth ${STATUSPAGE_TOKEN}" \
  -d '{
    "incident": {
      "name": "Scheduled Maintenance: Disaster Recovery Drill",
      "status": "scheduled",
      "impact_override": "maintenance",
      "scheduled_for": "'$(date -u -d "+2 hours" '+%Y-%m-%dT%H:%M:%SZ')'",
      "scheduled_until": "'$(date -u -d "+14 hours" '+%Y-%m-%dT%H:%M:%SZ')'",
      "body": "We are conducting our annual disaster recovery drill. Some users may experience brief service interruptions."
    }
  }'

# 5. Enable enhanced monitoring
echo "5. Enabling enhanced monitoring..."
kubectl apply -f k8s/monitoring/dr-drill-enhanced-monitoring.yaml

echo -e "\n=== Phase 1 Complete ==="
```

#### Phase 2: Initiate Failover (T-0)

```bash
#!/bin/bash
# File: scripts/annual-dr-phase2.sh

DRILL_ID=$1
FAILOVER_START=$(date +%s)

echo "=== Annual Full DR Simulation - Phase 2 ==="
echo "Phase: Complete Region Failover"
echo "Failover Start: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# Record start time for RTO calculation
echo ${FAILOVER_START} > /tmp/${DRILL_ID}-failover-start.txt

# Step 1: Update status page to in_progress
echo "[Step 1] Updating status page..."
curl -X PATCH "https://api.statuspage.io/v1/pages/${PAGE_ID}/incidents/${INCIDENT_ID}" \
  -H "Authorization: OAuth ${STATUSPAGE_TOKEN}" \
  -d '{"incident": {"status": "in_progress"}}'

# Step 2: Stop new connections to primary
echo "[Step 2] Draining connections from primary..."

# Put primary ALB in drain mode
aws elbv2 modify-target-group-attributes \
  --target-group-arn ${PRIMARY_TG_ARN} \
  --attributes Key=deregistration_delay.timeout_seconds,Value=60

# Step 3: Promote DR database to primary
echo "[Step 3] Promoting DR database..."

# Promote read replica to standalone
aws rds promote-read-replica-db-cluster \
  --db-cluster-identifier flamoral-dr-cluster

# Wait for promotion
echo "Waiting for database promotion..."
aws rds wait db-cluster-available \
  --db-cluster-identifier flamoral-dr-cluster

# Step 4: Update application configurations
echo "[Step 4] Updating application configurations..."

# Update secrets to point to DR database
aws secretsmanager update-secret \
  --secret-id flamoral/prod/database \
  --secret-string "{
    \"host\": \"flamoral-dr-cluster.cluster-xxxx.us-west-2.rds.amazonaws.com\",
    \"port\": 5432,
    \"database\": \"flamoral\",
    \"username\": \"flamoral_app\",
    \"region\": \"us-west-2\"
  }"

# Step 5: Restart DR services to pick up new configuration
echo "[Step 5] Restarting DR services..."
kubectl --context=flamoral-dr-us-west-2 -n flamoral-dating \
  rollout restart deployment --all

# Wait for rollout
kubectl --context=flamoral-dr-us-west-2 -n flamoral-dating \
  rollout status deployment --all --timeout=600s

# Step 6: Update DNS to DR region
echo "[Step 6] Updating DNS routing..."

aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://dns-failover-full.json

# Step 7: Update CDN origin
echo "[Step 7] Updating CDN configuration..."

aws cloudfront update-distribution \
  --id E1234567890ABC \
  --distribution-config file://cloudfront-dr-config.json

FAILOVER_END=$(date +%s)
FAILOVER_DURATION=$((FAILOVER_END - FAILOVER_START))

echo "=== Phase 2 Complete ==="
echo "Failover Duration: ${FAILOVER_DURATION} seconds ($((FAILOVER_DURATION / 60)) minutes)"
echo ${FAILOVER_DURATION} > /tmp/${DRILL_ID}-failover-duration.txt
```

#### Phase 3: All Services Verification (30-60 minutes)

```bash
#!/bin/bash
# File: scripts/annual-dr-phase3.sh

DRILL_ID=$1

echo "=== Annual Full DR Simulation - Phase 3 ==="
echo "Phase: All Services Verification"

# Comprehensive service verification
VERIFICATION_RESULTS=()

echo "[1/10] API Gateway verification..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.flamoral.com/health)
VERIFICATION_RESULTS+=("API Gateway: ${API_STATUS}")

echo "[2/10] Auth Service verification..."
AUTH_STATUS=$(curl -s -X POST https://api.flamoral.com/auth/health \
  -H "Content-Type: application/json")
VERIFICATION_RESULTS+=("Auth Service: $(echo ${AUTH_STATUS} | jq -r '.status')")

echo "[3/10] Matching Service verification..."
MATCH_STATUS=$(curl -s https://api.flamoral.com/matching/health)
VERIFICATION_RESULTS+=("Matching Service: $(echo ${MATCH_STATUS} | jq -r '.status')")

echo "[4/10] Messaging Service verification..."
MSG_STATUS=$(curl -s https://api.flamoral.com/messaging/health)
VERIFICATION_RESULTS+=("Messaging Service: $(echo ${MSG_STATUS} | jq -r '.status')")

echo "[5/10] Payment Service verification..."
PAY_STATUS=$(curl -s https://api.flamoral.com/payments/health)
VERIFICATION_RESULTS+=("Payment Service: $(echo ${PAY_STATUS} | jq -r '.status')")

echo "[6/10] Notification Service verification..."
NOTIF_STATUS=$(curl -s https://api.flamoral.com/notifications/health)
VERIFICATION_RESULTS+=("Notification Service: $(echo ${NOTIF_STATUS} | jq -r '.status')")

echo "[7/10] Media Service verification..."
MEDIA_STATUS=$(curl -s https://api.flamoral.com/media/health)
VERIFICATION_RESULTS+=("Media Service: $(echo ${MEDIA_STATUS} | jq -r '.status')")

echo "[8/10] Database connectivity..."
DB_STATUS=$(psql -h flamoral-dr-cluster.cluster-xxxx.us-west-2.rds.amazonaws.com \
  -U flamoral_readonly -d flamoral -c "SELECT 1;" 2>&1)
if [[ ${DB_STATUS} == *"1"* ]]; then
  VERIFICATION_RESULTS+=("Database: healthy")
else
  VERIFICATION_RESULTS+=("Database: FAILED")
fi

echo "[9/10] Redis connectivity..."
REDIS_STATUS=$(redis-cli -h flamoral-dr-redis.cache.amazonaws.com PING)
VERIFICATION_RESULTS+=("Redis: ${REDIS_STATUS}")

echo "[10/10] WebSocket connectivity..."
WS_STATUS=$(websocat -1 wss://ws.flamoral.com/health 2>&1 | head -1)
VERIFICATION_RESULTS+=("WebSocket: ${WS_STATUS}")

# Print summary
echo -e "\n=== Verification Summary ==="
for result in "${VERIFICATION_RESULTS[@]}"; do
  echo "  ${result}"
done

# Run smoke tests
echo -e "\n[Running Smoke Tests]"
./scripts/smoke-tests.sh --environment=dr --output=/tmp/${DRILL_ID}-smoke-tests.json

# Functional tests
echo -e "\n[Running Functional Tests]"
./scripts/functional-tests.sh --critical-path --output=/tmp/${DRILL_ID}-functional-tests.json

echo "=== Phase 3 Complete ==="
```

#### Phase 4: Customer Communication

**Pre-Drill Communication Template (T-2 weeks):**

```markdown
Subject: Scheduled Maintenance: Annual Disaster Recovery Drill - [DATE]

Dear Valued User,

We are committed to ensuring the highest levels of reliability and data
protection for our platform. As part of this commitment, we will be
conducting our annual disaster recovery drill.

**Scheduled Date:** [DATE]
**Time:** [START_TIME] - [END_TIME] UTC
**Expected Duration:** 8-12 hours

**What to expect:**
- You may experience brief service interruptions (< 5 minutes)
- Some features may be temporarily unavailable
- All your data remains safe and protected

**What you need to do:**
- No action required from your side
- Save any in-progress conversations before the maintenance window
- Contact support if you experience issues after the maintenance window

We apologize for any inconvenience and thank you for your understanding.

Best regards,
The Flamoral Team

---
For updates, visit: https://status.flamoral.com
```

**During-Drill Communication Template:**

```markdown
Subject: Maintenance In Progress: Disaster Recovery Drill

Status Update - [TIMESTAMP]

Current Status: [IN_PROGRESS / VERIFYING / COMPLETING]

Progress:
- [x] Failover initiated
- [x] Services migrated to backup region
- [ ] Verification in progress
- [ ] Returning to normal operations

Estimated completion: [TIME] UTC

Monitor live status: https://status.flamoral.com
```

**Post-Drill Communication Template:**

```markdown
Subject: Maintenance Complete: Disaster Recovery Drill Successful

Dear Valued User,

Our scheduled disaster recovery drill has been completed successfully.

**Summary:**
- Start Time: [START_TIME] UTC
- End Time: [END_TIME] UTC
- Total Duration: [DURATION]
- Impact: Minimal service interruption

All services are now operating normally. If you experience any issues,
please contact our support team.

Thank you for your patience and understanding.

Best regards,
The Flamoral Team
```

#### Phase 5: Duration Targets (RTO Validation)

```bash
#!/bin/bash
# File: scripts/annual-dr-phase5.sh

DRILL_ID=$1

echo "=== Annual Full DR Simulation - Phase 5 ==="
echo "Phase: RTO/RPO Validation"

# Load timing data
FAILOVER_START=$(cat /tmp/${DRILL_ID}-failover-start.txt)
FAILOVER_DURATION=$(cat /tmp/${DRILL_ID}-failover-duration.txt)
VERIFICATION_COMPLETE=$(date +%s)

# Calculate RTO
TOTAL_RTO=$((VERIFICATION_COMPLETE - FAILOVER_START))
RTO_MINUTES=$((TOTAL_RTO / 60))
RTO_TARGET=240  # 4 hours in minutes

echo "=== RTO Analysis ==="
echo "Failover Duration: ${FAILOVER_DURATION} seconds ($((FAILOVER_DURATION / 60)) minutes)"
echo "Verification Duration: $((VERIFICATION_COMPLETE - FAILOVER_START - FAILOVER_DURATION)) seconds"
echo "Total RTO: ${RTO_MINUTES} minutes"
echo "RTO Target: ${RTO_TARGET} minutes"

if [ ${RTO_MINUTES} -le ${RTO_TARGET} ]; then
  echo "RTO Status: PASS"
else
  echo "RTO Status: FAIL - Exceeded target by $((RTO_MINUTES - RTO_TARGET)) minutes"
fi

# RPO Validation
echo -e "\n=== RPO Analysis ==="

# Check last transaction before failover
LAST_PRIMARY_TX=$(cat /tmp/${DRILL_ID}-baseline.json | \
  jq -r '.last_transaction_timestamp')

# Check first transaction in DR
FIRST_DR_TX=$(psql -h flamoral-dr-cluster.cluster-xxxx.us-west-2.rds.amazonaws.com \
  -U flamoral_readonly -d flamoral -t \
  -c "SELECT MIN(created_at) FROM audit_log WHERE created_at > '${LAST_PRIMARY_TX}';")

# Calculate data gap
if [ -n "${FIRST_DR_TX}" ]; then
  DATA_GAP=$(psql -h flamoral-dr-cluster.cluster-xxxx.us-west-2.rds.amazonaws.com \
    -U flamoral_readonly -d flamoral -t \
    -c "SELECT EXTRACT(EPOCH FROM ('${FIRST_DR_TX}'::timestamp - '${LAST_PRIMARY_TX}'::timestamp));")
  RPO_SECONDS=${DATA_GAP%.*}
  RPO_MINUTES=$((RPO_SECONDS / 60))
else
  RPO_MINUTES=0
fi

RPO_TARGET=15  # 15 minutes

echo "Last Primary Transaction: ${LAST_PRIMARY_TX}"
echo "First DR Transaction: ${FIRST_DR_TX}"
echo "Data Gap (RPO): ${RPO_MINUTES} minutes"
echo "RPO Target: ${RPO_TARGET} minutes"

if [ ${RPO_MINUTES} -le ${RPO_TARGET} ]; then
  echo "RPO Status: PASS"
else
  echo "RPO Status: FAIL - Exceeded target by $((RPO_MINUTES - RPO_TARGET)) minutes"
fi

# Generate RTO/RPO report
cat > /tmp/${DRILL_ID}-rto-rpo-report.json << EOF
{
  "drill_id": "${DRILL_ID}",
  "rto": {
    "actual_minutes": ${RTO_MINUTES},
    "target_minutes": ${RTO_TARGET},
    "status": "$([ ${RTO_MINUTES} -le ${RTO_TARGET} ] && echo 'PASS' || echo 'FAIL')"
  },
  "rpo": {
    "actual_minutes": ${RPO_MINUTES},
    "target_minutes": ${RPO_TARGET},
    "status": "$([ ${RPO_MINUTES} -le ${RPO_TARGET} ] && echo 'PASS' || echo 'FAIL')"
  },
  "breakdown": {
    "failover_duration_seconds": ${FAILOVER_DURATION},
    "verification_duration_seconds": $((VERIFICATION_COMPLETE - FAILOVER_START - FAILOVER_DURATION)),
    "total_duration_seconds": ${TOTAL_RTO}
  }
}
EOF

echo "=== Phase 5 Complete ==="
```

#### Phase 6: Failback to Primary (2-4 hours)

```bash
#!/bin/bash
# File: scripts/annual-dr-phase6.sh

DRILL_ID=$1

echo "=== Annual Full DR Simulation - Phase 6 ==="
echo "Phase: Failback to Primary Region"

# Step 1: Prepare primary region
echo "[Step 1] Preparing primary region..."

# Sync data from DR to Primary
echo "Syncing data changes..."
pg_dump -h flamoral-dr-cluster.cluster-xxxx.us-west-2.rds.amazonaws.com \
  -U flamoral_admin -d flamoral \
  --data-only --table=audit_log \
  --where="created_at > '$(cat /tmp/${DRILL_ID}-baseline.json | jq -r '.last_transaction_timestamp')'" | \
  psql -h flamoral-prod-cluster.cluster-xxxx.us-east-1.rds.amazonaws.com \
  -U flamoral_admin -d flamoral

# Step 2: Restore primary database replication
echo "[Step 2] Restoring database replication..."

# This would typically involve recreating the replica relationship
# For Aurora, this might require creating a new cluster from snapshot

# Step 3: Verify primary services
echo "[Step 3] Verifying primary services..."
kubectl --context=flamoral-prod-us-east-1 get pods -n flamoral-dating

# Step 4: Gradual traffic shift back
echo "[Step 4] Shifting traffic back to primary..."

for weight in 25 50 75 100; do
  echo "Primary weight: ${weight}%, DR weight: $((100 - weight))%"

  aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890ABC \
    --change-batch "{
      \"Changes\": [
        {
          \"Action\": \"UPSERT\",
          \"ResourceRecordSet\": {
            \"Name\": \"api.flamoral.com\",
            \"Type\": \"A\",
            \"SetIdentifier\": \"primary-us-east-1\",
            \"Weight\": ${weight},
            \"AliasTarget\": {
              \"HostedZoneId\": \"Z35SXDOTRQ7X7K\",
              \"DNSName\": \"flamoral-prod-alb-us-east-1.amazonaws.com\",
              \"EvaluateTargetHealth\": true
            }
          }
        },
        {
          \"Action\": \"UPSERT\",
          \"ResourceRecordSet\": {
            \"Name\": \"api.flamoral.com\",
            \"Type\": \"A\",
            \"SetIdentifier\": \"dr-us-west-2\",
            \"Weight\": $((100 - weight)),
            \"AliasTarget\": {
              \"HostedZoneId\": \"Z1H1FL5HABSF5\",
              \"DNSName\": \"flamoral-dr-alb-us-west-2.amazonaws.com\",
              \"EvaluateTargetHealth\": true
            }
          }
        }
      ]
    }"

  # Monitor for 5 minutes at each step
  sleep 300

  # Check error rates
  ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(http_requests_total{status=~'5..'}[5m]))/sum(rate(http_requests_total[5m]))*100" | \
    jq -r '.data.result[0].value[1]')
  echo "Current error rate: ${ERROR_RATE}%"

  if (( $(echo "${ERROR_RATE} > 1" | bc -l) )); then
    echo "ERROR: High error rate detected. Pausing failback."
    break
  fi
done

# Step 5: Update status page
echo "[Step 5] Updating status page..."
curl -X PATCH "https://api.statuspage.io/v1/pages/${PAGE_ID}/incidents/${INCIDENT_ID}" \
  -H "Authorization: OAuth ${STATUSPAGE_TOKEN}" \
  -d '{"incident": {"status": "resolved", "body": "Disaster recovery drill completed successfully. All services operating normally."}}'

echo "=== Phase 6 Complete ==="
```

### 5.4 Success Criteria

```
=== FULL DR SIMULATION SUCCESS CRITERIA ===

REQUIRED (All must pass):
[ ] Complete region failover executed
[ ] All services operational in DR region
[ ] RTO achieved (< 4 hours)
[ ] RPO achieved (< 15 minutes data loss)
[ ] Customer communication delivered
[ ] No critical errors during failover
[ ] Successful failback to primary
[ ] Data integrity verified

VALIDATION METRICS:
[ ] API error rate < 1% during drill
[ ] P99 latency < 500ms during DR operation
[ ] Zero data corruption incidents
[ ] All smoke tests passing
[ ] All functional tests passing

DOCUMENTATION:
[ ] Timeline documented
[ ] All issues logged
[ ] Metrics captured
[ ] Lessons learned recorded

DRILL STATUS: [ ] PASS  [ ] FAIL  [ ] PARTIAL
```

---

## 6. Post-Drill Documentation Template

### 6.1 DR Drill Report Template

```markdown
# Disaster Recovery Drill Report

## Executive Summary

| Field | Value |
|-------|-------|
| **Drill ID** | [DRILL_ID] |
| **Date** | [DATE] |
| **Drill Type** | [Monthly DB / Quarterly Partial / Annual Full] |
| **Overall Status** | [PASS / FAIL / PARTIAL] |
| **Drill Lead** | [NAME] |

## Participants

| Role | Name | Availability |
|------|------|--------------|
| Drill Lead | [NAME] | Present |
| Database Administrator | [NAME] | Present/Remote |
| Platform Engineer | [NAME] | Present/Remote |
| Network Engineer | [NAME] | Present/Remote |
| Security Engineer | [NAME] | Present/Remote |
| Customer Support Lead | [NAME] | Present/Remote |
| Communications Lead | [NAME] | Present/Remote |

## Drill Scope

**Objective:** [Describe the primary objective of this drill]

**Systems Covered:**
- [ ] Database (PostgreSQL Aurora)
- [ ] Cache (Redis ElastiCache)
- [ ] Application Services
- [ ] CDN/Load Balancer
- [ ] DNS
- [ ] Monitoring/Alerting

**Environment:** [Production / DR / Staging]

## Timeline

| Time (UTC) | Event | Duration | Status |
|------------|-------|----------|--------|
| [HH:MM] | Drill initiated | - | Complete |
| [HH:MM] | [Phase/Step description] | [X min] | Complete |
| [HH:MM] | [Phase/Step description] | [X min] | Complete |
| [HH:MM] | Drill completed | - | Complete |

**Total Duration:** [X hours Y minutes]

## RTO/RPO Results

### Recovery Time Objective (RTO)

| Metric | Target | Actual | Status | Notes |
|--------|--------|--------|--------|-------|
| Total Recovery Time | 4 hours | [ACTUAL] | [PASS/FAIL] | [Notes] |
| Database Recovery | 2 hours | [ACTUAL] | [PASS/FAIL] | [Notes] |
| Service Recovery | 30 min | [ACTUAL] | [PASS/FAIL] | [Notes] |
| DNS Propagation | 15 min | [ACTUAL] | [PASS/FAIL] | [Notes] |

### Recovery Point Objective (RPO)

| Data Type | Target | Actual | Status | Notes |
|-----------|--------|--------|--------|-------|
| Transactional Data | 15 min | [ACTUAL] | [PASS/FAIL] | [Notes] |
| User Sessions | 0 min | [ACTUAL] | [PASS/FAIL] | [Notes] |
| Analytics Data | 1 hour | [ACTUAL] | [PASS/FAIL] | [Notes] |

## Issues Encountered

### Issue 1: [Title]

| Field | Details |
|-------|---------|
| **Severity** | [Critical/High/Medium/Low] |
| **Description** | [Detailed description] |
| **Impact** | [Impact on drill] |
| **Resolution** | [How it was resolved] |
| **Root Cause** | [Root cause if identified] |
| **Action Required** | [Yes/No] |

### Issue 2: [Title]
[Repeat format as needed]

## Verification Results

### Database Verification

| Check | Status | Notes |
|-------|--------|-------|
| Schema integrity | [PASS/FAIL] | |
| Record counts match | [PASS/FAIL] | |
| Foreign keys valid | [PASS/FAIL] | |
| Indexes present | [PASS/FAIL] | |
| Sequences correct | [PASS/FAIL] | |

### Service Verification

| Service | Status | Response Time | Notes |
|---------|--------|---------------|-------|
| API Gateway | [PASS/FAIL] | [Xms] | |
| Auth Service | [PASS/FAIL] | [Xms] | |
| Matching Service | [PASS/FAIL] | [Xms] | |
| Messaging Service | [PASS/FAIL] | [Xms] | |
| Payment Service | [PASS/FAIL] | [Xms] | |
| Notification Service | [PASS/FAIL] | [Xms] | |

### Smoke Test Results

| Test Suite | Passed | Failed | Skipped |
|------------|--------|--------|---------|
| Critical Path | [X] | [X] | [X] |
| Authentication | [X] | [X] | [X] |
| Payments | [X] | [X] | [X] |
| Messaging | [X] | [X] | [X] |

## Action Items

| ID | Description | Priority | Owner | Due Date | Status |
|----|-------------|----------|-------|----------|--------|
| 1 | [Action item description] | [High/Med/Low] | [Name] | [Date] | [Open/In Progress/Done] |
| 2 | [Action item description] | [High/Med/Low] | [Name] | [Date] | [Open/In Progress/Done] |

## Lessons Learned

### What Went Well
1. [Item]
2. [Item]
3. [Item]

### What Could Be Improved
1. [Item]
2. [Item]
3. [Item]

### Recommendations
1. [Recommendation]
2. [Recommendation]
3. [Recommendation]

## Runbook Updates Required

| Runbook | Section | Update Description |
|---------|---------|-------------------|
| [Runbook name] | [Section] | [Description of update needed] |

## Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Drill Lead | [NAME] | _____________ | [DATE] |
| Platform Lead | [NAME] | _____________ | [DATE] |
| Security Lead | [NAME] | _____________ | [DATE] |
| Engineering Manager | [NAME] | _____________ | [DATE] |

---

**Report Generated:** [TIMESTAMP]
**Next Drill Scheduled:** [DATE]
**Distribution:** [List of recipients]
```

### 6.2 Quick Documentation Form

```yaml
# File: templates/drill-quick-doc.yaml
# Use for rapid documentation during drill execution

drill_id: ""
type: ""  # monthly_db | quarterly_partial | annual_full
date: ""
lead: ""

timeline:
  started_at: ""
  completed_at: ""
  total_duration_minutes: 0

participants:
  - name: ""
    role: ""
    present: true

rto_rpo:
  rto_target_minutes: 240
  rto_actual_minutes: 0
  rto_status: ""  # PASS | FAIL
  rpo_target_minutes: 15
  rpo_actual_minutes: 0
  rpo_status: ""  # PASS | FAIL

issues:
  - id: 1
    title: ""
    severity: ""  # critical | high | medium | low
    description: ""
    resolved: false
    resolution: ""

action_items:
  - id: 1
    description: ""
    owner: ""
    priority: ""  # high | medium | low
    due_date: ""

overall_status: ""  # PASS | FAIL | PARTIAL

notes: ""
```

---

## 7. Drill Schedule Calendar

### 7.1 Next 12 Months Schedule (2026)

| Month | Drill Type | Scheduled Date | Duration | Lead |
|-------|------------|----------------|----------|------|
| January 2026 | Monthly DB Restore | Tue, Jan 7 | 2-4 hours | DBA Team |
| February 2026 | Monthly DB Restore | Tue, Feb 4 | 2-4 hours | DBA Team |
| March 2026 | Monthly DB Restore | Tue, Mar 4 | 2-4 hours | DBA Team |
| **Q1 2026** | **Quarterly Partial Failover** | **Sat, Mar 14** | **4-6 hours** | **Platform Team** |
| April 2026 | Monthly DB Restore | Tue, Apr 1 | 2-4 hours | DBA Team |
| May 2026 | Monthly DB Restore | Tue, May 6 | 2-4 hours | DBA Team |
| June 2026 | Monthly DB Restore | Tue, Jun 3 | 2-4 hours | DBA Team |
| **Q2 2026** | **Quarterly Partial Failover** | **Sat, Jun 14** | **4-6 hours** | **Platform Team** |
| July 2026 | Monthly DB Restore | Tue, Jul 1 | 2-4 hours | DBA Team |
| August 2026 | Monthly DB Restore | Tue, Aug 5 | 2-4 hours | DBA Team |
| September 2026 | Monthly DB Restore | Tue, Sep 2 | 2-4 hours | DBA Team |
| **Q3 2026** | **Quarterly Partial Failover** | **Sat, Sep 13** | **4-6 hours** | **Platform Team** |
| October 2026 | Monthly DB Restore | Tue, Oct 7 | 2-4 hours | DBA Team |
| **Annual 2026** | **Full DR Simulation** | **Sat, Oct 25** | **8-12 hours** | **All Teams** |
| November 2026 | Monthly DB Restore | Tue, Nov 4 | 2-4 hours | DBA Team |
| December 2026 | Monthly DB Restore | Tue, Dec 2 | 2-4 hours | DBA Team |
| **Q4 2026** | **Quarterly Partial Failover** | **Sat, Dec 13** | **4-6 hours** | **Platform Team** |

### 7.2 Calendar Integration

```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Flamoral//DR Drills//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH

BEGIN:VEVENT
UID:dr-drill-monthly-202601@flamoral.com
DTSTART:20260107T090000Z
DTEND:20260107T130000Z
RRULE:FREQ=MONTHLY;BYDAY=1TU
SUMMARY:Monthly DB Restore Drill
DESCRIPTION:Monthly database point-in-time recovery drill
LOCATION:Virtual - Zoom DR War Room
ORGANIZER:mailto:platform@flamoral.com
END:VEVENT

BEGIN:VEVENT
UID:dr-drill-quarterly-q1-2026@flamoral.com
DTSTART:20260314T060000Z
DTEND:20260314T120000Z
SUMMARY:Q1 Quarterly Partial Failover Drill
DESCRIPTION:Quarterly partial failover drill - 10% traffic shift to DR
LOCATION:Virtual - Zoom DR War Room
ORGANIZER:mailto:platform@flamoral.com
END:VEVENT

BEGIN:VEVENT
UID:dr-drill-annual-2026@flamoral.com
DTSTART:20261025T060000Z
DTEND:20261025T180000Z
SUMMARY:Annual Full DR Simulation
DESCRIPTION:Annual complete region failover drill - maintenance window
LOCATION:Virtual - Zoom DR War Room
ORGANIZER:mailto:platform@flamoral.com
END:VEVENT

END:VCALENDAR
```

### 7.3 Scheduling Guidelines

**Monthly Drills:**
- Schedule on first Tuesday of each month
- Start time: 09:00 UTC (off-peak hours)
- Duration: 2-4 hours
- No customer notification required
- Staging/DR environment only

**Quarterly Drills:**
- Schedule on second Saturday of Q1, Q2, Q3, Q4 closing month
- Start time: 06:00 UTC (lowest traffic period)
- Duration: 4-6 hours
- Internal notification 1 week in advance
- Limited production impact (10% traffic)

**Annual Drill:**
- Schedule in October (before Q4 holiday peak)
- Announce 2 weeks in advance
- Full maintenance window
- Customer communication required
- All-hands required

### 7.4 Drill Conflicts and Rescheduling

**Do not schedule drills during:**
- Major product launches (within 2 weeks)
- Holiday periods (Dec 20 - Jan 5)
- Q4 peak season (Nov 15 - Dec 31)
- Other planned maintenance windows
- Major sporting/cultural events

**Rescheduling Process:**
1. Identify conflict at least 1 week in advance
2. Propose alternative date within same week if possible
3. Notify all participants via calendar update
4. Update DR tracking system
5. Document reason for reschedule

---

## Appendix

### A. Contact List

See [contact-list.md](./contact-list.md) for detailed emergency contacts.

### B. Related Documents

| Document | Location | Purpose |
|----------|----------|---------|
| DR Runbook | [DR_RUNBOOK.md](./DR_RUNBOOK.md) | Actual disaster recovery procedures |
| Disaster Recovery Plan | [DISASTER_RECOVERY_PLAN.md](./DISASTER_RECOVERY_PLAN.md) | Overall DR strategy |
| Failover Procedure | [failover-procedure.md](./failover-procedure.md) | Detailed failover steps |
| Backup Scripts | [backup-scripts.sh](./backup-scripts.sh) | Automated backup procedures |
| Restore Scripts | [restore-from-backup.sh](./restore-from-backup.sh) | Restore procedures |

### C. Compliance Requirements

This DR drill program satisfies the following compliance requirements:

| Standard | Requirement | Drill Type | Frequency |
|----------|-------------|------------|-----------|
| SOC 2 Type II | Business Continuity Testing | Full DR | Annual |
| ISO 27001 | A.17.1.3 Information security continuity | Partial Failover | Quarterly |
| GDPR | Data availability and resilience | DB Restore | Monthly |
| PCI DSS | 12.10.2 Test the plan annually | Full DR | Annual |

### D. Metrics and KPIs

**Drill Program KPIs:**

| KPI | Target | Measurement |
|-----|--------|-------------|
| Drill Completion Rate | 100% | Drills completed / drills scheduled |
| RTO Achievement Rate | 95% | Drills meeting RTO / total drills |
| RPO Achievement Rate | 95% | Drills meeting RPO / total drills |
| Issue Resolution Time | < 48 hours | Avg time to close drill action items |
| Runbook Update Frequency | Within 7 days | Time to update runbooks post-drill |
| Team Readiness Score | > 90% | Based on drill performance metrics |

### E. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-05 | Platform Team | Initial DR Drill Runbook |

---

**Document Owner:** Platform Reliability Team
**Review Frequency:** Quarterly
**Next Review Date:** 2026-04-05
**Approval:** [Requires signature from VP Engineering]
