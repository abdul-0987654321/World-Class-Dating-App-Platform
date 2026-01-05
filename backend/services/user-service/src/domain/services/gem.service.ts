import logger from '../../utils/logger';
import {
  Gem,
  GemTransaction,
  GemSpendingCategory,
  GEM_PRICES,
  getGemItemPrice,
  getGemSpendingCategory,
} from '../entities/Gem.entity';
import { GemPurchase, calculateExpiration } from '../entities/GemPurchase.entity';
import { GemStoreItem, DEFAULT_STORE_ITEMS } from '../entities/GemStoreItem.entity';
import {
  gemPurchaseRepository,
  GemPurchaseRepository,
} from '../repositories/gem-purchase.repository';
import { gemStoreRepository, GemStoreRepository } from '../repositories/gem-store.repository';
import { gemRepository, GemRepository } from '../repositories/gem.repository';

export class GemService {
  constructor(
    private repository: GemRepository = gemRepository,
    private storeRepository: GemStoreRepository = gemStoreRepository,
    private purchaseRepository: GemPurchaseRepository = gemPurchaseRepository
  ) {}

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
    return this.repository.addGems(userId, amount, 'purchased', `Purchased ${amount} gems`, {
      transactionId,
      provider,
    });
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
    return this.repository.addGems(userId, amount, 'refund', reason, { originalTransactionId });
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
  async getTransactionHistory(userId: string, limit = 50, offset = 0): Promise<GemTransaction[]> {
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
  // ========================================
  // STORE SPENDING METHODS
  // ========================================

  /**
   * Get all active store items
   */
  async getStoreItems(): Promise<GemStoreItem[]> {
    return this.storeRepository.getActiveItems();
  }

  /**
   * Get store items by type
   */
  async getStoreItemsByType(type: GemStoreItem['type']): Promise<GemStoreItem[]> {
    return this.storeRepository.getByType(type);
  }

  /**
   * Get a specific store item
   */
  async getStoreItem(itemId: string): Promise<GemStoreItem | null> {
    return this.storeRepository.getById(itemId);
  }

  /**
   * Purchase an item from the store
   */
  async purchaseItem(
    userId: string,
    itemId: string,
    recipientId?: string
  ): Promise<{ success: boolean; message: string; purchase?: GemPurchase; gem?: Gem }> {
    // Get the store item
    const item = await this.storeRepository.getById(itemId);
    if (!item) {
      return { success: false, message: 'Item not found' };
    }

    if (!item.isActive) {
      return { success: false, message: 'Item is no longer available' };
    }

    // Check balance
    const gem = await this.repository.getOrCreate(userId);
    if (gem.balance < item.gemCost) {
      return {
        success: false,
        message: `Insufficient gems. Need ${item.gemCost}, have ${gem.balance}`,
        gem,
      };
    }

    // Calculate expiration if applicable
    let expiresAt: Date | undefined;
    if (item.durationMinutes) {
      expiresAt = calculateExpiration(item.durationMinutes);
    }

    // Deduct gems
    const category = this.mapItemTypeToCategory(item.type);
    await this.repository.spendGems(
      userId,
      item.gemCost,
      item.name.toUpperCase().replace(/\s+/g, '_') as keyof typeof GEM_PRICES,
      category,
      `Purchased: ${item.name}`,
      { itemId, recipientId }
    );

    // Create purchase record
    const purchase = await this.purchaseRepository.create({
      userId,
      itemId: item.id,
      itemName: item.name,
      itemType: item.type,
      gemsCost: item.gemCost,
      quantity: item.quantity || 1,
      expiresAt,
      recipientId,
      metadata: item.metadata,
    });

    const updatedGem = await this.repository.getOrCreate(userId);

    logger.info(`User ${userId} purchased ${item.name} for ${item.gemCost} gems`, {
      purchaseId: purchase.id,
      itemId,
      recipientId,
    });

    return {
      success: true,
      message: `Successfully purchased ${item.name}`,
      purchase,
      gem: updatedGem,
    };
  }

  /**
   * Get purchase history for a user
   */
  async getPurchaseHistory(userId: string, limit = 50, offset = 0): Promise<GemPurchase[]> {
    return this.purchaseRepository.getByUserId(userId, limit, offset);
  }

  /**
   * Get active purchased items for a user
   */
  async getActiveItems(userId: string): Promise<GemPurchase[]> {
    // First, expire any old purchases
    await this.purchaseRepository.expireOldPurchases();
    return this.purchaseRepository.getActivePurchases(userId);
  }

  /**
   * Check if user has an active item of a specific type
   */
  async hasActiveItemOfType(userId: string, itemType: string): Promise<boolean> {
    const activePurchases = await this.purchaseRepository.getActivePurchasesByType(
      userId,
      itemType
    );
    return activePurchases.length > 0;
  }

  /**
   * Activate a boost (mark as used and apply effect)
   */
  async activateBoost(
    userId: string,
    purchaseId: string
  ): Promise<{ success: boolean; message: string; purchase?: GemPurchase; expiresAt?: Date }> {
    const purchase = await this.purchaseRepository.getById(purchaseId);

    if (!purchase) {
      return { success: false, message: 'Purchase not found' };
    }

    if (purchase.userId !== userId) {
      return { success: false, message: 'Not authorized to use this purchase' };
    }

    if (purchase.status !== 'active') {
      return { success: false, message: `Purchase is ${purchase.status}` };
    }

    if (purchase.quantityRemaining <= 0) {
      return { success: false, message: 'No uses remaining' };
    }

    // For boosts, we use the item which sets the activation time
    const updatedPurchase = await this.purchaseRepository.useOne(purchaseId);

    if (!updatedPurchase) {
      return { success: false, message: 'Failed to activate boost' };
    }

    logger.info(`User ${userId} activated boost`, {
      purchaseId,
      itemType: purchase.itemType,
      expiresAt: purchase.expiresAt,
    });

    return {
      success: true,
      message: 'Boost activated successfully',
      purchase: updatedPurchase,
      expiresAt: purchase.expiresAt || undefined,
    };
  }

  /**
   * Send a gift to another user
   */
  async sendGiftFromStore(
    senderId: string,
    recipientId: string,
    itemId: string,
    message?: string
  ): Promise<{ success: boolean; message: string; purchase?: GemPurchase; gem?: Gem }> {
    if (senderId === recipientId) {
      return { success: false, message: 'Cannot send a gift to yourself' };
    }

    // Purchase the gift with recipient specified
    const result = await this.purchaseItem(senderId, itemId, recipientId);

    if (!result.success) {
      return result;
    }

    // Update the purchase with the gift message
    if (result.purchase && message) {
      await this.purchaseRepository.update(result.purchase.id, {
        metadata: { ...result.purchase.metadata, giftMessage: message },
      });
    }

    logger.info(`User ${senderId} sent gift to ${recipientId}`, {
      purchaseId: result.purchase?.id,
      itemId,
    });

    return {
      success: true,
      message: 'Gift sent successfully!',
      purchase: result.purchase,
      gem: result.gem,
    };
  }

  /**
   * Activate spotlight feature
   */
  async activateSpotlight(
    userId: string,
    purchaseId: string
  ): Promise<{ success: boolean; message: string; purchase?: GemPurchase; expiresAt?: Date }> {
    return this.activateBoost(userId, purchaseId);
  }

  /**
   * Use an undo pass
   */
  async useUndoPass(
    userId: string
  ): Promise<{ success: boolean; message: string; purchase?: GemPurchase }> {
    // Find an active undo pass purchase
    const activePurchases = await this.purchaseRepository.getActivePurchasesByType(
      userId,
      'utility'
    );
    const undoPass = activePurchases.find(
      (p) => p.metadata?.feature === 'undo_pass' && p.quantityRemaining > 0
    );

    if (!undoPass) {
      return { success: false, message: 'No undo passes available' };
    }

    const updatedPurchase = await this.purchaseRepository.useOne(undoPass.id);

    if (!updatedPurchase) {
      return { success: false, message: 'Failed to use undo pass' };
    }

    logger.info(`User ${userId} used undo pass`, { purchaseId: undoPass.id });

    return {
      success: true,
      message: 'Undo pass used successfully',
      purchase: updatedPurchase,
    };
  }

  /**
   * Use a super like from pack
   */
  async useSuperLike(
    userId: string
  ): Promise<{ success: boolean; message: string; remaining?: number }> {
    const activePurchases = await this.purchaseRepository.getActivePurchasesByType(
      userId,
      'superlike'
    );
    const superLikePack = activePurchases.find((p) => p.quantityRemaining > 0);

    if (!superLikePack) {
      return { success: false, message: 'No super likes available' };
    }

    const updatedPurchase = await this.purchaseRepository.useOne(superLikePack.id);

    if (!updatedPurchase) {
      return { success: false, message: 'Failed to use super like' };
    }

    logger.info(`User ${userId} used super like`, {
      purchaseId: superLikePack.id,
      remaining: updatedPurchase.quantityRemaining,
    });

    return {
      success: true,
      message: 'Super like used!',
      remaining: updatedPurchase.quantityRemaining,
    };
  }

  /**
   * Get gifts received by user
   */
  async getReceivedGifts(userId: string, limit = 50, offset = 0): Promise<GemPurchase[]> {
    return this.purchaseRepository.getReceivedGifts(userId, limit, offset);
  }

  /**
   * Get purchase statistics
   */
  async getPurchaseStats(userId: string): Promise<{
    totalPurchases: number;
    totalGemsSpent: number;
    purchasesByType: Record<string, number>;
  }> {
    return this.purchaseRepository.getPurchaseStats(userId);
  }

  /**
   * Initialize store with default items
   */
  async initializeStore(): Promise<void> {
    await this.storeRepository.seedDefaultItems(DEFAULT_STORE_ITEMS);
    logger.info('Gem store initialized with default items');
  }

  /**
   * Map item type to spending category
   */
  private mapItemTypeToCategory(itemType: string): GemSpendingCategory {
    const categoryMap: Record<string, GemSpendingCategory> = {
      boost: 'visibility',
      spotlight: 'visibility',
      superlike: 'matching',
      gift: 'gifts',
      utility: 'matching',
      cosmetic: 'profile',
    };
    return categoryMap[itemType] || 'matching';
  }
}

export const gemService = new GemService();
