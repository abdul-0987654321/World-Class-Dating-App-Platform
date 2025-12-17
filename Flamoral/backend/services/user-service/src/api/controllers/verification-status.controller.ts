import { Request, Response } from 'express';
import verificationStatusService from '../../domain/services/verification-status.service';
import verificationBadgeService from '../../domain/services/verification-badge.service';
import { createLogger } from '../../utils/logger';

const logger = createLogger('verification-status-controller');

/**
 * Verification Status Controller
 * Handles requests for comprehensive verification status information
 */
export class VerificationStatusController {
  /**
   * Get complete verification status for authenticated user
   * GET /api/verification/status/complete
   */
  async getCompleteStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      logger.info(`Getting complete verification status for user ${userId}`);

      const status = await verificationStatusService.getCompleteVerificationStatus(userId);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      logger.error('Error getting complete verification status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve verification status',
      });
    }
  }

  /**
   * Get verification badges for authenticated user
   * GET /api/verification/badges
   */
  async getVerificationBadges(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      logger.info(`Getting verification badges for user ${userId}`);

      const badges = await verificationBadgeService.getUserVerificationBadges(userId);

      res.status(200).json({
        success: true,
        data: {
          badges: badges.map((badge) => ({
            ...badge,
            display: verificationBadgeService.getBadgeDisplayInfo(badge.badgeType),
          })),
        },
      });
    } catch (error: any) {
      logger.error('Error getting verification badges:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve verification badges',
      });
    }
  }

  /**
   * Get next verification step recommendation
   * GET /api/verification/next-step
   */
  async getNextStep(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      logger.info(`Getting next verification step for user ${userId}`);

      const nextStep = await verificationStatusService.getNextVerificationStep(userId);

      res.status(200).json({
        success: true,
        data: nextStep,
      });
    } catch (error: any) {
      logger.error('Error getting next verification step:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve next verification step',
      });
    }
  }

  /**
   * Check if user meets minimum verification requirements
   * GET /api/verification/check/minimum
   */
  async checkMinimumVerification(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const meetsRequirement = await verificationStatusService.meetsMinimumVerification(userId);

      res.status(200).json({
        success: true,
        data: {
          meetsMinimumVerification: meetsRequirement,
          requirement: 'Email verified',
        },
      });
    } catch (error: any) {
      logger.error('Error checking minimum verification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check minimum verification',
      });
    }
  }

  /**
   * Check if user meets standard verification requirements
   * GET /api/verification/check/standard
   */
  async checkStandardVerification(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const meetsRequirement = await verificationStatusService.meetsStandardVerification(userId);

      res.status(200).json({
        success: true,
        data: {
          meetsStandardVerification: meetsRequirement,
          requirement: 'Email and phone verified',
        },
      });
    } catch (error: any) {
      logger.error('Error checking standard verification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check standard verification',
      });
    }
  }

  /**
   * Check if user is fully verified
   * GET /api/verification/check/full
   */
  async checkFullVerification(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const isFullyVerified = await verificationStatusService.isFullyVerified(userId);

      res.status(200).json({
        success: true,
        data: {
          isFullyVerified,
          requirement: 'Email, phone, and photo verified',
        },
      });
    } catch (error: any) {
      logger.error('Error checking full verification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check full verification',
      });
    }
  }

  /**
   * Sync verification badges for authenticated user
   * POST /api/verification/badges/sync
   */
  async syncBadges(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      logger.info(`Syncing verification badges for user ${userId}`);

      await verificationBadgeService.syncVerificationBadges(userId);

      res.status(200).json({
        success: true,
        message: 'Verification badges synced successfully',
      });
    } catch (error: any) {
      logger.error('Error syncing verification badges:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync verification badges',
      });
    }
  }
}

export default new VerificationStatusController();
