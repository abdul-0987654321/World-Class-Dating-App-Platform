/**
 * PostgreSQL Database Client for Analytics Service
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import config from '../../config';

class DatabaseClient {
  private pool: Pool | null = null;
  private initialized = false;

  /**
   * Initialize database connection pool
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('Initializing PostgreSQL connection pool...');

      this.pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
        min: config.database.poolMin,
        max: config.database.poolMax,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      // Enable TimescaleDB if configured
      if (config.database.enableTimescaleDB) {
        await this.enableTimescaleDB();
      }

      this.initialized = true;
      console.log('PostgreSQL connection pool initialized successfully');
    } catch (error: any) {
      console.error('Failed to initialize database connection:', error);
      throw error;
    }
  }

  /**
   * Enable TimescaleDB extension for time-series data
   */
  private async enableTimescaleDB(): Promise<void> {
    try {
      console.log('Enabling TimescaleDB extension...');

      await this.query('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE');

      // Convert tracking_events table to hypertable (if not already)
      const hypertableExists = await this.query(`
        SELECT * FROM timescaledb_information.hypertables
        WHERE hypertable_name = 'tracking_events'
      `);

      if (hypertableExists.rows.length === 0) {
        await this.query(`
          SELECT create_hypertable('tracking_events', 'created_at',
            if_not_exists => TRUE,
            migrate_data => TRUE
          )
        `);
        console.log('tracking_events table converted to TimescaleDB hypertable');
      }

      // Create retention policy for old data
      await this.query(`
        SELECT add_retention_policy('tracking_events',
          INTERVAL '${config.analytics.dataRetentionDays} days',
          if_not_exists => TRUE
        )
      `);

      console.log('TimescaleDB extension enabled successfully');
    } catch (error: any) {
      console.warn('TimescaleDB setup warning:', error.message);
      // Don't throw - TimescaleDB is optional
    }
  }

  /**
   * Execute a SQL query
   */
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    try {
      const result = await this.pool.query<T>(text, params);
      return result;
    } catch (error: any) {
      console.error('Query error:', error);
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    return await this.pool.connect();
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();

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
  }

  /**
   * Run database migrations
   */
  async runMigrations(): Promise<void> {
    try {
      console.log('Running database migrations...');

      // Check if migrations table exists
      const { rows } = await this.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'migrations'
        )
      `);

      if (!rows[0].exists) {
        // Create migrations table
        await this.query(`
          CREATE TABLE migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            executed_at TIMESTAMP DEFAULT NOW()
          )
        `);
        console.log('Created migrations table');
      }

      // Check if main migration has run
      const migrationResult = await this.query(
        "SELECT * FROM migrations WHERE name = '001_create_tracking_tables'"
      );

      if (migrationResult.rows.length === 0) {
        console.log('Migration 001_create_tracking_tables not found. Please run manually.');
        // In production, you would read and execute the SQL file here
        // For now, we'll just log that it needs to be run
      } else {
        console.log('Database migrations are up to date');
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      // Don't throw - allow service to start even if migrations fail
    }
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.pool) {
        return false;
      }

      const result = await this.query('SELECT 1 as health');
      return result.rows[0].health === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.pool) {
      console.log('Closing database connection pool...');
      await this.pool.end();
      this.pool = null;
      this.initialized = false;
      console.log('Database connection closed');
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

// Export singleton instance
export const dbClient = new DatabaseClient();
export default dbClient;
