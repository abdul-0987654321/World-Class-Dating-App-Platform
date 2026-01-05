/**
 * Unit tests for SMSNotificationService (Twilio - deprecated)
 * and SNSSMSService (AWS SNS - recommended)
 */

import { SMSNotificationService } from '../../../src/services/sms-notification.service';
import { SNSSMSService } from '../../../src/services/sns-sms.service';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  db: jest.fn(),
}));

jest.mock('../../../src/config', () => ({
  config: {
    twilio: {
      accountSid: 'AC123test',
      authToken: 'test-auth-token',
      fromNumber: '+15551234567',
    },
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(),
    },
  }));
});

jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PublishCommand: jest.fn(),
  SetSMSAttributesCommand: jest.fn(),
  CheckIfPhoneNumberIsOptedOutCommand: jest.fn(),
}));

import { db } from '../../../src/config/database';
import twilio from 'twilio';
import { SNSClient, PublishCommand, CheckIfPhoneNumberIsOptedOutCommand } from '@aws-sdk/client-sns';

describe('SMSNotificationService (Twilio)', () => {
  let service: SMSNotificationService;
  let mockDb: jest.MockedFunction<typeof db>;
  let mockTwilioClient: any;

  beforeEach(() => {
    mockTwilioClient = {
      messages: {
        create: jest.fn(),
      },
    };

    (twilio as unknown as jest.Mock).mockReturnValue(mockTwilioClient);

    service = new SMSNotificationService();
    mockDb = db as jest.MockedFunction<typeof db>;
    jest.clearAllMocks();
  });

  describe('sendSMS', () => {
    it('should send SMS successfully', async () => {
      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'SM123456',
      });

      const result = await service.sendSMS({
        to: '+15559876543',
        message: 'Test message',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('SM123456');
    });

    it('should handle Twilio errors gracefully', async () => {
      mockTwilioClient.messages.create.mockRejectedValue(
        new Error('Twilio API error')
      );

      const result = await service.sendSMS({
        to: '+15559876543',
        message: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Twilio API error');
    });

    it('should return error when Twilio is not configured', async () => {
      // Create new service with isConfigured = false
      (service as any).isConfigured = false;
      (service as any).client = null;

      const result = await service.sendSMS({
        to: '+15559876543',
        message: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMS service not configured');
    });
  });

  describe('sendVerificationCode', () => {
    it('should queue verification SMS and process immediately', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'template-1',
          title: 'Verification',
          body: 'Your code is {{code}}',
        }),
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'notif-123' }]),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      await service.sendVerificationCode('user-123', '+15559876543', '123456');

      expect(mockQuery.insert).toHaveBeenCalled();
    });

    it('should handle missing template', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      await service.sendVerificationCode('user-123', '+15559876543', '123456');

      expect(mockQuery.first).toHaveBeenCalled();
    });
  });

  describe('sendSecurityAlert', () => {
    it('should not send if user has disabled security SMS', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          sms_security_alerts: false,
        }),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      await service.sendSecurityAlert(
        'user-123',
        '+15559876543',
        'iPhone',
        'New York'
      );

      expect(mockQuery.first).toHaveBeenCalled();
    });

    it('should send security alert when enabled', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn()
          .mockResolvedValueOnce({ sms_security_alerts: true })
          .mockResolvedValueOnce({
            id: 'template-1',
            title: 'Security Alert',
            body: 'New login from {{device}} in {{location}}',
          }),
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'notif-123' }]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      await service.sendSecurityAlert(
        'user-123',
        '+15559876543',
        'iPhone',
        'New York'
      );

      expect(mockQuery.insert).toHaveBeenCalled();
    });
  });

  describe('sendPasswordResetCode', () => {
    it('should queue and process password reset SMS immediately', async () => {
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'notif-123' }]),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      await service.sendPasswordResetCode('user-123', '+15559876543', '123456');

      expect(mockQuery.insert).toHaveBeenCalled();
    });
  });

  describe('processSMSQueue', () => {
    it('should process queued SMS messages', async () => {
      const mockMessages = [
        {
          id: 'sms-1',
          to_phone: '+15559876543',
          message: 'Test message',
          notification_id: 'notif-1',
          retry_count: 0,
        },
      ];

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockMessages),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'SM123456',
      });

      await service.processSMSQueue(50);

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'sent',
        })
      );
    });

    it('should retry failed SMS up to 3 times', async () => {
      const mockMessages = [
        {
          id: 'sms-1',
          to_phone: '+15559876543',
          message: 'Test message',
          notification_id: 'notif-1',
          retry_count: 1,
        },
      ];

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockMessages),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      mockTwilioClient.messages.create.mockRejectedValue(
        new Error('Twilio error')
      );

      await service.processSMSQueue(50);

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'queued',
          retry_count: 2,
        })
      );
    });
  });

  describe('getDeliveryStatus', () => {
    it('should return message status from Twilio', async () => {
      mockTwilioClient.messages = jest.fn().mockReturnValue({
        fetch: jest.fn().mockResolvedValue({
          status: 'delivered',
        }),
      });

      (service as any).client = mockTwilioClient;
      (service as any).isConfigured = true;

      const status = await service.getDeliveryStatus('SM123456');

      expect(status).toBe('delivered');
    });

    it('should return null when Twilio is not configured', async () => {
      (service as any).isConfigured = false;
      (service as any).client = null;

      const status = await service.getDeliveryStatus('SM123456');

      expect(status).toBeNull();
    });

    it('should return null on error', async () => {
      mockTwilioClient.messages = jest.fn().mockReturnValue({
        fetch: jest.fn().mockRejectedValue(new Error('Not found')),
      });

      (service as any).client = mockTwilioClient;
      (service as any).isConfigured = true;

      const status = await service.getDeliveryStatus('SM123456');

      expect(status).toBeNull();
    });
  });
});

