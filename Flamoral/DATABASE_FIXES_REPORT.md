# Flamoral Database and Migration Issues - Comprehensive Fix Report

**Date:** 2025-12-15
**Environment:** Flamoral Dating Platform
**Working Directory:** C:/Users/citad/OneDrive/Documents/Dating/Flamoral

---

## Executive Summary

This report identifies critical database configuration and migration issues for the Flamoral dating platform and provides comprehensive solutions for production deployment on Azure PostgreSQL.

### Critical Issues Found

1. **SSL Configuration Missing for Azure PostgreSQL** - Production/Staging environments have hardcoded SSL settings
2. **Connection Timeout Configuration Missing** - No timeout settings for Azure connections
3. **SQL Migration Files in TypeScript-Only Setup** - 3 SQL files that won't be executed by Knex
4. **Multiple Knexfile Locations** - Configuration duplicated across monorepo
5. **Seed Data Concerns** - Development data may run in production
6. **Missing Environment Variables** - Production SSL and timeout configs not documented

---

## Issue 1: SSL Configuration for Azure PostgreSQL

### Problem

Current `database/knexfile.ts` has hardcoded SSL configuration:

```typescript
ssl: { rejectUnauthorized: true }
```

This doesn't work properly with Azure PostgreSQL which requires:
- SSL enabled by default
- Optional CA certificate
- Configurable rejection of unauthorized certificates
- Proper timeout handling

### Solution

Replace the hardcoded SSL configuration with environment-based configuration:

```typescript
// Add this helper function at the top of knexfile.ts
const getSSLConfig = (): boolean | { rejectUnauthorized: boolean; ca?: string } => {
  if (process.env.DB_SSL !== 'true') {
    return false;
  }

  return {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    ca: process.env.DB_SSL_CA,
  };
};

// Then use in staging and production configs:
connection: {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: getSSLConfig(), // Use helper function
  // Add timeout configurations
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '60000'),
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '120000'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
},
```

### Environment Variables Required

Add these to `.env.prod.example` and Azure Key Vault:

```bash
# Database SSL Configuration
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_SSL_CA=  # Optional: Path to CA certificate for Azure PostgreSQL

# Database Connection Timeouts
DB_CONNECTION_TIMEOUT=30000  # 30 seconds
DB_QUERY_TIMEOUT=60000       # 60 seconds
DB_STATEMENT_TIMEOUT=120000  # 120 seconds for migrations
DB_IDLE_TIMEOUT=30000        # 30 seconds

# Pool Timeouts
DB_POOL_ACQUIRE_TIMEOUT=60000
DB_POOL_CREATE_TIMEOUT=30000
DB_POOL_DESTROY_TIMEOUT=5000
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_REAP_INTERVAL=1000
DB_POOL_CREATE_RETRY_INTERVAL=200
DB_ACQUIRE_CONNECTION_TIMEOUT=60000
```

---

## Issue 2: Pool Configuration for Production

### Problem

Current pool configuration lacks:
- Configurable pool sizes
- Timeout settings
- Retry logic
- Error propagation settings

### Solution

Update pool configuration in `staging` and `production` environments:

```typescript
pool: {
  min: parseInt(process.env.DB_POOL_MIN || '5'),
  max: parseInt(process.env.DB_POOL_MAX || '30'),
  // Acquire timeout - how long to wait for a connection from the pool
  acquireTimeoutMillis: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '60000'),
  // Create timeout - how long to wait when creating a new connection
  createTimeoutMillis: parseInt(process.env.DB_POOL_CREATE_TIMEOUT || '30000'),
  // Destroy timeout - how long to wait when destroying a connection
  destroyTimeoutMillis: parseInt(process.env.DB_POOL_DESTROY_TIMEOUT || '5000'),
  // Idle timeout - how long a connection can be idle before being destroyed
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
  // Reap interval - how often to check for idle connections
  reapIntervalMillis: parseInt(process.env.DB_POOL_REAP_INTERVAL || '1000'),
  // Create retry interval - delay between connection retry attempts
  createRetryIntervalMillis: parseInt(process.env.DB_POOL_CREATE_RETRY_INTERVAL || '200'),
  // Propagate create error (false in production to retry)
  propagateCreateError: false,
},
// Add top-level acquire connection timeout
acquireConnectionTimeout: parseInt(process.env.DB_ACQUIRE_CONNECTION_TIMEOUT || '60000'),
```

---

## Issue 3: SQL Migration Files in TypeScript Setup

### Problem

