# Database Quick Start Guide

## Quick Commands

### Setup All Databases

```bash
# 1. Create all databases
createdb flamoral_users
createdb flamoral_users_test
createdb matching_service_dev
createdb matching_service_test
createdb media_service_dev
createdb media_service_test
createdb moderation_service_dev
createdb moderation_service_test
createdb advertising_service_dev
createdb advertising_service_test
createdb payment_service_dev
createdb payment_service_test
createdb notification_service_dev
createdb notification_service_test

# 2. Run all migrations (from backend root)
cd backend

# User Service
cd services/user-service
npm run migrate
npm run seed
cd ../..

# Matching Service
cd services/matching-service
npm run migrate
cd ../..

# Media Service
cd services/media-service
npm run migrate
cd ../..

# Other services as needed...
```

### Individual Service Operations

#### User Service
```bash
cd backend/services/user-service

# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Run seeds
npm run seed

# Run test migrations
npm run migrate:test

# Run test seeds
npm run seed:test
```

#### Matching Service
```bash
cd backend/services/matching-service

# Run migrations
npm run migrate

# Rollback
npm run migrate:rollback

# Seeds (if available)
npm run seed
```

#### Media Service
```bash
cd backend/services/media-service

# Run migrations
npm run migrate

# Rollback
npm run migrate:rollback

# Seeds (if available)
npm run seed
```

## Environment Setup

Create `.env` file in each service directory:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=service_name_dev
DB_USER=postgres
DB_PASSWORD=postgres

# Test Database
DB_NAME_TEST=service_name_test

# Pool Configuration
DB_POOL_MIN=2
DB_POOL_MAX=10

# Timeouts
DB_CONNECTION_TIMEOUT=30000
DB_QUERY_TIMEOUT=60000
```

## Common Issues & Solutions

### Issue: "relation already exists"
**Cause**: Migration already ran or table manually created
**Solution**:
```bash
# Check migration status
npx knex migrate:status --knexfile src/infrastructure/database/knexfile.ts

# If needed, rollback and re-run
npm run migrate:rollback
npm run migrate
```

### Issue: "Cannot find module 'path'"
**Cause**: Missing import in knexfile
**Solution**: Ensure knexfile has:
```typescript
import path from 'path';
```

### Issue: "Migration directory not found"
**Cause**: Incorrect path in knexfile
**Solution**: Use absolute paths:
```typescript
migrations: {
  directory: path.join(__dirname, 'migrations'),
  // NOT: directory: './migrations'
}
```

### Issue: "Database does not exist"
**Cause**: Database not created
**Solution**:
```bash
createdb your_database_name
```

### Issue: "ECONNREFUSED"
**Cause**: PostgreSQL not running
**Solution**:
```bash
# macOS
brew services start postgresql@14

# Linux
sudo systemctl start postgresql

# Check status
psql -U postgres -l
```

## Database Reset (Development Only)

### Reset Single Service Database

```bash
# User Service Example
dropdb flamoral_users
createdb flamoral_users
cd backend/services/user-service
npm run migrate
npm run seed
```

### Reset All Databases

```bash
# WARNING: This will delete ALL data!
cd backend

# Drop all databases
dropdb flamoral_users
dropdb matching_service_dev
dropdb media_service_dev
# ... etc

# Recreate and migrate (run setup script from above)
```

## Useful PostgreSQL Commands

### Connect to Database
```bash
psql -U postgres -d flamoral_users
```

### List All Databases
```bash
psql -U postgres -l
```

### List Tables
```sql
\dt
```

### Describe Table
```sql
\d table_name
```

### Check Migration Status
```sql
SELECT * FROM knex_migrations ORDER BY batch, migration_time;
```

### Manual Query
```sql
SELECT * FROM users LIMIT 10;
```

### Exit psql
```
\q
```

## Migration Development

### Create New Migration

```bash
cd backend/services/user-service

# Create migration file manually
# File: src/infrastructure/database/migrations/YYYYMMDD_HHMMSS_description.ts

# Template:
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('table_name', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('table_name');
}
```

### Create New Seed

```bash
# File: src/infrastructure/database/seeds/NN_seed_name.ts

import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex('table_name').del();

  await knex('table_name').insert([
    { id: knex.raw('gen_random_uuid()'), name: 'Item 1' },
    { id: knex.raw('gen_random_uuid()'), name: 'Item 2' },
  ]);

  console.log('✓ Seeded table_name');
}
```

## Testing

### Run Tests with Database

```bash
cd backend/services/user-service

# Setup test database
npm run migrate:test
npm run seed:test

# Run tests
npm test

# Reset test database
npm run reset:test-db
```

## Production Checklist

Before deploying migrations to production:

- [ ] Test migrations on local development database
- [ ] Test migrations on staging environment
- [ ] Backup production database
- [ ] Review migration for:
  - [ ] No data loss
  - [ ] Proper indexes
  - [ ] Correct constraints
  - [ ] Rollback plan
- [ ] Schedule maintenance window if needed
- [ ] Run migration during low-traffic period
- [ ] Monitor application logs after migration
- [ ] Verify data integrity after migration
- [ ] Test critical application paths

## Monitoring

### Check Database Size
```sql
SELECT pg_size_pretty(pg_database_size('flamoral_users'));
```

### Check Table Sizes
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Active Connections
```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'flamoral_users';
```

### Check Long Running Queries
```sql
SELECT
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - pg_stat_activity.query_start > interval '5 seconds'
ORDER BY duration DESC;
```

## Resources

- Full Architecture Guide: `DATABASE_ARCHITECTURE.md`
- Knex Documentation: https://knexjs.org/
- PostgreSQL Docs: https://www.postgresql.org/docs/
