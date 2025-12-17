import { Request, Response } from 'express';
import { PaymentService } from '../../domain/services/payment.service';
import logger from '../../utils/logger';

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
    } catch (error: any) {
      logger.error('Create payment intent error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create payment intent',
      });
    }
  }

  async purchaseSubscription(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, tier, priceId, email, paymentMethodId, trialDays } = req.body;

      if (!userId || !tier || !priceId || !email || !paymentMethodId) {
        return res.status(400).json({
          success: false,
          message: 'User ID, tier, price ID, email, and payment method are required',
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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

      const paymentMethod = await this.paymentService.addPaymentMethod(
        customerId,
        paymentMethodId
      );

      return res.status(200).json({
        success: true,
        message: 'Payment method added successfully',
        data: paymentMethod,
      });
    } catch (error: any) {
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

      const refund = await this.paymentService.processRefund(
        paymentIntentId,
        amount,
        reason
      );

      return res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        data: refund,
      });
    } catch (error: any) {
      logger.error('Process refund error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to process refund',
      });
    }
  }

  async createCheckoutSession(req: Request, res: Response): Promise<Response> {
    try {
      const {
        customerId,
        customerEmail,
        successUrl,
        cancelUrl,
        mode,
        lineItems,
        priceId,
        quantity,
        metadata,
        trialPeriodDays,
        allowPromotionCodes,
      } = req.body;

      if (!successUrl || !cancelUrl || !mode) {
        return res.status(400).json({
          success: false,
          message: 'Success URL, cancel URL, and mode are required',
        });
      }

      if (!customerId && !customerEmail) {
        return res.status(400).json({
          success: false,
          message: 'Either customer ID or customer email is required',
        });
      }

      if (!lineItems && !priceId) {
        return res.status(400).json({
          success: false,
          message: 'Either line items or price ID is required',
        });
      }

      const session = await this.paymentService.createCheckoutSession({
        customerId,
        customerEmail,
        successUrl,
        cancelUrl,
        mode,
        lineItems,
        priceId,
        quantity,
        metadata,
        trialPeriodDays,
        allowPromotionCodes,
      });

      return res.status(200).json({
        success: true,
        message: 'Checkout session created successfully',
        data: {
          sessionId: session.id,
          url: session.url,
        },
      });
    } catch (error: any) {
      logger.error('Create checkout session error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create checkout session',
      });
    }
  }

  async getCheckoutSession(req: Request, res: Response): Promise<Response> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required',
        });
      }

      const session = await this.paymentService.getCheckoutSession(sessionId);

      return res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error: any) {
      logger.error('Get checkout session error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get checkout session',
      });
    }
  }

  async createCustomer(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, email, name } = req.body;

      if (!userId || !email) {
        return res.status(400).json({
          success: false,
          message: 'User ID and email are required',
        });
      }

      const customer = await this.paymentService.createCustomer(userId, email, name);

      return res.status(200).json({
        success: true,
        message: 'Customer created successfully',
        data: customer,
      });
    } catch (error: any) {
      logger.error('Create customer error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create customer',
      });
    }
  }

  async getCustomer(req: Request, res: Response): Promise<Response> {
    try {
      const { customerId } = req.params;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID is required',
        });
      }

      const customer = await this.paymentService.getCustomer(customerId);

      return res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error: any) {
      logger.error('Get customer error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get customer',
      });
    }
  }

  async updateSubscriptionTier(req: Request, res: Response): Promise<Response> {
    try {
      const { subscriptionId, newPriceId } = req.body;

      if (!subscriptionId || !newPriceId) {
        return res.status(400).json({
          success: false,
          message: 'Subscription ID and new price ID are required',
        });
      }

      const subscription = await this.paymentService.updateSubscriptionTier(
        subscriptionId,
        newPriceId
      );

      return res.status(200).json({
        success: true,
        message: 'Subscription tier updated successfully',
        data: subscription,
      });
    } catch (error: any) {
      logger.error('Update subscription tier error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update subscription tier',
      });
    }
  }

  async getConfigurationStatus(req: Request, res: Response): Promise<Response> {
    try {
      const validation = PaymentService.validateConfiguration();
      const status = PaymentService.getConfigurationStatus();

      return res.status(200).json({
        success: true,
        data: {
          ...status,
          validation,
        },
      });
    } catch (error: any) {
      logger.error('Get configuration status error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get configuration status',
      });
    }
  }
}

export default new PaymentController();
