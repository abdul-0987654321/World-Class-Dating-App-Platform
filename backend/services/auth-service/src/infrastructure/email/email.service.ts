import { EmailClient, EmailMessage } from '@azure/communication-email';

import { config } from '../../config';
import logger from '../../utils/logger';

class EmailService {
  private emailClient: EmailClient;
  private senderAddress: string;

  constructor() {
    const connectionString = config.email.azureConnectionString;
    if (!connectionString) {
      logger.warn(
        'Azure Communication Services connection string not configured - emails will not be sent'
      );
    }
    this.emailClient = connectionString ? new EmailClient(connectionString) : (null as any);
    this.senderAddress = config.email.from;
  }

  /**
   * Send email using Azure Communication Services
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.emailClient) {
      logger.warn('Email client not configured - skipping email send');
      return;
    }

    const message: EmailMessage = {
      senderAddress: this.senderAddress,
      content: {
        subject,
        html,
      },
      recipients: {
        to: [{ address: to }],
      },
    };

    try {
      const poller = await this.emailClient.beginSend(message);
      const result = await poller.pollUntilDone();

      if (result.status === 'Succeeded') {
        logger.info(`Email sent successfully to ${to}`);
      } else {
        logger.error(`Email send failed with status: ${result.status}`);
        throw new Error(`Email send failed: ${result.status}`);
      }
    } catch (error) {
      logger.error('Failed to send email', error);
      throw error;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #E91E63;">Welcome to Flamoral!</h1>
        <p>Hi ${name},</p>
        <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}"
             style="background-color: #E91E63; color: white; padding: 15px 30px;
                    text-decoration: none; border-radius: 5px; font-weight: bold;">
            Verify Email
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #666;">${verificationUrl}</p>
        <p>This link expires in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          If you didn't create an account with Flamoral, please ignore this email.
        </p>
      </div>
    `;

    try {
      await this.sendEmail(email, 'Verify your Flamoral account', html);
      logger.info(`Verification email sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send verification email', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #E91E63;">Password Reset Request</h1>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #E91E63; color: white; padding: 15px 30px;
                    text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #666;">${resetUrl}</p>
        <p>This link expires in 1 hour.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          If you didn't request a password reset, please ignore this email or contact support
          if you're concerned about your account security.
        </p>
      </div>
    `;

    try {
      await this.sendEmail(email, 'Reset your Flamoral password', html);
      logger.info(`Password reset email sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send password reset email', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #E91E63;">Your journey begins now!</h1>
        <p>Hi ${name},</p>
        <p>Your email has been verified and your account is ready to go!</p>
        <p>Here are some tips to get started:</p>
        <ul>
          <li>Complete your profile with great photos</li>
          <li>Add a bio that shows your personality</li>
          <li>Set your preferences to find the right matches</li>
          <li>Start swiping and make meaningful connections!</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${config.frontendUrl}/discover"
             style="background-color: #E91E63; color: white; padding: 15px 30px;
                    text-decoration: none; border-radius: 5px; font-weight: bold;">
            Start Discovering
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          Happy matching!<br>The Flamoral Team
        </p>
      </div>
    `;

    try {
      await this.sendEmail(email, "Welcome to Flamoral - Let's find your match!", html);
      logger.info(`Welcome email sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send welcome email', error);
      // Don't throw - welcome email is not critical
    }
  }
}

export const emailService = new EmailService();
export default emailService;
