/**
 * Enhanced Database Connection Module with Retry Logic
 *
 * This module provides database connection initialization with built-in
 * retry logic and exponential backoff for improved reliability.
 */

import knex, { Knex } from 'knex';
import { withRetry, createConnectionRetryWrapper, Logger } from './retry-logic';
import { getOptimizedKnexConfig } from './connection-pool-config';

/**
 * Create a database connection with retry logic
 *
 * @param environment - The environment (development, staging, production)
 * @param serviceType - The service traffic type
 * @param databaseName - Optional database name override
 * @param logger - Optional logger instance
 * @returns Knex instance with retry capabilities
 */
export async function createDatabaseConnectionWithRetry(
  environment: 'development' | 'test' | 'staging' | 'production',
  serviceType: 'high-traffic' | 'medium-traffic' | 'low-traffic' = 'medium-traffic',
  databaseName?: string,
  logger?: Logger
): Promise<Knex> {
  const config = getOptimizedKnexConfig(environment, serviceType, databaseName);

  // Wrap the connection initialization with retry logic
  const connectWithRetry = createConnectionRetryWrapper(
    async () => {
      const db = knex(config);

      // Test the connection
      await db.raw('SELECT 1');

      return db;
    },
    databaseName || 'database',
    logger
  );

  return await connectWithRetry();
}

/**
 * Create a Knex query builder with automatic retry on transient failures
 *
 * @param db - Knex instance
 * @param logger - Optional logger
 * @returns Query builder with retry wrapper
 */
export function createRetryableQueryBuilder(db: Knex, logger?: Logger) {
  return {
    /**
     * Execute a raw query with retry logic
     */
    async raw<T = any>(sql: string, bindings?: any): Promise<Knex.Raw<T>> {
      return withRetry(
        () => db.raw<T>(sql, bindings),
        {
          maxRetries: 3,
          baseDelay: 500,
          maxDelay: 10000,
        },
        logger
      );
    },

    /**
     * Execute a query builder with retry logic
     */
    async query<T = any>(queryFn: (qb: Knex) => Knex.QueryBuilder<T>): Promise<T[]> {
      return withRetry(
        () => queryFn(db) as any,
        {
          maxRetries: 3,
          baseDelay: 500,
          maxDelay: 10000,
        },
        logger
      );
    },

    /**
     * Execute a transaction with retry logic
     */
    async transaction<T>(
      callback: (trx: Knex.Transaction) => Promise<T>
    ): Promise<T> {
      return withRetry(
        () => db.transaction(callback),
        {
          maxRetries: 3,
          baseDelay: 500,
          maxDelay: 10000,
        },
        logger
      );
    },

    /**
     * Get the underlying Knex instance
     */
    getKnex(): Knex {
      return db;
    },
  };
}

/**
 * Health check for database connection with retry
 */
export async function healthCheckDatabase(
  db: Knex,
  logger?: Logger
): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  try {
    const start = Date.now();

    await withRetry(
      async () => {
        await db.raw('SELECT 1');
      },
      {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
      },
      logger
    );

    const latency = Date.now() - start;

    return {
      healthy: true,
      latency,
    };
  } catch (error: any) {
    return {
      healthy: false,
      error: error.message,
    };
  }
}

/**
 * Gracefully close database connection with retry
 */
export async function closeDatabaseConnection(
  db: Knex,
  timeoutMs: number = 5000,
  logger?: Logger
): Promise<void> {
  const log = logger || {
    warn: console.warn,
    error: console.error,
    info: console.log,
  };

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connection close timeout')), timeoutMs)
    );

    const close = db.destroy();

    await Promise.race([close, timeout]);
    log.info?.('Database connection closed gracefully');
  } catch (error: any) {
    log.error('Error closing database connection', error);
    throw error;
  }
}

export default {
  createDatabaseConnectionWithRetry,
  createRetryableQueryBuilder,
  healthCheckDatabase,
  closeDatabaseConnection,
};
