import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(RedisThrottlerGuard.name);
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    super();

    // Initialize Redis connection
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.db'),
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
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
    try {
      const current = await this.redis.incr(tracker);

      if (current === 1) {
        // First request, set expiration
        await this.redis.expire(tracker, Math.ceil(ttl / 1000));
      }

      return current;
    } catch (error) {
      this.logger.error('Redis storage error:', error);
      // Return 0 to allow request if Redis is down
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
      const current = await this.storageIncrement(tracker, ttl);
      const remaining = Math.max(0, limit - current);
      const resetTime = await this.redis.ttl(tracker);

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

      // If Redis error, allow the request
      this.logger.error('Throttler error:', error);
      return true;
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
