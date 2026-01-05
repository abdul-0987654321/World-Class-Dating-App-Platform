import { Boost, BOOST_STATUS, BOOST_TYPES, isBoostActive } from '../entities/Boost.entity';
import { BoostProductRepository } from '../repositories/boost-product.repository';
import { BoostRepository } from '../repositories/boost.repository';

import { CoinService } from './coin.service';

export class BoostService {
  private boostRepository: BoostRepository;
  private boostProductRepository: BoostProductRepository;
  private coinService: CoinService;

  constructor(
    boostRepository?: BoostRepository,
    boostProductRepository?: BoostProductRepository,
    coinService?: CoinService
  ) {
    this.boostRepository = boostRepository || new BoostRepository();
    this.boostProductRepository = boostProductRepository || new BoostProductRepository();
    this.coinService = coinService || new CoinService();
  }

  /**
   * Get all available boost products
   */
  async getAvailableBoosts() {
    return await this.boostProductRepository.findAllActive();
  }

  /**
   * Get boost products by type
   */
  async getBoostsByType(type: Boost['type']) {
    return await this.boostProductRepository.findByType(type);
  }

  /**
   * Purchase and activate a boost using coins
   */
  async purchaseBoostWithCoins(
    userId: string,
    productSku: string
  ): Promise<{ boost: Boost; coinResult: any }> {
    // Get product details
    const product = await this.boostProductRepository.findBySku(productSku);
    if (!product || !product.active) {
      throw new Error('Invalid or inactive boost product');
    }

    // Check if user already has an active boost
    const activeBoost = await this.boostRepository.findActiveBoostByUserId(userId);
    if (activeBoost && isBoostActive(activeBoost)) {
      throw new Error('User already has an active boost');
    }

    // Create boost record
    const boost = await this.boostRepository.create({
      userId,
      type: product.type,
      durationMinutes: product.durationMinutes,
      visibilityMultiplier: product.visibilityMultiplier,
    });

    // Spend coins
    const coinResult = await this.coinService.spendCoinsOnBoost(userId, product.type, boost.id);

    // Activate boost immediately
    await this.boostRepository.activateBoost(boost.id);

    const activatedBoost = await this.boostRepository.findById(boost.id);

    return {
      boost: activatedBoost,
      coinResult,
    };
  }

  /**
   * Purchase boost with USD (via Stripe)
   */
  async purchaseBoostWithUSD(
    userId: string,
    productSku: string,
    stripePaymentId: string
  ): Promise<Boost> {
    // Get product details
    const product = await this.boostProductRepository.findBySku(productSku);
    if (!product || !product.active) {
      throw new Error('Invalid or inactive boost product');
    }

    // Check if user already has an active boost
    const activeBoost = await this.boostRepository.findActiveBoostByUserId(userId);
    if (activeBoost && isBoostActive(activeBoost)) {
      throw new Error('User already has an active boost');
    }

    // Create boost record
    const boost = await this.boostRepository.create({
      userId,
      type: product.type,
      durationMinutes: product.durationMinutes,
      visibilityMultiplier: product.visibilityMultiplier,
    });

    // Activate boost immediately
    await this.boostRepository.activateBoost(boost.id);

    const activatedBoost = await this.boostRepository.findById(boost.id);
    return activatedBoost;
  }

  /**
   * Get user's active boost
   */
  async getActiveBoost(userId: string): Promise<Boost | null> {
    const boost = await this.boostRepository.findActiveBoostByUserId(userId);

    if (!boost) {
      return null;
    }

    // Check if it's actually still active
    if (!isBoostActive(boost)) {
      // Mark as completed
      await this.boostRepository.completeBoost(boost.id);
      return null;
    }

    return boost;
  }

  /**
   * Get user's boost history
   */
  async getUserBoostHistory(userId: string, limit: number = 20) {
    return await this.boostRepository.findByUserId(userId, { limit });
  }

  /**
   * Get user's boost statistics
   */
  async getUserBoostStats(userId: string) {
    return await this.boostRepository.getUserBoostStats(userId);
  }

