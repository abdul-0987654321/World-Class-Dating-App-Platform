/**
 * Boost Service
 * Handles profile boosts, visibility multipliers, and expiration scheduling
 */

import { logger } from '../../utils/logger';
import { db } from '../../config/database.config';
import { v4 as uuidv4 } from 'uuid';
import { walletService } from './Wallet.service';

// Types
export interface Boost {
  id: string;
  userId: string;
  type: BoostType;
  status: BoostStatus;
  visibilityMultiplier: number;
  startedAt: Date;
  expiresAt: Date;
  impressions: number;
  profileViews: number;
  likesReceived: number;
  matchesReceived: number;
  coinsPaid: number;
  usdPaid: number;
  createdAt: Date;
}

export type BoostType = 'standard' | 'prime_time' | 'spotlight' | 'super_boost';
export type BoostStatus = 'pending' | 'active' | 'completed' | 'expired' | 'cancelled';

export interface BoostProduct {
  id: string;
  type: BoostType;
  name: string;
  description: string;
  durationMinutes: number;
  visibilityMultiplier: number;
  coinPrice: number;
  usdPrice: number;
  features: string[];
  recommended?: boolean;
}

export interface BoostStats {
  totalBoosts: number;
  activeBoost: Boost | null;
  avgImpressionsPerBoost: number;
  avgLikesPerBoost: number;
  avgMatchesPerBoost: number;
  bestTimeToBoost: string;
}

// Boost products configuration
const BOOST_PRODUCTS: BoostProduct[] = [
  {
    id: 'boost_standard',
    type: 'standard',
    name: 'Boost',
    description: 'Get 10x more profile views for 30 minutes',
    durationMinutes: 30,
    visibilityMultiplier: 10,
    coinPrice: 30,
    usdPrice: 3.99,
    features: [
      '10x profile visibility',
      '30 minutes duration',
      'Priority in nearby feeds',
    ],
  },
  {
    id: 'boost_prime_time',
    type: 'prime_time',
    name: 'Prime Time Boost',
    description: 'Get 15x more views during peak hours for 1 hour',
    durationMinutes: 60,
    visibilityMultiplier: 15,
    coinPrice: 50,
    usdPrice: 5.99,
    features: [
      '15x profile visibility',
      '60 minutes duration',
      'Priority in all feeds',
      'Best for evening hours',
    ],
    recommended: true,
  },
  {
    id: 'boost_spotlight',
    type: 'spotlight',
    name: 'Spotlight',
    description: 'Be featured at the top of everyone\'s stack for 2 hours',
    durationMinutes: 120,
    visibilityMultiplier: 20,
    coinPrice: 100,
    usdPrice: 9.99,
    features: [
      '20x profile visibility',
      '2 hours duration',
      'Featured at top of stack',
      'Premium badge during boost',
    ],
  },
  {
    id: 'boost_super',
    type: 'super_boost',
    name: 'Super Boost',
    description: 'Maximum visibility for 3 hours with all premium features',
    durationMinutes: 180,
    visibilityMultiplier: 30,
    coinPrice: 200,
    usdPrice: 19.99,
    features: [
      '30x profile visibility',
      '3 hours duration',
      'Featured at top of stack',
      'Premium badge',
      'Priority matching',
      'Guaranteed minimum views',
    ],
  },
];

// Optimal boost times by day
const OPTIMAL_BOOST_TIMES = {
  weekday: { start: 19, end: 22 }, // 7 PM - 10 PM
  weekend: { start: 14, end: 23 }, // 2 PM - 11 PM
};

class BoostService {
  private expirationCheckerInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize boost expiration scheduler
   */
  startExpirationScheduler(): void {
    // Check for expired boosts every minute
    this.expirationCheckerInterval = setInterval(async () => {
      await this.processExpiredBoosts();
    }, 60000);

    logger.info('Boost expiration scheduler started');
  }

