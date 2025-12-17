import nodemailer, { Transporter } from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { config } from '../../config';
import logger from '../../utils/logger';

type EmailProvider = 'sendgrid' | 'ses' | 'smtp';

class EmailService {
  private transporter?: Transporter;
  private provider: EmailProvider;
  private sesClient?: SESClient;
  private initialized: boolean = false;

  constructor() {
    this.provider = 'smtp'; // Default fallback

    // Determine email provider based on configuration
    if (process.env.SENDGRID_API_KEY &&
        process.env.SENDGRID_API_KEY !== 'your-sendgrid-api-key' &&
        process.env.SENDGRID_API_KEY.startsWith('SG.')) {
      this.provider = 'sendgrid';
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.initialized = true;
      logger.info('Auth Service - Email service initialized with SendGrid');
    } else if (process.env.AWS_SES_REGION &&
               process.env.AWS_ACCESS_KEY_ID &&
               process.env.AWS_SECRET_ACCESS_KEY) {
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
      this.initialized = true;
      logger.info('Auth Service - Email service initialized with AWS SES');
    } else {
      // Fall back to SMTP (for development with Mailhog or similar)
      this.provider = 'smtp';
      this.transporter = nodemailer.createTransport({
        host: config.email.host || 'localhost',
        port: config.email.port || 1025,
        secure: config.email.port === 465,
        ignoreTLS: process.env.NODE_ENV === 'development',
        auth: config.email.user && config.email.password ? {
          user: config.email.user,
          pass: config.email.password,
        } : undefined,
      });
      this.initialized = true;
      logger.info('Auth Service - Email service initialized with SMTP', {
        host: config.email.host || 'localhost',
        port: config.email.port || 1025,
      });
    }
  }

  private async sendViaProvider(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    if (!this.initialized) {
      throw new Error('Email service not initialized');
    }

    const from = `"Flamoral" <${config.email.from || 'noreply@flamoral.com'}>`;

    switch (this.provider) {
      case 'sendgrid':
        await sgMail.send({
          to: options.to,
          from: {
            email: config.email.from || 'noreply@flamoral.com',
            name: 'Flamoral',
          },
          subject: options.subject,
          html: options.html,
          text: options.text || '',
        });
        logger.info(`Email sent via SendGrid to ${options.to}: ${options.subject}`);
        break;

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
                Data: options.html,
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
        await this.sesClient.send(sesCommand);
        logger.info(`Email sent via AWS SES to ${options.to}: ${options.subject}`);
        break;

      case 'smtp':
        if (!this.transporter) throw new Error('SMTP transporter not initialized');
        await this.transporter.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });
        logger.info(`Email sent via SMTP to ${options.to}: ${options.subject}`);
        break;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const verificationUrl = `${config.frontendUrl || 'http://localhost:3000'}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your Flamoral account</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #E91E63 0%, #F06292 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Welcome to Flamoral!</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #333; font-size: 16px; line-height: 1.5; margin: 0 0 20px;">Hi ${name},</p>
                      <p style="color: #333; font-size: 16px; line-height: 1.5; margin: 0 0 20px;">Thanks for signing up! Please verify your email address by clicking the button below:</p>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${verificationUrl}" style="display: inline-block; background-color: #E91E63; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Verify Email</a>
                          </td>
                        </tr>
                      </table>
                      <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 20px 0;">Or copy and paste this link in your browser:</p>
                      <p style="color: #E91E63; font-size: 14px; word-break: break-all; margin: 0 0 20px;">${verificationUrl}</p>
                      <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 20px 0 0;"><strong>This link expires in 24 hours.</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 20px 30px; border-top: 1px solid #eee;">
                      <p style="color: #999; font-size: 12px; line-height: 1.5; margin: 0;">If you didn't create an account with Flamoral, please ignore this email.</p>
                      <p style="color: #999; font-size: 12px; line-height: 1.5; margin: 10px 0 0;">&copy; ${new Date().getFullYear()} Flamoral. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const text = `
      Welcome to Flamoral!

      Hi ${name},

      Thanks for signing up! Please verify your email address by visiting:
      ${verificationUrl}

      This link expires in 24 hours.

      If you didn't create an account with Flamoral, please ignore this email.

