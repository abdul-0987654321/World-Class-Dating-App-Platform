/**
 * API Response Caching
 * Cache expensive external API results to reduce costs
 */

import Redis from 'ioredis';
import crypto from 'crypto';
import { CostOptimizationConfig } from '../config/cost-optimization';

export interface CacheOptions {
  ttl: number; // Time to live in seconds
  keyPrefix?: string;
  hashKeys?: string[]; // Keys to use for cache key generation
  skipCache?: boolean;
}

export class ApiCache {
  private redis: Redis;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  /**
   * Wrap an async function with caching
   */
  async wrap<T>(
    fn: () => Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    if (options.skipCache) {
      return fn();
    }

    const cacheKey = this.generateCacheKey(fn, options);

    try {
      // Try to get from cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as T;
      }

      // Execute function
      const result = await fn();

      // Store in cache
      await this.redis.setex(cacheKey, options.ttl, JSON.stringify(result));

      return result;
    } catch (error) {
      console.error('Cache error:', error);
      // Fail open - execute function even if cache fails
      return fn();
    }
  }

  /**
   * Generate cache key from function and parameters
   */
  private generateCacheKey(fn: Function, options: CacheOptions): string {
    const prefix = options.keyPrefix || 'api-cache';
    const fnString = fn.toString();
    const hash = crypto
      .createHash('md5')
      .update(fnString)
      .digest('hex')
      .substring(0, 8);

    if (options.hashKeys && options.hashKeys.length > 0) {
      const keyHash = crypto
        .createHash('md5')
        .update(JSON.stringify(options.hashKeys))
        .digest('hex')
        .substring(0, 8);
      return `${prefix}:${hash}:${keyHash}`;
    }

    return `${prefix}:${hash}`;
  }

  /**
   * Invalidate cache by key pattern
   * Uses SCAN instead of KEYS to avoid blocking Redis
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      const keys: string[] = [];
      let cursor = '0';

      // Use SCAN to avoid blocking Redis
      do {
        const [newCursor, foundKeys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        cursor = newCursor;
        keys.push(...foundKeys);
      } while (cursor !== '0');

      if (keys.length > 0) {
        // Delete in batches to avoid blocking
        const batchSize = 100;
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          await this.redis.del(...batch);
        }
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Get cache statistics
   * Uses SCAN instead of KEYS to avoid blocking Redis
   */
  async getStats(prefix: string): Promise<{
    keys: number;
    memoryUsage: number;
  }> {
    try {
      const keys: string[] = [];
      let cursor = '0';
      let memoryUsage = 0;

      // Use SCAN to find all matching keys
      do {
        const [newCursor, foundKeys] = await this.redis.scan(
          cursor,
          'MATCH',
          `${prefix}:*`,
          'COUNT',
          100
        );
        cursor = newCursor;
        keys.push(...foundKeys);
      } while (cursor !== '0');

      // Calculate memory usage for found keys
      for (const key of keys) {
        try {
          const memory = await this.redis.memory('USAGE', key);
          memoryUsage += Number(memory) || 0;
        } catch (error) {
          // Ignore errors for individual keys
        }
      }

      return {
        keys: keys.length,
        memoryUsage,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { keys: 0, memoryUsage: 0 };
    }
  }
}

/**
 * Pre-configured cache wrappers for specific services
 */
export class ServiceCacheWrappers {
  private cache: ApiCache;

  constructor(redisClient: Redis) {
    this.cache = new ApiCache(redisClient);
  }

  /**
   * Azure Face Detection Cache
   */
  async cacheFaceDetection<T>(
    fn: () => Promise<T>,
    imageHash: string
  ): Promise<T> {
    const config = CostOptimizationConfig.caching.azureCognitive.faceDetection;
    return this.cache.wrap(fn, {
      ttl: config.ttl,
      keyPrefix: 'azure:face',
      hashKeys: [imageHash],
    });
  }

