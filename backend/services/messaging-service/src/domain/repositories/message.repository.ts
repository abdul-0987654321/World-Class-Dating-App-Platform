import { Container } from '@azure/cosmos';
import { createLogger } from '../../utils/logger';
import { cosmosClient } from '../../infrastructure/database/cosmos-client';
import { Message, MessageStatus } from '../../types';

const logger = createLogger('message-repository');

export class MessageRepository {
  private _container: Container | null = null;

  private get container(): Container {
    if (!this._container) {
      this._container = cosmosClient.getMessagesContainer();
    }
    return this._container;
  }

  /**
   * Create a new message
   */
  async create(message: Message): Promise<Message> {
    try {
      logger.info(`Creating message: ${message.id}`);

      const { resource } = await this.container.items.create(message);

      logger.info(`Message created: ${message.id}`);
      return resource as Message;
    } catch (error: any) {
      logger.error(`Failed to create message ${message.id}:`, error);
      throw new Error(`Failed to create message: ${error.message}`);
    }
  }

  /**
   * Find message by ID
   */
  async findById(messageId: string, conversationId: string): Promise<Message | null> {
    try {
      const { resource } = await this.container.item(messageId, conversationId).read<Message>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      logger.error(`Failed to find message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Update message
   */
  async update(messageId: string, conversationId: string, updates: Partial<Message>): Promise<Message> {
    try {
      logger.info(`Updating message: ${messageId}`);

      const existing = await this.findById(messageId, conversationId);
      if (!existing) {
        throw new Error(`Message ${messageId} not found`);
      }

      const updated = { ...existing, ...updates };
      const { resource } = await this.container.item(messageId, conversationId).replace(updated);

      logger.info(`Message updated: ${messageId}`);
      return resource as Message;
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

      // Note: Cosmos DB doesn't have bulk update like SQL
      // We need to update each individually
      const updatePromises = messageIds.map(async (messageId) => {
        // First, we need to query to get the partition key (conversationId)
        const querySpec = {
          query: 'SELECT * FROM c WHERE c.id = @messageId',
          parameters: [{ name: '@messageId', value: messageId }],
        };

        const { resources } = await this.container.items.query<Message>(querySpec).fetchAll();

        if (resources.length > 0) {
          const message = resources[0];
          await this.update(message.id, message.conversationId, updates);
        }
      });

      await Promise.all(updatePromises);
      logger.info(`Updated ${messageIds.length} messages`);
    } catch (error: any) {
      logger.error('Failed to update multiple messages:', error);
      throw error;
    }
  }

  /**
   * Mark all messages in a conversation as read for a specific user
   */
  async markConversationAsRead(conversationId: string, userId: string, readAt: Date): Promise<void> {
    try {
      logger.info(`Marking conversation ${conversationId} as read for user ${userId}`);

      // Query all unread messages in the conversation where receiverId is userId
      const querySpec = {
        query: `SELECT * FROM c
                WHERE c.conversationId = @conversationId
                AND c.receiverId = @userId
                AND c.status != @readStatus`,
        parameters: [
          { name: '@conversationId', value: conversationId },
          { name: '@userId', value: userId },
          { name: '@readStatus', value: MessageStatus.READ },
        ],
      };

      const { resources } = await this.container.items.query<Message>(querySpec).fetchAll();

      logger.info(`Found ${resources.length} unread messages to mark as read`);

      // Update each message
      const updatePromises = resources.map((message) =>
        this.update(message.id, conversationId, {
          status: MessageStatus.READ,
          readAt,
        })
      );

      await Promise.all(updatePromises);
      logger.info(`Marked ${resources.length} messages as read in conversation ${conversationId}`);
    } catch (error: any) {
      logger.error('Failed to mark conversation as read:', error);
      throw error;
    }
  }

  /**
   * Delete message
   */
  async delete(messageId: string, conversationId: string): Promise<void> {
    try {
      logger.info(`Deleting message: ${messageId}`);
      await this.container.item(messageId, conversationId).delete();
      logger.info(`Message deleted: ${messageId}`);
    } catch (error: any) {
      logger.error(`Failed to delete message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Mark message as deleted for a specific user (soft delete)
   */
  async markAsDeleted(messageId: string, conversationId: string, userId: string): Promise<void> {
    try {
      logger.info(`Marking message ${messageId} as deleted for user ${userId}`);

      const message = await this.findById(messageId, conversationId);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      // Add userId to deletedFor array
      const deletedFor = message.deletedFor || [];
      if (!deletedFor.includes(userId)) {
        deletedFor.push(userId);
      }

      await this.update(messageId, conversationId, { deletedFor });
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
      const querySpec = {
        query: `SELECT * FROM c
                WHERE c.conversationId = @conversationId
                ORDER BY c.sentAt DESC
                OFFSET @offset LIMIT @limit`,
        parameters: [
          { name: '@conversationId', value: conversationId },
          { name: '@offset', value: offset },
          { name: '@limit', value: limit },
        ],
      };

      const { resources } = await this.container.items.query<Message>(querySpec).fetchAll();
      return resources;
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
      const querySpec = {
        query: `SELECT * FROM c
                WHERE c.conversationId = @conversationId
                AND c.receiverId = @userId
                AND c.status != @readStatus`,
        parameters: [
          { name: '@conversationId', value: conversationId },
          { name: '@userId', value: userId },
          { name: '@readStatus', value: MessageStatus.READ },
        ],
      };

      const { resources } = await this.container.items.query<Message>(querySpec).fetchAll();
      return resources;
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
      const querySpec = {
        query: `SELECT VALUE COUNT(1) FROM c
                WHERE c.conversationId = @conversationId
                AND c.receiverId = @userId
                AND c.status != @readStatus`,
        parameters: [
          { name: '@conversationId', value: conversationId },
          { name: '@userId', value: userId },
          { name: '@readStatus', value: MessageStatus.READ },
        ],
      };

      const { resources } = await this.container.items.query<number>(querySpec).fetchAll();
      return resources[0] || 0;
    } catch (error: any) {
      logger.error('Failed to get unread count:', error);
      throw error;
    }
  }
}

export const messageRepository = new MessageRepository();
export default messageRepository;
