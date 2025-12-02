/**
 * Unified Notification Service
 * Orchestrates all notification channels
 */

import { db } from '../config/database';
import logger from '../utils/logger';
import {
  NotificationPayload,
  NotificationChannel,
  NotificationType,
  NotificationPreferences,
  Notification,
  UpdatePreferencesRequest,
} from '../types';
import { addNotificationJob } from '../queues/notification.queue';
import { v4 as uuidv4 } from 'uuid';

export class NotificationService {
  /**
   * Send notification through specified channels
   */
  async sendNotification(
    payload: NotificationPayload
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      // Validate payload
      if (!payload.userId || !payload.type || !payload.title || !payload.body) {
        return {
          success: false,
          error: 'Missing required fields: userId, type, title, body',
        };
      }

      // Default to all channels if not specified
      if (!payload.channels || payload.channels.length === 0) {
        payload.channels = [
          NotificationChannel.PUSH,
          NotificationChannel.EMAIL,
          NotificationChannel.IN_APP,
        ];
      }

      // Create notification record
      const notificationId = uuidv4();

      // Add to queue for async processing
      await addNotificationJob({
        ...payload,
        priority: payload.priority || 'normal',
      });

      logger.info('Notification queued successfully', {
        notificationId,
        userId: payload.userId,
        type: payload.type,
        channels: payload.channels,
      });

      return {
        success: true,
        notificationId,
      };
    } catch (error: any) {
      logger.error('Failed to send notification', {
        error: error.message,
        payload,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{
    success: boolean;
    notifications?: Notification[];
    total?: number;
    unreadCount?: number;
    error?: string;
  }> {
    try {
      const offset = (page - 1) * limit;

      let query = db('notifications').where({ user_id: userId });

      if (unreadOnly) {
        query = query.whereNull('read_at');
      }

      const notifications = await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      const [{ count: total }] = await db('notifications')
        .where({ user_id: userId })
        .count('* as count');

      const [{ count: unreadCount }] = await db('notifications')
        .where({ user_id: userId })
        .whereNull('read_at')
        .count('* as count');

      // Parse JSON data fields
      const parsedNotifications = notifications.map((n) => ({
        ...n,
        data: typeof n.data === 'string' ? JSON.parse(n.data) : n.data,
      }));

      return {
        success: true,
        notifications: parsedNotifications,
        total: parseInt(total as string),
        unreadCount: parseInt(unreadCount as string),
      };
    } catch (error: any) {
      logger.error('Failed to get notifications', {
        error: error.message,
        userId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(
    userId: string,
    notificationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await db('notifications')
        .where({ id: notificationId, user_id: userId })
        .whereNull('read_at')
        .update({
          read_at: new Date(),
          status: 'read',
        });

      if (result === 0) {
        return {
          success: false,
          error: 'Notification not found or already read',
        };
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to mark notification as read', {
        error: error.message,
        notificationId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(
    userId: string
  ): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const count = await db('notifications')
        .where({ user_id: userId })
        .whereNull('read_at')
        .update({
          read_at: new Date(),
          status: 'read',
        });

      return {
        success: true,
        count,
      };
    } catch (error: any) {
      logger.error('Failed to mark all notifications as read', {
        error: error.message,
        userId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(
    userId: string,
    notificationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await db('notifications')
        .where({ id: notificationId, user_id: userId })
        .delete();

      if (result === 0) {
        return {
          success: false,
          error: 'Notification not found',
        };
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to delete notification', {
        error: error.message,
        notificationId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(
    userId: string
  ): Promise<{ success: boolean; preferences?: NotificationPreferences; error?: string }> {
    try {
      let prefs = await db('notification_preferences')
        .where({ user_id: userId })
        .first();

      // Create default preferences if not found
      if (!prefs) {
        [prefs] = await db('notification_preferences')
          .insert({
            user_id: userId,
          })
          .returning('*');
      }

      // Map database fields to camelCase
      const preferences: NotificationPreferences = {
        userId: prefs.user_id,
        pushEnabled: prefs.push_enabled,
        pushNewMatch: prefs.push_new_match,
        pushNewMessage: prefs.push_new_message,
        pushNewLike: prefs.push_new_like,
        pushSuperLike: prefs.push_super_like,
        pushProfileView: prefs.push_profile_view,
        pushBoostExpiring: prefs.push_boost_expiring,
        pushMarketing: prefs.push_marketing,
        emailEnabled: prefs.email_enabled,
        emailNewMatch: prefs.email_new_match,
        emailNewMessage: prefs.email_new_message,
        emailWeeklyDigest: prefs.email_weekly_digest,
        emailPromotions: prefs.email_promotions,
        emailProductUpdates: prefs.email_product_updates,
        smsEnabled: prefs.sms_enabled,
        smsVerification: prefs.sms_verification,
        smsSecurityAlerts: prefs.sms_security_alerts,
        quietHoursEnabled: prefs.quiet_hours_enabled,
        quietHoursStart: prefs.quiet_hours_start,
        quietHoursEnd: prefs.quiet_hours_end,
        timezone: prefs.timezone,
      };

      return {
        success: true,
        preferences,
      };
    } catch (error: any) {
      logger.error('Failed to get preferences', {
        error: error.message,
        userId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    updates: UpdatePreferencesRequest
  ): Promise<{ success: boolean; preferences?: NotificationPreferences; error?: string }> {
    try {
      // Convert camelCase to snake_case for database
      const dbUpdates: any = {};

      if (updates.pushEnabled !== undefined) dbUpdates.push_enabled = updates.pushEnabled;
      if (updates.pushNewMatch !== undefined) dbUpdates.push_new_match = updates.pushNewMatch;
      if (updates.pushNewMessage !== undefined)
        dbUpdates.push_new_message = updates.pushNewMessage;
      if (updates.pushNewLike !== undefined) dbUpdates.push_new_like = updates.pushNewLike;
      if (updates.pushSuperLike !== undefined) dbUpdates.push_super_like = updates.pushSuperLike;
      if (updates.pushProfileView !== undefined)
        dbUpdates.push_profile_view = updates.pushProfileView;
      if (updates.pushBoostExpiring !== undefined)
        dbUpdates.push_boost_expiring = updates.pushBoostExpiring;
      if (updates.pushMarketing !== undefined) dbUpdates.push_marketing = updates.pushMarketing;
      if (updates.emailEnabled !== undefined) dbUpdates.email_enabled = updates.emailEnabled;
      if (updates.emailNewMatch !== undefined) dbUpdates.email_new_match = updates.emailNewMatch;
      if (updates.emailNewMessage !== undefined)
        dbUpdates.email_new_message = updates.emailNewMessage;
      if (updates.emailWeeklyDigest !== undefined)
        dbUpdates.email_weekly_digest = updates.emailWeeklyDigest;
      if (updates.emailPromotions !== undefined)
        dbUpdates.email_promotions = updates.emailPromotions;
      if (updates.emailProductUpdates !== undefined)
        dbUpdates.email_product_updates = updates.emailProductUpdates;
      if (updates.smsEnabled !== undefined) dbUpdates.sms_enabled = updates.smsEnabled;
      if (updates.smsVerification !== undefined)
        dbUpdates.sms_verification = updates.smsVerification;
      if (updates.smsSecurityAlerts !== undefined)
        dbUpdates.sms_security_alerts = updates.smsSecurityAlerts;
      if (updates.quietHoursEnabled !== undefined)
        dbUpdates.quiet_hours_enabled = updates.quietHoursEnabled;
      if (updates.quietHoursStart !== undefined)
        dbUpdates.quiet_hours_start = updates.quietHoursStart;
      if (updates.quietHoursEnd !== undefined) dbUpdates.quiet_hours_end = updates.quietHoursEnd;
      if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone;

      dbUpdates.updated_at = new Date();

      // Update or insert preferences
      const existing = await db('notification_preferences')
        .where({ user_id: userId })
        .first();

      if (existing) {
        await db('notification_preferences').where({ user_id: userId }).update(dbUpdates);
      } else {
        await db('notification_preferences').insert({
          user_id: userId,
          ...dbUpdates,
        });
      }

      // Get updated preferences
      return await this.getPreferences(userId);
    } catch (error: any) {
      logger.error('Failed to update preferences', {
        error: error.message,
        userId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(
    userId: string
  ): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const [{ count }] = await db('notifications')
        .where({ user_id: userId })
        .whereNull('read_at')
        .count('* as count');

      return {
        success: true,
        count: parseInt(count as string),
      };
    } catch (error: any) {
      logger.error('Failed to get unread count', {
        error: error.message,
        userId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Convenience methods for common notification types
  async notifyNewMatch(
    userId: string,
    matchUserId: string,
    matchUserName: string,
    matchUserPhoto?: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.NEW_MATCH,
      channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      title: "It's a Match!",
      body: `You and ${matchUserName} liked each other!`,
      imageUrl: matchUserPhoto,
      actionUrl: `/chat/${matchUserId}`,
      data: { matchUserId, matchUserName },
      priority: 'high',
    });
  }

  async notifyNewMessage(
    userId: string,
    senderId: string,
    senderName: string,
    messagePreview: string,
    senderPhoto?: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.NEW_MESSAGE,
      channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      title: senderName,
      body: messagePreview,
      imageUrl: senderPhoto,
      actionUrl: `/chat/${senderId}`,
      data: { senderId, senderName },
      priority: 'high',
    });
  }

  async notifyNewLike(userId: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.NEW_LIKE,
      channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      title: 'Someone likes you!',
      body: 'You have a new like. Upgrade to see who!',
      priority: 'normal',
    });
  }

  async notifyPaymentSuccess(
    userId: string,
    amount: number,
    plan: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.PAYMENT_SUCCESS,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      title: 'Payment Successful',
      body: `Your payment of $${amount} for ${plan} has been processed successfully.`,
      data: { amount, plan },
      priority: 'high',
    });
  }

  async notifyPaymentFailed(
    userId: string,
    reason: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.PAYMENT_FAILED,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      title: 'Payment Failed',
      body: `Your payment could not be processed: ${reason}`,
      data: { reason },
      priority: 'urgent',
    });
  }

  async notifyProfileBoostActive(
    userId: string,
    durationMinutes: number
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.PROFILE_BOOST_ACTIVE,
      channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      title: 'Profile Boost Active!',
      body: `Your profile is boosted for the next ${durationMinutes} minutes!`,
      data: { durationMinutes },
      priority: 'high',
    });
  }

  async notifyVerificationComplete(userId: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.VERIFICATION_COMPLETE,
      channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      title: 'Profile Verified!',
      body: 'Your profile has been successfully verified.',
      priority: 'high',
    });
  }
}

export const notificationService = new NotificationService();
