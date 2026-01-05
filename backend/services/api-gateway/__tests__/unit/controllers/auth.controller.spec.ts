import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';

import { AuthController } from '../../../src/controllers/auth.controller';
import { ProxyService } from '../../../src/services/proxy.service';
import { JwtPayload } from '../../../src/decorators/current-user.decorator';

describe('AuthController', () => {
  let controller: AuthController;
  let proxyService: jest.Mocked<ProxyService>;

  const mockProxyService = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: ProxyService,
          useValue: mockProxyService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    proxyService = module.get(ProxyService) as jest.Mocked<ProxyService>;
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should call authService register endpoint', async () => {
      const expectedResponse = { id: 'user-123', email: 'test@example.com' };
      proxyService.post.mockResolvedValue(expectedResponse);

      const result = await controller.register(registerDto);

      expect(proxyService.post).toHaveBeenCalledWith(
        'authService',
        '/api/v1/auth/register',
        registerDto
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should propagate errors from authService', async () => {
      const error = new HttpException('Email already exists', HttpStatus.CONFLICT);
      proxyService.post.mockRejectedValue(error);

      await expect(controller.register(registerDto)).rejects.toThrow(HttpException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
    };

    it('should call authService login endpoint', async () => {
      const expectedResponse = {
        accessToken: 'jwt-token',
        refreshToken: 'refresh-token',
        user: { id: 'user-123', email: 'test@example.com' },
      };
      proxyService.post.mockResolvedValue(expectedResponse);

      const result = await controller.login(loginDto);

      expect(proxyService.post).toHaveBeenCalledWith(
        'authService',
        '/api/v1/auth/login',
        loginDto
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should propagate authentication errors', async () => {
      const error = new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
      proxyService.post.mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow(HttpException);
    });
  });

  describe('logout', () => {
    const authorization = 'Bearer valid-jwt-token';

    it('should call authService logout endpoint with authorization header', async () => {
      proxyService.post.mockResolvedValue({ success: true });

      await controller.logout(authorization);

      expect(proxyService.post).toHaveBeenCalledWith(
        'authService',
        '/api/v1/auth/logout',
        {},
        { Authorization: authorization }
      );
    });

    it('should handle logout errors gracefully', async () => {
      const error = new HttpException('Token invalid', HttpStatus.UNAUTHORIZED);
      proxyService.post.mockRejectedValue(error);

      await expect(controller.logout(authorization)).rejects.toThrow(HttpException);
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    it('should call authService refresh-token endpoint', async () => {
      const expectedResponse = {
        accessToken: 'new-jwt-token',
        refreshToken: 'new-refresh-token',
      };
      proxyService.post.mockResolvedValue(expectedResponse);

      const result = await controller.refreshToken(refreshTokenDto);

      expect(proxyService.post).toHaveBeenCalledWith(
        'authService',
        '/api/v1/auth/refresh-token',
        refreshTokenDto
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should propagate refresh token errors', async () => {
      const error = new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
      proxyService.post.mockRejectedValue(error);

      await expect(controller.refreshToken(refreshTokenDto)).rejects.toThrow(HttpException);
    });
  });

  describe('verifyEmail', () => {
    const verifyEmailDto = {
      token: 'email-verification-token',
    };

    it('should call authService verify-email endpoint', async () => {
      proxyService.post.mockResolvedValue({ success: true });

      await controller.verifyEmail(verifyEmailDto);

      expect(proxyService.post).toHaveBeenCalledWith(
        'authService',
        '/api/v1/auth/verify-email',
        verifyEmailDto
      );
    });
  });

  describe('resendVerification', () => {
    const resendDto = {
      email: 'test@example.com',
    };

    it('should call authService resend-verification endpoint', async () => {
      proxyService.post.mockResolvedValue({ success: true });

      await controller.resendVerification(resendDto);

      expect(proxyService.post).toHaveBeenCalledWith(
        'authService',
        '/api/v1/auth/resend-verification',
        resendDto
      );
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should call authService forgot-password endpoint', async () => {
      proxyService.post.mockResolvedValue({ success: true });

      await controller.forgotPassword(forgotPasswordDto);

      expect(proxyService.post).toHaveBeenCalledWith(
        'authService',
        '/api/v1/auth/forgot-password',
        forgotPasswordDto
      );
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto = {
      token: 'reset-token',
      newPassword: 'NewSecurePassword123!',
    };

    it('should call authService reset-password endpoint', async () => {
      proxyService.post.mockResolvedValue({ success: true });

      await controller.resetPassword(resetPasswordDto);

      expect(proxyService.post).toHaveBeenCalledWith(
        'authService',
        '/api/v1/auth/reset-password',
        resetPasswordDto
      );
    });
  });

  describe('me', () => {
    const authorization = 'Bearer valid-jwt-token';

    it('should call authService me endpoint with authorization header', async () => {
      const expectedUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };
      proxyService.get.mockResolvedValue(expectedUser);

      const result = await controller.me(authorization);

      expect(proxyService.get).toHaveBeenCalledWith('authService', '/api/v1/auth/me', {
        Authorization: authorization,
      });
      expect(result).toEqual(expectedUser);
    });

    it('should propagate unauthorized errors', async () => {
      const error = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      proxyService.get.mockRejectedValue(error);

      await expect(controller.me(authorization)).rejects.toThrow(HttpException);
    });
  });

  describe('getSession', () => {
    const authorization = 'Bearer valid-jwt-token';
    const mockUser: JwtPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      roles: ['user'],
      subscription: 'premium',
      deviceId: 'device-456',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    it('should return session with user data and entitlements', async () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        emailVerified: true,
      };

      const subscriptionData = {
        tier: 'premium',
        status: 'active',
        expiresAt: '2025-12-31T23:59:59Z',
      };

      const usageData = {
        likesUsed: 10,
        superLikesUsed: 2,
        boostsUsed: 1,
      };

      proxyService.get.mockImplementation((service, path) => {
        if (path === '/api/v1/auth/me') return Promise.resolve(userData);
        if (path === '/api/subscriptions/current') return Promise.resolve(subscriptionData);
        if (path === '/api/swipes/stats') return Promise.resolve(usageData);
        return Promise.reject(new Error('Unknown path'));
      });

      const result = await controller.getSession(authorization, mockUser);

      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('test@example.com');
      expect(result.entitlements.subscription.tier).toBe('premium');
      expect(result.entitlements.usageToday.likesUsed).toBe(10);
      expect(result.session.deviceId).toBe('device-456');
    });

    it('should handle missing subscription data gracefully', async () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
      };

      proxyService.get.mockImplementation((service, path) => {
        if (path === '/api/v1/auth/me') return Promise.resolve(userData);
        if (path === '/api/subscriptions/current') return Promise.reject(new Error('Not found'));
        if (path === '/api/swipes/stats') return Promise.reject(new Error('Not found'));
        return Promise.reject(new Error('Unknown path'));
      });

      const result = await controller.getSession(authorization, mockUser);

      expect(result.entitlements.subscription.tier).toBe('premium');
      expect(result.entitlements.subscription.status).toBe('active');
      expect(result.entitlements.usageToday.likesUsed).toBe(0);
    });

    it('should return correct tier limits for free users', async () => {
      const freeUser: JwtPayload = {
        ...mockUser,
        subscription: 'free',
      };

      proxyService.get.mockImplementation((service, path) => {
        if (path === '/api/v1/auth/me') return Promise.resolve({ id: 'user-123' });
        return Promise.reject(new Error('Not found'));
      });

      const result = await controller.getSession(authorization, freeUser);

      expect(result.entitlements.limits.dailyLikes).toBe(50);
      expect(result.entitlements.limits.dailySuperLikes).toBe(1);
      expect(result.entitlements.limits.dailyBoosts).toBe(0);
    });

    it('should return correct tier limits for premium users', async () => {
      proxyService.get.mockImplementation((service, path) => {
        if (path === '/api/v1/auth/me') return Promise.resolve({ id: 'user-123' });
        return Promise.reject(new Error('Not found'));
      });

      const result = await controller.getSession(authorization, mockUser);

      expect(result.entitlements.limits.dailyLikes).toBe(-1); // unlimited
      expect(result.entitlements.limits.dailySuperLikes).toBe(10);
      expect(result.entitlements.limits.dailyBoosts).toBe(5);
    });

    it('should return correct tier limits for elite users', async () => {
      const eliteUser: JwtPayload = {
        ...mockUser,
        subscription: 'elite',
      };

      proxyService.get.mockImplementation((service, path) => {
        if (path === '/api/v1/auth/me') return Promise.resolve({ id: 'user-123' });
        return Promise.reject(new Error('Not found'));
      });

      const result = await controller.getSession(authorization, eliteUser);

      expect(result.entitlements.limits.dailyLikes).toBe(-1);
      expect(result.entitlements.limits.dailySuperLikes).toBe(-1);
      expect(result.entitlements.limits.dailyBoosts).toBe(-1);
    });

    it('should return correct features for free tier', async () => {
      const freeUser: JwtPayload = {
        ...mockUser,
        subscription: 'free',
      };

      proxyService.get.mockResolvedValue({ id: 'user-123' });

      const result = await controller.getSession(authorization, freeUser);

      expect(result.entitlements.features).toContain('swipe');
      expect(result.entitlements.features).toContain('match');
      expect(result.entitlements.features).toContain('message');
      expect(result.entitlements.features).not.toContain('super_like');
      expect(result.entitlements.features).not.toContain('boost');
    });

    it('should return correct features for premium tier', async () => {
      proxyService.get.mockResolvedValue({ id: 'user-123' });

      const result = await controller.getSession(authorization, mockUser);

      expect(result.entitlements.features).toContain('super_like');
      expect(result.entitlements.features).toContain('boost');
      expect(result.entitlements.features).toContain('passport');
      expect(result.entitlements.features).toContain('hide_ads');
      expect(result.entitlements.features).toContain('priority_likes');
      expect(result.entitlements.features).toContain('read_receipts');
      expect(result.entitlements.features).toContain('top_picks');
    });

    it('should return correct features for elite tier', async () => {
      const eliteUser: JwtPayload = {
        ...mockUser,
        subscription: 'elite',
      };

      proxyService.get.mockResolvedValue({ id: 'user-123' });

      const result = await controller.getSession(authorization, eliteUser);

      expect(result.entitlements.features).toContain('incognito');
      expect(result.entitlements.features).toContain('message_before_match');
      expect(result.entitlements.features).toContain('verified_badge');
      expect(result.entitlements.features).toContain('concierge');
    });

    it('should include session creation and expiration times from JWT', async () => {
      proxyService.get.mockResolvedValue({ id: 'user-123' });

      const result = await controller.getSession(authorization, mockUser);

      expect(result.session.createdAt).toBeDefined();
      expect(result.session.expiresAt).toBeDefined();

      // Verify timestamps are ISO strings
      expect(new Date(result.session.createdAt).toISOString()).toBe(result.session.createdAt);
      expect(new Date(result.session.expiresAt).toISOString()).toBe(result.session.expiresAt);
    });

    it('should handle missing user in JWT gracefully', async () => {
      const userData = { id: 'user-123', email: 'test@example.com' };
      proxyService.get.mockResolvedValue(userData);

      const result = await controller.getSession(authorization, mockUser);

      expect(result.user.id).toBe('user-123');
    });

    it('should fetch data from multiple services in parallel', async () => {
      const getCallOrder: string[] = [];

      proxyService.get.mockImplementation((service, path) => {
        getCallOrder.push(path);
        return Promise.resolve({});
      });

      await controller.getSession(authorization, mockUser);

      // All three calls should be made
      expect(proxyService.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('Tier limits', () => {
    const authorization = 'Bearer token';

    const testCases = [
      {
        tier: 'free',
        expectedLimits: { dailyLikes: 50, dailySuperLikes: 1, dailyBoosts: 0 },
      },
      {
        tier: 'basic',
        expectedLimits: { dailyLikes: 100, dailySuperLikes: 3, dailyBoosts: 1 },
      },
      {
        tier: 'plus',
        expectedLimits: { dailyLikes: 200, dailySuperLikes: 5, dailyBoosts: 3 },
      },
      {
        tier: 'premium',
        expectedLimits: { dailyLikes: -1, dailySuperLikes: 10, dailyBoosts: 5 },
      },
      {
        tier: 'premium_plus',
        expectedLimits: { dailyLikes: -1, dailySuperLikes: -1, dailyBoosts: -1 },
      },
      {
        tier: 'elite',
        expectedLimits: { dailyLikes: -1, dailySuperLikes: -1, dailyBoosts: -1 },
      },
    ];

    testCases.forEach(({ tier, expectedLimits }) => {
      it(`should return correct limits for ${tier} tier`, async () => {
        const user: JwtPayload = {
          sub: 'user-123',
          email: 'test@example.com',
          roles: ['user'],
          subscription: tier,
          deviceId: 'device-456',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        };

        proxyService.get.mockResolvedValue({ id: 'user-123' });

        const result = await controller.getSession(authorization, user);

        expect(result.entitlements.limits.dailyLikes).toBe(expectedLimits.dailyLikes);
        expect(result.entitlements.limits.dailySuperLikes).toBe(expectedLimits.dailySuperLikes);
        expect(result.entitlements.limits.dailyBoosts).toBe(expectedLimits.dailyBoosts);
      });
    });
  });
});
