/**
 * Virtual Gifts Service
 * WeChat-style virtual gifts for in-chat monetization
 */

import axios from 'axios';

import {
  giftTransactionRepository,
  GiftTransactionDocument,
  GiftStatistics,
} from '../domain/repositories/gift-transaction.repository';
import { createLogger } from '../utils/logger';

const logger = createLogger('virtual-gifts-service');

// Payment service URL for coin transactions
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3004';

// Internal service authentication key
const getInternalServiceKey = (): string => {
  const key = process.env.INTERNAL_SERVICE_KEY;
  if (!key && process.env.NODE_ENV === 'production') {
    throw new Error('INTERNAL_SERVICE_KEY environment variable is required');
  }
  return key || 'test-internal-service-key-not-for-production';
};

export interface VirtualGift {
  id: string;
  name: string;
  emoji: string;
  price: number;
  category: 'basic' | 'premium' | 'luxury';
  description: string;
  animation?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface GiftTransaction {
  id: string;
  giftId: string;
  senderId: string;
  receiverId: string;
  conversationId: string;
  messageId: string;
  price: number;
  createdAt: Date;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
}

export interface GiftMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  type: 'gift';
  gift: VirtualGift;
  transactionId: string;
  sentAt: Date;
}

// Predefined gift catalog
const GIFT_CATALOG: VirtualGift[] = [
  // Basic gifts (5-15 coins)
  {
    id: 'rose',
    name: 'Rose',
    emoji: '🌹',
    price: 5,
    category: 'basic',
    description: 'A classic romantic gesture',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'heart',
    name: 'Heart',
    emoji: '❤️',
    price: 5,
    category: 'basic',
    description: 'Show your love',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'kiss',
    name: 'Kiss',
    emoji: '💋',
    price: 10,
    category: 'basic',
    description: 'Blow them a kiss',
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'hug',
    name: 'Hug',
    emoji: '🤗',
    price: 10,
    category: 'basic',
    description: 'Virtual warm hug',
    isActive: true,
    sortOrder: 4,
  },
  {
    id: 'flowers',
    name: 'Flowers',
    emoji: '💐',
    price: 15,
    category: 'basic',
    description: 'A beautiful bouquet',
    isActive: true,
    sortOrder: 5,
  },
  {
    id: 'chocolate',
    name: 'Chocolate',
    emoji: '🍫',
    price: 15,
    category: 'basic',
    description: 'Sweet treat',
    isActive: true,
    sortOrder: 6,
  },

  // Premium gifts (50-200 coins)
  {
    id: 'teddy',
    name: 'Teddy Bear',
    emoji: '🧸',
    price: 50,
    category: 'premium',
    description: 'Cute and cuddly',
    isActive: true,
    sortOrder: 10,
  },
  {
    id: 'perfume',
    name: 'Perfume',
    emoji: '🧴',
    price: 75,
    category: 'premium',
    description: 'Fragrant luxury',
    isActive: true,
    sortOrder: 11,
  },
  {
    id: 'wine',
    name: 'Wine',
    emoji: '🍷',
    price: 100,
    category: 'premium',
    description: 'Cheers to us!',
    isActive: true,
    sortOrder: 12,
  },
  {
    id: 'ring',
    name: 'Ring',
    emoji: '💍',
    price: 150,
    category: 'premium',
    description: 'A promise of commitment',
    isActive: true,
    sortOrder: 13,
  },
  {
    id: 'fireworks',
    name: 'Fireworks',
    emoji: '🎆',
    price: 200,
    category: 'premium',
    description: 'Celebrate your connection',
    isActive: true,
    sortOrder: 14,
  },

  // Luxury gifts (500-2000 coins)
  {
    id: 'crown',
    name: 'Crown',
    emoji: '👑',
    price: 500,
    category: 'luxury',
    description: 'For royalty',
    isActive: true,
    sortOrder: 20,
  },
  {
    id: 'diamond',
    name: 'Diamond',
    emoji: '💎',
    price: 750,
    category: 'luxury',
    description: 'Rare and precious',
    isActive: true,
    sortOrder: 21,
  },
  {
    id: 'castle',
    name: 'Castle',
    emoji: '🏰',
    price: 1000,
    category: 'luxury',
    description: 'A fairy tale gift',
    isActive: true,
    sortOrder: 22,
  },
  {
    id: 'rocket',
    name: 'Rocket',
    emoji: '🚀',
    price: 1500,
    category: 'luxury',
    description: 'Out of this world!',
    isActive: true,
    sortOrder: 23,
  },
  {
    id: 'yacht',
    name: 'Yacht',
    emoji: '🛥️',
    price: 2000,
    category: 'luxury',
    description: 'Ultimate luxury',
    isActive: true,
    sortOrder: 24,
  },
];

class VirtualGiftsService {
  async initialize(): Promise<void> {
    logger.info('Virtual Gifts Service initialized');
  }

