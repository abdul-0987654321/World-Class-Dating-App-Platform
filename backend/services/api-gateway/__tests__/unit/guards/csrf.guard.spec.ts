import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';

import { CsrfGuard } from '../../../src/guards/csrf.guard';
import { SKIP_CSRF_KEY, REQUIRE_CSRF_KEY } from '../../../src/decorators/csrf.decorator';

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockExecutionContext = (
    method: string,
    headers: Record<string, string> = {},
    cookies: Record<string, string> = {},
    body: Record<string, any> = {}
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          headers,
          cookies,
          body,
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<Reflector>;

    guard = new CsrfGuard(reflector);
    jest.clearAllMocks();
  });

  describe('Skip CSRF decorator', () => {
    it('should skip CSRF validation when @SkipCsrf() is applied', async () => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === SKIP_CSRF_KEY) return true;
        return false;
      });

      const context = createMockExecutionContext('POST', {}, {}, {});
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should check SKIP_CSRF_KEY on both handler and class', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const context = createMockExecutionContext('POST', {}, {}, {});
      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(SKIP_CSRF_KEY, [
        expect.any(Function),
        expect.any(Function),
      ]);
    });
  });

  describe('Safe methods', () => {
    it('should skip validation for GET requests by default', async () => {
      const context = createMockExecutionContext('GET', {}, {}, {});
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should skip validation for HEAD requests by default', async () => {
      const context = createMockExecutionContext('HEAD', {}, {}, {});
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should skip validation for OPTIONS requests by default', async () => {
      const context = createMockExecutionContext('OPTIONS', {}, {}, {});
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Require CSRF for safe methods', () => {
    it('should require CSRF for GET when @RequireCsrf() is applied', async () => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRE_CSRF_KEY) return true;
        return false;
      });

      const context = createMockExecutionContext('GET', {}, {}, {});

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should validate CSRF for GET when @RequireCsrf() is applied with valid token', async () => {
      const token = 'valid-csrf-token';

      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === REQUIRE_CSRF_KEY) return true;
        return false;
      });

      const context = createMockExecutionContext(
        'GET',
        { 'x-csrf-token': token },
        { 'XSRF-TOKEN': token, '_csrf': 'secret' },
        {}
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('Unsafe methods - POST, PUT, PATCH, DELETE', () => {
    const unsafeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    unsafeMethods.forEach((method) => {
      describe(`${method} requests`, () => {
        it(`should throw ForbiddenException when ${method} request has no CSRF token`, async () => {
          const context = createMockExecutionContext(method, {}, {}, {});

          await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
          await expect(guard.canActivate(context)).rejects.toThrow('CSRF token missing');
        });

        it(`should throw ForbiddenException when ${method} request has no CSRF cookie`, async () => {
          const context = createMockExecutionContext(
            method,
            { 'x-csrf-token': 'token-value' },
            {},
            {}
          );

          await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
          await expect(guard.canActivate(context)).rejects.toThrow('CSRF cookie missing');
        });

        it(`should throw ForbiddenException when ${method} request has mismatched tokens`, async () => {
          const context = createMockExecutionContext(
            method,
            { 'x-csrf-token': 'token-from-header' },
            { 'XSRF-TOKEN': 'token-from-cookie', '_csrf': 'secret' },
            {}
          );

          await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
          await expect(guard.canActivate(context)).rejects.toThrow('CSRF token mismatch');
        });

        it(`should allow ${method} request with matching header and cookie tokens`, async () => {
          const token = 'valid-matching-token';

          const context = createMockExecutionContext(
            method,
            { 'x-csrf-token': token },
            { 'XSRF-TOKEN': token, '_csrf': 'secret' },
            {}
          );

          const result = await guard.canActivate(context);
          expect(result).toBe(true);
        });
      });
    });
  });

  describe('Token from body', () => {
    it('should accept CSRF token from request body _csrf field', async () => {
      const token = 'body-csrf-token';

      const context = createMockExecutionContext(
        'POST',
        {},
        { 'XSRF-TOKEN': token, '_csrf': 'secret' },
        { _csrf: token }
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should prefer header token over body token', async () => {
      const headerToken = 'header-token';
      const bodyToken = 'body-token';

      const context = createMockExecutionContext(
        'POST',
        { 'x-csrf-token': headerToken },
        { 'XSRF-TOKEN': headerToken, '_csrf': 'secret' },
        { _csrf: bodyToken }
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('Secret cookie validation', () => {
    it('should throw ForbiddenException when secret cookie is missing', async () => {
      const token = 'valid-token';

      const context = createMockExecutionContext(
        'POST',
        { 'x-csrf-token': token },
        { 'XSRF-TOKEN': token }, // Missing _csrf secret
        {}
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('CSRF secret missing');
    });

    it('should allow request when all CSRF components are present', async () => {
      const token = 'valid-token';

      const context = createMockExecutionContext(
        'POST',
        { 'x-csrf-token': token },
        { 'XSRF-TOKEN': token, '_csrf': 'secret-value' },
        {}
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('Timing-safe comparison', () => {
    it('should use timing-safe comparison for token validation', async () => {
      const token = 'valid-token';

      // Create tokens that differ only in last character
      const context1 = createMockExecutionContext(
        'POST',
        { 'x-csrf-token': 'token-abc' },
        { 'XSRF-TOKEN': 'token-abd', '_csrf': 'secret' },
        {}
      );

      await expect(guard.canActivate(context1)).rejects.toThrow('CSRF token mismatch');
    });

    it('should reject tokens of different lengths', async () => {
      const context = createMockExecutionContext(
        'POST',
        { 'x-csrf-token': 'short' },
        { 'XSRF-TOKEN': 'much-longer-token', '_csrf': 'secret' },
        {}
      );

      await expect(guard.canActivate(context)).rejects.toThrow('CSRF token mismatch');
    });
  });

  describe('Error handling', () => {
    it('should throw generic validation error for unexpected errors', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => {
            throw new Error('Unexpected error');
          },
        }),
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should preserve ForbiddenException messages', async () => {
      const context = createMockExecutionContext('POST', {}, {}, {});

      try {
        await guard.canActivate(context);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).message).toBe('CSRF token missing');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty token string', async () => {
      const context = createMockExecutionContext(
        'POST',
        { 'x-csrf-token': '' },
        { 'XSRF-TOKEN': '', '_csrf': 'secret' },
        {}
      );

      // Empty string is still considered a missing token in practice
      // The guard checks for truthiness
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should handle whitespace-only tokens', async () => {
      const context = createMockExecutionContext(
        'POST',
        { 'x-csrf-token': '   ' },
        { 'XSRF-TOKEN': '   ', '_csrf': 'secret' },
        {}
      );

      // Whitespace tokens should technically pass if they match
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should handle undefined cookies object', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: { 'x-csrf-token': 'token' },
            cookies: undefined,
            body: {},
          }),
        }),
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should handle null body', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: { 'x-csrf-token': 'token' },
            cookies: { 'XSRF-TOKEN': 'token', '_csrf': 'secret' },
            body: null,
          }),
        }),
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });
});
