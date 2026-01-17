import { Coin, hasEnoughCoins, COIN_PRICES } from '../entities/Coin.entity';
import {
  TRANSACTION_TYPES,
  REFERENCE_TYPES,
  formatTransactionReason,
} from '../entities/CoinTransaction.entity';
import { CoinProductRepository } from '../repositories/coin-product.repository';
import { CoinTransactionRepository } from '../repositories/coin-transaction.repository';
import { CoinRepository } from '../repositories/coin.repository';

export class CoinService {
  private coinRepository: CoinRepository;
  private coinTransactionRepository: CoinTransactionRepository;
  private coinProductRepository: CoinProductRepository;

  constructor(
    coinRepository?: CoinRepository,
    coinTransactionRepository?: CoinTransactionRepository,
    coinProductRepository?: CoinProductRepository
  ) {
    this.coinRepository = coinRepository || new CoinRepository();
    this.coinTransactionRepository = coinTransactionRepository || new CoinTransactionRepository();
    this.coinProductRepository = coinProductRepository || new CoinProductRepository();
  }

  /**
   * Initialize coin account for a new user
   */
  async initializeCoinAccount(userId: string, initialBalance: number = 0): Promise<Coin> {
    const existing = await this.coinRepository.findByUserId(userId);
    if (existing) {
      throw new Error('User already has a coin account');
    }

    const coin = await this.coinRepository.create({ userId, initialBalance });

    // Create initial transaction if balance > 0
    if (initialBalance > 0) {
      await this.coinTransactionRepository.create({
        userId,
        type: TRANSACTION_TYPES.REWARD,
        amount: initialBalance,
        balanceAfter: initialBalance,
        reason: 'Welcome bonus',
        referenceType: REFERENCE_TYPES.DAILY_REWARD,
      });
    }

    return coin;
  }

  /**
   * Get user's coin balance
   */
  async getBalance(userId: string): Promise<Coin | null> {
    return await this.coinRepository.findByUserId(userId);
  }

  /**
   * Purchase coins (via Stripe payment)
   * Uses transaction to ensure atomicity between balance update and transaction record
   * Also includes idempotency check via stripePaymentId
   */
  async purchaseCoins(
    userId: string,
    productSku: string,
    stripePaymentId: string
  ): Promise<{ coin: Coin; transaction: any }> {
    // Get product details
    const product = await this.coinProductRepository.findBySku(productSku);
    if (!product || !product.active) {
      throw new Error('Invalid or inactive product');
    }

    // Check if this payment was already processed (idempotency via stripePaymentId)
    const existingTransaction = await this.coinTransactionRepository.findByReferenceId(
      stripePaymentId,
      REFERENCE_TYPES.STRIPE_PAYMENT
    );
    if (existingTransaction) {
      // Return existing result for idempotency
      const coin = await this.coinRepository.findByUserId(userId);
      return { coin: coin!, transaction: existingTransaction };
    }

    const totalCoins = product.coinAmount + product.bonusCoins;

    // Use atomic transaction to ensure balance and transaction record are consistent
    const result = await this.coinRepository.purchaseCoinsWithTransaction(
      userId,
      totalCoins,
      stripePaymentId,
      {
        productSku: product.sku,
        coinAmount: product.coinAmount,
        bonusCoins: product.bonusCoins,
        priceUsd: product.priceUsd,
        productName: product.name,
      }
    );

    return result;
  }

