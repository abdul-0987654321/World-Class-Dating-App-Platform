import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';

import { JwtAuthGuard } from '../../../src/guards/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../../src/decorators/public.decorator';

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let configService: jest.Mocked<ConfigService>;

  const mockJwtSecret = 'test-jwt-secret';

  const createMockExecutionContext = (
    request: Partial<{ headers: Record<string, string>; user?: any }>
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    configService = {
      get: jest.fn().mockReturnValue(mockJwtSecret),
    } as unknown as jest.Mocked<ConfigService>;

    guard = new JwtAuthGuard(reflector, configService);
    jest.clearAllMocks();
  });

  describe('Public routes', () => {
    it('should allow access to public routes without token', () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const context = createMockExecutionContext({ headers: {} });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should check IS_PUBLIC_KEY decorator on both handler and class', () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const context = createMockExecutionContext({ headers: {} });
      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        IS_PUBLIC_KEY,
        expect.arrayContaining([expect.any(Function), expect.any(Function)])
      );
    });
  });

  describe('Token extraction', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    it('should throw UnauthorizedException when no authorization header is present', () => {
      const context = createMockExecutionContext({ headers: {} });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Authentication required');
    });

    it('should extract token from Bearer authorization header', () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        subscription: 'premium',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const request = { headers: { authorization: `Bearer ${mockToken}` } };
      const context = createMockExecutionContext(request);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, mockJwtSecret);
    });

    it('should extract token when provided without Bearer prefix', () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const request = { headers: { authorization: mockToken } };
      const context = createMockExecutionContext(request);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, mockJwtSecret);
    });

    it('should return null for authorization header without dots (not a JWT)', () => {
      const context = createMockExecutionContext({
        headers: { authorization: 'invalidtoken' },
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('Token validation', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    it('should validate token and attach user to request', () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        roles: ['user', 'premium'],
        subscription: 'premium',
        deviceId: 'device-456',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const request: any = { headers: { authorization: 'Bearer valid.jwt.token' } };
      const context = createMockExecutionContext(request);

      guard.canActivate(context);

      expect(request.user).toBeDefined();
      expect(request.user.sub).toBe('user-123');
      expect(request.user.userId).toBe('user-123');
      expect(request.user.email).toBe('test@example.com');
      expect(request.user.roles).toEqual(['user', 'premium']);
      expect(request.user.subscription).toBe('premium');
      expect(request.user.deviceId).toBe('device-456');
    });

    it('should normalize user payload with userId as alternative to sub', () => {
      const mockPayload = {
        userId: 'user-789',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const request: any = { headers: { authorization: 'Bearer valid.jwt.token' } };
      const context = createMockExecutionContext(request);

      guard.canActivate(context);

      expect(request.user.sub).toBe('user-789');
      expect(request.user.userId).toBe('user-789');
    });

    it('should set default values for missing optional fields', () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const request: any = { headers: { authorization: 'Bearer valid.jwt.token' } };
      const context = createMockExecutionContext(request);

      guard.canActivate(context);

      expect(request.user.roles).toEqual([]);
      expect(request.user.subscription).toBe('free');
    });
  });

  describe('Token errors', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    it('should throw TOKEN_EXPIRED error when token is expired', () => {
      const expiredError = new jwt.TokenExpiredError('jwt expired', new Date());
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw expiredError;
      });

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer expired.jwt.token' },
      });

      try {
        guard.canActivate(context);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).getResponse()).toMatchObject({
          code: 'TOKEN_EXPIRED',
          message: 'Your session has expired. Please log in again.',
        });
      }
    });

    it('should throw INVALID_TOKEN error when token is malformed', () => {
      const invalidError = new jwt.JsonWebTokenError('invalid token');
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw invalidError;
      });

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer invalid.jwt.token' },
      });

      try {
        guard.canActivate(context);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).getResponse()).toMatchObject({
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token. Please log in again.',
        });
      }
    });

    it('should throw UNAUTHORIZED error for other errors', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Unknown error');
      });

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer some.jwt.token' },
      });

      try {
        guard.canActivate(context);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).getResponse()).toMatchObject({
          code: 'UNAUTHORIZED',
          message: 'Authentication failed. Please try logging in again.',
        });
      }
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    it('should use jwt.accessSecret from config', () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer valid.jwt.token' },
      });

      guard.canActivate(context);

      expect(configService.get).toHaveBeenCalledWith('jwt.accessSecret');
    });

    it('should handle token with only Bearer keyword', () => {
      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer ' },
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should handle empty authorization header', () => {
      const context = createMockExecutionContext({
        headers: { authorization: '' },
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });
});
