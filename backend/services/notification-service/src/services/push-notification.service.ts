/**
 * Push Notification Service
 * Handles Firebase Cloud Messaging (FCM) for push notifications
 * Supports: New matches, messages, likes, super likes
 */

import admin from 'firebase-admin';
import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App;

export const initializeFirebase = (serviceAccountPath?: string) => {
  if (!firebaseApp) {
    try {
      const serviceAccount = serviceAccountPath
        ? require(serviceAccountPath)
        : process.env.FIREBASE_SERVICE_ACCOUNT
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
          : null;

      if (!serviceAccount) {
        console.warn('Firebase service account not configured. Push notifications disabled.');
        return;
      }

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
    }
  }
  return firebaseApp;
};

// Notification Types
export enum NotificationType {
  NEW_MATCH = 'new_match',
  NEW_MESSAGE = 'new_message',
  NEW_LIKE = 'new_like',
  SUPER_LIKE = 'super_like',
  MESSAGE_READ = 'message_read',
  PROFILE_VIEW = 'profile_view',
  REMINDER = 'reminder',
  PROMO = 'promo',
}

interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  deepLink?: string;
}

interface FCMToken {
  id: string;
  user_id: string;
  token: string;
  device_type: 'ios' | 'android' | 'web';
  device_name?: string;
  created_at: Date;
  last_used_at: Date;
}

interface NotificationHistory {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
  read: boolean;
  created_at: Date;
}

export class PushNotificationService {
  /**
   * Register FCM token for a user device
   */
  async registerToken(
    userId: string,
    token: string,
    deviceType: 'ios' | 'android' | 'web',
    deviceName?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if token already exists
      const existing = await db('fcm_tokens')
        .where({ user_id: userId, token })
        .first();

      if (existing) {
        // Update last used time
        await db('fcm_tokens')
          .where({ id: existing.id })
          .update({ last_used_at: new Date() });

        return { success: true };
      }

      // Insert new token
      await db('fcm_tokens').insert({
        id: uuidv4(),
        user_id: userId,
        token,
        device_type: deviceType,
        device_name: deviceName,
        created_at: new Date(),
        last_used_at: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error('Error registering FCM token:', error);
      return { success: false, error: 'Failed to register device token' };
    }
  }

  /**
   * Unregister FCM token
   */
  async unregisterToken(
    userId: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db('fcm_tokens')
        .where({ user_id: userId, token })
        .delete();

      return { success: true };
    } catch (error) {
      console.error('Error unregistering FCM token:', error);
      return { success: false, error: 'Failed to unregister device token' };
    }
  }

  /**
   * Get all tokens for a user
   */
  async getUserTokens(userId: string): Promise<FCMToken[]> {
    try {
      const tokens = await db('fcm_tokens')
        .where({ user_id: userId })
        .orderBy('last_used_at', 'desc');

      return tokens;
    } catch (error) {
      console.error('Error fetching user tokens:', error);
      return [];
    }
  }

  /**
   * Send push notification to a user
   */
  async sendNotification(
    userId: string,
    payload: NotificationPayload
  ): Promise<{ success: boolean; sent: number; failed: number; error?: string }> {
    try {
      if (!firebaseApp) {
        return { success: false, sent: 0, failed: 0, error: 'Firebase not initialized' };
      }

      // Check user's notification preferences
      const user = await db('users').where({ id: userId }).first();
      if (!user) {
        return { success: false, sent: 0, failed: 0, error: 'User not found' };
      }

      // Check if push notifications are enabled
      if (!user.push_notifications_enabled) {
        return { success: false, sent: 0, failed: 0, error: 'Push notifications disabled' };
      }

      // Check specific notification type preferences
      const notificationTypeEnabled = this.isNotificationTypeEnabled(user, payload.type);
      if (!notificationTypeEnabled) {
        return { success: false, sent: 0, failed: 0, error: 'Notification type disabled' };
      }

      // Get all active tokens for the user
      const tokens = await this.getUserTokens(userId);
      if (tokens.length === 0) {
        return { success: false, sent: 0, failed: 0, error: 'No registered devices' };
      }

      // Build FCM message
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: {
          type: payload.type,
          deepLink: payload.deepLink || '',
          ...payload.data,
        },
        tokens: tokens.map(t => t.token),
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'flamoral_notifications',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
        },
        webpush: {
          notification: {
            icon: '/logo192.png',
            badge: '/logo192.png',
          },
        },
      };

      // Send to FCM (using sendEachForMulticast - the modern replacement for deprecated sendMulticast)
      const response = await admin.messaging().sendEachForMulticast(message);

