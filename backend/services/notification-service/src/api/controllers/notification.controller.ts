/**
 * Notification Controller
 * Handles all notification-related HTTP requests
 */

import { Request, Response } from 'express';

import { notificationService } from '../../services/notification.service';
import {
  SendNotificationRequest,
  NotificationChannel,
  NotificationType,
  NotificationPriority,
} from '../../types';
import logger from '../../utils/logger';

export class NotificationController {
  /**
   * POST /api/notifications/send
   * Send a notification to a user
   */
  async sendNotification(req: Request, res: Response): Promise<void> {
    try {
      const payload: SendNotificationRequest = req.body;

      // Validate required fields
      if (!payload.userId || !payload.type || !payload.title || !payload.body) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, type, title, body',
        });
        return;
      }

      // Validate notification type
      if (!Object.values(NotificationType).includes(payload.type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid notification type',
        });
        return;
      }

      // Validate channels if provided
      if (payload.channels) {
        const validChannels = Object.values(NotificationChannel);
        const invalidChannels = payload.channels.filter((c) => !validChannels.includes(c));

        if (invalidChannels.length > 0) {
          res.status(400).json({
            success: false,
            error: `Invalid channels: ${invalidChannels.join(', ')}`,
          });
          return;
        }
      }

      const result = await notificationService.sendNotification({
        userId: payload.userId,
        type: payload.type,
        channels: payload.channels || [NotificationChannel.PUSH, NotificationChannel.IN_APP],
        title: payload.title,
        body: payload.body,
        data: payload.data,
        imageUrl: payload.imageUrl,
        actionUrl: payload.actionUrl,
        priority: payload.priority || NotificationPriority.NORMAL,
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : undefined,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          notificationId: result.notificationId,
          message: 'Notification sent successfully',
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to send notification',
        });
      }
    } catch (error: any) {
      logger.error('Error in sendNotification controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/notifications
   * Get user's notifications with pagination
   */
  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await notificationService.getUserNotifications(
        userId,
        page,
        limit,
        unreadOnly
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          notifications: result.notifications,
          total: result.total,
          unreadCount: result.unreadCount,
          page,
          limit,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to fetch notifications',
        });
      }
    } catch (error: any) {
      logger.error('Error in getNotifications controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * PUT /api/notifications/:id/read
   * Mark a notification as read
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const notificationId = req.params.id;

      const result = await notificationService.markAsRead(userId, notificationId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Notification marked as read',
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error || 'Notification not found',
        });
      }
    } catch (error: any) {
      logger.error('Error in markAsRead controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * PUT /api/notifications/read-all
   * Mark all notifications as read
   */
  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const result = await notificationService.markAllAsRead(userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'All notifications marked as read',
          count: result.count,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to mark notifications as read',
        });
      }
    } catch (error: any) {
      logger.error('Error in markAllAsRead controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * DELETE /api/notifications/:id
   * Delete a notification
   */
  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const notificationId = req.params.id;

      const result = await notificationService.deleteNotification(userId, notificationId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Notification deleted',
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error || 'Notification not found',
        });
      }
    } catch (error: any) {
      logger.error('Error in deleteNotification controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/notifications/preferences
   * Get user's notification preferences
   */
  async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const result = await notificationService.getPreferences(userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          preferences: result.preferences,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to fetch preferences',
        });
      }
    } catch (error: any) {
      logger.error('Error in getPreferences controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * PUT /api/notifications/preferences
   * Update user's notification preferences
   */
  async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const updates = req.body;

      const result = await notificationService.updatePreferences(userId, updates);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Preferences updated successfully',
          preferences: result.preferences,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to update preferences',
        });
      }
    } catch (error: any) {
      logger.error('Error in updatePreferences controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/notifications/unread-count
   * Get count of unread notifications
   */
  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const result = await notificationService.getUnreadCount(userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          count: result.count,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to get unread count',
        });
      }
    } catch (error: any) {
      logger.error('Error in getUnreadCount controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

export const notificationController = new NotificationController();
