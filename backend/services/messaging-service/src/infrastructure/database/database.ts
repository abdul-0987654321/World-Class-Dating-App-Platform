/**
 * PostgreSQL Database Connection for Messaging Service
 *
 * Uses PostgreSQL with Knex query builder for consistency
 * with other services in the backend.
 */

import knex, { Knex } from 'knex';

import { createLogger } from '../../utils/logger';

const logger = createLogger('database');

const isProduction = process.env.NODE_ENV === 'production';
const isStaging = process.env.NODE_ENV === 'staging';

/**
 * PostgreSQL connection configuration
 */
function getConnectionConfig(): Knex.PgConnectionConfig {
  // Support DATABASE_URL (provided by Railway and other PaaS)
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '5432', 10),
      database: url.pathname.slice(1),
      user: url.username,
      password: decodeURIComponent(url.password),
      ssl: process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
      application_name: `flamoral_messaging_${process.env.NODE_ENV || 'development'}`,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    };
  }
  return {
    host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.DB_NAME || process.env.POSTGRES_DATABASE || 'flamoral_messaging',
    user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || '',
    ssl: isProduction || isStaging ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    application_name: `flamoral_messaging_${process.env.NODE_ENV || 'development'}`,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };
}

/**
 * Pool configuration optimized for messaging service (high traffic)
 */
function getPoolConfig(): Knex.PoolConfig {
  const poolSizes = {
    development: { min: 2, max: 10 },
    test: { min: 0, max: 5 },
    staging: { min: 5, max: 20 },
    production: { min: 10, max: 50 },
  };

  const env = (process.env.NODE_ENV || 'development') as keyof typeof poolSizes;
  const { min, max } = poolSizes[env] || poolSizes.development;

  return {
    min,
    max,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
    propagateCreateError: false,
  };
}

/**
 * Create the Knex configuration
 */
function getKnexConfig(): Knex.Config {
  return {
    client: 'postgresql',
    connection: getConnectionConfig(),
    pool: getPoolConfig(),
    asyncStackTraces: !isProduction,
    debug: process.env.NODE_ENV === 'development' && process.env.DB_DEBUG === 'true',
  };
}

class DatabaseClient {
  private _db: Knex | null = null;
  private _initialized = false;

  /**
   * Get the database connection instance
   */
  get db(): Knex {
    if (!this._db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this._db;
  }

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    try {
      logger.info('Initializing PostgreSQL connection...');

      this._db = knex(getKnexConfig());

      // Test the connection
      await this._db.raw('SELECT 1');

      this._initialized = true;
      logger.info('PostgreSQL connection established successfully');
    } catch (error: any) {
      logger.error('PostgreSQL initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this._db) {
      await this._db.destroy();
      this._db = null;
      this._initialized = false;
      logger.info('PostgreSQL connection closed');
    }
  }

  /**
   * Health check for the database connection
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      await this.db.raw('SELECT 1');
      const latency = Date.now() - start;
      return { healthy: true, latency };
    } catch (error: any) {
      return { healthy: false, error: error.message };
    }
  }
}

// Export singleton instance
export const databaseClient = new DatabaseClient();
export default databaseClient;

// Export Knex type for use in repositories
export { Knex };
