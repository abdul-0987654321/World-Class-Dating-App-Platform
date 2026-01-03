/**
 * Document Verification Controller
 * Flamoral Dating Platform
 *
 * Handles API requests for OCR-based document verification.
 * Supports passport, driver's license, and national ID verification.
 */

import { Request, Response } from 'express';
import { documentVerificationService } from '../../services/document-verification.service';
import logger from '../../utils/logger';
import {
  DocumentType,
  DocumentVerificationRequest,
} from '../../types/document-verification.types';

/**
 * Document Verification Controller
 */
export class DocumentVerificationController {
  /**
   * POST /api/v1/verification/document/verify
   * Submit a document for OCR-based verification
   */
  async verifyDocument(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req.user as any)?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      // Validate required fields
      const { document_type, country_code, consent_given } = req.body;

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

      if (!consent_given) {
        return res.status(400).json({
          success: false,
          error: 'User consent is required for document verification',
          error_code: 'CONSENT_REQUIRED',
        });
      }

      // Validate document type
      const validDocumentTypes: DocumentType[] = ['passport', 'drivers_license', 'national_id'];
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

      // Validate file uploads
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      if (!files || !files.document_front || files.document_front.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'document_front file is required',
        });
      }

      // For driver's license and national ID, back is required
      if (
        ['drivers_license', 'national_id'].includes(document_type) &&
        (!files.document_back || files.document_back.length === 0)
      ) {
        return res.status(400).json({
          success: false,
          error: 'document_back file is required for driver\'s license and national ID',
        });
      }

      // Validate file types
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const frontFile = files.document_front[0];
      if (!allowedMimeTypes.includes(frontFile.mimetype)) {
        return res.status(400).json({
          success: false,
          error: 'document_front must be a JPEG, PNG, or WebP image',
        });
      }

      if (files.document_back && files.document_back.length > 0) {
        const backFile = files.document_back[0];
        if (!allowedMimeTypes.includes(backFile.mimetype)) {
          return res.status(400).json({
            success: false,
            error: 'document_back must be a JPEG, PNG, or WebP image',
          });
        }
      }

      // Validate file sizes (max 10MB each)
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      if (frontFile.size > maxFileSize) {
        return res.status(400).json({
          success: false,
          error: 'document_front file size must not exceed 10MB',
        });
      }

      if (files.document_back && files.document_back[0].size > maxFileSize) {
        return res.status(400).json({
          success: false,
          error: 'document_back file size must not exceed 10MB',
        });
      }

      // Build verification request
      const request: DocumentVerificationRequest = {
        userId,
        documentType: document_type,
        documentFront: frontFile.buffer,
        documentBack: files.document_back?.[0]?.buffer,
        selfieImage: files.selfie?.[0]?.buffer,
        countryCode: country_code,
        consentGiven: consent_given === true || consent_given === 'true',
        consentTimestamp: new Date(),
        clientIpAddress: req.ip || req.socket.remoteAddress,
      };

      logger.info('Document verification requested', {
        userId,
        documentType: document_type,
        countryCode: country_code,
      });

      const response = await documentVerificationService.verifyDocument(request);

      if (!response.success) {
        return res.status(400).json({
          success: false,
          error: response.error,
          error_code: response.errorCode,
          verification_id: response.verificationId,
        });
      }

      logger.info('Document verification submitted', {
        userId,
        verificationId: response.verificationId,
        status: response.status,
      });

      return res.status(200).json({
        success: true,
        data: {
          verification_id: response.verificationId,
          status: response.status,
          message: response.message,
        },
      });
    } catch (error: any) {
      logger.error('Error in document verification', {
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
   * GET /api/v1/verification/document/status
   * Get document verification status
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

      let result;
      if (verificationId) {
        result = await documentVerificationService.getVerificationStatus(verificationId, userId);
        if (!result) {
          return res.status(404).json({
            success: false,
            error: 'Verification not found',
          });
        }
      } else {
        result = await documentVerificationService.getUserLatestVerification(userId);
      }

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'No document verification found',
        });
      }

      // Remove sensitive data from response
      const sanitizedResult = {
        verification_id: result.verificationId,
        user_id: result.userId,
        document_type: result.documentType,
        status: result.status,
        is_verified: result.isVerified,
        verification_decision: result.verificationDecision,
        decision_reasons: result.decisionReasons,
        overall_score: result.overallVerificationScore,
        processed_at: result.processedAt,
        // Exclude extracted data for privacy
      };

      return res.status(200).json({
        success: true,
        data: sanitizedResult,
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
   * GET /api/v1/verification/document/score
   * Get verification score for a specific verification
   */
  async getScore(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req.user as any)?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const verificationId = req.params.verification_id;
      if (!verificationId) {
        return res.status(400).json({
          success: false,
          error: 'verification_id is required',
        });
      }

      // Verify ownership
      const result = await documentVerificationService.getVerificationStatus(verificationId, userId);
      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Verification not found',
        });
      }

      const score = await documentVerificationService.getVerificationScore(verificationId);

      return res.status(200).json({
        success: true,
        data: {
          verification_id: verificationId,
          score: score,
          score_percentage: Math.round(score * 100),
        },
      });
    } catch (error: any) {
      logger.error('Error getting verification score', {
        userId: (req.user as any)?.userId || (req.user as any)?.id,
        verificationId: req.params.verification_id,
        error: error.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/v1/verification/document/supported-types
   * Get supported document types and countries
   */
  async getSupportedTypes(req: Request, res: Response): Promise<Response> {
    try {
      return res.status(200).json({
        success: true,
        data: {
          document_types: [
            {
              type: 'passport',
              name: 'Passport',
              description: 'International passport',
              requires_back: false,
            },
            {
              type: 'drivers_license',
              name: 'Driver\'s License',
              description: 'Government-issued driver\'s license',
              requires_back: true,
            },
            {
              type: 'national_id',
              name: 'National ID Card',
              description: 'Government-issued national identity card',
              requires_back: true,
            },
          ],
          supported_countries: [
            { code: 'USA', name: 'United States' },
            { code: 'GBR', name: 'United Kingdom' },
            { code: 'CAN', name: 'Canada' },
            { code: 'AUS', name: 'Australia' },
            { code: 'DEU', name: 'Germany' },
            { code: 'FRA', name: 'France' },
            { code: 'ITA', name: 'Italy' },
            { code: 'ESP', name: 'Spain' },
            { code: 'NLD', name: 'Netherlands' },
            { code: 'BEL', name: 'Belgium' },
            { code: 'CHE', name: 'Switzerland' },
            { code: 'AUT', name: 'Austria' },
            { code: 'JPN', name: 'Japan' },
            { code: 'SGP', name: 'Singapore' },
            { code: 'HKG', name: 'Hong Kong' },
            { code: 'MEX', name: 'Mexico' },
            { code: 'BRA', name: 'Brazil' },
          ],
          file_requirements: {
            max_size_mb: 10,
            allowed_formats: ['JPEG', 'PNG', 'WebP'],
            recommended_resolution: '1920x1080 or higher',
          },
        },
      });
    } catch (error: any) {
      logger.error('Error getting supported types', { error: error.message });

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/v1/verification/document/gdpr/export
   * Request GDPR data export
   */
  async requestGDPRExport(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req.user as any)?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const exportData = await documentVerificationService.exportUserData(userId);

      logger.info('GDPR data export requested', {
        userId,
        recordCount: exportData.verifications.length,
      });

      return res.status(200).json({
        success: true,
        data: exportData,
      });
    } catch (error: any) {
      logger.error('Error exporting GDPR data', {
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
   * DELETE /api/v1/verification/document/gdpr/delete
   * Request GDPR data deletion
   */
  async requestGDPRDeletion(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req.user as any)?.userId || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { confirm_deletion } = req.body;

      if (!confirm_deletion) {
        return res.status(400).json({
          success: false,
          error: 'Please confirm deletion by setting confirm_deletion to true',
        });
      }

      const result = await documentVerificationService.deleteUserData(userId);

      logger.info('GDPR data deletion completed', {
        userId,
        recordsDeleted: result.deleted,
      });

      return res.status(200).json({
        success: true,
        message: 'Document verification data has been deleted',
        data: {
          records_deleted: result.deleted,
        },
      });
    } catch (error: any) {
      logger.error('Error deleting GDPR data', {
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

export const documentVerificationController = new DocumentVerificationController();
