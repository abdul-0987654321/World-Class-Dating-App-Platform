/**
 * Message Delivery Worker
 * Ensures message delivery via WebSocket
 * Retries failed deliveries
 * Tracks delivery status
 */

import { Job } from 'bull';
import { createLogger } from '@flamoral/backend-shared';
import axios from 'axios';
import {
  BaseWorker,
  WorkerQueueName,
  BaseJobData,
  JobResult,
  JobPriority,
} from './base-worker';

const logger = createLogger('message-delivery-worker');

// Service URLs
const MESSAGING_SERVICE_URL = process.env.MESSAGING_SERVICE_URL || 'http://localhost:3005';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';

// Delivery status enum
export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

// Job data interfaces
export interface MessageDeliveryJobData extends BaseJobData {
  type: 'deliver_message' | 'retry_delivery' | 'confirm_delivery' | 'batch_delivery';
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  messageContent?: {
    type: 'text' | 'image' | 'voice' | 'gif' | 'virtual_gift';
    text?: string;
    mediaUrl?: string;
    metadata?: Record<string, any>;
  };
  deliveryAttempt?: number;
  maxRetries?: number;
  isOfflineDelivery?: boolean;
}

export interface MessageDeliveryResult {
  messageId: string;
  status: DeliveryStatus;
  deliveredVia?: 'websocket' | 'push_notification' | 'offline_queue';
  deliveryAttempt: number;
  recipientOnline: boolean;
}

/**
 * Message Delivery Worker
 */
export class MessageDeliveryWorker extends BaseWorker<MessageDeliveryJobData, MessageDeliveryResult> {
  private readonly maxDeliveryRetries = 5;
  private readonly offlineQueueTTL = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor() {
    super(WorkerQueueName.MESSAGE_DELIVERY, 20); // High concurrency for messaging
  }

