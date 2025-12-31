/**
 * Server-side Subscription Enforcement Middleware
 *
 * CRITICAL: This middleware enforces subscription tier requirements server-side.
 * Never rely on frontend for billing enforcement as it can be bypassed.
 *
 * @module SubscriptionEnforcementMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import createLogger from '../utils/logger';

const logger = createLogger('subscription-enforcement');

// Subscription tier hierarchy (higher number = more access)
export const TIER_HIERARCHY = {
  free: 0,
  basic: 1,
  plus: 2,
  premium: 3,
  premium_plus: 4,
  elite: 5,
} as const;

export type SubscriptionTier = keyof typeof TIER_HIERARCHY;

// Map legacy frontend tier names to backend tier names
export const LEGACY_TIER_MAP: Record<string, SubscriptionTier> = {
  FREE: 'free',
  GOLD: 'basic',
  PLATINUM: 'plus',
  DIAMOND: 'premium',
  ELITE: 'elite',
};

// Feature to minimum tier mapping
export const FEATURE_TIER_REQUIREMENTS: Record<string, SubscriptionTier> = {
  // Basic tier features
  unlimited_likes: 'basic',
  see_who_likes_you: 'basic',
  rewind: 'basic',
  basic_filters: 'basic',

  // Plus tier features
  advanced_filters: 'plus',
  read_receipts: 'plus',
  priority_likes: 'plus',
  incognito_mode: 'plus',

  // Premium tier features
  super_likes_unlimited: 'premium',
  boost_unlimited: 'premium',
  video_call: 'premium',
  ai_matchmaking: 'premium',
  verified_badge: 'premium',

  // Premium+ tier features
  passport: 'premium_plus',
  message_before_match: 'premium_plus',
  priority_support: 'premium_plus',

  // Elite tier features
  vip_badge: 'elite',
  dedicated_coach: 'elite',
  luxury_date_planning: 'elite',
  background_checked_matches: 'elite',
};

// Daily usage limits by tier
export const TIER_DAILY_LIMITS: Record<SubscriptionTier, {
  swipes: number;
  likes: number;
  super_likes: number;
  boosts: number;
  messages: number;
}> = {
  free: {
    swipes: 50,
    likes: 25,
    super_likes: 1,
    boosts: 0,
    messages: 50,
  },
  basic: {
    swipes: 999999,
    likes: 999999,
    super_likes: 5,
    boosts: 1,
    messages: 999999,
  },
  plus: {
    swipes: 999999,
    likes: 999999,
    super_likes: 10,
    boosts: 3,
    messages: 999999,
  },
  premium: {
    swipes: 999999,
    likes: 999999,
    super_likes: 999999,
    boosts: 999999,
    messages: 999999,
  },
  premium_plus: {
    swipes: 999999,
    likes: 999999,
    super_likes: 999999,
    boosts: 999999,
    messages: 999999,
  },
  elite: {
    swipes: 999999,
    likes: 999999,
    super_likes: 999999,
    boosts: 999999,
    messages: 999999,
  },
};

// Extended request interface with subscription info
export interface SubscriptionRequest extends Request {
  user?: {
    id?: string;
    userId?: string;
    email?: string;
    [key: string]: any;
  };
  subscription?: {
    tier: SubscriptionTier;
    status: 'active' | 'canceled' | 'past_due' | 'grace_period' | 'expired';
    isActive: boolean;
    currentPeriodEnd?: Date;
    gracePeriodEnd?: Date;
  };
}

// Interface for subscription lookup function
export type SubscriptionLookupFn = (userId: string) => Promise<{
  tier: SubscriptionTier;
  status: string;
  currentPeriodEnd?: Date;
  gracePeriodEnd?: Date;
} | null>;

/**
 * Normalize tier name to canonical backend format
 */
