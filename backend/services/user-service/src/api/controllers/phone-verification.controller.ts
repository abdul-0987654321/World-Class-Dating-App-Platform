import { Request, Response } from 'express';

import phoneVerificationService from '../../domain/services/phone-verification.service';
import { createLogger } from '../../utils/logger';

const logger = createLogger('phone-verification-controller');

export class PhoneVerificationController {
  /**
   * Send verification code to user's phone
   * POST /api/users/phone/send-code
   */
  async sendVerificationCode(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id; // From auth middleware
      const { phoneNumber } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!phoneNumber) {
        res.status(400).json({
          success: false,
          error: 'Phone number is required',
        });
        return;
      }

      logger.info(`Send verification code request from user ${userId}`);

      const result = await phoneVerificationService.sendVerificationCode(userId, phoneNumber);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
        expiresAt: result.expiresAt,
      });
    } catch (error: any) {
      logger.error('Error in sendVerificationCode controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Verify the code entered by user
   * POST /api/users/phone/verify-code
   */
  async verifyCode(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { code } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!code) {
        res.status(400).json({
          success: false,
          error: 'Verification code is required',
        });
        return;
      }

      logger.info(`Verify code request from user ${userId}`);

      const result = await phoneVerificationService.verifyCode(userId, code);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      logger.error('Error in verifyCode controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Resend verification code
   * POST /api/users/phone/resend-code
   */
  async resendCode(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { phoneNumber } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!phoneNumber) {
        res.status(400).json({
          success: false,
          error: 'Phone number is required',
        });
        return;
      }

      logger.info(`Resend code request from user ${userId}`);

      const result = await phoneVerificationService.resendCode(userId, phoneNumber);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
        expiresAt: result.expiresAt,
      });
    } catch (error: any) {
      logger.error('Error in resendCode controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Update user's phone number
   * PUT /api/users/phone
   */
  async updatePhoneNumber(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { phoneNumber } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!phoneNumber) {
        res.status(400).json({
          success: false,
          error: 'Phone number is required',
        });
        return;
      }

      logger.info(`Update phone number request from user ${userId}`);

      const result = await phoneVerificationService.updatePhoneNumber(userId, phoneNumber);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      logger.error('Error in updatePhoneNumber controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get verification status
   * GET /api/users/phone/status
   */
  async getVerificationStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      logger.info(`Get verification status request from user ${userId}`);

      const status = await phoneVerificationService.getVerificationStatus(userId);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      logger.error('Error in getVerificationStatus controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Check if user's phone is verified
   * GET /api/users/phone/is-verified
   */
  async isPhoneVerified(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const isVerified = await phoneVerificationService.isPhoneVerified(userId);

      res.status(200).json({
        success: true,
        isVerified,
      });
    } catch (error: any) {
      logger.error('Error in isPhoneVerified controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

export default new PhoneVerificationController();
