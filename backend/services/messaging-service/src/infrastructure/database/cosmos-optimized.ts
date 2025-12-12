import { CosmosClient, Database, Container, IndexingPolicy, ContainerDefinition } from '@azure/cosmos';
import { createLogger } from '@flamoral/shared';
import config from '../../config';

const logger = createLogger('cosmos-db-optimized');

/**
 * Optimized Cosmos DB Client with Performance Tuning
 *
 * This implementation includes:
 * - Optimized indexing policies
 * - Connection pooling
 * - Query optimization
 * - Partition key design for performance
 * - TTL configuration for auto-cleanup
 */

class CosmosDBOptimizedClient {
  private client: CosmosClient | null = null;
  private database: Database | null = null;
  private messagesContainer: Container | null = null;
  private conversationsContainer: Container | null = null;

  /**
   * Optimized indexing policy for Messages container
   */
  private getMessagesIndexingPolicy(): IndexingPolicy {
    return {
      automatic: true,
      indexingMode: 'consistent',
      includedPaths: [
        // Index essential query paths
        { path: '/conversationId/?' },
        { path: '/senderId/?' },
        { path: '/receiverId/?' },
        { path: '/timestamp/?' },
        { path: '/status/?' },
        { path: '/isRead/?' },
        { path: '/messageType/?' },
        // Composite indexes for common queries
        { path: '/conversationId/?' },
        { path: '/timestamp/?' },
      ],
      excludedPaths: [
        // Exclude large content and metadata from indexing
        { path: '/content/?' },
        { path: '/encryptedContent/?' },
        { path: '/attachments/*' },
        { path: '/reactions/*' },
        { path: '/"_etag"/?' },
        { path: '/"_ts"/?' },
      ],
      compositeIndexes: [
        // Optimize conversation message queries
        [
          { path: '/conversationId', order: 'ascending' },
          { path: '/timestamp', order: 'descending' },
        ],
        // Optimize unread message queries
        [
          { path: '/receiverId', order: 'ascending' },
          { path: '/isRead', order: 'ascending' },
          { path: '/timestamp', order: 'descending' },
        ],
        // Optimize sender message queries
        [
          { path: '/senderId', order: 'ascending' },
          { path: '/timestamp', order: 'descending' },
        ],
        // Optimize status tracking
        [
          { path: '/status', order: 'ascending' },
          { path: '/timestamp', order: 'descending' },
        ],
      ],
      spatialIndexes: [],
    };
  }

  /**
   * Optimized indexing policy for Conversations container
   */
  private getConversationsIndexingPolicy(): IndexingPolicy {
    return {
      automatic: true,
      indexingMode: 'consistent',
      includedPaths: [
        // Index all essential conversation fields
        { path: '/matchId/?' },
        { path: '/user1Id/?' },
        { path: '/user2Id/?' },
        { path: '/lastMessageAt/?' },
        { path: '/lastMessageSenderId/?' },
        { path: '/unreadCountUser1/?' },
        { path: '/unreadCountUser2/?' },
        { path: '/isActive/?' },
        { path: '/isArchived/?' },
        { path: '/createdAt/?' },
      ],
      excludedPaths: [
        // Exclude large text fields
        { path: '/lastMessage/?' },
        { path: '/metadata/*' },
        { path: '/"_etag"/?' },
        { path: '/"_ts"/?' },
      ],
      compositeIndexes: [
        // Optimize user conversation list queries
        [
          { path: '/user1Id', order: 'ascending' },
          { path: '/lastMessageAt', order: 'descending' },
        ],
        [
          { path: '/user2Id', order: 'ascending' },
          { path: '/lastMessageAt', order: 'descending' },
        ],
        // Optimize unread conversation queries
        [
          { path: '/user1Id', order: 'ascending' },
          { path: '/unreadCountUser1', order: 'descending' },
        ],
        [
          { path: '/user2Id', order: 'ascending' },
          { path: '/unreadCountUser2', order: 'descending' },
        ],
        // Optimize active conversation filtering
        [
          { path: '/isActive', order: 'ascending' },
          { path: '/lastMessageAt', order: 'descending' },
        ],
      ],
      spatialIndexes: [],
    };
  }

