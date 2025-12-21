import { createClient, RedisClientType } from 'redis';
import { config } from '../../config';
import logger from '../../utils/logger';

class RedisCache {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  async connect(): Promise<void> {
    try {
      this.client = createClient({ url: config.redis.url });

      this.client.on('error', (err) => {
        logger.error('Redis client error', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis', error);
      // Don't throw - allow service to work without Redis
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info('Redis client disconnected');
    }
  }

  /**
   * Store a refresh token for a user with token family tracking
   * Used for refresh token rotation with reuse detection
   */
  async setRefreshToken(userId: string, token: string, expiresInSeconds: number, tokenId?: string): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      // Store the refresh token
      await this.client.setEx(`refresh_token:${userId}`, expiresInSeconds, token);

      // If tokenId is provided, store it in the token family for rotation detection
      if (tokenId) {
        await this.client.setEx(`refresh_token_family:${tokenId}`, expiresInSeconds, userId);
      }
    } catch (error) {
      logger.error('Failed to store refresh token', error);
    }
  }

  /**
   * Get the stored refresh token for a user
   */
  async getRefreshToken(userId: string): Promise<string | null> {
    if (!this.client || !this.isConnected) return null;

    try {
      const result = await this.client.get(`refresh_token:${userId}`);
      return typeof result === 'string' ? result : null;
    } catch (error) {
      logger.error('Failed to get refresh token', error);
      return null;
    }
  }

  /**
   * Check if a refresh token has been used before (rotation reuse detection)
   */
  async isRefreshTokenReused(tokenId: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    try {
      const userId = await this.client.get(`refresh_token_family:${tokenId}`);
      // If token ID exists in family but is different from current, it's been reused
      return userId !== null;
    } catch (error) {
      logger.error('Failed to check token reuse', error);
      return false;
    }
  }

  /**
   * Invalidate all refresh tokens for a user (on security breach detection)
   */
  async invalidateAllUserTokens(userId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      // Remove the current refresh token
      await this.client.del(`refresh_token:${userId}`);

      // Find and remove all tokens in the family
      const pattern = `refresh_token_family:*`;
      const keys = await this.client.keys(pattern);

      for (const key of keys) {
        const storedUserId = await this.client.get(key);
        if (storedUserId === userId) {
          await this.client.del(key);
        }
      }

      logger.warn(`Invalidated all tokens for user ${userId} due to security breach`);
    } catch (error) {
      logger.error('Failed to invalidate all user tokens', error);
    }
  }

  /**
   * Remove a user's refresh token (logout)
   */
  async removeRefreshToken(userId: string, tokenId?: string): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await this.client.del(`refresh_token:${userId}`);

      // Also remove from token family if tokenId provided
      if (tokenId) {
        await this.client.del(`refresh_token_family:${tokenId}`);
      }
    } catch (error) {
      logger.error('Failed to remove refresh token', error);
    }
  }

  /**
   * Blacklist an access token (for logout before expiry)
   */
  async blacklistToken(token: string, expiresInSeconds: number): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await this.client.setEx(`blacklist:${token}`, expiresInSeconds, '1');
    } catch (error) {
      logger.error('Failed to blacklist token', error);
    }
  }

  /**
   * Check if a token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    try {
      const result = await this.client.get(`blacklist:${token}`);
      return result !== null;
    } catch (error) {
      logger.error('Failed to check token blacklist', error);
      return false;
    }
  }

  /**
   * Store a verification token
   */
  async setVerificationToken(
    token: string,
    data: { userId: string; type: string },
    expiresInSeconds: number
  ): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await this.client.setEx(
        `verification:${token}`,
        expiresInSeconds,
        JSON.stringify(data)
      );
    } catch (error) {
      logger.error('Failed to store verification token', error);
    }
  }

  /**
   * Get verification token data
   */
  async getVerificationToken(token: string): Promise<{ userId: string; type: string } | null> {
    if (!this.client || !this.isConnected) return null;

    try {
      const data = await this.client.get(`verification:${token}`);
      return data ? (JSON.parse(data as string) as { userId: string; type: string }) : null;
    } catch (error) {
      logger.error('Failed to get verification token', error);
      return null;
    }
  }

  /**
   * Remove verification token
   */
  async removeVerificationToken(token: string): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await this.client.del(`verification:${token}`);
    } catch (error) {
      logger.error('Failed to remove verification token', error);
    }
  }

  /**
   * Generic get method
   */
  async get(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) return null;

    try {
      const result = await this.client.get(key);
      return typeof result === 'string' ? result : null;
    } catch (error) {
      logger.error('Failed to get key from Redis', error);
      return null;
    }
  }

  /**
   * Generic set method
   */
  async set(key: string, value: string, expiresInSeconds?: number): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      if (expiresInSeconds) {
        await this.client.setEx(key, expiresInSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Failed to set key in Redis', error);
    }
  }

  /**
   * Generic delete method
   */
  async del(key: string): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Failed to delete key from Redis', error);
    }
  }

  /**
   * Get a list from Redis
   */
  async getList(key: string): Promise<string[]> {
    if (!this.client || !this.isConnected) return [];

    try {
      return await this.client.lRange(key, 0, -1);
    } catch (error) {
      logger.error('Failed to get list from Redis', error);
      return [];
    }
  }

  /**
   * Add item to a list
   */
  async addToList(key: string, value: string): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await this.client.rPush(key, value);
    } catch (error) {
      logger.error('Failed to add to list in Redis', error);
    }
  }

  /**
   * Remove item from a list
   */
  async removeFromList(key: string, value: string): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await this.client.lRem(key, 0, value);
    } catch (error) {
      logger.error('Failed to remove from list in Redis', error);
    }
  }

  /**
   * Set an entire list (replaces existing)
   */
  async setList(key: string, values: string[]): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await this.client.del(key);
      if (values.length > 0) {
        await this.client.rPush(key, values);
      }
    } catch (error) {
      logger.error('Failed to set list in Redis', error);
    }
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      logger.error('Failed to set expiration in Redis', error);
    }
  }

  /**
   * Increment a key's value
   */
  async increment(key: string): Promise<number> {
    if (!this.client || !this.isConnected) return 0;

    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error('Failed to increment key in Redis', error);
      return 0;
    }
  }

  /**
   * Decrement a key's value
   */
  async decrement(key: string): Promise<number> {
    if (!this.client || !this.isConnected) return 0;

    try {
      return await this.client.decr(key);
    } catch (error) {
      logger.error('Failed to decrement key in Redis', error);
      return 0;
    }
  }

  /**
   * Get TTL (time to live) of a key in seconds
   */
  async getTTL(key: string): Promise<number> {
    if (!this.client || !this.isConnected) return 0;

    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Failed to get TTL in Redis', error);
      return 0;
    }
  }
}

export const redisCache = new RedisCache();
export default redisCache;
