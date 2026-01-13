import knex, { Knex } from 'knex';

import config from '../../config';
import { createLogger } from '../../utils/logger';

const logger = createLogger('postgres-db');

class PostgresDBClient {
  private _db: Knex | null = null;
  private initialized = false;

  /**
   * Get Knex instance
   */
  get db(): Knex {
    if (!this._db) {
      throw new Error('PostgreSQL not initialized. Call initialize() first.');
    }
    return this._db;
  }

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing PostgreSQL connection...');

      this._db = knex({
        client: 'pg',
        connection: {
          host: process.env.POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
          user: process.env.POSTGRES_USER || 'flamoral',
          password: process.env.POSTGRES_PASSWORD || '',
          database: process.env.POSTGRES_DATABASE || 'flamoral_messaging',
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        },
        pool: {
          min: 2,
          max: 10,
        },
      });

      // Test connection
      await this._db.raw('SELECT 1');

      this.initialized = true;
      logger.info('PostgreSQL initialization complete');
    } catch (error: any) {
      logger.error('PostgreSQL initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this._db) {
      await this._db.destroy();
    }
    this.initialized = false;
    logger.info('PostgreSQL client closed');
  }

  /**
   * Get table accessor for messages
   */
  messages() {
    return this.db('messages');
  }

  /**
   * Get table accessor for conversations
   */
  conversations() {
    return this.db('conversations');
  }

  /**
   * Get table accessor for reactions
   */
  reactions() {
    return this.db('reactions');
  }

  /**
   * Get table accessor for gift transactions
   */
  giftTransactions() {
    return this.db('gift_transactions');
  }

  /**
   * Get table accessor for call history
   */
  callHistory() {
    return this.db('call_history');
  }

  /**
   * Get table accessor for call recordings
   */
  callRecordings() {
    return this.db('call_recordings');
  }

  /**
   * Get table accessor for chat exports
   */
  chatExports() {
    return this.db('chat_exports');
  }

  /**
   * Get table accessor for icebreakers
   */
  icebreakers() {
    return this.db('icebreakers');
  }

  /**
   * Get table accessor for icebreaker usage
   */
  icebreakerUsage() {
    return this.db('icebreaker_usage');
  }

  /**
   * Get table accessor for calendar connections
   */
  calendarConnections() {
    return this.db('calendar_connections');
  }

  /**
   * Get table accessor for date proposals
   */
  dateProposals() {
    return this.db('date_proposals');
  }

  /**
   * Get table accessor for scheduled dates
   */
  scheduledDates() {
    return this.db('scheduled_dates');
  }

  /**
   * Get table accessor for venue bookmarks
   */
  venueBookmarks() {
    return this.db('venue_bookmarks');
  }

  /**
   * Get table accessor for date reminders
   */
  dateReminders() {
    return this.db('date_reminders');
  }

  /**
   * Get table accessor for encryption key bundles
   */
  encryptionKeyBundles() {
    return this.db('encryption_key_bundles');
  }

  /**
   * Get table accessor for session keys
   */
  sessionKeys() {
    return this.db('session_keys');
  }
}

// Export singleton instance
export const postgresClient = new PostgresDBClient();
export default postgresClient;
