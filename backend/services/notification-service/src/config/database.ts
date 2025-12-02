/**
 * Database Connection Configuration
 */

import knex from 'knex';
import { config } from './index';

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
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
