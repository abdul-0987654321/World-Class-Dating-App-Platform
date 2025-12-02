import { Router, Request, Response } from 'express';
import { authenticateService } from '../../middleware/service-auth.middleware';
import { NotificationService } from '../../services/notification.service';

const router = Router();

// All internal routes require service authentication
router.use(authenticateService);

/**
 * Internal endpoint: Send notification to user
 * POST /api/internal/notifications/send
 *
 * Request body:
 * {
 *   userId: string;
 *   type: string;
 *   title: string;
 *   body: string;
 *   data?: Record<string, any>;
 *   channel?: 'push' | 'email' | 'sms' | 'all';
 * }
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { userId, type, title, body, data, channel = 'push' } = req.body;

    // Validate required fields
    if (!userId || !type || !title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'userId, type, title, and body are required',
      });
    }

    const notificationService = new NotificationService();

    // Send notification based on channel
    if (channel === 'push' || channel === 'all') {
      await notificationService.sendPushNotification({
        userId,
        title,
        body,
        data: {
          type,
          ...data,
        },
      });
    }

    if (channel === 'email' || channel === 'all') {
      await notificationService.sendEmailNotification({
        userId,
        subject: title,
        body,
        data: {
          type,
          ...data,
        },
      });
    }

    if (channel === 'sms' || channel === 'all') {
      await notificationService.sendSMSNotification({
        userId,
        message: `${title}: ${body}`,
        data: {
          type,
          ...data,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
      data: {
        userId,
        type,
        channel,
      },
    });
  } catch (error: any) {
    console.error('[InternalAPI] Send notification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send notification',
      code: 'NOTIFICATION_SEND_FAILED',
      message: error.message || 'An error occurred while sending notification',
    });
  }
});

/**
 * Internal endpoint: Send bulk notifications
 * POST /api/internal/notifications/send-bulk
 *
 * Request body:
 * {
 *   notifications: Array<{
 *     userId: string;
 *     type: string;
 *     title: string;
 *     body: string;
 *     data?: Record<string, any>;
 *     channel?: 'push' | 'email' | 'sms' | 'all';
 *   }>;
 * }
 */
router.post('/send-bulk', async (req: Request, res: Response) => {
  try {
    const { notifications } = req.body;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        code: 'INVALID_REQUEST',
        message: 'notifications must be a non-empty array',
      });
    }

    const notificationService = new NotificationService();
    const results = [];
    const errors = [];

    // Process notifications in parallel
    await Promise.allSettled(
      notifications.map(async (notification, index) => {
        try {
          const { userId, type, title, body, data, channel = 'push' } = notification;

          if (!userId || !type || !title || !body) {
            errors.push({
              index,
              error: 'Missing required fields',
              notification,
            });
            return;
          }

          if (channel === 'push' || channel === 'all') {
            await notificationService.sendPushNotification({
              userId,
              title,
              body,
              data: { type, ...data },
            });
          }

          if (channel === 'email' || channel === 'all') {
            await notificationService.sendEmailNotification({
              userId,
              subject: title,
              body,
              data: { type, ...data },
            });
          }

          if (channel === 'sms' || channel === 'all') {
            await notificationService.sendSMSNotification({
              userId,
              message: `${title}: ${body}`,
              data: { type, ...data },
            });
          }

          results.push({
            index,
            userId,
            success: true,
          });
        } catch (error: any) {
          errors.push({
            index,
            error: error.message,
            notification,
          });
        }
      })
    );

    return res.status(200).json({
      success: true,
      message: `Sent ${results.length} notifications`,
      data: {
        total: notifications.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error: any) {
    console.error('[InternalAPI] Send bulk notifications error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send bulk notifications',
      code: 'BULK_NOTIFICATION_SEND_FAILED',
      message: error.message || 'An error occurred while sending bulk notifications',
    });
  }
});

/**
 * Internal endpoint: Get notification preferences for user
 * GET /api/internal/notifications/preferences/:userId
 */
router.get('/preferences/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const notificationService = new NotificationService();
    const preferences = await notificationService.getUserPreferences(userId);

    return res.status(200).json({
      success: true,
      data: preferences,
    });
  } catch (error: any) {
    console.error('[InternalAPI] Get notification preferences error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get notification preferences',
      code: 'GET_PREFERENCES_FAILED',
      message: error.message || 'An error occurred while getting notification preferences',
    });
  }
});

export default router;
