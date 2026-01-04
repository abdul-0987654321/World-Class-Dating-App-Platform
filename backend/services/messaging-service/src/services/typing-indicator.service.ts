/**
 * Typing Indicator Service
 * Manages real-time typing indicators with Redis for cross-instance coordination
 */

import { createLogger } from '../utils/logger';
import redisClient from '../infrastructure/cache/redis';
import { TypingIndicator } from '../types';
import config from '../config';

const logger = createLogger('typing-indicator-service');

// Typing indicator TTL in seconds (auto-expire if not refreshed)
const TYPING_TTL = config.redis.ttl.typingIndicator || 10;

// Minimum interval between typing indicator updates (debounce)
const TYPING_DEBOUNCE_MS = 2000;

export interface TypingState {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  startedAt: Date;
  expiresAt: Date;
}

export class TypingIndicatorService {
  private readonly keyPrefix = 'typing:';
  private readonly pubSubChannel = 'typing:updates';
  private lastTypingUpdate: Map<string, number> = new Map();

  /**
   * Start typing indicator for a user in a conversation
   */
  async startTyping(conversationId: string, userId: string): Promise<boolean> {
    try {
      const key = this.getTypingKey(conversationId, userId);
      const now = Date.now();

      // Debounce rapid typing updates
      const lastUpdate = this.lastTypingUpdate.get(key);
      if (lastUpdate && now - lastUpdate < TYPING_DEBOUNCE_MS) {
        // Just extend the TTL without publishing update
        await redisClient.getClient().expire(key, TYPING_TTL);
        return true;
      }

      const typingState: TypingState = {
        userId,
        conversationId,
        isTyping: true,
        startedAt: new Date(),
        expiresAt: new Date(now + TYPING_TTL * 1000),
      };

      // Store typing state with TTL
      await redisClient.getClient().setEx(
        key,
        TYPING_TTL,
        JSON.stringify(typingState)
      );

      // Update last typing timestamp
      this.lastTypingUpdate.set(key, now);

      // Publish typing start event for cross-instance coordination
      await this.publishTypingEvent({
        conversationId,
        userId,
        isTyping: true,
        timestamp: new Date(),
      });

      logger.debug(`Typing started: user ${userId} in conversation ${conversationId}`);
      return true;
    } catch (error: any) {
      logger.error('Failed to start typing indicator:', error);
      return false;
    }
  }

  /**
   * Stop typing indicator for a user in a conversation
   */
  async stopTyping(conversationId: string, userId: string): Promise<boolean> {
    try {
      const key = this.getTypingKey(conversationId, userId);

      // Delete typing state
      await redisClient.getClient().del(key);

      // Clear last update timestamp
      this.lastTypingUpdate.delete(key);

      // Publish typing stop event
      await this.publishTypingEvent({
        conversationId,
        userId,
        isTyping: false,
        timestamp: new Date(),
      });

      logger.debug(`Typing stopped: user ${userId} in conversation ${conversationId}`);
      return true;
    } catch (error: any) {
      logger.error('Failed to stop typing indicator:', error);
      return false;
    }
  }

  /**
   * Get current typing state for a conversation
   * Returns list of users currently typing
   */
  async getTypingUsers(conversationId: string): Promise<string[]> {
    try {
      const pattern = `${this.keyPrefix}${conversationId}:*`;
      const keys = await redisClient.getClient().keys(pattern);

      if (keys.length === 0) {
        return [];
      }

      const typingUsers: string[] = [];
      const now = Date.now();

      for (const key of keys) {
        const stateStr = await redisClient.getClient().get(key);
        if (stateStr && typeof stateStr === 'string') {
          const state: TypingState = JSON.parse(stateStr);
          // Only include if not expired (double-check)
          if (new Date(state.expiresAt).getTime() > now && state.isTyping) {
            typingUsers.push(state.userId);
          }
        }
      }

      return typingUsers;
    } catch (error: any) {
      logger.error('Failed to get typing users:', error);
      return [];
    }
  }

