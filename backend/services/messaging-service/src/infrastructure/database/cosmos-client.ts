import { CosmosClient, Container, Database } from '@azure/cosmos';
import { createLogger } from '../../utils/logger';
import config from '../../config';

const logger = createLogger('cosmos-db');

class CosmosDBClient {
  private client: CosmosClient;
  private database: Database | null = null;
  private messagesContainer: Container | null = null;
  private conversationsContainer: Container | null = null;
  private reactionsContainer: Container | null = null;
  private initialized = false;

  constructor() {
    this.client = new CosmosClient({
      endpoint: config.cosmos.endpoint,
      key: config.cosmos.key,
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
        id: config.cosmos.databaseId,
      });
      this.database = database;
      logger.info(`Database "${config.cosmos.databaseId}" ready`);

      // Get or create Messages container
      const { container: messagesContainer } = await database.containers.createIfNotExists({
        id: config.cosmos.containers.messages,
        partitionKey: '/conversationId',
        indexingPolicy: {
          automatic: true,
          indexingMode: 'consistent',
          includedPaths: [{ path: '/*' }],
          excludedPaths: [{ path: '/"_etag"/?' }],
        },
      });
      this.messagesContainer = messagesContainer;
      logger.info(`Container "${config.cosmos.containers.messages}" ready`);

      // Get or create Conversations container
      const { container: conversationsContainer } = await database.containers.createIfNotExists({
        id: config.cosmos.containers.conversations,
        partitionKey: '/id',
        indexingPolicy: {
          automatic: true,
          indexingMode: 'consistent',
          includedPaths: [{ path: '/*' }],
          excludedPaths: [{ path: '/"_etag"/?' }],
        },
      });
      this.conversationsContainer = conversationsContainer;
      logger.info(`Container "${config.cosmos.containers.conversations}" ready`);

      // Get or create Reactions container
      const { container: reactionsContainer } = await database.containers.createIfNotExists({
        id: 'reactions',
        partitionKey: '/messageId',
        indexingPolicy: {
          automatic: true,
          indexingMode: 'consistent',
          includedPaths: [{ path: '/*' }],
          excludedPaths: [{ path: '/"_etag"/?' }],
        },
      });
      this.reactionsContainer = reactionsContainer;
      logger.info('Container "reactions" ready');

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
   * Get Reactions container
   */
  getReactionsContainer(): Container {
    if (!this.reactionsContainer) {
      throw new Error('Cosmos DB not initialized. Call initialize() first.');
    }
    return this.reactionsContainer;
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
