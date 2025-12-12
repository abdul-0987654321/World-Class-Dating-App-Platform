import { Knex } from 'knex';
import { PoolConfig } from 'pg';

/**
 * Enhanced Database Connection Pool Configuration
 *
 * This module provides optimized connection pool settings for PostgreSQL
 * to maximize performance, reliability, and resource utilization.
 */

export interface EnvironmentConfig {
  development: Knex.Config;
  test: Knex.Config;
  staging: Knex.Config;
  production: Knex.Config;
}

/**
 * Get optimal pool size based on environment and service type
 */
export function getPoolSize(
  environment: 'development' | 'test' | 'staging' | 'production',
  serviceType: 'high-traffic' | 'medium-traffic' | 'low-traffic'
): { min: number; max: number } {
  const poolSizes = {
    development: {
      'high-traffic': { min: 2, max: 10 },
      'medium-traffic': { min: 2, max: 8 },
      'low-traffic': { min: 1, max: 5 },
    },
    test: {
      'high-traffic': { min: 0, max: 5 },
      'medium-traffic': { min: 0, max: 3 },
      'low-traffic': { min: 0, max: 2 },
    },
    staging: {
      'high-traffic': { min: 5, max: 20 },
      'medium-traffic': { min: 3, max: 15 },
      'low-traffic': { min: 2, max: 10 },
    },
    production: {
      'high-traffic': { min: 10, max: 50 },
      'medium-traffic': { min: 5, max: 30 },
      'low-traffic': { min: 3, max: 20 },
    },
  };

  return poolSizes[environment][serviceType];
}

/**
 * Enhanced connection pool configuration with performance tuning
 */
export function getEnhancedPoolConfig(
  environment: 'development' | 'test' | 'staging' | 'production',
  serviceType: 'high-traffic' | 'medium-traffic' | 'low-traffic' = 'medium-traffic'
): Knex.PoolConfig {
  const poolSize = getPoolSize(environment, serviceType);

  return {
    min: poolSize.min,
    max: poolSize.max,

    // Connection acquisition settings
    acquireTimeoutMillis: 30000, // 30 seconds
    createTimeoutMillis: 30000, // 30 seconds
    destroyTimeoutMillis: 5000, // 5 seconds

    // Idle connection management
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    reapIntervalMillis: 1000, // Check for idle connections every second

    // Connection validation
    createRetryIntervalMillis: 200, // Retry failed connections after 200ms

    // Logging
    log: (message: string, logLevel: string) => {
      if (environment !== 'production' || logLevel === 'error') {
        console.log(`[DB Pool ${logLevel.toUpperCase()}] ${message}`);
      }
    },

    // Advanced settings
    propagateCreateError: false, // Don't propagate create errors immediately
  };
}

/**
 * PostgreSQL-specific connection configuration
 */
export function getPostgresConfig(
  environment: 'development' | 'test' | 'staging' | 'production'
): PoolConfig {
  const isProd = environment === 'production';
  const isStaging = environment === 'staging';

  return {
    // Basic connection settings
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    // SSL configuration
    ssl: isProd || isStaging ? { rejectUnauthorized: false } : false,

    // Connection timeout
    connectionTimeoutMillis: 10000, // 10 seconds

    // Statement timeout (prevents runaway queries)
    statement_timeout: isProd ? 30000 : 60000, // 30s prod, 60s dev

    // Query timeout
    query_timeout: isProd ? 30000 : 60000,

    // Idle in transaction timeout
    idle_in_transaction_session_timeout: 60000, // 60 seconds

    // Application name for monitoring
    application_name: `flamoral_${environment}`,

    // Keep alive settings
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };
}

/**
 * Complete Knex configuration with optimized settings
 */
