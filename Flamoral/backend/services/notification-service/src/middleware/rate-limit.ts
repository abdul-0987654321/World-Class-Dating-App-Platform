/**
 * Rate Limiting Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { config } from '../config';
import logger from '../utils/logger';

// Create Redis client
const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
});

redis.on('error', (error) => {
  logger.error('Redis connection error', { error: error.message });
});

export interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  maxRequests?: number; // Max requests per window
  keyPrefix?: string; // Redis key prefix
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Create rate limiter middleware
 */
export const createRateLimiter = (options: RateLimitOptions = {}) => {
  const {
    windowMs = config.rateLimit.windowMs,
    maxRequests = config.rateLimit.maxRequests,
    keyPrefix = 'ratelimit',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get identifier (user ID or IP)
      const identifier = req.user?.id || req.ip || 'anonymous';
      const key = `${keyPrefix}:${identifier}`;

      // Get current count
      const current = await redis.get(key);
      const count = current ? parseInt(current) : 0;

      if (count >= maxRequests) {
        // Rate limit exceeded
        const ttl = await redis.ttl(key);

        res.status(429).json({
          success: false,
          error: 'Too many requests',
          retryAfter: ttl > 0 ? ttl : Math.ceil(windowMs / 1000),
        });

        logger.warn('Rate limit exceeded', {
          identifier,
          count,
          maxRequests,
        });

        return;
      }

      // Increment counter
      const newCount = await redis.incr(key);

      // Set expiry on first request
      if (newCount === 1) {
        await redis.pexpire(key, windowMs);
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - newCount).toString());
      res.setHeader('X-RateLimit-Reset', (Date.now() + windowMs).toString());

      // Store original end function
      const originalEnd = res.end;

      // Override end function to handle skip options
      res.end = function (...args: any[]) {
        const shouldSkip =
          (skipSuccessfulRequests && res.statusCode < 400) ||
          (skipFailedRequests && res.statusCode >= 400);

        if (shouldSkip) {
          // Decrement counter if we should skip
          redis.decr(key).catch((err) => {
            logger.error('Error decrementing rate limit', { error: err.message });
          });
        }

        // Call original end function
        return originalEnd.apply(res, args);
      };

      next();
    } catch (error: any) {
      logger.error('Rate limiter error', { error: error.message });

      // Don't block request on rate limiter errors
      next();
    }
  };
};

/**
 * Per-user notification rate limiter
 * Prevents spam from individual users
 */
export const notificationRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 notifications per minute
  keyPrefix: 'notification-rate',
  skipFailedRequests: true,
});

/**
 * API rate limiter for general endpoints
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  keyPrefix: 'api-rate',
  skipFailedRequests: true,
});

/**
 * Strict rate limiter for sensitive operations
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 requests per minute
  keyPrefix: 'strict-rate',
  skipFailedRequests: true,
});

/**
 * Get rate limit info for a user
 */
export const getRateLimitInfo = async (
  userId: string,
  keyPrefix: string = 'ratelimit'
): Promise<{
  count: number;
  limit: number;
  remaining: number;
  resetAt: number;
}> => {
  const key = `${keyPrefix}:${userId}`;
  const count = parseInt((await redis.get(key)) || '0');
  const ttl = await redis.ttl(key);

  return {
    count,
    limit: config.rateLimit.maxRequests,
    remaining: Math.max(0, config.rateLimit.maxRequests - count),
    resetAt: ttl > 0 ? Date.now() + ttl * 1000 : Date.now(),
  };
};

/**
 * Reset rate limit for a user (admin function)
 */
export const resetRateLimit = async (
  userId: string,
  keyPrefix: string = 'ratelimit'
): Promise<void> => {
  const key = `${keyPrefix}:${userId}`;
  await redis.del(key);
  logger.info('Rate limit reset', { userId, keyPrefix });
};
