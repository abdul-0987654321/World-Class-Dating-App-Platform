/**
 * Notification Worker
 * Sends push notifications via Firebase
 * Sends emails via SendGrid
 * Queues and batches notifications
 */

import { Job } from 'bull';
import { createLogger } from '@flamoral/shared';
import axios from 'axios';
import {
  BaseWorker,
  WorkerQueueName,
  BaseJobData,
  JobResult,
  JobPriority,
} from './base-worker';

const logger = createLogger('notification-worker');

// Service URLs
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';

// Notification channels
export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
}

// Notification priority
export enum NotificationPriority {
  URGENT = 'urgent',
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low',
}

// Notification types
export enum NotificationType {
  NEW_MATCH = 'new_match',
  NEW_MESSAGE = 'new_message',
  NEW_LIKE = 'new_like',
  SUPER_LIKE = 'super_like',
  PROFILE_VIEW = 'profile_view',
  MISSED_CALL = 'missed_call',
  VERIFICATION_UPDATE = 'verification_update',
  SUBSCRIPTION_UPDATE = 'subscription_update',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  MODERATION_WARNING = 'moderation_warning',
  MARKETING = 'marketing',
  SYSTEM = 'system',
}

// Job data interfaces
export interface NotificationJobData extends BaseJobData {
  type: 'send_notification' | 'send_batch' | 'send_scheduled' | 'process_digest' | 'clean_old';
  userId?: string;
  userIds?: string[];
  notificationType?: NotificationType;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  title?: string;
  body?: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  scheduledAt?: string;
  batchId?: string;
  templateId?: string;
  templateData?: Record<string, any>;
}

export interface NotificationResult {
  notificationId?: string;
  userId?: string;
  sent: boolean;
  channels: {
    channel: NotificationChannel;
    success: boolean;
    error?: string;
  }[];
  batchCount?: number;
}

/**
 * Notification Worker
 */
export class NotificationWorker extends BaseWorker<NotificationJobData, NotificationResult> {
  constructor() {
    super(WorkerQueueName.NOTIFICATION, 20); // High concurrency for notifications
  }

