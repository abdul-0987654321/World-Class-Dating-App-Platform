/**
 * Payment Routes
 * Subscription management, coin purchases, and transaction history
 * Demonstrates: Authentication, CSRF Protection, Stripe Integration
 */

import { Router, Request, Response } from 'express';
import { AuthMiddleware } from '../../middleware/auth.middleware.enhanced';
import { CSRFProtection } from '../../middleware/csrf.middleware';
import { logger } from '../../utils/logger';
import { PaymentService } from '../../services/core';
import { PaymentRepository, UserRepository } from '../../repositories';
import { db } from '../../config/database.config';
import { stripeService } from '../../services/integrations/stripe/stripe.service';

const router = Router();

// Initialize services
const paymentRepo = new PaymentRepository(db);
const userRepo = new UserRepository(db);
const paymentService = new PaymentService(paymentRepo, userRepo);

/**
 * GET /api/payments/subscription
 * Get current user's subscription status
 * Requires: Authentication
 */
router.get('/subscription', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const subscription = await paymentRepo.getSubscription(userId);

    res.status(200).json({
      success: true,
      data: {
        subscription,
        hasActiveSubscription: subscription?.status === 'active' || subscription?.status === 'trialing',
      },
    });
  } catch (error: any) {
    logger.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get subscription',
        code: 'SUBSCRIPTION_GET_ERROR',
      },
    });
  }
});

/**
 * GET /api/payments/plans
 * Get available subscription plans and pricing
 * Public endpoint
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const prices = paymentService.getSubscriptionPrices();

    const plans = {
      premium: {
        name: 'Premium',
        features: [
          'Unlimited likes',
          'See who likes you',
          '5 Super Likes per day',
          'Rewind last swipe',
          'Passport (change location)',
          'No ads',
        ],
        pricing: {
          monthly: {
            amount: prices.premium.monthly / 100,
            currency: 'USD',
            interval: 'month',
          },
          yearly: {
            amount: prices.premium.yearly / 100,
            currency: 'USD',
            interval: 'year',
            savings: Math.round(((prices.premium.monthly * 12 - prices.premium.yearly) / (prices.premium.monthly * 12)) * 100),
          },
        },
      },
      premium_plus: {
        name: 'Premium Plus',
        features: [
          'Everything in Premium',
          'Priority likes (be seen first)',
          'Message before matching',
          'See recently active users',
          'Weekly boost',
          '10 Super Likes per day',
          'Read receipts',
        ],
        pricing: {
          monthly: {
            amount: prices.premium_plus.monthly / 100,
            currency: 'USD',
            interval: 'month',
          },
          yearly: {
            amount: prices.premium_plus.yearly / 100,
            currency: 'USD',
            interval: 'year',
            savings: Math.round(((prices.premium_plus.monthly * 12 - prices.premium_plus.yearly) / (prices.premium_plus.monthly * 12)) * 100),
          },
        },
      },
    };

    res.status(200).json({
      success: true,
      data: { plans },
    });
  } catch (error: any) {
    logger.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get plans',
        code: 'PLANS_GET_ERROR',
      },
    });
  }
});

/**
 * POST /api/payments/subscribe
 * Create a new subscription
 * Requires: Authentication + CSRF Protection
 */
router.post(
  '/subscribe',
  AuthMiddleware.verifyToken,
  CSRFProtection.protect(),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { tier, billingPeriod } = req.body;

      // Validate tier
      if (!tier || !['premium', 'premium_plus'].includes(tier)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid subscription tier',
            code: 'INVALID_TIER',
          },
        });
      }

      // Validate billing period
      if (!billingPeriod || !['monthly', 'yearly'].includes(billingPeriod)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid billing period',
            code: 'INVALID_BILLING_PERIOD',
          },
        });
      }

      // Check for existing subscription
      const existingSubscription = await paymentRepo.getSubscription(userId);
      if (existingSubscription?.status === 'active') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'User already has an active subscription. Please cancel first or upgrade.',
            code: 'SUBSCRIPTION_EXISTS',
          },
        });
      }

      const subscription = await paymentService.createSubscription(userId, tier, billingPeriod);

      logger.info(`Subscription created: ${userId} -> ${tier} (${billingPeriod})`);

      res.status(201).json({
        success: true,
        data: {
          message: 'Subscription created successfully',
          subscription,
        },
      });
    } catch (error: any) {
      logger.error('Create subscription error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to create subscription',
          code: 'SUBSCRIPTION_CREATE_ERROR',
        },
      });
    }
  }
);

