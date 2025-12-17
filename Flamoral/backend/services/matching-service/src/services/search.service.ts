/**
 * Advanced Search Service
 * Handles complex filtering and search operations with relevance scoring
 */

import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import redisClient from '../infrastructure/cache/redis.client';

interface SearchFilters {
  minAge?: number;
  maxAge?: number;
  maxDistance?: number;
  minHeight?: number;
  maxHeight?: number;
  education?: string[];
  occupation?: string[];
  religion?: string[];
  interests?: string[];
  relationshipGoals?: string[];
  dealbreakers?: {
    noSmokers?: boolean;
    noDrinkers?: boolean;
    noChildren?: boolean;
    noPets?: boolean;
  };
  verifiedOnly?: boolean;
  sortBy?: 'relevance' | 'distance' | 'activity' | 'newest';
  limit?: number;
  offset?: number;
}

interface RelevanceScore {
  userId: string;
  score: number;
  breakdown: {
    interestMatch: number;
    profileComplete: number;
    activityRecent: number;
    verificationBonus: number;
  };
}

export class SearchService {
  /**
   * Validate search filters
   */
  validateFilters(filters: SearchFilters): { valid: boolean; error?: string } {
    // Age validation
    if (filters.minAge && (filters.minAge < 18 || filters.minAge > 100)) {
      return { valid: false, error: 'Minimum age must be between 18 and 100' };
    }

    if (filters.maxAge && (filters.maxAge < 18 || filters.maxAge > 100)) {
      return { valid: false, error: 'Maximum age must be between 18 and 100' };
    }

    if (filters.minAge && filters.maxAge && filters.minAge > filters.maxAge) {
      return { valid: false, error: 'Minimum age cannot be greater than maximum age' };
    }

    // Distance validation
    if (filters.maxDistance && (filters.maxDistance < 1 || filters.maxDistance > 500)) {
      return { valid: false, error: 'Maximum distance must be between 1 and 500 km' };
    }

    // Height validation
    if (filters.minHeight && filters.maxHeight && filters.minHeight > filters.maxHeight) {
      return { valid: false, error: 'Minimum height cannot be greater than maximum height' };
    }

    return { valid: true };
  }

  /**
   * Advanced search with comprehensive filtering and relevance scoring
   */
  async advancedSearch(
    userId: string,
    filters: SearchFilters
  ): Promise<{
    success: boolean;
    users: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const limit = Math.min(filters.limit || 20, 100);
      const offset = filters.offset || 0;
      const sortBy = filters.sortBy || 'relevance';

      // Check cache first
      const cacheKey = `search:${userId}:${JSON.stringify(filters)}`;
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Returning cached search results', { userId });
        return cached;
      }

      // Get current user's location and preferences
      const currentUser = await db('users')
        .where({ id: userId })
        .select('latitude', 'longitude', 'gender', 'interested_in', 'interests', 'last_active_at')
        .first();

      if (!currentUser) {
        throw new Error('User not found');
      }

      // Build query with proper distance calculation
      let query = db('users')
        .select(
          'users.id',
          'users.first_name',
          'users.last_name',
          'users.date_of_birth',
          'users.gender',
          'users.bio',
          'users.occupation',
          'users.education',
          'users.height',
          'users.religion',
          'users.relationship_goals',
          'users.interests',
          'users.latitude',
          'users.longitude',
          'users.is_verified',
          'users.subscription_tier',
          'users.last_active_at',
          'users.profile_completion_percentage',
          db.raw(`
            EXTRACT(YEAR FROM AGE(users.date_of_birth)) as age
          `)
        )
        .whereNot({ 'users.id': userId })
        .where({ 'users.is_active': true });

      // Add distance calculation only if user has location
      if (currentUser.latitude && currentUser.longitude) {
        query = query.select(
          db.raw(`
            ROUND(CAST(
              6371 * acos(
                LEAST(1.0, GREATEST(-1.0,
                  cos(radians(?)) * cos(radians(users.latitude)) *
                  cos(radians(users.longitude) - radians(?)) +
                  sin(radians(?)) * sin(radians(users.latitude))
                ))
              ) AS numeric
            ), 1) as distance
          `, [currentUser.latitude, currentUser.longitude, currentUser.latitude])
        );
      } else {
        query = query.select(db.raw('NULL as distance'));
      }

