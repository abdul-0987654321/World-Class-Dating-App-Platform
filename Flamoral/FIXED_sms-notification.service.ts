/**
 * SMS Notification Service (Twilio)
 * Fixed version with proper configuration validation
 */

import twilio from 'twilio';
import { db } from '../config/database';
import logger from '../utils/logger';
import { config } from '../config';
import { SMSNotificationPayload } from '../types';

export class SMSNotificationService {
  private client?: twilio.Twilio;
  private fromNumber: string;
  private initialized: boolean = false;

  constructor() {
    try {
      // Validate Twilio credentials - check for non-placeholder values
      if (!config.twilio.accountSid ||
          !config.twilio.authToken ||
          !config.twilio.fromNumber ||
          config.twilio.accountSid === 'your-twilio-account-sid' ||
          config.twilio.authToken === 'your-twilio-auth-token' ||
          config.twilio.fromNumber === '+1234567890') {
        logger.warn('Twilio not configured properly. SMS service will be disabled. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER with valid values');
        this.initialized = false;
        this.fromNumber = '';
        return;
      }

      this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
      this.fromNumber = config.twilio.fromNumber;
      this.initialized = true;
      logger.info('SMS notification service initialized with Twilio', {
        fromNumber: this.fromNumber,
        accountSid: config.twilio.accountSid.substring(0, 10) + '...',
      });
    } catch (error: any) {
      logger.error('Failed to initialize SMS notification service', {
        error: error.message,
        stack: error.stack,
      });
      this.initialized = false;
      this.fromNumber = '';
    }
  }

