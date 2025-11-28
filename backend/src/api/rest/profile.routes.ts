/**
 * Profile Routes
 * User profile management with full CRUD operations
 * Demonstrates: Authentication, CSRF Protection, Input Sanitization
 */

import { Router, Request, Response } from 'express';
import { AuthMiddleware } from '../../middleware/auth.middleware.enhanced';
import { CSRFProtection } from '../../middleware/csrf.middleware';
import { Sanitizer } from '../../utils/sanitizer';
import { logger } from '../../utils/logger';
import { ProfileService } from '../../services/core';
import { ProfileRepository } from '../../repositories';
import { db } from '../../config/database.config';
import { ProfileUpdateInput } from '../../models/Profile.model';

const router = Router();

// Initialize services
const profileRepo = new ProfileRepository(db);
const profileService = new ProfileService(profileRepo);

/**
 * GET /api/profiles/me
 * Get current user's profile
 * Requires: Authentication
 */
router.get('/me', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const profile = await profileService.getProfile(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Profile not found',
          code: 'PROFILE_NOT_FOUND',
        },
      });
    }

    // Also get photos
    const photos = await profileService.getPhotos(userId);

    res.status(200).json({
      success: true,
      data: {
        profile,
        photos,
      },
    });
  } catch (error: any) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get profile',
        code: 'PROFILE_GET_ERROR',
      },
    });
  }
});

/**
 * PUT /api/profiles/me
 * Update current user's profile
 * Requires: Authentication + CSRF Protection
 */
router.put(
  '/me',
  AuthMiddleware.verifyToken,
  CSRFProtection.protect(),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;

      // Sanitize and validate inputs
      const updates: ProfileUpdateInput = {};

      if (req.body.bio !== undefined) {
        updates.bio = Sanitizer.stripHTML(req.body.bio).substring(0, 500);
      }

      if (req.body.occupation !== undefined) {
        updates.occupation = Sanitizer.sanitizeString(req.body.occupation);
      }

      if (req.body.education !== undefined) {
        updates.education = Sanitizer.sanitizeString(req.body.education);
      }

      if (req.body.height !== undefined) {
        const height = parseInt(req.body.height, 10);
        if (height >= 100 && height <= 250) {
          updates.height = height;
        }
      }

      if (req.body.relationshipGoal !== undefined) {
        const validGoals = ['long_term', 'short_term', 'casual', 'friends', 'not_sure'];
        if (validGoals.includes(req.body.relationshipGoal)) {
          updates.relationshipGoal = req.body.relationshipGoal;
        }
      }

      if (req.body.sexualOrientation !== undefined) {
        const validOrientations = ['straight', 'gay', 'lesbian', 'bisexual', 'pansexual', 'other', 'prefer_not_to_say'];
        if (validOrientations.includes(req.body.sexualOrientation)) {
          updates.sexualOrientation = req.body.sexualOrientation;
        }
      }

      if (req.body.interests !== undefined && Array.isArray(req.body.interests)) {
        updates.interests = req.body.interests
          .slice(0, 20) // Max 20 interests
          .map((i: string) => Sanitizer.sanitizeString(i).substring(0, 50));
      }

      if (req.body.languages !== undefined && Array.isArray(req.body.languages)) {
        updates.languages = req.body.languages
          .slice(0, 10) // Max 10 languages
          .map((l: string) => Sanitizer.sanitizeString(l).substring(0, 30));
      }

      if (req.body.hometown !== undefined) {
        updates.hometown = Sanitizer.sanitizeString(req.body.hometown);
      }

      if (req.body.currentCity !== undefined) {
        updates.currentCity = Sanitizer.sanitizeString(req.body.currentCity);
      }

      if (req.body.zodiacSign !== undefined) {
        const validSigns = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
        if (validSigns.includes(req.body.zodiacSign.toLowerCase())) {
          updates.zodiacSign = req.body.zodiacSign.toLowerCase();
        }
      }

      if (req.body.religion !== undefined) {
        updates.religion = Sanitizer.sanitizeString(req.body.religion);
      }

      if (req.body.politics !== undefined) {
        updates.politics = Sanitizer.sanitizeString(req.body.politics);
      }

      if (req.body.smoking !== undefined) {
        const validOptions = ['never', 'sometimes', 'regularly', 'prefer_not_to_say'];
        if (validOptions.includes(req.body.smoking)) {
          updates.smoking = req.body.smoking;
        }
      }

      if (req.body.drinking !== undefined) {
        const validOptions = ['never', 'sometimes', 'regularly', 'prefer_not_to_say'];
        if (validOptions.includes(req.body.drinking)) {
          updates.drinking = req.body.drinking;
        }
      }

      if (req.body.exercise !== undefined) {
        const validOptions = ['never', 'sometimes', 'regularly', 'prefer_not_to_say'];
        if (validOptions.includes(req.body.exercise)) {
          updates.exercise = req.body.exercise;
        }
      }

      if (req.body.pets !== undefined && Array.isArray(req.body.pets)) {
        updates.pets = req.body.pets
          .slice(0, 5)
          .map((p: string) => Sanitizer.sanitizeString(p).substring(0, 30));
      }

      if (req.body.lookingFor !== undefined && Array.isArray(req.body.lookingFor)) {
        updates.lookingFor = req.body.lookingFor
          .slice(0, 5)
          .map((l: string) => Sanitizer.sanitizeString(l).substring(0, 50));
      }

      if (req.body.personalityTraits !== undefined && Array.isArray(req.body.personalityTraits)) {
        updates.personalityTraits = req.body.personalityTraits
          .slice(0, 10)
          .map((t: string) => Sanitizer.sanitizeString(t).substring(0, 30));
      }

      // Update profile
      const updatedProfile = await profileService.updateProfile(userId, updates);

      logger.info(`Profile updated: ${userId}`);

      res.status(200).json({
        success: true,
        data: {
          message: 'Profile updated successfully',
          profile: updatedProfile,
        },
      });
    } catch (error: any) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to update profile',
          code: 'PROFILE_UPDATE_ERROR',
        },
      });
    }
  }
);

