/**
 * Push Notification Service
 * Handles Firebase Cloud Messaging for mobile push notifications
 * and email/SMS notifications via integrations
 */

import { logger } from '../../utils/logger';

// Types for notification service
export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  badge?: number;
  sound?: string;
  priority?: 'high' | 'normal';
}

export interface DeviceToken {
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  createdAt: Date;
  lastUsedAt: Date;
  isActive: boolean;
}

export interface NotificationPreferences {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  newMatchNotifications: boolean;
  messageNotifications: boolean;
  likeNotifications: boolean;
  superLikeNotifications: boolean;
  boostReminders: boolean;
  dailyPicksNotifications: boolean;
  eventNotifications: boolean;
  promotionalNotifications: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string;
  timezone: string;
}

export type NotificationType =
  | 'NEW_MATCH'
  | 'NEW_MESSAGE'
  | 'NEW_LIKE'
  | 'SUPER_LIKE'
  | 'BOOST_ACTIVE'
  | 'BOOST_EXPIRING'
  | 'DAILY_PICKS'
  | 'STREAK_REMINDER'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'REWARD_AVAILABLE'
  | 'EVENT_REMINDER'
  | 'PROFILE_VIEW'
  | 'REFERRAL_SIGNUP'
  | 'PROMOTIONAL';

interface NotificationTemplate {
  type: NotificationType;
  titleTemplate: string;
  bodyTemplate: string;
  requiresPreference?: keyof NotificationPreferences;
}

const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    type: 'NEW_MATCH',
    titleTemplate: "It's a Match! 💕",
    bodyTemplate: "You and {{matchName}} have liked each other!",
    requiresPreference: 'newMatchNotifications',
  },
  {
    type: 'NEW_MESSAGE',
    titleTemplate: "{{senderName}} sent you a message",
    bodyTemplate: "{{messagePreview}}",
    requiresPreference: 'messageNotifications',
  },
  {
    type: 'NEW_LIKE',
    titleTemplate: "Someone likes you! ❤️",
    bodyTemplate: "You have a new like. Check who it is!",
    requiresPreference: 'likeNotifications',
  },
  {
    type: 'SUPER_LIKE',
    titleTemplate: "You got a Super Like! ⭐",
    bodyTemplate: "{{senderName}} super liked you!",
    requiresPreference: 'superLikeNotifications',
  },
  {
    type: 'BOOST_ACTIVE',
    titleTemplate: "Your Boost is active! 🚀",
    bodyTemplate: "Your profile is now being shown to more people",
    requiresPreference: 'boostReminders',
  },
  {
    type: 'BOOST_EXPIRING',
    titleTemplate: "Boost ending soon",
    bodyTemplate: "Your boost expires in 5 minutes",
    requiresPreference: 'boostReminders',
  },
  {
    type: 'DAILY_PICKS',
    titleTemplate: "Your daily picks are ready! 🎯",
    bodyTemplate: "Check out today's curated matches for you",
    requiresPreference: 'dailyPicksNotifications',
  },
  {
    type: 'STREAK_REMINDER',
    titleTemplate: "Don't lose your streak! 🔥",
    bodyTemplate: "Login now to keep your {{streakDays}}-day streak going",
  },
  {
    type: 'ACHIEVEMENT_UNLOCKED',
    titleTemplate: "Achievement Unlocked! 🏆",
    bodyTemplate: "You earned: {{achievementName}}",
  },
  {
    type: 'REWARD_AVAILABLE',
    titleTemplate: "Reward ready to claim! 🎁",
    bodyTemplate: "You have {{rewardAmount}} coins waiting for you",
  },
  {
    type: 'EVENT_REMINDER',
    titleTemplate: "Event starting soon! 📅",
    bodyTemplate: "{{eventName}} starts in {{timeUntil}}",
    requiresPreference: 'eventNotifications',
  },
  {
    type: 'PROFILE_VIEW',
    titleTemplate: "Someone viewed your profile 👀",
    bodyTemplate: "See who's checking you out!",
  },
  {
    type: 'REFERRAL_SIGNUP',
    titleTemplate: "Your friend joined! 🎉",
    bodyTemplate: "{{friendName}} signed up using your code. You earned {{rewardAmount}} coins!",
  },
  {
    type: 'PROMOTIONAL',
    titleTemplate: "{{promoTitle}}",
    bodyTemplate: "{{promoBody}}",
    requiresPreference: 'promotionalNotifications',
  },
];

