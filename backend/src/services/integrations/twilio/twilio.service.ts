/**
 * Twilio SMS Integration Service
 */

import twilio from 'twilio';
import { logger } from '../../../utils/logger';

export class TwilioService {
  private client: twilio.Twilio | null = null;
  private fromNumber: string;
  private initialized: boolean = false;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
      this.initialized = true;
    }
  }

  async sendSMS(to: string, message: string): Promise<void> {
    if (!this.initialized || !this.client) {
      logger.warn('Twilio not configured, skipping SMS to:', to);
      return;
    }
    try {
      await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to,
      });
      logger.info(`SMS sent to ${to}`);
    } catch (error) {
      logger.error('Twilio send SMS error:', error);
      throw error;
    }
  }

  async sendVerificationCode(phoneNumber: string, code?: string): Promise<void> {
    if (!this.initialized || !this.client) {
      logger.warn('Twilio not configured, skipping verification to:', phoneNumber);
      return;
    }
    try {
      const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

      // If custom code provided, send via SMS; otherwise use Twilio Verify
      if (code) {
        await this.sendSMS(phoneNumber, `Your verification code is: ${code}`);
        return;
      }

      if (!verifySid) {
        logger.warn('TWILIO_VERIFY_SERVICE_SID is not configured');
        return;
      }

      await this.client.verify.v2
        .services(verifySid)
        .verifications.create({ to: phoneNumber, channel: 'sms' });

      logger.info(`Verification code sent to ${phoneNumber}`);
    } catch (error) {
      logger.error('Twilio send verification error:', error);
      throw error;
    }
  }

  async verifyCode(phoneNumber: string, code: string): Promise<boolean> {
    if (!this.initialized || !this.client) {
      logger.warn('Twilio not configured, cannot verify code');
      return false;
    }
    try {
      const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
      if (!verifySid) {
        logger.warn('TWILIO_VERIFY_SERVICE_SID is not configured');
        return false;
      }

      const verification = await this.client.verify.v2
        .services(verifySid)
        .verificationChecks.create({ to: phoneNumber, code });

      return verification.status === 'approved';
    } catch (error) {
      logger.error('Twilio verify code error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const sendSmsService = new TwilioService();
