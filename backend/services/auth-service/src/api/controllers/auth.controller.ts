import { Request, Response } from 'express';

import authService from '../../domain/services/auth.service';
import twoFactorService from '../../domain/services/two-factor.service';
import logger from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

class AuthController {
  /**
   * POST /api/auth/register
   * Register a new user
   */
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const result = await authService.register(req.body);

      return res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email.',
        data: result,
      });
    } catch (error) {
      logger.error('Registration failed', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Registration failed',
      });
    }
  }

  /**
   * POST /api/auth/login
   * Login user with enhanced security
   */
  async login(req: Request, res: Response): Promise<Response> {
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

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      logger.error('Login failed', error);

      // Return specific error messages for lockout scenarios
      if (error.message.includes('locked') || error.message.includes('attempts remaining')) {
        return res.status(401).json({
          success: false,
          error: error.message,
        });
      }

      // Use generic message for security
      const message =
        error.message === 'Account is deactivated' ? error.message : 'Invalid credentials';

      return res.status(401).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Logout user
   */
  async logout(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const token = req.headers.authorization?.substring(7) || '';

      await authService.logout(userId, token);

      return res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('Logout failed', error);
      return res.status(500).json({
        success: false,
        error: 'Logout failed',
      });
    }
  }

  /**
   * POST /api/auth/refresh-token
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token is required',
        });
      }

      const tokens = await authService.refreshToken(refreshToken);

      return res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: tokens,
      });
    } catch (error) {
      logger.error('Token refresh failed', error);
      return res.status(401).json({
        success: false,
        error: error.message || 'Invalid refresh token',
      });
    }
  }

  /**
   * POST /api/auth/verify-email
   * Verify email with token
   */
  async verifyEmail(req: Request, res: Response): Promise<Response> {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Verification token is required',
        });
      }

      await authService.verifyEmail(token);

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      logger.error('Email verification failed', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Email verification failed',
      });
    }
  }

  /**
   * POST /api/auth/resend-verification
   * Resend verification email
   */
  async resendVerification(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
        });
      }

      await authService.resendVerificationEmail(email);

      return res.status(200).json({
        success: true,
        message: 'Verification email sent',
      });
    } catch (error) {
      logger.error('Resend verification failed', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to send verification email',
      });
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Request password reset
   */
  async forgotPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
        });
      }

      await authService.requestPasswordReset(email);

      // Always return success for security (don't reveal if email exists)
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent',
      });
    } catch (error) {
      logger.error('Password reset request failed', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process password reset request',
      });
    }
  }

  /**
   * POST /api/auth/reset-password
   * Reset password with token
   */
  async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Token and new password are required',
        });
      }

      await authService.resetPassword(token, newPassword);

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      logger.error('Password reset failed', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Password reset failed',
      });
    }
  }

  /**
   * GET /api/auth/me
   * Get current user info
   */
  async me(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const user = await authService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Failed to get user info', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get user info',
      });
    }
  }

  /**
   * POST /api/auth/validate-token
   * Validate an access token (for internal service calls)
   */
  async validateToken(req: Request, res: Response): Promise<Response> {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Token is required',
        });
      }

      const user = await authService.validateToken(token);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
        });
      }

      return res.status(200).json({
        success: true,
        data: { valid: true, user },
      });
    } catch (error) {
      logger.error('Token validation failed', error);
      return res.status(500).json({
        success: false,
        error: 'Token validation failed',
      });
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
    try {
      const userId = req.user.userId;
      const status = await twoFactorService.get2FAStatus(userId);

      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error('Failed to get 2FA status', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get 2FA status',
      });
    }
  }

  /**
   * POST /api/auth/2fa/setup
   * Start 2FA setup process
   * SECURITY: Requires password verification before generating secret
   */
  async setup2FA(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required to setup 2FA',
        });
      }

      const result = await twoFactorService.setup2FA({ userId, password });

      return res.status(200).json({
        success: true,
        message: 'Scan the QR code with your authenticator app, then verify with a code',
        data: result,
      });
    } catch (error) {
      logger.error('2FA setup failed', error);

      // Return 401 Unauthorized for password verification failures
      if (error.message === 'Invalid password') {
        return res.status(401).json({
          success: false,
          error: 'Invalid password',
        });
      }

      return res.status(400).json({
        success: false,
        error: error.message || '2FA setup failed',
      });
    }
  }

  /**
   * POST /api/auth/2fa/verify
   * Verify 2FA token and enable 2FA
   */
  async verify2FA(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const { token, tempSecret } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Verification token is required',
        });
      }

      const result = await twoFactorService.verifyAndEnable2FA({
        userId,
        token,
        tempSecret,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      logger.error('2FA verification failed', error);
      return res.status(400).json({
        success: false,
        error: error.message || '2FA verification failed',
      });
    }
  }

  /**
   * POST /api/auth/2fa/disable
   * Disable 2FA for the authenticated user
   * SECURITY: Requires password verification AND valid 2FA token/backup code
   */
  async disable2FA(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const { password, token } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required to disable 2FA',
        });
      }

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Verification code or backup code is required',
        });
      }

      const result = await twoFactorService.disable2FA({
        userId,
        password,
        token,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      logger.error('2FA disable failed', error);

      // Return 401 Unauthorized for password verification failures
      if (error.message === 'Invalid password') {
        return res.status(401).json({
          success: false,
          error: 'Invalid password',
        });
      }

      return res.status(400).json({
        success: false,
        error: error.message || '2FA disable failed',
      });
    }
  }

  /**
   * POST /api/auth/2fa/validate
   * Validate 2FA token during login (for 2FA-enabled accounts)
   */
  async validate2FA(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, token } = req.body;

      if (!userId || !token) {
        return res.status(400).json({
          success: false,
          error: 'User ID and verification code are required',
        });
      }

      const result = await twoFactorService.validate2FALogin({ userId, token });

      if (!result.success) {
        return res.status(401).json({
          success: false,
          error: result.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      logger.error('2FA validation failed', error);
      return res.status(400).json({
        success: false,
        error: error.message || '2FA validation failed',
      });
    }
  }

  /**
   * POST /api/auth/2fa/backup-codes/regenerate
   * Regenerate backup codes
   * SECURITY: Requires password verification before regenerating
   */
  async regenerateBackupCodes(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required to regenerate backup codes',
        });
      }

      const backupCodes = await twoFactorService.regenerateBackupCodes(userId, password);

      return res.status(200).json({
        success: true,
        message: 'Backup codes regenerated successfully. Please store them securely.',
        data: { backupCodes },
      });
    } catch (error) {
      logger.error('Backup codes regeneration failed', error);

      // Return 401 Unauthorized for password verification failures
      if (error.message === 'Invalid password') {
        return res.status(401).json({
          success: false,
          error: 'Invalid password',
        });
      }

      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to regenerate backup codes',
      });
    }
  }
}

export const authController = new AuthController();
export default authController;
