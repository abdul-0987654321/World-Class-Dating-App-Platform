import { createLogger } from '@flamoral/backend-shared';
import Stripe from 'stripe';

import { NotificationServiceClient } from '../../infrastructure/clients/notification-service.client';
import { UserServiceClient } from '../../infrastructure/clients/user-service.client';
import {
  StripeSubscriptionWithPeriod,
  StripeInvoiceWithSubscription,
} from '../../types/stripe-events.types';

const logger = createLogger('payment-service');

// Initialize Stripe with API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
});

// 6-tier subscription model
export type SubscriptionTier = 'free' | 'basic' | 'plus' | 'premium' | 'premium_plus' | 'elite';
export type BillingCycle = 'monthly' | '3_months' | '6_months' | 'yearly';

interface SubscriptionPurchase {
  userId: string;
  tier: SubscriptionTier;
  priceId: string;
  billingCycle?: BillingCycle;
  trialDays?: number;
}

interface CoinPurchase {
  userId: string;
  productSku: string;
  priceId: string;
}

interface BoostPurchase {
  userId: string;
  productSku: string;
  priceId: string;
}

export class PaymentService {
  private stripe: Stripe;
  private userServiceClient: UserServiceClient;
  private notificationServiceClient: NotificationServiceClient;

  constructor(
    userServiceClient?: UserServiceClient,
    notificationServiceClient?: NotificationServiceClient
  ) {
    this.stripe = stripe;
    this.userServiceClient = userServiceClient || new UserServiceClient();
    this.notificationServiceClient = notificationServiceClient || new NotificationServiceClient();
  }

