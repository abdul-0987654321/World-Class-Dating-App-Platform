import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandOutput,
} from '@aws-sdk/client-ses';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface MatchData {
  matchId: string;
  matchName: string;
  matchPhotoUrl?: string;
  matchedAt: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private sesClient: SESClient | null = null;
  private nodemailerTransport: Transporter | null = null;
  private fromEmail: string;
  private fromName: string;
  private useAWS: boolean;

  constructor(private configService: ConfigService) {
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') || 'noreply@flamoral.com';
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME') || 'Flamoral';
    this.useAWS = this.configService.get<string>('EMAIL_PROVIDER') === 'ses';

    this.initializeTransport();
  }

  private initializeTransport(): void {
    if (this.useAWS) {
      this.sesClient = new SESClient({
        region: this.configService.get<string>('AWS_SES_REGION') ||
                this.configService.get<string>('AWS_REGION') ||
                'us-east-1',
        credentials: this.getAWSCredentials(),
      });
      console.log('Email Service: Using AWS SES');
    } else {
      // SMTP configuration for development/alternative providers
      this.nodemailerTransport = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST') || 'localhost',
        port: this.configService.get<number>('SMTP_PORT') || 587,
        secure: this.configService.get<boolean>('SMTP_SECURE') || false,
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
      console.log('Email Service: Using SMTP/Nodemailer');
    }
  }

  private getAWSCredentials() {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    if (accessKeyId && secretAccessKey) {
      return { accessKeyId, secretAccessKey };
    }
    // Use IAM role if no explicit credentials
    return undefined;
  }

  private get fromAddress(): string {
    return `${this.fromName} <${this.fromEmail}>`;
  }

  /**
   * Send a welcome email to a new user
   */
  async sendWelcomeEmail(to: string, name: string): Promise<EmailResult> {
    const subject = 'Welcome to Flamoral!';
    const html = this.wrapInHtmlTemplate(`
      <h2>Welcome to Flamoral, ${this.escapeHtml(name)}!</h2>
      <p>We're thrilled to have you join our community of people looking for meaningful connections.</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Get Started:</h3>
        <ul style="line-height: 2;">
          <li>Complete your profile to attract the right matches</li>
          <li>Add photos that showcase your personality</li>
          <li>Write thoughtful prompts to stand out</li>
          <li>Start discovering amazing people near you</li>
        </ul>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.configService.get('FRONTEND_URL') || 'https://flamoral.com'}/profile"
           style="background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          Complete Your Profile
        </a>
      </div>
      <p>Happy matching!</p>
      <p>- The Flamoral Team</p>
    `);

    const text = `Welcome to Flamoral, ${name}! We're thrilled to have you join our community. Get started by completing your profile at ${this.configService.get('FRONTEND_URL') || 'https://flamoral.com'}/profile`;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send a password reset email
   */
  async sendPasswordReset(to: string, token: string): Promise<EmailResult> {
    const expiresInMinutes = 60;
    const resetUrl = `${this.configService.get('FRONTEND_URL') || 'https://flamoral.com'}/reset-password?token=${token}`;
    const subject = 'Reset Your Password - Flamoral';

    const html = this.wrapInHtmlTemplate(`
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}"
           style="background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 14px; color: #666;">Or copy this link: <a href="${resetUrl}" style="color: #FF6B6B;">${resetUrl}</a></p>
      <p style="font-size: 14px; color: #999;">This link expires in ${expiresInMinutes} minutes.</p>
      <p style="font-size: 14px; color: #999;">If you didn't request this, please ignore this email and your password will remain unchanged.</p>
    `);

    const text = `Reset your Flamoral password by visiting: ${resetUrl}. This link expires in ${expiresInMinutes} minutes. If you didn't request this, please ignore this email.`;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send a match notification email
   */
  async sendMatchNotification(to: string, matchData: MatchData): Promise<EmailResult> {
    const subject = "It's a Match! - Flamoral";
    const matchUrl = `${this.configService.get('FRONTEND_URL') || 'https://flamoral.com'}/matches/${matchData.matchId}`;

    const photoSection = matchData.matchPhotoUrl
      ? `<div style="text-align: center; margin: 20px 0;">
          <img src="${matchData.matchPhotoUrl}" alt="${this.escapeHtml(matchData.matchName)}"
               style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #FF6B6B;">
        </div>`
      : '';

    const html = this.wrapInHtmlTemplate(`
      <div style="text-align: center;">
        <h2 style="color: #FF6B6B;">It's a Match!</h2>
        ${photoSection}
        <p style="font-size: 18px;">You and <strong>${this.escapeHtml(matchData.matchName)}</strong> liked each other!</p>
        <p>Don't be shy - send a message and start a conversation!</p>
        <div style="margin: 30px 0;">
          <a href="${matchUrl}"
             style="background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Say Hello
          </a>
        </div>
        <p style="font-size: 12px; color: #999;">Matched on ${new Date(matchData.matchedAt).toLocaleDateString()}</p>
      </div>
    `);

    const text = `It's a Match! You and ${matchData.matchName} liked each other! Start a conversation: ${matchUrl}`;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Send a verification email with code
   */
  async sendVerificationEmail(to: string, code: string): Promise<EmailResult> {
    const expiresInMinutes = 10;
    const subject = 'Verify Your Email - Flamoral';

    const html = this.wrapInHtmlTemplate(`
      <h2>Email Verification</h2>
      <p>Your verification code is:</p>
      <div style="background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%); padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; color: white; border-radius: 8px;">
        ${this.escapeHtml(code)}
      </div>
      <p style="font-size: 14px; color: #666;">This code expires in ${expiresInMinutes} minutes.</p>
      <p style="font-size: 14px; color: #999;">If you didn't request this, please ignore this email.</p>
    `);

    const text = `Your Flamoral verification code is: ${code}. This code expires in ${expiresInMinutes} minutes.`;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Generic send email method
   */
  async sendEmail(options: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
  }): Promise<EmailResult> {
    const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

    try {
      if (this.useAWS && this.sesClient) {
        return await this.sendViaSES(toAddresses, options.subject, options.html, options.text);
      } else if (this.nodemailerTransport) {
        return await this.sendViaNodemailer(toAddresses, options.subject, options.html, options.text);
      } else {
        // Development fallback - just log the email
        console.log('Email would be sent:', {
          to: toAddresses,
          subject: options.subject,
          preview: options.text?.substring(0, 100),
        });
        return { success: true, messageId: `dev-${Date.now()}` };
      }
    } catch (error: any) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }

  private async sendViaSES(
    toAddresses: string[],
    subject: string,
    html: string,
    text?: string
  ): Promise<EmailResult> {
    const command = new SendEmailCommand({
      Source: this.fromAddress,
      Destination: {
        ToAddresses: toAddresses,
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: text ? { Data: text, Charset: 'UTF-8' } : undefined,
          Html: { Data: html, Charset: 'UTF-8' },
        },
      },
    });

    const response: SendEmailCommandOutput = await this.sesClient!.send(command);

    console.log(`Email sent via SES to ${toAddresses.join(', ')}`, {
      messageId: response.MessageId,
    });

    return {
      success: true,
      messageId: response.MessageId,
    };
  }

  private async sendViaNodemailer(
    toAddresses: string[],
    subject: string,
    html: string,
    text?: string
  ): Promise<EmailResult> {
    const info = await this.nodemailerTransport!.sendMail({
      from: this.fromAddress,
      to: toAddresses.join(', '),
      subject,
      text,
      html,
    });

    console.log(`Email sent via Nodemailer to ${toAddresses.join(', ')}`, {
      messageId: info.messageId,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  }

  private escapeHtml(text: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char) => htmlEntities[char]);
  }

  private wrapInHtmlTemplate(content: string): string {
    const year = new Date().getFullYear();
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://flamoral.com';

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
              <p style="margin: 0 0 10px 0;">&copy; ${year} Flamoral. All rights reserved.</p>
              <p style="margin: 0;">
                <a href="${frontendUrl}/privacy" style="color: #999999; text-decoration: underline;">Privacy Policy</a> |
                <a href="${frontendUrl}/terms" style="color: #999999; text-decoration: underline;">Terms of Service</a> |
                <a href="${frontendUrl}/unsubscribe" style="color: #999999; text-decoration: underline;">Unsubscribe</a>
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
