import { Container } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import { cosmosClient } from '../infrastructure/database/cosmos-client';
import { messageRepository } from '../domain/repositories/message.repository';
import { conversationRepository } from '../domain/repositories/conversation.repository';
import { realtimeHttpClient } from '../infrastructure/clients/realtime-http.client';
import { PinnedMessage } from '../types/enhanced-types';
import { Message } from '../types';

const logger = createLogger('pinned-messages-service');

export class PinnedMessagesService {
  private readonly MAX_PINNED_PER_CONVERSATION = 3;

  /**
   * Pin a message in a conversation
   */
  async pinMessage(
    messageId: string,
    conversationId: string,
    userId: string
  ): Promise<PinnedMessage> {
    try {
      // Verify message exists and user is participant
      const message = await messageRepository.findById(messageId, conversationId);
      if (!message) {
        throw new Error('Message not found');
      }

      const conversation = await conversationRepository.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (
        conversation.participant1Id !== userId &&
        conversation.participant2Id !== userId
      ) {
        throw new Error('Not authorized to pin messages in this conversation');
      }

      // Check if already pinned
      if (message.isPinned) {
        throw new Error('Message is already pinned');
      }

      // Check pin limit
      const pinnedMessages = await this.getPinnedMessages(conversationId);
      if (pinnedMessages.length >= this.MAX_PINNED_PER_CONVERSATION) {
        throw new Error(
          `Maximum of ${this.MAX_PINNED_PER_CONVERSATION} pinned messages reached. Please unpin a message first.`
        );
      }

      // Update message
      await messageRepository.update(messageId, conversationId, {
        isPinned: true,
        pinnedAt: new Date(),
        pinnedBy: userId,
      });

      const pinnedMessage: PinnedMessage = {
        messageId,
        conversationId,
        pinnedBy: userId,
        pinnedAt: new Date(),
        message,
      };

      logger.info('Message pinned', { messageId, conversationId, userId });

      // Publish to realtime service
      await realtimeHttpClient.publishMessagePinned({
        messageId,
        conversationId,
        pinnedBy: userId,
      });

      return pinnedMessage;
    } catch (error: any) {
      logger.error('Failed to pin message:', error);
      throw error;
    }
  }

  /**
   * Unpin a message
   */
  async unpinMessage(
    messageId: string,
    conversationId: string,
    userId: string
  ): Promise<void> {
    try {
      // Verify message exists and user is participant
      const message = await messageRepository.findById(messageId, conversationId);
      if (!message) {
        throw new Error('Message not found');
      }

      const conversation = await conversationRepository.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (
        conversation.participant1Id !== userId &&
        conversation.participant2Id !== userId
      ) {
        throw new Error('Not authorized to unpin messages in this conversation');
      }

      if (!message.isPinned) {
        throw new Error('Message is not pinned');
      }

      // Update message
      await messageRepository.update(messageId, conversationId, {
        isPinned: false,
        pinnedAt: undefined,
        pinnedBy: undefined,
      });

      logger.info('Message unpinned', { messageId, conversationId, userId });

      // Publish to realtime service
      await realtimeHttpClient.publishMessageUnpinned({
        messageId,
        conversationId,
        unpinnedBy: userId,
      });
    } catch (error: any) {
      logger.error('Failed to unpin message:', error);
      throw error;
    }
  }

  /**
   * Get all pinned messages for a conversation
   */
  async getPinnedMessages(conversationId: string): Promise<PinnedMessage[]> {
    try {
      const container = cosmosClient.getMessagesContainer();

      const querySpec = {
        query: `SELECT * FROM c
                WHERE c.conversationId = @conversationId
                AND c.isPinned = true
                ORDER BY c.pinnedAt DESC`,
        parameters: [
          { name: '@conversationId', value: conversationId },
        ],
      };

      const { resources: messages } = await container.items
        .query<Message>(querySpec)
        .fetchAll();

      return messages.map(msg => ({
        messageId: msg.id,
        conversationId: msg.conversationId,
        pinnedBy: msg.pinnedBy!,
        pinnedAt: msg.pinnedAt!,
        message: msg,
      }));
    } catch (error: any) {
      logger.error('Failed to get pinned messages:', error);
      throw error;
    }
  }

  /**
   * Get pinned message IDs for a conversation (lighter weight)
   */
  async getPinnedMessageIds(conversationId: string): Promise<string[]> {
    try {
      const pinnedMessages = await this.getPinnedMessages(conversationId);
      return pinnedMessages.map(pm => pm.messageId);
    } catch (error: any) {
      logger.error('Failed to get pinned message IDs:', error);
      throw error;
    }
  }

  /**
   * Unpin all messages in a conversation (e.g., when conversation is deleted)
   */
  async unpinAllMessages(conversationId: string): Promise<void> {
    try {
      const pinnedMessages = await this.getPinnedMessages(conversationId);

      const unpinPromises = pinnedMessages.map(pm =>
        messageRepository.update(pm.messageId, conversationId, {
          isPinned: false,
          pinnedAt: undefined,
          pinnedBy: undefined,
        })
      );

      await Promise.all(unpinPromises);

      logger.info(`Unpinned ${pinnedMessages.length} messages in conversation ${conversationId}`);
    } catch (error: any) {
      logger.error('Failed to unpin all messages:', error);
      throw error;
    }
  }
}

export const pinnedMessagesService = new PinnedMessagesService();
export default pinnedMessagesService;
