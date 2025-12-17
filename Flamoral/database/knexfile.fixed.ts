/**
 * IMPROVED KNEXFILE FOR FLAMORAL - AZURE POSTGRESQL READY
 *
 * This file includes:
 * - Proper SSL configuration for Azure PostgreSQL
 * - Connection timeout settings
 * - Pool configuration with retry logic
 * - Environment-based configuration
 *
 * To use this file:
 * 1. Review the configuration
 * 2. Test in staging environment first
 * 3. Backup current knexfile.ts
 * 4. Replace knexfile.ts with this file (rename to knexfile.ts)
 * 5. Add required environment variables to .env
 */

import type { Knex } from 'knex';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Helper function to configure SSL for Azure PostgreSQL
 *
 * Azure PostgreSQL requires SSL in production/staging.
 * This function allows flexible SSL configuration via environment variables.
 */
const getSSLConfig = (): boolean | { rejectUnauthorized: boolean; ca?: string } => {
  // If DB_SSL is not explicitly set to 'true', disable SSL (for local dev)
  if (process.env.DB_SSL !== 'true') {
    return false;
  }

  // SSL is enabled - configure based on environment variables
  return {
    // Reject unauthorized certificates by default (can be disabled for testing)
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    // Optional: Provide CA certificate for Azure PostgreSQL
    // Download from: https://learn.microsoft.com/en-us/azure/postgresql/single-server/concepts-ssl-connection-security
    ca: process.env.DB_SSL_CA,
  };
};

/**
 * Log database configuration (without sensitive data)
 */
const logConfig = () => {
  console.log('[Knex Config] Environment:', process.env.NODE_ENV || 'development');
  console.log('[Knex Config] Host:', process.env.DB_HOST || 'localhost');
  console.log('[Knex Config] Database:', process.env.DB_NAME || 'flamoral_dev');
  console.log('[Knex Config] SSL Enabled:', process.env.DB_SSL === 'true');
  console.log('[Knex Config] Pool Size:', {
    min: process.env.DB_POOL_MIN || 'default',
    max: process.env.DB_POOL_MAX || 'default',
  });
};

// Log configuration on load
logConfig();

const config: { [key: string]: Knex.Config } = {
  /**
   * DEVELOPMENT ENVIRONMENT
   *
   * Used for local development with PostgreSQL running locally or in Docker.
   * SSL is disabled by default.
   */
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'flamoral_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      // SSL typically not needed for local development
      ssl: false,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
    debug: process.env.DB_DEBUG === 'true',
  },

  /**
   * STAGING ENVIRONMENT
   *
   * Used for pre-production testing with Azure PostgreSQL.
   * SSL is required and configured via environment variables.
   */
  staging: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,

      // SSL Configuration for Azure PostgreSQL
      ssl: getSSLConfig(),

      // Connection Timeouts
      // How long to wait for initial connection
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
      // Query execution timeout
      query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '60000'),
      // Statement timeout (for long-running queries like migrations)
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '120000'),
      // How long a connection can be idle
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    },
    pool: {
      // Minimum number of connections to maintain
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      // Maximum number of connections
      max: parseInt(process.env.DB_POOL_MAX || '10'),

      // Pool Timeouts
      // How long to wait for an available connection
      acquireTimeoutMillis: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '60000'),
      // How long to wait when creating a new connection
      createTimeoutMillis: parseInt(process.env.DB_POOL_CREATE_TIMEOUT || '30000'),
      // How long to wait when destroying a connection
      destroyTimeoutMillis: parseInt(process.env.DB_POOL_DESTROY_TIMEOUT || '5000'),
      // How long before an idle connection is destroyed
      idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
      // How often to check for idle connections
      reapIntervalMillis: parseInt(process.env.DB_POOL_REAP_INTERVAL || '1000'),
      // Delay between connection creation retry attempts
      createRetryIntervalMillis: parseInt(process.env.DB_POOL_CREATE_RETRY_INTERVAL || '200'),

      // Log pool events (set DB_POOL_LOGGING=true for debugging)
      log: (message: string, logLevel: string) => {
        if (process.env.DB_POOL_LOGGING === 'true') {
          console.log(`[DB Pool - ${logLevel}]`, message);
        }
      },
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
    },
    // Global connection acquisition timeout
    acquireConnectionTimeout: parseInt(process.env.DB_ACQUIRE_CONNECTION_TIMEOUT || '60000'),
  },

  /**
   * PRODUCTION ENVIRONMENT
   *
   * Used for live production environment with Azure PostgreSQL.
   *
   * Key differences from staging:
   * - Larger connection pool (5-30 vs 2-10)
   * - More conservative timeout settings
   * - Error propagation disabled for better resilience
   * - Separate seeds directory to prevent development data
   */
  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,

      // SSL is REQUIRED for Azure PostgreSQL in production
      ssl: getSSLConfig(),

      // Connection Timeouts (same as staging but can be customized)
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
      query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '60000'),
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '120000'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    },
    pool: {
      // Larger pool for production traffic
      min: parseInt(process.env.DB_POOL_MIN || '5'),
      max: parseInt(process.env.DB_POOL_MAX || '30'),

      // Pool Timeouts (same as staging)
      acquireTimeoutMillis: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '60000'),
      createTimeoutMillis: parseInt(process.env.DB_POOL_CREATE_TIMEOUT || '30000'),
      destroyTimeoutMillis: parseInt(process.env.DB_POOL_DESTROY_TIMEOUT || '5000'),
      idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
      reapIntervalMillis: parseInt(process.env.DB_POOL_REAP_INTERVAL || '1000'),
      createRetryIntervalMillis: parseInt(process.env.DB_POOL_CREATE_RETRY_INTERVAL || '200'),

      // Don't propagate connection creation errors immediately - retry instead
      propagateCreateError: false,

      // Log pool events (typically disabled in production)
      log: (message: string, logLevel: string) => {
        if (process.env.DB_POOL_LOGGING === 'true') {
          console.log(`[DB Pool - ${logLevel}]`, message);
        }
      },
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
      extension: 'ts',
    },
    seeds: {
      // Use separate seeds directory for production
      // This should only contain reference data, never user data
      directory: './seeds/production',
      extension: 'ts',
    },
    // Global connection acquisition timeout
    acquireConnectionTimeout: parseInt(process.env.DB_ACQUIRE_CONNECTION_TIMEOUT || '60000'),
  },

  /**
   * TEST ENVIRONMENT
   *
   * Used for running automated tests.
   * Typically uses a separate test database.
   */
  test: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'flamoral_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    },
    pool: {
      min: 0,
      max: 5,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
    },
  },
};

