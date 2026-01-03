/**
 * ID Verification Controller
 * Flamoral Dating Platform
 *
 * Handles API requests for ID verification via Jumio/Onfido.
 */

import { Request, Response } from 'express';
import { idVerificationService } from '../../services/id-verification.service';
import logger from '../../utils/logger';
import {
  InitiateIDVerificationRequest,
  IDDocumentType,
  VerificationProvider,
} from '../../types/id-verification-provider.types';

export class IDVerificationController {
  /**
   * POST /api/v1/verification/id/initiate
   * Start ID verification for a user
   */
  async initiateVerification(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req.user as any)?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { document_type, country_code, redirect_url, locale, biometric_consent, region_policy_key } = req.body;

      // Validate required fields
      if (!document_type) {
        return res.status(400).json({
          success: false,
          error: 'document_type is required',
          valid_types: ['passport', 'drivers_license', 'national_id'],
        });
      }

      if (!country_code) {
        return res.status(400).json({
          success: false,
          error: 'country_code is required (ISO 3166-1 alpha-3)',
        });
      }

      // Validate document type
      const validDocumentTypes: IDDocumentType[] = ['passport', 'drivers_license', 'national_id'];
      if (!validDocumentTypes.includes(document_type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid document_type',
          valid_types: validDocumentTypes,
        });
      }

      // Validate country code format (3 letters)
      if (!/^[A-Z]{3}$/.test(country_code)) {
        return res.status(400).json({
          success: false,
          error: 'country_code must be a valid ISO 3166-1 alpha-3 code (3 uppercase letters)',
        });
      }

      const request: InitiateIDVerificationRequest = {
        user_id: userId,
        document_type,
        country_code,
        redirect_url,
        locale,
        biometric_consent,
        region_policy_key,
      };

      const response = await idVerificationService.initiateVerification(request);

      if (!response.success) {
        return res.status(400).json({
          success: false,
          error: response.error,
          error_code: response.error_code,
        });
      }

      logger.info('ID verification initiated via API', {
        userId,
        verificationId: response.verification_id,
        provider: response.provider,
      });

      return res.status(200).json({
        success: true,
        data: {
          verification_id: response.verification_id,
          provider: response.provider,
          web_url: response.web_url,
          sdk_token: response.sdk_token,
          expires_at: response.expires_at,
        },
      });
    } catch (error: any) {
      logger.error('Error initiating ID verification', {
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
   * POST /api/v1/verification/id/webhook/:provider
   * Receive webhook callbacks from verification providers
   */
  async handleWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const provider = req.params.provider as VerificationProvider;

      // Validate provider
      if (!['jumio', 'onfido', 'mock'].includes(provider)) {
        logger.warn('Invalid webhook provider', { provider });
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

      const result = await idVerificationService.processWebhook(
        provider,
        req.body,
        headers,
        rawBody
      );

      if (!result.success) {
        logger.warn('Webhook processing failed', { provider, error: result.error });
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      logger.info('Webhook processed successfully', { provider });

      return res.status(200).json({
        success: true,
      });
    } catch (error: any) {
      logger.error('Error processing webhook', {
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
   * GET /api/v1/verification/id/status
   * Get current ID verification status for the authenticated user
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

      const verificationId = req.query.verification_id as string | undefined;

      let status;
      if (verificationId) {
        status = await idVerificationService.getVerificationStatus(verificationId, userId);
        if (!status) {
          return res.status(404).json({
            success: false,
            error: 'Verification not found',
          });
        }
      } else {
        status = await idVerificationService.getUserLatestVerification(userId);
      }

      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      logger.error('Error getting verification status', {
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
   * GET /api/v1/verification/id/history
   * Get all ID verification attempts for the authenticated user
   */
  async getHistory(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req.user as any)?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const verifications = await idVerificationService.getUserVerifications(userId);

      return res.status(200).json({
        success: true,
        data: verifications,
        count: verifications.length,
      });
    } catch (error: any) {
      logger.error('Error getting verification history', {
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
   * GET /api/v1/verification/id/providers
   * Get available verification providers
   */
  async getProviders(req: Request, res: Response): Promise<Response> {
    try {
      const providers = idVerificationService.getAvailableProviders();

      return res.status(200).json({
        success: true,
        data: {
          providers,
          supported_document_types: ['passport', 'drivers_license', 'national_id'],
        },
      });
    } catch (error: any) {
      logger.error('Error getting providers', { error: error.message });

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

export const idVerificationController = new IDVerificationController();
