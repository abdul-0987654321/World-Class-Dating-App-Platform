/**
 * Dynamic Pricing DTOs
 *
 * Validation DTOs for all dynamic pricing endpoints using class-validator
 */

import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsIn,
  IsArray,
  IsObject,
  IsPositive,
  IsDate,
  IsISO8601,
  Min,
  Max,
  Length,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// =============================================================================
// COMMON TYPES
// =============================================================================

const VALID_TIERS = ['free', 'basic', 'plus', 'premium', 'premium_plus', 'elite'] as const;
const VALID_BILLING_CYCLES = ['monthly', '3_months', '6_months', 'yearly'] as const;
const VALID_DISCOUNT_TYPES = ['percentage', 'fixed_amount', 'free_trial_days', 'tier_upgrade'] as const;
const VALID_EXPERIMENT_STATUSES = ['draft', 'running', 'paused', 'completed', 'cancelled'] as const;
const VALID_RULE_TYPES = [
  'time_based',
  'quantity_based',
  'user_attribute',
  'referral',
  'loyalty',
  'win_back',
  'flash_sale',
  'early_bird',
] as const;

// =============================================================================
// PRICING REQUEST DTOs
// =============================================================================

/**
 * DTO for getting personalized price
 * POST /api/v1/pricing/personalized
 */
export class GetPersonalizedPriceDto {
  @IsUUID('4', { message: 'Invalid user ID format' })
  userId: string;

  @IsString()
  @IsIn(VALID_TIERS, { message: 'Invalid plan ID' })
  planId: string;

  @IsOptional()
  @IsString()
  @IsIn(VALID_BILLING_CYCLES, { message: 'Invalid billing cycle' })
  billingCycle?: string = 'monthly';

  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Country code must be 2 characters' })
  @Transform(({ value }) => value?.toUpperCase())
  countryCode?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includePromotions?: boolean = true;
}

/**
 * DTO for getting regional price
 * GET /api/v1/pricing/regional/:planId/:countryCode
 */
export class GetRegionalPriceParamsDto {
  @IsString()
  @IsIn(VALID_TIERS, { message: 'Invalid plan ID' })
  planId: string;

  @IsString()
  @Length(2, 2, { message: 'Country code must be 2 characters' })
  @Transform(({ value }) => value?.toUpperCase())
  countryCode: string;
}

export class GetRegionalPriceQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  regionCode?: string;

  @IsOptional()
  @IsString()
  @IsIn(VALID_BILLING_CYCLES, { message: 'Invalid billing cycle' })
  billingCycle?: string;
}

/**
 * DTO for getting price catalog
 * GET /api/v1/pricing/catalog/:countryCode
 */
export class GetPriceCatalogParamsDto {
  @IsString()
  @Length(2, 2, { message: 'Country code must be 2 characters' })
  @Transform(({ value }) => value?.toUpperCase())
  countryCode: string;
}

// =============================================================================
// PROMOTION DTOs
// =============================================================================

/**
 * DTO for applying promo code
 * POST /api/v1/pricing/promo/apply
 */
export class ApplyPromoCodeDto {
  @IsUUID('4', { message: 'Invalid user ID format' })
  userId: string;

  @IsString()
  @MinLength(3, { message: 'Promo code must be at least 3 characters' })
  @MaxLength(50, { message: 'Promo code must not exceed 50 characters' })
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Promo code can only contain letters, numbers, underscores, and hyphens' })
  @Transform(({ value }) => value?.toUpperCase())
  code: string;

  @IsString()
  @IsIn(VALID_TIERS, { message: 'Invalid plan ID' })
  planId: string;

  @IsString()
  @IsIn(VALID_BILLING_CYCLES, { message: 'Invalid billing cycle' })
  billingCycle: string;
}

/**
 * DTO for getting active promotions
 * GET /api/v1/pricing/promo/active/:userId
 */
export class GetActivePromotionsParamsDto {
  @IsUUID('4', { message: 'Invalid user ID format' })
  userId: string;
}

export class GetActivePromotionsQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(VALID_TIERS, { message: 'Invalid plan ID' })
  planId?: string;

  @IsOptional()
  @IsString()
  @IsIn(VALID_BILLING_CYCLES, { message: 'Invalid billing cycle' })
  billingCycle?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Country code must be 2 characters' })
  @Transform(({ value }) => value?.toUpperCase())
  countryCode?: string;
}

/**
 * DTO for validating promo code
 * GET /api/v1/pricing/promo/validate/:code
 */
export class ValidatePromoCodeParamsDto {
  @IsString()
  @MinLength(3, { message: 'Promo code must be at least 3 characters' })
  @MaxLength(50, { message: 'Promo code must not exceed 50 characters' })
  @Transform(({ value }) => value?.toUpperCase())
  code: string;
}

