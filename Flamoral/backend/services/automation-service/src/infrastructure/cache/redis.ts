import { createClient, RedisClientType } from 'redis';
import config from '../../config';

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
      console.error('[Redis] Connection error:', err);
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    redisClient.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...');
    });

    await redisClient.connect();
    console.log('[Redis] Connection established');

    return redisClient;
  } catch (error: any) {
    console.error('[Redis] Initialization failed:', error.message);
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
      console.log('[Redis] Connection closed');
    } catch (error: any) {
      console.error('[Redis] Error closing connection:', error.message);
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
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('[Redis] Error getting key:', error);
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
      console.error('[Redis] Error setting key:', error);
    }
  },

  async delete(key: string): Promise<void> {
    try {
      const client = getRedisClient();
      await client.del(key);
    } catch (error) {
      console.error('[Redis] Error deleting key:', error);
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      const client = getRedisClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('[Redis] Error checking key existence:', error);
      return false;
    }
  },

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      const client = getRedisClient();
      await client.expire(key, ttlSeconds);
    } catch (error) {
      console.error('[Redis] Error setting expiration:', error);
    }
  },
};

export default { initializeRedis, getRedisClient, closeRedis, cache };
