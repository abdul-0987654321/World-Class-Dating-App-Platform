/**
 * Super Like Service
 * Handles Super Like with optional message functionality
 * Premium feature for expressing strong interest
 */

import { Knex } from 'knex';
import db from '../../infrastructure/database/connection';
import { SwipeAction } from '../../types';
import { createLogger } from '@flamoral/shared';
import swipeRepository from '../repositories/swipe.repository';
import notificationServiceClient from '../../infrastructure/clients/notification-service.client';
import analyticsServiceClient from '../../infrastructure/clients/analytics-service.client';
import userServiceClient from '../../infrastructure/clients/user-service.client';

const logger = createLogger('super-like-service');

export interface SuperLikeMessage {
  id: string;
  userId: string;
  targetUserId: string;
  message: string;
  swipeId: string;
  createdAt: Date;
  read: boolean;
  readAt: Date | null;
}

export interface SuperLikeRequest {
  userId: string;
  targetUserId: string;
  message?: string;
}

export interface SuperLikeQuota {
  userId: string;
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  isPremium: boolean;
  nextResetAt: Date;
}

export class SuperLikeService {
  private db: Knex;

  // Super Like configurations
  private readonly FREE_DAILY_LIMIT = 1;
  private readonly PREMIUM_DAILY_LIMIT = 5;
  private readonly MESSAGE_MAX_LENGTH = 500;
  private readonly MESSAGE_MIN_LENGTH = 10;

  constructor(database: Knex = db) {
    this.db = database;
  }

  /**
   * Send a Super Like with optional message
   */
  async sendSuperLike(request: SuperLikeRequest): Promise<{
    success: boolean;
    swipeId?: string;
    messageId?: string;
    match?: any;
    error?: string;
  }> {
    try {
      const { userId, targetUserId, message } = request;

      logger.info(`User ${userId} sending Super Like to ${targetUserId}`);

      // Check if already swiped
      const existingSwipe = await swipeRepository.hasUserSwiped(userId, targetUserId);
      if (existingSwipe) {
        return {
          success: false,
          error: 'Already swiped on this user',
        };
      }

      // Check Super Like quota
      const quota = await this.getSuperLikeQuota(userId);
      if (quota.remainingToday <= 0) {
        return {
          success: false,
          error: 'Daily Super Like limit reached',
        };
      }

      // Validate message if provided
      if (message) {
        const messageValidation = this.validateMessage(message);
        if (!messageValidation.valid) {
          return {
            success: false,
            error: messageValidation.error,
          };
        }
      }

      // Create Super Like swipe
      const swipe = await swipeRepository.create({
        userId,
        targetUserId,
        action: SwipeAction.SUPER_LIKE,
      });

      // Store message if provided
      let messageId: string | undefined;
      if (message) {
        messageId = await this.storeSuperLikeMessage({
          userId,
          targetUserId,
          message,
          swipeId: swipe.id,
        });
      }

      // Send notification to target user
      await notificationServiceClient.notifySuperLike({
        userId: targetUserId,
        superLikerId: userId,
        hasMessage: !!message,
        messagePreview: message ? message.substring(0, 50) : undefined,
      });

      // Track analytics
      await analyticsServiceClient.trackEvent({
        userId,
        eventType: 'super_like_sent',
        eventData: {
          targetUserId,
          hasMessage: !!message,
          swipeId: swipe.id,
        },
      });

      // Check for mutual like (match)
      const isMutualLike = await swipeRepository.checkMutualLike(userId, targetUserId);

      let match;
      if (isMutualLike) {
        // Match logic handled by swipe service
        logger.info(`Super Like resulted in match: ${userId} <-> ${targetUserId}`);
        match = { matched: true };
      }

      logger.info(`Super Like sent successfully from ${userId} to ${targetUserId}`);

      return {
        success: true,
        swipeId: swipe.id,
        messageId,
        match,
      };
    } catch (error) {
      logger.error('Failed to send Super Like', error);
      throw error;
    }
  }

