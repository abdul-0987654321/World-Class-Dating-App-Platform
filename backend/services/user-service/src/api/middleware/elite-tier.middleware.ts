import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import logger from '../../utils/logger';

/**
 * Middleware to require Elite tier subscription for access
 * Must be used after authenticate middleware
 */
export const requireEliteTier = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        correlationId: req.correlationId,
      });
    }

    const subscriptionTier = req.user.subscriptionTier?.toLowerCase();

    // Check if user has Elite tier subscription
    if (subscriptionTier !== 'elite') {
      logger.info(
        `Elite tier access denied for user ${req.user.userId} with tier: ${subscriptionTier}`,
        { correlationId: req.correlationId }
      );

      return res.status(403).json({
        success: false,
        message: 'This feature requires an Elite subscription',
        code: 'ELITE_TIER_REQUIRED',
        upgrade_url: '/subscription/upgrade?tier=elite',
        correlationId: req.correlationId,
      });
    }

    // Check subscription status
    const subscriptionStatus = req.user.subscriptionStatus?.toLowerCase();
    if (subscriptionStatus && !['active', 'trialing'].includes(subscriptionStatus)) {
      logger.info(
        `Elite tier access denied for user ${req.user.userId} - subscription status: ${subscriptionStatus}`,
        { correlationId: req.correlationId }
      );

      return res.status(403).json({
        success: false,
        message: 'Your Elite subscription is not active',
        code: 'SUBSCRIPTION_INACTIVE',
        correlationId: req.correlationId,
      });
    }

    return next();
  } catch (error) {
    logger.error('Elite tier check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking subscription tier',
      correlationId: req.correlationId,
    });
  }
};

/**
 * Middleware to require Premium+ or Elite tier subscription
 * For features available to both tiers
 */
export const requirePremiumPlusOrElite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        correlationId: req.correlationId,
      });
    }

    const subscriptionTier = req.user.subscriptionTier?.toLowerCase();

    // Check if user has Premium+ or Elite tier subscription
    if (!['premium_plus', 'elite'].includes(subscriptionTier || '')) {
      logger.info(
        `Premium+/Elite tier access denied for user ${req.user.userId} with tier: ${subscriptionTier}`,
        { correlationId: req.correlationId }
      );

      return res.status(403).json({
        success: false,
        message: 'This feature requires a Premium+ or Elite subscription',
        code: 'PREMIUM_PLUS_OR_ELITE_REQUIRED',
        upgrade_url: '/subscription/upgrade?tier=premium_plus',
        correlationId: req.correlationId,
      });
    }

    return next();
  } catch (error) {
    logger.error('Premium+/Elite tier check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking subscription tier',
      correlationId: req.correlationId,
    });
  }
};

/**
 * Middleware to check minimum subscription tier
 * Flexible middleware that can be used for any tier requirement
 */
export const requireMinimumTier = (minimumTier: string) => {
  const tierHierarchy: Record<string, number> = {
    free: 0,
    basic: 1,
    plus: 2,
    premium: 3,
    premium_plus: 4,
    elite: 5,
  };

  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          correlationId: req.correlationId,
        });
      }

      const userTier = req.user.subscriptionTier?.toLowerCase() || 'free';
      const userTierLevel = tierHierarchy[userTier] ?? 0;
      const requiredTierLevel = tierHierarchy[minimumTier.toLowerCase()] ?? 0;

      if (userTierLevel < requiredTierLevel) {
        logger.info(
          `Tier access denied for user ${req.user.userId}: has ${userTier}, requires ${minimumTier}`,
          { correlationId: req.correlationId }
        );

        return res.status(403).json({
          success: false,
          message: `This feature requires a ${minimumTier} subscription or higher`,
          code: 'INSUFFICIENT_TIER',
          current_tier: userTier,
          required_tier: minimumTier,
          upgrade_url: `/subscription/upgrade?tier=${minimumTier}`,
          correlationId: req.correlationId,
        });
      }

      return next();
    } catch (error) {
      logger.error('Minimum tier check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking subscription tier',
        correlationId: req.correlationId,
      });
    }
  };
};
