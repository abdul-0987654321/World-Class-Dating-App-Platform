import { gemRepository, GemRepository } from '../repositories/gem.repository';
import {
  Gem,
  GemTransaction,
  GemSpendingCategory,
  GEM_PRICES,
  getGemItemPrice,
  getGemSpendingCategory,
} from '../entities/Gem.entity';
import logger from '../../utils/logger';

export class GemService {
  constructor(private repository: GemRepository = gemRepository) {}

  /**
   * Get user's gem balance
   */
  async getBalance(userId: string): Promise<Gem> {
    return this.repository.getOrCreate(userId);
  }

  /**
   * Award gems for achievement completion
   */
  async awardForAchievement(
    userId: string,
    achievementId: string,
    achievementName: string,
    amount: number
  ): Promise<Gem> {
    return this.repository.addGems(
      userId,
      amount,
      'earned',
      `Achievement unlocked: ${achievementName}`,
      { achievementId, achievementName }
    );
  }

  /**
   * Award gems for daily challenge completion
   */
  async awardForChallenge(
    userId: string,
    challengeId: string,
    challengeName: string,
    amount: number
  ): Promise<Gem> {
    return this.repository.addGems(
      userId,
      amount,
      'earned',
      `Challenge completed: ${challengeName}`,
      { challengeId, challengeName }
    );
  }

  /**
   * Award bonus gems (promotions, events, etc.)
   */
  async awardBonus(
    userId: string,
    amount: number,
    reason: string,
    metadata?: Record<string, any>
  ): Promise<Gem> {
    return this.repository.addGems(userId, amount, 'bonus', reason, metadata);
  }

  /**
   * Process gem purchase (from payment)
   */
  async processPurchase(
    userId: string,
    amount: number,
    transactionId: string,
    provider: string
  ): Promise<Gem> {
    return this.repository.addGems(
      userId,
      amount,
      'purchased',
      `Purchased ${amount} gems`,
      { transactionId, provider }
    );
  }

  /**
   * Refund gems
   */
  async refund(
    userId: string,
    amount: number,
    reason: string,
    originalTransactionId?: string
  ): Promise<Gem> {
    return this.repository.addGems(
      userId,
      amount,
      'refund',
      reason,
      { originalTransactionId }
    );
  }

  /**
   * Spend gems on a premium item
   */
  async spendOnItem(
    userId: string,
    itemType: keyof typeof GEM_PRICES,
    metadata?: Record<string, any>
  ): Promise<{ gem: Gem; success: boolean; message: string }> {
    const price = getGemItemPrice(itemType);
    const category = getGemSpendingCategory(itemType);
    const gem = await this.repository.getOrCreate(userId);

    if (gem.balance < price) {
      return {
        gem,
        success: false,
        message: `Insufficient gems. Need ${price}, have ${gem.balance}`,
      };
    }

    const description = this.getItemDescription(itemType);
    const updatedGem = await this.repository.spendGems(
      userId,
      price,
      itemType,
      category,
      description,
      metadata
    );

    logger.info(`User ${userId} purchased ${itemType} for ${price} gems`);

    return {
      gem: updatedGem,
      success: true,
      message: `Successfully purchased ${description}`,
    };
  }

  /**
   * Check if user can afford an item
   */
  async canAfford(userId: string, itemType: keyof typeof GEM_PRICES): Promise<boolean> {
    const gem = await this.repository.getOrCreate(userId);
    const price = getGemItemPrice(itemType);
    return gem.balance >= price;
  }

