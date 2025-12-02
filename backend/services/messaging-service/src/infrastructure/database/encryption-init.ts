import { CosmosClient, Database } from '@azure/cosmos';
import { createLogger } from '@flamoral/shared';
import {
  ENCRYPTION_CONTAINERS,
  ENCRYPTION_INDEXING_POLICIES,
  ENCRYPTION_TTL_SETTINGS,
} from './encryption-schema';

const logger = createLogger('encryption-db-init');

/**
 * Initialize Cosmos DB containers for encryption data
 * Run this as part of database setup/migration
 */
export class EncryptionDatabaseInitializer {
  private client: CosmosClient;
  private database: Database;

  constructor(client: CosmosClient, database: Database) {
    this.client = client;
    this.database = database;
  }

  /**
   * Initialize all encryption containers
   */
  async initializeAll(): Promise<void> {
    try {
      logger.info('Initializing encryption containers...');

      await Promise.all([
        this.initializeKeyBundlesContainer(),
        this.initializeSessionKeysContainer(),
        this.initializeOneTimePreKeysContainer(),
      ]);

      logger.info('All encryption containers initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize encryption containers:', error);
      throw error;
    }
  }

  /**
   * Initialize Key Bundles container
   */
  async initializeKeyBundlesContainer(): Promise<void> {
    try {
      const { container } = await this.database.containers.createIfNotExists({
        id: ENCRYPTION_CONTAINERS.KEY_BUNDLES,
        partitionKey: '/userId',
        indexingPolicy: ENCRYPTION_INDEXING_POLICIES.keyBundles,
        defaultTtl: ENCRYPTION_TTL_SETTINGS.KEY_BUNDLES,
      });

      logger.info(`Container "${ENCRYPTION_CONTAINERS.KEY_BUNDLES}" initialized`);
    } catch (error: any) {
      logger.error('Failed to initialize Key Bundles container:', error);
      throw error;
    }
  }

  /**
   * Initialize Session Keys container
   */
  async initializeSessionKeysContainer(): Promise<void> {
    try {
      const { container } = await this.database.containers.createIfNotExists({
        id: ENCRYPTION_CONTAINERS.SESSION_KEYS,
        partitionKey: '/conversationId',
        indexingPolicy: ENCRYPTION_INDEXING_POLICIES.sessionKeys,
        defaultTtl: ENCRYPTION_TTL_SETTINGS.SESSION_KEYS,
      });

      logger.info(`Container "${ENCRYPTION_CONTAINERS.SESSION_KEYS}" initialized`);
    } catch (error: any) {
      logger.error('Failed to initialize Session Keys container:', error);
      throw error;
    }
  }

  /**
   * Initialize One-Time Pre-Keys container
   */
  async initializeOneTimePreKeysContainer(): Promise<void> {
    try {
      const { container } = await this.database.containers.createIfNotExists({
        id: ENCRYPTION_CONTAINERS.ONE_TIME_PREKEYS,
        partitionKey: '/userId',
        indexingPolicy: ENCRYPTION_INDEXING_POLICIES.oneTimePreKeys,
        defaultTtl: ENCRYPTION_TTL_SETTINGS.ONE_TIME_PREKEYS,
      });

      logger.info(`Container "${ENCRYPTION_CONTAINERS.ONE_TIME_PREKEYS}" initialized`);
    } catch (error: any) {
      logger.error('Failed to initialize One-Time Pre-Keys container:', error);
      throw error;
    }
  }

  /**
   * Clean up expired encryption keys
   * Although TTL handles automatic deletion, this provides manual cleanup
   */
  async cleanupExpiredKeys(): Promise<void> {
    try {
      logger.info('Starting manual cleanup of expired encryption keys...');

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Clean up old session keys
      const sessionKeysContainer = this.database.container(
        ENCRYPTION_CONTAINERS.SESSION_KEYS
      );

      const { resources: expiredSessions } = await sessionKeysContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.lastUsedAt < @date',
          parameters: [{ name: '@date', value: thirtyDaysAgo.toISOString() }],
        })
        .fetchAll();

      for (const session of expiredSessions) {
        await sessionKeysContainer.item(session.id, session.conversationId).delete();
      }

      logger.info(`Cleaned up ${expiredSessions.length} expired session keys`);

      // Clean up used one-time pre-keys older than 90 days
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const oneTimeKeysContainer = this.database.container(
        ENCRYPTION_CONTAINERS.ONE_TIME_PREKEYS
      );

      const { resources: expiredKeys } = await oneTimeKeysContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.isUsed = true AND c.usedAt < @date',
          parameters: [{ name: '@date', value: ninetyDaysAgo.toISOString() }],
        })
        .fetchAll();

      for (const key of expiredKeys) {
        await oneTimeKeysContainer.item(key.id, key.userId).delete();
      }

      logger.info(`Cleaned up ${expiredKeys.length} expired one-time pre-keys`);
    } catch (error: any) {
      logger.error('Failed to cleanup expired keys:', error);
      throw error;
    }
  }
}

/**
 * Migration script to initialize encryption containers
 * Can be run standalone or as part of service startup
 */
export async function runEncryptionMigration(
  client: CosmosClient,
  databaseId: string
): Promise<void> {
  try {
    logger.info('Running encryption database migration...');

    // Get or create database
    const { database } = await client.databases.createIfNotExists({
      id: databaseId,
    });

    // Initialize containers
    const initializer = new EncryptionDatabaseInitializer(client, database);
    await initializer.initializeAll();

    logger.info('Encryption database migration completed successfully');
  } catch (error: any) {
    logger.error('Encryption database migration failed:', error);
    throw error;
  }
}

export default EncryptionDatabaseInitializer;
