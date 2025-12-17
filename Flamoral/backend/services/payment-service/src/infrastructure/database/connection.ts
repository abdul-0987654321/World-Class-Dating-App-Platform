import knex, { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';
import logger from '../../utils/logger';

dotenv.config();

const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'flamoral_payments',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    acquireTimeoutMillis: 60000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
  },
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    tableName: 'knex_migrations',
    extension: 'ts',
    loadExtensions: ['.ts'],
  },
  seeds: {
    directory: path.join(__dirname, 'seeds'),
    extension: 'ts',
    loadExtensions: ['.ts'],
  },
  debug: process.env.NODE_ENV === 'development' && process.env.DB_DEBUG === 'true',
  log: {
    warn(message: any) {
      logger.warn('Database warning:', message);
    },
    error(message: any) {
      logger.error('Database error:', message);
    },
    deprecate(message: any) {
      logger.warn('Database deprecation:', message);
    },
    debug(message: any) {
      if (process.env.DB_DEBUG === 'true') {
        logger.debug('Database debug:', message);
      }
    },
  },
};

export const db = knex(config);

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    logger.info('Testing database connection...');
    await db.raw('SELECT 1');
    logger.info('Database connection successful');
    return true;
  } catch (error: any) {
    logger.error('Database connection failed:', error.message);
    return false;
  }
};

// Graceful shutdown
export const closeConnection = async (): Promise<void> => {
  try {
    logger.info('Closing database connection...');
    await db.destroy();
    logger.info('Database connection closed successfully');
  } catch (error: any) {
    logger.error('Error closing database connection:', error.message);
    throw error;
  }
};

// Handle connection errors
db.on('query-error', (error: Error, obj: Knex.QueryBuilder) => {
  logger.error('Database query error:', {
    error: error.message,
    sql: obj.toString(),
  });
});

// Connection pool events
if (process.env.DB_DEBUG === 'true') {
  db.client.pool.on('createSuccess', (eventId: any) => {
    logger.debug('Database connection created', { eventId });
  });

  db.client.pool.on('createFail', (error: any) => {
    logger.error('Database connection creation failed', { error });
  });

  db.client.pool.on('acquireSuccess', (eventId: any) => {
    logger.debug('Database connection acquired', { eventId });
  });

  db.client.pool.on('acquireFail', (error: any) => {
    logger.error('Database connection acquisition failed', { error });
  });

  db.client.pool.on('release', (resource: any) => {
    logger.debug('Database connection released');
  });

  db.client.pool.on('destroySuccess', (eventId: any) => {
    logger.debug('Database connection destroyed', { eventId });
  });
}

// Initialize connection on startup
const initializeDatabase = async () => {
  try {
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }
  } catch (error: any) {
    logger.error('Database initialization failed:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

// Run initialization if not in test environment
if (process.env.NODE_ENV !== 'test') {
  initializeDatabase();
}

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing database connection...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing database connection...');
  await closeConnection();
  process.exit(0);
});

export default db;
