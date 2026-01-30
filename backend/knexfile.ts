/**
 * Knex Configuration File
 * Used by knex CLI for migrations and seeds
 */

import type { Knex } from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('DB Config:', {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'flamoral',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD ? '***set***' : '***not set***',
});

// Security: Require DB_PASSWORD in production
const getDbPassword = (): string => {
  const password = process.env.DB_PASSWORD;
  if (password) return password;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL: DB_PASSWORD is required in production');
  }
  return 'postgres_dev_password';
};

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'flamoral',
      user: process.env.DB_USER || 'postgres',
      password: getDbPassword(),
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './src/db/migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/db/seeds',
    },
  },

  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './src/db/migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/db/seeds',
    },
  },
};

export default config;