Found 3 SQL migration files that won't be executed by Knex (configured for `.ts` only):

1. `database/migrations/20250120_add_security_features.sql`
2. `database/migrations/20251202_create_badges_tables.sql`
3. `database/migrations/20251202_create_rewards_achievements_tables.sql`

### Solution Options

#### Option A: Convert to TypeScript (Recommended)

Convert each SQL file to a TypeScript migration:

```typescript
// Example: 20250120_add_security_features.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // User 2FA Configuration
  await knex.schema.createTable('user_two_factor_auth', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('method', ['2fa_totp', '2fa_sms', '2fa_email']).notNullable();
    table.string('secret', 255).nullable();
    table.string('phone_number', 20).nullable();
    table.string('email', 255).nullable();
    table.boolean('is_enabled').defaultTo(false);
    table.timestamp('enabled_at').nullable();
    table.timestamp('disabled_at').nullable();
    table.timestamp('last_verified_at').nullable();
    table.timestamps(true, true);
    table.unique(['user_id', 'method']);
  });

  await knex.schema.raw('CREATE INDEX idx_2fa_user_id ON user_two_factor_auth(user_id)');
  await knex.schema.raw('CREATE INDEX idx_2fa_enabled ON user_two_factor_auth(user_id, is_enabled)');

  // Continue with other tables...
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_two_factor_auth');
  // Drop other tables in reverse order...
}
```

#### Option B: Execute SQL Directly (Quick Fix)

If you need to keep SQL files temporarily:

```typescript
import { Knex } from 'knex';
import * as fs from 'fs';
import * as path from 'path';

export async function up(knex: Knex): Promise<void> {
  const sql = fs.readFileSync(
    path.join(__dirname, '20250120_add_security_features.sql'),
    'utf-8'
  );
  await knex.raw(sql);
}

export async function down(knex: Knex): Promise<void> {
  // Manual rollback logic
  await knex.schema.dropTableIfExists('user_two_factor_auth');
  // ... other tables
}
```

#### Option C: Rename and Update Config (Not Recommended)

Update knexfile to accept SQL:

```typescript
migrations: {
  tableName: 'knex_migrations',
  directory: './migrations',
  extension: 'ts',
  loadExtensions: ['.ts', '.sql'], // Add .sql
},
```

**Note:** This won't work properly as Knex expects JavaScript/TypeScript module exports.

---

## Issue 4: Multiple Knexfile Locations

### Found Knexfiles

1. `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/database/knexfile.ts` - Main monolithic database
2. `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/knexfile.ts` - Backend service
3. `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services/user-service/src/infrastructure/database/knexfile.ts`
4. `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services/matching-service/src/infrastructure/database/knexfile.ts`
5. `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services/media-service/src/infrastructure/database/knexfile.ts`
6. And more...

### Problem

- Inconsistent configuration across services
- Some have proper SSL config, some don't
- Different timeout settings
- Maintenance nightmare

### Solution

#### Option A: Shared Configuration (Recommended for Monolithic DB)

Create a shared knex configuration module:

```typescript
// packages/shared/database-config/src/knexfile.base.ts
import type { Knex } from 'knex';

export const getSSLConfig = (): boolean | { rejectUnauthorized: boolean; ca?: string } => {
  if (process.env.DB_SSL !== 'true') {
    return false;
  }

  return {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    ca: process.env.DB_SSL_CA,
  };
};

export const getBaseConfig = (environment: string): Knex.Config => {
  const isProd = environment === 'production';
  const isStaging = environment === 'staging';

  return {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: (isProd || isStaging) ? getSSLConfig() : false,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
      query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '60000'),
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '120000'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || (isProd ? '5' : '2')),
      max: parseInt(process.env.DB_POOL_MAX || (isProd ? '30' : '10')),
      acquireTimeoutMillis: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '60000'),
      createTimeoutMillis: parseInt(process.env.DB_POOL_CREATE_TIMEOUT || '30000'),
      destroyTimeoutMillis: parseInt(process.env.DB_POOL_DESTROY_TIMEOUT || '5000'),
      idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
      reapIntervalMillis: parseInt(process.env.DB_POOL_REAP_INTERVAL || '1000'),
      createRetryIntervalMillis: parseInt(process.env.DB_POOL_CREATE_RETRY_INTERVAL || '200'),
      propagateCreateError: false,
    },
    acquireConnectionTimeout: parseInt(process.env.DB_ACQUIRE_CONNECTION_TIMEOUT || '60000'),
  };
};
```

