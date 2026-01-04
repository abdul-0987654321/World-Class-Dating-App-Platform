/**
 * Dynamic Pricing Service
 *
 * Comprehensive service for managing dynamic pricing including:
 * - Geographic/regional pricing based on purchasing power
 * - Promotional pricing with time-limited discounts
 * - Personalized pricing based on user engagement
 * - A/B testing for price experiments
 * - Bundle pricing for multiple features
 * - Pricing rules engine
 * - Complete audit logging
 */

import Stripe from 'stripe';
import { Knex } from 'knex';
import { createLogger } from '@flamoral/backend-shared';
import { db } from '../../infrastructure/database/connection';
import { SUBSCRIPTION_TIERS, getTierByKey } from '../../config/stripe-products';
import {
  PricingResult,
  PriceAdjustment,
  AppliedPromotion,
  RegionalPricing,
  RegionalAdjustment,
  GetRegionalPriceRequest,
  Promotion,
  PromotionTargetingRules,
  DiscountResult,
  ApplyPromoCodeRequest,
  UserPromotionUsage,
  PersonalizedPricing,
  PersonalizedAdjustment,
  UserSegment,
  TierRecommendation,
  BehaviorFactors,
  GetPersonalizedPriceRequest,
  PriceExperiment,
  PriceExperimentVariant,
  UserExperimentAssignment,
  ExperimentPrice,
  ExperimentInfo,
  RunPriceExperimentRequest,
  ExperimentResults,
  VariantResults,
  PricingBundle,
  PricingRule,
  RuleConditions,
  RuleActions,
  PricingAuditLog,
  PricingAuditAction,
  GetActivePromotionsRequest,
  CreatePromotionRequest,
  UpdatePromotionRequest,
  CreateExperimentRequest,
  UpdateRegionalPricingRequest,
  SubscriptionTierCode,
  BillingCycleType,
  CountryCode,
  CurrencyCode,
  formatPrice,
  getCurrencySymbol,
  DiscountType,
} from '../../types/dynamic-pricing.types';

const logger = createLogger('dynamic-pricing-service');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
});

// Base prices from subscription tiers (in USD cents)
const BASE_PRICES: Record<SubscriptionTierCode, Record<BillingCycleType, number>> = {
  free: { monthly: 0, '3_months': 0, '6_months': 0, yearly: 0 },
  basic: { monthly: 999, '3_months': 2697, '6_months': 4794, yearly: 9588 },
  plus: { monthly: 1499, '3_months': 4047, '6_months': 7194, yearly: 14388 },
  premium: { monthly: 1999, '3_months': 5397, '6_months': 9594, yearly: 19188 },
  premium_plus: { monthly: 2999, '3_months': 8097, '6_months': 14394, yearly: 28788 },
  elite: { monthly: 4999, '3_months': 13497, '6_months': 23994, yearly: 47988 },
};

// Stripe price ID mapping
const STRIPE_PRICE_IDS: Record<SubscriptionTierCode, Record<BillingCycleType, string>> = {
  free: { monthly: '', '3_months': '', '6_months': '', yearly: '' },
  basic: {
    monthly: process.env.STRIPE_PRICE_BASIC_MONTHLY || 'price_basic_monthly',
    '3_months': process.env.STRIPE_PRICE_BASIC_3MONTHS || 'price_basic_3months',
    '6_months': process.env.STRIPE_PRICE_BASIC_6MONTHS || 'price_basic_6months',
    yearly: process.env.STRIPE_PRICE_BASIC_YEARLY || 'price_basic_yearly',
  },
  plus: {
    monthly: process.env.STRIPE_PRICE_PLUS_MONTHLY || 'price_plus_monthly',
    '3_months': process.env.STRIPE_PRICE_PLUS_3MONTHS || 'price_plus_3months',
    '6_months': process.env.STRIPE_PRICE_PLUS_6MONTHS || 'price_plus_6months',
    yearly: process.env.STRIPE_PRICE_PLUS_YEARLY || 'price_plus_yearly',
  },
  premium: {
    monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || 'price_premium_monthly',
    '3_months': process.env.STRIPE_PRICE_PREMIUM_3MONTHS || 'price_premium_3months',
    '6_months': process.env.STRIPE_PRICE_PREMIUM_6MONTHS || 'price_premium_6months',
    yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY || 'price_premium_yearly',
  },
  premium_plus: {
    monthly: process.env.STRIPE_PRICE_PREMIUM_PLUS_MONTHLY || 'price_premium_plus_monthly',
    '3_months': process.env.STRIPE_PRICE_PREMIUM_PLUS_3MONTHS || 'price_premium_plus_3months',
    '6_months': process.env.STRIPE_PRICE_PREMIUM_PLUS_6MONTHS || 'price_premium_plus_6months',
    yearly: process.env.STRIPE_PRICE_PREMIUM_PLUS_YEARLY || 'price_premium_plus_yearly',
  },
  elite: {
    monthly: process.env.STRIPE_PRICE_ELITE_MONTHLY || 'price_elite_monthly',
    '3_months': process.env.STRIPE_PRICE_ELITE_3MONTHS || 'price_elite_3months',
    '6_months': process.env.STRIPE_PRICE_ELITE_6MONTHS || 'price_elite_6months',
    yearly: process.env.STRIPE_PRICE_ELITE_YEARLY || 'price_elite_yearly',
  },
};

export class DynamicPricingService {
  private db: Knex;
  private stripe: Stripe;

  constructor(database?: Knex, stripeInstance?: Stripe) {
    this.db = database || db;
    this.stripe = stripeInstance || stripe;
  }

  // =============================================================================
  // CORE PRICING METHODS
  // =============================================================================

  /**
   * Get personalized price for a user
   * Combines regional, promotional, personalized, and experimental pricing
   */
  async getPersonalizedPrice(request: GetPersonalizedPriceRequest): Promise<PricingResult> {
    const {
      userId,
      planId,
      billingCycle = 'monthly',
      countryCode,
      includePromotions = true,
    } = request;

    const tierCode = planId as SubscriptionTierCode;
    const basePrice = this.getBasePrice(tierCode, billingCycle);

    let finalPrice = basePrice;
    const adjustments: PriceAdjustment[] = [];
    const promotionsApplied: AppliedPromotion[] = [];
    let regionalAdjustment: RegionalAdjustment | undefined;
    let personalizedAdjustment: PersonalizedAdjustment | undefined;
    let experimentInfo: ExperimentInfo | undefined;
    let currency: CurrencyCode = 'USD';
    let stripePriceId = STRIPE_PRICE_IDS[tierCode]?.[billingCycle] || '';

    try {
      // 1. Check for experiment assignment first (takes precedence)
      const experimentPrice = await this.checkExperimentAssignment(userId, planId, billingCycle);
      if (experimentPrice) {
        finalPrice = experimentPrice.price * 100; // Convert to cents
        stripePriceId = experimentPrice.stripePriceId;
        experimentInfo = {
          experimentId: experimentPrice.experimentId,
          experimentName: experimentPrice.experimentName,
          variantId: experimentPrice.variantId,
          variantName: experimentPrice.variantName,
          isControl: experimentPrice.isControl,
          assignedAt: experimentPrice.assignedAt,
        };
        adjustments.push({
          type: 'experiment',
          name: experimentPrice.experimentName,
          description: `Experiment variant: ${experimentPrice.variantName}`,
          adjustmentType: 'fixed_amount',
          adjustmentValue: experimentPrice.price * 100,
          amountAdjusted: basePrice - (experimentPrice.price * 100),
          priority: 100,
          source: experimentPrice.experimentId,
        });
      }

      // 2. Apply regional pricing if country code provided
      if (countryCode && !experimentInfo) {
        const regional = await this.getRegionalPricing(countryCode);
        if (regional) {
          const adjustedPrice = Math.round(finalPrice * regional.priceMultiplier);
          currency = regional.currencyCode;

          regionalAdjustment = {
            countryCode: regional.countryCode,
            regionCode: regional.regionCode,
            originalCurrency: 'USD',
            localCurrency: currency,
            purchasingPowerIndex: regional.purchasingPowerIndex,
            priceMultiplier: regional.priceMultiplier,
            conversionRate: regional.currencyConversionRate,
            originalPrice: finalPrice,
            adjustedPrice: adjustedPrice,
            localPrice: Math.round(adjustedPrice * regional.currencyConversionRate),
          };

          adjustments.push({
            type: 'regional',
            name: 'Regional Pricing',
            description: `Price adjusted for ${countryCode}`,
            adjustmentType: 'percentage',
            adjustmentValue: (1 - regional.priceMultiplier) * 100,
            amountAdjusted: finalPrice - adjustedPrice,
            priority: 90,
            source: regional.id,
          });

          finalPrice = adjustedPrice;
        }
      }

      // 3. Apply personalized pricing
      if (!experimentInfo) {
        const personalized = await this.getPersonalizedPricingData(userId);
        if (personalized && personalized.recommendedDiscount && personalized.recommendedDiscount > 0) {
          const discountMultiplier = 1 - (personalized.recommendedDiscount / 100);
          const adjustedPrice = Math.round(finalPrice * discountMultiplier);

          personalizedAdjustment = {
            userId,
            segment: personalized.userSegment || 'new_user',
            engagementScore: personalized.engagementScore,
            conversionLikelihood: personalized.conversionLikelihood,
            priceSensitivity: personalized.priceSensitivity,
            recommendedDiscount: personalized.recommendedDiscount,
            appliedDiscount: personalized.recommendedDiscount,
            reason: this.getPersonalizedPricingReason(personalized),
          };

          adjustments.push({
            type: 'personalized',
            name: 'Personalized Discount',
            description: personalizedAdjustment.reason,
            adjustmentType: 'percentage',
            adjustmentValue: personalized.recommendedDiscount,
            amountAdjusted: finalPrice - adjustedPrice,
            priority: 80,
            source: personalized.id,
          });

          finalPrice = adjustedPrice;
        }
      }

      // 4. Apply applicable pricing rules
      if (!experimentInfo) {
        const rules = await this.getApplicablePricingRules(userId, tierCode, billingCycle);
        for (const rule of rules) {
          const ruleAdjustment = this.applyPricingRule(rule, finalPrice);
          if (ruleAdjustment) {
            finalPrice = ruleAdjustment.newPrice;
            adjustments.push(ruleAdjustment.adjustment);
          }
        }
      }

      // 5. Apply promotions if requested
      if (includePromotions && !experimentInfo) {
        const activePromotions = await this.getActivePromotionsForUser({
          userId,
          planId,
          billingCycle,
          countryCode,
        });

        for (const promo of activePromotions) {
          if (!promo.stackable && promotionsApplied.length > 0) continue;

          const promoResult = this.applyPromotionDiscount(promo, finalPrice);
          if (promoResult.applied) {
            finalPrice = promoResult.newPrice;
            promotionsApplied.push({
              promotionId: promo.id,
              code: promo.code,
              name: promo.name,
              discountType: promo.discountType,
              discountValue: promo.discountValue,
              amountSaved: promoResult.amountSaved,
            });
            adjustments.push({
              type: 'promotional',
              name: promo.name,
              description: promo.description || undefined,
              adjustmentType: promo.discountType === 'percentage' ? 'percentage' : 'fixed_amount',
              adjustmentValue: promo.discountValue,
              amountAdjusted: promoResult.amountSaved,
              priority: promo.priority,
              source: promo.id,
            });
          }
        }
      }

      // Ensure price doesn't go below minimum
      const minPrice = this.getMinimumPrice(tierCode, billingCycle);
      if (finalPrice < minPrice) {
        finalPrice = minPrice;
      }

      const savings = basePrice - finalPrice;
      const savingsPercentage = basePrice > 0 ? (savings / basePrice) * 100 : 0;

      const result: PricingResult = {
        userId,
        planId,
        tierCode,
        billingCycle,
        basePrice: basePrice / 100, // Convert to dollars
        finalPrice: finalPrice / 100, // Convert to dollars
        displayPrice: formatPrice(finalPrice / 100, currency),
        currency,
        currencySymbol: getCurrencySymbol(currency),
        savings: savings / 100,
        savingsPercentage: Math.round(savingsPercentage * 100) / 100,
        adjustments,
        promotionsApplied,
        regionalAdjustment,
        personalizedAdjustment,
        experimentInfo,
        stripePriceId,
        validUntil: new Date(Date.now() + 30 * 60 * 1000), // Valid for 30 minutes
        metadata: {},
      };

      // Log the pricing calculation
      await this.logPricingAudit({
        userId,
        action: 'price_calculated',
        entityType: 'subscription',
        planId,
        billingCycle,
        basePrice: basePrice / 100,
        finalPrice: finalPrice / 100,
        adjustmentsApplied: adjustments,
        promotionsApplied,
        regionalAdjustment,
        personalizedAdjustment,
        experimentInfo,
        countryCode,
        currencyCode: currency,
      });

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error calculating personalized price:', { error: errorMessage, userId, planId });
      throw new Error(`Failed to calculate personalized price: ${errorMessage}`);
    }
  }

