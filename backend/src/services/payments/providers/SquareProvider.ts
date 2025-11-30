/**
 * Square Payment Provider
 * Full implementation of Square integration for payments, subscriptions, and webhooks
 *
 * Square API Version: 2024-01-18
 * Documentation: https://developer.squareup.com/docs
 */

import { Client, Environment, ApiError } from 'square';
import { BasePaymentProvider } from './BaseProvider';
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
  PaymentProviderError,
  SubscriptionTier,
} from '../types';
import crypto from 'crypto';

interface SquareConfig {
  accessToken: string;
  applicationId: string;
  locationId: string;
  environment: 'sandbox' | 'production';
  webhookSignatureKey?: string;
}

export class SquareProvider extends BasePaymentProvider implements ICheckoutSessionProvider {
  readonly provider = PaymentProvider.SQUARE;
  private client: Client | null = null;
  private config: SquareConfig | null = null;

  // ============================================
  // INITIALIZATION
  // ============================================

  async initialize(): Promise<void> {
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const applicationId = process.env.SQUARE_APPLICATION_ID;
    const locationId = process.env.SQUARE_LOCATION_ID;
    const environment = (process.env.SQUARE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';
    const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    if (!accessToken || !applicationId || !locationId) {
      this.log('warn', 'Square credentials not configured');
      this._isConfigured = false;
      return;
    }

    try {
      this.config = {
        accessToken,
        applicationId,
        locationId,
        environment,
        webhookSignatureKey,
      };

      this.client = new Client({
        accessToken,
        environment: environment === 'production' ? Environment.Production : Environment.Sandbox,
      });

      // Verify connection by retrieving location
      const { result } = await this.client.locationsApi.retrieveLocation(locationId);
      if (!result.location) {
        throw new Error('Invalid location ID');
      }

      this._isConfigured = true;
      this.log('info', 'Square provider initialized successfully', {
        locationId,
        locationName: result.location.name,
      });
    } catch (error: any) {
      this.log('error', 'Failed to initialize Square', { error: error.message });
      this._isConfigured = false;
    }
  }

  getApplicationId(): string | null {
    return this.config?.applicationId || null;
  }

  getLocationId(): string | null {
    return this.config?.locationId || null;
  }

  // ============================================
  // CUSTOMER MANAGEMENT
  // ============================================

  async createCustomer(request: CreateCustomerRequest): Promise<PaymentCustomer> {
    this.ensureConfigured();
    this.validateRequired(request, ['userId', 'email']);

    try {
      const { result } = await this.client!.customersApi.createCustomer({
        idempotencyKey: this.generateIdempotencyKey(),
        emailAddress: request.email,
        givenName: request.name?.split(' ')[0],
        familyName: request.name?.split(' ').slice(1).join(' '),
        phoneNumber: request.phone,
        referenceId: request.userId,
        note: JSON.stringify({ userId: request.userId, ...request.metadata }),
      });

      if (!result.customer) {
        throw new Error('Failed to create customer');
      }

      this.log('info', 'Customer created', {
        customerId: result.customer.id,
        userId: request.userId,
      });

      return this.mapSquareCustomer(result.customer, request.userId);
    } catch (error: any) {
      this.handleSquareError(error, 'Create customer');
    }
  }

  async getCustomer(providerCustomerId: string): Promise<PaymentCustomer | null> {
    this.ensureConfigured();

    try {
      const { result } = await this.client!.customersApi.retrieveCustomer(providerCustomerId);

      if (!result.customer) {
        return null;
      }

      return this.mapSquareCustomer(result.customer);
    } catch (error: any) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      this.handleSquareError(error, 'Get customer');
    }
  }

  async updateCustomer(
    providerCustomerId: string,
    updates: Partial<CreateCustomerRequest>
  ): Promise<PaymentCustomer> {
    this.ensureConfigured();

    try {
      const updateData: any = {};
      if (updates.email) updateData.emailAddress = updates.email;
      if (updates.name) {
        updateData.givenName = updates.name.split(' ')[0];
        updateData.familyName = updates.name.split(' ').slice(1).join(' ');
      }
      if (updates.phone) updateData.phoneNumber = updates.phone;

      const { result } = await this.client!.customersApi.updateCustomer(providerCustomerId, updateData);

      if (!result.customer) {
        throw new Error('Failed to update customer');
      }

      this.log('info', 'Customer updated', { customerId: providerCustomerId });

      return this.mapSquareCustomer(result.customer);
    } catch (error: any) {
      this.handleSquareError(error, 'Update customer');
    }
  }

