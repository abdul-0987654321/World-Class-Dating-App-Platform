/**
 * Discovery Service
 * Handles discovery feed, likes, passes, and super-likes with tier enforcement
 */

import swipeRepository from '../repositories/swipe.repository';
import matchRepository from '../repositories/match.repository';
import swipeService from './swipe.service';
import recommendationService from './recommendation.service';
import { SwipeAction, UserProfile, MatchScore } from '../../types';
import { createLogger } from '@flamoral/shared';
import axios from 'axios';

const logger = createLogger('discovery-service');

// Daily like caps by subscription tier
const DAILY_LIKE_CAPS = {
  free: 50,
  plus: 100,
  premium: Infinity, // Unlimited
};

// Super-like daily caps by tier
const DAILY_SUPERLIKE_CAPS = {
  free: 0, // Not available for free tier
  plus: 5,
  premium: 10,
};

interface DiscoveryFeedRequest {
  userId: string;
  limit: number;
  cursor?: string;
}

interface DiscoveryCandidate {
  user_id: string;
  profile_preview: {
    display_name: string;
    age: number;
    city?: string;
    photos: string[];
  };
  reasons: string[];
}

interface DiscoveryFeedResult {
  items: DiscoveryCandidate[];
  next_cursor: string | null;
  candidatesExist: boolean;
  emptyReason?: string;
}

interface LikeRequest {
  userId: string;
  targetUserId: string;
}

interface LikeResult {
  success: boolean;
  matchCreated: boolean;
  match?: any;
  error?: string;
  code?: string;
  requiredPlan?: string;
  currentPlan?: string;
}

interface SuperLikeRequest {
  userId: string;
  targetUserId: string;
  message?: string;
}

interface DiscoveryStats {
  remainingLikes: number;
  remainingSuperLikes: number;
  dailyLikeLimit: number;
  dailySuperLikeLimit: number;
  likesUsedToday: number;
  superLikesUsedToday: number;
  resetsAt: string;
  tier: string;
}

export class DiscoveryService {
  private userServiceUrl: string;
  private auditServiceUrl: string;
  private paymentServiceUrl: string;

  constructor() {
    this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
    this.auditServiceUrl = process.env.AUDIT_SERVICE_URL || 'http://localhost:3009';
    this.paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005';
  }

  /**
   * Get discovery feed candidates
   * CRITICAL INVARIANT: Feed MUST NOT return empty when eligible users exist
   */
  async getDiscoveryFeed(request: DiscoveryFeedRequest): Promise<DiscoveryFeedResult> {
    const { userId, limit, cursor } = request;

    try {
      logger.info(`Getting discovery feed for user ${userId}`);

      // Get user preferences
      const userPreferences = await this.fetchUserPreferences(userId);

      // Get already swiped user IDs to exclude
      const swipedUserIds = await swipeRepository.getSwipedUserIds(userId);

      // Get matched user IDs to exclude
      const matches = await matchRepository.findByUserId(userId);
      const matchedUserIds = matches.map((m) => m.getOtherUserId(userId));

      // Combine exclusions
      const excludedUserIds = [...new Set([...swipedUserIds, ...matchedUserIds, userId])];

      // Calculate offset from cursor
      const offset = cursor ? parseInt(Buffer.from(cursor, 'base64').toString(), 10) : 0;

      // Fetch candidates from user service
      const candidates = await this.fetchCandidates(userId, userPreferences, excludedUserIds, limit + 1, offset);

      // Check if there are more candidates (for pagination)
      const hasMore = candidates.length > limit;
      const items = candidates.slice(0, limit);

      // Transform to API response format
      const feedItems: DiscoveryCandidate[] = items.map((candidate) => ({
        user_id: candidate.userId,
        profile_preview: {
          display_name: candidate.displayName || candidate.name || 'User',
          age: candidate.age || 0,
          city: candidate.city,
          photos: candidate.photos || [],
        },
        reasons: this.generateMatchReasons(candidate),
      }));

      // Calculate next cursor
      const nextOffset = offset + items.length;
      const next_cursor = hasMore ? Buffer.from(nextOffset.toString()).toString('base64') : null;

      // Verify candidates exist if returning empty (critical invariant)
      let candidatesExist = false;
      let emptyReason: string | undefined;

      if (feedItems.length === 0) {
        // Check if there are any users in the system that could potentially match
        const totalCandidatesCheck = await this.checkCandidatesExist(userId, userPreferences);
        candidatesExist = totalCandidatesCheck.exist;

        if (!candidatesExist) {
          emptyReason = 'No users match your preferences in your area';
        } else if (excludedUserIds.length > 10) {
          emptyReason = 'You have swiped on all available users. Check back later for new matches!';
        } else {
          emptyReason = 'No new candidates available. Try expanding your preferences.';
        }

        logger.info(`Empty feed for user ${userId}: ${emptyReason}`, {
          candidatesExist,
          swipedCount: swipedUserIds.length,
          matchedCount: matchedUserIds.length,
        });
      }

      return {
        items: feedItems,
        next_cursor,
        candidatesExist,
        emptyReason,
      };
    } catch (error) {
      logger.error('Failed to get discovery feed', error);
      throw error;
    }
  }

