/**
 * Matching Cache Service
 * Provides caching layer for matching and recommendation operations
 */

import redisClient from './redis.client';
import { MatchScore, UserProfile, UserPreferences } from '../../types';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('matching-cache');

class MatchingCacheService {
  // Cache TTL values (in seconds)
  private readonly RECOMMENDATIONS_TTL = 300; // 5 minutes
  private readonly USER_PROFILE_TTL = 600; // 10 minutes
  private readonly USER_PREFERENCES_TTL = 600; // 10 minutes
  private readonly MATCH_SCORES_TTL = 300; // 5 minutes
  private readonly SWIPED_USERS_TTL = 3600; // 1 hour

  /**
   * Get cached recommendations for a user
   */
  async getRecommendations(userId: string): Promise<MatchScore[] | null> {
    try {
      const key = this.getRecommendationsKey(userId);
      return await redisClient.get<MatchScore[]>(key);
    } catch (error) {
      logger.error('Failed to get cached recommendations', error);
      return null;
    }
  }

  /**
   * Cache recommendations for a user
   */
  async setRecommendations(userId: string, recommendations: MatchScore[]): Promise<void> {
    try {
      const key = this.getRecommendationsKey(userId);
      await redisClient.set(key, recommendations, this.RECOMMENDATIONS_TTL);
      logger.debug(`Cached ${recommendations.length} recommendations for user ${userId}`);
    } catch (error) {
      logger.error('Failed to cache recommendations', error);
    }
  }

  /**
   * Invalidate recommendations cache for a user
   */
  async invalidateRecommendations(userId: string): Promise<void> {
    try {
      const key = this.getRecommendationsKey(userId);
      await redisClient.del(key);
      logger.debug(`Invalidated recommendations cache for user ${userId}`);
    } catch (error) {
      logger.error('Failed to invalidate recommendations cache', error);
    }
  }

  /**
   * Get cached user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const key = this.getUserProfileKey(userId);
      return await redisClient.get<UserProfile>(key);
    } catch (error) {
      logger.error('Failed to get cached user profile', error);
      return null;
    }
  }

  /**
   * Cache user profile
   */
  async setUserProfile(userId: string, profile: UserProfile): Promise<void> {
    try {
      const key = this.getUserProfileKey(userId);
      await redisClient.set(key, profile, this.USER_PROFILE_TTL);
    } catch (error) {
      logger.error('Failed to cache user profile', error);
    }
  }

  /**
   * Get cached user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const key = this.getUserPreferencesKey(userId);
      return await redisClient.get<UserPreferences>(key);
    } catch (error) {
      logger.error('Failed to get cached user preferences', error);
      return null;
    }
  }

  /**
   * Cache user preferences
   */
  async setUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    try {
      const key = this.getUserPreferencesKey(userId);
      await redisClient.set(key, preferences, this.USER_PREFERENCES_TTL);
    } catch (error) {
      logger.error('Failed to cache user preferences', error);
    }
  }

  /**
   * Get cached swiped user IDs
   */
  async getSwipedUserIds(userId: string): Promise<string[] | null> {
    try {
      const key = this.getSwipedUsersKey(userId);
      return await redisClient.get<string[]>(key);
    } catch (error) {
      logger.error('Failed to get cached swiped users', error);
      return null;
    }
  }

  /**
   * Cache swiped user IDs
   */
  async setSwipedUserIds(userId: string, swipedUserIds: string[]): Promise<void> {
    try {
      const key = this.getSwipedUsersKey(userId);
      await redisClient.set(key, swipedUserIds, this.SWIPED_USERS_TTL);
    } catch (error) {
      logger.error('Failed to cache swiped users', error);
    }
  }

  /**
   * Add a swiped user to cache
   */
  async addSwipedUser(userId: string, targetUserId: string): Promise<void> {
    try {
      const key = this.getSwipedUsersKey(userId);
      const swipedUsers = await redisClient.get<string[]>(key) || [];

      if (!swipedUsers.includes(targetUserId)) {
        swipedUsers.push(targetUserId);
        await redisClient.set(key, swipedUsers, this.SWIPED_USERS_TTL);
      }
    } catch (error) {
      logger.error('Failed to add swiped user to cache', error);
    }
  }

  /**
   * Invalidate all caches for a user (on profile update, preference change, etc.)
   */
  async invalidateUserCaches(userId: string): Promise<void> {
    try {
      await Promise.all([
        redisClient.del(this.getRecommendationsKey(userId)),
        redisClient.del(this.getUserProfileKey(userId)),
        redisClient.del(this.getUserPreferencesKey(userId)),
        redisClient.del(this.getSwipedUsersKey(userId)),
      ]);
      logger.info(`Invalidated all caches for user ${userId}`);
    } catch (error) {
      logger.error('Failed to invalidate user caches', error);
    }
  }

  /**
   * Invalidate caches after a swipe (affects recommendations)
   */
  async invalidateAfterSwipe(userId: string, targetUserId: string): Promise<void> {
    try {
      // Invalidate recommendations for the swiper
      await this.invalidateRecommendations(userId);

      // Add to swiped users cache
      await this.addSwipedUser(userId, targetUserId);

      logger.debug(`Invalidated caches after swipe: ${userId} -> ${targetUserId}`);
    } catch (error) {
      logger.error('Failed to invalidate caches after swipe', error);
    }
  }

  /**
   * Invalidate caches after a match
   */
  async invalidateAfterMatch(user1Id: string, user2Id: string): Promise<void> {
    try {
      // Invalidate recommendations for both users
      await Promise.all([
        this.invalidateRecommendations(user1Id),
        this.invalidateRecommendations(user2Id),
      ]);

      logger.debug(`Invalidated caches after match: ${user1Id} <-> ${user2Id}`);
    } catch (error) {
      logger.error('Failed to invalidate caches after match', error);
    }
  }

  /**
   * Cache key generators
   */
  private getRecommendationsKey(userId: string): string {
    return `matching:recommendations:${userId}`;
  }

  private getUserProfileKey(userId: string): string {
    return `matching:profile:${userId}`;
  }

  private getUserPreferencesKey(userId: string): string {
    return `matching:preferences:${userId}`;
  }

  private getSwipedUsersKey(userId: string): string {
    return `matching:swiped:${userId}`;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    try {
      if (!redisClient.isReady()) {
        return {
          status: 'disconnected',
          message: 'Redis client not connected',
        };
      }

      return {
        status: 'connected',
        message: 'Cache is operational',
      };
    } catch (error) {
      logger.error('Failed to get cache stats', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default new MatchingCacheService();
