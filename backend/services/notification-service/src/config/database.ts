/**
 * Database Connection Configuration
 */

import { createLogger } from '@flamoral/backend-shared';
import knex from 'knex';

import { config } from './index';

const logger = createLogger('database');

export const db = knex({
  client: 'postgresql',
  connection: config.database,
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: './src/infrastructure/database/migrations',
    extension: 'ts',
  },
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    return false;
  }
}
