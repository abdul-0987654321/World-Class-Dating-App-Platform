import { createClient, RedisClientType } from 'redis';
import config from '../../config';

/**
 * Logger interface for retry operations
 */
interface Logger {
  info: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
}

const logger: Logger = {
  info: (message: string, meta?: any) => console.log(`[Redis] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[Redis] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[Redis] ${message}`, meta || ''),
};

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
 * Enhanced Redis client with retry logic for automation service
 */
let redisClient: RedisClientType | null = null;

/**
 * Initialize Redis connection with retry logic
 */
export async function initializeRedis(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  return await withRetry(async () => {
    redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
        connectTimeout: 10000,
        reconnectStrategy: createReconnectStrategy,
      },
      password: config.redis.password,
      database: config.redis.db,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('Redis ready');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis reconnecting...');
    });

    redisClient.on('disconnect', () => {
      logger.warn('Redis disconnected');
    });

    await redisClient.connect();
    logger.info('Redis connection established');

    return redisClient;
  }, 'connect', 5, 1000);
}

/**
 * Get Redis client
 */
export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
    } catch (error: any) {
      logger.error('Error closing Redis connection', error.message);
    }
  }
}

/**
 * Redis cache helpers with retry logic
 */
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = getRedisClient();
      const value = await withRetry(
        () => client.get(key),
        'get',
        3,
        500
      );
      return value ? (JSON.parse(value as string) as T) : null;
    } catch (error) {
      logger.error('Error getting key', error);
      return null;
    }
  },

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const client = getRedisClient();
      const serialized = JSON.stringify(value);
      await withRetry(async () => {
        if (ttlSeconds) {
          await client.setEx(key, ttlSeconds, serialized);
        } else {
          await client.set(key, serialized);
        }
      }, 'set', 3, 500);
    } catch (error) {
      logger.error('Error setting key', error);
    }
  },

  async delete(key: string): Promise<void> {
    try {
      const client = getRedisClient();
      await withRetry(
        () => client.del(key),
        'delete',
        3,
        500
      );
    } catch (error) {
      logger.error('Error deleting key', error);
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      const client = getRedisClient();
      const result = await withRetry(
        () => client.exists(key),
        'exists',
        3,
        500
      );
      return result === 1;
    } catch (error) {
      logger.error('Error checking key existence', error);
      return false;
    }
  },

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      const client = getRedisClient();
      await withRetry(
        () => client.expire(key, ttlSeconds),
        'expire',
        3,
        500
      );
    } catch (error) {
      logger.error('Error setting expiration', error);
    }
  },

  async keys(pattern: string): Promise<string[]> {
    try {
      const client = getRedisClient();
      return await withRetry(
        () => client.keys(pattern),
        'keys',
        3,
        500
      ) || [];
    } catch (error) {
      logger.error('Error getting keys', error);
      return [];
    }
  },

  async incr(key: string): Promise<number> {
    try {
      const client = getRedisClient();
      return await withRetry(
        () => client.incr(key),
        'incr',
        3,
        500
      );
    } catch (error) {
      logger.error('Error incrementing key', error);
      return 0;
    }
  },

  async decr(key: string): Promise<number> {
    try {
      const client = getRedisClient();
      return await withRetry(
        () => client.decr(key),
        'decr',
        3,
        500
      );
    } catch (error) {
      logger.error('Error decrementing key', error);
      return 0;
    }
  },

  async hGet(key: string, field: string): Promise<string | null> {
    try {
      const client = getRedisClient();
      const result = await withRetry(
        () => client.hGet(key, field),
        'hGet',
        3,
        500
      );
      return typeof result === 'string' ? result : null;
    } catch (error) {
      logger.error('Error getting hash field', error);
      return null;
    }
  },

  async hSet(key: string, field: string, value: string): Promise<void> {
    try {
      const client = getRedisClient();
      await withRetry(
        () => client.hSet(key, field, value),
        'hSet',
        3,
        500
      );
    } catch (error) {
      logger.error('Error setting hash field', error);
    }
  },

  async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      const client = getRedisClient();
      return await withRetry(
        () => client.hGetAll(key),
        'hGetAll',
        3,
        500
      ) || {};
    } catch (error) {
      logger.error('Error getting all hash fields', error);
      return {};
    }
  },

  async lPush(key: string, ...values: string[]): Promise<void> {
    try {
      const client = getRedisClient();
      await withRetry(
        () => client.lPush(key, values),
        'lPush',
        3,
        500
      );
    } catch (error) {
      logger.error('Error pushing to list', error);
    }
  },

  async rPush(key: string, ...values: string[]): Promise<void> {
    try {
      const client = getRedisClient();
      await withRetry(
        () => client.rPush(key, values),
        'rPush',
        3,
        500
      );
    } catch (error) {
      logger.error('Error pushing to list', error);
    }
  },

  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      const client = getRedisClient();
      return await withRetry(
        () => client.lRange(key, start, stop),
        'lRange',
        3,
        500
      ) || [];
    } catch (error) {
      logger.error('Error getting list range', error);
      return [];
    }
  },

  async sAdd(key: string, ...members: string[]): Promise<void> {
    try {
      const client = getRedisClient();
      await withRetry(
        () => client.sAdd(key, members),
        'sAdd',
        3,
        500
      );
    } catch (error) {
      logger.error('Error adding to set', error);
    }
  },

  async sMembers(key: string): Promise<string[]> {
    try {
      const client = getRedisClient();
      return await withRetry(
        () => client.sMembers(key),
        'sMembers',
        3,
        500
      ) || [];
    } catch (error) {
      logger.error('Error getting set members', error);
      return [];
    }
  },

  async sIsMember(key: string, member: string): Promise<boolean> {
    try {
      const client = getRedisClient();
      const result = await withRetry(
        () => client.sIsMember(key, member),
        'sIsMember',
        3,
        500
      );
      return Boolean(result);
    } catch (error) {
      logger.error('Error checking set membership', error);
      return false;
    }
  },
};

/**
 * Health check with retry
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  try {
    const client = getRedisClient();
    const start = Date.now();
    await withRetry(() => client.ping(), 'healthCheck', 2, 1000);
    const latency = Date.now() - start;

    return { healthy: true, latency };
  } catch (error: any) {
    return { healthy: false, error: error.message };
  }
}

export default { initializeRedis, getRedisClient, closeRedis, cache, healthCheck };