  /**
   * Stop the expiration scheduler
   */
  stopExpirationScheduler(): void {
    if (this.expirationCheckerInterval) {
      clearInterval(this.expirationCheckerInterval);
      this.expirationCheckerInterval = null;
      logger.info('Boost expiration scheduler stopped');
    }
  }

  /**
   * Get available boost products
   */
  getBoostProducts(): BoostProduct[] {
    return BOOST_PRODUCTS;
  }

  /**
   * Activate a boost for a user
   */
  async activateBoost(
    userId: string,
    productId: string,
    paymentMethod: 'coins' | 'usd' = 'coins'
  ): Promise<{
    success: boolean;
    boost?: Boost;
    error?: string;
    insufficientFunds?: boolean;
  }> {
    // Check if user already has an active boost
    const activeBoost = await this.getActiveBoost(userId);
    if (activeBoost) {
      return {
        success: false,
        error: 'You already have an active boost. Wait for it to expire or stack boosts (premium).',
      };
    }

    // Get the product
    const product = BOOST_PRODUCTS.find(p => p.id === productId);
    if (!product) {
      return { success: false, error: 'Invalid boost product' };
    }

    // Process payment
    if (paymentMethod === 'coins') {
      const wallet = await walletService.getWallet(userId);
      if (wallet.coins < product.coinPrice) {
        return { success: false, insufficientFunds: true, error: 'Insufficient coins' };
      }

      await walletService.deductCoins(
        userId,
        product.coinPrice,
        `${product.name} activation`,
        productId,
        'boost'
      );
    }

    // Create the boost
    const now = new Date();
    const expiresAt = new Date(now.getTime() + product.durationMinutes * 60 * 1000);

    const boostData = {
      id: uuidv4(),
      user_id: userId,
      type: product.type,
      status: 'active',
      visibility_multiplier: product.visibilityMultiplier,
      started_at: now,
      expires_at: expiresAt,
      impressions: 0,
      profile_views: 0,
      likes_received: 0,
      matches_received: 0,
      coins_paid: paymentMethod === 'coins' ? product.coinPrice : 0,
      usd_paid: paymentMethod === 'usd' ? product.usdPrice : 0,
      created_at: now,
      updated_at: now,
    };

    await db('boosts').insert(boostData);

    logger.info(`User ${userId} activated ${product.name} boost until ${expiresAt}`);

    return {
      success: true,
      boost: this.mapDbBoostToBoost(boostData),
    };
  }

  /**
   * Get user's active boost
   */
  async getActiveBoost(userId: string): Promise<Boost | null> {
    const boost = await db('boosts')
      .where('user_id', userId)
      .where('status', 'active')
      .where('expires_at', '>', new Date())
      .first();

    return boost ? this.mapDbBoostToBoost(boost) : null;
  }

  /**
   * Get boost by ID
   */
  async getBoostById(boostId: string): Promise<Boost | null> {
    const boost = await db('boosts').where('id', boostId).first();
    return boost ? this.mapDbBoostToBoost(boost) : null;
  }

  /**
   * Record boost impression
   */
  async recordImpression(boostId: string): Promise<void> {
    await db('boosts')
      .where('id', boostId)
      .increment('impressions', 1);
  }

  /**
   * Record profile view during boost
   */
  async recordProfileView(boostId: string): Promise<void> {
    await db('boosts')
      .where('id', boostId)
      .increment('profile_views', 1);
  }

  /**
   * Record like received during boost
   */
  async recordLikeReceived(boostId: string): Promise<void> {
    await db('boosts')
      .where('id', boostId)
      .increment('likes_received', 1);
  }

  /**
   * Record match received during boost
   */
  async recordMatchReceived(boostId: string): Promise<void> {
    await db('boosts')
      .where('id', boostId)
      .increment('matches_received', 1);
  }

