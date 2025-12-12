import { Request, Response } from 'express';
import authService from '../../domain/services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';
import logger from '../../utils/logger';

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
    } catch (error: any) {
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
    } catch (error: any) {
      logger.error('Login failed', error);

      // Return specific error messages for lockout scenarios
      if (error.message.includes('locked') || error.message.includes('attempts remaining')) {
        return res.status(401).json({
          success: false,
          error: error.message,
        });
      }

      // Use generic message for security
      const message = error.message === 'Account is deactivated'
        ? error.message
        : 'Invalid credentials';

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
      const userId = req.user!.userId;
      const token = req.headers.authorization?.substring(7) || '';

      await authService.logout(userId, token);

      return res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
      const userId = req.user!.userId;
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
    } catch (error: any) {
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
    } catch (error: any) {
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
}

export const authController = new AuthController();
export default authController;