      // Filter by gender/interested_in
      if (currentUser.interested_in && currentUser.interested_in.length > 0) {
        query = query.whereIn('users.gender', currentUser.interested_in);
      }

      // Age filter
      if (filters.minAge || filters.maxAge) {
        const minDate = filters.maxAge
          ? db.raw(`CURRENT_DATE - INTERVAL '${filters.maxAge} years'`)
          : null;
        const maxDate = filters.minAge
          ? db.raw(`CURRENT_DATE - INTERVAL '${filters.minAge} years'`)
          : null;

        if (minDate && maxDate) {
          query = query.whereBetween('users.date_of_birth', [minDate, maxDate]);
        } else if (minDate) {
          query = query.where('users.date_of_birth', '>=', minDate);
        } else if (maxDate) {
          query = query.where('users.date_of_birth', '<=', maxDate);
        }
      }

      // Height filter
      if (filters.minHeight) {
        query = query.where('users.height', '>=', filters.minHeight);
      }
      if (filters.maxHeight) {
        query = query.where('users.height', '<=', filters.maxHeight);
      }

      // Education filter
      if (filters.education && filters.education.length > 0) {
        query = query.whereIn('users.education', filters.education);
      }

      // Occupation filter
      if (filters.occupation && filters.occupation.length > 0) {
        query = query.where((builder) => {
          filters.occupation!.forEach((occ) => {
            builder.orWhereRaw('LOWER(users.occupation) LIKE ?', [`%${occ.toLowerCase()}%`]);
          });
        });
      }

      // Religion filter
      if (filters.religion && filters.religion.length > 0) {
        query = query.whereIn('users.religion', filters.religion);
      }

      // Interests filter (overlap check) - fixed array syntax
      if (filters.interests && filters.interests.length > 0) {
        const interestArray = filters.interests.map(i => `'${i}'`).join(',');
        query = query.whereRaw(
          `users.interests && ARRAY[${interestArray}]::varchar[]`
        );
      }

      // Relationship goals filter - fixed array syntax
      if (filters.relationshipGoals && filters.relationshipGoals.length > 0) {
        const goalsArray = filters.relationshipGoals.map(g => `'${g}'`).join(',');
        query = query.whereRaw(
          `users.relationship_goals && ARRAY[${goalsArray}]::varchar[]`
        );
      }

      // Dealbreakers
      if (filters.dealbreakers) {
        if (filters.dealbreakers.noSmokers) {
          query = query.where('users.smoker', false);
        }
        if (filters.dealbreakers.noDrinkers) {
          query = query.where('users.drinker', false);
        }
        if (filters.dealbreakers.noChildren) {
          query = query.where('users.has_children', false);
        }
        if (filters.dealbreakers.noPets) {
          query = query.where('users.has_pets', false);
        }
      }

      // Verified only filter
      if (filters.verifiedOnly) {
        query = query.where('users.is_verified', true);
      }

      // Exclude already swiped users
      query = query.whereNotExists(
        db('swipes')
          .select(1)
          .where('swipes.swiper_id', userId)
          .whereRaw('swipes.swiped_id = users.id')
      );

      // Exclude blocked users
      query = query.whereNotExists(
        db('user_blocks')
          .select(1)
          .where((builder) => {
            builder
              .where({ blocker_id: userId })
              .orWhere({ blocked_id: userId });
          })
          .whereRaw('user_blocks.blocker_id = users.id OR user_blocks.blocked_id = users.id')
      );

      // Distance filter - apply before counting for accurate totals
      if (filters.maxDistance && currentUser.latitude && currentUser.longitude) {
        // Add WHERE clause to filter users within distance radius
        query = query.whereNotNull('users.latitude')
          .whereNotNull('users.longitude')
          .whereRaw(`
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians(?)) * cos(radians(users.latitude)) *
                cos(radians(users.longitude) - radians(?)) +
                sin(radians(?)) * sin(radians(users.latitude))
              ))
            ) <= ?
          `, [currentUser.latitude, currentUser.longitude, currentUser.latitude, filters.maxDistance]);
      }

