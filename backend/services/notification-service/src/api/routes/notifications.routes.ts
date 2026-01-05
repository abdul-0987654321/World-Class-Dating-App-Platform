/**
 * Notification Routes
 * API endpoints for notification management
 */

import { Router } from 'express';

import { requireAuth } from '../../middleware/auth';
import { notificationRateLimiter, apiRateLimiter } from '../../middleware/rate-limit';
import { notificationController } from '../controllers/notification.controller';

const router = Router();

// ===== Core Notification Endpoints =====

/**
 * @swagger
 * /api/notifications/send:
 *   post:
 *     summary: Send notification to a user
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
 *               - userId
 *               - type
 *               - title
 *               - body
 *             properties:
 *               userId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [new_match, new_message, new_like, subscription_update, payment_success, payment_failed, profile_boost_active, verification_complete]
 *               channels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [push, email, sms, in_app]
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               data:
 *                 type: object
 *               imageUrl:
 *                 type: string
 *               actionUrl:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post(
  '/send',
  requireAuth,
  notificationRateLimiter,
  notificationController.sendNotification.bind(notificationController)
);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user's notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 */
router.get(
  '/',
  requireAuth,
  apiRateLimiter,
  notificationController.getNotifications.bind(notificationController)
);

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
 *         description: Unread count retrieved
 */
router.get(
  '/unread-count',
  requireAuth,
  apiRateLimiter,
  notificationController.getUnreadCount.bind(notificationController)
);

/**
 * @swagger
 * /api/notifications/:id/read:
 *   put:
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
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 */
router.put(
  '/:id/read',
  requireAuth,
  apiRateLimiter,
  notificationController.markAsRead.bind(notificationController)
);

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.put(
  '/read-all',
  requireAuth,
  apiRateLimiter,
  notificationController.markAllAsRead.bind(notificationController)
);

/**
 * @swagger
 * /api/notifications/:id:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification deleted
 *       404:
 *         description: Notification not found
 */
router.delete(
  '/:id',
  requireAuth,
  apiRateLimiter,
  notificationController.deleteNotification.bind(notificationController)
);

/**
 * @swagger
 * /api/notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved
 */
router.get(
  '/preferences',
  requireAuth,
  apiRateLimiter,
  notificationController.getPreferences.bind(notificationController)
);

/**
 * @swagger
 * /api/notifications/preferences:
 *   put:
 *     summary: Update notification preferences
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
 *               pushEnabled:
 *                 type: boolean
 *               pushNewMatch:
 *                 type: boolean
 *               pushNewMessage:
 *                 type: boolean
 *               emailEnabled:
 *                 type: boolean
 *               smsEnabled:
 *                 type: boolean
 *               quietHoursEnabled:
 *                 type: boolean
 *               quietHoursStart:
 *                 type: string
 *               quietHoursEnd:
 *                 type: string
 *     responses:
 *       200:
 *         description: Preferences updated
 */
router.put(
  '/preferences',
  requireAuth,
  apiRateLimiter,
  notificationController.updatePreferences.bind(notificationController)
);

export default router;
