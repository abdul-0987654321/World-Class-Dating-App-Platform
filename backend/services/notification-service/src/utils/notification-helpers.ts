/**
 * Notification Helper Utilities
 *
 * Uses AWS SNS for push notifications (AWS-Only compliance)
 */

import { snsPushProvider } from '../providers/sns-push.provider';
import { notificationTemplateService } from '../services/notification-template.service';
import { quietHoursService } from '../services/quiet-hours.service';
import { NotificationType } from '../types';

// Deprecated providers - kept for backward compatibility
// import { fcmProvider } from '../providers/fcm.provider';
// import { apnsProvider } from '../providers/apns.provider';
import logger from './logger';

export interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  language?: string;
  variables: Record<string, string>;
  imageUrl?: string;
  priority?: 'high' | 'normal';
  badge?: number;
}

/**
 * Send notification with template rendering and quiet hours check
 */
export async function sendNotificationWithTemplate(params: SendNotificationParams): Promise<{
  success: boolean;
  scheduled?: boolean;
  scheduledFor?: Date;
  error?: string;
}> {
  try {
    // Check quiet hours
    const quietHoursCheck = await quietHoursService.shouldSendNow(params.userId, params.type);

    if (!quietHoursCheck.shouldSend) {
      logger.info('Notification scheduled due to quiet hours', {
        userId: params.userId,
        type: params.type,
        scheduledFor: quietHoursCheck.scheduleFor,
      });

      // TODO: Add to scheduled notifications queue
      return {
        success: true,
        scheduled: true,
        scheduledFor: quietHoursCheck.scheduleFor,
      };
    }

    // Render template
    const rendered = await notificationTemplateService.render({
      type: params.type,
      language: params.language,
      variables: params.variables,
    });

    if (!rendered.success) {
      return {
        success: false,
        error: rendered.error,
      };
    }

    // Send notification
    // This would integrate with your main notification service
    logger.info('Sending notification', {
      userId: params.userId,
      type: params.type,
      title: rendered.title,
    });

    return {
      success: true,
      scheduled: false,
    };
  } catch (error: any) {
    logger.error('Failed to send notification with template', {
      error: error.message,
      params,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Validate device tokens
 * Uses AWS SNS for endpoint validation
 */
export async function validateDeviceTokens(
  tokens: Array<{ token: string; platform: 'ios' | 'android' | 'web' }>
): Promise<{
  valid: string[];
  invalid: string[];
}> {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const { token, platform } of tokens) {
    try {
      let isValid = false;

      // Check if token is an SNS endpoint ARN
      if (token.startsWith('arn:aws:sns:')) {
        // Validate SNS endpoint
        isValid = await snsPushProvider.validateEndpoint(token);
      } else if (platform === 'ios') {
        // APNs token validation (raw token format check)
        isValid = token.length === 64 && /^[a-fA-F0-9]+$/.test(token);
      } else {
        // Android/Web token - basic format validation
        // In production, these should be registered with SNS first
        isValid = token.length > 100; // FCM tokens are typically 150+ chars
      }

      if (isValid) {
        valid.push(token);
      } else {
        invalid.push(token);
      }
    } catch (error) {
      invalid.push(token);
    }
  }

  return { valid, invalid };
}

/**
 * Calculate notification priority based on type
 */
export function calculatePriority(type: NotificationType): 'high' | 'normal' {
  const highPriorityTypes = [
    NotificationType.VIDEO_CALL_INCOMING,
    NotificationType.NEW_MATCH,
    NotificationType.NEW_MESSAGE,
    NotificationType.MATCH_EXPIRING,
  ];

  return highPriorityTypes.includes(type) ? 'high' : 'normal';
}

/**
 * Get notification category/channel based on type
 */
export function getNotificationCategory(type: NotificationType): string {
  const categoryMap: Record<NotificationType, string> = {
    [NotificationType.NEW_MATCH]: 'matches',
    [NotificationType.NEW_MESSAGE]: 'messages',
    [NotificationType.NEW_LIKE]: 'social',
    [NotificationType.SUPER_LIKE]: 'social',
    [NotificationType.PROFILE_VIEW]: 'social',
    [NotificationType.MATCH_EXPIRING]: 'matches',
    [NotificationType.DAILY_PICKS]: 'engagement',
    [NotificationType.BOOST_ACTIVATED]: 'features',
    [NotificationType.SUBSCRIPTION_UPDATE]: 'account',
    [NotificationType.SUBSCRIPTION_EXPIRING]: 'account',
    [NotificationType.PAYMENT_SUCCESS]: 'account',
    [NotificationType.PAYMENT_FAILED]: 'account',
    [NotificationType.PROFILE_BOOST_ACTIVE]: 'features',
    [NotificationType.VERIFICATION_COMPLETE]: 'account',
    [NotificationType.VIDEO_CALL_INCOMING]: 'calls',
    [NotificationType.ACHIEVEMENT_UNLOCKED]: 'gamification',
    [NotificationType.REMINDER]: 'engagement',
    [NotificationType.SECURITY_ALERT]: 'security',
    [NotificationType.SPEED_DATING]: 'events',
  };

  return categoryMap[type] || 'default';
}

/**
 * Get notification sound based on type
 */
export function getNotificationSound(type: NotificationType): string {
  const soundMap: Record<string, string> = {
    [NotificationType.NEW_MATCH]: 'match_sound',
    [NotificationType.NEW_MESSAGE]: 'message_sound',
    [NotificationType.VIDEO_CALL_INCOMING]: 'call_sound',
    [NotificationType.SUPER_LIKE]: 'super_like_sound',
  };

  return soundMap[type] || 'default';
}

/**
 * Format notification data for deep linking
 */
export function formatNotificationData(
  type: NotificationType,
  data: Record<string, any>
): Record<string, string> {
  // Convert all values to strings (required by FCM)
  const stringData: Record<string, string> = {
    type,
  };

  Object.keys(data).forEach((key) => {
    const value = data[key];
    stringData[key] = typeof value === 'string' ? value : JSON.stringify(value);
  });

  return stringData;
}

/**
 * Batch notifications by user preference
 */
export function shouldBatchNotification(type: NotificationType): boolean {
  // Don't batch urgent notifications
  const urgentTypes = [
    NotificationType.VIDEO_CALL_INCOMING,
    NotificationType.NEW_MATCH,
    NotificationType.MATCH_EXPIRING,
  ];

  return !urgentTypes.includes(type);
}

/**
 * Get optimal time to send notification
 */
export async function getOptimalSendTime(userId: string, type: NotificationType): Promise<Date> {
  // For urgent notifications, send immediately
  if (!shouldBatchNotification(type)) {
    return new Date();
  }

  // Otherwise, check quiet hours and get optimal time
  return await quietHoursService.getOptimalSendTime(userId);
}

/**
 * Format relative time for notifications
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Truncate notification body
 */
export function truncateBody(body: string, maxLength: number = 100): string {
  if (body.length <= maxLength) return body;
  return body.substring(0, maxLength - 3) + '...';
}

/**
 * Check if notification should bypass quiet hours
 */
export function shouldBypassQuietHours(type: NotificationType): boolean {
  const urgentTypes = [
    NotificationType.VIDEO_CALL_INCOMING,
    NotificationType.SECURITY_ALERT,
    NotificationType.PAYMENT_FAILED,
  ];

  return urgentTypes.includes(type);
}

export default {
  sendNotificationWithTemplate,
  validateDeviceTokens,
  calculatePriority,
  getNotificationCategory,
  getNotificationSound,
  formatNotificationData,
  shouldBatchNotification,
  getOptimalSendTime,
  formatRelativeTime,
  truncateBody,
  shouldBypassQuietHours,
};
