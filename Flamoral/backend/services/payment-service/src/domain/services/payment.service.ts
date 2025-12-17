import Stripe from 'stripe';
import { UserServiceClient } from '../../infrastructure/clients/user-service.client';
import { NotificationServiceClient } from '../../infrastructure/clients/notification-service.client';
import paymentConfig from '../../config/payment.config';
import PricingService, {
  SubscriptionTier,
  BillingCycle,
  COIN_PACKAGES,
  BOOST_PRODUCTS
} from '../../config/pricing.config';
import logger from '../../utils/logger';

// Initialize Stripe with centralized configuration
const stripe = paymentConfig.getStripeClient();

// Re-export types for backward compatibility
export type { SubscriptionTier, BillingCycle };

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

  constructor(userServiceClient?: UserServiceClient, notificationServiceClient?: NotificationServiceClient) {
    this.stripe = stripe;
    this.userServiceClient = userServiceClient || new UserServiceClient();
    this.notificationServiceClient = notificationServiceClient || new NotificationServiceClient();
  }

  /**
   * Create a Stripe customer for a user
   */
  async createCustomer(
    userId: string,
    email: string,
    name?: string
  ): Promise<Stripe.Customer> {
    try {
      logger.info(`Creating Stripe customer for user ${userId}`);

      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          userId,
        },
      });

      logger.info(`Stripe customer created: ${customer.id} for user ${userId}`);
      return customer;
    } catch (error: any) {
      logger.error(`Failed to create Stripe customer for user ${userId}:`, error);
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
        logger.info(`Found existing Stripe customer for user ${userId}: ${customers.data[0].id}`);
        return customers.data[0];
      }

      return await this.createCustomer(userId, email, name);
    } catch (error: any) {
      logger.error(`Failed to get or create customer for user ${userId}:`, error);
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
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      logger.info(`Creating payment intent for customer ${customerId}: ${amount} ${currency}`);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: customerId,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      logger.info(`Payment intent created: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error: any) {
      logger.error('Failed to create payment intent:', error);
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
      logger.info(`Purchasing subscription for user ${purchase.userId}: ${purchase.tier}`);

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

      logger.info(`Subscription created: ${subscription.id} for user ${purchase.userId}`);
      return { subscription, customer };
    } catch (error: any) {
      logger.error(`Failed to purchase subscription for user ${purchase.userId}:`, error);
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
      logger.info(`Canceling subscription ${subscriptionId} (immediate: ${immediately})`);

      if (immediately) {
        return await this.stripe.subscriptions.cancel(subscriptionId);
      } else {
        return await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }
    } catch (error: any) {
      logger.error(`Failed to cancel subscription ${subscriptionId}:`, error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      logger.info(`Reactivating subscription ${subscriptionId}`);

      return await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
    } catch (error: any) {
      logger.error(`Failed to reactivate subscription ${subscriptionId}:`, error);
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
      logger.info(`Updating subscription ${subscriptionId} to price ${newPriceId}`);

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
    } catch (error: any) {
      logger.error(`Failed to update subscription tier ${subscriptionId}:`, error);
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
      logger.info(`Purchasing coins for user ${purchase.userId}: ${purchase.productSku}`);

      const customer = await this.getOrCreateCustomer(purchase.userId, email);

      const paymentIntent = await this.createPaymentIntent(
        amount,
        'usd',
        customer.id,
        {
          userId: purchase.userId,
          productSku: purchase.productSku,
          type: 'coin_purchase',
        }
      );

      return { paymentIntent, customer };
    } catch (error: any) {
      logger.error(`Failed to purchase coins for user ${purchase.userId}:`, error);
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
      logger.info(`Purchasing boost for user ${purchase.userId}: ${purchase.productSku}`);

      const customer = await this.getOrCreateCustomer(purchase.userId, email);

      const paymentIntent = await this.createPaymentIntent(
        amount,
        'usd',
        customer.id,
        {
          userId: purchase.userId,
          productSku: purchase.productSku,
          type: 'boost_purchase',
        }
      );

      return { paymentIntent, customer };
    } catch (error: any) {
      logger.error(`Failed to purchase boost for user ${purchase.userId}:`, error);
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
      logger.info(`Processing refund for payment intent ${paymentIntentId}`);

      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };

      if (amount) {
        refundParams.amount = Math.round(amount * 100);
      }

      if (reason) {
        refundParams.reason = reason as Stripe.RefundCreateParams.Reason;
      }

      const refund = await this.stripe.refunds.create(refundParams);
      logger.info(`Refund created: ${refund.id} for payment intent ${paymentIntentId}`);

      return refund;
    } catch (error: any) {
      logger.error(`Failed to process refund for ${paymentIntentId}:`, error);
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
    } catch (error: any) {
      logger.error(`Failed to get payment methods for customer ${customerId}:`, error);
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
      logger.info(`Adding payment method ${paymentMethodId} to customer ${customerId}`);

      return await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    } catch (error: any) {
      logger.error(`Failed to add payment method ${paymentMethodId}:`, error);
      throw new Error(`Failed to add payment method: ${error.message}`);
    }
  }

  /**
   * Remove payment method
   */
  async removePaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      logger.info(`Removing payment method ${paymentMethodId}`);

      return await this.stripe.paymentMethods.detach(paymentMethodId);
    } catch (error: any) {
      logger.error(`Failed to remove payment method ${paymentMethodId}:`, error);
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
      logger.info(`Setting default payment method ${paymentMethodId} for customer ${customerId}`);

      return await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    } catch (error: any) {
      logger.error(`Failed to set default payment method:`, error);
      throw new Error(`Failed to set default payment method: ${error.message}`);
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch (error: any) {
      logger.error(`Failed to get subscription ${subscriptionId}:`, error);
      throw new Error(`Failed to get subscription: ${error.message}`);
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
    } catch (error: any) {
      logger.error(`Failed to get customer ${customerId}:`, error);
      throw new Error(`Failed to get customer: ${error.message}`);
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(
    rawBody: string | Buffer,
    signature: string
  ): Promise<Stripe.Event> {
    try {
      const result = paymentConfig.verifyWebhookSignature(rawBody, signature);

      if (!result.valid || !result.event) {
        throw new Error(`Webhook signature verification failed: ${result.error}`);
      }

      logger.info(`Webhook signature verified for event ${result.event.id}`);
      return result.event;
    } catch (error: any) {
      logger.error('Webhook signature verification failed:', error);
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      logger.info(`Processing webhook event: ${event.type} (${event.id})`);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }

      logger.info(`Successfully processed webhook event: ${event.type} (${event.id})`);
    } catch (error: any) {
      logger.error(`Failed to process webhook event ${event.type}:`, error);
      throw new Error(`Failed to process webhook event: ${error.message}`);
    }
  }

  /**
   * Handle successful payment intent
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info(`Processing payment success: ${paymentIntent.id}`);

    try {
      const metadata = paymentIntent.metadata;
      const userId = metadata.userId;
      const type = metadata.type;

      if (!userId) {
        logger.error(`No userId in payment intent metadata: ${paymentIntent.id}`);
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
            body: `Successfully purchased ${coinAmount} coins!`
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
            body: `Boost activated for ${durationMinutes} minutes!`
          });
          break;

        default:
          logger.info(`Payment type ${type} handled by other webhook events`);
      }
    } catch (error: any) {
      logger.error(`Error handling payment intent succeeded ${paymentIntent.id}:`, error);
      throw error;
    }
  }

  /**
   * Helper to get coin amount from product SKU
   */
  private getCoinAmountFromSku(sku: string): number {
    try {
      return PricingService.getTotalCoins(sku);
    } catch (error) {
      logger.warn(`Could not get coin amount from SKU ${sku}, defaulting to 0`);
      return 0;
    }
  }

  /**
   * Helper to get boost duration from product SKU
   */
  private getBoostDurationFromSku(sku: string): number {
    try {
      const boost = PricingService.getBoostProduct(sku);
      return boost?.durationMinutes || 30;
    } catch (error) {
      logger.warn(`Could not get boost duration from SKU ${sku}, defaulting to 30 minutes`);
      return 30;
    }
  }

  /**
   * Handle failed payment intent
   */
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info(`Processing payment failure: ${paymentIntent.id}`);

    try {
      const userId = paymentIntent.metadata.userId;
      if (userId) {
        await this.notificationServiceClient.sendNotification({
          userId,
          type: 'payment_failed',
          title: 'Payment Failed',
          body: 'Your payment failed. Please check your payment method and try again.'
        });
      }
    } catch (error: any) {
      logger.error(`Error handling payment intent failed ${paymentIntent.id}:`, error);
      // Don't throw - notification is non-critical
    }
  }

  /**
   * Handle subscription update
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    logger.info(`Processing subscription update: ${subscription.id}`);

    try {
      const userId = subscription.metadata.userId;
      const tier = subscription.metadata.tier as SubscriptionTier;
      const billingCycle = subscription.metadata.billingCycle as BillingCycle || 'monthly';

      if (!userId) {
        logger.error(`No userId in subscription metadata: ${subscription.id}`);
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
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
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
        body: `Your subscription has been updated to ${tierDisplayNames[tier] || 'Free'} tier.`
      });
    } catch (error: any) {
      logger.error(`Error handling subscription updated ${subscription.id}:`, error);
      throw error;
    }
  }

  /**
   * Handle subscription deletion
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    logger.info(`Processing subscription deletion: ${subscription.id}`);

    try {
      const userId = subscription.metadata.userId;

      if (!userId) {
        logger.error(`No userId in subscription metadata: ${subscription.id}`);
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
        body: 'Your subscription has been canceled. You have been downgraded to the free tier.'
      });
    } catch (error: any) {
      logger.error(`Error handling subscription deleted ${subscription.id}:`, error);
      throw error;
    }
  }

  /**
   * Handle successful invoice payment
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    logger.info(`Processing invoice payment success: ${invoice.id}`);

    try {
      if (!invoice.subscription) {
        return;
      }

      const subscription = await this.stripe.subscriptions.retrieve(
        invoice.subscription as string
      );

      const userId = subscription.metadata.userId;

      if (userId && invoice.billing_reason === 'subscription_cycle') {
        // This is a renewal payment
        await this.notificationServiceClient.sendNotification({
          userId,
          type: 'subscription_renewed',
          title: 'Subscription Renewed',
          body: 'Your subscription has been successfully renewed.'
        });
      }
    } catch (error: any) {
      logger.error(`Error handling invoice payment succeeded ${invoice.id}:`, error);
      // Don't throw - notification is non-critical
    }
  }

  /**
   * Handle failed invoice payment
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    logger.info(`Processing invoice payment failure: ${invoice.id}`);

    try {
      if (!invoice.subscription) {
        return;
      }

      const subscription = await this.stripe.subscriptions.retrieve(
        invoice.subscription as string
      );

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
        tier: this.userServiceClient.mapTierName(subscription.metadata.tier as string || 'free'),
        stripeSubscriptionId: subscription.id,
        status: 'grace_period',
        gracePeriodEnd,
      });

      await this.notificationServiceClient.sendNotification({
        userId,
        type: 'payment_failed',
        title: 'Payment Failed',
        body: 'Your subscription renewal payment failed. You have 3 days to update your payment method before losing access to premium features.'
      });
    } catch (error: any) {
      logger.error(`Error handling invoice payment failed ${invoice.id}:`, error);
      throw error;
    }
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(startDate: Date, endDate: Date): Promise<{
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
    } catch (error: any) {
      logger.error('Failed to get payment analytics:', error);
      throw new Error(`Failed to get payment analytics: ${error.message}`);
    }
  }

  /**
   * Create a setup intent for saving payment method
   */
  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    try {
      logger.info(`Creating setup intent for customer ${customerId}`);

      return await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
      });
    } catch (error: any) {
      logger.error(`Failed to create setup intent for customer ${customerId}:`, error);
      throw new Error(`Failed to create setup intent: ${error.message}`);
    }
  }

  /**
   * Create a checkout session for subscription or one-time payment
   */
  async createCheckoutSession(params: {
    customerId?: string;
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
    mode: 'payment' | 'subscription' | 'setup';
    lineItems?: Stripe.Checkout.SessionCreateParams.LineItem[];
    priceId?: string;
    quantity?: number;
    metadata?: Record<string, string>;
    trialPeriodDays?: number;
    allowPromotionCodes?: boolean;
  }): Promise<Stripe.Checkout.Session> {
    try {
      logger.info(`Creating checkout session: ${params.mode}`);

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: params.mode,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: params.metadata,
      };

      // Set customer
      if (params.customerId) {
        sessionParams.customer = params.customerId;
      } else if (params.customerEmail) {
        sessionParams.customer_email = params.customerEmail;
      }

      // Set line items
      if (params.lineItems) {
        sessionParams.line_items = params.lineItems;
      } else if (params.priceId) {
        sessionParams.line_items = [
          {
            price: params.priceId,
            quantity: params.quantity || 1,
          },
        ];
      }

      // Subscription-specific options
      if (params.mode === 'subscription') {
        if (params.trialPeriodDays && params.trialPeriodDays > 0) {
          sessionParams.subscription_data = {
            trial_period_days: params.trialPeriodDays,
            metadata: params.metadata,
          };
        }
      }

      // Allow promotion codes
      if (params.allowPromotionCodes !== false) {
        sessionParams.allow_promotion_codes = true;
      }

      // Payment method types
      sessionParams.payment_method_types = ['card'];

      const session = await this.stripe.checkout.sessions.create(sessionParams);
      logger.info(`Checkout session created: ${session.id}`);

      return session;
    } catch (error: any) {
      logger.error('Failed to create checkout session:', error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  /**
   * Retrieve checkout session by ID
   */
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch (error: any) {
      logger.error(`Failed to retrieve checkout session ${sessionId}:`, error);
      throw new Error(`Failed to retrieve checkout session: ${error.message}`);
    }
  }

  /**
   * Create a Stripe price for a product
   */
  async createPrice(params: {
    productId: string;
    unitAmount: number;
    currency: string;
    recurring?: {
      interval: 'month' | 'year' | 'week' | 'day';
      intervalCount?: number;
    };
    metadata?: Record<string, string>;
  }): Promise<Stripe.Price> {
    try {
      const priceParams: Stripe.PriceCreateParams = {
        product: params.productId,
        unit_amount: Math.round(params.unitAmount * 100),
        currency: params.currency,
        metadata: params.metadata,
      };

      if (params.recurring) {
        priceParams.recurring = {
          interval: params.recurring.interval,
          interval_count: params.recurring.intervalCount || 1,
        };
      }

      return await this.stripe.prices.create(priceParams);
    } catch (error: any) {
      logger.error('Failed to create price:', error);
      throw new Error(`Failed to create price: ${error.message}`);
    }
  }

  /**
   * Create a Stripe product
   */
  async createProduct(params: {
    name: string;
    description?: string;
    metadata?: Record<string, string>;
    images?: string[];
  }): Promise<Stripe.Product> {
    try {
      return await this.stripe.products.create({
        name: params.name,
        description: params.description,
        metadata: params.metadata,
        images: params.images,
      });
    } catch (error: any) {
      logger.error('Failed to create product:', error);
      throw new Error(`Failed to create product: ${error.message}`);
    }
  }

  /**
   * List all prices for a product
   */
  async listPrices(productId?: string, active?: boolean): Promise<Stripe.Price[]> {
    try {
      const params: Stripe.PriceListParams = {};
      if (productId) params.product = productId;
      if (active !== undefined) params.active = active;

      const prices = await this.stripe.prices.list(params);
      return prices.data;
    } catch (error: any) {
      logger.error('Failed to list prices:', error);
      throw new Error(`Failed to list prices: ${error.message}`);
    }
  }

  /**
   * Get price by ID
   */
  async getPrice(priceId: string): Promise<Stripe.Price> {
    try {
      return await this.stripe.prices.retrieve(priceId);
    } catch (error: any) {
      logger.error(`Failed to get price ${priceId}:`, error);
      throw new Error(`Failed to get price: ${error.message}`);
    }
  }

  /**
   * Update product
   */
  async updateProduct(
    productId: string,
    updates: {
      name?: string;
      description?: string;
      active?: boolean;
      metadata?: Record<string, string>;
    }
  ): Promise<Stripe.Product> {
    try {
      return await this.stripe.products.update(productId, updates);
    } catch (error: any) {
      logger.error(`Failed to update product ${productId}:`, error);
      throw new Error(`Failed to update product: ${error.message}`);
    }
  }

  /**
   * Validate Stripe configuration
   */
  static validateConfiguration(): { valid: boolean; errors: string[] } {
    return paymentConfig.validateStripeConfig();
  }

  /**
   * Get Stripe configuration status
   */
  static getConfigurationStatus(): {
    configured: boolean;
    mode: 'test' | 'live' | 'unknown';
    apiVersion: string;
    environment: string;
  } {
    return paymentConfig.getStripeStatus();
  }
}

export default new PaymentService();