class NotificationService {
  private deviceTokens: Map<string, DeviceToken[]> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private notificationQueue: Array<{ userId: string; payload: NotificationPayload; type: NotificationType }> = [];

  /**
   * Register a device token for push notifications
   */
  async registerDeviceToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web'
  ): Promise<DeviceToken> {
    const deviceToken: DeviceToken = {
      userId,
      token,
      platform,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      isActive: true,
    };

    const existingTokens = this.deviceTokens.get(userId) || [];

    // Remove duplicate tokens
    const filteredTokens = existingTokens.filter(t => t.token !== token);
    filteredTokens.push(deviceToken);

    this.deviceTokens.set(userId, filteredTokens);

    logger.info(`Device token registered for user ${userId} on ${platform}`);

    return deviceToken;
  }

  /**
   * Remove a device token
   */
  async removeDeviceToken(userId: string, token: string): Promise<boolean> {
    const existingTokens = this.deviceTokens.get(userId) || [];
    const filteredTokens = existingTokens.filter(t => t.token !== token);

    if (filteredTokens.length !== existingTokens.length) {
      this.deviceTokens.set(userId, filteredTokens);
      logger.info(`Device token removed for user ${userId}`);
      return true;
    }

    return false;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const existing = this.preferences.get(userId) || this.getDefaultPreferences(userId);
    const updated = { ...existing, ...preferences };
    this.preferences.set(userId, updated);

    logger.info(`Notification preferences updated for user ${userId}`);

    return updated;
  }

  /**
   * Get notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    return this.preferences.get(userId) || this.getDefaultPreferences(userId);
  }

  /**
   * Send push notification to a user
   */
  async sendPushNotification(
    userId: string,
    type: NotificationType,
    templateData: Record<string, string> = {}
  ): Promise<{ success: boolean; sentCount: number }> {
    const preferences = await this.getPreferences(userId);

    // Check if user has push enabled
    if (!preferences.pushEnabled) {
      logger.debug(`Push notifications disabled for user ${userId}`);
      return { success: false, sentCount: 0 };
    }

    // Check quiet hours
    if (this.isInQuietHours(preferences)) {
      logger.debug(`User ${userId} is in quiet hours, queueing notification`);
      // Queue for later delivery
      const payload = this.buildPayload(type, templateData);
      if (payload) {
        this.notificationQueue.push({ userId, payload, type });
      }
      return { success: false, sentCount: 0 };
    }

    // Find template and check preferences
    const template = NOTIFICATION_TEMPLATES.find(t => t.type === type);
    if (!template) {
      logger.warn(`No template found for notification type: ${type}`);
      return { success: false, sentCount: 0 };
    }

    // Check type-specific preference
    if (template.requiresPreference) {
      const prefKey = template.requiresPreference;
      if (!preferences[prefKey]) {
        logger.debug(`User ${userId} has ${prefKey} disabled`);
        return { success: false, sentCount: 0 };
      }
    }

    const payload = this.buildPayload(type, templateData);
    if (!payload) {
      return { success: false, sentCount: 0 };
    }

    // Get user's device tokens
    const tokens = this.deviceTokens.get(userId) || [];
    const activeTokens = tokens.filter(t => t.isActive);

    if (activeTokens.length === 0) {
      logger.debug(`No active device tokens for user ${userId}`);
      return { success: false, sentCount: 0 };
    }

    // Simulate sending to FCM (in production, this would be actual FCM API calls)
    let sentCount = 0;
    for (const deviceToken of activeTokens) {
      try {
        await this.sendToFCM(deviceToken.token, deviceToken.platform, payload);
        deviceToken.lastUsedAt = new Date();
        sentCount++;
      } catch (error) {
        logger.error(`Failed to send notification to device: ${deviceToken.token}`, error);
        // Mark token as inactive if it's invalid
        deviceToken.isActive = false;
      }
    }

    logger.info(`Sent ${sentCount} push notifications to user ${userId} (type: ${type})`);

    return { success: sentCount > 0, sentCount };
  }

  /**
   * Send notification to multiple users
   */
  async sendBulkNotification(
    userIds: string[],
    type: NotificationType,
    templateData: Record<string, string> = {}
  ): Promise<{ successCount: number; failCount: number }> {
    let successCount = 0;
    let failCount = 0;

    for (const userId of userIds) {
      const result = await this.sendPushNotification(userId, type, templateData);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    logger.info(`Bulk notification sent: ${successCount} success, ${failCount} failed`);

    return { successCount, failCount };
  }

  /**
   * Send specific notification types
   */
  async sendNewMatchNotification(userId: string, matchName: string): Promise<void> {
    await this.sendPushNotification(userId, 'NEW_MATCH', { matchName });
  }

  async sendNewMessageNotification(
    userId: string,
    senderName: string,
    messagePreview: string
  ): Promise<void> {
    await this.sendPushNotification(userId, 'NEW_MESSAGE', { senderName, messagePreview });
  }

  async sendNewLikeNotification(userId: string): Promise<void> {
    await this.sendPushNotification(userId, 'NEW_LIKE', {});
  }

  async sendSuperLikeNotification(userId: string, senderName: string): Promise<void> {
    await this.sendPushNotification(userId, 'SUPER_LIKE', { senderName });
  }

  async sendAchievementNotification(userId: string, achievementName: string): Promise<void> {
    await this.sendPushNotification(userId, 'ACHIEVEMENT_UNLOCKED', { achievementName });
  }

  async sendStreakReminderNotification(userId: string, streakDays: number): Promise<void> {
    await this.sendPushNotification(userId, 'STREAK_REMINDER', {
      streakDays: streakDays.toString()
    });
  }

  async sendRewardNotification(userId: string, rewardAmount: number): Promise<void> {
    await this.sendPushNotification(userId, 'REWARD_AVAILABLE', {
      rewardAmount: rewardAmount.toString()
    });
  }

  async sendReferralSignupNotification(
    userId: string,
    friendName: string,
    rewardAmount: number
  ): Promise<void> {
    await this.sendPushNotification(userId, 'REFERRAL_SIGNUP', {
      friendName,
      rewardAmount: rewardAmount.toString(),
    });
  }

  /**
   * Process queued notifications (called by scheduler after quiet hours)
   */
  async processNotificationQueue(): Promise<void> {
    const queue = [...this.notificationQueue];
    this.notificationQueue = [];

    for (const item of queue) {
      const preferences = await this.getPreferences(item.userId);
      if (!this.isInQuietHours(preferences)) {
        await this.sendPushNotification(item.userId, item.type, {});
      } else {
        // Re-queue if still in quiet hours
        this.notificationQueue.push(item);
      }
    }
  }

  // Private helper methods

  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      userId,
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      newMatchNotifications: true,
      messageNotifications: true,
      likeNotifications: true,
      superLikeNotifications: true,
      boostReminders: true,
      dailyPicksNotifications: true,
      eventNotifications: true,
      promotionalNotifications: false,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      timezone: 'UTC',
    };
  }

  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursEnabled) {
      return false;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes < endMinutes) {
      // Same day range (e.g., 09:00 - 17:00)
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Overnight range (e.g., 22:00 - 08:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }

  private buildPayload(
    type: NotificationType,
    templateData: Record<string, string>
  ): NotificationPayload | null {
    const template = NOTIFICATION_TEMPLATES.find(t => t.type === type);
    if (!template) {
      return null;
    }

    let title = template.titleTemplate;
    let body = template.bodyTemplate;

    // Replace template variables
    for (const [key, value] of Object.entries(templateData)) {
      title = title.replace(`{{${key}}}`, value);
      body = body.replace(`{{${key}}}`, value);
    }

    return {
      title,
      body,
      data: { type, ...templateData },
      priority: this.getPriorityForType(type),
    };
  }

  private getPriorityForType(type: NotificationType): 'high' | 'normal' {
    const highPriorityTypes: NotificationType[] = [
      'NEW_MATCH',
      'NEW_MESSAGE',
      'SUPER_LIKE',
    ];
    return highPriorityTypes.includes(type) ? 'high' : 'normal';
  }

  private async sendToFCM(
    token: string,
    platform: 'ios' | 'android' | 'web',
    payload: NotificationPayload
  ): Promise<void> {
    // In production, this would make actual FCM API calls
    // For now, we simulate the send

    const fcmMessage = {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
        image: payload.imageUrl,
      },
      data: payload.data,
      ...(platform === 'ios' && {
        apns: {
          payload: {
            aps: {
              badge: payload.badge,
              sound: payload.sound || 'default',
            },
          },
        },
      }),
      ...(platform === 'android' && {
        android: {
          priority: payload.priority,
          notification: {
            sound: payload.sound || 'default',
            channelId: 'dating_notifications',
          },
        },
      }),
    };

    logger.debug(`Sending FCM message to ${platform} device`, { token: token.slice(0, 10) + '...' });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));

    // In production: admin.messaging().send(fcmMessage);
  }
}

export const notificationService = new NotificationService();
