/**
 * Payment Provider Interface
 * Abstract interface that all payment providers must implement
 * Enables seamless switching between payment gateways
 */

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
} from '../types';

/**
 * Core Payment Provider Interface
 * All payment providers (Stripe, PayPal, etc.) must implement this interface
 */
export interface IPaymentProvider {
  /** Provider identifier */
  readonly provider: PaymentProvider;

  /** Whether the provider is configured and ready */
  readonly isConfigured: boolean;

  /** Initialize the provider with configuration */
  initialize(): Promise<void>;

  // ============================================
  // CUSTOMER MANAGEMENT
  // ============================================

  /**
   * Create a new customer in the payment provider
   */
  createCustomer(request: CreateCustomerRequest): Promise<PaymentCustomer>;

  /**
   * Get customer by provider customer ID
   */
  getCustomer(providerCustomerId: string): Promise<PaymentCustomer | null>;

  /**
   * Update customer details
   */
  updateCustomer(
    providerCustomerId: string,
    updates: Partial<CreateCustomerRequest>
  ): Promise<PaymentCustomer>;

  /**
   * Delete a customer from the provider
   */
  deleteCustomer(providerCustomerId: string): Promise<void>;

  // ============================================
  // PAYMENT METHOD MANAGEMENT
  // ============================================

  /**
   * Attach a payment method to a customer
   */
  attachPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<PaymentMethod>;

  /**
   * Detach a payment method from a customer
   */
  detachPaymentMethod(paymentMethodId: string): Promise<void>;

  /**
   * List all payment methods for a customer
   */
  listPaymentMethods(customerId: string): Promise<PaymentMethod[]>;

  /**
   * Set a payment method as the default for a customer
   */
  setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<void>;

  /**
   * Get a specific payment method
   */
  getPaymentMethod(paymentMethodId: string): Promise<PaymentMethod | null>;

  // ============================================
  // PAYMENT INTENTS / ONE-TIME PAYMENTS
  // ============================================

  /**
   * Create a payment intent for a one-time payment
   */
  createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent>;

  /**
   * Confirm a payment intent (if requires confirmation)
   */
  confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntent>;

  /**
   * Cancel a payment intent
   */
  cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntent>;

  /**
   * Get payment intent status
   */
  getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null>;

  // ============================================
  // SUBSCRIPTIONS
  // ============================================

  /**
   * Create a subscription
   */
  createSubscription(request: CreateSubscriptionRequest): Promise<Subscription>;

  /**
   * Get subscription by provider subscription ID
   */
  getSubscription(providerSubscriptionId: string): Promise<Subscription | null>;

  /**
   * Update a subscription (change plan, billing cycle, etc.)
   */
  updateSubscription(
    providerSubscriptionId: string,
    updates: {
      planId?: string;
      billingPeriod?: BillingPeriod;
      paymentMethodId?: string;
      cancelAtPeriodEnd?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<Subscription>;

  /**
   * Cancel a subscription
   */
  cancelSubscription(request: CancelSubscriptionRequest): Promise<Subscription>;

  /**
   * Reactivate a canceled subscription (if still within period)
   */
  reactivateSubscription(providerSubscriptionId: string): Promise<Subscription>;

  /**
   * Pause a subscription
   */
  pauseSubscription?(providerSubscriptionId: string): Promise<Subscription>;

  /**
   * Resume a paused subscription
   */
  resumeSubscription?(providerSubscriptionId: string): Promise<Subscription>;

  // ============================================
  // REFUNDS
  // ============================================

  /**
   * Create a refund for a transaction
   */
  createRefund(request: RefundRequest): Promise<Refund>;

  /**
   * Get refund status
   */
  getRefund(refundId: string): Promise<Refund | null>;

  // ============================================
  // WEBHOOKS
  // ============================================

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string
  ): boolean;

  /**
   * Parse and normalize a webhook event
   */
  parseWebhookEvent(payload: string | Buffer, signature: string): WebhookEvent | null;

  /**
   * Process a webhook event
   */
  processWebhookEvent(event: WebhookEvent): Promise<WebhookProcessingResult>;

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Convert internal amount to provider amount format
   * e.g., some providers use cents, others use full currency units
   */
  convertToProviderAmount(amount: number, currency: string): number;

  /**
   * Convert provider amount to internal format
   */
  convertFromProviderAmount(amount: number, currency: string): number;

  /**
   * Get supported payment methods for this provider
   */
  getSupportedPaymentMethods(): PaymentMethodType[];

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): string[];

  /**
   * Check if a currency is supported
   */
  isCurrencySupported(currency: string): boolean;

  /**
   * Map provider status to internal status
   */
  mapTransactionStatus(providerStatus: string): TransactionStatus;

  /**
   * Map provider subscription status to internal status
   */
  mapSubscriptionStatus(providerStatus: string): SubscriptionStatus;
}

/**
 * Extended interface for providers that support checkout sessions
 * (e.g., Stripe Checkout, PayPal hosted pages)
 */
export interface ICheckoutSessionProvider extends IPaymentProvider {
  /**
   * Create a checkout session for hosted payment page
   */
  createCheckoutSession(options: CheckoutSessionOptions): Promise<CheckoutSession>;

