import { CosmosClient, Database, Container } from '@azure/cosmos';
import { createLogger } from '../../utils/logger';
import config from '../../config';

const logger = createLogger('cosmos-db');

class CosmosDBClient {
  private client: CosmosClient | null = null;
  private database: Database | null = null;
  private messagesContainer: Container | null = null;
  private conversationsContainer: Container | null = null;

  /**
   * Initialize Cosmos DB connection
   */
  async connect(): Promise<void> {
    try {
      if (!config.cosmos.endpoint || !config.cosmos.key) {
        throw new Error('Cosmos DB credentials not configured. Please set COSMOS_ENDPOINT and COSMOS_KEY environment variables.');

      }

      this.client = new CosmosClient({
        endpoint: config.cosmos.endpoint,
        key: config.cosmos.key,
      });

      // Get or create database
      const { database } = await this.client.databases.createIfNotExists({
        id: config.cosmos.databaseId,
      });
      this.database = database;

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

      // Get or create Conversations container
      const { container: conversationsContainer } = await database.containers.createIfNotExists({
        id: config.cosmos.containers.conversations,
        partitionKey: '/matchId',
        indexingPolicy: {
          automatic: true,
          indexingMode: 'consistent',
          includedPaths: [{ path: '/*' }],
          excludedPaths: [{ path: '/"_etag"/?' }],
        },
      });
      this.conversationsContainer = conversationsContainer;

      logger.info('Connected to Cosmos DB successfully');
    } catch (error) {
      logger.error('Failed to connect to Cosmos DB', error);
      throw error;
    }
  }

  /**
   * Get Messages container
   */
  getMessagesContainer(): Container {
    if (!this.messagesContainer) {
      throw new Error('Messages container not initialized. Call connect() first.');
    }
    return this.messagesContainer;
  }

  /**
   * Get Conversations container
   */
  getConversationsContainer(): Container {
    if (!this.conversationsContainer) {
      throw new Error('Conversations container not initialized. Call connect() first.');
    }
    return this.conversationsContainer;
  }

  /**
   * Close connection
   */
  async disconnect(): Promise<void> {
    this.client = null;
    this.database = null;
    this.messagesContainer = null;
    this.conversationsContainer = null;
    logger.info('Disconnected from Cosmos DB');
  }
}

// Export singleton instance
export const cosmosDB = new CosmosDBClient();
export default cosmosDB;
