import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import logger from '../../utils/logger';

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private smtpTransporter: any;
  private useSMTP: boolean;

  constructor() {
    // Check if we should use SMTP (Mailhog for local development)
    this.useSMTP = process.env.NODE_ENV === 'development' && !process.env.SENDGRID_API_KEY;

    if (this.useSMTP) {
      // Configure SMTP for local development with Mailhog
      this.smtpTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '1025', 10),
        ignoreTLS: true,
        secure: false,
      });
      logger.info('Using SMTP (Mailhog) for email sending in development mode');
    } else {
      // Configure SendGrid for production
      const apiKey = process.env.SENDGRID_API_KEY;
      if (apiKey) {
        sgMail.setApiKey(apiKey);
        logger.info('Using SendGrid for email sending');
      } else {
        logger.warn('SendGrid API key not configured. Email sending will be disabled.');
      }
    }
  }

  async sendEmail(template: EmailTemplate): Promise<void> {
    try {
      if (this.useSMTP) {
        // Send via SMTP (Mailhog)
        await this.smtpTransporter.sendMail({
          from: `${process.env.FROM_NAME || 'Flamoral'} <${process.env.FROM_EMAIL || 'noreply@flamoral.com'}>`,
          to: template.to,
          subject: template.subject,
          html: template.html,
          text: template.text || '',
        });
        logger.info(`Email sent via SMTP to ${template.to}: ${template.subject}`);
      } else if (process.env.SENDGRID_API_KEY) {
        // Send via SendGrid
        const msg = {
          to: template.to,
          from: {
            email: process.env.FROM_EMAIL || 'noreply@flamoral.com',
            name: process.env.FROM_NAME || 'Flamoral',
          },
          subject: template.subject,
          html: template.html,
          text: template.text || '',
        };

        await sgMail.send(msg);
        logger.info(`Email sent via SendGrid to ${template.to}: ${template.subject}`);
      } else {
        logger.warn(`Email not sent (no email service configured): ${template.subject} to ${template.to}`);
      }
    } catch (error: any) {
      logger.error('Email sending failed:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendVerificationEmail(email: string, firstName: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${process.env.WEB_APP_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Flamoral!</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>Thank you for signing up! We're excited to have you join our community.</p>
              <p>To get started, please verify your email address by clicking the button below:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
              <p><strong>This link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account with Flamoral, please ignore this email.</p>
              <p>Best regards,<br>The Flamoral Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Flamoral. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Welcome to Flamoral!

      Hi ${firstName},

      Thank you for signing up! To verify your email address, please visit:
      ${verificationUrl}

      This link will expire in 24 hours.

      If you didn't create an account, please ignore this email.

      Best regards,
      The Flamoral Team
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verify your Flamoral account',
      html,
      text,
    });
  }

  async sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.WEB_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>We received a request to reset your password for your Flamoral account.</p>
              <p>Click the button below to reset your password:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this, please ignore this email</li>
                  <li>Your password will not be changed unless you click the link above</li>
                </ul>
              </div>
              <p>Best regards,<br>The Flamoral Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Flamoral. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Password Reset Request

      Hi ${firstName},

      We received a request to reset your password. To reset your password, visit:
      ${resetUrl}

      This link will expire in 1 hour.

      If you didn't request this, please ignore this email. Your password will not be changed.

      Best regards,
      The Flamoral Team
    `;

    await this.sendEmail({
      to: email,
      subject: 'Reset your Flamoral password',
      html,
      text,
    });
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .tips { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You're All Set!</h1>
            </div>
            <div class="content">
              <h2>Welcome, ${firstName}!</h2>
              <p>Your email has been verified and your Flamoral account is now active.</p>
              <div class="tips">
                <h3>✨ Get Started:</h3>
                <ol>
                  <li><strong>Complete your profile</strong> - Add photos and tell us about yourself</li>
                  <li><strong>Set your preferences</strong> - Let us know who you'd like to meet</li>
                  <li><strong>Start swiping</strong> - Discover amazing people near you</li>
                </ol>
              </div>
              <div style="text-align: center;">
                <a href="${process.env.WEB_APP_URL || 'http://localhost:3000'}/profile" class="button">Complete Your Profile</a>
              </div>
              <p>Happy connecting!</p>
              <p>Best regards,<br>The Flamoral Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Flamoral. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: '🎉 Welcome to Flamoral!',
      html,
    });
  }
}

export default new EmailService();
