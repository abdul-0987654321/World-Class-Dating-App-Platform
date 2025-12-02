/**
 * Notification Service Client
 * Handles communication with the notification service
 */

import { ServiceClient } from '@flamoral/shared';
import { createLogger } from '@flamoral/shared';
import config from '../../config';

const logger = createLogger('notification-service-client');

interface SendNotificationDto {
  userId: string;
  type: 'new_match' | 'new_message' | 'new_like' | 'subscription_update' | 'payment_success' | 'payment_failed' | 'profile_boost_active' | 'verification_complete';
  title: string;
  body: string;
  data?: Record<string, any>;
  channel?: 'push' | 'email' | 'sms' | 'all';
}

export class NotificationServiceClient {
  private client: ServiceClient;
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.services.notificationServiceUrl;
    this.client = new ServiceClient({
      baseURL: this.baseUrl,
      serviceName: 'matching-service',
      timeout: 5000,
      maxRetries: 2,
      retryDelay: 500,
      enableLogging: true,
      logger: {
        info: (msg, meta) => logger.info(msg, meta),
        warn: (msg, meta) => logger.warn(msg, meta),
        error: (msg, meta) => logger.error(msg, meta),
        debug: (msg, meta) => logger.debug(msg, meta),
      },
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
   * Send match notification to a user
   */
  async notifyNewMatch(userId: string, matchedUserId: string, matchId: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'new_match',
      title: 'It\'s a Match!',
      body: 'You have a new match! Start chatting now.',
      data: {
        matchedUserId,
        matchId,
        action: 'view_match',
      },
      channel: 'push',
    });
  }

  /**
   * Send bulk match notifications
   */
  async notifyBothUsersOfMatch(user1Id: string, user2Id: string, matchId: string): Promise<void> {
    // Send notifications to both users in parallel
    await Promise.allSettled([
      this.notifyNewMatch(user1Id, user2Id, matchId),
      this.notifyNewMatch(user2Id, user1Id, matchId),
    ]);
  }
}

export default new NotificationServiceClient();
