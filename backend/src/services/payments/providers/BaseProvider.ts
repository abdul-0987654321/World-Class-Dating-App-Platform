/**
 * Base Payment Provider
 * Abstract base class with common functionality for all payment providers
 */

import {
  IPaymentProvider,
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
  PaymentMethodType,
  BillingPeriod,
  PaymentError,
  PaymentProviderError,
} from '../types';
import { logger } from '../../../utils/logger';

/**
 * Abstract base class for payment providers
 * Implements common functionality and enforces interface contract
 */
export abstract class BasePaymentProvider implements IPaymentProvider {
  abstract readonly provider: PaymentProvider;
  protected _isConfigured: boolean = false;

  get isConfigured(): boolean {
    return this._isConfigured;
  }

  // ============================================
  // ABSTRACT METHODS - Must be implemented by subclasses
  // ============================================

  abstract initialize(): Promise<void>;

  abstract createCustomer(request: CreateCustomerRequest): Promise<PaymentCustomer>;
  abstract getCustomer(providerCustomerId: string): Promise<PaymentCustomer | null>;
  abstract updateCustomer(
    providerCustomerId: string,
    updates: Partial<CreateCustomerRequest>
  ): Promise<PaymentCustomer>;
  abstract deleteCustomer(providerCustomerId: string): Promise<void>;

  abstract attachPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<PaymentMethod>;
  abstract detachPaymentMethod(paymentMethodId: string): Promise<void>;
  abstract listPaymentMethods(customerId: string): Promise<PaymentMethod[]>;
  abstract setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<void>;
  abstract getPaymentMethod(paymentMethodId: string): Promise<PaymentMethod | null>;

  abstract createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent>;
  abstract confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntent>;
  abstract cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntent>;
  abstract getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null>;

  abstract createSubscription(request: CreateSubscriptionRequest): Promise<Subscription>;
  abstract getSubscription(providerSubscriptionId: string): Promise<Subscription | null>;
  abstract updateSubscription(
    providerSubscriptionId: string,
    updates: {
      planId?: string;
      billingPeriod?: BillingPeriod;
      paymentMethodId?: string;
      cancelAtPeriodEnd?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<Subscription>;
  abstract cancelSubscription(request: CancelSubscriptionRequest): Promise<Subscription>;
  abstract reactivateSubscription(providerSubscriptionId: string): Promise<Subscription>;

  abstract createRefund(request: RefundRequest): Promise<Refund>;
  abstract getRefund(refundId: string): Promise<Refund | null>;

  abstract verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
  abstract parseWebhookEvent(payload: string | Buffer, signature: string): WebhookEvent | null;
  abstract processWebhookEvent(event: WebhookEvent): Promise<WebhookProcessingResult>;

  abstract getSupportedPaymentMethods(): PaymentMethodType[];
  abstract getSupportedCurrencies(): string[];
  abstract mapTransactionStatus(providerStatus: string): TransactionStatus;
  abstract mapSubscriptionStatus(providerStatus: string): SubscriptionStatus;

  // ============================================
  // COMMON IMPLEMENTATIONS
  // ============================================

  /**
   * Check if configuration is valid before operations
   */
  protected ensureConfigured(): void {
    if (!this._isConfigured) {
      throw new PaymentProviderError(
        `${this.provider} provider is not configured`,
        this.provider,
        'NOT_CONFIGURED'
      );
    }
  }

  /**
   * Default currency conversion (cents to dollars)
   * Override in provider if different format is needed
   */
  convertToProviderAmount(amount: number, currency: string): number {
    // Most providers use cents for USD, EUR, etc.
    const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'KMF', 'PYG', 'RWF', 'UGX', 'VUV', 'XAF', 'XOF', 'XPF'];
    if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
      return Math.round(amount);
    }
    return Math.round(amount * 100);
  }

