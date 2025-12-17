import { Request, Response } from 'express';
import identityVerificationService from '../../domain/services/identity-verification.service';
import { createLogger } from '../../utils/logger';

const logger = createLogger('identity-verification-controller');

/**
 * Identity Verification Controller
 * Handles government ID and KYC verification requests
 */
export class IdentityVerificationController {
  /**
   * Initiate identity verification process
   * POST /api/verification/government-id/initiate
   */
  async initiateVerification(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { documentType, firstName, lastName, dateOfBirth, address } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!documentType) {
        res.status(400).json({
          success: false,
          error: 'Document type is required',
        });
        return;
      }

      logger.info(`Initiating identity verification for user ${userId}`);

      // For initiate, we just create a session
      // Actual document submission happens in submitDocuments
      const result = await identityVerificationService.initiateVerification({
        userId,
        firstName: firstName || '',
        lastName: lastName || '',
        dateOfBirth: dateOfBirth || '',
        documentType,
        documentNumber: '',
        documentFrontImage: '',
        selfieImage: '',
        address,
      });

      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error initiating identity verification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate identity verification',
      });
    }
  }

  /**
   * Submit identity verification documents
   * POST /api/verification/government-id/submit
   */
  async submitDocuments(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const { firstName, lastName, dateOfBirth, documentType, documentNumber, address } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Validate required files
      if (!files?.documentFront || !files?.selfie) {
        res.status(400).json({
          success: false,
          error: 'Document front image and selfie are required',
        });
        return;
      }

      // Validate required fields
      if (!firstName || !lastName || !dateOfBirth || !documentType) {
        res.status(400).json({
          success: false,
          error: 'First name, last name, date of birth, and document type are required',
        });
        return;
      }

      logger.info(`Submitting identity verification documents for user ${userId}`);

      // Convert uploaded files to base64 or URLs
      const documentFrontImage = files.documentFront[0].buffer.toString('base64');
      const documentBackImage = files.documentBack ? files.documentBack[0].buffer.toString('base64') : undefined;
      const selfieImage = files.selfie[0].buffer.toString('base64');

      // Submit to identity verification service
      const result = await identityVerificationService.initiateVerification({
        userId,
        firstName,
        lastName,
        dateOfBirth,
        documentType,
        documentNumber: documentNumber || '',
        documentFrontImage,
        documentBackImage,
        selfieImage,
        address: address ? JSON.parse(address) : undefined,
      });

      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error submitting identity verification documents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit identity verification documents',
      });
    }
  }

  /**
   * Get identity verification status
   * GET /api/verification/government-id/status
   */
  async getVerificationStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      logger.info(`Getting identity verification status for user ${userId}`);

      const status = await identityVerificationService.getVerificationStatus(userId);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      logger.error('Error getting identity verification status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve identity verification status',
      });
    }
  }

  /**
   * Handle webhook from KYC provider
   * POST /api/verification/government-id/webhook/:provider
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;
      const payload = req.body;

      logger.info(`Received webhook from ${provider}`);

      await identityVerificationService.handleWebhook(provider, payload);

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
      });
    } catch (error: any) {
      logger.error('Error handling identity verification webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process webhook',
      });
    }
  }

  /**
   * Approve identity verification (admin only)
   * POST /api/verification/government-id/admin/approve/:verificationId
   */
  async approveVerification(req: Request, res: Response): Promise<void> {
    try {
      const { verificationId } = req.params;
      const reviewedBy = req.user?.id;

      logger.info(`Approving identity verification ${verificationId}`);

      await identityVerificationService.approveVerification(
        verificationId,
        'manual',
        reviewedBy
      );

      res.status(200).json({
        success: true,
        message: 'Identity verification approved successfully',
      });
    } catch (error: any) {
      logger.error('Error approving identity verification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve identity verification',
      });
    }
  }

  /**
   * Reject identity verification (admin only)
   * POST /api/verification/government-id/admin/reject/:verificationId
   */
  async rejectVerification(req: Request, res: Response): Promise<void> {
    try {
      const { verificationId } = req.params;
      const { reason } = req.body;
      const reviewedBy = req.user?.id;

      if (!reason || reason.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Rejection reason is required',
        });
        return;
      }

      logger.info(`Rejecting identity verification ${verificationId}`);

      await identityVerificationService.rejectVerification(
        verificationId,
        reason,
        reviewedBy
      );

      res.status(200).json({
        success: true,
        message: 'Identity verification rejected',
      });
    } catch (error: any) {
      logger.error('Error rejecting identity verification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject identity verification',
      });
    }
  }
}

export default new IdentityVerificationController();
