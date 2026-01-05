/**
 * Panic Button / Emergency Routes
 * API endpoints for panic button and emergency features
 */

import { Router, Response } from 'express';

import { panicButtonService } from '../../services/panic-button.service';
import logger from '../../utils/logger';
import { AuthRequest, authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/v1/panic/trigger
 * Trigger panic button - immediate emergency response
 */
router.post('/trigger', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const {
      location,
      reason,
      triggerType,
      relatedMatchId,
      relatedUserId,
      enableLiveLocation,
      enableAudioRecording,
      contactEmergencyServices,
    } = req.body;

    const result = await panicButtonService.triggerPanic(userId, {
      location,
      reason,
      triggerType,
      relatedMatchId,
      relatedUserId,
      enableLiveLocation,
      enableAudioRecording,
      contactEmergencyServices,
    });

    return res.status(201).json({
      success: true,
      message: 'Panic alert triggered successfully',
      data: {
        panicEvent: result.panicEvent,
        contactsNotified: result.sosResult.notifiedContacts.length,
        emergencyServicesContacted: result.emergencyServicesContacted,
      },
    });
  } catch (error: any) {
    logger.error('Failed to trigger panic:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to trigger panic alert',
    });
  }
});

/**
 * POST /api/v1/panic/:panicEventId/location
 * Update location for active panic event (live tracking)
 */
router.post('/:panicEventId/location', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { panicEventId } = req.params;
    const { latitude, longitude, accuracy, address, venueName } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    await panicButtonService.updatePanicLocation(userId, panicEventId, {
      latitude,
      longitude,
      accuracy,
      address,
      venueName,
    });

    return res.json({
      success: true,
      message: 'Location updated',
    });
  } catch (error: any) {
    logger.error('Failed to update panic location:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update location',
    });
  }
});

/**
 * POST /api/v1/panic/:panicEventId/emergency-services
 * Request emergency services contact
 */
router.post('/:panicEventId/emergency-services', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { panicEventId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const result = await panicButtonService.requestEmergencyServices(userId, panicEventId);

    return res.json({
      success: result.success,
      message: result.success
        ? 'Emergency services contact initiated'
        : 'Failed to contact emergency services',
      data: {
        referenceNumber: result.referenceNumber,
      },
    });
  } catch (error: any) {
    logger.error('Failed to request emergency services:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to contact emergency services',
    });
  }
});

/**
 * POST /api/v1/panic/:panicEventId/resolve
 * Resolve panic event (user confirms safety)
 */
router.post('/:panicEventId/resolve', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { panicEventId } = req.params;
    const { resolutionNotes, isFalseAlarm } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const event = await panicButtonService.resolvePanic(userId, panicEventId, {
      resolutionNotes,
      isFalseAlarm,
    });

    return res.json({
      success: true,
      message: 'Panic event resolved',
      data: event,
    });
  } catch (error: any) {
    logger.error('Failed to resolve panic:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to resolve panic event',
    });
  }
});

/**
 * GET /api/v1/panic/active
 * Get active panic events for the current user
 */
router.get('/active', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const events = await panicButtonService.getActivePanicEvents(userId);

    return res.json({
      success: true,
      data: events,
    });
  } catch (error: any) {
    logger.error('Failed to get active panic events:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get active events',
    });
  }
});

/**
 * GET /api/v1/panic/history
 * Get panic event history for the current user
 */
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { limit } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const events = await panicButtonService.getPanicHistory(userId, {
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    return res.json({
      success: true,
      data: events,
    });
  } catch (error: any) {
    logger.error('Failed to get panic history:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get event history',
    });
  }
});

/**
 * GET /api/v1/panic/:panicEventId
 * Get a specific panic event
 */
router.get('/:panicEventId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { panicEventId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const event = await panicButtonService.getPanicEvent(panicEventId, userId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Panic event not found',
      });
    }

    return res.json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    logger.error('Failed to get panic event:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get panic event',
    });
  }
});

/**
 * GET /api/v1/panic/resources
 * Get emergency resources (crisis hotlines, etc.)
 */
router.get('/resources', async (req: AuthRequest, res: Response) => {
  try {
    const { region } = req.query;

    const resources = panicButtonService.getEmergencyResources(region as string);

    return res.json({
      success: true,
      data: resources,
    });
  } catch (error: any) {
    logger.error('Failed to get emergency resources:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get resources',
    });
  }
});

export default router;
