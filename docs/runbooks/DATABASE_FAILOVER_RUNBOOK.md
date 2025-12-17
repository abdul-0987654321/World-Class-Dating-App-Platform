# Flamoral Dating Platform - Database Failover Runbook

## Overview

This runbook provides detailed procedures for handling PostgreSQL database failures, performing failover operations, and recovering from database outages in the Flamoral dating platform.

**Last Updated:** 2025-12-17
**Version:** 1.0.0
**Maintained By:** Database & SRE Team

## Table of Contents

1. [Database Architecture](#database-architecture)
2. [Pre-Failover Checklist](#pre-failover-checklist)
3. [Automatic Failover](#automatic-failover)
4. [Manual Failover Procedures](#manual-failover-procedures)
5. [Connection String Updates](#connection-string-updates)
6. [Data Verification](#data-verification)
7. [Rollback Procedures](#rollback-procedures)
8. [Common Scenarios](#common-scenarios)
9. [Troubleshooting](#troubleshooting)

## Database Architecture

### Current Configuration

**Production Environment:**
```
Primary Server: flamoral-prod-postgres.postgres.database.azure.com
└── Region: West US 2
└── SKU: GP_Standard_D4s_v3 (4 vCores, 16GB RAM)
└── High Availability: Zone Redundant
└── Backup Retention: 30 days

Standby Server: flamoral-prod-postgres-standby
└── Region: West US 2 (Different Zone)
└── Replication: Synchronous
└── Automatic Failover: Enabled

Read Replicas:
├── Read Replica 1: West US 2 (Same Region)
└── Read Replica 2: East US 2 (Geo-Replica)
```

**Staging Environment:**
```
Primary Server: flamoral-staging-postgres.postgres.database.azure.com
└── High Availability: Same Zone
└── Backup Retention: 7 days
```

**Development Environment:**
```
Primary Server: flamoral-dev-postgres.postgres.database.azure.com
└── High Availability: Disabled
└── Backup Retention: 7 days
```

### Replication Architecture

```
┌─────────────────┐
│  Primary DB     │
│  (Read/Write)   │
└────────┬────────┘
         │
         ├──────────────┬──────────────┐
         ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Standby    │  │ Read Replica│  │ Geo-Replica │
│  (Sync)     │  │ (Async)     │  │ (Async)     │
└─────────────┘  └─────────────┘  └─────────────┘
```

## Pre-Failover Checklist

### Assessment Phase (First 5 Minutes)

#### 1. Verify Database Health
```bash
# Check if primary is truly down
az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --query "state" -o tsv

# Check server availability
az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --query "{name:name, state:state, version:version, location:location}" -o table

# Test connectivity
psql "host=flamoral-prod-postgres.postgres.database.azure.com \
      port=5432 \
      dbname=datingapp \
      user=psqladmin \
      sslmode=require" \
  -c "SELECT version();"
```

#### 2. Check Replication Status
```bash
# Check replication lag
psql "host=flamoral-prod-postgres.postgres.database.azure.com \
      port=5432 \
      dbname=datingapp \
      user=psqladmin \
      sslmode=require" \
  -c "SELECT client_addr, state, sync_state,
      pg_wal_lsn_diff(sent_lsn, replay_lsn) as lag_bytes,
      pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) as total_lag
      FROM pg_stat_replication;"

# If primary is down, check from Azure
az postgres flexible-server replica list \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  -o table
```

#### 3. Assess Impact
```bash
# Check active connections (if primary accessible)
psql "host=flamoral-prod-postgres.postgres.database.azure.com \
      port=5432 \
      dbname=datingapp \
      user=psqladmin \
      sslmode=require" \
  -c "SELECT count(*) as active_connections
      FROM pg_stat_activity
      WHERE state = 'active';"

# Check application error rate
kubectl logs -n datingapp deployment/dating-api --tail=100 | grep -i "database"

# Check recent transactions
psql "host=flamoral-prod-postgres.postgres.database.azure.com \
      port=5432 \
      dbname=datingapp \
      user=psqladmin \
      sslmode=require" \
  -c "SELECT age(clock_timestamp(), query_start), query
      FROM pg_stat_activity
      WHERE state != 'idle'
      ORDER BY query_start
      LIMIT 10;"
```

#### 4. Decision Criteria

**Proceed with Failover IF:**
- Primary database is completely unreachable for >5 minutes
- Primary database corruption detected
- Replication lag >15 minutes and growing
- Performance degradation affecting >50% of requests
- Security breach requiring database isolation

**DO NOT Failover IF:**
- Issue is transient network blip (<2 minutes)
- Replication lag is temporary and recovering
- Problem can be fixed with parameter tuning
- Rollback of recent migration is faster

## Automatic Failover

### Azure High Availability Automatic Failover

Azure PostgreSQL Flexible Server with Zone-Redundant HA will automatically failover.

#### Monitor Automatic Failover
```bash
# Watch failover in progress
watch -n 5 'az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --query "{state:state, haState:highAvailability.state}" -o table'

# Check activity log for failover events
az monitor activity-log list \
  --resource-group datingapp-prod-rg \
  --namespace Microsoft.DBforPostgreSQL \
  --offset 1h \
  --query "[?contains(operationName.value, 'Failover')].{time:eventTimestamp, status:status.value, operation:operationName.value}" \
  -o table
```

#### Verify Automatic Failover Completion
```bash
# Check server is running
az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --query "state" -o tsv
# Expected: Ready

# Test database connection
psql "host=flamoral-prod-postgres.postgres.database.azure.com \
      port=5432 \
      dbname=datingapp \
      user=psqladmin \
      sslmode=require" \
  -c "SELECT 'Failover successful' as status, now() as current_time;"

# Verify application connectivity
kubectl exec -n datingapp deployment/dating-api -- \
  curl -s localhost:8080/health/database | jq
```

**Note:** Automatic failover typically completes in 60-120 seconds. No connection string changes needed.

## Manual Failover Procedures

### Scenario 1: Failover to Standby Server (HA Configuration)

**When to use:** Primary failure with HA enabled

#### Step 1: Initiate Failover
```bash
# Trigger manual failover to standby
az postgres flexible-server restart \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --failover Forced

# Note: Use "Forced" for emergency, "Planned" for maintenance
```

#### Step 2: Monitor Failover Progress
```bash
# Monitor failover status
az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --query "{state:state, haState:highAvailability.state, haMode:highAvailability.mode}" \
  -o table

# Expected states during failover:
# state: Updating → Ready
# haState: FailingOver → Healthy
```

#### Step 3: Verify New Primary
```bash
# Connect and verify
psql "host=flamoral-prod-postgres.postgres.database.azure.com \
      port=5432 \
      dbname=datingapp \
      user=psqladmin \
      sslmode=require" <<EOF
SELECT
  pg_is_in_recovery() as is_standby,
  pg_last_wal_receive_lsn() as receive_lsn,
  pg_last_wal_replay_lsn() as replay_lsn,
  pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn()) as lag_bytes;
EOF

# Expected: is_standby = false (now primary)
```

### Scenario 2: Promote Read Replica to Primary

**When to use:** Primary and standby both failed, or geo-disaster recovery

#### Step 1: Stop Application Traffic
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
  message: "Database maintenance in progress. Service will resume shortly."
EOF

# Scale down API to prevent writes
kubectl scale deployment/dating-api --replicas=0 -n datingapp
```

#### Step 2: Promote Read Replica
```bash
# List available replicas
az postgres flexible-server replica list \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  -o table

# Promote geo-replica to standalone server
az postgres flexible-server replica stop-replication \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres-geo-replica

# Verify promotion
az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres-geo-replica \
  --query "{name:name, state:state, replicationRole:replicationRole}" \
  -o table
# Expected replicationRole: None (independent server)
```

#### Step 3: Verify Data Integrity
```bash
# Connect to new primary
psql "host=flamoral-prod-postgres-geo-replica.postgres.database.azure.com \
      port=5432 \
      dbname=datingapp \
      user=psqladmin \
      sslmode=require" <<EOF
-- Check database size
SELECT pg_size_pretty(pg_database_size('datingapp')) as db_size;

-- Check table counts
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables
ORDER BY schemaname, tablename;

-- Verify recent data
SELECT COUNT(*) as recent_users FROM users WHERE created_at > NOW() - INTERVAL '1 hour';
SELECT COUNT(*) as recent_messages FROM messages WHERE created_at > NOW() - INTERVAL '1 hour';
EOF
```

#### Step 4: Update Application Configuration
See: [Connection String Updates](#connection-string-updates)

### Scenario 3: Point-in-Time Recovery to New Server

**When to use:** Data corruption, accidental deletion, ransomware

#### Step 1: Determine Recovery Point
```bash
# List available backups
az postgres flexible-server backup list \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  -o table

# Determine point in time (before corruption)
# Example: Restore to 30 minutes ago
RECOVERY_TIME=$(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ)
echo "Recovery point: $RECOVERY_TIME"
```

#### Step 2: Create Restored Server
```bash
# Restore to new server
az postgres flexible-server restore \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres-restored \
  --source-server flamoral-prod-postgres \
  --restore-time "$RECOVERY_TIME"

# Monitor restore progress
watch -n 10 'az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres-restored \
  --query "state" -o tsv'
```

#### Step 3: Validate Restored Data
```bash
# Connect to restored server
psql "host=flamoral-prod-postgres-restored.postgres.database.azure.com \
      port=5432 \
      dbname=datingapp \
      user=psqladmin \
      sslmode=require" <<EOF
-- Verify data before corruption
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM messages WHERE created_at < '$RECOVERY_TIME';

-- Check for corrupted records
SELECT * FROM your_table WHERE id = 'corrupted_record_id';
EOF
```

#### Step 4: Switch Application to Restored Server
See: [Connection String Updates](#connection-string-updates)

## Connection String Updates

### Method 1: Update Kubernetes Secrets (Recommended)

#### Step 1: Create New Secret
```bash
# Get current secret
kubectl get secret postgres-credentials -n datingapp -o yaml > postgres-secret-backup.yaml

# Create new connection string
NEW_DB_HOST="flamoral-prod-postgres-restored.postgres.database.azure.com"
NEW_CONNECTION_STRING="postgresql://psqladmin:${DB_PASSWORD}@${NEW_DB_HOST}:5432/datingapp?sslmode=require"

# Update secret
kubectl create secret generic postgres-credentials \
  --from-literal=connection-string="$NEW_CONNECTION_STRING" \
  --from-literal=host="$NEW_DB_HOST" \
  --from-literal=database="datingapp" \
  --from-literal=username="psqladmin" \
  --from-literal=password="$DB_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f - -n datingapp
```

#### Step 2: Restart Application Pods
```bash
# Restart deployments to pick up new secret
kubectl rollout restart deployment/dating-api -n datingapp
kubectl rollout restart deployment/dating-worker -n datingapp
kubectl rollout restart deployment/dating-scheduler -n datingapp

# Monitor rollout
kubectl rollout status deployment/dating-api -n datingapp
kubectl rollout status deployment/dating-worker -n datingapp
kubectl rollout status deployment/dating-scheduler -n datingapp
```

#### Step 3: Verify Connectivity
```bash
# Check application logs
kubectl logs -n datingapp deployment/dating-api --tail=50 | grep -i database

# Test database connectivity from pod
kubectl exec -n datingapp deployment/dating-api -- \
  curl -s localhost:8080/health/database | jq

# Verify connection count
psql "host=$NEW_DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  -c "SELECT count(*) as connections FROM pg_stat_activity WHERE datname = 'datingapp';"
```

### Method 2: Update via ConfigMap (Alternative)

```bash
# Update ConfigMap
kubectl create configmap database-config \
  --from-literal=DB_HOST="$NEW_DB_HOST" \
  --from-literal=DB_PORT="5432" \
  --from-literal=DB_NAME="datingapp" \
  --from-literal=DB_SSL_MODE="require" \
  --dry-run=client -o yaml | kubectl apply -f - -n datingapp

# Restart deployments
kubectl rollout restart deployment/dating-api -n datingapp
```

### Method 3: Update Azure Key Vault (Production)

```bash
# Update connection string in Key Vault
az keyvault secret set \
  --vault-name datingapp-prod-kv \
  --name postgres-connection-string \
  --value "$NEW_CONNECTION_STRING"

# If using CSI driver, pods will auto-update within 2 minutes
# Or force restart
kubectl rollout restart deployment/dating-api -n datingapp
```

## Data Verification

### Post-Failover Verification Checklist

#### 1. Connection Verification
```bash
# Test basic connectivity
psql "host=$DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  -c "SELECT 'Connection successful' as status;"

# Check server role
psql "host=$DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  -c "SELECT pg_is_in_recovery() as is_replica;"
# Expected: false (is primary)
```

#### 2. Data Integrity Checks
```bash
psql "host=$DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" <<EOF
-- Table counts
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'matches', COUNT(*) FROM matches
UNION ALL
SELECT 'photos', COUNT(*) FROM photos;

-- Recent data (last hour)
SELECT
  COUNT(*) as new_users,
  (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '1 hour') as new_messages,
  (SELECT COUNT(*) FROM matches WHERE created_at > NOW() - INTERVAL '1 hour') as new_matches
FROM users
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Check for data anomalies
SELECT
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows
FROM pg_stat_user_tables
ORDER BY schemaname, tablename;
EOF
```

#### 3. Replication Verification
```bash
psql "host=$DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" <<EOF
-- Check replication slots
SELECT slot_name, slot_type, active, restart_lsn
FROM pg_replication_slots;

-- Check replication status
SELECT
  client_addr,
  state,
  sync_state,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) as lag_bytes,
  replay_lag
FROM pg_stat_replication;
EOF
```

#### 4. Performance Verification
```bash
psql "host=$DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" <<EOF
-- Check cache hit ratio
SELECT
  'cache_hit_ratio' as metric,
  round(100.0 * sum(blks_hit) / nullif(sum(blks_hit + blks_read), 0), 2) as percentage
FROM pg_stat_database;

-- Check query performance
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check locks
SELECT
  locktype,
  COUNT(*) as lock_count
FROM pg_locks
GROUP BY locktype;
EOF
```

#### 5. Application-Level Verification
```bash
# Run smoke tests
cd /path/to/tests
npm run test:smoke

# Test critical endpoints
# Login
curl -X POST https://api.flamoral.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' | jq

# Get matches
curl -X GET https://api.flamoral.com/v1/matches \
  -H "Authorization: Bearer $TEST_TOKEN" | jq

# Send message
curl -X POST https://api.flamoral.com/v1/messages \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipient_id":"123","content":"test"}' | jq
```

## Rollback Procedures

### Scenario 1: Rollback from Standby to Original Primary

**When to use:** Failover was premature, original primary is healthy

```bash
# Step 1: Verify original primary is healthy
az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --query "state" -o tsv

# Step 2: Check replication lag (should be minimal)
psql "host=flamoral-prod-postgres.postgres.database.azure.com \
      port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  -c "SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) as lag_bytes
      FROM pg_stat_replication;"

# Step 3: Failback to original (if HA enabled, this is automatic sync)
# Wait for HA to re-establish
watch -n 5 'az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --query "highAvailability.state" -o tsv'

# Step 4: Verify operations
psql "host=flamoral-prod-postgres.postgres.database.azure.com \
      port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  -c "SELECT 'Rollback successful' as status;"
```

### Scenario 2: Rollback from Promoted Replica

**When to use:** Promoted replica has issues, need to revert

```bash
# Step 1: Stop application traffic
kubectl scale deployment/dating-api --replicas=0 -n datingapp

# Step 2: Point-in-time restore of original server
RESTORE_TIME=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)

az postgres flexible-server restore \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres-rollback \
  --source-server flamoral-prod-postgres \
  --restore-time "$RESTORE_TIME"

# Step 3: Update connection strings to rollback server
NEW_DB_HOST="flamoral-prod-postgres-rollback.postgres.database.azure.com"

kubectl create secret generic postgres-credentials \
  --from-literal=host="$NEW_DB_HOST" \
  --dry-run=client -o yaml | kubectl apply -f - -n datingapp

# Step 4: Restart application
kubectl scale deployment/dating-api --replicas=3 -n datingapp

# Step 5: Verify
kubectl exec -n datingapp deployment/dating-api -- \
  curl -s localhost:8080/health/database | jq
```

### Scenario 3: Emergency Rollback During Active Failover

**When to use:** Failover is causing data inconsistency

```bash
# Step 1: IMMEDIATELY stop all writes
kubectl scale deployment/dating-api --replicas=0 -n datingapp
kubectl scale deployment/dating-worker --replicas=0 -n datingapp

# Step 2: Document current state
psql "host=$CURRENT_DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" <<EOF > failover-state.log
SELECT NOW() as timestamp;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as message_count FROM messages;
SELECT pg_current_wal_lsn() as current_lsn;
EOF

# Step 3: Revert connection strings to last known good
kubectl apply -f postgres-secret-backup.yaml

# Step 4: Restart applications on old primary
kubectl scale deployment/dating-api --replicas=3 -n datingapp

# Step 5: Document issue and create incident report
```

## Common Scenarios

### Scenario 1: High CPU on Primary Database

**Symptoms:** Slow queries, connection timeouts, high CPU utilization

```bash
# Identify expensive queries
psql "host=$DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" <<EOF
SELECT
  pid,
  age(clock_timestamp(), query_start) as duration,
  query,
  state
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < now() - interval '30 seconds'
ORDER BY duration DESC
LIMIT 10;
EOF

# Kill long-running queries if necessary
psql "host=$DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = <PID>;"

# If persistent, consider read replica offload
# Update application to use read replica for read queries
```

### Scenario 2: Replication Lag Exceeds Threshold

**Symptoms:** Standby/replica is behind primary by >1MB

```bash
# Check replication lag
psql "host=$DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" <<EOF
SELECT
  client_addr,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) / 1024 / 1024 as lag_mb,
  replay_lag
FROM pg_stat_replication;
EOF

# If lag is growing:
# 1. Check network connectivity to replica
# 2. Check replica resource utilization
# 3. Consider increasing wal_sender_timeout
# 4. If critical, may need to rebuild replica
```

### Scenario 3: Connection Pool Exhaustion

**Symptoms:** "too many connections" errors

```bash
# Check current connections
psql "host=$DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" <<EOF
SELECT
  COUNT(*) as total_connections,
  (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
FROM pg_stat_activity;

SELECT
  datname,
  count(*) as connections
FROM pg_stat_activity
GROUP BY datname
ORDER BY connections DESC;
EOF

# Temporary fix: Kill idle connections
psql "host=$DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" <<EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < now() - interval '5 minutes'
  AND pid != pg_backend_pid();
EOF

# Long-term fix: Increase max_connections or fix connection pooling
# See: SERVICE_RESTART_PROCEDURES.md
```

### Scenario 4: Disk Space Critical

**Symptoms:** Disk usage >90%, writes failing

```bash
# Check database size
psql "host=$DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" <<EOF
SELECT
  pg_size_pretty(pg_database_size('datingapp')) as db_size,
  pg_size_pretty(pg_total_relation_size('users')) as users_size,
  pg_size_pretty(pg_total_relation_size('messages')) as messages_size;

-- Check for bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  n_dead_tup as dead_tuples
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
EOF

# Run VACUUM to reclaim space
psql "host=$DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" \
  -c "VACUUM FULL ANALYZE;"

# Or scale up storage
az postgres flexible-server update \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --storage-size 1024
```

## Troubleshooting

### Issue: Failover Not Completing

**Problem:** Failover stuck in "FailingOver" state

```bash
# Check failover status
az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --query "highAvailability" -o json

# Check activity log for errors
az monitor activity-log list \
  --resource-group datingapp-prod-rg \
  --namespace Microsoft.DBforPostgreSQL \
  --offset 30m \
  --query "[].{time:eventTimestamp, level:level, status:status.value, message:properties.message}" \
  -o table

# Contact Azure support if stuck >10 minutes
```

### Issue: Application Can't Connect After Failover

**Problem:** Connection refused or timeout errors

```bash
# Verify DNS resolution
nslookup flamoral-prod-postgres.postgres.database.azure.com

# Test connectivity from cluster
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- \
  psql "host=flamoral-prod-postgres.postgres.database.azure.com \
        port=5432 \
        dbname=datingapp \
        user=psqladmin \
        sslmode=require" \
  -c "SELECT 1;"

# Check firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  -o table

# Verify secret is updated
kubectl get secret postgres-credentials -n datingapp -o jsonpath='{.data.host}' | base64 -d
```

### Issue: Data Missing After Failover

**Problem:** Recent transactions not present

```bash
# Check last WAL position on old primary (if accessible)
# Compare with new primary

# Determine data loss window
psql "host=$NEW_DB_HOST port=5432 dbname=datingapp user=psqladmin sslmode=require" <<EOF
SELECT
  MAX(created_at) as last_user,
  (SELECT MAX(created_at) FROM messages) as last_message,
  (SELECT MAX(created_at) FROM matches) as last_match
FROM users;
EOF

# If data loss is unacceptable, restore from point-in-time backup
# See: DATA_RECOVERY_RUNBOOK.md
```

### Issue: Replica Promotion Failed

**Problem:** Read replica won't promote to primary

```bash
# Check replica status
az postgres flexible-server show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres-replica \
  --query "{state:state, replicationRole:replicationRole}" \
  -o table

# Check for locks or active transactions
psql "host=flamoral-prod-postgres-replica.postgres.database.azure.com \
      port=5432 dbname=datingapp user=psqladmin sslmode=require" <<EOF
SELECT * FROM pg_stat_activity WHERE state != 'idle';
SELECT * FROM pg_locks;
EOF

# Force promotion (WARNING: May cause data loss)
az postgres flexible-server replica stop-replication \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres-replica \
  --yes
```

## Monitoring and Alerts

### Key Metrics to Monitor

```bash
# Set up alerts for:
# - Replication lag > 5 minutes
# - Failover events
# - Connection count > 80% of max
# - Disk usage > 85%
# - CPU > 80% for 10 minutes

# Example: Create replication lag alert
az monitor metrics alert create \
  --name "postgres-replication-lag" \
  --resource-group datingapp-prod-rg \
  --scopes /subscriptions/.../resourceGroups/datingapp-prod-rg/providers/Microsoft.DBforPostgreSQL/flexibleServers/flamoral-prod-postgres \
  --condition "max replica_lag > 300" \
  --description "PostgreSQL replication lag exceeds 5 minutes" \
  --evaluation-frequency 1m \
  --window-size 5m \
  --severity 2
```

## Best Practices

1. **Regular Failover Drills:** Test failover quarterly
2. **Monitor Replication Lag:** Keep lag <1 minute
3. **Backup Verification:** Test restores monthly
4. **Connection Pooling:** Use PgBouncer or built-in pooling
5. **Resource Monitoring:** Set alerts before reaching limits
6. **Documentation:** Keep runbook updated with each failover
7. **Communication:** Update team immediately on failover events

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-17 | Database Team | Initial creation |

---

**Document Status:** Active
**Next Review Date:** 2026-01-17
**Document Owner:** Database SRE Team Lead
