/**
 * Unit tests for EmailNotificationService (SendGrid - deprecated)
 * and SESEmailService (AWS SES - recommended)
 */

import { EmailNotificationService } from '../../../src/services/email-notification.service';
import { SESEmailService } from '../../../src/services/ses-email.service';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  db: jest.fn(),
}));

jest.mock('../../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  SendEmailCommand: jest.fn(),
  SendRawEmailCommand: jest.fn(),
  SendBulkTemplatedEmailCommand: jest.fn(),
}));

import { db } from '../../../src/config/database';
import sgMail from '@sendgrid/mail';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

describe('EmailNotificationService (SendGrid)', () => {
  let service: EmailNotificationService;
  let mockDb: jest.MockedFunction<typeof db>;

  beforeEach(() => {
    service = new EmailNotificationService();
    mockDb = db as jest.MockedFunction<typeof db>;
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        { headers: { 'x-message-id': 'msg-123' } },
      ]);

      const result = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        html: '<p>Test body</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(sgMail.send).toHaveBeenCalled();
    });

    it('should handle SendGrid errors gracefully', async () => {
      (sgMail.send as jest.Mock).mockRejectedValue(
        new Error('SendGrid API error')
      );

      const result = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SendGrid API error');
    });

    it('should use dynamic template when templateId is provided', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        { headers: { 'x-message-id': 'msg-123' } },
      ]);

      await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        templateId: 'd-template123',
        templateData: { name: 'John' },
      });

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'd-template123',
          dynamicTemplateData: { name: 'John' },
        })
      );
    });

    it('should include attachments when provided', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        { headers: { 'x-message-id': 'msg-123' } },
      ]);

      await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        attachments: [
          {
            content: 'base64content',
            filename: 'test.pdf',
            type: 'application/pdf',
            disposition: 'attachment',
          },
        ],
      });

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            expect.objectContaining({
              filename: 'test.pdf',
            }),
          ],
        })
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should queue welcome email and process it', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'template-1',
          title: 'Welcome',
          subject: 'Welcome to Flamoral!',
          body: 'Hello {{first_name}}, welcome!',
          html_body: '<h1>Hello {{first_name}}, welcome!</h1>',
        }),
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'notif-123' }]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      await service.sendWelcomeEmail('user-123', 'test@example.com', 'John');

      expect(mockQuery.insert).toHaveBeenCalled();
    });

    it('should handle missing template gracefully', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      await service.sendWelcomeEmail('user-123', 'test@example.com', 'John');

      // Should not throw, just log warning
      expect(mockQuery.first).toHaveBeenCalled();
    });
  });

  describe('sendMatchEmail', () => {
    it('should not send if user has disabled match emails', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          email_new_match: false,
        }),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      await service.sendMatchEmail(
        'user-123',
        'test@example.com',
        'Jane',
        'https://photo.url'
      );

      // Should check preferences and return early
      expect(mockQuery.first).toHaveBeenCalled();
    });

    it('should queue match email when enabled', async () => {
      const mockTemplateQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn()
          .mockResolvedValueOnce({ email_new_match: true }) // preferences
          .mockResolvedValueOnce({
            id: 'template-2',
            title: 'New Match',
            subject: "It's a Match!",
            body: 'You matched with {{match_name}}!',
          }),
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'notif-123' }]),
      };

      mockDb.mockImplementation(() => mockTemplateQuery as any);

      await service.sendMatchEmail(
        'user-123',
        'test@example.com',
        'Jane',
        'https://photo.url'
      );

      expect(mockTemplateQuery.insert).toHaveBeenCalled();
    });
  });

  describe('sendWeeklyDigest', () => {
    it('should not send if user has disabled weekly digest', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          email_weekly_digest: false,
        }),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      await service.sendWeeklyDigest(
        'user-123',
        'test@example.com',
        'John',
        { likes: 10, matches: 2, messages: 5 }
      );

      expect(mockQuery.first).toHaveBeenCalled();
    });
  });

  describe('processEmailQueue', () => {
    it('should process queued emails and update status', async () => {
      const mockEmails = [
        {
          id: 'email-1',
          to_email: 'test@example.com',
          subject: 'Test',
          text_body: 'Test body',
          html_body: '<p>Test</p>',
          notification_id: 'notif-1',
          retry_count: 0,
        },
      ];

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockEmails),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      (sgMail.send as jest.Mock).mockResolvedValue([
        { headers: { 'x-message-id': 'msg-123' } },
      ]);

      await service.processEmailQueue(50);

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'sent',
        })
      );
    });

    it('should retry failed emails up to 3 times', async () => {
      const mockEmails = [
        {
          id: 'email-1',
          to_email: 'test@example.com',
          subject: 'Test',
          text_body: 'Test body',
          notification_id: 'notif-1',
          retry_count: 1,
        },
      ];

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockEmails),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      (sgMail.send as jest.Mock).mockRejectedValue(new Error('API Error'));

      await service.processEmailQueue(50);

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'queued',
          retry_count: 2,
        })
      );
    });

    it('should mark email as failed after 3 retries', async () => {
      const mockEmails = [
        {
          id: 'email-1',
          to_email: 'test@example.com',
          subject: 'Test',
          text_body: 'Test body',
          notification_id: 'notif-1',
          retry_count: 2,
        },
      ];

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockEmails),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      (sgMail.send as jest.Mock).mockRejectedValue(new Error('API Error'));

      await service.processEmailQueue(50);

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
        })
      );
    });
  });
});

