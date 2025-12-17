/**
 * Recommendation Service
 * Provides personalized user recommendations
 */

import swipeRepository from '../repositories/swipe.repository';
import matchRepository from '../repositories/match.repository';
import matchingAlgorithm from './matching-algorithm.service';
import matchingCache from '../../infrastructure/cache/matching-cache.service';
import { RecommendationRequest, UserProfile, UserPreferences, MatchScore } from '../../types';
import { createLogger } from '@flamoral/shared';
import axios from 'axios';

const logger = createLogger('recommendation-service');

export class RecommendationService {
  private userServiceUrl: string;

  constructor() {
    this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3002';
  }

  /**
   * Get personalized recommendations for a user
   */
  async getRecommendations(request: RecommendationRequest): Promise<MatchScore[]> {
    try {
      // Validate input
      if (!request || !request.userId) {
        throw new Error('Invalid request: userId is required');
      }

      const { userId, limit = 20, offset = 0, filters } = request;

      // Validate pagination parameters
      if (limit < 1 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }

      if (offset < 0) {
        throw new Error('Offset must be non-negative');
      }

      logger.info(`Getting recommendations for user ${userId} (limit: ${limit}, offset: ${offset})`);

      // Check cache first (only if no filters and offset is 0)
      if (!filters && offset === 0) {
        try {
          const cachedRecommendations = await matchingCache.getRecommendations(userId);
          if (cachedRecommendations && Array.isArray(cachedRecommendations) && cachedRecommendations.length > 0) {
            logger.info(`Returning ${Math.min(cachedRecommendations.length, limit)} cached recommendations for user ${userId}`);
            return cachedRecommendations.slice(0, limit);
          }
        } catch (cacheError) {
          logger.warn('Cache retrieval failed, continuing without cache', cacheError);
        }
      }

      // Get current user's profile and preferences
      const [currentUser, userPreferences] = await Promise.all([
        this.fetchUserProfile(userId),
        this.fetchUserPreferences(userId),
      ]);

      // Validate user data
      if (!currentUser || !currentUser.userId) {
        throw new Error('Failed to fetch valid user profile');
      }

      // Get already swiped user IDs to exclude them (with caching)
      let swipedUserIds: string[] = [];
      try {
        const cached = await matchingCache.getSwipedUserIds(userId);
        if (cached && Array.isArray(cached)) {
          swipedUserIds = cached;
        } else {
          swipedUserIds = await swipeRepository.getSwipedUserIds(userId);
          await matchingCache.setSwipedUserIds(userId, swipedUserIds);
        }
      } catch (error) {
        logger.warn('Failed to fetch swiped user IDs from cache, fetching from database', error);
        swipedUserIds = await swipeRepository.getSwipedUserIds(userId);
      }

      // Get matched user IDs to exclude them
      const matches = await matchRepository.findByUserId(userId);
      const matchedUserIds = Array.isArray(matches) ? matches.map((m) => m.getOtherUserId(userId)) : [];

      // Combine exclusions and ensure uniqueness
      const excludedUserIds = [...new Set([...swipedUserIds, ...matchedUserIds, userId])];

      // Fetch candidate profiles from User Service
      const candidates = await this.fetchCandidateProfiles(
        currentUser,
        { ...userPreferences, ...filters },
        excludedUserIds
      );

      if (!Array.isArray(candidates) || candidates.length === 0) {
        logger.info(`No candidates found for user ${userId}`);
        return [];
      }

      // Fetch preferences for all candidates
      const candidatePreferences = await this.fetchBatchPreferences(
        candidates.map((c) => c.userId).filter(Boolean)
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
      const filteredScores = Array.isArray(scores)
        ? scores.filter((s) => s && typeof s.score === 'number' && s.score >= MIN_SCORE)
        : [];

      // Cache the full result set (if no filters and we have results)
      if (!filters && filteredScores.length > 0) {
        try {
          await matchingCache.setRecommendations(userId, filteredScores);
        } catch (cacheError) {
          logger.warn('Failed to cache recommendations', cacheError);
        }
      }

      // Apply pagination
      const paginatedScores = filteredScores.slice(offset, offset + limit);

      logger.info(`Returning ${paginatedScores.length} recommendations for user ${userId} (total: ${filteredScores.length})`);

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
      await matchingCache.invalidateRecommendations(userId);
    } catch (error) {
      logger.error('Failed to refresh recommendations', error);
      throw error;
    }
  }
}

export default new RecommendationService();
