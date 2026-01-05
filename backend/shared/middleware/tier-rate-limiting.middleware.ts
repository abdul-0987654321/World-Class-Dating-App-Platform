/**
 * Tier-based Rate Limiting Middleware
 *
 * Implements tiered rate limiting where premium subscribers get higher limits.
 * Uses sliding window algorithm with Redis for distributed rate limiting.
 *
 * @module TierRateLimitingMiddleware
 */

import { Request, Response, NextFunction } from 'express';

import createLogger from '../utils/logger';

const logger = createLogger('tier-rate-limiting');

// Rate limit configuration by tier (requests per window)
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  burstLimit?: number; // Optional burst limit for short spikes
}

// Default rate limits by tier
export const TIER_RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    burstLimit: 10,
  },
  basic: {
    windowMs: 60 * 1000,
    maxRequests: 60,
    burstLimit: 20,
  },
  plus: {
    windowMs: 60 * 1000,
    maxRequests: 120,
    burstLimit: 40,
  },
  premium: {
    windowMs: 60 * 1000,
    maxRequests: 200,
    burstLimit: 60,
  },
  premium_plus: {
    windowMs: 60 * 1000,
    maxRequests: 300,
    burstLimit: 80,
  },
  elite: {
    windowMs: 60 * 1000,
    maxRequests: 500,
    burstLimit: 100,
  },
};

// Endpoint-specific rate limits
export const ENDPOINT_RATE_LIMITS: Record<string, Record<string, RateLimitConfig>> = {
  // Auth endpoints - stricter limits
  '/api/auth/login': {
    free: { windowMs: 60 * 1000, maxRequests: 5 },
    basic: { windowMs: 60 * 1000, maxRequests: 10 },
    plus: { windowMs: 60 * 1000, maxRequests: 10 },
    premium: { windowMs: 60 * 1000, maxRequests: 15 },
    premium_plus: { windowMs: 60 * 1000, maxRequests: 15 },
    elite: { windowMs: 60 * 1000, maxRequests: 20 },
  },
  '/api/auth/register': {
    free: { windowMs: 3600 * 1000, maxRequests: 3 }, // 3 per hour
    basic: { windowMs: 3600 * 1000, maxRequests: 5 },
    plus: { windowMs: 3600 * 1000, maxRequests: 5 },
    premium: { windowMs: 3600 * 1000, maxRequests: 10 },
    premium_plus: { windowMs: 3600 * 1000, maxRequests: 10 },
    elite: { windowMs: 3600 * 1000, maxRequests: 20 },
  },
  // Matching endpoints
  '/api/discover': {
    free: { windowMs: 60 * 1000, maxRequests: 10 },
    basic: { windowMs: 60 * 1000, maxRequests: 30 },
    plus: { windowMs: 60 * 1000, maxRequests: 60 },
    premium: { windowMs: 60 * 1000, maxRequests: 120 },
    premium_plus: { windowMs: 60 * 1000, maxRequests: 180 },
    elite: { windowMs: 60 * 1000, maxRequests: 300 },
  },
  '/api/swipe': {
    free: { windowMs: 60 * 1000, maxRequests: 20 },
    basic: { windowMs: 60 * 1000, maxRequests: 100 },
    plus: { windowMs: 60 * 1000, maxRequests: 200 },
    premium: { windowMs: 60 * 1000, maxRequests: 500 },
    premium_plus: { windowMs: 60 * 1000, maxRequests: 500 },
    elite: { windowMs: 60 * 1000, maxRequests: 1000 },
  },
  // Messaging endpoints
  '/api/messages': {
    free: { windowMs: 60 * 1000, maxRequests: 30 },
    basic: { windowMs: 60 * 1000, maxRequests: 60 },
    plus: { windowMs: 60 * 1000, maxRequests: 120 },
    premium: { windowMs: 60 * 1000, maxRequests: 200 },
    premium_plus: { windowMs: 60 * 1000, maxRequests: 300 },
    elite: { windowMs: 60 * 1000, maxRequests: 500 },
  },
};

// In-memory store for development/fallback (use Redis in production)
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

// Interface for rate limit store
export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
  get(key: string): Promise<{ count: number; resetAt: number } | null>;
  reset(key: string): Promise<void>;
}

// In-memory rate limit store (for development)
export class InMemoryRateLimitStore implements RateLimitStore {
  async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    const existing = inMemoryStore.get(key);

    if (existing && existing.resetAt > now) {
      existing.count += 1;
      return existing;
    }

    const newEntry = {
      count: 1,
      resetAt: now + windowMs,
    };
    inMemoryStore.set(key, newEntry);
    return newEntry;
  }

  async get(key: string): Promise<{ count: number; resetAt: number } | null> {
    const entry = inMemoryStore.get(key);
    if (entry && entry.resetAt > Date.now()) {
      return entry;
    }
    return null;
  }

  async reset(key: string): Promise<void> {
    inMemoryStore.delete(key);
  }
}

// Redis rate limit store (for production)
export class RedisRateLimitStore implements RateLimitStore {
  private redis: any;

  constructor(redisClient: any) {
    this.redis = redisClient;
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    const resetAt = now + windowMs;

    try {
      // Use Redis MULTI for atomic operations
      const multi = this.redis.multi();
      multi.incr(key);
      multi.pttl(key);

      const results = await multi.exec();
      const count = results[0][1];
      let ttl = results[1][1];

      // If key is new or expired, set TTL
      if (ttl < 0) {
        await this.redis.pexpire(key, windowMs);
        ttl = windowMs;
      }

      return {
        count,
        resetAt: now + ttl,
      };
    } catch (error) {
      logger.error('Redis rate limit error', { error, key });
      // Fail open - don't block requests on Redis failure
      return { count: 0, resetAt };
    }
  }

