/**
 * Media Routes
 * Photo upload, management, and moderation endpoints
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { AuthMiddleware } from '../../middleware/auth.middleware.enhanced';
import { CSRFProtection } from '../../middleware/csrf.middleware';
import { RBACMiddleware, UserRole } from '../../middleware/rbac.middleware';
import { uploadLimiter } from '../../middleware/rateLimit.middleware';
import { logger } from '../../utils/logger';
import { MediaService } from '../../services/core';
import { ProfileRepository } from '../../repositories';
import { db } from '../../config/database.config';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

// Initialize services
const profileRepo = new ProfileRepository(db);
const mediaService = new MediaService(profileRepo);

/**
 * POST /api/media/photos
 * Upload a new photo
 * Requires: Authentication + CSRF + Rate Limit
 */
router.post(
  '/photos',
  AuthMiddleware.verifyToken,
  CSRFProtection.protect(),
  uploadLimiter,
  upload.single('photo'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'NO_AUTH',
          },
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'No file uploaded',
            code: 'NO_FILE',
          },
        });
      }

      const result = await mediaService.uploadPhoto(
        userId,
        req.file.buffer,
        req.file.originalname
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Upload photo error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to upload photo',
          code: 'UPLOAD_ERROR',
        },
      });
    }
  }
);

/**
 * GET /api/media/photos
 * Get user's photos
 * Requires: Authentication
 */
router.get('/photos', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'NO_AUTH',
        },
      });
    }

    const photos = await profileRepo.getPhotos(userId);

    res.status(200).json({
      success: true,
      data: photos,
    });
  } catch (error: any) {
    logger.error('Get photos error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get photos',
        code: 'GET_PHOTOS_ERROR',
      },
    });
  }
});

/**
 * DELETE /api/media/photos/:photoId
 * Delete a photo
 * Requires: Authentication + CSRF
 */
router.delete(
  '/photos/:photoId',
  AuthMiddleware.verifyToken,
  CSRFProtection.protect(),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      const { photoId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'NO_AUTH',
          },
        });
      }

      await mediaService.deletePhoto(userId, photoId);

      res.status(200).json({
        success: true,
        data: {
          message: 'Photo deleted successfully',
        },
      });
    } catch (error: any) {
      logger.error('Delete photo error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to delete photo',
          code: 'DELETE_PHOTO_ERROR',
        },
      });
    }
  }
);

/**
 * PUT /api/media/photos/reorder
 * Reorder photos
 * Requires: Authentication + CSRF
 */
router.put(
  '/photos/reorder',
  AuthMiddleware.verifyToken,
  CSRFProtection.protect(),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      const { photoIds } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'NO_AUTH',
          },
        });
      }

      if (!photoIds || !Array.isArray(photoIds)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Photo IDs array is required',
            code: 'INVALID_INPUT',
          },
        });
      }

      await mediaService.reorderPhotos(userId, photoIds);

      res.status(200).json({
        success: true,
        data: {
          message: 'Photos reordered successfully',
        },
      });
    } catch (error: any) {
      logger.error('Reorder photos error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to reorder photos',
          code: 'REORDER_ERROR',
        },
      });
    }
  }
);

/**
 * GET /api/media/moderation/pending
 * Get photos pending moderation (Admin/Moderator only)
 * Requires: Authentication + Moderator role
 */
router.get(
  '/moderation/pending',
  AuthMiddleware.verifyToken,
  RBACMiddleware.requireRole(UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const photos = await mediaService.getPendingPhotosForModeration(limit);

      res.status(200).json({
        success: true,
        data: photos,
      });
    } catch (error: any) {
      logger.error('Get pending photos error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get pending photos',
          code: 'MODERATION_ERROR',
        },
      });
    }
  }
);

/**
 * POST /api/media/moderation/:photoId
 * Moderate a photo (Admin/Moderator only)
 * Requires: Authentication + Moderator role + CSRF
 */
router.post(
  '/moderation/:photoId',
  AuthMiddleware.verifyToken,
  RBACMiddleware.requireRole(UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  CSRFProtection.protect(),
  async (req: Request, res: Response) => {
    try {
      const { photoId } = req.params;
      const { status, notes } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Status must be approved or rejected',
            code: 'INVALID_STATUS',
          },
        });
      }

      await mediaService.moderatePhoto(photoId, status, notes);

      res.status(200).json({
        success: true,
        data: {
          message: `Photo ${status} successfully`,
        },
      });
    } catch (error: any) {
      logger.error('Moderate photo error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to moderate photo',
          code: 'MODERATION_ERROR',
        },
      });
    }
  }
);

export default router;
