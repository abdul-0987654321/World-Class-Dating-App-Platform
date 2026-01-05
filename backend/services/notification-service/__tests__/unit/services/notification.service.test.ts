/**
 * Unit tests for NotificationService
 */

import { NotificationService } from '../../../src/services/notification.service';
import {
  NotificationChannel,
  NotificationType,
  NotificationPriority,
} from '../../../src/types';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  db: jest.fn(),
}));

jest.mock('../../../src/queues/notification.queue', () => ({
  addNotificationJob: jest.fn(),
}));

jest.mock('../../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-12345'),
}));

import { db } from '../../../src/config/database';
import { addNotificationJob } from '../../../src/queues/notification.queue';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockDb: jest.MockedFunction<typeof db>;

  beforeEach(() => {
    service = new NotificationService();
    mockDb = db as jest.MockedFunction<typeof db>;
    jest.clearAllMocks();
  });

  describe('sendNotification', () => {
    it('should successfully queue a notification with all required fields', async () => {
      const payload = {
        userId: 'user-123',
        type: NotificationType.NEW_MATCH,
        title: 'New Match!',
        body: 'You have a new match',
        channels: [NotificationChannel.PUSH],
      };

      const result = await service.sendNotification(payload);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe('mock-uuid-12345');
      expect(addNotificationJob).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: NotificationType.NEW_MATCH,
          priority: NotificationPriority.NORMAL,
        })
      );
    });

    it('should return error when userId is missing', async () => {
      const payload = {
        userId: '',
        type: NotificationType.NEW_MATCH,
        title: 'New Match!',
        body: 'You have a new match',
      };

      const result = await service.sendNotification(payload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });

    it('should return error when title is missing', async () => {
      const payload = {
        userId: 'user-123',
        type: NotificationType.NEW_MATCH,
        title: '',
        body: 'You have a new match',
      };

      const result = await service.sendNotification(payload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });

    it('should return error when body is missing', async () => {
      const payload = {
        userId: 'user-123',
        type: NotificationType.NEW_MATCH,
        title: 'Title',
        body: '',
      };

      const result = await service.sendNotification(payload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });

    it('should default to PUSH, EMAIL, IN_APP channels when not specified', async () => {
      const payload = {
        userId: 'user-123',
        type: NotificationType.NEW_MATCH,
        title: 'New Match!',
        body: 'You have a new match',
        channels: [],
      };

      await service.sendNotification(payload);

      expect(addNotificationJob).toHaveBeenCalledWith(
        expect.objectContaining({
          channels: [
            NotificationChannel.PUSH,
            NotificationChannel.EMAIL,
            NotificationChannel.IN_APP,
          ],
        })
      );
    });

    it('should handle queue job error gracefully', async () => {
      (addNotificationJob as jest.Mock).mockRejectedValue(new Error('Queue error'));

      const payload = {
        userId: 'user-123',
        type: NotificationType.NEW_MATCH,
        title: 'New Match!',
        body: 'You have a new match',
      };

      const result = await service.sendNotification(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Queue error');
    });
  });

  describe('getUserNotifications', () => {
    it('should return paginated notifications', async () => {
      const mockNotifications = [
        { id: '1', user_id: 'user-123', title: 'Test', data: '{}', created_at: new Date() },
        { id: '2', user_id: 'user-123', title: 'Test 2', data: '{}', created_at: new Date() },
      ];

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockNotifications),
        count: jest.fn().mockResolvedValue([{ count: '10' }]),
      };

      mockDb.mockImplementation((table: string) => {
        if (table === 'notifications') {
          return mockQuery as any;
        }
        return mockQuery as any;
      });

      const result = await service.getUserNotifications('user-123', 1, 20, false);

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(2);
    });

    it('should filter unread notifications when unreadOnly is true', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue([{ count: '0' }]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      await service.getUserNotifications('user-123', 1, 20, true);

      expect(mockQuery.whereNull).toHaveBeenCalledWith('read_at');
    });

    it('should handle database errors gracefully', async () => {
      mockDb.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await service.getUserNotifications('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.markAsRead('user-123', 'notif-123');

      expect(result.success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'read',
        })
      );
    });

    it('should return error when notification not found', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(0),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.markAsRead('user-123', 'notif-nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Notification not found or already read');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read and return count', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(5),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.markAllAsRead('user-123');

      expect(result.success).toBe(true);
      expect(result.count).toBe(5);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        delete: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.deleteNotification('user-123', 'notif-123');

      expect(result.success).toBe(true);
    });

    it('should return error when notification not found', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        delete: jest.fn().mockResolvedValue(0),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.deleteNotification('user-123', 'notif-nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Notification not found');
    });
  });

  describe('getPreferences', () => {
    it('should return existing preferences', async () => {
      const mockPrefs = {
        user_id: 'user-123',
        push_enabled: true,
        push_new_match: true,
        push_new_message: true,
        push_new_like: true,
        push_super_like: true,
        push_profile_view: false,
        push_boost_expiring: true,
        push_marketing: false,
        email_enabled: true,
        email_new_match: true,
        email_new_message: false,
        email_weekly_digest: true,
        email_promotions: false,
        email_product_updates: true,
        sms_enabled: false,
        sms_verification: true,
        sms_security_alerts: true,
        quiet_hours_enabled: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        timezone: 'America/New_York',
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockPrefs),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getPreferences('user-123');

      expect(result.success).toBe(true);
      expect(result.preferences?.pushEnabled).toBe(true);
      expect(result.preferences?.quietHoursEnabled).toBe(true);
      expect(result.preferences?.timezone).toBe('America/New_York');
    });

    it('should create default preferences if not found', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{
          user_id: 'user-123',
          push_enabled: true,
          quiet_hours_enabled: false,
        }]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getPreferences('user-123');

      expect(result.success).toBe(true);
      expect(mockQuery.insert).toHaveBeenCalled();
    });
  });

  describe('updatePreferences', () => {
    it('should update existing preferences', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ user_id: 'user-123' }),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      // Mock getPreferences to return updated prefs
      jest.spyOn(service, 'getPreferences').mockResolvedValue({
        success: true,
        preferences: {
          userId: 'user-123',
          pushEnabled: false,
          pushNewMatch: true,
          pushNewMessage: true,
          pushNewLike: true,
          pushSuperLike: true,
          pushProfileView: false,
          pushBoostExpiring: true,
          pushMarketing: false,
          emailEnabled: true,
          emailNewMatch: true,
          emailNewMessage: false,
          emailWeeklyDigest: true,
          emailPromotions: false,
          emailProductUpdates: true,
          smsEnabled: false,
          smsVerification: true,
          smsSecurityAlerts: true,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          timezone: 'UTC',
        },
      });

      const result = await service.updatePreferences('user-123', {
        pushEnabled: false,
      });

      expect(result.success).toBe(true);
    });

    it('should create preferences if they do not exist', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
        insert: jest.fn().mockResolvedValue([1]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      jest.spyOn(service, 'getPreferences').mockResolvedValue({
        success: true,
        preferences: {
          userId: 'user-123',
          pushEnabled: true,
          pushNewMatch: true,
          pushNewMessage: true,
          pushNewLike: true,
          pushSuperLike: true,
          pushProfileView: false,
          pushBoostExpiring: true,
          pushMarketing: false,
          emailEnabled: true,
          emailNewMatch: true,
          emailNewMessage: false,
          emailWeeklyDigest: true,
          emailPromotions: false,
          emailProductUpdates: true,
          smsEnabled: false,
          smsVerification: true,
          smsSecurityAlerts: true,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          timezone: 'UTC',
        },
      });

      const result = await service.updatePreferences('user-123', {
        pushEnabled: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        whereNull: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue([{ count: '7' }]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getUnreadCount('user-123');

      expect(result.success).toBe(true);
      expect(result.count).toBe(7);
    });
  });

  describe('Convenience notification methods', () => {
    beforeEach(() => {
      jest.spyOn(service, 'sendNotification').mockResolvedValue({
        success: true,
        notificationId: 'mock-id',
      });
    });

    it('should send new match notification', async () => {
      await service.notifyNewMatch('user-123', 'match-456', 'Jane', 'https://photo.url');

      expect(service.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: NotificationType.NEW_MATCH,
          channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority: NotificationPriority.HIGH,
        })
      );
    });

    it('should send new message notification', async () => {
      await service.notifyNewMessage('user-123', 'sender-456', 'Jane', 'Hello!', 'https://photo.url');

      expect(service.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: NotificationType.NEW_MESSAGE,
          priority: NotificationPriority.HIGH,
        })
      );
    });

    it('should send new like notification', async () => {
      await service.notifyNewLike('user-123');

      expect(service.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: NotificationType.NEW_LIKE,
          priority: NotificationPriority.NORMAL,
        })
      );
    });

    it('should send payment success notification', async () => {
      await service.notifyPaymentSuccess('user-123', 29.99, 'Premium');

      expect(service.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: NotificationType.PAYMENT_SUCCESS,
          channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority: NotificationPriority.HIGH,
        })
      );
    });

    it('should send payment failed notification', async () => {
      await service.notifyPaymentFailed('user-123', 'Card declined');

      expect(service.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: NotificationType.PAYMENT_FAILED,
          priority: NotificationPriority.URGENT,
        })
      );
    });

    it('should send profile boost notification', async () => {
      await service.notifyProfileBoostActive('user-123', 30);

      expect(service.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: NotificationType.PROFILE_BOOST_ACTIVE,
          priority: NotificationPriority.HIGH,
        })
      );
    });

    it('should send verification complete notification', async () => {
      await service.notifyVerificationComplete('user-123');

      expect(service.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: NotificationType.VERIFICATION_COMPLETE,
          channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority: NotificationPriority.HIGH,
        })
      );
    });
  });

  describe('Internal API methods', () => {
    beforeEach(() => {
      jest.spyOn(service, 'sendNotification').mockResolvedValue({
        success: true,
        notificationId: 'mock-id',
      });
    });

    it('should send push notification via internal API', async () => {
      await service.sendPushNotification({
        userId: 'user-123',
        title: 'Test',
        body: 'Test body',
        data: { key: 'value' },
      });

      expect(service.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          channels: [NotificationChannel.PUSH],
        })
      );
    });

    it('should send email notification via internal API', async () => {
      await service.sendEmailNotification({
        userId: 'user-123',
        subject: 'Test Subject',
        body: 'Test body',
      });

      expect(service.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          channels: [NotificationChannel.EMAIL],
        })
      );
    });

    it('should send SMS notification via internal API', async () => {
      await service.sendSMSNotification({
        userId: 'user-123',
        message: 'Test SMS message',
      });

      expect(service.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          channels: [NotificationChannel.SMS],
          type: NotificationType.SECURITY_ALERT,
        })
      );
    });
  });
});
