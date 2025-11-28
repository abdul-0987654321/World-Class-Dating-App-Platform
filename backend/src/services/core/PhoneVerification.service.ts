/**
 * Phone Verification Service
 * Twilio-based phone verification with SMS/WhatsApp support
 */

import { logger } from '../../utils/logger';
import { db } from '../../config/database.config';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface PhoneVerification {
  id: string;
  userId: string;
  phoneNumber: string;
  countryCode: string;
  verificationCode: string;
  status: VerificationStatus;
  attempts: number;
  method: VerificationMethod;
  expiresAt: Date;
  verifiedAt?: Date;
  createdAt: Date;
}

export type VerificationStatus = 'pending' | 'verified' | 'expired' | 'failed';
export type VerificationMethod = 'sms' | 'whatsapp' | 'voice';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  verifyServiceSid: string;
  phoneNumber?: string;
}

// Configuration
const VERIFICATION_CONFIG = {
  codeLength: 6,
  expirationMinutes: 10,
  maxAttempts: 5,
  cooldownMinutes: 1, // Minimum time between sends
  dailyLimit: 5,      // Max verifications per day
  rateLimitMinutes: 60, // Rate limit window
};

class PhoneVerificationService {
  private twilioClient: any = null;
  private verifyServiceSid: string = '';
  private isInitialized = false;

  /**
   * Initialize with Twilio credentials
   */
  async initialize(config: TwilioConfig): Promise<void> {
    try {
      // In production, use Twilio SDK
      // const twilio = require('twilio');
      // this.twilioClient = twilio(config.accountSid, config.authToken);
      // this.verifyServiceSid = config.verifyServiceSid;

      this.isInitialized = true;
      logger.info('Phone verification service initialized');
    } catch (error) {
      logger.error('Failed to initialize phone verification:', error);
      throw error;
    }
  }

  /**
   * Send verification code to phone number
   */
  async sendVerificationCode(
    userId: string,
    phoneNumber: string,
    countryCode: string,
    method: VerificationMethod = 'sms'
  ): Promise<{
    success: boolean;
    verificationId?: string;
    error?: string;
    retryAfter?: number;
  }> {
    try {
      const fullPhoneNumber = this.formatPhoneNumber(phoneNumber, countryCode);

      // Check rate limiting
      const rateLimitResult = await this.checkRateLimit(userId, phoneNumber);
      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: rateLimitResult.error,
          retryAfter: rateLimitResult.retryAfter,
        };
      }

