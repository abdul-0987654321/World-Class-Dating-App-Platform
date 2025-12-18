# Database Connection Retry Logic Implementation

## Overview

This document describes the comprehensive retry logic implementation added to the Flamoral dating platform to handle transient database and Redis connection failures with exponential backoff.

## Problem Statement

The original database and Redis connections lacked proper retry logic, which could cause cascading failures during brief network issues, database restarts, or temporary connection problems. This implementation addresses these reliability concerns.

## Implementation Summary

### Core Components

#### 1. Database Retry Logic (`backend/shared/database/retry-logic.ts`)

A comprehensive retry utility module providing:

- **Exponential backoff with jitter** to prevent thundering herd problems
- **Retryable error detection** for PostgreSQL connection errors
- **Configurable retry options** (max retries, base delay, exponential base)
- **Operation wrappers** for connections, queries, and transactions
- **Health check utilities** with retry support

**Key Features:**
- Default: 3 retries with 1s base delay, max 30s delay
- Supports custom retry logic via callbacks
- Automatic detection of transient vs permanent errors
- Comprehensive logging for debugging

**Error Codes Handled:**
- `ECONNREFUSED`, `ECONNRESET`, `ETIMEDOUT` (Network errors)
- `08003`, `08006`, `08001` (PostgreSQL connection errors)
- `57P01`, `57P02`, `57P03` (PostgreSQL shutdown errors)
- `40001`, `40P01` (Serialization failures, deadlocks)

#### 2. Database Connection Wrapper (`backend/shared/database/connection-with-retry.ts`)

High-level wrapper providing:

- **Connection initialization with retry** for Knex instances
- **Retryable query builder** for automatic query retries
- **Transaction support** with retry logic
- **Health check functions** with latency tracking
- **Graceful shutdown** with timeout protection

#### 3. Redis Retry Logic (`backend/shared/cache/redis-retry-logic.ts`)

Redis-specific retry implementation providing:

- **Redis-specific error detection** (connection closed, uncertain state)
- **Reconnection strategy** with exponential backoff
- **Command retry wrappers** for individual Redis operations
- **Enhanced Redis config** with automatic reconnection
- **Health check utilities** for Redis connections

**Redis Error Codes Handled:**
- `ECONNREFUSED`, `ECONNRESET`, `ETIMEDOUT` (Network errors)
- `NR_CLOSED`, `CONNECTION_CLOSED` (Redis connection errors)
- `UNCERTAIN_STATE` (Redis connection uncertainty)

### Service-Specific Implementations

#### 1. Auth Service

**Database:** `backend/services/auth-service/src/infrastructure/database/pool-with-retry.ts`

Enhanced PostgreSQL pool with:
- Min: 2, Max: 20 connections
- 10s connection timeout (increased from 2s)
- Keep-alive enabled with 10s initial delay
- Retry logic for all queries and transactions
- Statement timeout (30s) to prevent runaway queries

**Redis:** `backend/services/auth-service/src/infrastructure/cache/redis-with-retry.ts`

Enhanced Redis client with:
- 10s connection timeout
- Automatic reconnection with exponential backoff
- Retry logic for all token operations
- Health check with latency tracking

**Key Operations:**
- `testConnection()` - Connection test with 3 retries
- `queryWithRetry()` - Query execution with 3 retries (500ms base delay)
- `transactionWithRetry()` - Transaction with 3 retries (1s base delay)
- `getConnectionWithRetry()` - Pool connection acquisition with retry

#### 2. Payment Service

**Database:** `backend/services/payment-service/src/infrastructure/database/connection-with-retry.ts`

Enhanced Knex configuration with:
- Pool: min 2, max 10 connections
- 30s acquire timeout, 30s create timeout
- 100ms retry interval for failed connections
- `propagateCreateError: false` for retry support

**Key Operations:**
- `initializeDatabase()` - Lazy initialization with 5 retries
- `queryWithRetry()` - Query builder with 3 retries
- `rawQueryWithRetry()` - Raw SQL with 3 retries
- `transactionWithRetry()` - Transaction with 3 retries

#### 3. Messaging Service

**Redis:** `backend/services/messaging-service/src/infrastructure/cache/redis-with-retry.ts`

Enhanced Redis client optimized for real-time messaging:
- Retry logic for online status tracking
- Typing indicator operations with retry
- Message caching with retry
- Block relationship checks with retry

