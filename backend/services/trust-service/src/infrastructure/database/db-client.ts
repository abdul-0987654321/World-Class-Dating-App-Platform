/**
 * Database Client
 * Knex instance for PostgreSQL
 */

import knex, { Knex } from 'knex';
import { config } from '../../config';

const knexConfig: Knex.Config = {
  client: 'pg',
  connection: {
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
  },
};

export const db = knex(knexConfig);

export async function initializeDatabase(): Promise<void> {
  try {
    await db.raw('SELECT 1');
    console.log('Database connection established');
    await db.migrate.latest();
    console.log('Database migrations completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  await db.destroy();
  console.log('Database connection closed');
}

export default db;