export function normalizeTier(tier: string | undefined): SubscriptionTier {
  if (!tier) return 'free';

  const normalized = tier.toLowerCase();

  // Check if it's already a valid tier
  if (normalized in TIER_HIERARCHY) {
    return normalized as SubscriptionTier;
  }

  // Check legacy mapping
  const legacy = LEGACY_TIER_MAP[tier.toUpperCase()];
  if (legacy) {
    return legacy;
  }

  logger.warn('Unknown tier, defaulting to free', { originalTier: tier });
  return 'free';
}

/**
 * Check if a tier meets the minimum requirement
 */
export function meetsTierRequirement(
  userTier: SubscriptionTier,
  requiredTier: SubscriptionTier
): boolean {
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
}

/**
 * Check if user has access to a specific feature
 */
export function hasFeatureAccess(
  userTier: SubscriptionTier,
  feature: string
): boolean {
  const requiredTier = FEATURE_TIER_REQUIREMENTS[feature];
  if (!requiredTier) {
    // Feature not in list = available to all
    return true;
  }
  return meetsTierRequirement(userTier, requiredTier);
}

/**
 * Get daily limits for a tier
 */
export function getDailyLimits(tier: SubscriptionTier) {
  return TIER_DAILY_LIMITS[tier] || TIER_DAILY_LIMITS.free;
}

/**
 * Factory to create subscription enforcement middleware
 *
 * @param getSubscription - Function to lookup subscription from database
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * import { createSubscriptionMiddleware } from '@flamoral/backend-shared';
 *
 * const subscriptionMiddleware = createSubscriptionMiddleware(async (userId) => {
 *   return await subscriptionRepository.findByUserId(userId);
 * });
 *
 * app.use('/api/premium', subscriptionMiddleware);
 * ```
 */
export function createSubscriptionMiddleware(
  getSubscription: SubscriptionLookupFn
) {
  return async (
    req: SubscriptionRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.userId;

      if (!userId) {
        // No user = free tier (for public endpoints that optionally use subscription)
        req.subscription = {
          tier: 'free',
          status: 'active',
          isActive: true,
        };
        return next();
      }

      const subscription = await getSubscription(userId);

      if (!subscription) {
        // No subscription record = free tier
        req.subscription = {
          tier: 'free',
          status: 'active',
          isActive: true,
        };
        return next();
      }

      const normalizedTier = normalizeTier(subscription.tier);
      const now = new Date();

      // Check if subscription is active
      let isActive = subscription.status === 'active';

      // Grace period check
      if (subscription.status === 'grace_period' && subscription.gracePeriodEnd) {
        isActive = new Date(subscription.gracePeriodEnd) > now;
      }

      // Past due can still have access until period ends
      if (subscription.status === 'past_due' && subscription.currentPeriodEnd) {
        isActive = new Date(subscription.currentPeriodEnd) > now;
      }

      req.subscription = {
        tier: isActive ? normalizedTier : 'free',
        status: subscription.status as 'active' | 'canceled' | 'past_due' | 'grace_period' | 'expired',
        isActive,
        currentPeriodEnd: subscription.currentPeriodEnd,
        gracePeriodEnd: subscription.gracePeriodEnd,
      };

      logger.debug('Subscription loaded', {
        userId,
        tier: req.subscription.tier,
        status: req.subscription.status,
        isActive,
      });

      next();
    } catch (error) {
      logger.error('Error loading subscription', { error });
      // Fail safe to free tier on error
      req.subscription = {
        tier: 'free',
        status: 'active',
        isActive: true,
      };
      next();
    }
  };
}

/**
 * Middleware to require a minimum subscription tier
 *
 * @param requiredTier - Minimum tier required to access the route
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * router.get('/premium-feature',
 *   requireTier('premium'),
 *   (req, res) => res.json({ premium: true })
 * );
 * ```
 */
