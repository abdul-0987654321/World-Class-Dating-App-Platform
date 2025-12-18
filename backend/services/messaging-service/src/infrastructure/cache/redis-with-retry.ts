import { createClient, RedisClientType } from 'redis';
import { createLogger } from '../../utils/logger';
import config from '../../config';

const logger = createLogger('redis-with-retry');

/**
 * Retry utility with exponential backoff for Redis operations
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      const retryableErrors = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', 'NR_CLOSED', 'CONNECTION_CLOSED'];
      const isRetryable = retryableErrors.includes(error.code) ||
                          error.message?.toLowerCase().includes('connection') ||
                          error.message?.toLowerCase().includes('timeout') ||
                          error.message?.toLowerCase().includes('closed');

      if (!isRetryable || attempt === maxRetries) {
        logger.error(`Redis ${operationName} failed`, {
          attempt,
          error: error.message,
          code: error.code,
          retryable: isRetryable,
        });
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
      const jitter = Math.random() * 0.5 * delay;
      const finalDelay = Math.round(delay + jitter);

      logger.warn(`Redis ${operationName} failed, retrying in ${finalDelay}ms`, {
        attempt,
        maxRetries,
        error: error.message,
      });

      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }

  throw lastError!;
}

/**
 * Create reconnection strategy with exponential backoff
 */
function createReconnectStrategy(retries: number): number | Error {
  const maxRetries = 10;

  if (retries > maxRetries) {
    logger.error(`Redis max reconnection attempts (${maxRetries}) exceeded`);
    return new Error(`Max reconnection attempts (${maxRetries}) exceeded`);
  }

  const delay = Math.min(1000 * Math.pow(2, retries - 1), 30000);
  const jitter = Math.random() * 0.5 * delay;
  const finalDelay = Math.round(delay + jitter);

  logger.warn(`Redis reconnecting in ${finalDelay}ms`, {
    attempt: retries,
    maxRetries,
  });

  return finalDelay;
}

/**
 * Enhanced Redis client with retry logic
 */
class RedisClient {
  private client: RedisClientType | null = null;
  private isConnected = false;

