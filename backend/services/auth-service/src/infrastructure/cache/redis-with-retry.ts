import { createClient, RedisClientType } from 'redis';
import { config } from '../../config';
import logger from '../../utils/logger';

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
        code: error.code,
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
 * Enhanced Redis cache client with retry logic and exponential backoff
 */
class RedisCache {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  async connect(): Promise<void> {
    await withRetry(async () => {
      this.client = createClient({
        url: config.redis.url,
        socket: {
          connectTimeout: 10000,
          reconnectStrategy: createReconnectStrategy,
        },
      });

      this.client.on('error', (err) => {
        logger.error('Redis client error', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        logger.warn('Redis client reconnecting');
        this.isConnected = false;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });

      await this.client.connect();
    }, 'connect', 5, 1000);
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
    if (!this.client || !this.isConnected) {
      logger.warn('Redis not connected, skipping setRefreshToken');
      return;
    }

    try {
      await withRetry(async () => {
        // Store the refresh token
        await this.client!.setEx(`refresh_token:${userId}`, expiresInSeconds, token);

        // If tokenId is provided, store it in the token family for rotation detection
        if (tokenId) {
          await this.client!.setEx(`refresh_token_family:${tokenId}`, expiresInSeconds, userId);
        }
      }, 'setRefreshToken', 3, 500);
    } catch (error) {
      logger.error('Failed to store refresh token after retries', error);
      // Don't throw - allow service to continue without Redis
    }
  }

  /**
   * Get the stored refresh token for a user
   */
  async getRefreshToken(userId: string): Promise<string | null> {
    if (!this.client || !this.isConnected) return null;

    try {
      return await withRetry(
        () => this.client!.get(`refresh_token:${userId}`),
        'getRefreshToken',
        3,
        500
      );
    } catch (error) {
      logger.error('Failed to get refresh token after retries', error);
      return null;
    }
  }

  /**
   * Check if a refresh token has been used before (rotation reuse detection)
   */
  async isRefreshTokenReused(tokenId: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    try {
      const userId = await withRetry(
        () => this.client!.get(`refresh_token_family:${tokenId}`),
        'isRefreshTokenReused',
        3,
        500
      );
      return userId !== null;
    } catch (error) {
      logger.error('Failed to check token reuse after retries', error);
      return false;
    }
  }

  /**
   * Invalidate all refresh tokens for a user (on security breach detection)
   */
  async invalidateAllUserTokens(userId: string): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await withRetry(async () => {
        // Remove the current refresh token
        await this.client!.del(`refresh_token:${userId}`);

        // Find and remove all tokens in the family
        const pattern = `refresh_token_family:*`;
        const keys = await this.client!.keys(pattern);

        for (const key of keys) {
          const storedUserId = await this.client!.get(key);
          if (storedUserId === userId) {
            await this.client!.del(key);
          }
        }

        logger.warn(`Invalidated all tokens for user ${userId} due to security breach`);
      }, 'invalidateAllUserTokens', 3, 1000);
    } catch (error) {
      logger.error('Failed to invalidate all user tokens after retries', error);
    }
  }

  /**
   * Remove a user's refresh token (logout)
   */
  async removeRefreshToken(userId: string, tokenId?: string): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await withRetry(async () => {
        await this.client!.del(`refresh_token:${userId}`);

        if (tokenId) {
          await this.client!.del(`refresh_token_family:${tokenId}`);
        }
      }, 'removeRefreshToken', 3, 500);
    } catch (error) {
      logger.error('Failed to remove refresh token after retries', error);
    }
  }

  /**
   * Blacklist an access token (for logout before expiry)
   */
  async blacklistToken(token: string, expiresInSeconds: number): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await withRetry(
        () => this.client!.setEx(`blacklist:${token}`, expiresInSeconds, '1'),
        'blacklistToken',
        3,
        500
      );
    } catch (error) {
      logger.error('Failed to blacklist token after retries', error);
    }
  }

  /**
   * Check if a token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    try {
      const result = await withRetry(
        () => this.client!.get(`blacklist:${token}`),
        'isTokenBlacklisted',
        3,
        500
      );
      return result !== null;
    } catch (error) {
      logger.error('Failed to check token blacklist after retries', error);
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
      await withRetry(
        () => this.client!.setEx(`verification:${token}`, expiresInSeconds, JSON.stringify(data)),
        'setVerificationToken',
        3,
        500
      );
    } catch (error) {
      logger.error('Failed to store verification token after retries', error);
    }
  }

  /**
   * Get verification token data
   */
  async getVerificationToken(token: string): Promise<{ userId: string; type: string } | null> {
    if (!this.client || !this.isConnected) return null;

    try {
      const data = await withRetry(
        () => this.client!.get(`verification:${token}`),
        'getVerificationToken',
        3,
        500
      );
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get verification token after retries', error);
      return null;
    }
  }

  /**
   * Remove verification token
   */
  async removeVerificationToken(token: string): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await withRetry(
        () => this.client!.del(`verification:${token}`),
        'removeVerificationToken',
        3,
        500
      );
    } catch (error) {
      logger.error('Failed to remove verification token after retries', error);
    }
  }

  /**
   * Generic get method
   */
  async get(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) return null;

    try {
      return await withRetry(
        () => this.client!.get(key),
        'get',
        3,
        500
      );
    } catch (error) {
      logger.error('Failed to get key from Redis after retries', error);
      return null;
    }
  }

  /**
   * Generic set method
   */
  async set(key: string, value: string, expiresInSeconds?: number): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await withRetry(async () => {
        if (expiresInSeconds) {
          await this.client!.setEx(key, expiresInSeconds, value);
        } else {
          await this.client!.set(key, value);
        }
      }, 'set', 3, 500);
    } catch (error) {
      logger.error('Failed to set key in Redis after retries', error);
    }
  }

  /**
   * Generic delete method
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
      logger.error('Failed to delete key from Redis after retries', error);
    }
  }

  /**
   * Health check
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

export const redisCache = new RedisCache();
export default redisCache;