  /**
   * Get remaining boost time
   */
  async getRemainingBoostTime(userId: string): Promise<{
    hasActiveBoost: boolean;
    remainingMinutes: number;
    remainingSeconds: number;
    boost?: Boost;
  }> {
    const boost = await this.getActiveBoost(userId);

    if (!boost) {
      return { hasActiveBoost: false, remainingMinutes: 0, remainingSeconds: 0 };
    }

    const remainingMs = boost.expiresAt.getTime() - Date.now();
    const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
    const remainingSeconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

    return {
      hasActiveBoost: true,
      remainingMinutes: Math.max(0, remainingMinutes),
      remainingSeconds: Math.max(0, remainingSeconds),
      boost,
    };
  }

  /**
   * Get user's boost history
   */
  async getBoostHistory(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<Boost[]> {
    const boosts = await db('boosts')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return boosts.map((b: any) => this.mapDbBoostToBoost(b));
  }

  /**
   * Get boost statistics for user
   */
  async getBoostStats(userId: string): Promise<BoostStats> {
    const activeBoost = await this.getActiveBoost(userId);

    const stats = await db('boosts')
      .where('user_id', userId)
      .whereIn('status', ['completed', 'expired'])
      .select(
        db.raw('COUNT(*) as total_boosts'),
        db.raw('AVG(impressions) as avg_impressions'),
        db.raw('AVG(likes_received) as avg_likes'),
        db.raw('AVG(matches_received) as avg_matches')
      )
      .first();

    // Determine best time to boost based on user's history
    const successfulBoosts = await db('boosts')
      .where('user_id', userId)
      .where('likes_received', '>', 0)
      .select('started_at', 'likes_received')
      .orderBy('likes_received', 'desc')
      .limit(10);

    let bestTimeToBoost = 'Evening (7-10 PM)';
    if (successfulBoosts.length > 0) {
      // Analyze most successful boost times
      const hours = successfulBoosts.map((b: any) =>
        new Date(b.started_at).getHours()
      );
      const avgHour = hours.reduce((a: number, b: number) => a + b, 0) / hours.length;

      if (avgHour >= 6 && avgHour < 12) {
        bestTimeToBoost = 'Morning (6 AM - 12 PM)';
      } else if (avgHour >= 12 && avgHour < 17) {
        bestTimeToBoost = 'Afternoon (12 - 5 PM)';
      } else if (avgHour >= 17 && avgHour < 21) {
        bestTimeToBoost = 'Evening (5 - 9 PM)';
      } else {
        bestTimeToBoost = 'Night (9 PM - 12 AM)';
      }
    }

    return {
      totalBoosts: Number(stats?.total_boosts || 0),
      activeBoost,
      avgImpressionsPerBoost: Math.round(Number(stats?.avg_impressions || 0)),
      avgLikesPerBoost: Math.round(Number(stats?.avg_likes || 0)),
      avgMatchesPerBoost: Math.round(Number(stats?.avg_matches || 0)),
      bestTimeToBoost,
    };
  }

  /**
   * Get optimal boost time recommendation
   */
  getOptimalBoostTime(): {
    isOptimalNow: boolean;
    nextOptimalTime: Date;
    message: string;
  } {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const optimalTimes = isWeekend
      ? OPTIMAL_BOOST_TIMES.weekend
      : OPTIMAL_BOOST_TIMES.weekday;

    const isOptimalNow = hour >= optimalTimes.start && hour < optimalTimes.end;

    let nextOptimalTime = new Date(now);
    if (isOptimalNow) {
      // Already in optimal time
      nextOptimalTime = now;
    } else if (hour < optimalTimes.start) {
      // Later today
      nextOptimalTime.setHours(optimalTimes.start, 0, 0, 0);
    } else {
      // Tomorrow
      nextOptimalTime.setDate(nextOptimalTime.getDate() + 1);
      const tomorrowIsWeekend =
        nextOptimalTime.getDay() === 0 || nextOptimalTime.getDay() === 6;
      const tomorrowOptimal = tomorrowIsWeekend
        ? OPTIMAL_BOOST_TIMES.weekend
        : OPTIMAL_BOOST_TIMES.weekday;
      nextOptimalTime.setHours(tomorrowOptimal.start, 0, 0, 0);
    }

    const message = isOptimalNow
      ? 'Now is a great time to boost! Peak activity detected.'
      : `Best time to boost: ${this.formatTime(nextOptimalTime)}`;

    return {
      isOptimalNow,
      nextOptimalTime,
      message,
    };
  }

  /**
   * Cancel an active boost (partial refund)
   */
  async cancelBoost(
    userId: string,
    boostId: string
  ): Promise<{ success: boolean; refundedCoins?: number }> {
    const boost = await db('boosts')
      .where('id', boostId)
      .where('user_id', userId)
      .where('status', 'active')
      .first();

    if (!boost) {
      return { success: false };
    }

    // Calculate partial refund based on remaining time
    const totalDuration = new Date(boost.expires_at).getTime() - new Date(boost.started_at).getTime();
    const elapsed = Date.now() - new Date(boost.started_at).getTime();
    const remainingPercent = Math.max(0, (totalDuration - elapsed) / totalDuration);

    const refundCoins = Math.floor(boost.coins_paid * remainingPercent * 0.5); // 50% of remaining value

    // Update boost status
    await db('boosts')
      .where('id', boostId)
      .update({
        status: 'cancelled',
        updated_at: new Date(),
      });

    // Refund coins if applicable
    if (refundCoins > 0) {
      await walletService.addCoins(
        userId,
        refundCoins,
        'refund',
        'Boost cancellation refund',
        boostId,
        'boost_refund'
      );
    }

    logger.info(`User ${userId} cancelled boost ${boostId}, refunded ${refundCoins} coins`);

    return { success: true, refundedCoins: refundCoins };
  }

  /**
   * Process expired boosts
   */
  private async processExpiredBoosts(): Promise<void> {
    try {
      const expiredBoosts = await db('boosts')
        .where('status', 'active')
        .where('expires_at', '<=', new Date())
        .select('id', 'user_id');

      if (expiredBoosts.length === 0) return;

      // Update all expired boosts
      await db('boosts')
        .whereIn('id', expiredBoosts.map((b: any) => b.id))
        .update({
          status: 'completed',
          updated_at: new Date(),
        });

      logger.info(`Processed ${expiredBoosts.length} expired boosts`);

      // TODO: Send notifications to users about boost completion with stats
      for (const boost of expiredBoosts) {
        // Could trigger a notification here
        logger.debug(`Boost completed for user ${boost.user_id}`);
      }
    } catch (error) {
      logger.error('Error processing expired boosts:', error);
    }
  }

  /**
   * Get visibility multiplier for user in discovery
   */
  async getVisibilityMultiplier(userId: string): Promise<number> {
    const boost = await this.getActiveBoost(userId);
    return boost ? boost.visibilityMultiplier : 1;
  }

  /**
   * Check if user is currently boosted
   */
  async isBoosted(userId: string): Promise<boolean> {
    const boost = await this.getActiveBoost(userId);
    return boost !== null;
  }

  /**
   * Map database boost to Boost interface
   */
  private mapDbBoostToBoost(dbBoost: any): Boost {
    return {
      id: dbBoost.id,
      userId: dbBoost.user_id,
      type: dbBoost.type,
      status: dbBoost.status,
      visibilityMultiplier: dbBoost.visibility_multiplier,
      startedAt: new Date(dbBoost.started_at),
      expiresAt: new Date(dbBoost.expires_at),
      impressions: dbBoost.impressions,
      profileViews: dbBoost.profile_views,
      likesReceived: dbBoost.likes_received,
      matchesReceived: dbBoost.matches_received,
      coinsPaid: dbBoost.coins_paid,
      usdPaid: dbBoost.usd_paid,
      createdAt: new Date(dbBoost.created_at),
    };
  }

  /**
   * Format time for display
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}

export const boostService = new BoostService();