  /**
   * Initialize Redis connection with retry logic
   */
  async connect(): Promise<void> {
    await withRetry(async () => {
      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
          connectTimeout: 10000,
          reconnectStrategy: createReconnectStrategy,
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
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis client disconnected');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.warn('Redis client reconnecting');
        this.isConnected = false;
      });

      await this.client.connect();
    }, 'connect', 5, 1000);
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
   * Set online status for user with retry
   */
  async setOnlineStatus(userId: string, socketId: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      logger.warn('Redis not connected, skipping setOnlineStatus');
      return;
    }

    try {
      await withRetry(async () => {
        const key = `user:online:${userId}`;
        await this.client!.setEx(key, config.redis.ttl.onlineStatus, socketId);
        await this.client!.set(`socket:${socketId}`, userId);
      }, 'setOnlineStatus', 3, 500);
    } catch (error) {
      logger.error('Failed to set online status', error);
    }
  }

  /**
   * Remove online status for user with retry
   */
  async removeOnlineStatus(userId: string, socketId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await withRetry(async () => {
        await this.client!.del(`user:online:${userId}`);
        await this.client!.del(`socket:${socketId}`);
      }, 'removeOnlineStatus', 3, 500);
    } catch (error) {
      logger.error('Failed to remove online status', error);
    }
  }

  /**
   * Check if user is online with retry
   */
  async isUserOnline(userId: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    try {
      const result = await withRetry(
        () => this.client!.exists(`user:online:${userId}`),
        'isUserOnline',
        3,
        500
      );
      return result === 1;
    } catch (error) {
      logger.error('Failed to check online status', error);
      return false;
    }
  }

  /**
   * Get user ID from socket ID with retry
   */
  async getUserIdFromSocket(socketId: string): Promise<string | null> {
    if (!this.client || !this.isConnected) return null;

    try {
      return await withRetry(
        () => this.client!.get(`socket:${socketId}`),
        'getUserIdFromSocket',
        3,
        500
      ) || null;
    } catch (error) {
      logger.error('Failed to get user ID from socket', error);
      return null;
    }
  }

  /**
   * Set typing indicator with retry
   */
  async setTypingIndicator(conversationId: string, userId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await withRetry(
        () => this.client!.setEx(`typing:${conversationId}:${userId}`, config.redis.ttl.typingIndicator, '1'),
        'setTypingIndicator',
        3,
        500
      );
    } catch (error) {
      logger.error('Failed to set typing indicator', error);
    }
  }

  /**
   * Remove typing indicator with retry
   */
  async removeTypingIndicator(conversationId: string, userId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await withRetry(
        () => this.client!.del(`typing:${conversationId}:${userId}`),
        'removeTypingIndicator',
        3,
        500
      );
    } catch (error) {
      logger.error('Failed to remove typing indicator', error);
    }
  }

  /**
   * Cache message with retry
   */
  async cacheMessage(messageId: string, message: any): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await withRetry(
        () => this.client!.setEx(`message:${messageId}`, config.redis.ttl.messageCache, JSON.stringify(message)),
        'cacheMessage',
        3,
        500
      );
    } catch (error) {
      logger.error('Failed to cache message', error);
    }
  }

  /**
   * Get cached message with retry
   */
  async getCachedMessage(messageId: string): Promise<any | null> {
    if (!this.client || !this.isConnected) return null;

    try {
      const data = await withRetry(
        () => this.client!.get(`message:${messageId}`),
        'getCachedMessage',
        3,
        500
      );
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get cached message', error);
      return null;
    }
  }

  /**
   * Check if user1 has blocked user2 with retry
   */
  async isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    try {
      const exists = await withRetry(
        () => this.client!.exists(`block:${blockerId}:${blockedId}`),
        'isUserBlocked',
        3,
        500
      );
      return exists === 1;
    } catch (error) {
      logger.error('Failed to check block status', error);
      return false;
    }
  }

  /**
   * Get list of users blocked by a user with retry
   */
  async getBlockedUsers(userId: string): Promise<string[]> {
    if (!this.client || !this.isConnected) return [];

    try {
      const members = await withRetry(
        () => this.client!.sMembers(`blocker:${userId}:list`),
        'getBlockedUsers',
        3,
        500
      );
      return members || [];
    } catch (error) {
      logger.error('Failed to get blocked users list', error);
      return [];
    }
  }

  /**
   * Get list of users who have blocked a user with retry
   */
  async getBlockedByUsers(userId: string): Promise<string[]> {
    if (!this.client || !this.isConnected) return [];

    try {
      const members = await withRetry(
        () => this.client!.sMembers(`blocked:${userId}:list`),
        'getBlockedByUsers',
        3,
        500
      );
      return members || [];
    } catch (error) {
      logger.error('Failed to get blocked-by users list', error);
      return [];
    }
  }

  /**
   * Check if there's a block relationship between two users with retry
   */
  async hasBlockRelationship(userId1: string, userId2: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

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
   * Generic set with expiry and retry
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await withRetry(async () => {
        if (ttlSeconds) {
          await this.client!.setEx(key, ttlSeconds, value);
        } else {
          await this.client!.set(key, value);
        }
      }, 'set', 3, 500);
    } catch (error) {
      logger.error('Failed to set value:', error);
    }
  }

  /**
   * Generic get with retry
   */
  async get(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) return null;

    try {
      return await withRetry(
        () => this.client!.get(key),
        'get',
        3,
        500
      ) || null;
    } catch (error) {
      logger.error('Failed to get value:', error);
      return null;
    }
  }

  /**
   * Get keys matching pattern with retry
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.client || !this.isConnected) return [];

    try {
      return await withRetry(
        () => this.client!.keys(pattern),
        'keys',
        3,
        500
      ) || [];
    } catch (error) {
      logger.error('Failed to get keys:', error);
      return [];
    }
  }

  /**
   * Delete a key with retry
   */
  async del(key: string): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await withRetry(
        () => this.client!.del(key),
        'del',
        3,
        500
      );
    } catch (error) {
      logger.error('Failed to delete key:', error);
    }
  }

  /**
   * Health check with retry
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    if (!this.client || !this.isConnected) {
      return { healthy: false, error: 'Redis not connected' };
    }

    try {
      const start = Date.now();
      await withRetry(() => this.client!.ping(), 'healthCheck', 2, 1000);
      const latency = Date.now() - start;

      return { healthy: true, latency };
    } catch (error: any) {
      return { healthy: false, error: error.message };
    }
  }
}

// Export singleton instance
export const redisClient = new RedisClient();
export { RedisClient };
export default redisClient;