  /**
   * Create a Stripe customer for a user
   */
  async createCustomer(userId: string, email: string, name?: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          userId,
        },
      });

      return customer;
    } catch (error) {
      throw new Error(`Failed to create Stripe customer: ${error.message}`);
    }
  }

  /**
   * Get or create a Stripe customer
   */
  async getOrCreateCustomer(
    userId: string,
    email: string,
    name?: string
  ): Promise<Stripe.Customer> {
    try {
      // Search for existing customer by metadata
      const customers = await this.stripe.customers.list({
        email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        return customers.data[0];
      }

      return await this.createCustomer(userId, email, name);
    } catch (error) {
      throw new Error(`Failed to get or create customer: ${error.message}`);
    }
  }

  /**
   * Create a payment intent for one-time purchases (coins, boosts)
   */
  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    customerId: string,
    metadata: Record<string, string>
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: customerId,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  /**
   * Purchase subscription
   */
  async purchaseSubscription(
    purchase: SubscriptionPurchase,
    email: string,
    paymentMethodId: string
  ): Promise<{ subscription: Stripe.Subscription; customer: Stripe.Customer }> {
    try {
      // Create or get customer
      const customer = await this.getOrCreateCustomer(purchase.userId, email);

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      // Set as default payment method
      await this.stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Create subscription
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customer.id,
        items: [{ price: purchase.priceId }],
        metadata: {
          userId: purchase.userId,
          tier: purchase.tier,
          billingCycle: purchase.billingCycle || 'monthly',
        },
        expand: ['latest_invoice.payment_intent'],
      };

      // Add trial if specified
      if (purchase.trialDays && purchase.trialDays > 0) {
        subscriptionParams.trial_period_days = purchase.trialDays;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionParams);

      return { subscription, customer };
    } catch (error) {
      throw new Error(`Failed to purchase subscription: ${error.message}`);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false
  ): Promise<Stripe.Subscription> {
    try {
      if (immediately) {
        return await this.stripe.subscriptions.cancel(subscriptionId);
      } else {
        return await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }
    } catch (error) {
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
    } catch (error) {
      throw new Error(`Failed to reactivate subscription: ${error.message}`);
    }
  }

  /**
   * Update subscription tier
   */
  async updateSubscriptionTier(
    subscriptionId: string,
    newPriceId: string
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

      return await this.stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'always_invoice',
      });
    } catch (error) {
      throw new Error(`Failed to update subscription tier: ${error.message}`);
    }
  }

  /**
   * Purchase coins
   */
  async purchaseCoins(
    purchase: CoinPurchase,
    email: string,
    amount: number
  ): Promise<{ paymentIntent: Stripe.PaymentIntent; customer: Stripe.Customer }> {
    try {
      const customer = await this.getOrCreateCustomer(purchase.userId, email);

      const paymentIntent = await this.createPaymentIntent(amount, 'usd', customer.id, {
        userId: purchase.userId,
        productSku: purchase.productSku,
        type: 'coin_purchase',
      });

      return { paymentIntent, customer };
    } catch (error) {
      throw new Error(`Failed to purchase coins: ${error.message}`);
    }
  }

  /**
   * Purchase boost
   */
  async purchaseBoost(
    purchase: BoostPurchase,
    email: string,
    amount: number
  ): Promise<{ paymentIntent: Stripe.PaymentIntent; customer: Stripe.Customer }> {
    try {
      const customer = await this.getOrCreateCustomer(purchase.userId, email);

      const paymentIntent = await this.createPaymentIntent(amount, 'usd', customer.id, {
        userId: purchase.userId,
        productSku: purchase.productSku,
        type: 'boost_purchase',
      });

      return { paymentIntent, customer };
    } catch (error) {
      throw new Error(`Failed to purchase boost: ${error.message}`);
    }
  }

  /**
   * Process refund
   */
  async processRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<Stripe.Refund> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };

      if (amount) {
        refundParams.amount = Math.round(amount * 100);
      }

      if (reason) {
        refundParams.reason = reason as Stripe.RefundCreateParams.Reason;
      }

      return await this.stripe.refunds.create(refundParams);
    } catch (error) {
      throw new Error(`Failed to process refund: ${error.message}`);
    }
  }

  /**
   * Get customer's payment methods
   */
  async getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error) {
      throw new Error(`Failed to get payment methods: ${error.message}`);
    }
  }

  /**
   * Add payment method to customer
   */
  async addPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<Stripe.PaymentMethod> {
    try {
      return await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    } catch (error) {
      throw new Error(`Failed to add payment method: ${error.message}`);
    }
  }

  /**
   * Remove payment method
   */
  async removePaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      return await this.stripe.paymentMethods.detach(paymentMethodId);
    } catch (error) {
      throw new Error(`Failed to remove payment method: ${error.message}`);
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    } catch (error) {
      throw new Error(`Failed to set default payment method: ${error.message}`);
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      throw new Error(`Failed to get subscription: ${error.message}`);
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      return (await this.stripe.customers.retrieve(customerId)) as Stripe.Customer;
    } catch (error) {
      throw new Error(`Failed to get customer: ${error.message}`);
    }
  }

  /**
   * Get user's subscription by userId
   * Searches for active subscriptions via customer metadata
   */
  async getUserSubscription(userId: string): Promise<{
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
    tier: SubscriptionTier;
    tierName: string;
    subscriptionId: string;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    entitlements: Record<string, any>;
  } | null> {
    try {
      // Search for customer by userId metadata
      const customers = await this.stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 1,
      });

      if (customers.data.length === 0) {
        return null;
      }

      const customer = customers.data[0];

      // Get active subscriptions for this customer
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        return null;
      }

      const subscription = subscriptions.data[0];
      const tier = (subscription.metadata.tier || 'free') as SubscriptionTier;

      // Get tier entitlements from config
      const { getEntitlements } = await import('../../config/stripe-products');
      const entitlements = getEntitlements(tier);

      // Map Stripe status
      let status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' = 'active';
      if (subscription.status === 'trialing') {
        status = 'trialing';
      } else if (subscription.status === 'past_due') {
        status = 'past_due';
      } else if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
        status = 'canceled';
      } else if (subscription.status === 'unpaid' || subscription.status === 'incomplete') {
        status = 'unpaid';
      }

      const tierDisplayNames: Record<SubscriptionTier, string> = {
        free: 'Free',
        basic: 'Basic',
        plus: 'Plus',
        premium: 'Premium',
        premium_plus: 'Premium+',
        elite: 'Elite',
      };

      return {
        status,
        tier,
        tierName: tierDisplayNames[tier] || 'Free',
        subscriptionId: subscription.id,
        currentPeriodEnd: new Date(((subscription as StripeSubscriptionWithPeriod).current_period_end || 0) * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        entitlements,
      };
    } catch (error) {
      logger.error('Error getting user subscription:', error.message);
      return null;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(rawBody: string | Buffer, signature: string): Promise<Stripe.Event> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    try {
      const event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

      return event;
    } catch (error) {
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;

        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      throw new Error(`Failed to process webhook event: ${error.message}`);
    }
  }

  /**
   * Handle successful payment intent
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info('Payment succeeded:', paymentIntent.id);

    try {
      const metadata = paymentIntent.metadata;
      const userId = metadata.userId;
      const type = metadata.type;

      if (!userId) {
        logger.error('No userId in payment intent metadata');
        return;
      }

      // Handle based on payment type
      switch (type) {
        case 'coin_purchase':
          const productSku = metadata.productSku;
          const coinAmount = this.getCoinAmountFromSku(productSku);

          await this.userServiceClient.addCoins({
            userId,
            amount: coinAmount,
            transactionType: 'purchase',
            stripePaymentId: paymentIntent.id,
            productSku,
          });

          await this.notificationServiceClient.sendNotification({
            userId,
            type: 'payment_success',
            title: 'Payment Successful',
            body: `Successfully purchased ${coinAmount} coins!`,
          });
          break;

        case 'boost_purchase':
          const boostSku = metadata.productSku;
          const durationMinutes = this.getBoostDurationFromSku(boostSku);

          await this.userServiceClient.activateBoost({
            userId,
            productSku: boostSku,
            durationMinutes,
            stripePaymentId: paymentIntent.id,
          });

          await this.notificationServiceClient.sendNotification({
            userId,
            type: 'payment_success',
            title: 'Payment Successful',
            body: `Boost activated for ${durationMinutes} minutes!`,
          });
          break;

        default:
          logger.info(`Payment type ${type} handled by other webhook events`);
      }
    } catch (error) {
      logger.error('Error handling payment intent succeeded:', error.message);
    }
  }

  /**
   * Helper to get coin amount from product SKU
   */
  private getCoinAmountFromSku(sku: string): number {
    const coinPackages: Record<string, number> = {
      COIN_PACK_SMALL: 100,
      COIN_PACK_MEDIUM: 500,
      COIN_PACK_LARGE: 1200,
      COIN_PACK_XL: 2500,
    };
    return coinPackages[sku] || 0;
  }

  /**
   * Helper to get boost duration from product SKU
   */
  private getBoostDurationFromSku(sku: string): number {
    const boostDurations: Record<string, number> = {
      BOOST_30MIN: 30,
      BOOST_1HR: 60,
      BOOST_3HR: 180,
    };
    return boostDurations[sku] || 30;
  }

  /**
   * Handle failed payment intent
   */
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info('Payment failed:', paymentIntent.id);

    try {
      const userId = paymentIntent.metadata.userId;
      if (userId) {
        await this.notificationServiceClient.sendNotification({
          userId,
          type: 'payment_failed',
          title: 'Payment Failed',
          body: 'Your payment failed. Please check your payment method and try again.',
        });
      }
    } catch (error) {
      logger.error('Error handling payment intent failed:', error.message);
    }
  }

  /**
   * Handle subscription update
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    logger.info('Subscription updated:', subscription.id);

    try {
      const userId = subscription.metadata.userId;
      const tier = subscription.metadata.tier as SubscriptionTier;
      const billingCycle = (subscription.metadata.billingCycle as BillingCycle) || 'monthly';

      if (!userId) {
        logger.error('No userId in subscription metadata');
        return;
      }

      // Map Stripe subscription status to our status
      let status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'grace_period' = 'active';
      if (subscription.status === 'past_due') {
        status = 'past_due';
      } else if (subscription.status === 'unpaid' || subscription.status === 'incomplete') {
        status = 'unpaid';
      } else if (subscription.cancel_at_period_end) {
        status = 'canceled';
      }

      await this.userServiceClient.updateSubscription({
        userId,
        tier: this.userServiceClient.mapTierName(tier || 'free'),
        stripeSubscriptionId: subscription.id,
        status,
        currentPeriodEnd: new Date(((subscription as StripeSubscriptionWithPeriod).current_period_end || 0) * 1000),
      });

      // Get tier display name
      const tierDisplayNames: Record<SubscriptionTier, string> = {
        free: 'Free',
        basic: 'Basic',
        plus: 'Plus',
        premium: 'Premium',
        premium_plus: 'Premium+',
        elite: 'Elite',
      };

      await this.notificationServiceClient.sendNotification({
        userId,
        type: 'subscription_updated',
        title: 'Subscription Updated',
        body: `Your subscription has been updated to ${tierDisplayNames[tier] || 'Free'} tier.`,
      });
    } catch (error) {
      logger.error('Error handling subscription updated:', error.message);
    }
  }

  /**
   * Handle subscription deletion
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    logger.info('Subscription deleted:', subscription.id);

    try {
      const userId = subscription.metadata.userId;

      if (!userId) {
        logger.error('No userId in subscription metadata');
        return;
      }

      // Downgrade user to free tier
      await this.userServiceClient.updateSubscription({
        userId,
        tier: 'free',
        stripeSubscriptionId: subscription.id,
        status: 'canceled',
      });

      await this.notificationServiceClient.sendNotification({
        userId,
        type: 'subscription_canceled',
        title: 'Subscription Canceled',
        body: 'Your subscription has been canceled. You have been downgraded to the free tier.',
      });
    } catch (error) {
      logger.error('Error handling subscription deleted:', error.message);
    }
  }

  /**
   * Handle successful invoice payment
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    logger.info('Invoice payment succeeded:', invoice.id);

    try {
      const typedInvoice = invoice as StripeInvoiceWithSubscription;
      if (!typedInvoice.subscription) {
        return;
      }

      const subscription = await this.stripe.subscriptions.retrieve(typedInvoice.subscription as string);

      const userId = subscription.metadata.userId;

      if (userId && invoice.billing_reason === 'subscription_cycle') {
        // This is a renewal payment
        await this.notificationServiceClient.sendNotification({
          userId,
          type: 'subscription_renewed',
          title: 'Subscription Renewed',
          body: 'Your subscription has been successfully renewed.',
        });
      }
    } catch (error) {
      logger.error('Error handling invoice payment succeeded:', error.message);
    }
  }

  /**
   * Handle failed invoice payment
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    logger.info('Invoice payment failed:', invoice.id);

    try {
      const typedInvoice = invoice as StripeInvoiceWithSubscription;
      if (!typedInvoice.subscription) {
        return;
      }

      const subscription = await this.stripe.subscriptions.retrieve(typedInvoice.subscription as string);

      const userId = subscription.metadata.userId;

      if (!userId) {
        return;
      }

      // Enter grace period (3 days) instead of immediate past_due
      // Grace period allows users to retain features while they fix payment
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3); // 3-day grace period

      await this.userServiceClient.updateSubscription({
        userId,
        tier: this.userServiceClient.mapTierName(subscription.metadata.tier || 'free'),
        stripeSubscriptionId: subscription.id,
        status: 'grace_period',
        gracePeriodEnd,
      });

      await this.notificationServiceClient.sendNotification({
        userId,
        type: 'payment_failed',
        title: 'Payment Failed',
        body: 'Your subscription renewal payment failed. You have 3 days to update your payment method before losing access to premium features.',
      });
    } catch (error) {
      logger.error('Error handling invoice payment failed:', error.message);
    }
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRevenue: number;
    subscriptionRevenue: number;
    coinRevenue: number;
    boostRevenue: number;
    totalCustomers: number;
    activeSubscriptions: number;
  }> {
    try {
      // This would use Stripe reporting APIs
      // Simplified implementation
      return {
        totalRevenue: 0,
        subscriptionRevenue: 0,
        coinRevenue: 0,
        boostRevenue: 0,
        totalCustomers: 0,
        activeSubscriptions: 0,
      };
    } catch (error) {
      throw new Error(`Failed to get payment analytics: ${error.message}`);
    }
  }

  /**
   * Create a setup intent for saving payment method
   */
  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    try {
      return await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
      });
    } catch (error) {
      throw new Error(`Failed to create setup intent: ${error.message}`);
    }
  }
}

export default new PaymentService();
