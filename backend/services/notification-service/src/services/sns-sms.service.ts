import {
  SNSClient,
  PublishCommand,
  SetSMSAttributesCommand,
  CheckIfPhoneNumberIsOptedOutCommand,
} from '@aws-sdk/client-sns';

import { db } from '../config/database';
import logger from '../utils/logger';

interface SMSOptions {
  to: string;
  message: string;
  messageType?: 'Transactional' | 'Promotional';
  senderId?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SNSSMSService {
  private snsClient: SNSClient;
  private senderId: string;
  private defaultMessageType: 'Transactional' | 'Promotional';

  constructor() {
    this.snsClient = new SNSClient({
      region: process.env.AWS_SNS_REGION || process.env.AWS_REGION || 'us-east-1',
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined, // Use IAM role if no explicit credentials
    });

    this.senderId = process.env.AWS_SNS_SENDER_ID || 'Flamoral';
    this.defaultMessageType = 'Transactional';
  }

  /**
   * Initialize SMS attributes for the account
   */
  async initializeSMSAttributes(): Promise<void> {
    try {
      const command = new SetSMSAttributesCommand({
        attributes: {
          DefaultSenderID: this.senderId,
          DefaultSMSType: this.defaultMessageType,
          // Monthly spend limit in USD
          MonthlySpendLimit: process.env.AWS_SNS_MONTHLY_SPEND_LIMIT || '100',
          // Delivery status logging
          DeliveryStatusSuccessSamplingRate: '100',
        },
      });

      await this.snsClient.send(command);
      logger.info('SNS SMS attributes initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize SNS SMS attributes', {
        error: error.message,
      });
    }
  }

  /**
   * Check if a phone number has opted out of SMS
   */
  async isOptedOut(phoneNumber: string): Promise<boolean> {
    try {
      const command = new CheckIfPhoneNumberIsOptedOutCommand({
        phoneNumber: this.normalizePhoneNumber(phoneNumber),
      });

      const response = await this.snsClient.send(command);
      return response.isOptedOut || false;
    } catch (error: any) {
      logger.error('Failed to check opt-out status', {
        error: error.message,
        phoneNumber: this.maskPhoneNumber(phoneNumber),
      });
      return false;
    }
  }

  /**
   * Send a single SMS via AWS SNS
   */
  async sendSMS(options: SMSOptions): Promise<SendResult> {
    try {
      const phoneNumber = this.normalizePhoneNumber(options.to);

      // Check opt-out status
      const isOptedOut = await this.isOptedOut(phoneNumber);
      if (isOptedOut) {
        logger.info(`Phone number has opted out of SMS`, {
          phoneNumber: this.maskPhoneNumber(phoneNumber),
        });
        return {
          success: false,
          error: 'Phone number has opted out of SMS',
        };
      }

      const command = new PublishCommand({
        PhoneNumber: phoneNumber,
        Message: options.message,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: options.messageType || this.defaultMessageType,
          },
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: options.senderId || this.senderId,
          },
        },
      });

      const response = await this.snsClient.send(command);

