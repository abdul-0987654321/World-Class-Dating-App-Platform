/**
 * Database Configuration
 * PostgreSQL and MongoDB connections
 */

import { Knex, knex } from 'knex';
import { MongoClient, Db } from 'mongodb';
import { logger } from '../utils/logger';

// PostgreSQL connection
let postgresConnection: Knex | null = null;

export const postgresConfig: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'connectsphere',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: Number(process.env.DB_POOL_MIN) || 2,
    max: Number(process.env.DB_POOL_MAX) || 10,
  },
  migrations: {
    directory: './migrations/postgres',
    extension: 'ts',
  },
  seeds: {
    directory: './seeds/postgres',
  },
};

export function getPostgresConnection(): Knex {
  if (!postgresConnection) {
    postgresConnection = knex(postgresConfig);
  }
  return postgresConnection;
}

// MongoDB connection
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;

export async function connectMongoDB(): Promise<Db> {
  if (mongoDb) {
    return mongoDb;
  }

  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/connectsphere';
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    mongoDb = mongoClient.db(process.env.MONGODB_DB || 'connectsphere');
    logger.info('MongoDB connected successfully');
    return mongoDb;
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    throw error;
  }
}

export function getMongoDb(): Db {
  if (!mongoDb) {
    throw new Error('MongoDB not connected. Call connectMongoDB() first.');
  }
  return mongoDb;
}

// Connect all databases
export async function connectDatabases() {
  try {
    // Test PostgreSQL connection
    const pg = getPostgresConnection();
    await pg.raw('SELECT 1');
    logger.info('PostgreSQL connected successfully');

    // Connect MongoDB
    await connectMongoDB();

    logger.info('All databases connected');
  } catch (error) {
    logger.error('Database connection error:', error);
    throw error;
  }
}

// Disconnect all databases
export async function disconnectDatabases() {
  try {
    if (postgresConnection) {
      await postgresConnection.destroy();
      logger.info('PostgreSQL disconnected');
    }

    if (mongoClient) {
      await mongoClient.close();
      logger.info('MongoDB disconnected');
    }
  } catch (error) {
    logger.error('Error disconnecting databases:', error);
    throw error;
  }
}