Then each service imports and customizes:

```typescript
// user-service/knexfile.ts
import { getBaseConfig } from '@flamoral/database-config';
import * as path from 'path';

const baseConfig = getBaseConfig(process.env.NODE_ENV || 'development');

const config: { [key: string]: Knex.Config } = {
  development: {
    ...baseConfig,
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      extension: 'ts',
      tableName: 'knex_migrations',
    },
  },
  // ... production, staging
};

export default config;
```

---

## Issue 5: Seed Data in Production

### Problem

Seed files contain development test data with:
- Hardcoded test user credentials (password: `Test123!`)
- Fake email addresses (`example.com`)
- Test subscription data
- Development-only content

### Current Seed Files

1. `001_dev_users_and_profiles.ts` - 6 test users with profiles
2. `002_dev_photos_and_prompts.ts` - Test photos and prompts
3. `003_dev_matching_data.ts` - Test swipes and matches
4. `004_dev_conversations_messages.ts` - Test messages
5. `005_dev_subscriptions.ts` - Test subscription data

### Solution

#### Prevent Seeds in Production

Update `database/knexfile.ts` production config:

```typescript
production: {
  // ... other config
  seeds: {
    directory: './seeds/production', // Separate directory
    extension: 'ts',
  },
},
```

Create production-safe seeds in `database/seeds/production/`:

```typescript
// 001_production_required_data.ts
export async function seed(knex: Knex): Promise<void> {
  // Only insert required reference data, no user data

  // Subscription plans (required for app to function)
  await knex('subscription_plans').del();
  await knex('subscription_plans').insert([
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Free',
      tier: 'free',
      price_cents: 0,
      // ... other required fields
    },
    // ... other plans
  ]);

  // Report categories (required)
  await knex('report_categories').del();
  await knex('report_categories').insert([
    { name: 'Inappropriate Photos', category: 'content' },
    { name: 'Harassment', category: 'behavior' },
    // ... other categories
  ]);

  // NO USER DATA IN PRODUCTION SEEDS
  console.log('Production seed completed - reference data only');
}
```

#### Add Environment Check

Add safety check in development seeds:

```typescript
// 001_dev_users_and_profiles.ts
export async function seed(knex: Knex): Promise<void> {
  // Safety check: never run in production
  if (process.env.NODE_ENV === 'production') {
    console.log('Skipping development seeds in production environment');
    return;
  }

  // Development seed logic...
}
```

---

## Issue 6: Migration File Naming and Ordering

### Problem

Found inconsistent migration timestamps:
- Some from 2023: `20231215000000_create_social_accounts.ts`
- Main batch from 2025-01-01
- Later additions from 2025-01-15, 2025-02-XX, 2025-11-XX, 2025-12-XX

This can cause ordering issues during migration execution.

### Solution

Ensure migrations run in correct order by checking:

```bash
cd database
npm run migrate:list
```

If order is wrong, consider:

1. **Renaming older migrations** to match chronological order
2. **Consolidating** old migrations into current structure
3. **Running migrations in batches** with explicit ordering

---

## Issue 7: Backend knexfile.ts Configuration

### Problem

`backend/knexfile.ts` has wrong migration paths:

```typescript
migrations: {
  directory: './src/db/migrations',  // Wrong path
  extension: 'ts',
},
```

But migrations are actually in service-specific locations like:
- `backend/services/user-service/src/infrastructure/database/migrations/`

### Solution

Either:

#### A. Update Path (if centralizing)

```typescript
migrations: {
  directory: './database/migrations',
  extension: 'ts',
},
```

#### B. Remove File (if using service-specific configs)

Delete `backend/knexfile.ts` and use only:
- `database/knexfile.ts` for main database
- `backend/services/*/knexfile.ts` for service databases

---

## Recommended Actions

### Immediate (Critical)

1. **Update `database/knexfile.ts`** with SSL and timeout configuration
2. **Convert 3 SQL files** to TypeScript migrations
3. **Add production environment variables** to Azure Key Vault
4. **Create production seed directory** with reference data only
5. **Add safety checks** to development seeds

### Short-term (Important)

6. **Audit all knexfiles** across services for consistency
7. **Create shared database config** package
8. **Document migration execution order**
9. **Test migrations** in staging environment
10. **Set up database backup** before production migration

### Long-term (Recommended)

11. **Implement database monitoring** for connection pool metrics
12. **Add migration rollback strategy** documentation
13. **Create migration testing** in CI/CD pipeline
14. **Set up automated database backups** pre-migration
15. **Document recovery procedures** for failed migrations

