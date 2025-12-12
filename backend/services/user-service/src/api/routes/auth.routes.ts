import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { authLimiter } from '../middleware/rate-limit.middleware';
import { authenticateToken } from '../../middleware/auth.middleware';
import { registerSchema, loginSchema } from '../validators/user.validator';

const router = Router();
const authController = new AuthController();

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
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: SecurePass123!
 *                 description: Must contain uppercase, lowercase, number, and special character
 *               first_name:
 *                 type: string
 *                 minLength: 2
 *                 example: John
 *               last_name:
 *                 type: string
 *                 minLength: 2
 *                 example: Doe
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: 1995-05-15
 *                 description: User must be 18+ years old
 *               gender:
 *                 type: string
 *                 enum: [male, female, non-binary, other]
 *                 example: male
 *               phone_number:
 *                 type: string
 *                 example: +1234567890
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.post(
  '/register',
  authLimiter,
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
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Missing credentials
 *       401:
 *         description: Invalid credentials or account deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many login attempts
 */
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  authController.login.bind(authController)
);

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
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       400:
 *         description: Refresh token missing
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh-token', authController.refreshToken.bind(authController));

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
 *                 example: abc123def456
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/verify-email', authController.verifyEmail.bind(authController));

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
 *                 example: john.doe@example.com
 *     responses:
 *       200:
 *         description: Verification email sent
 *       400:
 *         description: Email already verified or user not found
 */
router.post('/resend-verification', authController.resendVerification.bind(authController));

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
 *                 example: john.doe@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: User not found
 */
router.post('/forgot-password', authLimiter, authController.forgotPassword.bind(authController));

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
 *                 example: abc123def456
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: NewSecurePass123!
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password', authController.resetPassword.bind(authController));

/**
 * @swagger
 * /api/auth/oauth/generate-state:
 *   post:
 *     summary: Generate state parameter for OAuth CSRF protection
 *     tags: [Social Authentication]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nonce:
 *                 type: string
 *                 description: Optional nonce for replay attack prevention
 *     responses:
 *       200:
 *         description: State generated successfully
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
 *                     state:
 *                       type: string
 *                     expiresIn:
 *                       type: number
 *                       description: Expiration time in seconds
 *       500:
 *         description: Failed to generate state
 */
router.post('/oauth/generate-state', authController.generateOAuthState.bind(authController));

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Login or register with Google OAuth 2.0
 *     tags: [Social Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: Authorization code from Google OAuth flow
 *               id_token:
 *                 type: string
 *                 description: Google ID token (alternative to code)
 *               access_token:
 *                 type: string
 *                 description: Google access token
 *               state:
 *                 type: string
 *                 description: State parameter for CSRF protection
 *               nonce:
 *                 type: string
 *                 description: Nonce for replay attack prevention
 *     responses:
 *       200:
 *         description: Login/registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SocialAuthResponse'
 *       401:
 *         description: Google authentication failed
 */
router.post('/google', authLimiter, authController.googleLogin.bind(authController));

/**
 * @swagger
 * /api/auth/apple:
 *   post:
 *     summary: Login or register with Apple Sign In
 *     tags: [Social Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - id_token
 *             properties:
 *               code:
 *                 type: string
 *                 description: Authorization code from Apple
 *               id_token:
 *                 type: string
 *                 description: Apple ID token
 *               state:
 *                 type: string
 *                 description: State parameter for CSRF protection
 *               nonce:
 *                 type: string
 *                 description: Nonce for replay attack prevention
 *               user:
 *                 type: object
 *                 description: User information (only provided on first login)
 *                 properties:
 *                   name:
 *                     type: object
 *                     properties:
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                   email:
 *                     type: string
 *     responses:
 *       200:
 *         description: Login/registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SocialAuthResponse'
 *       401:
 *         description: Apple authentication failed
 */
router.post('/apple', authLimiter, authController.appleLogin.bind(authController));

/**
 * @swagger
 * /api/auth/facebook:
 *   post:
 *     summary: Login or register with Facebook Login
 *     tags: [Social Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - access_token
 *             properties:
 *               access_token:
 *                 type: string
 *                 description: Facebook access token
 *               state:
 *                 type: string
 *                 description: State parameter for CSRF protection
 *     responses:
 *       200:
 *         description: Login/registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SocialAuthResponse'
 *       401:
 *         description: Facebook authentication failed
 */
router.post('/facebook', authLimiter, authController.facebookLogin.bind(authController));

/**
 * @swagger
 * /api/auth/social/link:
 *   post:
 *     summary: Link a social account to existing user account
 *     tags: [Social Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - token
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, apple, facebook]
 *               token:
 *                 type: object
 *                 description: Token payload specific to the provider
 *     responses:
 *       200:
 *         description: Account linked successfully
 *       400:
 *         description: Account already linked or invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/social/link', authenticateToken, authController.linkSocialAccount.bind(authController));

/**
 * @swagger
 * /api/auth/social/unlink:
 *   post:
 *     summary: Unlink a social account from user account
 *     tags: [Social Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, apple, facebook]
 *     responses:
 *       200:
 *         description: Account unlinked successfully
 *       400:
 *         description: Cannot unlink the only login method
 *       401:
 *         description: Unauthorized
 */
router.post('/social/unlink', authenticateToken, authController.unlinkSocialAccount.bind(authController));

/**
 * @swagger
 * /api/auth/social/linked:
 *   get:
 *     summary: Get all linked social accounts for the current user
 *     tags: [Social Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of linked accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       provider:
 *                         type: string
 *                       provider_email:
 *                         type: string
 *                       provider_name:
 *                         type: string
 *                       is_primary:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/social/linked', authenticateToken, authController.getLinkedAccounts.bind(authController));

/**
 * @swagger
 * /api/auth/social/refresh:
 *   post:
 *     summary: Refresh social provider token
 *     tags: [Social Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, apple, facebook]
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       400:
 *         description: Failed to refresh token
 *       401:
 *         description: Unauthorized
 */
router.post('/social/refresh', authenticateToken, authController.refreshSocialToken.bind(authController));

export default router;
