import type { Knex } from 'knex';
import path from 'path';
import { config } from '../../config';

const knexConfig: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: {
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: true } : false,
    },
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, 'migrations'),
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
    seeds: {
      directory: path.join(__dirname, 'seeds'),
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
  },

  test: {
    client: 'postgresql',
    connection: {
      host: config.database.host,
      port: config.database.port,
      database: `${config.database.name}_test`,
      user: config.database.user,
      password: config.database.password,
    },
    pool: {
      min: 0,
      max: 5,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 10000,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, 'migrations'),
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
    seeds: {
      directory: path.join(__dirname, 'seeds'),
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
  },

  staging: {
    client: 'postgresql',
    connection: {
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      ssl: { rejectUnauthorized: true },
    },
    pool: {
      min: 2,
      max: 20,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, 'migrations'),
      extension: 'ts',
      loadExtensions: ['.ts', '.js'],
    },
    seeds: {
      directory: path.join(__dirname, 'seeds'),
      extension: 'ts',
      loadExtensions: ['.ts', '.js'],
    },
  },

  production: {
    client: 'postgresql',
    connection: {
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      ssl: { rejectUnauthorized: true },
    },
    pool: {
      min: 5,
      max: 30,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      propagateCreateError: false,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, 'migrations'),
      extension: 'ts',
      loadExtensions: ['.ts', '.js'],
    },
    seeds: {
      directory: path.join(__dirname, 'seeds'),
      extension: 'ts',
      loadExtensions: ['.ts', '.js'],
    },
  },
};

export default knexConfig;
