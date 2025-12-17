import { Request, Response, NextFunction } from 'express';
import { redis } from '../infrastructure/redis';
import { logger } from '../utils/logger';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

/**
 * Rate limiting middleware using Redis
 */
export const createRateLimiter = (options: RateLimitOptions) => {
  const { windowMs, maxRequests, message = 'Too many requests, please try again later' } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identifier = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `ratelimit:${identifier}:${req.path}`;

      // Get current count
      const current = await redis.get(key);
      const count = current ? parseInt(current) : 0;

      if (count >= maxRequests) {
        logger.warn(`Rate limit exceeded for ${identifier} on ${req.path}`);
        res.status(429).json({
          success: false,
          error: message,
          retryAfter: Math.ceil(windowMs / 1000),
        });
        return;
      }

      // Increment counter
      if (count === 0) {
        await redis.set(key, '1', Math.ceil(windowMs / 1000));
      } else {
        const client = redis.getClient();
        await client.incr(key);
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - count - 1).toString());
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());

      next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // On error, allow the request through (fail open)
      next();
    }
  };
};

/**
 * Strict rate limiter for sensitive operations
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many attempts, please try again in 15 minutes',
});

/**
 * Standard rate limiter for API endpoints
 */
export const standardRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
  message: 'Too many requests, please slow down',
});

/**
 * Lenient rate limiter for read operations
 */
export const lenientRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 120,
  message: 'Too many requests, please slow down',
});
