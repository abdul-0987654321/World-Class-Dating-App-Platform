/**
 * Advanced Search Service
 * Handles complex filtering and search operations
 */

import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

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
  limit?: number;
  offset?: number;
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
   * Advanced search with comprehensive filtering
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

      // Get current user's location and preferences
      const currentUser = await db('users')
        .where({ id: userId })
        .select('latitude', 'longitude', 'gender', 'interested_in')
        .first();

      if (!currentUser) {
        throw new Error('User not found');
      }

      // Build query
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
          db.raw(`
            EXTRACT(YEAR FROM AGE(users.date_of_birth)) as age
          `),
          db.raw(`
            (
              6371 * acos(
                cos(radians(?)) * cos(radians(users.latitude)) *
                cos(radians(users.longitude) - radians(?)) +
                sin(radians(?)) * sin(radians(users.latitude))
              )
            ) as distance
          `, [currentUser.latitude, currentUser.longitude, currentUser.latitude])
        )
        .whereNot({ 'users.id': userId })
        .where({ 'users.is_active': true });

      // Filter by gender/interested_in
      if (currentUser.interested_in && currentUser.interested_in.length > 0) {
        query = query.whereIn('users.gender', currentUser.interested_in);
      }

      // Age filter
      if (filters.minAge || filters.maxAge) {
        // Validate that ages are integers to prevent SQL injection
        if (filters.maxAge !== undefined && (!Number.isInteger(filters.maxAge) || filters.maxAge < 0)) {
          throw new Error('Invalid maxAge parameter');
        }
        if (filters.minAge !== undefined && (!Number.isInteger(filters.minAge) || filters.minAge < 0)) {
          throw new Error('Invalid minAge parameter');
        }

        const minDate = filters.maxAge
          ? db.raw(`CURRENT_DATE - INTERVAL '1 year' * ?`, [filters.maxAge])
          : null;
        const maxDate = filters.minAge
          ? db.raw(`CURRENT_DATE - INTERVAL '1 year' * ?`, [filters.minAge])
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

      // Interests filter (overlap check)
      if (filters.interests && filters.interests.length > 0) {
        query = query.whereRaw(
          'users.interests && ARRAY[?]::varchar[]',
          [filters.interests]
        );
      }

      // Relationship goals filter
      if (filters.relationshipGoals && filters.relationshipGoals.length > 0) {
        query = query.whereRaw(
          'users.relationship_goals && ARRAY[?]::varchar[]',
          [filters.relationshipGoals]
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

      // Get total count (before pagination)
      const countQuery = query.clone();
      const totalResult = await countQuery.count('* as count').first();
      const total = parseInt(totalResult?.count as string) || 0;

      // Distance filter (apply after getting total)
      if (filters.maxDistance) {
        query = query.havingRaw('distance <= ?', [filters.maxDistance]);
      }

      // Order by distance and limit
      query = query
        .orderBy('distance', 'asc')
        .limit(limit)
        .offset(offset);

      // Execute query
      const users = await query;

      // Get photos for each user
      const userIds = users.map((u) => u.id);
      const photos = await db('photos')
        .whereIn('user_id', userIds)
        .where({ status: 'approved' })
        .orderBy('order', 'asc');

      // Attach photos to users
      const usersWithPhotos = users.map((user) => ({
        ...user,
        photos: photos.filter((p) => p.user_id === user.id),
      }));

      return {
        success: true,
        users: usersWithPhotos,
        total,
        hasMore: offset + limit < total,
      };
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
