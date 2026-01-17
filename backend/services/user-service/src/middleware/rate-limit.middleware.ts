import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';

import logger from '../utils/logger';

// Redis client for rate limiting
let redisClient: any = null;

// Initialize Redis client
const initRedis = async () => {
  if (!redisClient) {
    try {
      const redis = require('redis');
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = process.env.REDIS_PORT || '6379';
      const redisPassword = process.env.REDIS_PASSWORD;
      const redisUrl = process.env.REDIS_URL || `redis://${redisPassword ? `:${redisPassword}@` : ''}${redisHost}:${redisPort}`;
      redisClient = redis.createClient({
        url: redisUrl,
      });

      redisClient.on('error', (err: Error) => {
        logger.error('Redis Client Error:', err);
      });

      await redisClient.connect();
      logger.info('Redis connected for rate limiting');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      redisClient = null;
    }
  }

  return redisClient;
};

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyPrefix?: string; // Prefix for Redis keys
  skipSuccessfulRequests?: boolean; // Only count failed requests
  message?: string; // Custom error message
}

/**
 * Rate Limiting Middleware
 * Uses Redis for distributed rate limiting across multiple instances
 */
export class RateLimitMiddleware {
  /**
   * Create rate limiter middleware
   */
  static createRateLimiter(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
      try {
        const client = await initRedis();

        if (!client) {
          // If Redis is not available, log warning and allow request
          logger.warn('Rate limiting disabled - Redis not available');
          return next();
        }

        // Generate key based on IP and endpoint
        const identifier = req.ip || req.socket.remoteAddress || 'unknown';
        const endpoint = req.path;
        const key = `${config.keyPrefix || 'rate_limit'}:${identifier}:${endpoint}`;

        // Get current count
        const current = await client.get(key);
        const count = current ? parseInt(current) : 0;

        // Check if limit exceeded
        if (count >= config.maxRequests) {
          logger.warn(`Rate limit exceeded for ${identifier} on ${endpoint}`);

          const retryAfterSeconds = Math.ceil(config.windowMs / 1000);

          // Set Retry-After header (RFC 7231)
          res.setHeader('Retry-After', retryAfterSeconds.toString());
          res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
          res.setHeader('X-RateLimit-Remaining', '0');
          res.setHeader('X-RateLimit-Reset', new Date(Date.now() + config.windowMs).toISOString());

          return res.status(429).json({
            success: false,
            error: 'Too Many Requests',
            message: config.message || 'Too many requests. Please try again later.',
            retryAfter: retryAfterSeconds,
          });
        }

        // Increment counter
        if (count === 0) {
          // First request in window - set expiry
          await client.set(key, '1', {
            EX: Math.ceil(config.windowMs / 1000),
          });
        } else {
          // Increment existing counter
          await client.incr(key);
        }

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', (config.maxRequests - count - 1).toString());
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + config.windowMs).toISOString());

