import { v4 as uuidv4 } from 'uuid';

import { postgresClient } from '../../infrastructure/database/postgres-client';
import { Icebreaker } from '../../types/enhanced-types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('icebreaker-repository');

export interface IcebreakerDocument extends Icebreaker {
  isCustom?: boolean;
  createdBy?: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IcebreakerUsage {
  id: string;
  icebreakerId: string;
  userId: string;
  conversationId?: string;
  usedAt: Date;
}

export class IcebreakerRepository {
  /**
   * Create a new icebreaker
   */
  async create(
    icebreaker: Omit<Icebreaker, 'id'>,
    createdBy?: string
  ): Promise<IcebreakerDocument> {
    try {
      const id = uuidv4();
      const now = new Date();

      const document: IcebreakerDocument = {
        ...icebreaker,
        id,
        isCustom: !!createdBy,
        createdBy,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      logger.info(`Creating icebreaker: ${id}`);

      const [result] = await postgresClient.icebreakers().insert(document).returning('*');

      logger.info(`Icebreaker created: ${id}`);
      return result as IcebreakerDocument;
    } catch (error: any) {
      logger.error('Failed to create icebreaker:', error);
      throw new Error(`Failed to create icebreaker: ${error.message}`);
    }
  }

  /**
   * Find icebreaker by ID
   */
  async findById(icebreakerId: string): Promise<IcebreakerDocument | null> {
    try {
      const result = await postgresClient.icebreakers().where('id', icebreakerId).first();
      return result || null;
    } catch (error: any) {
      logger.error(`Failed to find icebreaker ${icebreakerId}:`, error);
      throw error;
    }
  }

  /**
   * Get icebreakers by category
   */
  async getByCategory(category: string, count: number = 10): Promise<IcebreakerDocument[]> {
    try {
      const results = await postgresClient
        .icebreakers()
        .where('category', category)
        .orderBy('popularity', 'desc')
        .limit(count);

      return results as IcebreakerDocument[];
    } catch (error: any) {
      logger.error('Failed to get icebreakers by category:', error);
      throw error;
    }
  }

  /**
   * Get a random icebreaker
   */
  async getRandom(): Promise<IcebreakerDocument | null> {
    try {
      // Get total count first
      const countResult = await postgresClient
        .icebreakers()
        .where(function () {
          this.where('is_custom', '!=', true).orWhereNull('is_custom');
        })
        .count('* as count')
        .first();

      const totalCount = Number(countResult?.count) || 0;

      if (totalCount === 0) {
        return null;
      }

      // Get random offset
      const randomOffset = Math.floor(Math.random() * totalCount);

      const result = await postgresClient
        .icebreakers()
        .where(function () {
          this.where('is_custom', '!=', true).orWhereNull('is_custom');
        })
        .offset(randomOffset)
        .first();

      return result || null;
    } catch (error: any) {
      logger.error('Failed to get random icebreaker:', error);
      throw error;
    }
  }

  /**
   * Search icebreakers by tags
   */
  async searchByTags(tags: string[], count: number = 10): Promise<IcebreakerDocument[]> {
    try {
      // PostgreSQL array contains any of the tags
      const results = await postgresClient
        .icebreakers()
        .whereRaw('tags && ?', [tags])
        .orderBy('popularity', 'desc')
        .limit(count);

      return results as IcebreakerDocument[];
    } catch (error: any) {
      logger.error('Failed to search icebreakers by tags:', error);
      throw error;
    }
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const results = await postgresClient.icebreakers().distinct('category').pluck('category');
      return results as string[];
    } catch (error: any) {
      logger.error('Failed to get categories:', error);
      throw error;
    }
  }

  /**
   * Get personalized icebreakers based on interests
   */
  async getByInterests(interests: string[], count: number = 5): Promise<IcebreakerDocument[]> {
    try {
      if (interests.length === 0) {
        // Return popular icebreakers if no interests
        return this.getMostPopular(count);
      }

      // Match tags with interests
      const lowercaseInterests = interests.map((i) => i.toLowerCase());
      const results = await postgresClient
        .icebreakers()
        .whereRaw('tags && ?', [lowercaseInterests])
        .orderBy('popularity', 'desc')
        .limit(count);

      // If we don't have enough matches, fill with popular ones
      if (results.length < count) {
        const moreNeeded = count - results.length;
        const existingIds = results.map((r: any) => r.id);
        const popular = await this.getMostPopular(moreNeeded + 5);
        const additional = popular
          .filter((p: any) => !existingIds.includes(p.id))
          .slice(0, moreNeeded);
        return [...results, ...additional] as IcebreakerDocument[];
      }

      return results as IcebreakerDocument[];
    } catch (error: any) {
      logger.error('Failed to get personalized icebreakers:', error);
      throw error;
    }
  }

  /**
   * Get most popular icebreakers
   */
  async getMostPopular(count: number = 10): Promise<IcebreakerDocument[]> {
    try {
      const results = await postgresClient
        .icebreakers()
        .orderBy('popularity', 'desc')
        .orderBy('usage_count', 'desc')
        .limit(count);

      return results as IcebreakerDocument[];
    } catch (error: any) {
      logger.error('Failed to get most popular icebreakers:', error);
      throw error;
    }
  }

  /**
   * Track icebreaker usage
   */
  async trackUsage(icebreakerId: string, userId: string, conversationId?: string): Promise<void> {
    try {
      // Record usage
      const usage: IcebreakerUsage = {
        id: uuidv4(),
        icebreakerId,
        userId,
        conversationId,
        usedAt: new Date(),
      };

      await postgresClient.icebreakerUsage().insert(usage);

      // Increment usage count on the icebreaker
      await postgresClient
        .icebreakers()
        .where('id', icebreakerId)
        .update({
          usageCount: postgresClient.icebreakers().client.raw('usage_count + 1'),
          updatedAt: new Date(),
        });

      logger.debug('Icebreaker usage tracked', { icebreakerId, userId });
    } catch (error: any) {
      logger.error('Failed to track icebreaker usage:', error);
      // Don't throw - usage tracking is not critical
    }
  }

  /**
   * Get total icebreaker count
   */
  async getTotalCount(): Promise<number> {
    try {
      const result = await postgresClient.icebreakers().count('* as count').first();
      return Number(result?.count) || 0;
    } catch (error: any) {
      logger.error('Failed to get total icebreaker count:', error);
      throw error;
    }
  }

  /**
   * Get custom icebreakers created by a user
   */
  async getCustomByUser(userId: string, limit: number = 50): Promise<IcebreakerDocument[]> {
    try {
      const results = await postgresClient
        .icebreakers()
        .where('created_by', userId)
        .andWhere('is_custom', true)
        .orderBy('created_at', 'desc')
        .limit(limit);

      return results as IcebreakerDocument[];
    } catch (error: any) {
      logger.error('Failed to get custom icebreakers:', error);
      throw error;
    }
  }

  /**
   * Delete icebreaker
   */
  async delete(icebreakerId: string, _category?: string): Promise<void> {
    try {
      await postgresClient.icebreakers().where('id', icebreakerId).delete();
      logger.info(`Icebreaker deleted: ${icebreakerId}`);
    } catch (error: any) {
      logger.error(`Failed to delete icebreaker ${icebreakerId}:`, error);
      throw error;
    }
  }
}

export const icebreakerRepository = new IcebreakerRepository();
export default icebreakerRepository;
