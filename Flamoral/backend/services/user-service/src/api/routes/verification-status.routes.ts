import { Router } from 'express';
import verificationStatusController from '../controllers/verification-status.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * Verification Status Routes
 * All routes require authentication
 */

/**
 * @swagger
 * /api/verification/status/complete:
 *   get:
 *     summary: Get complete verification status
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Get comprehensive verification status including:
 *       - Email verification status
 *       - Phone verification status
 *       - Photo verification status
 *       - Identity verification status
 *       - Overall verification score and level
 *       - Verification badges earned
 *     responses:
 *       200:
 *         description: Verification status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: object
 *                       properties:
 *                         verified:
 *                           type: boolean
 *                         verifiedAt:
 *                           type: string
 *                           format: date-time
 *                     phone:
 *                       type: object
 *                       properties:
 *                         verified:
 *                           type: boolean
 *                         verifiedAt:
 *                           type: string
 *                           format: date-time
 *                         phoneNumber:
 *                           type: string
 *                         hasPendingVerification:
 *                           type: boolean
 *                     photo:
 *                       type: object
 *                       properties:
 *                         verified:
 *                           type: boolean
 *                         verifiedAt:
 *                           type: string
 *                           format: date-time
 *                         status:
 *                           type: string
 *                           enum: [none, pending, approved, rejected]
 *                         submittedAt:
 *                           type: string
 *                           format: date-time
 *                         rejectionReason:
 *                           type: string
 *                     identity:
 *                       type: object
 *                       properties:
 *                         verified:
 *                           type: boolean
 *                         verifiedAt:
 *                           type: string
 *                           format: date-time
 *                         provider:
 *                           type: string
 *                         referenceId:
 *                           type: string
 *                     overall:
 *                       type: object
 *                       properties:
 *                         isFullyVerified:
 *                           type: boolean
 *                         verificationScore:
 *                           type: integer
 *                           minimum: 0
 *                           maximum: 100
 *                         hasAnyVerification:
 *                           type: boolean
 *                         verificationLevel:
 *                           type: string
 *                           enum: [none, basic, standard, full]
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/status/complete',
  authenticateToken,
  verificationStatusController.getCompleteStatus.bind(verificationStatusController)
);

/**
 * @swagger
 * /api/verification/badges:
 *   get:
 *     summary: Get user's verification badges
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     description: Get all verification badges earned by the user
 *     responses:
 *       200:
 *         description: Badges retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     badges:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           badgeType:
 *                             type: string
 *                             enum: [email_verified, phone_verified, photo_verified, identity_verified, fully_verified]
 *                           earnedAt:
 *                             type: string
 *                             format: date-time
 *                           isActive:
 *                             type: boolean
 *                           display:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               icon:
 *                                 type: string
 *                               color:
 *                                 type: string
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/badges',
  authenticateToken,
  verificationStatusController.getVerificationBadges.bind(verificationStatusController)
);

/**
 * @swagger
 * /api/verification/badges/sync:
 *   post:
 *     summary: Sync verification badges
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     description: Synchronize badges with current verification status
 *     responses:
 *       200:
 *         description: Badges synced successfully
 *       401:
 *         description: Not authenticated
 */
router.post(
  '/badges/sync',
  authenticateToken,
  verificationStatusController.syncBadges.bind(verificationStatusController)
);

/**
 * @swagger
 * /api/verification/next-step:
 *   get:
 *     summary: Get next verification step recommendation
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     description: Get recommendation for the next verification step to complete
 *     responses:
 *       200:
 *         description: Next step retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     step:
 *                       type: string
 *                       enum: [email, phone, photo, identity, complete]
 *                     message:
 *                       type: string
 *                     priority:
 *                       type: string
 *                       enum: [high, medium, low]
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/next-step',
  authenticateToken,
  verificationStatusController.getNextStep.bind(verificationStatusController)
);

/**
 * @swagger
 * /api/verification/check/minimum:
 *   get:
 *     summary: Check if user meets minimum verification requirements
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     description: Check if user has completed minimum required verification (email)
 *     responses:
 *       200:
 *         description: Check completed successfully
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/check/minimum',
  authenticateToken,
  verificationStatusController.checkMinimumVerification.bind(verificationStatusController)
);

/**
 * @swagger
 * /api/verification/check/standard:
 *   get:
 *     summary: Check if user meets standard verification requirements
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     description: Check if user has completed standard verification (email + phone)
 *     responses:
 *       200:
 *         description: Check completed successfully
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/check/standard',
  authenticateToken,
  verificationStatusController.checkStandardVerification.bind(verificationStatusController)
);

/**
 * @swagger
 * /api/verification/check/full:
 *   get:
 *     summary: Check if user is fully verified
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     description: Check if user has completed all core verifications (email + phone + photo)
 *     responses:
 *       200:
 *         description: Check completed successfully
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/check/full',
  authenticateToken,
  verificationStatusController.checkFullVerification.bind(verificationStatusController)
);

export default router;