  /**
   * Increment boost metrics when user gains impressions/likes/matches
   */
  async trackBoostImpression(userId: string): Promise<void> {
    const activeBoost = await this.boostRepository.findActiveBoostByUserId(userId);

    if (activeBoost && isBoostActive(activeBoost)) {
      await this.boostRepository.incrementMetrics(activeBoost.id, { impressions: 1 });
    }
  }

  /**
   * Track when user gets a like during boost
   */
  async trackBoostLike(userId: string): Promise<void> {
    const activeBoost = await this.boostRepository.findActiveBoostByUserId(userId);

    if (activeBoost && isBoostActive(activeBoost)) {
      await this.boostRepository.incrementMetrics(activeBoost.id, { likes: 1 });
    }
  }

  /**
   * Track when user gets a match during boost
   */
  async trackBoostMatch(userId: string): Promise<void> {
    const activeBoost = await this.boostRepository.findActiveBoostByUserId(userId);

    if (activeBoost && isBoostActive(activeBoost)) {
      await this.boostRepository.incrementMetrics(activeBoost.id, { matches: 1 });
    }
  }

  /**
   * Cancel an active boost (refund coins)
   */
  async cancelBoost(userId: string): Promise<{ boost: Boost; refund?: any }> {
    const activeBoost = await this.boostRepository.findActiveBoostByUserId(userId);

    if (!activeBoost) {
      throw new Error('No active boost found');
    }

    if (!isBoostActive(activeBoost)) {
      throw new Error('Boost is not active');
    }

    // Cancel the boost
    const canceledBoost = await this.boostRepository.cancelBoost(activeBoost.id);

    // Find the coin transaction for this boost and refund
    const transactions = await this.coinService.getTransactionHistory(userId, {
      type: 'spent',
      limit: 50,
    });

    const boostTransaction = transactions.find((t) => t.referenceId === activeBoost.id);

    let refund;
    if (boostTransaction) {
      // Refund the coins
      refund = await this.coinService.refundCoins(
        userId,
        boostTransaction.id,
        'Boost canceled by user'
      );
    }

    return { boost: canceledBoost, refund };
  }

  /**
   * Process expired boosts (cron job)
   */
  async processExpiredBoosts(): Promise<number> {
    const expiredBoosts = await this.boostRepository.findExpiredActiveBoosts();
    let processed = 0;

    for (const boost of expiredBoosts) {
      await this.boostRepository.completeBoost(boost.id);
      processed++;
    }

    return processed;
  }

  /**
   * Check if user should get visibility boost (for matching algorithm)
   */
  async getUserVisibilityMultiplier(userId: string): Promise<number> {
    const activeBoost = await this.getActiveBoost(userId);

    if (activeBoost) {
      return activeBoost.visibilityMultiplier;
    }

    return 1.0; // Default multiplier
  }

  /**
   * Get boost recommendations for user
   */
  async getBoostRecommendations(userId: string) {
    const products = await this.boostProductRepository.findAllActive();
    const stats = await this.getUserBoostStats(userId);

    // Calculate best time to boost based on user's history
    const bestTimes = this.calculateBestBoostTimes(stats);

    return {
      products,
      recommendations: {
        bestTimes,
        suggestedType: stats.totalBoosts === 0 ? BOOST_TYPES.STANDARD : BOOST_TYPES.PRIME_TIME,
        previousEffectiveness: stats.averageEffectiveness,
      },
    };
  }

  /**
   * Calculate best times to boost based on historical data
   */
  private calculateBestBoostTimes(stats: any): string[] {
    // This is a simplified version - would use actual data analysis
    // Peak dating app usage times are typically:
    return ['Sunday evening (7-9 PM)', 'Monday evening (8-10 PM)', 'Thursday evening (7-9 PM)'];
  }

  /**
   * Admin: Get boost analytics
   */
  async getBoostAnalytics() {
    // This would aggregate boost data for analytics
    return {
      totalBoosts: 0,
      activeBoosts: 0,
      completedBoosts: 0,
      averageEffectiveness: 0,
      revenueByType: {
        standard: 0,
        prime_time: 0,
        spotlight: 0,
      },
    };
  }
}

export default new BoostService();
