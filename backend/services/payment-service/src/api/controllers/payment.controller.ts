import { Request, Response } from 'express';

import { SUBSCRIPTION_TIERS, SubscriptionTier } from '../../config/stripe-products';
import { PaymentService } from '../../domain/services/payment.service';
import { AuthenticatedUser } from '../../types/stripe-events.types';
import logger from '../../utils/logger';

/**
 * Extended Request interface with authenticated user
 */
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export class PaymentController {
  private paymentService: PaymentService;

  constructor(paymentService?: PaymentService) {
    this.paymentService = paymentService || new PaymentService();
  }

  async createPaymentIntent(req: Request, res: Response): Promise<Response> {
    try {
      const { amount, currency, customerId, metadata } = req.body;

      if (!amount || !customerId) {
        return res.status(400).json({
          success: false,
          message: 'Amount and customer ID are required',
        });
      }

      const paymentIntent = await this.paymentService.createPaymentIntent(
        amount,
        currency || 'usd',
        customerId,
        metadata || {}
      );

      return res.status(200).json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        },
      });
    } catch (error) {
      logger.error('Create payment intent error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create payment intent',
      });
    }
  }

  async purchaseSubscription(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { tier, priceId, email, paymentMethodId, trialDays } = req.body;

      if (!tier || !priceId || !email || !paymentMethodId) {
        return res.status(400).json({
          success: false,
          message: 'Tier, price ID, email, and payment method are required',
        });
      }

      const result = await this.paymentService.purchaseSubscription(
        { userId, tier, priceId, trialDays },
        email,
        paymentMethodId
      );

      return res.status(200).json({
        success: true,
        message: 'Subscription created successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Purchase subscription error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to purchase subscription',
      });
    }
  }

  async cancelSubscription(req: Request, res: Response): Promise<Response> {
    try {
      const { subscriptionId, immediately } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({
          success: false,
          message: 'Subscription ID is required',
        });
      }

      const subscription = await this.paymentService.cancelSubscription(
        subscriptionId,
        immediately || false
      );

      return res.status(200).json({
        success: true,
        message: 'Subscription canceled successfully',
        data: subscription,
      });
    } catch (error) {
      logger.error('Cancel subscription error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to cancel subscription',
      });
    }
  }

  async handleWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        return res.status(400).json({
          success: false,
          message: 'Stripe signature missing',
        });
      }

      const event = await this.paymentService.handleWebhook(req.body, signature);
      await this.paymentService.processWebhookEvent(event);

      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
      });
    } catch (error) {
      logger.error('Webhook error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Webhook processing failed',
      });
    }
  }

  async getPaymentMethods(req: Request, res: Response): Promise<Response> {
    try {
      const { customerId } = req.params;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID is required',
        });
      }

      const paymentMethods = await this.paymentService.getPaymentMethods(customerId);

      return res.status(200).json({
        success: true,
        data: paymentMethods,
      });
    } catch (error) {
      logger.error('Get payment methods error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get payment methods',
      });
    }
  }

  async addPaymentMethod(req: Request, res: Response): Promise<Response> {
    try {
      const { customerId, paymentMethodId } = req.body;

      if (!customerId || !paymentMethodId) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID and payment method ID are required',
        });
      }

      const paymentMethod = await this.paymentService.addPaymentMethod(customerId, paymentMethodId);

      return res.status(200).json({
        success: true,
        message: 'Payment method added successfully',
        data: paymentMethod,
      });
    } catch (error) {
      logger.error('Add payment method error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to add payment method',
      });
    }
  }

  async processRefund(req: Request, res: Response): Promise<Response> {
    try {
      const { paymentIntentId, amount, reason } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          message: 'Payment intent ID is required',
        });
      }

      const refund = await this.paymentService.processRefund(paymentIntentId, amount, reason);

      return res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        data: refund,
      });
    } catch (error) {
      logger.error('Process refund error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to process refund',
      });
    }
  }

  /**
   * GET /plans - Get available subscription plans
   * Returns all subscription tiers with pricing and entitlements
   */
  async getPlans(_req: Request, res: Response): Promise<Response> {
    try {
      // Transform tiers to public-facing format (exclude internal Stripe IDs)
      const plans = SUBSCRIPTION_TIERS.map((tier: SubscriptionTier) => ({
        key: tier.key,
        name: tier.name,
        priceMonthly: tier.priceMonthly,
        priceCurrency: 'usd',
        priceFormatted: tier.priceMonthly === 0 ? 'Free' : `$${(tier.priceMonthly / 100).toFixed(2)}/month`,
        entitlements: tier.entitlements,
      }));

      return res.status(200).json({
        success: true,
        data: plans,
      });
    } catch (error) {
      logger.error('Get plans error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get subscription plans',
      });
    }
  }

  /**
   * GET /subscriptions/me - Get current user's subscription
   * Returns the user's active subscription status and entitlements
   */
  async getMySubscription(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const subscription = await this.paymentService.getUserSubscription(userId);

      if (!subscription) {
        // Return free tier info if no subscription
        const freeTier = SUBSCRIPTION_TIERS.find((t: SubscriptionTier) => t.key === 'free');
        return res.status(200).json({
          success: true,
          data: {
            status: 'free',
            tier: 'free',
            tierName: 'Free',
            entitlements: freeTier?.entitlements,
            subscription: null,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      logger.error('Get subscription error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get subscription',
      });
    }
  }
}

export default new PaymentController();