      // Generate verification code
      const code = this.generateVerificationCode();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + VERIFICATION_CONFIG.expirationMinutes);

      // Store verification record
      const verificationId = uuidv4();
      await db('phone_verifications').insert({
        id: verificationId,
        user_id: userId,
        phone_number: fullPhoneNumber,
        country_code: countryCode,
        verification_code: await this.hashCode(code),
        status: 'pending',
        attempts: 0,
        method,
        expires_at: expiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Send via Twilio (or simulated for dev)
      const sendResult = await this.sendCode(fullPhoneNumber, code, method);

      if (!sendResult.success) {
        await db('phone_verifications')
          .where('id', verificationId)
          .update({ status: 'failed', updated_at: new Date() });

        return { success: false, error: sendResult.error };
      }

      logger.info(`Verification code sent to ${this.maskPhoneNumber(fullPhoneNumber)}`);

      return {
        success: true,
        verificationId,
      };
    } catch (error) {
      logger.error('Error sending verification code:', error);
      return { success: false, error: 'Failed to send verification code' };
    }
  }

  /**
   * Verify the code entered by user
   */
  async verifyCode(
    userId: string,
    verificationId: string,
    code: string
  ): Promise<{
    success: boolean;
    verified?: boolean;
    error?: string;
    remainingAttempts?: number;
  }> {
    try {
      // Get verification record
      const verification = await db('phone_verifications')
        .where('id', verificationId)
        .where('user_id', userId)
        .first();

      if (!verification) {
        return { success: false, error: 'Verification not found' };
      }

      // Check if expired
      if (new Date() > new Date(verification.expires_at)) {
        await db('phone_verifications')
          .where('id', verificationId)
          .update({ status: 'expired', updated_at: new Date() });

        return { success: false, error: 'Verification code has expired' };
      }

      // Check if already verified
      if (verification.status === 'verified') {
        return { success: true, verified: true };
      }

      // Check attempts
      if (verification.attempts >= VERIFICATION_CONFIG.maxAttempts) {
        await db('phone_verifications')
          .where('id', verificationId)
          .update({ status: 'failed', updated_at: new Date() });

        return { success: false, error: 'Too many failed attempts' };
      }

      // Increment attempt count
      const newAttempts = verification.attempts + 1;
      await db('phone_verifications')
        .where('id', verificationId)
        .update({ attempts: newAttempts, updated_at: new Date() });

      // Verify code
      const isValid = await this.verifyHashedCode(code, verification.verification_code);

      if (!isValid) {
        return {
          success: false,
          error: 'Invalid verification code',
          remainingAttempts: VERIFICATION_CONFIG.maxAttempts - newAttempts,
        };
      }

      // Mark as verified
      await db('phone_verifications')
        .where('id', verificationId)
        .update({
          status: 'verified',
          verified_at: new Date(),
          updated_at: new Date(),
        });

      // Update user's phone verification status
      await db('users')
        .where('id', userId)
        .update({
          phone_number: verification.phone_number,
          phone_verified: true,
          phone_verified_at: new Date(),
          updated_at: new Date(),
        });

      logger.info(`Phone verified for user ${userId}`);

      return { success: true, verified: true };
    } catch (error) {
      logger.error('Error verifying code:', error);
      return { success: false, error: 'Verification failed' };
    }
  }

  /**
   * Resend verification code
   */
  async resendCode(
    userId: string,
    verificationId: string
  ): Promise<{
    success: boolean;
    newVerificationId?: string;
    error?: string;
    retryAfter?: number;
  }> {
    try {
      const verification = await db('phone_verifications')
        .where('id', verificationId)
        .where('user_id', userId)
        .first();

      if (!verification) {
        return { success: false, error: 'Verification not found' };
      }

      // Check cooldown
      const lastSent = new Date(verification.created_at);
      const cooldownEnd = new Date(lastSent.getTime() + VERIFICATION_CONFIG.cooldownMinutes * 60 * 1000);

      if (new Date() < cooldownEnd) {
        const retryAfter = Math.ceil((cooldownEnd.getTime() - Date.now()) / 1000);
        return {
          success: false,
          error: 'Please wait before requesting a new code',
          retryAfter,
        };
      }

      // Expire old verification
      await db('phone_verifications')
        .where('id', verificationId)
        .update({ status: 'expired', updated_at: new Date() });

      // Send new verification
      return this.sendVerificationCode(
        userId,
        verification.phone_number,
        verification.country_code,
        verification.method
      );
    } catch (error) {
      logger.error('Error resending code:', error);
      return { success: false, error: 'Failed to resend code' };
    }
  }

  /**
   * Check if phone number is already verified by another user
   */
  async isPhoneNumberTaken(
    phoneNumber: string,
    countryCode: string,
    excludeUserId?: string
  ): Promise<boolean> {
    const fullPhoneNumber = this.formatPhoneNumber(phoneNumber, countryCode);

    let query = db('users')
      .where('phone_number', fullPhoneNumber)
      .where('phone_verified', true);

    if (excludeUserId) {
      query = query.whereNot('id', excludeUserId);
    }

    const existing = await query.first();
    return !!existing;
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(
    userId: string
  ): Promise<{
    isVerified: boolean;
    phoneNumber?: string;
    verifiedAt?: Date;
    pendingVerification?: {
      id: string;
      phoneNumber: string;
      expiresAt: Date;
      attemptsRemaining: number;
    };
  }> {
    // Check user's verification status
    const user = await db('users')
      .where('id', userId)
      .select('phone_number', 'phone_verified', 'phone_verified_at')
      .first();

    if (user?.phone_verified) {
      return {
        isVerified: true,
        phoneNumber: this.maskPhoneNumber(user.phone_number),
        verifiedAt: user.phone_verified_at,
      };
    }

    // Check for pending verification
    const pending = await db('phone_verifications')
      .where('user_id', userId)
      .where('status', 'pending')
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .first();

    if (pending) {
      return {
        isVerified: false,
        pendingVerification: {
          id: pending.id,
          phoneNumber: this.maskPhoneNumber(pending.phone_number),
          expiresAt: pending.expires_at,
          attemptsRemaining: VERIFICATION_CONFIG.maxAttempts - pending.attempts,
        },
      };
    }

    return { isVerified: false };
  }

  /**
   * Remove phone verification
   */
  async removePhoneVerification(userId: string): Promise<boolean> {
    await db('users')
      .where('id', userId)
      .update({
        phone_number: null,
        phone_verified: false,
        phone_verified_at: null,
        updated_at: new Date(),
      });

    logger.info(`Phone verification removed for user ${userId}`);
    return true;
  }

  /**
   * Get supported countries
   */
  getSupportedCountries(): Array<{
    code: string;
    name: string;
    dialCode: string;
    format: string;
  }> {
    return [
      { code: 'US', name: 'United States', dialCode: '+1', format: '(XXX) XXX-XXXX' },
      { code: 'CA', name: 'Canada', dialCode: '+1', format: '(XXX) XXX-XXXX' },
      { code: 'GB', name: 'United Kingdom', dialCode: '+44', format: 'XXXX XXXXXX' },
      { code: 'AU', name: 'Australia', dialCode: '+61', format: 'XXXX XXX XXX' },
      { code: 'DE', name: 'Germany', dialCode: '+49', format: 'XXXX XXXXXXX' },
      { code: 'FR', name: 'France', dialCode: '+33', format: 'X XX XX XX XX' },
      { code: 'ES', name: 'Spain', dialCode: '+34', format: 'XXX XXX XXX' },
      { code: 'IT', name: 'Italy', dialCode: '+39', format: 'XXX XXX XXXX' },
      { code: 'BR', name: 'Brazil', dialCode: '+55', format: '(XX) XXXXX-XXXX' },
      { code: 'MX', name: 'Mexico', dialCode: '+52', format: 'XX XXXX XXXX' },
      { code: 'IN', name: 'India', dialCode: '+91', format: 'XXXXX XXXXX' },
      { code: 'JP', name: 'Japan', dialCode: '+81', format: 'XX-XXXX-XXXX' },
      { code: 'KR', name: 'South Korea', dialCode: '+82', format: 'XX-XXXX-XXXX' },
      { code: 'SG', name: 'Singapore', dialCode: '+65', format: 'XXXX XXXX' },
      { code: 'NL', name: 'Netherlands', dialCode: '+31', format: 'X XXXXXXXX' },
      { code: 'SE', name: 'Sweden', dialCode: '+46', format: 'XX-XXX XX XX' },
      { code: 'NO', name: 'Norway', dialCode: '+47', format: 'XXX XX XXX' },
      { code: 'DK', name: 'Denmark', dialCode: '+45', format: 'XX XX XX XX' },
      { code: 'FI', name: 'Finland', dialCode: '+358', format: 'XX XXX XXXX' },
      { code: 'NZ', name: 'New Zealand', dialCode: '+64', format: 'XX XXX XXXX' },
    ];
  }

  // Private helper methods

  /**
   * Check rate limiting
   */
  private async checkRateLimit(
    userId: string,
    phoneNumber: string
  ): Promise<{
    allowed: boolean;
    error?: string;
    retryAfter?: number;
  }> {
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - VERIFICATION_CONFIG.rateLimitMinutes);

    // Check user's recent verifications
    const recentCount = await db('phone_verifications')
      .where('user_id', userId)
      .where('created_at', '>', windowStart)
      .count('id as count')
      .first();

    if (Number(recentCount?.count || 0) >= VERIFICATION_CONFIG.dailyLimit) {
      return {
        allowed: false,
        error: 'Too many verification attempts. Please try again later.',
        retryAfter: VERIFICATION_CONFIG.rateLimitMinutes * 60,
      };
    }

    // Check cooldown for same phone number
    const lastVerification = await db('phone_verifications')
      .where('user_id', userId)
      .where('phone_number', phoneNumber)
      .orderBy('created_at', 'desc')
      .first();

    if (lastVerification) {
      const cooldownEnd = new Date(lastVerification.created_at);
      cooldownEnd.setMinutes(cooldownEnd.getMinutes() + VERIFICATION_CONFIG.cooldownMinutes);

      if (new Date() < cooldownEnd) {
        const retryAfter = Math.ceil((cooldownEnd.getTime() - Date.now()) / 1000);
        return {
          allowed: false,
          error: 'Please wait before requesting another code',
          retryAfter,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Send code via Twilio
   */
  private async sendCode(
    phoneNumber: string,
    code: string,
    method: VerificationMethod
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // In production, use Twilio Verify API
      // const verification = await this.twilioClient.verify.v2
      //   .services(this.verifyServiceSid)
      //   .verifications.create({ to: phoneNumber, channel: method });

      // For development, simulate success
      logger.info(`[DEV] Would send code ${code} to ${phoneNumber} via ${method}`);

      return { success: true };
    } catch (error: any) {
      logger.error('Twilio send error:', error);
      return { success: false, error: error.message || 'Failed to send code' };
    }
  }

  /**
   * Generate random verification code
   */
  private generateVerificationCode(): string {
    const digits = VERIFICATION_CONFIG.codeLength;
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
  }

  /**
   * Hash verification code
   */
  private async hashCode(code: string): Promise<string> {
    // In production, use bcrypt or similar
    // const bcrypt = require('bcrypt');
    // return bcrypt.hash(code, 10);

    // Simple hash for development
    return Buffer.from(code).toString('base64');
  }

  /**
   * Verify hashed code
   */
  private async verifyHashedCode(code: string, hashedCode: string): Promise<boolean> {
    // In production, use bcrypt
    // const bcrypt = require('bcrypt');
    // return bcrypt.compare(code, hashedCode);

    // Simple verification for development
    return Buffer.from(code).toString('base64') === hashedCode;
  }

  /**
   * Format phone number with country code
   */
  private formatPhoneNumber(phoneNumber: string, countryCode: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');

    // Get country dial code
    const country = this.getSupportedCountries().find(c => c.code === countryCode);
    const dialCode = country?.dialCode || '+1';

    // Format as E.164
    return `${dialCode}${digits}`;
  }

  /**
   * Mask phone number for display
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || phoneNumber.length < 6) return phoneNumber;

    const visible = 4;
    const masked = phoneNumber.length - visible;
    return '*'.repeat(masked) + phoneNumber.slice(-visible);
  }
}

export const phoneVerificationService = new PhoneVerificationService();