/**
 * POST /api/payments/cancel-subscription
 * Cancel current subscription
 * Requires: Authentication + CSRF Protection
 */
router.post(
  '/cancel-subscription',
  AuthMiddleware.verifyToken,
  CSRFProtection.protect(),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;

      const result = await paymentService.cancelSubscription(userId);

      logger.info(`Subscription canceled: ${userId}`);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Cancel subscription error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to cancel subscription',
          code: 'SUBSCRIPTION_CANCEL_ERROR',
        },
      });
    }
  }
);

/**
 * GET /api/payments/coins
 * Get user's coin balance
 * Requires: Authentication
 */
router.get('/coins', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const balance = await paymentService.getCoinBalance(userId);

    res.status(200).json({
      success: true,
      data: { balance },
    });
  } catch (error: any) {
    logger.error('Get coin balance error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get coin balance',
        code: 'COINS_GET_ERROR',
      },
    });
  }
});

/**
 * GET /api/payments/coin-packages
 * Get available coin packages
 * Public endpoint
 */
router.get('/coin-packages', async (req: Request, res: Response) => {
  try {
    const packages = paymentService.getCoinPackages();
    const costs = paymentService.getCoinCosts();

    const formattedPackages = packages.map((pkg, index) => ({
      id: index,
      coins: pkg.coins,
      price: pkg.price / 100, // Convert to dollars
      currency: 'USD',
      bestValue: index === packages.length - 1,
    }));

    res.status(200).json({
      success: true,
      data: {
        packages: formattedPackages,
        costs, // What coins can be spent on
      },
    });
  } catch (error: any) {
    logger.error('Get coin packages error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get coin packages',
        code: 'PACKAGES_GET_ERROR',
      },
    });
  }
});

/**
 * POST /api/payments/purchase-coins
 * Purchase a coin package
 * Requires: Authentication + CSRF Protection
 */
router.post(
  '/purchase-coins',
  AuthMiddleware.verifyToken,
  CSRFProtection.protect(),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { packageIndex } = req.body;

      if (packageIndex === undefined || packageIndex === null) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Package index is required',
            code: 'MISSING_PACKAGE_INDEX',
          },
        });
      }

      const result = await paymentService.purchaseCoins(userId, packageIndex);

      logger.info(`Coin purchase initiated: ${userId} -> package ${packageIndex}`);

      res.status(200).json({
        success: true,
        data: {
          message: 'Payment initiated',
          transaction: result.transaction,
          clientSecret: result.clientSecret, // For Stripe Elements
        },
      });
    } catch (error: any) {
      logger.error('Purchase coins error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to purchase coins',
          code: 'PURCHASE_ERROR',
        },
      });
    }
  }
);

/**
 * POST /api/payments/confirm-coin-purchase
 * Confirm coin purchase after payment
 * Requires: Authentication + CSRF Protection
 */
router.post(
  '/confirm-coin-purchase',
  AuthMiddleware.verifyToken,
  CSRFProtection.protect(),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Payment intent ID is required',
            code: 'MISSING_PAYMENT_INTENT',
          },
        });
      }

      const result = await paymentService.confirmCoinPurchase(userId, paymentIntentId);

      logger.info(`Coin purchase confirmed: ${userId} -> ${result.coins} coins`);

      res.status(200).json({
        success: true,
        data: {
          message: `Successfully added ${result.coins} coins to your account`,
          coins: result.coins,
        },
      });
    } catch (error: any) {
      logger.error('Confirm coin purchase error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to confirm purchase',
          code: 'CONFIRM_ERROR',
        },
      });
    }
  }
);