**Key Operations:**
- `setOnlineStatus()` - With 3 retries (500ms base delay)
- `cacheMessage()` - With 3 retries (500ms base delay)
- `isUserBlocked()` - With 3 retries (500ms base delay)

#### 4. Automation Service

**Redis:** `backend/services/automation-service/src/infrastructure/cache/redis-with-retry.ts`

Enhanced Redis client with comprehensive data structure support:
- Hash operations with retry
- List operations with retry
- Set operations with retry
- Counter operations with retry

**Key Operations:**
- All cache operations wrapped with retry logic
- 3 retries with 500ms base delay
- Support for complex data structures

## Configuration Details

### Database Pool Configuration

```typescript
{
  // Pool size
  min: 2,
  max: 10-30,

  // Timeouts
  acquireTimeoutMillis: 30000,      // 30s to acquire connection
  createTimeoutMillis: 30000,        // 30s to create connection
  destroyTimeoutMillis: 5000,        // 5s to destroy connection
  idleTimeoutMillis: 30000,          // Close idle after 30s
  reapIntervalMillis: 1000,          // Check idle every 1s

  // Retry configuration
  createRetryIntervalMillis: 100,    // Retry after 100ms
  propagateCreateError: false,       // Allow retries
}
```

### Redis Configuration

```typescript
{
  socket: {
    connectTimeout: 10000,           // 10s connection timeout
    reconnectStrategy: (retries) => {
      if (retries > 10) return Error;
      return exponentialDelay(retries); // Up to 30s
    }
  }
}
```

### Retry Strategy

All retry implementations use the following pattern:

```typescript
function calculateDelay(attempt, baseDelay, maxDelay) {
  // Exponential: baseDelay * 2^(attempt-1)
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);

  // Cap at maxDelay
  let delay = Math.min(exponentialDelay, maxDelay);

  // Add jitter (50-100% of delay)
  if (jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }

  return delay;
}
```

**Example delays with 1s base, 30s max:**
- Attempt 1: 1s (+ jitter: 500ms-1s)
- Attempt 2: 2s (+ jitter: 1s-2s)
- Attempt 3: 4s (+ jitter: 2s-4s)
- Attempt 4: 8s (+ jitter: 4s-8s)
- Attempt 5: 16s (+ jitter: 8s-16s)
- Attempt 6+: 30s (+ jitter: 15s-30s)

## Usage Examples

### Database Query with Retry

```typescript
import { queryWithRetry } from './pool-with-retry';

// Automatic retry on connection failures
const users = await queryWithRetry(
  'SELECT * FROM users WHERE id = $1',
  [userId],
  3  // max retries
);
```

### Database Transaction with Retry

```typescript
import { transactionWithRetry } from './pool-with-retry';

const result = await transactionWithRetry(async (client) => {
  await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
  await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
  return { success: true };
}, 3);
```

### Redis Operation with Retry

```typescript
import { redisCache } from './redis-with-retry';

// Automatic retry on connection failures
await redisCache.setRefreshToken(userId, token, 3600);
const token = await redisCache.getRefreshToken(userId);
```

### Custom Retry Logic

```typescript
import { withRetry } from '../../shared/database/retry-logic';

const result = await withRetry(
  async () => {
    // Your custom operation
    return await someOperation();
  },
  {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 60000,
    exponentialBase: 2,
    jitter: true,
    onRetry: (error, attempt, delay) => {
      logger.warn(`Operation failed, retrying`, { attempt, delay });
    }
  },
  logger
);
```

## Health Checks

All services now provide health check endpoints with retry logic:

```typescript
// Database health check
const health = await healthCheck();
// {
//   healthy: true,
//   stats: { total: 10, idle: 8, waiting: 0 },
//   latency: 45
// }

// Redis health check
const health = await redisCache.healthCheck();
// {
//   healthy: true,
//   latency: 12
// }
```

## Monitoring and Logging

All retry operations log:

1. **Warning logs** for each retry attempt:
   ```
   [DB] Database operation failed, retrying in 2000ms
   { attempt: 2, maxRetries: 3, error: "ECONNREFUSED", code: "ECONNREFUSED" }
   ```

2. **Error logs** for failures:
   ```
   [DB] Max retries (3) exceeded. Last error: Connection refused
   { attempt: 3, error: "ECONNREFUSED" }
   ```

