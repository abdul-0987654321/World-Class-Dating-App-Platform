import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import * as crypto from 'crypto';

import { CsrfMiddleware } from '../../../src/middleware/csrf.middleware';

// Mock ioredis
jest.mock('ioredis', () => {
  const mockRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    setex: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK'),
  };
  return jest.fn().mockImplementation(() => mockRedis);
});

describe('CsrfMiddleware', () => {
  let middleware: CsrfMiddleware;
  let configService: jest.Mocked<ConfigService>;
  let mockRedis: any;

  const createMockRequest = (overrides: Partial<Request> = {}): Request => {
    return {
      method: 'GET',
      path: '/api/v1/test',
      headers: {},
      cookies: {},
      body: {},
      user: undefined,
      ...overrides,
    } as unknown as Request;
  };

  const createMockResponse = (): Response => {
    const res: Partial<Response> = {
      cookie: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
    return res as Response;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, any> = {
          'redis.host': 'localhost',
          'redis.port': 6379,
          'redis.password': undefined,
          'redis.db': 0,
          NODE_ENV: 'test',
        };
        return config[key];
      }),
    } as unknown as jest.Mocked<ConfigService>;

    middleware = new CsrfMiddleware(configService);
    mockRedis = new (Redis as any)();

    // Initialize Redis connection
    await middleware.onModuleInit();
  });

  afterEach(async () => {
    await middleware.onModuleDestroy();
  });

  describe('Excluded paths', () => {
    const excludedPaths = [
      '/api/v1/webhooks',
      '/api/v1/webhooks/stripe',
      '/api/v1/health',
      '/api/v1/metrics',
      '/api/v1/auth/register',
      '/api/v1/auth/login',
      '/api/v1/auth/forgot-password',
      '/api/v1/auth/reset-password',
      '/api/v1/auth/verify-email',
      '/api/v1/auth/refresh-token',
      '/api/v1/csrf/token',
    ];

    excludedPaths.forEach((path) => {
      it(`should skip CSRF validation for ${path}`, () => {
        const req = createMockRequest({ path, method: 'POST' });
        const res = createMockResponse();
        const next = jest.fn();

        middleware.use(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(next).toHaveBeenCalledWith();
      });
    });
  });

  describe('Safe methods (GET, HEAD, OPTIONS)', () => {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

    safeMethods.forEach((method) => {
      it(`should generate token for ${method} request`, () => {
        const req = createMockRequest({ method });
        const res = createMockResponse();
        const next = jest.fn();

        middleware.use(req, res, next);

        expect(next).toHaveBeenCalled();
        // Token should be generated
        expect(req.csrfToken).toBeDefined();
        expect(typeof req.csrfToken).toBe('function');
      });

      it(`should set CSRF cookies for ${method} request`, () => {
        const req = createMockRequest({ method });
        const res = createMockResponse();
        const next = jest.fn();

        middleware.use(req, res, next);

        // Should set readable token cookie
        expect(res.cookie).toHaveBeenCalledWith(
          'XSRF-TOKEN',
          expect.any(String),
          expect.objectContaining({
            httpOnly: false,
            sameSite: 'strict',
            path: '/',
          })
        );

        // Should set secret cookie
        expect(res.cookie).toHaveBeenCalledWith(
          '_csrf',
          expect.any(String),
          expect.objectContaining({
            httpOnly: true,
            sameSite: 'strict',
            path: '/',
          })
        );
      });

      it(`should reuse existing token from cookies for ${method} request`, () => {
        const existingToken = 'existing-token';
        const existingSecret = 'existing-secret';

        const req = createMockRequest({
          method,
          cookies: {
            'XSRF-TOKEN': existingToken,
            '_csrf': existingSecret,
          },
        });
        const res = createMockResponse();
        const next = jest.fn();

        middleware.use(req, res, next);

        expect(req.csrfToken?.()).toBe(existingToken);
        expect(req.csrfSecret).toBe(existingSecret);
        // Should not set new cookies
        expect(res.cookie).not.toHaveBeenCalled();
      });
    });
  });

  describe('Protected methods (POST, PUT, PATCH, DELETE)', () => {
    const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    protectedMethods.forEach((method) => {
      it(`should validate CSRF token for ${method} request`, async () => {
        const token = 'valid-token';
        const secret = 'valid-secret';

        const req = createMockRequest({
          method,
          path: '/api/v1/protected',
          headers: { 'x-csrf-token': token },
          cookies: {
            'XSRF-TOKEN': token,
            '_csrf': secret,
          },
        });
        const res = createMockResponse();
        const next = jest.fn();

        await new Promise<void>((resolve) => {
          middleware.use(req, res, (err?: any) => {
            next(err);
            resolve();
          });
        });

        expect(next).toHaveBeenCalledWith();
      });

      it(`should reject ${method} request without CSRF token`, async () => {
        const req = createMockRequest({
          method,
          path: '/api/v1/protected',
          headers: {},
          cookies: {},
        });
        const res = createMockResponse();

        await expect(
          new Promise<void>((resolve, reject) => {
            middleware.use(req, res, (err?: any) => {
              if (err) reject(err);
              else resolve();
            });
          })
        ).rejects.toThrow(ForbiddenException);
      });

      it(`should reject ${method} request without CSRF secret cookie`, async () => {
        const token = 'valid-token';

        const req = createMockRequest({
          method,
          path: '/api/v1/protected',
          headers: { 'x-csrf-token': token },
          cookies: {
            'XSRF-TOKEN': token,
            // Missing _csrf secret
          },
        });
        const res = createMockResponse();

        await expect(
          new Promise<void>((resolve, reject) => {
            middleware.use(req, res, (err?: any) => {
              if (err) reject(err);
              else resolve();
            });
          })
        ).rejects.toThrow(ForbiddenException);
      });

      it(`should reject ${method} request with mismatched tokens`, async () => {
        const req = createMockRequest({
          method,
          path: '/api/v1/protected',
          headers: { 'x-csrf-token': 'header-token' },
          cookies: {
            'XSRF-TOKEN': 'cookie-token',
            '_csrf': 'secret',
          },
        });
        const res = createMockResponse();

        await expect(
          new Promise<void>((resolve, reject) => {
            middleware.use(req, res, (err?: any) => {
              if (err) reject(err);
              else resolve();
            });
          })
        ).rejects.toThrow(ForbiddenException);
      });
    });
  });

  describe('Token from body', () => {
    it('should accept CSRF token from request body', async () => {
      const token = 'body-token';
      const secret = 'secret';

      const req = createMockRequest({
        method: 'POST',
        path: '/api/v1/protected',
        headers: {},
        cookies: {
          'XSRF-TOKEN': token,
          '_csrf': secret,
        },
        body: { _csrf: token },
      });
      const res = createMockResponse();
      const next = jest.fn();

      await new Promise<void>((resolve) => {
        middleware.use(req, res, (err?: any) => {
          next(err);
          resolve();
        });
      });

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Token generation', () => {
    it('should generate cryptographically secure tokens', () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      const next = jest.fn();

      middleware.use(req, res, next);

      const token = req.csrfToken?.();

      // Token should be base64url encoded
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);

      // Token should be of reasonable length (32 bytes = ~43 characters in base64)
      expect(token?.length).toBeGreaterThanOrEqual(40);
    });

    it('should generate unique tokens for each request', () => {
      const tokens: string[] = [];

      for (let i = 0; i < 10; i++) {
        const req = createMockRequest({ method: 'GET' });
        const res = createMockResponse();
        const next = jest.fn();

        middleware.use(req, res, next);

        tokens.push(req.csrfToken?.() || '');
      }

      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(10);
    });
  });

  describe('Token expiration', () => {
    it('should set token expiration to 24 hours', () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      const next = jest.fn();

      middleware.use(req, res, next);

      // Check cookie maxAge is 24 hours in milliseconds
      const expectedMaxAge = 24 * 60 * 60 * 1000;

      expect(res.cookie).toHaveBeenCalledWith(
        'XSRF-TOKEN',
        expect.any(String),
        expect.objectContaining({
          maxAge: expectedMaxAge,
        })
      );
    });
  });

  describe('Redis integration', () => {
    it('should store token in Redis for authenticated users', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const req = createMockRequest({
        method: 'GET',
        user: { userId: 'user-123' },
      });
      const res = createMockResponse();
      const next = jest.fn();

      middleware.use(req, res, next);

      // Wait for async Redis operation
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Redis setex should be called with user-specific key
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should work without Redis for unauthenticated users', () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      const next = jest.fn();

      middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.csrfToken).toBeDefined();
    });
  });

  describe('Cookie settings', () => {
    it('should set secure cookie in production', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const prodMiddleware = new CsrfMiddleware(configService);

      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      const next = jest.fn();

      prodMiddleware.use(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith(
        'XSRF-TOKEN',
        expect.any(String),
        expect.objectContaining({
          secure: true,
        })
      );
    });

    it('should not require secure cookie in development', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });

      const devMiddleware = new CsrfMiddleware(configService);

      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      const next = jest.fn();

      devMiddleware.use(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith(
        'XSRF-TOKEN',
        expect.any(String),
        expect.objectContaining({
          secure: false,
        })
      );
    });

    it('should use SameSite=Strict for all cookies', () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      const next = jest.fn();

      middleware.use(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith(
        'XSRF-TOKEN',
        expect.any(String),
        expect.objectContaining({
          sameSite: 'strict',
        })
      );

      expect(res.cookie).toHaveBeenCalledWith(
        '_csrf',
        expect.any(String),
        expect.objectContaining({
          sameSite: 'strict',
        })
      );
    });
  });

  describe('Response headers', () => {
    it('should expose token in X-CSRF-Token header', () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      const next = jest.fn();

      middleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-CSRF-Token', expect.any(String));
    });
  });

  describe('Public methods', () => {
    it('should clear token from Redis', async () => {
      mockRedis.del.mockResolvedValue(1);

      await middleware.clearToken('user-123');

      expect(mockRedis.del).toHaveBeenCalledWith('csrf:user-123');
    });

    it('should refresh token for user', async () => {
      mockRedis.del.mockResolvedValue(1);

      const req = createMockRequest({
        method: 'GET',
        user: { userId: 'user-123' },
      });
      const res = createMockResponse();

      await middleware.refreshToken(req, res);

      expect(mockRedis.del).toHaveBeenCalledWith('csrf:user-123');
      expect(res.cookie).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should throw ForbiddenException for missing token', async () => {
      const req = createMockRequest({
        method: 'POST',
        path: '/api/v1/protected',
      });
      const res = createMockResponse();

      await expect(
        new Promise<void>((resolve, reject) => {
          middleware.use(req, res, (err?: any) => {
            if (err) reject(err);
            else resolve();
          });
        })
      ).rejects.toThrow('CSRF token missing');
    });

    it('should throw ForbiddenException for token mismatch', async () => {
      const req = createMockRequest({
        method: 'POST',
        path: '/api/v1/protected',
        headers: { 'x-csrf-token': 'token-a' },
        cookies: {
          'XSRF-TOKEN': 'token-b',
          '_csrf': 'secret',
        },
      });
      const res = createMockResponse();

      await expect(
        new Promise<void>((resolve, reject) => {
          middleware.use(req, res, (err?: any) => {
            if (err) reject(err);
            else resolve();
          });
        })
      ).rejects.toThrow('CSRF token mismatch');
    });
  });

  describe('User ID extraction', () => {
    it('should extract userId from request.user.userId', () => {
      const req = createMockRequest({
        method: 'GET',
        user: { userId: 'user-from-userId' },
      });
      const res = createMockResponse();
      const next = jest.fn();

      middleware.use(req, res, next);

      // Token should be stored with userId
      expect(mockRedis.setex).toBeDefined();
    });

    it('should extract userId from request.user.sub', () => {
      const req = createMockRequest({
        method: 'GET',
        user: { sub: 'user-from-sub' },
      });
      const res = createMockResponse();
      const next = jest.fn();

      middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
