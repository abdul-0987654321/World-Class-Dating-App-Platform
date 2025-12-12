import { v4 as uuidv4 } from 'uuid';
import db from '../../infrastructure/database/connection';
import twilioService from '../../infrastructure/sms/twilio.service';
import { createLogger } from '../../utils/logger';

const logger = createLogger('phone-verification-service');

export interface SendVerificationCodeResult {
  success: boolean;
  message?: string;
  error?: string;
  expiresAt?: Date;
}

export interface VerifyCodeResult {
  success: boolean;
  message?: string;
  error?: string;
}

export class PhoneVerificationService {
  private readonly CODE_LENGTH = 6;
  private readonly CODE_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;
  private readonly RATE_LIMIT_MINUTES = 1; // Min time between sending codes

  /**
   * Generate a random 6-digit verification code
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send verification code to phone number
   */
  async sendVerificationCode(
    userId: string,
    phoneNumber: string
  ): Promise<SendVerificationCodeResult> {
    try {
      logger.info(`Sending verification code to user ${userId}`);

      // Validate phone number format
      if (!twilioService.isValidPhoneNumber(phoneNumber)) {
        return {
          success: false,
          error: 'Invalid phone number format',
        };
      }

      // Format phone number to E.164
      const formattedPhone = twilioService.formatPhoneNumber(phoneNumber);

      // Check rate limiting - prevent spam
      const recentCode = await db('verification_tokens')
        .where({
          user_id: userId,
          type: 'phone_verification',
        })
        .where('created_at', '>', new Date(Date.now() - this.RATE_LIMIT_MINUTES * 60 * 1000))
        .orderBy('created_at', 'desc')
        .first();

      if (recentCode && !recentCode.is_used) {
        return {
          success: false,
          error: `Please wait ${this.RATE_LIMIT_MINUTES} minute(s) before requesting a new code`,
        };
      }

      // Invalidate any existing unused codes for this user
      await db('verification_tokens')
        .where({
          user_id: userId,
          type: 'phone_verification',
          is_used: false,
        })
        .update({
          is_used: true,
          updated_at: new Date(),
        });

      // Generate new code
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000);

      // Save verification token to database
      const tokenId = uuidv4();
      await db('verification_tokens').insert({
        id: tokenId,
        user_id: userId,
        token: code,
        type: 'phone_verification',
        expires_at: expiresAt,
        is_used: false,
        created_at: new Date(),
      });

      // Send SMS via Twilio
      const smsResult = await twilioService.sendVerificationCode(formattedPhone, code);

      if (!smsResult.success) {
        // If SMS failed, mark token as used so it can't be verified
        await db('verification_tokens').where({ id: tokenId }).update({ is_used: true });

        return {
          success: false,
          error: smsResult.error || 'Failed to send verification code',
        };
      }

      logger.info(`Verification code sent successfully to user ${userId}`);

      return {
        success: true,
        message: 'Verification code sent to your phone',
        expiresAt,
      };
    } catch (error: any) {
      logger.error('Error sending verification code:', error);
      return {
        success: false,
        error: 'Failed to send verification code',
      };
    }
  }

  /**
   * Verify the code entered by user
   */
  async verifyCode(userId: string, code: string): Promise<VerifyCodeResult> {
    try {
      logger.info(`Verifying code for user ${userId}`);

      // Find the verification token
      const token = await db('verification_tokens')
        .where({
          user_id: userId,
          token: code,
          type: 'phone_verification',
          is_used: false,
        })
        .first();

      if (!token) {
        return {
          success: false,
          error: 'Invalid verification code',
        };
      }

      // Check if expired
      if (new Date(token.expires_at) < new Date()) {
        await db('verification_tokens').where({ id: token.id }).update({ is_used: true });

        return {
          success: false,
          error: 'Verification code has expired',
        };
      }

      // Mark token as used
      await db('verification_tokens')
        .where({ id: token.id })
        .update({
          is_used: true,
          updated_at: new Date(),
        });

      // Update user's phone verification status
      await db('users')
        .where({ id: userId })
        .update({
          is_phone_verified: true,
          updated_at: new Date(),
        });

      logger.info(`Phone verified successfully for user ${userId}`);

      return {
        success: true,
        message: 'Phone number verified successfully',
      };
    } catch (error: any) {
      logger.error('Error verifying code:', error);
      return {
        success: false,
        error: 'Failed to verify code',
      };
    }
  }

  /**
   * Resend verification code
   */
  async resendCode(userId: string, phoneNumber: string): Promise<SendVerificationCodeResult> {
    // Simply call sendVerificationCode - it handles rate limiting
    return await this.sendVerificationCode(userId, phoneNumber);
  }

  /**
   * Check if user's phone is verified
   */
  async isPhoneVerified(userId: string): Promise<boolean> {
    const user = await db('users')
      .where({ id: userId })
      .select('is_phone_verified')
      .first();

    return user?.is_phone_verified || false;
  }

  /**
   * Update user's phone number (requires re-verification)
   */
  async updatePhoneNumber(userId: string, newPhoneNumber: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      // Validate phone number
      if (!twilioService.isValidPhoneNumber(newPhoneNumber)) {
        return {
          success: false,
          error: 'Invalid phone number format',
        };
      }

      const formattedPhone = twilioService.formatPhoneNumber(newPhoneNumber);

      // Check if phone number is already in use by another user
      const existingUser = await db('users')
        .where({ phone_number: formattedPhone })
        .whereNot({ id: userId })
        .first();

      if (existingUser) {
        return {
          success: false,
          error: 'Phone number is already in use',
        };
      }

      // Update phone number and set verification to false
      await db('users')
        .where({ id: userId })
        .update({
          phone_number: formattedPhone,
          is_phone_verified: false,
          updated_at: new Date(),
        });

      logger.info(`Phone number updated for user ${userId}`);

      return {
        success: true,
        message: 'Phone number updated. Please verify your new number.',
      };
    } catch (error: any) {
      logger.error('Error updating phone number:', error);
      return {
        success: false,
        error: 'Failed to update phone number',
      };
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(userId: string): Promise<{
    phoneNumber?: string;
    isVerified: boolean;
    hasPendingVerification: boolean;
    pendingCodeExpiresAt?: Date;
  }> {
    const user = await db('users')
      .where({ id: userId })
      .select('phone_number', 'is_phone_verified')
      .first();

    const pendingToken = await db('verification_tokens')
      .where({
        user_id: userId,
        type: 'phone_verification',
        is_used: false,
      })
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .first();

    return {
      phoneNumber: user?.phone_number,
      isVerified: user?.is_phone_verified || false,
      hasPendingVerification: !!pendingToken,
      pendingCodeExpiresAt: pendingToken ? new Date(pendingToken.expires_at) : undefined,
    };
  }
}

export default new PhoneVerificationService();
