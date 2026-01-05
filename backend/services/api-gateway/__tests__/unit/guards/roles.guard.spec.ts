import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard, Role } from '../../../src/guards/roles.guard';
import { ROLES_KEY } from '../../../src/decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
    jest.clearAllMocks();
  });

  describe('No required roles', () => {
    it('should allow access when no roles are required', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const context = createMockExecutionContext({ roles: ['user'] });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when roles array is null', () => {
      reflector.getAllAndOverride.mockReturnValue(null);

      const context = createMockExecutionContext({ roles: ['user'] });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when roles array is empty', () => {
      reflector.getAllAndOverride.mockReturnValue([]);

      const context = createMockExecutionContext({ roles: ['user'] });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('User with single role', () => {
    it('should allow access when user has the required role', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.USER]);

      const context = createMockExecutionContext({ roles: ['user'] });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user does not have the required role', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

      const context = createMockExecutionContext({ roles: ['user'] });
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should allow admin access to admin routes', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

      const context = createMockExecutionContext({ roles: ['admin'] });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow moderator access to moderator routes', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.MODERATOR]);

      const context = createMockExecutionContext({ roles: ['moderator'] });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('User with multiple roles', () => {
    it('should allow access when user has one of multiple required roles', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.MODERATOR]);

      const context = createMockExecutionContext({ roles: ['moderator'] });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has multiple roles including required one', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.PREMIUM]);

      const context = createMockExecutionContext({ roles: ['user', 'premium'] });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has all required roles and more', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.VIP]);

      const context = createMockExecutionContext({ roles: ['user', 'premium', 'vip'] });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user roles do not match any required role', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.MODERATOR]);

      const context = createMockExecutionContext({ roles: ['user', 'premium'] });
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });
  });

  describe('No user or roles', () => {
    it('should deny access when user is undefined', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.USER]);

      const context = createMockExecutionContext(undefined);
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should deny access when user is null', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.USER]);

      const context = createMockExecutionContext(null);
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should deny access when user has no roles property', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.USER]);

      const context = createMockExecutionContext({ email: 'test@example.com' });
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should deny access when user roles is undefined', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.USER]);

      const context = createMockExecutionContext({ roles: undefined });
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should deny access when user roles is null', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.USER]);

      const context = createMockExecutionContext({ roles: null });
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should deny access when user roles is empty array', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.USER]);

      const context = createMockExecutionContext({ roles: [] });
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });
  });

  describe('Role enum values', () => {
    it('should correctly match USER role', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.USER]);

      const context = createMockExecutionContext({ roles: ['user'] });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(Role.USER).toBe('user');
    });

    it('should correctly match PREMIUM role', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.PREMIUM]);

      const context = createMockExecutionContext({ roles: ['premium'] });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(Role.PREMIUM).toBe('premium');
    });

    it('should correctly match VIP role', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.VIP]);

      const context = createMockExecutionContext({ roles: ['vip'] });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(Role.VIP).toBe('vip');
    });

    it('should correctly match MODERATOR role', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.MODERATOR]);

      const context = createMockExecutionContext({ roles: ['moderator'] });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(Role.MODERATOR).toBe('moderator');
    });

    it('should correctly match ADMIN role', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

      const context = createMockExecutionContext({ roles: ['admin'] });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(Role.ADMIN).toBe('admin');
    });
  });

  describe('Reflector usage', () => {
    it('should get roles from both handler and class', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.USER]);

      const mockHandler = jest.fn();
      const mockClass = jest.fn();

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { roles: ['user'] } }),
        }),
        getHandler: () => mockHandler,
        getClass: () => mockClass,
      } as unknown as ExecutionContext;

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        mockHandler,
        mockClass,
      ]);
    });
  });

  describe('Edge cases', () => {
    it('should handle case when roles contain special characters', () => {
      reflector.getAllAndOverride.mockReturnValue(['special-role']);

      const context = createMockExecutionContext({ roles: ['special-role'] });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle case when roles have mixed case', () => {
      reflector.getAllAndOverride.mockReturnValue(['User']);

      // This should NOT match 'user' because roles are case-sensitive
      const context = createMockExecutionContext({ roles: ['user'] });
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle large number of roles', () => {
      const manyRoles = Array.from({ length: 100 }, (_, i) => `role-${i}`);
      reflector.getAllAndOverride.mockReturnValue(['role-50']);

      const context = createMockExecutionContext({ roles: manyRoles });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
