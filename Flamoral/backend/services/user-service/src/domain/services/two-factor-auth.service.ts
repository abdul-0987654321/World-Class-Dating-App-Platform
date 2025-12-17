import crypto from 'crypto';
import db from '../../infrastructure/database/connection';
import logger from '../../utils/logger';
import twilioService from '../../infrastructure/sms/twilio.service';
import emailService from '../../infrastructure/email/email.service';
import {
  encryptTOTPSecret,
  decryptTOTPSecret,
  generateSecureTOTPSecret,
  hashBackupCode,
  verifyBackupCode as verifyBackupCodeHash,
  generateSecureBackupCode,
  getKeyVersion,
} from '../../utils/encryption';

export interface TwoFactorAuthConfig {
  userId: string;
  method: '2fa_totp' | '2fa_sms' | '2fa_email';
  secret?: string;
  phoneNumber?: string;
  email?: string;
}

export interface TwoFactorBackupCode {
  code: string;
  used: boolean;
}

/**
 * Two-Factor Authentication Service
 * Implements TOTP (Time-based One-Time Password), SMS, and Email 2FA
 */
export class TwoFactorAuthService {
  private readonly TOTP_WINDOW = 30; // 30 seconds window
  private readonly TOTP_DIGITS = 6;
  private readonly BACKUP_CODES_COUNT = 10;

  /**
   * Generate TOTP secret for user
   */
  async generateTOTPSecret(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    try {
      // Generate cryptographically secure TOTP secret (32 bytes = 256 bits of entropy)
      const secret = generateSecureTOTPSecret();

      // Get user details for QR code
      const user = await db('users').where({ id: userId }).first();
      if (!user) {
        throw new Error('User not found');
      }

      // Generate QR code URL for authenticator apps (Google Authenticator, Authy, etc.)
      const issuer = 'Flamoral';
      const label = `${issuer}:${user.email}`;
      const qrCodeUrl = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

      // Encrypt secret before storing
      const encryptedSecret = encryptTOTPSecret(secret);
      const keyVersion = getKeyVersion();

      // Store encrypted secret in database
      await db('user_two_factor_auth').insert({
        user_id: userId,
        method: '2fa_totp',
        secret_encrypted: encryptedSecret,
        encryption_key_version: keyVersion,
        is_enabled: false,
        created_at: new Date(),
      }).onConflict(['user_id', 'method']).merge({
        secret_encrypted: encryptedSecret,
        encryption_key_version: keyVersion,
        updated_at: new Date(),
      });

      logger.info(`TOTP secret generated and encrypted for user ${userId}`);

      return {
        secret,
        qrCodeUrl,
      };
    } catch (error) {
      logger.error('Error generating TOTP secret:', error);
      throw new Error('Failed to generate TOTP secret');
    }
  }

  /**
   * Verify TOTP code
   */
  async verifyTOTPCode(userId: string, code: string): Promise<boolean> {
    try {
      const twoFactorAuth = await db('user_two_factor_auth')
        .where({
          user_id: userId,
          method: '2fa_totp',
        })
        .first();

      if (!twoFactorAuth || !twoFactorAuth.secret_encrypted) {
        throw new Error('TOTP not configured for this user');
      }

      // Decrypt the TOTP secret
      const secret = decryptTOTPSecret(twoFactorAuth.secret_encrypted);

      // Generate current and adjacent TOTP codes (accounting for time drift)
      const currentTimestamp = Math.floor(Date.now() / 1000 / this.TOTP_WINDOW);
      const validCodes = [
        this.generateTOTPCode(secret, currentTimestamp - 1),
        this.generateTOTPCode(secret, currentTimestamp),
        this.generateTOTPCode(secret, currentTimestamp + 1),
      ];

      const isValid = validCodes.includes(code);

      if (isValid) {
        // Update last verified timestamp
        await db('user_two_factor_auth')
          .where({ id: twoFactorAuth.id })
          .update({
            last_verified_at: new Date(),
          });

        logger.info(`TOTP verified successfully for user ${userId}`);
      } else {
        logger.warn(`Invalid TOTP code for user ${userId}`);
      }

      return isValid;
    } catch (error) {
      logger.error('Error verifying TOTP code:', error);
      return false;
    }
  }

