import { Router, Request, Response } from 'express';
import photoVerificationService from '../../domain/services/photo-verification.service';
import { authenticate } from '../middleware/auth.middleware';
import { createLogger } from '@connectsphere/shared';

const router = Router();
const logger = createLogger('verification-routes');

/**
 * POST /api/verification/photo/:mediaId
 * Verify a photo (basic verification)
 */
router.post(
  '/photo/:mediaId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { mediaId } = req.params;
      const { imageUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          error: 'Image URL is required',
        });
      }

      const result = await photoVerificationService.verifyPhoto(mediaId, imageUrl);

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      logger.error('Photo verification failed', error);
      res.status(500).json({
        success: false,
        error: 'Photo verification failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/verification/profile/:mediaId
 * Verify a profile photo with face matching
 */
router.post(
  '/profile/:mediaId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { mediaId } = req.params;
      const { imageUrl, referencePhotoUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          error: 'Image URL is required',
        });
      }

      const result = await photoVerificationService.verifyProfilePhoto(
        mediaId,
        imageUrl,
        referencePhotoUrl
      );

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      logger.error('Profile photo verification failed', error);
      res.status(500).json({
        success: false,
        error: 'Profile photo verification failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/verification/comprehensive/:mediaId
 * Comprehensive verification including liveness and duplicate detection
 */
router.post(
  '/comprehensive/:mediaId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { mediaId } = req.params;
      const { userId, imageUrl, referencePhotoUrl } = req.body;

      if (!userId || !imageUrl) {
        return res.status(400).json({
          success: false,
          error: 'User ID and image URL are required',
        });
      }

      const result = await photoVerificationService.comprehensiveVerification(
        mediaId,
        userId,
        imageUrl,
        referencePhotoUrl
      );

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      logger.error('Comprehensive verification failed', error);
      res.status(500).json({
        success: false,
        error: 'Comprehensive verification failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/verification/status/:mediaId
 * Get verification status of a photo
 */
router.get(
  '/status/:mediaId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { mediaId } = req.params;

      const status = await photoVerificationService.getVerificationStatus(mediaId);

      res.json({
        success: true,
        status,
      });
    } catch (error) {
      logger.error('Failed to get verification status', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get verification status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/verification/user/:userId/stats
 * Get user verification statistics
 */
router.get(
  '/user/:userId/stats',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const stats = await photoVerificationService.verifyUserPhotos(userId);

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      logger.error('Failed to get user verification stats', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get verification stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/verification/queue/:mediaId
 * Queue a photo for verification
 */
router.post(
  '/queue/:mediaId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { mediaId } = req.params;
      const { userId, imageUrl, referencePhotoUrl } = req.body;

      if (!userId || !imageUrl) {
        return res.status(400).json({
          success: false,
          error: 'User ID and image URL are required',
        });
      }

      await photoVerificationService.queueVerification(
        mediaId,
        userId,
        imageUrl,
        referencePhotoUrl
      );

      res.json({
        success: true,
        message: 'Verification job queued successfully',
      });
    } catch (error) {
      logger.error('Failed to queue verification', error);
      res.status(500).json({
        success: false,
        error: 'Failed to queue verification',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/verification/liveness
 * Check liveness of a photo
 */
router.post(
  '/liveness',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { imageUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          error: 'Image URL is required',
        });
      }

      const result = await photoVerificationService.verifyLiveness(imageUrl);

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      logger.error('Liveness detection failed', error);
      res.status(500).json({
        success: false,
        error: 'Liveness detection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/verification/check-duplicate
 * Check for duplicate profiles
 */
router.post(
  '/check-duplicate',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { userId, faceId } = req.body;

      if (!userId || !faceId) {
        return res.status(400).json({
          success: false,
          error: 'User ID and face ID are required',
        });
      }

      const result = await photoVerificationService.detectDuplicateProfile(
        userId,
        faceId
      );

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      logger.error('Duplicate detection failed', error);
      res.status(500).json({
        success: false,
        error: 'Duplicate detection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/verification/stock-photo
 * Check if photo is a stock photo
 */
router.post(
  '/stock-photo',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { imageUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          error: 'Image URL is required',
        });
      }

      const result = await photoVerificationService.detectStockPhoto(imageUrl);

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      logger.error('Stock photo detection failed', error);
      res.status(500).json({
        success: false,
        error: 'Stock photo detection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
