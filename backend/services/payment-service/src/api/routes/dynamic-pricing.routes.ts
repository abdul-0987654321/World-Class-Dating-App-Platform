/**
 * Dynamic Pricing Routes
 *
 * API routes for the dynamic pricing system including:
 * - Personalized pricing endpoints
 * - Regional pricing endpoints
 * - Promotion management
 * - A/B testing experiments
 * - Bundle pricing
 * - Admin management endpoints
 */

import { Router } from 'express';

import {
  GetPersonalizedPriceDto,
  GetRegionalPriceParamsDto,
  GetRegionalPriceQueryDto,
  GetPriceCatalogParamsDto,
  ApplyPromoCodeDto,
  GetActivePromotionsParamsDto,
  GetActivePromotionsQueryDto,
  ValidatePromoCodeParamsDto,
  ValidatePromoCodeQueryDto,
  CreatePromotionDto,
  RunPriceExperimentDto,
  GetExperimentResultsParamsDto,
  RecordExperimentConversionDto,
  CreateExperimentDto,
  ExperimentIdParamDto,
  GetAvailableBundlesParamsDto,
  GetAvailableBundlesQueryDto,
  CalculatePersonalizedPricingParamsDto,
  UpdateRegionalPricingParamsDto,
  UpdateRegionalPricingDto,
  RecordPromotionUsageDto,
} from '../../dto/dynamic-pricing.dto';
import { validateBody, validateParams, validateQuery } from '../../dto/validation.middleware';
import { DynamicPricingController } from '../controllers/dynamic-pricing.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();
const dynamicPricingController = new DynamicPricingController();

// =============================================================================
// PRICING ROUTES (Authenticated)
// =============================================================================

/**
 * Get personalized price for a user and plan
 * POST /api/v1/pricing/personalized
 *
 * Body:
 * - userId: string (required) - The user ID
 * - planId: string (required) - The subscription plan ID (tier)
 * - billingCycle?: string - monthly, 3_months, 6_months, yearly
 * - countryCode?: string - ISO 3166-1 alpha-2 country code
 * - includePromotions?: boolean - Whether to include applicable promotions
 */
router.post(
  '/personalized',
  authenticate,
  validateBody(GetPersonalizedPriceDto),
  dynamicPricingController.getPersonalizedPrice.bind(dynamicPricingController)
);

/**
 * Get regional price for a plan and country
 * GET /api/v1/pricing/regional/:planId/:countryCode
 *
 * Params:
 * - planId: string (required) - The subscription plan ID
 * - countryCode: string (required) - ISO 3166-1 alpha-2 country code
 *
 * Query:
 * - regionCode?: string - Optional region/state code
 * - billingCycle?: string - monthly, 3_months, 6_months, yearly
 */
router.get(
  '/regional/:planId/:countryCode',
  validateParams(GetRegionalPriceParamsDto),
  validateQuery(GetRegionalPriceQueryDto),
  dynamicPricingController.getRegionalPrice.bind(dynamicPricingController)
);

/**
 * Get full price catalog for a country
 * GET /api/v1/pricing/catalog/:countryCode
 *
 * Returns pricing for all tiers and billing cycles for a specific country
 */
router.get(
  '/catalog/:countryCode',
  validateParams(GetPriceCatalogParamsDto),
  dynamicPricingController.getPriceCatalog.bind(dynamicPricingController)
);

// =============================================================================
// PROMOTION ROUTES
// =============================================================================

/**
 * Apply a promo code
 * POST /api/v1/pricing/promo/apply
 *
 * Body:
 * - userId: string (required) - The user ID
 * - code: string (required) - The promo code
 * - planId: string (required) - The subscription plan ID
 * - billingCycle: string (required) - The billing cycle
 */
router.post(
  '/promo/apply',
  authenticate,
  validateBody(ApplyPromoCodeDto),
  dynamicPricingController.applyPromoCode.bind(dynamicPricingController)
);

/**
 * Get active promotions for a user
 * GET /api/v1/pricing/promo/active/:userId
 *
 * Query:
 * - planId?: string - Filter by plan ID
 * - billingCycle?: string - Filter by billing cycle
 * - countryCode?: string - Filter by country
 */
router.get(
  '/promo/active/:userId',
  authenticate,
  validateParams(GetActivePromotionsParamsDto),
  validateQuery(GetActivePromotionsQueryDto),
  dynamicPricingController.getActivePromotions.bind(dynamicPricingController)
);

/**
 * Validate a promo code without applying
 * GET /api/v1/pricing/promo/validate/:code
 *
 * Query:
 * - userId: string (required) - The user ID
 * - planId: string (required) - The plan ID
 * - billingCycle: string (required) - The billing cycle
 */