  /**
   * Process notification job
   */
  protected async processJob(job: Job<NotificationJobData>): Promise<JobResult<NotificationResult>> {
    const { type, userId, notificationType } = job.data;
    const startTime = Date.now();

    try {
      let result: NotificationResult;

      switch (type) {
        case 'send_notification':
          result = await this.sendNotification(job.data);
          break;

        case 'send_batch':
          result = await this.sendBatchNotifications(job.data);
          break;

        case 'send_scheduled':
          result = await this.sendScheduledNotification(job.data);
          break;

        case 'process_digest':
          result = await this.processDigestNotifications(job.data);
          break;

        case 'clean_old':
          result = await this.cleanOldNotifications();
          break;

        default:
          throw new Error(`Unknown notification type: ${type}`);
      }

      await job.progress(100);

      logger.info(`Notification processed`, {
        type,
        correlationId: job.data.correlationId,
        userId,
        notificationType,
        sent: result.sent,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      logger.error(`Notification processing failed`, {
        type,
        correlationId: job.data.correlationId,
        userId,
        notificationType,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send a single notification
   */
  private async sendNotification(jobData: NotificationJobData): Promise<NotificationResult> {
    const {
      userId,
      notificationType,
      channels = [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      priority = NotificationPriority.NORMAL,
      title,
      body,
      data,
      imageUrl,
      actionUrl,
      templateId,
      templateData,
    } = jobData;

    if (!userId) {
      throw new Error('userId is required');
    }

    const results: NotificationResult['channels'] = [];
    let notificationId: string | undefined;

    try {
      // Get user preferences
      const userPrefs = await this.getUserNotificationPreferences(userId);

      // Check quiet hours
      if (this.isQuietHours(userPrefs)) {
        logger.info(`Skipping notification for user ${userId} - quiet hours`);
        return {
          userId,
          sent: false,
          channels: [
            {
              channel: NotificationChannel.PUSH,
              success: false,
              error: 'User in quiet hours',
            },
          ],
        };
      }

      // Render template if provided
      let finalTitle = title;
      let finalBody = body;

      if (templateId) {
        const rendered = await this.renderTemplate(templateId, templateData || {});
        finalTitle = rendered.title || title;
        finalBody = rendered.body || body;
      }

      // Send to each channel
      for (const channel of channels) {
        if (!this.isChannelEnabled(channel, notificationType!, userPrefs)) {
          results.push({
            channel,
            success: false,
            error: 'Channel disabled by user preferences',
          });
          continue;
        }

        try {
          let channelResult: { success: boolean; notificationId?: string; error?: string };

          switch (channel) {
            case NotificationChannel.PUSH:
              channelResult = await this.sendPushNotification(
                userId,
                finalTitle!,
                finalBody!,
                data,
                imageUrl,
                priority
              );
              break;

            case NotificationChannel.EMAIL:
              channelResult = await this.sendEmailNotification(
                userId,
                finalTitle!,
                finalBody!,
                data,
                actionUrl
              );
              break;

            case NotificationChannel.SMS:
              channelResult = await this.sendSMSNotification(userId, finalBody!);
              break;

            case NotificationChannel.IN_APP:
              channelResult = await this.saveInAppNotification(
                userId,
                notificationType!,
                finalTitle!,
                finalBody!,
                data,
                imageUrl,
                actionUrl
              );
              break;

            default:
              channelResult = { success: false, error: `Unknown channel: ${channel}` };
          }

          results.push({
            channel,
            success: channelResult.success,
            error: channelResult.error,
          });

          if (channelResult.notificationId) {
            notificationId = channelResult.notificationId;
          }
        } catch (error: any) {
          results.push({
            channel,
            success: false,
            error: error.message,
          });
        }
      }

      const anySent = results.some((r) => r.success);

      return {
        notificationId,
        userId,
        sent: anySent,
        channels: results,
      };
    } catch (error: any) {
      logger.error(`Failed to send notification to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send batch notifications
   */
  private async sendBatchNotifications(jobData: NotificationJobData): Promise<NotificationResult> {
    const { userIds, notificationType, title, body, data, channels } = jobData;

    if (!userIds || userIds.length === 0) {
      throw new Error('userIds is required for batch notifications');
    }

    let sentCount = 0;
    const results: NotificationResult['channels'] = [];

    // Process in smaller batches for efficiency
    const batchSize = 100;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (userId) => {
          try {
            const result = await this.sendNotification({
              ...jobData,
              type: 'send_notification',
              userId,
            });

            if (result.sent) {
              sentCount++;
            }
          } catch (error: any) {
            logger.error(`Failed to send batch notification to ${userId}:`, error);
          }
        })
      );

      // Rate limiting between batches
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    logger.info(`Batch notification sent to ${sentCount}/${userIds.length} users`);

    return {
      sent: sentCount > 0,
      channels: [
        {
          channel: NotificationChannel.PUSH,
          success: sentCount > 0,
        },
      ],
      batchCount: sentCount,
    };
  }

  /**
   * Send scheduled notification
   */
  private async sendScheduledNotification(jobData: NotificationJobData): Promise<NotificationResult> {
    const { scheduledAt } = jobData;

    // Check if it's time to send
    if (scheduledAt && new Date(scheduledAt) > new Date()) {
      logger.debug(`Notification not yet due, rescheduling`);

      // Re-queue with delay
      await this.addJob(jobData, {
        delay: new Date(scheduledAt).getTime() - Date.now(),
      });

      return {
        sent: false,
        channels: [],
      };
    }

    // Send the notification
    return await this.sendNotification({
      ...jobData,
      type: 'send_notification',
    });
  }

  /**
   * Process digest notifications (aggregate multiple notifications into one)
   */
  private async processDigestNotifications(jobData: NotificationJobData): Promise<NotificationResult> {
    const { userId } = jobData;

    if (!userId) {
      throw new Error('userId is required for digest');
    }

    try {
      // Get pending notifications for digest
      const pendingNotifications = await this.getPendingDigestNotifications(userId);

      if (pendingNotifications.length === 0) {
        return {
          userId,
          sent: false,
          channels: [],
        };
      }

      // Group by type
      const grouped = this.groupNotifications(pendingNotifications);

      // Create digest content
      const digestContent = this.createDigestContent(grouped);

      // Send digest
      const result = await this.sendNotification({
        ...jobData,
        type: 'send_notification',
        notificationType: NotificationType.SYSTEM,
        title: digestContent.title,
        body: digestContent.body,
        data: digestContent.data,
        channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
      });

      // Mark notifications as digested
      await this.markNotificationsAsDigested(pendingNotifications.map((n) => n.id));

      return result;
    } catch (error: any) {
      logger.error(`Failed to process digest for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Clean old notifications
   */
  private async cleanOldNotifications(): Promise<NotificationResult> {
    try {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days

      const response = await axios.delete(
        `${NOTIFICATION_SERVICE_URL}/api/v1/internal/notifications/old`,
        {
          params: {
            before: cutoffDate.toISOString(),
          },
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 30000,
        }
      );

      logger.info(`Cleaned ${response.data.deletedCount} old notifications`);

      return {
        sent: true,
        channels: [],
        batchCount: response.data.deletedCount,
      };
    } catch (error: any) {
      logger.error('Failed to clean old notifications:', error);
      throw error;
    }
  }

  // Helper methods

  private async getUserNotificationPreferences(userId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${NOTIFICATION_SERVICE_URL}/api/v1/internal/preferences/${userId}`,
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      return response.data;
    } catch (error) {
      // Return default preferences
      return {
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'UTC',
      };
    }
  }

  private isQuietHours(prefs: any): boolean {
    if (!prefs.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      timeZone: prefs.timezone || 'UTC',
    });

    const start = prefs.quietHoursStart || '22:00';
    const end = prefs.quietHoursEnd || '08:00';

    // Handle overnight quiet hours
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }

    return currentTime >= start && currentTime < end;
  }

  private isChannelEnabled(
    channel: NotificationChannel,
    notificationType: NotificationType,
    prefs: any
  ): boolean {
    switch (channel) {
      case NotificationChannel.PUSH:
        if (!prefs.pushEnabled) return false;
        // Check type-specific preferences
        switch (notificationType) {
          case NotificationType.NEW_MATCH:
            return prefs.pushNewMatch !== false;
          case NotificationType.NEW_MESSAGE:
            return prefs.pushNewMessage !== false;
          case NotificationType.NEW_LIKE:
            return prefs.pushNewLike !== false;
          case NotificationType.MARKETING:
            return prefs.pushMarketing === true;
          default:
            return true;
        }

      case NotificationChannel.EMAIL:
        if (!prefs.emailEnabled) return false;
        switch (notificationType) {
          case NotificationType.NEW_MATCH:
            return prefs.emailNewMatch !== false;
          case NotificationType.NEW_MESSAGE:
            return prefs.emailNewMessage !== false;
          case NotificationType.MARKETING:
            return prefs.emailMarketing === true;
          default:
            return true;
        }

      case NotificationChannel.SMS:
        if (!prefs.smsEnabled) return false;
        // SMS only for verification and security
        return [NotificationType.VERIFICATION_UPDATE, NotificationType.SYSTEM].includes(notificationType);

      case NotificationChannel.IN_APP:
        return true; // Always enabled

      default:
        return false;
    }
  }

  private async renderTemplate(
    templateId: string,
    data: Record<string, any>
  ): Promise<{ title: string; body: string }> {
    try {
      const response = await axios.post(
        `${NOTIFICATION_SERVICE_URL}/api/v1/internal/templates/${templateId}/render`,
        { data },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      return response.data;
    } catch (error) {
      return { title: '', body: '' };
    }
  }

  private async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
    imageUrl?: string,
    priority?: NotificationPriority
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const response = await axios.post(
        `${NOTIFICATION_SERVICE_URL}/api/v1/internal/push/send`,
        {
          userId,
          notification: {
            title,
            body,
            imageUrl,
          },
          data,
          priority: priority === NotificationPriority.URGENT ? 'high' : 'normal',
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 10000,
        }
      );

      return {
        success: response.data.success,
        notificationId: response.data.notificationId,
        error: response.data.error,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async sendEmailNotification(
    userId: string,
    subject: string,
    body: string,
    data?: Record<string, any>,
    actionUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user email
      const user = await this.getUserEmail(userId);

      if (!user?.email) {
        return { success: false, error: 'User email not found' };
      }

      const response = await axios.post(
        `${NOTIFICATION_SERVICE_URL}/api/v1/internal/email/send`,
        {
          to: user.email,
          subject,
          text: body,
          html: this.formatEmailHtml(body, actionUrl),
          data,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 15000,
        }
      );

      return {
        success: response.data.success,
        error: response.data.error,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async sendSMSNotification(
    userId: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user phone
      const user = await this.getUserPhone(userId);

      if (!user?.phone) {
        return { success: false, error: 'User phone not found' };
      }

      const response = await axios.post(
        `${NOTIFICATION_SERVICE_URL}/api/v1/internal/sms/send`,
        {
          to: user.phone,
          message,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 10000,
        }
      );

      return {
        success: response.data.success,
        error: response.data.error,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async saveInAppNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
    imageUrl?: string,
    actionUrl?: string
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const response = await axios.post(
        `${NOTIFICATION_SERVICE_URL}/api/v1/internal/in-app/save`,
        {
          userId,
          type,
          title,
          body,
          data,
          imageUrl,
          actionUrl,
          status: 'unread',
          createdAt: new Date().toISOString(),
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      return {
        success: true,
        notificationId: response.data.id,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async getUserEmail(userId: string): Promise<{ email?: string } | null> {
    try {
      const response = await axios.get(`${USER_SERVICE_URL}/api/v1/users/${userId}`, {
        headers: {
          'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
        },
        timeout: 5000,
      });

      return { email: response.data.email };
    } catch (error) {
      return null;
    }
  }

  private async getUserPhone(userId: string): Promise<{ phone?: string } | null> {
    try {
      const response = await axios.get(`${USER_SERVICE_URL}/api/v1/users/${userId}`, {
        headers: {
          'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
        },
        timeout: 5000,
      });

      return { phone: response.data.phone };
    } catch (error) {
      return null;
    }
  }

  private formatEmailHtml(body: string, actionUrl?: string): string {
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Flamoral</h1>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 16px; line-height: 1.5;">${body}</p>
    `;

    if (actionUrl) {
      html += `
          <div style="text-align: center; margin-top: 20px;">
            <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; font-weight: bold;">
              View Now
            </a>
          </div>
      `;
    }

    html += `
        </div>
        <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>You received this email because you have a Flamoral account.</p>
          <p><a href="{{unsubscribe_url}}" style="color: #666;">Unsubscribe</a></p>
        </div>
      </div>
    `;

    return html;
  }

  private async getPendingDigestNotifications(userId: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${NOTIFICATION_SERVICE_URL}/api/v1/internal/notifications/pending-digest/${userId}`,
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 10000,
        }
      );

      return response.data.notifications || [];
    } catch (error) {
      return [];
    }
  }

  private groupNotifications(notifications: any[]): Record<string, any[]> {
    return notifications.reduce((acc, notif) => {
      const type = notif.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(notif);
      return acc;
    }, {} as Record<string, any[]>);
  }

  private createDigestContent(grouped: Record<string, any[]>): {
    title: string;
    body: string;
    data: Record<string, any>;
  } {
    const counts: string[] = [];

    if (grouped[NotificationType.NEW_LIKE]?.length) {
      counts.push(`${grouped[NotificationType.NEW_LIKE].length} new like${grouped[NotificationType.NEW_LIKE].length > 1 ? 's' : ''}`);
    }
    if (grouped[NotificationType.NEW_MATCH]?.length) {
      counts.push(`${grouped[NotificationType.NEW_MATCH].length} new match${grouped[NotificationType.NEW_MATCH].length > 1 ? 'es' : ''}`);
    }
    if (grouped[NotificationType.NEW_MESSAGE]?.length) {
      counts.push(`${grouped[NotificationType.NEW_MESSAGE].length} new message${grouped[NotificationType.NEW_MESSAGE].length > 1 ? 's' : ''}`);
    }

    return {
      title: "Here's what you missed",
      body: counts.length > 0 ? `You have ${counts.join(', ')}!` : 'Check out what happened while you were away.',
      data: {
        digest: true,
        counts: grouped,
      },
    };
  }

  private async markNotificationsAsDigested(notificationIds: string[]): Promise<void> {
    try {
      await axios.post(
        `${NOTIFICATION_SERVICE_URL}/api/v1/internal/notifications/mark-digested`,
        { notificationIds },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error('Failed to mark notifications as digested:', error);
    }
  }

  // Public scheduling methods

  async scheduleNotification(
    userId: string,
    notificationType: NotificationType,
    title: string,
    body: string,
    options?: {
      channels?: NotificationChannel[];
      priority?: NotificationPriority;
      data?: Record<string, any>;
      imageUrl?: string;
      actionUrl?: string;
      scheduledAt?: Date;
    }
  ): Promise<void> {
    const jobPriority =
      options?.priority === NotificationPriority.URGENT
        ? JobPriority.CRITICAL
        : options?.priority === NotificationPriority.HIGH
        ? JobPriority.HIGH
        : JobPriority.NORMAL;

    await this.addJob(
      {
        type: options?.scheduledAt ? 'send_scheduled' : 'send_notification',
        userId,
        notificationType,
        title,
        body,
        channels: options?.channels,
        priority: options?.priority,
        data: options?.data,
        imageUrl: options?.imageUrl,
        actionUrl: options?.actionUrl,
        scheduledAt: options?.scheduledAt?.toISOString(),
      },
      {
        priority: jobPriority,
        delay: options?.scheduledAt ? options.scheduledAt.getTime() - Date.now() : 0,
      }
    );
  }

  async scheduleBatchNotification(
    userIds: string[],
    notificationType: NotificationType,
    title: string,
    body: string,
    options?: {
      channels?: NotificationChannel[];
      data?: Record<string, any>;
    }
  ): Promise<void> {
    await this.addJob(
      {
        type: 'send_batch',
        userIds,
        notificationType,
        title,
        body,
        channels: options?.channels,
        data: options?.data,
      },
      {
        priority: JobPriority.NORMAL,
      }
    );
  }

  async scheduleDigest(userId: string): Promise<void> {
    await this.addJob(
      {
        type: 'process_digest',
        userId,
      },
      {
        priority: JobPriority.LOW,
      }
    );
  }

  async scheduleCleanup(): Promise<void> {
    await this.addJob(
      {
        type: 'clean_old',
      },
      {
        priority: JobPriority.LOW,
      }
    );
  }
}

// Export singleton instance
export const notificationWorker = new NotificationWorker();
export default notificationWorker;
