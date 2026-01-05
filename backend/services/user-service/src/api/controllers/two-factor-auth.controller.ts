import { Response } from 'express';

import { TwoFactorAuthService } from '../../domain/services/two-factor-auth.service';
import db from '../../infrastructure/database/connection';
import { comparePassword } from '../../utils/encryption';
import logger from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export class TwoFactorAuthController {
  private twoFactorAuthService: TwoFactorAuthService;
  private db = db;

  constructor(twoFactorAuthService?: TwoFactorAuthService) {
    this.twoFactorAuthService = twoFactorAuthService || new TwoFactorAuthService();
  }

  /**
   * Generate TOTP secret and QR code
   */
  async generateTOTPSecret(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const result = await this.twoFactorAuthService.generateTOTPSecret(userId);

      return res.status(200).json({
        success: true,
        message: 'TOTP secret generated. Scan the QR code with your authenticator app.',
        data: {
          secret: result.secret,
          qrCodeUrl: result.qrCodeUrl,
        },
      });
    } catch (error: any) {
      logger.error('Generate TOTP secret error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate TOTP secret',
      });
    }
  }

  /**
   * Verify TOTP code
   */
  async verifyTOTP(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { code } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!code || code.length !== 6) {
        return res.status(400).json({
          success: false,
          message: 'Valid 6-digit code is required',
        });
      }

      const isValid = await this.twoFactorAuthService.verifyTOTPCode(userId, code);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'TOTP code verified successfully',
      });
    } catch (error: any) {
      logger.error('Verify TOTP error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify TOTP code',
      });
    }
  }

  /**
   * Enable 2FA
   */
  async enable2FA(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { method, verificationCode } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!method || !verificationCode) {
        return res.status(400).json({
          success: false,
          message: 'Method and verification code are required',
        });
      }

      if (!['2fa_totp', '2fa_sms', '2fa_email'].includes(method)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid 2FA method',
        });
      }

      const result = await this.twoFactorAuthService.enableTwoFactorAuth(
        userId,
        method,
        verificationCode
      );

      return res.status(200).json({
        success: true,
        message: '2FA enabled successfully. Please save your backup codes in a secure location.',
        data: {
          backupCodes: result.backupCodes,
        },
      });
    } catch (error: any) {
      logger.error('Enable 2FA error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to enable 2FA',
      });
    }
  }

  /**
   * Disable 2FA
   */
  async disable2FA(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { method, password } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!method || !password) {
        return res.status(400).json({
          success: false,
          message: 'Method and password are required',
        });
      }

      // Verify password before disabling 2FA
      const user = await this.db('users').where({ id: userId }).first();
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const isPasswordValid = await comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password. Please enter your current password to disable 2FA.',
        });
      }

      await this.twoFactorAuthService.disableTwoFactorAuth(userId, method);

      return res.status(200).json({
        success: true,
        message: '2FA disabled successfully',
      });
    } catch (error: any) {
      logger.error('Disable 2FA error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to disable 2FA',
      });
    }
  }

  /**
   * Send SMS code
   */
  async sendSMSCode(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { phoneNumber } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required',
        });
      }

      await this.twoFactorAuthService.sendSMSCode(userId, phoneNumber);

      return res.status(200).json({
        success: true,
        message: 'SMS code sent successfully',
      });
    } catch (error: any) {
      logger.error('Send SMS code error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to send SMS code',
      });
    }
  }

  /**
   * Verify SMS code
   */
  async verifySMSCode(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { code } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Verification code is required',
        });
      }

      const isValid = await this.twoFactorAuthService.verifySMSCode(userId, code);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification code',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'SMS code verified successfully',
      });
    } catch (error: any) {
      logger.error('Verify SMS code error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify SMS code',
      });
    }
  }

  /**
   * Send email code
   */
  async sendEmailCode(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { email } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      await this.twoFactorAuthService.sendEmailCode(userId, email);

      return res.status(200).json({
        success: true,
        message: 'Email code sent successfully',
      });
    } catch (error: any) {
      logger.error('Send email code error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to send email code',
      });
    }
  }

  /**
   * Verify email code
   */
  async verifyEmailCode(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { code } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Verification code is required',
        });
      }

      const isValid = await this.twoFactorAuthService.verifyEmailCode(userId, code);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification code',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Email code verified successfully',
      });
    } catch (error: any) {
      logger.error('Verify email code error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify email code',
      });
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { code } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Backup code is required',
        });
      }

      const isValid = await this.twoFactorAuthService.verifyBackupCode(userId, code);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or already used backup code',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Backup code verified successfully. This code cannot be used again.',
      });
    } catch (error: any) {
      logger.error('Verify backup code error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify backup code',
      });
    }
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { password } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required',
        });
      }

      // Verify password before regenerating backup codes
      const user = await this.db('users').where({ id: userId }).first();
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const isPasswordValid = await comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message:
            'Invalid password. Please enter your current password to regenerate backup codes.',
        });
      }

      const backupCodes = await this.twoFactorAuthService.generateBackupCodes(userId);

      return res.status(200).json({
        success: true,
        message: 'Backup codes regenerated successfully. Please save them in a secure location.',
        data: {
          backupCodes,
        },
      });
    } catch (error: any) {
      logger.error('Regenerate backup codes error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to regenerate backup codes',
      });
    }
  }

  /**
   * Get 2FA status
   */
  async get2FAStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      // Get 2FA status from database
      const twoFactorAuth = await this.db('two_factor_auth').where({ user_id: userId }).first();

      return res.status(200).json({
        success: true,
        data: {
          enabled: twoFactorAuth ? twoFactorAuth.is_enabled : false,
          methods: twoFactorAuth && twoFactorAuth.is_enabled ? [twoFactorAuth.method] : [],
          configuration: twoFactorAuth || null,
        },
      });
    } catch (error: any) {
      logger.error('Get 2FA status error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get 2FA status',
      });
    }
  }
}

export default new TwoFactorAuthController();
