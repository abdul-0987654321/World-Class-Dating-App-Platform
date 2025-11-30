/**
 * Wise (TransferWise) Payment Provider
 * Implementation for international money transfers and payouts
 *
 * Wise API Documentation: https://api-docs.wise.com/
 *
 * Primary Use Cases:
 * - International payouts to creators/users
 * - Multi-currency balances
 * - Cross-border transfers with real exchange rates
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';
import { BasePaymentProvider } from './BaseProvider';
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
} from '../types';

interface WiseConfig {
  apiToken: string;
  profileId: string;
  environment: 'sandbox' | 'production';
  webhookPublicKey?: string;
}

interface WiseQuote {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
  targetAmount: number;
  rate: number;
  fee: number;
  expirationTime: string;
}

interface WiseRecipient {
  id: string;
  accountHolderName: string;
  currency: string;
  country: string;
  type: string;
  details: Record<string, any>;
}

interface WiseTransfer {
  id: string;
  reference: string;
  status: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceValue: number;
  targetValue: number;
  rate: number;
  created: string;
  customerTransactionId?: string;
  targetAccount: number;
}

interface WiseBalance {
  id: string;
  currency: string;
  amount: {
    value: number;
    currency: string;
  };
  reservedAmount?: {
    value: number;
    currency: string;
  };
}

export class WiseProvider extends BasePaymentProvider {
  readonly provider = PaymentProvider.WISE;
  private client: AxiosInstance | null = null;
  private config: WiseConfig | null = null;

  // ============================================
  // INITIALIZATION
  // ============================================

  async initialize(): Promise<void> {
    const apiToken = process.env.WISE_API_TOKEN;
    const profileId = process.env.WISE_PROFILE_ID;
    const environment = (process.env.WISE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';
    const webhookPublicKey = process.env.WISE_PUBLIC_KEY;

    if (!apiToken || !profileId) {
      this.log('warn', 'Wise credentials not configured');
      this._isConfigured = false;
      return;
    }

    try {
      this.config = {
        apiToken,
        profileId,
        environment,
        webhookPublicKey,
      };

      const baseURL = environment === 'production'
        ? 'https://api.wise.com'
        : 'https://api.sandbox.wise.com';

      this.client = axios.create({
        baseURL,
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Verify connection by getting profile
      const response = await this.client.get(`/v1/profiles/${profileId}`);
      if (!response.data) {
        throw new Error('Invalid profile');
      }

      this._isConfigured = true;
      this.log('info', 'Wise provider initialized successfully', {
        profileId,
        environment,
        profileType: response.data.type,
      });
    } catch (error: any) {
      this.log('error', 'Failed to initialize Wise', { error: error.message });
      this._isConfigured = false;
    }
  }

  getProfileId(): string | null {
    return this.config?.profileId || null;
  }

  // ============================================
  // QUOTES (Exchange Rate)
  // ============================================

  /**
   * Create a quote for currency exchange
   */
  async createQuote(params: {
    sourceCurrency: string;
    targetCurrency: string;
    sourceAmount?: number;
    targetAmount?: number;
  }): Promise<WiseQuote> {
    this.ensureConfigured();

    try {
      const { sourceCurrency, targetCurrency, sourceAmount, targetAmount } = params;

      const response = await this.client!.post('/v3/quotes', {
        sourceCurrency,
        targetCurrency,
        sourceAmount,
        targetAmount,
        profile: this.config!.profileId,
        payOut: 'BALANCE',
      });

      const quote = response.data;

      this.log('info', 'Quote created', {
        quoteId: quote.id,
        rate: quote.rate,
        fee: quote.paymentOptions?.[0]?.fee?.total,
      });

      return {
        id: quote.id,
        sourceCurrency: quote.sourceCurrency,
        targetCurrency: quote.targetCurrency,
        sourceAmount: quote.sourceAmount,
        targetAmount: quote.targetAmount,
        rate: quote.rate,
        fee: quote.paymentOptions?.[0]?.fee?.total || 0,
        expirationTime: quote.expirationTime,
      };
    } catch (error: any) {
      this.handleWiseError(error, 'Create quote');
    }
  }

  /**
   * Get a quote by ID
   */
  async getQuote(quoteId: string): Promise<WiseQuote | null> {
    this.ensureConfigured();

    try {
      const response = await this.client!.get(`/v3/quotes/${quoteId}`);
      const quote = response.data;

      return {
        id: quote.id,
        sourceCurrency: quote.sourceCurrency,
        targetCurrency: quote.targetCurrency,
        sourceAmount: quote.sourceAmount,
        targetAmount: quote.targetAmount,
        rate: quote.rate,
        fee: quote.paymentOptions?.[0]?.fee?.total || 0,
        expirationTime: quote.expirationTime,
      };
    } catch (error: any) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      this.handleWiseError(error, 'Get quote');
    }
  }

  // ============================================
  // RECIPIENTS (Payout Destinations)
  // ============================================

  /**
   * Create a recipient for payouts
   */
  async createRecipient(params: {
    currency: string;
    type: string;
    accountHolderName: string;
    details: Record<string, any>;
  }): Promise<WiseRecipient> {
    this.ensureConfigured();

    try {
      const response = await this.client!.post('/v1/accounts', {
        currency: params.currency,
        type: params.type,
        profile: this.config!.profileId,
        accountHolderName: params.accountHolderName,
        details: params.details,
      });

      const recipient = response.data;

      this.log('info', 'Recipient created', {
        recipientId: recipient.id,
        currency: params.currency,
      });

      return {
        id: String(recipient.id),
        accountHolderName: recipient.accountHolderName,
        currency: recipient.currency,
        country: recipient.country,
        type: recipient.type,
        details: recipient.details,
      };
    } catch (error: any) {
      this.handleWiseError(error, 'Create recipient');
    }
  }

  /**
   * Get recipient by ID
   */
  async getRecipient(recipientId: string): Promise<WiseRecipient | null> {
    this.ensureConfigured();

    try {
      const response = await this.client!.get(`/v1/accounts/${recipientId}`);
      const recipient = response.data;

      return {
        id: String(recipient.id),
        accountHolderName: recipient.accountHolderName,
        currency: recipient.currency,
        country: recipient.country,
        type: recipient.type,
        details: recipient.details,
      };
    } catch (error: any) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      this.handleWiseError(error, 'Get recipient');
    }
  }

  /**
   * List recipients for the profile
   */
  async listRecipients(currency?: string): Promise<WiseRecipient[]> {
    this.ensureConfigured();

    try {
      const params: any = { profile: this.config!.profileId };
      if (currency) {
        params.currency = currency;
      }

      const response = await this.client!.get('/v1/accounts', { params });

      return response.data.map((r: any) => ({
        id: String(r.id),
        accountHolderName: r.accountHolderName,
        currency: r.currency,
        country: r.country,
        type: r.type,
        details: r.details,
      }));
    } catch (error: any) {
      this.handleWiseError(error, 'List recipients');
    }
  }

  /**
   * Delete a recipient
   */
  async deleteRecipient(recipientId: string): Promise<void> {
    this.ensureConfigured();

    try {
      await this.client!.delete(`/v1/accounts/${recipientId}`);
      this.log('info', 'Recipient deleted', { recipientId });
    } catch (error: any) {
      if (!this.isNotFoundError(error)) {
        this.handleWiseError(error, 'Delete recipient');
      }
    }
  }

  // ============================================
  // TRANSFERS (Payouts)
  // ============================================

  /**
   * Create a transfer (payout)
   */
  async createTransfer(params: {
    quoteId: string;
    recipientId: string;
    reference?: string;
    customerTransactionId?: string;
  }): Promise<WiseTransfer> {
    this.ensureConfigured();

    try {
      const response = await this.client!.post('/v1/transfers', {
        targetAccount: parseInt(params.recipientId),
        quoteUuid: params.quoteId,
        customerTransactionId: params.customerTransactionId || crypto.randomUUID(),
        details: {
          reference: params.reference || 'Payment',
        },
      });

      const transfer = response.data;

      this.log('info', 'Transfer created', {
        transferId: transfer.id,
        status: transfer.status,
      });

      return {
        id: String(transfer.id),
        reference: transfer.reference,
        status: transfer.status,
        sourceCurrency: transfer.sourceCurrency,
        targetCurrency: transfer.targetCurrency,
        sourceValue: transfer.sourceValue,
        targetValue: transfer.targetValue,
        rate: transfer.rate,
        created: transfer.created,
        customerTransactionId: transfer.customerTransactionId,
        targetAccount: transfer.targetAccount,
      };
    } catch (error: any) {
      this.handleWiseError(error, 'Create transfer');
    }
  }

  /**
   * Fund a transfer from balance
   */
  async fundTransfer(transferId: string): Promise<WiseTransfer> {
    this.ensureConfigured();

    try {
      const response = await this.client!.post(
        `/v3/profiles/${this.config!.profileId}/transfers/${transferId}/payments`,
        {
          type: 'BALANCE',
        }
      );

      this.log('info', 'Transfer funded', { transferId, status: response.data.status });

      return this.getTransfer(transferId) as Promise<WiseTransfer>;
    } catch (error: any) {
      this.handleWiseError(error, 'Fund transfer');
    }
  }

  /**
   * Get transfer by ID
   */
  async getTransfer(transferId: string): Promise<WiseTransfer | null> {
    this.ensureConfigured();

    try {
      const response = await this.client!.get(`/v1/transfers/${transferId}`);
      const transfer = response.data;

      return {
        id: String(transfer.id),
        reference: transfer.reference,
        status: transfer.status,
        sourceCurrency: transfer.sourceCurrency,
        targetCurrency: transfer.targetCurrency,
        sourceValue: transfer.sourceValue,
        targetValue: transfer.targetValue,
        rate: transfer.rate,
        created: transfer.created,
        customerTransactionId: transfer.customerTransactionId,
        targetAccount: transfer.targetAccount,
      };
    } catch (error: any) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      this.handleWiseError(error, 'Get transfer');
    }
  }

  /**
   * Cancel a transfer
   */
  async cancelTransfer(transferId: string): Promise<WiseTransfer> {
    this.ensureConfigured();

    try {
      const response = await this.client!.put(`/v1/transfers/${transferId}/cancel`);
      const transfer = response.data;

      this.log('info', 'Transfer canceled', { transferId });

      return {
        id: String(transfer.id),
        reference: transfer.reference,
        status: transfer.status,
        sourceCurrency: transfer.sourceCurrency,
        targetCurrency: transfer.targetCurrency,
        sourceValue: transfer.sourceValue,
        targetValue: transfer.targetValue,
        rate: transfer.rate,
        created: transfer.created,
        customerTransactionId: transfer.customerTransactionId,
        targetAccount: transfer.targetAccount,
      };
    } catch (error: any) {
      this.handleWiseError(error, 'Cancel transfer');
    }
  }

  /**
   * List transfers
   */
  async listTransfers(params?: {
    status?: string;
    createdDateStart?: Date;
    createdDateEnd?: Date;
    limit?: number;
    offset?: number;
  }): Promise<WiseTransfer[]> {
    this.ensureConfigured();

    try {
      const queryParams: any = { profile: this.config!.profileId };

      if (params?.status) queryParams.status = params.status;
      if (params?.createdDateStart) queryParams.createdDateStart = params.createdDateStart.toISOString();
      if (params?.createdDateEnd) queryParams.createdDateEnd = params.createdDateEnd.toISOString();
      if (params?.limit) queryParams.limit = params.limit;
      if (params?.offset) queryParams.offset = params.offset;

      const response = await this.client!.get('/v1/transfers', { params: queryParams });

      return response.data.map((t: any) => ({
        id: String(t.id),
        reference: t.reference,
        status: t.status,
        sourceCurrency: t.sourceCurrency,
        targetCurrency: t.targetCurrency,
        sourceValue: t.sourceValue,
        targetValue: t.targetValue,
        rate: t.rate,
        created: t.created,
        customerTransactionId: t.customerTransactionId,
        targetAccount: t.targetAccount,
      }));
    } catch (error: any) {
      this.handleWiseError(error, 'List transfers');
    }
  }

  // ============================================
  // BALANCES
  // ============================================

  /**
   * Get all balances for the profile
   */
  async getBalances(): Promise<WiseBalance[]> {
    this.ensureConfigured();

    try {
      const response = await this.client!.get(`/v4/profiles/${this.config!.profileId}/balances?types=STANDARD`);

      return response.data.map((b: any) => ({
        id: String(b.id),
        currency: b.currency,
        amount: {
          value: b.amount.value,
          currency: b.amount.currency,
        },
        reservedAmount: b.reservedAmount ? {
          value: b.reservedAmount.value,
          currency: b.reservedAmount.currency,
        } : undefined,
      }));
    } catch (error: any) {
      this.handleWiseError(error, 'Get balances');
    }
  }

  /**
   * Get balance for specific currency
   */
  async getBalance(currency: string): Promise<WiseBalance | null> {
    const balances = await this.getBalances();
    return balances.find(b => b.currency === currency) || null;
  }

  // ============================================
  // REQUIRED INTERFACE METHODS
  // (Wise is primarily for payouts, not incoming payments)
  // ============================================

  async createCustomer(request: CreateCustomerRequest): Promise<PaymentCustomer> {
    // Wise uses recipients, not customers
    return {
      id: request.userId,
      providerCustomerId: `wise_${request.userId}`,
      provider: this.provider,
      email: request.email,
      name: request.name,
      phone: request.phone,
      metadata: request.metadata,
      createdAt: new Date(),
    };
  }

  async getCustomer(providerCustomerId: string): Promise<PaymentCustomer | null> {
    return null; // Wise doesn't have customer concept
  }

  async updateCustomer(
    providerCustomerId: string,
    updates: Partial<CreateCustomerRequest>
  ): Promise<PaymentCustomer> {
    return {
      id: providerCustomerId.replace('wise_', ''),
      providerCustomerId,
      provider: this.provider,
      email: updates.email || '',
      name: updates.name,
      createdAt: new Date(),
    };
  }

  async deleteCustomer(providerCustomerId: string): Promise<void> {
    // No-op for Wise
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethod> {
    throw new PaymentProviderError(
      'Wise does not support payment method attachment',
      this.provider,
      'NOT_SUPPORTED'
    );
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    throw new PaymentProviderError(
      'Wise does not support payment method detachment',
      this.provider,
      'NOT_SUPPORTED'
    );
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    return []; // Wise doesn't have payment methods for incoming payments
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    // No-op
  }

  async getPaymentMethod(paymentMethodId: string): Promise<PaymentMethod | null> {
    return null;
  }

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    throw new PaymentProviderError(
      'Wise does not support incoming payments. Use createQuote and createTransfer for payouts.',
      this.provider,
      'NOT_SUPPORTED'
    );
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    throw new PaymentProviderError(
      'Wise does not support payment intents',
      this.provider,
      'NOT_SUPPORTED'
    );
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    throw new PaymentProviderError(
      'Wise does not support payment intents',
      this.provider,
      'NOT_SUPPORTED'
    );
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null> {
    return null;
  }

  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    throw new PaymentProviderError(
      'Wise does not support subscriptions',
      this.provider,
      'NOT_SUPPORTED'
    );
  }

  async getSubscription(providerSubscriptionId: string): Promise<Subscription | null> {
    return null;
  }

  async updateSubscription(
    providerSubscriptionId: string,
    updates: any
  ): Promise<Subscription> {
    throw new PaymentProviderError(
      'Wise does not support subscriptions',
      this.provider,
      'NOT_SUPPORTED'
    );
  }

  async cancelSubscription(request: CancelSubscriptionRequest): Promise<Subscription> {
    throw new PaymentProviderError(
      'Wise does not support subscriptions',
      this.provider,
      'NOT_SUPPORTED'
    );
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<Subscription> {
    throw new PaymentProviderError(
      'Wise does not support subscriptions',
      this.provider,
      'NOT_SUPPORTED'
    );
  }

  async createRefund(request: RefundRequest): Promise<Refund> {
    throw new PaymentProviderError(
      'Wise does not support refunds. Cancel the transfer instead.',
      this.provider,
      'NOT_SUPPORTED'
    );
  }

  async getRefund(refundId: string): Promise<Refund | null> {
    return null;
  }

  // ============================================
  // WEBHOOKS
  // ============================================

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    if (!this.config?.webhookPublicKey) {
      this.log('warn', 'Webhook public key not configured');
      return false;
    }

    try {
      const payloadString = typeof payload === 'string' ? payload : payload.toString();

      // Wise uses RSA signature verification
      const verifier = crypto.createVerify('SHA256');
      verifier.update(payloadString);

      return verifier.verify(
        this.config.webhookPublicKey,
        signature,
        'base64'
      );
    } catch (error) {
      return false;
    }
  }

  parseWebhookEvent(payload: string | Buffer, signature: string): WebhookEvent | null {
    try {
      const payloadString = typeof payload === 'string' ? payload : payload.toString();
      const event = JSON.parse(payloadString);

      return {
        id: `wise_${event.data?.resource?.id}_${event.event_type}`,
        provider: this.provider,
        eventType: this.mapWiseEventType(event.event_type),
        eventId: event.data?.resource?.id || crypto.randomUUID(),
        data: event.data,
        timestamp: new Date(event.sent_at),
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
    return [PaymentMethodType.BANK_ACCOUNT];
  }

  getSupportedCurrencies(): string[] {
    return [
      'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'SGD', 'HKD', 'JPY', 'CHF',
      'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'INR', 'PHP',
      'THB', 'MYR', 'IDR', 'BRL', 'MXN', 'ZAR', 'TRY', 'AED', 'ILS', 'NGN',
      'KES', 'GHS', 'UGX', 'TZS',
    ];
  }

  mapTransactionStatus(wiseStatus: string): TransactionStatus {
    const statusMap: Record<string, TransactionStatus> = {
      incoming_payment_waiting: TransactionStatus.PENDING,
      incoming_payment_initiated: TransactionStatus.PROCESSING,
      processing: TransactionStatus.PROCESSING,
      funds_converted: TransactionStatus.PROCESSING,
      outgoing_payment_sent: TransactionStatus.SUCCEEDED,
      completed: TransactionStatus.SUCCEEDED,
      cancelled: TransactionStatus.CANCELED,
      funds_refunded: TransactionStatus.REFUNDED,
      bounced_back: TransactionStatus.FAILED,
      charged_back: TransactionStatus.DISPUTED,
    };
    return statusMap[wiseStatus] || TransactionStatus.PENDING;
  }

  mapSubscriptionStatus(status: string): SubscriptionStatus {
    return SubscriptionStatus.ACTIVE; // Wise doesn't have subscriptions
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private isNotFoundError(error: any): boolean {
    return error.response?.status === 404;
  }

  private handleWiseError(error: any, operation: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      const errorMessage = axiosError.response?.data?.message
        || axiosError.response?.data?.errors?.[0]?.message
        || axiosError.message;
      const errorCode = axiosError.response?.data?.errors?.[0]?.code || 'UNKNOWN_ERROR';

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

  private mapWiseEventType(eventType: string): WebhookEventType {
    const eventMap: Record<string, WebhookEventType> = {
      'transfers#state-change': WebhookEventType.PAYMENT_SUCCEEDED,
      'transfers#active-cases': WebhookEventType.PAYMENT_DISPUTED,
      'balances#credit': WebhookEventType.PAYMENT_SUCCEEDED,
      'balances#update': WebhookEventType.PAYMENT_SUCCEEDED,
    };
    return eventMap[eventType] || WebhookEventType.PAYMENT_CREATED;
  }
}

// Export singleton instance
export const wiseProvider = new WiseProvider();
