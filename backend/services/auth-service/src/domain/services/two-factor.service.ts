import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { userRepository } from '../repositories/user.repository';
import { comparePassword } from '../../utils/encryption';
import logger from '../../utils/logger';

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorVerifyResult {
  success: boolean;
  message: string;
}

export interface Enable2FADto {
  userId: string;
  password: string;
}

export interface Verify2FADto {
  userId: string;
  token: string;
  tempSecret?: string;
}

export interface Disable2FADto {
  userId: string;
  password: string;
  token: string;
}

export interface Validate2FALoginDto {
  userId: string;
  token: string;
}

class TwoFactorService {
  private readonly APP_NAME = 'Flamoral';
  private readonly BACKUP_CODE_COUNT = 10;
  private readonly BACKUP_CODE_LENGTH = 8;

  /**
   * SECURITY: Verify user password before any 2FA operation
   * This is critical to prevent unauthorized 2FA changes
   */
  private async verifyUserPassword(userId: string, password: string): Promise<void> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      logger.warn(`Invalid password attempt for 2FA operation by user: ${userId}`);
      throw new Error('Invalid password');
    }
  }

  /**
   * Generate backup codes for 2FA recovery
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars

    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      let code = '';
      for (let j = 0; j < this.BACKUP_CODE_LENGTH; j++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      // Format: XXXX-XXXX
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }

    return codes;
  }

  /**
   * Step 1: Setup 2FA - Generate secret and QR code
   * SECURITY: Requires password verification before generating secret
   */
  async setup2FA(data: Enable2FADto): Promise<TwoFactorSetupResponse> {
    // SECURITY: Verify password before allowing 2FA setup
    await this.verifyUserPassword(data.userId, data.password);

    const user = await userRepository.findById(data.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if 2FA is already enabled
    if (user.two_factor_enabled) {
      throw new Error('Two-factor authentication is already enabled');
    }

    // Generate new secret
    const secret = speakeasy.generateSecret({
      name: `${this.APP_NAME} (${user.email})`,
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Store temporary secret (will be confirmed upon verification)
    await userRepository.storeTempTwoFactorSecret(
      data.userId,
      secret.base32,
      backupCodes
    );

    logger.info(`2FA setup initiated for user: ${data.userId}`);

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Step 2: Verify and enable 2FA
   * SECURITY: Validates the TOTP token before enabling 2FA
   */
  async verifyAndEnable2FA(data: Verify2FADto): Promise<TwoFactorVerifyResult> {
    const user = await userRepository.findById(data.userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Get the temporary secret
    const tempSecret = data.tempSecret || user.two_factor_temp_secret;

    if (!tempSecret) {
      throw new Error('No 2FA setup in progress. Please start setup first.');
    }

    // Verify the token
    const isValid = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token: data.token,
      window: 1, // Allow 1 step tolerance (30 seconds)
    });

    if (!isValid) {
      logger.warn(`Invalid 2FA verification attempt for user: ${data.userId}`);
      return {
        success: false,
        message: 'Invalid verification code. Please try again.',
      };
    }

    // Enable 2FA and store the secret permanently
    await userRepository.enable2FA(data.userId, tempSecret);

    logger.info(`2FA enabled for user: ${data.userId}`);

    return {
      success: true,
      message: 'Two-factor authentication has been enabled successfully.',
    };
  }

  /**
   * Disable 2FA
   * SECURITY: Requires password verification AND valid TOTP token
   */
  async disable2FA(data: Disable2FADto): Promise<TwoFactorVerifyResult> {
    // SECURITY: Verify password before allowing 2FA disable
    await this.verifyUserPassword(data.userId, data.password);

    const user = await userRepository.findById(data.userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.two_factor_enabled || !user.two_factor_secret) {
      throw new Error('Two-factor authentication is not enabled');
    }

    // Verify the TOTP token
    const isValid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: data.token,
      window: 1,
    });

    if (!isValid) {
      // Check if it's a backup code
      const isBackupValid = await this.verifyBackupCode(data.userId, data.token);

      if (!isBackupValid) {
        logger.warn(`Invalid 2FA disable attempt for user: ${data.userId}`);
        return {
          success: false,
          message: 'Invalid verification code or backup code.',
        };
      }
    }

    // Disable 2FA
    await userRepository.disable2FA(data.userId);

    logger.info(`2FA disabled for user: ${data.userId}`);

    return {
      success: true,
      message: 'Two-factor authentication has been disabled.',
    };
  }

  /**
   * Validate 2FA token during login
   */
  async validate2FALogin(data: Validate2FALoginDto): Promise<TwoFactorVerifyResult> {
    const user = await userRepository.findById(data.userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.two_factor_enabled || !user.two_factor_secret) {
      throw new Error('Two-factor authentication is not enabled for this account');
    }

    // Verify the TOTP token
    const isValid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: data.token,
      window: 1,
    });

    if (isValid) {
      return {
        success: true,
        message: 'Two-factor authentication verified.',
      };
    }

    // Try backup code
    const isBackupValid = await this.verifyBackupCode(data.userId, data.token);

    if (isBackupValid) {
      return {
        success: true,
        message: 'Two-factor authentication verified using backup code.',
      };
    }

    logger.warn(`Invalid 2FA login attempt for user: ${data.userId}`);

    return {
      success: false,
      message: 'Invalid verification code.',
    };
  }

  /**
   * Verify and consume a backup code
   */
  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Check if backup code is valid and unused
    const isValid = await userRepository.verifyAndConsumeBackupCode(userId, normalizedCode);

    if (isValid) {
      logger.info(`Backup code used for user: ${userId}`);
    }

    return isValid;
  }

  /**
   * Regenerate backup codes
   * SECURITY: Requires password verification
   */
  async regenerateBackupCodes(userId: string, password: string): Promise<string[]> {
    // SECURITY: Verify password before regenerating backup codes
    await this.verifyUserPassword(userId, password);

    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.two_factor_enabled) {
      throw new Error('Two-factor authentication is not enabled');
    }

    const newBackupCodes = this.generateBackupCodes();

    await userRepository.updateBackupCodes(userId, newBackupCodes);

    logger.info(`Backup codes regenerated for user: ${userId}`);

    return newBackupCodes;
  }

  /**
   * Check if user has 2FA enabled
   */
  async is2FAEnabled(userId: string): Promise<boolean> {
    const user = await userRepository.findById(userId);
    return user?.two_factor_enabled || false;
  }

  /**
   * Get 2FA status for user
   */
  async get2FAStatus(userId: string): Promise<{ enabled: boolean; hasBackupCodes: boolean }> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      enabled: user.two_factor_enabled || false,
      hasBackupCodes: (user.two_factor_backup_codes?.length || 0) > 0,
    };
  }
}

export const twoFactorService = new TwoFactorService();
export default twoFactorService;
