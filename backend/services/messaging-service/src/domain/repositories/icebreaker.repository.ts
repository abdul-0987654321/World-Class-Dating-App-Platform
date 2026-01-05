import { Container } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';

import { cosmosClient } from '../../infrastructure/database/cosmos-client';
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
  private _container: Container | null = null;
  private _usageContainer: Container | null = null;

  private get container(): Container {
    if (!this._container) {
      this._container = cosmosClient.getIcebreakersContainer();
    }
    return this._container;
  }

  private get usageContainer(): Container {
    if (!this._usageContainer) {
      this._usageContainer = cosmosClient.getIcebreakerUsageContainer();
    }
    return this._usageContainer;
  }

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

      const { resource } = await this.container.items.create(document);

      logger.info(`Icebreaker created: ${id}`);
      return resource as IcebreakerDocument;
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
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: icebreakerId }],
      };

      const { resources } = await this.container.items
        .query<IcebreakerDocument>(querySpec)
        .fetchAll();
      return resources.length > 0 ? resources[0] : null;
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
      const querySpec = {
        query: `SELECT * FROM c
                WHERE c.category = @category
                ORDER BY c.popularity DESC
                OFFSET 0 LIMIT @count`,
        parameters: [
          { name: '@category', value: category },
          { name: '@count', value: count },
        ],
      };

      const { resources } = await this.container.items
        .query<IcebreakerDocument>(querySpec)
        .fetchAll();
      return resources;
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
      const countQuery = {
        query:
          'SELECT VALUE COUNT(1) FROM c WHERE c.isCustom != true OR NOT IS_DEFINED(c.isCustom)',
      };
      const { resources: countResult } = await this.container.items
        .query<number>(countQuery)
        .fetchAll();
      const totalCount = countResult[0] || 0;

      if (totalCount === 0) {
        return null;
      }

      // Get random offset
      const randomOffset = Math.floor(Math.random() * totalCount);

      const querySpec = {
        query: `SELECT * FROM c
                WHERE c.isCustom != true OR NOT IS_DEFINED(c.isCustom)
                OFFSET @offset LIMIT 1`,
        parameters: [{ name: '@offset', value: randomOffset }],
      };

      const { resources } = await this.container.items
        .query<IcebreakerDocument>(querySpec)
        .fetchAll();
      return resources.length > 0 ? resources[0] : null;
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
      // Build a query that checks if any of the tags match
      const tagConditions = tags
        .map((_, index) => `ARRAY_CONTAINS(c.tags, @tag${index})`)
        .join(' OR ');

      const querySpec = {
        query: `SELECT * FROM c
                WHERE (${tagConditions})
                ORDER BY c.popularity DESC
                OFFSET 0 LIMIT @count`,
        parameters: [
          ...tags.map((tag, index) => ({ name: `@tag${index}`, value: tag })),
          { name: '@count', value: count },
        ],
      };

      const { resources } = await this.container.items
        .query<IcebreakerDocument>(querySpec)
        .fetchAll();
      return resources;
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
      const querySpec = {
        query: 'SELECT DISTINCT VALUE c.category FROM c',
      };

      const { resources } = await this.container.items.query<string>(querySpec).fetchAll();
      return resources;
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

      // Build query to match tags with interests
      const interestConditions = interests
        .map((_, index) => `ARRAY_CONTAINS(c.tags, @interest${index})`)
        .join(' OR ');

      const querySpec = {
        query: `SELECT * FROM c
                WHERE (${interestConditions})
                ORDER BY c.popularity DESC
                OFFSET 0 LIMIT @count`,
        parameters: [
          ...interests.map((interest, index) => ({
            name: `@interest${index}`,
            value: interest.toLowerCase(),
          })),
          { name: '@count', value: count },
        ],
      };

      const { resources } = await this.container.items
        .query<IcebreakerDocument>(querySpec)
        .fetchAll();

      // If we don't have enough matches, fill with popular ones
      if (resources.length < count) {
        const moreNeeded = count - resources.length;
        const existingIds = resources.map((r) => r.id);
        const popular = await this.getMostPopular(moreNeeded + 5);
        const additional = popular.filter((p) => !existingIds.includes(p.id)).slice(0, moreNeeded);
        return [...resources, ...additional];
      }

      return resources;
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
      const querySpec = {
        query: `SELECT * FROM c
                ORDER BY c.popularity DESC, c.usageCount DESC
                OFFSET 0 LIMIT @count`,
        parameters: [{ name: '@count', value: count }],
      };

      const { resources } = await this.container.items
        .query<IcebreakerDocument>(querySpec)
        .fetchAll();
      return resources;
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

      await this.usageContainer.items.create(usage);

      // Increment usage count on the icebreaker
      const icebreaker = await this.findById(icebreakerId);
      if (icebreaker) {
        const updatedIcebreaker = {
          ...icebreaker,
          usageCount: (icebreaker.usageCount || 0) + 1,
          updatedAt: new Date(),
        };

        await this.container.items.upsert(updatedIcebreaker);
      }

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
      const querySpec = {
        query: 'SELECT VALUE COUNT(1) FROM c',
      };

      const { resources } = await this.container.items.query<number>(querySpec).fetchAll();
      return resources[0] || 0;
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
      const querySpec = {
        query: `SELECT * FROM c
                WHERE c.createdBy = @userId AND c.isCustom = true
                ORDER BY c.createdAt DESC
                OFFSET 0 LIMIT @limit`,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@limit', value: limit },
        ],
      };

      const { resources } = await this.container.items
        .query<IcebreakerDocument>(querySpec)
        .fetchAll();
      return resources;
    } catch (error: any) {
      logger.error('Failed to get custom icebreakers:', error);
      throw error;
    }
  }

  /**
   * Delete icebreaker
   */
  async delete(icebreakerId: string, category: string): Promise<void> {
    try {
      await this.container.item(icebreakerId, category).delete();
      logger.info(`Icebreaker deleted: ${icebreakerId}`);
    } catch (error: any) {
      logger.error(`Failed to delete icebreaker ${icebreakerId}:`, error);
      throw error;
    }
  }
}

export const icebreakerRepository = new IcebreakerRepository();
export default icebreakerRepository;