  /**
   * Default currency conversion (cents to dollars)
   */
  convertFromProviderAmount(amount: number, currency: string): number {
    const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'KMF', 'PYG', 'RWF', 'UGX', 'VUV', 'XAF', 'XOF', 'XPF'];
    if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
      return amount;
    }
    return amount / 100;
  }

  /**
   * Check if a currency is supported
   */
  isCurrencySupported(currency: string): boolean {
    return this.getSupportedCurrencies().includes(currency.toUpperCase());
  }

  /**
   * Log provider operation
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logMessage = `[${this.provider}] ${message}`;
    if (data) {
      logger[level](logMessage, data);
    } else {
      logger[level](logMessage);
    }
  }

  /**
   * Handle provider errors consistently
   */
  protected handleError(error: any, operation: string): never {
    this.log('error', `${operation} failed`, { error: error.message || error });

    if (error instanceof PaymentError) {
      throw error;
    }

    throw new PaymentProviderError(
      `${operation} failed: ${error.message || 'Unknown error'}`,
      this.provider,
      error.code,
      error
    );
  }

  /**
   * Validate required fields
   */
  protected validateRequired(data: Record<string, any>, fields: string[]): void {
    const missing = fields.filter(field => {
      const value = data[field];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      throw new PaymentError(
        `Missing required fields: ${missing.join(', ')}`,
        'VALIDATION_ERROR',
        this.provider
      );
    }
  }

  /**
   * Generate a unique idempotency key
   */
  protected generateIdempotencyKey(prefix: string, ...parts: string[]): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${parts.join('_')}_${timestamp}_${random}`;
  }

  /**
   * Retry an operation with exponential backoff
   */
  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Don't retry on validation errors or not found
        if (
          error.code === 'VALIDATION_ERROR' ||
          error.code === 'NOT_FOUND' ||
          error.code === 'INSUFFICIENT_BALANCE'
        ) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          this.log('warn', `Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
            error: error.message,
          });
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sanitize metadata before sending to provider
   */
  protected sanitizeMetadata(metadata?: Record<string, any>): Record<string, string> {
    if (!metadata) return {};

    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined && value !== null) {
        // Convert to string and limit length (most providers have limits)
        sanitized[key] = String(value).substring(0, 500);
      }
    }
    return sanitized;
  }

  /**
   * Format currency code
   */
  protected formatCurrency(currency: string): string {
    return currency.toUpperCase();
  }

  /**
   * Validate amount
   */
  protected validateAmount(amount: number, currency: string): void {
    if (amount <= 0) {
      throw new PaymentError('Amount must be greater than zero', 'VALIDATION_ERROR', this.provider);
    }

    // Check minimum amounts for common currencies
    const minimums: Record<string, number> = {
      USD: 0.50,
      EUR: 0.50,
      GBP: 0.30,
      JPY: 50,
    };

    const minimum = minimums[currency.toUpperCase()] || 0.01;
    if (amount < minimum) {
      throw new PaymentError(
        `Amount must be at least ${minimum} ${currency}`,
        'VALIDATION_ERROR',
        this.provider
      );
    }
  }

  // ============================================
  // OPTIONAL METHODS - Override if supported
  // ============================================

  async pauseSubscription?(providerSubscriptionId: string): Promise<Subscription> {
    throw new PaymentError(
      `Subscription pause is not supported by ${this.provider}`,
      'NOT_SUPPORTED',
      this.provider
    );
  }

  async resumeSubscription?(providerSubscriptionId: string): Promise<Subscription> {
    throw new PaymentError(
      `Subscription resume is not supported by ${this.provider}`,
      'NOT_SUPPORTED',
      this.provider
    );
  }
}

/**
 * Mixin for providers that support checkout sessions
 */
export abstract class CheckoutSessionMixin extends BasePaymentProvider {
  abstract createCheckoutSession(options: CheckoutSessionOptions): Promise<CheckoutSession>;
  abstract getCheckoutSession(sessionId: string): Promise<CheckoutSession | null>;
}
