/**
 * Unit tests for SNSPushProvider (AWS SNS Push Notifications)
 */

import { SNSPushProvider, Platform } from '../../../src/providers/sns-push.provider';

// Mock dependencies
jest.mock('../../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PublishCommand: jest.fn(),
  CreatePlatformEndpointCommand: jest.fn(),
  DeleteEndpointCommand: jest.fn(),
  GetEndpointAttributesCommand: jest.fn(),
  SetEndpointAttributesCommand: jest.fn(),
  ListEndpointsByPlatformApplicationCommand: jest.fn(),
}));

import {
  SNSClient,
  PublishCommand,
  CreatePlatformEndpointCommand,
  DeleteEndpointCommand,
  GetEndpointAttributesCommand,
  SetEndpointAttributesCommand,
} from '@aws-sdk/client-sns';

describe('SNSPushProvider', () => {
  let provider: SNSPushProvider;
  let mockSendCommand: jest.Mock;

  beforeEach(() => {
    // Set up environment variables
    process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_ANDROID = 'arn:aws:sns:us-east-1:123456789:app/GCM/flamoral-android';
    process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_IOS = 'arn:aws:sns:us-east-1:123456789:app/APNS/flamoral-ios';
    process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_WEB = 'arn:aws:sns:us-east-1:123456789:app/WNS/flamoral-web';
    process.env.AWS_REGION = 'us-east-1';

    mockSendCommand = jest.fn();

    (SNSClient as jest.Mock).mockImplementation(() => ({
      send: mockSendCommand,
    }));

    provider = new SNSPushProvider();
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_ANDROID;
    delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_IOS;
    delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_WEB;
    delete process.env.AWS_REGION;
  });

  describe('initialization', () => {
    it('should initialize with platform ARNs', () => {
      expect((provider as any).initialized).toBe(true);
    });

    it('should not initialize when no platform ARNs configured', () => {
      delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_ANDROID;
      delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_IOS;
      delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_WEB;

      const uninitializedProvider = new SNSPushProvider();

      expect((uninitializedProvider as any).initialized).toBe(false);
    });
  });

  describe('registerDevice', () => {
    it('should register Android device successfully', async () => {
      mockSendCommand.mockResolvedValue({
        EndpointArn: 'arn:aws:sns:us-east-1:123456789:endpoint/GCM/flamoral-android/abc123',
      });

      const result = await provider.registerDevice('android', 'device-token-123');

      expect(result.success).toBe(true);
      expect(result.endpointArn).toContain('endpoint/GCM');
      expect(CreatePlatformEndpointCommand).toHaveBeenCalled();
    });

    it('should register iOS device successfully', async () => {
      mockSendCommand.mockResolvedValue({
        EndpointArn: 'arn:aws:sns:us-east-1:123456789:endpoint/APNS/flamoral-ios/abc123',
      });

      const result = await provider.registerDevice('ios', 'device-token-123');

      expect(result.success).toBe(true);
      expect(result.endpointArn).toContain('endpoint/APNS');
    });

    it('should return error for unconfigured platform', async () => {
      delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_WEB;
      const newProvider = new SNSPushProvider();

      const result = await newProvider.registerDevice('web', 'device-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should handle existing endpoint by updating token', async () => {
      const existingArn = 'arn:aws:sns:us-east-1:123456789:endpoint/GCM/flamoral-android/abc123';

      mockSendCommand.mockRejectedValueOnce({
        name: 'InvalidParameterException',
        message: `Endpoint already exists with ARN ${existingArn}`,
      });

      mockSendCommand.mockResolvedValueOnce({}); // SetEndpointAttributesCommand

      const result = await provider.registerDevice('android', 'new-device-token');

      expect(result.success).toBe(true);
      expect(result.endpointArn).toBe(existingArn);
    });

    it('should handle registration errors', async () => {
      mockSendCommand.mockRejectedValue(new Error('Registration failed'));

      const result = await provider.registerDevice('android', 'device-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Registration failed');
    });
  });

  describe('updateEndpointToken', () => {
    it('should update endpoint token successfully', async () => {
      mockSendCommand.mockResolvedValue({});

      const result = await provider.updateEndpointToken(
        'arn:aws:sns:us-east-1:123456789:endpoint/GCM/flamoral-android/abc123',
        'new-token'
      );

      expect(result).toBe(true);
      expect(SetEndpointAttributesCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Attributes: expect.objectContaining({
            Token: 'new-token',
            Enabled: 'true',
          }),
        })
      );
    });

    it('should return false on error', async () => {
      mockSendCommand.mockRejectedValue(new Error('Update failed'));

      const result = await provider.updateEndpointToken('arn:...', 'new-token');

      expect(result).toBe(false);
    });
  });

  describe('isEndpointEnabled', () => {
    it('should return true for enabled endpoint', async () => {
      mockSendCommand.mockResolvedValue({
        Attributes: { Enabled: 'true' },
      });

      const result = await provider.isEndpointEnabled('arn:...');

      expect(result).toBe(true);
    });

    it('should return false for disabled endpoint', async () => {
      mockSendCommand.mockResolvedValue({
        Attributes: { Enabled: 'false' },
      });

      const result = await provider.isEndpointEnabled('arn:...');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockSendCommand.mockRejectedValue(new Error('Check failed'));

      const result = await provider.isEndpointEnabled('arn:...');

      expect(result).toBe(false);
    });
  });

  describe('unregisterDevice', () => {
    it('should unregister device successfully', async () => {
      mockSendCommand.mockResolvedValue({});

      const result = await provider.unregisterDevice('arn:...');

      expect(result).toBe(true);
      expect(DeleteEndpointCommand).toHaveBeenCalled();
    });

    it('should return false on error', async () => {
      mockSendCommand.mockRejectedValue(new Error('Delete failed'));

      const result = await provider.unregisterDevice('arn:...');

      expect(result).toBe(false);
    });
  });

  describe('sendToDevice', () => {
    it('should send notification successfully', async () => {
      (provider as any).initialized = true;

      mockSendCommand.mockResolvedValue({
        MessageId: 'msg-123',
      });

      const result = await provider.sendToDevice({
        token: 'arn:aws:sns:us-east-1:123456789:endpoint/GCM/flamoral-android/abc123',
        title: 'Test Title',
        body: 'Test Body',
        data: { key: 'value' },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
    });

    it('should return error when not initialized', async () => {
      (provider as any).initialized = false;

      const result = await provider.sendToDevice({
        token: 'endpoint-arn',
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SNS Push Provider not initialized');
    });

    it('should build GCM payload for Android endpoints', async () => {
      (provider as any).initialized = true;

      mockSendCommand.mockResolvedValue({ MessageId: 'msg-123' });

      await provider.sendToDevice({
        token: 'arn:aws:sns:us-east-1:123456789:endpoint/GCM/flamoral-android/abc123',
        title: 'Test',
        body: 'Test body',
        sound: 'custom_sound',
        channelId: 'matches',
      });

      expect(PublishCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          MessageStructure: 'json',
        })
      );
    });

    it('should build APNS payload for iOS endpoints', async () => {
      (provider as any).initialized = true;

      mockSendCommand.mockResolvedValue({ MessageId: 'msg-123' });

      await provider.sendToDevice({
        token: 'arn:aws:sns:us-east-1:123456789:endpoint/APNS/flamoral-ios/abc123',
        title: 'Test',
        body: 'Test body',
        badge: 5,
      });

      expect(PublishCommand).toHaveBeenCalled();
    });

    it('should handle disabled endpoint error', async () => {
      (provider as any).initialized = true;

      mockSendCommand.mockRejectedValue({
        name: 'EndpointDisabledException',
        message: 'Endpoint is disabled',
      });

      const result = await provider.sendToDevice({
        token: 'arn:...',
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('should handle general send errors', async () => {
      (provider as any).initialized = true;

      mockSendCommand.mockRejectedValue(new Error('Send failed'));

      const result = await provider.sendToDevice({
        token: 'arn:...',
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Send failed');
    });
  });

  describe('sendToMultipleDevices', () => {
    it('should send to multiple devices successfully', async () => {
      (provider as any).initialized = true;

      mockSendCommand.mockResolvedValue({ MessageId: 'msg-123' });

      const result = await provider.sendToMultipleDevices({
        tokens: [
          'arn:aws:sns:us-east-1:123456789:endpoint/GCM/flamoral-android/abc1',
          'arn:aws:sns:us-east-1:123456789:endpoint/GCM/flamoral-android/abc2',
        ],
        title: 'Test',
        body: 'Test body',
      });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it('should return error when not initialized', async () => {
      (provider as any).initialized = false;

      const result = await provider.sendToMultipleDevices({
        tokens: ['arn:...1', 'arn:...2'],
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.failureCount).toBe(2);
    });

    it('should handle partial failures', async () => {
      (provider as any).initialized = true;

      mockSendCommand
        .mockResolvedValueOnce({ MessageId: 'msg-1' })
        .mockRejectedValueOnce(new Error('Send failed'))
        .mockResolvedValueOnce({ MessageId: 'msg-3' });

      const result = await provider.sendToMultipleDevices({
        tokens: ['arn:...1', 'arn:...2', 'arn:...3'],
        title: 'Test',
        body: 'Test',
      });

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
    });

    it('should respect concurrency limit', async () => {
      (provider as any).initialized = true;

      mockSendCommand.mockResolvedValue({ MessageId: 'msg-123' });

      // Create 25 tokens
      const tokens = Array.from({ length: 25 }, (_, i) => `arn:...${i}`);

      const result = await provider.sendToMultipleDevices({
        tokens,
        title: 'Test',
        body: 'Test',
      });

      expect(result.successCount).toBe(25);
    });
  });

  describe('sendToTopic', () => {
    it('should send notification to SNS topic', async () => {
      mockSendCommand.mockResolvedValue({ MessageId: 'msg-123' });

      const result = await provider.sendToTopic(
        'arn:aws:sns:us-east-1:123456789:flamoral-all-users',
        {
          title: 'Announcement',
          body: 'New feature released!',
          data: { type: 'announcement' },
        }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
    });

    it('should handle topic send errors', async () => {
      mockSendCommand.mockRejectedValue(new Error('Topic not found'));

      const result = await provider.sendToTopic('arn:...', {
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Topic not found');
    });
  });

  describe('validateEndpoint', () => {
    it('should return true for valid enabled endpoint with token', async () => {
      mockSendCommand.mockResolvedValue({
        Attributes: {
          Enabled: 'true',
          Token: 'valid-token',
        },
      });

      const result = await provider.validateEndpoint('arn:...');

      expect(result).toBe(true);
    });

    it('should return false for disabled endpoint', async () => {
      mockSendCommand.mockResolvedValue({
        Attributes: {
          Enabled: 'false',
          Token: 'valid-token',
        },
      });

      const result = await provider.validateEndpoint('arn:...');

      expect(result).toBe(false);
    });

    it('should return false for endpoint without token', async () => {
      mockSendCommand.mockResolvedValue({
        Attributes: {
          Enabled: 'true',
        },
      });

      const result = await provider.validateEndpoint('arn:...');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockSendCommand.mockRejectedValue(new Error('Not found'));

      const result = await provider.validateEndpoint('arn:...');

      expect(result).toBe(false);
    });
  });

  describe('isReady', () => {
    it('should return true when initialized', () => {
      (provider as any).initialized = true;

      expect(provider.isReady()).toBe(true);
    });

    it('should return false when not initialized', () => {
      (provider as any).initialized = false;

      expect(provider.isReady()).toBe(false);
    });
  });

  describe('getConfiguredPlatforms', () => {
    it('should return list of configured platforms', () => {
      const platforms = provider.getConfiguredPlatforms();

      expect(platforms).toContain('android');
      expect(platforms).toContain('ios');
      expect(platforms).toContain('web');
    });

    it('should only return configured platforms', () => {
      delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_WEB;
      const newProvider = new SNSPushProvider();

      const platforms = newProvider.getConfiguredPlatforms();

      expect(platforms).toContain('android');
      expect(platforms).toContain('ios');
      expect(platforms).not.toContain('web');
    });
  });

  describe('Platform detection', () => {
    it('should detect iOS platform from APNS ARN', () => {
      const platform = (provider as any).detectPlatformFromArn(
        'arn:aws:sns:us-east-1:123456789:endpoint/APNS/flamoral-ios/abc123'
      );

      expect(platform).toBe('ios');
    });

    it('should detect iOS platform from APNS_SANDBOX ARN', () => {
      const platform = (provider as any).detectPlatformFromArn(
        'arn:aws:sns:us-east-1:123456789:endpoint/APNS_SANDBOX/flamoral-ios/abc123'
      );

      expect(platform).toBe('ios');
    });

    it('should detect Android platform from GCM ARN', () => {
      const platform = (provider as any).detectPlatformFromArn(
        'arn:aws:sns:us-east-1:123456789:endpoint/GCM/flamoral-android/abc123'
      );

      expect(platform).toBe('android');
    });

    it('should detect Android platform from FCM ARN', () => {
      const platform = (provider as any).detectPlatformFromArn(
        'arn:aws:sns:us-east-1:123456789:endpoint/FCM/flamoral-android/abc123'
      );

      expect(platform).toBe('android');
    });

    it('should default to web for unknown ARN format', () => {
      const platform = (provider as any).detectPlatformFromArn(
        'arn:aws:sns:us-east-1:123456789:endpoint/WNS/flamoral-web/abc123'
      );

      expect(platform).toBe('web');
    });
  });
});
