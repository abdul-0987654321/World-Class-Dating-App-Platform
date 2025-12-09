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

  constructor(private readonly configService: ConfigService) {
    // Initialize Redis connection
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host') || 'localhost',
      port: this.configService.get<number>('redis.port') || 6379,
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.db') || 0,
    });

    this.limit = this.configService.get<number>('THROTTLE_LIMIT') || 100;
    this.ttl = this.configService.get<number>('THROTTLE_TTL') || 60000;

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
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
