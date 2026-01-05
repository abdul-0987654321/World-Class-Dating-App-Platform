import { Request, Response } from 'express';

import { PasswordResetService } from '../../domain/services/password-reset.service';
import logger from '../../utils/logger';

export class PasswordResetController {
  private passwordResetService: PasswordResetService;

  constructor(passwordResetService?: PasswordResetService) {
    this.passwordResetService = passwordResetService || new PasswordResetService();
  }

  async requestReset(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      await this.passwordResetService.requestPasswordReset(email);

      return res.status(200).json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent',
      });
    } catch (error: any) {
      logger.error('Password reset request error:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to process password reset request',
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

      await this.passwordResetService.resetPassword(token, newPassword);

      return res.status(200).json({
        success: true,
        message: 'Password reset successful',
      });
    } catch (error: any) {
      logger.error('Password reset error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Password reset failed',
      });
    }
  }

  async verifyToken(req: Request, res: Response): Promise<Response> {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token is required',
        });
      }

      const isValid = await this.passwordResetService.verifyResetToken(token);

      return res.status(200).json({
        success: true,
        valid: isValid,
      });
    } catch (error: any) {
      logger.error('Token verification error:', error);

      return res.status(500).json({
        success: false,
        message: 'Token verification failed',
      });
    }
  }
}
