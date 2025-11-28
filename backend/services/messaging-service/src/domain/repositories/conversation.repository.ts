import { Container } from '@azure/cosmos';
import { createLogger } from '@flamoral/shared';
import { cosmosClient } from '../../infrastructure/database/cosmos-client';

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
}

export class ConversationRepository {
  private container: Container;

  constructor() {
    this.container = cosmosClient.getConversationsContainer();
  }

  /**
   * Create a new conversation
   */
  async create(conversation: Conversation): Promise<Conversation> {
    try {
      logger.info(`Creating conversation: ${conversation.id}`);
      
      const { resource } = await this.container.items.create(conversation);
      
      logger.info(`Conversation created: ${conversation.id}`);
      return resource as Conversation;
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
      const { resource } = await this.container.item(conversationId, conversationId).read<Conversation>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      logger.error(`Failed to find conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Find conversation between two users
   */
  async findByParticipants(user1Id: string, user2Id: string): Promise<Conversation | null> {
    try {
      const querySpec = {
        query: `SELECT * FROM c 
                WHERE (c.participant1Id = @user1Id AND c.participant2Id = @user2Id) 
                   OR (c.participant1Id = @user2Id AND c.participant2Id = @user1Id)`,
        parameters: [
          { name: '@user1Id', value: user1Id },
          { name: '@user2Id', value: user2Id },
        ],
      };

      const { resources } = await this.container.items.query<Conversation>(querySpec).fetchAll();
      return resources.length > 0 ? resources[0] : null;
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
      const querySpec = {
        query: `SELECT * FROM c 
                WHERE c.participant1Id = @userId OR c.participant2Id = @userId 
                ORDER BY c.lastMessageAt DESC`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources } = await this.container.items.query<Conversation>(querySpec).fetchAll();
      return resources;
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

      const existing = await this.findById(conversationId);
      if (!existing) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      const updated = { ...existing, ...updates };
      const { resource } = await this.container.item(conversationId, conversationId).replace(updated);

      logger.info(`Conversation updated: ${conversationId}`);
      return resource as Conversation;
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
      await this.container.item(conversationId, conversationId).delete();
      logger.info(`Conversation deleted: ${conversationId}`);
    } catch (error: any) {
      logger.error(`Failed to delete conversation ${conversationId}:`, error);
      throw error;
    }
  }
}

export const conversationRepository = new ConversationRepository();
export default conversationRepository;