  /**
   * Azure Content Moderation Cache
   */
  async cacheContentModeration<T>(
    fn: () => Promise<T>,
    contentHash: string
  ): Promise<T> {
    const config = CostOptimizationConfig.caching.azureCognitive.contentModeration;
    return this.cache.wrap(fn, {
      ttl: config.ttl,
      keyPrefix: 'azure:moderation',
      hashKeys: [contentHash],
    });
  }

  /**
   * Azure Image Analysis Cache
   */
  async cacheImageAnalysis<T>(
    fn: () => Promise<T>,
    imageHash: string
  ): Promise<T> {
    const config = CostOptimizationConfig.caching.azureCognitive.imageAnalysis;
    return this.cache.wrap(fn, {
      ttl: config.ttl,
      keyPrefix: 'azure:image-analysis',
      hashKeys: [imageHash],
    });
  }

  /**
   * Stripe Customer Cache
   */
  async cacheStripeCustomer<T>(
    fn: () => Promise<T>,
    customerId: string
  ): Promise<T> {
    const config = CostOptimizationConfig.caching.stripe.customer;
    return this.cache.wrap(fn, {
      ttl: config.ttl,
      keyPrefix: 'stripe:customer',
      hashKeys: [customerId],
    });
  }

  /**
   * Stripe Subscription Cache
   */
  async cacheStripeSubscription<T>(
    fn: () => Promise<T>,
    subscriptionId: string
  ): Promise<T> {
    const config = CostOptimizationConfig.caching.stripe.subscription;
    return this.cache.wrap(fn, {
      ttl: config.ttl,
      keyPrefix: 'stripe:subscription',
      hashKeys: [subscriptionId],
    });
  }

  /**
   * Stripe Price Cache
   */
  async cacheStripePrice<T>(
    fn: () => Promise<T>,
    priceId: string
  ): Promise<T> {
    const config = CostOptimizationConfig.caching.stripe.price;
    return this.cache.wrap(fn, {
      ttl: config.ttl,
      keyPrefix: 'stripe:price',
      hashKeys: [priceId],
    });
  }

  /**
   * AWS Rekognition Moderation Cache
   */
  async cacheRekognitionModeration<T>(
    fn: () => Promise<T>,
    imageHash: string
  ): Promise<T> {
    const config = CostOptimizationConfig.caching.awsRekognition.moderationLabels;
    return this.cache.wrap(fn, {
      ttl: config.ttl,
      keyPrefix: 'aws:rekognition:moderation',
      hashKeys: [imageHash],
    });
  }

  /**
   * AWS Rekognition Face Detection Cache
   */
  async cacheRekognitionFaces<T>(
    fn: () => Promise<T>,
    imageHash: string
  ): Promise<T> {
    const config = CostOptimizationConfig.caching.awsRekognition.faceDetection;
    return this.cache.wrap(fn, {
      ttl: config.ttl,
      keyPrefix: 'aws:rekognition:faces',
      hashKeys: [imageHash],
    });
  }

  /**
   * Email Template Cache
   */
  async cacheEmailTemplate<T>(
    fn: () => Promise<T>,
    templateId: string
  ): Promise<T> {
    const config = CostOptimizationConfig.caching.messaging.templates;
    return this.cache.wrap(fn, {
      ttl: config.ttl,
      keyPrefix: 'email:template',
      hashKeys: [templateId],
    });
  }

  /**
   * Invalidate user-specific caches
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.cache.invalidate(`*:${userId}:*`);
  }

  /**
   * Invalidate service-specific caches
   */
  async invalidateServiceCache(service: 'azure' | 'stripe' | 'aws'): Promise<void> {
    await this.cache.invalidate(`${service}:*`);
  }
}

/**
 * Image hash generator for consistent caching
 */
export function generateImageHash(imageBuffer: Buffer): string {
  return crypto.createHash('sha256').update(imageBuffer).digest('hex');
}

/**
 * Content hash generator for text content
 */
export function generateContentHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

export default ApiCache;
