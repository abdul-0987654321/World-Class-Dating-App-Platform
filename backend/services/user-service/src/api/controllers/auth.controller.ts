import { Request, Response } from 'express';
import { AuthService } from '../../domain/services/auth.service';
import { VerificationService } from '../../domain/services/verification.service';
import logger from '../../utils/logger';

export class AuthController {
  private authService: AuthService;
  private verificationService: VerificationService;

  constructor(authService?: AuthService, verificationService?: VerificationService) {
    this.authService = authService || new AuthService();
    this.verificationService = verificationService || new VerificationService();
  }

  async register(req: Request, res: Response): Promise<Response> {
    try {
      const result = await this.authService.register(req.body);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error: any) {
      logger.error('Registration error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Registration failed',
      });
    }
  }

  async login(req: Request, res: Response): Promise<Response> {
    try {
      const result = await this.authService.login(req.body);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error: any) {
      logger.error('Login error:', error);

      return res.status(401).json({
        success: false,
        message: error.message || 'Login failed',
      });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required',
        });
      }

      const result = await this.authService.refreshToken(refreshToken);

      return res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error: any) {
      logger.error('Token refresh error:', error);

      return res.status(401).json({
        success: false,
        message: error.message || 'Token refresh failed',
      });
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<Response> {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required',
        });
      }

      await this.verificationService.verifyEmail(token);

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error: any) {
      logger.error('Email verification error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Email verification failed',
      });
    }
  }

  async resendVerification(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      await this.verificationService.resendVerificationEmail(email);

      return res.status(200).json({
        success: true,
        message: 'Verification email sent successfully',
      });
    } catch (error: any) {
      logger.error('Resend verification error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to send verification email',
      });
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      await this.authService.requestPasswordReset(email);

      return res.status(200).json({
        success: true,
        message: 'Password reset email sent successfully',
      });
    } catch (error: any) {
      logger.error('Forgot password error:', error);

      // Return success even if user not found (security best practice)
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Token and new password are required',
        });
      }

      await this.authService.resetPassword(token, newPassword);

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error: any) {
      logger.error('Reset password error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Password reset failed',
      });
    }
  }
}
