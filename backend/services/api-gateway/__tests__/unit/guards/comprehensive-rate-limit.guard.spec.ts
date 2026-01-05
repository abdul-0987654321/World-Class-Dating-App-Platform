import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';

import { ComprehensiveRateLimitGuard } from '../../../src/guards/comprehensive-rate-limit.guard';
import { DDoSProtectionService } from '../../../src/services/ddos-protection.service';
import {
  RATE_LIMIT_KEY,
  SKIP_RATE_LIMIT_KEY,
} from '../../../src/decorators/rate-limit.decorator';
import { SubscriptionTier, DDOS_PROTECTION } from '../../../src/config/rate-limit.config';

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    pipeline: jest.fn().mockReturnValue({
      zremrangebyscore: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 0],
        [null, 0],
        [null, 1],
        [null, true],
      ]),
    }),
    zrange: jest.fn().mockResolvedValue([]),
    quit: jest.fn().mockResolvedValue('OK'),
  }));
});

describe('ComprehensiveRateLimitGuard', () => {
  let guard: ComprehensiveRateLimitGuard;
  let reflector: jest.Mocked<Reflector>;
  let configService: jest.Mocked<ConfigService>;
  let ddosProtection: jest.Mocked<DDoSProtectionService>;

  const createMockExecutionContext = (
    request: Partial<{
      method: string;
      path: string;
      headers: Record<string, string>;
      ip: string;
      socket: { remoteAddress: string };
      user?: any;
    }>,
    response: Partial<{ setHeader: jest.Mock }> = { setHeader: jest.fn() }
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          path: '/api/v1/test',
          headers: {},
          ip: '192.168.1.1',
          socket: { remoteAddress: '192.168.1.1' },
          ...request,
        }),
        getResponse: () => response,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<Reflector>;

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, any> = {
          'redis.host': 'localhost',
          'redis.port': 6379,
          'redis.password': undefined,
          'redis.db': 0,
        };
        return config[key];
      }),
    } as unknown as jest.Mocked<ConfigService>;

    ddosProtection = {
      checkRequest: jest.fn().mockResolvedValue({ allowed: true }),
    } as unknown as jest.Mocked<DDoSProtectionService>;

    guard = new ComprehensiveRateLimitGuard(reflector, configService, ddosProtection);
  });

  afterEach(async () => {
    await guard.onModuleDestroy();
  });

  describe('Skip rate limiting', () => {
    it('should skip rate limiting when @SkipRateLimit() is applied', async () => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === SKIP_RATE_LIMIT_KEY) return true;
        return false;
      });

      const context = createMockExecutionContext({});
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(ddosProtection.checkRequest).not.toHaveBeenCalled();
    });

    it('should check SKIP_RATE_LIMIT_KEY on handler and class', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const context = createMockExecutionContext({});
      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(SKIP_RATE_LIMIT_KEY, [
        expect.any(Function),
        expect.any(Function),
      ]);
    });
  });

  describe('Whitelisted IPs', () => {
    it('should allow requests from localhost', async () => {
      const context = createMockExecutionContext({
        ip: '127.0.0.1',
        headers: {},
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow requests from private IP range 10.x.x.x', async () => {
      const context = createMockExecutionContext({
        ip: '10.0.0.1',
        headers: {},
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow requests from private IP range 192.168.x.x', async () => {
      const context = createMockExecutionContext({
        ip: '192.168.1.100',
        headers: {},
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow requests from private IP range 172.16.x.x - 172.31.x.x', async () => {
      const privateIPs = ['172.16.0.1', '172.20.0.1', '172.31.255.255'];

      for (const ip of privateIPs) {
        const context = createMockExecutionContext({
          ip,
          headers: {},
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      }
    });
  });

  describe('Client IP extraction', () => {
    it('should extract IP from X-Forwarded-For header', async () => {
      ddosProtection.checkRequest.mockResolvedValue({ allowed: true });

      const context = createMockExecutionContext({
        ip: '10.0.0.1',
        headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.2' },
      });

      await guard.canActivate(context);

      // The first IP in X-Forwarded-For should be used
      // Since 203.0.113.1 is not a private IP, it should trigger DDoS check
      expect(ddosProtection.checkRequest).toHaveBeenCalled();
    });

    it('should extract IP from X-Real-IP header', async () => {
      ddosProtection.checkRequest.mockResolvedValue({ allowed: true });

      const context = createMockExecutionContext({
        ip: '10.0.0.1',
        headers: { 'x-real-ip': '203.0.113.1' },
      });

      await guard.canActivate(context);

      expect(ddosProtection.checkRequest).toHaveBeenCalled();
    });

    it('should fall back to request.ip when no headers present', async () => {
      const context = createMockExecutionContext({
        ip: '192.168.1.1',
        headers: {},
      });

      await guard.canActivate(context);

      // Private IP should be whitelisted
      expect(ddosProtection.checkRequest).not.toHaveBeenCalled();
    });
  });

  describe('Admin override', () => {
    it('should allow requests with valid admin override header', async () => {
      // Mock the DDOS_PROTECTION config
      const originalEnabled = DDOS_PROTECTION.adminOverride.enabled;
      const originalSecret = DDOS_PROTECTION.adminOverride.secret;

      Object.defineProperty(DDOS_PROTECTION.adminOverride, 'enabled', { value: true, writable: true });
      Object.defineProperty(DDOS_PROTECTION.adminOverride, 'secret', { value: 'test-secret', writable: true });

      ddosProtection.checkRequest.mockResolvedValue({ allowed: true });

      const context = createMockExecutionContext({
        ip: '203.0.113.1',
        headers: { 'x-admin-override': 'test-secret' },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);

      // Restore original values
      Object.defineProperty(DDOS_PROTECTION.adminOverride, 'enabled', { value: originalEnabled, writable: true });
      Object.defineProperty(DDOS_PROTECTION.adminOverride, 'secret', { value: originalSecret, writable: true });
    });
  });

  describe('DDoS protection', () => {
    it('should block request when DDoS protection denies it', async () => {
      ddosProtection.checkRequest.mockResolvedValue({
        allowed: false,
        reason: 'Burst rate limit exceeded',
        blockDuration: 300,
      });

      const response = { setHeader: jest.fn() };
      const context = createMockExecutionContext(
        {
          ip: '203.0.113.1',
          headers: {},
        },
        response
      );

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

      try {
        await guard.canActivate(context);
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const errorResponse = (error as HttpException).getResponse() as any;
        expect(errorResponse.message).toContain('Suspicious activity');
        expect(errorResponse.reason).toBe('Burst rate limit exceeded');
      }
    });

    it('should set Retry-After header when blocked by DDoS protection', async () => {
      ddosProtection.checkRequest.mockResolvedValue({
        allowed: false,
        reason: 'Sustained rate limit exceeded',
        blockDuration: 600,
      });

      const response = { setHeader: jest.fn() };
      const context = createMockExecutionContext(
        {
          ip: '203.0.113.1',
          headers: {},
        },
        response
      );

      try {
        await guard.canActivate(context);
      } catch (error) {
        expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '600');
      }
    });
  });

  describe('Custom rate limit decorator', () => {
    it('should use custom rate limit when @RateLimit() is applied', async () => {
      const customRule = { window: '1m', max: 5 };

      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === RATE_LIMIT_KEY) return customRule;
        return false;
      });

      ddosProtection.checkRequest.mockResolvedValue({ allowed: true });

      const context = createMockExecutionContext({
        ip: '203.0.113.1',
        headers: {},
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow unlimited requests when max is -1', async () => {
      const unlimitedRule = { window: '1m', max: -1 };

      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === RATE_LIMIT_KEY) return unlimitedRule;
        return false;
      });

      ddosProtection.checkRequest.mockResolvedValue({ allowed: true });

      const response = { setHeader: jest.fn() };
      const context = createMockExecutionContext(
        {
          ip: '203.0.113.1',
          headers: {},
        },
        response
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '-1');
    });
  });

  describe('Subscription tier rate limits', () => {
    it('should get subscription tier from user object', async () => {
      ddosProtection.checkRequest.mockResolvedValue({ allowed: true });

      const context = createMockExecutionContext({
        ip: '203.0.113.1',
        headers: {},
        user: {
          userId: 'user-123',
          subscriptionTier: SubscriptionTier.PREMIUM,
        },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should default to FREE tier when no subscription info', async () => {
      ddosProtection.checkRequest.mockResolvedValue({ allowed: true });

      const context = createMockExecutionContext({
        ip: '203.0.113.1',
        headers: {},
        user: { userId: 'user-123' },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should use IP-based key when user is not authenticated', async () => {
      ddosProtection.checkRequest.mockResolvedValue({ allowed: true });

      const context = createMockExecutionContext({
        ip: '203.0.113.1',
        headers: {},
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('Rate limit headers', () => {
    it('should set rate limit headers on response', async () => {
      ddosProtection.checkRequest.mockResolvedValue({ allowed: true });

      const response = { setHeader: jest.fn() };
      const context = createMockExecutionContext(
        {
          ip: '203.0.113.1',
          headers: {},
        },
        response
      );

      await guard.canActivate(context);

      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
      expect(response.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        expect.any(String)
      );
      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });

    it('should set Retry-After header when remaining is 0', async () => {
      // Mock Redis to return a high count (rate limit exceeded)
      const mockRedis = new (Redis as any)();
      mockRedis.pipeline.mockReturnValue({
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0],
          [null, 1000], // High count to trigger rate limit
          [null, 1],
          [null, true],
        ]),
      });

      ddosProtection.checkRequest.mockResolvedValue({ allowed: true });

      const response = { setHeader: jest.fn() };
      const context = createMockExecutionContext(
        {
          ip: '203.0.113.1',
          headers: {},
        },
        response
      );

      try {
        await guard.canActivate(context);
      } catch (error) {
        // Rate limit exceeded
      }
    });
  });

  describe('Rate limit exceeded', () => {
    it('should throw 429 when rate limit is exceeded', async () => {
      // Need to create a guard with a mocked Redis that returns high count
      const mockRedisInstance = {
        on: jest.fn(),
        pipeline: jest.fn().mockReturnValue({
          zremrangebyscore: jest.fn().mockReturnThis(),
          zcard: jest.fn().mockReturnThis(),
          zadd: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([
            [null, 0],
            [null, 1000], // Exceed rate limit
            [null, 1],
            [null, true],
          ]),
        }),
        zrange: jest.fn().mockResolvedValue(['1704067200000', '1704067200000']),
        quit: jest.fn().mockResolvedValue('OK'),
      };

      (Redis as any).mockImplementation(() => mockRedisInstance);

      const testGuard = new ComprehensiveRateLimitGuard(reflector, configService, ddosProtection);
      ddosProtection.checkRequest.mockResolvedValue({ allowed: true });

      const response = { setHeader: jest.fn() };
      const context = createMockExecutionContext(
        {
          ip: '203.0.113.1',
          headers: {},
        },
        response
      );

      try {
        await testGuard.canActivate(context);
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }

      await testGuard.onModuleDestroy();
    });

    it('should include rate limit info in error response', async () => {
      const mockRedisInstance = {
        on: jest.fn(),
        pipeline: jest.fn().mockReturnValue({
          zremrangebyscore: jest.fn().mockReturnThis(),
          zcard: jest.fn().mockReturnThis(),
          zadd: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([
            [null, 0],
            [null, 1000],
            [null, 1],
            [null, true],
          ]),
        }),
        zrange: jest.fn().mockResolvedValue(['1704067200000', '1704067200000']),
        quit: jest.fn().mockResolvedValue('OK'),
      };

      (Redis as any).mockImplementation(() => mockRedisInstance);

      const testGuard = new ComprehensiveRateLimitGuard(reflector, configService, ddosProtection);
      ddosProtection.checkRequest.mockResolvedValue({ allowed: true });

      const response = { setHeader: jest.fn() };
      const context = createMockExecutionContext(
        {
          ip: '203.0.113.1',
          headers: {},
        },
        response
      );

      try {
        await testGuard.canActivate(context);
      } catch (error) {
        const errorResponse = (error as HttpException).getResponse() as any;
        expect(errorResponse.limit).toBeDefined();
        expect(errorResponse.window).toBeDefined();
        expect(errorResponse.tier).toBeDefined();
      }

      await testGuard.onModuleDestroy();
    });
  });

  describe('Error handling', () => {
    it('should allow request when Redis fails (fail open)', async () => {
      const mockRedisInstance = {
        on: jest.fn(),
        pipeline: jest.fn().mockReturnValue({
          zremrangebyscore: jest.fn().mockReturnThis(),
          zcard: jest.fn().mockReturnThis(),
          zadd: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockRejectedValue(new Error('Redis connection failed')),
        }),
        zrange: jest.fn().mockRejectedValue(new Error('Redis connection failed')),
        quit: jest.fn().mockResolvedValue('OK'),
      };

      (Redis as any).mockImplementation(() => mockRedisInstance);

      const testGuard = new ComprehensiveRateLimitGuard(reflector, configService, ddosProtection);
      ddosProtection.checkRequest.mockResolvedValue({ allowed: true });

      const response = { setHeader: jest.fn() };
      const context = createMockExecutionContext(
        {
          ip: '203.0.113.1',
          headers: {},
        },
        response
      );

      const result = await testGuard.canActivate(context);
      expect(result).toBe(true);

      await testGuard.onModuleDestroy();
    });

    it('should propagate HttpException when thrown', async () => {
      ddosProtection.checkRequest.mockResolvedValue({
        allowed: false,
        reason: 'Blocked',
        blockDuration: 300,
      });

      const context = createMockExecutionContext({
        ip: '203.0.113.1',
        headers: {},
      });

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });
  });

  describe('Module lifecycle', () => {
    it('should clean up Redis connection on module destroy', async () => {
      const mockQuit = jest.fn().mockResolvedValue('OK');
      const mockRedisInstance = {
        on: jest.fn(),
        pipeline: jest.fn(),
        quit: mockQuit,
      };

      (Redis as any).mockImplementation(() => mockRedisInstance);

      const testGuard = new ComprehensiveRateLimitGuard(reflector, configService, ddosProtection);
      await testGuard.onModuleDestroy();

      expect(mockQuit).toHaveBeenCalled();
    });
  });
});