  /**
   * Retrieve a checkout session
   */
  getCheckoutSession(sessionId: string): Promise<CheckoutSession | null>;
}

export interface CheckoutSessionOptions {
  userId: string;
  customerId?: string;
  lineItems: CheckoutLineItem[];
  mode: 'payment' | 'subscription' | 'setup';
  successUrl: string;
  cancelUrl: string;
  allowedPaymentMethods?: PaymentMethodType[];
  metadata?: Record<string, any>;
  customerEmail?: string;
  billingAddressCollection?: 'required' | 'auto';
  shippingAddressCollection?: {
    allowedCountries: string[];
  };
}

export interface CheckoutLineItem {
  priceId?: string;
  productName?: string;
  productDescription?: string;
  unitAmount?: number;
  currency?: string;
  quantity: number;
  images?: string[];
}

export interface CheckoutSession {
  id: string;
  providerSessionId: string;
  url: string;
  status: 'open' | 'complete' | 'expired';
  mode: 'payment' | 'subscription' | 'setup';
  customerId?: string;
  subscriptionId?: string;
  paymentIntentId?: string;
  amountTotal?: number;
  currency?: string;
  expiresAt?: Date;
}

/**
 * Extended interface for In-App Purchase providers
 * (Apple IAP, Google Play Billing)
 */
export interface IIAPProvider extends IPaymentProvider {
  /**
   * Validate a purchase receipt
   */
  validateReceipt(
    receipt: string,
    productId: string,
    isSubscription: boolean
  ): Promise<IAPValidationResult>;

  /**
   * Get subscription status from the store
   */
  getSubscriptionStatus(originalTransactionId: string): Promise<IAPSubscriptionStatus>;

  /**
   * Acknowledge a purchase (required for Google Play)
   */
  acknowledgePurchase?(purchaseToken: string): Promise<void>;

  /**
   * Handle server-to-server notification
   */
  handleServerNotification(payload: any): Promise<IAPNotificationResult>;
}

export interface IAPValidationResult {
  valid: boolean;
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  purchaseDate: Date;
  expirationDate?: Date;
  isTrialPeriod: boolean;
  isIntroductoryPeriod?: boolean;
  isRenewal: boolean;
  autoRenewStatus?: boolean;
  cancellationDate?: Date;
  cancellationReason?: string;
  environment: 'sandbox' | 'production';
  rawResponse: any;
  error?: string;
}

export interface IAPSubscriptionStatus {
  originalTransactionId: string;
  productId: string;
  status: 'active' | 'expired' | 'billing_retry' | 'grace_period' | 'canceled' | 'revoked';
  expirationDate?: Date;
  autoRenewStatus: boolean;
  priceConsentStatus?: string;
  gracePeriodExpirationDate?: Date;
}

export interface IAPNotificationResult {
  notificationType: string;
  originalTransactionId?: string;
  productId?: string;
  userId?: string;
  action: 'update_subscription' | 'cancel_subscription' | 'refund' | 'none';
  metadata?: Record<string, any>;
}

/**
 * Extended interface for providers supporting mobile money
 * (Flutterwave, Paystack)
 */
export interface IMobileMoneyProvider extends IPaymentProvider {
  /**
   * Initialize a mobile money payment
   */
  initializeMobileMoneyPayment(options: MobileMoneyOptions): Promise<MobileMoneyPayment>;

  /**
   * Get mobile money payment status
   */
  getMobileMoneyPaymentStatus(reference: string): Promise<MobileMoneyPayment>;

  /**
   * Verify a mobile money payment
   */
  verifyMobileMoneyPayment(reference: string): Promise<MobileMoneyPayment>;
}

export interface MobileMoneyOptions {
  userId: string;
  amount: number;
  currency: string;
  email: string;
  phone: string;
  network?: string; // MTN, Vodafone, etc.
  country: string;
  description?: string;
  metadata?: Record<string, any>;
  redirectUrl?: string;
}

export interface MobileMoneyPayment {
  reference: string;
  providerReference: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
  phone: string;
  network?: string;
  authorizationUrl?: string;
  ussdCode?: string;
  message?: string;
}

/**
 * Extended interface for providers supporting bank transfers
 * (Flutterwave, Paystack)
 */
export interface IBankTransferProvider extends IPaymentProvider {
  /**
   * Create a virtual account for bank transfer
   */
  createVirtualAccount(userId: string, email: string): Promise<VirtualAccount>;

  /**
   * Get virtual account details
   */
  getVirtualAccount(accountId: string): Promise<VirtualAccount | null>;

  /**
   * Initialize a bank transfer payment
   */
  initializeBankTransfer(options: BankTransferOptions): Promise<BankTransferPayment>;
}

export interface VirtualAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  currency: string;
  isActive: boolean;
  expiresAt?: Date;
}

export interface BankTransferOptions {
  userId: string;
  amount: number;
  currency: string;
  email: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface BankTransferPayment {
  reference: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  amount: number;
  currency: string;
  expiresAt: Date;
  status: TransactionStatus;
}
