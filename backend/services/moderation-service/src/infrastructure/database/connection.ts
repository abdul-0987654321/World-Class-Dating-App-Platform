import knex, { Knex } from 'knex';
import config from '../../config';
import { createLogger } from '@connectsphere/shared';

const logger = createLogger('database-connection');

const dbConfig: Knex.Config = {
  client: 'postgresql',
  connection: {
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: 2,
    max: 10,
    afterCreate: (conn: any, done: any) => {
      logger.info('New database connection established');
      done(null, conn);
    },
  },
  acquireConnectionTimeout: 10000,
};

const db: Knex = knex(dbConfig);

// Test connection
db.raw('SELECT 1')
  .then(() => {
    logger.info('Database connection successful');
  })
  .catch((error) => {
    logger.error('Database connection failed:', error);
  });

export default db;
