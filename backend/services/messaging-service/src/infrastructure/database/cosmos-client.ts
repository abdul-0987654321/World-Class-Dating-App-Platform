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
  private giftTransactionsContainer: Container | null = null;
  private icebreakersContainer: Container | null = null;
  private icebreakerUsageContainer: Container | null = null;
  private callHistoryContainer: Container | null = null;
  private callRecordingsContainer: Container | null = null;
  private chatExportsContainer: Container | null = null;
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

      // Get or create GiftTransactions container
      const { container: giftTransactionsContainer } = await database.containers.createIfNotExists({
        id: 'GiftTransactions',
        partitionKey: '/recipientId',
        indexingPolicy: {
          automatic: true,
          indexingMode: 'consistent',
          includedPaths: [{ path: '/*' }],
          excludedPaths: [{ path: '/"_etag"/?' }],
          compositeIndexes: [
            [
              { path: '/senderId', order: 'ascending' },
              { path: '/createdAt', order: 'descending' },
            ],
            [
              { path: '/recipientId', order: 'ascending' },
              { path: '/createdAt', order: 'descending' },
            ],
          ],
        },
      });
      this.giftTransactionsContainer = giftTransactionsContainer;
      logger.info('Container "GiftTransactions" ready');

      // Get or create Icebreakers container
      const { container: icebreakersContainer } = await database.containers.createIfNotExists({
        id: 'Icebreakers',
        partitionKey: '/category',
        indexingPolicy: {
          automatic: true,
          indexingMode: 'consistent',
          includedPaths: [{ path: '/*' }],
          excludedPaths: [{ path: '/"_etag"/?' }],
          compositeIndexes: [
            [
              { path: '/category', order: 'ascending' },
              { path: '/popularity', order: 'descending' },
            ],
          ],
        },
      });
      this.icebreakersContainer = icebreakersContainer;
      logger.info('Container "Icebreakers" ready');

      // Get or create IcebreakerUsage container
      const { container: icebreakerUsageContainer } = await database.containers.createIfNotExists({
        id: 'IcebreakerUsage',
        partitionKey: '/userId',
        indexingPolicy: {
          automatic: true,
          indexingMode: 'consistent',
          includedPaths: [{ path: '/*' }],
          excludedPaths: [{ path: '/"_etag"/?' }],
        },
      });
      this.icebreakerUsageContainer = icebreakerUsageContainer;
      logger.info('Container "IcebreakerUsage" ready');

      // Get or create CallHistory container
      const { container: callHistoryContainer } = await database.containers.createIfNotExists({
        id: 'CallHistory',
        partitionKey: '/callerId',
        indexingPolicy: {
          automatic: true,
          indexingMode: 'consistent',
          includedPaths: [{ path: '/*' }],
          excludedPaths: [{ path: '/"_etag"/?' }],
          compositeIndexes: [
            [
              { path: '/callerId', order: 'ascending' },
              { path: '/startTime', order: 'descending' },
            ],
            [
              { path: '/calleeId', order: 'ascending' },
              { path: '/startTime', order: 'descending' },
            ],
          ],
        },
      });
      this.callHistoryContainer = callHistoryContainer;
      logger.info('Container "CallHistory" ready');

      // Get or create CallRecordings container
      const { container: callRecordingsContainer } = await database.containers.createIfNotExists({
        id: 'CallRecordings',
        partitionKey: '/callId',
        indexingPolicy: {
          automatic: true,
          indexingMode: 'consistent',
          includedPaths: [{ path: '/*' }],
          excludedPaths: [{ path: '/"_etag"/?' }],
        },
      });
      this.callRecordingsContainer = callRecordingsContainer;
      logger.info('Container "CallRecordings" ready');

      // Get or create ChatExports container
      const { container: chatExportsContainer } = await database.containers.createIfNotExists({
        id: 'ChatExports',
        partitionKey: '/userId',
        indexingPolicy: {
          automatic: true,
          indexingMode: 'consistent',
          includedPaths: [{ path: '/*' }],
          excludedPaths: [{ path: '/"_etag"/?' }],
          compositeIndexes: [
            [
              { path: '/userId', order: 'ascending' },
              { path: '/createdAt', order: 'descending' },
            ],
          ],
        },
      });
      this.chatExportsContainer = chatExportsContainer;
      logger.info('Container "ChatExports" ready');

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
   * Get GiftTransactions container
   */
  getGiftTransactionsContainer(): Container {
    if (!this.giftTransactionsContainer) {
      throw new Error('Cosmos DB not initialized. Call initialize() first.');
    }
    return this.giftTransactionsContainer;
  }

  /**
   * Get Icebreakers container
   */
  getIcebreakersContainer(): Container {
    if (!this.icebreakersContainer) {
      throw new Error('Cosmos DB not initialized. Call initialize() first.');
    }
    return this.icebreakersContainer;
  }

  /**
   * Get IcebreakerUsage container
   */
  getIcebreakerUsageContainer(): Container {
    if (!this.icebreakerUsageContainer) {
      throw new Error('Cosmos DB not initialized. Call initialize() first.');
    }
    return this.icebreakerUsageContainer;
  }

  /**
   * Get CallHistory container
   */
  getCallHistoryContainer(): Container {
    if (!this.callHistoryContainer) {
      throw new Error('Cosmos DB not initialized. Call initialize() first.');
    }
    return this.callHistoryContainer;
  }

  /**
   * Get CallRecordings container
   */
  getCallRecordingsContainer(): Container {
    if (!this.callRecordingsContainer) {
      throw new Error('Cosmos DB not initialized. Call initialize() first.');
    }
    return this.callRecordingsContainer;
  }

  /**
   * Get ChatExports container
   */
  getChatExportsContainer(): Container {
    if (!this.chatExportsContainer) {
      throw new Error('Cosmos DB not initialized. Call initialize() first.');
    }
    return this.chatExportsContainer;
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
