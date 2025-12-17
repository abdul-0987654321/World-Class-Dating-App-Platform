/**
 * Cost-Optimized Rate Limiting Middleware
 * Implements tiered rate limiting to prevent API abuse and reduce costs
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { CostOptimizationConfig } from '../config/cost-optimization';

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: Request, res: Response) => void;
}

export class CostOptimizedRateLimiter {
  private redis: Redis;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  /**
   * Create rate limiter middleware
   */
  createLimiter(options: RateLimiterOptions) {
    const {
      windowMs,
      maxRequests,
      keyGenerator = this.defaultKeyGenerator,
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      onLimitReached,
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = `rate-limit:${keyGenerator(req)}`;
        const currentTime = Date.now();
        const windowStart = currentTime - windowMs;

        // Use Redis sorted set for sliding window
        const multi = this.redis.multi();

        // Remove old entries outside the window
        multi.zremrangebyscore(key, 0, windowStart);

        // Count requests in current window
        multi.zcard(key);

        // Add current request
        multi.zadd(key, currentTime, `${currentTime}-${Math.random()}`);

        // Set expiry
        multi.expire(key, Math.ceil(windowMs / 1000));

        const results = await multi.exec();

        if (!results) {
          return next();
        }

        const requestCount = results[1][1] as number;

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requestCount - 1));
        res.setHeader('X-RateLimit-Reset', new Date(currentTime + windowMs).toISOString());

        if (requestCount >= maxRequests) {
          res.setHeader('Retry-After', Math.ceil(windowMs / 1000));

          if (onLimitReached) {
            onLimitReached(req, res);
          }

          return res.status(429).json({
            success: false,
            error: 'Too many requests',
            message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`,
            retryAfter: Math.ceil(windowMs / 1000),
          });
        }

        // Handle response to potentially skip counting
        const originalSend = res.send;
        res.send = function (body: any) {
          const statusCode = res.statusCode;
          const shouldSkip =
            (skipSuccessfulRequests && statusCode < 400) ||
            (skipFailedRequests && statusCode >= 400);

          if (shouldSkip) {
            // Remove the request from the count
            void this.redis.zrem(key, `${currentTime}-${Math.random()}`);
          }

          return originalSend.call(this, body);
        }.bind({ redis: this.redis });

        next();
      } catch (error) {
        console.error('Rate limiter error:', error);
        // Fail open - allow request if rate limiter fails
        next();
      }
    };
  }

  /**
   * Standard rate limiter for general endpoints
   */
  standard() {
    return this.createLimiter({
      windowMs: CostOptimizationConfig.rateLimiting.standard.windowMs,
      maxRequests: CostOptimizationConfig.rateLimiting.standard.maxRequests,
    });
  }

  /**
   * Strict rate limiter for expensive operations
   */
  expensive() {
    return this.createLimiter({
      windowMs: CostOptimizationConfig.rateLimiting.expensive.windowMs,
      maxRequests: CostOptimizationConfig.rateLimiting.expensive.maxRequests,
    });
  }

  /**
   * AI service rate limiter
   */
  aiServices() {
    return this.createLimiter({
      windowMs: CostOptimizationConfig.rateLimiting.aiServices.windowMs,
      maxRequests: CostOptimizationConfig.rateLimiting.aiServices.maxRequests,
    });
  }

  /**
   * External API rate limiter
   */
  externalApi() {
    return this.createLimiter({
      windowMs: CostOptimizationConfig.rateLimiting.externalApi.windowMs,
      maxRequests: CostOptimizationConfig.rateLimiting.externalApi.maxRequests,
    });
  }

  /**
   * Default key generator - uses user ID or IP address
   */
  private defaultKeyGenerator(req: Request): string {
    const userId = (req as any).user?.id || (req as any).userId;
    if (userId) {
      return `user:${userId}`;
    }
    // Fall back to IP address
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  /**
   * Custom key generator for specific endpoints
   */
  static customKeyGenerator(prefix: string) {
    return (req: Request): string => {
      const userId = (req as any).user?.id || (req as any).userId;
      if (userId) {
        return `${prefix}:user:${userId}`;
      }
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      return `${prefix}:ip:${ip}`;
    };
  }
}

/**
 * Request Deduplication Middleware
 * Prevents duplicate expensive operations within a time window
 */
export class RequestDeduplicator {
  private redis: Redis;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  /**
   * Create deduplication middleware
   */
  deduplicate(options: {
    window?: number;
    keyGenerator?: (req: Request) => string;
  } = {}) {
    const {
      window = CostOptimizationConfig.deduplication.window,
      keyGenerator = this.defaultKeyGenerator,
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!CostOptimizationConfig.deduplication.enabled) {
          return next();
        }

        const key = `dedupe:${keyGenerator(req)}`;
        const existing = await this.redis.get(key);

        if (existing) {
          return res.status(409).json({
            success: false,
            error: 'Duplicate request',
            message: 'This request was already processed. Please wait before retrying.',
          });
        }

        // Set deduplication key
        await this.redis.setex(key, Math.ceil(window / 1000), '1');

        next();
      } catch (error) {
        console.error('Deduplication error:', error);
        // Fail open
        next();
      }
    };
  }

  /**
   * Default key generator for deduplication
   */
  private defaultKeyGenerator(req: Request): string {
    const userId = (req as any).user?.id || (req as any).userId;
    const method = req.method;
    const path = req.path;
    const params = JSON.stringify(req.body || {});

    return `${userId}:${method}:${path}:${params}`;
  }
}

export default CostOptimizedRateLimiter;
