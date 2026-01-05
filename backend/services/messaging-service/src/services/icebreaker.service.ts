import { icebreakerRepository } from '../domain/repositories/icebreaker.repository';
import { Icebreaker, IcebreakerSuggestion } from '../types/enhanced-types';
import { createLogger } from '../utils/logger';

const logger = createLogger('icebreaker-service');

export class IcebreakerService {
  /**
   * Get personalized icebreaker suggestions
   */
  async getSuggestions(
    userId: string,
    otherUserId: string,
    count: number = 5
  ): Promise<IcebreakerSuggestion> {
    try {
      logger.info('Getting icebreaker suggestions', { userId, otherUserId, count });

      // Get personalized icebreakers - for now use most popular ones
      // In production, you would fetch user interests/profile data to personalize
      const icebreakers = await icebreakerRepository.getMostPopular(count);

      return {
        icebreakers: icebreakers.map((ib) => ({
          id: ib.id,
          category: ib.category,
          text: ib.text,
          popularity: ib.popularity,
          tags: ib.tags,
        })),
        personalized: false,
        basedOn: [],
      };
    } catch (error: any) {
      logger.error('Failed to get icebreaker suggestions:', error);
      throw error;
    }
  }

  /**
   * Get icebreakers by category
   */
  async getByCategory(category: string, count: number = 10): Promise<Icebreaker[]> {
    try {
      logger.info('Getting icebreakers by category', { category, count });

      const icebreakers = await icebreakerRepository.getByCategory(category, count);

      return icebreakers.map((ib) => ({
        id: ib.id,
        category: ib.category,
        text: ib.text,
        popularity: ib.popularity,
        tags: ib.tags,
      }));
    } catch (error: any) {
      logger.error('Failed to get icebreakers by category:', error);
      throw error;
    }
  }

  /**
   * Get random icebreaker
   */
  async getRandom(): Promise<Icebreaker> {
    try {
      logger.info('Getting random icebreaker');

      const icebreaker = await icebreakerRepository.getRandom();

      if (!icebreaker) {
        throw new Error('No icebreakers found');
      }

      return {
        id: icebreaker.id,
        category: icebreaker.category,
        text: icebreaker.text,
        popularity: icebreaker.popularity,
        tags: icebreaker.tags,
      };
    } catch (error: any) {
      logger.error('Failed to get random icebreaker:', error);
      throw error;
    }
  }

  /**
   * Search icebreakers by tags
   */
  async searchByTags(tags: string[], count: number = 10): Promise<Icebreaker[]> {
    try {
      logger.info('Searching icebreakers by tags', { tags, count });

      const icebreakers = await icebreakerRepository.searchByTags(tags, count);

      return icebreakers.map((ib) => ({
        id: ib.id,
        category: ib.category,
        text: ib.text,
        popularity: ib.popularity,
        tags: ib.tags,
      }));
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
      logger.info('Getting icebreaker categories');

      const categories = await icebreakerRepository.getCategories();

      return categories;
    } catch (error: any) {
      logger.error('Failed to get categories:', error);
      throw error;
    }
  }

  /**
   * Get personalized icebreakers based on shared interests
   */
  async getPersonalizedByInterests(
    userInterests: string[],
    count: number = 5
  ): Promise<IcebreakerSuggestion> {
    try {
      logger.info('Getting personalized icebreakers by interests', { userInterests, count });

      const icebreakers = await icebreakerRepository.getByInterests(userInterests, count);

      return {
        icebreakers: icebreakers.map((ib) => ({
          id: ib.id,
          category: ib.category,
          text: ib.text,
          popularity: ib.popularity,
          tags: ib.tags,
        })),
        personalized: userInterests.length > 0,
        basedOn: userInterests,
      };
    } catch (error: any) {
      logger.error('Failed to get personalized icebreakers:', error);
      throw error;
    }
  }

  /**
   * Track icebreaker usage (for analytics)
   */
  async trackUsage(icebreakerId: string, userId: string, conversationId?: string): Promise<void> {
    try {
      logger.info('Tracking icebreaker usage', { icebreakerId, userId });

      await icebreakerRepository.trackUsage(icebreakerId, userId, conversationId);

      logger.debug('Icebreaker usage tracked successfully');
    } catch (error: any) {
      // Don't throw - usage tracking is not critical
      logger.error('Failed to track icebreaker usage:', error);
    }
  }

  /**
   * Add custom icebreaker
   */
  async addCustomIcebreaker(
    icebreaker: Omit<Icebreaker, 'id'>,
    userId?: string
  ): Promise<Icebreaker> {
    try {
      logger.info('Adding custom icebreaker', { category: icebreaker.category, userId });

      const created = await icebreakerRepository.create(icebreaker, userId);

      logger.info('Custom icebreaker created', { id: created.id });

      return {
        id: created.id,
        category: created.category,
        text: created.text,
        popularity: created.popularity,
        tags: created.tags,
      };
    } catch (error: any) {
      logger.error('Failed to add custom icebreaker:', error);
      throw error;
    }
  }

  /**
   * Get total icebreaker count
   */
  async getTotalCount(): Promise<number> {
    try {
      logger.info('Getting total icebreaker count');

      const count = await icebreakerRepository.getTotalCount();

      return count;
    } catch (error: any) {
      logger.error('Failed to get total icebreaker count:', error);
      throw error;
    }
  }

  /**
   * Get custom icebreakers created by a user
   */
  async getCustomByUser(userId: string, limit: number = 50): Promise<Icebreaker[]> {
    try {
      logger.info('Getting custom icebreakers by user', { userId, limit });

      const icebreakers = await icebreakerRepository.getCustomByUser(userId, limit);

      return icebreakers.map((ib) => ({
        id: ib.id,
        category: ib.category,
        text: ib.text,
        popularity: ib.popularity,
        tags: ib.tags,
      }));
    } catch (error: any) {
      logger.error('Failed to get custom icebreakers:', error);
      throw error;
    }
  }
}

export const icebreakerService = new IcebreakerService();
export default icebreakerService;
