import { createLogger } from '../../utils/logger';
const logger = createLogger('InternalRoutes');

import { Router } from 'express';
import { SubscriptionService } from '../../domain/services/subscription.service';
import { CoinService } from '../../domain/services/coin.service';
import { BoostService } from '../../domain/services/boost.service';
import { authenticateInternal } from '../middleware/internal-auth.middleware';
import { Request, Response } from 'express';

const router = Router();

// All internal routes require service authentication
router.use(authenticateInternal);

/**
 * Internal endpoint: Update subscription from payment-service
 */
router.put('/subscriptions/update', async (req: Request, res: Response) => {
  try {
    const { userId, tier, stripeSubscriptionId, status, currentPeriodEnd } = req.body;

    const subscriptionService = new SubscriptionService();
    const subscription = await subscriptionService.updateSubscriptionTier(userId, tier);

    // Update additional subscription metadata if provided
    if (stripeSubscriptionId || status || currentPeriodEnd) {
      // Additional update logic for stripe subscription ID, status, etc.
      // This would require extending the subscription entity/service
    }

    return res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error: any) {
    logger.error('Internal subscription update error:', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update subscription',
    });
  }
});

/**
 * Internal endpoint: Add coins from payment-service
 */
router.post('/coins/add', async (req: Request, res: Response) => {
  try {
    const { userId, amount, transactionType, stripePaymentId, productSku } = req.body;

    const coinService = new CoinService();

    // Use purchaseCoins for purchases or addCoins for rewards/refunds
    if (transactionType === 'purchase') {
      await coinService.purchaseCoins(userId, productSku, stripePaymentId);
    } else {
      // For rewards/refunds, we'd need to add a different method
      // For now, use purchaseCoins with the stripe payment ID
      await coinService.purchaseCoins(userId, productSku, stripePaymentId);
    }

    const balance = await coinService.getBalance(userId);

    return res.status(200).json({
      success: true,
      data: { balance },
    });
  } catch (error: any) {
    logger.error('Internal add coins error:', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to add coins',
    });
  }
});

/**
 * Internal endpoint: Subtract coins (for refunds)
 */
router.post('/coins/subtract', async (req: Request, res: Response) => {
  try {
    const { userId, amount, reason } = req.body;

    const coinService = new CoinService();
    await coinService.spendCoins(userId, amount, reason);

    const balance = await coinService.getBalance(userId);

    return res.status(200).json({
      success: true,
      data: { balance },
    });
  } catch (error: any) {
    logger.error('Internal subtract coins error:', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to subtract coins',
    });
  }
});

/**
 * Internal endpoint: Activate boost from payment-service
 */
router.post('/boosts/activate', async (req: Request, res: Response) => {
  try {
    const { userId, productSku, durationMinutes, stripePaymentId } = req.body;

    const boostService = new BoostService();
    const boost = await boostService.purchaseBoostWithCoins(userId, productSku);

    return res.status(200).json({
      success: true,
      data: boost,
    });
  } catch (error: any) {
    logger.error('Internal activate boost error:', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to activate boost',
    });
  }
});

/**
 * Internal endpoint: Send notification to user
 */
router.post('/notifications/send', async (req: Request, res: Response) => {
  try {
    const { userId, type, message } = req.body;

    // For now, just log the notification
    // In production, this would integrate with a notification service
    logger.info(`Notification for ${userId} [${type}]: ${message}`);

    return res.status(200).json({
      success: true,
      message: 'Notification sent',
    });
  } catch (error: any) {
    logger.error('Internal notification error:', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send notification',
    });
  }
});

/**
 * Internal endpoint: Get user by ID
 */
router.get('/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Import UserRepository inline to avoid circular dependencies
    const { UserRepository } = await import('../../domain/repositories/user.repository');
    const userRepository = new UserRepository();

    const user = await userRepository.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // Return only safe user data (no password hash)
    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        dateOfBirth: user.date_of_birth,
        gender: user.gender,
        isActive: user.is_active,
        isVerified: user.is_verified,
        subscriptionTier: user.subscription_tier,
        createdAt: user.created_at,
      },
    });
  } catch (error: any) {
    logger.error('Internal get user error:', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user',
    });
  }
});

/**
 * Internal endpoint: Check if user has access to a specific feature
 * Used by other services to check subscription-based feature access
 */
router.get('/users/:userId/features/:featureKey', async (req: Request, res: Response) => {
  try {
    const { userId, featureKey } = req.params;

    const subscriptionService = new SubscriptionService();
    const featureAccess = await subscriptionService.checkFeatureAccess(userId, featureKey);

    return res.status(200).json({
      success: true,
      data: {
        userId,
        featureKey,
        hasAccess: featureAccess.hasAccess,
        limit: featureAccess.limit,
        requiredTier: featureAccess.requiredTier,
      },
    });
  } catch (error: any) {
    logger.error('Internal feature check error:', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to check feature access',
    });
  }
});

/**
 * Internal endpoint: Get user subscription details
 * Returns detailed subscription information for a user
 */
router.get('/users/:userId/subscription', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const subscriptionService = new SubscriptionService();
    const subscription = await subscriptionService.getUserSubscription(userId);

    if (!subscription) {
      // User has no subscription record, return free tier
      return res.status(200).json({
        success: true,
        data: {
          userId,
          tier: 'free',
          status: 'active',
          isActive: true,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        userId,
        tier: subscription.tier,
        status: subscription.status,
        isActive: subscription.status === 'active' || subscription.status === 'trialing',
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    });
  } catch (error: any) {
    logger.error('Internal get subscription error:', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get subscription',
    });
  }
});

export default router;
