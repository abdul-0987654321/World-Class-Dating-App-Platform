import { Container } from '@azure/cosmos';
import { createLogger } from '../../utils/logger';
import { cosmosClient } from '../../infrastructure/database/cosmos-client';
import { GiftTransaction } from '../../services/virtual-gifts.service';

const logger = createLogger('gift-transaction-repository');

export interface GiftTransactionDocument extends GiftTransaction {
  recipientId: string; // Partition key (alias for receiverId)
  giftName: string;
  giftEmoji: string;
  giftCategory: 'basic' | 'premium' | 'luxury';
}

export interface GiftStatistics {
  totalSent: number;
  totalReceived: number;
  coinsSpent: number;
  coinsEarned: number;
  popularGiftsSent: { giftId: string; giftName: string; count: number }[];
  popularGiftsReceived: { giftId: string; giftName: string; count: number }[];
}

export class GiftTransactionRepository {
  private _container: Container | null = null;

  private get container(): Container {
    if (!this._container) {
      this._container = cosmosClient.getGiftTransactionsContainer();
    }
    return this._container;
  }

  /**
   * Create a new gift transaction
   */
  async create(transaction: GiftTransactionDocument): Promise<GiftTransactionDocument> {
    try {
      logger.info(`Creating gift transaction: ${transaction.id}`);

      const { resource } = await this.container.items.create(transaction);

      logger.info(`Gift transaction created: ${transaction.id}`);
      return resource as GiftTransactionDocument;
    } catch (error: any) {
      logger.error(`Failed to create gift transaction ${transaction.id}:`, error);
      throw new Error(`Failed to create gift transaction: ${error.message}`);
    }
  }