describe('SESEmailService (AWS SES)', () => {
  let service: SESEmailService;
  let mockDb: jest.MockedFunction<typeof db>;
  let mockSendCommand: jest.Mock;

  beforeEach(() => {
    mockSendCommand = jest.fn().mockResolvedValue({
      MessageId: 'ses-msg-123',
    });

    (SESClient as jest.Mock).mockImplementation(() => ({
      send: mockSendCommand,
    }));

    service = new SESEmailService();
    mockDb = db as jest.MockedFunction<typeof db>;
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send email successfully via SES', async () => {
      mockSendCommand.mockResolvedValue({ MessageId: 'ses-msg-123' });

      const result = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        html: '<p>Test body</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('ses-msg-123');
    });

    it('should handle SES errors gracefully', async () => {
      mockSendCommand.mockRejectedValue(new Error('SES API error'));

      const result = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SES API error');
    });

    it('should send to multiple recipients', async () => {
      mockSendCommand.mockResolvedValue({ MessageId: 'ses-msg-123' });

      const result = await service.sendEmail({
        to: ['test1@example.com', 'test2@example.com'],
        subject: 'Test Subject',
        text: 'Test body',
      });

      expect(result.success).toBe(true);
    });

    it('should include CC and BCC recipients', async () => {
      mockSendCommand.mockResolvedValue({ MessageId: 'ses-msg-123' });

      await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
      });

      expect(mockSendCommand).toHaveBeenCalled();
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email with code', async () => {
      mockSendCommand.mockResolvedValue({ MessageId: 'ses-msg-123' });

      const result = await service.sendVerificationEmail(
        'test@example.com',
        '123456',
        10
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with link', async () => {
      mockSendCommand.mockResolvedValue({ MessageId: 'ses-msg-123' });

      const result = await service.sendPasswordResetEmail(
        'test@example.com',
        'reset-token-123',
        60
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendSecurityAlert', () => {
    it('should send security alert email', async () => {
      mockSendCommand.mockResolvedValue({ MessageId: 'ses-msg-123' });

      const result = await service.sendSecurityAlert(
        'test@example.com',
        'New Login',
        { Device: 'iPhone', Location: 'New York' }
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendBulkEmail', () => {
    it('should send bulk emails in batches', async () => {
      mockSendCommand.mockResolvedValue({
        Status: [
          { Status: 'Success' },
          { Status: 'Success' },
        ],
      });

      const recipients = [
        { email: 'test1@example.com', templateData: { name: 'John' } },
        { email: 'test2@example.com', templateData: { name: 'Jane' } },
      ];

      const result = await service.sendBulkEmail(
        'template-name',
        recipients,
        { appName: 'Flamoral' }
      );

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures in bulk send', async () => {
      mockSendCommand.mockResolvedValue({
        Status: [
          { Status: 'Success' },
          { Status: 'Failed', Error: 'Invalid email' },
        ],
      });

      const recipients = [
        { email: 'valid@example.com', templateData: { name: 'John' } },
        { email: 'invalid', templateData: { name: 'Jane' } },
      ];

      const result = await service.sendBulkEmail('template-name', recipients);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toContain('invalid: Invalid email');
    });
  });

  describe('processEmailQueue', () => {
    it('should process queued emails from database', async () => {
      const mockEmails = [
        {
          id: 'email-1',
          to_email: 'test@example.com',
          subject: 'Test',
          text_body: 'Test body',
          html_body: '<p>Test</p>',
          notification_id: 'notif-1',
          retry_count: 0,
        },
      ];

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockEmails),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);
      mockSendCommand.mockResolvedValue({ MessageId: 'ses-msg-123' });

      await service.processEmailQueue(50);

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'sent',
        })
      );
    });
  });

  describe('Template helpers', () => {
    it('should replace variables in template', () => {
      const result = (service as any).replaceVariables(
        'Hello {{name}}, your code is {{code}}',
        { name: 'John', code: '123456' }
      );

      expect(result).toBe('Hello John, your code is 123456');
    });

    it('should wrap content in HTML template', () => {
      const result = (service as any).wrapInHtmlTemplate('<p>Test content</p>');

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<p>Test content</p>');
      expect(result).toContain('Flamoral');
    });
  });
});