describe('SNSSMSService (AWS SNS)', () => {
  let service: SNSSMSService;
  let mockDb: jest.MockedFunction<typeof db>;
  let mockSendCommand: jest.Mock;

  beforeEach(() => {
    mockSendCommand = jest.fn().mockResolvedValue({
      MessageId: 'sns-msg-123',
    });

    (SNSClient as jest.Mock).mockImplementation(() => ({
      send: mockSendCommand,
    }));

    service = new SNSSMSService();
    mockDb = db as jest.MockedFunction<typeof db>;
    jest.clearAllMocks();
  });

  describe('sendSMS', () => {
    it('should send SMS successfully via SNS', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ isOptedOut: false }) // opt-out check
        .mockResolvedValueOnce({ MessageId: 'sns-msg-123' }); // send

      const result = await service.sendSMS({
        to: '+15559876543',
        message: 'Test message',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('sns-msg-123');
    });

    it('should not send to opted-out numbers', async () => {
      mockSendCommand.mockResolvedValue({ isOptedOut: true });

      const result = await service.sendSMS({
        to: '+15559876543',
        message: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Phone number has opted out of SMS');
    });

    it('should handle SNS errors gracefully', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ isOptedOut: false })
        .mockRejectedValueOnce(new Error('SNS API error'));

      const result = await service.sendSMS({
        to: '+15559876543',
        message: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SNS API error');
    });

    it('should set message type to Transactional by default', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ isOptedOut: false })
        .mockResolvedValueOnce({ MessageId: 'sns-msg-123' });

      await service.sendSMS({
        to: '+15559876543',
        message: 'Test message',
      });

      expect(PublishCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          MessageAttributes: expect.objectContaining({
            'AWS.SNS.SMS.SMSType': expect.objectContaining({
              StringValue: 'Transactional',
            }),
          }),
        })
      );
    });
  });

  describe('sendVerificationCode', () => {
    it('should send verification code SMS', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ isOptedOut: false })
        .mockResolvedValueOnce({ MessageId: 'sns-msg-123' });

      const result = await service.sendVerificationCode(
        '+15559876543',
        '123456',
        10
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendSecurityAlert', () => {
    it('should send security alert SMS', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ isOptedOut: false })
        .mockResolvedValueOnce({ MessageId: 'sns-msg-123' });

      const result = await service.sendSecurityAlert(
        '+15559876543',
        'New Login',
        'From iPhone in New York'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendPasswordResetCode', () => {
    it('should send password reset code SMS', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ isOptedOut: false })
        .mockResolvedValueOnce({ MessageId: 'sns-msg-123' });

      const result = await service.sendPasswordResetCode(
        '+15559876543',
        '123456',
        15
      );

      expect(result.success).toBe(true);
    });
  });

  describe('send2FACode', () => {
    it('should send 2FA code SMS', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ isOptedOut: false })
        .mockResolvedValueOnce({ MessageId: 'sns-msg-123' });

      const result = await service.send2FACode('+15559876543', '123456');

      expect(result.success).toBe(true);
    });
  });

  describe('sendMatchNotification', () => {
    it('should send match notification as promotional SMS', async () => {
      mockSendCommand
        .mockResolvedValueOnce({ isOptedOut: false })
        .mockResolvedValueOnce({ MessageId: 'sns-msg-123' });

      const result = await service.sendMatchNotification('+15559876543', 'Jane');

      expect(result.success).toBe(true);
    });
  });

  describe('isOptedOut', () => {
    it('should check if phone number is opted out', async () => {
      mockSendCommand.mockResolvedValue({ isOptedOut: true });

      const result = await service.isOptedOut('+15559876543');

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      mockSendCommand.mockRejectedValue(new Error('SNS error'));

      const result = await service.isOptedOut('+15559876543');

      expect(result).toBe(false);
    });
  });

  describe('processSMSQueue', () => {
    it('should process queued SMS messages', async () => {
      const mockMessages = [
        {
          id: 'sms-1',
          to_phone: '+15559876543',
          message: 'Test message',
          message_type: 'Transactional',
          notification_id: 'notif-1',
          retry_count: 0,
        },
      ];

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockMessages),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      mockSendCommand
        .mockResolvedValueOnce({ isOptedOut: false })
        .mockResolvedValueOnce({ MessageId: 'sns-msg-123' });

      await service.processSMSQueue(50);

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'sent',
        })
      );
    });
  });

  describe('queueSMS', () => {
    it('should queue SMS for later delivery', async () => {
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'queue-123' }]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const id = await service.queueSMS(
        'user-123',
        '+15559876543',
        'Test message',
        { messageType: 'Promotional' }
      );

      expect(id).toBe('queue-123');
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          to_phone: '+15559876543',
          message: 'Test message',
          message_type: 'Promotional',
          status: 'queued',
        })
      );
    });

    it('should support scheduled delivery', async () => {
      const scheduledAt = new Date('2025-01-15T10:00:00Z');

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 'queue-123' }]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      await service.queueSMS('user-123', '+15559876543', 'Test message', {
        scheduledAt,
      });

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduled_at: scheduledAt,
        })
      );
    });
  });

  describe('Phone number normalization', () => {
    it('should normalize 10-digit US numbers', () => {
      const result = (service as any).normalizePhoneNumber('5559876543');
      expect(result).toBe('+15559876543');
    });

    it('should normalize 11-digit US numbers starting with 1', () => {
      const result = (service as any).normalizePhoneNumber('15559876543');
      expect(result).toBe('+15559876543');
    });

    it('should preserve numbers with + prefix', () => {
      const result = (service as any).normalizePhoneNumber('+15559876543');
      expect(result).toBe('+15559876543');
    });

    it('should remove non-digit characters', () => {
      const result = (service as any).normalizePhoneNumber('(555) 987-6543');
      expect(result).toBe('+15559876543');
    });
  });

  describe('Phone number masking', () => {
    it('should mask phone number for logging', () => {
      const result = (service as any).maskPhoneNumber('+15559876543');
      expect(result).toBe('+*******6543');
    });

    it('should handle short numbers', () => {
      const result = (service as any).maskPhoneNumber('123');
      expect(result).toBe('****');
    });
  });
});
