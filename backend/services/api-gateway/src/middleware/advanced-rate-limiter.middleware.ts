import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

import {
  getRateLimitRule,
  parseTimeWindow,
  getRateLimitMessage,
  SubscriptionTier,
  isWhitelisted,
  DDOS_PROTECTION,
} from '../config/rate-limit.config';

/**
 * Advanced Rate Limiter Middleware
 * Implements sliding window algorithm for accurate rate limiting
 */
@Injectable()
export class AdvancedRateLimiterMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AdvancedRateLimiterMiddleware.name);
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    // Initialize Redis connection
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.db') || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis for advanced rate limiting');
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis client ready for rate limiting operations');
    });
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp = this.getClientIp(req);

      // Check if IP is whitelisted
      if (isWhitelisted(clientIp)) {
        this.logger.debug(`Whitelisted IP: ${clientIp}`);
        return next();
      }

      // Check for admin override
      if (this.checkAdminOverride(req)) {
        this.logger.debug('Admin override detected');
        return next();
      }

      // Extract user information
      const userId = (req as any).user?.userId || (req as any).user?.sub;
      const subscriptionTier = this.getSubscriptionTier(req);

      // Get rate limit rule for this endpoint
      const method = req.method;
      const path = req.path.replace('/api/v1', ''); // Remove API prefix
      const rule = getRateLimitRule(method, path, subscriptionTier);

      // Check if unlimited
      if (rule.max === -1) {
        this.setRateLimitHeaders(res, -1, -1, 0);
        return next();
      }

      // Create primary key (user-based if authenticated, IP-based otherwise)
      const primaryKey = userId
        ? `ratelimit:user:${userId}:${method}:${path}`
        : `ratelimit:ip:${clientIp}:${method}:${path}`;

      // Check rate limit using sliding window
      const windowSeconds = parseTimeWindow(rule.window);
      const result = await this.checkSlidingWindow(primaryKey, rule.max, windowSeconds);

      if (!result.allowed) {
        const resetTime = Math.ceil(result.resetAfter / 1000);

        this.logger.warn(`Rate limit exceeded for ${primaryKey} - ${method} ${path}`);

        // Set rate limit headers
        this.setRateLimitHeaders(res, rule.max, 0, resetTime);

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: getRateLimitMessage(`${method} ${path}`),
            error: 'Too Many Requests',
            retryAfter: resetTime,
            limit: rule.max,
            window: rule.window,
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // Set rate limit headers
      this.setRateLimitHeaders(
        res,
        rule.max,
        result.remaining,
        Math.ceil(result.resetAfter / 1000)
      );

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // If Redis is down, log error but don't block requests
      this.logger.error('Rate limiter error:', error);
      next();
    }
  }

  /**
   * Sliding window algorithm using Redis sorted sets
   * More accurate than fixed window, prevents burst at window boundaries
   */
  private async checkSlidingWindow(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAfter: number;
  }> {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count current requests in window
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiration
    pipeline.expire(key, windowSeconds);

    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline execution failed');
    }

    // Get count (before adding current request)
    const count = (results[1][1] as number) || 0;
    const allowed = count < limit;
    const remaining = Math.max(0, limit - count - (allowed ? 1 : 0));

    // Calculate reset time (time until oldest request expires)
    let resetAfter = windowSeconds * 1000;

    if (count > 0) {
      const oldestEntries = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      if (oldestEntries && oldestEntries.length >= 2) {
        const oldestTimestamp = parseFloat(oldestEntries[1]);
        resetAfter = oldestTimestamp + windowSeconds * 1000 - now;
      }
    }

    return {
      allowed,
      remaining,
      resetAfter: Math.max(0, resetAfter),
    };
  }

  /**
   * Set rate limit response headers
   */
  private setRateLimitHeaders(
    res: Response,
    limit: number,
    remaining: number,
    resetAfter: number
  ): void {
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', (Date.now() + resetAfter * 1000).toString());

    if (remaining === 0) {
      res.setHeader('Retry-After', resetAfter.toString());
    }
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(req: Request): string {
    // Check X-Forwarded-For header (for proxies/load balancers)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (forwarded as string).split(',');
      return ips[0].trim();
    }

    // Check X-Real-IP header
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }

    // Fallback to connection remote address
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Get subscription tier from request
   */
  private getSubscriptionTier(req: Request): SubscriptionTier {
    const user = (req as any).user;

    if (!user) {
      return SubscriptionTier.FREE;
    }

    // Check for subscription tier in user object
    const tier = user.subscriptionTier || user.subscription?.tier;

    // Validate and return tier
    if (tier && Object.values(SubscriptionTier).includes(tier)) {
      return tier as SubscriptionTier;
    }

    return SubscriptionTier.FREE;
  }

  /**
   * Check for admin override header
   */
  private checkAdminOverride(req: Request): boolean {
    if (!DDOS_PROTECTION.adminOverride.enabled) {
      return false;
    }

    const overrideHeader = req.headers['x-admin-override'];
    const overrideSecret = DDOS_PROTECTION.adminOverride.secret;

    return overrideSecret && overrideHeader && overrideHeader === overrideSecret;
  }

  /**
   * Reset rate limit for a specific key (admin function)
   */
  async resetRateLimit(
    identifier: string,
    type: 'user' | 'ip',
    method?: string,
    path?: string
  ): Promise<void> {
    let pattern: string;

    if (method && path) {
      pattern = `ratelimit:${type}:${identifier}:${method}:${path}`;
    } else {
      pattern = `ratelimit:${type}:${identifier}:*`;
    }

    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.log(`Reset ${keys.length} rate limit key(s) for ${type}:${identifier}`);
    }
  }

  /**
   * Get rate limit info for a specific identifier
   */
  async getRateLimitInfo(
    identifier: string,
    type: 'user' | 'ip',
    method: string,
    path: string
  ): Promise<{
    limit: number;
    remaining: number;
    reset: number;
    current: number;
  }> {
    const key = `ratelimit:${type}:${identifier}:${method}:${path}`;
    const tier = type === 'user' ? SubscriptionTier.FREE : SubscriptionTier.FREE;
    const rule = getRateLimitRule(method, path, tier);
    const windowSeconds = parseTimeWindow(rule.window);
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Count requests in current window
    const count = await this.redis.zcount(key, windowStart, now);
    const remaining = Math.max(0, rule.max - count);

    // Get oldest entry for reset calculation
    let resetTime = now + windowSeconds * 1000;
    const oldestEntries = await this.redis.zrange(key, 0, 0, 'WITHSCORES');

    if (oldestEntries && oldestEntries.length >= 2) {
      const oldestTimestamp = parseFloat(oldestEntries[1]);
      resetTime = oldestTimestamp + windowSeconds * 1000;
    }

    return {
      limit: rule.max,
      remaining,
      reset: resetTime,
      current: count,
    };
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
    this.logger.log('Redis connection closed');
  }
}