export function getOptimizedKnexConfig(
  environment: 'development' | 'test' | 'staging' | 'production',
  serviceType: 'high-traffic' | 'medium-traffic' | 'low-traffic' = 'medium-traffic',
  databaseName?: string
): Knex.Config {
  const isProd = environment === 'production';

  return {
    client: 'postgresql',
    connection: getPostgresConfig(environment),
    pool: getEnhancedPoolConfig(environment, serviceType),

    // Query optimization
    asyncStackTraces: !isProd, // Disable in production for performance

    // Debugging (disable in production)
    debug: environment === 'development',
    log: {
      warn(message) {
        console.warn(`[Knex Warning] ${message}`);
      },
      error(message) {
        console.error(`[Knex Error] ${message}`);
      },
      deprecate(message) {
        if (!isProd) {
          console.warn(`[Knex Deprecated] ${message}`);
        }
      },
      debug(message) {
        if (environment === 'development') {
          console.log(`[Knex Debug] ${message}`);
        }
      },
    },

    // Migrations
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
      extension: 'ts',
      loadExtensions: ['.ts'],
      disableMigrationsListValidation: false,
    },

    // Seeds
    seeds: {
      directory: './seeds',
      extension: 'ts',
      loadExtensions: ['.ts'],
    },

    // Post-processing hooks
    postProcessResponse: (result: any) => {
      // Convert string dates to Date objects
      if (Array.isArray(result)) {
        return result.map(convertDates);
      }
      return convertDates(result);
    },

    // Pre-processing hooks
    wrapIdentifier: (value: string, origImpl: (value: string) => string) => {
      // Keep original casing for identifiers
      return origImpl(value);
    },
  };
}

/**
 * Helper function to convert date strings to Date objects
 */
function convertDates(row: any): any {
  if (!row || typeof row !== 'object') {
    return row;
  }

  const dateFields = [
    'created_at',
    'updated_at',
    'deleted_at',
    'last_login_at',
    'expires_at',
    'matched_at',
    'last_activity_at',
    'unmatched_at',
    'uploaded_at',
    'processed_at',
  ];

  const converted = { ...row };

  dateFields.forEach((field) => {
    if (converted[field] && typeof converted[field] === 'string') {
      converted[field] = new Date(converted[field]);
    }
  });

  return converted;
}

/**
 * Connection pool health check
 */
export async function checkPoolHealth(knex: Knex): Promise<{
  healthy: boolean;
  stats: any;
  error?: string;
}> {
  try {
    // Test query
    await knex.raw('SELECT 1');

    // Get pool stats
    const pool = (knex.client as any).pool;
    const stats = {
      numUsed: pool.numUsed(),
      numFree: pool.numFree(),
      numPendingAcquires: pool.numPendingAcquires(),
      numPendingCreates: pool.numPendingCreates(),
    };

    return {
      healthy: true,
      stats,
    };
  } catch (error: any) {
    return {
      healthy: false,
      stats: null,
      error: error.message,
    };
  }
}

/**
 * Graceful pool shutdown
 */
export async function gracefulShutdown(knex: Knex, timeoutMs: number = 5000): Promise<void> {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Pool shutdown timeout')), timeoutMs)
  );

  const shutdown = knex.destroy();

  try {
    await Promise.race([shutdown, timeout]);
    console.log('Database pool closed gracefully');
  } catch (error) {
    console.error('Error during pool shutdown:', error);
    throw error;
  }
}

/**
 * Export default configurations for each service type
 */
export const ConnectionPoolPresets = {
  // User Service - High traffic
  userService: (env: string) =>
    getOptimizedKnexConfig(
      env as any,
      'high-traffic',
      process.env.DB_NAME || 'flamoral_users'
    ),

  // Matching Service - High traffic
  matchingService: (env: string) =>
    getOptimizedKnexConfig(
      env as any,
      'high-traffic',
      process.env.DB_NAME || 'flamoral_matching'
    ),

  // Payment Service - Medium traffic
  paymentService: (env: string) =>
    getOptimizedKnexConfig(
      env as any,
      'medium-traffic',
      process.env.DB_NAME || 'flamoral_payments'
    ),

  // Media Service - Medium traffic
  mediaService: (env: string) =>
    getOptimizedKnexConfig(
      env as any,
      'medium-traffic',
      process.env.DB_NAME || 'flamoral_media'
    ),

  // Analytics Service - Low traffic
  analyticsService: (env: string) =>
    getOptimizedKnexConfig(
      env as any,
      'low-traffic',
      process.env.DB_NAME || 'flamoral_analytics'
    ),

  // Notification Service - Medium traffic
  notificationService: (env: string) =>
    getOptimizedKnexConfig(
      env as any,
      'medium-traffic',
      process.env.DB_NAME || 'flamoral_notifications'
    ),
};

export default {
  getOptimizedKnexConfig,
  getEnhancedPoolConfig,
  getPostgresConfig,
  checkPoolHealth,
  gracefulShutdown,
  ConnectionPoolPresets,
};
