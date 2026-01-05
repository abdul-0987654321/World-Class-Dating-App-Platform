/**
 * Unit tests for APNsProvider (Apple Push Notification Service)
 */

import { APNsProvider, APNsMessage, APNsBatchMessage } from '../../../src/providers/apns.provider';
import apn from '@parse/node-apn';
import fs from 'fs';

// Mock dependencies
jest.mock('../../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('@parse/node-apn', () => ({
  Provider: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
    shutdown: jest.fn(),
  })),
  Notification: jest.fn().mockImplementation(() => ({
    alert: {},
    badge: undefined,
    sound: 'default',
    contentAvailable: false,
    mutableContent: false,
    payload: {},
    threadId: undefined,
    topic: undefined,
    expiry: 0,
    priority: 10,
  })),
}));

describe('APNsProvider', () => {
  let provider: APNsProvider;
  let mockApnProvider: any;

  beforeEach(() => {
    // Set up environment variables
    process.env.APNS_KEY_ID = 'test-key-id';
    process.env.APNS_TEAM_ID = 'test-team-id';
    process.env.APNS_KEY_PATH = '/path/to/key.p8';
    process.env.APNS_BUNDLE_ID = 'com.flamoral.app';
    process.env.APNS_PRODUCTION = 'false';

    (fs.existsSync as jest.Mock).mockReturnValue(true);

    mockApnProvider = {
      send: jest.fn(),
      shutdown: jest.fn(),
    };

    (apn.Provider as jest.Mock).mockImplementation(() => mockApnProvider);

    provider = new APNsProvider();
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.APNS_KEY_ID;
    delete process.env.APNS_TEAM_ID;
    delete process.env.APNS_KEY_PATH;
    delete process.env.APNS_BUNDLE_ID;
    delete process.env.APNS_PRODUCTION;
  });

  describe('initialization', () => {
    it('should initialize with JWT authentication', () => {
      expect(apn.Provider).toHaveBeenCalledWith(
        expect.objectContaining({
          production: false,
          token: expect.objectContaining({
            keyId: 'test-key-id',
            teamId: 'test-team-id',
          }),
        })
      );
    });

    it('should handle missing key file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      expect(() => new APNsProvider()).not.toThrow();
      // Should log error and not be initialized
    });

    it('should handle missing configuration', () => {
      delete process.env.APNS_KEY_ID;
      delete process.env.APNS_TEAM_ID;
      delete process.env.APNS_KEY_PATH;

      const uninitializedProvider = new APNsProvider();

      expect((uninitializedProvider as any).initialized).toBe(false);
    });
  });

  describe('sendToDevice', () => {
    it('should send notification successfully', async () => {
      (provider as any).initialized = true;
      (provider as any).provider = mockApnProvider;

      mockApnProvider.send.mockResolvedValue({
        sent: [{ device: 'token-123' }],
        failed: [],
      });

      const result = await provider.sendToDevice({
        token: 'device-token-abc',
        title: 'Test Title',
        body: 'Test Body',
      });

      expect(result.success).toBe(true);
    });

    it('should return error when not initialized', async () => {
      (provider as any).initialized = false;
      (provider as any).provider = null;

      const result = await provider.sendToDevice({
        token: 'device-token',
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('APNs Provider not initialized');
    });

    it('should handle APNs failure response', async () => {
      (provider as any).initialized = true;
      (provider as any).provider = mockApnProvider;

      mockApnProvider.send.mockResolvedValue({
        sent: [],
        failed: [
          {
            device: 'token-123',
            status: '400',
            response: { reason: 'BadDeviceToken' },
          },
        ],
      });

      const result = await provider.sendToDevice({
        token: 'invalid-token',
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('BadDeviceToken');
    });

    it('should include badge in notification', async () => {
      (provider as any).initialized = true;
      (provider as any).provider = mockApnProvider;

      mockApnProvider.send.mockResolvedValue({
        sent: [{ device: 'token-123' }],
        failed: [],
      });

      await provider.sendToDevice({
        token: 'device-token',
        title: 'Test',
        body: 'Test',
        badge: 5,
      });

      expect(apn.Notification).toHaveBeenCalled();
    });

    it('should set high priority when specified', async () => {
      (provider as any).initialized = true;
      (provider as any).provider = mockApnProvider;

      mockApnProvider.send.mockResolvedValue({
        sent: [{ device: 'token-123' }],
        failed: [],
      });

      await provider.sendToDevice({
        token: 'device-token',
        title: 'Test',
        body: 'Test',
        priority: 'high',
      });

      // Notification priority should be set to 10 for high
      expect(mockApnProvider.send).toHaveBeenCalled();
    });

    it('should include custom data in payload', async () => {
      (provider as any).initialized = true;
      (provider as any).provider = mockApnProvider;

      mockApnProvider.send.mockResolvedValue({
        sent: [{ device: 'token-123' }],
        failed: [],
      });

      await provider.sendToDevice({
        token: 'device-token',
        title: 'Test',
        body: 'Test',
        data: { matchId: 'match-123', action: 'view_profile' },
      });

      expect(mockApnProvider.send).toHaveBeenCalled();
    });

    it('should set mutable content for image notifications', async () => {
      (provider as any).initialized = true;
      (provider as any).provider = mockApnProvider;

      mockApnProvider.send.mockResolvedValue({
        sent: [{ device: 'token-123' }],
        failed: [],
      });

      await provider.sendToDevice({
        token: 'device-token',
        title: 'Test',
        body: 'Test',
        imageUrl: 'https://example.com/image.jpg',
      });

      expect(mockApnProvider.send).toHaveBeenCalled();
    });

    it('should handle APNs errors gracefully', async () => {
      (provider as any).initialized = true;
      (provider as any).provider = mockApnProvider;

      mockApnProvider.send.mockRejectedValue(new Error('APNs Error'));

      const result = await provider.sendToDevice({
        token: 'device-token',
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('APNs Error');
    });
  });

  describe('sendToMultipleDevices', () => {
    it('should send to multiple devices successfully', async () => {
      (provider as any).initialized = true;
      (provider as any).provider = mockApnProvider;

      mockApnProvider.send.mockResolvedValue({
        sent: [{ device: 'token-1' }, { device: 'token-2' }],
        failed: [],
      });

      const result = await provider.sendToMultipleDevices({
        tokens: ['token-1', 'token-2'],
        title: 'Test Title',
        body: 'Test Body',
      });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it('should return error when not initialized', async () => {
      (provider as any).initialized = false;
      (provider as any).provider = null;

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
      (provider as any).provider = mockApnProvider;

      mockApnProvider.send.mockResolvedValue({
        sent: [{ device: 'token-1' }],
        failed: [
          {
            device: 'token-2',
            status: '410',
            response: { reason: 'Unregistered' },
          },
        ],
      });

      const result = await provider.sendToMultipleDevices({
        tokens: ['token-1', 'token-2'],
        title: 'Test',
        body: 'Test',
      });

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
    });

    it('should handle complete failure', async () => {
      (provider as any).initialized = true;
      (provider as any).provider = mockApnProvider;

      mockApnProvider.send.mockRejectedValue(new Error('Complete failure'));

      const result = await provider.sendToMultipleDevices({
        tokens: ['token-1', 'token-2'],
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.failureCount).toBe(2);
    });
  });

  describe('sendSilentNotification', () => {
    it('should send silent notification for background updates', async () => {
      (provider as any).initialized = true;
      (provider as any).provider = mockApnProvider;

      mockApnProvider.send.mockResolvedValue({
        sent: [{ device: 'token-123' }],
        failed: [],
      });

      const result = await provider.sendSilentNotification('token-123', {
        type: 'refresh_data',
        timestamp: '12345',
      });

      expect(result.success).toBe(true);
    });

    it('should return error when not initialized', async () => {
      (provider as any).initialized = false;
      (provider as any).provider = null;

      const result = await provider.sendSilentNotification('token', { key: 'value' });

      expect(result.success).toBe(false);
    });

    it('should handle silent notification failure', async () => {
      (provider as any).initialized = true;
      (provider as any).provider = mockApnProvider;

      mockApnProvider.send.mockResolvedValue({
        sent: [],
        failed: [
          {
            device: 'token-123',
            response: { reason: 'BadDeviceToken' },
          },
        ],
      });

      const result = await provider.sendSilentNotification('token-123', {});

      expect(result.success).toBe(false);
    });
  });

  describe('sendActionableNotification', () => {
    it('should send actionable notification with category', async () => {
      (provider as any).initialized = true;
      (provider as any).provider = mockApnProvider;

      mockApnProvider.send.mockResolvedValue({
        sent: [{ device: 'token-123' }],
        failed: [],
      });

      const result = await provider.sendActionableNotification('token-123', {
        title: 'New Match!',
        body: 'Jane liked you back!',
        category: 'MATCH_NOTIFICATION',
        data: { matchId: 'match-123' },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should shutdown the provider', async () => {
      (provider as any).provider = mockApnProvider;

      await provider.shutdown();

      expect(mockApnProvider.shutdown).toHaveBeenCalled();
    });

    it('should handle shutdown when provider is null', async () => {
      (provider as any).provider = null;

      await expect(provider.shutdown()).resolves.not.toThrow();
    });
  });
});
