/**
 * Database Connection Configuration
 */

import knex from 'knex';
import { config } from './index';

export const db = knex({
  client: 'postgresql',
  connection: {
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    } : false,
    connectionTimeoutMillis: 10000,
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 60000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createTimeoutMillis: 30000,
    propagateCreateError: false,
  },
  migrations: {
    directory: './src/infrastructure/database/migrations',
    extension: 'ts',
    tableName: 'knex_migrations',
    loadExtensions: ['.ts'],
  },
  seeds: {
    directory: './src/infrastructure/database/seeds',
    extension: 'ts',
    loadExtensions: ['.ts'],
  },
  debug: process.env.NODE_ENV === 'development' && process.env.DB_DEBUG === 'true',
  asyncStackTraces: process.env.NODE_ENV === 'development',
});

// Test database connection with retries
export async function testConnection(maxRetries: number = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await db.raw('SELECT 1');
      console.log('Database connection successful');
      return true;
    } catch (error: any) {
      console.error(`Database connection attempt ${attempt}/${maxRetries} failed:`, {
        error: error.message,
        code: error.code,
      });

      if (attempt < maxRetries) {
        const delay = attempt * 2000; // Exponential backoff: 2s, 4s, 6s
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error('Database connection failed after all retries');
  return false;
}

// Graceful shutdown
export async function closeConnection(): Promise<void> {
  try {
    await db.destroy();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}
