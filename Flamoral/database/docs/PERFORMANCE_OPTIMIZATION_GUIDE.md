# Database Performance Optimization Guide

## Quick Start

This guide provides step-by-step instructions for implementing and managing database performance optimizations for the Flamoral Dating Platform.

---

## Table of Contents
1. [Running Migrations](#running-migrations)
2. [Connection Pool Configuration](#connection-pool-configuration)
3. [Performance Monitoring](#performance-monitoring)
4. [Read Replica Setup](#read-replica-setup)
5. [Maintenance Operations](#maintenance-operations)
6. [Troubleshooting](#troubleshooting)

---

## Running Migrations

### 1. Apply Index Optimizations

#### User Service
```bash
cd backend/services/user-service

# Run the index optimization migration
npx knex migrate:latest --env production

# Verify indexes were created
npx knex migrate:status
```

#### Matching Service
```bash
cd backend/services/matching-service

# Run the index optimization migration
npx knex migrate:latest --env production

# Verify with query
psql -d flamoral_matching -c "SELECT indexname FROM pg_indexes WHERE schemaname = 'public';"
```

#### Media Service
```bash
cd backend/services/media-service
npx knex migrate:latest --env production
```

#### Payment Service
```bash
cd backend/services/payment-service
npx knex migrate:latest --env production
```

### 2. Verify Index Creation

Check that indexes were created successfully:

```sql
-- List all indexes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_indexes
JOIN pg_stat_user_indexes USING (schemaname, tablename, indexname)
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### 3. Monitor Index Usage

After deployment, monitor index usage:

```bash
cd database/scripts
npm run db:monitor -- --indexes
```

---

## Connection Pool Configuration

### 1. Update Service Configuration

#### For User Service (High Traffic)

**File**: `backend/services/user-service/src/infrastructure/database/knexfile.ts`

```typescript
import { ConnectionPoolPresets } from '@flamoral/shared/database/connection-pool-config';

const environment = process.env.NODE_ENV || 'development';
const config = ConnectionPoolPresets.userService(environment);

export default config;
```

#### For Other Services

Replace the service name in `ConnectionPoolPresets`:
- `matchingService` - High traffic
- `paymentService` - Medium traffic
- `mediaService` - Medium traffic
- `analyticsService` - Low traffic

### 2. Environment Variables

Add to `.env`:

```env
# Connection Pool Settings
DB_POOL_MIN=10
DB_POOL_MAX=50

# Timeouts
DB_ACQUIRE_TIMEOUT=30000
DB_CREATE_TIMEOUT=30000
DB_IDLE_TIMEOUT=30000

# PostgreSQL Performance
DB_STATEMENT_TIMEOUT=30000
DB_QUERY_TIMEOUT=30000
```

### 3. Test Connection Pool

```typescript
import { checkPoolHealth } from '@flamoral/shared/database/connection-pool-config';
import db from './infrastructure/database/connection';

// Check pool health
const health = await checkPoolHealth(db);
console.log('Pool Health:', health);
```

---

## Performance Monitoring

### 1. Setup Performance Monitor

**File**: `backend/services/user-service/src/infrastructure/database/monitor.ts`

```typescript
import { performanceMonitor, comprehensiveHealthCheck } from '@flamoral/shared/database/performance-monitoring';
import db from './connection';

// Track all queries
db.on('query', (query) => {
  const startTime = Date.now();

  query.response((response, obj) => {
    const duration = Date.now() - startTime;
    performanceMonitor.trackQuery(
      query.sql,
      duration,
      !response.error,
      response.error?.message
    );
  });
});

// Run health check every 5 minutes
setInterval(async () => {
  const health = await comprehensiveHealthCheck(db);
  console.log('Database Health:', health);

  // Log slow queries
  if (health.longRunningQueries.count > 0) {
    console.warn('Long running queries detected:', health.longRunningQueries.details);
  }
}, 5 * 60 * 1000);
```

### 2. Query Performance Dashboard

```typescript
import { performanceMonitor } from '@flamoral/shared/database/performance-monitoring';

// Get query statistics
app.get('/api/admin/db-stats', async (req, res) => {
  const stats = performanceMonitor.getQueryStats();
  const slowQueries = performanceMonitor.getSlowQueries(20);

  res.json({
    stats,
    slowQueries
  });
});
```

### 3. Monitor Key Metrics

```bash
# Check pool statistics
npm run db:monitor -- --pool

# Check index usage
npm run db:monitor -- --indexes

# Check slow queries
npm run db:monitor -- --slow-queries

# Comprehensive health check
npm run db:health-check
```

---

## Read Replica Setup

### 1. Configure Read Replicas

**Environment Variables** (`.env`):

```env
# Primary Database
DB_HOST=flamoral-primary.postgres.azure.com
DB_PORT=5432
DB_NAME=flamoral_users
DB_USER=admin
DB_PASSWORD=your_password

# Read Replicas
DB_REPLICA_COUNT=2

# Replica 1 (Same region)
DB_REPLICA_1_HOST=flamoral-replica1.postgres.azure.com
DB_REPLICA_1_PORT=5432
DB_REPLICA_1_NAME=flamoral_users
DB_REPLICA_1_USER=admin
DB_REPLICA_1_PASSWORD=your_password
DB_REPLICA_1_PRIORITY=1

# Replica 2 (Different region)
DB_REPLICA_2_HOST=flamoral-replica2.postgres.azure.com
DB_REPLICA_2_PORT=5432
DB_REPLICA_2_NAME=flamoral_users
DB_REPLICA_2_USER=admin
DB_REPLICA_2_PASSWORD=your_password
DB_REPLICA_2_PRIORITY=2
```

### 2. Initialize Database Manager

**File**: `backend/services/user-service/src/infrastructure/database/manager.ts`

```typescript
import { initializeDatabaseConnections } from '@flamoral/shared/database/read-replica-config';

const environment = process.env.NODE_ENV as 'development' | 'production';

// Initialize connections
const { manager, router } = await initializeDatabaseConnections(
  environment,
  'high-traffic'
);

export { manager, router };
```

### 3. Update Repository to Use Read Replicas

**Before**:
```typescript
async findById(id: string): Promise<User | null> {
  return db('users').where({ id }).first();
}
```

**After**:
```typescript
import { router } from '../infrastructure/database/manager';

async findById(id: string): Promise<User | null> {
  return router.route('read', async (knex) => {
    return knex('users').where({ id }).first();
  });
}

async create(userData: CreateUserDto): Promise<User> {
  return router.route('write', async (knex) => {
    const [user] = await knex('users').insert(userData).returning('*');
    return user;
  });
}
```

### 4. Monitor Replication Lag

```typescript
import { manager } from './infrastructure/database/manager';

// Check replication lag every minute
setInterval(async () => {
  const lags = await manager.checkReplicationLag();

  lags.forEach(lag => {
    console.log(`Replica ${lag.replicaHost}: ${lag.lagSeconds}s lag`);

    if (lag.lagSeconds > 5) {
      console.warn(`High replication lag on ${lag.replicaHost}`);
    }
  });
}, 60 * 1000);
```

---

## Maintenance Operations

### 1. Schedule Automated Maintenance

**File**: `database/scripts/maintenance/scheduler.ts`

```typescript
import * as cron from 'node-cron';
import DatabaseMaintenance from './vacuum-analyze';
import IndexMaintenance from './rebuild-indexes';
import StatisticsManager from './update-statistics';

// Daily VACUUM at 2 AM
cron.schedule('0 2 * * *', async () => {
  const maintenance = new DatabaseMaintenance();
  await maintenance.vacuum({ analyze: true });
  await maintenance.close();
});

// Weekly full VACUUM on Sunday at 2 AM
cron.schedule('0 2 * * 0', async () => {
  const maintenance = new DatabaseMaintenance();
  await maintenance.vacuum({ full: true, analyze: true });
  await maintenance.close();
});

// Rebuild indexes monthly on first Sunday at 3 AM
cron.schedule('0 3 1-7 * 0', async () => {
  const indexMaint = new IndexMaintenance();
  await indexMaint.rebuildAll({ concurrent: true, minSizeMB: 10 });
  await indexMaint.close();
});

// Update statistics every 6 hours
cron.schedule('0 */6 * * *', async () => {
  const statsMgr = new StatisticsManager();
  await statsMgr.analyzeAll();
  await statsMgr.close();
});
```

### 2. Run Maintenance Manually

#### VACUUM and ANALYZE
```bash
# Vacuum all tables
npm run db:vacuum

# Vacuum specific table
npm run db:vacuum -- --table=users

# Full vacuum (requires downtime)
npm run db:vacuum -- --full

# Vacuum with verbose output
npm run db:vacuum -- --verbose
```

#### Rebuild Indexes
```bash
# Rebuild all indexes (concurrent, no locks)
npm run db:rebuild-indexes -- --concurrent

# Rebuild specific table indexes
npm run db:rebuild-indexes -- --table=matches --concurrent

# Rebuild large indexes only
npm run db:rebuild-indexes -- --min-size=10
```

#### Update Statistics
```bash
# Update all table statistics
npm run db:update-stats

# Update specific table
npm run db:update-stats -- --table=users

# Schedule automatic updates
npm run db:update-stats -- --schedule
```

### 3. Monitor Table Bloat

```sql
-- Check table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  n_dead_tup AS dead_tuples,
  n_live_tup AS live_tuples,
  ROUND(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS bloat_percentage
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY n_dead_tup DESC
LIMIT 20;
```

---

## Troubleshooting

### Slow Queries

#### 1. Identify Slow Queries
```typescript
import { getLongRunningQueries } from '@flamoral/shared/database/performance-monitoring';

const slowQueries = await getLongRunningQueries(db, 5); // > 5 seconds
console.table(slowQueries);
```

#### 2. Analyze Query Plan
```sql
EXPLAIN ANALYZE
SELECT u.*, p.*
FROM users u
JOIN profiles p ON u.id = p.user_id
WHERE u.email = 'user@example.com';
```

#### 3. Add Missing Index
```sql
-- If query plan shows sequential scan
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

### High Connection Count

#### 1. Check Active Connections
```sql
SELECT
  count(*) as connection_count,
  state,
  wait_event_type
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state, wait_event_type
ORDER BY connection_count DESC;
```

#### 2. Kill Idle Connections
```sql
-- Kill idle connections older than 30 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < now() - interval '30 minutes'
  AND pid != pg_backend_pid();
```

#### 3. Increase Pool Size
```env
DB_POOL_MAX=100  # Increase from 50
```

### High Replication Lag

#### 1. Check Replication Status
```typescript
const lags = await manager.checkReplicationLag();
console.table(lags);
```

#### 2. Identify Cause
```sql
-- Check replication slots
SELECT * FROM pg_replication_slots;

-- Check WAL sender status
SELECT * FROM pg_stat_replication;
```

#### 3. Temporary Failover
```typescript
// Route reads to primary temporarily
await router.route('read', queryBuilder, true); // forcePrimary = true
```

### Lock Contention

#### 1. Identify Locks
```typescript
import { getActiveLocks } from '@flamoral/shared/database/performance-monitoring';

const locks = await getActiveLocks(db);
console.table(locks);
```

#### 2. Kill Blocking Query
```typescript
import { killQuery } from '@flamoral/shared/database/performance-monitoring';

await killQuery(db, blockingPid);
```

### Low Cache Hit Ratio

#### 1. Check Cache Stats
```typescript
import { getCacheHitRatio } from '@flamoral/shared/database/performance-monitoring';

const cacheStats = await getCacheHitRatio(db);
console.log(`Cache Hit Ratio: ${cacheStats.cache_hit_ratio}%`);
```

#### 2. Increase Cache Size
```sql
-- Increase shared_buffers (requires restart)
ALTER SYSTEM SET shared_buffers = '8GB';
SELECT pg_reload_conf();
```

### Unused Indexes

#### 1. Find Unused Indexes
```typescript
import { getUnusedIndexes } from '@flamoral/shared/database/performance-monitoring';

const unused = await getUnusedIndexes(db, 5); // > 5MB
console.table(unused);
```

#### 2. Drop Unused Indexes
```sql
-- Drop after verification
DROP INDEX CONCURRENTLY idx_unused_index;
```

---

## Performance Checklist

### Daily
- [ ] Check pool health
- [ ] Monitor slow queries (> 1s)
- [ ] Check replication lag (< 5s)
- [ ] Review error logs

### Weekly
- [ ] Run VACUUM ANALYZE
- [ ] Check table bloat (< 20%)
- [ ] Review index usage
- [ ] Check disk space (< 80%)

### Monthly
- [ ] Full VACUUM (during maintenance window)
- [ ] Rebuild bloated indexes
- [ ] Review and drop unused indexes
- [ ] Performance report generation
- [ ] Backup verification test

---

## Best Practices

### Query Optimization
1. Use indexes for WHERE, JOIN, ORDER BY
2. Limit result sets with LIMIT
3. Use prepared statements
4. Avoid N+1 queries
5. Use EXPLAIN ANALYZE

### Connection Management
1. Use connection pooling
2. Close connections promptly
3. Monitor pool metrics
4. Set appropriate timeouts
5. Use read replicas for reads

### Maintenance
1. Schedule regular VACUUM
2. Update statistics frequently
3. Monitor and rebuild indexes
4. Archive old data
5. Test backups regularly

---

## Resources

- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Index Usage Patterns](https://www.postgresql.org/docs/current/indexes.html)
- [Azure Cosmos DB Best Practices](https://docs.microsoft.com/azure/cosmos-db/performance-tips)

---

For additional support, contact the Database Team or refer to [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md).