  /**
   * Send SMS message
   */
  async sendSMS(payload: SMSNotificationPayload): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.initialized || !this.client) {
      logger.warn('SMS service not initialized. Cannot send SMS.');
      return {
        success: false,
        error: 'SMS service not configured or not initialized',
      };
    }

    try {
      // Validate phone number format
      if (!this.isValidPhoneNumber(payload.to)) {
        logger.error('Invalid phone number format', { to: payload.to });
        return {
          success: false,
          error: 'Invalid phone number format. Must be in E.164 format (e.g., +1234567890)',
        };
      }

      // Validate message length (Twilio max is 1600 chars for single message)
      if (payload.message.length > 1600) {
        logger.warn('SMS message too long, truncating', {
          originalLength: payload.message.length,
        });
        payload.message = payload.message.substring(0, 1597) + '...';
      }

      const message = await this.client.messages.create({
        body: payload.message,
        from: this.fromNumber,
        to: payload.to,
      });

      logger.info(`SMS sent successfully to ${payload.to}`, {
        messageId: message.sid,
        status: message.status,
      });

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error: any) {
      logger.error(`Failed to send SMS to ${payload.to}`, {
        error: error.message,
        code: error.code,
        status: error.status,
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
    userId: string,
    phoneNumber: string,
    code: string
  ): Promise<void> {
    const template = await this.getTemplate('verification_code');
    if (!template) {
      logger.warn('Verification code template not found');
      // Fallback to default message
      const message = `Your Flamoral verification code is: ${code}. Valid for 10 minutes.`;
      await this.queueSMS(userId, phoneNumber, message, 'security', { code });
      return;
    }

    const message = this.replaceVariables(template.body, { code });

    const [notification] = await db('notifications')
      .insert({
        user_id: userId,
        template_id: template.id,
        type: 'sms',
        category: 'security',
        title: template.title,
        body: message,
        data: JSON.stringify({ code }),
        status: 'pending',
      })
      .returning('id');

    await db('sms_queue').insert({
      notification_id: notification.id,
      user_id: userId,
      to_phone: phoneNumber,
      from_phone: this.fromNumber,
      message,
      status: 'queued',
    });

    // Process immediately if not in queue mode
    if (process.env.SMS_QUEUE_MODE !== 'true') {
      await this.processSMSQueue();
    }
  }

  /**
   * Send security alert SMS
   */
  async sendSecurityAlert(
    userId: string,
    phoneNumber: string,
    device: string,
    location?: string
  ): Promise<void> {
    // Check user preferences
    const prefs = await this.getUserPreferences(userId);
    if (!prefs?.sms_security_alerts) {
      logger.info(`User ${userId} has disabled security alert SMS`);
      return;
    }

    const template = await this.getTemplate('security_alert');
    if (!template) {
      // Fallback to default message
      const message = `Flamoral Security Alert: New login from ${device}${location ? ` in ${location}` : ''}. If this wasn't you, secure your account immediately.`;
      await this.queueSMS(userId, phoneNumber, message, 'security', { device, location: location || 'Unknown' });
      return;
    }

    const variables = { device, location: location || 'Unknown' };
    const message = this.replaceVariables(template.body, variables);

    const [notification] = await db('notifications')
      .insert({
        user_id: userId,
        template_id: template.id,
        type: 'sms',
        category: 'security',
        title: template.title,
        body: message,
        data: JSON.stringify(variables),
        status: 'pending',
      })
      .returning('id');

    await db('sms_queue').insert({
      notification_id: notification.id,
      user_id: userId,
      to_phone: phoneNumber,
      from_phone: this.fromNumber,
      message,
      status: 'queued',
    });
  }

  /**
   * Send password reset code
   */
  async sendPasswordResetCode(
    userId: string,
    phoneNumber: string,
    code: string
  ): Promise<void> {
    const message = `Your Flamoral password reset code is: ${code}. Valid for 10 minutes.`;

    const [notification] = await db('notifications')
      .insert({
        user_id: userId,
        type: 'sms',
        category: 'security',
        title: 'Password Reset',
        body: message,
        data: JSON.stringify({ code }),
        status: 'pending',
      })
      .returning('id');

    await db('sms_queue').insert({
      notification_id: notification.id,
      user_id: userId,
      to_phone: phoneNumber,
      from_phone: this.fromNumber,
      message,
      status: 'queued',
    });

    // Process immediately for security codes
    await this.processSMSQueue();
  }

  /**
   * Queue SMS message helper
   */
  private async queueSMS(
    userId: string,
    phoneNumber: string,
    message: string,
    category: string,
    data: Record<string, string>
  ): Promise<void> {
    const [notification] = await db('notifications')
      .insert({
        user_id: userId,
        type: 'sms',
        category,
        title: 'SMS Notification',
        body: message,
        data: JSON.stringify(data),
        status: 'pending',
      })
      .returning('id');

    await db('sms_queue').insert({
      notification_id: notification.id,
      user_id: userId,
      to_phone: phoneNumber,
      from_phone: this.fromNumber,
      message,
      status: 'queued',
    });

    // Process immediately if not in queue mode
    if (process.env.SMS_QUEUE_MODE !== 'true') {
      await this.processSMSQueue();
    }
  }

  /**
   * Process SMS queue
   */
  async processSMSQueue(batchSize: number = 50): Promise<void> {
    const smsMessages = await db('sms_queue')
      .where({ status: 'queued' })
      .orderBy('created_at', 'asc')
      .limit(batchSize);

    for (const sms of smsMessages) {
      await db('sms_queue').where({ id: sms.id }).update({ status: 'processing' });

      const result = await this.sendSMS({
        to: sms.to_phone,
        message: sms.message,
      });

      if (result.success) {
        await db('sms_queue').where({ id: sms.id }).update({
          status: 'sent',
          external_id: result.messageId,
          sent_at: new Date(),
        });

        await db('notifications')
          .where({ id: sms.notification_id })
          .update({ status: 'sent', sent_at: new Date() });
      } else {
        const retryCount = sms.retry_count + 1;
        const shouldRetry = retryCount < 3;

        await db('sms_queue').where({ id: sms.id }).update({
          status: shouldRetry ? 'queued' : 'failed',
          error_message: result.error,
          retry_count: retryCount,
        });

        if (!shouldRetry) {
          await db('notifications')
            .where({ id: sms.notification_id })
            .update({ status: 'failed', error_message: result.error });
        }
      }
    }

    logger.info(`Processed ${smsMessages.length} SMS messages from queue`);
  }

  /**
   * Get SMS delivery status from Twilio
   */
  async getDeliveryStatus(messageSid: string): Promise<string | null> {
    if (!this.initialized || !this.client) {
      return null;
    }

    try {
      const message = await this.client.messages(messageSid).fetch();
      return message.status;
    } catch (error: any) {
      logger.error(`Failed to fetch SMS status for ${messageSid}:`, {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Update delivery status for sent messages
   */
  async updateDeliveryStatuses(): Promise<void> {
    const sentMessages = await db('sms_queue')
      .where({ status: 'sent' })
      .whereNull('delivered_at')
      .where('sent_at', '>', db.raw("NOW() - INTERVAL '24 hours'"))
      .limit(100);

    for (const sms of sentMessages) {
      if (!sms.external_id) continue;

      const status = await this.getDeliveryStatus(sms.external_id);

      if (status === 'delivered') {
        await db('sms_queue').where({ id: sms.id }).update({
          status: 'delivered',
          delivered_at: new Date(),
        });

        await db('notifications')
          .where({ id: sms.notification_id })
          .update({ status: 'delivered', delivered_at: new Date() });
      } else if (status === 'failed' || status === 'undelivered') {
        await db('sms_queue').where({ id: sms.id }).update({
          status: 'failed',
          error_message: `Twilio status: ${status}`,
        });

        await db('notifications')
          .where({ id: sms.notification_id })
          .update({ status: 'failed' });
      }
    }

    logger.info(`Updated delivery statuses for ${sentMessages.length} SMS messages`);
  }

  // Helper methods
  private async getTemplate(name: string): Promise<any> {
    return db('notification_templates')
      .where({ name, type: 'sms', is_active: true })
      .first();
  }

  private async getUserPreferences(userId: string): Promise<any> {
    return db('notification_preferences').where({ user_id: userId }).first();
  }

  private replaceVariables(
    template: string,
    variables: Record<string, string>
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  /**
   * Validate phone number (E.164 format check)
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // E.164 format: +[country code][subscriber number]
    // Country code: 1-3 digits, Subscriber number: up to 15 digits total
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Check if SMS service is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get account balance from Twilio
   */
  async getAccountBalance(): Promise<{ success: boolean; balance?: string; currency?: string; error?: string }> {
    if (!this.initialized || !this.client) {
      return {
        success: false,
        error: 'SMS service not initialized',
      };
    }

    try {
      const account = await this.client.api.accounts(config.twilio.accountSid).fetch();
      logger.info('Twilio account balance retrieved', {
        balance: account.balance,
        currency: account.currency,
      });
      return {
        success: true,
        balance: account.balance || '0',
        currency: account.currency || 'USD',
      };
    } catch (error: any) {
      logger.error('Failed to get Twilio account balance', {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export const smsNotificationService = new SMSNotificationService();
