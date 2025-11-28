/**
 * SendGrid Email Integration Service
 */

import sgMail from '@sendgrid/mail';
import { logger } from '../../../utils/logger';

export class SendGridService {
  private fromEmail: string;
  private fromName: string;
  private initialized: boolean = false;

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.initialized = true;
    }
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@flamoral.com';
    this.fromName = process.env.SENDGRID_FROM_NAME || 'Flamoral';
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.initialized) {
      logger.warn('SendGrid not configured, skipping email send to:', to);
      return;
    }
    try {
      await sgMail.send({
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject,
        html,
      });
      logger.info(`Email sent to ${to}`);
    } catch (error) {
      logger.error('SendGrid send email error:', error);
      throw error;
    }
  }

  async sendTemplateEmail(to: string, templateId: string, dynamicData: any): Promise<void> {
    try {
      await sgMail.send({
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        templateId,
        dynamicTemplateData: dynamicData,
      });
      logger.info(`Template email sent to ${to}`);
    } catch (error) {
      logger.error('SendGrid send template email error:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const templateId = process.env.SENDGRID_TEMPLATE_WELCOME;
    if (!templateId) {
      logger.warn('Welcome email template not configured');
      return;
    }

    await this.sendTemplateEmail(to, templateId, {
      first_name: name,
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const templateId = process.env.SENDGRID_TEMPLATE_PASSWORD_RESET;
    if (!templateId) {
      logger.warn('Password reset email template not configured');
      return;
    }

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await this.sendTemplateEmail(to, templateId, {
      reset_url: resetUrl,
    });
  }
}

// Export singleton instance
export const sendEmailService = new SendGridService();
