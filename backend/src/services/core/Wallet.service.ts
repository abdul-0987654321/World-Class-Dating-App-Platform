/**
 * Wallet Service
 * Handles virtual currency (coins, gems), transactions, and daily rewards
 */

import { logger } from '../../utils/logger';
import { db } from '../../config/database.config';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface Wallet {
  userId: string;
  coins: number;
  gems: number;
  totalCoinsEarned: number;
  totalCoinsSpent: number;
  totalGemsEarned: number;
  totalGemsSpent: number;
  lastDailyRewardClaim: Date | null;
  currentStreak: number;
}

export interface CoinTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  currencyType: 'coins' | 'gems';
  amount: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export type TransactionType =
  | 'purchase'      // Bought with real money
  | 'earned'        // Earned from actions
  | 'daily_reward'  // Daily login reward
  | 'streak_bonus'  // Streak bonus
  | 'quest_reward'  // Quest completion
  | 'achievement'   // Achievement unlock
  | 'referral'      // Referral bonus
  | 'spin_wheel'    // Spin wheel reward
  | 'spent'         // Spent on feature
  | 'refund'        // Refunded
  | 'gift_sent'     // Sent as gift
  | 'gift_received' // Received as gift
  | 'expired'       // Expired (for time-limited items)
  | 'admin_adjust'; // Admin adjustment

export interface CoinPackage {
  id: string;
  sku: string;
  name: string;
  coins: number;
  bonusCoins: number;
  totalCoins: number;
  priceUsd: number;
  priceDisplay: string;
  savingsPercent: number;
  isBestValue: boolean;
  isPopular: boolean;
}

export interface CoinSpendItem {
  id: string;
  name: string;
  description: string;
  coinCost: number;
  gemCost?: number;
  category: 'boost' | 'superlike' | 'rewind' | 'visibility' | 'messaging' | 'special';
  duration?: number; // Duration in minutes if applicable
}

// Coin packages configuration
const COIN_PACKAGES: CoinPackage[] = [
  {
    id: 'coins_10',
    sku: 'com.flamoral.coins.10',
    name: '10 Coins',
    coins: 10,
    bonusCoins: 0,
    totalCoins: 10,
    priceUsd: 0.99,
    priceDisplay: '$0.99',
    savingsPercent: 0,
    isBestValue: false,
    isPopular: false,
  },
  {
    id: 'coins_55',
    sku: 'com.flamoral.coins.55',
    name: '55 Coins',
    coins: 50,
    bonusCoins: 5,
    totalCoins: 55,
    priceUsd: 4.99,
    priceDisplay: '$4.99',
    savingsPercent: 10,
    isBestValue: false,
    isPopular: true,
  },
  {
    id: 'coins_115',
    sku: 'com.flamoral.coins.115',
    name: '115 Coins',
    coins: 100,
    bonusCoins: 15,
    totalCoins: 115,
    priceUsd: 9.99,
    priceDisplay: '$9.99',
    savingsPercent: 15,
    isBestValue: false,
    isPopular: false,
  },
  {
    id: 'coins_300',
    sku: 'com.flamoral.coins.300',
    name: '300 Coins',
    coins: 250,
    bonusCoins: 50,
    totalCoins: 300,
    priceUsd: 24.99,
    priceDisplay: '$24.99',
    savingsPercent: 20,
    isBestValue: true,
    isPopular: false,
  },
  {
    id: 'coins_625',
    sku: 'com.flamoral.coins.625',
    name: '625 Coins',
    coins: 500,
    bonusCoins: 125,
    totalCoins: 625,
    priceUsd: 49.99,
    priceDisplay: '$49.99',
    savingsPercent: 25,
    isBestValue: false,
    isPopular: false,
  },
  {
    id: 'coins_1300',
    sku: 'com.flamoral.coins.1300',
    name: '1300 Coins',
    coins: 1000,
    bonusCoins: 300,
    totalCoins: 1300,
    priceUsd: 99.99,
    priceDisplay: '$99.99',
    savingsPercent: 30,
    isBestValue: false,
    isPopular: false,
  },
];

