/**
 * Dynamic Pricing Type Definitions
 *
 * Comprehensive types for the dynamic pricing system including:
 * - Regional pricing
 * - Promotional pricing
 * - Personalized pricing
 * - A/B testing experiments
 * - Bundle pricing
 * - Pricing rules
 */

// =============================================================================
// CORE PRICING TYPES
// =============================================================================

export type SubscriptionTierCode = 'free' | 'basic' | 'plus' | 'premium' | 'premium_plus' | 'elite';
export type BillingCycleType = 'monthly' | '3_months' | '6_months' | 'yearly';
export type CurrencyCode = string; // ISO 4217 currency codes
export type CountryCode = string; // ISO 3166-1 alpha-2 country codes

export interface BasePricing {
  planId: string;
  tierCode: SubscriptionTierCode;
  billingCycle: BillingCycleType;
  basePrice: number;
  currency: CurrencyCode;
}

// =============================================================================
// PRICING RESULT TYPES
// =============================================================================

export interface PricingResult {
  userId?: string;
  planId: string;
  tierCode: SubscriptionTierCode;
  billingCycle: BillingCycleType;
  basePrice: number;
  finalPrice: number;
  displayPrice: string;
  currency: CurrencyCode;
  currencySymbol: string;
  savings: number;
  savingsPercentage: number;
  adjustments: PriceAdjustment[];
  promotionsApplied: AppliedPromotion[];
  regionalAdjustment?: RegionalAdjustment;
  personalizedAdjustment?: PersonalizedAdjustment;
  experimentInfo?: ExperimentInfo;
  stripePriceId: string;
  validUntil?: Date;
  metadata: Record<string, unknown>;
}

export interface PriceAdjustment {
  type: 'regional' | 'promotional' | 'personalized' | 'experiment' | 'rule' | 'bundle';
  name: string;
  description?: string;
  adjustmentType: 'percentage' | 'fixed_amount';
  adjustmentValue: number;
  amountAdjusted: number;
  priority: number;
  source?: string;
}

export interface AppliedPromotion {
  promotionId: string;
  code: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  amountSaved: number;
}

// =============================================================================
// REGIONAL PRICING TYPES
// =============================================================================

