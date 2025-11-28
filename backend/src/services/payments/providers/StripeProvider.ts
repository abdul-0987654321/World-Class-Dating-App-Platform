/**
 * Stripe Payment Provider
 * Full implementation of Stripe integration for payments, subscriptions, and webhooks
 */

import Stripe from 'stripe';
import { BasePaymentProvider, CheckoutSessionMixin } from './BaseProvider';
import {
  IPaymentProvider,
  ICheckoutSessionProvider,
  CheckoutSessionOptions,
  CheckoutSession,
} from './PaymentProvider.interface';
import {
  PaymentProvider,
  PaymentCustomer,
  PaymentMethod,
  PaymentIntent,
  Subscription,
  Refund,
  CreateCustomerRequest,
  CreatePaymentIntentRequest,
  CreateSubscriptionRequest,
  CancelSubscriptionRequest,
  RefundRequest,
  TransactionStatus,
  SubscriptionStatus,
  WebhookEvent,
  WebhookProcessingResult,
  WebhookEventType,
  PaymentMethodType,
  BillingPeriod,
  PaymentError,
  PaymentProviderError,
  SubscriptionTier,
} from '../types';

export class StripeProvider extends BasePaymentProvider implements ICheckoutSessionProvider {
  readonly provider = PaymentProvider.STRIPE;
  private stripe: Stripe | null = null;
  private webhookSecret: string | null = null;
  private publishableKey: string | null = null;

  // ============================================
  // INITIALIZATION
  // ============================================

  async initialize(): Promise<void> {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || null;
    this.publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || null;

    if (!secretKey) {
      this.log('warn', 'Stripe secret key not configured');
      this._isConfigured = false;
      return;
    }

    try {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16',
        typescript: true,
        appInfo: {
          name: 'Flamoral Dating App',
          version: '1.0.0',
        },
      });

      // Verify connection
      await this.stripe.balance.retrieve();

