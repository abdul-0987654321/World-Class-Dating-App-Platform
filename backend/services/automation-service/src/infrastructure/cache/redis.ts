import { createLogger } from '@flamoral/backend-shared';
import { createClient, RedisClientType } from 'redis';

import config from '../../config';

const logger = createLogger('automation-service:redis');

/**
 * Redis client instance
 */
let redisClient: RedisClientType | null = null;

/**
 * Initialize Redis connection
 */
export async function initializeRedis(): Promise<RedisClientType> {
  try {
    redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
      database: config.redis.db,
    });

    redisClient.on('error', (err) => {
      logger.error('Connection error', { error: err });
    });

    redisClient.on('connect', () => {
      logger.info('Connected successfully');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Reconnecting...');
    });

    await redisClient.connect();
    logger.info('Connection established');

    return redisClient;
  } catch (error: any) {
    logger.error('Initialization failed', { error: error.message });
    throw error;
  }
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
      logger.info('Connection closed');
    } catch (error: any) {
      logger.error('Error closing connection', { error: error.message });
    }
  }
}

/**
 * Redis cache helpers
 */
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = getRedisClient();
      const value = await client.get(key);
      return value ? (JSON.parse(value as string) as T) : null;
    } catch (error) {
      logger.error('Error getting key', { error });
      return null;
    }
  },

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const client = getRedisClient();
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await client.setEx(key, ttlSeconds, serialized);
      } else {
        await client.set(key, serialized);
      }
    } catch (error) {
      logger.error('Error setting key', { error });
    }
  },

  async delete(key: string): Promise<void> {
    try {
      const client = getRedisClient();
      await client.del(key);
    } catch (error) {
      logger.error('Error deleting key', { error });
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      const client = getRedisClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Error checking key existence', { error });
      return false;
    }
  },

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      const client = getRedisClient();
      await client.expire(key, ttlSeconds);
    } catch (error) {
      logger.error('Error setting expiration', { error });
    }
  },
};

export default { initializeRedis, getRedisClient, closeRedis, cache };