  /**
   * Get all available items with prices
   */
  getAvailableItems(): Array<{
    itemType: keyof typeof GEM_PRICES;
    price: number;
    category: GemSpendingCategory;
    description: string;
  }> {
    return Object.keys(GEM_PRICES).map((key) => {
      const itemType = key as keyof typeof GEM_PRICES;
      return {
        itemType,
        price: GEM_PRICES[itemType],
        category: getGemSpendingCategory(itemType),
        description: this.getItemDescription(itemType),
      };
    });
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<GemTransaction[]> {
    return this.repository.getTransactionHistory(userId, limit, offset);
  }

  /**
   * Get spending analytics
   */
  async getSpendingAnalytics(userId: string): Promise<{
    totalEarned: number;
    totalSpent: number;
    balance: number;
    spendingByCategory: Record<GemSpendingCategory, number>;
  }> {
    const gem = await this.repository.getOrCreate(userId);
    const spendingByCategory = await this.repository.getSpendingByCategory(userId);

    return {
      totalEarned: gem.totalEarned,
      totalSpent: gem.totalSpent,
      balance: gem.balance,
      spendingByCategory,
    };
  }

  /**
   * Get human-readable item description
   */
  private getItemDescription(itemType: keyof typeof GEM_PRICES): string {
    const descriptions: Record<keyof typeof GEM_PRICES, string> = {
      PRIORITY_QUEUE_24H: 'Priority in discovery queue for 24 hours',
      PROFILE_SPOTLIGHT_24H: 'Featured profile placement for 24 hours',
      SUPER_SPOTLIGHT_48H: 'Extended featured placement for 48 hours',
      EXCLUSIVE_FRAME_7D: 'Exclusive profile frame for 7 days',
      EXCLUSIVE_FRAME_30D: 'Exclusive profile frame for 30 days',
      PROFILE_BADGE_PERMANENT: 'Permanent exclusive profile badge',
      PREMIUM_ICEBREAKER_PACK: 'Pack of 5 premium icebreaker messages',
      UNLIMITED_MESSAGES_24H: 'Unlimited messages for 24 hours',
      SEE_WHO_LIKED_YOU: 'See who liked your profile',
      WEEKLY_INSIGHTS_REPORT: 'Detailed weekly dating insights report',
      MATCH_EXTENSION_24H: 'Extend match expiration by 24 hours',
      REMATCH_PREMIUM: 'Re-match with someone who unmatched',
      GIFT_ROSE: 'Send a virtual rose',
      GIFT_HEART: 'Send a virtual heart',
      GIFT_DIAMOND: 'Send a virtual diamond',
      GIFT_CROWN: 'Send a virtual crown',
    };
    return descriptions[itemType] || itemType;
  }

  /**
   * Send a virtual gift to another user
   */
  async sendGift(
    senderId: string,
    recipientId: string,
    giftType: 'GIFT_ROSE' | 'GIFT_HEART' | 'GIFT_DIAMOND' | 'GIFT_CROWN',
    message?: string
  ): Promise<{ success: boolean; message: string; gem?: Gem }> {
    const result = await this.spendOnItem(senderId, giftType, {
      recipientId,
      message,
      giftType,
    });

    if (!result.success) {
      return result;
    }

    // TODO: Notify recipient via notification service
    logger.info(`User ${senderId} sent ${giftType} to ${recipientId}`);

    return {
      success: true,
      message: `Gift sent successfully!`,
      gem: result.gem,
    };
  }

  /**
   * Activate a boost/feature for the user
   */
  async activateFeature(
    userId: string,
    featureType: keyof typeof GEM_PRICES
  ): Promise<{ success: boolean; message: string; expiresAt?: Date; gem?: Gem }> {
    const result = await this.spendOnItem(userId, featureType);

    if (!result.success) {
      return result;
    }

    // Calculate expiration based on feature type
    let expiresAt: Date | undefined;
    const now = new Date();

    if (featureType.includes('24H')) {
      expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (featureType.includes('48H')) {
      expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    } else if (featureType.includes('7D')) {
      expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (featureType.includes('30D')) {
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    // TODO: Store active feature in database with expiration
    logger.info(`User ${userId} activated ${featureType}`, { expiresAt });

    return {
      success: true,
      message: result.message,
      expiresAt,
      gem: result.gem,
    };
  }
}

export const gemService = new GemService();
