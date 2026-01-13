import { v4 as uuidv4 } from 'uuid';

import { messageRepository } from '../domain/repositories/message.repository';
import { realtimeHttpClient } from '../infrastructure/clients/realtime-http.client';
import { postgresClient } from '../infrastructure/database/postgres-client';
import { MessageReaction, ReactionSummary } from '../types/enhanced-types';
import { createLogger } from '../utils/logger';

const logger = createLogger('enhanced-reactions-service');

export class EnhancedReactionsService {
  private readonly ALLOWED_EMOJIS = [
    '❤️',
    '😂',
    '😮',
    '😢',
    '😡',
    '👍',
    '👎',
    '🔥',
    '💯',
    '🎉',
    '😍',
    '😘',
    '🤗',
    '🤔',
    '😎',
    '🥳',
    '😇',
    '🤩',
    '💪',
    '👏',
  ];

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

      await postgresClient.reactions().insert({
        id: reaction.id,
        message_id: reaction.messageId,
        conversation_id: reaction.conversationId,
        user_id: reaction.userId,
        emoji: reaction.emoji,
        created_at: reaction.createdAt,
      });

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
  async removeReaction(messageId: string, conversationId: string, userId: string): Promise<void> {
    try {
      const reaction = await this.getUserReaction(messageId, conversationId, userId);

      if (!reaction) {
        throw new Error('Reaction not found');
      }

      await postgresClient.reactions().where('id', reaction.id).delete();

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
        const userReaction = reactions.find((r) => r.userId === currentUserId);
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
      const reactions = await postgresClient
        .reactions()
        .whereIn('message_id', messageIds)
        .andWhere('conversation_id', conversationId)
        .select('*');

      // Map database rows to MessageReaction objects
      const mappedReactions: MessageReaction[] = reactions.map((row: any) => ({
        id: row.id,
        messageId: row.message_id,
        conversationId: row.conversation_id,
        userId: row.user_id,
        emoji: row.emoji,
        createdAt: new Date(row.created_at),
      }));

      // Group by message ID
      const messageReactionsMap = new Map<string, MessageReaction[]>();
      for (const reaction of mappedReactions) {
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
          const userReaction = messageReactions.find((r) => r.userId === currentUserId);
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
      const row = await postgresClient
        .reactions()
        .where('message_id', messageId)
        .andWhere('conversation_id', conversationId)
        .andWhere('user_id', userId)
        .first();

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        messageId: row.message_id,
        conversationId: row.conversation_id,
        userId: row.user_id,
        emoji: row.emoji,
        createdAt: new Date(row.created_at),
      };
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
      const rows = await postgresClient
        .reactions()
        .where('message_id', messageId)
        .andWhere('conversation_id', conversationId)
        .orderBy('created_at', 'asc')
        .select('*');

      return rows.map((row: any) => ({
        id: row.id,
        messageId: row.message_id,
        conversationId: row.conversation_id,
        userId: row.user_id,
        emoji: row.emoji,
        createdAt: new Date(row.created_at),
      }));
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
      const rows = await postgresClient
        .reactions()
        .where('id', reactionId)
        .update({ emoji })
        .returning('*');

      if (!rows || rows.length === 0) {
        throw new Error('Reaction not found');
      }

      const row = rows[0];
      return {
        id: row.id,
        messageId: row.message_id,
        conversationId: row.conversation_id,
        userId: row.user_id,
        emoji: row.emoji,
        createdAt: new Date(row.created_at),
      };
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
      const deletedCount = await postgresClient
        .reactions()
        .where('message_id', messageId)
        .andWhere('conversation_id', conversationId)
        .delete();

      logger.info(`Deleted ${deletedCount} reactions for message ${messageId}`);
    } catch (error: any) {
      logger.error('Failed to delete message reactions:', error);
      throw error;
    }
  }
}

export const enhancedReactionsService = new EnhancedReactionsService();
export default enhancedReactionsService;