        next();
      } catch (error) {
        logger.error('Rate limiting error:', error);
        // Don't block requests on rate limiting errors
        next();
      }
    };
  }

  /**
   * Rate limiter for authentication endpoints
   */
  static authRateLimiter() {
    return RateLimitMiddleware.createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 requests per 15 minutes
      keyPrefix: 'auth',
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    });
  }

  /**
   * Rate limiter for 2FA verification
   */
  static twoFactorRateLimiter() {
    return RateLimitMiddleware.createRateLimiter({
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 3, // 3 requests per 5 minutes
      keyPrefix: '2fa',
      message: 'Too many verification attempts. Please try again in 5 minutes.',
    });
  }

  /**
   * Rate limiter for SMS sending
   */
  static smsRateLimiter() {
    return RateLimitMiddleware.createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 SMS per hour
      keyPrefix: 'sms',
      message: 'Too many SMS requests. Please try again later.',
    });
  }

  /**
   * Rate limiter for email sending
   */
  static emailRateLimiter() {
    return RateLimitMiddleware.createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5, // 5 emails per hour
      keyPrefix: 'email',
      message: 'Too many email requests. Please try again later.',
    });
  }

  /**
   * Rate limiter for photo uploads
   */
  static photoUploadRateLimiter() {
    return RateLimitMiddleware.createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 20, // 20 uploads per hour
      keyPrefix: 'photo_upload',
      message: 'Too many photo uploads. Please try again later.',
    });
  }

  /**
   * Rate limiter for report submissions
   */
  static reportRateLimiter() {
    return RateLimitMiddleware.createRateLimiter({
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      maxRequests: 10, // 10 reports per day
      keyPrefix: 'report',
      message: 'Too many reports submitted. Please try again tomorrow.',
    });
  }

  /**
   * Rate limiter for password reset
   */
  static passwordResetRateLimiter() {
    return RateLimitMiddleware.createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 requests per hour
      keyPrefix: 'password_reset',
      message: 'Too many password reset requests. Please try again later.',
    });
  }

  /**
   * Rate limiter for profile updates
   */
  static profileUpdateRateLimiter() {
    return RateLimitMiddleware.createRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 updates per minute
      keyPrefix: 'profile_update',
      message: 'Too many profile updates. Please slow down.',
    });
  }

  /**
   * Rate limiter for swipes
   */
  static swipeRateLimiter() {
    return RateLimitMiddleware.createRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 swipes per minute
      keyPrefix: 'swipe',
      message: 'Too many swipes. Please slow down.',
    });
  }

  /**
   * Rate limiter for messaging
   */
  static messageRateLimiter() {
    return RateLimitMiddleware.createRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30, // 30 messages per minute
      keyPrefix: 'message',
      message: 'Too many messages. Please slow down.',
    });
  }

  /**
   * Rate limiter for API calls (general)
   */
  static apiRateLimiter() {
    return RateLimitMiddleware.createRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 requests per minute
      keyPrefix: 'api',
      message: 'Too many requests. Please slow down.',
    });
  }

  /**
   * Advanced rate limiter with sliding window
   */
  static slidingWindowRateLimiter(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
      try {
        const client = await initRedis();

        if (!client) {
          logger.warn('Sliding window rate limiting disabled - Redis not available');
          return next();
        }

        const identifier = req.ip || req.socket.remoteAddress || 'unknown';
        const endpoint = req.path;
        const key = `${config.keyPrefix || 'sliding'}:${identifier}:${endpoint}`;
        const now = Date.now();
        const windowStart = now - config.windowMs;

        // Remove old entries and add new entry
        await client.zRemRangeByScore(key, 0, windowStart);
        await client.zAdd(key, { score: now, value: `${now}` });
        await client.expire(key, Math.ceil(config.windowMs / 1000));

        // Count requests in current window
        const count = await client.zCard(key);

        if (count > config.maxRequests) {
          logger.warn(`Sliding window rate limit exceeded for ${identifier} on ${endpoint}`);

          const retryAfterSeconds = Math.ceil(config.windowMs / 1000);

          // Set Retry-After header (RFC 7231)
          res.setHeader('Retry-After', retryAfterSeconds.toString());
          res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
          res.setHeader('X-RateLimit-Remaining', '0');
          res.setHeader('X-RateLimit-Reset', (Date.now() + config.windowMs).toString());

          return res.status(429).json({
            success: false,
            error: 'Too Many Requests',
            message: config.message || 'Too many requests. Please try again later.',
            retryAfter: retryAfterSeconds,
          });
        }

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', (config.maxRequests - count).toString());

        next();
      } catch (error) {
        logger.error('Sliding window rate limiting error:', error);
        next();
      }
    };
  }

  /**
   * Token bucket rate limiter (for burst handling)
   */
  static tokenBucketRateLimiter(config: {
    capacity: number; // Maximum tokens
    refillRate: number; // Tokens per second
    keyPrefix?: string;
    message?: string;
  }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
      try {
        const client = await initRedis();

        if (!client) {
          logger.warn('Token bucket rate limiting disabled - Redis not available');
          return next();
        }

        const identifier = req.ip || req.socket.remoteAddress || 'unknown';
        const endpoint = req.path;
        const key = `${config.keyPrefix || 'token_bucket'}:${identifier}:${endpoint}`;
        const now = Date.now() / 1000; // Convert to seconds

        // Get current bucket state
        const bucketData = await client.get(key);
        let tokens = config.capacity;
        let lastRefill = now;

        if (bucketData) {
          const parsed = JSON.parse(bucketData);
          tokens = parsed.tokens;
          lastRefill = parsed.lastRefill;

          // Refill tokens based on time elapsed
          const elapsed = now - lastRefill;
          const refillAmount = elapsed * config.refillRate;
          tokens = Math.min(config.capacity, tokens + refillAmount);
          lastRefill = now;
        }

        // Check if we have tokens available
        if (tokens < 1) {
          logger.warn(`Token bucket rate limit exceeded for ${identifier} on ${endpoint}`);

          // Calculate time until next token is available
          const retryAfterSeconds = Math.ceil(1 / config.refillRate);

          // Set Retry-After header (RFC 7231)
          res.setHeader('Retry-After', retryAfterSeconds.toString());
          res.setHeader('X-RateLimit-Limit', config.capacity.toString());
          res.setHeader('X-RateLimit-Remaining', '0');

          return res.status(429).json({
            success: false,
            error: 'Too Many Requests',
            message: config.message || 'Too many requests. Please try again later.',
            retryAfter: retryAfterSeconds,
          });
        }

        // Consume a token
        tokens -= 1;

        // Update bucket state
        await client.set(key, JSON.stringify({ tokens, lastRefill }), {
          EX: Math.ceil(config.capacity / config.refillRate),
        });

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', config.capacity.toString());
        res.setHeader('X-RateLimit-Remaining', Math.floor(tokens).toString());

        next();
      } catch (error) {
        logger.error('Token bucket rate limiting error:', error);
        next();
      }
    };
  }

  /**
   * Rate limiter based on user tier (legacy 3-tier support)
   */
  static tieredRateLimiter(configs: {
    free: RateLimitConfig;
    premium: RateLimitConfig;
    vip: RateLimitConfig;
  }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
      // Get user tier from request (set by auth middleware)
      const userTier = (req as any).user?.tier || 'free';

      let config: RateLimitConfig;
      switch (userTier) {
        case 'vip':
          config = configs.vip;
          break;
        case 'premium':
          config = configs.premium;
          break;
        default:
          config = configs.free;
      }

      return RateLimitMiddleware.createRateLimiter(config)(req, res, next);
    };
  }

  /**
   * Advanced rate limiter with full subscription tier support
   * Supports all 6 Flamoral subscription tiers
   */
  static subscriptionTieredRateLimiter(configs: {
    free: RateLimitConfig;
    basic: RateLimitConfig;
    plus: RateLimitConfig;
    premium: RateLimitConfig;
    premium_plus: RateLimitConfig;
    elite: RateLimitConfig;
  }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
      // Get subscription tier from user object
      const user = (req as any).user;
      const subscriptionTier = user?.subscriptionTier || user?.subscription?.tier || 'free';

      let config: RateLimitConfig;
      switch (subscriptionTier) {
        case 'elite':
          config = configs.elite;
          break;
        case 'premium_plus':
          config = configs.premium_plus;
          break;
        case 'premium':
          config = configs.premium;
          break;
        case 'plus':
          config = configs.plus;
          break;
        case 'basic':
          config = configs.basic;
          break;
        default:
          config = configs.free;
      }

      // Add tier info to response headers
      res.setHeader('X-RateLimit-Tier', subscriptionTier);

      return RateLimitMiddleware.createRateLimiter(config)(req, res, next);
    };
  }
}

