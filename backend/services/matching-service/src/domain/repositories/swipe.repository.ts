import { createLogger } from '@flamoral/backend-shared';
import { Knex } from 'knex';

import db from '../../infrastructure/database/connection';
import { SwipeAction } from '../../types';
import { Swipe } from '../entities/Swipe.entity';

const logger = createLogger('swipe-repository');

export class SwipeRepository {
  private db: Knex;

  constructor(database: Knex = db) {
    this.db = database;
  }

  /**
   * Create a new swipe record
   */
  async create(swipe: {
    userId: string;
    targetUserId: string;
    action: SwipeAction;
  }): Promise<Swipe> {
    try {
      const [created] = await this.db('swipes')
        .insert({
          user_id: swipe.userId,
          target_user_id: swipe.targetUserId,
          action: swipe.action,
        })
        .returning('*');

      return this.mapToSwipe(created);
    } catch (error) {
      logger.error('Failed to create swipe', error);
      throw error;
    }
  }

  /**
   * Check if user has already swiped on target
   */
  async hasUserSwiped(userId: string, targetUserId: string): Promise<boolean> {
    try {
      const swipe = await this.db('swipes')
        .where({
          user_id: userId,
          target_user_id: targetUserId,
        })
        .first();

      return !!swipe;
    } catch (error) {
      logger.error('Failed to check if user swiped', error);
      throw error;
    }
  }

  /**
   * Get swipe by user and target
   */
  async findByUserAndTarget(userId: string, targetUserId: string): Promise<Swipe | null> {
    try {
      const swipe = await this.db('swipes')
        .where({
          user_id: userId,
          target_user_id: targetUserId,
        })
        .first();

      return swipe ? this.mapToSwipe(swipe) : null;
    } catch (error) {
      logger.error('Failed to find swipe', error);
      throw error;
    }
  }

  /**
   * Check if there's a mutual like (match condition)
   */
  async checkMutualLike(user1Id: string, user2Id: string): Promise<boolean> {
    try {
      const user1Swipe = await this.db('swipes')
        .where({
          user_id: user1Id,
          target_user_id: user2Id,
        })
        .whereIn('action', ['like', 'super_like'])
        .first();

      if (!user1Swipe) return false;

      const user2Swipe = await this.db('swipes')
        .where({
          user_id: user2Id,
          target_user_id: user1Id,
        })
        .whereIn('action', ['like', 'super_like'])
        .first();

      return !!user2Swipe;
    } catch (error) {
      logger.error('Failed to check mutual like', error);
      throw error;
    }
  }

  /**
   * Get all users who liked a specific user
   */
  async getUsersWhoLiked(userId: string): Promise<string[]> {
    try {
      const swipes = await this.db('swipes')
        .where({
          target_user_id: userId,
        })
        .whereIn('action', ['like', 'super_like'])
        .select('user_id');

      return swipes.map((s) => s.user_id);
    } catch (error) {
      logger.error('Failed to get users who liked', error);
      throw error;
    }
  }

  /**
   * Get all users that a user has swiped on
   */
  async getSwipedUserIds(userId: string): Promise<string[]> {
    try {
      const swipes = await this.db('swipes').where({ user_id: userId }).select('target_user_id');

      return swipes.map((s) => s.target_user_id);
    } catch (error) {
      logger.error('Failed to get swiped user IDs', error);
      throw error;
    }
  }

  /**
   * Get swipe statistics for a user
   */
  async getSwipeStats(userId: string): Promise<{
    total: number;
    likes: number;
    passes: number;
    superLikes: number;
  }> {
    try {
      const stats = await this.db('swipes')
        .where({ user_id: userId })
        .select('action')
        .count('* as count')
        .groupBy('action');

      const result = {
        total: 0,
        likes: 0,
        passes: 0,
        superLikes: 0,
      };

      stats.forEach((stat: any) => {
        const count = parseInt(stat.count, 10);
        result.total += count;

        if (stat.action === 'like') result.likes = count;
        if (stat.action === 'pass') result.passes = count;
        if (stat.action === 'super_like') result.superLikes = count;
      });

      return result;
    } catch (error) {
      logger.error('Failed to get swipe stats', error);
      throw error;
    }
  }

  /**
   * Find swipes by swiper ID with pagination
   */
  async findBySwiperId(
    userId: string,
    options?: { limit?: number; offset?: number; direction?: string }
  ): Promise<Swipe[]> {
    try {
      let query = this.db('swipes').where({ user_id: userId });

      if (options?.direction) {
        query = query.andWhere('action', options.direction);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.offset(options.offset);
      }

      const swipes = await query.orderBy('created_at', 'desc');
      return swipes.map(this.mapToSwipe);
    } catch (error) {
      logger.error('Failed to find swipes by swiper ID', error);
      throw error;
    }
  }

  /**
   * Count swipes by swiper ID
   */
  async countBySwiperId(userId: string, direction?: string): Promise<number> {
    try {
      let query = this.db('swipes').where({ user_id: userId });

      if (direction) {
        query = query.andWhere('action', direction);
      }

      const result = await query.count('* as count').first();
      return parseInt((result?.count as string) || '0', 10);
    } catch (error) {
      logger.error('Failed to count swipes by swiper ID', error);
      throw error;
    }
  }

  /**
   * Get the most recent swipe for a user
   */
  async getLastSwipe(userId: string): Promise<Swipe | null> {
    try {
      const swipe = await this.db('swipes')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .first();

      return swipe ? this.mapToSwipe(swipe) : null;
    } catch (error) {
      logger.error('Failed to get last swipe', error);
      throw error;
    }
  }

  /**
   * Delete a swipe by ID
   */
  async deleteById(swipeId: string): Promise<boolean> {
    try {
      const deleted = await this.db('swipes').where({ id: swipeId }).delete();

      return deleted > 0;
    } catch (error) {
      logger.error('Failed to delete swipe', error);
      throw error;
    }
  }

  /**
   * Delete a swipe by user and target (for undo functionality)
   */
  async deleteByUserAndTarget(userId: string, targetUserId: string): Promise<boolean> {
    try {
      const deleted = await this.db('swipes')
        .where({
          user_id: userId,
          target_user_id: targetUserId,
        })
        .delete();

      return deleted > 0;
    } catch (error) {
      logger.error('Failed to delete swipe by user and target', error);
      throw error;
    }
  }

  /**
   * Map database record to Swipe entity
   */
  private mapToSwipe(record: any): Swipe {
    return new Swipe({
      id: record.id,
      userId: record.user_id,
      targetUserId: record.target_user_id,
      action: record.action,
      createdAt: new Date(record.created_at),
    });
  }
}

export default new SwipeRepository();
