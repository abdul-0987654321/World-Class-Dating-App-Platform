import { Request, Response } from 'express';
import { VerificationService } from '../../domain/services/verification.service';
import logger from '../../utils/logger';

export class VerificationController {
  private verificationService: VerificationService;

  constructor(verificationService?: VerificationService) {
    this.verificationService = verificationService || new VerificationService();
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
        message: error.message || 'Failed to resend verification email',
      });
    }
  }
}
