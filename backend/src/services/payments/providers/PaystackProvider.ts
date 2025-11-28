/**
 * Paystack Payment Provider
 * Full implementation for Nigerian and other African markets
 * Supports cards, bank transfers, USSD, mobile money
 */

import axios, { AxiosInstance } from 'axios';
import { BasePaymentProvider } from './BaseProvider';
import {
  IMobileMoneyProvider,
  IBankTransferProvider,
  MobileMoneyOptions,
  MobileMoneyPayment,
  BankTransferOptions,
  BankTransferPayment,
  VirtualAccount,
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

export class PaystackProvider
  extends BasePaymentProvider
  implements IMobileMoneyProvider, IBankTransferProvider
{
  readonly provider = PaymentProvider.PAYSTACK;
  private client: AxiosInstance | null = null;
  private secretKey: string | null = null;
  private publicKey: string | null = null;

  private readonly baseUrl = 'https://api.paystack.co';

  // ============================================
  // INITIALIZATION
  // ============================================

  async initialize(): Promise<void> {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || null;
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY || null;

    if (!this.secretKey) {
      this.log('warn', 'Paystack secret key not configured');
      this._isConfigured = false;
      return;
    }

    try {
      this.client = axios.create({
        baseURL: this.baseUrl,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      // Verify connection
      await this.client.get('/bank');

      this._isConfigured = true;
      this.log('info', 'Paystack provider initialized successfully');
    } catch (error: any) {
      this.log('error', 'Failed to initialize Paystack', { error: error.message });
      this._isConfigured = false;
    }
  }

  getPublicKey(): string | null {
    return this.publicKey;
  }

  private async makeRequest<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    data?: any
  ): Promise<T> {
    this.ensureConfigured();

    try {
      const response = await this.client!({
        method,
        url: endpoint,
        data,
      });

      if (!response.data.status) {
        throw new PaymentProviderError(
          response.data.message || 'Paystack API error',
          PaymentProvider.PAYSTACK,
          'API_ERROR'
        );
      }

      return response.data;
    } catch (error: any) {
      if (error instanceof PaymentProviderError) throw error;

      if (error.response?.data) {
        throw new PaymentProviderError(
          error.response.data.message || 'Paystack API error',
          PaymentProvider.PAYSTACK,
          error.response.data.code,
          error
        );
      }
      throw error;
    }
  }

  private generateReference(): string {
    return `PS_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Amount in kobo (100 kobo = 1 NGN)
  convertToProviderAmount(amount: number, currency: string): number {
    // Paystack uses kobo for NGN (100 kobo = 1 Naira)
    // For USD/GHS/ZAR it uses pesewas/cents (100 = 1 unit)
    return Math.round(amount * 100);
  }

  convertFromProviderAmount(amount: number, currency: string): number {
    return amount / 100;
  }

  // ============================================
  // CUSTOMER MANAGEMENT
  // ============================================

  async createCustomer(request: CreateCustomerRequest): Promise<PaymentCustomer> {
    this.ensureConfigured();
    this.validateRequired(request, ['userId', 'email']);

    try {
      const response = await this.makeRequest<any>('post', '/customer', {
        email: request.email,
        first_name: request.name?.split(' ')[0],
        last_name: request.name?.split(' ').slice(1).join(' '),
        phone: request.phone,
        metadata: {
          userId: request.userId,
          ...request.metadata,
        },
      });

      const customer = response.data;

      this.log('info', 'Paystack customer created', {
        customerId: customer.customer_code,
        userId: request.userId,
      });

      return {
        id: request.userId,
        providerCustomerId: customer.customer_code,
        provider: PaymentProvider.PAYSTACK,
        email: customer.email,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        phone: customer.phone,
        metadata: customer.metadata,
        createdAt: new Date(customer.createdAt),
      };
    } catch (error: any) {
      this.handleError(error, 'Create Paystack customer');
    }
  }

  async getCustomer(providerCustomerId: string): Promise<PaymentCustomer | null> {
    this.ensureConfigured();

    try {
      const response = await this.makeRequest<any>('get', `/customer/${providerCustomerId}`);
      const customer = response.data;

      return {
        id: customer.metadata?.userId || customer.customer_code,
        providerCustomerId: customer.customer_code,
        provider: PaymentProvider.PAYSTACK,
        email: customer.email,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        phone: customer.phone,
        metadata: customer.metadata,
        createdAt: new Date(customer.createdAt),
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      this.handleError(error, 'Get Paystack customer');
    }
  }

  async updateCustomer(
    providerCustomerId: string,
    updates: Partial<CreateCustomerRequest>
  ): Promise<PaymentCustomer> {
    this.ensureConfigured();

    try {
      const updateData: any = {};
      if (updates.name) {
        updateData.first_name = updates.name.split(' ')[0];
        updateData.last_name = updates.name.split(' ').slice(1).join(' ');
      }
      if (updates.phone) updateData.phone = updates.phone;
      if (updates.metadata) updateData.metadata = updates.metadata;

      const response = await this.makeRequest<any>('put', `/customer/${providerCustomerId}`, updateData);
      const customer = response.data;

      return {
        id: customer.metadata?.userId || customer.customer_code,
        providerCustomerId: customer.customer_code,
        provider: PaymentProvider.PAYSTACK,
        email: customer.email,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        phone: customer.phone,
        metadata: customer.metadata,
        createdAt: new Date(customer.createdAt),
      };
    } catch (error: any) {
      this.handleError(error, 'Update Paystack customer');
    }
  }

  async deleteCustomer(providerCustomerId: string): Promise<void> {
    // Paystack doesn't support customer deletion
    this.log('info', 'Paystack customer deletion (no-op)', { customerId: providerCustomerId });
  }

  // ============================================
  // PAYMENT METHOD (AUTHORIZATION) MANAGEMENT
  // ============================================

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethod> {
    throw new PaymentError(
      'Paystack authorizations are created during payment',
      'NOT_SUPPORTED',
      this.provider
    );
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    this.ensureConfigured();

    try {
      await this.makeRequest<any>('post', '/customer/deactivate_authorization', {
        authorization_code: paymentMethodId,
      });
      this.log('info', 'Paystack authorization deactivated', { authCode: paymentMethodId });
    } catch (error: any) {
      this.handleError(error, 'Deactivate authorization');
    }
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    // Paystack stores authorizations with customer
    // We'd need to fetch from our database or customer object
    return [];
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    // Managed in our database
    this.log('info', 'Set default authorization', { customerId, authCode: paymentMethodId });
  }

  async getPaymentMethod(paymentMethodId: string): Promise<PaymentMethod | null> {
    return null;
  }

  // ============================================
  // TRANSACTIONS
  // ============================================

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    this.ensureConfigured();
    this.validateRequired(request, ['userId', 'amount', 'currency']);
    this.validateAmount(request.amount, request.currency);

    const reference = this.generateReference();

    try {
      const paymentData: any = {
        email: request.metadata?.email || 'customer@example.com',
        amount: this.convertToProviderAmount(request.amount, request.currency),
        currency: this.formatCurrency(request.currency),
        reference,
        callback_url: request.metadata?.callbackUrl || 'https://app.flamoral.com/payment/callback',
        metadata: {
          userId: request.userId,
          custom_fields: [
            {
              display_name: 'User ID',
              variable_name: 'user_id',
              value: request.userId,
            },
          ],
          ...request.metadata,
        },
      };

      // Add channels if specified
      if (request.paymentMethodTypes && request.paymentMethodTypes.length > 0) {
        paymentData.channels = this.mapPaymentMethodsToChannels(request.paymentMethodTypes);
      }

      const response = await this.makeRequest<any>('post', '/transaction/initialize', paymentData);

      this.log('info', 'Paystack transaction initialized', {
        reference,
        userId: request.userId,
        amount: request.amount,
      });

      return {
        id: reference,
        providerIntentId: reference,
        provider: PaymentProvider.PAYSTACK,
        amount: request.amount,
        currency: request.currency.toUpperCase(),
        status: TransactionStatus.PENDING,
        clientSecret: response.data.access_code,
        description: request.description,
        metadata: request.metadata,
        requiresAction: true,
        nextActionUrl: response.data.authorization_url,
        createdAt: new Date(),
      };
    } catch (error: any) {
      this.handleError(error, 'Initialize Paystack transaction');
    }
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    return this.verifyTransaction(paymentIntentId);
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    return {
      id: paymentIntentId,
      providerIntentId: paymentIntentId,
      provider: PaymentProvider.PAYSTACK,
      amount: 0,
      currency: 'NGN',
      status: TransactionStatus.CANCELED,
      createdAt: new Date(),
    };
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null> {
    try {
      return await this.verifyTransaction(paymentIntentId);
    } catch {
      return null;
    }
  }

  async verifyTransaction(reference: string): Promise<PaymentIntent> {
    this.ensureConfigured();

    try {
      const response = await this.makeRequest<any>('get', `/transaction/verify/${reference}`);
      const data = response.data;

      return {
        id: data.reference,
        providerIntentId: data.id.toString(),
        provider: PaymentProvider.PAYSTACK,
        amount: this.convertFromProviderAmount(data.amount, data.currency),
        currency: data.currency,
        status: this.mapTransactionStatus(data.status),
        metadata: data.metadata,
        createdAt: new Date(data.created_at),
      };
    } catch (error: any) {
      this.handleError(error, 'Verify Paystack transaction');
    }
  }

  // Charge an existing authorization (for recurring payments)
  async chargeAuthorization(options: {
    email: string;
    amount: number;
    currency: string;
    authorizationCode: string;
    reference?: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentIntent> {
    this.ensureConfigured();

    const reference = options.reference || this.generateReference();

    try {
      const response = await this.makeRequest<any>('post', '/transaction/charge_authorization', {
        email: options.email,
        amount: this.convertToProviderAmount(options.amount, options.currency),
        currency: this.formatCurrency(options.currency),
        authorization_code: options.authorizationCode,
        reference,
        metadata: options.metadata,
      });

      const data = response.data;

      return {
        id: data.reference,
        providerIntentId: data.id.toString(),
        provider: PaymentProvider.PAYSTACK,
        amount: this.convertFromProviderAmount(data.amount, data.currency),
        currency: data.currency,
        status: this.mapTransactionStatus(data.status),
        metadata: data.metadata,
        createdAt: new Date(data.created_at),
      };
    } catch (error: any) {
      this.handleError(error, 'Charge authorization');
    }
  }

  private mapPaymentMethodsToChannels(methods: PaymentMethodType[]): string[] {
    const channelMap: Record<PaymentMethodType, string> = {
      [PaymentMethodType.CARD]: 'card',
      [PaymentMethodType.BANK_TRANSFER]: 'bank_transfer',
      [PaymentMethodType.BANK_ACCOUNT]: 'bank',
      [PaymentMethodType.USSD]: 'ussd',
      [PaymentMethodType.MOBILE_MONEY]: 'mobile_money',
      [PaymentMethodType.APPLE_PAY]: 'card',
      [PaymentMethodType.GOOGLE_PAY]: 'card',
      [PaymentMethodType.PAYPAL]: 'card',
      [PaymentMethodType.VENMO]: 'card',
      [PaymentMethodType.ACH]: 'bank',
    };

    return methods.map(m => channelMap[m]).filter(Boolean);
  }

  // ============================================
  // MOBILE MONEY
  // ============================================

  async initializeMobileMoneyPayment(options: MobileMoneyOptions): Promise<MobileMoneyPayment> {
    this.ensureConfigured();
    this.validateRequired(options, ['userId', 'amount', 'currency', 'email', 'phone']);

    const reference = this.generateReference();

    try {
      const response = await this.makeRequest<any>('post', '/charge', {
        email: options.email,
        amount: this.convertToProviderAmount(options.amount, options.currency),
        currency: this.formatCurrency(options.currency),
        reference,
        mobile_money: {
          phone: options.phone,
          provider: options.network || 'mtn',
        },
        metadata: {
          userId: options.userId,
          ...options.metadata,
        },
      });

      const data = response.data;

      return {
        reference,
        providerReference: data.reference,
        status: this.mapTransactionStatus(data.status),
        amount: options.amount,
        currency: options.currency,
        phone: options.phone,
        network: options.network,
        authorizationUrl: data.display_text ? undefined : data.authorization_url,
        ussdCode: data.display_text,
        message: data.display_text || 'Check your phone for authorization',
      };
    } catch (error: any) {
      this.handleError(error, 'Initialize mobile money payment');
    }
  }

  async getMobileMoneyPaymentStatus(reference: string): Promise<MobileMoneyPayment> {
    const transaction = await this.verifyTransaction(reference);

    return {
      reference: transaction.id,
      providerReference: transaction.providerIntentId,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      phone: '',
    };
  }

  async verifyMobileMoneyPayment(reference: string): Promise<MobileMoneyPayment> {
    return this.getMobileMoneyPaymentStatus(reference);
  }

  // ============================================
  // BANK TRANSFERS (DEDICATED VIRTUAL ACCOUNT)
  // ============================================

  async createVirtualAccount(userId: string, email: string): Promise<VirtualAccount> {
    this.ensureConfigured();

    try {
      // First create or get customer
      let customer;
      try {
        const customerResponse = await this.makeRequest<any>('get', `/customer/${email}`);
        customer = customerResponse.data;
      } catch {
        const createResponse = await this.makeRequest<any>('post', '/customer', {
          email,
          metadata: { userId },
        });
        customer = createResponse.data;
      }

      // Create dedicated virtual account
      const response = await this.makeRequest<any>('post', '/dedicated_account', {
        customer: customer.customer_code,
        preferred_bank: 'wema-bank', // or 'titan-paystack', 'test-bank'
      });

      const data = response.data;

      return {
        id: data.id.toString(),
        accountNumber: data.account_number,
        accountName: data.account_name,
        bankName: data.bank.name,
        bankCode: data.bank.slug,
        currency: 'NGN',
        isActive: data.active,
      };
    } catch (error: any) {
      this.handleError(error, 'Create dedicated virtual account');
    }
  }

  async getVirtualAccount(accountId: string): Promise<VirtualAccount | null> {
    this.ensureConfigured();

    try {
      const response = await this.makeRequest<any>('get', `/dedicated_account/${accountId}`);
      const data = response.data;

      return {
        id: data.id.toString(),
        accountNumber: data.account_number,
        accountName: data.account_name,
        bankName: data.bank.name,
        bankCode: data.bank.slug,
        currency: 'NGN',
        isActive: data.active,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      this.handleError(error, 'Get dedicated virtual account');
    }
  }

  async initializeBankTransfer(options: BankTransferOptions): Promise<BankTransferPayment> {
    // Use the standard payment initialization with bank_transfer channel
    const reference = this.generateReference();

    try {
      const response = await this.makeRequest<any>('post', '/transaction/initialize', {
        email: options.email,
        amount: this.convertToProviderAmount(options.amount, options.currency),
        currency: this.formatCurrency(options.currency),
        reference,
        channels: ['bank_transfer'],
        metadata: {
          userId: options.userId,
          ...options.metadata,
        },
      });

      // The response includes virtual account details
      return {
        reference,
        accountNumber: '', // Will be provided in webhook/redirect
        accountName: 'Flamoral',
        bankName: 'Paystack-Titan',
        amount: options.amount,
        currency: options.currency,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        status: TransactionStatus.PENDING,
      };
    } catch (error: any) {
      this.handleError(error, 'Initialize bank transfer');
    }
  }

  // ============================================
  // SUBSCRIPTIONS (PLANS)
  // ============================================

  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    this.ensureConfigured();
    this.validateRequired(request, ['userId', 'planId']);

    try {
      // Get or create customer
      const customerEmail = request.metadata?.email;
      if (!customerEmail) {
        throw new PaymentError('Customer email is required', 'VALIDATION_ERROR', this.provider);
      }

      // Create subscription
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + (request.trialDays || 0));

      const response = await this.makeRequest<any>('post', '/subscription', {
        customer: customerEmail,
        plan: request.planId,
        start_date: startDate.toISOString().split('T')[0],
      });

      const data = response.data;

      this.log('info', 'Paystack subscription created', {
        subscriptionCode: data.subscription_code,
        userId: request.userId,
      });

      return {
        id: data.subscription_code,
        userId: request.userId,
        providerSubscriptionId: data.subscription_code,
        provider: PaymentProvider.PAYSTACK,
        planId: request.planId,
        tier: (request.metadata?.tier as SubscriptionTier) || SubscriptionTier.PREMIUM,
        status: this.mapSubscriptionStatus(data.status),
        billingPeriod: request.billingPeriod || BillingPeriod.MONTHLY,
        currentPeriodStart: new Date(data.createdAt),
        currentPeriodEnd: new Date(data.next_payment_date),
        trialStart: request.trialDays ? new Date() : undefined,
        trialEnd: request.trialDays ? startDate : undefined,
        cancelAtPeriodEnd: false,
        metadata: request.metadata,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      this.handleError(error, 'Create Paystack subscription');
    }
  }

  async getSubscription(providerSubscriptionId: string): Promise<Subscription | null> {
    this.ensureConfigured();

    try {
      const response = await this.makeRequest<any>('get', `/subscription/${providerSubscriptionId}`);
      const data = response.data;

      return {
        id: data.subscription_code,
        userId: data.customer?.metadata?.userId || '',
        providerSubscriptionId: data.subscription_code,
        provider: PaymentProvider.PAYSTACK,
        planId: data.plan?.plan_code || '',
        tier: SubscriptionTier.PREMIUM,
        status: this.mapSubscriptionStatus(data.status),
        billingPeriod: data.plan?.interval === 'annually' ? BillingPeriod.YEARLY : BillingPeriod.MONTHLY,
        currentPeriodStart: new Date(data.createdAt),
        currentPeriodEnd: new Date(data.next_payment_date),
        cancelAtPeriodEnd: false,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      this.handleError(error, 'Get Paystack subscription');
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
    throw new PaymentError(
      'Paystack subscriptions cannot be updated. Cancel and create new.',
      'NOT_SUPPORTED',
      this.provider
    );
  }

  async cancelSubscription(request: CancelSubscriptionRequest): Promise<Subscription> {
    this.ensureConfigured();

    try {
      // Get subscription to get the email token
      const subResponse = await this.makeRequest<any>('get', `/subscription/${request.subscriptionId}`);
      const emailToken = subResponse.data.email_token;

      await this.makeRequest<any>('post', '/subscription/disable', {
        code: request.subscriptionId,
        token: emailToken,
      });

      const subscription = await this.getSubscription(request.subscriptionId);
      if (!subscription) {
        throw new PaymentError('Subscription not found', 'NOT_FOUND', this.provider);
      }

      return {
        ...subscription,
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
      };
    } catch (error: any) {
      this.handleError(error, 'Cancel Paystack subscription');
    }
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<Subscription> {
    this.ensureConfigured();

    try {
      const subResponse = await this.makeRequest<any>('get', `/subscription/${providerSubscriptionId}`);
      const emailToken = subResponse.data.email_token;

      await this.makeRequest<any>('post', '/subscription/enable', {
        code: providerSubscriptionId,
        token: emailToken,
      });

      const subscription = await this.getSubscription(providerSubscriptionId);
      if (!subscription) {
        throw new PaymentError('Subscription not found', 'NOT_FOUND', this.provider);
      }

      return {
        ...subscription,
        status: SubscriptionStatus.ACTIVE,
        canceledAt: undefined,
      };
    } catch (error: any) {
      this.handleError(error, 'Reactivate Paystack subscription');
    }
  }

  // Create a subscription plan
  async createPlan(options: {
    name: string;
    interval: 'daily' | 'weekly' | 'monthly' | 'biannually' | 'annually';
    amount: number;
    currency?: string;
    description?: string;
  }): Promise<string> {
    this.ensureConfigured();

    try {
      const response = await this.makeRequest<any>('post', '/plan', {
        name: options.name,
        interval: options.interval,
        amount: this.convertToProviderAmount(options.amount, options.currency || 'NGN'),
        currency: this.formatCurrency(options.currency || 'NGN'),
        description: options.description,
      });

      return response.data.plan_code;
    } catch (error: any) {
      this.handleError(error, 'Create Paystack plan');
    }
  }

  // ============================================
  // REFUNDS
  // ============================================

  async createRefund(request: RefundRequest): Promise<Refund> {
    this.ensureConfigured();
    this.validateRequired(request, ['transactionId']);

    try {
      const refundData: any = {
        transaction: request.transactionId,
      };

      if (request.amount) {
        refundData.amount = this.convertToProviderAmount(request.amount, 'NGN');
      }

      const response = await this.makeRequest<any>('post', '/refund', refundData);
      const data = response.data;

      return {
        id: data.id.toString(),
        transactionId: request.transactionId,
        providerRefundId: data.id.toString(),
        provider: PaymentProvider.PAYSTACK,
        amount: this.convertFromProviderAmount(data.amount, data.currency),
        currency: data.currency,
        status: data.status === 'processed' ? 'succeeded' : 'pending',
        reason: request.reason,
        createdAt: new Date(data.createdAt),
      };
    } catch (error: any) {
      this.handleError(error, 'Create Paystack refund');
    }
  }

  async getRefund(refundId: string): Promise<Refund | null> {
    this.ensureConfigured();

    try {
      const response = await this.makeRequest<any>('get', `/refund/${refundId}`);
      const data = response.data;

      return {
        id: data.id.toString(),
        transactionId: data.transaction?.reference || '',
        providerRefundId: data.id.toString(),
        provider: PaymentProvider.PAYSTACK,
        amount: this.convertFromProviderAmount(data.amount, data.currency),
        currency: data.currency,
        status: data.status === 'processed' ? 'succeeded' : 'pending',
        createdAt: new Date(data.createdAt),
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      this.handleError(error, 'Get Paystack refund');
    }
  }

  // ============================================
  // WEBHOOKS
  // ============================================

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    if (!this.secretKey) {
      this.log('warn', 'Secret key not configured');
      return false;
    }

    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(typeof payload === 'string' ? payload : payload.toString())
      .digest('hex');

    return hash === signature;
  }

  parseWebhookEvent(payload: string | Buffer, signature: string): WebhookEvent | null {
    if (!this.verifyWebhookSignature(payload, signature)) {
      this.log('error', 'Invalid webhook signature');
      return null;
    }

    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString());

      return {
        id: `ps_${data.data?.id || Date.now()}`,
        provider: PaymentProvider.PAYSTACK,
        eventType: this.mapPaystackEventType(data.event),
        eventId: data.data?.id?.toString() || '',
        data: data.data,
        timestamp: new Date(),
        rawPayload: typeof payload === 'string' ? payload : payload.toString(),
      };
    } catch (error: any) {
      this.log('error', 'Failed to parse Paystack webhook', { error: error.message });
      return null;
    }
  }

  async processWebhookEvent(event: WebhookEvent): Promise<WebhookProcessingResult> {
    this.log('info', `Processing Paystack webhook: ${event.eventType}`, { eventId: event.eventId });

    return {
      success: true,
      eventId: event.eventId,
      eventType: event.eventType,
      message: `Paystack event ${event.eventType} received`,
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  getSupportedPaymentMethods(): PaymentMethodType[] {
    return [
      PaymentMethodType.CARD,
      PaymentMethodType.BANK_TRANSFER,
      PaymentMethodType.BANK_ACCOUNT,
      PaymentMethodType.USSD,
      PaymentMethodType.MOBILE_MONEY,
    ];
  }

  getSupportedCurrencies(): string[] {
    return ['NGN', 'GHS', 'ZAR', 'USD'];
  }

  mapTransactionStatus(paystackStatus: string): TransactionStatus {
    const statusMap: Record<string, TransactionStatus> = {
      success: TransactionStatus.SUCCEEDED,
      failed: TransactionStatus.FAILED,
      pending: TransactionStatus.PENDING,
      abandoned: TransactionStatus.CANCELED,
      reversed: TransactionStatus.REFUNDED,
    };
    return statusMap[paystackStatus.toLowerCase()] || TransactionStatus.PENDING;
  }

  mapSubscriptionStatus(paystackStatus: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      'non-renewing': SubscriptionStatus.CANCELED,
      attention: SubscriptionStatus.PAST_DUE,
      completed: SubscriptionStatus.CANCELED,
      cancelled: SubscriptionStatus.CANCELED,
    };
    return statusMap[paystackStatus.toLowerCase()] || SubscriptionStatus.INCOMPLETE;
  }

  private mapPaystackEventType(eventType: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      'charge.success': WebhookEventType.PAYMENT_SUCCEEDED,
      'charge.failed': WebhookEventType.PAYMENT_FAILED,
      'transfer.success': WebhookEventType.PAYMENT_SUCCEEDED,
      'transfer.failed': WebhookEventType.PAYMENT_FAILED,
      'refund.processed': WebhookEventType.PAYMENT_REFUNDED,
      'subscription.create': WebhookEventType.SUBSCRIPTION_CREATED,
      'subscription.disable': WebhookEventType.SUBSCRIPTION_CANCELED,
      'subscription.not_renew': WebhookEventType.SUBSCRIPTION_CANCELED,
      'invoice.create': WebhookEventType.SUBSCRIPTION_RENEWED,
      'invoice.payment_failed': WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED,
      'customeridentification.success': WebhookEventType.CUSTOMER_UPDATED,
    };
    return eventMap[eventType] || WebhookEventType.PAYMENT_CREATED;
  }

  // ============================================
  // BANKS LIST
  // ============================================

  async getBanks(country: string = 'nigeria'): Promise<Array<{ code: string; name: string }>> {
    this.ensureConfigured();

    try {
      const response = await this.makeRequest<any>('get', `/bank?country=${country}`);
      return response.data.map((bank: any) => ({
        code: bank.code,
        name: bank.name,
      }));
    } catch (error: any) {
      this.handleError(error, 'Get banks list');
    }
  }
}

// Export singleton instance
export const paystackProvider = new PaystackProvider();
