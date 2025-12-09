import { createLogger } from '@flamoral/shared';

const logger = createLogger('message-reactions-service');

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface ReactionSummary {
  messageId: string;
  reactions: {
    emoji: string;
    count: number;
    users: string[];
  }[];
  totalReactions: number;
  userReaction?: string;
}

class MessageReactionsService {
  private readonly ALLOWED_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🔥'];

  /**
   * Add reaction to message
   */
  async addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction> {
    // Validate emoji
    if (!this.ALLOWED_EMOJIS.includes(emoji)) {
      throw new Error('Invalid emoji');
    }

    // Check if user already reacted
    const existing = await this.getUserReaction(messageId, userId);
    if (existing) {
      // Update existing reaction
      return await this.updateReaction(existing.id, emoji);
    }

    // Create new reaction
    const reaction: MessageReaction = {
      id: this.generateId(),
      messageId,
      userId,
      emoji,
      createdAt: new Date(),
    };

    await this.storeReaction(reaction);

    logger.info('Message reaction added', { messageId, userId, emoji });

    // Emit real-time event
    await this.emitReactionEvent('added', reaction);

    return reaction;
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(messageId: string, userId: string): Promise<void> {
    const reaction = await this.getUserReaction(messageId, userId);

    if (!reaction) {
      throw new Error('Reaction not found');
    }

    await this.deleteReaction(reaction.id);

    logger.info('Message reaction removed', { messageId, userId });

    // Emit real-time event
    await this.emitReactionEvent('removed', reaction);
  }

  /**
   * Get reaction summary for message
   */
  async getReactionSummary(messageId: string, currentUserId?: string): Promise<ReactionSummary> {
    const reactions = await this.getMessageReactions(messageId);

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
  }

  /**
   * Get user's reaction to a message
   */
  private async getUserReaction(messageId: string, userId: string): Promise<MessageReaction | null> {
    // In production, query from database
    return null;
  }

  /**
   * Update existing reaction
   */
  private async updateReaction(reactionId: string, emoji: string): Promise<MessageReaction> {
    // In production, update in database
    const reaction: MessageReaction = {
      id: reactionId,
      messageId: '',
      userId: '',
      emoji,
      createdAt: new Date(),
    };

    await this.emitReactionEvent('updated', reaction);

    return reaction;
  }

  /**
   * Get all reactions for a message
   */
  private async getMessageReactions(messageId: string): Promise<MessageReaction[]> {
    // In production, query from database
    return [];
  }

  /**
   * Store reaction in database
   */
  private async storeReaction(reaction: MessageReaction): Promise<void> {
    // In production, save to database
    logger.debug('Reaction stored', { reactionId: reaction.id });
  }

  /**
   * Delete reaction from database
   */
  private async deleteReaction(reactionId: string): Promise<void> {
    // In production, delete from database
    logger.debug('Reaction deleted', { reactionId });
  }

  /**
   * Emit real-time reaction event
   */
  private async emitReactionEvent(event: 'added' | 'removed' | 'updated', reaction: MessageReaction): Promise<void> {
    // In production, emit via WebSocket or message queue
    logger.debug('Reaction event emitted', { event, reactionId: reaction.id });
  }

  private generateId(): string {
    return `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const messageReactionsService = new MessageReactionsService();
export default messageReactionsService;