      logger.info(`SMS sent successfully`, {
        messageId: response.MessageId,
        phoneNumber: this.maskPhoneNumber(phoneNumber),
      });

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error: any) {
      logger.error(`Failed to send SMS`, {
        error: error.message,
        code: error.Code,
        phoneNumber: this.maskPhoneNumber(options.to),
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCode(
    phoneNumber: string,
    code: string,
    expiresInMinutes: number = 10
  ): Promise<SendResult> {
    const message = `Your Flamoral verification code is: ${code}. It expires in ${expiresInMinutes} minutes. Do not share this code with anyone.`;

    return this.sendSMS({
      to: phoneNumber,
      message,
      messageType: 'Transactional',
    });
  }

  /**
   * Send security alert SMS
   */
  async sendSecurityAlert(
    phoneNumber: string,
    alertType: string,
    details: string
  ): Promise<SendResult> {
    const message = `Flamoral Security Alert: ${alertType}. ${details}. If this wasn't you, secure your account immediately.`;

    return this.sendSMS({
      to: phoneNumber,
      message,
      messageType: 'Transactional',
    });
  }

  /**
   * Send password reset code SMS
   */
  async sendPasswordResetCode(
    phoneNumber: string,
    code: string,
    expiresInMinutes: number = 15
  ): Promise<SendResult> {
    const message = `Your Flamoral password reset code is: ${code}. It expires in ${expiresInMinutes} minutes. If you didn't request this, ignore this message.`;

    return this.sendSMS({
      to: phoneNumber,
      message,
      messageType: 'Transactional',
    });
  }

  /**
   * Send 2FA code SMS
   */
  async send2FACode(phoneNumber: string, code: string): Promise<SendResult> {
    const message = `Your Flamoral 2FA code is: ${code}. This code expires in 5 minutes.`;

    return this.sendSMS({
      to: phoneNumber,
      message,
      messageType: 'Transactional',
    });
  }

  /**
   * Send match notification SMS (promotional)
   */
  async sendMatchNotification(phoneNumber: string, matchName: string): Promise<SendResult> {
    const message = `You have a new match on Flamoral! ${matchName} liked you back. Open the app to start chatting.`;

    return this.sendSMS({
      to: phoneNumber,
      message,
      messageType: 'Promotional',
    });
  }

  /**
   * Process queued SMS messages
   */
  async processSMSQueue(batchSize: number = 50): Promise<void> {
    const messages = await db('sms_queue')
      .where({ status: 'queued' })
      .where(function () {
        this.whereNull('scheduled_at').orWhere('scheduled_at', '<=', new Date());
      })
      .orderBy('created_at', 'asc')
      .limit(batchSize);

    for (const sms of messages) {
      await db('sms_queue').where({ id: sms.id }).update({ status: 'processing' });

      const result = await this.sendSMS({
        to: sms.to_phone,
        message: sms.message,
        messageType: sms.message_type || 'Transactional',
      });

      if (result.success) {
        await db('sms_queue').where({ id: sms.id }).update({
          status: 'sent',
          message_id: result.messageId,
          sent_at: new Date(),
        });

        if (sms.notification_id) {
          await db('notifications')
            .where({ id: sms.notification_id })
            .update({ status: 'sent', sent_at: new Date() });
        }
      } else {
        const retryCount = (sms.retry_count || 0) + 1;
        const shouldRetry = retryCount < 3;

        await db('sms_queue')
          .where({ id: sms.id })
          .update({
            status: shouldRetry ? 'queued' : 'failed',
            error_message: result.error,
            retry_count: retryCount,
          });

        if (!shouldRetry && sms.notification_id) {
          await db('notifications')
            .where({ id: sms.notification_id })
            .update({ status: 'failed', error_message: result.error });
        }
      }
    }
  }

  /**
   * Queue an SMS for later delivery
   */
  async queueSMS(
    userId: string,
    phoneNumber: string,
    message: string,
    options: {
      messageType?: 'Transactional' | 'Promotional';
      scheduledAt?: Date;
      notificationId?: string;
    } = {}
  ): Promise<string> {
    const [record] = await db('sms_queue')
      .insert({
        user_id: userId,
        to_phone: phoneNumber,
        message,
        message_type: options.messageType || 'Transactional',
        scheduled_at: options.scheduledAt,
        notification_id: options.notificationId,
        status: 'queued',
      })
      .returning('id');

    return record.id;
  }

  // Helper methods
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except leading +
    let normalized = phone.replace(/[^\d+]/g, '');

    // Ensure it starts with +
    if (!normalized.startsWith('+')) {
      // Assume US number if no country code
      if (normalized.length === 10) {
        normalized = '+1' + normalized;
      } else if (normalized.length === 11 && normalized.startsWith('1')) {
        normalized = '+' + normalized;
      } else {
        normalized = '+' + normalized;
      }
    }

    return normalized;
  }

  private maskPhoneNumber(phone: string): string {
    if (phone.length < 4) return '****';
    return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
  }
}

export const snsSMSService = new SNSSMSService();