/**
 * POST /api/payments/spend-coins
 * Spend coins on a feature
 * Requires: Authentication + CSRF Protection
 */
router.post(
  '/spend-coins',
  AuthMiddleware.verifyToken,
  CSRFProtection.protect(),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { feature, amount } = req.body;

      const costs = paymentService.getCoinCosts();
      const validFeatures = Object.keys(costs);

      if (!feature || !validFeatures.includes(feature)) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Invalid feature. Valid features: ${validFeatures.join(', ')}`,
            code: 'INVALID_FEATURE',
          },
        });
      }

      const coinCost = amount || (costs as Record<string, number>)[feature];

      await paymentService.spendCoins(userId, coinCost, feature);

      const newBalance = await paymentService.getCoinBalance(userId);

      logger.info(`Coins spent: ${userId} -> ${coinCost} coins on ${feature}`);

      res.status(200).json({
        success: true,
        data: {
          message: `Successfully spent ${coinCost} coins on ${feature}`,
          spent: coinCost,
          newBalance,
        },
      });
    } catch (error: any) {
      logger.error('Spend coins error:', error);

      if (error.message === 'Insufficient coin balance') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Insufficient coin balance',
            code: 'INSUFFICIENT_BALANCE',
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to spend coins',
          code: 'SPEND_ERROR',
        },
      });
    }
  }
);

/**
 * GET /api/payments/transactions
 * Get user's transaction history
 * Requires: Authentication
 */
router.get('/transactions', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const transactions = await paymentService.getTransactionHistory(userId, limit, offset);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          limit,
          offset,
          hasMore: transactions.length === limit,
        },
      },
    });
  } catch (error: any) {
    logger.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get transactions',
        code: 'TRANSACTIONS_GET_ERROR',
      },
    });
  }
});

/**
 * GET /api/payments/coin-transactions
 * Get user's coin transaction history
 * Requires: Authentication
 */
router.get('/coin-transactions', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const transactions = await paymentService.getCoinTransactionHistory(userId, limit, offset);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          limit,
          offset,
          hasMore: transactions.length === limit,
        },
      },
    });
  } catch (error: any) {
    logger.error('Get coin transactions error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get coin transactions',
        code: 'COIN_TRANSACTIONS_GET_ERROR',
      },
    });
  }
});

/**
 * POST /api/payments/webhook
 * Stripe webhook handler
 * No authentication - verified by Stripe signature
 */
router.post(
  '/webhook',
  async (req: Request, res: Response) => {
    try {
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Missing Stripe signature',
            code: 'MISSING_SIGNATURE',
          },
        });
      }

      // Verify and construct event
      const event = stripeService.constructEvent(req.body, signature);

      if (!event) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid webhook signature',
            code: 'INVALID_SIGNATURE',
          },
        });
      }

      // Handle webhook event
      await paymentService.handleWebhook(event);

      logger.info(`Webhook processed: ${event.type}`);

      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error('Webhook error:', error);
      res.status(400).json({
        success: false,
        error: {
          message: error.message || 'Webhook processing failed',
          code: 'WEBHOOK_ERROR',
        },
      });
    }
  }
);

/**
 * GET /api/payments/admin/revenue
 * Get revenue statistics (Admin only)
 * Requires: Authentication + Admin role
 */
router.get(
  '/admin/revenue',
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole(['admin']),
  async (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const stats = await paymentRepo.getRevenueStats(startDate, endDate);

      res.status(200).json({
        success: true,
        data: {
          stats,
          period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        },
      });
    } catch (error: any) {
      logger.error('Get revenue stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to get revenue stats',
          code: 'REVENUE_STATS_ERROR',
        },
      });
    }
  }
);

export default router;
