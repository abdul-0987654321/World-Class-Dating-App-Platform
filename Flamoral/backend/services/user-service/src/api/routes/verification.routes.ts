import { Router } from 'express';
import { VerificationController } from '../controllers/verification.controller';
import { authLimiter } from '../middleware/rate-limit.middleware';
import verificationStatusRoutes from './verification-status.routes';

const router = Router();
const verificationController = new VerificationController();

// Mount verification status routes
router.use('/', verificationStatusRoutes);

/**
 * @swagger
 * /api/verification/verify-email:
 *   post:
 *     summary: Verify user email with token
 *     tags: [Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: a1b2c3d4e5f6g7h8i9j0
 *                 description: Verification token received via email
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid or expired verification token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many requests
 */
router.post(
  '/verify-email',
  authLimiter,
  verificationController.verifyEmail.bind(verificationController)
);

/**
 * @swagger
 * /api/verification/resend:
 *   post:
 *     summary: Resend verification email
 *     tags: [Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *     responses:
 *       200:
 *         description: Verification email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Email already verified or user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many requests
 */
router.post(
  '/resend',
  authLimiter,
  verificationController.resendVerification.bind(verificationController)
);

export default router;
