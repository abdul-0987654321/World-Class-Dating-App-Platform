/**
 * Auth Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from '../auth.service';
import { createMockFetch, fetchScenarios, createMockResponse } from '../../test/mocks';

describe('AuthService', () => {
  let originalFetch: typeof global.fetch;
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    // Save original fetch
    originalFetch = global.fetch;

    // Mock localStorage
    localStorageMock = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => localStorageMock[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      localStorageMock[key] = value;
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete localStorageMock[key];
    });
    vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => {
      localStorageMock = {};
    });
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      global.fetch = createMockFetch();

      const result = await authService.login('test@example.com', 'password123');

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('should save session data after successful login', async () => {
      global.fetch = createMockFetch();

      await authService.login('test@example.com', 'password123');

      expect(localStorageMock['authToken']).toBeDefined();
      expect(localStorageMock['currentUser']).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      global.fetch = fetchScenarios.loginFailure('Invalid credentials');

      await expect(authService.login('wrong@email.com', 'wrongpassword'))
        .rejects
        .toBeDefined();
    });

    it('should handle network errors', async () => {
      global.fetch = fetchScenarios.networkError();

      await expect(authService.login('test@example.com', 'password123'))
        .rejects
        .toThrow('Failed to fetch');
    });
  });

  describe('register', () => {
    it('should register successfully with valid data', async () => {
      global.fetch = createMockFetch();

      const result = await authService.register({
        email: 'new@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      });

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('should save session data after successful registration', async () => {
      global.fetch = createMockFetch();

      await authService.register({
        email: 'new@example.com',
        password: 'Password123',
        firstName: 'John',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      });

      expect(localStorageMock['authToken']).toBeDefined();
      expect(localStorageMock['currentUser']).toBeDefined();
    });

    it('should handle validation errors', async () => {
      global.fetch = fetchScenarios.validationError({
        email: 'Email already exists',
      });

      await expect(authService.register({
        email: 'existing@example.com',
        password: 'Password123',
        firstName: 'John',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      }))
        .rejects
        .toBeDefined();
    });
  });

  describe('logout', () => {
    it('should clear session data', async () => {
      // Setup initial session
      localStorageMock['authToken'] = 'mock-token';
      localStorageMock['currentUser'] = JSON.stringify({ id: '123' });
      localStorageMock['refreshToken'] = 'mock-refresh';

      global.fetch = vi.fn().mockResolvedValue(createMockResponse({ success: true }));

      await authService.logout();

      expect(localStorageMock['authToken']).toBeUndefined();
      expect(localStorageMock['currentUser']).toBeUndefined();
      expect(localStorageMock['refreshToken']).toBeUndefined();
    });

    it('should clear session even if API call fails', async () => {
      localStorageMock['authToken'] = 'mock-token';

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await authService.logout();

      expect(localStorageMock['authToken']).toBeUndefined();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user data', async () => {
      global.fetch = createMockFetch();

      const user = await authService.getCurrentUser();

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
    });
  });

  describe('getSession', () => {
    it('should return session with user and entitlements', async () => {
      global.fetch = createMockFetch();

      const session = await authService.getSession();

      expect(session).toBeDefined();
      expect(session?.user).toBeDefined();
      expect(session?.entitlements).toBeDefined();
      expect(session?.isAuthenticated).toBe(true);
    });

    it('should return null on 401 error', async () => {
      global.fetch = fetchScenarios.unauthorized();

      const session = await authService.getSession();

      expect(session).toBeNull();
    });

    it('should clear session on 401 error', async () => {
      localStorageMock['authToken'] = 'expired-token';

      global.fetch = fetchScenarios.unauthorized();

      await authService.getSession();

      expect(localStorageMock['authToken']).toBeUndefined();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      localStorageMock['refreshToken'] = 'valid-refresh-token';

      global.fetch = vi.fn().mockResolvedValue(
        createMockResponse({
          user: { id: '123', email: 'test@example.com' },
          token: 'new-access-token',
          refreshToken: 'new-refresh-token',
        })
      );

      const result = await authService.refreshToken();

      expect(result.token).toBe('new-access-token');
    });

    it('should throw error when no refresh token available', async () => {
      delete localStorageMock['refreshToken'];

      await expect(authService.refreshToken())
        .rejects
        .toThrow('No refresh token available');
    });
  });

  describe('forgotPassword', () => {
    it('should send forgot password request', async () => {
      global.fetch = vi.fn().mockResolvedValue(createMockResponse({ success: true }));

      await authService.forgotPassword('test@example.com');

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      global.fetch = vi.fn().mockResolvedValue(createMockResponse({ success: true }));

      await authService.resetPassword('valid-token', 'newPassword123');

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      global.fetch = vi.fn().mockResolvedValue(createMockResponse({ success: true }));

      await authService.verifyEmail('valid-token');

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email', async () => {
      global.fetch = vi.fn().mockResolvedValue(createMockResponse({ success: true }));

      await authService.resendVerificationEmail();

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when auth token exists', () => {
      localStorageMock['authToken'] = 'valid-token';

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when no auth token', () => {
      delete localStorageMock['authToken'];

      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return auth token', () => {
      localStorageMock['authToken'] = 'test-token';

      expect(authService.getToken()).toBe('test-token');
    });

    it('should return null when no token', () => {
      delete localStorageMock['authToken'];

      expect(authService.getToken()).toBeNull();
    });
  });

  describe('getStoredEntitlements', () => {
    it('should return stored entitlements', () => {
      const entitlements = {
        tier: 'GOLD',
        features: ['unlimited_likes'],
        limits: { dailyLikes: -1 },
      };
      localStorageMock['entitlements'] = JSON.stringify(entitlements);

      const result = authService.getStoredEntitlements();

      expect(result).toEqual(entitlements);
    });

    it('should return null when no entitlements stored', () => {
      delete localStorageMock['entitlements'];

      expect(authService.getStoredEntitlements()).toBeNull();
    });
  });

  describe('hasFeature', () => {
    it('should return true when user has feature', () => {
      localStorageMock['entitlements'] = JSON.stringify({
        tier: 'GOLD',
        features: ['unlimited_likes', 'see_likes'],
        limits: {},
      });

      expect(authService.hasFeature('unlimited_likes')).toBe(true);
    });

    it('should return false when user does not have feature', () => {
      localStorageMock['entitlements'] = JSON.stringify({
        tier: 'FREE',
        features: ['basic_matching'],
        limits: {},
      });

      expect(authService.hasFeature('unlimited_likes')).toBe(false);
    });

    it('should return true for any feature when user has "all" features', () => {
      localStorageMock['entitlements'] = JSON.stringify({
        tier: 'ELITE',
        features: ['all'],
        limits: {},
      });

      expect(authService.hasFeature('any_feature')).toBe(true);
    });

    it('should return false when no entitlements', () => {
      delete localStorageMock['entitlements'];

      expect(authService.hasFeature('any_feature')).toBe(false);
    });
  });
});