  /**
   * Store Super Like message
   */
  private async storeSuperLikeMessage(data: {
    userId: string;
    targetUserId: string;
    message: string;
    swipeId: string;
  }): Promise<string> {
    try {
      const [messageRecord] = await this.db('super_like_messages')
        .insert({
          user_id: data.userId,
          target_user_id: data.targetUserId,
          message: data.message,
          swipe_id: data.swipeId,
          read: false,
        })
        .returning('id');

      return messageRecord.id;
    } catch (error) {
      logger.error('Failed to store Super Like message', error);
      throw error;
    }
  }

  /**
   * Get Super Like messages received by a user
   */
  async getReceivedSuperLikes(
    userId: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean }
  ): Promise<SuperLikeMessage[]> {
    try {
      const { limit = 20, offset = 0, unreadOnly = false } = options || {};

      let query = this.db('super_like_messages')
        .where('target_user_id', userId);

      if (unreadOnly) {
        query = query.where('read', false);
      }

      const messages = await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return messages.map(this.mapToSuperLikeMessage);
    } catch (error) {
      logger.error('Failed to get received Super Likes', error);
      throw error;
    }
  }

  /**
   * Get Super Like messages sent by a user
   */
  async getSentSuperLikes(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<SuperLikeMessage[]> {
    try {
      const { limit = 20, offset = 0 } = options || {};

      const messages = await this.db('super_like_messages')
        .where('user_id', userId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return messages.map(this.mapToSuperLikeMessage);
    } catch (error) {
      logger.error('Failed to get sent Super Likes', error);
      throw error;
    }
  }

  /**
   * Get a specific Super Like message
   */
  async getSuperLikeMessage(messageId: string): Promise<SuperLikeMessage | null> {
    try {
      const message = await this.db('super_like_messages')
        .where('id', messageId)
        .first();

      return message ? this.mapToSuperLikeMessage(message) : null;
    } catch (error) {
      logger.error('Failed to get Super Like message', error);
      throw error;
    }
  }

  /**
   * Mark Super Like message as read
   */
  async markMessageAsRead(messageId: string, userId: string): Promise<boolean> {
    try {
      const updated = await this.db('super_like_messages')
        .where({
          id: messageId,
          target_user_id: userId, // Ensure only recipient can mark as read
        })
        .update({
          read: true,
          read_at: new Date(),
        });

      if (updated > 0) {
        logger.info(`Super Like message ${messageId} marked as read`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to mark message as read', error);
      throw error;
    }
  }

  /**
   * Get unread Super Like count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const result = await this.db('super_like_messages')
        .where({
          target_user_id: userId,
          read: false,
        })
        .count('* as count')
        .first();

      return parseInt(result?.count as string || '0', 10);
    } catch (error) {
      logger.error('Failed to get unread count', error);
      throw error;
    }
  }

  /**
   * Get Super Like quota for a user
   */
  async getSuperLikeQuota(userId: string): Promise<SuperLikeQuota> {
    try {
      // Check if user is premium
      const userProfile = await userServiceClient.getUserProfile(userId);
      const isPremium = userProfile?.premium || false;

      const dailyLimit = isPremium ? this.PREMIUM_DAILY_LIMIT : this.FREE_DAILY_LIMIT;

      // Get today's usage
      const usedToday = await this.getTodaySuperLikeCount(userId);
      const remainingToday = Math.max(0, dailyLimit - usedToday);

      // Calculate next reset time (midnight UTC)
      const now = new Date();
      const nextReset = new Date(now);
      nextReset.setUTCHours(24, 0, 0, 0);

      return {
        userId,
        dailyLimit,
        usedToday,
        remainingToday,
        isPremium,
        nextResetAt: nextReset,
      };
    } catch (error) {
      logger.error('Failed to get Super Like quota', error);
      throw error;
    }
  }

  /**
   * Get today's Super Like count for a user
   */
  private async getTodaySuperLikeCount(userId: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const count = await this.db('swipes')
        .where({
          user_id: userId,
          action: SwipeAction.SUPER_LIKE,
        })
        .where('created_at', '>=', today)
        .count('* as count')
        .first();

      return parseInt(count?.count as string || '0', 10);
    } catch (error) {
      logger.error('Failed to get today Super Like count', error);
      throw error;
    }
  }

  /**
   * Validate Super Like message
   */
  private validateMessage(message: string): { valid: boolean; error?: string } {
    if (!message || message.trim().length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (message.length < this.MESSAGE_MIN_LENGTH) {
      return {
        valid: false,
        error: `Message must be at least ${this.MESSAGE_MIN_LENGTH} characters`,
      };
    }

    if (message.length > this.MESSAGE_MAX_LENGTH) {
      return {
        valid: false,
        error: `Message cannot exceed ${this.MESSAGE_MAX_LENGTH} characters`,
      };
    }

    // Check for inappropriate content (basic check)
    const inappropriatePatterns = [
      /\b(spam|scam|money|crypto|investment)\b/gi,
      /\b(whatsapp|telegram|snapchat|instagram)\s*[:@]/gi,
      /\b(http|www|\.com|\.net)\b/gi,
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(message)) {
        return {
          valid: false,
          error: 'Message contains inappropriate content',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get Super Like statistics
   */
  async getSuperLikeStats(userId: string): Promise<{
    totalSent: number;
    totalReceived: number;
    matchesFromSuperLikes: number;
    responseRate: number;
  }> {
    try {
      // Total sent
      const sentCount = await this.db('swipes')
        .where({
          user_id: userId,
          action: SwipeAction.SUPER_LIKE,
        })
        .count('* as count')
        .first();

      const totalSent = parseInt(sentCount?.count as string || '0', 10);

      // Total received
      const receivedCount = await this.db('swipes')
        .where({
          target_user_id: userId,
          action: SwipeAction.SUPER_LIKE,
        })
        .count('* as count')
        .first();

      const totalReceived = parseInt(receivedCount?.count as string || '0', 10);

      // Calculate match rate (approximate - would need to query matches table)
      const matchesFromSuperLikes = 0; // Placeholder

      // Calculate response rate
      const responseRate = totalSent > 0 ? (matchesFromSuperLikes / totalSent) * 100 : 0;

      return {
        totalSent,
        totalReceived,
        matchesFromSuperLikes,
        responseRate,
      };
    } catch (error) {
      logger.error('Failed to get Super Like stats', error);
      throw error;
    }
  }

  /**
   * Delete Super Like message (sender only, within 5 minutes)
   */
  async deleteSuperLikeMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      const message = await this.getSuperLikeMessage(messageId);

      if (!message) {
        return false;
      }

      // Only sender can delete
      if (message.userId !== userId) {
        throw new Error('Unauthorized to delete this message');
      }

      // Check if message is within delete window (5 minutes)
      const now = new Date();
      const timeDiff = now.getTime() - message.createdAt.getTime();
      const DELETE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

      if (timeDiff > DELETE_WINDOW_MS) {
        throw new Error('Delete window expired');
      }

      const deleted = await this.db('super_like_messages')
        .where('id', messageId)
        .delete();

      return deleted > 0;
    } catch (error) {
      logger.error('Failed to delete Super Like message', error);
      throw error;
    }
  }

  /**
   * Map database record to SuperLikeMessage
   */
  private mapToSuperLikeMessage(record: any): SuperLikeMessage {
    return {
      id: record.id,
      userId: record.user_id,
      targetUserId: record.target_user_id,
      message: record.message,
      swipeId: record.swipe_id,
      createdAt: new Date(record.created_at),
      read: record.read,
      readAt: record.read_at ? new Date(record.read_at) : null,
    };
  }
}

export default new SuperLikeService();
