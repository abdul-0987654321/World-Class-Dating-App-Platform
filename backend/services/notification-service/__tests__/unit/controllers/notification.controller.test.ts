/**
 * Unit tests for NotificationController
 */

import { Request, Response } from 'express';
import { NotificationController } from '../../../src/api/controllers/notification.controller';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '../../../src/types';

// Mock dependencies
jest.mock('../../../src/services/notification.service', () => ({
  notificationService: {
    sendNotification: jest.fn(),
    getUserNotifications: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
    getUnreadCount: jest.fn(),
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { notificationService } from '../../../src/services/notification.service';

describe('NotificationController', () => {
  let controller: NotificationController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    controller = new NotificationController();

    responseJson = jest.fn();
    responseStatus = jest.fn(() => ({ json: responseJson }));

    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: { id: 'user-123' },
    };

    mockResponse = {
      status: responseStatus,
      json: responseJson,
    };

    jest.clearAllMocks();
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      mockRequest.body = {
        userId: 'user-456',
        type: NotificationType.NEW_MATCH,
        title: 'New Match!',
        body: 'You have a new match',
        channels: [NotificationChannel.PUSH],
      };

      (notificationService.sendNotification as jest.Mock).mockResolvedValue({
        success: true,
        notificationId: 'notif-123',
      });

      await controller.sendNotification(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          notificationId: 'notif-123',
        })
      );
    });

    it('should return 400 when userId is missing', async () => {
      mockRequest.body = {
        type: NotificationType.NEW_MATCH,
        title: 'Test',
        body: 'Test',
      };

      await controller.sendNotification(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Missing required fields'),
        })
      );
    });

    it('should return 400 when type is missing', async () => {
      mockRequest.body = {
        userId: 'user-123',
        title: 'Test',
        body: 'Test',
      };

      await controller.sendNotification(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when title is missing', async () => {
      mockRequest.body = {
        userId: 'user-123',
        type: NotificationType.NEW_MATCH,
        body: 'Test',
      };

      await controller.sendNotification(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid notification type', async () => {
      mockRequest.body = {
        userId: 'user-123',
        type: 'invalid_type',
        title: 'Test',
        body: 'Test',
      };

      await controller.sendNotification(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid notification type',
        })
      );
    });

    it('should return 400 for invalid channels', async () => {
      mockRequest.body = {
        userId: 'user-123',
        type: NotificationType.NEW_MATCH,
        title: 'Test',
        body: 'Test',
        channels: ['invalid_channel'],
      };

      await controller.sendNotification(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid channels'),
        })
      );
    });

    it('should return 500 when service fails', async () => {
      mockRequest.body = {
        userId: 'user-123',
        type: NotificationType.NEW_MATCH,
        title: 'Test',
        body: 'Test',
      };

      (notificationService.sendNotification as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Service error',
      });

      await controller.sendNotification(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
    });

    it('should handle exceptions gracefully', async () => {
      mockRequest.body = {
        userId: 'user-123',
        type: NotificationType.NEW_MATCH,
        title: 'Test',
        body: 'Test',
      };

      (notificationService.sendNotification as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      await controller.sendNotification(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
        })
      );
    });

    it('should use default channels when not specified', async () => {
      mockRequest.body = {
        userId: 'user-123',
        type: NotificationType.NEW_MATCH,
        title: 'Test',
        body: 'Test',
      };

      (notificationService.sendNotification as jest.Mock).mockResolvedValue({
        success: true,
        notificationId: 'notif-123',
      });

      await controller.sendNotification(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
        })
      );
    });

    it('should parse scheduledAt date when provided', async () => {
      const scheduledAt = '2025-01-15T10:00:00Z';

      mockRequest.body = {
        userId: 'user-123',
        type: NotificationType.NEW_MATCH,
        title: 'Test',
        body: 'Test',
        scheduledAt,
      };

      (notificationService.sendNotification as jest.Mock).mockResolvedValue({
        success: true,
        notificationId: 'notif-123',
      });

      await controller.sendNotification(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledAt: expect.any(Date),
        })
      );
    });
  });

  describe('getNotifications', () => {
    it('should return paginated notifications', async () => {
      mockRequest.query = { page: '1', limit: '20', unreadOnly: 'false' };

      (notificationService.getUserNotifications as jest.Mock).mockResolvedValue({
        success: true,
        notifications: [{ id: '1' }, { id: '2' }],
        total: 10,
        unreadCount: 3,
      });

      await controller.getNotifications(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          notifications: expect.arrayContaining([{ id: '1' }, { id: '2' }]),
          total: 10,
          unreadCount: 3,
          page: 1,
          limit: 20,
        })
      );
    });

    it('should use default pagination values', async () => {
      mockRequest.query = {};

      (notificationService.getUserNotifications as jest.Mock).mockResolvedValue({
        success: true,
        notifications: [],
        total: 0,
        unreadCount: 0,
      });

      await controller.getNotifications(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(notificationService.getUserNotifications).toHaveBeenCalledWith(
        'user-123',
        1,
        20,
        false
      );
    });

    it('should filter unread only when specified', async () => {
      mockRequest.query = { unreadOnly: 'true' };

      (notificationService.getUserNotifications as jest.Mock).mockResolvedValue({
        success: true,
        notifications: [],
        total: 0,
        unreadCount: 0,
      });

      await controller.getNotifications(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(notificationService.getUserNotifications).toHaveBeenCalledWith(
        'user-123',
        1,
        20,
        true
      );
    });

    it('should return 500 when service fails', async () => {
      (notificationService.getUserNotifications as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      await controller.getNotifications(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      mockRequest.params = { id: 'notif-123' };

      (notificationService.markAsRead as jest.Mock).mockResolvedValue({
        success: true,
      });

      await controller.markAsRead(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Notification marked as read',
        })
      );
    });

    it('should return 404 when notification not found', async () => {
      mockRequest.params = { id: 'nonexistent' };

      (notificationService.markAsRead as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Notification not found',
      });

      await controller.markAsRead(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      (notificationService.markAllAsRead as jest.Mock).mockResolvedValue({
        success: true,
        count: 5,
      });

      await controller.markAllAsRead(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 5,
        })
      );
    });

    it('should return 500 when service fails', async () => {
      (notificationService.markAllAsRead as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      await controller.markAllAsRead(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      mockRequest.params = { id: 'notif-123' };

      (notificationService.deleteNotification as jest.Mock).mockResolvedValue({
        success: true,
      });

      await controller.deleteNotification(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Notification deleted',
        })
      );
    });

    it('should return 404 when notification not found', async () => {
      mockRequest.params = { id: 'nonexistent' };

      (notificationService.deleteNotification as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Notification not found',
      });

      await controller.deleteNotification(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      const mockPrefs = {
        pushEnabled: true,
        pushNewMatch: true,
        emailEnabled: true,
        quietHoursEnabled: true,
      };

      (notificationService.getPreferences as jest.Mock).mockResolvedValue({
        success: true,
        preferences: mockPrefs,
      });

      await controller.getPreferences(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          preferences: mockPrefs,
        })
      );
    });

    it('should return 500 when service fails', async () => {
      (notificationService.getPreferences as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      await controller.getPreferences(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences successfully', async () => {
      mockRequest.body = {
        pushEnabled: false,
        emailNewMatch: true,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      };

      const updatedPrefs = { ...mockRequest.body };

      (notificationService.updatePreferences as jest.Mock).mockResolvedValue({
        success: true,
        preferences: updatedPrefs,
      });

      await controller.updatePreferences(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          preferences: updatedPrefs,
        })
      );
    });

    it('should return 500 when service fails', async () => {
      mockRequest.body = { pushEnabled: false };

      (notificationService.updatePreferences as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Update failed',
      });

      await controller.updatePreferences(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      (notificationService.getUnreadCount as jest.Mock).mockResolvedValue({
        success: true,
        count: 7,
      });

      await controller.getUnreadCount(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 7,
        })
      );
    });

    it('should return 500 when service fails', async () => {
      (notificationService.getUnreadCount as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      await controller.getUnreadCount(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
    });
  });
});