  /**
   * Process message delivery job
   */
  protected async processJob(job: Job<MessageDeliveryJobData>): Promise<JobResult<MessageDeliveryResult>> {
    const { type, messageId, recipientId, deliveryAttempt = 1 } = job.data;
    const startTime = Date.now();

    try {
      let result: MessageDeliveryResult;

      switch (type) {
        case 'deliver_message':
          result = await this.deliverMessage(job.data);
          break;

        case 'retry_delivery':
          result = await this.retryDelivery(job.data);
          break;

        case 'confirm_delivery':
          result = await this.confirmDelivery(messageId, recipientId);
          break;

        case 'batch_delivery':
          result = await this.processBatchDelivery(job.data);
          break;

        default:
          throw new Error(`Unknown delivery type: ${type}`);
      }

      await job.progress(100);

      logger.info(`Message delivery completed`, {
        type,
        correlationId: job.data.correlationId,
        messageId,
        status: result.status,
        deliveredVia: result.deliveredVia,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      logger.error(`Message delivery failed`, {
        type,
        correlationId: job.data.correlationId,
        messageId,
        recipientId,
        attempt: deliveryAttempt,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Deliver a message to a recipient
   */
  private async deliverMessage(jobData: MessageDeliveryJobData): Promise<MessageDeliveryResult> {
    const {
      messageId,
      conversationId,
      senderId,
      recipientId,
      messageContent,
      deliveryAttempt = 1,
    } = jobData;

    try {
      // Step 1: Check if recipient is online
      const isOnline = await this.checkUserOnlineStatus(recipientId);

      if (isOnline) {
        // Step 2a: Deliver via WebSocket
        const wsDelivered = await this.deliverViaWebSocket(
          recipientId,
          messageId,
          conversationId,
          senderId,
          messageContent
        );

        if (wsDelivered) {
          await this.updateDeliveryStatus(messageId, DeliveryStatus.DELIVERED);

          return {
            messageId,
            status: DeliveryStatus.DELIVERED,
            deliveredVia: 'websocket',
            deliveryAttempt,
            recipientOnline: true,
          };
        }
      }

      // Step 2b: User is offline or WebSocket delivery failed - send push notification
      const pushSent = await this.sendPushNotification(
        recipientId,
        senderId,
        messageId,
        conversationId,
        messageContent
      );

      if (pushSent) {
        await this.updateDeliveryStatus(messageId, DeliveryStatus.SENT);

        // Queue for offline delivery when user comes online
        await this.queueForOfflineDelivery(jobData);

        return {
          messageId,
          status: DeliveryStatus.SENT,
          deliveredVia: 'push_notification',
          deliveryAttempt,
          recipientOnline: false,
        };
      }

      // Step 3: Queue for later delivery if all immediate methods fail
      await this.queueForOfflineDelivery(jobData);

      return {
        messageId,
        status: DeliveryStatus.PENDING,
        deliveredVia: 'offline_queue',
        deliveryAttempt,
        recipientOnline: false,
      };
    } catch (error: any) {
      logger.error(`Failed to deliver message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Retry message delivery
   */
  private async retryDelivery(jobData: MessageDeliveryJobData): Promise<MessageDeliveryResult> {
    const { messageId, deliveryAttempt = 1, maxRetries = this.maxDeliveryRetries } = jobData;

    if (deliveryAttempt >= maxRetries) {
      logger.warn(`Max retries reached for message ${messageId}`);
      await this.updateDeliveryStatus(messageId, DeliveryStatus.FAILED);

      return {
        messageId,
        status: DeliveryStatus.FAILED,
        deliveryAttempt,
        recipientOnline: false,
      };
    }

    // Attempt delivery again
    return await this.deliverMessage({
      ...jobData,
      deliveryAttempt: deliveryAttempt + 1,
    });
  }

  /**
   * Confirm message delivery (called when client acknowledges receipt)
   */
  private async confirmDelivery(
    messageId: string,
    recipientId: string
  ): Promise<MessageDeliveryResult> {
    try {
      await this.updateDeliveryStatus(messageId, DeliveryStatus.DELIVERED);

      // Remove from offline queue if present
      await this.removeFromOfflineQueue(messageId, recipientId);

      return {
        messageId,
        status: DeliveryStatus.DELIVERED,
        deliveryAttempt: 1,
        recipientOnline: true,
      };
    } catch (error: any) {
      logger.error(`Failed to confirm delivery for message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Process batch delivery (for delivering offline messages when user comes online)
   */
  private async processBatchDelivery(jobData: MessageDeliveryJobData): Promise<MessageDeliveryResult> {
    const { recipientId } = jobData;

    try {
      // Get all pending messages for user
      const pendingMessages = await this.getPendingMessages(recipientId);

      logger.info(`Processing batch delivery: ${pendingMessages.length} messages for user ${recipientId}`);

      let deliveredCount = 0;

      for (const message of pendingMessages) {
        try {
          const result = await this.deliverMessage({
            ...jobData,
            messageId: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            messageContent: message.content,
          });

          if (result.status === DeliveryStatus.DELIVERED) {
            deliveredCount++;
          }
        } catch (error: any) {
          logger.error(`Failed to deliver message in batch: ${message.id}`, error);
        }
      }

      return {
        messageId: 'batch',
        status: deliveredCount > 0 ? DeliveryStatus.DELIVERED : DeliveryStatus.PENDING,
        deliveryAttempt: 1,
        recipientOnline: true,
      };
    } catch (error: any) {
      logger.error(`Batch delivery failed for user ${recipientId}:`, error);
      throw error;
    }
  }

  /**
   * Check if user is online via API Gateway
   */
  private async checkUserOnlineStatus(userId: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${API_GATEWAY_URL}/api/v1/internal/presence/${userId}`,
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 3000,
        }
      );

      return response.data.isOnline === true;
    } catch (error: any) {
      logger.warn(`Failed to check online status for user ${userId}:`, error.message);
      return false;
    }
  }

  /**
   * Deliver message via WebSocket
   */
  private async deliverViaWebSocket(
    recipientId: string,
    messageId: string,
    conversationId: string,
    senderId: string,
    messageContent?: any
  ): Promise<boolean> {
    try {
      const response = await axios.post(
        `${API_GATEWAY_URL}/api/v1/internal/ws/deliver`,
        {
          recipientId,
          event: 'new_message',
          payload: {
            messageId,
            conversationId,
            senderId,
            content: messageContent,
            timestamp: new Date().toISOString(),
          },
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      return response.data.delivered === true;
    } catch (error: any) {
      logger.warn(`WebSocket delivery failed for message ${messageId}:`, error.message);
      return false;
    }
  }

  /**
   * Send push notification for message
   */
  private async sendPushNotification(
    recipientId: string,
    senderId: string,
    messageId: string,
    conversationId: string,
    messageContent?: any
  ): Promise<boolean> {
    try {
      // Get sender name for notification
      const senderName = await this.getSenderName(senderId);

      const notificationBody = this.getNotificationBody(messageContent, senderName);

      await axios.post(
        `${NOTIFICATION_SERVICE_URL}/api/v1/notifications`,
        {
          userId: recipientId,
          type: 'new_message',
          title: 'New Message',
          body: notificationBody,
          data: {
            messageId,
            conversationId,
            senderId,
            action: 'open_conversation',
          },
          channels: ['push'],
          priority: 'high',
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      return true;
    } catch (error: any) {
      logger.warn(`Push notification failed for message ${messageId}:`, error.message);
      return false;
    }
  }

  /**
   * Get notification body based on message content
   */
  private getNotificationBody(messageContent: any, senderName: string): string {
    if (!messageContent) {
      return `${senderName} sent you a message`;
    }

    switch (messageContent.type) {
      case 'text':
        const text = messageContent.text || '';
        return `${senderName}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`;
      case 'image':
        return `${senderName} sent you a photo`;
      case 'voice':
        return `${senderName} sent you a voice message`;
      case 'gif':
        return `${senderName} sent you a GIF`;
      case 'virtual_gift':
        return `${senderName} sent you a gift!`;
      default:
        return `${senderName} sent you a message`;
    }
  }

  /**
   * Get sender name from user service
   */
  private async getSenderName(senderId: string): Promise<string> {
    try {
      const response = await axios.get(
        `${process.env.USER_SERVICE_URL || 'http://localhost:3002'}/api/v1/users/${senderId}/profile`,
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 3000,
        }
      );

      return response.data.firstName || 'Someone';
    } catch (error) {
      return 'Someone';
    }
  }

  /**
   * Update message delivery status in messaging service
   */
  private async updateDeliveryStatus(messageId: string, status: DeliveryStatus): Promise<void> {
    try {
      await axios.patch(
        `${MESSAGING_SERVICE_URL}/api/v1/internal/messages/${messageId}/status`,
        {
          deliveryStatus: status,
          updatedAt: new Date().toISOString(),
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error(`Failed to update delivery status for message ${messageId}:`, error);
    }
  }

  /**
   * Queue message for offline delivery
   */
  private async queueForOfflineDelivery(jobData: MessageDeliveryJobData): Promise<void> {
    try {
      const Redis = require('ioredis');
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      });

      const queueKey = `offline:messages:${jobData.recipientId}`;
      const messageData = JSON.stringify({
        messageId: jobData.messageId,
        conversationId: jobData.conversationId,
        senderId: jobData.senderId,
        content: jobData.messageContent,
        queuedAt: new Date().toISOString(),
      });

      await redis.zadd(queueKey, Date.now(), messageData);
      await redis.expire(queueKey, this.offlineQueueTTL);
      await redis.quit();

      logger.debug(`Queued message ${jobData.messageId} for offline delivery to ${jobData.recipientId}`);
    } catch (error: any) {
      logger.error(`Failed to queue message for offline delivery:`, error);
    }
  }

  /**
   * Remove message from offline queue
   */
  private async removeFromOfflineQueue(messageId: string, recipientId: string): Promise<void> {
    try {
      const Redis = require('ioredis');
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      });

      const queueKey = `offline:messages:${recipientId}`;
      const messages = await redis.zrange(queueKey, 0, -1);

      for (const msg of messages) {
        const parsed = JSON.parse(msg);
        if (parsed.messageId === messageId) {
          await redis.zrem(queueKey, msg);
          break;
        }
      }

      await redis.quit();
    } catch (error: any) {
      logger.error(`Failed to remove message from offline queue:`, error);
    }
  }

  /**
   * Get pending messages for a user
   */
  private async getPendingMessages(recipientId: string): Promise<any[]> {
    try {
      const Redis = require('ioredis');
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      });

      const queueKey = `offline:messages:${recipientId}`;
      const messages = await redis.zrange(queueKey, 0, -1);
      await redis.quit();

      return messages.map((msg: string) => JSON.parse(msg));
    } catch (error: any) {
      logger.error(`Failed to get pending messages for user ${recipientId}:`, error);
      return [];
    }
  }

  /**
   * Schedule message delivery
   */
  async scheduleDelivery(
    messageId: string,
    conversationId: string,
    senderId: string,
    recipientId: string,
    messageContent?: MessageDeliveryJobData['messageContent']
  ): Promise<void> {
    await this.addJob(
      {
        type: 'deliver_message',
        messageId,
        conversationId,
        senderId,
        recipientId,
        messageContent,
        deliveryAttempt: 1,
      },
      {
        priority: JobPriority.CRITICAL, // Messages are high priority
      }
    );
  }

  /**
   * Schedule batch delivery when user comes online
   */
  async scheduleBatchDelivery(recipientId: string): Promise<void> {
    await this.addJob(
      {
        type: 'batch_delivery',
        messageId: 'batch',
        conversationId: '',
        senderId: '',
        recipientId,
      },
      {
        priority: JobPriority.HIGH,
      }
    );
  }

  /**
   * Schedule delivery confirmation
   */
  async scheduleDeliveryConfirmation(messageId: string, recipientId: string): Promise<void> {
    await this.addJob(
      {
        type: 'confirm_delivery',
        messageId,
        conversationId: '',
        senderId: '',
        recipientId,
      },
      {
        priority: JobPriority.NORMAL,
      }
    );
  }
}

// Export singleton instance
export const messageDeliveryWorker = new MessageDeliveryWorker();
export default messageDeliveryWorker;
