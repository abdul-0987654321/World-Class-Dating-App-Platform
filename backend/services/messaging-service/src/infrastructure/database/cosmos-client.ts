import { CosmosClient, Container, Database } from '@azure/cosmos';
import { createLogger } from '@flamoral/shared';
import config from '../../config';

const logger = createLogger('cosmos-db');

class CosmosDBClient {
  private client: CosmosClient;
  private database: Database | null = null;
  private messagesContainer: Container | null = null;
  private conversationsContainer: Container | null = null;
  private initialized = false;

  constructor() {
    this.client = new CosmosClient({
      endpoint: config.cosmosDB.endpoint,
      key: config.cosmosDB.key,
    });
  }

  /**
   * Initialize database and containers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing Cosmos DB connection...');

      // Get or create database
      const { database } = await this.client.databases.createIfNotExists({
        id: config.cosmosDB.databaseId,
      });
      this.database = database;
      logger.info(`Database "${config.cosmosDB.databaseId}" ready`);

      // Get or create Messages container
      const { container: messagesContainer } = await database.containers.createIfNotExists({
        id: config.cosmosDB.containers.messages,
        partitionKey: '/conversationId',
        indexingPolicy: {
          automatic: true,
          indexingMode: 'consistent',
          includedPaths: [{ path: '/*' }],
          excludedPaths: [{ path: '/"_etag"/?' }],
        },
      });
      this.messagesContainer = messagesContainer;
      logger.info(`Container "${config.cosmosDB.containers.messages}" ready`);

      // Get or create Conversations container
      const { container: conversationsContainer } = await database.containers.createIfNotExists({
        id: config.cosmosDB.containers.conversations,
        partitionKey: '/id',
        indexingPolicy: {
          automatic: true,
          indexingMode: 'consistent',
          includedPaths: [{ path: '/*' }],
          excludedPaths: [{ path: '/"_etag"/?' }],
        },
      });
      this.conversationsContainer = conversationsContainer;
      logger.info(`Container "${config.cosmosDB.containers.conversations}" ready`);

      this.initialized = true;
      logger.info('Cosmos DB initialization complete');
    } catch (error: any) {
      logger.error('Cosmos DB initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get Messages container
   */
  getMessagesContainer(): Container {
    if (!this.messagesContainer) {
      throw new Error('Cosmos DB not initialized. Call initialize() first.');
    }
    return this.messagesContainer;
  }

  /**
   * Get Conversations container
   */
  getConversationsContainer(): Container {
    if (!this.conversationsContainer) {
      throw new Error('Cosmos DB not initialized. Call initialize() first.');
    }
    return this.conversationsContainer;
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
    // Cosmos SDK doesn't require explicit connection closing
    this.initialized = false;
    logger.info('Cosmos DB client closed');
  }
}

// Export singleton instance
export const cosmosClient = new CosmosDBClient();
export default cosmosClient;
