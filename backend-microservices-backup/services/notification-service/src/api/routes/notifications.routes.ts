/**
 * Notification Routes
 * API endpoints for push notification management
 */

import { Router, Request, Response } from 'express';
import { pushNotificationService, NotificationType } from '../../services/push-notification.service';
import { requireAuth } from '../../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/notifications/register-device:
 *   post:
 *     summary: Register FCM token for push notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - deviceType
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM registration token
 *               deviceType:
 *                 type: string
 *                 enum: [ios, android, web]
 *                 description: Device platform
 *               deviceName:
 *                 type: string
 *                 description: Optional device name
 *     responses:
 *       200:
 *         description: Token registered successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/register-device', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { token, deviceType, deviceName } = req.body;

    if (!token || !deviceType) {
      return res.status(400).json({
        success: false,
        error: 'Token and deviceType are required',
      });
    }

    if (!['ios', 'android', 'web'].includes(deviceType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid deviceType. Must be ios, android, or web',
      });
    }

    const result = await pushNotificationService.registerToken(
      userId,
      token,
      deviceType,
      deviceName
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in register-device:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/notifications/unregister-device:
 *   post:
 *     summary: Unregister FCM token
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM token to unregister
 *     responses:
 *       200:
 *         description: Token unregistered successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/unregister-device', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
      });
    }

    const result = await pushNotificationService.unregisterToken(userId, token);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in unregister-device:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/notifications/devices:
 *   get:
 *     summary: Get all registered devices
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of registered devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 devices:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       deviceType:
 *                         type: string
 *                       deviceName:
 *                         type: string
 *                       lastUsedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/devices', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const devices = await pushNotificationService.getUserTokens(userId);

    // Don't expose full tokens in response
    const sanitizedDevices = devices.map(d => ({
      id: d.id,
      deviceType: d.device_type,
      deviceName: d.device_name,
      lastUsedAt: d.last_used_at,
      createdAt: d.created_at,
    }));

    res.status(200).json({
      success: true,
      devices: sanitizedDevices,
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/notifications/history:
 *   get:
 *     summary: Get notification history
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of notifications to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: Notification history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pushNotificationService.getNotificationHistory(
      userId,
      limit,
      offset
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 */
router.patch('/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const notificationId = req.params.id;

    const result = await pushNotificationService.markAsRead(userId, notificationId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 */
router.patch('/read-all', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pushNotificationService.markAllAsRead(userId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/unread-count', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await pushNotificationService.getUnreadCount(userId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/notifications/test:
 *   post:
 *     summary: Send test notification (development only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [new_match, new_message, new_like, super_like]
 *     responses:
 *       200:
 *         description: Test notification sent
 *       401:
 *         description: Unauthorized
 */
router.post('/test', requireAuth, async (req: Request, res: Response) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Test notifications not allowed in production',
      });
    }

    const userId = req.user!.id;
    const { type } = req.body;

    let result;
    switch (type) {
      case 'new_match':
        result = await pushNotificationService.notifyNewMatch(
          userId,
          'test-user-id',
          'Test User',
          'https://via.placeholder.com/150'
        );
        break;
      case 'new_message':
        result = await pushNotificationService.notifyNewMessage(
          userId,
          'test-user-id',
          'Test User',
          'Hey! How are you?',
          'https://via.placeholder.com/150'
        );
        break;
      case 'new_like':
        result = await pushNotificationService.notifyNewLike(
          userId,
          'test-user-id',
          'Test User',
          'https://via.placeholder.com/150'
        );
        break;
      case 'super_like':
        result = await pushNotificationService.notifySuperLike(
          userId,
          'test-user-id',
          'Test User',
          'https://via.placeholder.com/150'
        );
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid notification type',
        });
    }

    res.status(200).json({
      success: true,
      message: 'Test notification sent',
      result,
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
