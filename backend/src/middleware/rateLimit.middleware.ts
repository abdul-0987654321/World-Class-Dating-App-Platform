/**
 * Enhanced Rate Limiting Middleware
 * Per-user and per-endpoint rate limiting with Redis backend
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { getRedisClient } from '../config/redis.config';
import { logger } from '../utils/logger';

// ============================================
// Basic rate limiters (IP-based, express-rate-limit)
// ============================================

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for authentication routes
export const authLimiter = rateLimit({
  windowMs: 900000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true,
});

// Rate limiter for media uploads
export const uploadLimiter = rateLimit({
  windowMs: 3600000, // 1 hour
  max: 20,
  message: 'Too many uploads, please try again later',
});

// ============================================
// Enhanced per-user rate limiting with Redis
// ============================================

export interface RateLimitConfig {
  windowMs: number;           // Time window in milliseconds
  maxRequests: number;        // Max requests per window
  keyPrefix?: string;         // Redis key prefix
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  message?: string;
  statusCode?: number;
  headers?: boolean;          // Send rate limit headers
}

// Default configurations for different endpoint types
export const RATE_LIMIT_PRESETS = {
  // Very strict - for auth endpoints
  auth: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts. Please try again later.',
  },
  // Strict - for sensitive operations
  sensitive: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 10,
    message: 'Too many requests to this endpoint. Please slow down.',
  },
  // Standard - for general API usage
  standard: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 60,
    message: 'Rate limit exceeded. Please try again later.',
  },
  // Relaxed - for read-heavy endpoints
  relaxed: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 200,
    message: 'Rate limit exceeded.',
  },
  // Upload - for file uploads
  upload: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 50,
    message: 'Too many file uploads. Please try again later.',
  },
};

export class RateLimitMiddleware {
  /**
   * Create rate limiter middleware with Redis backend
   */
  static create(config: RateLimitConfig) {
    const {
      windowMs,
      maxRequests,
      keyPrefix = 'ratelimit',
      skipFailedRequests = false,
      skipSuccessfulRequests = false,
      message = 'Too many requests, please try again later.',
      statusCode = 429,
      headers = true,
    } = config;

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const redis = getRedisClient();

        // Create unique key based on user ID (if authenticated) or IP
        const identifier = req.user?.userId || req.ip || 'anonymous';
        const endpoint = req.route?.path || req.path;
        const key = `${keyPrefix}:${identifier}:${endpoint}`;

        // Get current count
        const currentCount = await redis.get(key);
        const count = currentCount ? parseInt(currentCount, 10) : 0;

        // Calculate remaining requests
        const remaining = Math.max(0, maxRequests - count - 1);

        // Get TTL for reset time
        const ttl = await redis.ttl(key);
        const resetTime = ttl > 0 ? Date.now() + (ttl * 1000) : Date.now() + windowMs;

        // Set rate limit headers
        if (headers) {
          res.setHeader('X-RateLimit-Limit', maxRequests);
          res.setHeader('X-RateLimit-Remaining', remaining);
          res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));
        }

        // Check if rate limit exceeded
        if (count >= maxRequests) {
          logger.warn('Rate limit exceeded', {
            identifier,
            endpoint,
            count,
            maxRequests,
          });

          res.setHeader('Retry-After', Math.ceil((resetTime - Date.now()) / 1000));

          return res.status(statusCode).json({
            success: false,
            error: {
              message,
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
            },
          });
        }

        // Increment counter
        if (currentCount) {
          await redis.incr(key);
        } else {
          await redis.setex(key, Math.ceil(windowMs / 1000), '1');
        }

        // Hook into response to conditionally skip counting
        const originalEnd = res.end;
        res.end = function(...args: any[]) {
          // Skip counting based on response status
          if (
            (skipFailedRequests && res.statusCode >= 400) ||
            (skipSuccessfulRequests && res.statusCode < 400)
          ) {
            redis.decr(key).catch(() => {});
          }
          return originalEnd.apply(res, args);
        };

        next();
      } catch (error) {
        // On Redis error, allow request but log warning
        logger.error('Rate limit error:', error);
        next();
      }
    };
  }

  /**
   * Rate limit by user ID only (not endpoint specific)
   * Tracks total API usage per user across all endpoints
   */
  static perUser(config: Partial<RateLimitConfig> = {}) {
    const finalConfig = {
      ...RATE_LIMIT_PRESETS.standard,
      ...config,
      keyPrefix: 'ratelimit:user',
    };

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const redis = getRedisClient();
        const userId = req.user?.userId;

        if (!userId) {
          return next(); // Skip for unauthenticated requests
        }

        const key = `ratelimit:user:${userId}`;
        const currentCount = await redis.get(key);
        const count = currentCount ? parseInt(currentCount, 10) : 0;

        if (count >= finalConfig.maxRequests) {
          const ttl = await redis.ttl(key);
          return res.status(429).json({
            success: false,
            error: {
              message: finalConfig.message,
              code: 'USER_RATE_LIMIT_EXCEEDED',
              retryAfter: ttl,
            },
          });
        }

        if (currentCount) {
          await redis.incr(key);
        } else {
          await redis.setex(key, Math.ceil(finalConfig.windowMs / 1000), '1');
        }

        next();
      } catch (error) {
        logger.error('Per-user rate limit error:', error);
        next();
      }
    };
  }

  /**
   * Sliding window rate limiter (more accurate than fixed window)
   */
  static slidingWindow(config: RateLimitConfig) {
    const { windowMs, maxRequests, keyPrefix = 'ratelimit:sliding' } = config;

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const redis = getRedisClient();
        const identifier = req.user?.userId || req.ip || 'anonymous';
        const endpoint = req.route?.path || req.path;
        const key = `${keyPrefix}:${identifier}:${endpoint}`;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Remove old entries
        await redis.zremrangebyscore(key, 0, windowStart);

        // Count requests in window
        const count = await redis.zcard(key);

        if (count >= maxRequests) {
          // Get oldest entry to calculate retry time
          const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
          const retryAfter = oldest.length >= 2
            ? Math.ceil((parseInt(oldest[1], 10) + windowMs - now) / 1000)
            : Math.ceil(windowMs / 1000);

          return res.status(429).json({
            success: false,
            error: {
              message: config.message || 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter,
            },
          });
        }

        // Add current request
        await redis.zadd(key, now, `${now}:${Math.random()}`);
        await redis.expire(key, Math.ceil(windowMs / 1000));

        // Set headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', maxRequests - count - 1);

        next();
      } catch (error) {
        logger.error('Sliding window rate limit error:', error);
        next();
      }
    };
  }

  /**
   * Cost-based rate limiting (different endpoints have different costs)
   */
  static costBased(baseCost: number = 1, maxCost: number = 100, windowMs: number = 60000) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const redis = getRedisClient();
        const identifier = req.user?.userId || req.ip || 'anonymous';
        const key = `ratelimit:cost:${identifier}`;

        const currentCost = await redis.get(key);
        const cost = currentCost ? parseInt(currentCost, 10) : 0;

        if (cost + baseCost > maxCost) {
          const ttl = await redis.ttl(key);
          return res.status(429).json({
            success: false,
            error: {
              message: 'API cost limit exceeded',
              code: 'COST_LIMIT_EXCEEDED',
              retryAfter: ttl,
              currentCost: cost,
              maxCost,
            },
          });
        }

        if (currentCost) {
          await redis.incrby(key, baseCost);
        } else {
          await redis.setex(key, Math.ceil(windowMs / 1000), String(baseCost));
        }

        // Store cost in request for potential adjustment
        (req as any).rateLimitCost = baseCost;

        next();
      } catch (error) {
        logger.error('Cost-based rate limit error:', error);
        next();
      }
    };
  }

  /**
   * Preset rate limiters with Redis backend
   */
  static authRedis = RateLimitMiddleware.create(RATE_LIMIT_PRESETS.auth);
  static sensitiveRedis = RateLimitMiddleware.create(RATE_LIMIT_PRESETS.sensitive);
  static standardRedis = RateLimitMiddleware.create(RATE_LIMIT_PRESETS.standard);
  static relaxedRedis = RateLimitMiddleware.create(RATE_LIMIT_PRESETS.relaxed);
  static uploadRedis = RateLimitMiddleware.create(RATE_LIMIT_PRESETS.upload);
}

export default RateLimitMiddleware;
