import { Router, Request, Response } from 'express';
import { sosService } from '../../domain/services/sos.service';
import { authenticate } from '../middleware/auth.middleware';
import logger from '../../utils/logger';

const router = Router();

// All safety routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/safety/sos:
 *   post:
 *     summary: Trigger SOS alert
 *     description: Trigger an emergency SOS alert and notify emergency contacts
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   accuracy:
 *                     type: number
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: SOS alert triggered
 *       401:
 *         description: Unauthorized
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
 * /api/safety/sos/status:
 *   get:
 *     summary: Get active SOS status
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
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
 * /api/safety/sos/cancel:
 *   post:
 *     summary: Cancel active SOS alert
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
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
 * /api/safety/sos/history:
 *   get:
 *     summary: Get SOS alert history
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
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

// ==================== EMERGENCY CONTACTS ====================

/**
 * @swagger
 * /api/safety/emergency-contacts:
 *   get:
 *     summary: Get emergency contacts
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
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
 * /api/safety/emergency-contacts:
 *   post:
 *     summary: Add emergency contact
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
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
 * /api/safety/emergency-contacts/{contactId}:
 *   put:
 *     summary: Update emergency contact
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
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
 * /api/safety/emergency-contacts/{contactId}:
 *   delete:
 *     summary: Delete emergency contact
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
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
 * /api/safety/checkins:
 *   get:
 *     summary: Get active check-ins
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
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
 * /api/safety/checkins:
 *   post:
 *     summary: Create safety check-in
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
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
 * /api/safety/checkins/{checkinId}/confirm:
 *   post:
 *     summary: Confirm check-in (I'm safe)
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
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
 * /api/safety/checkins/{checkinId}/cancel:
 *   post:
 *     summary: Cancel check-in
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
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
 * /api/safety/crisis-resources:
 *   get:
 *     summary: Get crisis resources
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
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
