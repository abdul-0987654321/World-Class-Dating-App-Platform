/**
 * Subscription Routes
 * Endpoints for subscription management and plans
 */

import { Router, Request, Response, NextFunction } from 'express';
import { AuthMiddleware } from '../../middleware/auth.middleware.enhanced';
import { logger } from '../../utils/logger';
import { db } from '../../config/database.config';

const router = Router();

// Helper to get user ID from request
const getUserId = (req: Request): string => {
  return (req as any).user?.userId || req.headers['x-user-id'] as string || 'demo_user';
};

// Subscription plans configuration
const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: null,
    features: [
      '50 likes per day',
      '1 Super Like per day',
      'Basic profile',
      'Limited discovery',
    ],
    limits: {
      dailyLikes: 50,
      dailySuperLikes: 1,
      dailyBoosts: 0,
      seeWhoLikesYou: false,
      unlimitedRewinds: false,
      advancedFilters: false,
      readReceipts: false,
      priorityLikes: false,
      incognitoMode: false,
    },
  },
  {
    id: 'gold',
    name: 'Gold',
    price: 14.99,
    interval: 'month',
    features: [
      '200 likes per day',
      '5 Super Likes per day',
      '1 Boost per month',
      'See who likes you',
      'Unlimited rewinds',
      'Passport (change location)',
    ],
    limits: {
      dailyLikes: 200,
      dailySuperLikes: 5,
      dailyBoosts: 1,
      seeWhoLikesYou: true,
      unlimitedRewinds: true,
      advancedFilters: false,
      readReceipts: false,
      priorityLikes: false,
      incognitoMode: false,
    },
  },
  {
    id: 'platinum',
    name: 'Platinum',
    price: 24.99,
    interval: 'month',
    features: [
      '500 likes per day',
      '10 Super Likes per day',
      '3 Boosts per month',
      'See who likes you',
      'Unlimited rewinds',
      'Advanced filters',
      'Read receipts',
      'Priority likes',
      'Message before match',
    ],
    limits: {
      dailyLikes: 500,
      dailySuperLikes: 10,
      dailyBoosts: 3,
      seeWhoLikesYou: true,
      unlimitedRewinds: true,
      advancedFilters: true,
      readReceipts: true,
      priorityLikes: true,
      incognitoMode: false,
    },
  },
  {
    id: 'diamond',
    name: 'Diamond',
    price: 49.99,
    interval: 'month',
    features: [
      'Unlimited likes',
      '15 Super Likes per day',
      '5 Boosts per month',
      'See who likes you',
      'Unlimited rewinds',
      'Advanced filters',
      'Read receipts',
      'Priority likes',
      'Message before match',
      'Incognito mode',
      'VIP support',
      'Profile boost',
    ],
    limits: {
      dailyLikes: -1, // unlimited
      dailySuperLikes: 15,
      dailyBoosts: 5,
      seeWhoLikesYou: true,
      unlimitedRewinds: true,
      advancedFilters: true,
      readReceipts: true,
      priorityLikes: true,
      incognitoMode: true,
    },
  },
];

/**
 * @swagger
 * /api/subscriptions/plans:
 *   get:
 *     summary: Get available subscription plans
 *     tags: [Subscriptions]
 */