      // Get total count (after all filters applied)
      const countQuery = query.clone();
      const totalResult = await countQuery.count('* as count').first();
      const total = parseInt(totalResult?.count as string) || 0;

      // Apply sorting based on sortBy parameter
      query = this.applySorting(query, sortBy, currentUser);

      // Apply pagination
      query = query.limit(limit).offset(offset);

      // Execute query
      const users = await query;

      // Get photos for each user
      const userIds = users.map((u) => u.id);
      const photos = await db('photos')
        .whereIn('user_id', userIds)
        .where({ status: 'approved' })
        .orderBy('order', 'asc');

      // Attach photos to users and calculate relevance scores
      const usersWithPhotos = await Promise.all(
        users.map(async (user) => {
          const relevanceScore = await this.calculateRelevanceScore(user, currentUser, filters);
          return {
            ...user,
            photos: photos.filter((p) => p.user_id === user.id),
            relevanceScore: relevanceScore.score,
            relevanceBreakdown: relevanceScore.breakdown,
          };
        })
      );

      // If sorting by relevance, re-sort after calculating scores
      if (sortBy === 'relevance') {
        usersWithPhotos.sort((a, b) => b.relevanceScore - a.relevanceScore);
      }

      const result = {
        success: true,
        users: usersWithPhotos,
        total,
        hasMore: offset + limit < total,
      };

      // Cache results for 5 minutes
      await this.setCache(cacheKey, result, 300);