  /**
   * Process a like action
   * Enforces daily like caps server-side
   */
  async processLike(request: LikeRequest): Promise<LikeResult> {
    const { userId, targetUserId } = request;

    try {
      // Get user's subscription tier
      const tier = await this.getUserTier(userId);
      const dailyCap = DAILY_LIKE_CAPS[tier as keyof typeof DAILY_LIKE_CAPS] || DAILY_LIKE_CAPS.free;

      // Check daily limit
      const todayLikeCount = await this.getTodayLikeCount(userId);

      if (todayLikeCount >= dailyCap) {
        logger.info(`User ${userId} has exceeded daily like limit (${dailyCap})`, { tier, todayLikeCount });

        // Create audit record for rate limit
        await this.createAuditRecord({
          userId,
          eventType: 'discovery.like.rate_limited',
          targetUserId,
          metadata: { tier, limit: dailyCap, used: todayLikeCount },
        });

        return {
          success: false,
          matchCreated: false,
          error: `Daily like limit exceeded. ${tier === 'free' ? 'Upgrade to Plus for 100 likes/day or Premium for unlimited.' : 'Upgrade to Premium for unlimited likes.'}`,
          code: 'DAILY_LIMIT_EXCEEDED',
          requiredPlan: tier === 'free' ? 'plus' : 'premium',
          currentPlan: tier,
        };
      }

      // Process the like via swipe service
      const result = await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });

      // Create audit record for the like
      await this.createAuditRecord({
        userId,
        eventType: 'discovery.like',
        targetUserId,
        metadata: {
          matched: result.matched,
          matchId: result.match?.id,
        },
      });

