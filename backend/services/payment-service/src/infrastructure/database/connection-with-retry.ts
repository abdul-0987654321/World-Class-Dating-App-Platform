import knex, { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Retry utility with exponential backoff for database operations
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      const retryableErrors = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH', '08003', '08006', '08001', '57P01', '57P02', '57P03'];
      const isRetryable = retryableErrors.includes(error.code) ||
                          error.message?.toLowerCase().includes('connection') ||
                          error.message?.toLowerCase().includes('timeout') ||
                          error.message?.toLowerCase().includes('network');

      if (!isRetryable || attempt === maxRetries) {
        console.error(`[DB] Operation failed (non-retryable or max retries reached)`, {
          attempt,
          error: error.message,
          code: error.code,
        });
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 0.5 * delay; // Add jitter to prevent thundering herd
      const finalDelay = Math.min(delay + jitter, 30000);

      console.warn(`[DB] Operation failed, retrying in ${Math.round(finalDelay)}ms`, {
        attempt,
        maxRetries,
        error: error.message,
        code: error.code,
      });

      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }

  throw lastError!;
}

/**
 * Enhanced Knex configuration with retry logic and connection pooling
 */
const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'flamoral_payments',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),

    // Connection acquisition and timeout settings
    acquireTimeoutMillis: 30000,       // 30 seconds to acquire connection
    createTimeoutMillis: 30000,        // 30 seconds to create connection
    destroyTimeoutMillis: 5000,        // 5 seconds to destroy connection

    // Idle connection management
    idleTimeoutMillis: 30000,          // Close idle connections after 30 seconds
    reapIntervalMillis: 1000,          // Check for idle connections every second

    // Retry configuration
    createRetryIntervalMillis: 100,    // Retry failed connections after 100ms
    propagateCreateError: false,       // Don't propagate create errors immediately, allow retries
  },
  acquireConnectionTimeout: 60000,     // Global connection acquisition timeout
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './seeds',
  },
};

// Create the database instance
let dbInstance: Knex | null = null;

/**
 * Initialize database connection with retry logic
 */
export async function initializeDatabase(): Promise<Knex> {
  if (dbInstance) {
    return dbInstance;
  }

  return withRetry(async () => {
    dbInstance = knex(config);

    // Test the connection
    await dbInstance.raw('SELECT 1');

    console.log('[DB] Payment service database connected successfully');
    return dbInstance;
  }, 5, 1000);
}

/**
 * Get the database instance
 */
export function getDatabase(): Knex {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbInstance;
}

/**
 * Execute a query with retry logic
 */
export async function queryWithRetry<T = any>(
  queryBuilder: Knex.QueryBuilder,
  maxRetries = 3
): Promise<T> {
  return withRetry(() => queryBuilder as any, maxRetries, 500);
}

/**
 * Execute a raw query with retry logic
 */
export async function rawQueryWithRetry<T = any>(
  sql: string,
  bindings?: any,
  maxRetries = 3
): Promise<T> {
  const db = getDatabase();
  const result = await withRetry(() => db.raw(sql, bindings), maxRetries, 500);
  return result as T;
}

/**
 * Execute a transaction with retry logic
 */
export async function transactionWithRetry<T>(
  callback: (trx: Knex.Transaction) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  const db = getDatabase();
  return withRetry(() => db.transaction(callback), maxRetries, 1000);
}

/**
 * Health check for the database
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  try {
    const start = Date.now();
    await withRetry(async () => {
      const db = getDatabase();
      await db.raw('SELECT 1');
    }, 2, 1000);

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
 * Close the database connection gracefully
 */
export async function closeDatabase(timeoutMs = 5000): Promise<void> {
  if (!dbInstance) {
    return;
  }

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Database close timeout')), timeoutMs)
    );

    const close = dbInstance.destroy();

    await Promise.race([close, timeout]);
    dbInstance = null;
    console.log('[DB] Database connection closed gracefully');
  } catch (error) {
    console.error('[DB] Error closing database connection', error);
    throw error;
  }
}

// Export a singleton instance (lazy-loaded)
export const db = new Proxy({} as Knex, {
  get(target, prop) {
    const instance = getDatabase();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export default db;
