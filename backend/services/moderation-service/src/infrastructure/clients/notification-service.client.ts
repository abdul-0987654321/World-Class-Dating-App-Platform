import { createLogger } from '../../utils/logger';
import { ServiceClient } from '../../utils/service-client';

const logger = createLogger('notification-client');

interface SendNotificationDto {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  channel?: 'push' | 'email' | 'sms' | 'all';
}

export class NotificationServiceClient {
  private client: ServiceClient;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';
    this.client = new ServiceClient({
      baseUrl: this.baseUrl,
      serviceName: 'moderation-service',
      timeout: 5000,
    });
  }

  /**
   * Send a notification to a user
   */
  async sendNotification(data: SendNotificationDto): Promise<void> {
    try {
      await this.client.post('/api/internal/notifications/send', data);
      logger.info(`Notification sent to user ${data.userId}: ${data.type}`);
    } catch (error: any) {
      // Don't throw - notifications are non-critical
      logger.warn(`Failed to send notification to user ${data.userId}: ${error.message}`);
    }
  }

  /**
   * Notify user that their content was rejected
   */
  async notifyContentRejected(
    userId: string,
    contentType: string,
    reason: string,
    violations: string[]
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'content_moderation',
      title: 'Content Rejected',
      body: `Your ${contentType} was rejected due to policy violations: ${reason}`,
      data: {
        contentType,
        reason,
        violations,
        action: 'rejected',
      },
      channel: 'push',
    });
  }

  /**
   * Notify user that their content was flagged for review
   */
  async notifyContentFlagged(userId: string, contentType: string, reason: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'content_moderation',
      title: 'Content Under Review',
      body: `Your ${contentType} has been flagged for manual review: ${reason}`,
      data: {
        contentType,
        reason,
        action: 'flagged',
      },
      channel: 'push',
    });
  }

  /**
   * Notify user of a warning
   */
  async notifyUserWarning(userId: string, violationCount: number, reason: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'account_warning',
      title: 'Community Guidelines Warning',
      body: `You have received a warning for violating our community guidelines. Total violations: ${violationCount}. Reason: ${reason}`,
      data: {
        violationCount,
        reason,
        action: 'warning',
      },
      channel: 'all',
    });
  }

  /**
   * Notify user of suspension
   */
  async notifyUserSuspended(userId: string, suspensionEndsAt: Date, reason: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'account_suspended',
      title: 'Account Suspended',
      body: `Your account has been suspended until ${suspensionEndsAt.toLocaleDateString()} due to: ${reason}`,
      data: {
        suspensionEndsAt: suspensionEndsAt.toISOString(),
        reason,
        action: 'suspended',
      },
      channel: 'all',
    });
  }

  /**
   * Notify user of unsuspension
   */
  async notifyUserUnsuspended(userId: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'account_unsuspended',
      title: 'Account Reactivated',
      body: 'Your account suspension has been lifted. Welcome back!',
      data: {
        action: 'unsuspended',
      },
      channel: 'all',
    });
  }

  /**
   * Notify user of permanent ban
   */
  async notifyUserBanned(userId: string, reason: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'account_banned',
      title: 'Account Permanently Banned',
      body: `Your account has been permanently banned due to severe violations: ${reason}`,
      data: {
        reason,
        action: 'banned',
      },
      channel: 'all',
    });
  }

  /**
   * Notify user of unban
   */
  async notifyUserUnbanned(userId: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'account_unbanned',
      title: 'Account Ban Lifted',
      body: 'Your account ban has been lifted. You can now use the platform again.',
      data: {
        action: 'unbanned',
      },
      channel: 'all',
    });
  }
}

export default new NotificationServiceClient();
