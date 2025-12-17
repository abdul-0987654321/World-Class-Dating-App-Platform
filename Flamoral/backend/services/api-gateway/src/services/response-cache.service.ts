import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface CachedResponse {
  data: any;
  timestamp: number;
  ttl: number;
  serviceName: string;
  path: string;
}

@Injectable()
export class ResponseCacheService {
  private readonly logger = new Logger(ResponseCacheService.name);
  private redis: Redis | null = null;
  private memoryCache: Map<string, CachedResponse> = new Map();
  private readonly maxMemoryCacheSize = 100; // Maximum items in memory cache

  // Cache TTL configuration based on endpoint type
  private readonly cacheTTL: Record<string, number> = {
    // Profile data - cache for 5 minutes
    profile: 5 * 60 * 1000,
    user: 5 * 60 * 1000,

    // Matches - cache for 10 minutes (they don't change frequently)
    matches: 10 * 60 * 1000,
    matching: 10 * 60 * 1000,

    // Analytics - cache for 15 minutes
    analytics: 15 * 60 * 1000,
    stats: 15 * 60 * 1000,

    // Notifications - cache for 2 minutes (more dynamic)
    notifications: 2 * 60 * 1000,

    // Default - cache for 5 minutes
    default: 5 * 60 * 1000,
  };

  constructor(private readonly configService: ConfigService) {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    try {
      this.redis = new Redis({
        host: this.configService.get<string>('redis.host') || 'localhost',
        port: this.configService.get<number>('redis.port') || 6379,
        password: this.configService.get<string>('redis.password'),
        db: this.configService.get<number>('redis.cacheDb') || 1, // Use separate DB for cache
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        commandTimeout: 1000,
        lazyConnect: true,
        enableOfflineQueue: false,
        retryStrategy: (times: number) => {
          if (times > 3) {
            this.logger.warn('Redis connection failed, using memory cache only');
            return null;
          }
          return Math.min(times * 50, 2000);
        },
      });

      this.redis.on('error', (error) => {
        this.logger.warn('Redis cache error, falling back to memory cache:', error.message);
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis cache connected');
      });

      // Connect lazily
      this.redis.connect().catch(error => {
        this.logger.warn('Initial Redis connection failed, using memory cache:', error.message);
      });
    } catch (error) {
      this.logger.warn('Failed to initialize Redis cache:', error);
      this.redis = null;
    }
  }

