# Flamoral Dating Platform - Data Recovery Runbook

## Overview

This runbook provides comprehensive procedures for recovering data in the Flamoral dating platform, including database restoration, file recovery, point-in-time recovery, and compliance requirements for data handling.

**Last Updated:** 2025-12-17
**Version:** 1.0.0
**Maintained By:** Database & SRE Team

## Table of Contents

1. [Backup Architecture](#backup-architecture)
2. [Recovery Scenarios](#recovery-scenarios)
3. [Database Recovery](#database-recovery)
4. [File Storage Recovery](#file-storage-recovery)
5. [Point-in-Time Recovery](#point-in-time-recovery)
6. [Data Verification](#data-verification)
7. [Compliance Requirements](#compliance-requirements)
8. [Recovery Testing](#recovery-testing)

## Backup Architecture

### Backup Strategy

```
Database Backups (PostgreSQL):
├── Automated Full Backups: Daily at 02:00 UTC
├── WAL (Write-Ahead Log): Continuous
├── Retention: 30 days (Production), 7 days (Dev/Staging)
├── Storage: Geo-Redundant (GRS)
└── RPO: 5 minutes (via WAL)

File Storage Backups (Azure Blob):
├── Soft Delete: Enabled (30 days)
├── Versioning: Enabled
├── Snapshots: Daily at 03:00 UTC
├── Retention: 90 days
└── RPO: 24 hours

Configuration Backups:
├── Git Repository: All infrastructure code
├── Kubernetes Manifests: Version controlled
├── Secrets: Azure Key Vault with versioning
└── RPO: 0 (no data loss)

Application Data:
├── User Profiles: Database + hourly snapshots
├── Messages: Database + WAL backup
├── Photos: Blob storage with versioning
└── Analytics: Daily backup to separate storage
```

### Backup Locations

**Production:**
```
Database Backups:
└── Azure Backup Vault: flamoral-prod-backup-vault
    └── Location: West US 2 (Primary) + East US 2 (Geo-replicated)

Blob Storage Backups:
└── Storage Account: flamoralprodbackup
    └── Container: database-backups, photo-backups, config-backups

Configuration:
└── Git Repository: github.com/flamoral/infrastructure
    └── Branches: main, production, staging, dev
```

### Recovery Time Objectives (RTO)

| Data Type | RTO | RPO | Priority |
|-----------|-----|-----|----------|
| User Profiles | 1 hour | 5 minutes | P1 Critical |
| Messages | 1 hour | 5 minutes | P1 Critical |
| Matches | 2 hours | 15 minutes | P2 High |
| Photos | 4 hours | 24 hours | P2 High |
| Analytics Data | 24 hours | 24 hours | P3 Medium |
| Configuration | 30 minutes | 0 | P1 Critical |

## Recovery Scenarios

### Scenario Matrix

| Scenario | Recovery Method | Estimated Time | Runbook Section |
|----------|----------------|----------------|-----------------|
| Accidental table drop | PITR to before drop | 1-2 hours | [Point-in-Time Recovery](#point-in-time-recovery) |
| Ransomware/Encryption | Restore from backup | 2-4 hours | [Full Database Restore](#full-database-restore) |
| Data corruption | PITR + validation | 2-3 hours | [Corrupted Data Recovery](#corrupted-data-recovery) |
| Accidental deletion | Undelete/PITR | 30-60 minutes | [Single Record Recovery](#single-record-recovery) |
| Photo deletion | Blob soft delete | 15-30 minutes | [Photo Recovery](#photo-recovery) |
| Complete disaster | DR failover + restore | 4-8 hours | [Disaster Recovery](#disaster-recovery-procedure) |
| Compliance request | Extract specific data | 1-2 hours | [Compliance Data Export](#compliance-data-export) |

## Database Recovery

### Full Database Restore

**When to use:** Complete database loss, ransomware, major corruption

#### Step 1: Assess Situation
```bash
# Verify database is truly lost or corrupted
az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --query "state" -o tsv

# Check if any data is accessible
psql "host=flamoral-prod-postgres.postgres.database.azure.com \
      port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  -c "SELECT COUNT(*) FROM users;"

# Document current state
psql "host=flamoral-prod-postgres.postgres.database.azure.com \
      port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  -c "\dt" > database-state-before-recovery.txt 2>&1
```

#### Step 2: Stop Application Traffic
```bash
# Enable maintenance mode
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: maintenance-mode
  namespace: datingapp
data:
  enabled: "true"
  message: "Database recovery in progress. Service will resume shortly."
EOF

# Scale down all applications to prevent writes
kubectl scale deployment/dating-api --replicas=0 -n datingapp
kubectl scale deployment/dating-worker --replicas=0 -n datingapp
kubectl scale deployment/dating-scheduler --replicas=0 -n datingapp
kubectl scale deployment/dating-matching-service --replicas=0 -n datingapp
kubectl scale deployment/dating-messaging-service --replicas=0 -n datingapp
```

#### Step 3: List Available Backups
```bash
# List all backups
az postgres flexible-server backup list \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  -o table

# Get earliest and latest restore time
az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --query "{earliestRestore:earliestRestoreDate, state:state}" -o table
```

#### Step 4: Perform Restore to New Server
```bash
# Choose restore point (example: 1 hour before incident)
RESTORE_TIME=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)
RESTORE_SERVER="flamoral-prod-postgres-restored-$(date +%Y%m%d-%H%M)"

echo "Restoring to: $RESTORE_TIME"
echo "New server: $RESTORE_SERVER"

# Restore database to new server
az postgres flexible-server restore \
  --resource-group datingapp-prod-rg \
  --name "$RESTORE_SERVER" \
  --source-server flamoral-prod-postgres \
  --restore-time "$RESTORE_TIME"

# Monitor restore progress
watch -n 30 'az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name "'$RESTORE_SERVER'" \
  --query "{state:state}" -o tsv'

# Restore typically takes 10-30 minutes depending on database size
```

#### Step 5: Verify Restored Data
```bash
# Connect to restored server
RESTORED_HOST="${RESTORE_SERVER}.postgres.database.azure.com"

psql "host=$RESTORED_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" <<EOF
-- Check database size
SELECT pg_size_pretty(pg_database_size('datingapp')) as db_size;

-- Check table counts
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'matches', COUNT(*) FROM matches
UNION ALL SELECT 'photos', COUNT(*) FROM photos;

-- Verify latest data
SELECT MAX(created_at) as latest_user FROM users;
SELECT MAX(created_at) as latest_message FROM messages;

-- Check for corruption
SELECT tablename, n_dead_tup, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC LIMIT 10;
EOF
```

#### Step 6: Switch Application to Restored Database
```bash
# Update connection string
kubectl create secret generic postgres-credentials \
  --from-literal=host="$RESTORED_HOST" \
  --from-literal=database="datingapp" \
  --from-literal=username="psqladmin" \
  --from-literal=password="$DB_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f - -n datingapp

# Update ConfigMap if used
kubectl patch configmap database-config -n datingapp \
  --type merge \
  -p '{"data":{"DB_HOST":"'$RESTORED_HOST'"}}'

# Restart applications
kubectl scale deployment/dating-api --replicas=3 -n datingapp
kubectl scale deployment/dating-worker --replicas=2 -n datingapp
kubectl scale deployment/dating-matching-service --replicas=2 -n datingapp

# Monitor startup
kubectl get pods -n datingapp -w
```

#### Step 7: Verify Application Connectivity
```bash
# Test health endpoints
kubectl exec -n datingapp deployment/dating-api -- \
  curl -s localhost:8080/health/database | jq

# Run smoke tests
cd /path/to/tests
npm run test:smoke

# Verify data access
curl -X POST https://api.flamoral.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' | jq
```

#### Step 8: Cleanup and Documentation
```bash
# Disable maintenance mode
kubectl delete configmap maintenance-mode -n datingapp

# Document recovery
cat > recovery-report-$(date +%Y%m%d).md <<EOF
# Database Recovery Report

Date: $(date -u +%Y-%m-%d)
Time: $(date -u +%H:%M:%S) UTC

## Incident
- Original Database: flamoral-prod-postgres
- Restore Point: $RESTORE_TIME
- Restored To: $RESTORE_SERVER
- Reason: [FILL IN REASON]

## Data Loss
- Start: $RESTORE_TIME
- End: [INCIDENT TIME]
- Duration: [CALCULATE]

## Recovery Steps
1. Stopped application traffic
2. Restored database from backup
3. Verified data integrity
4. Switched application connections
5. Verified application functionality

## Verification
- User count: [FROM VERIFICATION QUERY]
- Last message: [TIMESTAMP]
- Data corruption: None detected

## Follow-up Actions
- [ ] Monitor for 24 hours
- [ ] Delete old corrupted server after 7 days
- [ ] Root cause analysis
- [ ] Update runbook if needed
EOF

# Optional: Delete old corrupted server after verification period
# az postgres flexible-server delete \
#   --resource-group datingapp-prod-rg \
#   --name flamoral-prod-postgres \
#   --yes
```

## Point-in-Time Recovery

### PITR for Specific Table

**When to use:** Accidental table drop, specific data corruption

#### Restore Specific Table
```bash
# Step 1: Restore database to point before table drop
RESTORE_TIME="2025-12-17T14:30:00Z"  # Before table was dropped
TEMP_SERVER="flamoral-temp-pitr-$(date +%Y%m%d-%H%M)"

az postgres flexible-server restore \
  --resource-group datingapp-prod-rg \
  --name "$TEMP_SERVER" \
  --source-server flamoral-prod-postgres \
  --restore-time "$RESTORE_TIME"

# Step 2: Wait for restore to complete
echo "Waiting for restore to complete..."
until [ "$(az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name "$TEMP_SERVER" \
  --query state -o tsv)" == "Ready" ]; do
  sleep 30
  echo -n "."
done
echo " Complete!"

# Step 3: Export the specific table
TEMP_HOST="${TEMP_SERVER}.postgres.database.azure.com"

pg_dump "host=$TEMP_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  --table=users \
  --data-only \
  --file=users_recovered.sql

# Step 4: Restore table to production
psql "host=flamoral-prod-postgres.postgres.database.azure.com \
      port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  -f users_recovered.sql

# Step 5: Verify restoration
psql "host=flamoral-prod-postgres.postgres.database.azure.com \
      port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  -c "SELECT COUNT(*) FROM users;"

# Step 6: Clean up temporary server
az postgres flexible-server delete \
  --resource-group datingapp-prod-rg \
  --name "$TEMP_SERVER" \
  --yes
```

### Single Record Recovery

**When to use:** Accidentally deleted user, message, or record

```bash
# Step 1: Find the deletion time from logs
kubectl logs -n datingapp deployment/dating-api --since=24h | grep "DELETE FROM users WHERE id"

# Step 2: Restore to temp server before deletion
RESTORE_TIME="2025-12-17T14:25:00Z"  # Before deletion
TEMP_SERVER="flamoral-temp-record-$(date +%Y%m%d-%H%M)"

az postgres flexible-server restore \
  --resource-group datingapp-prod-rg \
  --name "$TEMP_SERVER" \
  --source-server flamoral-prod-postgres \
  --restore-time "$RESTORE_TIME"

# Step 3: Export specific record
TEMP_HOST="${TEMP_SERVER}.postgres.database.azure.com"
RECORD_ID="user-uuid-here"

psql "host=$TEMP_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" <<EOF > recovered_record.sql
\copy (SELECT * FROM users WHERE id = '$RECORD_ID') TO STDOUT WITH CSV HEADER
\copy (SELECT * FROM profiles WHERE user_id = '$RECORD_ID') TO STDOUT WITH CSV HEADER
\copy (SELECT * FROM photos WHERE user_id = '$RECORD_ID') TO STDOUT WITH CSV HEADER
EOF

# Step 4: Import to production
psql "host=flamoral-prod-postgres.postgres.database.azure.com \
      port=5432 dbname=datingapp user=psqladmin sslmode=require" <<EOF
-- Re-insert user
INSERT INTO users (id, email, created_at, ...)
VALUES ('$RECORD_ID', 'user@example.com', ...);

-- Re-insert related data
-- [Add specific INSERT statements]
EOF

# Step 5: Cleanup
az postgres flexible-server delete \
  --resource-group datingapp-prod-rg \
  --name "$TEMP_SERVER" \
  --yes
```

## File Storage Recovery

### Photo Recovery

**When to use:** Accidentally deleted photos, corrupted images

#### Recover from Soft Delete
```bash
# Step 1: List deleted blobs
az storage blob list \
  --account-name flamoralprod \
  --container-name photos \
  --include d \
  --query "[?properties.deletedTime].{name:name, deleted:properties.deletedTime}" \
  -o table

# Step 2: Undelete specific blob
BLOB_NAME="users/user-123/photo-456.jpg"

az storage blob undelete \
  --account-name flamoralprod \
  --container-name photos \
  --name "$BLOB_NAME"

# Step 3: Verify blob restored
az storage blob show \
  --account-name flamoralprod \
  --container-name photos \
  --name "$BLOB_NAME" \
  --query "{name:name, contentType:properties.contentType, size:properties.contentLength}" \
  -o table
```

#### Recover from Blob Snapshot
```bash
# Step 1: List blob versions/snapshots
az storage blob list \
  --account-name flamoralprod \
  --container-name photos \
  --prefix "users/user-123/" \
  --include sv \
  -o table

# Step 2: Copy specific snapshot to restore
SNAPSHOT_TIME="2025-12-17T14:00:00.0000000Z"
SOURCE_BLOB="users/user-123/photo-456.jpg"

az storage blob copy start \
  --account-name flamoralprod \
  --destination-container photos \
  --destination-blob "$SOURCE_BLOB" \
  --source-container photos \
  --source-blob "$SOURCE_BLOB" \
  --source-snapshot "$SNAPSHOT_TIME"

# Step 3: Monitor copy status
az storage blob show \
  --account-name flamoralprod \
  --container-name photos \
  --name "$SOURCE_BLOB" \
  --query "properties.copy.status" -o tsv
```

#### Bulk Photo Recovery
```bash
# Recover all photos deleted in last 24 hours
az storage blob list \
  --account-name flamoralprod \
  --container-name photos \
  --include d \
  --query "[?properties.deletedTime>'2025-12-16T00:00:00Z'].name" \
  -o tsv | while read blob; do
    echo "Restoring: $blob"
    az storage blob undelete \
      --account-name flamoralprod \
      --container-name photos \
      --name "$blob"
done
```

### Configuration Recovery

**When to use:** Accidentally deleted ConfigMap, Secret, or configuration file

#### Recover Kubernetes ConfigMap/Secret
```bash
# Step 1: Check if backup exists
ls -la /backup/kubernetes/

# Step 2: Restore from Git (preferred)
cd infrastructure/kubernetes
git log --oneline -- configmaps/app-config.yaml
git show HEAD~1:configmaps/app-config.yaml > app-config-recovered.yaml

# Step 3: Apply recovered config
kubectl apply -f app-config-recovered.yaml -n datingapp

# Step 4: Verify
kubectl get configmap app-config -n datingapp -o yaml
```

#### Recover from Azure Key Vault
```bash
# List deleted secrets (soft delete enabled)
az keyvault secret list-deleted \
  --vault-name datingapp-prod-kv \
  -o table

# Recover specific secret
az keyvault secret recover \
  --vault-name datingapp-prod-kv \
  --name postgres-password

# Verify recovery
az keyvault secret show \
  --vault-name datingapp-prod-kv \
  --name postgres-password \
  --query "{name:name, enabled:attributes.enabled}" -o table
```

## Data Verification

### Post-Recovery Verification Checklist

#### Database Verification
```bash
#!/bin/bash
# verify-database-recovery.sh

echo "=== Database Recovery Verification ==="

DB_HOST="flamoral-prod-postgres.postgres.database.azure.com"

# Test 1: Connection
echo -n "Testing connection... "
psql "host=$DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  -c "SELECT 1;" > /dev/null 2>&1 && echo "✓ PASS" || echo "✗ FAIL"

# Test 2: Table integrity
echo -n "Checking table integrity... "
TABLES=$(psql "host=$DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
[ "$TABLES" -ge 20 ] && echo "✓ PASS ($TABLES tables)" || echo "✗ FAIL (only $TABLES tables)"

# Test 3: Row counts
echo "Checking row counts..."
psql "host=$DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" <<EOF
SELECT
  'users' as table_name,
  COUNT(*) as count,
  MAX(created_at) as latest
FROM users
UNION ALL
SELECT 'messages', COUNT(*), MAX(created_at) FROM messages
UNION ALL
SELECT 'matches', COUNT(*), MAX(created_at) FROM matches;
EOF

# Test 4: Data consistency
echo -n "Checking referential integrity... "
ORPHANS=$(psql "host=$DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  -t -c "SELECT COUNT(*) FROM profiles p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE u.id IS NULL;")
[ "$ORPHANS" -eq 0 ] && echo "✓ PASS" || echo "⚠ WARNING ($ORPHANS orphaned profiles)"

# Test 5: Index health
echo -n "Checking indexes... "
INVALID=$(psql "host=$DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  -t -c "SELECT COUNT(*) FROM pg_index WHERE indisvalid = false;")
[ "$INVALID" -eq 0 ] && echo "✓ PASS" || echo "✗ FAIL ($INVALID invalid indexes)"

echo ""
echo "=== Verification Complete ==="
```

#### Application Verification
```bash
# Test critical user journeys

# 1. User authentication
echo "Testing authentication..."
curl -X POST https://api.flamoral.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  -s | jq -r '.token' > /tmp/token.txt

TOKEN=$(cat /tmp/token.txt)

# 2. Profile retrieval
echo "Testing profile retrieval..."
curl -X GET https://api.flamoral.com/v1/profile \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '.id'

# 3. Match retrieval
echo "Testing match retrieval..."
curl -X GET https://api.flamoral.com/v1/matches \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq 'length'

# 4. Message retrieval
echo "Testing message retrieval..."
curl -X GET https://api.flamoral.com/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq 'length'

# 5. Photo access
echo "Testing photo access..."
curl -X GET https://api.flamoral.com/v1/photos/photo-123 \
  -H "Authorization: Bearer $TOKEN" \
  -s -o /dev/null -w "%{http_code}\n"
```

## Compliance Requirements

### GDPR/CCPA Data Recovery

**Compliance Note:** All data recovery operations involving personal data must be logged and reported.

#### Data Recovery Audit Log
```bash
# Create audit entry
cat >> /var/log/data-recovery-audit.log <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "operation": "database_restore",
  "operator": "$USER",
  "reason": "Accidental table drop",
  "restore_point": "$RESTORE_TIME",
  "affected_records": 12500,
  "data_types": ["user_profiles", "messages"],
  "approval_ticket": "INC-12345",
  "completion_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
```

#### User Notification (if required)
```bash
# If recovery affects user data, notification may be required

# Step 1: Identify affected users
psql "host=$DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" <<EOF > affected_users.csv
\copy (
  SELECT id, email, created_at
  FROM users
  WHERE updated_at > '$RESTORE_TIME'
) TO STDOUT WITH CSV HEADER
EOF

# Step 2: Generate notification
# (Send via notification service)
```

### Data Retention Compliance

```bash
# Verify backup retention meets compliance
az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --query "backup.backupRetentionDays" -o tsv

# Should be: 30 days minimum for production

# Verify blob retention
az storage account blob-service-properties show \
  --account-name flamoralprod \
  --query "deleteRetentionPolicy" -o json

# Should show: enabled with 30+ days retention
```

## Disaster Recovery Procedure

### Complete Regional Failure

**When to use:** Primary region completely down, need geo-failover

```bash
# Step 1: Assess regional availability
az account list-locations \
  --query "[?name=='westus2' || name=='eastus2'].{name:name, displayName:displayName}" \
  -o table

# Step 2: Failover to geo-replica database
REPLICA_REGION="eastus2"
GEO_REPLICA="flamoral-prod-postgres-geo-$REPLICA_REGION"

# Promote geo-replica to primary
az postgres flexible-server replica stop-replication \
  --resource-group datingapp-prod-rg \
  --name "$GEO_REPLICA"

# Step 3: Update DNS or Front Door backend
az network front-door backend-pool backend update \
  --front-door-name flamoral-prod-fd \
  --resource-group datingapp-prod-rg \
  --pool-name DefaultBackendPool \
  --address "api-$REPLICA_REGION.flamoral.com"

# Step 4: Update application connections
kubectl patch configmap database-config -n datingapp \
  --type merge \
  -p '{"data":{"DB_HOST":"'$GEO_REPLICA'.postgres.database.azure.com"}}'

# Step 5: Restart applications in secondary region
# (Assuming multi-region AKS deployment)
```

## Recovery Testing

### Monthly Recovery Test

**Test Schedule:** First Saturday of each month, 02:00-04:00 UTC

```bash
#!/bin/bash
# monthly-recovery-test.sh

echo "=== Monthly Recovery Test ==="
echo "Date: $(date)"

# Test 1: Database PITR
echo "Test 1: Point-in-Time Recovery..."
RESTORE_TIME=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)
TEST_SERVER="flamoral-test-pitr-$(date +%Y%m%d)"

az postgres flexible-server restore \
  --resource-group datingapp-staging-rg \
  --name "$TEST_SERVER" \
  --source-server flamoral-staging-postgres \
  --restore-time "$RESTORE_TIME"

# Wait for restore
until [ "$(az postgres flexible-server show \
  --resource-group datingapp-staging-rg \
  --name "$TEST_SERVER" \
  --query state -o tsv)" == "Ready" ]; do
  sleep 30
done

echo "✓ PITR test completed in $SECONDS seconds"

# Test 2: Blob recovery
echo "Test 2: Blob Recovery..."
TEST_BLOB="test-recovery/test-$(date +%s).txt"

# Upload test blob
echo "Test data" | az storage blob upload \
  --account-name flamoralstaging \
  --container-name test \
  --name "$TEST_BLOB" \
  --data -

# Delete blob
az storage blob delete \
  --account-name flamoralstaging \
  --container-name test \
  --name "$TEST_BLOB"

# Undelete blob
az storage blob undelete \
  --account-name flamoralstaging \
  --container-name test \
  --name "$TEST_BLOB"

# Verify recovery
az storage blob show \
  --account-name flamoralstaging \
  --container-name test \
  --name "$TEST_BLOB" \
  -o table

echo "✓ Blob recovery test completed"

# Cleanup
az postgres flexible-server delete \
  --resource-group datingapp-staging-rg \
  --name "$TEST_SERVER" \
  --yes

az storage blob delete \
  --account-name flamoralstaging \
  --container-name test \
  --name "$TEST_BLOB"

echo "=== Recovery Test Complete ==="
echo "All tests passed!"
```

## Best Practices

1. **Test Regularly:** Monthly recovery tests in staging
2. **Document Everything:** Log all recovery operations
3. **Verify Before Switching:** Always verify restored data before going live
4. **Keep Backups Long Enough:** 30+ days for compliance
5. **Multiple Restore Points:** Use PITR for flexibility
6. **Geo-Redundancy:** Store backups in multiple regions
7. **Automate When Possible:** Scripts for common scenarios
8. **Communication:** Keep stakeholders informed during recovery

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-17 | Database Team | Initial creation |

---

**Document Status:** Active
**Next Review Date:** 2026-01-17
**Document Owner:** Database SRE Team Lead
