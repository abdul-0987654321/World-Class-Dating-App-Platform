import { createClient, RedisClientType } from 'redis';
import { createLogger } from '@connectsphere/shared';
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
      return await this.client?.get(`socket:${socketId}`) || null;
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
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get cached message', error);
      return null;
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
}

// Export singleton instance
export const redisClient = new RedisClient();
export default redisClient;
