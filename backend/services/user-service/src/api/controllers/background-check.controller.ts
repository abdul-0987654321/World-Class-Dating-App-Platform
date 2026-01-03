/**
 * Background Check Controller
 * Flamoral Dating Platform
 *
 * Handles API requests for Elite tier background checks.
 */

import { Request, Response } from 'express';
import { backgroundCheckService } from '../../services/background-check.service';
import logger from '../../utils/logger';
import {
  BackgroundCheckTier,
  InitiateBackgroundCheckRequest,
  BACKGROUND_CHECK_TIER_CONFIG,
} from '../../types/background-check.types';
import { VerificationProvider } from '../../types/id-verification-provider.types';

export class BackgroundCheckController {
  /**
   * POST /api/v1/verification/background
   * Initiate a background check for Elite tier users
   */
  async initiateBackgroundCheck(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req.user as any)?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { tier, country_code, consent_given } = req.body;

      // Validate required fields
      if (!tier) {
        return res.status(400).json({
          success: false,
          error: 'tier is required',
          valid_tiers: ['basic', 'standard', 'comprehensive'],
        });
      }

      // Validate tier
      const validTiers: BackgroundCheckTier[] = ['basic', 'standard', 'comprehensive'];
      if (!validTiers.includes(tier)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid tier',
          valid_tiers: validTiers,
        });
      }

      // Validate consent
      if (consent_given !== true) {
        return res.status(400).json({
          success: false,
          error: 'consent_given must be true to proceed with background check',
          consent_required: true,
        });
      }

      // Validate country code if provided
      if (country_code && !/^[A-Z]{3}$/.test(country_code)) {
        return res.status(400).json({
          success: false,
          error: 'country_code must be a valid ISO 3166-1 alpha-3 code (3 uppercase letters)',
        });
      }

      const request: InitiateBackgroundCheckRequest = {
        user_id: userId,
        tier,
        country_code,
        consent_given: true,
        consent_timestamp: new Date(),
      };

      const response = await backgroundCheckService.initiateBackgroundCheck(request);

      if (!response.success) {
        const statusCode = response.error_code === 'ELITE_REQUIRED' ? 403 :
          response.error_code === 'CONSENT_REQUIRED' ? 400 : 400;

        return res.status(statusCode).json({
          success: false,
          error: response.error,
          error_code: response.error_code,
        });
      }

      logger.info('Background check initiated via API', {
        userId,
        backgroundCheckId: response.background_check_id,
        provider: response.provider,
        tier,
      });

      return res.status(200).json({
        success: true,
        data: {
          background_check_id: response.background_check_id,
          provider: response.provider,
          status: response.status,
          tier,
          checks_included: response.checks_included,
          estimated_completion: response.estimated_completion,
        },
      });
    } catch (error: any) {
      logger.error('Error initiating background check', {
        userId: (req.user as any)?.userId || (req.user as any)?.id,
        error: error.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/v1/verification/background/status
   * Get current background check status for the authenticated user
   */
  async getStatus(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req.user as any)?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const checkId = req.query.check_id as string | undefined;

      let status;
      if (checkId) {
        status = await backgroundCheckService.getBackgroundCheckById(checkId, userId);
        if (!status) {
          return res.status(404).json({
            success: false,
            error: 'Background check not found',
          });
        }
      } else {
        status = await backgroundCheckService.getBackgroundCheckStatus(userId);
      }

      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      logger.error('Error getting background check status', {
        userId: (req.user as any)?.userId || (req.user as any)?.id,
        error: error.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/v1/verification/background/webhook/:provider
   * Receive webhook callbacks from background check providers
   */
  async handleWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const provider = req.params.provider as VerificationProvider;

      // Validate provider
      if (!['jumio', 'onfido'].includes(provider)) {
        logger.warn('Invalid background check webhook provider', { provider });
        return res.status(400).json({
          success: false,
          error: 'Invalid provider',
        });
      }

      // Get raw body for signature verification
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      // Convert headers to lowercase for consistent access
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') {
          headers[key.toLowerCase()] = value;
        }
      }

      const result = await backgroundCheckService.handleProviderWebhook(
        provider,
        req.body,
        headers,
        rawBody
      );

      if (!result.success) {
        logger.warn('Background check webhook processing failed', {
          provider,
          error: result.error,
        });
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      logger.info('Background check webhook processed successfully', { provider });

      return res.status(200).json({
        success: true,
      });
    } catch (error: any) {
      logger.error('Error processing background check webhook', {
        provider: req.params.provider,
        error: error.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/v1/verification/background/tiers
   * Get available background check tiers and their details
   */
  async getTiers(req: Request, res: Response): Promise<Response> {
    try {
      const tiers = backgroundCheckService.getAllTierConfigs();
      const providers = backgroundCheckService.getAvailableProviders();

      return res.status(200).json({
        success: true,
        data: {
          tiers: Object.entries(tiers).map(([name, config]) => ({
            name,
            checks: config.checks,
            validity_days: config.validity_days,
            price_coins: config.price_coins,
            description: config.description,
          })),
          available_providers: providers,
        },
      });
    } catch (error: any) {
      logger.error('Error getting background check tiers', { error: error.message });

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/v1/verification/background/eligibility
   * Check if user is eligible for background check
   */
  async checkEligibility(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req.user as any)?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      // Check existing status
      const existingCheck = await backgroundCheckService.getBackgroundCheckStatus(userId);

      // Check Elite subscription
      const { default: db } = await import('../../infrastructure/database/connection');
      const subscription = await db('subscriptions')
        .where({ user_id: userId, status: 'active' })
        .whereIn('tier', ['elite', 'elite_annual'])
        .first();

      const hasElite = !!subscription;
      const hasProvidersAvailable = backgroundCheckService.getAvailableProviders().length > 0;

      let eligibility = {
        eligible: hasElite && hasProvidersAvailable,
        has_elite_subscription: hasElite,
        providers_available: hasProvidersAvailable,
        existing_check: existingCheck ? {
          status: existingCheck.status,
          tier: existingCheck.tier,
          expires_at: existingCheck.expires_at,
          badge_awarded: existingCheck.badge_awarded,
        } : null,
        reason: '',
      };

      if (!hasElite) {
        eligibility.reason = 'Elite subscription required for background checks';
      } else if (!hasProvidersAvailable) {
        eligibility.reason = 'Background check service temporarily unavailable';
      } else if (existingCheck && ['initiated', 'pending', 'processing'].includes(existingCheck.status)) {
        eligibility.eligible = false;
        eligibility.reason = 'Background check already in progress';
      } else if (existingCheck?.status === 'clear' && existingCheck.expires_at && new Date(existingCheck.expires_at) > new Date()) {
        eligibility.eligible = false;
        eligibility.reason = 'Valid background check already exists';
      }

      return res.status(200).json({
        success: true,
        data: eligibility,
      });
    } catch (error: any) {
      logger.error('Error checking background check eligibility', {
        userId: (req.user as any)?.userId || (req.user as any)?.id,
        error: error.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

export const backgroundCheckController = new BackgroundCheckController();
