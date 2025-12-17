import sgMail from '@sendgrid/mail';
import nodemailer, { Transporter } from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import logger from '../../utils/logger';

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

type EmailProvider = 'sendgrid' | 'ses' | 'smtp';

export class EmailService {
  private smtpTransporter?: Transporter;
  private provider: EmailProvider;
  private sesClient?: SESClient;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@flamoral.com';
    this.fromName = process.env.FROM_NAME || 'Flamoral';

    // Determine email provider based on configuration
    if (process.env.SENDGRID_API_KEY) {
      this.provider = 'sendgrid';
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      logger.info('Email service initialized with SendGrid');
    } else if (process.env.AWS_SES_REGION) {
      this.provider = 'ses';
      this.sesClient = new SESClient({
        region: process.env.AWS_SES_REGION || 'us-east-1',
        credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
      });
      logger.info('Email service initialized with AWS SES');
    } else {
      // Fall back to SMTP (including Mailhog for development)
      this.provider = 'smtp';
      this.smtpTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '1025', 10),
        secure: process.env.SMTP_SECURE === 'true',
        ignoreTLS: process.env.NODE_ENV === 'development',
        auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            }
          : undefined,
      });
      logger.info(`Email service initialized with SMTP (${process.env.NODE_ENV === 'development' ? 'Mailhog' : 'Custom SMTP'})`);
    }
  }

  async sendEmail(template: EmailTemplate): Promise<void> {
    try {
      const from = `${this.fromName} <${this.fromEmail}>`;

      switch (this.provider) {
        case 'sendgrid':
          await sgMail.send({
            to: template.to,
            from: {
              email: this.fromEmail,
              name: this.fromName,
            },
            subject: template.subject,
            html: template.html,
            text: template.text || '',
          });
          break;

        case 'ses':
          if (!this.sesClient) throw new Error('SES client not initialized');
          const sesCommand = new SendEmailCommand({
            Source: from,
            Destination: {
              ToAddresses: [template.to],
            },
            Message: {
              Subject: {
                Data: template.subject,
                Charset: 'UTF-8',
              },
              Body: {
                Html: {
                  Data: template.html,
                  Charset: 'UTF-8',
                },
                Text: template.text
                  ? {
                      Data: template.text,
                      Charset: 'UTF-8',
                    }
                  : undefined,
              },
            },
          });
          await this.sesClient.send(sesCommand);
          break;

        case 'smtp':
          if (!this.smtpTransporter) throw new Error('SMTP transporter not initialized');
          await this.smtpTransporter.sendMail({
            from,
            to: template.to,
            subject: template.subject,
            html: template.html,
            text: template.text || '',
          });
          break;
      }

      logger.info(`Email sent via ${this.provider} to ${template.to}: ${template.subject}`);
    } catch (error: any) {
      logger.error('Email sending failed:', { error, provider: this.provider });
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
