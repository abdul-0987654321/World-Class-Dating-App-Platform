/**
 * Email Notification Service (SendGrid)
 *
 * @deprecated This service uses SendGrid which violates AWS-only constraints.
 * Use SESEmailService from './ses-email.service' instead.
 * This file is maintained only for backward compatibility during migration.
 *
 * Migration: Replace all imports of this service with:
 *   import { sesEmailService } from './ses-email.service';
 */

import sgMail, { MailDataRequired } from '@sendgrid/mail';

import { db } from '../config/database';
import logger from '../utils/logger';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }>;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailNotificationService {
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@flamoral.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Flamoral';
  }

  /**
   * Send a single email
   */
  async sendEmail(options: EmailOptions): Promise<SendResult> {
    try {
      const msg: MailDataRequired = {
        to: options.to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: options.subject,
        text: options.text || '',
        html: options.html || options.text || '',
      };

      // Use SendGrid dynamic template if provided
      if (options.templateId) {
        msg.templateId = options.templateId;
        msg.dynamicTemplateData = options.templateData;
      }

      if (options.attachments) {
        msg.attachments = options.attachments;
      }

      const response = await sgMail.send(msg);

      logger.info(`Email sent successfully to ${options.to}`, {
        messageId: response[0]?.headers?.['x-message-id'],
      });

      return {
        success: true,
        messageId: response[0]?.headers?.['x-message-id'] as string,
      };
    } catch (error: any) {
      logger.error(`Failed to send email to ${options.to}`, {
        error: error.message,
        response: error.response?.body,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(userId: string, email: string, firstName: string): Promise<void> {
    const template = await this.getTemplate('welcome_email');
    if (!template) {
      logger.warn('Welcome email template not found');
      return;
    }

    const body = this.replaceVariables(template.body, { first_name: firstName });
    const htmlBody = template.html_body
      ? this.replaceVariables(template.html_body, { first_name: firstName })
      : body;

    // Queue the email
    const [notification] = await db('notifications')
      .insert({
        user_id: userId,
        template_id: template.id,
        type: 'email',
        category: 'system',
        title: template.title,
        body,
        data: JSON.stringify({ first_name: firstName }),
        status: 'pending',
      })
      .returning('id');

    await db('email_queue').insert({
      notification_id: notification.id,
      user_id: userId,
      to_email: email,
      subject: template.subject,
      text_body: body,
      html_body: htmlBody,
      status: 'queued',
    });

    // Process immediately if not in queue mode
    if (process.env.EMAIL_QUEUE_MODE !== 'true') {
      await this.processEmailQueue();
    }
  }

  /**
   * Send match notification email
   */
  async sendMatchEmail(
    userId: string,
    email: string,
    matchName: string,
    matchPhotoUrl: string
  ): Promise<void> {
    // Check user preferences first
    const prefs = await this.getUserPreferences(userId);
    if (!prefs?.email_new_match) {
      logger.info(`User ${userId} has disabled match emails`);
      return;
    }

    const template = await this.getTemplate('new_match_email');
    if (!template) return;

    const variables = { match_name: matchName, match_photo_url: matchPhotoUrl };
    const body = this.replaceVariables(template.body, variables);
    const htmlBody = template.html_body
      ? this.replaceVariables(template.html_body, variables)
      : body;
    const subject = this.replaceVariables(template.subject || "It's a Match!", variables);

    const [notification] = await db('notifications')
      .insert({
        user_id: userId,
        template_id: template.id,
        type: 'email',
        category: 'match',
        title: template.title,
        body,
        data: JSON.stringify(variables),
        status: 'pending',
      })
      .returning('id');

    await db('email_queue').insert({
      notification_id: notification.id,
      user_id: userId,
      to_email: email,
      subject,
      text_body: body,
      html_body: htmlBody,
      status: 'queued',
    });
  }

  /**
   * Send weekly digest email
   */
  async sendWeeklyDigest(
    userId: string,
    email: string,
    firstName: string,
    stats: { likes: number; matches: number; messages: number }
  ): Promise<void> {
    const prefs = await this.getUserPreferences(userId);
    if (!prefs?.email_weekly_digest) {
      return;
    }

    const template = await this.getTemplate('weekly_digest');
    if (!template) return;

    const variables = {
      first_name: firstName,
      likes_count: stats.likes.toString(),
      matches_count: stats.matches.toString(),
      messages_count: stats.messages.toString(),
    };

    const body = this.replaceVariables(template.body, variables);
    const subject = this.replaceVariables(template.subject || 'Your Weekly Digest', variables);

    const [notification] = await db('notifications')
      .insert({
        user_id: userId,
        template_id: template.id,
        type: 'email',
        category: 'marketing',
        title: template.title,
        body,
        data: JSON.stringify(variables),
        status: 'pending',
      })
      .returning('id');

    await db('email_queue').insert({
      notification_id: notification.id,
      user_id: userId,
      to_email: email,
      subject,
      text_body: body,
      html_body: template.html_body ? this.replaceVariables(template.html_body, variables) : body,
      status: 'queued',
    });
  }

  /**
   * Process queued emails
   */
  async processEmailQueue(batchSize: number = 50): Promise<void> {
    const emails = await db('email_queue')
      .where({ status: 'queued' })
      .where(function () {
        this.whereNull('scheduled_at').orWhere('scheduled_at', '<=', new Date());
      })
      .orderBy('created_at', 'asc')
      .limit(batchSize);

    for (const email of emails) {
      await db('email_queue').where({ id: email.id }).update({ status: 'processing' });

      const result = await this.sendEmail({
        to: email.to_email,
        subject: email.subject,
        text: email.text_body,
        html: email.html_body,
      });

      if (result.success) {
        await db('email_queue').where({ id: email.id }).update({
          status: 'sent',
          message_id: result.messageId,
          sent_at: new Date(),
        });

        await db('notifications')
          .where({ id: email.notification_id })
          .update({ status: 'sent', sent_at: new Date() });
      } else {
        const retryCount = email.retry_count + 1;
        const shouldRetry = retryCount < 3;

        await db('email_queue')
          .where({ id: email.id })
          .update({
            status: shouldRetry ? 'queued' : 'failed',
            error_message: result.error,
            retry_count: retryCount,
          });

        if (!shouldRetry) {
          await db('notifications')
            .where({ id: email.notification_id })
            .update({ status: 'failed', error_message: result.error });
        }
      }
    }
  }

  // Helper methods
  private async getTemplate(name: string): Promise<any> {
    return db('notification_templates').where({ name, is_active: true }).first();
  }

  private async getUserPreferences(userId: string): Promise<any> {
    return db('notification_preferences').where({ user_id: userId }).first();
  }

  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }
}

export const emailNotificationService = new EmailNotificationService();
