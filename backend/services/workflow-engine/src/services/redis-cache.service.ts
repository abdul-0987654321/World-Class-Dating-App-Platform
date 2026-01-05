import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private redisClient: Redis;
  private readonly defaultTTL: number = 3600; // 1 hour

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      this.redisClient = new Redis({
        host: this.configService.get<string>('redis.host'),
        port: this.configService.get<number>('redis.port'),
        password: this.configService.get<string>('redis.password'),
        db: this.configService.get<number>('redis.db') || 0,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Redis client connected');
      });

      this.redisClient.on('error', (error) => {
        this.logger.error(`Redis client error: ${error.message}`);
      });

      this.redisClient.on('ready', () => {
        this.logger.log('Redis client ready');
      });
    } catch (error) {
      this.logger.error(`Failed to initialize Redis: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.logger.log('Redis client disconnected');
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisClient.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to get key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;
      await this.redisClient.setex(key, expiry, serialized);
    } catch (error) {
      this.logger.error(`Failed to set key ${key}: ${error.message}`);
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete key ${key}: ${error.message}`);
    }
  }

  /**
   * Delete keys matching pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        this.logger.log(`Deleted ${keys.length} keys matching pattern ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete pattern ${pattern}: ${error.message}`);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check existence of key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Set expiry on key
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.redisClient.expire(key, ttl);
    } catch (error) {
      this.logger.error(`Failed to set expiry on key ${key}: ${error.message}`);
    }
  }

  /**
   * Get or set pattern - get from cache or compute and cache
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    try {
      // Try to get from cache
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Compute value
      const value = await factory();

      // Store in cache
      await this.set(key, value, ttl);

      return value;
    } catch (error) {
      this.logger.error(`Failed getOrSet for key ${key}: ${error.message}`);
      // If cache fails, still return the computed value
      return factory();
    }
  }

  /**
   * Increment counter
   */
  async increment(key: string): Promise<number> {
    try {
      return await this.redisClient.incr(key);
    } catch (error) {
      this.logger.error(`Failed to increment key ${key}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Decrement counter
   */
  async decrement(key: string): Promise<number> {
    try {
      return await this.redisClient.decr(key);
    } catch (error) {
      this.logger.error(`Failed to decrement key ${key}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Add to set
   */
  async addToSet(key: string, ...members: string[]): Promise<void> {
    try {
      await this.redisClient.sadd(key, ...members);
    } catch (error) {
      this.logger.error(`Failed to add to set ${key}: ${error.message}`);
    }
  }

  /**
   * Get set members
   */
  async getSet(key: string): Promise<string[]> {
    try {
      return await this.redisClient.smembers(key);
    } catch (error) {
      this.logger.error(`Failed to get set ${key}: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if member is in set
   */
  async isInSet(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.redisClient.sismember(key, member);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check set membership ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Remove from set
   */
  async removeFromSet(key: string, ...members: string[]): Promise<void> {
    try {
      await this.redisClient.srem(key, ...members);
    } catch (error) {
      this.logger.error(`Failed to remove from set ${key}: ${error.message}`);
    }
  }

  /**
   * Add to sorted set
   */
  async addToSortedSet(key: string, score: number, member: string): Promise<void> {
    try {
      await this.redisClient.zadd(key, score, member);
    } catch (error) {
      this.logger.error(`Failed to add to sorted set ${key}: ${error.message}`);
    }
  }

  /**
   * Get sorted set range
   */
  async getSortedSetRange(key: string, start: number = 0, stop: number = -1): Promise<string[]> {
    try {
      return await this.redisClient.zrange(key, start, stop);
    } catch (error) {
      this.logger.error(`Failed to get sorted set range ${key}: ${error.message}`);
      return [];
    }
  }

  /**
   * Push to list
   */
  async pushToList(key: string, ...values: string[]): Promise<void> {
    try {
      await this.redisClient.rpush(key, ...values);
    } catch (error) {
      this.logger.error(`Failed to push to list ${key}: ${error.message}`);
    }
  }

  /**
   * Get list range
   */
  async getListRange(key: string, start: number = 0, stop: number = -1): Promise<string[]> {
    try {
      return await this.redisClient.lrange(key, start, stop);
    } catch (error) {
      this.logger.error(`Failed to get list range ${key}: ${error.message}`);
      return [];
    }
  }

  /**
   * Acquire distributed lock
   */
  async acquireLock(lockKey: string, timeout: number = 10000): Promise<string | null> {
    const lockValue = `${Date.now()}-${Math.random()}`;
    try {
      const result = await this.redisClient.set(lockKey, lockValue, 'PX', timeout, 'NX');
      return result === 'OK' ? lockValue : null;
    } catch (error) {
      this.logger.error(`Failed to acquire lock ${lockKey}: ${error.message}`);
      return null;
    }
  }

  /**
   * Release distributed lock
   */
  async releaseLock(lockKey: string, lockValue: string): Promise<void> {
    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      await this.redisClient.eval(script, 1, lockKey, lockValue);
    } catch (error) {
      this.logger.error(`Failed to release lock ${lockKey}: ${error.message}`);
    }
  }

  /**
   * Get Redis client for advanced operations
   */
  getClient(): Redis {
    return this.redisClient;
  }
}
