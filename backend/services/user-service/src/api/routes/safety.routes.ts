import { Router, Request, Response } from 'express';

import { sosService } from '../../domain/services/sos.service';
import logger from '../../utils/logger';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All safety routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/safety/sos:
 *   post:
 *     summary: Trigger SOS alert
 *     description: Trigger an emergency SOS alert and notify emergency contacts
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location:
 *                 type: object
 *                 description: User's current location
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     description: GPS latitude
 *                     example: 40.7128
 *                   longitude:
 *                     type: number
 *                     description: GPS longitude
 *                     example: -74.0060
 *                   accuracy:
 *                     type: number
 *                     description: Location accuracy in meters
 *                     example: 10
 *               reason:
 *                 type: string
 *                 description: Optional reason for triggering SOS
 *                 example: "Feeling unsafe on date"
 *     responses:
 *       200:
 *         description: SOS alert triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "SOS alert triggered"
 *                 data:
 *                   type: object
 *                   properties:
 *                     alert:
 *                       type: object
 *                       description: The created SOS alert
 *                     notifiedContacts:
 *                       type: integer
 *                       description: Number of emergency contacts notified
 *                     notificationSummary:
 *                       type: object
 *                       properties:
 *                         totalContacts:
 *                           type: integer
 *                         successfullyNotified:
 *                           type: integer
 *                         failedNotifications:
 *                           type: integer
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 */
router.post('/sos', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { location, reason } = req.body;

    const result = await sosService.triggerSOS(userId, location, reason);

    res.json({
      success: true,
      message: 'SOS alert triggered',
      data: {
        alert: result.alert,
        notifiedContacts: result.notifiedContacts.length,
        notificationSummary: {
          totalContacts: result.notificationSummary.totalContacts,
          successfullyNotified: result.notificationSummary.successfullyNotified,
          failedNotifications: result.notificationSummary.failedNotifications,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to trigger SOS:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to trigger SOS alert',
    });
  }
});

/**
 * @swagger
 * /api/v1/safety/sos/status:
 *   get:
 *     summary: Get active SOS status
 *     description: Check if user has an active SOS alert
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SOS status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasActiveAlert:
 *                       type: boolean
 *                     alert:
 *                       type: object
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 */
router.get('/sos/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const activeAlert = await sosService.getActiveSOSStatus(userId);

    res.json({
      success: true,
      data: {
        hasActiveAlert: !!activeAlert,
        alert: activeAlert,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get SOS status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get SOS status',
    });
  }
});

/**
 * @swagger
 * /api/v1/safety/sos/cancel:
 *   post:
 *     summary: Cancel active SOS alert
 *     description: Cancel an active SOS alert and notify emergency contacts
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - alertId
 *             properties:
 *               alertId:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the SOS alert to cancel
 *     responses:
 *       200:
 *         description: SOS alert cancelled successfully
 *       400:
 *         description: Bad request - alert ID required or alert not active
 *       401:
 *         description: Unauthorized
 */
router.post('/sos/cancel', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { alertId } = req.body;
    if (!alertId) {
      return res.status(400).json({ success: false, message: 'Alert ID required' });
    }

    const alert = await sosService.cancelSOS(userId, alertId);

    res.json({
      success: true,
      message: 'SOS alert cancelled',
      data: { alert },
    });
  } catch (error: any) {
    logger.error('Failed to cancel SOS:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel SOS alert',
    });
  }
});

/**
 * @swagger
 * /api/v1/safety/sos/history:
 *   get:
 *     summary: Get SOS alert history
 *     description: Retrieve user's SOS alert history
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SOS alert history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     alerts:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/sos/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const history = await sosService.getSOSHistory(userId);

    res.json({
      success: true,
      data: { alerts: history },
    });
  } catch (error: any) {
    logger.error('Failed to get SOS history:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get SOS history',
    });
  }
});

/**
 * @swagger
 * /api/v1/safety/sos/{alertId}/notifications:
 *   get:
 *     summary: Get notification status for an SOS alert
 *     description: Retrieve the notification status for all emergency contacts
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The SOS alert ID
 *     responses:
 *       200:
 *         description: Notification status retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/sos/:alertId/notifications', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { alertId } = req.params;
    const notifications = await sosService.getNotificationStatus(alertId);

    res.json({
      success: true,
      data: {
        notifications,
        summary: {
          total: notifications.length,
          sent: notifications.filter((n) => n.status === 'sent' || n.status === 'delivered').length,
          failed: notifications.filter((n) => n.status === 'failed').length,
          pending: notifications.filter((n) => n.status === 'pending' || n.status === 'retrying')
            .length,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to get notification status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get notification status',
    });
  }
});

/**
 * @swagger
 * /api/v1/safety/sos/{alertId}/retry-notifications:
 *   post:
 *     summary: Retry failed notifications for an SOS alert
 *     description: Retry sending notifications that previously failed
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The SOS alert ID
 *     responses:
 *       200:
 *         description: Notifications retried
 *       401:
 *         description: Unauthorized
 */
router.post('/sos/:alertId/retry-notifications', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { alertId } = req.params;
    const retriedCount = await sosService.retryFailedNotifications(alertId);

    res.json({
      success: true,
      message: `Retried ${retriedCount} failed notifications`,
      data: { retriedCount },
    });
  } catch (error: any) {
    logger.error('Failed to retry notifications:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retry notifications',
    });
  }
});

// ==================== EMERGENCY CONTACTS ====================