---

## Testing Checklist

Before deploying to production:

- [ ] Test SSL connection to Azure PostgreSQL from local environment
- [ ] Verify all migrations run successfully in staging
- [ ] Confirm no development seeds run in production
- [ ] Test connection pool under load
- [ ] Verify timeout settings work with Azure
- [ ] Test migration rollback procedures
- [ ] Backup production database
- [ ] Document rollback plan
- [ ] Test connection with SSL certificate validation
- [ ] Verify all environment variables are set in Azure

---

## Environment Variable Reference

Complete list of database environment variables needed:

```bash
# Database Connection
DB_HOST=flamoral-prod-postgres.postgres.database.azure.com
DB_PORT=5432
DB_NAME=flamoral
DB_USER=flamoral_admin
DB_PASSWORD=*** # In Azure Key Vault

# SSL Configuration
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_SSL_CA=  # Optional CA certificate path

# Connection Timeouts
DB_CONNECTION_TIMEOUT=30000
DB_QUERY_TIMEOUT=60000
DB_STATEMENT_TIMEOUT=120000
DB_IDLE_TIMEOUT=30000

# Pool Configuration
DB_POOL_MIN=5
DB_POOL_MAX=30
DB_POOL_ACQUIRE_TIMEOUT=60000
DB_POOL_CREATE_TIMEOUT=30000
DB_POOL_DESTROY_TIMEOUT=5000
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_REAP_INTERVAL=1000
DB_POOL_CREATE_RETRY_INTERVAL=200
DB_ACQUIRE_CONNECTION_TIMEOUT=60000

# Optional: Logging
DB_POOL_LOGGING=false  # Set to true for debugging
```

---

## Files Requiring Changes

### Priority 1 (Critical)

1. `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/database/knexfile.ts`
   - Add SSL helper function
   - Update staging/production configs with timeouts
   - Add environment variable support

2. `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/.env.prod.example`
   - Add all database timeout and SSL variables

3. Convert to TypeScript:
   - `database/migrations/20250120_add_security_features.sql` → `.ts`
   - `database/migrations/20251202_create_badges_tables.sql` → `.ts`
   - `database/migrations/20251202_create_rewards_achievements_tables.sql` → `.ts`

### Priority 2 (Important)

4. `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/database/seeds/001_dev_users_and_profiles.ts`
   - Add production environment check

5. Create new file: `database/seeds/production/001_production_required_data.ts`
   - Add reference data only (subscription plans, categories, etc.)

6. All service knexfiles:
   - Update with consistent SSL and timeout config
   - Consider shared configuration approach

### Priority 3 (Recommended)

7. `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/knexfile.ts`
   - Fix migration paths or remove file

8. Create: `packages/shared/database-config/src/knexfile.base.ts`
   - Shared configuration for all services

---

## Azure PostgreSQL Specific Notes

### Connection String Format

Azure PostgreSQL connection string:
```
postgresql://username@servername:password@servername.postgres.database.azure.com:5432/database?sslmode=require
```

### SSL Requirements

- SSL is **mandatory** for Azure PostgreSQL
- Use `sslmode=require` or configure via Knex SSL object
- Azure provides a [CA certificate](https://learn.microsoft.com/en-us/azure/postgresql/single-server/concepts-ssl-connection-security) if needed

### Firewall Rules

Ensure your Azure PostgreSQL firewall allows:
- Your deployment IP ranges
- Azure services (if using Azure App Service/AKS)

### Performance Tier

Current config assumes:
- **Staging**: Basic/General Purpose tier (smaller pool: 2-10)
- **Production**: General Purpose/Memory Optimized tier (larger pool: 5-30)

Adjust pool sizes based on your actual Azure tier.

---

## Conclusion

The main issues are:

1. **SSL configuration** not properly set for Azure PostgreSQL
2. **Timeout configurations** missing for production reliability
3. **SQL migration files** that won't execute in TypeScript setup
4. **Development seed data** that could run in production
5. **Inconsistent configuration** across multiple knexfiles

All issues are fixable with the solutions provided in this document. Priority should be:
1. Fix SSL and timeout config
2. Convert SQL migrations to TypeScript
3. Protect production from development seeds
4. Test thoroughly in staging before production deployment

---

**Report Generated:** 2025-12-15
**Status:** Ready for Implementation
**Estimated Fix Time:** 4-6 hours
**Risk Level:** Medium (with testing in staging first)