      // Handle failed tokens (remove invalid ones)
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            // Remove invalid or unregistered tokens
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              failedTokens.push(tokens[idx].token);
            }
          }
        });

        // Delete failed tokens
        if (failedTokens.length > 0) {
          await db('fcm_tokens').whereIn('token', failedTokens).delete();
        }
      }

      // Save to notification history
      await this.saveNotificationHistory(userId, payload);

      return {
        success: true,
        sent: response.successCount,
        failed: response.failureCount,
      };
    } catch (error) {
      console.error('Error sending push notification:', error);
      return { success: false, sent: 0, failed: 0, error: 'Failed to send notification' };
    }
  }

  /**
   * Check if notification type is enabled for user
   */
  private isNotificationTypeEnabled(user: any, type: NotificationType): boolean {
    switch (type) {
      case NotificationType.NEW_MATCH:
        return user.notify_new_matches !== false;
      case NotificationType.NEW_MESSAGE:
        return user.notify_new_messages !== false;
      case NotificationType.NEW_LIKE:
        return user.notify_likes !== false;
      case NotificationType.SUPER_LIKE:
        return user.notify_super_likes !== false;
      case NotificationType.MESSAGE_READ:
        return user.notify_message_read !== false;
      case NotificationType.PROFILE_VIEW:
        return user.notify_profile_views !== false;
      default:
        return true;
    }
  }

  /**
   * Save notification to history
   */
  private async saveNotificationHistory(
    userId: string,
    payload: NotificationPayload
  ): Promise<void> {
    try {
      await db('notifications').insert({
        id: uuidv4(),
        user_id: userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: JSON.stringify(payload.data || {}),
        read: false,
        created_at: new Date(),
      });
    } catch (error) {
      console.error('Error saving notification history:', error);
    }
  }

  /**
   * Get notification history for a user
   */
  async getNotificationHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ success: boolean; notifications?: NotificationHistory[]; total?: number; error?: string }> {
    try {
      const notifications = await db('notifications')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db('notifications')
        .where({ user_id: userId })
        .count('* as count');

      // Parse JSON data
      const parsedNotifications = notifications.map(n => ({
        ...n,
        data: typeof n.data === 'string' ? JSON.parse(n.data) : n.data,
      }));

      return {
        success: true,
        notifications: parsedNotifications,
        total: parseInt(count as string),
      };
    } catch (error) {
      console.error('Error fetching notification history:', error);
      return { success: false, error: 'Failed to fetch notifications' };
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
        .update({ read: true });

      if (result === 0) {
        return { success: false, error: 'Notification not found' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: 'Failed to mark notification as read' };
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await db('notifications')
        .where({ user_id: userId, read: false })
        .update({ read: true });

      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: 'Failed to mark notifications as read' };
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const [{ count }] = await db('notifications')
        .where({ user_id: userId, read: false })
        .count('* as count');

      return { success: true, count: parseInt(count as string) };
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return { success: false, error: 'Failed to fetch unread count' };
    }
  }

  /**
   * Delete old notifications (cleanup job)
   */
  async deleteOldNotifications(daysOld: number = 90): Promise<{ success: boolean; deleted?: number; error?: string }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deleted = await db('notifications')
        .where('created_at', '<', cutoffDate)
        .delete();

      return { success: true, deleted };
    } catch (error) {
      console.error('Error deleting old notifications:', error);
      return { success: false, error: 'Failed to delete old notifications' };
    }
  }

  // ===== NOTIFICATION HELPERS =====

  /**
   * Send new match notification
   */
  async notifyNewMatch(
    userId: string,
    matchUserId: string,
    matchUserName: string,
    matchUserPhoto?: string
  ): Promise<void> {
    await this.sendNotification(userId, {
      type: NotificationType.NEW_MATCH,
      title: "It's a Match! 🎉",
      body: `You matched with ${matchUserName}!`,
      imageUrl: matchUserPhoto,
      deepLink: `/chat/${matchUserId}`,
      data: {
        matchUserId,
        matchUserName,
      },
    });
  }

  /**
   * Send new message notification
   */
  async notifyNewMessage(
    userId: string,
    senderId: string,
    senderName: string,
    messagePreview: string,
    senderPhoto?: string
  ): Promise<void> {
    await this.sendNotification(userId, {
      type: NotificationType.NEW_MESSAGE,
      title: `${senderName}`,
      body: messagePreview,
      imageUrl: senderPhoto,
      deepLink: `/chat/${senderId}`,
      data: {
        senderId,
        senderName,
      },
    });
  }

  /**
   * Send new like notification
   */
  async notifyNewLike(
    userId: string,
    likerId: string,
    likerName: string,
    likerPhoto?: string
  ): Promise<void> {
    await this.sendNotification(userId, {
      type: NotificationType.NEW_LIKE,
      title: 'Someone likes you! 💕',
      body: `${likerName} liked your profile`,
      imageUrl: likerPhoto,
      deepLink: `/profile/${likerId}`,
      data: {
        likerId,
        likerName,
      },
    });
  }

  /**
   * Send super like notification
   */
  async notifySuperLike(
    userId: string,
    likerId: string,
    likerName: string,
    likerPhoto?: string
  ): Promise<void> {
    await this.sendNotification(userId, {
      type: NotificationType.SUPER_LIKE,
      title: 'You got a Super Like! ⭐',
      body: `${likerName} super liked you!`,
      imageUrl: likerPhoto,
      deepLink: `/profile/${likerId}`,
      data: {
        likerId,
        likerName,
      },
    });
  }
}

export const pushNotificationService = new PushNotificationService();
