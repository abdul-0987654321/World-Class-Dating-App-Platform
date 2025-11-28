/**
 * Premium Gates Middleware
 * Enforces feature restrictions based on subscription tier
 */

import { Request, Response, NextFunction } from 'express';
import { dailyLimitsService, TIER_LIMITS, SubscriptionTier, ResourceType } from '../services/core/DailyLimits.service';
import { logger } from '../utils/logger';
import { db } from '../config/database.config';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email?: string;
        tier?: SubscriptionTier;
      };
      tierLimits?: typeof TIER_LIMITS[SubscriptionTier];
    }
  }
}

/**
 * Get user's subscription tier from database
 */
async function getUserTier(userId: string): Promise<SubscriptionTier> {
  try {
    const user = await db('users')
      .where('id', userId)
      .select('subscription_tier')
      .first();

    if (!user) return 'FREE';

    const tier = (user.subscription_tier || 'free').toUpperCase();
    return (tier in TIER_LIMITS) ? tier as SubscriptionTier : 'FREE';
  } catch (error) {
    logger.error('Error fetching user tier:', error);
    return 'FREE';
  }
}

/**
 * Attach user's tier and limits to request
 */
export const attachTierInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next();
    }

    const tier = await getUserTier(userId);
    req.user!.tier = tier;
    req.tierLimits = TIER_LIMITS[tier];

    next();
  } catch (error) {
    logger.error('Error attaching tier info:', error);
    next();
  }
};

/**
 * Check if user can use a limited resource
 */
export const checkResourceLimit = (resourceType: ResourceType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const tier = req.user?.tier || await getUserTier(userId);
      const result = await dailyLimitsService.checkLimit(userId, resourceType, tier);

      if (!result.allowed) {
        const prompt = dailyLimitsService.getUpgradePrompt(
          resourceType,
          result.suggestedTier || 'GOLD'
        );

        res.status(429).json({
          success: false,
          error: {
            code: 'LIMIT_EXCEEDED',
            message: prompt.message,
            title: prompt.title,
            resourceType,
            limit: result.limit,
            resetsAt: result.resetsAt.toISOString(),
            timeUntilReset: dailyLimitsService.getTimeUntilReset(),
          },
          upgrade: {
            suggestedTier: result.suggestedTier,
            ctaText: prompt.ctaText,
            upgradeUrl: '/subscription/upgrade',
          },
        });
        return;
      }

      // Attach remaining count to request for later use
      (req as any).resourceRemaining = result.remaining;
      next();
    } catch (error) {
      logger.error(`Error checking ${resourceType} limit:`, error);
      next(error);
    }
  };
};

/**
 * Record resource usage after successful action
 */
export const recordResourceUsage = (resourceType: ResourceType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return next();
      }

      const tier = req.user?.tier || 'FREE';
      await dailyLimitsService.incrementUsage(userId, resourceType, tier);
      next();
    } catch (error) {
      logger.error(`Error recording ${resourceType} usage:`, error);
      next();
    }
  };
};

/**
 * Require a premium feature
 */
export const requirePremiumFeature = (
  feature: 'advancedFilters' | 'seeWhoLikedYou' | 'readReceipts' | 'incognitoMode' | 'priorityLikes' | 'unlimitedRewinds'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const tier = req.user?.tier || await getUserTier(userId);
      const hasFeature = dailyLimitsService.isPremiumFeatureAvailable(tier, feature);

      if (!hasFeature) {
        const featureNames: Record<string, { name: string; minTier: SubscriptionTier }> = {
          advancedFilters: { name: 'Advanced Filters', minTier: 'GOLD' },
          seeWhoLikedYou: { name: 'See Who Liked You', minTier: 'GOLD' },
          readReceipts: { name: 'Read Receipts', minTier: 'PLATINUM' },
          incognitoMode: { name: 'Incognito Mode', minTier: 'PLATINUM' },
          priorityLikes: { name: 'Priority Likes', minTier: 'PLATINUM' },
          unlimitedRewinds: { name: 'Unlimited Rewinds', minTier: 'DIAMOND' },
        };

        const featureInfo = featureNames[feature];

        res.status(403).json({
          success: false,
          error: {
            code: 'PREMIUM_REQUIRED',
            message: `${featureInfo.name} is a premium feature`,
            feature,
            featureName: featureInfo.name,
            currentTier: tier,
            requiredTier: featureInfo.minTier,
          },
          upgrade: {
            suggestedTier: featureInfo.minTier,
            upgradeUrl: '/subscription/upgrade',
          },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error(`Error checking premium feature ${feature}:`, error);
      next(error);
    }
  };
};

/**
 * Gate for "See Who Liked You" feature - blur profiles for free users
 */
export const blurLikesForFreeUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next();
    }

    const tier = req.user?.tier || await getUserTier(userId);
    const canSeeLikes = dailyLimitsService.isPremiumFeatureAvailable(tier, 'seeWhoLikedYou');

    // Attach blur setting to request
    (req as any).blurLikes = !canSeeLikes;
    (req as any).canSeeLikes = canSeeLikes;

    next();
  } catch (error) {
    logger.error('Error checking likes visibility:', error);
    next();
  }
};

/**
 * Apply read receipts based on subscription
 */
export const applyReadReceipts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next();
    }

    const tier = req.user?.tier || await getUserTier(userId);
    const hasReadReceipts = dailyLimitsService.isPremiumFeatureAvailable(tier, 'readReceipts');

    (req as any).showReadReceipts = hasReadReceipts;
    next();
  } catch (error) {
    logger.error('Error applying read receipts:', error);
    next();
  }
};

/**
 * Check if user is in incognito mode
 */
export const checkIncognitoMode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next();
    }

    const tier = req.user?.tier || await getUserTier(userId);
    const canUseIncognito = dailyLimitsService.isPremiumFeatureAvailable(tier, 'incognitoMode');

    // Check if user has incognito enabled in privacy settings
    if (canUseIncognito) {
      const privacySettings = await db('user_privacy_settings')
        .where('user_id', userId)
        .select('incognito_mode')
        .first();

      (req as any).isIncognito = privacySettings?.incognito_mode || false;
    } else {
      (req as any).isIncognito = false;
    }

    next();
  } catch (error) {
    logger.error('Error checking incognito mode:', error);
    next();
  }
};

/**
 * Middleware factory for combining multiple premium checks
 */
export const premiumGate = {
  // Shorthand for common resource limits
  likes: checkResourceLimit('likes'),
  swipes: checkResourceLimit('swipes'),
  superLikes: checkResourceLimit('superLikes'),
  rewinds: checkResourceLimit('rewinds'),
  boosts: checkResourceLimit('boosts'),
  messages: checkResourceLimit('messages'),
  profileViews: checkResourceLimit('profileViews'),

  // Shorthand for premium features
  advancedFilters: requirePremiumFeature('advancedFilters'),
  seeWhoLikedYou: requirePremiumFeature('seeWhoLikedYou'),
  readReceipts: requirePremiumFeature('readReceipts'),
  incognito: requirePremiumFeature('incognitoMode'),
  priorityLikes: requirePremiumFeature('priorityLikes'),
  unlimitedRewinds: requirePremiumFeature('unlimitedRewinds'),
};

export default {
  attachTierInfo,
  checkResourceLimit,
  recordResourceUsage,
  requirePremiumFeature,
  blurLikesForFreeUsers,
  applyReadReceipts,
  checkIncognitoMode,
  premiumGate,
};
