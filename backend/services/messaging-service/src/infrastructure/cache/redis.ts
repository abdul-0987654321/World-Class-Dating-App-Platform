import { createClient, RedisClientType } from 'redis';
import { createLogger } from '../../utils/logger';
import config from '../../config';

const logger = createLogger('redis');

class RedisClient {
  private client: RedisClientType | null = null;
  private isConnected = false;

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    try {
      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password || undefined,
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis', error);
      throw error;
    }
  }

  /**
   * Get Redis client
   */
  getClient(): RedisClientType {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not initialized or not connected');
    }
    return this.client;
  }

  /**
   * Set online status for user
   */
  async setOnlineStatus(userId: string, socketId: string): Promise<void> {
    try {
      const key = `user:online:${userId}`;
      await this.client?.setEx(key, config.redis.ttl.onlineStatus, socketId);
      await this.client?.set(`socket:${socketId}`, userId);
    } catch (error) {
      logger.error('Failed to set online status', error);
    }
  }

  /**
   * Remove online status for user
   */
  async removeOnlineStatus(userId: string, socketId: string): Promise<void> {
    try {
      await this.client?.del(`user:online:${userId}`);
      await this.client?.del(`socket:${socketId}`);
    } catch (error) {
      logger.error('Failed to remove online status', error);
    }
  }

  /**
   * Check if user is online
   */
  async isUserOnline(userId: string): Promise<boolean> {
    try {
      const key = `user:online:${userId}`;
      const result = await this.client?.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Failed to check online status', error);
      return false;
    }
  }

  /**
   * Get user ID from socket ID
   */
  async getUserIdFromSocket(socketId: string): Promise<string | null> {
    try {
      const result = await this.client?.get(`socket:${socketId}`);
      return typeof result === 'string' ? result : null;
    } catch (error) {
      logger.error('Failed to get user ID from socket', error);
      return null;
    }
  }

  /**
   * Set typing indicator
   */
  async setTypingIndicator(conversationId: string, userId: string): Promise<void> {
    try {
      const key = `typing:${conversationId}:${userId}`;
      await this.client?.setEx(key, config.redis.ttl.typingIndicator, '1');
    } catch (error) {
      logger.error('Failed to set typing indicator', error);
    }
  }

  /**
   * Remove typing indicator
   */
  async removeTypingIndicator(conversationId: string, userId: string): Promise<void> {
    try {
      const key = `typing:${conversationId}:${userId}`;
      await this.client?.del(key);
    } catch (error) {
      logger.error('Failed to remove typing indicator', error);
    }
  }

  /**
   * Cache message
   */
  async cacheMessage(messageId: string, message: any): Promise<void> {
    try {
      const key = `message:${messageId}`;
      await this.client?.setEx(
        key,
        config.redis.ttl.messageCache,
        JSON.stringify(message)
      );
    } catch (error) {
      logger.error('Failed to cache message', error);
    }
  }

  /**
   * Get cached message
   */
  async getCachedMessage(messageId: string): Promise<any | null> {
    try {
      const key = `message:${messageId}`;
      const data = await this.client?.get(key);
      return data ? (JSON.parse(data as string) as any) : null;
    } catch (error) {
      logger.error('Failed to get cached message', error);
      return null;
    }
  }

  /**
   * Check if user1 has blocked user2
   */
  async isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    try {
      const blockKey = `block:${blockerId}:${blockedId}`;
      const exists = await this.client?.exists(blockKey);
      return exists === 1;
    } catch (error) {
      logger.error('Failed to check block status', error);
      return false;
    }
  }

  /**
   * Get list of users blocked by a user
   */
  async getBlockedUsers(userId: string): Promise<string[]> {
    try {
      const members = await this.client?.sMembers(`blocker:${userId}:list`);
      return members || [];
    } catch (error) {
      logger.error('Failed to get blocked users list', error);
      return [];
    }
  }

  /**
   * Get list of users who have blocked a user
   */
  async getBlockedByUsers(userId: string): Promise<string[]> {
    try {
      const members = await this.client?.sMembers(`blocked:${userId}:list`);
      return members || [];
    } catch (error) {
      logger.error('Failed to get blocked-by users list', error);
      return [];
    }
  }

  /**
   * Check if there's a block relationship between two users (either direction)
   */
  async hasBlockRelationship(userId1: string, userId2: string): Promise<boolean> {
    try {
      const isUser1BlockedByUser2 = await this.isUserBlocked(userId1, userId2);
      const isUser2BlockedByUser1 = await this.isUserBlocked(userId2, userId1);
      return isUser1BlockedByUser2 || isUser2BlockedByUser1;
    } catch (error) {
      logger.error('Failed to check block relationship', error);
      return false;
    }
  }

  /**
   * Close connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Disconnected from Redis');
    }
  }

  /**
   * Generic set with expiry
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client?.setEx(key, ttlSeconds, value);
      } else {
        await this.client?.set(key, value);
      }
    } catch (error) {
      logger.error('Failed to set value:', error);
    }
  }

  /**
   * Generic get
   */
  async get(key: string): Promise<string | null> {
    try {
      const result = await this.client?.get(key);
      return typeof result === 'string' ? result : null;
    } catch (error) {
      logger.error('Failed to get value:', error);
      return null;
    }
  }

  /**
   * Get keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client?.keys(pattern) || [];
    } catch (error) {
      logger.error('Failed to get keys:', error);
      return [];
    }
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    try {
      await this.client?.del(key);
    } catch (error) {
      logger.error('Failed to delete key:', error);
    }
  }
}

// Export singleton instance
export const redisClient = new RedisClient();
export { RedisClient };
export default redisClient;