router.get(
  '/promo/validate/:code',
  authenticate,
  validateParams(ValidatePromoCodeParamsDto),
  validateQuery(ValidatePromoCodeQueryDto),
  dynamicPricingController.validatePromoCode.bind(dynamicPricingController)
);

/**
 * Record promotion usage (Internal use - called after successful payment)
 * POST /api/v1/pricing/promo/record-usage
 */
router.post(
  '/promo/record-usage',
  authenticate,
  validateBody(RecordPromotionUsageDto),
  dynamicPricingController.recordPromotionUsage.bind(dynamicPricingController)
);

// =============================================================================
// EXPERIMENT ROUTES
// =============================================================================

/**
 * Run price experiment for a user
 * POST /api/v1/pricing/experiment/run
 *
 * Body:
 * - experimentId: string (required) - The experiment ID
 * - userId: string (required) - The user ID
 * - planId?: string - Optional plan filter
 * - billingCycle?: string - Optional billing cycle filter
 */
router.post(
  '/experiment/run',
  authenticate,
  validateBody(RunPriceExperimentDto),
  dynamicPricingController.runPriceExperiment.bind(dynamicPricingController)
);

/**
 * Get experiment results
 * GET /api/v1/pricing/experiment/:experimentId/results
 */
router.get(
  '/experiment/:experimentId/results',
  authenticate,
  validateParams(GetExperimentResultsParamsDto),
  dynamicPricingController.getExperimentResults.bind(dynamicPricingController)
);

/**
 * Record experiment conversion
 * POST /api/v1/pricing/experiment/conversion
 */
router.post(
  '/experiment/conversion',
  authenticate,
  validateBody(RecordExperimentConversionDto),
  dynamicPricingController.recordExperimentConversion.bind(dynamicPricingController)
);

// =============================================================================
// BUNDLE ROUTES
// =============================================================================

/**
 * Get available bundles for a user
 * GET /api/v1/pricing/bundles/:userId
 *
 * Query:
 * - currentTier?: string - The user's current subscription tier
 */
router.get(
  '/bundles/:userId',
  authenticate,
  validateParams(GetAvailableBundlesParamsDto),
  validateQuery(GetAvailableBundlesQueryDto),
  dynamicPricingController.getAvailableBundles.bind(dynamicPricingController)
);

// =============================================================================
// PERSONALIZED PRICING ROUTES
// =============================================================================

/**
 * Calculate personalized pricing for a user
 * POST /api/v1/pricing/personalized/calculate/:userId
 *
 * Recalculates and stores personalized pricing data for a user
 * based on their behavior and engagement metrics.
 */
router.post(
  '/personalized/calculate/:userId',
  authenticate,
  validateParams(CalculatePersonalizedPricingParamsDto),
  dynamicPricingController.calculatePersonalizedPricing.bind(dynamicPricingController)
);

// =============================================================================
// ADMIN ROUTES
// All admin routes require authentication and admin role
// =============================================================================

/**
 * Create a new promotion
 * POST /api/v1/pricing/admin/promotions
 */
router.post(
  '/admin/promotions',
  authenticate,
  requireAdmin,
  validateBody(CreatePromotionDto),
  dynamicPricingController.createPromotion.bind(dynamicPricingController)
);

/**
 * Update regional pricing for a country
 * PUT /api/v1/pricing/admin/regional/:countryCode
 */
router.put(
  '/admin/regional/:countryCode',
  authenticate,
  requireAdmin,
  validateParams(UpdateRegionalPricingParamsDto),
  validateBody(UpdateRegionalPricingDto),
  dynamicPricingController.updateRegionalPricing.bind(dynamicPricingController)
);

/**
 * Create a new price experiment
 * POST /api/v1/pricing/admin/experiments
 */
router.post(
  '/admin/experiments',
  authenticate,
  requireAdmin,
  validateBody(CreateExperimentDto),
  dynamicPricingController.createExperiment.bind(dynamicPricingController)
);

/**
 * Start an experiment
 * POST /api/v1/pricing/admin/experiments/:experimentId/start
 */
router.post(
  '/admin/experiments/:experimentId/start',
  authenticate,
  requireAdmin,
  validateParams(ExperimentIdParamDto),
  dynamicPricingController.startExperiment.bind(dynamicPricingController)
);

/**
 * End an experiment
 * POST /api/v1/pricing/admin/experiments/:experimentId/end
 */
router.post(
  '/admin/experiments/:experimentId/end',
  authenticate,
  requireAdmin,
  validateParams(ExperimentIdParamDto),
  dynamicPricingController.endExperiment.bind(dynamicPricingController)
);

export default router;