  /**
   * Check if a specific user is typing in a conversation
   */
  async isUserTyping(conversationId: string, userId: string): Promise<boolean> {
    try {
      const key = this.getTypingKey(conversationId, userId);
      const stateStr = await redisClient.getClient().get(key);

      if (!stateStr || typeof stateStr !== 'string') {
        return false;
      }

      const state: TypingState = JSON.parse(stateStr);
      const now = Date.now();

      return state.isTyping && new Date(state.expiresAt).getTime() > now;
    } catch (error: any) {
      logger.error('Failed to check typing state:', error);
      return false;
    }
  }

  /**
   * Get typing state for all active conversations for a user
   * Useful for showing who is typing in the conversation list
   */
  async getTypingStateForUser(userId: string, conversationIds: string[]): Promise<Map<string, string[]>> {
    try {
      const typingMap = new Map<string, string[]>();

      for (const conversationId of conversationIds) {
        const typingUsers = await this.getTypingUsers(conversationId);
        // Filter out the requesting user
        const otherTypingUsers = typingUsers.filter(id => id !== userId);
        if (otherTypingUsers.length > 0) {
          typingMap.set(conversationId, otherTypingUsers);
        }
      }

      return typingMap;
    } catch (error: any) {
      logger.error('Failed to get typing state for user:', error);
      return new Map();
    }
  }

  /**
   * Clear all typing indicators for a user (e.g., when user disconnects)
   */
  async clearTypingForUser(userId: string): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}*:${userId}`;
      const keys = await redisClient.getClient().keys(pattern);

      if (keys.length > 0) {
        // Get conversation IDs before deleting
        const conversationIds: string[] = [];
        for (const key of keys) {
          const parts = key.split(':');
          if (parts.length >= 2) {
            conversationIds.push(parts[1]);
          }
        }

        // Delete all typing states
        await redisClient.getClient().del(keys);

        // Publish stop events for each conversation
        for (const conversationId of conversationIds) {
          await this.publishTypingEvent({
            conversationId,
            userId,
            isTyping: false,
            timestamp: new Date(),
          });
        }

        logger.info(`Cleared ${keys.length} typing indicators for user ${userId}`);
      }
    } catch (error: any) {
      logger.error('Failed to clear typing for user:', error);
    }
  }

  /**
   * Publish typing event for cross-instance coordination
   */
  private async publishTypingEvent(indicator: TypingIndicator): Promise<void> {
    try {
      await redisClient.getClient().publish(
        this.pubSubChannel,
        JSON.stringify(indicator)
      );
    } catch (error: any) {
      logger.error('Failed to publish typing event:', error);
    }
  }

  /**
   * Subscribe to typing events (for WebSocket broadcast)
   * Returns unsubscribe function
   */
  async subscribeToTypingEvents(
    callback: (indicator: TypingIndicator) => void
  ): Promise<() => void> {
    try {
      const subscriber = redisClient.getClient().duplicate();
      await subscriber.connect();

      await subscriber.subscribe(this.pubSubChannel, (message) => {
        try {
          const indicator: TypingIndicator = JSON.parse(message);
          callback(indicator);
        } catch (parseError) {
          logger.error('Failed to parse typing event:', parseError);
        }
      });

      logger.info('Subscribed to typing events');

      // Return unsubscribe function
      return async () => {
        await subscriber.unsubscribe(this.pubSubChannel);
        await subscriber.quit();
        logger.info('Unsubscribed from typing events');
      };
    } catch (error: any) {
      logger.error('Failed to subscribe to typing events:', error);
      return () => {};
    }
  }

  /**
   * Generate Redis key for typing state
   */
  private getTypingKey(conversationId: string, userId: string): string {
    return `${this.keyPrefix}${conversationId}:${userId}`;
  }

  /**
   * Get typing indicator TTL
   */
  getTypingTTL(): number {
    return TYPING_TTL;
  }

  /**
   * Get typing debounce interval
   */
  getTypingDebounceMs(): number {
    return TYPING_DEBOUNCE_MS;
  }
}

export const typingIndicatorService = new TypingIndicatorService();
export default typingIndicatorService;
