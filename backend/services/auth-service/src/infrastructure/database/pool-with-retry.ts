import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../../config';
import logger from '../../utils/logger';

/**
 * Retry utility with exponential backoff
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
      const retryableErrors = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', '08003', '08006', '08001'];
      const isRetryable = retryableErrors.includes(error.code) ||
                          error.message?.toLowerCase().includes('connection') ||
                          error.message?.toLowerCase().includes('timeout');

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 0.5 * delay; // Add jitter to prevent thundering herd
      const finalDelay = Math.min(delay + jitter, 30000);

      logger.warn(`Database operation failed, retrying in ${Math.round(finalDelay)}ms`, {
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
 * Enhanced PostgreSQL connection pool with retry logic and exponential backoff
 */
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,

  // Pool size configuration
  max: 20,
  min: 2,

  // Timeout configuration with retry-friendly values
  idleTimeoutMillis: 30000,         // Close idle connections after 30s
  connectionTimeoutMillis: 10000,    // Increased from 2s to 10s for better reliability

  // Keep-alive to detect dead connections
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Connection event listeners
pool.on('connect', (client) => {
  logger.debug('New database connection established');

  // Set statement timeout to prevent runaway queries
  client.query('SET statement_timeout = 30000').catch((err) => {
    logger.error('Failed to set statement timeout', err);
  });
});

pool.on('acquire', () => {
  logger.debug('Connection acquired from pool');
});

pool.on('remove', () => {
  logger.debug('Connection removed from pool');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', err);
});

/**
 * Test the database connection with retry logic
 */
export async function testConnection(): Promise<boolean> {
  try {
    await withRetry(async () => {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }
    }, 3, 1000);

    logger.info('Database connection successful');
    return true;
  } catch (error: any) {
    logger.error('Database connection failed after all retries', error);
    return false;
  }
}

/**
 * Execute a query with automatic retry on transient failures
 */
export async function queryWithRetry<T = any>(
  queryText: string,
  params?: any[],
  maxRetries = 3
): Promise<T> {
  return withRetry(async () => {
    const client = await pool.connect();
    try {
      const result = await client.query(queryText, params);
      return result.rows as T;
    } finally {
      client.release();
    }
  }, maxRetries, 500);
}

/**
 * Execute a transaction with retry logic
 */
export async function transactionWithRetry<T>(
  callback: (client: PoolClient) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  return withRetry(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }, maxRetries, 1000);
}

/**
 * Get a connection from the pool with retry logic
 */
export async function getConnectionWithRetry(): Promise<PoolClient> {
  return withRetry(
    () => pool.connect(),
    3,
    1000
  );
}

/**
 * Get pool statistics
 */
export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

/**
 * Health check for the database pool
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  stats: any;
  latency?: number;
  error?: string;
}> {
  try {
    const start = Date.now();
    const isConnected = await testConnection();
    const latency = Date.now() - start;

    return {
      healthy: isConnected,
      stats: getPoolStats(),
      latency,
    };
  } catch (error: any) {
    return {
      healthy: false,
      stats: getPoolStats(),
      error: error.message,
    };
  }
}

/**
 * Close all pool connections gracefully
 */
export async function closePool(timeoutMs = 5000): Promise<void> {
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Pool close timeout')), timeoutMs)
    );

    const close = pool.end();

    await Promise.race([close, timeout]);
    logger.info('Database pool closed gracefully');
  } catch (error) {
    logger.error('Error closing database pool', error);
    throw error;
  }
}

export default pool;
