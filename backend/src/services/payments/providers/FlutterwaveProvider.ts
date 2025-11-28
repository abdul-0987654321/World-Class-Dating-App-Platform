/**
 * Flutterwave Payment Provider
 * Full implementation for African markets (Nigeria, Ghana, Kenya, etc.)
 * Supports cards, mobile money, bank transfers, and USSD
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

export class FlutterwaveProvider
  extends BasePaymentProvider
  implements IMobileMoneyProvider, IBankTransferProvider
{
  readonly provider = PaymentProvider.FLUTTERWAVE;
  private client: AxiosInstance | null = null;
  private secretKey: string | null = null;
  private publicKey: string | null = null;
  private encryptionKey: string | null = null;
  private webhookSecret: string | null = null;

  private readonly baseUrl = 'https://api.flutterwave.com/v3';

  // ============================================
  // INITIALIZATION
  // ============================================

  async initialize(): Promise<void> {
    this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY || null;
    this.publicKey = process.env.FLUTTERWAVE_PUBLIC_KEY || null;
    this.encryptionKey = process.env.FLUTTERWAVE_ENCRYPTION_KEY || null;
    this.webhookSecret = process.env.FLUTTERWAVE_WEBHOOK_SECRET || null;

    if (!this.secretKey) {
      this.log('warn', 'Flutterwave secret key not configured');
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

      // Verify connection by checking banks list
      await this.client.get('/banks/NG');

      this._isConfigured = true;
      this.log('info', 'Flutterwave provider initialized successfully');
    } catch (error: any) {
      this.log('error', 'Failed to initialize Flutterwave', { error: error.message });
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

      if (response.data.status === 'error') {
        throw new PaymentProviderError(
          response.data.message,
          PaymentProvider.FLUTTERWAVE,
          response.data.code
        );
      }

      return response.data;
    } catch (error: any) {
      if (error instanceof PaymentProviderError) throw error;

      if (error.response?.data) {
        throw new PaymentProviderError(
          error.response.data.message || 'Flutterwave API error',
          PaymentProvider.FLUTTERWAVE,
          error.response.data.code,
          error
        );
      }
      throw error;
    }
  }

  private generateTxRef(): string {
    return `FLW_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // ============================================
  // CUSTOMER MANAGEMENT
  // ============================================

  async createCustomer(request: CreateCustomerRequest): Promise<PaymentCustomer> {
    // Flutterwave doesn't have a customer management API
    // Customers are created implicitly through transactions
    this.validateRequired(request, ['userId', 'email']);

    return {
      id: request.userId,
      providerCustomerId: `flw_${request.userId}`,
      provider: PaymentProvider.FLUTTERWAVE,
      email: request.email,
      name: request.name,
      phone: request.phone,
      metadata: request.metadata,
      createdAt: new Date(),
    };
  }

  async getCustomer(providerCustomerId: string): Promise<PaymentCustomer | null> {
    return null;
  }

  async updateCustomer(
    providerCustomerId: string,
    updates: Partial<CreateCustomerRequest>
  ): Promise<PaymentCustomer> {
    throw new PaymentError(
      'Flutterwave does not support customer updates',
      'NOT_SUPPORTED',
      this.provider
    );
  }

  async deleteCustomer(providerCustomerId: string): Promise<void> {
    // No-op
  }

  // ============================================
  // PAYMENT METHOD MANAGEMENT
  // ============================================

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethod> {
    throw new PaymentError(
      'Flutterwave payment methods are managed through checkout',
      'NOT_SUPPORTED',
      this.provider
    );
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    throw new PaymentError('Not supported', 'NOT_SUPPORTED', this.provider);
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    return [];
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    throw new PaymentError('Not supported', 'NOT_SUPPORTED', this.provider);
  }

  async getPaymentMethod(paymentMethodId: string): Promise<PaymentMethod | null> {
    return null;
  }

  // ============================================
  // PAYMENT INTENTS / STANDARD PAYMENTS
  // ============================================

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    this.ensureConfigured();
    this.validateRequired(request, ['userId', 'amount', 'currency']);
    this.validateAmount(request.amount, request.currency);

    const txRef = this.generateTxRef();

    try {
      const paymentData = {
        tx_ref: txRef,
        amount: request.amount,
        currency: this.formatCurrency(request.currency),
        redirect_url: request.metadata?.redirectUrl || 'https://app.flamoral.com/payment/callback',
        customer: {
          email: request.metadata?.email || 'customer@example.com',
          name: request.metadata?.name,
          phonenumber: request.metadata?.phone,
        },
        customizations: {
          title: 'Flamoral',
          description: request.description || 'Payment',
          logo: 'https://app.flamoral.com/logo.png',
        },
        meta: {
          userId: request.userId,
          ...request.metadata,
        },
      };

      const response = await this.makeRequest<any>('post', '/payments', paymentData);

      this.log('info', 'Flutterwave payment initiated', {
        txRef,
        userId: request.userId,
        amount: request.amount,
      });

      return {
        id: txRef,
        providerIntentId: txRef,
        provider: PaymentProvider.FLUTTERWAVE,
        amount: request.amount,
        currency: request.currency.toUpperCase(),
        status: TransactionStatus.PENDING,
        clientSecret: txRef,
        description: request.description,
        metadata: request.metadata,
        requiresAction: true,
        nextActionUrl: response.data?.link,
        createdAt: new Date(),
      };
    } catch (error: any) {
      this.handleError(error, 'Create Flutterwave payment');
    }
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    // Verification is done via the transaction ID returned after redirect
    return this.verifyTransaction(paymentIntentId);
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    return {
      id: paymentIntentId,
      providerIntentId: paymentIntentId,
      provider: PaymentProvider.FLUTTERWAVE,
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

  async verifyTransaction(transactionId: string): Promise<PaymentIntent> {
    this.ensureConfigured();

    try {
      const response = await this.makeRequest<any>('get', `/transactions/${transactionId}/verify`);
      const data = response.data;

      return {
        id: data.tx_ref,
        providerIntentId: data.id.toString(),
        provider: PaymentProvider.FLUTTERWAVE,
        amount: data.amount,
        currency: data.currency,
        status: this.mapTransactionStatus(data.status),
        metadata: data.meta,
        createdAt: new Date(data.created_at),
      };
    } catch (error: any) {
      this.handleError(error, 'Verify Flutterwave transaction');
    }
  }

  // ============================================
  // MOBILE MONEY PAYMENTS
  // ============================================

  async initializeMobileMoneyPayment(options: MobileMoneyOptions): Promise<MobileMoneyPayment> {
    this.ensureConfigured();
    this.validateRequired(options, ['userId', 'amount', 'currency', 'email', 'phone', 'country']);

    const txRef = this.generateTxRef();

    try {
      // Determine network from phone number or explicit parameter
      const network = options.network || this.detectMobileNetwork(options.phone, options.country);

      const paymentData: any = {
        tx_ref: txRef,
        amount: options.amount,
        currency: this.formatCurrency(options.currency),
        email: options.email,
        phone_number: options.phone,
        meta: {
          userId: options.userId,
          ...options.metadata,
        },
      };

      let endpoint = '/charges';
      let paymentType = 'mobile_money_ghana'; // Default

      // Country-specific mobile money configurations
      switch (options.country.toUpperCase()) {
        case 'GH':
          paymentType = 'mobile_money_ghana';
          paymentData.network = network;
          break;
        case 'UG':
          paymentType = 'mobile_money_uganda';
          paymentData.network = network;
          break;
        case 'RW':
          paymentType = 'mobile_money_rwanda';
          break;
        case 'ZM':
          paymentType = 'mobile_money_zambia';
          paymentData.network = network;
          break;
        case 'KE':
          // M-Pesa
          paymentType = 'mpesa';
          break;
        case 'TZ':
          paymentType = 'mobile_money_tanzania';
          paymentData.network = network;
          break;
        case 'NG':
          // Nigeria uses USSD or bank transfer more commonly
          paymentType = 'ussd';
          paymentData.account_bank = '044'; // Default bank code
          break;
        default:
          paymentType = 'mobile_money_franco';
      }

      paymentData.type = paymentType;

      const response = await this.makeRequest<any>('post', endpoint, paymentData);

      this.log('info', 'Mobile money payment initiated', {
        txRef,
        country: options.country,
        network,
      });

      return {
        reference: txRef,
        providerReference: response.data?.flw_ref || txRef,
        status: TransactionStatus.PENDING,
        amount: options.amount,
        currency: options.currency,
        phone: options.phone,
        network,
        authorizationUrl: response.data?.meta?.authorization?.redirect,
        ussdCode: response.data?.meta?.authorization?.note,
        message: response.data?.processor_response || 'Payment initiated',
      };
    } catch (error: any) {
      this.handleError(error, 'Initialize mobile money payment');
    }
  }

  async getMobileMoneyPaymentStatus(reference: string): Promise<MobileMoneyPayment> {
    const intent = await this.verifyTransaction(reference);

    return {
      reference: intent.id,
      providerReference: intent.providerIntentId,
      status: intent.status,
      amount: intent.amount,
      currency: intent.currency,
      phone: '',
      message: 'Payment status retrieved',
    };
  }

  async verifyMobileMoneyPayment(reference: string): Promise<MobileMoneyPayment> {
    return this.getMobileMoneyPaymentStatus(reference);
  }

  private detectMobileNetwork(phone: string, country: string): string {
    // Basic network detection based on phone prefix
    const cleanPhone = phone.replace(/\D/g, '');

    const networkMappings: Record<string, Record<string, string>> = {
      GH: {
        '024': 'MTN',
        '054': 'MTN',
        '055': 'MTN',
        '059': 'MTN',
        '020': 'VODAFONE',
        '050': 'VODAFONE',
        '026': 'AIRTELTIGO',
        '056': 'AIRTELTIGO',
        '027': 'AIRTELTIGO',
        '057': 'AIRTELTIGO',
      },
      UG: {
        '077': 'MTN',
        '078': 'MTN',
        '039': 'MTN',
        '075': 'AIRTEL',
        '070': 'AIRTEL',
      },
      KE: {
        '07': 'MPESA',
        '01': 'MPESA',
      },
    };

    const countryMappings = networkMappings[country.toUpperCase()];
    if (countryMappings) {
      for (const [prefix, network] of Object.entries(countryMappings)) {
        if (cleanPhone.startsWith(prefix) || cleanPhone.substring(3).startsWith(prefix)) {
          return network;
        }
      }
    }

    return 'MTN'; // Default
  }

  // ============================================
  // BANK TRANSFER PAYMENTS
  // ============================================

  async createVirtualAccount(userId: string, email: string): Promise<VirtualAccount> {
    this.ensureConfigured();

    try {
      const response = await this.makeRequest<any>('post', '/virtual-account-numbers', {
        email,
        is_permanent: true,
        bvn: '', // Would need BVN for Nigeria
        tx_ref: `VA_${userId}_${Date.now()}`,
        narration: `Flamoral - ${userId}`,
      });

      const data = response.data;

      return {
        id: data.order_ref,
        accountNumber: data.account_number,
        accountName: data.account_name,
        bankName: data.bank_name,
        bankCode: data.bank_name, // Use bank name as code
        currency: 'NGN',
        isActive: true,
        expiresAt: data.expiry_date ? new Date(data.expiry_date) : undefined,
      };
    } catch (error: any) {
      this.handleError(error, 'Create virtual account');
    }
  }

  async getVirtualAccount(accountId: string): Promise<VirtualAccount | null> {
    this.ensureConfigured();

    try {
      const response = await this.makeRequest<any>('get', `/virtual-account-numbers/${accountId}`);
      const data = response.data;

      return {
        id: data.order_ref,
        accountNumber: data.account_number,
        accountName: data.account_name,
        bankName: data.bank_name,
        bankCode: data.bank_name,
        currency: 'NGN',
        isActive: data.status === 'active',
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      this.handleError(error, 'Get virtual account');
    }
  }

  async initializeBankTransfer(options: BankTransferOptions): Promise<BankTransferPayment> {
    this.ensureConfigured();

    const txRef = this.generateTxRef();

    try {
      const response = await this.makeRequest<any>('post', '/charges?type=bank_transfer', {
        tx_ref: txRef,
        amount: options.amount,
        currency: this.formatCurrency(options.currency),
        email: options.email,
        meta: {
          userId: options.userId,
          ...options.metadata,
        },
      });

      const data = response.data;
      const transfer = data.meta?.authorization;

      return {
        reference: txRef,
        accountNumber: transfer?.transfer_account || '',
        accountName: transfer?.transfer_note || 'Flamoral',
        bankName: transfer?.transfer_bank || 'Flutterwave',
        amount: options.amount,
        currency: options.currency,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        status: TransactionStatus.PENDING,
      };
    } catch (error: any) {
      this.handleError(error, 'Initialize bank transfer');
    }
  }

  // ============================================
  // USSD PAYMENTS (Nigeria)
  // ============================================

  async initializeUSSDPayment(options: {
    userId: string;
    amount: number;
    email: string;
    phone: string;
    bankCode: string;
  }): Promise<{ reference: string; ussdCode: string }> {
    this.ensureConfigured();

    const txRef = this.generateTxRef();

    try {
      const response = await this.makeRequest<any>('post', '/charges?type=ussd', {
        tx_ref: txRef,
        account_bank: options.bankCode,
        amount: options.amount,
        currency: 'NGN',
        email: options.email,
        phone_number: options.phone,
        meta: {
          userId: options.userId,
        },
      });

      return {
        reference: txRef,
        ussdCode: response.data?.meta?.authorization?.note || '',
      };
    } catch (error: any) {
      this.handleError(error, 'Initialize USSD payment');
    }
  }

  // ============================================
  // SUBSCRIPTIONS (PAYMENT PLANS)
  // ============================================

  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    this.ensureConfigured();
    this.validateRequired(request, ['userId', 'planId']);

    try {
      // For Flutterwave, we need to first create a payment link with the plan
      // and get the customer to subscribe through it
      const txRef = this.generateTxRef();

      const response = await this.makeRequest<any>('post', '/payment-plans', {
        amount: request.metadata?.amount || 19.99,
        name: request.metadata?.planName || 'Premium Subscription',
        interval: request.billingPeriod === BillingPeriod.YEARLY ? 'yearly' : 'monthly',
        currency: request.metadata?.currency || 'USD',
      });

      this.log('info', 'Flutterwave payment plan created', {
        planId: response.data.id,
        userId: request.userId,
      });

      return {
        id: response.data.id.toString(),
        userId: request.userId,
        providerSubscriptionId: response.data.id.toString(),
        provider: PaymentProvider.FLUTTERWAVE,
        planId: request.planId,
        tier: (request.metadata?.tier as SubscriptionTier) || SubscriptionTier.PREMIUM,
        status: SubscriptionStatus.INCOMPLETE,
        billingPeriod: request.billingPeriod || BillingPeriod.MONTHLY,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        metadata: request.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      this.handleError(error, 'Create Flutterwave subscription');
    }
  }

  async getSubscription(providerSubscriptionId: string): Promise<Subscription | null> {
    this.ensureConfigured();

    try {
      const response = await this.makeRequest<any>('get', `/payment-plans/${providerSubscriptionId}`);
      const data = response.data;

      return {
        id: data.id.toString(),
        userId: '',
        providerSubscriptionId: data.id.toString(),
        provider: PaymentProvider.FLUTTERWAVE,
        planId: data.id.toString(),
        tier: SubscriptionTier.PREMIUM,
        status: data.status === 'active' ? SubscriptionStatus.ACTIVE : SubscriptionStatus.CANCELED,
        billingPeriod: data.interval === 'yearly' ? BillingPeriod.YEARLY : BillingPeriod.MONTHLY,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      this.handleError(error, 'Get Flutterwave subscription');
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
      'Flutterwave subscriptions cannot be updated directly',
      'NOT_SUPPORTED',
      this.provider
    );
  }

  async cancelSubscription(request: CancelSubscriptionRequest): Promise<Subscription> {
    this.ensureConfigured();

    try {
      await this.makeRequest<any>('put', `/payment-plans/${request.subscriptionId}/cancel`);

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
      this.handleError(error, 'Cancel Flutterwave subscription');
    }
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<Subscription> {
    throw new PaymentError(
      'Flutterwave subscriptions cannot be reactivated',
      'NOT_SUPPORTED',
      this.provider
    );
  }

  // ============================================
  // REFUNDS
  // ============================================

  async createRefund(request: RefundRequest): Promise<Refund> {
    this.ensureConfigured();
    this.validateRequired(request, ['transactionId']);

    try {
      const refundData: any = {
        id: request.transactionId,
      };

      if (request.amount) {
        refundData.amount = request.amount;
      }

      const response = await this.makeRequest<any>('post', '/transactions/refund', refundData);
      const data = response.data;

      return {
        id: data.id?.toString() || request.transactionId,
        transactionId: request.transactionId,
        providerRefundId: data.id?.toString() || '',
        provider: PaymentProvider.FLUTTERWAVE,
        amount: data.amount_refunded || request.amount || 0,
        currency: data.currency || 'NGN',
        status: data.status === 'completed' ? 'succeeded' : 'pending',
        reason: request.reason,
        createdAt: new Date(),
      };
    } catch (error: any) {
      this.handleError(error, 'Create Flutterwave refund');
    }
  }

  async getRefund(refundId: string): Promise<Refund | null> {
    // Flutterwave refunds are tracked via the original transaction
    return null;
  }

  // ============================================
  // WEBHOOKS
  // ============================================

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    if (!this.webhookSecret) {
      this.log('warn', 'Webhook secret not configured');
      return false;
    }

    // Flutterwave uses a secret hash in the header
    return signature === this.webhookSecret;
  }

  parseWebhookEvent(payload: string | Buffer, signature: string): WebhookEvent | null {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString());

      return {
        id: `flw_${data.id || Date.now()}`,
        provider: PaymentProvider.FLUTTERWAVE,
        eventType: this.mapFlutterwaveEventType(data.event),
        eventId: data.id?.toString() || '',
        data: data.data,
        timestamp: new Date(),
        rawPayload: typeof payload === 'string' ? payload : payload.toString(),
      };
    } catch (error: any) {
      this.log('error', 'Failed to parse Flutterwave webhook', { error: error.message });
      return null;
    }
  }

  async processWebhookEvent(event: WebhookEvent): Promise<WebhookProcessingResult> {
    this.log('info', `Processing Flutterwave webhook: ${event.eventType}`, { eventId: event.eventId });

    return {
      success: true,
      eventId: event.eventId,
      eventType: event.eventType,
      message: `Flutterwave event ${event.eventType} received`,
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  getSupportedPaymentMethods(): PaymentMethodType[] {
    return [
      PaymentMethodType.CARD,
      PaymentMethodType.BANK_TRANSFER,
      PaymentMethodType.MOBILE_MONEY,
      PaymentMethodType.USSD,
    ];
  }

  getSupportedCurrencies(): string[] {
    return [
      'NGN', 'USD', 'EUR', 'GBP', 'GHS', 'KES', 'UGX', 'TZS', 'ZAR',
      'RWF', 'XAF', 'XOF', 'ZMW', 'MWK', 'SLL', 'GMD',
    ];
  }

  mapTransactionStatus(flwStatus: string): TransactionStatus {
    const statusMap: Record<string, TransactionStatus> = {
      successful: TransactionStatus.SUCCEEDED,
      completed: TransactionStatus.SUCCEEDED,
      failed: TransactionStatus.FAILED,
      pending: TransactionStatus.PENDING,
      cancelled: TransactionStatus.CANCELED,
    };
    return statusMap[flwStatus.toLowerCase()] || TransactionStatus.PENDING;
  }

  mapSubscriptionStatus(flwStatus: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      cancelled: SubscriptionStatus.CANCELED,
      inactive: SubscriptionStatus.INCOMPLETE,
    };
    return statusMap[flwStatus.toLowerCase()] || SubscriptionStatus.INCOMPLETE;
  }

  private mapFlutterwaveEventType(eventType: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      'charge.completed': WebhookEventType.PAYMENT_SUCCEEDED,
      'charge.failed': WebhookEventType.PAYMENT_FAILED,
      'transfer.completed': WebhookEventType.PAYMENT_SUCCEEDED,
      'transfer.failed': WebhookEventType.PAYMENT_FAILED,
      'subscription.activated': WebhookEventType.SUBSCRIPTION_CREATED,
      'subscription.cancelled': WebhookEventType.SUBSCRIPTION_CANCELED,
    };
    return eventMap[eventType?.toLowerCase()] || WebhookEventType.PAYMENT_CREATED;
  }

  // ============================================
  // BANKS LIST (for USSD and transfers)
  // ============================================

  async getBanks(country: string = 'NG'): Promise<Array<{ code: string; name: string }>> {
    this.ensureConfigured();

    try {
      const response = await this.makeRequest<any>('get', `/banks/${country}`);
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
export const flutterwaveProvider = new FlutterwaveProvider();
