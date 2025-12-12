import { Router, Request, Response } from 'express';
import moderationService from '../services/moderation.service';
import { ModerateImageRequest, ModerateTextRequest } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('moderation-routes');
const router = Router();

/**
 * POST /api/moderation/image
 * Moderate an image
 */
router.post('/image', async (req: Request, res: Response) => {
  try {
    const request: ModerateImageRequest = req.body;

    // Validate request
    if (!request.contentId || !request.imageUrl || !request.userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: contentId, imageUrl, userId',
      });
    }

    const result = await moderationService.moderateImage(request);

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    logger.error('Image moderation endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Image moderation failed',
    });
  }
});

/**
 * POST /api/moderation/text
 * Moderate text content
 */
router.post('/text', async (req: Request, res: Response) => {
  try {
    const request: ModerateTextRequest = req.body;

    // Validate request
    if (!request.contentId || !request.text || !request.userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: contentId, text, userId',
      });
    }

    const result = await moderationService.moderateText(request);

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    logger.error('Text moderation endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Text moderation failed',
    });
  }
});

/**
 * GET /api/moderation/user/:userId/status
 * Get user moderation status
 */
router.get('/user/:userId/status', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const status = await moderationService.getUserModerationStatus(userId);

    if (!status) {
      return res.json({
        userId,
        status: 'active',
        totalViolations: 0,
        severeViolations: 0,
      });
    }

    res.json(status);
  } catch (error: any) {
    logger.error('Get user status error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get user status',
    });
  }
});

/**
 * GET /api/moderation/user/:userId/restricted
 * Check if user is restricted (banned/suspended)
 */
router.get('/user/:userId/restricted', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const restriction = await moderationService.isUserRestricted(userId);

    res.json(restriction);
  } catch (error: any) {
    logger.error('Check restriction error:', error);
    res.status(500).json({
      error: error.message || 'Failed to check restriction',
    });
  }
});

/**
 * GET /api/moderation/user/:userId/violations
 * Get user violation history
 */
router.get('/user/:userId/violations', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const violations = await moderationService.getUserViolationHistory(userId, limit);

    res.json({
      userId,
      violations,
      count: violations.length,
    });
  } catch (error: any) {
    logger.error('Get violation history error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get violation history',
    });
  }
});

/**
 * POST /api/moderation/admin/suspend
 * Admin: Manually suspend a user
 * Body: { userId, suspensionDays, reason, adminId }
 */
router.post('/admin/suspend', async (req: Request, res: Response) => {
  try {
    const { userId, suspensionDays, reason, adminId } = req.body;

    // Validate request
    if (!userId || !suspensionDays || !reason || !adminId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, suspensionDays, reason, adminId',
      });
    }

    if (suspensionDays <= 0 || suspensionDays > 365) {
      return res.status(400).json({
        success: false,
        error: 'suspensionDays must be between 1 and 365',
      });
    }

    await moderationService.adminSuspendUser(userId, suspensionDays, reason, adminId);

    res.json({
      success: true,
      message: `User ${userId} suspended for ${suspensionDays} days`,
    });
  } catch (error: any) {
    logger.error('Admin suspend error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to suspend user',
    });
  }
});

/**
 * POST /api/moderation/admin/unsuspend
 * Admin: Manually unsuspend a user
 * Body: { userId, adminId, reason }
 */
router.post('/admin/unsuspend', async (req: Request, res: Response) => {
  try {
    const { userId, adminId, reason } = req.body;

    // Validate request
    if (!userId || !adminId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, adminId, reason',
      });
    }

    await moderationService.adminUnsuspendUser(userId, adminId, reason);

    res.json({
      success: true,
      message: `User ${userId} unsuspended`,
    });
  } catch (error: any) {
    logger.error('Admin unsuspend error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to unsuspend user',
    });
  }
});

/**
 * POST /api/moderation/admin/ban
 * Admin: Permanently ban a user
 * Body: { userId, reason, adminId }
 */
router.post('/admin/ban', async (req: Request, res: Response) => {
  try {
    const { userId, reason, adminId } = req.body;

    // Validate request
    if (!userId || !reason || !adminId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, reason, adminId',
      });
    }

    await moderationService.adminBanUser(userId, reason, adminId);

    res.json({
      success: true,
      message: `User ${userId} permanently banned`,
    });
  } catch (error: any) {
    logger.error('Admin ban error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to ban user',
    });
  }
});

/**
 * POST /api/moderation/admin/unban
 * Admin: Unban a user
 * Body: { userId, adminId, reason }
 */
router.post('/admin/unban', async (req: Request, res: Response) => {
  try {
    const { userId, adminId, reason } = req.body;

    // Validate request
    if (!userId || !adminId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, adminId, reason',
      });
    }

    await moderationService.adminUnbanUser(userId, adminId, reason);

    res.json({
      success: true,
      message: `User ${userId} unbanned`,
    });
  } catch (error: any) {
    logger.error('Admin unban error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to unban user',
    });
  }
});

export default router;
