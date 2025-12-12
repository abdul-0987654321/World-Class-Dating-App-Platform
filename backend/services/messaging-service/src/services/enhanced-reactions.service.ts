import { Container } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import { cosmosClient } from '../infrastructure/database/cosmos-client';
import { messageRepository } from '../domain/repositories/message.repository';
import { realtimeHttpClient } from '../infrastructure/clients/realtime-http.client';
import { MessageReaction, ReactionSummary } from '../types/enhanced-types';

const logger = createLogger('enhanced-reactions-service');

export class EnhancedReactionsService {
  private container: Container;
  private readonly ALLOWED_EMOJIS = [
    '❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🔥', '💯', '🎉',
    '😍', '😘', '🤗', '🤔', '😎', '🥳', '😇', '🤩', '💪', '👏'
  ];

  constructor() {
    this.container = cosmosClient.getReactionsContainer();
  }

  /**
   * Add or update reaction to message
   */
  async addReaction(
    messageId: string,
    conversationId: string,
    userId: string,
    emoji: string
  ): Promise<MessageReaction> {
    try {
      // Validate emoji
      if (!this.ALLOWED_EMOJIS.includes(emoji)) {
        throw new Error('Invalid emoji. Please use one of the supported emojis.');
      }

      // Check if user already has a reaction on this message
      const existingReaction = await this.getUserReaction(messageId, conversationId, userId);

      if (existingReaction) {
        // Update existing reaction
        if (existingReaction.emoji === emoji) {
          // Same emoji, return existing
          return existingReaction;
        }

        // Different emoji, update
        const updated = await this.updateReaction(existingReaction.id, conversationId, emoji);

        // Publish update event
        await realtimeHttpClient.publishReactionUpdate({
          messageId,
          conversationId,
          reaction: updated,
          action: 'updated',
        });

        return updated;
      }

      // Create new reaction
      const reaction: MessageReaction = {
        id: uuidv4(),
        messageId,
        conversationId,
        userId,
        emoji,
        createdAt: new Date(),
      };

      await this.container.items.create(reaction);

      logger.info('Reaction added', { messageId, userId, emoji });

      // Publish to realtime service
      await realtimeHttpClient.publishReactionUpdate({
        messageId,
        conversationId,
        reaction,
        action: 'added',
      });

      return reaction;
    } catch (error: any) {
      logger.error('Failed to add reaction:', error);
      throw error;
    }
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(
    messageId: string,
    conversationId: string,
    userId: string
  ): Promise<void> {
    try {
      const reaction = await this.getUserReaction(messageId, conversationId, userId);

      if (!reaction) {
        throw new Error('Reaction not found');
      }

      await this.container.item(reaction.id, conversationId).delete();

      logger.info('Reaction removed', { messageId, userId });

      // Publish to realtime service
      await realtimeHttpClient.publishReactionUpdate({
        messageId,
        conversationId,
        userId,
        action: 'removed',
      });
    } catch (error: any) {
      logger.error('Failed to remove reaction:', error);
      throw error;
    }
  }

  /**
   * Get reaction summary for a message
   */
  async getReactionSummary(
    messageId: string,
    conversationId: string,
    currentUserId?: string
  ): Promise<ReactionSummary> {
    try {
      const reactions = await this.getMessageReactions(messageId, conversationId);

      // Group by emoji
      const grouped = new Map<string, string[]>();

      for (const reaction of reactions) {
        if (!grouped.has(reaction.emoji)) {
          grouped.set(reaction.emoji, []);
        }
        grouped.get(reaction.emoji)!.push(reaction.userId);
      }

      // Build summary
      const summary: ReactionSummary = {
        messageId,
        reactions: Array.from(grouped.entries()).map(([emoji, users]) => ({
          emoji,
          count: users.length,
          users,
        })),
        totalReactions: reactions.length,
      };

      // Add current user's reaction if provided
      if (currentUserId) {
        const userReaction = reactions.find(r => r.userId === currentUserId);
        if (userReaction) {
          summary.userReaction = userReaction.emoji;
        }
      }

      return summary;
    } catch (error: any) {
      logger.error('Failed to get reaction summary:', error);
      throw error;
    }
  }

  /**
   * Get all reactions for multiple messages (bulk operation)
   */
  async getReactionsForMessages(
    messageIds: string[],
    conversationId: string,
    currentUserId?: string
  ): Promise<Map<string, ReactionSummary>> {
    try {
      const summaryMap = new Map<string, ReactionSummary>();

      // Fetch all reactions for these messages in bulk
      const querySpec = {
        query: `SELECT * FROM c
                WHERE c.conversationId = @conversationId
                AND c.messageId IN (${messageIds.map((_, i) => `@msgId${i}`).join(',')})`,
        parameters: [
          { name: '@conversationId', value: conversationId },
          ...messageIds.map((id, i) => ({ name: `@msgId${i}`, value: id })),
        ],
      };

      const { resources: reactions } = await this.container.items
        .query<MessageReaction>(querySpec)
        .fetchAll();

      // Group by message ID
      const messageReactionsMap = new Map<string, MessageReaction[]>();
      for (const reaction of reactions) {
        if (!messageReactionsMap.has(reaction.messageId)) {
          messageReactionsMap.set(reaction.messageId, []);
        }
        messageReactionsMap.get(reaction.messageId)!.push(reaction);
      }

      // Build summary for each message
      for (const messageId of messageIds) {
        const messageReactions = messageReactionsMap.get(messageId) || [];
        const grouped = new Map<string, string[]>();

        for (const reaction of messageReactions) {
          if (!grouped.has(reaction.emoji)) {
            grouped.set(reaction.emoji, []);
          }
          grouped.get(reaction.emoji)!.push(reaction.userId);
        }

        const summary: ReactionSummary = {
          messageId,
          reactions: Array.from(grouped.entries()).map(([emoji, users]) => ({
            emoji,
            count: users.length,
            users,
          })),
          totalReactions: messageReactions.length,
        };

        if (currentUserId) {
          const userReaction = messageReactions.find(r => r.userId === currentUserId);
          if (userReaction) {
            summary.userReaction = userReaction.emoji;
          }
        }

        summaryMap.set(messageId, summary);
      }

      return summaryMap;
    } catch (error: any) {
      logger.error('Failed to get reactions for messages:', error);
      throw error;
    }
  }

  /**
   * Get user's reaction to a message
   */
  private async getUserReaction(
    messageId: string,
    conversationId: string,
    userId: string
  ): Promise<MessageReaction | null> {
    try {
      const querySpec = {
        query: `SELECT * FROM c
                WHERE c.messageId = @messageId
                AND c.conversationId = @conversationId
                AND c.userId = @userId`,
        parameters: [
          { name: '@messageId', value: messageId },
          { name: '@conversationId', value: conversationId },
          { name: '@userId', value: userId },
        ],
      };

      const { resources } = await this.container.items
        .query<MessageReaction>(querySpec)
        .fetchAll();

      return resources[0] || null;
    } catch (error: any) {
      logger.error('Failed to get user reaction:', error);
      throw error;
    }
  }

  /**
   * Get all reactions for a message
   */
  private async getMessageReactions(
    messageId: string,
    conversationId: string
  ): Promise<MessageReaction[]> {
    try {
      const querySpec = {
        query: `SELECT * FROM c
                WHERE c.messageId = @messageId
                AND c.conversationId = @conversationId
                ORDER BY c.createdAt ASC`,
        parameters: [
          { name: '@messageId', value: messageId },
          { name: '@conversationId', value: conversationId },
        ],
      };

      const { resources } = await this.container.items
        .query<MessageReaction>(querySpec)
        .fetchAll();

      return resources;
    } catch (error: any) {
      logger.error('Failed to get message reactions:', error);
      throw error;
    }
  }

  /**
   * Update existing reaction
   */
  private async updateReaction(
    reactionId: string,
    conversationId: string,
    emoji: string
  ): Promise<MessageReaction> {
    try {
      const { resource: existing } = await this.container
        .item(reactionId, conversationId)
        .read<MessageReaction>();

      if (!existing) {
        throw new Error('Reaction not found');
      }

      const updated = { ...existing, emoji };
      const { resource } = await this.container
        .item(reactionId, conversationId)
        .replace(updated);

      return resource as MessageReaction;
    } catch (error: any) {
      logger.error('Failed to update reaction:', error);
      throw error;
    }
  }

  /**
   * Delete all reactions for a message (when message is deleted)
   */
  async deleteMessageReactions(messageId: string, conversationId: string): Promise<void> {
    try {
      const reactions = await this.getMessageReactions(messageId, conversationId);

      const deletePromises = reactions.map(reaction =>
        this.container.item(reaction.id, conversationId).delete()
      );

      await Promise.all(deletePromises);
      logger.info(`Deleted ${reactions.length} reactions for message ${messageId}`);
    } catch (error: any) {
      logger.error('Failed to delete message reactions:', error);
      throw error;
    }
  }
}

export const enhancedReactionsService = new EnhancedReactionsService();
export default enhancedReactionsService;