export class ValidatePromoCodeQueryDto {
  @IsUUID('4', { message: 'Invalid user ID format' })
  userId: string;

  @IsString()
  @IsIn(VALID_TIERS, { message: 'Invalid plan ID' })
  planId: string;

  @IsString()
  @IsIn(VALID_BILLING_CYCLES, { message: 'Invalid billing cycle' })
  billingCycle: string;
}

/**
 * DTO for creating a promotion (Admin)
 * POST /api/v1/pricing/admin/promotions
 */
export class PromotionTargetingRulesDto {
  @IsOptional()
  @IsBoolean()
  newUser?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minEngagementScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxEngagementScore?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userSegments?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedCountries?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  minDaysSinceSignup?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDaysSinceSignup?: number;

  @IsOptional()
  @IsBoolean()
  hasEverSubscribed?: boolean;

  @IsOptional()
  @IsArray()
  @IsIn(VALID_TIERS, { each: true })
  currentTiers?: string[];

  @IsOptional()
  @IsBoolean()
  referredBy?: boolean;
}

export class CreatePromotionDto {
  @IsString()
  @MinLength(3, { message: 'Code must be at least 3 characters' })
  @MaxLength(50, { message: 'Code must not exceed 50 characters' })
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Code can only contain letters, numbers, underscores, and hyphens' })
  @Transform(({ value }) => value?.toUpperCase())
  code: string;

  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsIn(VALID_DISCOUNT_TYPES, { message: 'Invalid discount type' })
  discountType: string;

  @IsNumber()
  @IsPositive({ message: 'Discount value must be positive' })
  @Type(() => Number)
  discountValue: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  minPurchaseAmount?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  maxDiscountAmount?: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one applicable plan is required' })
  @IsIn(VALID_TIERS, { each: true, message: 'Invalid tier in applicable plans' })
  applicablePlans: string[];

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one applicable billing cycle is required' })
  @IsIn(VALID_BILLING_CYCLES, { each: true, message: 'Invalid billing cycle' })
  applicableBillingCycles: string[];

  @IsOptional()
  @IsArray()
  @IsIn(VALID_TIERS, { each: true })
  excludedPlans?: string[];

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  maxUses?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxUsesPerUser?: number = 1;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  firstTimeOnly?: boolean = false;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  requiresPaymentMethod?: boolean = true;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  stackable?: boolean = false;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  priority?: number = 0;

  @IsISO8601({ strict: true }, { message: 'Invalid start date format' })
  @Type(() => Date)
  startsAt: Date;

  @IsISO8601({ strict: true }, { message: 'Invalid end date format' })
  @Type(() => Date)
  endsAt: Date;

  @IsOptional()
  @ValidateNested()
  @Type(() => PromotionTargetingRulesDto)
  targetingRules?: PromotionTargetingRulesDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// =============================================================================
// EXPERIMENT DTOs
// =============================================================================

/**
 * DTO for running price experiment
 * POST /api/v1/pricing/experiment/run
 */
export class RunPriceExperimentDto {
  @IsUUID('4', { message: 'Invalid experiment ID format' })
  experimentId: string;

  @IsUUID('4', { message: 'Invalid user ID format' })
  userId: string;

  @IsOptional()
  @IsString()
  @IsIn(VALID_TIERS, { message: 'Invalid plan ID' })
  planId?: string;

  @IsOptional()
  @IsString()
  @IsIn(VALID_BILLING_CYCLES, { message: 'Invalid billing cycle' })
  billingCycle?: string;
}

/**
 * DTO for getting experiment results
 * GET /api/v1/pricing/experiment/:experimentId/results
 */
export class GetExperimentResultsParamsDto {
  @IsUUID('4', { message: 'Invalid experiment ID format' })
  experimentId: string;
}

/**
 * DTO for recording experiment conversion
 * POST /api/v1/pricing/experiment/conversion
 */
export class RecordExperimentConversionDto {
  @IsUUID('4', { message: 'Invalid user ID format' })
  userId: string;

  @IsUUID('4', { message: 'Invalid experiment ID format' })
  experimentId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  revenue?: number = 0;
}

/**
 * DTO for experiment variant
 */
export class ExperimentVariantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @IsBoolean()
  @Type(() => Boolean)
  isControl: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  trafficWeight: number;

  @IsString()
  @IsIn(VALID_TIERS, { message: 'Invalid plan ID' })
  planId: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  priceMonthly?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  priceYearly?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price3Months?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price6Months?: number;

  @IsOptional()
  @IsString()
  stripePriceIdMonthly?: string;

  @IsOptional()
  @IsString()
  stripePriceIdYearly?: string;

  @IsOptional()
  @IsString()
  stripePriceId3Months?: string;

  @IsOptional()
  @IsString()
  stripePriceId6Months?: string;

  @IsOptional()
  @IsObject()
  customFeatures?: Record<string, unknown>;
}

/**
 * DTO for experiment targeting rules
 */
