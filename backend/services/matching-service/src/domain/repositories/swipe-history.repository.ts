import { Knex } from 'knex';
import db from '../../infrastructure/database/connection';
import { SwipeHistory, RewindUsage } from '../entities/SwipeHistory.entity';
import { SwipeAction } from '../../types';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('swipe-history-repository');

/**
 * SwipeHistoryRepository
 *
 * Handles database operations for swipe history and rewind usage tracking.
 */
export class SwipeHistoryRepository {
  private db: Knex;

  constructor(database: Knex = db) {
    this.db = database;
  }

  /**
   * Create a new swipe history record
   */
  async create(data: {
    userId: string;
    targetUserId: string;
    action: SwipeAction;
    originalSwipeId?: string;
    resultedInMatch?: boolean;
    matchId?: string;
  }): Promise<SwipeHistory> {
    try {
      const [created] = await this.db('swipe_history')
        .insert({
          user_id: data.userId,
          target_user_id: data.targetUserId,
          action: data.action,
          original_swipe_id: data.originalSwipeId || null,
          resulted_in_match: data.resultedInMatch || false,
          match_id: data.matchId || null,
          rewound: false,
        })
        .returning('*');

      return this.mapToSwipeHistory(created);
    } catch (error) {
      logger.error('Failed to create swipe history', error);
      throw error;
    }
  }

  /**
   * Get swipe history by ID
   */
  async findById(id: string): Promise<SwipeHistory | null> {
    try {
      const record = await this.db('swipe_history')
        .where({ id })
        .first();

      return record ? this.mapToSwipeHistory(record) : null;
    } catch (error) {
      logger.error('Failed to find swipe history by ID', error);
      throw error;
    }
  }

  /**
   * Get the most recent non-rewound swipe for a user
   */
  async getLastRewindableSwipe(userId: string): Promise<SwipeHistory | null> {
    try {
      const record = await this.db('swipe_history')
        .where({
          user_id: userId,
          rewound: false,
        })
        .orderBy('created_at', 'desc')
        .first();

      return record ? this.mapToSwipeHistory(record) : null;
    } catch (error) {
      logger.error('Failed to get last rewindable swipe', error);
      throw error;
    }
  }

  /**
   * Get the last N swipes for a user
   */
  async getRecentSwipes(userId: string, limit: number = 10): Promise<SwipeHistory[]> {
    try {
      const records = await this.db('swipe_history')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(limit);

      return records.map(this.mapToSwipeHistory);
    } catch (error) {
      logger.error('Failed to get recent swipes', error);
      throw error;
    }
  }

  /**
   * Get rewindable swipes (not yet rewound) for a user
   */
  async getRewindableSwipes(userId: string, limit: number = 10): Promise<SwipeHistory[]> {
    try {
      const records = await this.db('swipe_history')
        .where({
          user_id: userId,
          rewound: false,
        })
        .orderBy('created_at', 'desc')
        .limit(limit);

      return records.map(this.mapToSwipeHistory);
    } catch (error) {
      logger.error('Failed to get rewindable swipes', error);
      throw error;
    }
  }

  /**
   * Mark a swipe history entry as rewound
   */
  async markAsRewound(id: string): Promise<boolean> {
    try {
      const updated = await this.db('swipe_history')
        .where({ id })
        .update({
          rewound: true,
          rewound_at: new Date(),
        });

      return updated > 0;
    } catch (error) {
      logger.error('Failed to mark swipe as rewound', error);
      throw error;
    }
  }

  /**
   * Update swipe history with match info
   */
  async updateWithMatchInfo(
    userId: string,
    targetUserId: string,
    matchId: string
  ): Promise<boolean> {
    try {
      const updated = await this.db('swipe_history')
        .where({
          user_id: userId,
          target_user_id: targetUserId,
          rewound: false,
        })
        .orderBy('created_at', 'desc')
        .limit(1)
        .update({
          resulted_in_match: true,
          match_id: matchId,
        });

      return updated > 0;
    } catch (error) {
      logger.error('Failed to update swipe history with match info', error);
      throw error;
    }
  }

