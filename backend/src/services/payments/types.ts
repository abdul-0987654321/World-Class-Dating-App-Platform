/**
 * Payment System Types and Interfaces
 * Defines all types used across the multi-gateway payment system
 */

// ============================================
// ENUMS
// ============================================

export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  BRAINTREE = 'braintree',
  FLUTTERWAVE = 'flutterwave',
  PAYSTACK = 'paystack',
  APPLE_IAP = 'apple_iap',
  GOOGLE_PLAY = 'google_play',
}

export enum PaymentMethodType {
  CARD = 'card',
  BANK_ACCOUNT = 'bank_account',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay',
  PAYPAL = 'paypal',
  VENMO = 'venmo',
  ACH = 'ach',
  MOBILE_MONEY = 'mobile_money',
  BANK_TRANSFER = 'bank_transfer',
  USSD = 'ussd',
}

export enum TransactionType {
  SUBSCRIPTION = 'subscription',
  ONE_TIME = 'one_time',
  COIN_PURCHASE = 'coin_purchase',
  BOOST_PURCHASE = 'boost_purchase',
  GIFT_PURCHASE = 'gift_purchase',
  SUPER_LIKE_PURCHASE = 'super_like_purchase',
  REFUND = 'refund',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  REQUIRES_ACTION = 'requires_action',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  DISPUTED = 'disputed',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  CANCELED = 'canceled',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  PAUSED = 'paused',
}

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  PREMIUM_PLUS = 'premium_plus',
  DIAMOND = 'diamond',
}

export enum BillingPeriod {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  LIFETIME = 'lifetime',
}

export enum WebhookEventType {
  // Payment Events
  PAYMENT_CREATED = 'payment.created',
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
  PAYMENT_DISPUTED = 'payment.disputed',

  // Subscription Events
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELED = 'subscription.canceled',
  SUBSCRIPTION_RENEWED = 'subscription.renewed',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription.trial_ending',
  SUBSCRIPTION_TRIAL_ENDED = 'subscription.trial_ended',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription.payment_failed',

  // Customer Events
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',

  // Payment Method Events
  PAYMENT_METHOD_ATTACHED = 'payment_method.attached',
  PAYMENT_METHOD_DETACHED = 'payment_method.detached',
  PAYMENT_METHOD_UPDATED = 'payment_method.updated',

  // IAP Events
  IAP_PURCHASE_VALIDATED = 'iap.purchase.validated',
  IAP_SUBSCRIPTION_RENEWED = 'iap.subscription.renewed',
  IAP_SUBSCRIPTION_CANCELED = 'iap.subscription.canceled',
  IAP_REFUND = 'iap.refund',
}

export enum CoinTransactionType {
  PURCHASE = 'purchase',
  SPEND = 'spend',
  EARNED = 'earned',
  REFUND = 'refund',
  BONUS = 'bonus',
  GIFT_SENT = 'gift_sent',
  GIFT_RECEIVED = 'gift_received',
  DAILY_REWARD = 'daily_reward',
  REFERRAL = 'referral',
}

// ============================================
// CORE INTERFACES
// ============================================