  /**
   * Find gift transaction by ID
   */
  async findById(transactionId: string, recipientId: string): Promise<GiftTransactionDocument | null> {
    try {
      const { resource } = await this.container.item(transactionId, recipientId).read<GiftTransactionDocument>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      logger.error(`Failed to find gift transaction ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Update gift transaction status
   */
  async updateStatus(
    transactionId: string,
    recipientId: string,
    status: GiftTransaction['status']
  ): Promise<GiftTransactionDocument> {
    try {
      logger.info(`Updating gift transaction status: ${transactionId} -> ${status}`);

      const existing = await this.findById(transactionId, recipientId);
      if (!existing) {
        throw new Error(`Gift transaction ${transactionId} not found`);
      }

      const updated = { ...existing, status };
      const { resource } = await this.container.item(transactionId, recipientId).replace(updated);

      logger.info(`Gift transaction status updated: ${transactionId}`);
      return resource as GiftTransactionDocument;
    } catch (error: any) {
      logger.error(`Failed to update gift transaction ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Get gift history for a user (sent or received)
   */
  async getGiftHistory(
    userId: string,
    type: 'sent' | 'received' | 'all' = 'all',
    limit: number = 50,
    offset: number = 0
  ): Promise<GiftTransactionDocument[]> {
    try {
      let query: string;
      let parameters: { name: string; value: any }[];

      if (type === 'sent') {
        query = `SELECT * FROM c
                 WHERE c.senderId = @userId
                 AND c.status = 'completed'
                 ORDER BY c.createdAt DESC
                 OFFSET @offset LIMIT @limit`;
        parameters = [
          { name: '@userId', value: userId },
          { name: '@offset', value: offset },
          { name: '@limit', value: limit },
        ];
      } else if (type === 'received') {
        query = `SELECT * FROM c
                 WHERE c.recipientId = @userId
                 AND c.status = 'completed'
                 ORDER BY c.createdAt DESC
                 OFFSET @offset LIMIT @limit`;
        parameters = [
          { name: '@userId', value: userId },
          { name: '@offset', value: offset },
          { name: '@limit', value: limit },
        ];
      } else {
        // All - union of sent and received
        query = `SELECT * FROM c
                 WHERE (c.senderId = @userId OR c.recipientId = @userId)
                 AND c.status = 'completed'
                 ORDER BY c.createdAt DESC
                 OFFSET @offset LIMIT @limit`;
        parameters = [
          { name: '@userId', value: userId },
          { name: '@offset', value: offset },
          { name: '@limit', value: limit },
        ];
      }

      const querySpec = { query, parameters };
      const { resources } = await this.container.items.query<GiftTransactionDocument>(querySpec).fetchAll();

      return resources;
    } catch (error: any) {
      logger.error('Failed to get gift history:', error);
      throw error;
    }
  }

  /**
   * Get gift statistics for a user
   */
  async getGiftStatistics(userId: string): Promise<GiftStatistics> {
    try {
      // Query for sent gifts count and total spent
      const sentQuery = {
        query: `SELECT VALUE {
                  totalSent: COUNT(1),
                  coinsSpent: SUM(c.price)
                }
                FROM c
                WHERE c.senderId = @userId
                AND c.status = 'completed'`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources: sentResults } = await this.container.items
        .query<{ totalSent: number; coinsSpent: number }>(sentQuery)
        .fetchAll();

      const sentStats = sentResults[0] || { totalSent: 0, coinsSpent: 0 };

      // Query for received gifts count and total earned (70% of gift price)
      const receivedQuery = {
        query: `SELECT VALUE {
                  totalReceived: COUNT(1),
                  coinsEarned: SUM(c.price * 0.7)
                }
                FROM c
                WHERE c.recipientId = @userId
                AND c.status = 'completed'`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources: receivedResults } = await this.container.items
        .query<{ totalReceived: number; coinsEarned: number }>(receivedQuery)
        .fetchAll();

      const receivedStats = receivedResults[0] || { totalReceived: 0, coinsEarned: 0 };

      // Query for popular gifts sent
      const popularSentQuery = {
        query: `SELECT c.giftId, c.giftName, COUNT(1) as count
                FROM c
                WHERE c.senderId = @userId
                AND c.status = 'completed'
                GROUP BY c.giftId, c.giftName
                ORDER BY COUNT(1) DESC
                OFFSET 0 LIMIT 5`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources: popularSent } = await this.container.items
        .query<{ giftId: string; giftName: string; count: number }>(popularSentQuery)
        .fetchAll();

      // Query for popular gifts received
      const popularReceivedQuery = {
        query: `SELECT c.giftId, c.giftName, COUNT(1) as count
                FROM c
                WHERE c.recipientId = @userId
                AND c.status = 'completed'
                GROUP BY c.giftId, c.giftName
                ORDER BY COUNT(1) DESC
                OFFSET 0 LIMIT 5`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources: popularReceived } = await this.container.items
        .query<{ giftId: string; giftName: string; count: number }>(popularReceivedQuery)
        .fetchAll();

      return {
        totalSent: sentStats.totalSent || 0,
        totalReceived: receivedStats.totalReceived || 0,
        coinsSpent: sentStats.coinsSpent || 0,
        coinsEarned: Math.floor(receivedStats.coinsEarned || 0),
        popularGiftsSent: popularSent,
        popularGiftsReceived: popularReceived,
      };
    } catch (error: any) {
      logger.error('Failed to get gift statistics:', error);
      throw error;
    }
  }

  /**
   * Get gifts exchanged between two users in a conversation
   */
  async getGiftsByConversation(
    conversationId: string,
    limit: number = 50
  ): Promise<GiftTransactionDocument[]> {
    try {
      const querySpec = {
        query: `SELECT * FROM c
                WHERE c.conversationId = @conversationId
                AND c.status = 'completed'
                ORDER BY c.createdAt DESC
                OFFSET 0 LIMIT @limit`,
        parameters: [
          { name: '@conversationId', value: conversationId },
          { name: '@limit', value: limit },
        ],
      };

      const { resources } = await this.container.items
        .query<GiftTransactionDocument>(querySpec)
        .fetchAll();

      return resources;
    } catch (error: any) {
      logger.error('Failed to get gifts by conversation:', error);
      throw error;
    }
  }

  /**
   * Get total gift count for a user
   */
  async getGiftCount(userId: string, type: 'sent' | 'received'): Promise<number> {
    try {
      const field = type === 'sent' ? 'senderId' : 'recipientId';
      const querySpec = {
        query: `SELECT VALUE COUNT(1) FROM c
                WHERE c.${field} = @userId
                AND c.status = 'completed'`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources } = await this.container.items.query<number>(querySpec).fetchAll();
      return resources[0] || 0;
    } catch (error: any) {
      logger.error('Failed to get gift count:', error);
      throw error;
    }
  }
}

export const giftTransactionRepository = new GiftTransactionRepository();
export default giftTransactionRepository;