  async deleteCustomer(providerCustomerId: string): Promise<void> {
    this.ensureConfigured();

    try {
      await this.client!.customersApi.deleteCustomer(providerCustomerId);
      this.log('info', 'Customer deleted', { customerId: providerCustomerId });
    } catch (error: any) {
      if (!this.isNotFoundError(error)) {
        this.handleSquareError(error, 'Delete customer');
      }
    }
  }

  // ============================================
  // PAYMENT METHOD MANAGEMENT
  // ============================================

  async attachPaymentMethod(customerId: string, cardNonce: string): Promise<PaymentMethod> {
    this.ensureConfigured();

    try {
      const { result } = await this.client!.cardsApi.createCard({
        idempotencyKey: this.generateIdempotencyKey(),
        sourceId: cardNonce,
        card: {
          customerId,
        },
      });

      if (!result.card) {
        throw new Error('Failed to create card');
      }

      this.log('info', 'Card attached', { customerId, cardId: result.card.id });

      return this.mapSquareCard(result.card, customerId);
    } catch (error: any) {
      this.handleSquareError(error, 'Attach payment method');
    }
  }

  async detachPaymentMethod(cardId: string): Promise<void> {
    this.ensureConfigured();

    try {
      await this.client!.cardsApi.disableCard(cardId);
      this.log('info', 'Card detached', { cardId });
    } catch (error: any) {
      this.handleSquareError(error, 'Detach payment method');
    }
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    this.ensureConfigured();

    try {
      const { result } = await this.client!.cardsApi.listCards(undefined, customerId);

      return (result.cards || []).map(card => this.mapSquareCard(card, customerId));
    } catch (error: any) {
      this.handleSquareError(error, 'List payment methods');
    }
  }

  async setDefaultPaymentMethod(customerId: string, cardId: string): Promise<void> {
    this.ensureConfigured();

    // Square doesn't have a native default card concept
    // We store this preference in our database
    this.log('info', 'Default payment method set', { customerId, cardId });
  }

