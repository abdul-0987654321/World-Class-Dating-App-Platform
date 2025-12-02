import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

export interface RateLimitConfig {
  points: number; // Number of requests
  duration: number; // Per duration in seconds
  blockDuration?: number; // Block duration in seconds (optional)
}

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimiterMiddleware.name);
  private readonly redis: Redis;
  private readonly defaultConfig: RateLimitConfig;

  constructor(private readonly configService: ConfigService) {
    // Initialize Redis connection
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.db'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    // Default rate limit configuration
    this.defaultConfig = {
      points: this.configService.get<number>('throttle.limit') || 100,
      duration: (this.configService.get<number>('throttle.ttl') || 60000) / 1000,
      blockDuration: 300, // 5 minutes
    };

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis for rate limiting');
    });
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract user ID from JWT token if available
      const userId = (req as any).user?.userId || (req as any).user?.sub;

      // Get client IP address
      const clientIp = this.getClientIp(req);

      // Create keys for both user and IP-based rate limiting
      const keys: string[] = [];

      if (userId) {
        keys.push(`ratelimit:user:${userId}`);
      }

      // Always track by IP
      keys.push(`ratelimit:ip:${clientIp}`);

      // Check rate limits for all keys
      for (const key of keys) {
        const allowed = await this.checkRateLimit(key, this.defaultConfig);

        if (!allowed) {
          const ttl = await this.redis.ttl(key);

          this.logger.warn(`Rate limit exceeded for ${key}`);

          res.setHeader('X-RateLimit-Limit', this.defaultConfig.points.toString());
          res.setHeader('X-RateLimit-Remaining', '0');
          res.setHeader('X-RateLimit-Reset', (Date.now() + ttl * 1000).toString());
          res.setHeader('Retry-After', ttl.toString());

          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: 'Too many requests. Please try again later.',
              retryAfter: ttl,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      // Get remaining requests for the primary key (user if authenticated, otherwise IP)
      const primaryKey = userId ? `ratelimit:user:${userId}` : `ratelimit:ip:${clientIp}`;
      const remaining = await this.getRemaining(primaryKey, this.defaultConfig.points);
      const ttl = await this.redis.ttl(primaryKey);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.defaultConfig.points.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', (Date.now() + ttl * 1000).toString());

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
   * Check if request is allowed under rate limit
   */
  private async checkRateLimit(key: string, config: RateLimitConfig): Promise<boolean> {
    const current = await this.redis.incr(key);

    if (current === 1) {
      // First request, set expiration
      await this.redis.expire(key, config.duration);
    }

    return current <= config.points;
  }

  /**
   * Get remaining requests
   */
  private async getRemaining(key: string, limit: number): Promise<number> {
    const current = await this.redis.get(key);
    const used = current ? parseInt(current, 10) : 0;
    return Math.max(0, limit - used);
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
   * Reset rate limit for a specific key (admin function)
   */
  async resetRateLimit(identifier: string, type: 'user' | 'ip'): Promise<void> {
    const key = `ratelimit:${type}:${identifier}`;
    await this.redis.del(key);
    this.logger.log(`Rate limit reset for ${key}`);
  }

  /**
   * Get rate limit info
   */
  async getRateLimitInfo(identifier: string, type: 'user' | 'ip'): Promise<{
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const key = `ratelimit:${type}:${identifier}`;
    const current = await this.redis.get(key);
    const used = current ? parseInt(current, 10) : 0;
    const ttl = await this.redis.ttl(key);

    return {
      limit: this.defaultConfig.points,
      remaining: Math.max(0, this.defaultConfig.points - used),
      reset: ttl > 0 ? Date.now() + ttl * 1000 : 0,
    };
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    await this.redis.quit();
  }
}