  /**
   * Get all available gifts
   */
  getGiftCatalog(): VirtualGift[] {
    return GIFT_CATALOG.filter((g) => g.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Get gifts by category
   */
  getGiftsByCategory(category: 'basic' | 'premium' | 'luxury'): VirtualGift[] {
    return this.getGiftCatalog().filter((g) => g.category === category);
  }

  /**
   * Get a specific gift by ID
   */
  getGiftById(giftId: string): VirtualGift | undefined {
    return GIFT_CATALOG.find((g) => g.id === giftId);
  }

  /**
   * Send a virtual gift
   */
  async sendGift(
    senderId: string,
    receiverId: string,
    conversationId: string,
    giftId: string
  ): Promise<{ success: boolean; message?: GiftMessage; error?: string }> {
    const gift = this.getGiftById(giftId);

    if (!gift) {
      return { success: false, error: 'Gift not found' };
    }

    if (!gift.isActive) {
      return { success: false, error: 'This gift is no longer available' };
    }

    try {
      // 1. Deduct coins from sender's balance via payment service
      const deductResponse = await this.deductCoins(senderId, gift.price, giftId, receiverId);

      if (!deductResponse.success) {
        return { success: false, error: deductResponse.error || 'Insufficient coins' };
      }

      // 2. Create gift transaction record
      const transactionId = `gift-txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const transactionDoc: GiftTransactionDocument = {
        id: transactionId,
        giftId: gift.id,
        senderId,
        receiverId,
        recipientId: receiverId, // Partition key
        conversationId,
        messageId,
        price: gift.price,
        createdAt: new Date(),
        status: 'completed',
        giftName: gift.name,
        giftEmoji: gift.emoji,
        giftCategory: gift.category,
      };

      // Store transaction in PostgreSQL
      await giftTransactionRepository.create(transactionDoc);
      logger.info(`Gift transaction stored: ${transactionId}`);

      // 3. Credit a portion to receiver (gift economy - 70% to receiver)
      const receiverShare = Math.floor(gift.price * 0.7);
      if (receiverShare > 0) {
        await this.creditCoins(receiverId, receiverShare, giftId, senderId);
      }

      // 4. Create gift message
      const giftMessage: GiftMessage = {
        id: messageId,
        conversationId,
        senderId,
        receiverId,
        type: 'gift',
        gift,
        transactionId,
        sentAt: new Date(),
      };

      logger.info(
        `Gift sent: ${gift.name} from ${senderId} to ${receiverId} for ${gift.price} coins`
      );

      return { success: true, message: giftMessage };
    } catch (error: any) {
      logger.error('Failed to send gift:', error);
      return { success: false, error: 'Failed to send gift. Please try again.' };
    }
  }

  /**
   * Deduct coins from user's balance
   */
  private async deductCoins(
    userId: string,
    amount: number,
    giftId: string,
    recipientId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.post(
        `${PAYMENT_SERVICE_URL}/api/coins/spend`,
        {
          userId,
          amount,
          itemType: 'virtual_gift',
          itemId: giftId,
          metadata: {
            recipientId,
            description: `Sent virtual gift: ${giftId}`,
          },
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Auth': getInternalServiceKey(),
          },
        }
      );

      return { success: response.data.success };
    } catch (error: any) {
      logger.error('Failed to deduct coins:', error.message);

      if (error.response?.status === 400) {
        return { success: false, error: 'Insufficient coins balance' };
      }

      return { success: false, error: 'Payment service unavailable' };
    }
  }

  /**
   * Credit coins to user's balance (gift receiver gets a portion)
   */
  private async creditCoins(
    userId: string,
    amount: number,
    giftId: string,
    senderId: string
  ): Promise<{ success: boolean }> {
    try {
      await axios.post(
        `${PAYMENT_SERVICE_URL}/api/coins/credit`,
        {
          userId,
          amount,
          type: 'gift_received',
          metadata: {
            giftId,
            senderId,
            description: `Received virtual gift: ${giftId}`,
          },
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Auth': getInternalServiceKey(),
          },
        }
      );

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to credit coins to receiver:', error.message);
      return { success: false };
    }
  }

  /**
   * Get gift transaction history for a user
   */
  async getUserGiftHistory(
    userId: string,
    type: 'sent' | 'received' | 'all' = 'all',
    limit: number = 50,
    offset: number = 0
  ): Promise<GiftTransaction[]> {
    try {
      logger.info(
        `Fetching gift history for user ${userId}, type: ${type}, limit: ${limit}, offset: ${offset}`
      );

      const transactions = await giftTransactionRepository.getGiftHistory(
        userId,
        type,
        limit,
        offset
      );

      logger.info(`Found ${transactions.length} gift transactions for user ${userId}`);

      return transactions;
    } catch (error: any) {
      logger.error('Failed to get gift history:', error);
      throw new Error('Failed to retrieve gift history');
    }
  }

  /**
   * Get gift statistics for a user
   */
  async getUserGiftStats(userId: string): Promise<GiftStatistics> {
    try {
      logger.info(`Fetching gift statistics for user ${userId}`);

      const statistics = await giftTransactionRepository.getGiftStatistics(userId);

      logger.info(
        `Gift statistics for user ${userId}: sent=${statistics.totalSent}, received=${statistics.totalReceived}`
      );

      return statistics;
    } catch (error: any) {
      logger.error('Failed to get gift statistics:', error);
      throw new Error('Failed to retrieve gift statistics');
    }
  }

  /**
   * Get gifts exchanged in a specific conversation
   */
  async getConversationGifts(
    conversationId: string,
    limit: number = 50
  ): Promise<GiftTransaction[]> {
    try {
      logger.info(`Fetching gifts for conversation ${conversationId}`);

      const transactions = await giftTransactionRepository.getGiftsByConversation(
        conversationId,
        limit
      );

      logger.info(
        `Found ${transactions.length} gift transactions in conversation ${conversationId}`
      );

      return transactions;
    } catch (error: any) {
      logger.error('Failed to get conversation gifts:', error);
      throw new Error('Failed to retrieve conversation gifts');
    }
  }

  /**
   * Get total gift count for a user
   */
  async getGiftCount(userId: string, type: 'sent' | 'received'): Promise<number> {
    try {
      return await giftTransactionRepository.getGiftCount(userId, type);
    } catch (error: any) {
      logger.error('Failed to get gift count:', error);
      throw new Error('Failed to retrieve gift count');
    }
  }
}

export const virtualGiftsService = new VirtualGiftsService();
export default virtualGiftsService;