export interface RegionalPricing {
  id: string;
  countryCode: CountryCode;
  regionCode?: string;
  currencyCode: CurrencyCode;
  purchasingPowerIndex: number;
  priceMultiplier: number;
  minPriceMultiplier: number;
  maxPriceMultiplier: number;
  currencyConversionRate: number;
  isActive: boolean;
  tierOverrides: Record<SubscriptionTierCode, TierPriceOverride>;
  metadata: Record<string, unknown>;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TierPriceOverride {
  priceMonthly?: number;
  priceYearly?: number;
  price3Months?: number;
  price6Months?: number;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  stripePriceId3Months?: string;
  stripePriceId6Months?: string;
}

export interface RegionalAdjustment {
  countryCode: CountryCode;
  regionCode?: string;
  originalCurrency: CurrencyCode;
  localCurrency: CurrencyCode;
  purchasingPowerIndex: number;
  priceMultiplier: number;
  conversionRate: number;
  originalPrice: number;
  adjustedPrice: number;
  localPrice: number;
}

export interface GetRegionalPriceRequest {
  planId: string;
  countryCode: CountryCode;
  regionCode?: string;
  billingCycle?: BillingCycleType;
}

// =============================================================================
// PROMOTIONAL PRICING TYPES
// =============================================================================

export type DiscountType = 'percentage' | 'fixed_amount' | 'free_trial_days' | 'tier_upgrade';

export interface Promotion {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  applicablePlans: SubscriptionTierCode[];
  applicableBillingCycles: BillingCycleType[];
  excludedPlans: SubscriptionTierCode[];
  maxUses?: number;
  maxUsesPerUser: number;
  currentUses: number;
  firstTimeOnly: boolean;
  requiresPaymentMethod: boolean;
  stackable: boolean;
  priority: number;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  targetingRules: PromotionTargetingRules;
  metadata: Record<string, unknown>;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromotionTargetingRules {
  newUser?: boolean;
  minEngagementScore?: number;
  maxEngagementScore?: number;
  userSegments?: string[];
  countries?: CountryCode[];
  excludedCountries?: CountryCode[];
  minDaysSinceSignup?: number;
  maxDaysSinceSignup?: number;
  hasEverSubscribed?: boolean;
  currentTiers?: SubscriptionTierCode[];
  referredBy?: boolean;
}

export interface DiscountResult {
  success: boolean;
  promotion?: Promotion;
  originalPrice: number;
  discountedPrice: number;
  discountAmount: number;
  message: string;
  trialDays?: number;
  tierUpgrade?: SubscriptionTierCode;
  validUntil?: Date;
  error?: string;
}

export interface ApplyPromoCodeRequest {
  userId: string;
  code: string;
  planId: string;
  billingCycle: BillingCycleType;
}

export interface UserPromotionUsage {
  id: string;
  userId: string;
  promotionId: string;
  subscriptionId?: string;
  transactionId?: string;
  discountAmount: number;
  originalAmount: number;
  finalAmount: number;
  appliedAt: Date;
  metadata: Record<string, unknown>;
}

// =============================================================================
// PERSONALIZED PRICING TYPES
// =============================================================================

export type UserSegment =
  | 'new_user'
  | 'engaged_free'
  | 'at_risk'
  | 'churned'
  | 'high_value'
  | 'power_user'
  | 'casual'
  | 'win_back_target'
  | 'upgrade_candidate';

export interface PersonalizedPricing {
  id: string;
  userId: string;
  engagementScore: number;
  conversionLikelihood: number;
  priceSensitivity: number;
  lifetimeValuePrediction?: number;
  recommendedDiscount?: number;
  userSegment?: UserSegment;
  tierRecommendations: TierRecommendation[];
  behaviorFactors: BehaviorFactors;
  daysSinceSignup: number;
  totalSessions: number;
  matchesCount: number;
  messagesSent: number;
  lastActiveAt?: Date;
  hasEverSubscribed: boolean;
  lastSubscriptionEnd?: Date;
  calculatedAt: Date;
  expiresAt?: Date;
  metadata: Record<string, unknown>;
}

export interface TierRecommendation {
  tierCode: SubscriptionTierCode;
  recommendedPrice: number;
  originalPrice: number;
  discountPercentage: number;
  confidence: number;
  reason: string;
}

export interface BehaviorFactors {
  dailyActiveStreak: number;
  averageSessionDuration: number;
  profileCompleteness: number;
  photoCount: number;
  swipeRate: number;
  matchRate: number;
  responseRate: number;
  premiumFeatureUsage: number;
  lastPurchaseDate?: Date;
  totalSpent: number;
  referralCount: number;
}

export interface PersonalizedAdjustment {
  userId: string;
  segment: UserSegment;
  engagementScore: number;
  conversionLikelihood: number;
  priceSensitivity: number;
  recommendedDiscount: number;
  appliedDiscount: number;
  reason: string;
}

export interface GetPersonalizedPriceRequest {
  userId: string;
  planId: string;
  billingCycle?: BillingCycleType;
  countryCode?: CountryCode;
  includePromotions?: boolean;
}

// =============================================================================
// A/B TESTING / EXPERIMENT TYPES
// =============================================================================

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';

export interface PriceExperiment {
  id: string;
  name: string;
  description?: string;
  hypothesis?: string;
  status: ExperimentStatus;
  trafficPercentage: number;
  targetingRules: ExperimentTargetingRules;
  exclusionRules: ExperimentExclusionRules;
  startsAt?: Date;
  endsAt?: Date;
  minSampleSize: number;
  statisticalSignificanceTarget: number;
  successMetrics: SuccessMetric[];
  createdBy?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperimentTargetingRules {
  countries?: CountryCode[];
  userSegments?: UserSegment[];
  minEngagementScore?: number;
  maxEngagementScore?: number;
  newUsersOnly?: boolean;
  minDaysSinceSignup?: number;
  maxDaysSinceSignup?: number;
}

export interface ExperimentExclusionRules {
  excludeSubscribed?: boolean;
  excludeCountries?: CountryCode[];
  excludeUserSegments?: UserSegment[];
  excludeInOtherExperiments?: boolean;
}

export interface SuccessMetric {
  name: string;
  type: 'conversion_rate' | 'revenue_per_user' | 'average_order_value' | 'retention_rate' | 'ltv';
  target?: number;
  weight: number;
}

export interface PriceExperimentVariant {
  id: string;
  experimentId: string;
  name: string;
  isControl: boolean;
  trafficWeight: number;
  planId: string;
  priceMonthly?: number;
  priceYearly?: number;
  price3Months?: number;
  price6Months?: number;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  stripePriceId3Months?: string;
  stripePriceId6Months?: string;
  customFeatures: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserExperimentAssignment {
  id: string;
  userId: string;
  experimentId: string;
  variantId: string;
  assignedAt: Date;
  hasConverted: boolean;
  convertedAt?: Date;
  revenueGenerated: number;
  events: ExperimentEvent[];
  metadata: Record<string, unknown>;
}

export interface ExperimentEvent {
  eventType: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export interface ExperimentPrice {
  experimentId: string;
  experimentName: string;
  variantId: string;
  variantName: string;
  isControl: boolean;
  planId: string;
  billingCycle: BillingCycleType;
  price: number;
  stripePriceId: string;
  assignedAt: Date;
}

export interface ExperimentInfo {
  experimentId: string;
  experimentName: string;
  variantId: string;
  variantName: string;
  isControl: boolean;
  assignedAt: Date;
}

export interface RunPriceExperimentRequest {
  experimentId: string;
  userId: string;
  planId?: string;
  billingCycle?: BillingCycleType;
}

// =============================================================================
// BUNDLE PRICING TYPES
// =============================================================================

export type BundleItemType = 'super_likes' | 'boosts' | 'subscription_upgrade' | 'coins' | 'feature_unlock';

export interface PricingBundle {
  id: string;
  name: string;
  slug: string;
  description?: string;
  includedItems: BundleItem[];
  basePrice: number;
  bundlePrice: number;
  savingsAmount: number;
  savingsPercentage: number;
  stripePriceId?: string;
  stripeProductId?: string;
  compatiblePlans: SubscriptionTierCode[];
  requiresSubscription: boolean;
  maxPurchasesPerUser?: number;
  availableFrom?: Date;
  availableUntil?: Date;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BundleItem {
  type: BundleItemType;
  quantity?: number;
  tier?: SubscriptionTierCode;
  durationMonths?: number;
  featureKey?: string;
  individualPrice: number;
}

// =============================================================================
// PRICING RULES TYPES
// =============================================================================

export type PricingRuleType =
  | 'time_based'
  | 'quantity_based'
  | 'user_attribute'
  | 'referral'
  | 'loyalty'
  | 'win_back'
  | 'flash_sale'
  | 'early_bird';

export interface PricingRule {
  id: string;
  name: string;
  description?: string;
  ruleType: PricingRuleType;
  conditions: RuleConditions;
  actions: RuleActions;
  priority: number;
  stackable: boolean;
  maxApplications?: number;
  startsAt?: Date;
  endsAt?: Date;
  isActive: boolean;
  createdBy?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleConditions {
  // Time-based conditions
  daysOfWeek?: number[];
  hoursOfDay?: number[];
  timezone?: 'utc' | 'user_local';
  dateRange?: { start: Date; end: Date };

  // User attribute conditions
  minSubscriptionMonths?: number;
  maxSubscriptionMonths?: number;
  currentStatus?: string;
  currentTier?: SubscriptionTierCode[];
  previousTier?: SubscriptionTierCode[];
  userSegments?: UserSegment[];
  countries?: CountryCode[];

  // Win-back conditions
  daysSinceCancellationMin?: number;
  daysSinceCancellationMax?: number;

  // Referral conditions
  minReferrals?: number;
  referralWithinDays?: number;

  // Quantity conditions
  minQuantity?: number;
  minPurchaseAmount?: number;

  // Custom conditions
  customConditions?: Record<string, unknown>;
}

export interface RuleActions {
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  applyTo?: 'first_payment' | 'renewal' | 'all';
  validDays?: number;
  message?: string;
  tierUpgrade?: SubscriptionTierCode;
  bonusItems?: BundleItem[];
  customActions?: Record<string, unknown>;
}

// =============================================================================
// AUDIT LOG TYPES
// =============================================================================

export type PricingAuditAction =
  | 'price_calculated'
  | 'promo_applied'
  | 'promo_rejected'
  | 'experiment_assigned'
  | 'regional_price_applied'
  | 'personalized_price_applied'
  | 'rule_applied'
  | 'bundle_purchased'
  | 'price_override'
  | 'admin_change';

export interface PricingAuditLog {
  id: string;
  userId?: string;
  action: PricingAuditAction;
  entityType: string;
  entityId?: string;
  planId?: string;
  billingCycle?: BillingCycleType;
  basePrice?: number;
  finalPrice?: number;
  adjustmentsApplied: PriceAdjustment[];
  promotionsApplied: AppliedPromotion[];
  regionalAdjustment?: RegionalAdjustment;
  personalizedAdjustment?: PersonalizedAdjustment;
  experimentInfo?: ExperimentInfo;
  countryCode?: CountryCode;
  currencyCode?: CurrencyCode;
  ipAddress?: string;
  userAgent?: string;
  performedBy?: string;
  reason?: string;
  requestContext: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// =============================================================================
// SERVICE REQUEST/RESPONSE TYPES
// =============================================================================

export interface GetActivePromotionsRequest {
  userId: string;
  planId?: string;
  billingCycle?: BillingCycleType;
  countryCode?: CountryCode;
}

export interface CreatePromotionRequest {
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  applicablePlans: SubscriptionTierCode[];
  applicableBillingCycles: BillingCycleType[];
  excludedPlans?: SubscriptionTierCode[];
  maxUses?: number;
  maxUsesPerUser?: number;
  firstTimeOnly?: boolean;
  requiresPaymentMethod?: boolean;
  stackable?: boolean;
  priority?: number;
  startsAt: Date;
  endsAt: Date;
  targetingRules?: PromotionTargetingRules;
  metadata?: Record<string, unknown>;
  createdBy?: string;
}

export interface UpdatePromotionRequest extends Partial<CreatePromotionRequest> {
  id: string;
}

export interface CreateExperimentRequest {
  name: string;
  description?: string;
  hypothesis?: string;
  trafficPercentage: number;
  targetingRules?: ExperimentTargetingRules;
  exclusionRules?: ExperimentExclusionRules;
  startsAt?: Date;
  endsAt?: Date;
  minSampleSize?: number;
  statisticalSignificanceTarget?: number;
  successMetrics?: SuccessMetric[];
  variants: CreateExperimentVariantRequest[];
  createdBy?: string;
}

export interface CreateExperimentVariantRequest {
  name: string;
  isControl: boolean;
  trafficWeight: number;
  planId: string;
  priceMonthly?: number;
  priceYearly?: number;
  price3Months?: number;
  price6Months?: number;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  stripePriceId3Months?: string;
  stripePriceId6Months?: string;
  customFeatures?: Record<string, unknown>;
}

export interface ExperimentResults {
  experimentId: string;
  experimentName: string;
  status: ExperimentStatus;
  startedAt?: Date;
  endedAt?: Date;
  totalParticipants: number;
  variants: VariantResults[];
  winner?: string;
  statisticalSignificance: number;
  isSignificant: boolean;
  recommendations: string[];
}

export interface VariantResults {
  variantId: string;
  variantName: string;
  isControl: boolean;
  participants: number;
  conversions: number;
  conversionRate: number;
  totalRevenue: number;
  revenuePerUser: number;
  averageOrderValue: number;
  confidenceInterval: { lower: number; upper: number };
  relativeUplift?: number;
  pValue?: number;
}

export interface UpdateRegionalPricingRequest {
  countryCode: CountryCode;
  regionCode?: string;
  currencyCode?: CurrencyCode;
  purchasingPowerIndex?: number;
  priceMultiplier?: number;
  minPriceMultiplier?: number;
  maxPriceMultiplier?: number;
  currencyConversionRate?: number;
  isActive?: boolean;
  tierOverrides?: Record<SubscriptionTierCode, TierPriceOverride>;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
  metadata?: Record<string, unknown>;
}

export interface BulkPriceUpdateRequest {
  updates: {
    planId: string;
    billingCycle: BillingCycleType;
    newPrice: number;
    stripePriceId?: string;
  }[];
  reason: string;
  effectiveFrom?: Date;
  performedBy: string;
}

// =============================================================================
// CURRENCY HELPERS
// =============================================================================

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  JPY: '\u00A5',
  CNY: '\u00A5',
  INR: '\u20B9',
  BRL: 'R$',
  MXN: '$',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  KRW: '\u20A9',
  SGD: 'S$',
  HKD: 'HK$',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'z\u0142',
  CZK: 'K\u010D',
  TRY: '\u20BA',
  ZAR: 'R',
  THB: '\u0E3F',
  MYR: 'RM',
  PHP: '\u20B1',
  IDR: 'Rp',
  VND: '\u20AB',
  NGN: '\u20A6',
  EGP: '\u00A3',
  PKR: '\u20A8',
  BDT: '\u09F3',
  ARS: '$',
  COP: '$',
  CLP: '$',
};

export const CURRENCY_DECIMAL_PLACES: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
  IDR: 0,
  CLP: 0,
  default: 2,
};

export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
}

export function getCurrencyDecimalPlaces(currencyCode: string): number {
  return CURRENCY_DECIMAL_PLACES[currencyCode] ?? CURRENCY_DECIMAL_PLACES.default;
}

export function formatPrice(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  const decimals = getCurrencyDecimalPlaces(currencyCode);
  const formattedAmount = amount.toFixed(decimals);
  return `${symbol}${formattedAmount}`;
}