/**
 * @swagger
 * /api/v1/safety/emergency-contacts:
 *   get:
 *     summary: Get emergency contacts
 *     description: Retrieve user's emergency contacts list
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Emergency contacts retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/emergency-contacts', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const contacts = await sosService.getEmergencyContacts(userId);

    res.json({
      success: true,
      data: { contacts },
    });
  } catch (error: any) {
    logger.error('Failed to get emergency contacts:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get emergency contacts',
    });
  }
});

/**
 * @swagger
 * /api/v1/safety/emergency-contacts:
 *   post:
 *     summary: Add emergency contact
 *     description: Add a new emergency contact
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - relationship
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               relationship:
 *                 type: string
 *                 enum: [family, friend, partner, other]
 *               notify_on_sos:
 *                 type: boolean
 *               notify_on_checkin_miss:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Emergency contact added
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/emergency-contacts', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { name, phone, email, relationship, notify_on_sos, notify_on_checkin_miss } = req.body;

    if (!name || !phone || !relationship) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and relationship are required',
      });
    }

    const contact = await sosService.addEmergencyContact({
      user_id: userId,
      name,
      phone,
      email,
      relationship,
      notify_on_sos,
      notify_on_checkin_miss,
    });

    res.status(201).json({
      success: true,
      message: 'Emergency contact added',
      data: { contact },
    });
  } catch (error: any) {
    logger.error('Failed to add emergency contact:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to add emergency contact',
    });
  }
});

/**
 * @swagger
 * /api/v1/safety/emergency-contacts/{contactId}:
 *   put:
 *     summary: Update emergency contact
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Emergency contact updated
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.put('/emergency-contacts/:contactId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { contactId } = req.params;
    const updates = req.body;

    const contact = await sosService.updateEmergencyContact(contactId, userId, updates);

    res.json({
      success: true,
      message: 'Emergency contact updated',
      data: { contact },
    });
  } catch (error: any) {
    logger.error('Failed to update emergency contact:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update emergency contact',
    });
  }
});

/**
 * @swagger
 * /api/v1/safety/emergency-contacts/{contactId}:
 *   delete:
 *     summary: Delete emergency contact
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Emergency contact deleted
 *       404:
 *         description: Emergency contact not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/emergency-contacts/:contactId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { contactId } = req.params;
    const deleted = await sosService.removeEmergencyContact(contactId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contact not found',
      });
    }

    res.json({
      success: true,
      message: 'Emergency contact removed',
    });
  } catch (error: any) {
    logger.error('Failed to delete emergency contact:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete emergency contact',
    });
  }
});

// ==================== SAFETY CHECKINS ====================

/**
 * @swagger
 * /api/v1/safety/checkins:
 *   get:
 *     summary: Get active check-ins
 *     description: Retrieve user's active safety check-ins
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Check-ins retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/checkins', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const checkins = await sosService.getActiveCheckins(userId);

    res.json({
      success: true,
      data: { checkins },
    });
  } catch (error: any) {
    logger.error('Failed to get check-ins:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get check-ins',
    });
  }
});

/**
 * @swagger
 * /api/v1/safety/checkins:
 *   post:
 *     summary: Create safety check-in
 *     description: Schedule a safety check-in for a date or meeting
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduled_at
 *             properties:
 *               scheduled_at:
 *                 type: string
 *                 format: date-time
 *                 description: When the check-in should occur
 *               meeting_details:
 *                 type: object
 *                 properties:
 *                   location:
 *                     type: string
 *                   with_user_id:
 *                     type: string
 *                   notes:
 *                     type: string
 *     responses:
 *       201:
 *         description: Check-in created
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/checkins', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { scheduled_at, meeting_details } = req.body;

    if (!scheduled_at) {
      return res.status(400).json({
        success: false,
        message: 'scheduled_at is required',
      });
    }

    const checkin = await sosService.createCheckin({
      user_id: userId,
      scheduled_at: new Date(scheduled_at),
      meeting_details,
    });

    res.status(201).json({
      success: true,
      message: 'Check-in created',
      data: { checkin },
    });
  } catch (error: any) {
    logger.error('Failed to create check-in:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create check-in',
    });
  }
});

/**
 * @swagger
 * /api/v1/safety/checkins/{checkinId}/confirm:
 *   post:
 *     summary: Confirm check-in (I'm safe)
 *     description: User confirms they are safe
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: checkinId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Check-in confirmed
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/checkins/:checkinId/confirm', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { checkinId } = req.params;
    const checkin = await sosService.performCheckin(checkinId, userId);

    res.json({
      success: true,
      message: 'Check-in confirmed',
      data: { checkin },
    });
  } catch (error: any) {
    logger.error('Failed to confirm check-in:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to confirm check-in',
    });
  }
});

/**
 * @swagger
 * /api/v1/safety/checkins/{checkinId}/cancel:
 *   post:
 *     summary: Cancel check-in
 *     description: Cancel a scheduled check-in
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: checkinId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Check-in cancelled
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/checkins/:checkinId/cancel', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { checkinId } = req.params;
    const checkin = await sosService.cancelCheckin(checkinId, userId);

    res.json({
      success: true,
      message: 'Check-in cancelled',
      data: { checkin },
    });
  } catch (error: any) {
    logger.error('Failed to cancel check-in:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel check-in',
    });
  }
});

// ==================== CRISIS RESOURCES ====================

/**
 * @swagger
 * /api/v1/safety/crisis-resources:
 *   get:
 *     summary: Get crisis resources
 *     description: Get crisis hotlines and resources for emergency assistance
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Filter resources by region (e.g., 'US')
 *     responses:
 *       200:
 *         description: Crisis resources retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/crisis-resources', async (req: Request, res: Response) => {
  try {
    const region = req.query.region as string | undefined;
    const resources = sosService.getCrisisResources(region);

    res.json({
      success: true,
      data: { resources },
    });
  } catch (error: any) {
    logger.error('Failed to get crisis resources:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get crisis resources',
    });
  }
});

export default router;
