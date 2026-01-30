import { Router, Request, Response, NextFunction } from 'express';

import authController from '../controllers/auth.controller';
import { authenticate, internalAuth } from '../middleware/auth.middleware';
import {
  authLimiter,
  passwordResetLimiter,
  verificationLimiter,
} from '../middleware/rate-limit.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
  setup2FASchema,
  verify2FASchema,
  disable2FASchema,
  validate2FASchema,
  regenerateBackupCodesSchema,
} from '../validators/auth.validator';

const router = Router();

/**
 * Middleware to normalize camelCase request body to snake_case
 * This allows the frontend to send camelCase while backend uses snake_case
 */
const normalizeRegisterBody = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) {
    // Convert camelCase to snake_case
    if (req.body.firstName && !req.body.first_name) {
      req.body.first_name = req.body.firstName;
    }
    if (req.body.lastName && !req.body.last_name) {
      req.body.last_name = req.body.lastName;
    }
    if (req.body.dateOfBirth && !req.body.date_of_birth) {
      req.body.date_of_birth = req.body.dateOfBirth;
    }
    // Normalize consents
    if (req.body.consents) {
      if (req.body.consents.terms_accepted !== undefined && req.body.consents.terms === undefined) {
        req.body.consents.terms = req.body.consents.terms_accepted;
      }
      if (
        req.body.consents.privacy_accepted !== undefined &&
        req.body.consents.privacy === undefined
      ) {
        req.body.consents.privacy = req.body.consents.privacy_accepted;
      }
      if (
        req.body.consents.marketing_emails !== undefined &&
        req.body.consents.marketing === undefined
      ) {
        req.body.consents.marketing = req.body.consents.marketing_emails;
      }
    }
  }
  next();
};

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - first_name
 *               - last_name
 *               - date_of_birth
 *               - gender
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 12
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [male, female, non-binary, other]
 *               phone_number:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 */
router.post(
  '/register',
  authLimiter,
  normalizeRegisterBody,
  validate(registerSchema),
  authController.register.bind(authController)
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  authController.login.bind(authController)
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticate, authController.logout.bind(authController));

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.post(
  '/refresh-token',
  validate(refreshTokenSchema),
  authController.refreshToken.bind(authController)
);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email address
 *     tags: [Authentication]
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
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  authController.verifyEmail.bind(authController)
);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     tags: [Authentication]
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
 *     responses:
 *       200:
 *         description: Verification email sent
 *       400:
 *         description: Email already verified or user not found
 */
router.post(
  '/resend-verification',
  verificationLimiter,
  validate(resendVerificationSchema),
  authController.resendVerification.bind(authController)
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
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
 *     responses:
 *       200:
 *         description: Password reset email sent (if account exists)
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword.bind(authController)
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
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
 *               newPassword:
 *                 type: string
 *                 minLength: 12
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  authController.resetPassword.bind(authController)
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user info
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User info retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, authController.me.bind(authController));

/**
 * @swagger
 * /api/auth/session:
 *   get:
 *     summary: Get current session with user info and entitlements
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session info retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     entitlements:
 *                       type: object
 *                     isAuthenticated:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/session', authenticate, authController.session.bind(authController));

/**
 * @swagger
 * /api/auth/validate-token:
 *   post:
 *     summary: Validate an access token (internal service use)
 *     tags: [Authentication]
 *     security:
 *       - serviceKey: []
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
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Invalid token
 */
router.post('/validate-token', internalAuth, authController.validateToken.bind(authController));

// ==================== Two-Factor Authentication (2FA) Routes ====================

/**
 * @swagger
 * /api/auth/2fa/status:
 *   get:
 *     summary: Get 2FA status for authenticated user
 *     tags: [Two-Factor Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA status retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/2fa/status', authenticate, authController.get2FAStatus.bind(authController));

/**
 * @swagger
 * /api/auth/2fa/setup:
 *   post:
 *     summary: Start 2FA setup process
 *     description: |
 *       SECURITY: Requires password verification before generating 2FA secret.
 *       Returns QR code and backup codes for authenticator app setup.
 *     tags: [Two-Factor Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 description: Current account password for verification
 *     responses:
 *       200:
 *         description: 2FA setup initiated, returns QR code and backup codes
 *       400:
 *         description: 2FA already enabled or validation error
 *       401:
 *         description: Invalid password or unauthorized
 */
router.post(
  '/2fa/setup',
  authenticate,
  authLimiter,
  validate(setup2FASchema),
  authController.setup2FA.bind(authController)
);

/**
 * @swagger
 * /api/auth/2fa/verify:
 *   post:
 *     summary: Verify 2FA token and enable 2FA
 *     description: Verifies the TOTP code from authenticator app and enables 2FA
 *     tags: [Two-Factor Authentication]
 *     security:
 *       - bearerAuth: []
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
 *                 description: 6-digit TOTP code from authenticator app
 *               tempSecret:
 *                 type: string
 *                 description: Optional temporary secret (from setup response)
 *     responses:
 *       200:
 *         description: 2FA enabled successfully
 *       400:
 *         description: Invalid verification code or no setup in progress
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/2fa/verify',
  authenticate,
  authLimiter,
  validate(verify2FASchema),
  authController.verify2FA.bind(authController)
);

/**
 * @swagger
 * /api/auth/2fa/disable:
 *   post:
 *     summary: Disable 2FA for authenticated user
 *     description: |
 *       SECURITY: Requires both password verification AND valid 2FA token or backup code.
 *       This ensures the user has full control of their account before disabling 2FA.
 *     tags: [Two-Factor Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - token
 *             properties:
 *               password:
 *                 type: string
 *                 description: Current account password for verification
 *               token:
 *                 type: string
 *                 description: 6-digit TOTP code or backup code
 *     responses:
 *       200:
 *         description: 2FA disabled successfully
 *       400:
 *         description: Invalid verification code or 2FA not enabled
 *       401:
 *         description: Invalid password or unauthorized
 */
router.post(
  '/2fa/disable',
  authenticate,
  authLimiter,
  validate(disable2FASchema),
  authController.disable2FA.bind(authController)
);

/**
 * @swagger
 * /api/auth/2fa/validate:
 *   post:
 *     summary: Validate 2FA token during login
 *     description: Used during login flow for accounts with 2FA enabled
 *     tags: [Two-Factor Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - token
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               token:
 *                 type: string
 *                 description: 6-digit TOTP code or backup code
 *     responses:
 *       200:
 *         description: 2FA validation successful
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid verification code
 */
router.post(
  '/2fa/validate',
  authLimiter,
  validate(validate2FASchema),
  authController.validate2FA.bind(authController)
);

/**
 * @swagger
 * /api/auth/2fa/backup-codes/regenerate:
 *   post:
 *     summary: Regenerate backup codes
 *     description: |
 *       SECURITY: Requires password verification before regenerating backup codes.
 *       Previous backup codes will be invalidated.
 *     tags: [Two-Factor Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 description: Current account password for verification
 *     responses:
 *       200:
 *         description: Backup codes regenerated, returns new codes
 *       400:
 *         description: 2FA not enabled or validation error
 *       401:
 *         description: Invalid password or unauthorized
 */
router.post(
  '/2fa/backup-codes/regenerate',
  authenticate,
  authLimiter,
  validate(regenerateBackupCodesSchema),
  authController.regenerateBackupCodes.bind(authController)
);

export default router;