  /**
   * Spend coins on an action
   */
  async spendCoins(
    userId: string,
    amount: number,
    reason: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<{ coin: Coin; transaction: any }> {
    // Check if user has enough coins
    const currentCoin = await this.coinRepository.findByUserId(userId);
    if (!currentCoin) {
      throw new Error('User does not have a coin account');
    }

    if (!hasEnoughCoins(currentCoin, amount)) {
      throw new Error('Insufficient coin balance');
    }

    // Spend coins (transaction-safe)
    const coin = await this.coinRepository.updateBalanceTransaction(userId, amount, true);

    // Create transaction record
    const transaction = await this.coinTransactionRepository.create({
      userId,
      type: TRANSACTION_TYPES.SPENT,
      amount: -amount, // Negative for debit
      balanceAfter: coin.balance,
      reason,
      referenceId,
      referenceType,
    });

    return { coin, transaction };
  }

  /**
   * Award coins (rewards, achievements, etc.)
   */
  async awardCoins(
    userId: string,
    amount: number,
    reason: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<{ coin: Coin; transaction: any }> {
    // Add coins to user's balance
    const coin = await this.coinRepository.addCoins(userId, amount, false);

    // Create transaction record
    const transaction = await this.coinTransactionRepository.create({
      userId,
      type: TRANSACTION_TYPES.REWARD,
      amount,
      balanceAfter: coin.balance,
      reason,
      referenceId,
      referenceType,
    });

    return { coin, transaction };
  }

  /**
   * Refund coins
   */
  async refundCoins(
    userId: string,
    originalTransactionId: string,
    reason: string
  ): Promise<{ coin: Coin; transaction: any }> {
    // Get original transaction
    const originalTransaction =
      await this.coinTransactionRepository.findById(originalTransactionId);
    if (!originalTransaction) {
      throw new Error('Original transaction not found');
    }

    if (originalTransaction.type !== TRANSACTION_TYPES.SPENT) {
      throw new Error('Can only refund spent transactions');
    }

    const refundAmount = Math.abs(originalTransaction.amount);

    // Add coins back
    const coin = await this.coinRepository.addCoins(userId, refundAmount, false);

    // Create refund transaction
    const transaction = await this.coinTransactionRepository.create({
      userId,
      type: TRANSACTION_TYPES.REFUND,
      amount: refundAmount,
      balanceAfter: coin.balance,
      reason,
      referenceId: originalTransactionId,
      referenceType: REFERENCE_TYPES.REFUND,
    });

    return { coin, transaction };
  }

  /**
   * Get user's transaction history
   */
  async getTransactionHistory(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    return await this.coinTransactionRepository.findByUserId(userId, options);
  }

  /**
   * Get transaction summary for user
   */
  async getTransactionSummary(userId: string) {
    return await this.coinTransactionRepository.getUserTransactionSummary(userId);
  }

  /**
   * Get all available coin products
   */
  async getAvailableProducts() {
    return await this.coinProductRepository.findAllActive();
  }

  /**
   * Spend coins on a boost
   */
  async spendCoinsOnBoost(
    userId: string,
    boostType: 'standard' | 'prime_time' | 'spotlight',
    boostId: string
  ): Promise<{ coin: Coin; transaction: any }> {
    const prices: Record<string, number> = {
      standard: COIN_PRICES.BOOST_STANDARD,
      prime_time: COIN_PRICES.BOOST_PRIME_TIME,
      spotlight: COIN_PRICES.BOOST_SPOTLIGHT,
    };

    const amount = prices[boostType];
    if (!amount) {
      throw new Error('Invalid boost type');
    }

    return await this.spendCoins(
      userId,
      amount,
      `Boost (${boostType})`,
      boostId,
      REFERENCE_TYPES.BOOST
    );
  }

  /**
   * Spend coins on super like
   */
  async spendCoinsOnSuperLike(
    userId: string,
    targetUserId: string
  ): Promise<{ coin: Coin; transaction: any }> {
    return await this.spendCoins(
      userId,
      COIN_PRICES.SUPER_LIKE,
      'Super Like',
      targetUserId,
      REFERENCE_TYPES.SUPER_LIKE
    );
  }

  /**
   * Spend coins on rewind
   */
  async spendCoinsOnRewind(
    userId: string,
    swipeId: string
  ): Promise<{ coin: Coin; transaction: any }> {
    return await this.spendCoins(
      userId,
      COIN_PRICES.REWIND,
      'Rewind',
      swipeId,
      REFERENCE_TYPES.REWIND
    );
  }

  /**
   * Daily reward system
   */
  async grantDailyReward(userId: string): Promise<{ coin: Coin; transaction: any } | null> {
    // Check if user already got daily reward today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const transactions = await this.coinTransactionRepository.findByUserId(userId, {
      type: TRANSACTION_TYPES.REWARD,
      startDate: today,
      limit: 100,
    });

    const dailyReward = transactions.find((t) => t.referenceType === REFERENCE_TYPES.DAILY_REWARD);

    if (dailyReward) {
      return null; // Already claimed today
    }

    // Grant daily reward (5 coins)
    return await this.awardCoins(
      userId,
      5,
      'Daily login reward',
      undefined,
      REFERENCE_TYPES.DAILY_REWARD
    );
  }

  /**
   * Admin: Adjust user balance
   */
  async adminAdjustBalance(
    userId: string,
    amount: number,
    reason: string,
    adminId: string
  ): Promise<{ coin: Coin; transaction: any }> {
    const isDebit = amount < 0;
    const absAmount = Math.abs(amount);

    const coin = await this.coinRepository.updateBalanceTransaction(userId, absAmount, isDebit);

    const transaction = await this.coinTransactionRepository.create({
      userId,
      type: TRANSACTION_TYPES.ADMIN_ADJUSTMENT,
      amount,
      balanceAfter: coin.balance,
      reason: `Admin adjustment: ${reason}`,
      referenceId: adminId,
      referenceType: 'admin',
      metadata: { adminId, reason },
    });

    return { coin, transaction };
  }

  /**
   * Get leaderboard of top coin holders
   */
  async getTopCoinHolders(limit: number = 10) {
    return await this.coinRepository.getTopUsersByBalance(limit);
  }
}

export default new CoinService();
