import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import nodemailer, { Transporter } from 'nodemailer';
import { db } from '../config/database';
import { config } from '../config';
import logger from '../utils/logger';
import crypto from 'crypto';

type EmailProvider = 'sendgrid' | 'ses' | 'smtp';

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
  userId?: string;
  category?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailNotificationService {
  private fromEmail: string;
  private fromName: string;
  private provider: EmailProvider;
  private sesClient?: SESClient;
  private smtpTransporter?: Transporter;
  private baseUrl: string;
  private initialized: boolean = false;

  constructor() {
    this.fromEmail = config.sendgrid.fromEmail;
    this.fromName = config.sendgrid.fromName;
    this.baseUrl = config.webAppUrl;

    try {
      // Determine email provider with proper validation
      if (config.sendgrid.apiKey && config.sendgrid.apiKey.length > 0) {
        this.provider = 'sendgrid';
        sgMail.setApiKey(config.sendgrid.apiKey);
        this.initialized = true;
        logger.info('Email notification service initialized with SendGrid');
      } else if (process.env.AWS_SES_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        this.provider = 'ses';
        this.sesClient = new SESClient({
          region: process.env.AWS_SES_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });
        this.initialized = true;
        logger.info('Email notification service initialized with AWS SES');
      } else {
        this.provider = 'smtp';
        this.smtpTransporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '1025', 10),
          secure: process.env.SMTP_SECURE === 'true',
          ignoreTLS: config.nodeEnv === 'development',
          auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          } : undefined,
        });
        this.initialized = true;
        logger.info('Email notification service initialized with SMTP', {
          host: process.env.SMTP_HOST || 'localhost',
          port: process.env.SMTP_PORT || '1025',
        });
      }
    } catch (error: any) {
      logger.error('Failed to initialize email notification service', {
        error: error.message,
        stack: error.stack,
      });
      this.initialized = false;
    }
  }

  /**
   * Generate unsubscribe token for a user
   */
  private async generateUnsubscribeToken(userId: string, category: string = 'all'): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year expiry

    await db('email_unsubscribe_tokens').insert({
      user_id: userId,
      token,
      category,
      expires_at: expiresAt,
      created_at: new Date(),
    }).onConflict(['user_id', 'category']).merge();

    return token;
  }

  /**
   * Add unsubscribe footer to HTML email
   */
  private async addUnsubscribeFooter(html: string, userId?: string, category?: string): Promise<string> {
    if (!userId) return html;

    const token = await this.generateUnsubscribeToken(userId, category || 'all');
    const unsubscribeUrl = `${this.baseUrl}/unsubscribe?token=${token}`;
    const preferencesUrl = `${this.baseUrl}/settings/notifications`;

    const footer = `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <tr>
          <td style="text-align: center; color: #999; font-size: 12px; line-height: 1.6;">
            <p style="margin: 0 0 10px;">You're receiving this email because you have an account with Flamoral.</p>
            <p style="margin: 0 0 10px;">
              <a href="${preferencesUrl}" style="color: #667eea; text-decoration: none;">Manage notification preferences</a> |
              <a href="${unsubscribeUrl}" style="color: #999; text-decoration: none;">Unsubscribe</a>
            </p>
            <p style="margin: 10px 0 0;">&copy; ${new Date().getFullYear()} Flamoral. All rights reserved.</p>
          </td>
        </tr>
      </table>
    `;

    // Insert footer before closing body tag
    return html.replace('</body>', `${footer}</body>`);
  }

  /**
   * Send a single email
   */
  async sendEmail(options: EmailOptions): Promise<SendResult> {
    // Check if service is initialized
    if (!this.initialized) {
      logger.error('Email service not initialized. Cannot send email.');
      return {
        success: false,
        error: 'Email service not initialized',
      };
    }

    try {
      // Validate email address
      if (!options.to || !this.isValidEmail(options.to)) {
        logger.error('Invalid email address', { to: options.to });
        return {
          success: false,
          error: 'Invalid email address',
        };
      }

      // Add unsubscribe footer if user ID is provided
      let html = options.html || options.text || '';
      if (options.userId && html) {
        html = await this.addUnsubscribeFooter(html, options.userId, options.category);
      }

      const from = `${this.fromName} <${this.fromEmail}>`;

      switch (this.provider) {
        case 'sendgrid':
          const msg: MailDataRequired = {
            to: options.to,
            from: {
              email: this.fromEmail,
              name: this.fromName,
            },
            subject: options.subject,
            text: options.text || '',
            html,
          };

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

        case 'ses':
          if (!this.sesClient) throw new Error('SES client not initialized');

          const sesCommand = new SendEmailCommand({
            Source: from,
            Destination: {
              ToAddresses: [options.to],
            },
            Message: {
              Subject: {
                Data: options.subject,
                Charset: 'UTF-8',
              },
              Body: {
                Html: {
                  Data: html,
                  Charset: 'UTF-8',
                },
                Text: options.text
                  ? {
                      Data: options.text,
                      Charset: 'UTF-8',
                    }
                  : undefined,
              },
            },
          });

          const sesResponse = await this.sesClient.send(sesCommand);

          logger.info(`Email sent successfully to ${options.to}`, {
            messageId: sesResponse.MessageId,
          });

          return {
            success: true,
            messageId: sesResponse.MessageId,
          };

        case 'smtp':
          if (!this.smtpTransporter) throw new Error('SMTP transporter not initialized');

          const smtpResponse = await this.smtpTransporter.sendMail({
            from,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html,
          });

          logger.info(`Email sent successfully to ${options.to}`, {
            messageId: smtpResponse.messageId,
          });

          return {
            success: true,
            messageId: smtpResponse.messageId,
          };
      }

      return {
        success: false,
        error: 'Unknown email provider',
      };
    } catch (error: any) {
      logger.error(`Failed to send email to ${options.to}`, {
        error: error.message,
        provider: this.provider,
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
  async sendMatchEmail(userId: string, email: string, matchName: string, matchPhotoUrl: string): Promise<void> {
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
      html_body: template.html_body
        ? this.replaceVariables(template.html_body, variables)
        : body,
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

        await db('email_queue').where({ id: email.id }).update({
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

  /**
   * Validate email address
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if email service is initialized and ready
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get current provider
   */
  public getProvider(): EmailProvider {
    return this.provider;
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'Email service not initialized',
      };
    }

    try {
      if (this.provider === 'smtp' && this.smtpTransporter) {
        await this.smtpTransporter.verify();
        logger.info('SMTP connection verified successfully');
        return { success: true };
      }
      return { success: true };
    } catch (error: any) {
      logger.error('SMTP connection verification failed', {
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export const emailNotificationService = new EmailNotificationService();
