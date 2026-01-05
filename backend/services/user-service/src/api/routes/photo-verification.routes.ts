import express, { Request, Response } from 'express';
import multer from 'multer';

import { photoVerificationService } from '../../services/photo-verification.service';
import logger from '../../utils/logger';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * @swagger
 * /api/photo-verification/submit:
 *   post:
 *     summary: Submit photo verification selfie
 *     tags: [PhotoVerification]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Upload a selfie for photo verification to get verified badge.
 *
 *       **Requirements:**
 *       - Image must contain exactly one face
 *       - Face must match profile photos
 *       - User must have at least one approved profile photo
 *       - Maximum file size: 10MB
 *       - Accepted formats: JPG, PNG, WEBP
 *
 *       **Process:**
 *       1. Upload selfie
 *       2. Detect face in selfie
 *       3. Compare with profile photos using Azure Computer Vision
 *       4. Auto-approve if similarity >= 70%
 *       5. Otherwise, manual review by moderation team
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - selfie
 *             properties:
 *               selfie:
 *                 type: string
 *                 format: binary
 *                 description: Clear selfie photo with only your face visible
 *     responses:
 *       200:
 *         description: Verification submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 verificationId:
 *                   type: string
 *                   example: 550e8400-e29b-41d4-a716-446655440000
 *                 status:
 *                   type: string
 *                   enum: [pending, approved]
 *                   example: approved
 *                 message:
 *                   type: string
 *                   example: Verification successful! You are now verified.
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *             examples:
 *               noFace:
 *                 value:
 *                   success: false
 *                   error: No face detected in selfie
 *               multipleFaces:
 *                 value:
 *                   success: false
 *                   error: Multiple faces detected. Please take a selfie with only your face.
 *               noProfilePhotos:
 *                 value:
 *                   success: false
 *                   error: You must have at least one approved profile photo before verifying
 *               pending:
 *                 value:
 *                   success: false
 *                   error: You already have a pending verification request
 *       401:
 *         description: Not authenticated
 */
router.post(
  '/submit',
  requireAuth,
  upload.single('selfie'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const selfieFile = req.file;

      if (!selfieFile) {
        return res.status(400).json({
          success: false,
          error: 'Selfie image is required',
        });
      }

      const result = await photoVerificationService.initiateVerification(userId, selfieFile);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Verification submission failed', {
        userId: req.user?.id,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to process verification request',
      });
    }
  }
);

/**
 * @swagger
 * /api/photo-verification/status:
 *   get:
 *     summary: Get verification status
 *     tags: [PhotoVerification]
 *     security:
 *       - bearerAuth: []
 *     description: Get current user's photo verification status and history
 *     responses:
 *       200:
 *         description: Verification status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 isVerified:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   enum: [none, pending, approved, rejected]
 *                   example: approved
 *                   description: |
 *                     - none: User hasn't submitted verification yet
 *                     - pending: Verification under review
 *                     - approved: User is verified
 *                     - rejected: Verification was rejected
 *                 submittedAt:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-11-20T10:30:00Z
 *                 reviewedAt:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-11-20T11:00:00Z
 *                 rejectionReason:
 *                   type: string
 *                   example: Face does not match profile photos
 *       401:
 *         description: Not authenticated
 */
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const result = await photoVerificationService.getVerificationStatus(userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Failed to get verification status', {
      userId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve verification status',
    });
  }
});

/**
 * @swagger
 * /api/photo-verification/admin/pending:
 *   get:
 *     summary: Get pending verifications (Admin only)
 *     tags: [PhotoVerification, Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Get list of pending verification requests for manual review
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Pending verifications retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 verifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       user_id:
 *                         type: string
 *                       email:
 *                         type: string
 *                       first_name:
 *                         type: string
 *                       last_name:
 *                         type: string
 *                       selfie_url:
 *                         type: string
 *                       matched_photo_url:
 *                         type: string
 *                       similarity_score:
 *                         type: number
 *                       submitted_at:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 15
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     offset:
 *                       type: integer
 *                       example: 0
 *                     hasMore:
 *                       type: boolean
 *                       example: false
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 */
router.get('/admin/pending', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const result = await photoVerificationService.getPendingVerifications(limit, offset);

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Failed to get pending verifications', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve pending verifications',
    });
  }
});

/**
 * @swagger
 * /api/photo-verification/admin/approve/{verificationId}:
 *   post:
 *     summary: Approve verification (Admin only)
 *     tags: [PhotoVerification, Admin]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Manually approve a pending photo verification request.
 *       This will grant the user a verified badge.
 *     parameters:
 *       - in: path
 *         name: verificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Verification request ID
 *     responses:
 *       200:
 *         description: Verification approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Verification approved successfully
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *             examples:
 *               notFound:
 *                 value:
 *                   success: false
 *                   error: Verification request not found
 *               alreadyProcessed:
 *                 value:
 *                   success: false
 *                   error: Verification already approved
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 */
router.post(
  '/admin/approve/:verificationId',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { verificationId } = req.params;
      const reviewedBy = req.user.id;

      const result = await photoVerificationService.approveVerification(verificationId, reviewedBy);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Failed to approve verification', {
        verificationId: req.params.verificationId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to approve verification',
      });
    }
  }
);

/**
 * @swagger
 * /api/photo-verification/admin/reject/{verificationId}:
 *   post:
 *     summary: Reject verification (Admin only)
 *     tags: [PhotoVerification, Admin]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Manually reject a pending photo verification request.
 *       User will be notified and can resubmit.
 *     parameters:
 *       - in: path
 *         name: verificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Verification request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 example: Face does not match profile photos. Please ensure your selfie clearly shows your face and matches your profile photos.
 *                 description: Detailed reason for rejection (will be shown to user)
 *     responses:
 *       200:
 *         description: Verification rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Verification rejected
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *             examples:
 *               noReason:
 *                 value:
 *                   success: false
 *                   error: Rejection reason is required
 *               notFound:
 *                 value:
 *                   success: false
 *                   error: Verification request not found
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 */
router.post(
  '/admin/reject/:verificationId',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { verificationId } = req.params;
      const { reason } = req.body;
      const reviewedBy = req.user.id;

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required',
        });
      }

      if (reason.length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason must be at least 10 characters',
        });
      }

      const result = await photoVerificationService.rejectVerification(
        verificationId,
        reviewedBy,
        reason
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Failed to reject verification', {
        verificationId: req.params.verificationId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to reject verification',
      });
    }
  }
);

export default router;
