import twilio from 'twilio';
import config from '../../config';
import { createLogger } from '@connectsphere/shared';

const logger = createLogger('twilio-service');

export class TwilioService {
  private client: twilio.Twilio | null = null;
  private fromNumber: string;

  constructor() {
    const accountSid = config.twilio?.accountSid;
    const authToken = config.twilio?.authToken;
    this.fromNumber = config.twilio?.phoneNumber || '';

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
      logger.info('Twilio client initialized successfully');
    } else {
      logger.warn('Twilio credentials not configured. SMS functionality will be disabled.');
    }
  }

  /**
   * Check if Twilio is configured and available
   */
  isConfigured(): boolean {
    return this.client !== null && this.fromNumber !== '';
  }

  /**
   * Send SMS message
   */
  async sendSMS(phoneNumber: string, message: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      logger.error('Twilio not configured - cannot send SMS');
      return {
        success: false,
        error: 'SMS service not configured',
      };
    }

    try {
      logger.info(`Sending SMS to ${phoneNumber}`);

      const result = await this.client!.messages.create({
        body: message,
        from: this.fromNumber,
        to: phoneNumber,
      });

      logger.info(`SMS sent successfully. MessageId: ${result.sid}`);

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error: any) {
      logger.error('Failed to send SMS:', error);

      return {
        success: false,
        error: error.message || 'Failed to send SMS',
      };
    }
  }

  /**
   * Send verification code via SMS
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const message = `Your ConnectSphere verification code is: ${code}. This code expires in 10 minutes. Do not share this code with anyone.`;

    return await this.sendSMS(phoneNumber, message);
  }

  /**
   * Format phone number to E.164 format
   * Example: (555) 123-4567 -> +15551234567
   */
  formatPhoneNumber(phoneNumber: string, countryCode = '+1'): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');

    // If already starts with country code, return as-is
    if (digits.startsWith('1') && digits.length === 11) {
      return `+${digits}`;
    }

    // Add country code
    if (digits.length === 10) {
      return `${countryCode}${digits}`;
    }

    // Return original if can't format
    return phoneNumber;
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');

    // Check if it's a valid US/Canada number (10 or 11 digits)
    if (digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))) {
      return true;
    }

    // Check if it starts with + and has at least 10 digits
    if (phoneNumber.startsWith('+') && digits.length >= 10) {
      return true;
    }

    return false;
  }
}

export default new TwilioService();
