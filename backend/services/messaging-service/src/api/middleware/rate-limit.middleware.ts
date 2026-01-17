import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

import { createLogger } from '../../utils/logger';

const logger = createLogger('rate-limit-middleware');

// Subscription tiers
export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PLUS = 'plus',
  PREMIUM = 'premium',
  PREMIUM_PLUS = 'premium_plus',
  ELITE = 'elite',
}

// Rate limit configuration
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Tiered rate limits for messaging endpoints
export const MESSAGE_RATE_LIMITS: Record<string, Record<SubscriptionTier, RateLimitConfig>> = {
  'POST /messages': {
    [SubscriptionTier.FREE]: { windowMs: 60000, maxRequests: 20 },
    [SubscriptionTier.BASIC]: { windowMs: 60000, maxRequests: 40 },
    [SubscriptionTier.PLUS]: { windowMs: 60000, maxRequests: 60 },
    [SubscriptionTier.PREMIUM]: { windowMs: 60000, maxRequests: 100 },
    [SubscriptionTier.PREMIUM_PLUS]: { windowMs: 60000, maxRequests: 150 },
    [SubscriptionTier.ELITE]: { windowMs: 60000, maxRequests: 200 },
  },
  'GET /messages': {
    [SubscriptionTier.FREE]: { windowMs: 60000, maxRequests: 30 },
    [SubscriptionTier.BASIC]: { windowMs: 60000, maxRequests: 60 },
    [SubscriptionTier.PLUS]: { windowMs: 60000, maxRequests: 90 },
    [SubscriptionTier.PREMIUM]: { windowMs: 60000, maxRequests: 120 },
    [SubscriptionTier.PREMIUM_PLUS]: { windowMs: 60000, maxRequests: 150 },
    [SubscriptionTier.ELITE]: { windowMs: 60000, maxRequests: 200 },
  },
  'GET /conversations': {
    [SubscriptionTier.FREE]: { windowMs: 60000, maxRequests: 20 },
    [SubscriptionTier.BASIC]: { windowMs: 60000, maxRequests: 40 },
    [SubscriptionTier.PLUS]: { windowMs: 60000, maxRequests: 60 },
    [SubscriptionTier.PREMIUM]: { windowMs: 60000, maxRequests: 100 },
    [SubscriptionTier.PREMIUM_PLUS]: { windowMs: 60000, maxRequests: 120 },
    [SubscriptionTier.ELITE]: { windowMs: 60000, maxRequests: 150 },
  },
  'POST /gifts': {
    [SubscriptionTier.FREE]: { windowMs: 86400000, maxRequests: 5 }, // 5 per day
    [SubscriptionTier.BASIC]: { windowMs: 86400000, maxRequests: 20 },
    [SubscriptionTier.PLUS]: { windowMs: 86400000, maxRequests: 50 },
    [SubscriptionTier.PREMIUM]: { windowMs: 86400000, maxRequests: 100 },
    [SubscriptionTier.PREMIUM_PLUS]: { windowMs: 86400000, maxRequests: 200 },
    [SubscriptionTier.ELITE]: { windowMs: 86400000, maxRequests: -1 }, // unlimited
  },
  default: {
    [SubscriptionTier.FREE]: { windowMs: 60000, maxRequests: 30 },
    [SubscriptionTier.BASIC]: { windowMs: 60000, maxRequests: 60 },
    [SubscriptionTier.PLUS]: { windowMs: 60000, maxRequests: 90 },
    [SubscriptionTier.PREMIUM]: { windowMs: 60000, maxRequests: 120 },
    [SubscriptionTier.PREMIUM_PLUS]: { windowMs: 60000, maxRequests: 150 },
    [SubscriptionTier.ELITE]: { windowMs: 60000, maxRequests: 200 },
  },
};

// Redis client singleton
let redisClient: Redis | null = null;

/**
 * Initialize Redis connection for rate limiting
 */
export async function initRateLimitRedis(): Promise<Redis | null> {
  if (redisClient) {
    return redisClient;
  }

  try {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisPassword = process.env.REDIS_PASSWORD;

    if (redisUrl) {
      redisClient = new Redis(redisUrl);
    } else {
      redisClient = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword || undefined,
        retryStrategy: (times) => Math.min(times * 50, 2000),
        maxRetriesPerRequest: 3,
      });
    }

    redisClient.on('error', (err) => {
      logger.error('Redis rate limit error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected for rate limiting');
    });

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis for rate limiting:', error);
    return null;
  }
}

/**
 * Get client IP from request
 */