router.get('/plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: { plans: SUBSCRIPTION_PLANS },
    });
  } catch (error) {
    logger.error('Get plans error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/subscriptions/status:
 *   get:
 *     summary: Get current user's subscription status
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 */
router.get('/status', AuthMiddleware.verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);

    // Get user's current subscription - correct column name is subscription_expires_at
    const user = await db('users')
      .where('id', userId)
      .select('subscription_tier', 'subscription_expires_at', 'coin_balance')
      .first();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found', code: 'USER_NOT_FOUND' },
      });
    }

    const tier = (user.subscription_tier || 'free').toUpperCase();
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === tier.toLowerCase()) || SUBSCRIPTION_PLANS[0];

    // Check if subscription is active
    const isActive = tier === 'FREE' ||
      (user.subscription_expires_at && new Date(user.subscription_expires_at) > new Date());

    // Get active subscription from subscriptions table if exists
    const activeSubscription = await db('subscriptions')
      .where('user_id', userId)
      .where('status', 'active')
      .first();

    res.json({
      success: true,
      data: {
        tier,
        plan: {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          interval: plan.interval,
        },
        isActive,
        expiresAt: user.subscription_ends_at || null,
        autoRenew: activeSubscription?.auto_renew || false,
        limits: plan.limits,
        features: plan.features,
        coinBalance: user.coin_balance || 0,
      },
    });
  } catch (error) {
    logger.error('Get subscription status error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/subscriptions/subscribe:
 *   post:
 *     summary: Subscribe to a plan
 *     tags: [Subscriptions]
 */
router.post('/subscribe', AuthMiddleware.verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { planId, paymentMethodId, billingPeriod = 'month' } = req.body;

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid plan', code: 'INVALID_PLAN' },
      });
    }

    if (plan.id === 'free') {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot subscribe to free plan', code: 'INVALID_PLAN' },
      });
    }

    // In production, process payment through Stripe/payment provider here
    // For demo, we'll simulate successful subscription

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    if (billingPeriod === 'year') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Create subscription record
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db('subscriptions').insert({
      id: subscriptionId,
      user_id: userId,
      plan_id: planId,
      status: 'active',
      current_period_start: startDate,
      current_period_end: endDate,
      auto_renew: true,
      payment_method_id: paymentMethodId,
      created_at: new Date(),
    });

    // Update user's subscription tier
    await db('users')
      .where('id', userId)
      .update({
        subscription_tier: planId.toUpperCase(),
        subscription_ends_at: endDate,
      });

    res.json({
      success: true,
      data: {
        subscriptionId,
        plan: plan.name,
        startsAt: startDate.toISOString(),
        expiresAt: endDate.toISOString(),
        autoRenew: true,
      },
    });
  } catch (error) {
    logger.error('Subscribe error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/subscriptions/cancel:
 *   post:
 *     summary: Cancel subscription (at end of period)
 *     tags: [Subscriptions]
 */
router.post('/cancel', AuthMiddleware.verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);

    const subscription = await db('subscriptions')
      .where('user_id', userId)
      .where('status', 'active')
      .first();

    if (!subscription) {
      return res.status(400).json({
        success: false,
        error: { message: 'No active subscription', code: 'NO_SUBSCRIPTION' },
      });
    }

    // Set to cancel at end of period
    await db('subscriptions')
      .where('id', subscription.id)
      .update({
        auto_renew: false,
        cancel_at_period_end: true,
        canceled_at: new Date(),
      });

    res.json({
      success: true,
      data: {
        message: 'Subscription will be canceled at the end of the billing period',
        cancelsAt: subscription.current_period_end,
      },
    });
  } catch (error) {
    logger.error('Cancel subscription error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/subscriptions/reactivate:
 *   post:
 *     summary: Reactivate a canceled subscription
 *     tags: [Subscriptions]
 */
router.post('/reactivate', AuthMiddleware.verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);

    const subscription = await db('subscriptions')
      .where('user_id', userId)
      .where('status', 'active')
      .where('cancel_at_period_end', true)
      .first();

    if (!subscription) {
      return res.status(400).json({
        success: false,
        error: { message: 'No cancellation to reverse', code: 'NO_CANCELLATION' },
      });
    }

    await db('subscriptions')
      .where('id', subscription.id)
      .update({
        auto_renew: true,
        cancel_at_period_end: false,
        canceled_at: null,
      });

    res.json({
      success: true,
      data: { message: 'Subscription reactivated' },
    });
  } catch (error) {
    logger.error('Reactivate subscription error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/subscriptions/history:
 *   get:
 *     summary: Get subscription history
 *     tags: [Subscriptions]
 */
router.get('/history', AuthMiddleware.verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);

    const history = await db('subscriptions')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .select('id', 'tier', 'status', 'current_period_start', 'current_period_end', 'created_at');

    res.json({
      success: true,
      data: { history },
    });
  } catch (error) {
    logger.error('Get subscription history error:', error);
    next(error);
  }
});

export default router;
