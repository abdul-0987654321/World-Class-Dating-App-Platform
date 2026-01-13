import { v4 as uuidv4 } from 'uuid';

import { conversationRepository } from '../domain/repositories/conversation.repository';
import { messageRepository } from '../domain/repositories/message.repository';
import { realtimeHttpClient } from '../infrastructure/clients/realtime-http.client';
import { postgresClient } from '../infrastructure/database/postgres-client';
import { Message } from '../types';
import { PinnedMessage } from '../types/enhanced-types';
import { createLogger } from '../utils/logger';

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

      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
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
  async unpinMessage(messageId: string, conversationId: string, userId: string): Promise<void> {
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

      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
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
      const rows = await postgresClient
        .messages()
        .where('conversation_id', conversationId)
        .andWhere('is_pinned', true)
        .orderBy('pinned_at', 'desc')
        .select('*');

      return rows.map((row: any) => {
        const message: Message = {
          id: row.id,
          conversationId: row.conversation_id,
          senderId: row.sender_id,
          receiverId: row.receiver_id,
          content: row.content,
          type: row.type,
          status: row.status,
          sentAt: new Date(row.sent_at),
          deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
          readAt: row.read_at ? new Date(row.read_at) : undefined,
          isPinned: row.is_pinned,
          pinnedAt: row.pinned_at ? new Date(row.pinned_at) : undefined,
          pinnedBy: row.pinned_by,
          deletedFor: row.deleted_for,
          metadata: row.metadata,
        };

        return {
          messageId: message.id,
          conversationId: message.conversationId,
          pinnedBy: message.pinnedBy,
          pinnedAt: message.pinnedAt,
          message,
        };
      });
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
      return pinnedMessages.map((pm) => pm.messageId);
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

      const unpinPromises = pinnedMessages.map((pm) =>
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
