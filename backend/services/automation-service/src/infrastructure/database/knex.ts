import knex, { Knex } from 'knex';
import { createLogger } from '@flamoral/backend-shared';
import config from '../../config';

const logger = createLogger('automation-service:database');

/**
 * Knex database connection configuration
 */
const knexConfig: Knex.Config = {
  client: 'pg',
  connection: {
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: config.database.pool.min,
    max: config.database.pool.max,
  },
  acquireConnectionTimeout: 10000,
};

/**
 * Create and export Knex instance
 */
export const db = knex(knexConfig);

/**
 * Initialize database connection and create tables
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Test connection
    await db.raw('SELECT 1');
    logger.info('PostgreSQL connection established');

    // Import table creation scripts
    const {
      createAutomationFlowsTable,
      createFlowExecutionsTable,
    } = await import('../../models/automation-flow.model');

    const {
      createIcebreakerSuggestionsTable,
    } = await import('../../models/icebreaker.model');

    const {
      createScheduledMessagesTable,
      createConversationHealthTable,
      createGhostingDetectionsTable,
      createReEngagementAttemptsTable,
    } = await import('../../models/scheduled-message.model');

    // Create tables
    await db.raw(createAutomationFlowsTable);
    await db.raw(createFlowExecutionsTable);
    await db.raw(createIcebreakerSuggestionsTable);
    await db.raw(createScheduledMessagesTable);
    await db.raw(createConversationHealthTable);
    await db.raw(createGhostingDetectionsTable);
    await db.raw(createReEngagementAttemptsTable);

    logger.info('Tables initialized successfully');
  } catch (error: any) {
    logger.error('Initialization failed', { error: error.message });
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  try {
    await db.destroy();
    logger.info('Connection closed');
  } catch (error: any) {
    logger.error('Error closing connection', { error: error.message });
  }
}

export default db;
