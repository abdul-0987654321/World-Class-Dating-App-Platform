import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import Redis from 'ioredis';
import {
  getRateLimitRule,
  parseTimeWindow,
  getRateLimitMessage,
  SubscriptionTier,
  isWhitelisted,
  DDOS_PROTECTION,
  RateLimitRule,
} from '../config/rate-limit.config';
import {
  RATE_LIMIT_KEY,
  SKIP_RATE_LIMIT_KEY,
} from '../decorators/rate-limit.decorator';
import { DDoSProtectionService } from '../services/ddos-protection.service';

/**
 * Comprehensive Rate Limit Guard
 * Combines rate limiting with DDoS protection and subscription tier support
 */
@Injectable()
export class ComprehensiveRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(ComprehensiveRateLimitGuard.name);
  private readonly redis: Redis;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly ddosProtection: DDoSProtectionService,
  ) {
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
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis for rate limit guard');
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Check if endpoint should skip rate limiting
      const skipRateLimit = this.reflector.getAllAndOverride<boolean>(
        SKIP_RATE_LIMIT_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (skipRateLimit) {
        return true;
      }

      const request = context.switchToHttp().getRequest<Request>();
      const response = context.switchToHttp().getResponse<Response>();

      const clientIp = this.getClientIp(request);

      // Check if IP is whitelisted
      if (isWhitelisted(clientIp)) {
        this.logger.debug(`Whitelisted IP: ${clientIp}`);
        return true;
      }

      // Check for admin override
      if (this.checkAdminOverride(request)) {
        this.logger.debug('Admin override detected');
        return true;
      }

      // First, check DDoS protection
      const ddosCheck = await this.ddosProtection.checkRequest(
        request,
        clientIp,
      );

      if (!ddosCheck.allowed) {
        this.logger.warn(
          `DDoS protection blocked request from ${clientIp}: ${ddosCheck.reason}`,
        );

        if (ddosCheck.blockDuration) {
          response.setHeader('Retry-After', ddosCheck.blockDuration.toString());
        }

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Suspicious activity detected. Your IP has been temporarily blocked.',
            error: 'Too Many Requests',
            reason: ddosCheck.reason,
            retryAfter: ddosCheck.blockDuration,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Extract user information
      const userId = (request as any).user?.userId || (request as any).user?.sub;
      const subscriptionTier = this.getSubscriptionTier(request);

      // Get custom rate limit from decorator or use endpoint-based config
      const customRateLimit = this.reflector.getAllAndOverride<RateLimitRule>(
        RATE_LIMIT_KEY,
        [context.getHandler(), context.getClass()],
      );

      let rule: RateLimitRule;

      if (customRateLimit) {
        // Use custom rate limit from decorator
        rule = customRateLimit;
      } else {
        // Use endpoint-based rate limit
        const method = request.method;
        const path = request.path.replace('/api/v1', ''); // Remove API prefix
        rule = getRateLimitRule(method, path, subscriptionTier);
      }

      // Check if unlimited
      if (rule.max === -1) {
        this.setRateLimitHeaders(response, -1, -1, 0);
        return true;
      }

      // Create primary key
      const endpoint = `${request.method}:${request.path}`;
      const primaryKey = userId
        ? `ratelimit:user:${userId}:${endpoint}`
        : `ratelimit:ip:${clientIp}:${endpoint}`;

      // Check rate limit using sliding window
      const windowSeconds = parseTimeWindow(rule.window);
      const result = await this.checkSlidingWindow(
        primaryKey,
        rule.max,
        windowSeconds,
      );

      if (!result.allowed) {
        const resetTime = Math.ceil(result.resetAfter / 1000);

        this.logger.warn(
          `Rate limit exceeded for ${primaryKey} - ${subscriptionTier} tier`,
        );

        // Set rate limit headers
        this.setRateLimitHeaders(response, rule.max, 0, resetTime);

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: getRateLimitMessage(endpoint),
            error: 'Too Many Requests',
            retryAfter: resetTime,
            limit: rule.max,
            window: rule.window,
            tier: subscriptionTier,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Set rate limit headers
      this.setRateLimitHeaders(
        response,
        rule.max,
        result.remaining,
        Math.ceil(result.resetAfter / 1000),
      );

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // If Redis is down or other error, log but allow request
      this.logger.error('Rate limit guard error:', error);
      return true;
    }
  }

  /**
   * Sliding window algorithm using Redis sorted sets
   */
  private async checkSlidingWindow(
    key: string,
    limit: number,
    windowSeconds: number,
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

    // Calculate reset time
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
    resetAfter: number,
  ): void {
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader(
      'X-RateLimit-Reset',
      (Date.now() + resetAfter * 1000).toString(),
    );

    if (remaining === 0) {
      res.setHeader('Retry-After', resetAfter.toString());
    }
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

    return (
      overrideSecret &&
      overrideHeader &&
      overrideHeader === overrideSecret
    );
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
    this.logger.log('Rate limit guard stopped');
  }
}
