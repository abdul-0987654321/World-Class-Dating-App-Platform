/**
 * Rewind Service
 *
 * Handles the Swipe Rewind feature for Flamoral dating platform.
 * Allows users to undo their last swipe based on subscription tier limits.
 */

import { Knex } from 'knex';
import db from '../../infrastructure/database/connection';
import swipeHistoryRepository from '../repositories/swipe-history.repository';
import swipeRepository from '../repositories/swipe.repository';
import matchRepository from '../repositories/match.repository';
import { SwipeHistory } from '../entities/SwipeHistory.entity';
import { SwipeAction } from '../../types';
import { createLogger } from '@flamoral/backend-shared';
import userServiceClient from '../../infrastructure/clients/user-service.client';
import analyticsServiceClient from '../../infrastructure/clients/analytics-service.client';

const logger = createLogger('rewind-service');

/**
 * Subscription tier string values for rewind feature
 */
type SubscriptionTier = 'free' | 'basic' | 'plus' | 'premium' | 'premium_plus' | 'elite';

/**
 * Rewind limits by subscription tier
 * Free: 0 rewinds
 * Basic: 1 rewind/day
 * Plus: 3 rewinds/day
 * Premium: 5 rewinds/day
 * Premium+: Unlimited
 * Elite: Unlimited
 */
const REWIND_LIMITS: Record<SubscriptionTier, number> = {
  free: 0,
  basic: 1,
  plus: 3,
  premium: 5,
  premium_plus: -1, // -1 = unlimited
  elite: -1, // -1 = unlimited
};

/**
 * Rewind window in milliseconds (3 hours)
 * Swipes older than this cannot be rewound
 */
const REWIND_WINDOW_MS = 3 * 60 * 60 * 1000;

export interface RewindResult {
  success: boolean;
  rewoundSwipe?: SwipeHistory;
  targetProfile?: any;
  error?: string;
  errorCode?: string;
}

export interface RewindQuota {
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  isUnlimited: boolean;
  subscriptionTier: string;
  nextResetAt: Date;
}

export interface CanRewindResult {
  canRewind: boolean;
  reason?: string;
  quota?: RewindQuota;
  lastSwipe?: SwipeHistory;
}

export class RewindService {
  private db: Knex;

  constructor(database: Knex = db) {
    this.db = database;
  }

  /**
   * Get the most recent rewindable swipe for a user
   */
  async getLastSwipe(userId: string): Promise<SwipeHistory | null> {
    try {
      const lastSwipe = await swipeHistoryRepository.getLastRewindableSwipe(userId);

      if (!lastSwipe) {
        logger.debug(`No rewindable swipe found for user ${userId}`);
        return null;
      }

      // Check if within rewind window
      if (!lastSwipe.isWithinRewindWindow(REWIND_WINDOW_MS)) {
        logger.debug(`Last swipe for user ${userId} is outside rewind window`);
        return null;
      }

      return lastSwipe;
    } catch (error) {
      logger.error('Failed to get last swipe', error);
      throw error;
    }
  }

  /**
   * Get user's subscription tier
   */
  private async getUserSubscriptionTier(userId: string): Promise<SubscriptionTier> {
    try {
      const tier = await userServiceClient.getUserSubscriptionTier(userId);
      return (tier as SubscriptionTier) || 'free';
    } catch (error) {
      logger.warn(`Failed to get subscription tier for user ${userId}, defaulting to free`);
      return 'free';
    }
  }

  /**
   * Get rewind quota for a user
   */
  async getRewindQuota(userId: string): Promise<RewindQuota> {
    try {
      const subscriptionTier = await this.getUserSubscriptionTier(userId);
      const dailyLimit = REWIND_LIMITS[subscriptionTier] ?? 0;
      const isUnlimited = dailyLimit === -1;

      const usedToday = await swipeHistoryRepository.getTodayRewindCount(userId);
      const remainingToday = isUnlimited ? -1 : Math.max(0, dailyLimit - usedToday);

      // Calculate next reset time (midnight UTC)
      const now = new Date();
      const nextReset = new Date(now);
      nextReset.setUTCHours(24, 0, 0, 0);

      return {
        dailyLimit,
        usedToday,
        remainingToday,
        isUnlimited,
        subscriptionTier,
        nextResetAt: nextReset,
      };
    } catch (error) {
      logger.error('Failed to get rewind quota', error);
      throw error;
    }
  }

  /**
   * Check if a user can rewind based on subscription tier and usage
   */
  async canRewind(userId: string, subscriptionTier?: SubscriptionTier): Promise<CanRewindResult> {
    try {
      // Get subscription tier if not provided
      const tier = subscriptionTier || await this.getUserSubscriptionTier(userId);
      const limit = REWIND_LIMITS[tier] ?? 0;

      // Check if tier allows rewinds
      if (limit === 0) {
        return {
          canRewind: false,
          reason: 'Your subscription tier does not include rewind. Upgrade to unlock this feature.',
        };
      }

      // Get last rewindable swipe
      const lastSwipe = await this.getLastSwipe(userId);

      if (!lastSwipe) {
        return {
          canRewind: false,
          reason: 'No recent swipe to rewind. Swipes can only be rewound within 3 hours.',
        };
      }

      // Check if unlimited
      if (limit === -1) {
        const quota = await this.getRewindQuota(userId);
        return {
          canRewind: true,
          quota,
          lastSwipe,
        };
      }

      // Check daily usage
      const usedToday = await swipeHistoryRepository.getTodayRewindCount(userId);

      if (usedToday >= limit) {
        const quota = await this.getRewindQuota(userId);
        return {
          canRewind: false,
          reason: `You've used all ${limit} rewinds for today. Try again tomorrow or upgrade for more rewinds.`,
          quota,
        };
      }

      const quota = await this.getRewindQuota(userId);
      return {
        canRewind: true,
        quota,
        lastSwipe,
      };
    } catch (error) {
      logger.error('Failed to check if user can rewind', error);
      throw error;
    }
  }