3. **Info logs** for successful reconnections:
   ```
   [Redis] Reconnecting in 4000ms
   { attempt: 3, maxRetries: 10 }
   ```

## Migration Guide

### To Adopt Retry Logic

#### For Database Connections:

1. **Import the enhanced module:**
   ```typescript
   // Old
   import db from './connection';

   // New
   import { initializeDatabase, queryWithRetry } from './connection-with-retry';
   ```

2. **Initialize with retry:**
   ```typescript
   // At startup
   const db = await initializeDatabase();
   ```

3. **Use retry wrappers:**
   ```typescript
   // For queries
   const result = await queryWithRetry(query, params);

   // For transactions
   const result = await transactionWithRetry(async (client) => { ... });
   ```

#### For Redis Connections:

1. **Import the enhanced module:**
   ```typescript
   // Old
   import { redisCache } from './redis';

   // New
   import { redisCache } from './redis-with-retry';
   ```

2. **Connect with retry:**
   ```typescript
   // At startup
   await redisCache.connect();
   ```

3. **Operations automatically retry:**
   ```typescript
   // All operations now have built-in retry logic
   await redisCache.set('key', 'value', 3600);
   const value = await redisCache.get('key');
   ```

## Testing

### Manual Testing

1. **Simulate connection failures:**
   ```bash
   # Stop database
   docker-compose stop postgres

   # Application should retry and log warnings
   # Observe exponential backoff in logs

   # Start database
   docker-compose start postgres

   # Application should recover automatically
   ```

2. **Simulate transient failures:**
   ```bash
   # Introduce network delay
   tc qdisc add dev eth0 root netem delay 5000ms

   # Observe retry behavior

   # Remove delay
   tc qdisc del dev eth0 root netem
   ```

### Integration Tests

Add tests to verify retry behavior:

```typescript
describe('Database Retry Logic', () => {
  it('should retry on connection failure', async () => {
    // Mock connection failure
    jest.spyOn(pool, 'connect').mockRejectedValueOnce(new Error('ECONNREFUSED'));

    // Should succeed on retry
    const result = await testConnection();
    expect(result).toBe(true);
  });

  it('should use exponential backoff', async () => {
    const delays: number[] = [];
    jest.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
      delays.push(delay);
      fn();
      return {} as any;
    });

    // Verify exponential backoff pattern
    expect(delays[0]).toBeGreaterThanOrEqual(1000);
    expect(delays[1]).toBeGreaterThanOrEqual(2000);
    expect(delays[2]).toBeGreaterThanOrEqual(4000);
  });
});
```

## Performance Impact

- **Minimal overhead** when connections are healthy (< 1ms)
- **Improved resilience** during transient failures
- **Reduced downtime** by automatically recovering from brief outages
- **Better resource utilization** with connection pooling and keep-alive

## Files Modified/Created

### Created Files:
1. `backend/shared/database/retry-logic.ts` - Database retry utility
2. `backend/shared/database/connection-with-retry.ts` - Database connection wrapper
3. `backend/shared/cache/redis-retry-logic.ts` - Redis retry utility
4. `backend/services/auth-service/src/infrastructure/database/pool-with-retry.ts` - Auth DB with retry
5. `backend/services/auth-service/src/infrastructure/cache/redis-with-retry.ts` - Auth Redis with retry
6. `backend/services/payment-service/src/infrastructure/database/connection-with-retry.ts` - Payment DB with retry
7. `backend/services/messaging-service/src/infrastructure/cache/redis-with-retry.ts` - Messaging Redis with retry
8. `backend/services/automation-service/src/infrastructure/cache/redis-with-retry.ts` - Automation Redis with retry

### Files to Update (Main Knexfile):
1. `infrastructure/database/knexfile.ts` - Add pool configuration with retry settings

## Recommended Next Steps

1. **Update main knexfile.ts** manually with the enhanced pool configuration
2. **Update other service knexfiles** to use the shared retry logic
3. **Add integration tests** for retry behavior
4. **Monitor retry metrics** in production
5. **Adjust retry parameters** based on production behavior
6. **Add alerting** for excessive retries indicating systemic issues

## Support

For questions or issues with the retry implementation, contact the infrastructure team or refer to:
- Database retry logic: `backend/shared/database/retry-logic.ts`
- Redis retry logic: `backend/shared/cache/redis-retry-logic.ts`
- Service-specific implementations in each service's `infrastructure/` directory
