import { Request, Response } from 'express';

import { identityVerificationService } from '../../services/identity-verification.service';
import { VerificationType, StartVerificationRequest } from '../../types/verification.types';
import logger from '../../utils/logger';

/**
 * Identity Verification Controller
 * Handles verification API endpoints for users
 */
export class IdentityVerificationController {
  /**
   * POST /verification/start
   * Start a new verification flow
   */
  async startVerification(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { type, region_policy_key, biometric_consent, metadata } = req.body;

      // Validate required fields
      if (!type) {
        return res.status(400).json({
          success: false,
          error: 'Verification type is required',
        });
      }

      // Validate verification type
      const validTypes: VerificationType[] = [
        'email',
        'phone',
        'id',
        'selfie',
        'liveness',
        'video',
        'biometric',
      ];

      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid verification type. Must be one of: ${validTypes.join(', ')}`,
        });
      }

      const clientIp = req.ip || req.socket?.remoteAddress || '';

      const request: StartVerificationRequest = {
        type,
        region_policy_key,
        biometric_consent,
        metadata,
      };

      const result = await identityVerificationService.startVerification(userId, request, clientIp);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error: any) {
      logger.error('Start verification error:', error);

      return res.status(500).json({
        success: false,
        error: 'Failed to start verification',
      });
    }
  }

  /**
   * POST /verification/upload
   * Upload a verification artifact (document, selfie, etc.)
   */
  async uploadArtifact(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { request_id, type } = req.body;
      const file = req.file;

      // Validate required fields
      if (!request_id) {
        return res.status(400).json({
          success: false,
          error: 'Request ID is required',
        });
      }

      if (!type) {
        return res.status(400).json({
          success: false,
          error: 'Artifact type is required',
        });
      }

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'File is required',
        });
      }

      // In a real implementation, you would:
      // 1. Upload the file to cloud storage (AWS S3)
      // 2. Calculate file hash for integrity verification
      // 3. Return the URL and hash

      // For now, we'll simulate this
      const fileUrl = `https://storage.example.com/verification/${request_id}/${type}/${Date.now()}`;
      const fileHash = Buffer.from(file.buffer).toString('base64').slice(0, 64);
      const fileSize = file.size;
      const mimeType = file.mimetype;

      const result = await identityVerificationService.uploadArtifact(
        userId,
        request_id,
        type,
        fileUrl,
        fileHash,
        fileSize,
        mimeType
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error: any) {
      logger.error('Upload artifact error:', error);

      return res.status(500).json({
        success: false,
        error: 'Failed to upload artifact',
      });
    }
  }

  /**
   * POST /verification/submit
   * Submit verification for review (after uploading all required artifacts)
   */
  async submitForReview(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { request_id } = req.body;

      if (!request_id) {
        return res.status(400).json({
          success: false,
          error: 'Request ID is required',
        });
      }

      const result = await identityVerificationService.submitForReview(userId, request_id);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json({
        success: true,
        message: 'Verification submitted for review',
      });
    } catch (error: any) {
      logger.error('Submit for review error:', error);

      return res.status(500).json({
        success: false,
        error: 'Failed to submit for review',
      });
    }
  }

  /**
   * GET /verification/status
   * Get verification status for the current user
   */
  async getStatus(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const type = req.query.type as VerificationType | undefined;

      const statuses = await identityVerificationService.getStatus(userId, type);

      return res.status(200).json({
        success: true,
        verifications: statuses,
      });
    } catch (error: any) {
      logger.error('Get verification status error:', error);

      return res.status(500).json({
        success: false,
        error: 'Failed to get verification status',
      });
    }
  }

  /**
   * POST /verification/retry
   * Retry a denied or expired verification
   */
  async retryVerification(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { request_id } = req.body;

      if (!request_id) {
        return res.status(400).json({
          success: false,
          error: 'Request ID is required',
        });
      }

      const clientIp = req.ip || req.socket?.remoteAddress || '';

      const result = await identityVerificationService.retryVerification(
        userId,
        request_id,
        clientIp
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error: any) {
      logger.error('Retry verification error:', error);

      return res.status(500).json({
        success: false,
        error: 'Failed to retry verification',
      });
    }
  }
}

/**
 * Identity Verification Admin Controller
 * Handles admin verification endpoints
 */
export class IdentityVerificationAdminController {
  /**
   * GET /admin/verification/pending
   * Get pending verifications for admin review
   */
  async getPendingVerifications(req: Request, res: Response): Promise<Response> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const type = req.query.type as VerificationType | undefined;

      const result = await identityVerificationService.getPendingVerifications(limit, offset, type);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      logger.error('Get pending verifications error:', error);

      return res.status(500).json({
        success: false,
        error: 'Failed to get pending verifications',
      });
    }
  }

  /**
   * POST /admin/verification/:requestId/approve
   * Approve a verification request
   */
  async approveVerification(req: Request, res: Response): Promise<Response> {
    try {
      const adminUserId = req.user?.userId || req.user?.id;

      if (!adminUserId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { requestId } = req.params;
      const { notes } = req.body;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error: 'Request ID is required',
        });
      }

      const result = await identityVerificationService.adminApprove(requestId, adminUserId, notes);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json({
        success: true,
        message: 'Verification approved',
      });
    } catch (error: any) {
      logger.error('Approve verification error:', error);

      return res.status(500).json({
        success: false,
        error: 'Failed to approve verification',
      });
    }
  }

  /**
   * POST /admin/verification/:requestId/deny
   * Deny a verification request
   */
  async denyVerification(req: Request, res: Response): Promise<Response> {
    try {
      const adminUserId = req.user?.userId || req.user?.id;

      if (!adminUserId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { requestId } = req.params;
      const { reason_code, notes } = req.body;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error: 'Request ID is required',
        });
      }

      if (!reason_code) {
        return res.status(400).json({
          success: false,
          error: 'Reason code is required',
        });
      }

      const result = await identityVerificationService.adminDeny(
        requestId,
        adminUserId,
        reason_code,
        notes
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json({
        success: true,
        message: 'Verification denied',
      });
    } catch (error: any) {
      logger.error('Deny verification error:', error);

      return res.status(500).json({
        success: false,
        error: 'Failed to deny verification',
      });
    }
  }
}

export const identityVerificationController = new IdentityVerificationController();
export const identityVerificationAdminController = new IdentityVerificationAdminController();