// Items that can be purchased with coins
const COIN_SPEND_ITEMS: CoinSpendItem[] = [
  {
    id: 'super_like',
    name: 'Super Like',
    description: 'Stand out from the crowd with a Super Like',
    coinCost: 5,
    category: 'superlike',
  },
  {
    id: 'rewind',
    name: 'Rewind',
    description: 'Undo your last swipe',
    coinCost: 3,
    category: 'rewind',
  },
  {
    id: 'boost_30',
    name: '30-Minute Boost',
    description: 'Get 10x more profile views for 30 minutes',
    coinCost: 30,
    category: 'boost',
    duration: 30,
  },
  {
    id: 'boost_60',
    name: '60-Minute Boost',
    description: 'Get 10x more profile views for 1 hour',
    coinCost: 50,
    category: 'boost',
    duration: 60,
  },
  {
    id: 'spotlight_30',
    name: '30-Minute Spotlight',
    description: 'Be featured at the top of everyone\'s stack',
    coinCost: 75,
    category: 'visibility',
    duration: 30,
  },
  {
    id: 'read_receipts_24h',
    name: '24-Hour Read Receipts',
    description: 'See when your messages are read for 24 hours',
    coinCost: 10,
    category: 'messaging',
    duration: 1440,
  },
  {
    id: 'incognito_24h',
    name: '24-Hour Incognito',
    description: 'Browse profiles without being seen for 24 hours',
    coinCost: 20,
    category: 'visibility',
    duration: 1440,
  },
  {
    id: 'see_likes',
    name: 'See Who Likes You',
    description: 'See all the people who liked you (one-time)',
    coinCost: 50,
    category: 'visibility',
  },
  {
    id: 'priority_message',
    name: 'Priority Message',
    description: 'Your message appears at the top',
    coinCost: 15,
    category: 'messaging',
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Send a special rose to stand out',
    coinCost: 25,
    gemCost: 3,
    category: 'special',
  },
];

// Daily reward configuration
const DAILY_REWARDS = [
  { day: 1, coins: 10, gems: 0 },
  { day: 2, coins: 15, gems: 0 },
  { day: 3, coins: 20, gems: 1 },
  { day: 4, coins: 25, gems: 0 },
  { day: 5, coins: 30, gems: 0 },
  { day: 6, coins: 40, gems: 2 },
  { day: 7, coins: 75, gems: 5 }, // Weekly bonus
];

const STREAK_MULTIPLIERS = [
  { minStreak: 7, multiplier: 1.5, bonusGems: 2 },
  { minStreak: 14, multiplier: 1.75, bonusGems: 5 },
  { minStreak: 30, multiplier: 2.0, bonusGems: 10 },
  { minStreak: 60, multiplier: 2.5, bonusGems: 25 },
  { minStreak: 100, multiplier: 3.0, bonusGems: 50 },
];

class WalletService {
  /**
   * Get or create user's wallet
   */
  async getWallet(userId: string): Promise<Wallet> {
    let wallet = await db('user_wallets').where('user_id', userId).first();

    if (!wallet) {
      wallet = await this.createWallet(userId);
    }

    return {
      userId: wallet.user_id,
      coins: wallet.coins,
      gems: wallet.gems,
      totalCoinsEarned: wallet.total_coins_earned,
      totalCoinsSpent: wallet.total_coins_spent,
      totalGemsEarned: wallet.total_gems_earned,
      totalGemsSpent: wallet.total_gems_spent,
      lastDailyRewardClaim: wallet.last_daily_reward_claim,
      currentStreak: wallet.current_streak,
    };
  }

