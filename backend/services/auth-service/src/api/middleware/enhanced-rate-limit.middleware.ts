import { Request, Response, NextFunction } from 'express';
import redisCache from '../../infrastructure/cache/redis';
import logger from '../../utils/logger';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
  onLimitReached?: (req: Request) => void;
}

/**
 * Enhanced rate limiter using Redis
 * Provides distributed rate limiting across multiple instances
 */
class EnhancedRateLimiter {
  /**
   * Create rate limit middleware
   */
  createLimiter(config: RateLimitConfig) {
    const {
      windowMs,
      maxRequests,
      message = 'Too many requests, please try again later',
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      keyGenerator = this.defaultKeyGenerator,
      handler = this.defaultHandler,
      onLimitReached,
    } = config;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Generate unique key for this client
        const key = `ratelimit:${keyGenerator(req)}`;

        // Get current request count
        const current = await this.getRequestCount(key);

        // Check if limit exceeded
        if (current >= maxRequests) {
          logger.warn('Rate limit exceeded', {
            key,
            current,
            limit: maxRequests,
            ip: this.getClientIp(req),
            path: req.path,
          });

          // Trigger callback if provided
          if (onLimitReached) {
            onLimitReached(req);
          }

          // Set rate limit headers
          res.setHeader('X-RateLimit-Limit', maxRequests.toString());
          res.setHeader('X-RateLimit-Remaining', '0');
          res.setHeader('X-RateLimit-Reset', await this.getResetTime(key));

          // Handle rate limit exceeded
          handler(req, res);
          return;
        }

        // Increment request count
        await this.incrementRequestCount(key, windowMs);

        // Calculate remaining requests
        const remaining = maxRequests - (current + 1);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', remaining.toString());
        res.setHeader('X-RateLimit-Reset', await this.getResetTime(key));

        // Store original functions
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        // Wrap response to detect success/failure
        res.json = function (body: any) {
          if (skipSuccessfulRequests && res.statusCode < 400) {
            // Decrement on successful request
            redisCache.decrement(key).catch(() => {});
          }

          if (skipFailedRequests && res.statusCode >= 400) {
            // Decrement on failed request
            redisCache.decrement(key).catch(() => {});
          }

          return originalJson(body);
        };

        res.send = function (body: any) {
          if (skipSuccessfulRequests && res.statusCode < 400) {
            redisCache.decrement(key).catch(() => {});
          }

          if (skipFailedRequests && res.statusCode >= 400) {
            redisCache.decrement(key).catch(() => {});
          }

          return originalSend(body);
        };

        next();
      } catch (error) {
        logger.error('Rate limit middleware error', error);
        // On error, allow request (fail open)
        next();
      }
    };
  }

  /**
   * Default key generator (IP + path)
   */
  private defaultKeyGenerator(req: Request): string {
    const ip = this.getClientIp(req);
    const path = req.path;
    return `${ip}:${path}`;
  }

  /**
   * Default rate limit handler
   */
  private defaultHandler(req: Request, res: Response): void {
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      retryAfter: res.getHeader('X-RateLimit-Reset'),
    });
  }

  /**
   * Get current request count
   */
  private async getRequestCount(key: string): Promise<number> {
    const count = await redisCache.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Increment request count
   */
  private async incrementRequestCount(key: string, windowMs: number): Promise<void> {
    const current = await redisCache.get(key);

    if (current) {
      await redisCache.increment(key);
    } else {
      await redisCache.set(key, '1', Math.ceil(windowMs / 1000));
    }
  }

  /**
   * Get reset time for rate limit window
   */
  private async getResetTime(key: string): Promise<string> {
    const ttl = await redisCache.getTTL(key);
    const resetTime = new Date(Date.now() + ttl * 1000);
    return resetTime.toISOString();
  }

  /**
   * Get client IP address
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
}

// Create singleton instance
const rateLimiter = new EnhancedRateLimiter();

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimiter.createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 requests per window
  message: 'Too many authentication attempts, please try again in 15 minutes',
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    const ip = req.ip || 'unknown';
    return `auth:${ip}`;
  },
  onLimitReached: (req) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent'],
    });
  },
});

/**
 * Rate limiter for password reset
 */
export const passwordResetLimiter = rateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // 5 requests per hour
  message: 'Too many password reset requests, please try again in an hour',
  keyGenerator: (req) => {
    const email = req.body.email || 'unknown';
    return `password-reset:${email}`;
  },
});

/**
 * Rate limiter for email verification resend
 */
export const verificationLimiter = rateLimiter.createLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 3, // 3 requests per 10 minutes
  message: 'Too many verification requests, please try again in 10 minutes',
  keyGenerator: (req) => {
    const email = req.body.email || 'unknown';
    return `verification:${email}`;
  },
});

/**
 * General API rate limiter
 */
export const generalLimiter = rateLimiter.createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window
  skipSuccessfulRequests: false,
});

/**
 * Strict rate limiter for sensitive operations
 */
export const sensitiveOperationLimiter = rateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 requests per hour
  message: 'Too many requests for this sensitive operation',
  keyGenerator: (req) => {
    const userId = (req as any).user?.userId || 'unknown';
    const path = req.path;
    return `sensitive:${userId}:${path}`;
  },
});

/**
 * Rate limiter for file uploads
 */
export const uploadLimiter = rateLimiter.createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // 20 uploads per hour
  message: 'Too many file uploads, please try again later',
  keyGenerator: (req) => {
    const userId = (req as any).user?.userId || 'unknown';
    return `upload:${userId}`;
  },
});

export default rateLimiter;