      Best regards,
      The Flamoral Team
    `;

    try {
      await this.sendViaProvider({
        to: email,
        subject: 'Verify your Flamoral account',
        html,
        text,
      });
      logger.info(`Verification email sent to ${email} via ${this.provider}`);
    } catch (error: any) {
      logger.error('Failed to send verification email', {
        error: error.message,
        provider: this.provider,
        to: email,
      });
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    const resetUrl = `${config.frontendUrl || 'http://localhost:3000'}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset your Flamoral password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #F44336 0%, #E57373 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Password Reset Request</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #333; font-size: 16px; line-height: 1.5; margin: 0 0 20px;">Hi ${name},</p>
                      <p style="color: #333; font-size: 16px; line-height: 1.5; margin: 0 0 20px;">We received a request to reset your password. Click the button below to create a new password:</p>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${resetUrl}" style="display: inline-block; background-color: #F44336; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Reset Password</a>
                          </td>
                        </tr>
                      </table>
                      <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 20px 0;">Or copy and paste this link in your browser:</p>
                      <p style="color: #F44336; font-size: 14px; word-break: break-all; margin: 0 0 20px;">${resetUrl}</p>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                        <tr>
                          <td>
                            <p style="color: #856404; font-size: 14px; font-weight: bold; margin: 0 0 10px;">Security Notice:</p>
                            <ul style="color: #856404; font-size: 14px; margin: 0; padding-left: 20px;">
                              <li>This link expires in 1 hour</li>
                              <li>If you didn't request this, please ignore this email</li>
                              <li>Your password will not change unless you click the link above</li>
                              <li>For security reasons, never share this link with anyone</li>
                            </ul>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 20px 30px; border-top: 1px solid #eee;">
                      <p style="color: #999; font-size: 12px; line-height: 1.5; margin: 0;">If you didn't request a password reset, please contact our support team immediately if you're concerned about your account security.</p>
                      <p style="color: #999; font-size: 12px; line-height: 1.5; margin: 10px 0 0;">&copy; ${new Date().getFullYear()} Flamoral. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const text = `
      Password Reset Request

      Hi ${name},

      We received a request to reset your password. To reset your password, visit:
      ${resetUrl}

      Security Notice:
      - This link expires in 1 hour
      - If you didn't request this, please ignore this email
      - Your password will not change unless you click the link above
      - For security reasons, never share this link with anyone

      If you're concerned about your account security, please contact our support team.

      Best regards,
      The Flamoral Team
    `;

    try {
      await this.sendViaProvider({
        to: email,
        subject: 'Reset your Flamoral password',
        html,
        text,
      });
      logger.info(`Password reset email sent to ${email} via ${this.provider}`);
    } catch (error: any) {
      logger.error('Failed to send password reset email', {
        error: error.message,
        provider: this.provider,
        to: email,
      });
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Flamoral</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #E91E63 0%, #F06292 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Your Journey Begins Now!</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #333; font-size: 16px; line-height: 1.5; margin: 0 0 20px;">Hi ${name},</p>
                      <p style="color: #333; font-size: 16px; line-height: 1.5; margin: 0 0 20px;">Your email has been verified and your account is ready to go!</p>
                      <p style="color: #333; font-size: 16px; font-weight: bold; margin: 20px 0 10px;">Here are some tips to get started:</p>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 20px;">
                        <tr>
                          <td style="padding: 10px 0;">
                            <table cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="width: 30px; vertical-align: top;">
                                  <span style="color: #E91E63; font-size: 18px; font-weight: bold;">1.</span>
                                </td>
                                <td>
                                  <p style="color: #555; font-size: 14px; margin: 0;">Complete your profile with great photos</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0;">
                            <table cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="width: 30px; vertical-align: top;">
                                  <span style="color: #E91E63; font-size: 18px; font-weight: bold;">2.</span>
                                </td>
                                <td>
                                  <p style="color: #555; font-size: 14px; margin: 0;">Add a bio that shows your personality</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0;">
                            <table cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="width: 30px; vertical-align: top;">
                                  <span style="color: #E91E63; font-size: 18px; font-weight: bold;">3.</span>
                                </td>
                                <td>
                                  <p style="color: #555; font-size: 14px; margin: 0;">Set your preferences to find the right matches</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0;">
                            <table cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="width: 30px; vertical-align: top;">
                                  <span style="color: #E91E63; font-size: 18px; font-weight: bold;">4.</span>
                                </td>
                                <td>
                                  <p style="color: #555; font-size: 14px; margin: 0;">Start swiping and make meaningful connections!</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${config.frontendUrl || 'http://localhost:3000'}/discover" style="display: inline-block; background-color: #E91E63; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Start Discovering</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 20px 30px; border-top: 1px solid #eee;">
                      <p style="color: #333; font-size: 14px; line-height: 1.5; margin: 0 0 10px;">Happy matching!</p>
                      <p style="color: #333; font-size: 14px; line-height: 1.5; margin: 0 0 15px;">The Flamoral Team</p>
                      <p style="color: #999; font-size: 12px; line-height: 1.5; margin: 10px 0 0;">&copy; ${new Date().getFullYear()} Flamoral. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const text = `
      Your Journey Begins Now!

      Hi ${name},

      Your email has been verified and your account is ready to go!

      Here are some tips to get started:
      1. Complete your profile with great photos
      2. Add a bio that shows your personality
      3. Set your preferences to find the right matches
      4. Start swiping and make meaningful connections!

      Visit ${config.frontendUrl || 'http://localhost:3000'}/discover to start discovering matches!

      Happy matching!
      The Flamoral Team
    `;

    try {
      await this.sendViaProvider({
        to: email,
        subject: 'Welcome to Flamoral - Let\'s find your match!',
        html,
        text,
      });
      logger.info(`Welcome email sent to ${email} via ${this.provider}`);
    } catch (error: any) {
      logger.error('Failed to send welcome email', {
        error: error.message,
        provider: this.provider,
        to: email,
      });
      // Don't throw - welcome email is not critical
    }
  }

  /**
   * Check if email service is initialized
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
}

export const emailService = new EmailService();
export default emailService;
