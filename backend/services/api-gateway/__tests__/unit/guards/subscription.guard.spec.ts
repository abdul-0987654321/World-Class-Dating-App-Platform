import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SubscriptionGuard } from '../../../src/guards/subscription.guard';
import { SUBSCRIPTION_KEY, SubscriptionTier } from '../../../src/decorators/subscription.decorator';

describe('SubscriptionGuard', () => {
  let guard: SubscriptionGuard;
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

    guard = new SubscriptionGuard(reflector);
    jest.clearAllMocks();
  });

  describe('No required subscription', () => {
    it('should allow access when no subscription is required', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const context = createMockExecutionContext({ subscription: 'free' });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when required subscription is null', () => {
      reflector.getAllAndOverride.mockReturnValue(null);

      const context = createMockExecutionContext({ subscription: 'free' });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('No user', () => {
    it('should deny access when user is undefined', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.BASIC);

      const context = createMockExecutionContext(undefined);
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should deny access when user is null', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.BASIC);

      const context = createMockExecutionContext(null);
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });
  });

  describe('Tier hierarchy - Free tier', () => {
    it('should allow free user to access free-tier features', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.FREE);

      const context = createMockExecutionContext({ subscription: 'free' });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny free user access to basic-tier features', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.BASIC);

      const context = createMockExecutionContext({ subscription: 'free' });

      expect(() => guard.canActivate(context)).toThrow(HttpException);
    });

    it('should deny free user access to premium features with proper error message', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.PREMIUM);

      const context = createMockExecutionContext({ subscription: 'free' });

      try {
        guard.canActivate(context);
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
        const response = (error as HttpException).getResponse() as any;
        expect(response.code).toBe('UPGRADE_REQUIRED');
        expect(response.required_plan).toBe(SubscriptionTier.PREMIUM);
        expect(response.current_plan).toBe('free');
      }
    });
  });

  describe('Tier hierarchy - Basic tier', () => {
    it('should allow basic user to access free-tier features', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.FREE);

      const context = createMockExecutionContext({ subscription: 'basic' });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow basic user to access basic-tier features', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.BASIC);

      const context = createMockExecutionContext({ subscription: 'basic' });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny basic user access to plus-tier features', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.PLUS);

      const context = createMockExecutionContext({ subscription: 'basic' });

      expect(() => guard.canActivate(context)).toThrow(HttpException);
    });
  });

  describe('Tier hierarchy - Plus tier', () => {
    it('should allow plus user to access basic-tier features', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.BASIC);

      const context = createMockExecutionContext({ subscription: 'plus' });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow plus user to access plus-tier features', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.PLUS);

      const context = createMockExecutionContext({ subscription: 'plus' });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny plus user access to premium-tier features', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.PREMIUM);

      const context = createMockExecutionContext({ subscription: 'plus' });

      expect(() => guard.canActivate(context)).toThrow(HttpException);
    });
  });

  describe('Tier hierarchy - Premium tier', () => {
    it('should allow premium user to access plus-tier features', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.PLUS);

      const context = createMockExecutionContext({ subscription: 'premium' });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow premium user to access premium-tier features', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.PREMIUM);

      const context = createMockExecutionContext({ subscription: 'premium' });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny premium user access to premium_plus-tier features', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.PREMIUM_PLUS);

      const context = createMockExecutionContext({ subscription: 'premium' });

      expect(() => guard.canActivate(context)).toThrow(HttpException);
    });
  });

  describe('Tier hierarchy - Premium Plus tier', () => {
    it('should allow premium_plus user to access premium-tier features', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.PREMIUM);

      const context = createMockExecutionContext({ subscription: 'premium_plus' });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow premium_plus user to access premium_plus-tier features', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.PREMIUM_PLUS);

      const context = createMockExecutionContext({ subscription: 'premium_plus' });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny premium_plus user access to elite-tier features', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.ELITE);

      const context = createMockExecutionContext({ subscription: 'premium_plus' });

      expect(() => guard.canActivate(context)).toThrow(HttpException);
    });
  });

  describe('Tier hierarchy - Elite tier', () => {
    it('should allow elite user to access all tier features', () => {
      const tiers = [
        SubscriptionTier.FREE,
        SubscriptionTier.BASIC,
        SubscriptionTier.PLUS,
        SubscriptionTier.PREMIUM,
        SubscriptionTier.PREMIUM_PLUS,
        SubscriptionTier.ELITE,
      ];

      tiers.forEach((tier) => {
        reflector.getAllAndOverride.mockReturnValue(tier);
        const context = createMockExecutionContext({ subscription: 'elite' });
        const result = guard.canActivate(context);
        expect(result).toBe(true);
      });
    });
  });

  describe('Case insensitivity', () => {
    it('should handle uppercase subscription tier from user', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.PREMIUM);

      const context = createMockExecutionContext({ subscription: 'PREMIUM' });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle mixed case subscription tier from user', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.BASIC);

      const context = createMockExecutionContext({ subscription: 'Basic' });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Default to free tier', () => {
    it('should default to free tier when subscription is undefined', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.FREE);

      const context = createMockExecutionContext({ subscription: undefined });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should default to free tier when subscription is empty string', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.FREE);

      const context = createMockExecutionContext({ subscription: '' });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access to higher tiers when subscription is missing', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.BASIC);

      const context = createMockExecutionContext({});

      expect(() => guard.canActivate(context)).toThrow(HttpException);
    });
  });

  describe('Unknown subscription tiers', () => {
    it('should treat unknown user tier as level 0 (equivalent to free)', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.BASIC);

      const context = createMockExecutionContext({ subscription: 'unknown_tier' });

      expect(() => guard.canActivate(context)).toThrow(HttpException);
    });

    it('should treat unknown required tier as level 0', () => {
      reflector.getAllAndOverride.mockReturnValue('unknown_tier');

      const context = createMockExecutionContext({ subscription: 'free' });
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Error response format', () => {
    it('should return 402 Payment Required status', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.PREMIUM);

      const context = createMockExecutionContext({ subscription: 'free' });

      try {
        guard.canActivate(context);
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
      }
    });

    it('should include human-readable tier name in message', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.PREMIUM);

      const context = createMockExecutionContext({ subscription: 'free' });

      try {
        guard.canActivate(context);
        fail('Expected HttpException to be thrown');
      } catch (error) {
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toContain('Premium');
      }
    });

    it('should include upgrade call-to-action in message', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.PLUS);

      const context = createMockExecutionContext({ subscription: 'basic' });

      try {
        guard.canActivate(context);
        fail('Expected HttpException to be thrown');
      } catch (error) {
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toContain('upgrade');
      }
    });
  });

  describe('Reflector usage', () => {
    it('should check subscription requirement from handler and class', () => {
      reflector.getAllAndOverride.mockReturnValue(SubscriptionTier.BASIC);

      const mockHandler = jest.fn();
      const mockClass = jest.fn();

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { subscription: 'basic' } }),
        }),
        getHandler: () => mockHandler,
        getClass: () => mockClass,
      } as unknown as ExecutionContext;

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(SUBSCRIPTION_KEY, [
        mockHandler,
        mockClass,
      ]);
    });
  });

  describe('Subscription tier enum values', () => {
    it('should have correct values for all tiers', () => {
      expect(SubscriptionTier.FREE).toBe('free');
      expect(SubscriptionTier.BASIC).toBe('basic');
      expect(SubscriptionTier.PLUS).toBe('plus');
      expect(SubscriptionTier.PREMIUM).toBe('premium');
      expect(SubscriptionTier.PREMIUM_PLUS).toBe('premium_plus');
      expect(SubscriptionTier.ELITE).toBe('elite');
    });
  });
});
