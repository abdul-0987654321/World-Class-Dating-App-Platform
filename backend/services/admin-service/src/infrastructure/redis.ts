import { createClient, RedisClientType } from 'redis';

import { logger } from '../utils/logger';

class RedisClient {
  private client: RedisClientType | null = null;

  async connect(): Promise<void> {
    const redisOptions = process.env.REDIS_URL
      ? { url: process.env.REDIS_URL }
      : {
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
          },
          password: process.env.REDIS_PASSWORD || undefined,
        };
    this.client = createClient(redisOptions);

    this.client.on('error', (err: Error) => {
      logger.error('Redis error:', err);
    });

    this.client.on('connect', () => {
      logger.info('Redis connected');
    });

    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      logger.info('Redis disconnected');
    }
  }

  getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client;
  }

  // Cache helpers
  async get(key: string): Promise<string | null> {
    const result = await this.getClient().get(key);
    if (typeof result === 'string') {
      return result;
    }
    return null;
  }

  async set(key: string, value: string, expirySeconds?: number): Promise<void> {
    if (expirySeconds) {
      await this.getClient().setEx(key, expirySeconds, value);
    } else {
      await this.getClient().set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.getClient().del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.getClient().exists(key);
    return result === 1;
  }
}

export const redis = new RedisClient();
