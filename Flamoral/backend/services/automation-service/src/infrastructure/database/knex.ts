import knex, { Knex } from 'knex';
import config from '../../config';

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
    ssl: config.database.ssl ? { rejectUnauthorized: true } : false,
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
    console.log('[Database] PostgreSQL connection established');

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

    console.log('[Database] Tables initialized successfully');
  } catch (error: any) {
    console.error('[Database] Initialization failed:', error.message);
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  try {
    await db.destroy();
    console.log('[Database] Connection closed');
  } catch (error: any) {
    console.error('[Database] Error closing connection:', error.message);
  }
}

export default db;