  /**
   * Generate TOTP code for a given secret and timestamp
   */
  private generateTOTPCode(secret: string, timestamp: number): string {
    // Convert timestamp to 8-byte buffer
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(timestamp));

    // Decode base32 secret
    const key = this.base32Decode(secret);

    // Create HMAC-SHA1 hash
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(buffer);
    const hash = hmac.digest();

    // Dynamic truncation
    const offset = hash[hash.length - 1] & 0x0f;
    const code = (
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff)
    ) % Math.pow(10, this.TOTP_DIGITS);

    // Pad with zeros to ensure 6 digits
    return code.toString().padStart(this.TOTP_DIGITS, '0');
  }

  /**
   * Base32 decode
   */
  private base32Decode(encoded: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';

    for (const char of encoded.toUpperCase().replace(/=+$/, '')) {
      const value = alphabet.indexOf(char);
      if (value === -1) continue;
      bits += value.toString(2).padStart(5, '0');
    }

    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }

    return Buffer.from(bytes);
  }

  /**
   * Enable 2FA for user
   */
  async enableTwoFactorAuth(userId: string, method: '2fa_totp' | '2fa_sms' | '2fa_email', verificationCode: string): Promise<{ backupCodes: string[] }> {
    try {
      // Verify the code first
      let isValid = false;

      if (method === '2fa_totp') {
        isValid = await this.verifyTOTPCode(userId, verificationCode);
      } else if (method === '2fa_sms') {
        isValid = await this.verifySMSCode(userId, verificationCode);
      } else if (method === '2fa_email') {
        isValid = await this.verifyEmailCode(userId, verificationCode);
      }

      if (!isValid) {
        throw new Error('Invalid verification code');
      }

      // Enable 2FA
      await db('user_two_factor_auth')
        .where({
          user_id: userId,
          method: method,
        })
        .update({
          is_enabled: true,
          enabled_at: new Date(),
        });

      // Generate backup codes
      const backupCodes = await this.generateBackupCodes(userId);

      logger.info(`2FA enabled for user ${userId} with method ${method}`);

      return { backupCodes };
    } catch (error) {
      logger.error('Error enabling 2FA:', error);
      throw new Error('Failed to enable 2FA');
    }
  }

  /**
   * Disable 2FA for user
   */
  async disableTwoFactorAuth(userId: string, method: '2fa_totp' | '2fa_sms' | '2fa_email'): Promise<void> {
    try {
      await db('user_two_factor_auth')
        .where({
          user_id: userId,
          method: method,
        })
        .update({
          is_enabled: false,
          disabled_at: new Date(),
        });

      // Delete backup codes
      await db('user_backup_codes')
        .where({ user_id: userId })
        .delete();

      logger.info(`2FA disabled for user ${userId} with method ${method}`);
    } catch (error) {
      logger.error('Error disabling 2FA:', error);
      throw new Error('Failed to disable 2FA');
    }
  }

  /**
   * Generate backup codes for user
   */
  async generateBackupCodes(userId: string): Promise<string[]> {
    try {
      // Delete existing backup codes
      await db('user_backup_codes')
        .where({ user_id: userId })
        .delete();

      // Generate new backup codes
      const backupCodes: string[] = [];
      const codeRecords = [];

      for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
        // Generate secure backup code with 8 bytes (64 bits) of entropy
        const code = generateSecureBackupCode();
        backupCodes.push(code);

        // Hash the code with bcrypt before storing
        const hashedCode = await hashBackupCode(code);

        codeRecords.push({
          user_id: userId,
          code_hash: hashedCode,
          is_used: false,
          created_at: new Date(),
        });
      }

      await db('user_backup_codes').insert(codeRecords);

      logger.info(`Generated ${this.BACKUP_CODES_COUNT} backup codes for user ${userId}`);

      return backupCodes;
    } catch (error) {
      logger.error('Error generating backup codes:', error);
      throw new Error('Failed to generate backup codes');
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      // Get all unused backup codes for the user
      const backupCodes = await db('user_backup_codes')
        .where({
          user_id: userId,
          is_used: false,
        });

      if (!backupCodes || backupCodes.length === 0) {
        logger.warn(`No unused backup codes found for user ${userId}`);
        return false;
      }

      // Try to verify against each backup code hash using bcrypt
      for (const backupCode of backupCodes) {
        const isValid = await verifyBackupCodeHash(code, backupCode.code_hash);

        if (isValid) {
          // Mark code as used
          await db('user_backup_codes')
            .where({ id: backupCode.id })
            .update({
              is_used: true,
              used_at: new Date(),
            });

          logger.info(`Backup code verified for user ${userId}`);
          return true;
        }
      }

      logger.warn(`Invalid backup code for user ${userId}`);
      return false;
    } catch (error) {
      logger.error('Error verifying backup code:', error);
      return false;
    }
  }

  /**
   * Send SMS code
   */
  async sendSMSCode(userId: string, phoneNumber: string): Promise<void> {
    try {
      const code = this.generateNumericCode(6);

      // Store code in database (with expiration)
      await db('user_verification_codes').insert({
        user_id: userId,
        code: code,
        type: '2fa_sms',
        phone_number: phoneNumber,
        expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        created_at: new Date(),
      });

      // Send SMS via Twilio
      const message = `Your Flamoral 2FA code is: ${code}. This code expires in 10 minutes. Do not share this code with anyone.`;
      const result = await twilioService.sendSMS(phoneNumber, message);

      if (!result.success) {
        logger.error(`Failed to send SMS to ${phoneNumber}: ${result.error}`);
        // Still log success for development mode even if SMS fails
        if (process.env.NODE_ENV !== 'development') {
          throw new Error('Failed to send SMS code');
        }
      }

      logger.info(`SMS 2FA code sent to user ${userId}`);

      // In development, log the code
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`2FA SMS Code for ${phoneNumber}: ${code}`);
      }
    } catch (error) {
      logger.error('Error sending SMS code:', error);
      throw new Error('Failed to send SMS code');
    }
  }

  /**
   * Verify SMS code
   */
  async verifySMSCode(userId: string, code: string): Promise<boolean> {
    try {
      const verificationCode = await db('user_verification_codes')
        .where({
          user_id: userId,
          code: code,
          type: '2fa_sms',
          is_used: false,
        })
        .andWhere('expires_at', '>', new Date())
        .first();

      if (!verificationCode) {
        logger.warn(`Invalid or expired SMS code for user ${userId}`);
        return false;
      }

      // Mark code as used
      await db('user_verification_codes')
        .where({ id: verificationCode.id })
        .update({
          is_used: true,
          verified_at: new Date(),
        });

      logger.info(`SMS code verified for user ${userId}`);

      return true;
    } catch (error) {
      logger.error('Error verifying SMS code:', error);
      return false;
    }
  }

  /**
   * Send email code
   */
  async sendEmailCode(userId: string, email: string): Promise<void> {
    try {
      const code = this.generateNumericCode(6);

      // Store code in database
      await db('user_verification_codes').insert({
        user_id: userId,
        code: code,
        type: '2fa_email',
        email: email,
        expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        created_at: new Date(),
      });

      // Send email via SendGrid
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .code-box { background: white; border: 2px solid #667eea; border-radius: 5px; padding: 20px; margin: 20px 0; text-align: center; }
              .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Two-Factor Authentication</h1>
              </div>
              <div class="content">
                <h2>Your 2FA Code</h2>
                <p>Use the code below to complete your two-factor authentication:</p>
                <div class="code-box">
                  <div class="code">${code}</div>
                </div>
                <div class="warning">
                  <strong>Important:</strong>
                  <ul>
                    <li>This code expires in 10 minutes</li>
                    <li>Never share this code with anyone</li>
                    <li>If you didn't request this code, please secure your account immediately</li>
                  </ul>
                </div>
                <p>Best regards,<br>The Flamoral Team</p>
              </div>
              <div class="footer">
                <p>&copy; 2025 Flamoral. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const text = `
        Your Flamoral 2FA Code: ${code}

        This code expires in 10 minutes.
        Never share this code with anyone.
        If you didn't request this code, please secure your account immediately.

        Best regards,
        The Flamoral Team
      `;

      await emailService.sendEmail({
        to: email,
        subject: 'Your Flamoral 2FA Code',
        html,
        text,
      });

      logger.info(`Email 2FA code sent to user ${userId}`);

      // In development, log the code
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`2FA Email Code for ${email}: ${code}`);
      }
    } catch (error) {
      logger.error('Error sending email code:', error);
      throw new Error('Failed to send email code');
    }
  }

  /**
   * Verify email code
   */
  async verifyEmailCode(userId: string, code: string): Promise<boolean> {
    try {
      const verificationCode = await db('user_verification_codes')
        .where({
          user_id: userId,
          code: code,
          type: '2fa_email',
          is_used: false,
        })
        .andWhere('expires_at', '>', new Date())
        .first();

      if (!verificationCode) {
        logger.warn(`Invalid or expired email code for user ${userId}`);
        return false;
      }

      // Mark code as used
      await db('user_verification_codes')
        .where({ id: verificationCode.id })
        .update({
          is_used: true,
          verified_at: new Date(),
        });

      logger.info(`Email code verified for user ${userId}`);

      return true;
    } catch (error) {
      logger.error('Error verifying email code:', error);
      return false;
    }
  }

  /**
   * Generate numeric code
   * Uses cryptographically secure random number generation
   */
  private generateNumericCode(length: number): string {
    let code = '';

    for (let i = 0; i < length; i++) {
      // Use crypto.randomInt for cryptographically secure random numbers
      code += crypto.randomInt(0, 10).toString();
    }

    return code;
  }

  /**
   * Check if 2FA is enabled for user
   */
  async is2FAEnabled(userId: string): Promise<{ enabled: boolean; methods: string[] }> {
    try {
      const twoFactorAuths = await db('user_two_factor_auth')
        .where({
          user_id: userId,
          is_enabled: true,
        })
        .select('method');

      const methods = twoFactorAuths.map(auth => auth.method);

      return {
        enabled: methods.length > 0,
        methods,
      };
    } catch (error) {
      logger.error('Error checking 2FA status:', error);
      return { enabled: false, methods: [] };
    }
  }

  /**
   * Get 2FA configuration for user
   */
  async get2FAConfig(userId: string): Promise<any> {
    try {
      const twoFactorAuths = await db('user_two_factor_auth')
        .where({ user_id: userId })
        .select('method', 'is_enabled', 'enabled_at', 'last_verified_at');

      return twoFactorAuths.map(auth => ({
        method: auth.method,
        isEnabled: auth.is_enabled,
        enabledAt: auth.enabled_at,
        lastVerifiedAt: auth.last_verified_at,
      }));
    } catch (error) {
      logger.error('Error getting 2FA config:', error);
      return [];
    }
  }

  /**
   * Require 2FA for next login
   */
  async require2FAForNextLogin(userId: string): Promise<void> {
    try {
      await db('users')
        .where({ id: userId })
        .update({
          require_2fa_setup: true,
        });

      logger.info(`2FA required for next login for user ${userId}`);
    } catch (error) {
      logger.error('Error requiring 2FA:', error);
      throw new Error('Failed to require 2FA');
    }
  }
}

export default new TwoFactorAuthService();