  /**
   * Initialize Cosmos DB connection with optimized settings
   */
  async connect(): Promise<void> {
    try {
      if (!config.cosmos.endpoint || !config.cosmos.key) {
        logger.warn('Cosmos DB credentials not configured, using mock mode');
        return;
      }

      // Initialize client with connection pooling
      this.client = new CosmosClient({
        endpoint: config.cosmos.endpoint,
        key: config.cosmos.key,
        connectionPolicy: {
          requestTimeout: 10000, // 10 second timeout
          enableEndpointDiscovery: true,
          preferredLocations: [], // Can be configured for multi-region
          retryOptions: {
            maxRetryAttemptCount: 3,
            fixedRetryIntervalInMilliseconds: 500,
            maxWaitTimeInSeconds: 30,
          },
        },
        consistencyLevel: 'Session', // Balance between consistency and performance
      });

      // Get or create database with throughput settings
      const { database } = await this.client.databases.createIfNotExists({
        id: config.cosmos.databaseId,
        throughput: 400, // Shared throughput across containers (cost-effective)
      });
      this.database = database;

      // Create Messages container with optimized settings
      await this.createMessagesContainer();

      // Create Conversations container with optimized settings
      await this.createConversationsContainer();

      logger.info('Connected to Cosmos DB with optimized configuration');
    } catch (error) {
      logger.error('Failed to connect to Cosmos DB', error);
      throw error;
    }
  }

  /**
   * Create or get Messages container with optimization
   */
  private async createMessagesContainer(): Promise<void> {
    const containerDef: ContainerDefinition = {
      id: config.cosmos.containers.messages,
      partitionKey: {
        paths: ['/conversationId'],
        kind: 'Hash',
      },
      indexingPolicy: this.getMessagesIndexingPolicy(),
      defaultTtl: -1, // No auto-deletion, handle manually
      uniqueKeyPolicy: {
        uniqueKeys: [
          {
            paths: ['/id'],
          },
        ],
      },
    };

    const { container } = await this.database!.containers.createIfNotExists(containerDef);
    this.messagesContainer = container;

    logger.info('Messages container configured with optimized indexes');
  }

  /**
   * Create or get Conversations container with optimization
   */
  private async createConversationsContainer(): Promise<void> {
    const containerDef: ContainerDefinition = {
      id: config.cosmos.containers.conversations,
      partitionKey: {
        paths: ['/matchId'],
        kind: 'Hash',
      },
      indexingPolicy: this.getConversationsIndexingPolicy(),
      defaultTtl: -1, // No auto-deletion
      uniqueKeyPolicy: {
        uniqueKeys: [
          {
            paths: ['/id'],
          },
        ],
      },
    };

    const { container } = await this.database!.containers.createIfNotExists(containerDef);
    this.conversationsContainer = container;

    logger.info('Conversations container configured with optimized indexes');
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
   * Execute optimized query with best practices
   */
  async executeOptimizedQuery<T>(
    container: Container,
    query: string,
    parameters?: any[],
    partitionKey?: string
  ): Promise<T[]> {
    try {
      const querySpec = {
        query,
        parameters: parameters || [],
      };

      const options = {
        maxItemCount: 100, // Pagination limit
        ...(partitionKey && { partitionKey }), // Single partition query optimization
      };

      const { resources } = await container.items.query<T>(querySpec, options).fetchAll();

      return resources;
    } catch (error) {
      logger.error('Optimized query execution failed', error);
      throw error;
    }
  }

  /**
   * Batch operations for better throughput
   */
  async batchCreate(container: Container, items: any[], partitionKey: string): Promise<void> {
    try {
      const operations = items.map((item) => ({
        operationType: 'Create' as const,
        resourceBody: item,
      }));

      await container.items.batch(operations, partitionKey);
      logger.info(`Batch created ${items.length} items`);
    } catch (error) {
      logger.error('Batch create failed', error);
      throw error;
    }
  }

  /**
   * Get container performance metrics
   */
  async getContainerMetrics(container: Container): Promise<any> {
    try {
      const { resource } = await container.read();
      return {
        id: resource?.id,
        partitionKey: resource?.partitionKey,
        indexingPolicy: resource?.indexingPolicy,
      };
    } catch (error) {
      logger.error('Failed to get container metrics', error);
      throw error;
    }
  }

  /**
   * Update indexing policy (run during maintenance window)
   */
  async updateIndexingPolicy(container: Container, indexingPolicy: IndexingPolicy): Promise<void> {
    try {
      const { resource } = await container.read();
      resource!.indexingPolicy = indexingPolicy;
      await container.replace(resource!);
      logger.info('Indexing policy updated successfully');
    } catch (error) {
      logger.error('Failed to update indexing policy', error);
      throw error;
    }
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
export const cosmosDBOptimized = new CosmosDBOptimizedClient();
export default cosmosDBOptimized;
