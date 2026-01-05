/**
 * Unit tests for PushNotificationService
 */

import { PushNotificationService, NotificationType } from '../../../src/services/push-notification.service';
import * as admin from 'firebase-admin';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  db: jest.fn(),
}));

jest.mock('@flamoral/backend-shared', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(() => ({
    messaging: jest.fn(),
  })),
  credential: {
    cert: jest.fn(),
  },
  messaging: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-12345'),
}));

import { db } from '../../../src/config/database';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let mockDb: jest.MockedFunction<typeof db>;

  beforeEach(() => {
    service = new PushNotificationService();
    mockDb = db as jest.MockedFunction<typeof db>;
    jest.clearAllMocks();

    // Reset firebase apps
    (admin.apps as any) = [];
  });

  describe('registerToken', () => {
    it('should register a new FCM token successfully', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
        insert: jest.fn().mockResolvedValue([{ id: 'token-123' }]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.registerToken(
        'user-123',
        'fcm-token-abc',
        'android',
        'Pixel 7'
      );

      expect(result.success).toBe(true);
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          token: 'fcm-token-abc',
          device_type: 'android',
          device_name: 'Pixel 7',
        })
      );
    });

    it('should update last used time for existing token', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ id: 'existing-token-id' }),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.registerToken(
        'user-123',
        'existing-fcm-token',
        'ios'
      );

      expect(result.success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          last_used_at: expect.any(Date),
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockDb.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await service.registerToken('user-123', 'token', 'android');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to register device token');
    });
  });

  describe('unregisterToken', () => {
    it('should unregister token successfully', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        delete: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.unregisterToken('user-123', 'fcm-token-abc');

      expect(result.success).toBe(true);
      expect(mockQuery.delete).toHaveBeenCalled();
    });

    it('should handle errors during unregistration', async () => {
      mockDb.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await service.unregisterToken('user-123', 'token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to unregister device token');
    });
  });

  describe('getUserTokens', () => {
    it('should return all tokens for a user', async () => {
      const mockTokens = [
        { id: '1', user_id: 'user-123', token: 'token-1', device_type: 'android' },
        { id: '2', user_id: 'user-123', token: 'token-2', device_type: 'ios' },
      ];

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockTokens),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const tokens = await service.getUserTokens('user-123');

      expect(tokens).toHaveLength(2);
      expect(tokens[0].token).toBe('token-1');
      expect(tokens[1].token).toBe('token-2');
    });

    it('should return empty array on error', async () => {
      mockDb.mockImplementation(() => {
        throw new Error('Database error');
      });

      const tokens = await service.getUserTokens('user-123');

      expect(tokens).toEqual([]);
    });
  });

  describe('sendNotification', () => {
    it('should return error when Firebase is not initialized', async () => {
      const result = await service.sendNotification('user-123', {
        type: NotificationType.NEW_MATCH,
        title: 'Test',
        body: 'Test body',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Firebase not initialized');
    });

    it('should return error when user not found', async () => {
      // Mock Firebase as initialized
      (service as any).firebaseApp = {};

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.sendNotification('user-123', {
        type: NotificationType.NEW_MATCH,
        title: 'Test',
        body: 'Test body',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should return error when push notifications are disabled', async () => {
      (service as any).firebaseApp = {};

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'user-123',
          push_notifications_enabled: false,
        }),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.sendNotification('user-123', {
        type: NotificationType.NEW_MATCH,
        title: 'Test',
        body: 'Test body',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Push notifications disabled');
    });

    it('should return error when no devices are registered', async () => {
      (service as any).firebaseApp = {};

      const mockUserQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          id: 'user-123',
          push_notifications_enabled: true,
          notify_new_matches: true,
        }),
      };

      mockDb.mockImplementation((table: string) => {
        if (table === 'users') {
          return mockUserQuery as any;
        }
        return {
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockResolvedValue([]),
        } as any;
      });

      jest.spyOn(service, 'getUserTokens').mockResolvedValue([]);

      const result = await service.sendNotification('user-123', {
        type: NotificationType.NEW_MATCH,
        title: 'Test',
        body: 'Test body',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No registered devices');
    });
  });

  describe('isNotificationTypeEnabled', () => {
    it('should return true for NEW_MATCH when notify_new_matches is true', () => {
      const user = { notify_new_matches: true };
      const result = (service as any).isNotificationTypeEnabled(user, NotificationType.NEW_MATCH);
      expect(result).toBe(true);
    });

    it('should return false for NEW_MATCH when notify_new_matches is false', () => {
      const user = { notify_new_matches: false };
      const result = (service as any).isNotificationTypeEnabled(user, NotificationType.NEW_MATCH);
      expect(result).toBe(false);
    });

    it('should return true for NEW_MESSAGE when notify_new_messages is true', () => {
      const user = { notify_new_messages: true };
      const result = (service as any).isNotificationTypeEnabled(user, NotificationType.NEW_MESSAGE);
      expect(result).toBe(true);
    });

    it('should return true by default for unknown types', () => {
      const user = {};
      const result = (service as any).isNotificationTypeEnabled(user, NotificationType.REMINDER);
      expect(result).toBe(true);
    });
  });

  describe('getNotificationHistory', () => {
    it('should return notification history with pagination', async () => {
      const mockNotifications = [
        { id: '1', user_id: 'user-123', title: 'Test 1', data: '{}' },
        { id: '2', user_id: 'user-123', title: 'Test 2', data: '{"key":"value"}' },
      ];

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockNotifications),
        count: jest.fn().mockResolvedValue([{ count: '10' }]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getNotificationHistory('user-123', 50, 0);

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(2);
      expect(result.total).toBe(10);
    });

    it('should parse JSON data in notifications', async () => {
      const mockNotifications = [
        { id: '1', user_id: 'user-123', title: 'Test', data: '{"matchId":"match-123"}' },
      ];

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockNotifications),
        count: jest.fn().mockResolvedValue([{ count: '1' }]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getNotificationHistory('user-123');

      expect(result.notifications?.[0].data).toEqual({ matchId: 'match-123' });
    });

    it('should handle errors gracefully', async () => {
      mockDb.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await service.getNotificationHistory('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch notifications');
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.markAsRead('user-123', 'notif-123');

      expect(result.success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalledWith({ read: true });
    });

    it('should return error when notification not found', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(0),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.markAsRead('user-123', 'notif-nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Notification not found');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(10),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.markAllAsRead('user-123');

      expect(result.success).toBe(true);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue([{ count: '5' }]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getUnreadCount('user-123');

      expect(result.success).toBe(true);
      expect(result.count).toBe(5);
    });
  });

  describe('deleteOldNotifications', () => {
    it('should delete old notifications', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        delete: jest.fn().mockResolvedValue(100),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.deleteOldNotifications(90);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(100);
    });

    it('should handle errors gracefully', async () => {
      mockDb.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await service.deleteOldNotifications();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete old notifications');
    });
  });

  describe('Helper notification methods', () => {
    beforeEach(() => {
      jest.spyOn(service, 'sendNotification').mockResolvedValue({
        success: true,
        sent: 1,
        failed: 0,
      });
    });

    it('should send new match notification', async () => {
      await service.notifyNewMatch('user-123', 'match-456', 'Jane', 'https://photo.url');

      expect(service.sendNotification).toHaveBeenCalledWith('user-123', {
        type: NotificationType.NEW_MATCH,
        title: "It's a Match! \uD83C\uDF89",
        body: 'You matched with Jane!',
        imageUrl: 'https://photo.url',
        deepLink: '/chat/match-456',
        data: {
          matchUserId: 'match-456',
          matchUserName: 'Jane',
        },
      });
    });

    it('should send new message notification', async () => {
      await service.notifyNewMessage('user-123', 'sender-456', 'Jane', 'Hello!', 'https://photo.url');

      expect(service.sendNotification).toHaveBeenCalledWith('user-123', {
        type: NotificationType.NEW_MESSAGE,
        title: 'Jane',
        body: 'Hello!',
        imageUrl: 'https://photo.url',
        deepLink: '/chat/sender-456',
        data: {
          senderId: 'sender-456',
          senderName: 'Jane',
        },
      });
    });

    it('should send new like notification', async () => {
      await service.notifyNewLike('user-123', 'liker-456', 'Jane', 'https://photo.url');

      expect(service.sendNotification).toHaveBeenCalledWith('user-123', {
        type: NotificationType.NEW_LIKE,
        title: "Someone likes you! \uD83D\uDC95",
        body: 'Jane liked your profile',
        imageUrl: 'https://photo.url',
        deepLink: '/profile/liker-456',
        data: {
          likerId: 'liker-456',
          likerName: 'Jane',
        },
      });
    });

    it('should send super like notification', async () => {
      await service.notifySuperLike('user-123', 'liker-456', 'Jane', 'https://photo.url');

      expect(service.sendNotification).toHaveBeenCalledWith('user-123', {
        type: NotificationType.SUPER_LIKE,
        title: "You got a Super Like! \u2B50",
        body: 'Jane super liked you!',
        imageUrl: 'https://photo.url',
        deepLink: '/profile/liker-456',
        data: {
          likerId: 'liker-456',
          likerName: 'Jane',
        },
      });
    });
  });
});
