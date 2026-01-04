/**
 * AWS SNS Push Notification Provider Tests
 * Tests for device registration, push notifications, batch sending, and error handling
 */

import { mockClient } from 'aws-sdk-client-mock';
import {
  SNSClient,
  PublishCommand,
  CreatePlatformEndpointCommand,
  DeleteEndpointCommand,
  GetEndpointAttributesCommand,
  SetEndpointAttributesCommand,
} from '@aws-sdk/client-sns';

// Mock the logger
jest.mock('../utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import after mocking
import { SNSPushProvider, PushMessage, BatchPushMessage, Platform } from '../providers/sns-push.provider';
import logger from '../utils/logger';

describe('SNSPushProvider', () => {
  const snsMock = mockClient(SNSClient);
  let provider: SNSPushProvider;

  // Sample test data
  const testEndpointArn = 'arn:aws:sns:us-east-1:123456789012:endpoint/GCM/MyApp/12345678-1234-1234-1234-123456789012';
  const testIosEndpointArn = 'arn:aws:sns:us-east-1:123456789012:endpoint/APNS/MyApp/12345678-1234-1234-1234-123456789012';
  const testDeviceToken = 'abc123devicetoken456';
  const testMessageId = 'msg-12345-67890';

  beforeEach(() => {
    snsMock.reset();
    jest.clearAllMocks();

    // Set environment variables for testing
    process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_ANDROID = 'arn:aws:sns:us-east-1:123456789012:app/GCM/MyApp';
    process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_IOS = 'arn:aws:sns:us-east-1:123456789012:app/APNS/MyApp';
    process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_WEB = 'arn:aws:sns:us-east-1:123456789012:app/GCM/MyWebApp';

    provider = new SNSPushProvider();
  });

  afterEach(() => {
    delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_ANDROID;
    delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_IOS;
    delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_WEB;
  });

  describe('Device Registration', () => {
    describe('registerDevice', () => {
      it('should successfully register an Android device', async () => {
        snsMock.on(CreatePlatformEndpointCommand).resolves({
          EndpointArn: testEndpointArn,
        });

        const result = await provider.registerDevice('android', testDeviceToken);

        expect(result.success).toBe(true);
        expect(result.endpointArn).toBe(testEndpointArn);
        expect(result.error).toBeUndefined();
        expect(logger.info).toHaveBeenCalledWith('Device registered with SNS', {
          platform: 'android',
          endpointArn: testEndpointArn,
        });
      });

      it('should successfully register an iOS device', async () => {
        snsMock.on(CreatePlatformEndpointCommand).resolves({
          EndpointArn: testIosEndpointArn,
        });

        const result = await provider.registerDevice('ios', testDeviceToken);

        expect(result.success).toBe(true);
        expect(result.endpointArn).toBe(testIosEndpointArn);
      });

      it('should successfully register a Web Push device', async () => {
        const webEndpointArn = 'arn:aws:sns:us-east-1:123456789012:endpoint/GCM/MyWebApp/12345678';
        snsMock.on(CreatePlatformEndpointCommand).resolves({
          EndpointArn: webEndpointArn,
        });

        const result = await provider.registerDevice('web', testDeviceToken);

        expect(result.success).toBe(true);
        expect(result.endpointArn).toBe(webEndpointArn);
      });

      it('should include custom user data when registering', async () => {
        snsMock.on(CreatePlatformEndpointCommand).resolves({
          EndpointArn: testEndpointArn,
        });

        const userData = { userId: 'user-123', appVersion: '1.0.0' };
        await provider.registerDevice('android', testDeviceToken, userData);

        expect(snsMock.calls()).toHaveLength(1);
        const call = snsMock.call(0);
        expect(call.args[0].input).toMatchObject({
          Token: testDeviceToken,
          CustomUserData: JSON.stringify(userData),
        });
      });

      it('should return error for unconfigured platform', async () => {
        delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_ANDROID;
        const newProvider = new SNSPushProvider();

        const result = await newProvider.registerDevice('android', testDeviceToken);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Platform android not configured');
      });

      it('should handle endpoint already exists error and update token', async () => {
        const existingArn = 'arn:aws:sns:us-east-1:123456789012:endpoint/GCM/MyApp/existing-endpoint';
        const error = new Error(`Invalid parameter: Token Reason: Endpoint ${existingArn} already exists`) as any;
        error.name = 'InvalidParameterException';

        snsMock.on(CreatePlatformEndpointCommand).rejects(error);
        snsMock.on(SetEndpointAttributesCommand).resolves({});

        const result = await provider.registerDevice('android', testDeviceToken);

        expect(result.success).toBe(true);
        expect(result.endpointArn).toBe(existingArn);
      });

      it('should handle AWS SNS errors gracefully', async () => {
        const error = new Error('Service unavailable');
        snsMock.on(CreatePlatformEndpointCommand).rejects(error);

        const result = await provider.registerDevice('android', testDeviceToken);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Service unavailable');
        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('updateEndpointToken', () => {
      it('should successfully update endpoint token', async () => {
        snsMock.on(SetEndpointAttributesCommand).resolves({});

        const result = await provider.updateEndpointToken(testEndpointArn, 'newToken123');

        expect(result).toBe(true);
        expect(logger.info).toHaveBeenCalledWith('Endpoint token updated', expect.any(Object));
      });

      it('should return false on update failure', async () => {
        snsMock.on(SetEndpointAttributesCommand).rejects(new Error('Update failed'));

        const result = await provider.updateEndpointToken(testEndpointArn, 'newToken123');

        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('unregisterDevice', () => {
      it('should successfully unregister device', async () => {
        snsMock.on(DeleteEndpointCommand).resolves({});

        const result = await provider.unregisterDevice(testEndpointArn);

        expect(result).toBe(true);
        expect(logger.info).toHaveBeenCalledWith('Device unregistered from SNS', expect.any(Object));
      });

      it('should return false on unregister failure', async () => {
        snsMock.on(DeleteEndpointCommand).rejects(new Error('Delete failed'));

        const result = await provider.unregisterDevice(testEndpointArn);

        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('isEndpointEnabled', () => {
      it('should return true for enabled endpoint', async () => {
        snsMock.on(GetEndpointAttributesCommand).resolves({
          Attributes: {
            Enabled: 'true',
            Token: testDeviceToken,
          },
        });

        const result = await provider.isEndpointEnabled(testEndpointArn);

        expect(result).toBe(true);
      });

      it('should return false for disabled endpoint', async () => {
        snsMock.on(GetEndpointAttributesCommand).resolves({
          Attributes: {
            Enabled: 'false',
            Token: testDeviceToken,
          },
        });

        const result = await provider.isEndpointEnabled(testEndpointArn);

        expect(result).toBe(false);
      });

      it('should return false on error', async () => {
        snsMock.on(GetEndpointAttributesCommand).rejects(new Error('Not found'));

        const result = await provider.isEndpointEnabled(testEndpointArn);

        expect(result).toBe(false);
      });
    });
  });

  describe('Single Push Notification', () => {
    describe('sendToDevice', () => {
      it('should send push notification successfully', async () => {
        snsMock.on(PublishCommand).resolves({
          MessageId: testMessageId,
        });

        const message: PushMessage = {
          token: testEndpointArn,
          title: 'New Match!',
          body: 'You have a new match with Sarah',
          data: { matchId: 'match-123' },
        };

        const result = await provider.sendToDevice(message);

        expect(result.success).toBe(true);
        expect(result.messageId).toBe(testMessageId);
        expect(logger.info).toHaveBeenCalledWith('Push notification sent successfully', expect.any(Object));
      });

      it('should send high priority notification', async () => {
        snsMock.on(PublishCommand).resolves({
          MessageId: testMessageId,
        });

        const message: PushMessage = {
          token: testEndpointArn,
          title: 'Incoming Call',
          body: 'Sarah is calling you',
          priority: 'high',
        };

        await provider.sendToDevice(message);

        const call = snsMock.call(0);
        const messageBody = JSON.parse(call.args[0].input.Message as string);
        const gcmPayload = JSON.parse(messageBody.GCM);
        expect(gcmPayload.priority).toBe('high');
      });

      it('should include badge count in notification', async () => {
        snsMock.on(PublishCommand).resolves({
          MessageId: testMessageId,
        });

        const message: PushMessage = {
          token: testIosEndpointArn,
          title: 'New Message',
          body: 'You have 5 new messages',
          badge: 5,
        };

        await provider.sendToDevice(message);

        const call = snsMock.call(0);
        const messageBody = JSON.parse(call.args[0].input.Message as string);
        const apnsPayload = JSON.parse(messageBody.APNS);
        expect(apnsPayload.aps.badge).toBe(5);
      });

      it('should include custom sound in notification', async () => {
        snsMock.on(PublishCommand).resolves({
          MessageId: testMessageId,
        });

        const message: PushMessage = {
          token: testEndpointArn,
          title: 'New Message',
          body: 'You received a message',
          sound: 'custom_sound.wav',
        };

        await provider.sendToDevice(message);

        const call = snsMock.call(0);
        const messageBody = JSON.parse(call.args[0].input.Message as string);
        const gcmPayload = JSON.parse(messageBody.GCM);
        expect(gcmPayload.notification.sound).toBe('custom_sound.wav');
      });

      it('should include Android channel ID', async () => {
        snsMock.on(PublishCommand).resolves({
          MessageId: testMessageId,
        });

        const message: PushMessage = {
          token: testEndpointArn,
          title: 'New Message',
          body: 'You received a message',
          channelId: 'messages_channel',
        };

        await provider.sendToDevice(message);

        const call = snsMock.call(0);
        const messageBody = JSON.parse(call.args[0].input.Message as string);
        const gcmPayload = JSON.parse(messageBody.GCM);
        expect(gcmPayload.notification.channel_id).toBe('messages_channel');
      });

      it('should include image URL in notification', async () => {
        snsMock.on(PublishCommand).resolves({
          MessageId: testMessageId,
        });

        const message: PushMessage = {
          token: testEndpointArn,
          title: 'Photo Update',
          body: 'Sarah updated her profile photo',
          imageUrl: 'https://example.com/photo.jpg',
        };

        await provider.sendToDevice(message);

        const call = snsMock.call(0);
        const messageBody = JSON.parse(call.args[0].input.Message as string);
        const gcmPayload = JSON.parse(messageBody.GCM);
        expect(gcmPayload.notification.image).toBe('https://example.com/photo.jpg');
      });

      it('should return error when provider not initialized', async () => {
        delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_ANDROID;
        delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_IOS;
        delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_WEB;
        const uninitializedProvider = new SNSPushProvider();

        const message: PushMessage = {
          token: testEndpointArn,
          title: 'Test',
          body: 'Test message',
        };

        const result = await uninitializedProvider.sendToDevice(message);

        expect(result.success).toBe(false);
        expect(result.error).toBe('SNS Push Provider not initialized');
      });
    });

    describe('Error Handling - Invalid Tokens', () => {
      it('should handle invalid token error', async () => {
        const error = new Error('Invalid token') as any;
        error.name = 'InvalidParameterException';
        snsMock.on(PublishCommand).rejects(error);

        const message: PushMessage = {
          token: 'invalid-token',
          title: 'Test',
          body: 'Test message',
        };

        const result = await provider.sendToDevice(message);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid token');
        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('Error Handling - Endpoint Disabled', () => {
      it('should handle endpoint disabled error', async () => {
        const error = new Error('Endpoint is disabled') as any;
        error.name = 'EndpointDisabledException';
        snsMock.on(PublishCommand).rejects(error);

        const message: PushMessage = {
          token: testEndpointArn,
          title: 'Test',
          body: 'Test message',
        };

        const result = await provider.sendToDevice(message);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Device endpoint is disabled - token may be invalid');
      });
    });

    describe('Error Handling - General Errors', () => {
      it('should handle throttling errors', async () => {
        const error = new Error('Rate exceeded') as any;
        error.name = 'ThrottlingException';
        snsMock.on(PublishCommand).rejects(error);

        const message: PushMessage = {
          token: testEndpointArn,
          title: 'Test',
          body: 'Test message',
        };

        const result = await provider.sendToDevice(message);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Rate exceeded');
      });

      it('should handle network errors', async () => {
        const error = new Error('Network error');
        snsMock.on(PublishCommand).rejects(error);

        const message: PushMessage = {
          token: testEndpointArn,
          title: 'Test',
          body: 'Test message',
        };

        const result = await provider.sendToDevice(message);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Network error');
      });
    });
  });

  describe('Batch Push Notifications', () => {
    describe('sendToMultipleDevices', () => {
      it('should send to multiple devices successfully', async () => {
        snsMock.on(PublishCommand).resolves({
          MessageId: testMessageId,
        });

        const message: BatchPushMessage = {
          tokens: [
            testEndpointArn,
            'arn:aws:sns:us-east-1:123456789012:endpoint/GCM/MyApp/device2',
            'arn:aws:sns:us-east-1:123456789012:endpoint/GCM/MyApp/device3',
          ],
          title: 'Announcement',
          body: 'New feature available!',
        };

        const result = await provider.sendToMultipleDevices(message);

        expect(result.success).toBe(true);
        expect(result.successCount).toBe(3);
        expect(result.failureCount).toBe(0);
        expect(result.results).toHaveLength(3);
        expect(result.results.every((r) => r.success)).toBe(true);
      });

      it('should handle partial failures in batch', async () => {
        snsMock
          .on(PublishCommand)
          .resolvesOnce({ MessageId: testMessageId })
          .rejectsOnce(new Error('Device not found'))
          .resolvesOnce({ MessageId: 'msg-2' });

        const message: BatchPushMessage = {
          tokens: [
            testEndpointArn,
            'arn:aws:sns:us-east-1:123456789012:endpoint/GCM/MyApp/invalid',
            'arn:aws:sns:us-east-1:123456789012:endpoint/GCM/MyApp/device3',
          ],
          title: 'Announcement',
          body: 'New feature available!',
        };

        const result = await provider.sendToMultipleDevices(message);

        expect(result.success).toBe(true);
        expect(result.successCount).toBe(2);
        expect(result.failureCount).toBe(1);
        expect(result.results[1].success).toBe(false);
        expect(result.results[1].error).toBe('Device not found');
      });

      it('should handle all failures in batch', async () => {
        snsMock.on(PublishCommand).rejects(new Error('Service unavailable'));

        const message: BatchPushMessage = {
          tokens: [testEndpointArn, 'arn:aws:sns:us-east-1:123456789012:endpoint/GCM/MyApp/device2'],
          title: 'Announcement',
          body: 'New feature available!',
        };

        const result = await provider.sendToMultipleDevices(message);

        expect(result.success).toBe(false);
        expect(result.successCount).toBe(0);
        expect(result.failureCount).toBe(2);
        expect(result.results.every((r) => !r.success)).toBe(true);
      });

      it('should process large batches with concurrency limit', async () => {
        snsMock.on(PublishCommand).resolves({ MessageId: testMessageId });

        // Create 25 tokens to test batching
        const tokens = Array.from({ length: 25 }, (_, i) =>
          `arn:aws:sns:us-east-1:123456789012:endpoint/GCM/MyApp/device${i}`
        );

        const message: BatchPushMessage = {
          tokens,
          title: 'Announcement',
          body: 'New feature available!',
        };

        const result = await provider.sendToMultipleDevices(message);

        expect(result.success).toBe(true);
        expect(result.successCount).toBe(25);
        expect(result.failureCount).toBe(0);
        expect(snsMock.calls()).toHaveLength(25);
      });

      it('should include data payload in batch messages', async () => {
        snsMock.on(PublishCommand).resolves({ MessageId: testMessageId });

        const message: BatchPushMessage = {
          tokens: [testEndpointArn],
          title: 'New Feature',
          body: 'Check out our new feature',
          data: { featureId: 'feature-123', action: 'open_feature' },
        };

        await provider.sendToMultipleDevices(message);

        const call = snsMock.call(0);
        const messageBody = JSON.parse(call.args[0].input.Message as string);
        const gcmPayload = JSON.parse(messageBody.GCM);
        expect(gcmPayload.data.featureId).toBe('feature-123');
        expect(gcmPayload.data.action).toBe('open_feature');
      });

      it('should return error when provider not initialized', async () => {
        delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_ANDROID;
        delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_IOS;
        delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_WEB;
        const uninitializedProvider = new SNSPushProvider();

        const message: BatchPushMessage = {
          tokens: [testEndpointArn],
          title: 'Test',
          body: 'Test message',
        };

        const result = await uninitializedProvider.sendToMultipleDevices(message);

        expect(result.success).toBe(false);
        expect(result.successCount).toBe(0);
        expect(result.failureCount).toBe(1);
        expect(result.results[0].error).toBe('SNS Push Provider not initialized');
      });
    });
  });

  describe('Platform-Specific Formatting', () => {
    describe('iOS (APNS) formatting', () => {
      it('should format iOS notification correctly', async () => {
        snsMock.on(PublishCommand).resolves({ MessageId: testMessageId });

        const message: PushMessage = {
          token: testIosEndpointArn,
          title: 'New Match',
          body: 'You matched with Sarah!',
          badge: 3,
          sound: 'match.wav',
          data: { matchId: 'match-123' },
        };

        await provider.sendToDevice(message);

        const call = snsMock.call(0);
        const messageBody = JSON.parse(call.args[0].input.Message as string);
        const apnsPayload = JSON.parse(messageBody.APNS);

        expect(apnsPayload.aps.alert.title).toBe('New Match');
        expect(apnsPayload.aps.alert.body).toBe('You matched with Sarah!');
        expect(apnsPayload.aps.badge).toBe(3);
        expect(apnsPayload.aps.sound).toBe('match.wav');
        expect(apnsPayload.aps['mutable-content']).toBe(1);
        expect(apnsPayload.aps['content-available']).toBe(1);
        expect(apnsPayload.matchId).toBe('match-123');
      });

      it('should include APNS_SANDBOX payload for iOS', async () => {
        snsMock.on(PublishCommand).resolves({ MessageId: testMessageId });

        const message: PushMessage = {
          token: testIosEndpointArn,
          title: 'Test',
          body: 'Test message',
        };

        await provider.sendToDevice(message);

        const call = snsMock.call(0);
        const messageBody = JSON.parse(call.args[0].input.Message as string);

        expect(messageBody.APNS).toBeDefined();
        expect(messageBody.APNS_SANDBOX).toBe(messageBody.APNS);
      });

      it('should include media-url for iOS image notifications', async () => {
        snsMock.on(PublishCommand).resolves({ MessageId: testMessageId });

        const message: PushMessage = {
          token: testIosEndpointArn,
          title: 'Photo Update',
          body: 'New photo from Sarah',
          imageUrl: 'https://example.com/photo.jpg',
        };

        await provider.sendToDevice(message);

        const call = snsMock.call(0);
        const messageBody = JSON.parse(call.args[0].input.Message as string);
        const apnsPayload = JSON.parse(messageBody.APNS);

        expect(apnsPayload['media-url']).toBe('https://example.com/photo.jpg');
      });
    });

    describe('Android (GCM/FCM) formatting', () => {
      it('should format Android notification correctly', async () => {
        snsMock.on(PublishCommand).resolves({ MessageId: testMessageId });

        const message: PushMessage = {
          token: testEndpointArn,
          title: 'New Match',
          body: 'You matched with Sarah!',
          sound: 'notification.wav',
          channelId: 'matches',
          data: { matchId: 'match-123' },
        };

        await provider.sendToDevice(message);

        const call = snsMock.call(0);
        const messageBody = JSON.parse(call.args[0].input.Message as string);
        const gcmPayload = JSON.parse(messageBody.GCM);

        expect(gcmPayload.notification.title).toBe('New Match');
        expect(gcmPayload.notification.body).toBe('You matched with Sarah!');
        expect(gcmPayload.notification.sound).toBe('notification.wav');
        expect(gcmPayload.notification.channel_id).toBe('matches');
        expect(gcmPayload.notification.click_action).toBe('FLUTTER_NOTIFICATION_CLICK');
        expect(gcmPayload.data.matchId).toBe('match-123');
        expect(gcmPayload.data.title).toBe('New Match');
        expect(gcmPayload.data.body).toBe('You matched with Sarah!');
      });

      it('should set priority correctly for Android', async () => {
        snsMock.on(PublishCommand).resolves({ MessageId: testMessageId });

        const highPriorityMessage: PushMessage = {
          token: testEndpointArn,
          title: 'Call',
          body: 'Incoming call',
          priority: 'high',
        };

        const normalPriorityMessage: PushMessage = {
          token: testEndpointArn,
          title: 'Update',
          body: 'App update available',
          priority: 'normal',
        };

        await provider.sendToDevice(highPriorityMessage);
        await provider.sendToDevice(normalPriorityMessage);

        const highCall = snsMock.call(0);
        const normalCall = snsMock.call(1);

        const highPayload = JSON.parse(JSON.parse(highCall.args[0].input.Message as string).GCM);
        const normalPayload = JSON.parse(JSON.parse(normalCall.args[0].input.Message as string).GCM);

        expect(highPayload.priority).toBe('high');
        expect(normalPayload.priority).toBe('normal');
      });

      it('should use default channel for Android when not specified', async () => {
        snsMock.on(PublishCommand).resolves({ MessageId: testMessageId });

        const message: PushMessage = {
          token: testEndpointArn,
          title: 'Test',
          body: 'Test message',
        };

        await provider.sendToDevice(message);

        const call = snsMock.call(0);
        const messageBody = JSON.parse(call.args[0].input.Message as string);
        const gcmPayload = JSON.parse(messageBody.GCM);

        expect(gcmPayload.notification.channel_id).toBe('default');
      });
    });

    describe('Web Push formatting', () => {
      it('should format Web Push notification using GCM format', async () => {
        const webEndpointArn = 'arn:aws:sns:us-east-1:123456789012:endpoint/GCM/MyWebApp/12345678';
        snsMock.on(PublishCommand).resolves({ MessageId: testMessageId });

        const message: PushMessage = {
          token: webEndpointArn,
          title: 'New Message',
          body: 'You have a new message',
          data: { conversationId: 'conv-123' },
        };

        await provider.sendToDevice(message);

        const call = snsMock.call(0);
        const messageBody = JSON.parse(call.args[0].input.Message as string);

        expect(messageBody.GCM).toBeDefined();
        const gcmPayload = JSON.parse(messageBody.GCM);
        expect(gcmPayload.notification.title).toBe('New Message');
        expect(gcmPayload.notification.body).toBe('You have a new message');
        expect(gcmPayload.data.conversationId).toBe('conv-123');
      });
    });
  });

  describe('Topic Notifications', () => {
    describe('sendToTopic', () => {
      it('should send notification to topic successfully', async () => {
        const topicArn = 'arn:aws:sns:us-east-1:123456789012:all-users';
        snsMock.on(PublishCommand).resolves({ MessageId: testMessageId });

        const result = await provider.sendToTopic(topicArn, {
          title: 'App Update',
          body: 'New version available!',
          data: { version: '2.0.0' },
        });

        expect(result.success).toBe(true);
        expect(result.messageId).toBe(testMessageId);
        expect(logger.info).toHaveBeenCalledWith('Topic notification sent successfully', {
          messageId: testMessageId,
          topicArn,
        });
      });

      it('should include all platform payloads for topic', async () => {
        const topicArn = 'arn:aws:sns:us-east-1:123456789012:all-users';
        snsMock.on(PublishCommand).resolves({ MessageId: testMessageId });

        await provider.sendToTopic(topicArn, {
          title: 'Update',
          body: 'New features!',
          imageUrl: 'https://example.com/banner.jpg',
          data: { screen: 'updates' },
        });

        const call = snsMock.call(0);
        const messageBody = JSON.parse(call.args[0].input.Message as string);

        expect(messageBody.default).toBe('New features!');
        expect(messageBody.GCM).toBeDefined();
        expect(messageBody.APNS).toBeDefined();
      });

      it('should handle topic notification errors', async () => {
        const topicArn = 'arn:aws:sns:us-east-1:123456789012:invalid-topic';
        snsMock.on(PublishCommand).rejects(new Error('Topic not found'));

        const result = await provider.sendToTopic(topicArn, {
          title: 'Test',
          body: 'Test message',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Topic not found');
        expect(logger.error).toHaveBeenCalled();
      });
    });
  });

  describe('Endpoint Validation', () => {
    describe('validateEndpoint', () => {
      it('should return true for valid enabled endpoint', async () => {
        snsMock.on(GetEndpointAttributesCommand).resolves({
          Attributes: {
            Enabled: 'true',
            Token: testDeviceToken,
          },
        });

        const result = await provider.validateEndpoint(testEndpointArn);

        expect(result).toBe(true);
      });

      it('should return false for disabled endpoint', async () => {
        snsMock.on(GetEndpointAttributesCommand).resolves({
          Attributes: {
            Enabled: 'false',
            Token: testDeviceToken,
          },
        });

        const result = await provider.validateEndpoint(testEndpointArn);

        expect(result).toBe(false);
      });

      it('should return false for endpoint without token', async () => {
        snsMock.on(GetEndpointAttributesCommand).resolves({
          Attributes: {
            Enabled: 'true',
          },
        });

        const result = await provider.validateEndpoint(testEndpointArn);

        expect(result).toBe(false);
      });

      it('should return false on validation error', async () => {
        snsMock.on(GetEndpointAttributesCommand).rejects(new Error('Endpoint not found'));

        const result = await provider.validateEndpoint(testEndpointArn);

        expect(result).toBe(false);
        expect(logger.warn).toHaveBeenCalled();
      });
    });
  });

  describe('Provider Status', () => {
    describe('isReady', () => {
      it('should return true when initialized', () => {
        expect(provider.isReady()).toBe(true);
      });

      it('should return false when not initialized', () => {
        delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_ANDROID;
        delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_IOS;
        delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_WEB;
        const uninitializedProvider = new SNSPushProvider();

        expect(uninitializedProvider.isReady()).toBe(false);
      });
    });

    describe('getConfiguredPlatforms', () => {
      it('should return all configured platforms', () => {
        const platforms = provider.getConfiguredPlatforms();

        expect(platforms).toContain('android');
        expect(platforms).toContain('ios');
        expect(platforms).toContain('web');
        expect(platforms).toHaveLength(3);
      });

      it('should return only configured platforms', () => {
        delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_WEB;
        const partialProvider = new SNSPushProvider();

        const platforms = partialProvider.getConfiguredPlatforms();

        expect(platforms).toContain('android');
        expect(platforms).toContain('ios');
        expect(platforms).not.toContain('web');
        expect(platforms).toHaveLength(2);
      });

      it('should return empty array when no platforms configured', () => {
        delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_ANDROID;
        delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_IOS;
        delete process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_WEB;
        const unconfiguredProvider = new SNSPushProvider();

        const platforms = unconfiguredProvider.getConfiguredPlatforms();

        expect(platforms).toHaveLength(0);
      });
    });
  });
});