      return {
        success: true,
        matchCreated: result.matched,
        match: result.match,
      };
    } catch (error) {
      logger.error('Failed to process like', error);
      throw error;
    }
  }

  /**
   * Process a pass action
   */
  async processPass(request: LikeRequest): Promise<void> {
    const { userId, targetUserId } = request;

    try {
      // Process the pass via swipe service
      await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.PASS,
      });

      // Create audit record for the pass
      await this.createAuditRecord({
        userId,
        eventType: 'discovery.pass',
        targetUserId,
        metadata: {},
      });
    } catch (error) {
      logger.error('Failed to process pass', error);
      throw error;
    }
  }

  /**
   * Process a super-like action
   * Tier enforced - Plus/Premium only
   */
  async processSuperLike(request: SuperLikeRequest): Promise<LikeResult> {
    const { userId, targetUserId, message } = request;

    try {
      // Get user's subscription tier
      const tier = await this.getUserTier(userId);

      // Check if tier allows super-likes
      if (tier === 'free') {
        logger.info(`User ${userId} attempted super-like on free tier`);

        await this.createAuditRecord({
          userId,
          eventType: 'discovery.super_like.tier_blocked',
          targetUserId,
          metadata: { tier },
        });

        return {
          success: false,
          matchCreated: false,
          error: 'Super-likes require Plus or Premium subscription',
          code: 'TIER_NOT_SUFFICIENT',
          requiredPlan: 'plus',
          currentPlan: tier,
        };
      }

      // Check daily super-like limit
      const dailyCap = DAILY_SUPERLIKE_CAPS[tier as keyof typeof DAILY_SUPERLIKE_CAPS] || 0;
      const todaySuperLikeCount = await this.getTodaySuperLikeCount(userId);

      if (todaySuperLikeCount >= dailyCap) {
        logger.info(`User ${userId} has exceeded daily super-like limit (${dailyCap})`, { tier, todaySuperLikeCount });

        await this.createAuditRecord({
          userId,
          eventType: 'discovery.super_like.rate_limited',
          targetUserId,
          metadata: { tier, limit: dailyCap, used: todaySuperLikeCount },
        });

        return {
          success: false,
          matchCreated: false,
          error: `Daily super-like limit exceeded. ${tier === 'plus' ? 'Upgrade to Premium for more super-likes.' : 'You have used all your super-likes for today.'}`,
          code: 'DAILY_LIMIT_EXCEEDED',
          requiredPlan: tier === 'plus' ? 'premium' : tier,
          currentPlan: tier,
        };
      }

      // Process the super-like via swipe service
      const result = await swipeService.processSwipe({
        userId,
        targetUserId,
        action: SwipeAction.SUPER_LIKE,
      });

      // Create audit record for the super-like
      await this.createAuditRecord({
        userId,
        eventType: 'discovery.super_like',
        targetUserId,
        metadata: {
          matched: result.matched,
          matchId: result.match?.id,
          message: message ? '[message attached]' : null,
        },
      });

      return {
        success: true,
        matchCreated: result.matched,
        match: result.match,
      };
    } catch (error) {
      logger.error('Failed to process super-like', error);
      throw error;
    }
  }

  /**
   * Get discovery stats for a user
   */
  async getDiscoveryStats(userId: string): Promise<DiscoveryStats> {
    try {
      const tier = await this.getUserTier(userId);
      const dailyLikeLimit = DAILY_LIKE_CAPS[tier as keyof typeof DAILY_LIKE_CAPS] || DAILY_LIKE_CAPS.free;
      const dailySuperLikeLimit = DAILY_SUPERLIKE_CAPS[tier as keyof typeof DAILY_SUPERLIKE_CAPS] || 0;

      const likesUsedToday = await this.getTodayLikeCount(userId);
      const superLikesUsedToday = await this.getTodaySuperLikeCount(userId);

      // Calculate reset time (midnight UTC)
      const now = new Date();
      const resetTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));

      return {
        remainingLikes: Math.max(0, dailyLikeLimit === Infinity ? Infinity : dailyLikeLimit - likesUsedToday),
        remainingSuperLikes: Math.max(0, dailySuperLikeLimit - superLikesUsedToday),
        dailyLikeLimit: dailyLikeLimit === Infinity ? -1 : dailyLikeLimit, // -1 indicates unlimited
        dailySuperLikeLimit,
        likesUsedToday,
        superLikesUsedToday,
        resetsAt: resetTime.toISOString(),
        tier,
      };
    } catch (error) {
      logger.error('Failed to get discovery stats', error);
      throw error;
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Get user's subscription tier
   */
  private async getUserTier(userId: string): Promise<string> {
    try {
      const response = await axios.get(`${this.paymentServiceUrl}/api/subscriptions/user/${userId}/tier`, {
        timeout: 5000,
      });
      return response.data?.tier || 'free';
    } catch (error) {
      logger.warn(`Failed to get user tier for ${userId}, defaulting to free`, error);
      return 'free';
    }
  }

  /**
   * Get today's like count for a user
   */
  private async getTodayLikeCount(userId: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Query from swipe repository for today's likes
      const swipes = await swipeRepository.findBySwiperId(userId, { direction: 'like' });
      const todaySwipes = swipes.filter((s) => s.createdAt >= today);
      return todaySwipes.length;
    } catch (error) {
      logger.error('Failed to get today like count', error);
      return 0;
    }
  }

  /**
   * Get today's super-like count for a user
   */
  private async getTodaySuperLikeCount(userId: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const swipes = await swipeRepository.findBySwiperId(userId, { direction: 'super_like' });
      const todaySwipes = swipes.filter((s) => s.createdAt >= today);
      return todaySwipes.length;
    } catch (error) {
      logger.error('Failed to get today super-like count', error);
      return 0;
    }
  }

  /**
   * Fetch user preferences from user service
   */
  private async fetchUserPreferences(userId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.userServiceUrl}/api/users/${userId}/preferences`, {
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      logger.warn(`Failed to fetch preferences for ${userId}, using defaults`);
      return {
        ageMin: 18,
        ageMax: 99,
        maxDistance: 50,
        genderPreference: ['any'],
      };
    }
  }

  /**
   * Fetch candidate profiles from user service
   */
  private async fetchCandidates(
    userId: string,
    preferences: any,
    excludedUserIds: string[],
    limit: number,
    offset: number
  ): Promise<any[]> {
    try {
      const response = await axios.post(`${this.userServiceUrl}/api/users/search`, {
        ageMin: preferences.ageMin,
        ageMax: preferences.ageMax,
        genderPreference: preferences.genderPreference,
        maxDistance: preferences.maxDistance,
        excludedUserIds,
        limit,
        offset,
      }, {
        timeout: 10000,
      });
      return response.data || [];
    } catch (error) {
      logger.error('Failed to fetch candidates', error);
      return [];
    }
  }

  /**
   * Check if any candidates exist for the user's preferences
   */
  private async checkCandidatesExist(userId: string, preferences: any): Promise<{ exist: boolean; count?: number }> {
    try {
      const response = await axios.post(`${this.userServiceUrl}/api/users/search/count`, {
        ageMin: preferences.ageMin,
        ageMax: preferences.ageMax,
        genderPreference: preferences.genderPreference,
        maxDistance: preferences.maxDistance,
        excludedUserIds: [userId],
      }, {
        timeout: 5000,
      });
      return { exist: response.data?.count > 0, count: response.data?.count };
    } catch (error) {
      logger.warn('Failed to check if candidates exist', error);
      return { exist: true }; // Assume exist to avoid false negatives
    }
  }

  /**
   * Generate match reasons for a candidate
   */
  private generateMatchReasons(candidate: any): string[] {
    const reasons: string[] = [];

    if (candidate.commonInterests?.length > 0) {
      reasons.push(`${candidate.commonInterests.length} shared interests`);
    }

    if (candidate.distance && candidate.distance < 10) {
      reasons.push('Lives nearby');
    }

    if (candidate.verified) {
      reasons.push('Verified profile');
    }

    if (candidate.compatibilityScore && candidate.compatibilityScore > 80) {
      reasons.push('High compatibility');
    }

    return reasons;
  }

  /**
   * Create an audit record for discovery events
   */
  private async createAuditRecord(params: {
    userId: string;
    eventType: string;
    targetUserId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await axios.post(`${this.auditServiceUrl}/api/v1/audit/events`, {
        event_type: params.eventType,
        actor_user_id: params.userId,
        subject_user_id: params.targetUserId,
        metadata: params.metadata,
        created_at: new Date().toISOString(),
        correlation_id: `discovery-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }, {
        timeout: 3000,
      });
    } catch (error) {
      // Don't fail the operation if audit fails, just log
      logger.warn('Failed to create audit record', { eventType: params.eventType, error });
    }
  }
}

export default new DiscoveryService();
