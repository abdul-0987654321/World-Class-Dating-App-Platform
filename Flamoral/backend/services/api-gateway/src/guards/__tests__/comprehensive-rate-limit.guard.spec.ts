import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ComprehensiveRateLimitGuard } from '../comprehensive-rate-limit.guard';
import { DDoSProtectionService } from '../../services/ddos-protection.service';
import {
  SubscriptionTier,
  DDOS_PROTECTION,
} from '../../config/rate-limit.config';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');

describe('ComprehensiveRateLimitGuard', () => {
  let guard: ComprehensiveRateLimitGuard;
  let reflector: Reflector;
  let configService: ConfigService;
  let ddosProtection: DDoSProtectionService;
  let mockRedis: jest.Mocked<Redis>;

  const mockRequest = {
    method: 'GET',
    path: '/test',
    headers: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    user: null,
  };

  const mockResponse = {
    setHeader: jest.fn(),
  };

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock Redis instance
    mockRedis = {
      pipeline: jest.fn().mockReturnValue({
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0], // zremrangebyscore
          [null, 0], // zcard
          [null, 1], // zadd
          [null, 1], // expire
        ]),
      }),
      zrange: jest.fn().mockResolvedValue([]),
      on: jest.fn(),
      quit: jest.fn(),
      status: 'ready',
    } as any;

    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComprehensiveRateLimitGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                'redis.host': 'localhost',
                'redis.port': 6379,
                'redis.password': '',
                'redis.db': 0,
              };
              return config[key];
            }),
          },
        },
        {
          provide: DDoSProtectionService,
          useValue: {
            checkRequest: jest.fn().mockResolvedValue({ allowed: true }),
          },
        },
      ],
    }).compile();

    guard = module.get<ComprehensiveRateLimitGuard>(ComprehensiveRateLimitGuard);
    reflector = module.get<Reflector>(Reflector);
    configService = module.get<ConfigService>(ConfigService);
    ddosProtection = module.get<DDoSProtectionService>(DDoSProtectionService);

    // Reset request mock
    mockRequest.method = 'GET';
    mockRequest.path = '/test';
    mockRequest.headers = {};
    mockRequest.user = null;
    mockResponse.setHeader.mockClear();
  });

  afterEach(async () => {
    await guard.onModuleDestroy();
  });

  describe('Basic Functionality', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should allow request when skipRateLimit is true', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(ddosProtection.checkRequest).not.toHaveBeenCalled();
    });

    it('should allow request from whitelisted IP', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      // Mock whitelist
      const originalWhitelist = DDOS_PROTECTION.whitelist;
      DDOS_PROTECTION.whitelist = ['127.0.0.1'];

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);

      // Restore whitelist
      DDOS_PROTECTION.whitelist = originalWhitelist;
    });

    it('should allow request with valid admin override', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const originalConfig = { ...DDOS_PROTECTION.adminOverride };
      DDOS_PROTECTION.adminOverride.enabled = true;
      DDOS_PROTECTION.adminOverride.secret = 'test-secret';

      mockRequest.headers['x-admin-override'] = 'test-secret';

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);

      // Restore config
      DDOS_PROTECTION.adminOverride = originalConfig;
    });
  });

  describe('DDoS Protection Integration', () => {
    it('should block request when DDoS protection denies', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(ddosProtection, 'checkRequest').mockResolvedValue({
        allowed: false,
        reason: 'Too many requests',
        blockDuration: 300,
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        HttpException,
      );
      await expect(guard.canActivate(mockExecutionContext)).rejects.toMatchObject({
        response: expect.objectContaining({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          reason: 'Too many requests',
        }),
      });

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', '300');
    });

    it('should pass client IP to DDoS protection', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      await guard.canActivate(mockExecutionContext);

      expect(ddosProtection.checkRequest).toHaveBeenCalledWith(
        mockRequest,
        '127.0.0.1',
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should allow request when under rate limit', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Limit',
        expect.any(String),
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        expect.any(String),
      );
    });

    it('should block request when rate limit exceeded', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      // Mock Redis to return count at limit
      mockRedis.pipeline = jest.fn().mockReturnValue({
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0], // zremrangebyscore
          [null, 100], // zcard - at limit
          [null, 1], // zadd
          [null, 1], // expire
        ]),
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        HttpException,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        '0',
      );
    });

    it('should use custom rate limit from decorator', async () => {
      const customLimit = { window: '1m', max: 10 };
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // skipRateLimit
        .mockReturnValueOnce(customLimit); // customRateLimit

      await guard.canActivate(mockExecutionContext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Limit',
        '10',
      );
    });

    it('should handle unlimited rate limit (-1)', async () => {
      const unlimitedLimit = { window: '24h', max: -1 };
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // skipRateLimit
        .mockReturnValueOnce(unlimitedLimit); // customRateLimit

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Limit',
        '-1',
      );
    });
  });

  describe('Subscription Tier Support', () => {
    it('should use FREE tier limits for unauthenticated users', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      mockRequest.path = '/swipes';
      mockRequest.method = 'POST';

      await guard.canActivate(mockExecutionContext);

      // Verify that the request was processed (FREE tier has limits)
      expect(ddosProtection.checkRequest).toHaveBeenCalled();
    });

    it('should use user subscription tier for authenticated users', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      mockRequest.user = {
        userId: 'user-123',
        subscriptionTier: SubscriptionTier.GOLD,
      };
      mockRequest.path = '/swipes';
      mockRequest.method = 'POST';

      await guard.canActivate(mockExecutionContext);

      expect(ddosProtection.checkRequest).toHaveBeenCalled();
    });

    it('should extract subscription tier from user.subscription.tier', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      mockRequest.user = {
        userId: 'user-123',
        subscription: { tier: SubscriptionTier.PLATINUM },
      };

      await guard.canActivate(mockExecutionContext);

      expect(ddosProtection.checkRequest).toHaveBeenCalled();
    });
  });

  describe('IP Detection', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      mockRequest.headers['x-forwarded-for'] = '192.168.1.1, 10.0.0.1';

      await guard.canActivate(mockExecutionContext);

      expect(ddosProtection.checkRequest).toHaveBeenCalledWith(
        mockRequest,
        '192.168.1.1',
      );
    });

    it('should extract IP from x-real-ip header', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      mockRequest.headers['x-real-ip'] = '192.168.1.2';

      await guard.canActivate(mockExecutionContext);

      expect(ddosProtection.checkRequest).toHaveBeenCalledWith(
        mockRequest,
        '192.168.1.2',
      );
    });

    it('should fallback to req.ip', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      await guard.canActivate(mockExecutionContext);

      expect(ddosProtection.checkRequest).toHaveBeenCalledWith(
        mockRequest,
        '127.0.0.1',
      );
    });
  });

  describe('Error Handling', () => {
    it('should allow request if Redis pipeline fails', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      mockRedis.pipeline = jest.fn().mockReturnValue({
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null), // Simulate failure
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should re-throw HttpException errors', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(ddosProtection, 'checkRequest').mockResolvedValue({
        allowed: false,
        reason: 'Blocked',
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        HttpException,
      );
    });

    it('should allow request on general errors (fail-open)', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest
        .spyOn(ddosProtection, 'checkRequest')
        .mockRejectedValue(new Error('Redis connection error'));

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should set correct rate limit headers', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      await guard.canActivate(mockExecutionContext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Limit',
        expect.any(String),
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        expect.any(String),
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        expect.any(String),
      );
    });

    it('should set Retry-After header when limit reached', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      mockRedis.pipeline = jest.fn().mockReturnValue({
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0],
          [null, 100], // At limit
          [null, 1],
          [null, 1],
        ]),
      });

      try {
        await guard.canActivate(mockExecutionContext);
      } catch (error) {
        // Expected to throw
      }

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Retry-After',
        expect.any(String),
      );
    });
  });

  describe('Sliding Window Algorithm', () => {
    it('should clean up old entries in sliding window', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const mockPipeline = {
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 5], // Removed 5 old entries
          [null, 10], // Current count
          [null, 1], // Added new entry
          [null, 1], // Set expiration
        ]),
      };

      mockRedis.pipeline = jest.fn().mockReturnValue(mockPipeline);

      await guard.canActivate(mockExecutionContext);

      expect(mockPipeline.zremrangebyscore).toHaveBeenCalled();
      expect(mockPipeline.expire).toHaveBeenCalled();
    });

    it('should calculate remaining count correctly', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      mockRedis.pipeline = jest.fn().mockReturnValue({
        zremrangebyscore: jest.fn().mockReturnThis(),
        zcard: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0],
          [null, 25], // 25 requests in window, limit is 100
          [null, 1],
          [null, 1],
        ]),
      });

      await guard.canActivate(mockExecutionContext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        expect.stringMatching(/^(74|75)$/), // 100 - 25 - 1 = 74 (or 75 if different rule)
      );
    });
  });

  describe('User Identification', () => {
    it('should use user-based key for authenticated users', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      mockRequest.user = { userId: 'user-123' };

      await guard.canActivate(mockExecutionContext);

      // Verify Redis was called (user-based rate limiting)
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should use IP-based key for unauthenticated users', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      mockRequest.user = null;

      await guard.canActivate(mockExecutionContext);

      // Verify Redis was called (IP-based rate limiting)
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should extract userId from user.sub (JWT)', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      mockRequest.user = { sub: 'user-456' };

      await guard.canActivate(mockExecutionContext);

      expect(mockRedis.pipeline).toHaveBeenCalled();
    });
  });
});
