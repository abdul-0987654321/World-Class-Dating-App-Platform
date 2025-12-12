/**
 * Boost Service
 * Handles profile boost feature for increased visibility
 * Premium feature that puts user's profile at the top of discovery
 */

import { Knex } from 'knex';
import db from '../../infrastructure/database/connection';
import { createLogger } from '@flamoral/shared';
import analyticsServiceClient from '../../infrastructure/clients/analytics-service.client';

const logger = createLogger('boost-service');

export interface BoostRecord {
  id: string;
  userId: string;
  startedAt: Date;
  expiresAt: Date;
  active: boolean;
  impressions: number;
  profileViews: number;
  likes: number;
  matches: number;
}

export interface BoostPurchaseRequest {
  userId: string;
  duration: number; // minutes
  paymentId?: string;
}

export interface BoostStats {
  totalBoosts: number;
  activeBoost: boolean;
  currentBoostExpiresAt: Date | null;
  lifetimeStats: {
    totalImpressions: number;
    totalProfileViews: number;
    totalLikes: number;
    totalMatches: number;
  };
  averagePerformance: {
    impressionsPerBoost: number;
    viewsPerBoost: number;
    likesPerBoost: number;
    matchesPerBoost: number;
  };
}

export class BoostService {
  private db: Knex;

  // Boost configurations
  private readonly BOOST_DURATION_MINUTES = 30;
  private readonly BOOST_MULTIPLIER = 10; // 10x visibility
  private readonly MAX_ACTIVE_BOOSTS = 1;

  constructor(database: Knex = db) {
    this.db = database;
  }

  /**
   * Activate a boost for a user
   */
  async activateBoost(request: BoostPurchaseRequest): Promise<BoostRecord> {
    try {
      const { userId, duration = this.BOOST_DURATION_MINUTES } = request;

      logger.info(`Activating boost for user ${userId} for ${duration} minutes`);

      // Check if user already has an active boost
      const activeBoost = await this.getActiveBoost(userId);

      if (activeBoost) {
        throw new Error('User already has an active boost');
      }

      // Check daily boost limit for free users
      const todayBoostCount = await this.getTodayBoostCount(userId);
      const MAX_DAILY_BOOSTS = 5;

      if (todayBoostCount >= MAX_DAILY_BOOSTS) {
        throw new Error('Daily boost limit reached');
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + duration * 60000);

      // Create boost record
      const [boost] = await this.db('boosts')
        .insert({
          user_id: userId,
          started_at: now,
          expires_at: expiresAt,
          active: true,
          impressions: 0,
          profile_views: 0,
          likes: 0,
          matches: 0,
          payment_id: request.paymentId,
        })
        .returning('*');

      // Track boost activation in analytics
      await analyticsServiceClient.trackEvent({
        userId,
        eventType: 'boost_activated',
        eventData: {
          boostId: boost.id,
          duration,
          expiresAt: expiresAt.toISOString(),
        },
      });

      logger.info(`Boost activated for user ${userId}, expires at ${expiresAt}`);

      return this.mapToBoostRecord(boost);
    } catch (error) {
      logger.error('Failed to activate boost', error);
      throw error;
    }
  }

  /**
   * Get active boost for a user
   */
  async getActiveBoost(userId: string): Promise<BoostRecord | null> {
    try {
      const now = new Date();

      const boost = await this.db('boosts')
        .where({
          user_id: userId,
          active: true,
        })
        .where('expires_at', '>', now)
        .first();

      if (!boost) {
        return null;
      }

      return this.mapToBoostRecord(boost);
    } catch (error) {
      logger.error('Failed to get active boost', error);
      throw error;
    }
  }

  /**
   * Check if user has an active boost
   */
  async hasActiveBoost(userId: string): Promise<boolean> {
    const boost = await this.getActiveBoost(userId);
    return boost !== null;
  }

  /**
   * Get all boosted users for discovery
   * Used by recommendation service to prioritize boosted profiles
   */
  async getBoostedUsers(limit: number = 100): Promise<string[]> {
    try {
      const now = new Date();

      const boosts = await this.db('boosts')
        .where('active', true)
        .where('expires_at', '>', now)
        .orderBy('started_at', 'desc')
        .limit(limit)
        .select('user_id');

      return boosts.map((b: any) => b.user_id);
    } catch (error) {
      logger.error('Failed to get boosted users', error);
      throw error;
    }
  }

  /**
   * Deactivate expired boosts
   */
  async deactivateExpiredBoosts(): Promise<number> {
    try {
      const now = new Date();

      const count = await this.db('boosts')
        .where('active', true)
        .where('expires_at', '<=', now)
        .update({
          active: false,
          updated_at: now,
        });

      if (count > 0) {
        logger.info(`Deactivated ${count} expired boosts`);
      }

      return count;
    } catch (error) {
      logger.error('Failed to deactivate expired boosts', error);
      throw error;
    }
  }

  /**
   * Track boost impression
   */
  async trackImpression(userId: string): Promise<void> {
    try {
      const boost = await this.getActiveBoost(userId);

      if (!boost) {
        return;
      }

      await this.db('boosts')
        .where('id', boost.id)
        .increment('impressions', 1);

    } catch (error) {
      logger.error('Failed to track impression', error);
      // Don't throw - this is a tracking operation
    }
  }

