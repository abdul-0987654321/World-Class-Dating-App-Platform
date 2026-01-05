/**
 * Unit tests for FCMProvider (Firebase Cloud Messaging)
 */

import { FCMProvider } from '../../../src/providers/fcm.provider';
import * as admin from 'firebase-admin';

// Mock dependencies
jest.mock('../../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('firebase-admin', () => {
  const mockMessaging = {
    send: jest.fn(),
    sendEachForMulticast: jest.fn(),
    subscribeToTopic: jest.fn(),
    unsubscribeFromTopic: jest.fn(),
  };

  return {
    apps: [],
    initializeApp: jest.fn(() => ({
      messaging: jest.fn(() => mockMessaging),
    })),
    credential: {
      cert: jest.fn(() => ({})),
    },
    messaging: jest.fn(() => mockMessaging),
    app: jest.fn(),
  };
});

describe('FCMProvider', () => {
  let provider: FCMProvider;
  let mockMessaging: any;

  beforeEach(() => {
    // Reset admin.apps
    (admin.apps as any) = [];

    // Set up environment variables
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';

    mockMessaging = {
      send: jest.fn(),
      sendEachForMulticast: jest.fn(),
      subscribeToTopic: jest.fn(),
      unsubscribeFromTopic: jest.fn(),
    };

    (admin.messaging as jest.Mock).mockReturnValue(mockMessaging);

    provider = new FCMProvider();
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
  });

  describe('initialization', () => {
    it('should initialize with environment variables', () => {
      expect(admin.initializeApp).toHaveBeenCalled();
    });

    it('should use existing app if already initialized', () => {
      (admin.apps as any) = [{}]; // Simulate existing app

      const newProvider = new FCMProvider();

      // Should call admin.app() to get existing app
      expect(admin.app).toHaveBeenCalled();
    });

    it('should handle initialization error gracefully', () => {
      (admin.initializeApp as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Initialization failed');
      });

      const failedProvider = new FCMProvider();

      expect((failedProvider as any).initialized).toBe(false);
    });
  });

  describe('sendToDevice', () => {
    it('should send notification to single device successfully', async () => {
      (provider as any).initialized = true;
      (provider as any).app = {};

      mockMessaging.send.mockResolvedValue('message-id-123');

      const result = await provider.sendToDevice({
        token: 'device-token-abc',
        title: 'Test Title',
        body: 'Test Body',
        data: { key: 'value' },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('message-id-123');
    });

    it('should return error when not initialized', async () => {
      (provider as any).initialized = false;
      (provider as any).app = undefined;

      const result = await provider.sendToDevice({
        token: 'device-token',
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('FCM Provider not initialized');
    });

    it('should include Android-specific configuration', async () => {
      (provider as any).initialized = true;
      (provider as any).app = {};

      mockMessaging.send.mockResolvedValue('message-id-123');

      await provider.sendToDevice({
        token: 'device-token',
        title: 'Test',
        body: 'Test',
        priority: 'high',
        channelId: 'custom_channel',
        sound: 'custom_sound',
      });

      expect(mockMessaging.send).toHaveBeenCalledWith(
        expect.objectContaining({
          android: expect.objectContaining({
            priority: 'high',
            notification: expect.objectContaining({
              channelId: 'custom_channel',
              sound: 'custom_sound',
            }),
          }),
        })
      );
    });

    it('should include iOS/APNs-specific configuration', async () => {
      (provider as any).initialized = true;
      (provider as any).app = {};

      mockMessaging.send.mockResolvedValue('message-id-123');

      await provider.sendToDevice({
        token: 'device-token',
        title: 'Test',
        body: 'Test',
        badge: 5,
        priority: 'high',
      });

      expect(mockMessaging.send).toHaveBeenCalledWith(
        expect.objectContaining({
          apns: expect.objectContaining({
            payload: expect.objectContaining({
              aps: expect.objectContaining({
                badge: 5,
              }),
            }),
            headers: expect.objectContaining({
              'apns-priority': '10',
            }),
          }),
        })
      );
    });

    it('should handle FCM errors gracefully', async () => {
      (provider as any).initialized = true;
      (provider as any).app = {};

      mockMessaging.send.mockRejectedValue(new Error('FCM Error'));

      const result = await provider.sendToDevice({
        token: 'device-token',
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('FCM Error');
    });
  });

  describe('sendToMultipleDevices', () => {
    it('should send to multiple devices successfully', async () => {
      (provider as any).initialized = true;
      (provider as any).app = {};

      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 3,
        failureCount: 0,
        responses: [
          { success: true },
          { success: true },
          { success: true },
        ],
      });

      const result = await provider.sendToMultipleDevices({
        tokens: ['token-1', 'token-2', 'token-3'],
        title: 'Test Title',
        body: 'Test Body',
      });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
    });

    it('should return error when not initialized', async () => {
      (provider as any).initialized = false;
      (provider as any).app = undefined;

      const result = await provider.sendToMultipleDevices({
        tokens: ['token-1', 'token-2'],
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.failureCount).toBe(2);
    });

    it('should handle partial failures', async () => {
      (provider as any).initialized = true;
      (provider as any).app = {};

      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 2,
        failureCount: 1,
        responses: [
          { success: true },
          { success: true },
          { success: false, error: { message: 'Invalid token' } },
        ],
      });

      const result = await provider.sendToMultipleDevices({
        tokens: ['token-1', 'token-2', 'token-3'],
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.results[2].error).toBe('Invalid token');
    });

    it('should handle complete failure', async () => {
      (provider as any).initialized = true;
      (provider as any).app = {};

      mockMessaging.sendEachForMulticast.mockRejectedValue(
        new Error('Complete failure')
      );

      const result = await provider.sendToMultipleDevices({
        tokens: ['token-1', 'token-2'],
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(2);
    });
  });

  describe('validateToken', () => {
    it('should return true for valid token', async () => {
      (provider as any).initialized = true;
      (provider as any).app = {};

      mockMessaging.send.mockResolvedValue('message-id');

      const isValid = await provider.validateToken('valid-token');

      expect(isValid).toBe(true);
      expect(mockMessaging.send).toHaveBeenCalledWith(
        expect.anything(),
        true // dry run
      );
    });

    it('should return false for invalid token', async () => {
      (provider as any).initialized = true;
      (provider as any).app = {};

      mockMessaging.send.mockRejectedValue(new Error('Invalid token'));

      const isValid = await provider.validateToken('invalid-token');

      expect(isValid).toBe(false);
    });

    it('should return false when not initialized', async () => {
      (provider as any).initialized = false;
      (provider as any).app = undefined;

      const isValid = await provider.validateToken('token');

      expect(isValid).toBe(false);
    });
  });

  describe('subscribeToTopic', () => {
    it('should subscribe tokens to topic successfully', async () => {
      (provider as any).initialized = true;
      (provider as any).app = {};

      mockMessaging.subscribeToTopic.mockResolvedValue({
        successCount: 3,
        failureCount: 0,
      });

      const result = await provider.subscribeToTopic(
        ['token-1', 'token-2', 'token-3'],
        'news'
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(3);
    });

    it('should return error when not initialized', async () => {
      (provider as any).initialized = false;
      (provider as any).app = undefined;

      const result = await provider.subscribeToTopic(['token-1'], 'news');

      expect(result.success).toBe(false);
    });

    it('should handle subscription errors', async () => {
      (provider as any).initialized = true;
      (provider as any).app = {};

      mockMessaging.subscribeToTopic.mockRejectedValue(
        new Error('Subscription failed')
      );

      const result = await provider.subscribeToTopic(['token-1'], 'news');

      expect(result.success).toBe(false);
    });
  });

  describe('unsubscribeFromTopic', () => {
    it('should unsubscribe tokens from topic successfully', async () => {
      (provider as any).initialized = true;
      (provider as any).app = {};

      mockMessaging.unsubscribeFromTopic.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
      });

      const result = await provider.unsubscribeFromTopic(
        ['token-1', 'token-2'],
        'news'
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
    });

    it('should return error when not initialized', async () => {
      (provider as any).initialized = false;
      (provider as any).app = undefined;

      const result = await provider.unsubscribeFromTopic(['token-1'], 'news');

      expect(result.success).toBe(false);
    });
  });

  describe('sendToTopic', () => {
    it('should send notification to topic successfully', async () => {
      (provider as any).initialized = true;
      (provider as any).app = {};

      mockMessaging.send.mockResolvedValue('message-id-123');

      const result = await provider.sendToTopic('news', {
        title: 'Breaking News',
        body: 'Something happened!',
        data: { category: 'breaking' },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('message-id-123');
    });

    it('should return error when not initialized', async () => {
      (provider as any).initialized = false;
      (provider as any).app = undefined;

      const result = await provider.sendToTopic('news', {
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('FCM Provider not initialized');
    });

    it('should handle topic notification errors', async () => {
      (provider as any).initialized = true;
      (provider as any).app = {};

      mockMessaging.send.mockRejectedValue(new Error('Topic error'));

      const result = await provider.sendToTopic('news', {
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Topic error');
    });
  });
});
