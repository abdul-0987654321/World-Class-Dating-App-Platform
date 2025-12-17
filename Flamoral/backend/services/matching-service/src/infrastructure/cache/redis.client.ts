/**
 * Redis Client for Caching
 * Provides caching functionality for matching service
 */

import { createClient, RedisClientType } from 'redis';
import config from '../../config';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('redis-client');

class RedisClient {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        logger.warn('Redis client already connected');
        return;
      }

      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
          tls: config.redis.tls || process.env.NODE_ENV === 'production',
          connectTimeout: 10000,
          keepAlive: 30000,
        },
        password: config.redis.password || undefined,
        database: config.redis.db || 1, // Use DB 1 for cache
        commandsQueueMaxLength: 1000,
        disableOfflineQueue: false,
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error', err);
      });

      this.client.on('connect', () => {
        logger.info('Redis client connecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        logger.info('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis', error);
      // Don't throw - service can work without cache
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
        this.client = null;
        this.isConnected = false;
        logger.info('Redis disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis', error);
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.client || !this.isConnected) {
        return null;
      }

      const value = await this.client.get(key);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Failed to get key ${key} from cache`, error);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }

      const serialized = JSON.stringify(value);

      if (ttl) {
        await this.client.setEx(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      return true;
    } catch (error) {
      logger.error(`Failed to set key ${key} in cache`, error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }

      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Failed to delete key ${key} from cache`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   * Uses SCAN instead of KEYS to avoid blocking Redis
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      if (!this.client || !this.isConnected) {
        return 0;
      }

      const keys: string[] = [];
      let cursor = 0;

      // Use SCAN to avoid blocking Redis
      do {
        const result = await this.client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });
        cursor = result.cursor;
        keys.push(...result.keys);
      } while (cursor !== 0);

      if (keys.length === 0) {
        return 0;
      }

      // Delete in batches to avoid blocking
      const batchSize = 100;
      let deleted = 0;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        await this.client.del(batch);
        deleted += batch.length;
      }

      return deleted;
    } catch (error) {
      logger.error(`Failed to delete pattern ${pattern} from cache`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }

      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(`Failed to check if key ${key} exists`, error);
      return false;
    }
  }

  /**
   * Set expiration on key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }

      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error(`Failed to set expiration on key ${key}`, error);
      return false;
    }
  }

  /**
   * Increment value
   */
  async incr(key: string): Promise<number> {
    try {
      if (!this.client || !this.isConnected) {
        return 0;
      }

      return await this.client.incr(key);
    } catch (error) {
      logger.error(`Failed to increment key ${key}`, error);
      return 0;
    }
  }

  /**
   * Decrement value
   */
  async decr(key: string): Promise<number> {
    try {
      if (!this.client || !this.isConnected) {
        return 0;
      }

      return await this.client.decr(key);
    } catch (error) {
      logger.error(`Failed to decrement key ${key}`, error);
      return 0;
    }
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Flush all keys (use with caution!)
   */
  async flushAll(): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }

      await this.client.flushAll();
      logger.warn('Redis cache flushed - all keys deleted');
      return true;
    } catch (error) {
      logger.error('Failed to flush Redis cache', error);
      return false;
    }
  }
}

export default new RedisClient();
