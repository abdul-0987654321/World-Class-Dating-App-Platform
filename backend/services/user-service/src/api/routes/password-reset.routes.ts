import { Router } from 'express';

import { PasswordResetController } from '../controllers/password-reset.controller';
import { authLimiter } from '../middleware/rate-limit.middleware';

const router = Router();
const passwordResetController = new PasswordResetController();

/**
 * @swagger
 * /api/password-reset/request:
 *   post:
 *     summary: Request password reset email
 *     tags: [Password Reset]
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
 *                 description: Email address of the account to reset
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid email or user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many requests
 */
router.post(
  '/request',
  authLimiter,
  passwordResetController.requestReset.bind(passwordResetController)
);

/**
 * @swagger
 * /api/password-reset/reset:
 *   post:
 *     summary: Reset password with token
 *     tags: [Password Reset]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: a1b2c3d4e5f6g7h8i9j0
 *                 description: Password reset token received via email
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: NewSecure123!@#
 *                 description: New password (min 8 characters, must include uppercase, lowercase, number, and special character)
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid or expired token, or weak password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many requests
 */
router.post(
  '/reset',
  authLimiter,
  passwordResetController.resetPassword.bind(passwordResetController)
);

/**
 * @swagger
 * /api/password-reset/verify-token:
 *   post:
 *     summary: Verify reset token validity
 *     tags: [Password Reset]
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
 *                 description: Password reset token to verify
 *     responses:
 *       200:
 *         description: Token is valid
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
 *                   example: Token is valid
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/verify-token', passwordResetController.verifyToken.bind(passwordResetController));

export default router;