export default config;

/**
 * ENVIRONMENT VARIABLES REFERENCE
 *
 * Required for all environments:
 * - DB_HOST: Database host (e.g., flamoral-prod-postgres.postgres.database.azure.com)
 * - DB_PORT: Database port (default: 5432)
 * - DB_NAME: Database name
 * - DB_USER: Database user
 * - DB_PASSWORD: Database password (store in Azure Key Vault)
 *
 * SSL Configuration (staging/production):
 * - DB_SSL: Set to 'true' to enable SSL
 * - DB_SSL_REJECT_UNAUTHORIZED: Set to 'false' to disable certificate validation (not recommended)
 * - DB_SSL_CA: Path to CA certificate file (optional)
 *
 * Connection Timeouts:
 * - DB_CONNECTION_TIMEOUT: Initial connection timeout (default: 30000ms)
 * - DB_QUERY_TIMEOUT: Query execution timeout (default: 60000ms)
 * - DB_STATEMENT_TIMEOUT: Statement timeout for long queries (default: 120000ms)
 * - DB_IDLE_TIMEOUT: Idle connection timeout (default: 30000ms)
 *
 * Pool Configuration:
 * - DB_POOL_MIN: Minimum pool size (default: 2 staging, 5 production)
 * - DB_POOL_MAX: Maximum pool size (default: 10 staging, 30 production)
 * - DB_POOL_ACQUIRE_TIMEOUT: Wait time for available connection (default: 60000ms)
 * - DB_POOL_CREATE_TIMEOUT: Wait time for new connection (default: 30000ms)
 * - DB_POOL_DESTROY_TIMEOUT: Wait time for connection destruction (default: 5000ms)
 * - DB_POOL_IDLE_TIMEOUT: Idle time before destruction (default: 30000ms)
 * - DB_POOL_REAP_INTERVAL: Check interval for idle connections (default: 1000ms)
 * - DB_POOL_CREATE_RETRY_INTERVAL: Retry delay for failed connections (default: 200ms)
 * - DB_ACQUIRE_CONNECTION_TIMEOUT: Global acquire timeout (default: 60000ms)
 *
 * Debugging:
 * - DB_DEBUG: Set to 'true' to enable query debugging
 * - DB_POOL_LOGGING: Set to 'true' to enable pool event logging
 */
