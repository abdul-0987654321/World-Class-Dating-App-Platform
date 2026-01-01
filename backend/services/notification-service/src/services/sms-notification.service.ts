/**
 * SMS Notification Service (Twilio)
 */

import twilio from 'twilio';
import { db } from '../config/database';
import logger from '../utils/logger';
import { config } from '../config';
import { SMSNotificationPayload } from '../types';

export class SMSNotificationService {
  private client: twilio.Twilio | null = null;
  private fromNumber: string;
  private isConfigured: boolean = false;

  constructor() {
    this.fromNumber = config.twilio.fromNumber;

    // Only initialize Twilio client if credentials are provided
    if (config.twilio.accountSid && config.twilio.authToken &&
        config.twilio.accountSid.startsWith('AC')) {
      try {
        this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
        this.isConfigured = true;
        logger.info('Twilio SMS service initialized successfully');
      } catch (error: any) {
        logger.warn('Twilio initialization failed. SMS functionality will be disabled.', {
          error: error.message,
        });
      }
    } else {
      logger.warn('Twilio credentials not configured. SMS functionality will be disabled.');
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
    try {
      if (!this.isConfigured || !this.client) {
        logger.warn('Twilio not configured. SMS sending disabled.');
        return {
          success: false,
          error: 'SMS service not configured',
        };
      }

      const message = await this.client.messages.create({
        body: payload.message,
        from: this.fromNumber,
        to: payload.to,
      });

      logger.info(`SMS sent successfully to ${payload.to}`, {
        messageId: message.sid,
      });

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error: any) {
      logger.error(`Failed to send SMS to ${payload.to}`, {
        error: error.message,
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
    if (!template) return;

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

    logger.info(`Processed ${smsMessages.length} SMS messages`);
  }

  /**
   * Get SMS delivery status from Twilio
   */
  async getDeliveryStatus(messageSid: string): Promise<string | null> {
    try {
      if (!this.isConfigured || !this.client) {
        return null;
      }
      const message = await this.client.messages(messageSid).fetch();
      return message.status;
    } catch (error) {
      logger.error(`Failed to fetch SMS status for ${messageSid}:`, error);
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
}

export const smsNotificationService = new SMSNotificationService();