  /**
   * Get regional price for a plan and country
   */
  async getRegionalPrice(request: GetRegionalPriceRequest): Promise<PricingResult> {
    const { planId, countryCode, regionCode, billingCycle = 'monthly' } = request;
    const tierCode = planId as SubscriptionTierCode;
    const basePrice = this.getBasePrice(tierCode, billingCycle);

    try {
      const regional = await this.getRegionalPricing(countryCode, regionCode);

      if (!regional) {
        // Return base USD price if no regional pricing configured
        return {
          planId,
          tierCode,
          billingCycle,
          basePrice: basePrice / 100,
          finalPrice: basePrice / 100,
          displayPrice: formatPrice(basePrice / 100, 'USD'),
          currency: 'USD',
          currencySymbol: '$',
          savings: 0,
          savingsPercentage: 0,
          adjustments: [],
          promotionsApplied: [],
          stripePriceId: STRIPE_PRICE_IDS[tierCode]?.[billingCycle] || '',
          metadata: {},
        };
      }

      const adjustedPrice = Math.round(basePrice * regional.priceMultiplier);
      const localPrice = Math.round(adjustedPrice * regional.currencyConversionRate);
      const savings = basePrice - adjustedPrice;

      const regionalAdjustment: RegionalAdjustment = {
        countryCode: regional.countryCode,
        regionCode: regional.regionCode,
        originalCurrency: 'USD',
        localCurrency: regional.currencyCode,
        purchasingPowerIndex: regional.purchasingPowerIndex,
        priceMultiplier: regional.priceMultiplier,
        conversionRate: regional.currencyConversionRate,
        originalPrice: basePrice / 100,
        adjustedPrice: adjustedPrice / 100,
        localPrice: localPrice / 100,
      };

      return {
        planId,
        tierCode,
        billingCycle,
        basePrice: basePrice / 100,
        finalPrice: adjustedPrice / 100,
        displayPrice: formatPrice(localPrice / 100, regional.currencyCode),
        currency: regional.currencyCode,
        currencySymbol: getCurrencySymbol(regional.currencyCode),
        savings: savings / 100,
        savingsPercentage: Math.round((savings / basePrice) * 10000) / 100,
        adjustments: [{
          type: 'regional',
          name: 'Regional Pricing',
          description: `Price adjusted for ${countryCode}`,
          adjustmentType: 'percentage',
          adjustmentValue: (1 - regional.priceMultiplier) * 100,
          amountAdjusted: savings / 100,
          priority: 90,
          source: regional.id,
        }],
        promotionsApplied: [],
        regionalAdjustment,
        stripePriceId: STRIPE_PRICE_IDS[tierCode]?.[billingCycle] || '',
        metadata: {},
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting regional price:', { error: errorMessage, planId, countryCode });
      throw new Error(`Failed to get regional price: ${errorMessage}`);
    }
  }

  // =============================================================================
  // PROMOTION METHODS
  // =============================================================================

  /**
   * Apply a promo code for a user
   */
  async applyPromoCode(request: ApplyPromoCodeRequest): Promise<DiscountResult> {
    const { userId, code, planId, billingCycle } = request;
    const tierCode = planId as SubscriptionTierCode;
    const basePrice = this.getBasePrice(tierCode, billingCycle);

    try {
      // Find the promotion
      const promotion = await this.db('promotions')
        .where('code', code.toUpperCase())
        .where('is_active', true)
        .where('starts_at', '<=', new Date())
        .where('ends_at', '>', new Date())
        .first();

      if (!promotion) {
        await this.logPricingAudit({
          userId,
          action: 'promo_rejected',
          entityType: 'promotion',
          planId,
          billingCycle,
          reason: 'Promo code not found or expired',
        });

        return {
          success: false,
          originalPrice: basePrice / 100,
          discountedPrice: basePrice / 100,
          discountAmount: 0,
          message: 'Invalid or expired promo code',
          error: 'INVALID_CODE',
        };
      }

      // Check if promotion is applicable to this plan
      const applicablePlans = promotion.applicable_plans || [];
      if (applicablePlans.length > 0 && !applicablePlans.includes(tierCode)) {
        return {
          success: false,
          originalPrice: basePrice / 100,
          discountedPrice: basePrice / 100,
          discountAmount: 0,
          message: `This promo code is not valid for the ${tierCode} plan`,
          error: 'PLAN_NOT_APPLICABLE',
        };
      }

      // Check if billing cycle is applicable
      const applicableCycles = promotion.applicable_billing_cycles || [];
      if (applicableCycles.length > 0 && !applicableCycles.includes(billingCycle)) {
        return {
          success: false,
          originalPrice: basePrice / 100,
          discountedPrice: basePrice / 100,
          discountAmount: 0,
          message: `This promo code is not valid for ${billingCycle} billing`,
          error: 'BILLING_CYCLE_NOT_APPLICABLE',
        };
      }

      // Check max uses
      if (promotion.max_uses && promotion.current_uses >= promotion.max_uses) {
        return {
          success: false,
          originalPrice: basePrice / 100,
          discountedPrice: basePrice / 100,
          discountAmount: 0,
          message: 'This promo code has reached its usage limit',
          error: 'MAX_USES_REACHED',
        };
      }

      // Check user's usage of this promotion
      const userUsage = await this.db('user_promotion_usage')
        .where('user_id', userId)
        .where('promotion_id', promotion.id)
        .count('* as count')
        .first();

      if (userUsage && Number(userUsage.count) >= promotion.max_uses_per_user) {
        return {
          success: false,
          originalPrice: basePrice / 100,
          discountedPrice: basePrice / 100,
          discountAmount: 0,
          message: 'You have already used this promo code',
          error: 'USER_MAX_USES_REACHED',
        };
      }

      // Check first-time-only restriction
      if (promotion.first_time_only) {
        const existingSubscription = await this.db('user_subscriptions')
          .where('user_id', userId)
          .whereNot('status', 'canceled')
          .first();

        if (existingSubscription) {
          return {
            success: false,
            originalPrice: basePrice / 100,
            discountedPrice: basePrice / 100,
            discountAmount: 0,
            message: 'This promo code is only valid for first-time subscribers',
            error: 'FIRST_TIME_ONLY',
          };
        }
      }

      // Check targeting rules
      const targetingValid = await this.validatePromotionTargeting(promotion.targeting_rules, userId);
      if (!targetingValid.valid) {
        return {
          success: false,
          originalPrice: basePrice / 100,
          discountedPrice: basePrice / 100,
          discountAmount: 0,
          message: targetingValid.reason || 'You are not eligible for this promotion',
          error: 'TARGETING_FAILED',
        };
      }

      // Calculate discount
      let discountedPrice = basePrice;
      let discountAmount = 0;
      let trialDays: number | undefined;
      let tierUpgrade: SubscriptionTierCode | undefined;

      switch (promotion.discount_type as DiscountType) {
        case 'percentage':
          discountAmount = Math.round(basePrice * (promotion.discount_value / 100));
          if (promotion.max_discount_amount) {
            discountAmount = Math.min(discountAmount, promotion.max_discount_amount * 100);
          }
          discountedPrice = basePrice - discountAmount;
          break;

        case 'fixed_amount':
          discountAmount = Math.min(promotion.discount_value * 100, basePrice);
          discountedPrice = basePrice - discountAmount;
          break;

        case 'free_trial_days':
          trialDays = promotion.discount_value;
          discountedPrice = basePrice; // Full price after trial
          break;

        case 'tier_upgrade':
          // Upgrade to higher tier at same price
          tierUpgrade = promotion.discount_value as unknown as SubscriptionTierCode;
          discountedPrice = basePrice;
          break;
      }

      // Ensure minimum price
      const minPrice = this.getMinimumPrice(tierCode, billingCycle);
      if (discountedPrice < minPrice) {
        discountedPrice = minPrice;
        discountAmount = basePrice - minPrice;
      }

      const mappedPromotion: Promotion = {
        id: promotion.id,
        code: promotion.code,
        name: promotion.name,
        description: promotion.description,
        discountType: promotion.discount_type,
        discountValue: Number(promotion.discount_value),
        minPurchaseAmount: promotion.min_purchase_amount ? Number(promotion.min_purchase_amount) : undefined,
        maxDiscountAmount: promotion.max_discount_amount ? Number(promotion.max_discount_amount) : undefined,
        applicablePlans: promotion.applicable_plans || [],
        applicableBillingCycles: promotion.applicable_billing_cycles || [],
        excludedPlans: promotion.excluded_plans || [],
        maxUses: promotion.max_uses,
        maxUsesPerUser: promotion.max_uses_per_user,
        currentUses: promotion.current_uses,
        firstTimeOnly: promotion.first_time_only,
        requiresPaymentMethod: promotion.requires_payment_method,
        stackable: promotion.stackable,
        priority: promotion.priority,
        startsAt: new Date(promotion.starts_at),
        endsAt: new Date(promotion.ends_at),
        isActive: promotion.is_active,
        targetingRules: promotion.targeting_rules || {},
        metadata: promotion.metadata || {},
        createdBy: promotion.created_by,
        createdAt: new Date(promotion.created_at),
        updatedAt: new Date(promotion.updated_at),
      };

      await this.logPricingAudit({
        userId,
        action: 'promo_applied',
        entityType: 'promotion',
        entityId: promotion.id,
        planId,
        billingCycle,
        basePrice: basePrice / 100,
        finalPrice: discountedPrice / 100,
      });

      return {
        success: true,
        promotion: mappedPromotion,
        originalPrice: basePrice / 100,
        discountedPrice: discountedPrice / 100,
        discountAmount: discountAmount / 100,
        message: `Promo code "${code}" applied successfully`,
        trialDays,
        tierUpgrade,
        validUntil: new Date(promotion.ends_at),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error applying promo code:', { error: errorMessage, userId, code });
      throw new Error(`Failed to apply promo code: ${errorMessage}`);
    }
  }

  /**
   * Get all active promotions available to a user
   */
  async getActivePromotions(request: GetActivePromotionsRequest): Promise<Promotion[]> {
    return this.getActivePromotionsForUser(request);
  }

  private async getActivePromotionsForUser(request: GetActivePromotionsRequest): Promise<Promotion[]> {
    const { userId, planId, billingCycle, countryCode } = request;

    try {
      const now = new Date();

      let query = this.db('promotions')
        .where('is_active', true)
        .where('starts_at', '<=', now)
        .where('ends_at', '>', now)
        .orderBy('priority', 'desc');

      const promotions = await query;

      const validPromotions: Promotion[] = [];

      for (const promo of promotions) {
        // Check plan applicability
        const applicablePlans = promo.applicable_plans || [];
        if (planId && applicablePlans.length > 0 && !applicablePlans.includes(planId)) {
          continue;
        }

        // Check billing cycle applicability
        const applicableCycles = promo.applicable_billing_cycles || [];
        if (billingCycle && applicableCycles.length > 0 && !applicableCycles.includes(billingCycle)) {
          continue;
        }

        // Check max uses
        if (promo.max_uses && promo.current_uses >= promo.max_uses) {
          continue;
        }

        // Check user's usage
        if (userId) {
          const userUsage = await this.db('user_promotion_usage')
            .where('user_id', userId)
            .where('promotion_id', promo.id)
            .count('* as count')
            .first();

          if (userUsage && Number(userUsage.count) >= promo.max_uses_per_user) {
            continue;
          }

          // Check first-time-only
          if (promo.first_time_only) {
            const existingSubscription = await this.db('user_subscriptions')
              .where('user_id', userId)
              .whereNot('status', 'canceled')
              .first();

            if (existingSubscription) {
              continue;
            }
          }

          // Check targeting rules
          const targetingValid = await this.validatePromotionTargeting(promo.targeting_rules, userId);
          if (!targetingValid.valid) {
            continue;
          }
        }

        // Check country targeting
        if (countryCode && promo.targeting_rules) {
          const rules = promo.targeting_rules;
          if (rules.countries && rules.countries.length > 0 && !rules.countries.includes(countryCode)) {
            continue;
          }
          if (rules.excludedCountries && rules.excludedCountries.includes(countryCode)) {
            continue;
          }
        }

        validPromotions.push({
          id: promo.id,
          code: promo.code,
          name: promo.name,
          description: promo.description,
          discountType: promo.discount_type,
          discountValue: Number(promo.discount_value),
          minPurchaseAmount: promo.min_purchase_amount ? Number(promo.min_purchase_amount) : undefined,
          maxDiscountAmount: promo.max_discount_amount ? Number(promo.max_discount_amount) : undefined,
          applicablePlans: promo.applicable_plans || [],
          applicableBillingCycles: promo.applicable_billing_cycles || [],
          excludedPlans: promo.excluded_plans || [],
          maxUses: promo.max_uses,
          maxUsesPerUser: promo.max_uses_per_user,
          currentUses: promo.current_uses,
          firstTimeOnly: promo.first_time_only,
          requiresPaymentMethod: promo.requires_payment_method,
          stackable: promo.stackable,
          priority: promo.priority,
          startsAt: new Date(promo.starts_at),
          endsAt: new Date(promo.ends_at),
          isActive: promo.is_active,
          targetingRules: promo.targeting_rules || {},
          metadata: promo.metadata || {},
          createdBy: promo.created_by,
          createdAt: new Date(promo.created_at),
          updatedAt: new Date(promo.updated_at),
        });
      }

      return validPromotions;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting active promotions:', { error: errorMessage, userId });
      throw new Error(`Failed to get active promotions: ${errorMessage}`);
    }
  }

  /**
   * Record promotion usage
   */
  async recordPromotionUsage(
    userId: string,
    promotionId: string,
    subscriptionId: string | null,
    transactionId: string | null,
    discountAmount: number,
    originalAmount: number,
    finalAmount: number
  ): Promise<UserPromotionUsage> {
    try {
      const [usage] = await this.db('user_promotion_usage')
        .insert({
          user_id: userId,
          promotion_id: promotionId,
          subscription_id: subscriptionId,
          transaction_id: transactionId,
          discount_amount: discountAmount,
          original_amount: originalAmount,
          final_amount: finalAmount,
          applied_at: new Date(),
        })
        .returning('*');

      // Increment promotion usage count
      await this.db('promotions')
        .where('id', promotionId)
        .increment('current_uses', 1);

      return {
        id: usage.id,
        userId: usage.user_id,
        promotionId: usage.promotion_id,
        subscriptionId: usage.subscription_id,
        transactionId: usage.transaction_id,
        discountAmount: Number(usage.discount_amount),
        originalAmount: Number(usage.original_amount),
        finalAmount: Number(usage.final_amount),
        appliedAt: new Date(usage.applied_at),
        metadata: usage.metadata || {},
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error recording promotion usage:', { error: errorMessage, userId, promotionId });
      throw new Error(`Failed to record promotion usage: ${errorMessage}`);
    }
  }

  // =============================================================================
  // EXPERIMENT METHODS
  // =============================================================================

  /**
   * Run price experiment for a user
   */
  async runPriceExperiment(request: RunPriceExperimentRequest): Promise<ExperimentPrice | null> {
    const { experimentId, userId, planId, billingCycle = 'monthly' } = request;

    try {
      // Check for existing assignment
      const existing = await this.db('user_experiment_assignments')
        .where('user_id', userId)
        .where('experiment_id', experimentId)
        .first();

      if (existing) {
        // Return existing assignment
        const variant = await this.db('price_experiment_variants')
          .where('id', existing.variant_id)
          .first();

        const experiment = await this.db('price_experiments')
          .where('id', experimentId)
          .first();

        if (!variant || !experiment) return null;

        return this.mapToExperimentPrice(experiment, variant, billingCycle, existing.assigned_at);
      }

      // Get experiment details
      const experiment = await this.db('price_experiments')
        .where('id', experimentId)
        .where('status', 'running')
        .first();

      if (!experiment) return null;

      // Check targeting rules
      const isEligible = await this.checkExperimentEligibility(experiment, userId);
      if (!isEligible) return null;

      // Check traffic allocation
      const randomValue = Math.random() * 100;
      if (randomValue > experiment.traffic_percentage) return null;

      // Get variants and assign user
      const variants = await this.db('price_experiment_variants')
        .where('experiment_id', experimentId)
        .orderBy('traffic_weight', 'desc');

      if (variants.length === 0) return null;

      // Weighted random selection
      const selectedVariant = this.selectVariantByWeight(variants);

      // Create assignment
      await this.db('user_experiment_assignments').insert({
        user_id: userId,
        experiment_id: experimentId,
        variant_id: selectedVariant.id,
        assigned_at: new Date(),
      });

      await this.logPricingAudit({
        userId,
        action: 'experiment_assigned',
        entityType: 'experiment',
        entityId: experimentId,
        experimentInfo: {
          experimentId,
          experimentName: experiment.name,
          variantId: selectedVariant.id,
          variantName: selectedVariant.name,
          isControl: selectedVariant.is_control,
          assignedAt: new Date(),
        },
      });

      return this.mapToExperimentPrice(experiment, selectedVariant, billingCycle, new Date());
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error running price experiment:', { error: errorMessage, experimentId, userId });
      throw new Error(`Failed to run price experiment: ${errorMessage}`);
    }
  }

  /**
   * Check if user is already assigned to an experiment
   */
  private async checkExperimentAssignment(
    userId: string,
    planId: string,
    billingCycle: BillingCycleType
  ): Promise<ExperimentPrice | null> {
    try {
      const assignment = await this.db('user_experiment_assignments as uea')
        .join('price_experiments as pe', 'uea.experiment_id', 'pe.id')
        .join('price_experiment_variants as pev', 'uea.variant_id', 'pev.id')
        .where('uea.user_id', userId)
        .where('pe.status', 'running')
        .where('pev.plan_id', planId)
        .select('pe.*', 'pev.*', 'uea.assigned_at')
        .first();

      if (!assignment) return null;

      return this.mapToExperimentPrice(
        assignment,
        assignment,
        billingCycle,
        new Date(assignment.assigned_at)
      );
    } catch (error) {
      logger.warn('Error checking experiment assignment:', error);
      return null;
    }
  }

  /**
   * Record experiment conversion
   */
  async recordExperimentConversion(
    userId: string,
    experimentId: string,
    revenue: number
  ): Promise<void> {
    try {
      await this.db('user_experiment_assignments')
        .where('user_id', userId)
        .where('experiment_id', experimentId)
        .update({
          has_converted: true,
          converted_at: new Date(),
          revenue_generated: this.db.raw('revenue_generated + ?', [revenue]),
        });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error recording experiment conversion:', { error: errorMessage, userId, experimentId });
    }
  }

  /**
   * Get experiment results
   */
  async getExperimentResults(experimentId: string): Promise<ExperimentResults> {
    try {
      const experiment = await this.db('price_experiments')
        .where('id', experimentId)
        .first();

      if (!experiment) {
        throw new Error('Experiment not found');
      }

      const variants = await this.db('price_experiment_variants')
        .where('experiment_id', experimentId);

      const variantResults: VariantResults[] = [];
      let controlRate = 0;

      for (const variant of variants) {
        const stats = await this.db('user_experiment_assignments')
          .where('experiment_id', experimentId)
          .where('variant_id', variant.id)
          .select(
            this.db.raw('COUNT(*) as participants'),
            this.db.raw('COUNT(CASE WHEN has_converted THEN 1 END) as conversions'),
            this.db.raw('SUM(revenue_generated) as total_revenue')
          )
          .first() as unknown as { participants: string | number; conversions: string | number; total_revenue: string | number } | undefined;

        const participants = Number(stats?.participants || 0);
        const conversions = Number(stats?.conversions || 0);
        const totalRevenue = Number(stats?.total_revenue || 0);
        const conversionRate = participants > 0 ? conversions / participants : 0;
        const revenuePerUser = participants > 0 ? totalRevenue / participants : 0;
        const averageOrderValue = conversions > 0 ? totalRevenue / conversions : 0;

        // Calculate confidence interval (simplified Wilson score)
        const z = 1.96; // 95% confidence
        const p = conversionRate;
        const n = participants;
        const denominator = 1 + (z * z) / n;
        const center = (p + (z * z) / (2 * n)) / denominator;
        const margin = (z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) / denominator;

        const result: VariantResults = {
          variantId: variant.id,
          variantName: variant.name,
          isControl: variant.is_control,
          participants,
          conversions,
          conversionRate,
          totalRevenue,
          revenuePerUser,
          averageOrderValue,
          confidenceInterval: {
            lower: Math.max(0, center - margin),
            upper: Math.min(1, center + margin),
          },
        };

        if (variant.is_control) {
          controlRate = conversionRate;
        }

        variantResults.push(result);
      }

      // Calculate relative uplift for non-control variants
      for (const result of variantResults) {
        if (!result.isControl && controlRate > 0) {
          result.relativeUplift = ((result.conversionRate - controlRate) / controlRate) * 100;
          // Simplified p-value calculation
          result.pValue = this.calculatePValue(result, variantResults.find(v => v.isControl)!);
        }
      }

      const totalParticipants = variantResults.reduce((sum, v) => sum + v.participants, 0);
      const isSignificant = variantResults.some(v => v.pValue !== undefined && v.pValue < 0.05);

      // Determine winner
      let winner: string | undefined;
      if (isSignificant) {
        const bestVariant = variantResults
          .filter(v => !v.isControl && v.pValue !== undefined && v.pValue < 0.05)
          .sort((a, b) => b.conversionRate - a.conversionRate)[0];
        if (bestVariant && bestVariant.conversionRate > controlRate) {
          winner = bestVariant.variantName;
        }
      }

      return {
        experimentId,
        experimentName: experiment.name,
        status: experiment.status,
        startedAt: experiment.starts_at ? new Date(experiment.starts_at) : undefined,
        endedAt: experiment.ends_at ? new Date(experiment.ends_at) : undefined,
        totalParticipants,
        variants: variantResults,
        winner,
        statisticalSignificance: experiment.statistical_significance_target,
        isSignificant,
        recommendations: this.generateExperimentRecommendations(variantResults, isSignificant, winner),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting experiment results:', { error: errorMessage, experimentId });
      throw new Error(`Failed to get experiment results: ${errorMessage}`);
    }
  }

  // =============================================================================
  // BUNDLE PRICING METHODS
  // =============================================================================

  /**
   * Get available bundles for a user
   */
  async getAvailableBundles(userId: string, currentTier?: SubscriptionTierCode): Promise<PricingBundle[]> {
    try {
      const now = new Date();

      let query = this.db('pricing_bundles')
        .where('is_active', true)
        .where(function() {
          this.whereNull('available_from').orWhere('available_from', '<=', now);
        })
        .where(function() {
          this.whereNull('available_until').orWhere('available_until', '>', now);
        })
        .orderBy('sort_order', 'asc');

      const bundles = await query;
      const validBundles: PricingBundle[] = [];

      for (const bundle of bundles) {
        // Check compatibility with current tier
        const compatiblePlans = bundle.compatible_plans || [];
        if (currentTier && compatiblePlans.length > 0 && !compatiblePlans.includes(currentTier)) {
          continue;
        }

        // Check max purchases per user
        if (bundle.max_purchases_per_user) {
          const purchases = await this.db('transactions')
            .where('user_id', userId)
            .where('metadata', '@>', JSON.stringify({ bundle_id: bundle.id }))
            .where('status', 'succeeded')
            .count('* as count')
            .first();

          if (purchases && Number(purchases.count) >= bundle.max_purchases_per_user) {
            continue;
          }
        }

        validBundles.push({
          id: bundle.id,
          name: bundle.name,
          slug: bundle.slug,
          description: bundle.description,
          includedItems: bundle.included_items || [],
          basePrice: Number(bundle.base_price),
          bundlePrice: Number(bundle.bundle_price),
          savingsAmount: Number(bundle.savings_amount),
          savingsPercentage: Number(bundle.savings_percentage),
          stripePriceId: bundle.stripe_price_id,
          stripeProductId: bundle.stripe_product_id,
          compatiblePlans: bundle.compatible_plans || [],
          requiresSubscription: bundle.requires_subscription,
          maxPurchasesPerUser: bundle.max_purchases_per_user,
          availableFrom: bundle.available_from ? new Date(bundle.available_from) : undefined,
          availableUntil: bundle.available_until ? new Date(bundle.available_until) : undefined,
          isFeatured: bundle.is_featured,
          isActive: bundle.is_active,
          sortOrder: bundle.sort_order,
          metadata: bundle.metadata || {},
          createdAt: new Date(bundle.created_at),
          updatedAt: new Date(bundle.updated_at),
        });
      }

      return validBundles;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting available bundles:', { error: errorMessage, userId });
      throw new Error(`Failed to get available bundles: ${errorMessage}`);
    }
  }

  // =============================================================================
  // PERSONALIZED PRICING METHODS
  // =============================================================================

  /**
   * Calculate and update personalized pricing for a user
   */
  async calculatePersonalizedPricing(userId: string): Promise<PersonalizedPricing> {
    try {
      // Fetch user behavior data (this would typically come from user-service)
      const behaviorFactors = await this.fetchUserBehaviorFactors(userId);

      // Calculate engagement score (0-100)
      const engagementScore = this.calculateEngagementScore(behaviorFactors);

      // Calculate conversion likelihood (0-1)
      const conversionLikelihood = this.calculateConversionLikelihood(behaviorFactors, engagementScore);

      // Calculate price sensitivity (0-1, higher = more sensitive)
      const priceSensitivity = this.calculatePriceSensitivity(behaviorFactors);

      // Determine user segment
      const userSegment = this.determineUserSegment(behaviorFactors, engagementScore, conversionLikelihood);

      // Calculate recommended discount
      const recommendedDiscount = this.calculateRecommendedDiscount(
        engagementScore,
        conversionLikelihood,
        priceSensitivity,
        userSegment
      );

      // Calculate lifetime value prediction
      const lifetimeValuePrediction = this.calculateLTV(behaviorFactors, conversionLikelihood);

      // Generate tier recommendations
      const tierRecommendations = this.generateTierRecommendations(
        userSegment,
        recommendedDiscount,
        behaviorFactors
      );

      // Upsert personalized pricing record
      const [record] = await this.db('personalized_pricing')
        .insert({
          user_id: userId,
          engagement_score: engagementScore,
          conversion_likelihood: conversionLikelihood,
          price_sensitivity: priceSensitivity,
          lifetime_value_prediction: lifetimeValuePrediction,
          recommended_discount: recommendedDiscount,
          user_segment: userSegment,
          tier_recommendations: JSON.stringify(tierRecommendations),
          behavior_factors: JSON.stringify(behaviorFactors),
          days_since_signup: behaviorFactors.daysSinceSignup || 0,
          total_sessions: behaviorFactors.totalSessions || 0,
          matches_count: behaviorFactors.matchesCount || 0,
          messages_sent: behaviorFactors.messagesSent || 0,
          last_active_at: behaviorFactors.lastActiveAt,
          has_ever_subscribed: behaviorFactors.hasEverSubscribed || false,
          last_subscription_end: behaviorFactors.lastSubscriptionEnd,
          calculated_at: new Date(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        })
        .onConflict('user_id')
        .merge()
        .returning('*');

      return {
        id: record.id,
        userId: record.user_id,
        engagementScore: Number(record.engagement_score),
        conversionLikelihood: Number(record.conversion_likelihood),
        priceSensitivity: Number(record.price_sensitivity),
        lifetimeValuePrediction: record.lifetime_value_prediction ? Number(record.lifetime_value_prediction) : undefined,
        recommendedDiscount: record.recommended_discount ? Number(record.recommended_discount) : undefined,
        userSegment: record.user_segment,
        tierRecommendations,
        behaviorFactors,
        daysSinceSignup: record.days_since_signup,
        totalSessions: record.total_sessions,
        matchesCount: record.matches_count,
        messagesSent: record.messages_sent,
        lastActiveAt: record.last_active_at ? new Date(record.last_active_at) : undefined,
        hasEverSubscribed: record.has_ever_subscribed,
        lastSubscriptionEnd: record.last_subscription_end ? new Date(record.last_subscription_end) : undefined,
        calculatedAt: new Date(record.calculated_at),
        expiresAt: record.expires_at ? new Date(record.expires_at) : undefined,
        metadata: record.metadata || {},
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error calculating personalized pricing:', { error: errorMessage, userId });
      throw new Error(`Failed to calculate personalized pricing: ${errorMessage}`);
    }
  }

  // =============================================================================
  // ADMIN METHODS
  // =============================================================================

  /**
   * Create a new promotion
   */
  async createPromotion(request: CreatePromotionRequest): Promise<Promotion> {
    try {
      const [promo] = await this.db('promotions')
        .insert({
          code: request.code.toUpperCase(),
          name: request.name,
          description: request.description,
          discount_type: request.discountType,
          discount_value: request.discountValue,
          min_purchase_amount: request.minPurchaseAmount,
          max_discount_amount: request.maxDiscountAmount,
          applicable_plans: JSON.stringify(request.applicablePlans),
          applicable_billing_cycles: JSON.stringify(request.applicableBillingCycles),
          excluded_plans: JSON.stringify(request.excludedPlans || []),
          max_uses: request.maxUses,
          max_uses_per_user: request.maxUsesPerUser || 1,
          first_time_only: request.firstTimeOnly || false,
          requires_payment_method: request.requiresPaymentMethod ?? true,
          stackable: request.stackable || false,
          priority: request.priority || 0,
          starts_at: request.startsAt,
          ends_at: request.endsAt,
          targeting_rules: JSON.stringify(request.targetingRules || {}),
          metadata: JSON.stringify(request.metadata || {}),
          created_by: request.createdBy,
        })
        .returning('*');

      return {
        id: promo.id,
        code: promo.code,
        name: promo.name,
        description: promo.description,
        discountType: promo.discount_type,
        discountValue: Number(promo.discount_value),
        minPurchaseAmount: promo.min_purchase_amount ? Number(promo.min_purchase_amount) : undefined,
        maxDiscountAmount: promo.max_discount_amount ? Number(promo.max_discount_amount) : undefined,
        applicablePlans: promo.applicable_plans || [],
        applicableBillingCycles: promo.applicable_billing_cycles || [],
        excludedPlans: promo.excluded_plans || [],
        maxUses: promo.max_uses,
        maxUsesPerUser: promo.max_uses_per_user,
        currentUses: 0,
        firstTimeOnly: promo.first_time_only,
        requiresPaymentMethod: promo.requires_payment_method,
        stackable: promo.stackable,
        priority: promo.priority,
        startsAt: new Date(promo.starts_at),
        endsAt: new Date(promo.ends_at),
        isActive: promo.is_active,
        targetingRules: promo.targeting_rules || {},
        metadata: promo.metadata || {},
        createdBy: promo.created_by,
        createdAt: new Date(promo.created_at),
        updatedAt: new Date(promo.updated_at),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error creating promotion:', { error: errorMessage });
      throw new Error(`Failed to create promotion: ${errorMessage}`);
    }
  }

  /**
   * Update regional pricing
   */
  async updateRegionalPricing(request: UpdateRegionalPricingRequest): Promise<RegionalPricing> {
    try {
      const existing = await this.db('regional_pricing')
        .where('country_code', request.countryCode)
        .where(function() {
          if (request.regionCode) {
            this.where('region_code', request.regionCode);
          } else {
            this.whereNull('region_code');
          }
        })
        .first();

      const data: Record<string, unknown> = {};
      if (request.currencyCode !== undefined) data.currency_code = request.currencyCode;
      if (request.purchasingPowerIndex !== undefined) data.purchasing_power_index = request.purchasingPowerIndex;
      if (request.priceMultiplier !== undefined) data.price_multiplier = request.priceMultiplier;
      if (request.minPriceMultiplier !== undefined) data.min_price_multiplier = request.minPriceMultiplier;
      if (request.maxPriceMultiplier !== undefined) data.max_price_multiplier = request.maxPriceMultiplier;
      if (request.currencyConversionRate !== undefined) data.currency_conversion_rate = request.currencyConversionRate;
      if (request.isActive !== undefined) data.is_active = request.isActive;
      if (request.tierOverrides !== undefined) data.tier_overrides = JSON.stringify(request.tierOverrides);
      if (request.effectiveFrom !== undefined) data.effective_from = request.effectiveFrom;
      if (request.effectiveUntil !== undefined) data.effective_until = request.effectiveUntil;
      if (request.metadata !== undefined) data.metadata = JSON.stringify(request.metadata);

      let record;
      if (existing) {
        [record] = await this.db('regional_pricing')
          .where('id', existing.id)
          .update(data)
          .returning('*');
      } else {
        [record] = await this.db('regional_pricing')
          .insert({
            country_code: request.countryCode,
            region_code: request.regionCode,
            currency_code: request.currencyCode || 'USD',
            purchasing_power_index: request.purchasingPowerIndex || 1.0,
            price_multiplier: request.priceMultiplier || 1.0,
            min_price_multiplier: request.minPriceMultiplier || 0.3,
            max_price_multiplier: request.maxPriceMultiplier || 1.5,
            currency_conversion_rate: request.currencyConversionRate || 1.0,
            is_active: request.isActive ?? true,
            tier_overrides: JSON.stringify(request.tierOverrides || {}),
            effective_from: request.effectiveFrom || new Date(),
            effective_until: request.effectiveUntil,
            metadata: JSON.stringify(request.metadata || {}),
          })
          .returning('*');
      }

      return {
        id: record.id,
        countryCode: record.country_code,
        regionCode: record.region_code,
        currencyCode: record.currency_code,
        purchasingPowerIndex: Number(record.purchasing_power_index),
        priceMultiplier: Number(record.price_multiplier),
        minPriceMultiplier: Number(record.min_price_multiplier),
        maxPriceMultiplier: Number(record.max_price_multiplier),
        currencyConversionRate: Number(record.currency_conversion_rate),
        isActive: record.is_active,
        tierOverrides: record.tier_overrides || {},
        metadata: record.metadata || {},
        effectiveFrom: new Date(record.effective_from),
        effectiveUntil: record.effective_until ? new Date(record.effective_until) : undefined,
        createdAt: new Date(record.created_at),
        updatedAt: new Date(record.updated_at),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error updating regional pricing:', { error: errorMessage });
      throw new Error(`Failed to update regional pricing: ${errorMessage}`);
    }
  }

  /**
   * Create a price experiment
   */
  async createExperiment(request: CreateExperimentRequest): Promise<PriceExperiment> {
    try {
      // Start transaction
      const result = await this.db.transaction(async (trx) => {
        // Create experiment
        const [experiment] = await trx('price_experiments')
          .insert({
            name: request.name,
            description: request.description,
            hypothesis: request.hypothesis,
            status: 'draft',
            traffic_percentage: request.trafficPercentage,
            targeting_rules: JSON.stringify(request.targetingRules || {}),
            exclusion_rules: JSON.stringify(request.exclusionRules || {}),
            starts_at: request.startsAt,
            ends_at: request.endsAt,
            min_sample_size: request.minSampleSize || 1000,
            statistical_significance_target: request.statisticalSignificanceTarget || 0.95,
            success_metrics: JSON.stringify(request.successMetrics || []),
            created_by: request.createdBy,
          })
          .returning('*');

        // Create variants
        for (const variant of request.variants) {
          await trx('price_experiment_variants').insert({
            experiment_id: experiment.id,
            name: variant.name,
            is_control: variant.isControl,
            traffic_weight: variant.trafficWeight,
            plan_id: variant.planId,
            price_monthly: variant.priceMonthly,
            price_yearly: variant.priceYearly,
            price_3_months: variant.price3Months,
            price_6_months: variant.price6Months,
            stripe_price_id_monthly: variant.stripePriceIdMonthly,
            stripe_price_id_yearly: variant.stripePriceIdYearly,
            stripe_price_id_3_months: variant.stripePriceId3Months,
            stripe_price_id_6_months: variant.stripePriceId6Months,
            custom_features: JSON.stringify(variant.customFeatures || {}),
          });
        }

        return experiment;
      });

      return {
        id: result.id,
        name: result.name,
        description: result.description,
        hypothesis: result.hypothesis,
        status: result.status,
        trafficPercentage: Number(result.traffic_percentage),
        targetingRules: result.targeting_rules || {},
        exclusionRules: result.exclusion_rules || {},
        startsAt: result.starts_at ? new Date(result.starts_at) : undefined,
        endsAt: result.ends_at ? new Date(result.ends_at) : undefined,
        minSampleSize: result.min_sample_size,
        statisticalSignificanceTarget: Number(result.statistical_significance_target),
        successMetrics: result.success_metrics || [],
        createdBy: result.created_by,
        metadata: result.metadata || {},
        createdAt: new Date(result.created_at),
        updatedAt: new Date(result.updated_at),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error creating experiment:', { error: errorMessage });
      throw new Error(`Failed to create experiment: ${errorMessage}`);
    }
  }

  /**
   * Start an experiment
   */
  async startExperiment(experimentId: string): Promise<void> {
    try {
      await this.db('price_experiments')
        .where('id', experimentId)
        .where('status', 'draft')
        .update({
          status: 'running',
          starts_at: new Date(),
        });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error starting experiment:', { error: errorMessage, experimentId });
      throw new Error(`Failed to start experiment: ${errorMessage}`);
    }
  }

  /**
   * End an experiment
   */
  async endExperiment(experimentId: string): Promise<void> {
    try {
      await this.db('price_experiments')
        .where('id', experimentId)
        .whereIn('status', ['running', 'paused'])
        .update({
          status: 'completed',
          ends_at: new Date(),
        });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error ending experiment:', { error: errorMessage, experimentId });
      throw new Error(`Failed to end experiment: ${errorMessage}`);
    }
  }

  // =============================================================================
  // STRIPE INTEGRATION METHODS
  // =============================================================================

  /**
   * Create Stripe price for dynamic pricing
   */
  async createStripePriceForExperiment(
    variant: PriceExperimentVariant,
    billingCycle: BillingCycleType
  ): Promise<string> {
    try {
      const tierInfo = getTierByKey(variant.planId);
      if (!tierInfo) {
        throw new Error(`Unknown tier: ${variant.planId}`);
      }

      let unitAmount: number;
      let interval: 'month' | 'year';
      let intervalCount: number;

      switch (billingCycle) {
        case 'monthly':
          unitAmount = variant.priceMonthly ? Math.round(variant.priceMonthly * 100) : 0;
          interval = 'month';
          intervalCount = 1;
          break;
        case '3_months':
          unitAmount = variant.price3Months ? Math.round(variant.price3Months * 100) : 0;
          interval = 'month';
          intervalCount = 3;
          break;
        case '6_months':
          unitAmount = variant.price6Months ? Math.round(variant.price6Months * 100) : 0;
          interval = 'month';
          intervalCount = 6;
          break;
        case 'yearly':
          unitAmount = variant.priceYearly ? Math.round(variant.priceYearly * 100) : 0;
          interval = 'year';
          intervalCount = 1;
          break;
        default:
          throw new Error(`Invalid billing cycle: ${billingCycle}`);
      }

      const price = await this.stripe.prices.create({
        product: tierInfo.stripeProductId,
        unit_amount: unitAmount,
        currency: 'usd',
        recurring: {
          interval,
          interval_count: intervalCount,
        },
        metadata: {
          experiment_id: variant.experimentId,
          variant_id: variant.id,
          variant_name: variant.name,
          tier: variant.planId,
          billing_cycle: billingCycle,
        },
      });

      // Update variant with Stripe price ID
      const updateField = `stripe_price_id_${billingCycle === 'yearly' ? 'yearly' : billingCycle}`;
      await this.db('price_experiment_variants')
        .where('id', variant.id)
        .update({ [updateField]: price.id });

      return price.id;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error creating Stripe price:', { error: errorMessage });
      throw new Error(`Failed to create Stripe price: ${errorMessage}`);
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private getBasePrice(tierCode: SubscriptionTierCode, billingCycle: BillingCycleType): number {
    return BASE_PRICES[tierCode]?.[billingCycle] || 0;
  }

  private getMinimumPrice(tierCode: SubscriptionTierCode, billingCycle: BillingCycleType): number {
    const basePrice = this.getBasePrice(tierCode, billingCycle);
    return Math.round(basePrice * 0.3); // 30% of base price as minimum
  }

  private async getRegionalPricing(
    countryCode: CountryCode,
    regionCode?: string
  ): Promise<RegionalPricing | null> {
    try {
      const now = new Date();

      let query = this.db('regional_pricing')
        .where('country_code', countryCode)
        .where('is_active', true)
        .where('effective_from', '<=', now)
        .where(function() {
          this.whereNull('effective_until').orWhere('effective_until', '>', now);
        })
        .orderBy('effective_from', 'desc');

      if (regionCode) {
        query = query.where(function() {
          this.where('region_code', regionCode).orWhereNull('region_code');
        }).orderBy('region_code', 'desc');
      }

      const record = await query.first();
      if (!record) return null;

      return {
        id: record.id,
        countryCode: record.country_code,
        regionCode: record.region_code,
        currencyCode: record.currency_code,
        purchasingPowerIndex: Number(record.purchasing_power_index),
        priceMultiplier: Number(record.price_multiplier),
        minPriceMultiplier: Number(record.min_price_multiplier),
        maxPriceMultiplier: Number(record.max_price_multiplier),
        currencyConversionRate: Number(record.currency_conversion_rate),
        isActive: record.is_active,
        tierOverrides: record.tier_overrides || {},
        metadata: record.metadata || {},
        effectiveFrom: new Date(record.effective_from),
        effectiveUntil: record.effective_until ? new Date(record.effective_until) : undefined,
        createdAt: new Date(record.created_at),
        updatedAt: new Date(record.updated_at),
      };
    } catch (error) {
      logger.warn('Error getting regional pricing:', error);
      return null;
    }
  }

  private async getPersonalizedPricingData(userId: string): Promise<PersonalizedPricing | null> {
    try {
      const record = await this.db('personalized_pricing')
        .where('user_id', userId)
        .where(function() {
          this.whereNull('expires_at').orWhere('expires_at', '>', new Date());
        })
        .first();

      if (!record) return null;

      return {
        id: record.id,
        userId: record.user_id,
        engagementScore: Number(record.engagement_score),
        conversionLikelihood: Number(record.conversion_likelihood),
        priceSensitivity: Number(record.price_sensitivity),
        lifetimeValuePrediction: record.lifetime_value_prediction ? Number(record.lifetime_value_prediction) : undefined,
        recommendedDiscount: record.recommended_discount ? Number(record.recommended_discount) : undefined,
        userSegment: record.user_segment,
        tierRecommendations: record.tier_recommendations || [],
        behaviorFactors: record.behavior_factors || {},
        daysSinceSignup: record.days_since_signup,
        totalSessions: record.total_sessions,
        matchesCount: record.matches_count,
        messagesSent: record.messages_sent,
        lastActiveAt: record.last_active_at ? new Date(record.last_active_at) : undefined,
        hasEverSubscribed: record.has_ever_subscribed,
        lastSubscriptionEnd: record.last_subscription_end ? new Date(record.last_subscription_end) : undefined,
        calculatedAt: new Date(record.calculated_at),
        expiresAt: record.expires_at ? new Date(record.expires_at) : undefined,
        metadata: record.metadata || {},
      };
    } catch (error) {
      logger.warn('Error getting personalized pricing:', error);
      return null;
    }
  }

  private async getApplicablePricingRules(
    userId: string,
    tierCode: SubscriptionTierCode,
    billingCycle: BillingCycleType
  ): Promise<PricingRule[]> {
    try {
      const now = new Date();

      const rules = await this.db('pricing_rules')
        .where('is_active', true)
        .where(function() {
          this.whereNull('starts_at').orWhere('starts_at', '<=', now);
        })
        .where(function() {
          this.whereNull('ends_at').orWhere('ends_at', '>', now);
        })
        .orderBy('priority', 'desc');

      const applicableRules: PricingRule[] = [];

      for (const rule of rules) {
        const conditions = rule.conditions || {};
        const isApplicable = await this.evaluateRuleConditions(conditions, userId, tierCode);

        if (isApplicable) {
          applicableRules.push({
            id: rule.id,
            name: rule.name,
            description: rule.description,
            ruleType: rule.rule_type,
            conditions: rule.conditions || {},
            actions: rule.actions || {},
            priority: rule.priority,
            stackable: rule.stackable,
            maxApplications: rule.max_applications,
            startsAt: rule.starts_at ? new Date(rule.starts_at) : undefined,
            endsAt: rule.ends_at ? new Date(rule.ends_at) : undefined,
            isActive: rule.is_active,
            createdBy: rule.created_by,
            metadata: rule.metadata || {},
            createdAt: new Date(rule.created_at),
            updatedAt: new Date(rule.updated_at),
          });
        }
      }

      return applicableRules;
    } catch (error) {
      logger.warn('Error getting pricing rules:', error);
      return [];
    }
  }

  private async evaluateRuleConditions(
    conditions: RuleConditions,
    userId: string,
    tierCode: SubscriptionTierCode
  ): Promise<boolean> {
    // Time-based conditions
    if (conditions.daysOfWeek && conditions.daysOfWeek.length > 0) {
      const currentDay = new Date().getDay();
      if (!conditions.daysOfWeek.includes(currentDay)) return false;
    }

    if (conditions.hoursOfDay && conditions.hoursOfDay.length > 0) {
      const currentHour = new Date().getHours();
      if (!conditions.hoursOfDay.includes(currentHour)) return false;
    }

    // Tier conditions
    if (conditions.currentTier && conditions.currentTier.length > 0) {
      if (!conditions.currentTier.includes(tierCode)) return false;
    }

    // User attribute conditions (would need to fetch user data)
    if (conditions.minSubscriptionMonths !== undefined) {
      const subscription = await this.db('user_subscriptions')
        .where('user_id', userId)
        .where('status', 'active')
        .first();

      if (subscription) {
        const monthsActive = Math.floor(
          (Date.now() - new Date(subscription.current_period_start).getTime()) /
          (30 * 24 * 60 * 60 * 1000)
        );
        if (monthsActive < conditions.minSubscriptionMonths) return false;
      } else {
        return false;
      }
    }

    return true;
  }

  private applyPricingRule(
    rule: PricingRule,
    currentPrice: number
  ): { newPrice: number; adjustment: PriceAdjustment } | null {
    const actions = rule.actions;
    let newPrice = currentPrice;
    let amountAdjusted = 0;

    switch (actions.discountType) {
      case 'percentage':
        amountAdjusted = Math.round(currentPrice * (actions.discountValue / 100));
        newPrice = currentPrice - amountAdjusted;
        break;
      case 'fixed_amount':
        amountAdjusted = Math.min(actions.discountValue * 100, currentPrice);
        newPrice = currentPrice - amountAdjusted;
        break;
    }

    if (amountAdjusted === 0) return null;

    return {
      newPrice,
      adjustment: {
        type: 'rule',
        name: rule.name,
        description: rule.description,
        adjustmentType: actions.discountType,
        adjustmentValue: actions.discountValue,
        amountAdjusted: amountAdjusted / 100,
        priority: rule.priority,
        source: rule.id,
      },
    };
  }

  private applyPromotionDiscount(
    promotion: Promotion,
    currentPrice: number
  ): { applied: boolean; newPrice: number; amountSaved: number } {
    let newPrice = currentPrice;
    let amountSaved = 0;

    switch (promotion.discountType) {
      case 'percentage':
        amountSaved = Math.round(currentPrice * (promotion.discountValue / 100));
        if (promotion.maxDiscountAmount) {
          amountSaved = Math.min(amountSaved, promotion.maxDiscountAmount * 100);
        }
        newPrice = currentPrice - amountSaved;
        break;
      case 'fixed_amount':
        amountSaved = Math.min(promotion.discountValue * 100, currentPrice);
        newPrice = currentPrice - amountSaved;
        break;
      case 'free_trial_days':
      case 'tier_upgrade':
        // These don't affect the price directly
        return { applied: true, newPrice: currentPrice, amountSaved: 0 };
    }

    return { applied: true, newPrice, amountSaved };
  }

  private async validatePromotionTargeting(
    rules: PromotionTargetingRules,
    userId: string
  ): Promise<{ valid: boolean; reason?: string }> {
    if (!rules || Object.keys(rules).length === 0) {
      return { valid: true };
    }

    // Check new user requirement
    if (rules.newUser) {
      const existingSubscription = await this.db('user_subscriptions')
        .where('user_id', userId)
        .whereNot('status', 'canceled')
        .first();

      if (existingSubscription) {
        return { valid: false, reason: 'Promotion is only for new users' };
      }
    }

    // Check has ever subscribed requirement
    if (rules.hasEverSubscribed !== undefined) {
      const anySubscription = await this.db('user_subscriptions')
        .where('user_id', userId)
        .first();

      if (rules.hasEverSubscribed && !anySubscription) {
        return { valid: false, reason: 'Promotion requires previous subscription' };
      }
      if (!rules.hasEverSubscribed && anySubscription) {
        return { valid: false, reason: 'Promotion is only for users who have never subscribed' };
      }
    }

    // Additional targeting checks would go here

    return { valid: true };
  }

  private async checkExperimentEligibility(
    experiment: { targeting_rules: any; exclusion_rules: any },
    userId: string
  ): Promise<boolean> {
    const targeting = experiment.targeting_rules || {};
    const exclusions = experiment.exclusion_rules || {};

    // Check exclusions first
    if (exclusions.excludeSubscribed) {
      const subscription = await this.db('user_subscriptions')
        .where('user_id', userId)
        .where('status', 'active')
        .first();
      if (subscription) return false;
    }

    if (exclusions.excludeInOtherExperiments) {
      const otherAssignment = await this.db('user_experiment_assignments as uea')
        .join('price_experiments as pe', 'uea.experiment_id', 'pe.id')
        .where('uea.user_id', userId)
        .where('pe.status', 'running')
        .first();
      if (otherAssignment) return false;
    }

    // Check targeting requirements
    if (targeting.newUsersOnly) {
      const existingSubscription = await this.db('user_subscriptions')
        .where('user_id', userId)
        .first();
      if (existingSubscription) return false;
    }

    return true;
  }

  private selectVariantByWeight<T extends { id: string; traffic_weight: number }>(variants: T[]): T {
    const totalWeight = variants.reduce((sum, v) => sum + Number(v.traffic_weight), 0);
    let random = Math.random() * totalWeight;

    for (const variant of variants) {
      random -= Number(variant.traffic_weight);
      if (random <= 0) return variant;
    }

    return variants[0];
  }

  private mapToExperimentPrice(
    experiment: { id: string; name: string },
    variant: {
      id: string;
      name: string;
      is_control: boolean;
      plan_id: string;
      price_monthly?: number;
      price_yearly?: number;
      price_3_months?: number;
      price_6_months?: number;
      stripe_price_id_monthly?: string;
      stripe_price_id_yearly?: string;
      stripe_price_id_3_months?: string;
      stripe_price_id_6_months?: string;
    },
    billingCycle: BillingCycleType,
    assignedAt: Date
  ): ExperimentPrice {
    let price: number;
    let stripePriceId: string;

    switch (billingCycle) {
      case 'monthly':
        price = Number(variant.price_monthly) || 0;
        stripePriceId = variant.stripe_price_id_monthly || '';
        break;
      case '3_months':
        price = Number(variant.price_3_months) || 0;
        stripePriceId = variant.stripe_price_id_3_months || '';
        break;
      case '6_months':
        price = Number(variant.price_6_months) || 0;
        stripePriceId = variant.stripe_price_id_6_months || '';
        break;
      case 'yearly':
        price = Number(variant.price_yearly) || 0;
        stripePriceId = variant.stripe_price_id_yearly || '';
        break;
    }

    return {
      experimentId: experiment.id,
      experimentName: experiment.name,
      variantId: variant.id,
      variantName: variant.name,
      isControl: variant.is_control,
      planId: variant.plan_id,
      billingCycle,
      price,
      stripePriceId,
      assignedAt,
    };
  }

  private calculatePValue(variant: VariantResults, control: VariantResults): number {
    // Simplified two-proportion z-test
    const p1 = variant.conversionRate;
    const p2 = control.conversionRate;
    const n1 = variant.participants;
    const n2 = control.participants;

    if (n1 === 0 || n2 === 0) return 1;

    const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));

    if (se === 0) return 1;

    const z = Math.abs(p1 - p2) / se;

    // Approximate p-value from z-score
    return 2 * (1 - this.normalCDF(z));
  }

  private normalCDF(x: number): number {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  private generateExperimentRecommendations(
    results: VariantResults[],
    isSignificant: boolean,
    winner?: string
  ): string[] {
    const recommendations: string[] = [];

    if (!isSignificant) {
      const totalParticipants = results.reduce((sum, r) => sum + r.participants, 0);
      if (totalParticipants < 1000) {
        recommendations.push('Continue running the experiment to gather more data for statistical significance.');
      } else {
        recommendations.push('Consider extending the experiment duration or increasing traffic allocation.');
      }
    }

    if (winner) {
      recommendations.push(`Consider implementing the winning variant "${winner}" as the default pricing.`);
    }

    const bestRevenue = results.reduce((best, r) =>
      r.revenuePerUser > best.revenuePerUser ? r : best
    , results[0]);

    if (bestRevenue && !bestRevenue.isControl) {
      recommendations.push(
        `Variant "${bestRevenue.variantName}" shows ${((bestRevenue.revenuePerUser / results.find(r => r.isControl)!.revenuePerUser - 1) * 100).toFixed(1)}% higher revenue per user.`
      );
    }

    return recommendations;
  }

  private getPersonalizedPricingReason(pricing: PersonalizedPricing): string {
    const segment = pricing.userSegment;
    const engagement = pricing.engagementScore;

    if (segment === 'high_value') {
      return 'Loyalty discount for valued user';
    } else if (segment === 'at_risk') {
      return 'Special offer to encourage continued engagement';
    } else if (segment === 'win_back_target') {
      return 'Welcome back offer';
    } else if (segment === 'upgrade_candidate') {
      return 'Upgrade incentive for engaged user';
    } else if (engagement > 80) {
      return 'Reward for high engagement';
    } else if (engagement < 30) {
      return 'Incentive to increase engagement';
    }

    return 'Personalized offer based on your activity';
  }

  private async fetchUserBehaviorFactors(userId: string): Promise<BehaviorFactors & {
    daysSinceSignup?: number;
    totalSessions?: number;
    matchesCount?: number;
    messagesSent?: number;
    lastActiveAt?: Date;
    hasEverSubscribed?: boolean;
    lastSubscriptionEnd?: Date;
  }> {
    // In a real implementation, this would fetch data from user-service
    // For now, return default values that would be populated by the user service
    return {
      dailyActiveStreak: 0,
      averageSessionDuration: 0,
      profileCompleteness: 0,
      photoCount: 0,
      swipeRate: 0,
      matchRate: 0,
      responseRate: 0,
      premiumFeatureUsage: 0,
      totalSpent: 0,
      referralCount: 0,
      daysSinceSignup: 0,
      totalSessions: 0,
      matchesCount: 0,
      messagesSent: 0,
    };
  }

  private calculateEngagementScore(factors: BehaviorFactors): number {
    // Weighted engagement score calculation
    let score = 0;

    // Profile completeness (20%)
    score += (factors.profileCompleteness || 0) * 0.2;

    // Activity metrics (40%)
    const activityScore = Math.min(100, (factors.dailyActiveStreak || 0) * 5);
    score += activityScore * 0.2;

    const sessionScore = Math.min(100, (factors.averageSessionDuration || 0) / 10 * 100);
    score += sessionScore * 0.2;

    // Interaction metrics (40%)
    const matchScore = Math.min(100, (factors.matchRate || 0) * 100);
    score += matchScore * 0.2;

    const responseScore = Math.min(100, (factors.responseRate || 0) * 100);
    score += responseScore * 0.2;

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  private calculateConversionLikelihood(factors: BehaviorFactors, engagementScore: number): number {
    // Base conversion likelihood from engagement
    let likelihood = engagementScore / 200; // 0 to 0.5

    // Boost for premium feature usage
    if (factors.premiumFeatureUsage > 0) {
      likelihood += 0.2;
    }

    // Boost for high engagement
    if (engagementScore > 70) {
      likelihood += 0.15;
    }

    // Boost for previous purchases
    if (factors.totalSpent > 0) {
      likelihood += 0.1;
    }

    return Math.min(1, Math.max(0, likelihood));
  }

  private calculatePriceSensitivity(factors: BehaviorFactors): number {
    // Higher score = more price sensitive

    let sensitivity = 0.5; // Default moderate sensitivity

    // Users who have spent money are less price sensitive
    if (factors.totalSpent > 100) {
      sensitivity -= 0.2;
    } else if (factors.totalSpent > 0) {
      sensitivity -= 0.1;
    }

    // Users with high engagement may be less price sensitive
    if (factors.dailyActiveStreak > 14) {
      sensitivity -= 0.1;
    }

    // Users who haven't converted after many sessions are more price sensitive
    if (factors.totalSpent === 0 && (factors as any).totalSessions > 30) {
      sensitivity += 0.2;
    }

    return Math.min(1, Math.max(0, sensitivity));
  }

  private determineUserSegment(
    factors: BehaviorFactors & { hasEverSubscribed?: boolean; daysSinceSignup?: number },
    engagementScore: number,
    conversionLikelihood: number
  ): UserSegment {
    if (factors.hasEverSubscribed && factors.totalSpent > 100) {
      return 'high_value';
    }

    if ((factors.daysSinceSignup || 0) < 7) {
      return 'new_user';
    }

    if (engagementScore > 70 && !factors.hasEverSubscribed) {
      return 'upgrade_candidate';
    }

    if (engagementScore > 50 && !factors.hasEverSubscribed) {
      return 'engaged_free';
    }

    if (engagementScore < 30 && factors.hasEverSubscribed) {
      return 'at_risk';
    }

    if (factors.hasEverSubscribed && factors.totalSpent === 0) {
      return 'win_back_target';
    }

    return 'casual';
  }

  private calculateRecommendedDiscount(
    engagementScore: number,
    conversionLikelihood: number,
    priceSensitivity: number,
    segment: UserSegment
  ): number {
    let discount = 0;

    // Segment-based discounts
    switch (segment) {
      case 'new_user':
        discount = 20; // 20% for new users
        break;
      case 'upgrade_candidate':
        discount = 15; // 15% for engaged free users
        break;
      case 'win_back_target':
        discount = 30; // 30% for win-back
        break;
      case 'at_risk':
        discount = 25; // 25% for at-risk
        break;
      case 'high_value':
        discount = 10; // 10% loyalty discount
        break;
      case 'engaged_free':
        discount = 15;
        break;
      default:
        discount = 10;
    }

    // Adjust based on price sensitivity
    if (priceSensitivity > 0.7) {
      discount += 10;
    } else if (priceSensitivity < 0.3) {
      discount -= 5;
    }

    // Cap at reasonable limits
    return Math.min(50, Math.max(0, discount));
  }

  private calculateLTV(factors: BehaviorFactors, conversionLikelihood: number): number {
    // Simplified LTV calculation
    const avgMonthlyRevenue = 19.99; // Average subscription price
    const avgRetentionMonths = 6;

    const baseLTV = avgMonthlyRevenue * avgRetentionMonths;
    const adjustedLTV = baseLTV * conversionLikelihood;

    // Adjust for past spending
    return adjustedLTV + (factors.totalSpent || 0);
  }

  private generateTierRecommendations(
    segment: UserSegment,
    recommendedDiscount: number,
    factors: BehaviorFactors
  ): TierRecommendation[] {
    const recommendations: TierRecommendation[] = [];

    // Recommend tier based on segment and behavior
    const tierOrder: SubscriptionTierCode[] = ['basic', 'plus', 'premium', 'premium_plus', 'elite'];

    let recommendedTier: SubscriptionTierCode;
    let confidence: number;

    switch (segment) {
      case 'high_value':
        recommendedTier = 'elite';
        confidence = 0.8;
        break;
      case 'upgrade_candidate':
        recommendedTier = 'premium';
        confidence = 0.7;
        break;
      case 'engaged_free':
        recommendedTier = 'plus';
        confidence = 0.6;
        break;
      case 'new_user':
        recommendedTier = 'basic';
        confidence = 0.5;
        break;
      default:
        recommendedTier = 'basic';
        confidence = 0.4;
    }

    const tierIndex = tierOrder.indexOf(recommendedTier);

    // Add primary recommendation
    const originalPrice = BASE_PRICES[recommendedTier].monthly / 100;
    const discountedPrice = originalPrice * (1 - recommendedDiscount / 100);

    recommendations.push({
      tierCode: recommendedTier,
      recommendedPrice: Math.round(discountedPrice * 100) / 100,
      originalPrice,
      discountPercentage: recommendedDiscount,
      confidence,
      reason: `Best value based on your ${segment.replace('_', ' ')} profile`,
    });

    // Add lower tier option if not already basic
    if (tierIndex > 0) {
      const lowerTier = tierOrder[tierIndex - 1];
      const lowerOriginal = BASE_PRICES[lowerTier].monthly / 100;
      recommendations.push({
        tierCode: lowerTier,
        recommendedPrice: Math.round(lowerOriginal * (1 - recommendedDiscount / 100) * 100) / 100,
        originalPrice: lowerOriginal,
        discountPercentage: recommendedDiscount,
        confidence: confidence * 0.7,
        reason: 'Budget-friendly option',
      });
    }

    return recommendations;
  }

  private async logPricingAudit(data: Partial<PricingAuditLog>): Promise<void> {
    try {
      await this.db('pricing_audit_log').insert({
        user_id: data.userId,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId,
        plan_id: data.planId,
        billing_cycle: data.billingCycle,
        base_price: data.basePrice,
        final_price: data.finalPrice,
        adjustments_applied: JSON.stringify(data.adjustmentsApplied || []),
        promotions_applied: JSON.stringify(data.promotionsApplied || []),
        regional_adjustment: JSON.stringify(data.regionalAdjustment || {}),
        personalized_adjustment: JSON.stringify(data.personalizedAdjustment || {}),
        experiment_info: JSON.stringify(data.experimentInfo || {}),
        country_code: data.countryCode,
        currency_code: data.currencyCode,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        performed_by: data.performedBy,
        reason: data.reason,
        request_context: JSON.stringify(data.requestContext || {}),
        metadata: JSON.stringify(data.metadata || {}),
      });
    } catch (error) {
      logger.warn('Error logging pricing audit:', error);
    }
  }
}

export const dynamicPricingService = new DynamicPricingService();
export default dynamicPricingService;