  /**
   * Track profile view during boost
   */
  async trackProfileView(userId: string, viewerId: string): Promise<void> {
    try {
      const boost = await this.getActiveBoost(userId);

      if (!boost) {
        return;
      }

      await this.db('boosts')
        .where('id', boost.id)
        .increment('profile_views', 1);

      // Track in analytics
      await analyticsServiceClient.trackEvent({
        userId,
        eventType: 'boost_profile_view',
        eventData: {
          boostId: boost.id,
          viewerId,
        },
      });

    } catch (error) {
      logger.error('Failed to track profile view', error);
    }
  }

  /**
   * Track like received during boost
   */
  async trackLike(userId: string, likerId: string): Promise<void> {
    try {
      const boost = await this.getActiveBoost(userId);

      if (!boost) {
        return;
      }

      await this.db('boosts')
        .where('id', boost.id)
        .increment('likes', 1);

      // Track in analytics
      await analyticsServiceClient.trackEvent({
        userId,
        eventType: 'boost_like_received',
        eventData: {
          boostId: boost.id,
          likerId,
        },
      });

    } catch (error) {
      logger.error('Failed to track like', error);
    }
  }

  /**
   * Track match during boost
   */
  async trackMatch(userId: string, matchedUserId: string): Promise<void> {
    try {
      const boost = await this.getActiveBoost(userId);

      if (!boost) {
        return;
      }

      await this.db('boosts')
        .where('id', boost.id)
        .increment('matches', 1);

      // Track in analytics
      await analyticsServiceClient.trackEvent({
        userId,
        eventType: 'boost_match',
        eventData: {
          boostId: boost.id,
          matchedUserId,
        },
      });

    } catch (error) {
      logger.error('Failed to track match', error);
    }
  }

  /**
   * Get boost statistics for a user
   */
  async getBoostStats(userId: string): Promise<BoostStats> {
    try {
      const activeBoost = await this.getActiveBoost(userId);

      // Get all boosts for lifetime stats
      const allBoosts = await this.db('boosts')
        .where('user_id', userId)
        .select('*');

      const lifetimeStats = allBoosts.reduce(
        (acc, boost) => ({
          totalImpressions: acc.totalImpressions + (boost.impressions || 0),
          totalProfileViews: acc.totalProfileViews + (boost.profile_views || 0),
          totalLikes: acc.totalLikes + (boost.likes || 0),
          totalMatches: acc.totalMatches + (boost.matches || 0),
        }),
        {
          totalImpressions: 0,
          totalProfileViews: 0,
          totalLikes: 0,
          totalMatches: 0,
        }
      );

      const totalBoosts = allBoosts.length;
      const averagePerformance = {
        impressionsPerBoost: totalBoosts > 0 ? lifetimeStats.totalImpressions / totalBoosts : 0,
        viewsPerBoost: totalBoosts > 0 ? lifetimeStats.totalProfileViews / totalBoosts : 0,
        likesPerBoost: totalBoosts > 0 ? lifetimeStats.totalLikes / totalBoosts : 0,
        matchesPerBoost: totalBoosts > 0 ? lifetimeStats.totalMatches / totalBoosts : 0,
      };

      return {
        totalBoosts,
        activeBoost: activeBoost !== null,
        currentBoostExpiresAt: activeBoost?.expiresAt || null,
        lifetimeStats,
        averagePerformance,
      };
    } catch (error) {
      logger.error('Failed to get boost stats', error);
      throw error;
    }
  }

  /**
   * Get today's boost count for a user
   */
  async getTodayBoostCount(userId: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const count = await this.db('boosts')
        .where('user_id', userId)
        .where('started_at', '>=', today)
        .count('* as count')
        .first();

      return parseInt(count?.count as string || '0', 10);
    } catch (error) {
      logger.error('Failed to get today boost count', error);
      throw error;
    }
  }

  /**
   * Get boost history for a user
   */
  async getBoostHistory(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<BoostRecord[]> {
    try {
      const { limit = 20, offset = 0 } = options || {};

      const boosts = await this.db('boosts')
        .where('user_id', userId)
        .orderBy('started_at', 'desc')
        .limit(limit)
        .offset(offset);

      return boosts.map(this.mapToBoostRecord);
    } catch (error) {
      logger.error('Failed to get boost history', error);
      throw error;
    }
  }

  /**
   * Cancel active boost (admin only)
   */
  async cancelBoost(userId: string, reason?: string): Promise<boolean> {
    try {
      const boost = await this.getActiveBoost(userId);

      if (!boost) {
        return false;
      }

      const now = new Date();

      await this.db('boosts')
        .where('id', boost.id)
        .update({
          active: false,
          expires_at: now,
          updated_at: now,
        });

      logger.info(`Boost cancelled for user ${userId}`, { boostId: boost.id, reason });

      // Track cancellation
      await analyticsServiceClient.trackEvent({
        userId,
        eventType: 'boost_cancelled',
        eventData: {
          boostId: boost.id,
          reason,
        },
      });

      return true;
    } catch (error) {
      logger.error('Failed to cancel boost', error);
      throw error;
    }
  }

  /**
   * Get boost multiplier for a user (used in ranking algorithms)
   */
  async getBoostMultiplier(userId: string): Promise<number> {
    const hasBoost = await this.hasActiveBoost(userId);
    return hasBoost ? this.BOOST_MULTIPLIER : 1;
  }

  /**
   * Map database record to BoostRecord
   */
  private mapToBoostRecord(record: any): BoostRecord {
    return {
      id: record.id,
      userId: record.user_id,
      startedAt: new Date(record.started_at),
      expiresAt: new Date(record.expires_at),
      active: record.active,
      impressions: record.impressions || 0,
      profileViews: record.profile_views || 0,
      likes: record.likes || 0,
      matches: record.matches || 0,
    };
  }
}

export default new BoostService();
