/**
 * Database Client for Conversation Intelligence Service
 */

import { createLogger } from '@flamoral/backend-shared';
import knex, { Knex } from 'knex';

import config from '../../config';

const logger = createLogger('conversation-db');

class DatabaseClient {
  private db: Knex | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.db = knex({
        client: 'pg',
        connection: {
          host: config.database.host,
          port: config.database.port,
          database: config.database.name,
          user: config.database.user,
          password: config.database.password,
          ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
        },
        pool: {
          min: 2,
          max: config.nodeEnv === 'production' ? 20 : 10,
          acquireTimeoutMillis: 30000,
          createTimeoutMillis: 30000,
          idleTimeoutMillis: 30000,
        },
      });

      await this.db.raw('SELECT 1');
      this.isInitialized = true;
      logger.info('Database connection established');
    } catch (error: any) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  getClient(): Knex {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) return false;
      await this.db.raw('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  getPoolStats(): { used: number; free: number; pending: number } {
    if (!this.db) {
      return { used: 0, free: 0, pending: 0 };
    }
    const pool = this.db.client.pool;
    return {
      used: pool.numUsed?.() || 0,
      free: pool.numFree?.() || 0,
      pending: pool.numPendingAcquires?.() || 0,
    };
  }

  async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    try {
      logger.info('Running database migrations...');
      await this.db.migrate.latest({
        directory: __dirname + '/migrations',
      });
      logger.info('Migrations completed');
    } catch (error: any) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.destroy();
      this.db = null;
      this.isInitialized = false;
      logger.info('Database connection closed');
    }
  }
}

export const dbClient = new DatabaseClient();
