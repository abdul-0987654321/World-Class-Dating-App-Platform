import { Request, Response, CookieOptions } from 'express';
import { v4 as uuidv4 } from 'uuid';

import authService from '../../domain/services/auth.service';
import twoFactorService from '../../domain/services/two-factor.service';
import logger from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Helper to get correlation ID from request
 */
function getCorrelationId(req: Request): string {
  return (req.headers['x-correlation-id'] as string) || (req as any).correlationId || uuidv4();
}

/**
 * Helper to send standardized error response
 */
function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  correlationId: string
): Response {
  res.setHeader('X-Correlation-ID', correlationId);
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
    },
  });
}

// Cookie configuration for secure token storage
const isProduction = process.env.NODE_ENV === 'production';
const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

const ACCESS_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction, // HTTPS only in production
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000, // 15 minutes (matches JWT expiry)
  path: '/',
  domain: cookieDomain,
};

const REFRESH_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction, // HTTPS only in production
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matches refresh token expiry)
  path: '/api/v1/auth', // Only sent to auth endpoints
  domain: cookieDomain,
};

class AuthController {
  /**
   * Set authentication cookies on response
   * @param res Express Response object
   * @param accessToken Access token to set
   * @param refreshToken Refresh token to set
   */
  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    res.cookie('access_token', accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
    res.cookie('refresh_token', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
  }

  /**
   * Clear authentication cookies on response
   * @param res Express Response object
   */
  private clearAuthCookies(res: Response): void {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      domain: cookieDomain,
    });
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/api/v1/auth',
      domain: cookieDomain,
    });
  }
  /**
   * POST /api/auth/register
   * Register a new user
   * Sets httpOnly cookies for access and refresh tokens
   */
  async register(req: Request, res: Response): Promise<Response> {
    const correlationId = getCorrelationId(req);
    try {
      const result = await authService.register(req.body);

      // Set httpOnly cookies for tokens (XSS protection)
      this.setAuthCookies(res, result.accessToken, result.refreshToken);

      res.setHeader('X-Correlation-ID', correlationId);
      // Return user data without exposing tokens in response body
      return res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email.',
        data: {
          user: result.user,
          // Tokens are now in httpOnly cookies, not exposed to JavaScript
        },
      });
    } catch (error: any) {
      logger.error('Registration failed', { error: error.message, correlationId });
      return sendError(
        res,
        400,
        'VALIDATION_FAILED',
        error.message || 'Registration failed',
        correlationId
      );
    }
  }

  /**
   * POST /api/auth/login
   * Login user with enhanced security
   * Sets httpOnly cookies for access and refresh tokens
   */
  async login(req: Request, res: Response): Promise<Response> {
    const correlationId = getCorrelationId(req);
    try {
      // Extract IP and user agent from request
      const ip = this.getClientIp(req);
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Extract device data from request body if provided
      const { deviceData, ...loginData } = req.body;

      const result = await authService.login({
        ...loginData,
        ip,
        userAgent,
        deviceData,
      });

      // Set httpOnly cookies for tokens (XSS protection)
      this.setAuthCookies(res, result.accessToken, result.refreshToken);

      res.setHeader('X-Correlation-ID', correlationId);
      // Return user data without exposing tokens in response body
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          // Tokens are now in httpOnly cookies, not exposed to JavaScript
        },
      });
    } catch (error: any) {
      logger.error('Login failed', { error: error.message, correlationId });

      // Return specific error messages for lockout scenarios
      if (error.message?.includes('locked')) {
        return sendError(res, 423, 'AUTH_ACCOUNT_LOCKED', error.message, correlationId);
      }

      if (error.message?.includes('attempts remaining')) {
        return sendError(res, 401, 'AUTH_INVALID_CREDENTIALS', error.message, correlationId);
      }

      if (error.message === 'Account is deactivated') {
        return sendError(res, 403, 'AUTH_ACCOUNT_DEACTIVATED', error.message, correlationId);
      }

      // Use generic message for security
      return sendError(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials', correlationId);
    }
  }

  /**
   * POST /api/auth/logout
   * Logout user
   * Clears httpOnly authentication cookies
   */
  async logout(req: AuthRequest, res: Response): Promise<Response> {
    const correlationId = getCorrelationId(req);
    try {
      const userId = req.user.userId;
      // Get token from cookie first, fallback to Authorization header for backwards compatibility
      const token = req.cookies?.access_token || req.headers.authorization?.substring(7) || '';
      const refreshToken = req.cookies?.refresh_token;

      await authService.logout(userId, token, refreshToken);

      // Clear httpOnly cookies
      this.clearAuthCookies(res);

      res.setHeader('X-Correlation-ID', correlationId);
      return res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error: any) {
      logger.error('Logout failed', { error: error.message, correlationId });
      // Still clear cookies even on error
      this.clearAuthCookies(res);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Logout failed', correlationId);
    }
  }

  /**
   * POST /api/auth/refresh-token
   * Refresh access token
   * Reads refresh token from httpOnly cookie and sets new tokens in cookies
   */
  async refreshToken(req: Request, res: Response): Promise<Response> {
    const correlationId = getCorrelationId(req);
    try {
      // Get refresh token from httpOnly cookie first, fallback to body for backwards compatibility
      const refreshToken = req.cookies?.refresh_token || req.body.refreshToken;

      if (!refreshToken) {
        return sendError(res, 400, 'VALIDATION_FAILED', 'Refresh token is required', correlationId);
      }

      const tokens = await authService.refreshToken(refreshToken);

      // Set new httpOnly cookies with rotated tokens
      this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      res.setHeader('X-Correlation-ID', correlationId);
      return res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        // Tokens are now in httpOnly cookies, not exposed to JavaScript
      });
    } catch (error: any) {
      logger.error('Token refresh failed', { error: error.message, correlationId });
      // Clear cookies on refresh failure (token may be compromised)
      this.clearAuthCookies(res);
      return sendError(
        res,
        401,
        'AUTH_REFRESH_TOKEN_INVALID',
        error.message || 'Invalid refresh token',
        correlationId
      );
    }
  }

  /**
   * POST /api/auth/verify-email
   * Verify email with token
   */
  async verifyEmail(req: Request, res: Response): Promise<Response> {
    const correlationId = getCorrelationId(req);
    try {
      const { token } = req.body;

      if (!token) {
        return sendError(
          res,
          400,
          'VALIDATION_FAILED',
          'Verification token is required',
          correlationId
        );
      }

      await authService.verifyEmail(token);

      res.setHeader('X-Correlation-ID', correlationId);
      return res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error: any) {
      logger.error('Email verification failed', { error: error.message, correlationId });
      return sendError(
        res,
        400,
        'AUTH_TOKEN_INVALID',
        error.message || 'Email verification failed',
        correlationId
      );
    }
  }

  /**
   * POST /api/auth/resend-verification
   * Resend verification email
   */
  async resendVerification(req: Request, res: Response): Promise<Response> {
    const correlationId = getCorrelationId(req);
    try {
      const { email } = req.body;

      if (!email) {
        return sendError(res, 400, 'VALIDATION_FAILED', 'Email is required', correlationId);
      }

      await authService.resendVerificationEmail(email);

      res.setHeader('X-Correlation-ID', correlationId);
      return res.status(200).json({
        success: true,
        message: 'Verification email sent',
      });
    } catch (error: any) {
      logger.error('Resend verification failed', { error: error.message, correlationId });
      return sendError(
        res,
        400,
        'VALIDATION_FAILED',
        error.message || 'Failed to send verification email',
        correlationId
      );
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Request password reset
   */
  async forgotPassword(req: Request, res: Response): Promise<Response> {
    const correlationId = getCorrelationId(req);
    try {
      const { email } = req.body;

      if (!email) {
        return sendError(res, 400, 'VALIDATION_FAILED', 'Email is required', correlationId);
      }

      await authService.requestPasswordReset(email);

      // Always return success for security (don't reveal if email exists)
      res.setHeader('X-Correlation-ID', correlationId);
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent',
      });
    } catch (error: any) {
      logger.error('Password reset request failed', { error: error.message, correlationId });
      return sendError(
        res,
        500,
        'INTERNAL_ERROR',
        'Failed to process password reset request',
        correlationId
      );
    }
  }

  /**
   * POST /api/auth/reset-password
   * Reset password with token
   */
  async resetPassword(req: Request, res: Response): Promise<Response> {
    const correlationId = getCorrelationId(req);
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return sendError(
          res,
          400,
          'VALIDATION_FAILED',
          'Token and new password are required',
          correlationId
        );
      }

      await authService.resetPassword(token, newPassword);

      res.setHeader('X-Correlation-ID', correlationId);
      return res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error: any) {
      logger.error('Password reset failed', { error: error.message, correlationId });
      return sendError(
        res,
        400,
        'AUTH_TOKEN_INVALID',
        error.message || 'Password reset failed',
        correlationId
      );
    }
  }

  /**
   * GET /api/auth/me
   * Get current user info
   */
  async me(req: AuthRequest, res: Response): Promise<Response> {
    const correlationId = getCorrelationId(req);
    try {
      const userId = req.user.userId;
      const user = await authService.getUserById(userId);

      if (!user) {
        return sendError(res, 404, 'RESOURCE_NOT_FOUND', 'User not found', correlationId);
      }

      res.setHeader('X-Correlation-ID', correlationId);
      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      logger.error('Failed to get user info', { error: error.message, correlationId });
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to get user info', correlationId);
    }
  }

  /**
   * GET /api/auth/session
   * Get current session with user info and entitlements
   * Returns full session data for frontend initialization
   */
  async session(req: AuthRequest, res: Response): Promise<Response> {
    const correlationId = getCorrelationId(req);
    try {
      const userId = req.user.userId;
      const user = await authService.getUserById(userId);

      if (!user) {
        return sendError(res, 404, 'RESOURCE_NOT_FOUND', 'User not found', correlationId);
      }

      // Get user's subscription tier (default to FREE if not set)
      const subscriptionTier =
        (user as any).subscription_tier || (user as any).premiumTier || 'FREE';

      // Build entitlements based on subscription tier
      const entitlements = this.getEntitlementsForTier(subscriptionTier);

      res.setHeader('X-Correlation-ID', correlationId);
      return res.status(200).json({
        success: true,
        data: {
          user,
          entitlements,
          isAuthenticated: true,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get session', { error: error.message, correlationId });
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to get session', correlationId);
    }
  }

  /**
   * Get entitlements for a subscription tier
   */
  private getEntitlementsForTier(tier: string): {
    tier: string;
    features: string[];
    limits: Record<string, number | boolean>;
  } {
    const tierEntitlements: Record<
      string,
      { tier: string; features: string[]; limits: Record<string, number | boolean> }
    > = {
      FREE: {
        tier: 'FREE',
        features: ['basic_matching', 'messaging'],
        limits: {
          dailyLikes: 10,
          dailySuperLikes: 0,
          dailyBoosts: 0,
          messagesBeforeMatch: false,
          seeWhoLikesYou: false,
          advancedFilters: false,
          readReceipts: false,
          incognitoMode: false,
          videoCalls: false,
          prioritySupport: false,
        },
      },
      GOLD: {
        tier: 'GOLD',
        features: ['basic_matching', 'messaging', 'unlimited_likes', 'see_likes', 'rewind'],
        limits: {
          dailyLikes: -1,
          dailySuperLikes: 5,
          dailyBoosts: 1,
          messagesBeforeMatch: false,
          seeWhoLikesYou: true,
          advancedFilters: true,
          readReceipts: false,
          incognitoMode: false,
          videoCalls: false,
          prioritySupport: false,
        },
      },
      PLATINUM: {
        tier: 'PLATINUM',
        features: [
          'basic_matching',
          'messaging',
          'unlimited_likes',
          'see_likes',
          'rewind',
          'priority',
          'read_receipts',
          'incognito',
        ],
        limits: {
          dailyLikes: -1,
          dailySuperLikes: 10,
          dailyBoosts: 3,
          messagesBeforeMatch: true,
          seeWhoLikesYou: true,
          advancedFilters: true,
          readReceipts: true,
          incognitoMode: true,
          videoCalls: true,
          prioritySupport: false,
        },
      },
      DIAMOND: {
        tier: 'DIAMOND',
        features: ['all'],
        limits: {
          dailyLikes: -1,
          dailySuperLikes: -1,
          dailyBoosts: -1,
          messagesBeforeMatch: true,
          seeWhoLikesYou: true,
          advancedFilters: true,
          readReceipts: true,
          incognitoMode: true,
          videoCalls: true,
          prioritySupport: true,
        },
      },
      ELITE: {
        tier: 'ELITE',
        features: ['all', 'vip'],
        limits: {
          dailyLikes: -1,
          dailySuperLikes: -1,
          dailyBoosts: -1,
          messagesBeforeMatch: true,
          seeWhoLikesYou: true,
          advancedFilters: true,
          readReceipts: true,
          incognitoMode: true,
          videoCalls: true,
          prioritySupport: true,
        },
      },
    };

    return tierEntitlements[tier.toUpperCase()] || tierEntitlements.FREE;
  }

  /**
   * POST /api/auth/validate-token
   * Validate an access token (for internal service calls)
   */
  async validateToken(req: Request, res: Response): Promise<Response> {
    const correlationId = getCorrelationId(req);
    try {
      const { token } = req.body;

      if (!token) {
        return sendError(res, 400, 'VALIDATION_FAILED', 'Token is required', correlationId);
      }

      const user = await authService.validateToken(token);

      if (!user) {
        return sendError(res, 401, 'AUTH_TOKEN_INVALID', 'Invalid token', correlationId);
      }

      res.setHeader('X-Correlation-ID', correlationId);
      return res.status(200).json({
        success: true,
        data: { valid: true, user },
      });
    } catch (error: any) {
      logger.error('Token validation failed', { error: error.message, correlationId });
      return sendError(res, 500, 'INTERNAL_ERROR', 'Token validation failed', correlationId);
    }
  }

  /**
   * Helper method to extract client IP
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];

    if (forwarded) {
      const ips = (forwarded as string).split(',');
      return ips[0].trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }

    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  // ==================== Two-Factor Authentication (2FA) Methods ====================

  /**
   * GET /api/auth/2fa/status
   * Get 2FA status for the authenticated user
   */
  async get2FAStatus(req: AuthRequest, res: Response): Promise<Response> {
    const correlationId = getCorrelationId(req);
    try {
      const userId = req.user.userId;
      const status = await twoFactorService.get2FAStatus(userId);

      res.setHeader('X-Correlation-ID', correlationId);
      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      logger.error('Failed to get 2FA status', { error: error.message, correlationId });
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to get 2FA status', correlationId);
    }
  }

  /**
   * POST /api/auth/2fa/setup
   * Start 2FA setup process
   * SECURITY: Requires password verification before generating secret
   */
  async setup2FA(req: AuthRequest, res: Response): Promise<Response> {
    const correlationId = getCorrelationId(req);
    try {
      const userId = req.user.userId;
      const { password } = req.body;

      if (!password) {
        return sendError(
          res,
          400,
          'VALIDATION_FAILED',
          'Password is required to setup 2FA',
          correlationId
        );
      }

      const result = await twoFactorService.setup2FA({ userId, password });

      res.setHeader('X-Correlation-ID', correlationId);
      return res.status(200).json({
        success: true,
        message: 'Scan the QR code with your authenticator app, then verify with a code',
        data: result,
      });
    } catch (error: any) {
      logger.error('2FA setup failed', { error: error.message, correlationId });

      // Return 401 Unauthorized for password verification failures
      if (error.message === 'Invalid password') {
        return sendError(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid password', correlationId);
      }

      return sendError(
        res,
        400,
        'VALIDATION_FAILED',
        error.message || '2FA setup failed',
        correlationId
      );
    }
  }

  /**
   * POST /api/auth/2fa/verify
   * Verify 2FA token and enable 2FA
   */
  async verify2FA(req: AuthRequest, res: Response): Promise<Response> {
    const correlationId = getCorrelationId(req);
    try {
      const userId = req.user.userId;
      const { token, tempSecret } = req.body;

      if (!token) {
        return sendError(
          res,
          400,
          'VALIDATION_FAILED',
          'Verification token is required',
          correlationId
        );
      }

      const result = await twoFactorService.verifyAndEnable2FA({
        userId,
        token,
        tempSecret,
      });

      if (!result.success) {
        return sendError(res, 400, 'AUTH_MFA_REQUIRED', result.message, correlationId);
      }

      res.setHeader('X-Correlation-ID', correlationId);
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      logger.error('2FA verification failed', { error: error.message, correlationId });
      return sendError(
        res,
        400,
        'AUTH_MFA_REQUIRED',
        error.message || '2FA verification failed',
        correlationId
      );
    }
  }

  /**
   * POST /api/auth/2fa/disable
   * Disable 2FA for the authenticated user
   * SECURITY: Requires password verification AND valid 2FA token/backup code
   */
  async disable2FA(req: AuthRequest, res: Response): Promise<Response> {
    const correlationId = getCorrelationId(req);
    try {
      const userId = req.user.userId;
      const { password, token } = req.body;

      if (!password) {
        return sendError(
          res,
          400,
          'VALIDATION_FAILED',
          'Password is required to disable 2FA',
          correlationId
        );
      }

      if (!token) {
        return sendError(
          res,
          400,
          'VALIDATION_FAILED',
          'Verification code or backup code is required',
          correlationId
        );
      }

      const result = await twoFactorService.disable2FA({
        userId,
        password,
        token,
      });

      if (!result.success) {
        return sendError(res, 400, 'AUTH_MFA_REQUIRED', result.message, correlationId);
      }

      res.setHeader('X-Correlation-ID', correlationId);
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      logger.error('2FA disable failed', { error: error.message, correlationId });

      // Return 401 Unauthorized for password verification failures
      if (error.message === 'Invalid password') {
        return sendError(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid password', correlationId);
      }

      return sendError(
        res,
        400,
        'AUTH_MFA_REQUIRED',
        error.message || '2FA disable failed',
        correlationId
      );
    }
  }

  /**
   * POST /api/auth/2fa/validate
   * Validate 2FA token during login (for 2FA-enabled accounts)
   */
  async validate2FA(req: Request, res: Response): Promise<Response> {
    const correlationId = getCorrelationId(req);
    try {
      const { userId, token } = req.body;

      if (!userId || !token) {
        return sendError(
          res,
          400,
          'VALIDATION_FAILED',
          'User ID and verification code are required',
          correlationId
        );
      }

      const result = await twoFactorService.validate2FALogin({ userId, token });

      if (!result.success) {
        return sendError(res, 401, 'AUTH_MFA_REQUIRED', result.message, correlationId);
      }

      res.setHeader('X-Correlation-ID', correlationId);
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      logger.error('2FA validation failed', { error: error.message, correlationId });
      return sendError(
        res,
        400,
        'AUTH_MFA_REQUIRED',
        error.message || '2FA validation failed',
        correlationId
      );
    }
  }

  /**
   * POST /api/auth/2fa/backup-codes/regenerate
   * Regenerate backup codes
   * SECURITY: Requires password verification before regenerating
   */
  async regenerateBackupCodes(req: AuthRequest, res: Response): Promise<Response> {
    const correlationId = getCorrelationId(req);
    try {
      const userId = req.user.userId;
      const { password } = req.body;

      if (!password) {
        return sendError(
          res,
          400,
          'VALIDATION_FAILED',
          'Password is required to regenerate backup codes',
          correlationId
        );
      }

      const backupCodes = await twoFactorService.regenerateBackupCodes(userId, password);

      res.setHeader('X-Correlation-ID', correlationId);
      return res.status(200).json({
        success: true,
        message: 'Backup codes regenerated successfully. Please store them securely.',
        data: { backupCodes },
      });
    } catch (error: any) {
      logger.error('Backup codes regeneration failed', { error: error.message, correlationId });

      // Return 401 Unauthorized for password verification failures
      if (error.message === 'Invalid password') {
        return sendError(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid password', correlationId);
      }

      return sendError(
        res,
        400,
        'VALIDATION_FAILED',
        error.message || 'Failed to regenerate backup codes',
        correlationId
      );
    }
  }
}

export const authController = new AuthController();
export default authController;
