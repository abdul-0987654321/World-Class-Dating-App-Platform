import { postgresClient } from '../../infrastructure/database/postgres-client';
import { createLogger } from '../../utils/logger';

const logger = createLogger('conversation-repository');

export interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  createdAt: Date;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  unreadCount?: {
    [userId: string]: number;
  };
  firstMessageSentBy?: string;
  conversationInitiated?: boolean;
  requiresWomenFirst?: boolean;
  womanUserId?: string;
}

export class ConversationRepository {
  /**
   * Create a new conversation
   */
  async create(conversation: Conversation): Promise<Conversation> {
    try {
      logger.info(`Creating conversation: ${conversation.id}`);

      const [created] = await postgresClient.conversations().insert(conversation).returning('*');

      logger.info(`Conversation created: ${conversation.id}`);
      return created as Conversation;
    } catch (error: any) {
      logger.error(`Failed to create conversation ${conversation.id}:`, error);
      throw new Error(`Failed to create conversation: ${error.message}`);
    }
  }

  /**
   * Find conversation by ID
   */
  async findById(conversationId: string): Promise<Conversation | null> {
    try {
      const conversation = await postgresClient
        .conversations()
        .where('id', conversationId)
        .first();
      return conversation || null;
    } catch (error: any) {
      logger.error(`Failed to find conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Find conversation between two users
   */
  async findByParticipants(user1Id: string, user2Id: string): Promise<Conversation | null> {
    try {
      const conversation = await postgresClient
        .conversations()
        .where(function () {
          this.where('participant1_id', user1Id).andWhere('participant2_id', user2Id);
        })
        .orWhere(function () {
          this.where('participant1_id', user2Id).andWhere('participant2_id', user1Id);
        })
        .first();

      return conversation || null;
    } catch (error: any) {
      logger.error('Failed to find conversation by participants:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for a user
   */
  async findByUserId(userId: string): Promise<Conversation[]> {
    try {
      const conversations = await postgresClient
        .conversations()
        .where('participant1_id', userId)
        .orWhere('participant2_id', userId)
        .orderBy('last_message_at', 'desc');

      return conversations as Conversation[];
    } catch (error: any) {
      logger.error('Failed to find conversations by user:', error);
      throw error;
    }
  }

  /**
   * Update conversation
   */
  async update(conversationId: string, updates: Partial<Conversation>): Promise<Conversation> {
    try {
      logger.info(`Updating conversation: ${conversationId}`);

      const [updated] = await postgresClient
        .conversations()
        .where('id', conversationId)
        .update(updates)
        .returning('*');

      if (!updated) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      logger.info(`Conversation updated: ${conversationId}`);
      return updated as Conversation;
    } catch (error: any) {
      logger.error(`Failed to update conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Update last message information
   */
  async updateLastMessage(
    conversationId: string,
    lastMessageAt: Date,
    lastMessagePreview: string
  ): Promise<void> {
    try {
      await this.update(conversationId, {
        lastMessageAt,
        lastMessagePreview,
      });
    } catch (error: any) {
      logger.error('Failed to update last message:', error);
      throw error;
    }
  }

  /**
   * Increment unread count for a user
   */
  async incrementUnreadCount(conversationId: string, userId: string): Promise<void> {
    try {
      const conversation = await this.findById(conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      const unreadCount = conversation.unreadCount || {};
      unreadCount[userId] = (unreadCount[userId] || 0) + 1;

      await this.update(conversationId, { unreadCount });
    } catch (error: any) {
      logger.error('Failed to increment unread count:', error);
      throw error;
    }
  }

  /**
   * Reset unread count for a user
   */
  async resetUnreadCount(conversationId: string, userId: string): Promise<void> {
    try {
      const conversation = await this.findById(conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      const unreadCount = conversation.unreadCount || {};
      unreadCount[userId] = 0;

      await this.update(conversationId, { unreadCount });
    } catch (error: any) {
      logger.error('Failed to reset unread count:', error);
      throw error;
    }
  }

  /**
   * Decrement unread count for a user
   */
  async decrementUnreadCount(conversationId: string, userId: string): Promise<void> {
    try {
      const conversation = await this.findById(conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      const unreadCount = conversation.unreadCount || {};
      const currentCount = unreadCount[userId] || 0;
      unreadCount[userId] = Math.max(0, currentCount - 1);

      await this.update(conversationId, { unreadCount });
    } catch (error: any) {
      logger.error('Failed to decrement unread count:', error);
      throw error;
    }
  }

  /**
   * Get other participant ID from conversation
   */
  getOtherParticipant(conversation: Conversation, currentUserId: string): string {
    return conversation.participant1Id === currentUserId
      ? conversation.participant2Id
      : conversation.participant1Id;
  }

  /**
   * Delete conversation
   */
  async delete(conversationId: string): Promise<void> {
    try {
      logger.info(`Deleting conversation: ${conversationId}`);
      await postgresClient.conversations().where('id', conversationId).delete();
      logger.info(`Conversation deleted: ${conversationId}`);
    } catch (error: any) {
      logger.error(`Failed to delete conversation ${conversationId}:`, error);
      throw error;
    }
  }
}

export const conversationRepository = new ConversationRepository();
export default conversationRepository;
