import {
  SESClient,
  SendEmailCommand,
  SendRawEmailCommand,
  SendBulkTemplatedEmailCommand,
} from '@aws-sdk/client-ses';

import { db } from '../config/database';
import logger from '../utils/logger';

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  templateName?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    content: string;
    filename: string;
    contentType: string;
  }>;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface BulkEmailRecipient {
  email: string;
  templateData: Record<string, any>;
}

export class SESEmailService {
  private sesClient: SESClient;
  private fromEmail: string;
  private fromName: string;
  private configurationSet?: string;

  constructor() {
    this.sesClient = new SESClient({
      region: process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1',
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined, // Use IAM role if no explicit credentials
    });

    this.fromEmail = process.env.EMAIL_FROM || 'noreply@flamoral.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Flamoral';
    this.configurationSet = process.env.AWS_SES_CONFIGURATION_SET;
  }

  private get fromAddress(): string {
    return `${this.fromName} <${this.fromEmail}>`;
  }

  /**
   * Send a single email via AWS SES
   */
  async sendEmail(options: EmailOptions): Promise<SendResult> {
    try {
      const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

      // If attachments are present, use raw email
      if (options.attachments && options.attachments.length > 0) {
        return this.sendRawEmail(options);
      }

      const command = new SendEmailCommand({
        Source: this.fromAddress,
        Destination: {
          ToAddresses: toAddresses,
          CcAddresses: options.cc,
          BccAddresses: options.bcc,
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: options.text ? { Data: options.text, Charset: 'UTF-8' } : undefined,
            Html: options.html ? { Data: options.html, Charset: 'UTF-8' } : undefined,
          },
        },
        ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
        ConfigurationSetName: this.configurationSet,
      });

      const response = await this.sesClient.send(command);

      logger.info(`Email sent successfully to ${toAddresses.join(', ')}`, {
        messageId: response.MessageId,
      });

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error: any) {
      logger.error(`Failed to send email to ${options.to}`, {
        error: error.message,
        code: error.Code,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send raw email with attachments
   */
  private async sendRawEmail(options: EmailOptions): Promise<SendResult> {
    try {
      const toAddresses = Array.isArray(options.to) ? options.to : [options.to];
      const boundary = `----=_Part_${Date.now().toString(36)}`;

      const rawEmail = [
        `From: ${this.fromAddress}`,
        `To: ${toAddresses.join(', ')}`,
        `Subject: ${options.subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: multipart/alternative; boundary="alt_boundary"',
        '',
      ];

      // Add text part
      if (options.text) {
        rawEmail.push(
          '--alt_boundary',
          'Content-Type: text/plain; charset=UTF-8',
          'Content-Transfer-Encoding: 7bit',
          '',
          options.text,
          ''
        );
      }

      // Add HTML part
      if (options.html) {
        rawEmail.push(
          '--alt_boundary',
          'Content-Type: text/html; charset=UTF-8',
          'Content-Transfer-Encoding: 7bit',
          '',
          options.html,
          ''
        );
      }

      rawEmail.push('--alt_boundary--', '');

      // Add attachments
      for (const attachment of options.attachments || []) {
        rawEmail.push(
          `--${boundary}`,
          `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
          '',
          attachment.content,
          ''
        );
      }

      rawEmail.push(`--${boundary}--`);

      const command = new SendRawEmailCommand({
        RawMessage: {
          Data: Buffer.from(rawEmail.join('\r\n')),
        },
        ConfigurationSetName: this.configurationSet,
      });

      const response = await this.sesClient.send(command);

      logger.info(`Raw email sent successfully to ${toAddresses.join(', ')}`, {
        messageId: response.MessageId,
      });

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error: any) {
      logger.error('Failed to send raw email', {
        error: error.message,
        code: error.Code,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send bulk templated emails (for mass notifications)
   */
  async sendBulkEmail(
    templateName: string,
    recipients: BulkEmailRecipient[],
    defaultTemplateData: Record<string, any> = {}
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    const results = { successful: 0, failed: 0, errors: [] as string[] };

    // SES bulk email has a limit of 50 destinations per call
    const batchSize = 50;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      try {
        const command = new SendBulkTemplatedEmailCommand({
          Source: this.fromAddress,
          Template: templateName,
          DefaultTemplateData: JSON.stringify(defaultTemplateData),
          Destinations: batch.map((recipient) => ({
            Destination: {
              ToAddresses: [recipient.email],
            },
            ReplacementTemplateData: JSON.stringify(recipient.templateData),
          })),
          ConfigurationSetName: this.configurationSet,
        });

        const response = await this.sesClient.send(command);

        response.Status?.forEach((status, index) => {
          if (status.Status === 'Success') {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push(`${batch[index].email}: ${status.Error || 'Unknown error'}`);
          }
        });
      } catch (error: any) {
        results.failed += batch.length;
        results.errors.push(`Batch error: ${error.message}`);
        logger.error('Bulk email batch failed', { error: error.message });
      }
    }

    logger.info('Bulk email send completed', {
      successful: results.successful,
      failed: results.failed,
    });

    return results;
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
      : this.wrapInHtmlTemplate(body);

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
      : this.wrapInHtmlTemplate(body);
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
      html_body: template.html_body
        ? this.replaceVariables(template.html_body, variables)
        : this.wrapInHtmlTemplate(body),
      status: 'queued',
    });
  }

  /**
   * Send verification code email
   */
  async sendVerificationEmail(
    email: string,
    code: string,
    expiresInMinutes: number = 10
  ): Promise<SendResult> {
    const subject = 'Verify Your Email - Flamoral';
    const html = this.wrapInHtmlTemplate(`
      <h2>Email Verification</h2>
      <p>Your verification code is:</p>
      <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">
        ${code}
      </div>
      <p>This code expires in ${expiresInMinutes} minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `);

    return this.sendEmail({
      to: email,
      subject,
      text: `Your Flamoral verification code is: ${code}. This code expires in ${expiresInMinutes} minutes.`,
      html,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    expiresInMinutes: number = 60
  ): Promise<SendResult> {
    const resetUrl = `${process.env.FRONTEND_URL || 'https://flamoral.com'}/reset-password?token=${resetToken}`;
    const subject = 'Reset Your Password - Flamoral';
    const html = this.wrapInHtmlTemplate(`
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background: #FF6B6B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in ${expiresInMinutes} minutes.</p>
      <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
    `);

    return this.sendEmail({
      to: email,
      subject,
      text: `Reset your Flamoral password by visiting: ${resetUrl}. This link expires in ${expiresInMinutes} minutes.`,
      html,
    });
  }

  /**
   * Send security alert email
   */
  async sendSecurityAlert(
    email: string,
    alertType: string,
    details: Record<string, string>
  ): Promise<SendResult> {
    const subject = `Security Alert - ${alertType} - Flamoral`;
    const detailsList = Object.entries(details)
      .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
      .join('');

    const html = this.wrapInHtmlTemplate(`
      <h2 style="color: #d32f2f;">Security Alert</h2>
      <p>We detected the following activity on your account:</p>
      <div style="background: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0;">
        <strong>${alertType}</strong>
        <ul>${detailsList}</ul>
      </div>
      <p>If this was you, you can ignore this email. If you don't recognize this activity, please:</p>
      <ol>
        <li>Change your password immediately</li>
        <li>Enable two-factor authentication</li>
        <li>Contact our support team</li>
      </ol>
    `);

    return this.sendEmail({
      to: email,
      subject,
      text: `Security Alert: ${alertType}. ${Object.entries(details)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')}`,
      html,
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

  private wrapInHtmlTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flamoral</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px; text-align: center; background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Flamoral</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px; color: #333333; line-height: 1.6;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; text-align: center; color: #999999; font-size: 12px; border-top: 1px solid #eeeeee;">
              <p style="margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} Flamoral. All rights reserved.</p>
              <p style="margin: 0;">
                <a href="${process.env.FRONTEND_URL || 'https://flamoral.com'}/privacy" style="color: #999999; text-decoration: underline;">Privacy Policy</a> |
                <a href="${process.env.FRONTEND_URL || 'https://flamoral.com'}/unsubscribe" style="color: #999999; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}

export const sesEmailService = new SESEmailService();