// Export commonly used rate limiters
export const authRateLimiter = RateLimitMiddleware.authRateLimiter();
export const twoFactorRateLimiter = RateLimitMiddleware.twoFactorRateLimiter();
export const smsRateLimiter = RateLimitMiddleware.smsRateLimiter();
export const emailRateLimiter = RateLimitMiddleware.emailRateLimiter();
export const photoUploadRateLimiter = RateLimitMiddleware.photoUploadRateLimiter();
export const reportRateLimiter = RateLimitMiddleware.reportRateLimiter();
export const passwordResetRateLimiter = RateLimitMiddleware.passwordResetRateLimiter();
export const apiRateLimiter = RateLimitMiddleware.apiRateLimiter();

// Export tiered rate limiters for subscription-based limiting
export const profileViewRateLimiter = RateLimitMiddleware.subscriptionTieredRateLimiter({
  free: { windowMs: 60000, maxRequests: 30 },
  basic: { windowMs: 60000, maxRequests: 60 },
  plus: { windowMs: 60000, maxRequests: 90 },
  premium: { windowMs: 60000, maxRequests: 120 },
  premium_plus: { windowMs: 60000, maxRequests: 150 },
  elite: { windowMs: 60000, maxRequests: 200 },
});

export const searchRateLimiter = RateLimitMiddleware.subscriptionTieredRateLimiter({
  free: { windowMs: 60000, maxRequests: 15 },
  basic: { windowMs: 60000, maxRequests: 30 },
  plus: { windowMs: 60000, maxRequests: 45 },
  premium: { windowMs: 60000, maxRequests: 60 },
  premium_plus: { windowMs: 60000, maxRequests: 90 },
  elite: { windowMs: 60000, maxRequests: 120 },
});

export const locationUpdateRateLimiter = RateLimitMiddleware.subscriptionTieredRateLimiter({
  free: { windowMs: 60000, maxRequests: 10 },
  basic: { windowMs: 60000, maxRequests: 20 },
  plus: { windowMs: 60000, maxRequests: 30 },
  premium: { windowMs: 60000, maxRequests: 40 },
  premium_plus: { windowMs: 60000, maxRequests: 50 },
  elite: { windowMs: 60000, maxRequests: 60 },
});

export default RateLimitMiddleware;
