import { Injectable, ExecutionContext, Logger, CanActivate } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(RedisThrottlerGuard.name);
  private readonly redis: Redis;
  private readonly limit: number;
  private readonly ttl: number;
  private redisHealthy = false;
  private redisFailureCount = 0;
  private readonly redisFailureThreshold = 3;

  constructor(private readonly configService: ConfigService) {
    // Initialize Redis connection with production-ready settings
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host') || 'localhost',
      port: this.configService.get<number>('redis.port') || 6379,
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.db') || 0,
      tls: (this.configService.get<number>('redis.port') || 6379) === 6380
        ? { servername: this.configService.get<string>('redis.host') }
        : undefined,

      // Connection resilience settings
      maxRetriesPerRequest: 1, // Don't block requests waiting for Redis
      enableOfflineQueue: false, // Don't queue commands when disconnected
      connectTimeout: 5000, // 5 second connection timeout
      commandTimeout: 2000, // 2 second command timeout
      enableReadyCheck: true,
      lazyConnect: false,

      // Retry strategy with exponential backoff
      retryStrategy: (times) => {
        if (times > 10) {
          this.logger.error('Redis connection failed after 10 retries, failing open');
          this.redisHealthy = false;
          return null; // Stop retrying
        }
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    });

    this.limit = this.configService.get<number>('THROTTLE_LIMIT') || 100;
    this.ttl = this.configService.get<number>('THROTTLE_TTL') || 60000;

    // Enhanced error handling
    this.redis.on('error', (error) => {
      this.redisFailureCount++;
      if (this.redisFailureCount >= this.redisFailureThreshold) {
        this.redisHealthy = false;
      }
      this.logger.error(`Redis error (failures: ${this.redisFailureCount}):`, error);
    });

    this.redis.on('connect', () => {
      this.redisHealthy = true;
      this.redisFailureCount = 0;
      this.logger.log('Connected to Redis for throttler guard');
    });

    this.redis.on('ready', () => {
      this.redisHealthy = true;
      this.redisFailureCount = 0;
      this.logger.log('Redis ready for throttler operations');
    });

    this.redis.on('close', () => {
      this.redisHealthy = false;
      this.logger.warn('Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      this.logger.log('Reconnecting to Redis...');
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    return this.handleRequest(context, this.limit, this.ttl);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use user ID if authenticated, otherwise use IP
    const userId = req.user?.userId || req.user?.sub;

    if (userId) {
      return `throttle:user:${userId}`;
    }

    // Get IP address
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded
      ? (forwarded as string).split(',')[0].trim()
      : req.ip || req.socket.remoteAddress;

    return `throttle:ip:${ip}`;
  }

  protected async storageIncrement(
    tracker: string,
    ttl: number,
  ): Promise<number> {
    // FAIL OPEN: If Redis is unhealthy, allow all requests
    if (!this.redisHealthy) {
      this.logger.warn('Redis unhealthy, allowing request (fail-open)');
      return 0;
    }

    try {
      const current = await this.redis.incr(tracker);

      if (current === 1) {
        // First request, set expiration
        await this.redis.expire(tracker, Math.ceil(ttl / 1000));
      }

      return current;
    } catch (error) {
      this.logger.error('Redis storage error (failing open):', error);
      this.redisFailureCount++;
      if (this.redisFailureCount >= this.redisFailureThreshold) {
        this.redisHealthy = false;
      }
      // FAIL OPEN: Return 0 to allow request if Redis is down
      return 0;
    }
  }

  async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const tracker = await this.getTracker(request);

    try {
      // FAIL OPEN: If Redis is unhealthy, allow request
      if (!this.redisHealthy) {
        this.logger.warn('Redis unavailable, allowing request (fail-open)');
        response.setHeader('X-RateLimit-Limit', limit);
        response.setHeader('X-RateLimit-Remaining', limit);
        response.setHeader('X-RateLimit-Reset', Date.now() + ttl);
        return true;
      }

      const current = await this.storageIncrement(tracker, ttl);
      const remaining = Math.max(0, limit - current);

      // Get TTL safely
      let resetTime = Math.ceil(ttl / 1000);
      try {
        const ttlResult = await this.redis.ttl(tracker);
        if (ttlResult > 0) {
          resetTime = ttlResult;
        }
      } catch (error) {
        // If TTL fails, use default TTL
        this.logger.warn('Failed to get TTL, using default');
      }

      // Set rate limit headers
      response.setHeader('X-RateLimit-Limit', limit);
      response.setHeader('X-RateLimit-Remaining', remaining);
      response.setHeader('X-RateLimit-Reset', Date.now() + resetTime * 1000);

      if (current > limit) {
        response.setHeader('Retry-After', resetTime);
        throw new ThrottlerException();
      }

      return true;
    } catch (error) {
      if (error instanceof ThrottlerException) {
        throw error;
      }

      // FAIL OPEN: If any error occurs (Redis down, network issue, etc.), allow the request
      this.logger.error('Throttler error (failing open):', error);
      this.redisFailureCount++;
      if (this.redisFailureCount >= this.redisFailureThreshold) {
        this.redisHealthy = false;
      }
      return true;
    }
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
      this.logger.log('Redis connection closed gracefully');
    } catch (error) {
      this.logger.warn('Error closing Redis connection:', error);
    }
  }

  /**
   * Get Redis health status
   */
  getHealthStatus(): { healthy: boolean; failureCount: number } {
    return {
      healthy: this.redisHealthy,
      failureCount: this.redisFailureCount,
    };
  }
}