function getClientIp(req: Request): string {
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
 * Get subscription tier from request user
 */
function getSubscriptionTier(req: Request): SubscriptionTier {
  const user = (req as any).user;
  if (!user) {
    return SubscriptionTier.FREE;
  }

  const tier = user.subscriptionTier || user.subscription?.tier;
  if (tier && Object.values(SubscriptionTier).includes(tier)) {
    return tier as SubscriptionTier;
  }

  return SubscriptionTier.FREE;
}

/**
 * Get rate limit configuration for endpoint and tier
 */
function getRateLimitConfig(method: string, path: string, tier: SubscriptionTier): RateLimitConfig {
  const endpointKey = `${method} ${path}`;

  // Check exact match
  if (MESSAGE_RATE_LIMITS[endpointKey]?.[tier]) {
    return MESSAGE_RATE_LIMITS[endpointKey][tier];
  }

  // Check pattern matches
  for (const [key, limits] of Object.entries(MESSAGE_RATE_LIMITS)) {
    if (key === 'default') continue;

    const [keyMethod, keyPath] = key.split(' ');
    if (keyMethod !== method) continue;

    // Simple pattern matching for path params
    const pattern = keyPath.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);

    if (regex.test(path)) {
      return limits[tier];
    }
  }

  // Return default
  return MESSAGE_RATE_LIMITS.default[tier];
}

/**
 * Sliding window rate limit check using Redis
 */
async function checkRateLimit(
  redis: Redis,
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAfter: number }> {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Use pipeline for atomic operations
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zcard(key);
  pipeline.zadd(key, now.toString(), `${now}-${Math.random()}`);
  pipeline.expire(key, Math.ceil(config.windowMs / 1000));

  const results = await pipeline.exec();

  if (!results) {
    throw new Error('Redis pipeline execution failed');
  }

  const count = (results[1][1] as number) || 0;
  const allowed = count < config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - count - (allowed ? 1 : 0));

  // Calculate reset time
  let resetAfter = config.windowMs;
  if (count > 0) {
    const oldestEntries = await redis.zrange(key, 0, 0, 'WITHSCORES');
    if (oldestEntries && oldestEntries.length >= 2) {
      const oldestTimestamp = parseFloat(oldestEntries[1]);
      resetAfter = oldestTimestamp + config.windowMs - now;
    }
  }

  return {
    allowed,
    remaining,
    resetAfter: Math.max(0, resetAfter),
  };
}

/**
 * Rate limiting middleware factory
 */
export function createRateLimitMiddleware() {
  // Initialize Redis on first call
  let redisInitPromise: Promise<Redis | null> | null = null;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Skip rate limiting for health checks
      if (req.path === '/health' || req.path === '/ready') {
        return next();
      }

      // Initialize Redis if needed
      if (!redisInitPromise) {
        redisInitPromise = initRateLimitRedis();
      }
      const redis = await redisInitPromise;

      if (!redis) {
        // If Redis is not available, allow request but log warning
        logger.warn('Rate limiting disabled - Redis not available');
        return next();
      }

      // Get user info and subscription tier
      const userId = (req as any).user?.userId || (req as any).user?.sub;
      const tier = getSubscriptionTier(req);
      const clientIp = getClientIp(req);

      // Get rate limit config for this endpoint
      const method = req.method;
      const path = req.path.replace('/api/v1', '');
      const config = getRateLimitConfig(method, path, tier);

      // Check for unlimited (-1)
      if (config.maxRequests === -1) {
        res.setHeader('X-RateLimit-Limit', 'unlimited');
        res.setHeader('X-RateLimit-Remaining', 'unlimited');
        res.setHeader('X-RateLimit-Tier', tier);
        return next();
      }

      // Create rate limit key (user-based if authenticated, IP-based otherwise)
      const key = userId
        ? `ratelimit:messaging:user:${userId}:${method}:${path}`
        : `ratelimit:messaging:ip:${clientIp}:${method}:${path}`;

      // Check rate limit
      const result = await checkRateLimit(redis, key, config);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', (Date.now() + result.resetAfter).toString());
      res.setHeader('X-RateLimit-Tier', tier);

      if (!result.allowed) {
        const retryAfterSeconds = Math.ceil(result.resetAfter / 1000);

        logger.warn(`Rate limit exceeded for ${key} - ${tier} tier`);

        // Set Retry-After header (RFC 7231)
        res.setHeader('Retry-After', retryAfterSeconds.toString());

        res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          message: 'Message rate limit exceeded. Please slow down.',
          retryAfter: retryAfterSeconds,
          limit: config.maxRequests,
          windowMs: config.windowMs,
          tier,
          upgradeUrl: tier === SubscriptionTier.FREE ? '/subscription' : undefined,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limit middleware error:', error);
      // Fail open - don't block on rate limit errors
      next();
    }
  };
}

// Export pre-configured middleware
export const rateLimitMiddleware = createRateLimitMiddleware();

export default rateLimitMiddleware;
