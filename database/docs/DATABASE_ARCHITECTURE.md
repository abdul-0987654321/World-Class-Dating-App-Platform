# Flamoral Dating Platform - Database Architecture

## Table of Contents
1. [Overview](#overview)
2. [Database Technology Stack](#database-technology-stack)
3. [Database Schema Design](#database-schema-design)
4. [Performance Optimization](#performance-optimization)
5. [Scaling Strategy](#scaling-strategy)
6. [High Availability](#high-availability)
7. [Backup and Recovery](#backup-and-recovery)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)

---

## Overview

The Flamoral Dating Platform uses a hybrid database architecture combining PostgreSQL for relational data and Azure Cosmos DB for messaging, optimized for high performance, scalability, and reliability.

### Design Principles
- **Performance First**: Optimized indexes, connection pooling, and query optimization
- **Scalability**: Horizontal and vertical scaling capabilities
- **High Availability**: Read replicas, automatic failover, and multi-region support
- **Data Integrity**: ACID compliance for critical operations
- **Cost Efficiency**: Resource optimization and auto-scaling

---

## Database Technology Stack

### PostgreSQL (Primary Database)
**Version**: 14+

**Services Using PostgreSQL**:
- User Service
- Matching Service
- Payment Service
- Media Service
- Analytics Service
- Notification Service

**Key Features**:
- ACID compliance
- Advanced indexing (B-tree, GiST, GIN, BRIN)
- Full-text search
- JSONB support
- Geospatial queries (PostGIS)
- Materialized views

### Azure Cosmos DB (Messaging)
**API**: Core (SQL)

**Services Using Cosmos DB**:
- Messaging Service (conversations and messages)

**Key Features**:
- Globally distributed
- Multi-region writes
- Automatic indexing
- Low latency (<10ms)
- Horizontal partitioning

---

## Database Schema Design

### Core Entities

#### 1. User Service Schema
```
users
├── id (UUID, PK)
├── email (UNIQUE, INDEXED)
├── phone_number (INDEXED)
├── password_hash
├── first_name
├── last_name
├── date_of_birth
├── gender
├── is_active (INDEXED)
├── is_verified
├── last_login_at (INDEXED)
├── created_at
└── updated_at

profiles
├── id (UUID, PK)
├── user_id (FK -> users.id, INDEXED)
├── bio
├── occupation
├── education
├── height
├── city (INDEXED)
├── latitude (GIST INDEXED)
├── longitude (GIST INDEXED)
├── interests (JSONB, GIN INDEXED)
├── languages (JSONB, GIN INDEXED)
└── is_photo_verified

preferences
├── id (UUID, PK)
├── user_id (FK -> users.id)
├── min_age
├── max_age
├── max_distance (INDEXED)
├── interested_in (JSONB, GIN INDEXED)
└── dealbreakers (JSONB)
```

#### 2. Matching Service Schema
```
swipes
├── id (UUID, PK)
├── user_id (INDEXED)
├── target_user_id (INDEXED)
├── action (like/pass/super_like)
├── created_at
└── UNIQUE(user_id, target_user_id)

matches
├── id (UUID, PK)
├── user1_id (INDEXED)
├── user2_id (INDEXED)
├── status (matched/unmatched/blocked, INDEXED)
├── compatibility_score
├── matched_at
├── last_activity_at
├── expires_at (INDEXED)
├── first_message_sent
└── UNIQUE(user1_id, user2_id)
```

#### 3. Messaging Service Schema (Cosmos DB)
```json
// Messages Container (Partition Key: conversationId)
{
  "id": "uuid",
  "conversationId": "uuid",
  "senderId": "uuid",
  "receiverId": "uuid",
  "content": "encrypted string",
  "messageType": "text|image|video|voice",
  "status": "sent|delivered|read",
  "isRead": false,
  "timestamp": "ISO8601",
  "attachments": [],
  "reactions": []
}

// Conversations Container (Partition Key: matchId)
{
  "id": "uuid",
  "matchId": "uuid",
  "user1Id": "uuid",
  "user2Id": "uuid",
  "lastMessage": "string",
  "lastMessageAt": "ISO8601",
  "unreadCountUser1": 0,
  "unreadCountUser2": 0,
  "isActive": true,
  "createdAt": "ISO8601"
}
```

#### 4. Payment Service Schema
```
subscription_plans
├── id (UUID, PK)
├── name (free/premium/premium_plus)
├── price_monthly
├── price_yearly
├── stripe_product_id (INDEXED)
├── features (JSONB)
└── is_active (INDEXED)

user_subscriptions
├── id (UUID, PK)
├── user_id (INDEXED)
├── plan_id (FK)
├── stripe_subscription_id (UNIQUE, INDEXED)
├── status (active/canceled/past_due, INDEXED)
├── current_period_start
├── current_period_end (INDEXED)
└── cancel_at_period_end

transactions
├── id (UUID, PK)
├── user_id (INDEXED)
├── type (subscription/coin_purchase, INDEXED)
├── status (succeeded/failed/pending, INDEXED)
├── amount
├── currency
├── stripe_payment_intent_id (INDEXED)
└── processed_at (INDEXED)
```

#### 5. Media Service Schema
```
media
├── id (UUID, PK)
├── user_id (INDEXED)
├── file_name
├── mime_type
├── size
├── urls (JSONB)
├── is_profile_photo (INDEXED)
├── moderation_status (pending/approved/rejected, INDEXED)
├── uploaded_at
└── COMPOSITE INDEX(user_id, is_profile_photo, uploaded_at)
```

---

## Performance Optimization

### Indexing Strategy

#### 1. B-tree Indexes (Default)
Used for:
- Primary keys
- Foreign keys
- Equality and range queries
- Sorting operations

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_matches_user1_status ON matches(user1_id, status);
```

#### 2. Partial Indexes
Used for filtering specific subsets:

```sql
-- Index only active users
CREATE INDEX idx_users_active ON users(email) WHERE is_active = true;

-- Index only pending moderation
CREATE INDEX idx_media_pending ON media(uploaded_at)
WHERE moderation_status = 'pending';
```

#### 3. Composite Indexes
Used for multi-column queries:

```sql
CREATE INDEX idx_matches_user_status_date
ON matches(user1_id, status, matched_at DESC);
```

#### 4. Covering Indexes (with INCLUDE)
Used to avoid table lookups:

```sql
CREATE INDEX idx_matches_covering
ON matches(user1_id, matched_at DESC)
INCLUDE (user2_id, status, compatibility_score);
```

#### 5. GiST Indexes (Geospatial)
Used for location-based queries:

```sql
CREATE INDEX idx_profiles_location
ON profiles USING gist(ll_to_earth(latitude, longitude));
```

#### 6. GIN Indexes (JSONB/Arrays)
Used for array and JSONB queries:

```sql
CREATE INDEX idx_profiles_interests
ON profiles USING gin(interests);
```

### Query Optimization

#### Connection Pooling Configuration
```typescript
// Production settings
pool: {
  min: 10,
  max: 50,
  acquireTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
}
```

#### Statement Timeouts
```sql
-- Set statement timeout to prevent runaway queries
SET statement_timeout = '30s';
```

#### Query Hints
```sql
-- Force index usage
SELECT /*+ IndexScan(users idx_users_email) */ *
FROM users WHERE email = 'user@example.com';
```

### Materialized Views

For expensive aggregations:

```sql
CREATE MATERIALIZED VIEW mv_daily_revenue AS
SELECT
  DATE(processed_at) as date,
  type,
  SUM(amount) as total_revenue,
  COUNT(*) as transaction_count
FROM transactions
WHERE status = 'succeeded'
GROUP BY DATE(processed_at), type;

-- Refresh daily
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;
```

### Cosmos DB Optimization

#### Indexing Policy
```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [
    {"path": "/conversationId/?"},
    {"path": "/timestamp/?"}
  ],
  "excludedPaths": [
    {"path": "/content/?"},
    {"path": "/encryptedContent/?"}
  ],
  "compositeIndexes": [
    [
      {"path": "/conversationId", "order": "ascending"},
      {"path": "/timestamp", "order": "descending"}
    ]
  ]
}
```

#### Partition Key Design
- **Messages**: `conversationId` - Groups all messages for a conversation
- **Conversations**: `matchId` - Groups conversation by match

---

## Scaling Strategy

### Vertical Scaling

#### PostgreSQL Instance Sizes

**Development/Test**:
- vCPUs: 2
- RAM: 4 GB
- Storage: 50 GB SSD

**Staging**:
- vCPUs: 4
- RAM: 16 GB
- Storage: 200 GB SSD

**Production**:
- vCPUs: 8-16
- RAM: 32-64 GB
- Storage: 500 GB - 1 TB SSD

### Horizontal Scaling

#### Read Replicas

**Configuration**:
```env
# Primary Database
DB_HOST=primary.postgres.azure.com
DB_PORT=5432

# Read Replicas
DB_REPLICA_COUNT=2
DB_REPLICA_1_HOST=replica1.postgres.azure.com
DB_REPLICA_1_PORT=5432
DB_REPLICA_1_PRIORITY=1

DB_REPLICA_2_HOST=replica2.postgres.azure.com
DB_REPLICA_2_PORT=5432
DB_REPLICA_2_PRIORITY=2
```

**Read/Write Split**:
```typescript
// Write operations -> Primary
await dbManager.write(async (knex) => {
  return knex('users').insert(userData);
});

// Read operations -> Replica
await dbManager.read(async (knex) => {
  return knex('users').where({ id: userId }).first();
});
```

**Replication Lag Monitoring**:
- Target: < 1 second
- Alert threshold: > 5 seconds
- Automatic failover if lag > 10 seconds

#### Database Sharding (Future)

**Shard Key**: `user_id`

**Sharding Strategy**:
1. **User-based sharding**: Hash `user_id` to determine shard
2. **Geographic sharding**: Route based on user location
3. **Functional sharding**: Separate tables by service

**Shard Distribution**:
```
Shard 1: user_id % 4 = 0 (25% of users)
Shard 2: user_id % 4 = 1 (25% of users)
Shard 3: user_id % 4 = 2 (25% of users)
Shard 4: user_id % 4 = 3 (25% of users)
```

### Cosmos DB Scaling

**Auto-scaling Configuration**:
- Min RU/s: 400
- Max RU/s: 100,000
- Auto-scale based on usage

**Multi-region Configuration**:
```
Primary: East US
Replicas:
  - West US (read)
  - West Europe (read)
  - Southeast Asia (read)
```

---

## High Availability

### PostgreSQL HA Setup

#### Primary-Replica Configuration
- **Synchronous replication** for critical data
- **Asynchronous replication** for read replicas
- **Automatic failover** with health checks

#### Failover Process
1. Health check detects primary failure
2. Promote replica to primary (< 30 seconds)
3. Update DNS/connection strings
4. Former primary becomes replica on recovery

#### Health Checks
```typescript
// Every 30 seconds
const health = await dbManager.healthCheck();
if (!health.primary) {
  // Trigger failover
  await failoverToPrimary();
}
```

### Cosmos DB HA

- **99.999% availability** with multi-region setup
- **Automatic failover** to read regions
- **Conflict resolution** for multi-write scenarios

---

## Backup and Recovery

### Backup Strategy

#### Automated Backups
- **Frequency**: Every 6 hours
- **Retention**: 30 days
- **Type**: Full + incremental

#### Point-in-Time Recovery (PITR)
- **Granularity**: 5 minutes
- **Retention**: 7 days
- **RTO**: < 1 hour
- **RPO**: < 5 minutes

#### Backup Verification
```bash
# Weekly backup restoration test
npm run db:test-restore --backup=latest
```

### Disaster Recovery

#### DR Plan
1. **Primary site failure**: Failover to secondary region (< 5 minutes)
2. **Database corruption**: Restore from backup (< 1 hour)
3. **Data center failure**: Activate DR site (< 30 minutes)

#### Recovery Procedures
```bash
# Restore from backup
pg_restore --host=primary.postgres.azure.com \
           --username=admin \
           --dbname=flamoral \
           backup_file.dump

# Verify data integrity
npm run db:verify-integrity
```

---

## Monitoring and Maintenance

### Performance Monitoring

#### Key Metrics
- **Query Performance**: p50, p95, p99 latency
- **Connection Pool**: Active, idle, waiting connections
- **Cache Hit Ratio**: Target > 99%
- **Index Usage**: Scans per index
- **Replication Lag**: Target < 1 second
- **Disk I/O**: IOPS, throughput
- **Table Bloat**: Dead tuples percentage

#### Monitoring Tools
```typescript
// Comprehensive health check
const health = await comprehensiveHealthCheck(knex);
console.log(health);

// Output:
{
  pool: { numUsed: 5, numFree: 15, numPendingAcquires: 0 },
  cacheHitRatio: 99.2,
  locks: { count: 0, details: [] },
  longRunningQueries: { count: 0, details: [] },
  unusedIndexes: { count: 2, details: [...] }
}
```

### Maintenance Schedule

#### Daily Maintenance
- **02:00**: VACUUM (lightweight)
- **02:30**: ANALYZE high-traffic tables
- **03:00**: Index statistics update
- **03:30**: Backup verification

#### Weekly Maintenance
- **Sunday 02:00**: VACUUM FULL (heavy)
- **Sunday 03:00**: REINDEX (concurrent)
- **Sunday 04:00**: Backup restoration test

#### Monthly Maintenance
- **First Sunday 01:00**: Full system backup
- **First Sunday 02:00**: Table bloat analysis
- **First Sunday 03:00**: Unused index cleanup
- **First Sunday 04:00**: Performance report generation

### Automated Maintenance Scripts

```bash
# Schedule VACUUM ANALYZE
npm run db:vacuum -- --schedule

# Schedule statistics updates
npm run db:update-stats -- --schedule

# Rebuild bloated indexes
npm run db:rebuild-indexes -- --concurrent --min-size=10
```

### Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Cache Hit Ratio | < 95% | < 90% |
| Replication Lag | > 2s | > 5s |
| Active Connections | > 80% | > 95% |
| Disk Usage | > 75% | > 90% |
| Query Duration (p99) | > 500ms | > 1s |
| Table Bloat | > 20% | > 40% |

---

## Best Practices

### Query Optimization
1. Always use prepared statements
2. Limit result sets with LIMIT/OFFSET
3. Use indexes for WHERE, JOIN, and ORDER BY
4. Avoid SELECT *
5. Use EXPLAIN ANALYZE for slow queries

### Schema Design
1. Normalize data appropriately
2. Use appropriate data types
3. Add constraints (PK, FK, UNIQUE, CHECK)
4. Use JSONB for flexible data
5. Consider partitioning for large tables

### Security
1. Use connection pooling with SSL
2. Encrypt data at rest
3. Implement row-level security
4. Audit sensitive operations
5. Regular security patches

### Cost Optimization
1. Right-size instances
2. Use auto-scaling
3. Archive old data
4. Optimize indexes (remove unused)
5. Use connection pooling

---

## Migration Strategy

### Zero-Downtime Migrations

```typescript
// 1. Create new index CONCURRENTLY
await knex.raw('CREATE INDEX CONCURRENTLY idx_new ON table(column);');

// 2. Verify index is built
await knex.raw('SELECT * FROM pg_indexes WHERE indexname = \'idx_new\';');

// 3. Swap indexes (atomic)
await knex.raw('BEGIN; DROP INDEX idx_old; ALTER INDEX idx_new RENAME TO idx_old; COMMIT;');
```

### Rollback Strategy
- Keep previous migration state
- Implement `down()` migration
- Test rollbacks in staging
- Monitor for issues post-migration

---

## Conclusion

The Flamoral Dating Platform's database architecture is designed for:
- **High Performance**: Optimized indexes, connection pooling, and query optimization
- **Scalability**: Horizontal and vertical scaling with read replicas
- **Reliability**: High availability, automated backups, and disaster recovery
- **Maintainability**: Automated maintenance, monitoring, and alerting

For questions or improvements, contact the Database Team.