  /**
   * Get cached response for a service request
   */
  async get(serviceName: string, path: string): Promise<any | null> {
    const key = this.generateCacheKey(serviceName, path);

    try {
      // Try Redis first if available
      if (this.redis && this.redis.status === 'ready') {
        const cached = await this.redis.get(key);
        if (cached) {
          const parsedCache: CachedResponse = JSON.parse(cached);

          // Check if cache is still valid
          const age = Date.now() - parsedCache.timestamp;
          if (age < parsedCache.ttl) {
            this.logger.debug(`Cache HIT (Redis) for ${serviceName}${path} (age: ${Math.round(age / 1000)}s)`);
            return parsedCache.data;
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Redis cache get error for ${key}:`, error);
    }

    // Fallback to memory cache
    const memCached = this.memoryCache.get(key);
    if (memCached) {
      const age = Date.now() - memCached.timestamp;
      if (age < memCached.ttl) {
        this.logger.debug(`Cache HIT (Memory) for ${serviceName}${path} (age: ${Math.round(age / 1000)}s)`);
        return memCached.data;
      } else {
        // Remove stale cache
        this.memoryCache.delete(key);
      }
    }

    this.logger.debug(`Cache MISS for ${serviceName}${path}`);
    return null;
  }

  /**
   * Set cache for a service response
   */
  async set(serviceName: string, path: string, data: any): Promise<void> {
    const key = this.generateCacheKey(serviceName, path);
    const ttl = this.getCacheTTL(serviceName, path);

    const cachedResponse: CachedResponse = {
      data,
      timestamp: Date.now(),
      ttl,
      serviceName,
      path,
    };

    try {
      // Store in Redis if available
      if (this.redis && this.redis.status === 'ready') {
        await this.redis.setex(
          key,
          Math.ceil(ttl / 1000),
          JSON.stringify(cachedResponse)
        );
        this.logger.debug(`Cached in Redis: ${serviceName}${path} (TTL: ${ttl / 1000}s)`);
      }
    } catch (error) {
      this.logger.warn(`Redis cache set error for ${key}:`, error);
    }

    // Always store in memory cache as backup
    this.setMemoryCache(key, cachedResponse);
  }

  /**
   * Store in memory cache with size limit
   */
  private setMemoryCache(key: string, value: CachedResponse): void {
    // Remove oldest entries if cache is full
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    this.memoryCache.set(key, value);
    this.logger.debug(`Cached in Memory: ${value.serviceName}${value.path}`);
  }

  /**
   * Try to get stale cache (for graceful degradation)
   * Returns cache even if expired, as fallback during service failures
   */
  async getStale(serviceName: string, path: string): Promise<any | null> {
    const key = this.generateCacheKey(serviceName, path);

    try {
      // Try Redis first
      if (this.redis && this.redis.status === 'ready') {
        const cached = await this.redis.get(key);
        if (cached) {
          const parsedCache: CachedResponse = JSON.parse(cached);
          const age = Date.now() - parsedCache.timestamp;

          // Accept stale cache up to 1 hour old for degraded mode
          if (age < 60 * 60 * 1000) {
            this.logger.warn(
              `Using STALE cache (Redis) for ${serviceName}${path} ` +
              `(age: ${Math.round(age / 1000)}s, expired ${Math.round((age - parsedCache.ttl) / 1000)}s ago)`
            );
            return parsedCache.data;
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Redis stale cache get error for ${key}:`, error);
    }

    // Try memory cache
    const memCached = this.memoryCache.get(key);
    if (memCached) {
      const age = Date.now() - memCached.timestamp;

      // Accept stale cache up to 1 hour old
      if (age < 60 * 60 * 1000) {
        this.logger.warn(
          `Using STALE cache (Memory) for ${serviceName}${path} ` +
          `(age: ${Math.round(age / 1000)}s, expired ${Math.round((age - memCached.ttl) / 1000)}s ago)`
        );
        return memCached.data;
      }
    }

    return null;
  }

  /**
   * Invalidate cache for a service and path
   */
  async invalidate(serviceName: string, path: string): Promise<void> {
    const key = this.generateCacheKey(serviceName, path);

    try {
      if (this.redis && this.redis.status === 'ready') {
        await this.redis.del(key);
      }
    } catch (error) {
      this.logger.warn(`Redis cache invalidate error for ${key}:`, error);
    }

    this.memoryCache.delete(key);
    this.logger.debug(`Invalidated cache for ${serviceName}${path}`);
  }

  /**
   * Invalidate all cache for a service
   * Uses SCAN instead of KEYS to avoid blocking Redis
   */
  async invalidateService(serviceName: string): Promise<void> {
    const pattern = `cache:${serviceName}:*`;

    try {
      if (this.redis && this.redis.status === 'ready') {
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
          // Delete in batches
          const batchSize = 100;
          for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            await this.redis.del(...batch);
          }
          this.logger.debug(`Invalidated ${keys.length} cache entries for ${serviceName}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Redis cache invalidate service error:`, error);
    }

    // Invalidate memory cache
    for (const [key] of this.memoryCache.entries()) {
      if (key.startsWith(`cache:${serviceName}:`)) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (this.redis && this.redis.status === 'ready') {
        await this.redis.flushdb();
      }
    } catch (error) {
      this.logger.warn(`Redis cache clear error:`, error);
    }

    this.memoryCache.clear();
    this.logger.log('All cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    memorySize: number;
    redisConnected: boolean;
  } {
    return {
      memorySize: this.memoryCache.size,
      redisConnected: this.redis?.status === 'ready',
    };
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(serviceName: string, path: string): string {
    // Normalize path - remove query strings and trailing slashes
    const normalizedPath = path.split('?')[0].replace(/\/$/, '');
    return `cache:${serviceName}:${normalizedPath}`;
  }

  /**
   * Determine cache TTL based on service and path
   */
  private getCacheTTL(serviceName: string, path: string): number {
    // Check if path contains any of the configured cache types
    for (const [type, ttl] of Object.entries(this.cacheTTL)) {
      if (serviceName.includes(type) || path.includes(type)) {
        return ttl;
      }
    }

    return this.cacheTTL.default;
  }

  /**
   * Check if endpoint is cacheable
   * Only GET requests to read-only endpoints should be cached
   */
  isCacheable(method: string, path: string): boolean {
    // Only cache GET requests
    if (method !== 'GET') {
      return false;
    }

    // Don't cache these patterns
    const nonCacheablePatterns = [
      '/health',
      '/metrics',
      '/status',
      '/realtime',
      '/stream',
      '/websocket',
      '/ws',
    ];

    return !nonCacheablePatterns.some(pattern => path.includes(pattern));
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
    this.memoryCache.clear();
  }
}
