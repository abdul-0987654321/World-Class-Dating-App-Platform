/**
 * Twilio SMS Integration Service
 */

import twilio from 'twilio';
import { logger } from '../../../utils/logger';

export class TwilioService {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials are not configured');
    }

    this.client = twilio(accountSid, authToken);
  }

  async sendSMS(to: string, message: string): Promise<void> {
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

  async sendVerificationCode(phoneNumber: string): Promise<void> {
    try {
      const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
      if (!verifySid) {
        throw new Error('TWILIO_VERIFY_SERVICE_SID is not configured');
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
    try {
      const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
      if (!verifySid) {
        throw new Error('TWILIO_VERIFY_SERVICE_SID is not configured');
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