  async get(key: string): Promise<{ count: number; resetAt: number } | null> {
    try {
      const [count, ttl] = await Promise.all([this.redis.get(key), this.redis.pttl(key)]);

      if (!count || ttl < 0) {
        return null;
      }

      return {
        count: parseInt(count, 10),
        resetAt: Date.now() + ttl,
      };
    } catch (error) {
      logger.error('Redis rate limit get error', { error, key });
      return null;
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error('Redis rate limit reset error', { error, key });
    }
  }
}

// Extended request interface
export interface RateLimitedRequest extends Omit<Request, 'user'> {
  user?: {
    id?: string;
    userId?: string;
    email?: string;
    [key: string]: any;
  };
  subscription?: {
    tier: string;
    isActive: boolean;
  };
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: Date;
  };
}

// Configuration options
export interface TierRateLimitOptions {
  store?: RateLimitStore;
  keyPrefix?: string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: RateLimitedRequest) => string;
  skip?: (req: RateLimitedRequest) => boolean;
  onRateLimited?: (req: RateLimitedRequest, res: Response) => void;
}

/**
 * Create tier-based rate limiting middleware
 *
 * @example
 * ```typescript
 * import { createTierRateLimiter, RedisRateLimitStore } from '@flamoral/backend-shared';
 *
 * const rateLimiter = createTierRateLimiter({
 *   store: new RedisRateLimitStore(redisClient),
 * });
 *
 * app.use(rateLimiter);
 * ```
 */
export function createTierRateLimiter(options: TierRateLimitOptions = {}) {
  const store = options.store || new InMemoryRateLimitStore();
  const keyPrefix = options.keyPrefix || 'rl:';

  const defaultKeyGenerator = (req: RateLimitedRequest): string => {
    const userId = req.user?.id || req.user?.userId;
    if (userId) {
      return `${keyPrefix}user:${userId}`;
    }
    // Fallback to IP for unauthenticated requests
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `${keyPrefix}ip:${ip}`;
  };

  const keyGenerator = options.keyGenerator || defaultKeyGenerator;

  return async (req: RateLimitedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Check if we should skip this request
    if (options.skip && options.skip(req)) {
      return next();
    }

    try {
      const tier = req.subscription?.tier || 'free';
      const path = req.path;

      // Get endpoint-specific limits or fall back to tier defaults
      let config: RateLimitConfig;
      const endpointLimits = ENDPOINT_RATE_LIMITS[path];
      if (endpointLimits && endpointLimits[tier]) {
        config = endpointLimits[tier];
      } else {
        config = TIER_RATE_LIMITS[tier] || TIER_RATE_LIMITS.free;
      }

      const key = keyGenerator(req);
      const pathKey = `${key}:${path}`;

      // Increment counter
      const result = await store.increment(pathKey, config.windowMs);

      // Set rate limit headers
      const remaining = Math.max(0, config.maxRequests - result.count);
      const resetDate = new Date(result.resetAt);

      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));
      res.setHeader('X-RateLimit-Tier', tier);

      // Attach to request for downstream use
      req.rateLimit = {
        limit: config.maxRequests,
        remaining,
        reset: resetDate,
      };

      // Check if limit exceeded
      if (result.count > config.maxRequests) {
        logger.warn('Rate limit exceeded', {
          userId: req.user?.id,
          tier,
          path,
          count: result.count,
          limit: config.maxRequests,
        });

        res.setHeader('Retry-After', Math.ceil((result.resetAt - Date.now()) / 1000));

        if (options.onRateLimited) {
          options.onRateLimited(req, res);
          return;
        }

        res.status(429).json({
          error: 'rate_limit_exceeded',
          message: 'Too many requests. Please slow down.',
          limit: config.maxRequests,
          windowMs: config.windowMs,
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
          tier,
          upgradeUrl: tier === 'free' ? '/subscription' : undefined,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limiting error', { error });
      // Fail open - don't block requests on rate limiter failure
      next();
    }
  };
}

/**
 * Create endpoint-specific rate limiter
 *
 * @example
 * ```typescript
 * router.post('/login',
 *   endpointRateLimiter('/api/auth/login'),
 *   loginController
 * );
 * ```
 */
export function endpointRateLimiter(endpoint: string, options: TierRateLimitOptions = {}) {
  const store = options.store || new InMemoryRateLimitStore();
  const keyPrefix = options.keyPrefix || 'rl:endpoint:';

  return async (req: RateLimitedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tier = req.subscription?.tier || 'free';
      const endpointLimits = ENDPOINT_RATE_LIMITS[endpoint];

      if (!endpointLimits) {
        return next();
      }

      const config = endpointLimits[tier] || endpointLimits.free || TIER_RATE_LIMITS.free;
      const userId = req.user?.id || req.user?.userId;
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `${keyPrefix}${endpoint}:${userId || ip}`;

      const result = await store.increment(key, config.windowMs);

      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - result.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

      if (result.count > config.maxRequests) {
        logger.warn('Endpoint rate limit exceeded', {
          endpoint,
          userId,
          ip,
          tier,
          count: result.count,
        });

        res.status(429).json({
          error: 'rate_limit_exceeded',
          message: `Too many requests to ${endpoint}. Please try again later.`,
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Endpoint rate limiting error', { error, endpoint });
      next();
    }
  };
}

/**
 * Cleanup expired entries from in-memory store (call periodically)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of inMemoryStore.entries()) {
    if (entry.resetAt < now) {
      inMemoryStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

export default {
  createTierRateLimiter,
  endpointRateLimiter,
  InMemoryRateLimitStore,
  RedisRateLimitStore,
  TIER_RATE_LIMITS,
  ENDPOINT_RATE_LIMITS,
  cleanupExpiredEntries,
};