export function requireTier(requiredTier: SubscriptionTier) {
  return (req: SubscriptionRequest, res: Response, next: NextFunction): void => {
    const subscription = req.subscription;

    if (!subscription) {
      logger.warn('No subscription data on request - ensure subscription middleware is applied first');
      res.status(500).json({
        error: 'subscription_check_failed',
        message: 'Unable to verify subscription status',
      });
      return;
    }

    if (!subscription.isActive) {
      res.status(402).json({
        error: 'subscription_inactive',
        message: 'Your subscription is not active. Please update your payment method.',
        status: subscription.status,
        requiredTier,
      });
      return;
    }

    if (!meetsTierRequirement(subscription.tier, requiredTier)) {
      logger.info('Access denied - tier requirement not met', {
        userId: req.user?.id,
        userTier: subscription.tier,
        requiredTier,
      });

      res.status(403).json({
        error: 'tier_required',
        message: `This feature requires ${requiredTier} tier or higher`,
        currentTier: subscription.tier,
        requiredTier,
        upgradeUrl: '/subscription',
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require a specific feature
 *
 * @param feature - Feature key to check access for
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * router.post('/super-like',
 *   requireFeature('super_likes_unlimited'),
 *   superLikeController
 * );
 * ```
 */
export function requireFeature(feature: string) {
  return (req: SubscriptionRequest, res: Response, next: NextFunction): void => {
    const subscription = req.subscription;

    if (!subscription) {
      res.status(500).json({
        error: 'subscription_check_failed',
        message: 'Unable to verify subscription status',
      });
      return;
    }

    if (!subscription.isActive) {
      res.status(402).json({
        error: 'subscription_inactive',
        message: 'Your subscription is not active',
      });
      return;
    }

    if (!hasFeatureAccess(subscription.tier, feature)) {
      const requiredTier = FEATURE_TIER_REQUIREMENTS[feature] || 'premium';

      logger.info('Feature access denied', {
        userId: req.user?.id,
        feature,
        userTier: subscription.tier,
        requiredTier,
      });

      res.status(403).json({
        error: 'feature_not_available',
        message: `The ${feature} feature requires ${requiredTier} tier or higher`,
        feature,
        currentTier: subscription.tier,
        requiredTier,
        upgradeUrl: '/subscription',
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to check and decrement usage limits
 *
 * @param resource - Resource type to check (swipes, likes, super_likes, boosts, messages)
 * @param getUsage - Function to get current usage count
 * @param incrementUsage - Function to increment usage count
 * @returns Express middleware function
 */
export function checkUsageLimit(
  resource: keyof typeof TIER_DAILY_LIMITS['free'],
  getUsage: (userId: string, resource: string) => Promise<number>,
  incrementUsage: (userId: string, resource: string) => Promise<void>
) {
  return async (
    req: SubscriptionRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      const tier = req.subscription?.tier || 'free';
      const limits = getDailyLimits(tier);
      const limit = limits[resource];

      // Unlimited (represented by 999999)
      if (limit >= 999999) {
        await incrementUsage(userId, resource);
        return next();
      }

      const currentUsage = await getUsage(userId, resource);

      if (currentUsage >= limit) {
        logger.info('Usage limit reached', {
          userId,
          resource,
          currentUsage,
          limit,
          tier,
        });

        res.status(429).json({
          error: 'usage_limit_reached',
          message: `You've reached your daily ${resource} limit`,
          resource,
          limit,
          currentUsage,
          tier,
          upgradeUrl: '/subscription',
          resetAt: getNextDayMidnight(),
        });
        return;
      }

      // Increment usage and continue
      await incrementUsage(userId, resource);
      next();
    } catch (error) {
      logger.error('Error checking usage limit', { error, resource });
      // Fail open to not block legitimate usage
      next();
    }
  };
}

function getNextDayMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

export default {
  createSubscriptionMiddleware,
  requireTier,
  requireFeature,
  checkUsageLimit,
  normalizeTier,
  meetsTierRequirement,
  hasFeatureAccess,
  getDailyLimits,
  TIER_HIERARCHY,
  TIER_DAILY_LIMITS,
  FEATURE_TIER_REQUIREMENTS,
  LEGACY_TIER_MAP,
};
