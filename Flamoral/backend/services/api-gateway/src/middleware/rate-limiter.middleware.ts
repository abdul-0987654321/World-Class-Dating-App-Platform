import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

export interface RateLimitConfig {
  points: number; // Number of requests
  duration: number; // Per duration in seconds
  blockDuration?: number; // Block duration in seconds (optional)
}

// In-memory fallback cache for when Redis is unavailable
interface InMemoryEntry {
  count: number;
  expiresAt: number;
}

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimiterMiddleware.name);
  private redis: Redis | null = null;
  private readonly defaultConfig: RateLimitConfig;

  // Redis health tracking
  private redisHealthy = true;
  private redisFailureCount = 0;
  private lastRedisCheck = 0;
  private readonly redisHealthCheckInterval = 5000; // 5 seconds
  private readonly redisFailureThreshold = 3;

  // In-memory fallback when Redis is down
  private readonly inMemoryCache: Map<string, InMemoryEntry> = new Map();
  private readonly inMemoryCleanupInterval = 60000; // 1 minute
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly configService: ConfigService) {
    // Default rate limit configuration
    this.defaultConfig = {
      points: this.configService.get<number>('throttle.limit') || 100,
      duration: (this.configService.get<number>('throttle.ttl') || 60000) / 1000,
      blockDuration: 300, // 5 minutes
    };

    this.initializeRedis();
    this.startInMemoryCleanup();
  }

  private initializeRedis(): void {
    try {
      this.redis = new Redis({
        host: this.configService.get<string>('redis.host') || 'localhost',
        port: this.configService.get<number>('redis.port') || 6379,
        password: this.configService.get<string>('redis.password'),
        db: this.configService.get<number>('redis.db') || 0,

        // Connection resilience
        retryStrategy: (times) => {
          if (times > 10) {
            this.logger.error('Redis connection failed after 10 retries, using in-memory fallback');
            this.redisHealthy = false;
            return null; // Stop retrying
          }
          const delay = Math.min(times * 100, 3000);
          return delay;
        },
        maxRetriesPerRequest: 1, // Don't block requests waiting for Redis
        enableReadyCheck: true,
        connectTimeout: 5000, // 5 second connection timeout
        commandTimeout: 2000, // 2 second command timeout
        lazyConnect: false,

        // Connection pool settings
        enableOfflineQueue: false, // Don't queue commands when disconnected
      });

      this.redis.on('error', (error) => {
        this.redisFailureCount++;
        if (this.redisFailureCount >= this.redisFailureThreshold) {
          this.redisHealthy = false;
        }
        this.logger.warn(`Redis error (failures: ${this.redisFailureCount}): ${error.message}`);
      });

      this.redis.on('connect', () => {
        this.redisHealthy = true;
        this.redisFailureCount = 0;
        this.logger.log('Connected to Redis for rate limiting');
      });

      this.redis.on('ready', () => {
        this.redisHealthy = true;
        this.redisFailureCount = 0;
        this.logger.log('Redis ready for rate limiting operations');
      });

      this.redis.on('close', () => {
        this.logger.warn('Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
        this.logger.log('Reconnecting to Redis...');
      });
    } catch (error) {
      this.logger.error('Failed to initialize Redis:', error);
      this.redisHealthy = false;
    }
  }

  /**
   * Start periodic cleanup of in-memory cache
   */
  private startInMemoryCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      this.inMemoryCache.forEach((entry, key) => {
        if (entry.expiresAt <= now) {
          this.inMemoryCache.delete(key);
          cleaned++;
        }
      });

      if (cleaned > 0) {
        this.logger.debug(`Cleaned ${cleaned} expired entries from in-memory rate limit cache`);
      }
    }, this.inMemoryCleanupInterval);
  }

  /**
   * Check if Redis is healthy, with periodic health checks
   */
  private async isRedisHealthy(): Promise<boolean> {
    if (!this.redis) return false;

    const now = Date.now();

    // If we recently checked, use cached result
    if (now - this.lastRedisCheck < this.redisHealthCheckInterval) {
      return this.redisHealthy;
    }

    // Perform health check
    this.lastRedisCheck = now;

    try {
      await this.redis.ping();
      this.redisHealthy = true;
      this.redisFailureCount = 0;
      return true;
    } catch (error) {
      this.redisFailureCount++;
      if (this.redisFailureCount >= this.redisFailureThreshold) {
        this.redisHealthy = false;
      }
      return false;
    }
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract user ID from JWT token if available
      const userId = (req as any).user?.userId || (req as any).user?.sub;

      // Get client IP address
      const clientIp = this.getClientIp(req);

      // Create keys for both user and IP-based rate limiting
      const keys: string[] = [];

      if (userId) {
        keys.push(`ratelimit:user:${userId}`);
      }

      // Always track by IP
      keys.push(`ratelimit:ip:${clientIp}`);

      // Check if Redis is healthy
      const useRedis = await this.isRedisHealthy();

      // Check rate limits for all keys
      for (const key of keys) {
        const result = useRedis
          ? await this.checkRateLimitRedis(key, this.defaultConfig)
          : this.checkRateLimitInMemory(key, this.defaultConfig);

        if (!result.allowed) {
          this.logger.warn(`Rate limit exceeded for ${key} (using ${useRedis ? 'Redis' : 'in-memory'})`);

          res.setHeader('X-RateLimit-Limit', this.defaultConfig.points.toString());
          res.setHeader('X-RateLimit-Remaining', '0');
          res.setHeader('X-RateLimit-Reset', (Date.now() + result.ttl * 1000).toString());
          res.setHeader('Retry-After', result.ttl.toString());

          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: 'Too many requests. Please try again later.',
              retryAfter: result.ttl,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      // Get remaining requests for the primary key (user if authenticated, otherwise IP)
      const primaryKey = userId ? `ratelimit:user:${userId}` : `ratelimit:ip:${clientIp}`;
      const remainingResult = useRedis
        ? await this.getRemainingRedis(primaryKey, this.defaultConfig.points)
        : this.getRemainingInMemory(primaryKey, this.defaultConfig.points);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.defaultConfig.points.toString());
      res.setHeader('X-RateLimit-Remaining', remainingResult.remaining.toString());
      res.setHeader('X-RateLimit-Reset', (Date.now() + remainingResult.ttl * 1000).toString());

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // If rate limiting fails entirely, FAIL OPEN - allow the request
      // This is intentional: we'd rather allow some extra traffic than block legitimate users
      this.logger.error('Rate limiter error (failing open):', error);
      next();
    }
  }

  /**
   * Check rate limit using Redis
   */
  private async checkRateLimitRedis(
    key: string,
    config: RateLimitConfig,
  ): Promise<{ allowed: boolean; ttl: number }> {
    try {
      const current = await this.redis!.incr(key);

      if (current === 1) {
        // First request, set expiration
        await this.redis!.expire(key, config.duration);
      }

      const ttl = await this.redis!.ttl(key);

      return {
        allowed: current <= config.points,
        ttl: ttl > 0 ? ttl : config.duration,
      };
    } catch (error) {
      this.logger.warn('Redis rate limit check failed, using in-memory fallback');
      this.redisHealthy = false;
      return this.checkRateLimitInMemory(key, config);
    }
  }

  /**
   * Check rate limit using in-memory fallback
   */
  private checkRateLimitInMemory(
    key: string,
    config: RateLimitConfig,
  ): { allowed: boolean; ttl: number } {
    const now = Date.now();
    const entry = this.inMemoryCache.get(key);

    if (!entry || entry.expiresAt <= now) {
      // First request or expired, create new entry
      this.inMemoryCache.set(key, {
        count: 1,
        expiresAt: now + config.duration * 1000,
      });
      return { allowed: true, ttl: config.duration };
    }

    // Increment counter
    entry.count++;
    const ttl = Math.ceil((entry.expiresAt - now) / 1000);

    return {
      allowed: entry.count <= config.points,
      ttl: ttl > 0 ? ttl : config.duration,
    };
  }

  /**
   * Get remaining requests using Redis
   */
  private async getRemainingRedis(
    key: string,
    limit: number,
  ): Promise<{ remaining: number; ttl: number }> {
    try {
      const [current, ttl] = await Promise.all([
        this.redis!.get(key),
        this.redis!.ttl(key),
      ]);

      const used = current ? parseInt(current, 10) : 0;
      return {
        remaining: Math.max(0, limit - used),
        ttl: ttl > 0 ? ttl : this.defaultConfig.duration,
      };
    } catch (error) {
      this.logger.warn('Redis get remaining failed, using in-memory fallback');
      return this.getRemainingInMemory(key, limit);
    }
  }

  /**
   * Get remaining requests using in-memory fallback
   */
  private getRemainingInMemory(
    key: string,
    limit: number,
  ): { remaining: number; ttl: number } {
    const now = Date.now();
    const entry = this.inMemoryCache.get(key);

    if (!entry || entry.expiresAt <= now) {
      return { remaining: limit, ttl: this.defaultConfig.duration };
    }

    const ttl = Math.ceil((entry.expiresAt - now) / 1000);
    return {
      remaining: Math.max(0, limit - entry.count),
      ttl: ttl > 0 ? ttl : this.defaultConfig.duration,
    };
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];

    if (forwarded) {
      const ips = (forwarded as string).split(',');
      return ips[0].trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }

    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Reset rate limit for a specific key (admin function)
   */
  async resetRateLimit(identifier: string, type: 'user' | 'ip'): Promise<void> {
    const key = `ratelimit:${type}:${identifier}`;

    // Reset both Redis and in-memory
    if (this.redis && this.redisHealthy) {
      try {
        await this.redis.del(key);
      } catch (error) {
        this.logger.warn('Failed to reset rate limit in Redis:', error);
      }
    }

    this.inMemoryCache.delete(key);
    this.logger.log(`Rate limit reset for ${key}`);
  }

  /**
   * Get rate limit info
   */
  async getRateLimitInfo(identifier: string, type: 'user' | 'ip'): Promise<{
    limit: number;
    remaining: number;
    reset: number;
    source: 'redis' | 'memory';
  }> {
    const key = `ratelimit:${type}:${identifier}`;

    if (this.redis && await this.isRedisHealthy()) {
      try {
        const [current, ttl] = await Promise.all([
          this.redis.get(key),
          this.redis.ttl(key),
        ]);

        const used = current ? parseInt(current, 10) : 0;

        return {
          limit: this.defaultConfig.points,
          remaining: Math.max(0, this.defaultConfig.points - used),
          reset: ttl > 0 ? Date.now() + ttl * 1000 : 0,
          source: 'redis',
        };
      } catch (error) {
        this.logger.warn('Failed to get rate limit info from Redis:', error);
      }
    }

    // Fallback to in-memory
    const result = this.getRemainingInMemory(key, this.defaultConfig.points);
    return {
      limit: this.defaultConfig.points,
      remaining: result.remaining,
      reset: Date.now() + result.ttl * 1000,
      source: 'memory',
    };
  }

  /**
   * Get Redis health status
   */
  getRedisStatus(): {
    healthy: boolean;
    failureCount: number;
    inMemoryCacheSize: number;
  } {
    return {
      healthy: this.redisHealthy,
      failureCount: this.redisFailureCount,
      inMemoryCacheSize: this.inMemoryCache.size,
    };
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Close Redis connection
    if (this.redis) {
      try {
        await this.redis.quit();
        this.logger.log('Redis connection closed gracefully');
      } catch (error) {
        this.logger.warn('Error closing Redis connection:', error);
      }
    }

    // Clear in-memory cache
    this.inMemoryCache.clear();
  }
}