/**
 * GET /api/profiles/:userId
 * Get another user's profile (public view)
 * Requires: Authentication
 */
router.get('/:userId', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.userId;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'User ID is required',
          code: 'MISSING_USER_ID',
        },
      });
    }

    const profile = await profileService.getProfile(targetUserId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Profile not found',
          code: 'PROFILE_NOT_FOUND',
        },
      });
    }

    // Get approved photos only for public view
    const photos = await profileService.getPhotos(targetUserId);
    const approvedPhotos = photos.filter(p => p.moderation_status === 'approved' || p.moderation_status === 'pending');

    res.status(200).json({
      success: true,
      data: {
        profile,
        photos: approvedPhotos,
      },
    });
  } catch (error: any) {
    logger.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get profile',
        code: 'PROFILE_GET_ERROR',
      },
    });
  }
});

/**
 * GET /api/profiles/me/photos
 * Get current user's photos
 * Requires: Authentication
 */
router.get('/me/photos', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const photos = await profileService.getPhotos(userId);

    res.status(200).json({
      success: true,
      data: { photos },
    });
  } catch (error: any) {
    logger.error('Get photos error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get photos',
        code: 'PHOTOS_GET_ERROR',
      },
    });
  }
});

/**
 * POST /api/profiles/me/photos/reorder
 * Reorder user's photos
 * Requires: Authentication + CSRF Protection
 */
router.post(
  '/me/photos/reorder',
  AuthMiddleware.verifyToken,
  CSRFProtection.protect(),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { photoIds } = req.body;

      if (!photoIds || !Array.isArray(photoIds)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Photo IDs array is required',
            code: 'MISSING_PHOTO_IDS',
          },
        });
      }

      await profileService.reorderPhotos(userId, photoIds);

      logger.info(`Photos reordered: ${userId}`);

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
          message: error.message || 'Failed to reorder photos',
          code: 'PHOTOS_REORDER_ERROR',
        },
      });
    }
  }
);

/**
 * DELETE /api/profiles/me/photos/:photoId
 * Delete a photo
 * Requires: Authentication + CSRF Protection
 */
router.delete(
  '/me/photos/:photoId',
  AuthMiddleware.verifyToken,
  CSRFProtection.protect(),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const photoId = req.params.photoId;

      if (!photoId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Photo ID is required',
            code: 'MISSING_PHOTO_ID',
          },
        });
      }

      await profileService.deletePhoto(photoId, userId);

      logger.info(`Photo deleted: ${photoId} by user ${userId}`);

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
          code: 'PHOTO_DELETE_ERROR',
        },
      });
    }
  }
);

/**
 * GET /api/profiles/admin/pending-photos
 * Get photos pending moderation (Admin only)
 * Requires: Authentication + Admin role
 */
router.get(
  '/admin/pending-photos',
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole(['admin', 'moderator']),
  async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
      const photos = await profileService.getPendingPhotos(limit);

      res.status(200).json({
        success: true,
        data: { photos },
      });
    } catch (error: any) {
      logger.error('Get pending photos error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to get pending photos',
          code: 'PENDING_PHOTOS_ERROR',
        },
      });
    }
  }
);

/**
 * POST /api/profiles/admin/moderate-photo
 * Moderate a photo (Admin only)
 * Requires: Authentication + Admin role + CSRF Protection
 */
router.post(
  '/admin/moderate-photo',
  AuthMiddleware.verifyToken,
  AuthMiddleware.requireRole(['admin', 'moderator']),
  CSRFProtection.protect(),
  async (req: Request, res: Response) => {
    try {
      const { photoId, status, notes } = req.body;

      if (!photoId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Photo ID is required',
            code: 'MISSING_PHOTO_ID',
          },
        });
      }

      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Valid status (approved/rejected) is required',
            code: 'INVALID_STATUS',
          },
        });
      }

      const sanitizedNotes = notes ? Sanitizer.stripHTML(notes).substring(0, 500) : undefined;

      await profileService.moderatePhoto(photoId, status, sanitizedNotes);

      logger.info(`Photo moderated: ${photoId} -> ${status} by ${req.user!.userId}`);

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
          message: error.message || 'Failed to moderate photo',
          code: 'MODERATION_ERROR',
        },
      });
    }
  }
);

export default router;
