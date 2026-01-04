/**
 * Dynamic Pricing Controller
 *
 * Handles HTTP endpoints for the dynamic pricing system including:
 * - Getting personalized prices
 * - Regional pricing lookups
 * - Promo code application
 * - Promotion management
 * - A/B testing experiments
 * - Bundle management
 * - Admin operations
 */

import { Request, Response } from 'express';
import { createLogger } from '@flamoral/backend-shared';
import { DynamicPricingService } from '../../domain/services/dynamic-pricing.service';
import {
  GetPersonalizedPriceRequest,
  GetRegionalPriceRequest,
  ApplyPromoCodeRequest,
  GetActivePromotionsRequest,
  RunPriceExperimentRequest,
  CreatePromotionRequest,
  CreateExperimentRequest,
  UpdateRegionalPricingRequest,
  SubscriptionTierCode,
  BillingCycleType,
} from '../../types/dynamic-pricing.types';

const logger = createLogger('dynamic-pricing-controller');

export class DynamicPricingController {
  private pricingService: DynamicPricingService;

  constructor(pricingService?: DynamicPricingService) {
    this.pricingService = pricingService || new DynamicPricingService();
  }

  // =============================================================================
  // PRICING ENDPOINTS
  // =============================================================================

  /**
   * Get personalized price for a user and plan
   * POST /api/v1/pricing/personalized
   */
  async getPersonalizedPrice(req: Request, res: Response): Promise<Response> {
    try {
      const {
        userId,
        planId,
        billingCycle,
        countryCode,
        includePromotions,
      } = req.body as GetPersonalizedPriceRequest;

      if (!userId || !planId) {
        return res.status(400).json({
          success: false,
          message: 'User ID and plan ID are required',
        });
      }

      const result = await this.pricingService.getPersonalizedPrice({
        userId,
        planId,
        billingCycle,
        countryCode,
        includePromotions,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting personalized price:', { error: errorMessage });

      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  /**
   * Get regional price for a plan and country
   * GET /api/v1/pricing/regional/:planId/:countryCode
   */
  async getRegionalPrice(req: Request, res: Response): Promise<Response> {
    try {
      const { planId, countryCode } = req.params;
      const { regionCode, billingCycle } = req.query;

      if (!planId || !countryCode) {
        return res.status(400).json({
          success: false,
          message: 'Plan ID and country code are required',
        });
      }

      const result = await this.pricingService.getRegionalPrice({
        planId,
        countryCode: countryCode.toUpperCase(),
        regionCode: regionCode as string | undefined,
        billingCycle: billingCycle as BillingCycleType | undefined,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting regional price:', { error: errorMessage });

      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  /**
   * Get all prices for a country (all tiers and billing cycles)
   * GET /api/v1/pricing/catalog/:countryCode
   */
  async getPriceCatalog(req: Request, res: Response): Promise<Response> {
    try {
      const { countryCode } = req.params;
      const tiers: SubscriptionTierCode[] = ['free', 'basic', 'plus', 'premium', 'premium_plus', 'elite'];
      const billingCycles: BillingCycleType[] = ['monthly', '3_months', '6_months', 'yearly'];

      const catalog: Record<string, Record<string, unknown>> = {};

      for (const tier of tiers) {
        catalog[tier] = {};
        for (const cycle of billingCycles) {
          const price = await this.pricingService.getRegionalPrice({
            planId: tier,
            countryCode: countryCode.toUpperCase(),
            billingCycle: cycle,
          });
          catalog[tier][cycle] = {
            basePrice: price.basePrice,
            finalPrice: price.finalPrice,
            displayPrice: price.displayPrice,
            currency: price.currency,
            savings: price.savings,
            savingsPercentage: price.savingsPercentage,
            stripePriceId: price.stripePriceId,
          };
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          countryCode: countryCode.toUpperCase(),
          catalog,
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting price catalog:', { error: errorMessage });

      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  // =============================================================================
  // PROMOTION ENDPOINTS
  // =============================================================================

  /**
   * Apply a promo code
   * POST /api/v1/pricing/promo/apply
   */
  async applyPromoCode(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, code, planId, billingCycle } = req.body as ApplyPromoCodeRequest;

      if (!userId || !code || !planId || !billingCycle) {
        return res.status(400).json({
          success: false,
          message: 'User ID, promo code, plan ID, and billing cycle are required',
        });
      }

      const result = await this.pricingService.applyPromoCode({
        userId,
        code: code.toUpperCase(),
        planId,
        billingCycle,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error applying promo code:', { error: errorMessage });

      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  /**
   * Get active promotions for a user
   * GET /api/v1/pricing/promo/active/:userId
   */
  async getActivePromotions(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const { planId, billingCycle, countryCode } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const promotions = await this.pricingService.getActivePromotions({
        userId,
        planId: planId as string | undefined,
        billingCycle: billingCycle as BillingCycleType | undefined,
        countryCode: countryCode as string | undefined,
      });

      return res.status(200).json({
        success: true,
        data: promotions,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting active promotions:', { error: errorMessage });

      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  /**
   * Validate a promo code (without applying)
   * GET /api/v1/pricing/promo/validate/:code
   */
  async validatePromoCode(req: Request, res: Response): Promise<Response> {
    try {
      const { code } = req.params;
      const { userId, planId, billingCycle } = req.query;

      if (!code || !userId || !planId || !billingCycle) {
        return res.status(400).json({
          success: false,
          message: 'Code, user ID, plan ID, and billing cycle are required',
        });
      }

      const result = await this.pricingService.applyPromoCode({
        userId: userId as string,
        code: code.toUpperCase(),
        planId: planId as string,
        billingCycle: billingCycle as BillingCycleType,
      });

      return res.status(200).json({
        success: result.success,
        data: {
          valid: result.success,
          message: result.message,
          discountType: result.promotion?.discountType,
          discountValue: result.promotion?.discountValue,
          originalPrice: result.originalPrice,
          discountedPrice: result.discountedPrice,
          discountAmount: result.discountAmount,
          trialDays: result.trialDays,
          tierUpgrade: result.tierUpgrade,
          validUntil: result.validUntil,
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error validating promo code:', { error: errorMessage });

      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  // =============================================================================
  // EXPERIMENT ENDPOINTS
  // =============================================================================

  /**
   * Run price experiment for a user
   * POST /api/v1/pricing/experiment/run
   */
  async runPriceExperiment(req: Request, res: Response): Promise<Response> {
    try {
      const { experimentId, userId, planId, billingCycle } = req.body as RunPriceExperimentRequest;

      if (!experimentId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Experiment ID and user ID are required',
        });
      }

      const result = await this.pricingService.runPriceExperiment({
        experimentId,
        userId,
        planId,
        billingCycle,
      });

      if (!result) {
        return res.status(200).json({
          success: true,
          data: null,
          message: 'User not assigned to experiment',
        });
      }

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error running price experiment:', { error: errorMessage });

      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  /**
   * Get experiment results
   * GET /api/v1/pricing/experiment/:experimentId/results
   */
  async getExperimentResults(req: Request, res: Response): Promise<Response> {
    try {
      const { experimentId } = req.params;

      if (!experimentId) {
        return res.status(400).json({
          success: false,
          message: 'Experiment ID is required',
        });
      }

      const results = await this.pricingService.getExperimentResults(experimentId);

      return res.status(200).json({
        success: true,
        data: results,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting experiment results:', { error: errorMessage });

      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  /**
   * Record experiment conversion
   * POST /api/v1/pricing/experiment/conversion
   */
  async recordExperimentConversion(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, experimentId, revenue } = req.body;

      if (!userId || !experimentId) {
        return res.status(400).json({
          success: false,
          message: 'User ID and experiment ID are required',
        });
      }

      await this.pricingService.recordExperimentConversion(userId, experimentId, revenue || 0);

      return res.status(200).json({
        success: true,
        message: 'Conversion recorded successfully',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error recording experiment conversion:', { error: errorMessage });

      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  // =============================================================================
  // BUNDLE ENDPOINTS
  // =============================================================================

  /**
   * Get available bundles for a user
   * GET /api/v1/pricing/bundles/:userId
   */
  async getAvailableBundles(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const { currentTier } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const bundles = await this.pricingService.getAvailableBundles(
        userId,
        currentTier as SubscriptionTierCode | undefined
      );

      return res.status(200).json({
        success: true,
        data: bundles,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting available bundles:', { error: errorMessage });

      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  // =============================================================================
  // PERSONALIZED PRICING ENDPOINTS
  // =============================================================================

  /**
   * Calculate and get personalized pricing data for a user
   * POST /api/v1/pricing/personalized/calculate/:userId
   */
  async calculatePersonalizedPricing(req: Request, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const result = await this.pricingService.calculatePersonalizedPricing(userId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error calculating personalized pricing:', { error: errorMessage });

      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  // =============================================================================
  // ADMIN ENDPOINTS
  // =============================================================================

  /**
   * Create a new promotion (Admin only)
   * POST /api/v1/pricing/admin/promotions
   */
  async createPromotion(req: Request, res: Response): Promise<Response> {
    try {
      const promotionData = req.body as CreatePromotionRequest;

      // Basic validation
      if (!promotionData.code || !promotionData.name || !promotionData.discountType ||
          promotionData.discountValue === undefined || !promotionData.startsAt || !promotionData.endsAt) {
        return res.status(400).json({
          success: false,
          message: 'Code, name, discount type, discount value, start date, and end date are required',
        });
      }

      if (!promotionData.applicablePlans || promotionData.applicablePlans.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one applicable plan is required',
        });
      }

      if (!promotionData.applicableBillingCycles || promotionData.applicableBillingCycles.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one applicable billing cycle is required',
        });
      }

      // Add the admin user ID if available from auth
      if (req.user?.id) {
        promotionData.createdBy = req.user.id;
      }

      const promotion = await this.pricingService.createPromotion(promotionData);

      return res.status(201).json({
        success: true,
        data: promotion,
        message: 'Promotion created successfully',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error creating promotion:', { error: errorMessage });

      if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
        return res.status(409).json({
          success: false,
          message: 'A promotion with this code already exists',
        });
      }

      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  /**
   * Update regional pricing (Admin only)
   * PUT /api/v1/pricing/admin/regional/:countryCode
   */
  async updateRegionalPricing(req: Request, res: Response): Promise<Response> {
    try {
      const { countryCode } = req.params;
      const updateData = req.body as Omit<UpdateRegionalPricingRequest, 'countryCode'>;

      if (!countryCode) {
        return res.status(400).json({
          success: false,
          message: 'Country code is required',
        });
      }

      const result = await this.pricingService.updateRegionalPricing({
        countryCode: countryCode.toUpperCase(),
        ...updateData,
      });

      return res.status(200).json({
        success: true,
        data: result,
        message: 'Regional pricing updated successfully',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error updating regional pricing:', { error: errorMessage });

      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  /**
   * Create a new experiment (Admin only)
   * POST /api/v1/pricing/admin/experiments
   */
  async createExperiment(req: Request, res: Response): Promise<Response> {
    try {
      const experimentData = req.body as CreateExperimentRequest;

      // Basic validation
      if (!experimentData.name || !experimentData.trafficPercentage || !experimentData.variants) {
        return res.status(400).json({
          success: false,
          message: 'Name, traffic percentage, and variants are required',
        });
      }

      if (experimentData.variants.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'At least 2 variants are required (including control)',
        });
      }

      const hasControl = experimentData.variants.some(v => v.isControl);
      if (!hasControl) {
        return res.status(400).json({
          success: false,
          message: 'At least one variant must be marked as control',
        });
      }

      // Add the admin user ID if available from auth
      if (req.user?.id) {
        experimentData.createdBy = req.user.id;
      }

      const experiment = await this.pricingService.createExperiment(experimentData);

      return res.status(201).json({
        success: true,
        data: experiment,
        message: 'Experiment created successfully',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error creating experiment:', { error: errorMessage });

      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  /**
   * Start an experiment (Admin only)
   * POST /api/v1/pricing/admin/experiments/:experimentId/start
   */
  async startExperiment(req: Request, res: Response): Promise<Response> {
    try {
      const { experimentId } = req.params;

      if (!experimentId) {
        return res.status(400).json({
          success: false,
          message: 'Experiment ID is required',
        });
      }

      await this.pricingService.startExperiment(experimentId);

      return res.status(200).json({
        success: true,
        message: 'Experiment started successfully',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error starting experiment:', { error: errorMessage });

      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  /**
   * End an experiment (Admin only)
   * POST /api/v1/pricing/admin/experiments/:experimentId/end
   */
  async endExperiment(req: Request, res: Response): Promise<Response> {
    try {
      const { experimentId } = req.params;

      if (!experimentId) {
        return res.status(400).json({
          success: false,
          message: 'Experiment ID is required',
        });
      }

      await this.pricingService.endExperiment(experimentId);

      return res.status(200).json({
        success: true,
        message: 'Experiment ended successfully',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error ending experiment:', { error: errorMessage });

      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  /**
   * Record promotion usage (Internal use)
   * POST /api/v1/pricing/promo/record-usage
   */
  async recordPromotionUsage(req: Request, res: Response): Promise<Response> {
    try {
      const {
        userId,
        promotionId,
        subscriptionId,
        transactionId,
        discountAmount,
        originalAmount,
        finalAmount,
      } = req.body;

      if (!userId || !promotionId || discountAmount === undefined ||
          originalAmount === undefined || finalAmount === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields for recording promotion usage',
        });
      }

      const usage = await this.pricingService.recordPromotionUsage(
        userId,
        promotionId,
        subscriptionId || null,
        transactionId || null,
        discountAmount,
        originalAmount,
        finalAmount
      );

      return res.status(200).json({
        success: true,
        data: usage,
        message: 'Promotion usage recorded successfully',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error recording promotion usage:', { error: errorMessage });

      return res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userId: string;
        email: string;
        role?: 'user' | 'admin' | 'moderator' | 'support';
      };
    }
  }
}

export const dynamicPricingController = new DynamicPricingController();
export default dynamicPricingController;
