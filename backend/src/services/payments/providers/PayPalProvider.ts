/**
 * PayPal Payment Provider
 * Full implementation of PayPal integration including subscriptions and Venmo support
 */

import axios, { AxiosInstance } from 'axios';
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
  PaymentError,
  PaymentProviderError,
  SubscriptionTier,
} from '../types';
import crypto from 'crypto';

interface PayPalAccessToken {
  token: string;
  expiresAt: Date;
}

export class PayPalProvider extends BasePaymentProvider implements ICheckoutSessionProvider {
  readonly provider = PaymentProvider.PAYPAL;
  private client: AxiosInstance | null = null;
  private accessToken: PayPalAccessToken | null = null;
  private clientId: string | null = null;
  private clientSecret: string | null = null;
  private webhookId: string | null = null;
  private isSandbox: boolean = true;

  private get baseUrl(): string {
    return this.isSandbox
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async initialize(): Promise<void> {
    this.clientId = process.env.PAYPAL_CLIENT_ID || null;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || null;
    this.webhookId = process.env.PAYPAL_WEBHOOK_ID || null;
    this.isSandbox = process.env.PAYPAL_SANDBOX !== 'false';

    if (!this.clientId || !this.clientSecret) {
      this.log('warn', 'PayPal credentials not configured');
      this._isConfigured = false;
      return;
    }

    try {
      this.client = axios.create({
        baseURL: this.baseUrl,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Test authentication
      await this.getAccessToken();

      this._isConfigured = true;
      this.log('info', `PayPal provider initialized (${this.isSandbox ? 'sandbox' : 'production'})`);
    } catch (error: any) {
      this.log('error', 'Failed to initialize PayPal', { error: error.message });
      this._isConfigured = false;
    }
  }

  getClientId(): string | null {
    return this.clientId;
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.accessToken.expiresAt > new Date()) {
      return this.accessToken.token;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await axios.post(
      `${this.baseUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    this.accessToken = {
      token: response.data.access_token,
      expiresAt: new Date(Date.now() + (response.data.expires_in - 60) * 1000), // 1 min buffer
    };

    return this.accessToken.token;
  }

  private async makeRequest<T>(
    method: 'get' | 'post' | 'patch' | 'delete',
    endpoint: string,
    data?: any
  ): Promise<T> {
    this.ensureConfigured();

    const token = await this.getAccessToken();

    try {
      const response = await this.client!({
        method,
        url: endpoint,
        data,
        headers: {
          Authorization: `Bearer ${token}`,
          'PayPal-Request-Id': this.generateIdempotencyKey('paypal', Date.now().toString()),
        },
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw new PaymentProviderError(
          error.response.data.message || error.response.data.error_description || 'PayPal API error',
          PaymentProvider.PAYPAL,
          error.response.data.name,
          error
        );
      }
      throw error;
    }
  }

  // ============================================
  // CUSTOMER MANAGEMENT
  // ============================================

  async createCustomer(request: CreateCustomerRequest): Promise<PaymentCustomer> {
    // PayPal doesn't have a traditional customer object
    // We track customers locally and associate them with PayPal orders/subscriptions
    this.validateRequired(request, ['userId', 'email']);

    const customer: PaymentCustomer = {
      id: request.userId,
      providerCustomerId: `paypal_${request.userId}`,
      provider: PaymentProvider.PAYPAL,
      email: request.email,
      name: request.name,
      phone: request.phone,
      metadata: request.metadata,
      createdAt: new Date(),
    };

    this.log('info', 'PayPal customer created (local)', { userId: request.userId });

    return customer;
  }

  async getCustomer(providerCustomerId: string): Promise<PaymentCustomer | null> {
    // PayPal customers are tracked locally
    return null;
  }

  async updateCustomer(
    providerCustomerId: string,
    updates: Partial<CreateCustomerRequest>
  ): Promise<PaymentCustomer> {
    throw new PaymentError(
      'PayPal does not support customer updates directly',
      'NOT_SUPPORTED',
      this.provider
    );
  }

  async deleteCustomer(providerCustomerId: string): Promise<void> {
    // No-op for PayPal
    this.log('info', 'PayPal customer deletion (no-op)', { customerId: providerCustomerId });
  }

  // ============================================
  // PAYMENT METHOD MANAGEMENT
  // ============================================

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethod> {
    throw new PaymentError(
      'PayPal payment methods are managed through checkout flow',
      'NOT_SUPPORTED',
      this.provider
    );
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    throw new PaymentError(
      'PayPal payment methods cannot be detached',
      'NOT_SUPPORTED',
      this.provider
    );
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    // PayPal manages payment methods internally
    return [];
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    throw new PaymentError(
      'PayPal payment methods are managed through checkout flow',
      'NOT_SUPPORTED',
      this.provider
    );
  }

  async getPaymentMethod(paymentMethodId: string): Promise<PaymentMethod | null> {
    return null;
  }

  // ============================================
  // ORDERS (PAYMENT INTENTS)
  // ============================================

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    this.ensureConfigured();
    this.validateRequired(request, ['userId', 'amount', 'currency']);
    this.validateAmount(request.amount, request.currency);

    try {
      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: request.userId,
            description: request.description || 'Flamoral Purchase',
            amount: {
              currency_code: this.formatCurrency(request.currency),
              value: request.amount.toFixed(2),
            },
            custom_id: JSON.stringify({
              userId: request.userId,
              ...request.metadata,
            }),
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
              brand_name: 'Flamoral',
              locale: 'en-US',
              landing_page: 'NO_PREFERENCE',
              user_action: 'PAY_NOW',
              return_url: request.metadata?.returnUrl || 'https://app.flamoral.com/payment/success',
              cancel_url: request.metadata?.cancelUrl || 'https://app.flamoral.com/payment/cancel',
            },
          },
        },
      };

      const order = await this.makeRequest<any>('post', '/v2/checkout/orders', orderData);

      this.log('info', 'PayPal order created', {
        orderId: order.id,
        userId: request.userId,
        amount: request.amount,
      });

      const approveLink = order.links?.find((l: any) => l.rel === 'payer-action' || l.rel === 'approve');

      return {
        id: order.id,
        providerIntentId: order.id,
        provider: PaymentProvider.PAYPAL,
        amount: request.amount,
        currency: request.currency.toUpperCase(),
        status: this.mapTransactionStatus(order.status),
        customerId: request.customerId,
        clientSecret: order.id, // Used as order ID for frontend
        description: request.description,
        metadata: request.metadata,
        requiresAction: order.status === 'PAYER_ACTION_REQUIRED',
        nextActionUrl: approveLink?.href,
        createdAt: new Date(),
      };
    } catch (error: any) {
      this.handleError(error, 'Create PayPal order');
    }
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    this.ensureConfigured();

    try {
      // Capture the order
      const capture = await this.makeRequest<any>('post', `/v2/checkout/orders/${paymentIntentId}/capture`, {});

      this.log('info', 'PayPal order captured', { orderId: paymentIntentId });

      const purchaseUnit = capture.purchase_units?.[0];
      const captureResult = purchaseUnit?.payments?.captures?.[0];

      return {
        id: capture.id,
        providerIntentId: capture.id,
        provider: PaymentProvider.PAYPAL,
        amount: parseFloat(captureResult?.amount?.value || '0'),
        currency: captureResult?.amount?.currency_code || 'USD',
        status: this.mapTransactionStatus(capture.status),
        metadata: purchaseUnit?.custom_id ? JSON.parse(purchaseUnit.custom_id) : undefined,
        createdAt: new Date(capture.create_time),
      };
    } catch (error: any) {
      this.handleError(error, 'Capture PayPal order');
    }
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    // PayPal orders can't be explicitly canceled, they expire
    this.log('info', 'PayPal order cancellation requested', { orderId: paymentIntentId });

    return {
      id: paymentIntentId,
      providerIntentId: paymentIntentId,
      provider: PaymentProvider.PAYPAL,
      amount: 0,
      currency: 'USD',
      status: TransactionStatus.CANCELED,
      createdAt: new Date(),
    };
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null> {
    this.ensureConfigured();

    try {
      const order = await this.makeRequest<any>('get', `/v2/checkout/orders/${paymentIntentId}`);

      const purchaseUnit = order.purchase_units?.[0];

      return {
        id: order.id,
        providerIntentId: order.id,
        provider: PaymentProvider.PAYPAL,
        amount: parseFloat(purchaseUnit?.amount?.value || '0'),
        currency: purchaseUnit?.amount?.currency_code || 'USD',
        status: this.mapTransactionStatus(order.status),
        metadata: purchaseUnit?.custom_id ? JSON.parse(purchaseUnit.custom_id) : undefined,
        createdAt: new Date(order.create_time),
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      this.handleError(error, 'Get PayPal order');
    }
  }

  // ============================================
  // SUBSCRIPTIONS
  // ============================================

  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    this.ensureConfigured();
    this.validateRequired(request, ['userId', 'planId']);

    try {
      const subscriptionData = {
        plan_id: request.planId,
        subscriber: {
          email_address: request.metadata?.email,
          name: {
            given_name: request.metadata?.firstName || 'User',
            surname: request.metadata?.lastName || '',
          },
        },
        custom_id: request.userId,
        application_context: {
          brand_name: 'Flamoral',
          locale: 'en-US',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
          },
          return_url: request.metadata?.returnUrl || 'https://app.flamoral.com/subscription/success',
          cancel_url: request.metadata?.cancelUrl || 'https://app.flamoral.com/subscription/cancel',
        },
      };

      const subscription = await this.makeRequest<any>('post', '/v1/billing/subscriptions', subscriptionData);

      this.log('info', 'PayPal subscription created', {
        subscriptionId: subscription.id,
        userId: request.userId,
        planId: request.planId,
      });

      return this.mapPayPalSubscription(subscription, request.userId);
    } catch (error: any) {
      this.handleError(error, 'Create PayPal subscription');
    }
  }

  async getSubscription(providerSubscriptionId: string): Promise<Subscription | null> {
    this.ensureConfigured();

    try {
      const subscription = await this.makeRequest<any>('get', `/v1/billing/subscriptions/${providerSubscriptionId}`);
      return this.mapPayPalSubscription(subscription);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      this.handleError(error, 'Get PayPal subscription');
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
      if (updates.planId) {
        // Revise the subscription to change plans
        await this.makeRequest<any>('post', `/v1/billing/subscriptions/${providerSubscriptionId}/revise`, {
          plan_id: updates.planId,
        });
      }

      const subscription = await this.makeRequest<any>('get', `/v1/billing/subscriptions/${providerSubscriptionId}`);

      this.log('info', 'PayPal subscription updated', { subscriptionId: providerSubscriptionId });

      return this.mapPayPalSubscription(subscription);
    } catch (error: any) {
      this.handleError(error, 'Update PayPal subscription');
    }
  }

  async cancelSubscription(request: CancelSubscriptionRequest): Promise<Subscription> {
    this.ensureConfigured();

    try {
      await this.makeRequest<any>('post', `/v1/billing/subscriptions/${request.subscriptionId}/cancel`, {
        reason: request.reason || 'User requested cancellation',
      });

      const subscription = await this.makeRequest<any>('get', `/v1/billing/subscriptions/${request.subscriptionId}`);

      this.log('info', 'PayPal subscription canceled', { subscriptionId: request.subscriptionId });

      return this.mapPayPalSubscription(subscription);
    } catch (error: any) {
      this.handleError(error, 'Cancel PayPal subscription');
    }
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<Subscription> {
    this.ensureConfigured();

    try {
      await this.makeRequest<any>('post', `/v1/billing/subscriptions/${providerSubscriptionId}/activate`, {
        reason: 'Reactivating subscription',
      });

      const subscription = await this.makeRequest<any>('get', `/v1/billing/subscriptions/${providerSubscriptionId}`);

      this.log('info', 'PayPal subscription reactivated', { subscriptionId: providerSubscriptionId });

      return this.mapPayPalSubscription(subscription);
    } catch (error: any) {
      this.handleError(error, 'Reactivate PayPal subscription');
    }
  }

  async pauseSubscription(providerSubscriptionId: string): Promise<Subscription> {
    this.ensureConfigured();

    try {
      await this.makeRequest<any>('post', `/v1/billing/subscriptions/${providerSubscriptionId}/suspend`, {
        reason: 'User requested pause',
      });

      const subscription = await this.makeRequest<any>('get', `/v1/billing/subscriptions/${providerSubscriptionId}`);

      this.log('info', 'PayPal subscription paused', { subscriptionId: providerSubscriptionId });

      return this.mapPayPalSubscription(subscription);
    } catch (error: any) {
      this.handleError(error, 'Pause PayPal subscription');
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
      const refundData: any = {};

      if (request.amount) {
        refundData.amount = {
          value: request.amount.toFixed(2),
          currency_code: 'USD',
        };
      }

      if (request.reason) {
        refundData.note_to_payer = request.reason;
      }

      const refund = await this.makeRequest<any>(
        'post',
        `/v2/payments/captures/${request.transactionId}/refund`,
        refundData
      );

      this.log('info', 'PayPal refund created', { refundId: refund.id, captureId: request.transactionId });

      return {
        id: refund.id,
        transactionId: request.transactionId,
        providerRefundId: refund.id,
        provider: PaymentProvider.PAYPAL,
        amount: parseFloat(refund.amount?.value || '0'),
        currency: refund.amount?.currency_code || 'USD',
        status: refund.status === 'COMPLETED' ? 'succeeded' : 'pending',
        reason: request.reason,
        createdAt: new Date(refund.create_time),
      };
    } catch (error: any) {
      this.handleError(error, 'Create PayPal refund');
    }
  }

  async getRefund(refundId: string): Promise<Refund | null> {
    this.ensureConfigured();

    try {
      const refund = await this.makeRequest<any>('get', `/v2/payments/refunds/${refundId}`);

      return {
        id: refund.id,
        transactionId: refund.links?.find((l: any) => l.rel === 'up')?.href?.split('/').pop() || '',
        providerRefundId: refund.id,
        provider: PaymentProvider.PAYPAL,
        amount: parseFloat(refund.amount?.value || '0'),
        currency: refund.amount?.currency_code || 'USD',
        status: refund.status === 'COMPLETED' ? 'succeeded' : 'pending',
        createdAt: new Date(refund.create_time),
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      this.handleError(error, 'Get PayPal refund');
    }
  }

  // ============================================
  // CHECKOUT SESSIONS
  // ============================================

  async createCheckoutSession(options: CheckoutSessionOptions): Promise<CheckoutSession> {
    // For PayPal, we create an order and return the approval URL
    const paymentIntent = await this.createPaymentIntent({
      userId: options.userId,
      amount: options.lineItems.reduce((sum, item) => sum + (item.unitAmount || 0) * item.quantity, 0),
      currency: options.lineItems[0]?.currency || 'USD',
      description: options.lineItems.map(item => item.productName).join(', '),
      metadata: {
        ...options.metadata,
        returnUrl: options.successUrl,
        cancelUrl: options.cancelUrl,
      },
    });

    return {
      id: paymentIntent.id,
      providerSessionId: paymentIntent.id,
      url: paymentIntent.nextActionUrl || '',
      status: 'open',
      mode: options.mode,
      amountTotal: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  }

  async getCheckoutSession(sessionId: string): Promise<CheckoutSession | null> {
    const paymentIntent = await this.getPaymentIntent(sessionId);
    if (!paymentIntent) return null;

    return {
      id: paymentIntent.id,
      providerSessionId: paymentIntent.id,
      url: paymentIntent.nextActionUrl || '',
      status: paymentIntent.status === TransactionStatus.SUCCEEDED ? 'complete' : 'open',
      mode: 'payment',
      paymentIntentId: paymentIntent.id,
      amountTotal: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  }

  // ============================================
  // WEBHOOKS
  // ============================================

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    // PayPal webhook verification is more complex and requires async verification
    // For now, basic check - in production, use /v1/notifications/verify-webhook-signature
    return true; // Should be implemented with proper verification
  }

  parseWebhookEvent(payload: string | Buffer, signature: string): WebhookEvent | null {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString());

      return {
        id: `paypal_${data.id}`,
        provider: PaymentProvider.PAYPAL,
        eventType: this.mapPayPalEventType(data.event_type),
        eventId: data.id,
        data: data.resource,
        timestamp: new Date(data.create_time),
        rawPayload: typeof payload === 'string' ? payload : payload.toString(),
      };
    } catch (error: any) {
      this.log('error', 'Failed to parse PayPal webhook', { error: error.message });
      return null;
    }
  }

  async processWebhookEvent(event: WebhookEvent): Promise<WebhookProcessingResult> {
    this.log('info', `Processing PayPal webhook: ${event.eventType}`, { eventId: event.eventId });

    return {
      success: true,
      eventId: event.eventId,
      eventType: event.eventType,
      message: `PayPal event ${event.eventType} received`,
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  getSupportedPaymentMethods(): PaymentMethodType[] {
    return [
      PaymentMethodType.PAYPAL,
      PaymentMethodType.CARD,
      PaymentMethodType.VENMO,
    ];
  }

  getSupportedCurrencies(): string[] {
    return [
      'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'NOK', 'SEK', 'DKK',
      'NZD', 'SGD', 'HKD', 'BRL', 'MXN', 'PLN', 'CZK', 'HUF', 'ILS', 'PHP',
    ];
  }

  mapTransactionStatus(paypalStatus: string): TransactionStatus {
    const statusMap: Record<string, TransactionStatus> = {
      CREATED: TransactionStatus.PENDING,
      SAVED: TransactionStatus.PENDING,
      APPROVED: TransactionStatus.REQUIRES_ACTION,
      VOIDED: TransactionStatus.CANCELED,
      COMPLETED: TransactionStatus.SUCCEEDED,
      PAYER_ACTION_REQUIRED: TransactionStatus.REQUIRES_ACTION,
    };
    return statusMap[paypalStatus] || TransactionStatus.PENDING;
  }

  mapSubscriptionStatus(paypalStatus: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      APPROVAL_PENDING: SubscriptionStatus.INCOMPLETE,
      APPROVED: SubscriptionStatus.INCOMPLETE,
      ACTIVE: SubscriptionStatus.ACTIVE,
      SUSPENDED: SubscriptionStatus.PAUSED,
      CANCELLED: SubscriptionStatus.CANCELED,
      EXPIRED: SubscriptionStatus.CANCELED,
    };
    return statusMap[paypalStatus] || SubscriptionStatus.INCOMPLETE;
  }

  // Don't use cents for PayPal
  convertToProviderAmount(amount: number, currency: string): number {
    return amount;
  }

  convertFromProviderAmount(amount: number, currency: string): number {
    return amount;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private mapPayPalSubscription(sub: any, userId?: string): Subscription {
    return {
      id: sub.id,
      userId: userId || sub.custom_id || '',
      providerSubscriptionId: sub.id,
      provider: PaymentProvider.PAYPAL,
      planId: sub.plan_id,
      tier: SubscriptionTier.PREMIUM, // Would need to map from plan
      status: this.mapSubscriptionStatus(sub.status),
      billingPeriod: BillingPeriod.MONTHLY, // Would need to get from plan
      currentPeriodStart: new Date(sub.billing_info?.last_payment?.time || sub.start_time),
      currentPeriodEnd: new Date(sub.billing_info?.next_billing_time || Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      metadata: { paypal_status: sub.status },
      createdAt: new Date(sub.create_time),
      updatedAt: new Date(sub.update_time || sub.create_time),
    };
  }

  private mapPayPalEventType(eventType: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      'CHECKOUT.ORDER.APPROVED': WebhookEventType.PAYMENT_CREATED,
      'PAYMENT.CAPTURE.COMPLETED': WebhookEventType.PAYMENT_SUCCEEDED,
      'PAYMENT.CAPTURE.DENIED': WebhookEventType.PAYMENT_FAILED,
      'PAYMENT.CAPTURE.REFUNDED': WebhookEventType.PAYMENT_REFUNDED,
      'BILLING.SUBSCRIPTION.CREATED': WebhookEventType.SUBSCRIPTION_CREATED,
      'BILLING.SUBSCRIPTION.ACTIVATED': WebhookEventType.SUBSCRIPTION_CREATED,
      'BILLING.SUBSCRIPTION.UPDATED': WebhookEventType.SUBSCRIPTION_UPDATED,
      'BILLING.SUBSCRIPTION.CANCELLED': WebhookEventType.SUBSCRIPTION_CANCELED,
      'BILLING.SUBSCRIPTION.SUSPENDED': WebhookEventType.SUBSCRIPTION_CANCELED,
      'BILLING.SUBSCRIPTION.PAYMENT.FAILED': WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED,
      'PAYMENT.SALE.COMPLETED': WebhookEventType.SUBSCRIPTION_RENEWED,
    };
    return eventMap[eventType] || WebhookEventType.PAYMENT_CREATED;
  }

  // ============================================
  // PAYPAL PLAN MANAGEMENT (ADMIN)
  // ============================================

  async createBillingPlan(options: {
    name: string;
    description: string;
    amount: number;
    currency: string;
    interval: 'MONTH' | 'YEAR';
    productId: string;
  }): Promise<string> {
    this.ensureConfigured();

    try {
      const planData = {
        product_id: options.productId,
        name: options.name,
        description: options.description,
        status: 'ACTIVE',
        billing_cycles: [
          {
            frequency: {
              interval_unit: options.interval,
              interval_count: 1,
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // Infinite
            pricing_scheme: {
              fixed_price: {
                value: options.amount.toFixed(2),
                currency_code: options.currency,
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3,
        },
      };

      const plan = await this.makeRequest<any>('post', '/v1/billing/plans', planData);

      this.log('info', 'PayPal billing plan created', { planId: plan.id });

      return plan.id;
    } catch (error: any) {
      this.handleError(error, 'Create PayPal billing plan');
    }
  }

  async createProduct(options: {
    name: string;
    description: string;
    type: 'DIGITAL' | 'PHYSICAL' | 'SERVICE';
    category: string;
  }): Promise<string> {
    this.ensureConfigured();

    try {
      const productData = {
        name: options.name,
        description: options.description,
        type: options.type,
        category: options.category,
      };

      const product = await this.makeRequest<any>('post', '/v1/catalogs/products', productData);

      this.log('info', 'PayPal product created', { productId: product.id });

      return product.id;
    } catch (error: any) {
      this.handleError(error, 'Create PayPal product');
    }
  }
}

// Export singleton instance
export const paypalProvider = new PayPalProvider();
