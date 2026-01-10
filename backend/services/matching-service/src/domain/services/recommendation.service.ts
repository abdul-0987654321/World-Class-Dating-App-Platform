/**
 * Recommendation Service
 * Provides personalized user recommendations
 */

import { createLogger } from '@flamoral/backend-shared';
import axios from 'axios';

import { RecommendationRequest, UserProfile, UserPreferences, MatchScore } from '../../types';
import matchRepository from '../repositories/match.repository';
import swipeRepository from '../repositories/swipe.repository';

import matchingAlgorithm from './matching-algorithm.service';

const logger = createLogger('recommendation-service');

export class RecommendationService {
  private userServiceUrl: string;

  constructor() {
    this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
  }

  /**
   * Get personalized recommendations for a user
   */
  async getRecommendations(request: RecommendationRequest): Promise<MatchScore[]> {
    try {
      const { userId, limit = 20, offset = 0, filters } = request;

      logger.info(`Getting recommendations for user ${userId}`);

      // Get current user's profile and preferences
      const [currentUser, userPreferences] = await Promise.all([
        this.fetchUserProfile(userId),
        this.fetchUserPreferences(userId),
      ]);

      // Get already swiped user IDs to exclude them
      const swipedUserIds = await swipeRepository.getSwipedUserIds(userId);

      // Get matched user IDs to exclude them
      const matches = await matchRepository.findByUserId(userId);
      const matchedUserIds = matches.map((m) => m.getOtherUserId(userId));

      // Combine exclusions
      const excludedUserIds = [...swipedUserIds, ...matchedUserIds, userId];

      // Fetch candidate profiles from User Service
      const candidates = await this.fetchCandidateProfiles(
        currentUser,
        { ...userPreferences, ...filters },
        excludedUserIds
      );

      if (candidates.length === 0) {
        logger.info(`No candidates found for user ${userId}`);
        return [];
      }

      // Fetch preferences for all candidates
      const candidatePreferences = await this.fetchBatchPreferences(
        candidates.map((c) => c.userId)
      );

      // Calculate compatibility scores
      const scores = await matchingAlgorithm.calculateBatchScores(
        currentUser,
        candidates,
        userPreferences,
        candidatePreferences
      );

      // Filter by minimum score threshold
      const MIN_SCORE = 30;
      const filteredScores = scores.filter((s) => s.score >= MIN_SCORE);

      // Apply pagination
      const paginatedScores = filteredScores.slice(offset, offset + limit);

      logger.info(`Returning ${paginatedScores.length} recommendations for user ${userId}`);

      return paginatedScores;
    } catch (error) {
      logger.error('Failed to get recommendations', error);
      throw error;
    }
  }

  /**
   * Get top matches (premium feature)
   * Returns highest compatibility users
   */
  async getTopMatches(userId: string, limit: number = 10): Promise<MatchScore[]> {
    try {
      const recommendations = await this.getRecommendations({
        userId,
        limit: 100, // Get larger pool
      });

      // Return top N highest scores
      return recommendations.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get top matches', error);
      throw error;
    }
  }

  /**
   * Fetch user profile from User Service
   */
  private async fetchUserProfile(userId: string): Promise<UserProfile> {
    try {
      const response = await axios.get(`${this.userServiceUrl}/api/users/${userId}/profile`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch user profile for ${userId}`, error);
      throw new Error('Failed to fetch user profile');
    }
  }

  /**
   * Fetch user preferences
   */
  private async fetchUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const response = await axios.get(`${this.userServiceUrl}/api/users/${userId}/preferences`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch preferences for ${userId}`, error);
      // Return default preferences if not found
      return {
        ageMin: 18,
        ageMax: 99,
        maxDistance: 50,
        genderPreference: ['any'],
      };
    }
  }

  /**
   * Fetch candidate profiles matching preferences
   */
  private async fetchCandidateProfiles(
    currentUser: UserProfile,
    preferences: UserPreferences,
    excludedUserIds: string[]
  ): Promise<UserProfile[]> {
    try {
      const response = await axios.post(`${this.userServiceUrl}/api/users/search`, {
        ageMin: preferences.ageMin,
        ageMax: preferences.ageMax,
        genderPreference: preferences.genderPreference,
        maxDistance: preferences.maxDistance,
        location: currentUser.location,
        excludedUserIds,
        limit: 100,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch candidate profiles', error);
      // Return empty array if service unavailable
      return [];
    }
  }

  /**
   * Fetch preferences for multiple users
   */
  private async fetchBatchPreferences(userIds: string[]): Promise<Map<string, UserPreferences>> {
    try {
      const response = await axios.post(`${this.userServiceUrl}/api/users/preferences/batch`, {
        userIds,
      });

      return new Map(Object.entries(response.data));
    } catch (error) {
      logger.error('Failed to fetch batch preferences', error);
      return new Map();
    }
  }

  /**
   * Refresh recommendations (clear cache)
   */
  async refreshRecommendations(userId: string): Promise<void> {
    try {
      logger.info(`Refreshing recommendations for user ${userId}`);

      // Invalidate user's recommendation cache
      const cacheKeys = [
        `recommendations:${userId}`,
        `top_matches:${userId}`,
        `candidates:${userId}`,
      ];

      // Try Redis cache invalidation if available
      const redisUrl = process.env.REDIS_URL;
      if (redisUrl) {
        try {
          const Redis = require('ioredis');
          const redis = new Redis(redisUrl);

          await Promise.all(cacheKeys.map((key) => redis.del(key)));

          // Also invalidate any pattern-based keys
          const patternKeys = await redis.keys(`recommendations:${userId}:*`);
          if (patternKeys.length > 0) {
            await redis.del(...patternKeys);
          }

          await redis.quit();
          logger.info(`Cache invalidated for user ${userId}`, { keysCleared: cacheKeys.length });
        } catch (redisError) {
          logger.warn('Redis cache invalidation failed, continuing without cache', {
            error: redisError,
          });
        }
      } else {
        logger.info('No Redis configured, skipping cache invalidation');
      }
    } catch (error) {
      logger.error('Failed to refresh recommendations', error);
      throw error;
    }
  }
}

export default new RecommendationService();
