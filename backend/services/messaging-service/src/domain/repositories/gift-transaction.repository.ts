import { postgresClient } from '../../infrastructure/database/postgres-client';
import { GiftTransaction } from '../../services/virtual-gifts.service';
import { createLogger } from '../../utils/logger';

const logger = createLogger('gift-transaction-repository');

export interface GiftTransactionDocument extends GiftTransaction {
  recipientId: string;
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
  /**
   * Create a new gift transaction
   */
  async create(transaction: GiftTransactionDocument): Promise<GiftTransactionDocument> {
    try {
      logger.info(`Creating gift transaction: ${transaction.id}`);

      const [result] = await postgresClient.giftTransactions().insert(transaction).returning('*');

      logger.info(`Gift transaction created: ${transaction.id}`);
      return result as GiftTransactionDocument;
    } catch (error: any) {
      logger.error(`Failed to create gift transaction ${transaction.id}:`, error);
      throw new Error(`Failed to create gift transaction: ${error.message}`);
    }
  }

  /**
   * Find gift transaction by ID
   */
  async findById(
    transactionId: string,
    _recipientId?: string
  ): Promise<GiftTransactionDocument | null> {
    try {
      const result = await postgresClient.giftTransactions().where('id', transactionId).first();
      return result || null;
    } catch (error: any) {
      logger.error(`Failed to find gift transaction ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Update gift transaction status
   */
  async updateStatus(
    transactionId: string,
    _recipientId: string,
    status: GiftTransaction['status']
  ): Promise<GiftTransactionDocument> {
    try {
      logger.info(`Updating gift transaction status: ${transactionId} -> ${status}`);

      const existing = await this.findById(transactionId);
      if (!existing) {
        throw new Error(`Gift transaction ${transactionId} not found`);
      }

      const [result] = await postgresClient
        .giftTransactions()
        .where('id', transactionId)
        .update({ status })
        .returning('*');

      logger.info(`Gift transaction status updated: ${transactionId}`);
      return result as GiftTransactionDocument;
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
      let query = postgresClient.giftTransactions().where('status', 'completed');

      if (type === 'sent') {
        query = query.andWhere('sender_id', userId);
      } else if (type === 'received') {
        query = query.andWhere('recipient_id', userId);
      } else {
        query = query.andWhere(function () {
          this.where('sender_id', userId).orWhere('recipient_id', userId);
        });
      }

      const results = await query.orderBy('created_at', 'desc').limit(limit).offset(offset);

      return results as GiftTransactionDocument[];
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
      const sentResult = await postgresClient
        .giftTransactions()
        .where('sender_id', userId)
        .andWhere('status', 'completed')
        .select(
          postgresClient.giftTransactions().client.raw('COUNT(*) as total_sent'),
          postgresClient.giftTransactions().client.raw('COALESCE(SUM(price), 0) as coins_spent')
        )
        .first();

      const sentStats = sentResult || { total_sent: 0, coins_spent: 0 };

      // Query for received gifts count and total earned (70% of gift price)
      const receivedResult = await postgresClient
        .giftTransactions()
        .where('recipient_id', userId)
        .andWhere('status', 'completed')
        .select(
          postgresClient.giftTransactions().client.raw('COUNT(*) as total_received'),
          postgresClient.giftTransactions().client.raw('COALESCE(SUM(price * 0.7), 0) as coins_earned')
        )
        .first();

      const receivedStats = receivedResult || { total_received: 0, coins_earned: 0 };

      // Query for popular gifts sent
      const popularSent = await postgresClient
        .giftTransactions()
        .where('sender_id', userId)
        .andWhere('status', 'completed')
        .select('gift_id as giftId', 'gift_name as giftName')
        .count('* as count')
        .groupBy('gift_id', 'gift_name')
        .orderBy('count', 'desc')
        .limit(5);

      // Query for popular gifts received
      const popularReceived = await postgresClient
        .giftTransactions()
        .where('recipient_id', userId)
        .andWhere('status', 'completed')
        .select('gift_id as giftId', 'gift_name as giftName')
        .count('* as count')
        .groupBy('gift_id', 'gift_name')
        .orderBy('count', 'desc')
        .limit(5);

      return {
        totalSent: Number(sentStats.total_sent) || 0,
        totalReceived: Number(receivedStats.total_received) || 0,
        coinsSpent: Number(sentStats.coins_spent) || 0,
        coinsEarned: Math.floor(Number(receivedStats.coins_earned) || 0),
        popularGiftsSent: popularSent.map((r: any) => ({
          giftId: r.giftId,
          giftName: r.giftName,
          count: Number(r.count),
        })),
        popularGiftsReceived: popularReceived.map((r: any) => ({
          giftId: r.giftId,
          giftName: r.giftName,
          count: Number(r.count),
        })),
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
      const results = await postgresClient
        .giftTransactions()
        .where('conversation_id', conversationId)
        .andWhere('status', 'completed')
        .orderBy('created_at', 'desc')
        .limit(limit);

      return results as GiftTransactionDocument[];
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
      const field = type === 'sent' ? 'sender_id' : 'recipient_id';
      const result = await postgresClient
        .giftTransactions()
        .where(field, userId)
        .andWhere('status', 'completed')
        .count('* as count')
        .first();

      return Number(result?.count) || 0;
    } catch (error: any) {
      logger.error('Failed to get gift count:', error);
      throw error;
    }
  }
}

export const giftTransactionRepository = new GiftTransactionRepository();
export default giftTransactionRepository;
