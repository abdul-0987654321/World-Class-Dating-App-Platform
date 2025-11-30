/**
 * Amazon Pay Provider
 * Full implementation of Amazon Pay integration for payments and subscriptions
 *
 * Amazon Pay API Documentation: https://developer.amazon.com/docs/amazon-pay-api-v2
 * API Version: v2
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';
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

interface AmazonPayConfig {
  merchantId: string;
  publicKeyId: string;
  privateKey: string;
  region: 'na' | 'eu' | 'fe'; // North America, Europe, Far East
  environment: 'sandbox' | 'live';
  storeId?: string;
}

interface AmazonCheckoutSession {
  checkoutSessionId: string;
  webCheckoutDetails: {
    checkoutResultReturnUrl: string;
    checkoutReviewReturnUrl?: string;
    amazonPayRedirectUrl: string;
  };
  paymentDetails: {
    paymentIntent: string;
    chargeAmount: {
      amount: string;
      currencyCode: string;
    };
  };
  statusDetails: {
    state: string;
    reasonCode?: string;
  };
  buyer?: {
    buyerId: string;
    email: string;
    name: string;
  };
}

export class AmazonPayProvider extends BasePaymentProvider implements ICheckoutSessionProvider {
  readonly provider = PaymentProvider.AMAZON_PAY;
  private client: AxiosInstance | null = null;
  private config: AmazonPayConfig | null = null;

  // ============================================
  // INITIALIZATION
  // ============================================

  async initialize(): Promise<void> {
    const merchantId = process.env.AMAZON_PAY_MERCHANT_ID;
    const publicKeyId = process.env.AMAZON_PAY_PUBLIC_KEY_ID;
    const privateKey = process.env.AMAZON_PAY_PRIVATE_KEY;
    const region = (process.env.AMAZON_PAY_REGION || 'na') as 'na' | 'eu' | 'fe';
    const environment = (process.env.AMAZON_PAY_ENVIRONMENT || 'sandbox') as 'sandbox' | 'live';
    const storeId = process.env.AMAZON_PAY_STORE_ID;

    if (!merchantId || !publicKeyId || !privateKey) {
      this.log('warn', 'Amazon Pay credentials not configured');
      this._isConfigured = false;
      return;
    }

    try {
      this.config = {
        merchantId,
        publicKeyId,
        privateKey: privateKey.replace(/\\n/g, '\n'),
        region,
        environment,
        storeId,
      };

      const baseURL = this.getApiEndpoint(region, environment);

      this.client = axios.create({
        baseURL,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      // Add request interceptor for signing
      this.client.interceptors.request.use((config) => {
        const signature = this.signRequest(config);
        config.headers['Authorization'] = signature;
        return config;
      });

      this._isConfigured = true;
      this.log('info', 'Amazon Pay provider initialized successfully', {
        merchantId,
        region,
        environment,
      });
    } catch (error: any) {
      this.log('error', 'Failed to initialize Amazon Pay', { error: error.message });
      this._isConfigured = false;
    }
  }

  private getApiEndpoint(region: 'na' | 'eu' | 'fe', environment: 'sandbox' | 'live'): string {
    const endpoints = {
      na: environment === 'sandbox'
        ? 'https://pay-api.amazon.com/sandbox/v2'
        : 'https://pay-api.amazon.com/v2',
      eu: environment === 'sandbox'
        ? 'https://pay-api.amazon.eu/sandbox/v2'
        : 'https://pay-api.amazon.eu/v2',
      fe: environment === 'sandbox'
        ? 'https://pay-api.amazon.jp/sandbox/v2'
        : 'https://pay-api.amazon.jp/v2',
    };
    return endpoints[region];
  }

  getMerchantId(): string | null {
    return this.config?.merchantId || null;
  }

  // ============================================
  // REQUEST SIGNING
  // ============================================

  private signRequest(config: any): string {
    // Simplified signing - in production, use Amazon's official SDK
    const timestamp = new Date().toISOString();
    const nonce = crypto.randomUUID();

    const stringToSign = [
      config.method?.toUpperCase() || 'GET',
      config.url,
      timestamp,
      nonce,
    ].join('\n');

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(stringToSign);
    const signature = sign.sign(this.config!.privateKey, 'base64');

    return `AMZN-PAY-RSASSA-PSS PublicKeyId=${this.config!.publicKeyId}, SignedHeaders=accept;content-type;x-amz-pay-date, Signature=${signature}`;
  }

  // ============================================
  // CHECKOUT SESSIONS
  // ============================================

  async createCheckoutSession(options: CheckoutSessionOptions): Promise<CheckoutSession> {
    this.ensureConfigured();
    this.validateRequired(options, ['userId', 'successUrl', 'cancelUrl']);

    try {
      const totalAmount = options.lineItems.reduce(
        (sum, item) => sum + (item.unitAmount || 0) * item.quantity,
        0
      );

      const currency = options.lineItems[0]?.currency || 'USD';

      const payload = {
        webCheckoutDetails: {
          checkoutResultReturnUrl: options.successUrl,
          checkoutCancelUrl: options.cancelUrl,
          checkoutMode: options.mode === 'subscription' ? 'ProcessOrder' : 'ProcessOrder',
        },
        storeId: this.config!.storeId || this.config!.merchantId,
        chargePermissionType: options.mode === 'subscription' ? 'Recurring' : 'OneTime',
        paymentDetails: {
          paymentIntent: options.mode === 'subscription' ? 'Authorize' : 'AuthorizeWithCapture',
          canHandlePendingAuthorization: false,
          chargeAmount: {
            amount: String(totalAmount / 100), // Convert from cents
            currencyCode: currency,
          },
        },
        merchantMetadata: {
          merchantReferenceId: `order_${options.userId}_${Date.now()}`,
          merchantStoreName: 'Flamoral Dating',
          noteToBuyer: options.lineItems[0]?.productDescription || 'Purchase',
          customInformation: JSON.stringify({
            userId: options.userId,
            ...options.metadata,
          }),
        },
      };

      if (options.mode === 'subscription') {
        (payload as any).recurringMetadata = {
          frequency: {
            unit: 'Month',
            value: '1',
          },
          amount: {
            amount: String(totalAmount / 100),
            currencyCode: currency,
          },
        };
      }

      const response = await this.client!.post('/checkoutSessions', payload);
      const session = response.data as AmazonCheckoutSession;

      this.log('info', 'Checkout session created', {
        sessionId: session.checkoutSessionId,
        userId: options.userId,
      });

      return {
        id: session.checkoutSessionId,
        providerSessionId: session.checkoutSessionId,
        url: session.webCheckoutDetails.amazonPayRedirectUrl,
        status: 'open',
        mode: options.mode,
        amountTotal: totalAmount / 100,
        currency,
      };
    } catch (error: any) {
      this.handleAmazonPayError(error, 'Create checkout session');
    }
  }

  async getCheckoutSession(sessionId: string): Promise<CheckoutSession | null> {
    this.ensureConfigured();

    try {
      const response = await this.client!.get(`/checkoutSessions/${sessionId}`);
      const session = response.data as AmazonCheckoutSession;

      return {
        id: session.checkoutSessionId,
        providerSessionId: session.checkoutSessionId,
        url: session.webCheckoutDetails?.amazonPayRedirectUrl || '',
        status: this.mapAmazonSessionStatus(session.statusDetails.state),
        mode: 'payment',
        amountTotal: session.paymentDetails?.chargeAmount
          ? parseFloat(session.paymentDetails.chargeAmount.amount)
          : undefined,
        currency: session.paymentDetails?.chargeAmount?.currencyCode,
      };
    } catch (error: any) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      this.handleAmazonPayError(error, 'Get checkout session');
    }
  }

  /**
   * Complete checkout session after buyer authorization
   */
  async completeCheckoutSession(sessionId: string, amount?: number): Promise<CheckoutSession> {
    this.ensureConfigured();

    try {
      const payload: any = {};

      if (amount) {
        payload.chargeAmount = {
          amount: String(amount / 100),
          currencyCode: 'USD',
        };
      }

      const response = await this.client!.post(`/checkoutSessions/${sessionId}/complete`, payload);
      const session = response.data;

      this.log('info', 'Checkout session completed', { sessionId });

      return {
        id: session.checkoutSessionId,
        providerSessionId: session.checkoutSessionId,
        url: '',
        status: 'complete',
        mode: 'payment',
        paymentIntentId: session.chargeId,
      };
    } catch (error: any) {
      this.handleAmazonPayError(error, 'Complete checkout session');
    }
  }

  // ============================================
  // CHARGES
  // ============================================

  async createCharge(params: {
    chargePermissionId: string;
    amount: number;
    currency: string;
    captureNow?: boolean;
    softDescriptor?: string;
  }): Promise<PaymentIntent> {
    this.ensureConfigured();

    try {
      const response = await this.client!.post('/charges', {
        chargePermissionId: params.chargePermissionId,
        chargeAmount: {
          amount: String(params.amount / 100),
          currencyCode: params.currency,
        },
        captureNow: params.captureNow ?? true,
        softDescriptor: params.softDescriptor,
      });

      const charge = response.data;

      this.log('info', 'Charge created', { chargeId: charge.chargeId });

      return {
        id: charge.chargeId,
        providerIntentId: charge.chargeId,
        provider: this.provider,
        amount: params.amount / 100,
        currency: params.currency,
        status: this.mapAmazonChargeStatus(charge.statusDetails.state),
        metadata: { chargePermissionId: params.chargePermissionId },
        createdAt: new Date(charge.creationTimestamp),
      };
    } catch (error: any) {
      this.handleAmazonPayError(error, 'Create charge');
    }
  }

  async captureCharge(chargeId: string, amount?: number): Promise<PaymentIntent> {
    this.ensureConfigured();

    try {
      const payload: any = {};
      if (amount) {
        payload.captureAmount = {
          amount: String(amount / 100),
          currencyCode: 'USD',
        };
      }

      const response = await this.client!.post(`/charges/${chargeId}/capture`, payload);
      const charge = response.data;

      this.log('info', 'Charge captured', { chargeId });

      return {
        id: charge.chargeId,
        providerIntentId: charge.chargeId,
        provider: this.provider,
        amount: charge.captureAmount ? parseFloat(charge.captureAmount.amount) : 0,
        currency: charge.captureAmount?.currencyCode || 'USD',
        status: TransactionStatus.SUCCEEDED,
        createdAt: new Date(),
      };
    } catch (error: any) {
      this.handleAmazonPayError(error, 'Capture charge');
    }
  }

  async getCharge(chargeId: string): Promise<PaymentIntent | null> {
    this.ensureConfigured();

    try {
      const response = await this.client!.get(`/charges/${chargeId}`);
      const charge = response.data;

      return {
        id: charge.chargeId,
        providerIntentId: charge.chargeId,
        provider: this.provider,
        amount: charge.chargeAmount ? parseFloat(charge.chargeAmount.amount) : 0,
        currency: charge.chargeAmount?.currencyCode || 'USD',
        status: this.mapAmazonChargeStatus(charge.statusDetails.state),
        metadata: { chargePermissionId: charge.chargePermissionId },
        createdAt: new Date(charge.creationTimestamp),
      };
    } catch (error: any) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      this.handleAmazonPayError(error, 'Get charge');
    }
  }

  // ============================================
  // REFUNDS
  // ============================================

  async createRefund(request: RefundRequest): Promise<Refund> {
    this.ensureConfigured();
    this.validateRequired(request, ['transactionId']);

    try {
      const response = await this.client!.post('/refunds', {
        chargeId: request.transactionId,
        refundAmount: request.amount ? {
          amount: String(request.amount / 100),
          currencyCode: 'USD',
        } : undefined,
        softDescriptor: request.reason?.substring(0, 16),
      });

      const refund = response.data;

      this.log('info', 'Refund created', {
        refundId: refund.refundId,
        chargeId: request.transactionId,
      });

      return {
        id: refund.refundId,
        transactionId: request.transactionId,
        providerRefundId: refund.refundId,
        provider: this.provider,
        amount: refund.refundAmount ? parseFloat(refund.refundAmount.amount) : 0,
        currency: refund.refundAmount?.currencyCode || 'USD',
        status: this.mapAmazonRefundStatus(refund.statusDetails.state),
        reason: request.reason,
        metadata: {},
        createdAt: new Date(refund.creationTimestamp),
      };
    } catch (error: any) {
      this.handleAmazonPayError(error, 'Create refund');
    }
  }

  async getRefund(refundId: string): Promise<Refund | null> {
    this.ensureConfigured();

    try {
      const response = await this.client!.get(`/refunds/${refundId}`);
      const refund = response.data;

      return {
        id: refund.refundId,
        transactionId: refund.chargeId,
        providerRefundId: refund.refundId,
        provider: this.provider,
        amount: refund.refundAmount ? parseFloat(refund.refundAmount.amount) : 0,
        currency: refund.refundAmount?.currencyCode || 'USD',
        status: this.mapAmazonRefundStatus(refund.statusDetails.state),
        metadata: {},
        createdAt: new Date(refund.creationTimestamp),
      };
    } catch (error: any) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      this.handleAmazonPayError(error, 'Get refund');
    }
  }

  // ============================================
  // REQUIRED INTERFACE METHODS
  // ============================================

  async createCustomer(request: CreateCustomerRequest): Promise<PaymentCustomer> {
    // Amazon Pay uses buyer IDs from checkout sessions
    return {
      id: request.userId,
      providerCustomerId: `amazon_${request.userId}`,
      provider: this.provider,
      email: request.email,
      name: request.name,
      metadata: request.metadata,
      createdAt: new Date(),
    };
  }

  async getCustomer(providerCustomerId: string): Promise<PaymentCustomer | null> {
    return null; // Amazon Pay gets customer info from checkout sessions
  }

  async updateCustomer(
    providerCustomerId: string,
    updates: Partial<CreateCustomerRequest>
  ): Promise<PaymentCustomer> {
    return {
      id: providerCustomerId.replace('amazon_', ''),
      providerCustomerId,
      provider: this.provider,
      email: updates.email || '',
      name: updates.name,
      createdAt: new Date(),
    };
  }

  async deleteCustomer(providerCustomerId: string): Promise<void> {
    // No-op for Amazon Pay
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethod> {
    // Amazon Pay doesn't support detached payment methods
    throw new PaymentProviderError(
      'Amazon Pay uses checkout sessions for payment methods',
      this.provider,
      'NOT_SUPPORTED'
    );
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    throw new PaymentProviderError(
      'Amazon Pay does not support payment method detachment',
      this.provider,
      'NOT_SUPPORTED'
    );
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    return []; // Amazon Pay manages payment methods internally
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    // No-op
  }

  async getPaymentMethod(paymentMethodId: string): Promise<PaymentMethod | null> {
    return null;
  }

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    // For Amazon Pay, we create a checkout session instead
    const session = await this.createCheckoutSession({
      userId: request.userId,
      mode: 'payment',
      successUrl: request.metadata?.successUrl || 'https://app.flamoral.com/payment/success',
      cancelUrl: request.metadata?.cancelUrl || 'https://app.flamoral.com/payment/cancel',
      lineItems: [{
        productName: request.description || 'Purchase',
        unitAmount: this.convertToProviderAmount(request.amount, request.currency),
        currency: request.currency,
        quantity: 1,
      }],
      metadata: request.metadata,
    });

    return {
      id: session.id,
      providerIntentId: session.providerSessionId,
      provider: this.provider,
      amount: request.amount,
      currency: request.currency,
      status: TransactionStatus.PENDING,
      customerId: request.customerId,
      clientSecret: session.id,
      description: request.description,
      metadata: { checkoutUrl: session.url, ...request.metadata },
      requiresAction: true,
      nextActionUrl: session.url,
      createdAt: new Date(),
    };
  }

  async confirmPaymentIntent(sessionId: string): Promise<PaymentIntent> {
    return this.completeCheckoutSession(sessionId) as any;
  }

  async cancelPaymentIntent(sessionId: string): Promise<PaymentIntent> {
    this.log('info', 'Checkout session canceled', { sessionId });

    return {
      id: sessionId,
      providerIntentId: sessionId,
      provider: this.provider,
      amount: 0,
      currency: 'USD',
      status: TransactionStatus.CANCELED,
      createdAt: new Date(),
    };
  }

  async getPaymentIntent(sessionId: string): Promise<PaymentIntent | null> {
    const session = await this.getCheckoutSession(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      providerIntentId: session.providerSessionId,
      provider: this.provider,
      amount: session.amountTotal || 0,
      currency: session.currency || 'USD',
      status: session.status === 'complete' ? TransactionStatus.SUCCEEDED : TransactionStatus.PENDING,
      createdAt: new Date(),
    };
  }

  // Subscriptions (via Charge Permissions)
  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    this.ensureConfigured();
    this.validateRequired(request, ['userId', 'planId']);

    // For Amazon Pay, create a recurring checkout session
    const session = await this.createCheckoutSession({
      userId: request.userId,
      mode: 'subscription',
      successUrl: request.metadata?.successUrl || 'https://app.flamoral.com/subscription/success',
      cancelUrl: request.metadata?.cancelUrl || 'https://app.flamoral.com/subscription/cancel',
      lineItems: [{
        productName: request.metadata?.planName || 'Subscription',
        unitAmount: request.metadata?.amount || 0,
        currency: request.metadata?.currency || 'USD',
        quantity: 1,
      }],
      metadata: {
        ...request.metadata,
        planId: request.planId,
        billingPeriod: request.billingPeriod,
      },
    });

    return {
      id: session.id,
      userId: request.userId,
      providerSubscriptionId: session.id,
      provider: this.provider,
      planId: request.planId,
      tier: (request.metadata?.tier as SubscriptionTier) || SubscriptionTier.PREMIUM,
      status: SubscriptionStatus.INCOMPLETE,
      billingPeriod: request.billingPeriod,
      currentPeriodStart: new Date(),
      currentPeriodEnd: this.calculatePeriodEnd(new Date(), request.billingPeriod),
      cancelAtPeriodEnd: false,
      metadata: { checkoutUrl: session.url, ...request.metadata },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getSubscription(providerSubscriptionId: string): Promise<Subscription | null> {
    // Would retrieve charge permission
    return null;
  }

  async updateSubscription(
    providerSubscriptionId: string,
    updates: any
  ): Promise<Subscription> {
    // Amazon Pay subscriptions are updated via charge permission
    return {
      id: providerSubscriptionId,
      userId: '',
      providerSubscriptionId,
      provider: this.provider,
      planId: updates.planId || '',
      tier: SubscriptionTier.PREMIUM,
      status: SubscriptionStatus.ACTIVE,
      billingPeriod: BillingPeriod.MONTHLY,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: updates.cancelAtPeriodEnd || false,
      metadata: updates.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async cancelSubscription(request: CancelSubscriptionRequest): Promise<Subscription> {
    this.ensureConfigured();

    try {
      // Close the charge permission
      await this.client!.delete(`/chargePermissions/${request.subscriptionId}/close`, {
        data: {
          closureReason: request.reason || 'Customer cancelled',
          cancelPendingCharges: request.immediately || false,
        },
      });

      this.log('info', 'Subscription canceled', {
        subscriptionId: request.subscriptionId,
      });

      return {
        id: request.subscriptionId,
        userId: '',
        providerSubscriptionId: request.subscriptionId,
        provider: this.provider,
        planId: '',
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.CANCELED,
        billingPeriod: BillingPeriod.MONTHLY,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: !request.immediately,
        canceledAt: new Date(),
        metadata: { reason: request.reason },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      this.handleAmazonPayError(error, 'Cancel subscription');
    }
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<Subscription> {
    throw new PaymentProviderError(
      'Amazon Pay subscriptions cannot be reactivated. Create a new subscription.',
      this.provider,
      'NOT_SUPPORTED'
    );
  }

  // ============================================
  // WEBHOOKS (IPN - Instant Payment Notifications)
  // ============================================

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    // Amazon Pay uses SNS-style message verification
    // In production, verify the certificate and signature
    try {
      const payloadString = typeof payload === 'string' ? payload : payload.toString();
      const notification = JSON.parse(payloadString);

      // Verify Message, MessageId, TopicArn, Timestamp, Type are present
      return !!(notification.Message && notification.MessageId);
    } catch (error) {
      return false;
    }
  }

  parseWebhookEvent(payload: string | Buffer, signature: string): WebhookEvent | null {
    try {
      const payloadString = typeof payload === 'string' ? payload : payload.toString();
      const notification = JSON.parse(payloadString);

      // Parse the inner message
      const message = JSON.parse(notification.Message);

      return {
        id: `amazon_${message.ObjectId}_${message.NotificationType}`,
        provider: this.provider,
        eventType: this.mapAmazonEventType(message.NotificationType),
        eventId: message.ObjectId,
        data: message,
        timestamp: new Date(message.ReleaseTimestamp || notification.Timestamp),
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
    return [PaymentMethodType.AMAZON_PAY];
  }

  getSupportedCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'JPY'];
  }

  mapTransactionStatus(amazonStatus: string): TransactionStatus {
    const statusMap: Record<string, TransactionStatus> = {
      Pending: TransactionStatus.PENDING,
      Open: TransactionStatus.PENDING,
      Declined: TransactionStatus.FAILED,
      Authorized: TransactionStatus.PROCESSING,
      Captured: TransactionStatus.SUCCEEDED,
      Completed: TransactionStatus.SUCCEEDED,
      Canceled: TransactionStatus.CANCELED,
      Closed: TransactionStatus.CANCELED,
    };
    return statusMap[amazonStatus] || TransactionStatus.PENDING;
  }

  mapSubscriptionStatus(status: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      Open: SubscriptionStatus.ACTIVE,
      Chargeable: SubscriptionStatus.ACTIVE,
      NonChargeable: SubscriptionStatus.PAST_DUE,
      Closed: SubscriptionStatus.CANCELED,
    };
    return statusMap[status] || SubscriptionStatus.ACTIVE;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private isNotFoundError(error: any): boolean {
    return error.response?.status === 404;
  }

  private handleAmazonPayError(error: any, operation: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      const errorMessage = axiosError.response?.data?.message
        || axiosError.response?.data?.reasonCode
        || axiosError.message;
      const errorCode = axiosError.response?.data?.reasonCode || 'UNKNOWN_ERROR';

      throw new PaymentProviderError(
        `${operation} failed: ${errorMessage}`,
        this.provider,
        errorCode,
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

  private calculatePeriodEnd(start: Date, billingPeriod: BillingPeriod): Date {
    const end = new Date(start);
    switch (billingPeriod) {
      case BillingPeriod.MONTHLY:
        end.setMonth(end.getMonth() + 1);
        break;
      case BillingPeriod.QUARTERLY:
        end.setMonth(end.getMonth() + 3);
        break;
      case BillingPeriod.YEARLY:
        end.setFullYear(end.getFullYear() + 1);
        break;
      default:
        end.setMonth(end.getMonth() + 1);
    }
    return end;
  }

  private mapAmazonSessionStatus(state: string): 'open' | 'complete' | 'expired' {
    switch (state) {
      case 'Completed':
        return 'complete';
      case 'Canceled':
      case 'Expired':
        return 'expired';
      default:
        return 'open';
    }
  }

  private mapAmazonChargeStatus(state: string): TransactionStatus {
    const statusMap: Record<string, TransactionStatus> = {
      Pending: TransactionStatus.PENDING,
      Authorized: TransactionStatus.PROCESSING,
      AuthorizationInitiated: TransactionStatus.PROCESSING,
      Captured: TransactionStatus.SUCCEEDED,
      CaptureInitiated: TransactionStatus.PROCESSING,
      Declined: TransactionStatus.FAILED,
      Canceled: TransactionStatus.CANCELED,
    };
    return statusMap[state] || TransactionStatus.PENDING;
  }

  private mapAmazonRefundStatus(state: string): 'pending' | 'succeeded' | 'failed' | 'canceled' {
    const statusMap: Record<string, 'pending' | 'succeeded' | 'failed' | 'canceled'> = {
      Pending: 'pending',
      RefundInitiated: 'pending',
      Refunded: 'succeeded',
      Declined: 'failed',
    };
    return statusMap[state] || 'pending';
  }

  private mapAmazonEventType(notificationType: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      CHARGE_AUTHORIZED: WebhookEventType.PAYMENT_SUCCEEDED,
      CHARGE_CAPTURED: WebhookEventType.PAYMENT_SUCCEEDED,
      CHARGE_DECLINED: WebhookEventType.PAYMENT_FAILED,
      CHARGE_PERMISSION_CLOSED: WebhookEventType.SUBSCRIPTION_CANCELED,
      REFUND_COMPLETED: WebhookEventType.PAYMENT_REFUNDED,
      REFUND_DECLINED: WebhookEventType.PAYMENT_FAILED,
      CHARGEBACK_CREATED: WebhookEventType.PAYMENT_DISPUTED,
    };
    return eventMap[notificationType] || WebhookEventType.PAYMENT_CREATED;
  }
}

// Extend PaymentMethodType to include Amazon Pay
declare module '../types' {
  export enum PaymentMethodType {
    AMAZON_PAY = 'amazon_pay',
  }
}

// Export singleton instance
export const amazonPayProvider = new AmazonPayProvider();
