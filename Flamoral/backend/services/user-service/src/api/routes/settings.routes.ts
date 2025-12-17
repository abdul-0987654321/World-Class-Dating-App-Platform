/**
 * User Settings Routes
 * Manage account, privacy, notifications, and preferences
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { settingsService } from '../../services/settings.service';
import logger from '../../utils/logger';
import {
  updateAccountSettingsSchema,
  updatePrivacySettingsSchema,
  updateNotificationSettingsSchema,
  updateMatchPreferencesSchema,
  deleteAccountSchema,
} from '../validators/settings.validator';

const router = express.Router();

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get all user settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User settings retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 settings:
 *                   type: object
 *                   properties:
 *                     account:
 *                       type: object
 *                     privacy:
 *                       type: object
 *                     notifications:
 *                       type: object
 *                     preferences:
 *                       type: object
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const settings = await settingsService.getAllSettings(userId);

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error: any) {
    logger.error('Failed to get settings', {
      userId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve settings',
    });
  }
});

/**
 * @swagger
 * /api/settings/account:
 *   patch:
 *     summary: Update account settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account settings updated
 *       400:
 *         description: Invalid data or current password incorrect
 */
router.patch('/account', requireAuth, validate(updateAccountSettingsSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const updates = req.body;

    const result = await settingsService.updateAccountSettings(userId, updates);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Failed to update account settings', {
      userId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update account settings',
    });
  }
});

/**
 * @swagger
 * /api/settings/privacy:
 *   patch:
 *     summary: Update privacy settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               showOnlineStatus:
 *                 type: boolean
 *               showDistance:
 *                 type: boolean
 *               showAge:
 *                 type: boolean
 *               readReceipts:
 *                 type: boolean
 *               incognitoMode:
 *                 type: boolean
 *               onlyMatchedUsersCanMessage:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Privacy settings updated
 */
router.patch('/privacy', requireAuth, validate(updatePrivacySettingsSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const privacySettings = req.body;

    const result = await settingsService.updatePrivacySettings(userId, privacySettings);

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Failed to update privacy settings', {
      userId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update privacy settings',
    });
  }
});

/**
 * @swagger
 * /api/settings/notifications:
 *   patch:
 *     summary: Update notification preferences
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pushNotifications:
 *                 type: boolean
 *               emailNotifications:
 *                 type: boolean
 *               smsNotifications:
 *                 type: boolean
 *               newMatches:
 *                 type: boolean
 *               newMessages:
 *                 type: boolean
 *               likes:
 *                 type: boolean
 *               superLikes:
 *                 type: boolean
 *               promotions:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Notification preferences updated
 */
router.patch('/notifications', requireAuth, validate(updateNotificationSettingsSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notificationSettings = req.body;

    const result = await settingsService.updateNotificationSettings(
      userId,
      notificationSettings
    );

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Failed to update notification settings', {
      userId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update notification settings',
    });
  }
});

/**
 * @swagger
 * /api/settings/preferences:
 *   patch:
 *     summary: Update match preferences
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               interestedIn:
 *                 type: array
 *                 items:
 *                   type: string
 *               minAge:
 *                 type: integer
 *               maxAge:
 *                 type: integer
 *               maxDistance:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Match preferences updated
 */
router.patch('/preferences', requireAuth, validate(updateMatchPreferencesSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const preferences = req.body;

    const result = await settingsService.updateMatchPreferences(userId, preferences);

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Failed to update match preferences', {
      userId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update match preferences',
    });
  }
});

/**
 * @swagger
 * /api/settings/blocked-users:
 *   get:
 *     summary: Get blocked users list
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Blocked users list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 blockedUsers:
 *                   type: array
 */
router.get('/blocked-users', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await settingsService.getBlockedUsers(userId);

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Failed to get blocked users', {
      userId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve blocked users',
    });
  }
});

/**
 * @swagger
 * /api/settings/blocked-users/{userId}:
 *   delete:
 *     summary: Unblock a user
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User unblocked
 *       404:
 *         description: Block not found
 */
router.delete('/blocked-users/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const blockerId = req.user!.userId;
    const blockedUserId = req.params.userId;

    const result = await settingsService.unblockUser(blockerId, blockedUserId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Failed to unblock user', {
      userId: req.user?.id,
      blockedUserId: req.params.userId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to unblock user',
    });
  }
});

/**
 * @swagger
 * /api/settings/data-export:
 *   post:
 *     summary: Request data export (GDPR)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     description: Request a copy of all user data for GDPR compliance
 *     responses:
 *       200:
 *         description: Data export initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 downloadUrl:
 *                   type: string
 */
router.post('/data-export', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await settingsService.exportUserData(userId);

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Failed to export user data', {
      userId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to export data',
    });
  }
});

/**
 * @swagger
 * /api/settings/account:
 *   delete:
 *     summary: Delete account
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - reason
 *             properties:
 *               password:
 *                 type: string
 *               reason:
 *                 type: string
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account deleted
 *       400:
 *         description: Invalid password
 */
router.delete('/account', requireAuth, validate(deleteAccountSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { password, reason, feedback } = req.body;

    const result = await settingsService.deleteAccount(userId, password, reason, feedback);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Failed to delete account', {
      userId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to delete account',
    });
  }
});

export default router;
