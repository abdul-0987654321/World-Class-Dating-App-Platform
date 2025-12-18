# Knexfile Update Guide

## Overview

This guide provides instructions for manually updating the main `infrastructure/database/knexfile.ts` file with enhanced pool configuration and retry logic.

## Current File Location

`C:/Users/citad/OneDrive/Documents/Dating/infrastructure/database/knexfile.ts`

## Required Changes

### 1. Update Pool Configuration

Replace each environment's `pool` configuration with the enhanced version below.

#### For Development Environment

**Current:**
```typescript
pool: {
  min: 2,
  max: 10,
},
```

**Updated:**
```typescript
pool: {
  min: 2,
  max: 10,
  acquireTimeoutMillis: 30000,      // 30 seconds to acquire connection
  createTimeoutMillis: 30000,        // 30 seconds to create connection
  destroyTimeoutMillis: 5000,        // 5 seconds to destroy connection
  idleTimeoutMillis: 30000,          // Close idle connections after 30 seconds
  reapIntervalMillis: 1000,          // Check for idle connections every second
  createRetryIntervalMillis: 100,    // Retry failed connections after 100ms
  propagateCreateError: false,       // Don't propagate create errors immediately, allow retries
},
acquireConnectionTimeout: 60000,     // Global connection acquisition timeout (60 seconds)
```

#### For Staging Environment

**Current:**
```typescript
pool: {
  min: 2,
  max: 10,
},
```

**Updated:**
```typescript
pool: {
  min: 2,
  max: 10,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 100,
  propagateCreateError: false,
},
acquireConnectionTimeout: 60000,
```

#### For Production Environment

**Current:**
```typescript
pool: {
  min: 5,
  max: 30,
},
```

**Updated:**
```typescript
pool: {
  min: 5,
  max: 30,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 100,
  propagateCreateError: false,
},
acquireConnectionTimeout: 60000,
```

## Complete Updated File

Here's the complete updated file content:

```typescript
import type { Knex } from 'knex';
import * as dotenv from 'dotenv';

dotenv.config();

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'flamoral_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    },
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
      propagateCreateError: false,
    },
    acquireConnectionTimeout: 60000,
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
  },

  staging: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
      propagateCreateError: false,
    },
    acquireConnectionTimeout: 60000,
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
      extension: 'ts',
    },
  },

  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 5,
      max: 30,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
      propagateCreateError: false,
    },
    acquireConnectionTimeout: 60000,
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
      extension: 'ts',
    },
  },
};

export default config;
```

## Configuration Explanation

### Pool Settings

- **acquireTimeoutMillis (30000ms / 30s)**: Maximum time to wait when acquiring a connection from the pool before timing out.

- **createTimeoutMillis (30000ms / 30s)**: Maximum time to wait when creating a new database connection before timing out.

- **destroyTimeoutMillis (5000ms / 5s)**: Maximum time to wait when destroying a connection before forcing it closed.

- **idleTimeoutMillis (30000ms / 30s)**: Idle connections will be closed after this period to free up resources.

- **reapIntervalMillis (1000ms / 1s)**: How often the pool checks for idle connections to close.

- **createRetryIntervalMillis (100ms)**: Minimum time to wait before retrying a failed connection creation. This works with Knex's internal retry mechanism.

- **propagateCreateError (false)**: When false, connection creation errors don't immediately propagate, allowing the pool to retry.

### Global Timeout

- **acquireConnectionTimeout (60000ms / 60s)**: Global timeout for acquiring connections, provides an additional safety net.

## How to Apply

### Option 1: Manual Edit (Recommended)

1. Open `infrastructure/database/knexfile.ts` in your editor
2. Locate each environment's `pool` configuration
3. Replace with the enhanced configuration from above
4. Add the `acquireConnectionTimeout` property after each `pool` block
5. Save the file

### Option 2: Copy Complete File

1. Backup the current file:
   ```bash
   cp infrastructure/database/knexfile.ts infrastructure/database/knexfile.ts.backup
   ```

2. Replace with the complete updated file content above

3. Verify the changes:
   ```bash
   git diff infrastructure/database/knexfile.ts
   ```

## Testing

After applying the changes:

1. **Test development environment:**
   ```bash
   npm run migrate:latest
   ```

2. **Verify connection pool:**
   ```typescript
   import knex from 'knex';
   import config from './knexfile';

   const db = knex(config.development);

   // Test query
   await db.raw('SELECT 1');
   console.log('Connection successful');

   // Check pool stats
   const pool = (db.client as any).pool;
   console.log({
     numUsed: pool.numUsed(),
     numFree: pool.numFree(),
     numPendingCreates: pool.numPendingCreates(),
   });
   ```

3. **Simulate connection retry:**
   - Stop the database temporarily
   - Start your application
   - Observe retry behavior in logs
   - Start the database
   - Verify automatic recovery

## Benefits

1. **Improved Reliability**: Automatic retry on transient connection failures
2. **Better Resource Management**: Idle connection cleanup and controlled pool size
3. **Graceful Degradation**: Longer timeouts prevent premature failures during load spikes
4. **Production Ready**: Enhanced settings proven to handle high-traffic scenarios

## Troubleshooting

### Issue: Connections timing out too quickly

**Solution**: Increase `createTimeoutMillis` and `acquireTimeoutMillis` to 45000-60000ms

### Issue: Too many idle connections

**Solution**: Decrease `idleTimeoutMillis` to 15000-20000ms or reduce pool `min` size

### Issue: Connection pool exhausted

**Solution**:
- Increase pool `max` size
- Check for connection leaks (unreleased connections)
- Review long-running queries

### Issue: Excessive retry attempts

**Solution**:
- Decrease `createRetryIntervalMillis` to reduce retry frequency
- Check database availability and network connectivity
- Review connection configuration (host, port, credentials)

## Monitoring

After deployment, monitor:

1. **Connection pool metrics:**
   - Number of used connections
   - Number of free connections
   - Number of pending connection creates
   - Connection acquisition time

2. **Retry metrics:**
   - Number of retry attempts
   - Success rate after retries
   - Time to recovery

3. **Error rates:**
   - Connection timeouts
   - Create errors
   - Acquire errors

## Additional Resources

- [Knex Pool Configuration](https://knexjs.org/guide/#pool)
- [PostgreSQL Connection Management](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- Database Retry Implementation: `DATABASE_RETRY_IMPLEMENTATION.md`
- Shared retry utilities: `backend/shared/database/retry-logic.ts`