  /**
   * Create a new wallet for a user
   */
  private async createWallet(userId: string): Promise<any> {
    const walletData = {
      id: uuidv4(),
      user_id: userId,
      coins: 50, // Welcome bonus
      gems: 5,   // Welcome bonus
      total_coins_earned: 50,
      total_coins_spent: 0,
      total_gems_earned: 5,
      total_gems_spent: 0,
      current_streak: 0,
      last_daily_reward_claim: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db('user_wallets').insert(walletData);

    // Record welcome bonus transaction
    await this.recordTransaction(userId, {
      type: 'earned',
      currencyType: 'coins',
      amount: 50,
      balanceAfter: 50,
      description: 'Welcome bonus',
      referenceType: 'welcome',
    });

    await this.recordTransaction(userId, {
      type: 'earned',
      currencyType: 'gems',
      amount: 5,
      balanceAfter: 5,
      description: 'Welcome bonus',
      referenceType: 'welcome',
    });

    return walletData;
  }

  /**
   * Add coins to user's wallet
   */
  async addCoins(
    userId: string,
    amount: number,
    type: TransactionType,
    description: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<{ newBalance: number; transaction: CoinTransaction }> {
    const wallet = await this.getWallet(userId);
    const newBalance = wallet.coins + amount;

    await db('user_wallets')
      .where('user_id', userId)
      .update({
        coins: newBalance,
        total_coins_earned: wallet.totalCoinsEarned + amount,
        updated_at: new Date(),
      });

    const transaction = await this.recordTransaction(userId, {
      type,
      currencyType: 'coins',
      amount,
      balanceAfter: newBalance,
      description,
      referenceId,
      referenceType,
    });

    logger.info(`Added ${amount} coins to user ${userId}. New balance: ${newBalance}`);

    return { newBalance, transaction };
  }

  /**
   * Deduct coins from user's wallet
   */
  async deductCoins(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<{ success: boolean; newBalance: number; transaction?: CoinTransaction }> {
    const wallet = await this.getWallet(userId);

    if (wallet.coins < amount) {
      return { success: false, newBalance: wallet.coins };
    }

    const newBalance = wallet.coins - amount;

    await db('user_wallets')
      .where('user_id', userId)
      .update({
        coins: newBalance,
        total_coins_spent: wallet.totalCoinsSpent + amount,
        updated_at: new Date(),
      });

    const transaction = await this.recordTransaction(userId, {
      type: 'spent',
      currencyType: 'coins',
      amount: -amount,
      balanceAfter: newBalance,
      description,
      referenceId,
      referenceType,
    });

    logger.info(`Deducted ${amount} coins from user ${userId}. New balance: ${newBalance}`);

    return { success: true, newBalance, transaction };
  }

  /**
   * Add gems to user's wallet
   */
  async addGems(
    userId: string,
    amount: number,
    type: TransactionType,
    description: string,
    referenceId?: string
  ): Promise<{ newBalance: number }> {
    const wallet = await this.getWallet(userId);
    const newBalance = wallet.gems + amount;

    await db('user_wallets')
      .where('user_id', userId)
      .update({
        gems: newBalance,
        total_gems_earned: wallet.totalGemsEarned + amount,
        updated_at: new Date(),
      });

    await this.recordTransaction(userId, {
      type,
      currencyType: 'gems',
      amount,
      balanceAfter: newBalance,
      description,
      referenceId,
    });

    logger.info(`Added ${amount} gems to user ${userId}. New balance: ${newBalance}`);

    return { newBalance };
  }

  /**
   * Deduct gems from user's wallet
   */
  async deductGems(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string
  ): Promise<{ success: boolean; newBalance: number }> {
    const wallet = await this.getWallet(userId);

    if (wallet.gems < amount) {
      return { success: false, newBalance: wallet.gems };
    }

    const newBalance = wallet.gems - amount;

    await db('user_wallets')
      .where('user_id', userId)
      .update({
        gems: newBalance,
        total_gems_spent: wallet.totalGemsSpent + amount,
        updated_at: new Date(),
      });

    await this.recordTransaction(userId, {
      type: 'spent',
      currencyType: 'gems',
      amount: -amount,
      balanceAfter: newBalance,
      description,
      referenceId,
    });

    return { success: true, newBalance };
  }

  /**
   * Claim daily reward
   */
  async claimDailyReward(userId: string): Promise<{
    success: boolean;
    alreadyClaimed?: boolean;
    reward?: { coins: number; gems: number };
    streakBonus?: { multiplier: number; bonusGems: number };
    currentStreak?: number;
    nextReward?: { coins: number; gems: number };
  }> {
    const wallet = await this.getWallet(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already claimed today
    if (wallet.lastDailyRewardClaim) {
      const lastClaim = new Date(wallet.lastDailyRewardClaim);
      lastClaim.setHours(0, 0, 0, 0);

      if (lastClaim.getTime() === today.getTime()) {
        return { success: false, alreadyClaimed: true };
      }

      // Check if streak is maintained (claimed yesterday)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastClaim.getTime() !== yesterday.getTime()) {
        // Streak broken, reset to 1
        wallet.currentStreak = 0;
      }
    }

    // Calculate new streak
    const newStreak = wallet.currentStreak + 1;

    // Get reward for current day (1-7 cycle)
    const rewardDay = ((newStreak - 1) % 7) + 1;
    const baseReward = DAILY_REWARDS.find(r => r.day === rewardDay)!;

    // Calculate streak bonus
    let streakBonus = null;
    for (const bonus of STREAK_MULTIPLIERS.slice().reverse()) {
      if (newStreak >= bonus.minStreak) {
        streakBonus = bonus;
        break;
      }
    }

    // Calculate final rewards
    const multiplier = streakBonus?.multiplier || 1;
    const coinReward = Math.floor(baseReward.coins * multiplier);
    const gemReward = baseReward.gems + (streakBonus?.bonusGems || 0);

    // Update wallet
    await db('user_wallets')
      .where('user_id', userId)
      .update({
        coins: wallet.coins + coinReward,
        gems: wallet.gems + gemReward,
        total_coins_earned: wallet.totalCoinsEarned + coinReward,
        total_gems_earned: wallet.totalGemsEarned + gemReward,
        current_streak: newStreak,
        last_daily_reward_claim: new Date(),
        updated_at: new Date(),
      });

    // Record transactions
    await this.recordTransaction(userId, {
      type: 'daily_reward',
      currencyType: 'coins',
      amount: coinReward,
      balanceAfter: wallet.coins + coinReward,
      description: `Day ${rewardDay} daily reward${streakBonus ? ` (${newStreak}-day streak bonus)` : ''}`,
      metadata: { day: rewardDay, streak: newStreak },
    });

    if (gemReward > 0) {
      await this.recordTransaction(userId, {
        type: 'daily_reward',
        currencyType: 'gems',
        amount: gemReward,
        balanceAfter: wallet.gems + gemReward,
        description: `Day ${rewardDay} daily reward`,
        metadata: { day: rewardDay, streak: newStreak },
      });
    }

    // Calculate next reward
    const nextDay = (rewardDay % 7) + 1;
    const nextReward = DAILY_REWARDS.find(r => r.day === nextDay)!;

    return {
      success: true,
      reward: { coins: coinReward, gems: gemReward },
      streakBonus: streakBonus || undefined,
      currentStreak: newStreak,
      nextReward: { coins: nextReward.coins, gems: nextReward.gems },
    };
  }

  /**
   * Purchase item with coins
   */
  async purchaseItem(
    userId: string,
    itemId: string
  ): Promise<{
    success: boolean;
    insufficientFunds?: boolean;
    item?: CoinSpendItem;
    newCoinBalance?: number;
    newGemBalance?: number;
    expiresAt?: Date;
  }> {
    const item = COIN_SPEND_ITEMS.find(i => i.id === itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const wallet = await this.getWallet(userId);

    // Check if user has enough currency
    if (wallet.coins < item.coinCost) {
      return { success: false, insufficientFunds: true };
    }

    if (item.gemCost && wallet.gems < item.gemCost) {
      return { success: false, insufficientFunds: true };
    }

    // Deduct coins
    const coinResult = await this.deductCoins(
      userId,
      item.coinCost,
      `Purchased ${item.name}`,
      itemId,
      'item_purchase'
    );

    // Deduct gems if required
    let newGemBalance = wallet.gems;
    if (item.gemCost) {
      const gemResult = await this.deductGems(
        userId,
        item.gemCost,
        `Purchased ${item.name}`,
        itemId
      );
      newGemBalance = gemResult.newBalance;
    }

    // Calculate expiration if item has duration
    let expiresAt: Date | undefined;
    if (item.duration) {
      expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + item.duration);

      // Record the active item/buff
      await db('user_active_items').insert({
        id: uuidv4(),
        user_id: userId,
        item_id: itemId,
        item_type: item.category,
        activated_at: new Date(),
        expires_at: expiresAt,
        created_at: new Date(),
      });
    }

    logger.info(`User ${userId} purchased ${item.name} for ${item.coinCost} coins`);

    return {
      success: true,
      item,
      newCoinBalance: coinResult.newBalance,
      newGemBalance,
      expiresAt,
    };
  }

  /**
   * Record a transaction
   */
  private async recordTransaction(
    userId: string,
    data: Omit<CoinTransaction, 'id' | 'userId' | 'createdAt'>
  ): Promise<CoinTransaction> {
    const transaction: CoinTransaction = {
      id: uuidv4(),
      userId,
      ...data,
      createdAt: new Date(),
    };

    await db('wallet_transactions').insert({
      id: transaction.id,
      user_id: userId,
      type: transaction.type,
      currency_type: transaction.currencyType,
      amount: transaction.amount,
      balance_after: transaction.balanceAfter,
      description: transaction.description,
      reference_id: transaction.referenceId,
      reference_type: transaction.referenceType,
      metadata: transaction.metadata ? JSON.stringify(transaction.metadata) : null,
      created_at: transaction.createdAt,
    });

    return transaction;
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    currencyType?: 'coins' | 'gems'
  ): Promise<CoinTransaction[]> {
    let query = db('wallet_transactions')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (currencyType) {
      query = query.where('currency_type', currencyType);
    }

    const transactions = await query;

    return transactions.map((t: any) => ({
      id: t.id,
      userId: t.user_id,
      type: t.type,
      currencyType: t.currency_type,
      amount: t.amount,
      balanceAfter: t.balance_after,
      description: t.description,
      referenceId: t.reference_id,
      referenceType: t.reference_type,
      metadata: t.metadata ? JSON.parse(t.metadata) : undefined,
      createdAt: t.created_at,
    }));
  }

  /**
   * Get available coin packages
   */
  getCoinPackages(): CoinPackage[] {
    return COIN_PACKAGES;
  }

  /**
   * Get items available for purchase
   */
  getSpendItems(): CoinSpendItem[] {
    return COIN_SPEND_ITEMS;
  }

  /**
   * Get daily reward info
   */
  async getDailyRewardInfo(userId: string): Promise<{
    canClaim: boolean;
    currentStreak: number;
    nextReward: { day: number; coins: number; gems: number };
    timeUntilReset: { hours: number; minutes: number };
    allRewards: typeof DAILY_REWARDS;
    streakBonuses: typeof STREAK_MULTIPLIERS;
  }> {
    const wallet = await this.getWallet(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let canClaim = true;
    if (wallet.lastDailyRewardClaim) {
      const lastClaim = new Date(wallet.lastDailyRewardClaim);
      lastClaim.setHours(0, 0, 0, 0);
      canClaim = lastClaim.getTime() !== today.getTime();
    }

    const nextDay = ((wallet.currentStreak) % 7) + 1;
    const nextReward = DAILY_REWARDS.find(r => r.day === nextDay)!;

    // Calculate time until midnight reset
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return {
      canClaim,
      currentStreak: wallet.currentStreak,
      nextReward: { day: nextDay, ...nextReward },
      timeUntilReset: { hours, minutes },
      allRewards: DAILY_REWARDS,
      streakBonuses: STREAK_MULTIPLIERS,
    };
  }

  /**
   * Get active items/buffs for user
   */
  async getActiveItems(userId: string): Promise<Array<{
    itemId: string;
    itemType: string;
    activatedAt: Date;
    expiresAt: Date;
    remainingMinutes: number;
  }>> {
    const items = await db('user_active_items')
      .where('user_id', userId)
      .where('expires_at', '>', new Date())
      .orderBy('expires_at', 'asc');

    return items.map((item: any) => {
      const expiresAt = new Date(item.expires_at);
      const remainingMs = expiresAt.getTime() - Date.now();

      return {
        itemId: item.item_id,
        itemType: item.item_type,
        activatedAt: item.activated_at,
        expiresAt,
        remainingMinutes: Math.max(0, Math.floor(remainingMs / (1000 * 60))),
      };
    });
  }

  /**
   * Check if user has active item of type
   */
  async hasActiveItem(userId: string, itemId: string): Promise<boolean> {
    const item = await db('user_active_items')
      .where('user_id', userId)
      .where('item_id', itemId)
      .where('expires_at', '>', new Date())
      .first();

    return !!item;
  }
}

export const walletService = new WalletService();
