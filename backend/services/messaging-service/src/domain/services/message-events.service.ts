import { realtimeClient } from '../../infrastructure/clients/realtime.client';
import { Message, MessageStatus } from '../../types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('message-events-service');

/**
 * Service for publishing message-related events to the Realtime Service
 * This enables real-time message delivery, read receipts, and typing indicators
 */
export class MessageEventsService {
  /**
   * Publish a new message event when a message is sent
   * This notifies the recipient in real-time
   */
  async publishNewMessage(message: Message): Promise<void> {
    try {
      logger.info(`Publishing new message event: ${message.id}`);

      const success = await realtimeClient.publishNewMessage(message.receiverId, {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        type: message.type,
        status: message.status,
        sentAt: message.sentAt,
        metadata: message.metadata,
        replyTo: message.replyTo,
      });

      if (success) {
        logger.info(`New message event published successfully: ${message.id}`);
      } else {
        logger.warn(`Failed to publish new message event: ${message.id}`);
      }
    } catch (error) {
      logger.error('Real-time message delivery failed - message saved but not delivered in real-time', {
        error: error instanceof Error ? error.message : String(error),
        messageId: message.id,
        receiverId: message.receiverId,
        conversationId: message.conversationId,
      });
      // TODO: Implement dead-letter queue for failed deliveries
    }
  }

  /**
   * Publish message read event when messages are marked as read
   * This sends read receipts to the sender
   */
  async publishMessageRead(
    conversationId: string,
    messageIds: string[],
    readBy: string,
    senderIds: string[]
  ): Promise<void> {
    try {
      logger.info(`Publishing message read event for conversation: ${conversationId}`);

      const readAt = new Date();
      const success = await realtimeClient.publishMessageRead(
        conversationId,
        messageIds,
        readBy,
        readAt
      );

      if (success) {
        logger.info(`Message read event published for ${messageIds.length} messages`);
      } else {
        logger.warn(`Failed to publish message read event`);
      }
    } catch (error: any) {
      logger.error(`Error publishing message read event:`, error);
      // Don't throw - we don't want to fail the read operation
    }
  }

  /**
   * Publish message delivered event
   * This confirms to the sender that the message was delivered
   */
  async publishMessageDelivered(
    messageId: string,
    conversationId: string,
    deliveredTo: string,
    senderId: string
  ): Promise<void> {
    try {
      logger.info(`Publishing message delivered event: ${messageId}`);

      const deliveredAt = new Date();
      const success = await realtimeClient.publishMessageDelivered(
        messageId,
        conversationId,
        deliveredTo,
        deliveredAt
      );

      if (success) {
        logger.info(`Message delivered event published: ${messageId}`);
      } else {
        logger.warn(`Failed to publish message delivered event: ${messageId}`);
      }
    } catch (error: any) {
      logger.error(`Error publishing message delivered event for ${messageId}:`, error);
    }
  }

  /**
   * Publish message deleted event
   * Notifies participants that a message was deleted
   */
  async publishMessageDeleted(
    messageId: string,
    conversationId: string,
    deletedBy: string,
    targetUserId: string
  ): Promise<void> {
    try {
      logger.info(`Publishing message deleted event: ${messageId}`);

      const success = await realtimeClient.publishMessageDeleted(
        messageId,
        conversationId,
        deletedBy
      );

      if (success) {
        logger.info(`Message deleted event published: ${messageId}`);
      } else {
        logger.warn(`Failed to publish message deleted event: ${messageId}`);
      }
    } catch (error: any) {
      logger.error(`Error publishing message deleted event for ${messageId}:`, error);
    }
  }

  /**
   * Publish typing start event
   * Notifies the other participant that someone is typing
   */
  async publishTypingStart(
    conversationId: string,
    userId: string,
    targetUserId: string
  ): Promise<void> {
    try {
      logger.debug(`Publishing typing start event for conversation: ${conversationId}`);

      const success = await realtimeClient.publishTypingStart(conversationId, userId, targetUserId);

      if (success) {
        logger.debug(`Typing start event published for conversation: ${conversationId}`);
      } else {
        logger.warn(`Failed to publish typing start event for conversation: ${conversationId}`);
      }
    } catch (error: any) {
      logger.error(`Error publishing typing start event:`, error);
    }
  }

  /**
   * Publish typing stop event
   * Notifies the other participant that someone stopped typing
   */
  async publishTypingStop(
    conversationId: string,
    userId: string,
    targetUserId: string
  ): Promise<void> {
    try {
      logger.debug(`Publishing typing stop event for conversation: ${conversationId}`);

      const success = await realtimeClient.publishTypingStop(conversationId, userId, targetUserId);

      if (success) {
        logger.debug(`Typing stop event published for conversation: ${conversationId}`);
      } else {
        logger.warn(`Failed to publish typing stop event for conversation: ${conversationId}`);
      }
    } catch (error: any) {
      logger.error(`Error publishing typing stop event:`, error);
    }
  }

  /**
   * Batch publish read receipts for multiple messages
   * More efficient when marking entire conversations as read
   */
  async publishBatchMessageRead(
    conversationId: string,
    messages: Message[],
    readBy: string
  ): Promise<void> {
    try {
      const messageIds = messages.map((m) => m.id);
      const senderIds = [...new Set(messages.map((m) => m.senderId))];

      await this.publishMessageRead(conversationId, messageIds, readBy, senderIds);
    } catch (error: any) {
      logger.error(`Error publishing batch message read:`, error);
    }
  }

  /**
   * Check if realtime client is connected
   */
  isConnected(): boolean {
    return realtimeClient.isClientConnected();
  }

  /**
   * Get connection status for health checks
   */
  getStatus(): { connected: boolean; service: string } {
    return {
      connected: realtimeClient.isClientConnected(),
      service: 'realtime-pubsub',
    };
  }
}

// Export singleton instance
export const messageEventsService = new MessageEventsService();
export default messageEventsService;