export class ExperimentTargetingRulesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(2, 2, { each: true })
  countries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userSegments?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minEngagementScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxEngagementScore?: number;

  @IsOptional()
  @IsBoolean()
  newUsersOnly?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minDaysSinceSignup?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDaysSinceSignup?: number;
}

/**
 * DTO for experiment exclusion rules
 */
export class ExperimentExclusionRulesDto {
  @IsOptional()
  @IsBoolean()
  excludeSubscribed?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(2, 2, { each: true })
  excludeCountries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeUserSegments?: string[];

  @IsOptional()
  @IsBoolean()
  excludeInOtherExperiments?: boolean;
}

/**
 * DTO for success metric
 */
export class SuccessMetricDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @IsIn(['conversion_rate', 'revenue_per_user', 'average_order_value', 'retention_rate', 'ltv'])
  type: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  target?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  weight: number;
}

/**
 * DTO for creating an experiment (Admin)
 * POST /api/v1/pricing/admin/experiments
 */
export class CreateExperimentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  hypothesis?: string;

  @IsNumber()
  @Min(0.1)
  @Max(100)
  @Type(() => Number)
  trafficPercentage: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ExperimentTargetingRulesDto)
  targetingRules?: ExperimentTargetingRulesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ExperimentExclusionRulesDto)
  exclusionRules?: ExperimentExclusionRulesDto;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Type(() => Date)
  startsAt?: Date;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Type(() => Date)
  endsAt?: Date;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Type(() => Number)
  minSampleSize?: number = 1000;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(0.99)
  @Type(() => Number)
  statisticalSignificanceTarget?: number = 0.95;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SuccessMetricDto)
  successMetrics?: SuccessMetricDto[];

  @IsArray()
  @ArrayMinSize(2, { message: 'At least 2 variants are required' })
  @ValidateNested({ each: true })
  @Type(() => ExperimentVariantDto)
  variants: ExperimentVariantDto[];
}

/**
 * DTO for experiment ID parameter
 */
export class ExperimentIdParamDto {
  @IsUUID('4', { message: 'Invalid experiment ID format' })
  experimentId: string;
}

// =============================================================================
// BUNDLE DTOs
// =============================================================================

/**
 * DTO for getting available bundles
 * GET /api/v1/pricing/bundles/:userId
 */
export class GetAvailableBundlesParamsDto {
  @IsUUID('4', { message: 'Invalid user ID format' })
  userId: string;
}

export class GetAvailableBundlesQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(VALID_TIERS, { message: 'Invalid tier' })
  currentTier?: string;
}

// =============================================================================
// PERSONALIZED PRICING DTOs
// =============================================================================

/**
 * DTO for calculating personalized pricing
 * POST /api/v1/pricing/personalized/calculate/:userId
 */
export class CalculatePersonalizedPricingParamsDto {
  @IsUUID('4', { message: 'Invalid user ID format' })
  userId: string;
}

// =============================================================================
// ADMIN DTOs
// =============================================================================

/**
 * DTO for updating regional pricing (Admin)
 * PUT /api/v1/pricing/admin/regional/:countryCode
 */
export class UpdateRegionalPricingParamsDto {
  @IsString()
  @Length(2, 2, { message: 'Country code must be 2 characters' })
  @Transform(({ value }) => value?.toUpperCase())
  countryCode: string;
}

export class TierPriceOverrideDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  priceMonthly?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  priceYearly?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price3Months?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price6Months?: number;

  @IsOptional()
  @IsString()
  stripePriceIdMonthly?: string;

  @IsOptional()
  @IsString()
  stripePriceIdYearly?: string;

  @IsOptional()
  @IsString()
  stripePriceId3Months?: string;

  @IsOptional()
  @IsString()
  stripePriceId6Months?: string;
}

export class UpdateRegionalPricingDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  regionCode?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3, { message: 'Currency code must be 3 characters' })
  currencyCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(5)
  @Type(() => Number)
  purchasingPowerIndex?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(2)
  @Type(() => Number)
  priceMultiplier?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1)
  @Type(() => Number)
  minPriceMultiplier?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  @Type(() => Number)
  maxPriceMultiplier?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  currencyConversionRate?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  tierOverrides?: Record<string, TierPriceOverrideDto>;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Type(() => Date)
  effectiveFrom?: Date;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Type(() => Date)
  effectiveUntil?: Date;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * DTO for recording promotion usage (Internal)
 * POST /api/v1/pricing/promo/record-usage
 */
export class RecordPromotionUsageDto {
  @IsUUID('4', { message: 'Invalid user ID format' })
  userId: string;

  @IsUUID('4', { message: 'Invalid promotion ID format' })
  promotionId: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid subscription ID format' })
  subscriptionId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid transaction ID format' })
  transactionId?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountAmount: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  originalAmount: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  finalAmount: number;
}