export interface PaymentCustomer {
  id: string;
  providerCustomerId: string;
  provider: PaymentProvider;
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface PaymentMethod {
  id: string;
  customerId: string;
  providerPaymentMethodId: string;
  provider: PaymentProvider;
  type: PaymentMethodType;
  isDefault: boolean;
  // Card details (if type is card)
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  cardFunding?: string;
  // Bank details (if type is bank_account or ach)
  bankName?: string;
  bankLast4?: string;
  // Billing details
  billingName?: string;
  billingEmail?: string;
  billingAddress?: Address;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export interface PaymentIntent {
  id: string;
  providerIntentId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  status: TransactionStatus;
  customerId?: string;
  paymentMethodId?: string;
  clientSecret?: string; // For frontend confirmation
  description?: string;
  metadata?: Record<string, any>;
  requiresAction?: boolean;
  nextActionUrl?: string;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  providerSubscriptionId: string;
  provider: PaymentProvider;
  planId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingPeriod: BillingPeriod;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  providerTransactionId: string;
  provider: PaymentProvider;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  fees?: number;
  netAmount?: number;
  exchangeRate?: number;
  originalAmount?: number;
  originalCurrency?: string;
  description?: string;
  subscriptionId?: string;
  paymentMethodType?: PaymentMethodType;
  failureCode?: string;
  failureMessage?: string;
  refundedAmount?: number;
  metadata?: Record<string, any>;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Refund {
  id: string;
  transactionId: string;
  providerRefundId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// ============================================
// PRODUCT/PLAN INTERFACES
// ============================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  tier: SubscriptionTier;
  // Pricing
  priceMonthly: number;
  priceQuarterly?: number;
  priceYearly: number;
  priceLifetime?: number;
  currency: string;
  // Provider IDs
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  paypalPlanIdMonthly?: string;
  paypalPlanIdYearly?: string;
  applePlanId?: string;
  googlePlanId?: string;
  // Trial
  trialDays: number;
  // Features
  features: SubscriptionFeature[];
  // Limits
  dailySwipes: number;
  dailySuperLikes: number;
  dailyBoosts: number;
  unlimitedLikes: boolean;
  seeWhoLikesYou: boolean;
  unlimitedRewinds: boolean;
  passport: boolean;
  advancedFilters: boolean;
  readReceipts: boolean;
  noAds: boolean;
  incognitoMode: boolean;
  priorityLikes: boolean;
  messageBeforeMatch: boolean;
  vipBadge: boolean;
  // Metadata
  isActive: boolean;
  sortOrder: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionFeature {
  name: string;
  description: string;
  included: boolean;
}

export interface CoinPackage {
  id: string;
  name: string;
  displayName: string;
  coinAmount: number;
  bonusCoins: number;
  totalCoins: number;
  price: number;
  currency: string;
  discount?: number;
  // Provider IDs
  stripePriceId?: string;
  paypalProductId?: string;
  appleProductId?: string;
  googleProductId?: string;
  flutterwavePlanCode?: string;
  paystackPlanCode?: string;
  // Display
  isPopular: boolean;
  isBestValue: boolean;
  isActive: boolean;
  sortOrder: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoostPackage {
  id: string;
  name: string;
  displayName: string;
  durationMinutes: number;
  price: number;
  priceInCoins: number;
  currency: string;
  // Provider IDs
  stripePriceId?: string;
  appleProductId?: string;
  googleProductId?: string;
  isActive: boolean;
  sortOrder: number;
  metadata?: Record<string, any>;
}

// ============================================
// REQUEST/RESPONSE INTERFACES
// ============================================

export interface CreateCustomerRequest {
  userId: string;
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, any>;
}

export interface CreatePaymentIntentRequest {
  userId: string;
  amount: number;
  currency: string;
  paymentMethodTypes?: PaymentMethodType[];
  description?: string;
  metadata?: Record<string, any>;
  customerId?: string;
  setupFutureUsage?: 'off_session' | 'on_session';
}

export interface CreateSubscriptionRequest {
  userId: string;
  planId: string;
  billingPeriod: BillingPeriod;
  paymentMethodId?: string;
  trialDays?: number;
  couponCode?: string;
  metadata?: Record<string, any>;
}

export interface CancelSubscriptionRequest {
  subscriptionId: string;
  immediately?: boolean;
  reason?: string;
}

export interface RefundRequest {
  transactionId: string;
  amount?: number; // Partial refund if specified
  reason?: string;
}

export interface ValidateIAPReceiptRequest {
  userId: string;
  platform: 'ios' | 'android';
  receipt: string;
  productId: string;
  transactionId?: string;
  isSubscription: boolean;
}

export interface IAPValidationResult {
  valid: boolean;
  productId: string;
  transactionId: string;
  purchaseDate: Date;
  expirationDate?: Date;
  isTrialPeriod?: boolean;
  isRenewal?: boolean;
  originalTransactionId?: string;
  error?: string;
}

// ============================================
// WEBHOOK INTERFACES
// ============================================

export interface WebhookEvent {
  id: string;
  provider: PaymentProvider;
  eventType: WebhookEventType;
  eventId: string;
  data: Record<string, any>;
  signature?: string;
  timestamp: Date;
  rawPayload: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  eventId: string;
  eventType: WebhookEventType;
  message?: string;
  error?: string;
}

// ============================================
// REPORTING INTERFACES
// ============================================

export interface RevenueReport {
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  totalTransactions: number;
  totalRefunds: number;
  netRevenue: number;
  currency: string;
  byProvider: ProviderRevenue[];
  byPlan: PlanRevenue[];
  byCountry: CountryRevenue[];
  byPaymentMethod: PaymentMethodRevenue[];
}

export interface ProviderRevenue {
  provider: PaymentProvider;
  revenue: number;
  transactions: number;
  refunds: number;
  netRevenue: number;
  fees: number;
}

export interface PlanRevenue {
  planId: string;
  planName: string;
  tier: SubscriptionTier;
  revenue: number;
  subscriptions: number;
  activeSubscriptions: number;
  churnedSubscriptions: number;
}

export interface CountryRevenue {
  country: string;
  countryName: string;
  revenue: number;
  transactions: number;
}

export interface PaymentMethodRevenue {
  type: PaymentMethodType;
  revenue: number;
  transactions: number;
}

// ============================================
// CONFIGURATION INTERFACES
// ============================================

export interface PaymentConfig {
  // Stripe
  stripeEnabled: boolean;
  stripeSecretKey?: string;
  stripePublishableKey?: string;
  stripeWebhookSecret?: string;

  // PayPal
  paypalEnabled: boolean;
  paypalClientId?: string;
  paypalClientSecret?: string;
  paypalWebhookId?: string;
  paypalSandbox?: boolean;

  // Flutterwave
  flutterwaveEnabled: boolean;
  flutterwaveSecretKey?: string;
  flutterwavePublicKey?: string;
  flutterwaveWebhookSecret?: string;

  // Paystack
  paystackEnabled: boolean;
  paystackSecretKey?: string;
  paystackPublicKey?: string;

  // Apple IAP
  appleIAPEnabled: boolean;
  appleSharedSecret?: string;
  appleBundleId?: string;
  appleIsProduction?: boolean;

  // Google Play
  googlePlayEnabled: boolean;
  googleServiceAccountKey?: string;
  googlePackageName?: string;

  // General
  defaultCurrency: string;
  supportedCurrencies: string[];
  taxEnabled: boolean;
  trialDaysDefault: number;
}

// ============================================
// ERROR TYPES
// ============================================

export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: PaymentProvider,
    public originalError?: any
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

export class PaymentValidationError extends PaymentError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'PaymentValidationError';
  }
}

export class PaymentProviderError extends PaymentError {
  constructor(
    message: string,
    provider: PaymentProvider,
    public providerErrorCode?: string,
    originalError?: any
  ) {
    super(message, 'PROVIDER_ERROR', provider, originalError);
    this.name = 'PaymentProviderError';
  }
}

export class PaymentNotFoundError extends PaymentError {
  constructor(message: string, public resourceType: string, public resourceId: string) {
    super(message, 'NOT_FOUND');
    this.name = 'PaymentNotFoundError';
  }
}

export class InsufficientBalanceError extends PaymentError {
  constructor(public required: number, public available: number) {
    super(`Insufficient balance: required ${required}, available ${available}`, 'INSUFFICIENT_BALANCE');
    this.name = 'InsufficientBalanceError';
  }
}