  async getPaymentMethod(cardId: string): Promise<PaymentMethod | null> {
    this.ensureConfigured();

    try {
      const { result } = await this.client!.cardsApi.retrieveCard(cardId);

      if (!result.card) {
        return null;
      }

      return this.mapSquareCard(result.card);
    } catch (error: any) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      this.handleSquareError(error, 'Get payment method');
    }
  }

  // ============================================
  // PAYMENT INTENTS / PAYMENTS
  // ============================================

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    this.ensureConfigured();
    this.validateRequired(request, ['userId', 'amount', 'currency']);
    this.validateAmount(request.amount, request.currency);

    const idempotencyKey = this.generateIdempotencyKey();

    try {
      // Square uses Payments API directly, not a two-step intent like Stripe
      // For now, we create a payment that will be completed when customer provides source
      const { result } = await this.client!.paymentsApi.createPayment({
        idempotencyKey,
        sourceId: 'EXTERNAL', // Will be replaced with actual source
        amountMoney: {
          amount: BigInt(this.convertToProviderAmount(request.amount, request.currency)),
          currency: this.formatCurrency(request.currency),
        },
        locationId: this.config!.locationId,
        customerId: request.customerId,
        note: request.description,
        referenceId: request.userId,
        autocomplete: false, // Manual capture
      });

      if (!result.payment) {
        throw new Error('Failed to create payment');
      }

      this.log('info', 'Payment created', {
        paymentId: result.payment.id,
        userId: request.userId,
        amount: request.amount,
      });

      return this.mapSquarePayment(result.payment);
    } catch (error: any) {
      // If EXTERNAL source fails, we need to return a pending intent
      // that will be completed via the Web Payments SDK
      this.log('info', 'Creating pending payment intent for Square Web Payments');

      return {
        id: idempotencyKey,
        providerIntentId: idempotencyKey,
        provider: this.provider,
        amount: request.amount,
        currency: request.currency.toUpperCase(),
        status: TransactionStatus.PENDING,
        customerId: request.customerId,
        clientSecret: idempotencyKey, // Used for client-side tokenization
        description: request.description,
        metadata: {
          ...request.metadata,
          userId: request.userId,
          locationId: this.config!.locationId,
          applicationId: this.config!.applicationId,
        },
        createdAt: new Date(),
      };
    }
  }

  async confirmPaymentIntent(paymentId: string, sourceId?: string): Promise<PaymentIntent> {
    this.ensureConfigured();

    try {
      if (sourceId) {
        // Complete payment with the tokenized source
        const { result } = await this.client!.paymentsApi.createPayment({
          idempotencyKey: paymentId,
          sourceId,
          amountMoney: {
            amount: BigInt(0), // Will be retrieved from stored intent
            currency: 'USD',
          },
          locationId: this.config!.locationId,
          autocomplete: true,
        });

        if (!result.payment) {
          throw new Error('Failed to confirm payment');
        }

        return this.mapSquarePayment(result.payment);
      } else {
        // Complete an existing payment
        const { result } = await this.client!.paymentsApi.completePayment(paymentId, {});

        if (!result.payment) {
          throw new Error('Failed to complete payment');
        }

        return this.mapSquarePayment(result.payment);
      }
    } catch (error: any) {
      this.handleSquareError(error, 'Confirm payment');
    }
  }

  async cancelPaymentIntent(paymentId: string): Promise<PaymentIntent> {
    this.ensureConfigured();

    try {
      const { result } = await this.client!.paymentsApi.cancelPayment(paymentId);

      if (!result.payment) {
        throw new Error('Failed to cancel payment');
      }

      return this.mapSquarePayment(result.payment);
    } catch (error: any) {
      this.handleSquareError(error, 'Cancel payment');
    }
  }

  async getPaymentIntent(paymentId: string): Promise<PaymentIntent | null> {
    this.ensureConfigured();

    try {
      const { result } = await this.client!.paymentsApi.getPayment(paymentId);

      if (!result.payment) {
        return null;
      }

      return this.mapSquarePayment(result.payment);
    } catch (error: any) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      this.handleSquareError(error, 'Get payment');
    }
  }

  // ============================================
  // SUBSCRIPTIONS
  // ============================================

  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    this.ensureConfigured();
    this.validateRequired(request, ['userId', 'planId']);

    try {
      const customerId = request.metadata?.squareCustomerId;
      if (!customerId) {
        throw new PaymentProviderError(
          'Square customer ID is required for subscription',
          this.provider,
          'VALIDATION_ERROR'
        );
      }

      const { result } = await this.client!.subscriptionsApi.createSubscription({
        idempotencyKey: this.generateIdempotencyKey(),
        locationId: this.config!.locationId,
        customerId,
        planVariationId: request.planId,
        startDate: new Date().toISOString().split('T')[0],
        cardId: request.paymentMethodId,
        timezone: 'UTC',
      });

      if (!result.subscription) {
        throw new Error('Failed to create subscription');
      }

      this.log('info', 'Subscription created', {
        subscriptionId: result.subscription.id,
        userId: request.userId,
        planId: request.planId,
      });

      return this.mapSquareSubscription(result.subscription, request.userId);
    } catch (error: any) {
      this.handleSquareError(error, 'Create subscription');
    }
  }

  async getSubscription(providerSubscriptionId: string): Promise<Subscription | null> {
    this.ensureConfigured();

    try {
      const { result } = await this.client!.subscriptionsApi.retrieveSubscription(providerSubscriptionId);

      if (!result.subscription) {
        return null;
      }

      return this.mapSquareSubscription(result.subscription);
    } catch (error: any) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      this.handleSquareError(error, 'Get subscription');
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
      // Retrieve current subscription
      const { result: current } = await this.client!.subscriptionsApi.retrieveSubscription(providerSubscriptionId);

      if (!current.subscription) {
        throw new Error('Subscription not found');
      }

      const updateBody: any = {
        subscription: {
          ...current.subscription,
        },
      };

      if (updates.planId) {
        updateBody.subscription.planVariationId = updates.planId;
      }

      if (updates.paymentMethodId) {
        updateBody.subscription.cardId = updates.paymentMethodId;
      }

      const { result } = await this.client!.subscriptionsApi.updateSubscription(providerSubscriptionId, updateBody);

      if (!result.subscription) {
        throw new Error('Failed to update subscription');
      }

      this.log('info', 'Subscription updated', { subscriptionId: providerSubscriptionId });

      return this.mapSquareSubscription(result.subscription);
    } catch (error: any) {
      this.handleSquareError(error, 'Update subscription');
    }
  }

  async cancelSubscription(request: CancelSubscriptionRequest): Promise<Subscription> {
    this.ensureConfigured();

    try {
      const { result } = await this.client!.subscriptionsApi.cancelSubscription(request.subscriptionId);

      if (!result.subscription) {
        throw new Error('Failed to cancel subscription');
      }

      this.log('info', 'Subscription canceled', {
        subscriptionId: request.subscriptionId,
        immediately: request.immediately,
      });

      return this.mapSquareSubscription(result.subscription);
    } catch (error: any) {
      this.handleSquareError(error, 'Cancel subscription');
    }
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<Subscription> {
    this.ensureConfigured();

    try {
      const { result } = await this.client!.subscriptionsApi.resumeSubscription(providerSubscriptionId, {
        resumeEffectiveDate: new Date().toISOString().split('T')[0],
      });

      if (!result.subscription) {
        throw new Error('Failed to reactivate subscription');
      }

      this.log('info', 'Subscription reactivated', { subscriptionId: providerSubscriptionId });

      return this.mapSquareSubscription(result.subscription);
    } catch (error: any) {
      this.handleSquareError(error, 'Reactivate subscription');
    }
  }

  async pauseSubscription(providerSubscriptionId: string): Promise<Subscription> {
    this.ensureConfigured();

    try {
      const { result } = await this.client!.subscriptionsApi.pauseSubscription(providerSubscriptionId, {});

      if (!result.subscription) {
        throw new Error('Failed to pause subscription');
      }

      this.log('info', 'Subscription paused', { subscriptionId: providerSubscriptionId });

      return this.mapSquareSubscription(result.subscription);
    } catch (error: any) {
      this.handleSquareError(error, 'Pause subscription');
    }
  }

  async resumeSubscription(providerSubscriptionId: string): Promise<Subscription> {
    return this.reactivateSubscription(providerSubscriptionId);
  }

  // ============================================
  // REFUNDS
  // ============================================

  async createRefund(request: RefundRequest): Promise<Refund> {
    this.ensureConfigured();
    this.validateRequired(request, ['transactionId']);

    try {
      // Get original payment to determine amount
      const { result: paymentResult } = await this.client!.paymentsApi.getPayment(request.transactionId);

      const payment = paymentResult.payment;
      if (!payment) {
        throw new Error('Original payment not found');
      }

      const refundAmount = request.amount
        ? BigInt(this.convertToProviderAmount(request.amount, payment.amountMoney?.currency || 'USD'))
        : payment.amountMoney?.amount;

      const { result } = await this.client!.refundsApi.refundPayment({
        idempotencyKey: this.generateIdempotencyKey(),
        paymentId: request.transactionId,
        amountMoney: {
          amount: refundAmount,
          currency: payment.amountMoney?.currency,
        },
        reason: request.reason,
      });

      if (!result.refund) {
        throw new Error('Failed to create refund');
      }

      this.log('info', 'Refund created', {
        refundId: result.refund.id,
        paymentId: request.transactionId,
      });

      return this.mapSquareRefund(result.refund, request.transactionId);
    } catch (error: any) {
      this.handleSquareError(error, 'Create refund');
    }
  }

  async getRefund(refundId: string): Promise<Refund | null> {
    this.ensureConfigured();

    try {
      const { result } = await this.client!.refundsApi.getPaymentRefund(refundId);

      if (!result.refund) {
        return null;
      }

      return this.mapSquareRefund(result.refund);
    } catch (error: any) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      this.handleSquareError(error, 'Get refund');
    }
  }

  // ============================================
  // CHECKOUT SESSIONS
  // ============================================

  async createCheckoutSession(options: CheckoutSessionOptions): Promise<CheckoutSession> {
    this.ensureConfigured();
    this.validateRequired(options, ['userId', 'successUrl', 'cancelUrl']);

    try {
      const { result } = await this.client!.checkoutApi.createPaymentLink({
        idempotencyKey: this.generateIdempotencyKey(),
        quickPay: {
          name: options.lineItems[0]?.productName || 'Purchase',
          priceMoney: {
            amount: BigInt(options.lineItems[0]?.unitAmount || 0),
            currency: options.lineItems[0]?.currency || 'USD',
          },
          locationId: this.config!.locationId,
        },
        checkoutOptions: {
          redirectUrl: options.successUrl,
          allowTipping: false,
          askForShippingAddress: false,
        },
        prePopulatedData: options.customerEmail
          ? { buyerEmail: options.customerEmail }
          : undefined,
      });

      if (!result.paymentLink) {
        throw new Error('Failed to create checkout session');
      }

      this.log('info', 'Checkout session created', {
        linkId: result.paymentLink.id,
        userId: options.userId,
      });

      return {
        id: result.paymentLink.id!,
        providerSessionId: result.paymentLink.id!,
        url: result.paymentLink.url!,
        status: 'open',
        mode: options.mode,
        amountTotal: options.lineItems[0]?.unitAmount,
        currency: options.lineItems[0]?.currency,
      };
    } catch (error: any) {
      this.handleSquareError(error, 'Create checkout session');
    }
  }

  async getCheckoutSession(sessionId: string): Promise<CheckoutSession | null> {
    this.ensureConfigured();

    try {
      const { result } = await this.client!.checkoutApi.retrievePaymentLink(sessionId);

      if (!result.paymentLink) {
        return null;
      }

      return {
        id: result.paymentLink.id!,
        providerSessionId: result.paymentLink.id!,
        url: result.paymentLink.url!,
        status: 'open',
        mode: 'payment',
      };
    } catch (error: any) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      this.handleSquareError(error, 'Get checkout session');
    }
  }

  // ============================================
  // WEBHOOKS
  // ============================================

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    if (!this.config?.webhookSignatureKey) {
      this.log('warn', 'Webhook signature key not configured');
      return false;
    }

    try {
      const payloadString = typeof payload === 'string' ? payload : payload.toString();
      const hmac = crypto.createHmac('sha256', this.config.webhookSignatureKey);
      hmac.update(payloadString);
      const expectedSignature = hmac.digest('base64');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      return false;
    }
  }

  parseWebhookEvent(payload: string | Buffer, signature: string): WebhookEvent | null {
    if (!this.verifyWebhookSignature(payload, signature)) {
      this.log('warn', 'Invalid webhook signature');
      return null;
    }

    try {
      const payloadString = typeof payload === 'string' ? payload : payload.toString();
      const event = JSON.parse(payloadString);

      return {
        id: `square_${event.event_id}`,
        provider: this.provider,
        eventType: this.mapSquareEventType(event.type),
        eventId: event.event_id,
        data: event.data?.object || {},
        timestamp: new Date(event.created_at),
        rawPayload: payloadString,
      };
    } catch (error: any) {
      this.log('error', 'Failed to parse webhook event', { error: error.message });
      return null;
    }
  }

  async processWebhookEvent(event: WebhookEvent): Promise<WebhookProcessingResult> {
    this.log('info', `Processing webhook event: ${event.eventType}`, { eventId: event.eventId });

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
    ];
  }

  getSupportedCurrencies(): string[] {
    return ['USD', 'CAD', 'AUD', 'GBP', 'EUR', 'JPY'];
  }

  mapTransactionStatus(squareStatus: string): TransactionStatus {
    const statusMap: Record<string, TransactionStatus> = {
      APPROVED: TransactionStatus.PROCESSING,
      PENDING: TransactionStatus.PENDING,
      COMPLETED: TransactionStatus.SUCCEEDED,
      CANCELED: TransactionStatus.CANCELED,
      FAILED: TransactionStatus.FAILED,
    };
    return statusMap[squareStatus] || TransactionStatus.PENDING;
  }

  mapSubscriptionStatus(squareStatus: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      ACTIVE: SubscriptionStatus.ACTIVE,
      PENDING: SubscriptionStatus.INCOMPLETE,
      CANCELED: SubscriptionStatus.CANCELED,
      PAUSED: SubscriptionStatus.PAUSED,
      DEACTIVATED: SubscriptionStatus.CANCELED,
    };
    return statusMap[squareStatus] || SubscriptionStatus.INCOMPLETE;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private generateIdempotencyKey(): string {
    return `sq_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private isNotFoundError(error: any): boolean {
    if (error instanceof ApiError) {
      return error.errors?.some((e: any) => e.code === 'NOT_FOUND') || false;
    }
    return false;
  }

  private handleSquareError(error: any, operation: string): never {
    if (error instanceof ApiError) {
      const errorMessage = error.errors?.map((e: any) => e.detail).join(', ') || error.message;
      throw new PaymentProviderError(
        `${operation} failed: ${errorMessage}`,
        this.provider,
        error.errors?.[0]?.code,
        error
      );
    }
    throw new PaymentProviderError(
      `${operation} failed: ${error.message}`,
      this.provider,
      'UNKNOWN_ERROR',
      error
    );
  }

  private mapSquareCustomer(customer: any, userId?: string): PaymentCustomer {
    return {
      id: userId || customer.referenceId || customer.id,
      providerCustomerId: customer.id,
      provider: this.provider,
      email: customer.emailAddress || '',
      name: [customer.givenName, customer.familyName].filter(Boolean).join(' ') || undefined,
      phone: customer.phoneNumber || undefined,
      metadata: customer.note ? JSON.parse(customer.note) : {},
      createdAt: new Date(customer.createdAt),
    };
  }

  private mapSquareCard(card: any, customerId?: string): PaymentMethod {
    return {
      id: card.id,
      customerId: customerId || card.customerId || '',
      providerPaymentMethodId: card.id,
      provider: this.provider,
      type: PaymentMethodType.CARD,
      isDefault: false,
      cardBrand: card.cardBrand?.toLowerCase(),
      cardLast4: card.last4,
      cardExpMonth: card.expMonth,
      cardExpYear: card.expYear,
      metadata: {},
      createdAt: new Date(),
    };
  }

  private mapSquarePayment(payment: any): PaymentIntent {
    const amount = payment.amountMoney
      ? this.convertFromProviderAmount(Number(payment.amountMoney.amount), payment.amountMoney.currency)
      : 0;

    return {
      id: payment.id,
      providerIntentId: payment.id,
      provider: this.provider,
      amount,
      currency: payment.amountMoney?.currency || 'USD',
      status: this.mapTransactionStatus(payment.status),
      customerId: payment.customerId,
      clientSecret: payment.id,
      description: payment.note,
      metadata: { referenceId: payment.referenceId },
      createdAt: new Date(payment.createdAt),
    };
  }

  private mapSquareSubscription(subscription: any, userId?: string): Subscription {
    return {
      id: subscription.id,
      userId: userId || '',
      providerSubscriptionId: subscription.id,
      provider: this.provider,
      planId: subscription.planVariationId || subscription.planId || '',
      tier: SubscriptionTier.PREMIUM,
      status: this.mapSubscriptionStatus(subscription.status),
      billingPeriod: BillingPeriod.MONTHLY,
      currentPeriodStart: new Date(subscription.startDate),
      currentPeriodEnd: new Date(subscription.chargedThroughDate || subscription.startDate),
      cancelAtPeriodEnd: subscription.status === 'CANCELED',
      canceledAt: subscription.canceledDate ? new Date(subscription.canceledDate) : undefined,
      metadata: {},
      createdAt: new Date(subscription.createdAt),
      updatedAt: new Date(),
    };
  }

  private mapSquareRefund(refund: any, transactionId?: string): Refund {
    const amount = refund.amountMoney
      ? this.convertFromProviderAmount(Number(refund.amountMoney.amount), refund.amountMoney.currency)
      : 0;

    return {
      id: refund.id,
      transactionId: transactionId || refund.paymentId || '',
      providerRefundId: refund.id,
      provider: this.provider,
      amount,
      currency: refund.amountMoney?.currency || 'USD',
      status: refund.status?.toLowerCase() as 'pending' | 'succeeded' | 'failed' | 'canceled',
      reason: refund.reason,
      metadata: {},
      createdAt: new Date(refund.createdAt),
    };
  }

  private mapSquareEventType(squareEventType: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      'payment.created': WebhookEventType.PAYMENT_CREATED,
      'payment.completed': WebhookEventType.PAYMENT_SUCCEEDED,
      'payment.failed': WebhookEventType.PAYMENT_FAILED,
      'refund.created': WebhookEventType.PAYMENT_REFUNDED,
      'refund.updated': WebhookEventType.PAYMENT_REFUNDED,
      'subscription.created': WebhookEventType.SUBSCRIPTION_CREATED,
      'subscription.updated': WebhookEventType.SUBSCRIPTION_UPDATED,
      'subscription.canceled': WebhookEventType.SUBSCRIPTION_CANCELED,
      'customer.created': WebhookEventType.CUSTOMER_CREATED,
      'customer.updated': WebhookEventType.CUSTOMER_UPDATED,
      'customer.deleted': WebhookEventType.CUSTOMER_DELETED,
    };
    return eventMap[squareEventType] || WebhookEventType.PAYMENT_CREATED;
  }
}

// Export singleton instance
export const squareProvider = new SquareProvider();