  /**
   * Perform a rewind - undo the last swipe
   */
  async rewind(userId: string, subscriptionTier?: SubscriptionTier): Promise<RewindResult> {
    try {
      logger.info(`Rewind requested for user ${userId}`);

      // Check if user can rewind
      const canRewindResult = await this.canRewind(userId, subscriptionTier);

      if (!canRewindResult.canRewind) {
        return {
          success: false,
          error: canRewindResult.reason,
          errorCode: 'REWIND_NOT_ALLOWED',
        };
      }

      const lastSwipe = canRewindResult.lastSwipe!;

      // Start a transaction for atomicity
      const result = await this.db.transaction(async (trx) => {
        // 1. Mark the swipe history as rewound
        await trx('swipe_history')
          .where({ id: lastSwipe.id })
          .update({
            rewound: true,
            rewound_at: new Date(),
          });

        // 2. Delete the original swipe from swipes table
        if (lastSwipe.originalSwipeId) {
          await trx('swipes')
            .where({ id: lastSwipe.originalSwipeId })
            .delete();
        } else {
          // Fallback: delete by user and target
          await trx('swipes')
            .where({
              user_id: userId,
              target_user_id: lastSwipe.targetUserId,
            })
            .delete();
        }

        // 3. If there was a match, delete it
        if (lastSwipe.resultedInMatch && lastSwipe.matchId) {
          await trx('matches')
            .where({ id: lastSwipe.matchId })
            .delete();

          logger.info(`Deleted match ${lastSwipe.matchId} as part of rewind`);
        }

        // 4. If it was a super like, we need to refund it
        // This would typically involve calling payment-service
        if (lastSwipe.isSuperLike()) {
          logger.info(`Super like rewound for user ${userId}, refund may be needed`);
          // In production: await paymentServiceClient.refundSuperLike(userId, lastSwipe.id);
        }

        // 5. Record the rewind usage
        const tier = subscriptionTier || await this.getUserSubscriptionTier(userId);
        await trx('rewind_usage').insert({
          user_id: userId,
          swipe_history_id: lastSwipe.id,
          subscription_tier: tier,
          usage_date: new Date().toISOString().split('T')[0],
        });

        return lastSwipe;
      });

      // Track analytics (outside transaction)
      await analyticsServiceClient.trackEvent({
        eventType: 'engagement',
        eventName: 'swipe_rewind',
        userId,
        targetUserId: lastSwipe.targetUserId,
        previousAction: lastSwipe.action,
        hadMatch: lastSwipe.resultedInMatch,
      });

      logger.info(`Rewind successful for user ${userId}, rewound swipe on ${lastSwipe.targetUserId}`);

      // Get target user profile for response
      let targetProfile = null;
      try {
        targetProfile = await userServiceClient.getUserProfile(lastSwipe.targetUserId);
      } catch (e) {
        logger.warn(`Could not fetch profile for rewound target ${lastSwipe.targetUserId}`);
      }

      return {
        success: true,
        rewoundSwipe: lastSwipe,
        targetProfile,
      };
    } catch (error) {
      logger.error('Failed to perform rewind', error);
      throw error;
    }
  }

  /**
   * Get rewind count for a specific period
   */
  async getRewindCount(
    userId: string,
    period: 'day' | 'week' | 'month'
  ): Promise<{ count: number; period: string; startDate: Date; endDate: Date }> {
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'day':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
      }

      const count = await swipeHistoryRepository.getRewindCountForPeriod(
        userId,
        startDate,
        now
      );

      return {
        count,
        period,
        startDate,
        endDate: now,
      };
    } catch (error) {
      logger.error('Failed to get rewind count', error);
      throw error;
    }
  }

  /**
   * Get rewind history for a user
   */
  async getRewindHistory(
    userId: string,
    options?: { limit?: number; offset?: number }
  ) {
    try {
      return await swipeHistoryRepository.getRewindHistory(userId, options);
    } catch (error) {
      logger.error('Failed to get rewind history', error);
      throw error;
    }
  }

  /**
   * Get recent rewindable swipes for a user
   * Useful for showing what can be rewound
   */
  async getRewindableSwipes(userId: string, limit: number = 5): Promise<SwipeHistory[]> {
    try {
      const swipes = await swipeHistoryRepository.getRewindableSwipes(userId, limit);

      // Filter to only include swipes within the rewind window
      return swipes.filter(swipe => swipe.isWithinRewindWindow(REWIND_WINDOW_MS));
    } catch (error) {
      logger.error('Failed to get rewindable swipes', error);
      throw error;
    }
  }

  /**
   * Record a swipe in history (called by SwipeService)
   */
  async recordSwipeHistory(data: {
    userId: string;
    targetUserId: string;
    action: SwipeAction;
    originalSwipeId: string;
    resultedInMatch?: boolean;
    matchId?: string;
  }): Promise<SwipeHistory> {
    try {
      return await swipeHistoryRepository.create(data);
    } catch (error) {
      logger.error('Failed to record swipe history', error);
      throw error;
    }
  }

  /**
   * Update swipe history when a match is created
   */
  async updateSwipeHistoryWithMatch(
    userId: string,
    targetUserId: string,
    matchId: string
  ): Promise<void> {
    try {
      await swipeHistoryRepository.updateWithMatchInfo(userId, targetUserId, matchId);
    } catch (error) {
      logger.error('Failed to update swipe history with match', error);
      // Non-critical, don't throw
    }
  }
}

export default new RewindService();