      this._isConfigured = true;
      this.log('info', 'Stripe provider initialized successfully');
    } catch (error: any) {
      this.log('error', 'Failed to initialize Stripe', { error: error.message });
      this._isConfigured = false;
    }
  }

  getPublishableKey(): string | null {
    return this.publishableKey;
  }

  // ============================================
  // CUSTOMER MANAGEMENT
  // ============================================

  async createCustomer(request: CreateCustomerRequest): Promise<PaymentCustomer> {
    this.ensureConfigured();
    this.validateRequired(request, ['userId', 'email']);

    try {
      const customer = await this.stripe!.customers.create({
        email: request.email,
        name: request.name,
        phone: request.phone,
        metadata: {
          userId: request.userId,
          ...this.sanitizeMetadata(request.metadata),
        },
      });

      this.log('info', 'Customer created', { customerId: customer.id, userId: request.userId });

      return this.mapStripeCustomer(customer, request.userId);
    } catch (error: any) {
      this.handleError(error, 'Create customer');
    }
  }

  async getCustomer(providerCustomerId: string): Promise<PaymentCustomer | null> {
    this.ensureConfigured();

    try {
      const customer = await this.stripe!.customers.retrieve(providerCustomerId);

      if ((customer as Stripe.DeletedCustomer).deleted) {
        return null;
      }

      return this.mapStripeCustomer(customer as Stripe.Customer);
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        return null;
      }
      this.handleError(error, 'Get customer');
    }
  }

  async updateCustomer(
    providerCustomerId: string,
    updates: Partial<CreateCustomerRequest>
  ): Promise<PaymentCustomer> {
    this.ensureConfigured();

    try {
      const updateData: Stripe.CustomerUpdateParams = {};
      if (updates.email) updateData.email = updates.email;
      if (updates.name) updateData.name = updates.name;
      if (updates.phone) updateData.phone = updates.phone;
      if (updates.metadata) {
        updateData.metadata = this.sanitizeMetadata(updates.metadata);
      }

      const customer = await this.stripe!.customers.update(providerCustomerId, updateData);

      this.log('info', 'Customer updated', { customerId: providerCustomerId });

      return this.mapStripeCustomer(customer);
    } catch (error: any) {
      this.handleError(error, 'Update customer');
    }
  }

  async deleteCustomer(providerCustomerId: string): Promise<void> {
    this.ensureConfigured();

    try {
      await this.stripe!.customers.del(providerCustomerId);
      this.log('info', 'Customer deleted', { customerId: providerCustomerId });
    } catch (error: any) {
      if (error.code !== 'resource_missing') {
        this.handleError(error, 'Delete customer');
      }
    }
  }

  // ============================================
  // PAYMENT METHOD MANAGEMENT
  // ============================================

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethod> {
    this.ensureConfigured();

    try {
      const paymentMethod = await this.stripe!.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      this.log('info', 'Payment method attached', { customerId, paymentMethodId });

      return this.mapStripePaymentMethod(paymentMethod, customerId);
    } catch (error: any) {
      this.handleError(error, 'Attach payment method');
    }
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    this.ensureConfigured();

    try {
      await this.stripe!.paymentMethods.detach(paymentMethodId);
      this.log('info', 'Payment method detached', { paymentMethodId });
    } catch (error: any) {
      this.handleError(error, 'Detach payment method');
    }
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    this.ensureConfigured();

    try {
      const paymentMethods = await this.stripe!.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data.map(pm => this.mapStripePaymentMethod(pm, customerId));
    } catch (error: any) {
      this.handleError(error, 'List payment methods');
    }
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    this.ensureConfigured();

    try {
      await this.stripe!.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      this.log('info', 'Default payment method set', { customerId, paymentMethodId });
    } catch (error: any) {
      this.handleError(error, 'Set default payment method');
    }
  }

  async getPaymentMethod(paymentMethodId: string): Promise<PaymentMethod | null> {
    this.ensureConfigured();

    try {
      const paymentMethod = await this.stripe!.paymentMethods.retrieve(paymentMethodId);
      return this.mapStripePaymentMethod(paymentMethod);
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        return null;
      }
      this.handleError(error, 'Get payment method');
    }
  }

  // ============================================
  // PAYMENT INTENTS
  // ============================================

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    this.ensureConfigured();
    this.validateRequired(request, ['userId', 'amount', 'currency']);
    this.validateAmount(request.amount, request.currency);

    try {
      const params: Stripe.PaymentIntentCreateParams = {
        amount: this.convertToProviderAmount(request.amount, request.currency),
        currency: this.formatCurrency(request.currency),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId: request.userId,
          ...this.sanitizeMetadata(request.metadata),
        },
      };

      if (request.customerId) {
        params.customer = request.customerId;
      }

      if (request.description) {
        params.description = request.description;
      }

      if (request.setupFutureUsage) {
        params.setup_future_usage = request.setupFutureUsage;
      }

      const paymentIntent = await this.stripe!.paymentIntents.create(params);

      this.log('info', 'Payment intent created', {
        paymentIntentId: paymentIntent.id,
        userId: request.userId,
        amount: request.amount,
      });

      return this.mapStripePaymentIntent(paymentIntent);
    } catch (error: any) {
      this.handleError(error, 'Create payment intent');
    }
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    this.ensureConfigured();

    try {
      const paymentIntent = await this.stripe!.paymentIntents.confirm(paymentIntentId);
      return this.mapStripePaymentIntent(paymentIntent);
    } catch (error: any) {
      this.handleError(error, 'Confirm payment intent');
    }
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    this.ensureConfigured();

    try {
      const paymentIntent = await this.stripe!.paymentIntents.cancel(paymentIntentId);
      return this.mapStripePaymentIntent(paymentIntent);
    } catch (error: any) {
      this.handleError(error, 'Cancel payment intent');
    }
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null> {
    this.ensureConfigured();

    try {
      const paymentIntent = await this.stripe!.paymentIntents.retrieve(paymentIntentId);
      return this.mapStripePaymentIntent(paymentIntent);
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        return null;
      }
      this.handleError(error, 'Get payment intent');
    }
  }

  // ============================================
  // SUBSCRIPTIONS
  // ============================================

  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    this.ensureConfigured();
    this.validateRequired(request, ['userId', 'planId']);

    try {
      // Get or create customer
      let customerId = request.metadata?.stripeCustomerId;

      if (!customerId) {
        throw new PaymentError(
          'Stripe customer ID is required for subscription',
          'VALIDATION_ERROR',
          this.provider
        );
      }

      const params: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: request.planId }],
        metadata: {
          userId: request.userId,
          tier: request.metadata?.tier || 'premium',
          ...this.sanitizeMetadata(request.metadata),
        },
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      };

      // Add trial if specified
      if (request.trialDays && request.trialDays > 0) {
        params.trial_period_days = request.trialDays;
      }

      // Add payment method if specified
      if (request.paymentMethodId) {
        params.default_payment_method = request.paymentMethodId;
      }

      // Add coupon if specified
      if (request.couponCode) {
        params.coupon = request.couponCode;
      }

      const subscription = await this.stripe!.subscriptions.create(params);

      this.log('info', 'Subscription created', {
        subscriptionId: subscription.id,
        userId: request.userId,
        planId: request.planId,
      });

      return this.mapStripeSubscription(subscription, request.userId);
    } catch (error: any) {
      this.handleError(error, 'Create subscription');
    }
  }

  async getSubscription(providerSubscriptionId: string): Promise<Subscription | null> {
    this.ensureConfigured();

    try {
      const subscription = await this.stripe!.subscriptions.retrieve(providerSubscriptionId);
      return this.mapStripeSubscription(subscription);
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        return null;
      }
      this.handleError(error, 'Get subscription');
    }
  }

  async updateSubscription(
    providerSubscriptionId: string,
    updates: {
      planId?: string;
      billingPeriod?: BillingPeriod;
      paymentMethodId?: string;
      cancelAtPeriodEnd?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<Subscription> {
    this.ensureConfigured();

    try {
      const updateParams: Stripe.SubscriptionUpdateParams = {};

      if (updates.planId) {
        // Get current subscription to find item ID
        const currentSub = await this.stripe!.subscriptions.retrieve(providerSubscriptionId);
        updateParams.items = [
          {
            id: currentSub.items.data[0].id,
            price: updates.planId,
          },
        ];
        updateParams.proration_behavior = 'create_prorations';
      }

      if (updates.paymentMethodId) {
        updateParams.default_payment_method = updates.paymentMethodId;
      }

      if (updates.cancelAtPeriodEnd !== undefined) {
        updateParams.cancel_at_period_end = updates.cancelAtPeriodEnd;
      }

      if (updates.metadata) {
        updateParams.metadata = this.sanitizeMetadata(updates.metadata);
      }

      const subscription = await this.stripe!.subscriptions.update(
        providerSubscriptionId,
        updateParams
      );

      this.log('info', 'Subscription updated', { subscriptionId: providerSubscriptionId });

      return this.mapStripeSubscription(subscription);
    } catch (error: any) {
      this.handleError(error, 'Update subscription');
    }
  }

  async cancelSubscription(request: CancelSubscriptionRequest): Promise<Subscription> {
    this.ensureConfigured();

    try {
      let subscription: Stripe.Subscription;

      if (request.immediately) {
        subscription = await this.stripe!.subscriptions.cancel(request.subscriptionId);
      } else {
        subscription = await this.stripe!.subscriptions.update(request.subscriptionId, {
          cancel_at_period_end: true,
          metadata: request.reason ? { cancellation_reason: request.reason } : undefined,
        });
      }

      this.log('info', 'Subscription canceled', {
        subscriptionId: request.subscriptionId,
        immediately: request.immediately,
      });

      return this.mapStripeSubscription(subscription);
    } catch (error: any) {
      this.handleError(error, 'Cancel subscription');
    }
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<Subscription> {
    this.ensureConfigured();

    try {
      const subscription = await this.stripe!.subscriptions.update(providerSubscriptionId, {
        cancel_at_period_end: false,
      });

      this.log('info', 'Subscription reactivated', { subscriptionId: providerSubscriptionId });

      return this.mapStripeSubscription(subscription);
    } catch (error: any) {
      this.handleError(error, 'Reactivate subscription');
    }
  }

  async pauseSubscription(providerSubscriptionId: string): Promise<Subscription> {
    this.ensureConfigured();

    try {
      const subscription = await this.stripe!.subscriptions.update(providerSubscriptionId, {
        pause_collection: {
          behavior: 'void',
        },
      });

      this.log('info', 'Subscription paused', { subscriptionId: providerSubscriptionId });

      return this.mapStripeSubscription(subscription);
    } catch (error: any) {
      this.handleError(error, 'Pause subscription');
    }
  }

  async resumeSubscription(providerSubscriptionId: string): Promise<Subscription> {
    this.ensureConfigured();

    try {
      const subscription = await this.stripe!.subscriptions.update(providerSubscriptionId, {
        pause_collection: '',
      });

      this.log('info', 'Subscription resumed', { subscriptionId: providerSubscriptionId });

      return this.mapStripeSubscription(subscription);
    } catch (error: any) {
      this.handleError(error, 'Resume subscription');
    }
  }

  // ============================================
  // REFUNDS
  // ============================================

  async createRefund(request: RefundRequest): Promise<Refund> {
    this.ensureConfigured();
    this.validateRequired(request, ['transactionId']);

    try {
      const params: Stripe.RefundCreateParams = {
        payment_intent: request.transactionId,
      };

      if (request.amount) {
        params.amount = this.convertToProviderAmount(request.amount, 'USD');
      }

      if (request.reason) {
        params.reason = request.reason as Stripe.RefundCreateParams.Reason;
        params.metadata = { reason: request.reason };
      }

      const refund = await this.stripe!.refunds.create(params);

      this.log('info', 'Refund created', { refundId: refund.id, transactionId: request.transactionId });

      return this.mapStripeRefund(refund, request.transactionId);
    } catch (error: any) {
      this.handleError(error, 'Create refund');
    }
  }

  async getRefund(refundId: string): Promise<Refund | null> {
    this.ensureConfigured();

    try {
      const refund = await this.stripe!.refunds.retrieve(refundId);
      return this.mapStripeRefund(refund);
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        return null;
      }
      this.handleError(error, 'Get refund');
    }
  }

  // ============================================
  // CHECKOUT SESSIONS
  // ============================================

  async createCheckoutSession(options: CheckoutSessionOptions): Promise<CheckoutSession> {
    this.ensureConfigured();
    this.validateRequired(options, ['userId', 'successUrl', 'cancelUrl', 'mode']);

    try {
      const params: Stripe.Checkout.SessionCreateParams = {
        mode: options.mode,
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
        metadata: {
          userId: options.userId,
          ...this.sanitizeMetadata(options.metadata),
        },
        line_items: options.lineItems.map(item => ({
          price: item.priceId,
          quantity: item.quantity,
        })),
      };

      if (options.customerId) {
        params.customer = options.customerId;
      } else if (options.customerEmail) {
        params.customer_email = options.customerEmail;
      }

      if (options.billingAddressCollection) {
        params.billing_address_collection = options.billingAddressCollection;
      }

      const session = await this.stripe!.checkout.sessions.create(params);

      this.log('info', 'Checkout session created', {
        sessionId: session.id,
        userId: options.userId,
      });

      return {
        id: session.id,
        providerSessionId: session.id,
        url: session.url!,
        status: session.status === 'complete' ? 'complete' : session.status === 'expired' ? 'expired' : 'open',
        mode: options.mode,
        customerId: session.customer as string | undefined,
        subscriptionId: session.subscription as string | undefined,
        paymentIntentId: session.payment_intent as string | undefined,
        amountTotal: session.amount_total ? this.convertFromProviderAmount(session.amount_total, session.currency!) : undefined,
        currency: session.currency || undefined,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
      };
    } catch (error: any) {
      this.handleError(error, 'Create checkout session');
    }
  }

  async getCheckoutSession(sessionId: string): Promise<CheckoutSession | null> {
    this.ensureConfigured();

    try {
      const session = await this.stripe!.checkout.sessions.retrieve(sessionId);

      return {
        id: session.id,
        providerSessionId: session.id,
        url: session.url || '',
        status: session.status === 'complete' ? 'complete' : session.status === 'expired' ? 'expired' : 'open',
        mode: session.mode as 'payment' | 'subscription' | 'setup',
        customerId: session.customer as string | undefined,
        subscriptionId: session.subscription as string | undefined,
        paymentIntentId: session.payment_intent as string | undefined,
        amountTotal: session.amount_total ? this.convertFromProviderAmount(session.amount_total, session.currency!) : undefined,
        currency: session.currency || undefined,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
      };
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        return null;
      }
      this.handleError(error, 'Get checkout session');
    }
  }

  // ============================================
  // WEBHOOKS
  // ============================================

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    if (!this.webhookSecret) {
      this.log('warn', 'Webhook secret not configured');
      return false;
    }

    try {
      this.stripe!.webhooks.constructEvent(payload, signature, this.webhookSecret);
      return true;
    } catch (error) {
      return false;
    }
  }

  parseWebhookEvent(payload: string | Buffer, signature: string): WebhookEvent | null {
    if (!this.webhookSecret) {
      this.log('warn', 'Webhook secret not configured');
      return null;
    }

    try {
      const event = this.stripe!.webhooks.constructEvent(payload, signature, this.webhookSecret);

      return {
        id: `stripe_${event.id}`,
        provider: PaymentProvider.STRIPE,
        eventType: this.mapStripeEventType(event.type),
        eventId: event.id,
        data: event.data.object as Record<string, any>,
        timestamp: new Date(event.created * 1000),
        rawPayload: typeof payload === 'string' ? payload : payload.toString(),
      };
    } catch (error: any) {
      this.log('error', 'Failed to parse webhook event', { error: error.message });
      return null;
    }
  }

  async processWebhookEvent(event: WebhookEvent): Promise<WebhookProcessingResult> {
    this.log('info', `Processing webhook event: ${event.eventType}`, { eventId: event.eventId });

    // Return the processed event info - actual business logic is handled by WebhookService
    return {
      success: true,
      eventId: event.eventId,
      eventType: event.eventType,
      message: `Event ${event.eventType} received`,
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  getSupportedPaymentMethods(): PaymentMethodType[] {
    return [
      PaymentMethodType.CARD,
      PaymentMethodType.APPLE_PAY,
      PaymentMethodType.GOOGLE_PAY,
      PaymentMethodType.BANK_ACCOUNT,
      PaymentMethodType.ACH,
    ];
  }

  getSupportedCurrencies(): string[] {
    return [
      'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'NOK', 'SEK', 'DKK',
      'NZD', 'SGD', 'HKD', 'INR', 'BRL', 'MXN', 'PLN', 'CZK', 'HUF', 'RON',
    ];
  }

  mapTransactionStatus(stripeStatus: string): TransactionStatus {
    const statusMap: Record<string, TransactionStatus> = {
      requires_payment_method: TransactionStatus.PENDING,
      requires_confirmation: TransactionStatus.PENDING,
      requires_action: TransactionStatus.REQUIRES_ACTION,
      processing: TransactionStatus.PROCESSING,
      requires_capture: TransactionStatus.PROCESSING,
      canceled: TransactionStatus.CANCELED,
      succeeded: TransactionStatus.SUCCEEDED,
    };
    return statusMap[stripeStatus] || TransactionStatus.PENDING;
  }

  mapSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      trialing: SubscriptionStatus.TRIALING,
      past_due: SubscriptionStatus.PAST_DUE,
      unpaid: SubscriptionStatus.UNPAID,
      canceled: SubscriptionStatus.CANCELED,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
      paused: SubscriptionStatus.PAUSED,
    };
    return statusMap[stripeStatus] || SubscriptionStatus.INCOMPLETE;
  }

  // ============================================
  // PRIVATE MAPPING METHODS
  // ============================================

  private mapStripeCustomer(customer: Stripe.Customer, userId?: string): PaymentCustomer {
    return {
      id: userId || customer.metadata?.userId || customer.id,
      providerCustomerId: customer.id,
      provider: PaymentProvider.STRIPE,
      email: customer.email || '',
      name: customer.name || undefined,
      phone: customer.phone || undefined,
      metadata: customer.metadata,
      createdAt: new Date(customer.created * 1000),
    };
  }

  private mapStripePaymentMethod(pm: Stripe.PaymentMethod, customerId?: string): PaymentMethod {
    return {
      id: pm.id,
      customerId: customerId || (pm.customer as string) || '',
      providerPaymentMethodId: pm.id,
      provider: PaymentProvider.STRIPE,
      type: this.mapStripePaymentMethodType(pm.type),
      isDefault: false, // Would need to check customer's default
      cardBrand: pm.card?.brand,
      cardLast4: pm.card?.last4,
      cardExpMonth: pm.card?.exp_month,
      cardExpYear: pm.card?.exp_year,
      cardFunding: pm.card?.funding,
      billingName: pm.billing_details?.name || undefined,
      billingEmail: pm.billing_details?.email || undefined,
      billingAddress: pm.billing_details?.address
        ? {
            line1: pm.billing_details.address.line1 || undefined,
            line2: pm.billing_details.address.line2 || undefined,
            city: pm.billing_details.address.city || undefined,
            state: pm.billing_details.address.state || undefined,
            postalCode: pm.billing_details.address.postal_code || undefined,
            country: pm.billing_details.address.country || 'US',
          }
        : undefined,
      metadata: pm.metadata,
      createdAt: new Date(pm.created * 1000),
    };
  }

  private mapStripePaymentMethodType(type: string): PaymentMethodType {
    const typeMap: Record<string, PaymentMethodType> = {
      card: PaymentMethodType.CARD,
      us_bank_account: PaymentMethodType.ACH,
      sepa_debit: PaymentMethodType.BANK_ACCOUNT,
    };
    return typeMap[type] || PaymentMethodType.CARD;
  }

  private mapStripePaymentIntent(pi: Stripe.PaymentIntent): PaymentIntent {
    return {
      id: pi.id,
      providerIntentId: pi.id,
      provider: PaymentProvider.STRIPE,
      amount: this.convertFromProviderAmount(pi.amount, pi.currency),
      currency: pi.currency.toUpperCase(),
      status: this.mapTransactionStatus(pi.status),
      customerId: pi.customer as string | undefined,
      paymentMethodId: pi.payment_method as string | undefined,
      clientSecret: pi.client_secret || undefined,
      description: pi.description || undefined,
      metadata: pi.metadata,
      requiresAction: pi.status === 'requires_action',
      nextActionUrl: pi.next_action?.redirect_to_url?.url,
      createdAt: new Date(pi.created * 1000),
    };
  }

  private mapStripeSubscription(sub: Stripe.Subscription, userId?: string): Subscription {
    const tier = (sub.metadata?.tier as SubscriptionTier) || SubscriptionTier.PREMIUM;

    return {
      id: sub.id,
      userId: userId || sub.metadata?.userId || '',
      providerSubscriptionId: sub.id,
      provider: PaymentProvider.STRIPE,
      planId: sub.items.data[0]?.price?.id || '',
      tier,
      status: this.mapSubscriptionStatus(sub.status),
      billingPeriod: sub.items.data[0]?.price?.recurring?.interval === 'year'
        ? BillingPeriod.YEARLY
        : BillingPeriod.MONTHLY,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : undefined,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : undefined,
      metadata: sub.metadata,
      createdAt: new Date(sub.created * 1000),
      updatedAt: new Date(),
    };
  }

  private mapStripeRefund(refund: Stripe.Refund, transactionId?: string): Refund {
    return {
      id: refund.id,
      transactionId: transactionId || (refund.payment_intent as string) || '',
      providerRefundId: refund.id,
      provider: PaymentProvider.STRIPE,
      amount: this.convertFromProviderAmount(refund.amount, refund.currency),
      currency: refund.currency.toUpperCase(),
      status: refund.status as 'pending' | 'succeeded' | 'failed' | 'canceled',
      reason: refund.reason || undefined,
      metadata: refund.metadata,
      createdAt: new Date(refund.created * 1000),
    };
  }

  private mapStripeEventType(stripeEventType: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      'payment_intent.created': WebhookEventType.PAYMENT_CREATED,
      'payment_intent.succeeded': WebhookEventType.PAYMENT_SUCCEEDED,
      'payment_intent.payment_failed': WebhookEventType.PAYMENT_FAILED,
      'charge.refunded': WebhookEventType.PAYMENT_REFUNDED,
      'charge.dispute.created': WebhookEventType.PAYMENT_DISPUTED,
      'customer.subscription.created': WebhookEventType.SUBSCRIPTION_CREATED,
      'customer.subscription.updated': WebhookEventType.SUBSCRIPTION_UPDATED,
      'customer.subscription.deleted': WebhookEventType.SUBSCRIPTION_CANCELED,
      'invoice.payment_succeeded': WebhookEventType.SUBSCRIPTION_RENEWED,
      'invoice.payment_failed': WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED,
      'customer.subscription.trial_will_end': WebhookEventType.SUBSCRIPTION_TRIAL_ENDING,
      'customer.created': WebhookEventType.CUSTOMER_CREATED,
      'customer.updated': WebhookEventType.CUSTOMER_UPDATED,
      'customer.deleted': WebhookEventType.CUSTOMER_DELETED,
      'payment_method.attached': WebhookEventType.PAYMENT_METHOD_ATTACHED,
      'payment_method.detached': WebhookEventType.PAYMENT_METHOD_DETACHED,
      'payment_method.updated': WebhookEventType.PAYMENT_METHOD_UPDATED,
    };
    return eventMap[stripeEventType] || WebhookEventType.PAYMENT_CREATED;
  }
}

// Export singleton instance
export const stripeProvider = new StripeProvider();
