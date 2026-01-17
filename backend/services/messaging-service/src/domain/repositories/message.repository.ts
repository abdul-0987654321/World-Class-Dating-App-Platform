import { postgresClient } from '../../infrastructure/database/postgres-client';
import { Message, MessageStatus } from '../../types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('message-repository');

export class MessageRepository {
  /**
   * Create a new message with idempotency support
   * Handles duplicate message prevention via unique message ID
   */
  async create(message: Message): Promise<Message> {
    try {
      logger.info(`Creating message: ${message.id}`);

      // Use insert with conflict handling for idempotency
      // If message ID already exists, return existing message
      const [created] = await postgresClient
        .messages()
        .insert(message)
        .onConflict('id')
        .ignore()
        .returning('*');

      // If no row was inserted (conflict), fetch existing
      if (!created) {
        const existing = await this.findById(message.id);
        if (existing) {
          logger.info(`Message ${message.id} already exists (idempotent)`);
          return existing;
        }
        throw new Error(`Failed to create or find message ${message.id}`);
      }

      logger.info(`Message created: ${message.id}`);
      return created as Message;
    } catch (error: any) {
      // Handle duplicate key error (idempotency)
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        const existing = await this.findById(message.id);
        if (existing) {
          logger.info(`Message ${message.id} already exists (duplicate handled)`);
          return existing;
        }
      }
      logger.error(`Failed to create message ${message.id}:`, error);
      throw new Error(`Failed to create message: ${error.message}`);
    }
  }

  /**
   * Find message by ID
   */
  async findById(messageId: string, _conversationId?: string): Promise<Message | null> {
    try {
      const message = await postgresClient.messages().where('id', messageId).first();
      return message || null;
    } catch (error: any) {
      logger.error(`Failed to find message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Update message
   */
  async update(
    messageId: string,
    _conversationId: string,
    updates: Partial<Message>
  ): Promise<Message> {
    try {
      logger.info(`Updating message: ${messageId}`);

      const [updated] = await postgresClient
        .messages()
        .where('id', messageId)
        .update(updates)
        .returning('*');

      if (!updated) {
        throw new Error(`Message ${messageId} not found`);
      }

      logger.info(`Message updated: ${messageId}`);
      return updated as Message;
    } catch (error: any) {
      logger.error(`Failed to update message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Update many messages
   */
  async updateMany(messageIds: string[], updates: Partial<Message>): Promise<void> {
    try {
      logger.info(`Updating ${messageIds.length} messages`);

      await postgresClient.messages().whereIn('id', messageIds).update(updates);

      logger.info(`Updated ${messageIds.length} messages`);
    } catch (error: any) {
      logger.error('Failed to update multiple messages:', error);
      throw error;
    }
  }

  /**
   * Mark all messages in a conversation as read for a specific user
   */
  async markConversationAsRead(
    conversationId: string,
    userId: string,
    readAt: Date
  ): Promise<void> {
    try {
      logger.info(`Marking conversation ${conversationId} as read for user ${userId}`);

      const result = await postgresClient
        .messages()
        .where('conversation_id', conversationId)
        .where('receiver_id', userId)
        .whereNot('status', MessageStatus.READ)
        .update({
          status: MessageStatus.READ,
          read_at: readAt,
        });

      logger.info(`Marked ${result} messages as read in conversation ${conversationId}`);
    } catch (error: any) {
      logger.error('Failed to mark conversation as read:', error);
      throw error;
    }
  }

  /**
   * Delete message
   */
  async delete(messageId: string, _conversationId?: string): Promise<void> {
    try {
      logger.info(`Deleting message: ${messageId}`);
      await postgresClient.messages().where('id', messageId).delete();
      logger.info(`Message deleted: ${messageId}`);
    } catch (error: any) {
      logger.error(`Failed to delete message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Mark message as deleted for a specific user (soft delete)
   */
  async markAsDeleted(messageId: string, _conversationId: string, userId: string): Promise<void> {
    try {
      logger.info(`Marking message ${messageId} as deleted for user ${userId}`);

      const message = await this.findById(messageId);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      // Add userId to deletedFor array
      const deletedFor = message.deletedFor || [];
      if (!deletedFor.includes(userId)) {
        deletedFor.push(userId);
      }

      await postgresClient.messages().where('id', messageId).update({ deleted_for: deletedFor });

      logger.info(`Message marked as deleted for user ${userId}`);
    } catch (error: any) {
      logger.error('Failed to mark message as deleted:', error);
      throw error;
    }
  }

  /**
   * Get messages by conversation ID with pagination
   */
  async getMessagesByConversation(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      const messages = await postgresClient
        .messages()
        .where('conversation_id', conversationId)
        .orderBy('sent_at', 'desc')
        .limit(limit)
        .offset(offset);

      return messages as Message[];
    } catch (error: any) {
      logger.error('Failed to get messages by conversation:', error);
      throw error;
    }
  }

  /**
   * Get unread messages for a user in a conversation
   */
  async getUnreadMessages(conversationId: string, userId: string): Promise<Message[]> {
    try {
      const messages = await postgresClient
        .messages()
        .where('conversation_id', conversationId)
        .where('receiver_id', userId)
        .whereNot('status', MessageStatus.READ);

      return messages as Message[];
    } catch (error: any) {
      logger.error('Failed to get unread messages:', error);
      throw error;
    }
  }

  /**
   * Get unread message count for a user in a conversation
   */
  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    try {
      const [result] = await postgresClient
        .messages()
        .where('conversation_id', conversationId)
        .where('receiver_id', userId)
        .whereNot('status', MessageStatus.READ)
        .count('* as count');

      return parseInt(result.count as string, 10) || 0;
    } catch (error: any) {
      logger.error('Failed to get unread count:', error);
      throw error;
    }
  }
}

export const messageRepository = new MessageRepository();
export default messageRepository;