  /**
   * Record a rewind usage for tier limit tracking
   */
  async recordRewindUsage(data: {
    userId: string;
    swipeHistoryId: string;
    subscriptionTier: string;
  }): Promise<RewindUsage> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [created] = await this.db('rewind_usage')
        .insert({
          user_id: data.userId,
          swipe_history_id: data.swipeHistoryId,
          subscription_tier: data.subscriptionTier,
          usage_date: today,
        })
        .returning('*');

      return this.mapToRewindUsage(created);
    } catch (error) {
      logger.error('Failed to record rewind usage', error);
      throw error;
    }
  }

  /**
   * Get rewind count for a user on a specific date
   */
  async getRewindCountForDate(userId: string, date: Date): Promise<number> {
    try {
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);

      const result = await this.db('rewind_usage')
        .where({
          user_id: userId,
          usage_date: dateOnly,
        })
        .count('* as count')
        .first();

      return parseInt(result?.count as string || '0', 10);
    } catch (error) {
      logger.error('Failed to get rewind count for date', error);
      throw error;
    }
  }

  /**
   * Get rewind count for a user in a date range
   */
  async getRewindCountForPeriod(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      const result = await this.db('rewind_usage')
        .where({ user_id: userId })
        .whereBetween('usage_date', [startDate, endDate])
        .count('* as count')
        .first();

      return parseInt(result?.count as string || '0', 10);
    } catch (error) {
      logger.error('Failed to get rewind count for period', error);
      throw error;
    }
  }

  /**
   * Get today's rewind count for a user
   */
  async getTodayRewindCount(userId: string): Promise<number> {
    const today = new Date();
    return this.getRewindCountForDate(userId, today);
  }

  /**
   * Get this week's rewind count for a user
   */
  async getWeeklyRewindCount(userId: string): Promise<number> {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return this.getRewindCountForPeriod(userId, startOfWeek, today);
  }

  /**
   * Get rewind usage history for a user
   */
  async getRewindHistory(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<RewindUsage[]> {
    try {
      const { limit = 20, offset = 0 } = options || {};

      const records = await this.db('rewind_usage')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return records.map(this.mapToRewindUsage);
    } catch (error) {
      logger.error('Failed to get rewind history', error);
      throw error;
    }
  }

  /**
   * Clean up old swipe history records (older than 30 days)
   * This can be run as a scheduled job
   */
  async cleanupOldHistory(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deleted = await this.db('swipe_history')
        .where('created_at', '<', cutoffDate)
        .where('rewound', true) // Only delete rewound entries
        .delete();

      logger.info(`Cleaned up ${deleted} old swipe history records`);
      return deleted;
    } catch (error) {
      logger.error('Failed to cleanup old history', error);
      throw error;
    }
  }

  /**
   * Map database record to SwipeHistory entity
   */
  private mapToSwipeHistory(record: any): SwipeHistory {
    return new SwipeHistory({
      id: record.id,
      userId: record.user_id,
      targetUserId: record.target_user_id,
      action: record.action,
      originalSwipeId: record.original_swipe_id,
      rewound: record.rewound,
      rewoundAt: record.rewound_at ? new Date(record.rewound_at) : null,
      resultedInMatch: record.resulted_in_match,
      matchId: record.match_id,
      createdAt: new Date(record.created_at),
    });
  }

  /**
   * Map database record to RewindUsage entity
   */
  private mapToRewindUsage(record: any): RewindUsage {
    return new RewindUsage({
      id: record.id,
      userId: record.user_id,
      swipeHistoryId: record.swipe_history_id,
      usageDate: new Date(record.usage_date),
      subscriptionTier: record.subscription_tier,
      createdAt: new Date(record.created_at),
    });
  }
}

export default new SwipeHistoryRepository();