      return result;
    } catch (error: any) {
      logger.error('Advanced search failed', {
        userId,
        filters,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Calculate relevance score for a user
   */
  private async calculateRelevanceScore(
    targetUser: any,
    currentUser: any,
    filters: SearchFilters
  ): Promise<RelevanceScore> {
    let interestMatch = 0;
    let profileComplete = 0;
    let activityRecent = 0;
    let verificationBonus = 0;

    // Interest matching score (0-40 points)
    if (currentUser.interests && targetUser.interests) {
      const userInterests = new Set(currentUser.interests);
      const targetInterests = new Set(targetUser.interests);
      const intersection = new Set([...userInterests].filter(x => targetInterests.has(x)));
      const union = new Set([...userInterests, ...targetInterests]);

      if (union.size > 0) {
        interestMatch = Math.round((intersection.size / union.size) * 40);
      }
    }

    // Profile completeness score (0-25 points)
    if (targetUser.profile_completion_percentage) {
      profileComplete = Math.round((targetUser.profile_completion_percentage / 100) * 25);
    }

    // Recent activity score (0-20 points)
    if (targetUser.last_active_at) {
      const hoursSinceActive = (Date.now() - new Date(targetUser.last_active_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceActive < 1) activityRecent = 20;
      else if (hoursSinceActive < 24) activityRecent = 15;
      else if (hoursSinceActive < 72) activityRecent = 10;
      else if (hoursSinceActive < 168) activityRecent = 5;
    }

    // Verification bonus (0-15 points)
    if (targetUser.is_verified) {
      verificationBonus = 15;
    }

    const totalScore = interestMatch + profileComplete + activityRecent + verificationBonus;

    return {
      userId: targetUser.id,
      score: totalScore,
      breakdown: {
        interestMatch,
        profileComplete,
        activityRecent,
        verificationBonus,
      },
    };
  }

  /**
   * Apply sorting to query
   */
  private applySorting(query: any, sortBy: string, currentUser: any): any {
    switch (sortBy) {
      case 'distance':
        if (currentUser.latitude && currentUser.longitude) {
          return query.orderByRaw('distance ASC NULLS LAST');
        }
        return query.orderBy('users.created_at', 'desc');

      case 'activity':
        return query.orderByRaw('users.last_active_at DESC NULLS LAST');

      case 'newest':
        return query.orderBy('users.created_at', 'desc');

      case 'relevance':
      default:
        // For relevance, we'll sort after calculating scores
        // Primary sort by profile completion and verification
        return query
          .orderByRaw('users.is_verified DESC NULLS LAST')
          .orderByRaw('users.profile_completion_percentage DESC NULLS LAST')
          .orderByRaw('users.last_active_at DESC NULLS LAST');
    }
  }

  /**
   * Get data from cache
   */
  private async getFromCache(key: string): Promise<any | null> {
    try {
      if (!redisClient.isOpen) {
        return null;
      }

      const cached = await redisClient.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.warn('Cache retrieval failed', { key, error });
      return null;
    }
  }

  /**
   * Set data in cache
   */
  private async setCache(key: string, value: any, ttl: number): Promise<void> {
    try {
      if (!redisClient.isOpen) {
        return;
      }

      await redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.warn('Cache storage failed', { key, error });
    }
  }

  /**
   * Get user's saved filter presets
   */
  async getSavedFilters(userId: string): Promise<any[]> {
    try {
      const filters = await db('search_filter_presets')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc');

      return filters;
    } catch (error: any) {
      logger.error('Failed to get saved filters', {
        userId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Save a filter preset
   */
  async saveFilterPreset(
    userId: string,
    name: string,
    filters: SearchFilters
  ): Promise<{ success: boolean; preset?: any; error?: string }> {
    try {
      const presetId = uuidv4();

      const preset = await db('search_filter_presets')
        .insert({
          id: presetId,
          user_id: userId,
          name,
          filters: JSON.stringify(filters),
          created_at: new Date(),
        })
        .returning('*');

      return {
        success: true,
        preset: preset[0],
      };
    } catch (error: any) {
      logger.error('Failed to save filter preset', {
        userId,
        name,
        error: error.message,
      });

      return {
        success: false,
        error: 'Failed to save filter preset',
      };
    }
  }

  /**
   * Delete a filter preset
   */
  async deleteFilterPreset(
    userId: string,
    presetId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const deleted = await db('search_filter_presets')
        .where({ id: presetId, user_id: userId })
        .delete();

      if (deleted === 0) {
        return {
          success: false,
          error: 'Filter preset not found',
        };
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to delete filter preset', {
        userId,
        presetId,
        error: error.message,
      });

      return {
        success: false,
        error: 'Failed to delete filter preset',
      };
    }
  }

  /**
   * Search by username
   */
  async searchByUsername(
    userId: string,
    query: string
  ): Promise<{ success: boolean; users: any[] }> {
    try {
      // Get current user's preferences
      const currentUser = await db('users')
        .where({ id: userId })
        .select('gender', 'interested_in')
        .first();

      let queryBuilder = db('users')
        .select(
          'users.id',
          'users.first_name',
          'users.last_name',
          'users.date_of_birth',
          'users.gender',
          'users.bio',
          'users.is_verified',
          'users.subscription_tier',
          db.raw(`EXTRACT(YEAR FROM AGE(users.date_of_birth)) as age`)
        )
        .whereNot({ 'users.id': userId })
        .where({ 'users.is_active': true })
        .where((builder) => {
          builder
            .whereRaw('LOWER(first_name) LIKE ?', [`%${query.toLowerCase()}%`])
            .orWhereRaw('LOWER(last_name) LIKE ?', [`%${query.toLowerCase()}%`])
            .orWhereRaw(
              'LOWER(CONCAT(first_name, \' \', last_name)) LIKE ?',
              [`%${query.toLowerCase()}%`]
            );
        })
        .limit(20);

      // Filter by interested_in
      if (currentUser.interested_in && currentUser.interested_in.length > 0) {
        queryBuilder = queryBuilder.whereIn('users.gender', currentUser.interested_in);
      }

      const users = await queryBuilder;

      // Get photos
      const userIds = users.map((u) => u.id);
      const photos = await db('photos')
        .whereIn('user_id', userIds)
        .where({ status: 'approved' })
        .orderBy('order', 'asc');

      const usersWithPhotos = users.map((user) => ({
        ...user,
        photos: photos.filter((p) => p.user_id === user.id),
      }));

      return {
        success: true,
        users: usersWithPhotos,
      };
    } catch (error: any) {
      logger.error('Username search failed', {
        userId,
        query,
        error: error.message,
      });

      throw error;
    }
  }
}

export const searchService = new SearchService();
