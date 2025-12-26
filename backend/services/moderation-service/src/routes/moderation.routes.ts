import { Router, Request, Response } from 'express';
import moderationService from '../services/moderation.service';
import { ModerateImageRequest, ModerateTextRequest } from '../types';
import { createLogger } from '../utils/logger';
import {
  authenticateJWT,
  requireModerator,
  requireAdmin,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import db from '../infrastructure/database/connection';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('moderation-routes');
const router = Router();

/**
 * SECURITY: All moderation routes require authentication.
 * Apply JWT authentication to all routes in this router.
 */
router.use(authenticateJWT);

/**
 * POST /api/moderation/image
 * Moderate an image
 *
 * SECURITY: Requires moderator access to trigger manual image moderation.
 * For automated moderation, use internal service routes.
 */
router.post('/image', requireModerator, async (req: Request, res: Response) => {
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
 *
 * SECURITY: Requires moderator access to trigger manual text moderation.
 * For automated moderation, use internal service routes.
 */
router.post('/text', requireModerator, async (req: Request, res: Response) => {
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
 *
 * SECURITY: Requires moderator access to view user moderation records.
 */
router.get('/user/:userId/status', requireModerator, async (req: Request, res: Response) => {
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
 *
 * SECURITY: Requires moderator access to view restriction status.
 */
router.get('/user/:userId/restricted', requireModerator, async (req: Request, res: Response) => {
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
 *
 * SECURITY: Requires moderator access to view violation history.
 */
router.get('/user/:userId/violations', requireModerator, async (req: Request, res: Response) => {
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
 * Body: { targetUserId, suspensionDays, reason }
 *
 * SECURITY: Admin ID is extracted from authenticated JWT token, NOT from request body.
 * This prevents admin impersonation attacks where an attacker could specify
 * another admin's ID in the request body.
 */
router.post('/admin/suspend', requireAdmin, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const adminId = authReq.user.id; // SECURE: From authenticated JWT, not request body

    const { targetUserId, suspensionDays, reason } = req.body;

    // Validate request
    if (!targetUserId || !suspensionDays || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: targetUserId, suspensionDays, reason',
      });
    }

    if (suspensionDays <= 0 || suspensionDays > 365) {
      return res.status(400).json({
        success: false,
        error: 'suspensionDays must be between 1 and 365',
      });
    }

    // Prevent self-suspension
    if (targetUserId === adminId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot suspend yourself',
      });
    }

    await moderationService.adminSuspendUser(targetUserId, suspensionDays, reason, adminId);

    // Audit log the action
    await logModerationAction({
      action: 'admin_suspend_user',
      adminId,
      targetUserId,
      details: { suspensionDays, reason },
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    logger.info(`Admin ${adminId} suspended user ${targetUserId} for ${suspensionDays} days`);

    res.json({
      success: true,
      message: `User ${targetUserId} suspended for ${suspensionDays} days`,
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
 * Body: { targetUserId, reason }
 *
 * SECURITY: Admin ID is extracted from authenticated JWT token, NOT from request body.
 */
router.post('/admin/unsuspend', requireAdmin, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const adminId = authReq.user.id; // SECURE: From authenticated JWT, not request body

    const { targetUserId, reason } = req.body;

    // Validate request
    if (!targetUserId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: targetUserId, reason',
      });
    }

    await moderationService.adminUnsuspendUser(targetUserId, adminId, reason);

    // Audit log the action
    await logModerationAction({
      action: 'admin_unsuspend_user',
      adminId,
      targetUserId,
      details: { reason },
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    logger.info(`Admin ${adminId} unsuspended user ${targetUserId}`);

    res.json({
      success: true,
      message: `User ${targetUserId} unsuspended`,
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
 * Body: { targetUserId, reason }
 *
 * SECURITY: Admin ID is extracted from authenticated JWT token, NOT from request body.
 */
router.post('/admin/ban', requireAdmin, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const adminId = authReq.user.id; // SECURE: From authenticated JWT, not request body

    const { targetUserId, reason } = req.body;

    // Validate request
    if (!targetUserId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: targetUserId, reason',
      });
    }

    // Prevent self-ban
    if (targetUserId === adminId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot ban yourself',
      });
    }

    await moderationService.adminBanUser(targetUserId, reason, adminId);

    // Audit log the action
    await logModerationAction({
      action: 'admin_ban_user',
      adminId,
      targetUserId,
      details: { reason },
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    logger.info(`Admin ${adminId} permanently banned user ${targetUserId}`);

    res.json({
      success: true,
      message: `User ${targetUserId} permanently banned`,
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
 * Body: { targetUserId, reason }
 *
 * SECURITY: Admin ID is extracted from authenticated JWT token, NOT from request body.
 */
router.post('/admin/unban', requireAdmin, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const adminId = authReq.user.id; // SECURE: From authenticated JWT, not request body

    const { targetUserId, reason } = req.body;

    // Validate request
    if (!targetUserId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: targetUserId, reason',
      });
    }

    await moderationService.adminUnbanUser(targetUserId, adminId, reason);

    // Audit log the action
    await logModerationAction({
      action: 'admin_unban_user',
      adminId,
      targetUserId,
      details: { reason },
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    logger.info(`Admin ${adminId} unbanned user ${targetUserId}`);

    res.json({
      success: true,
      message: `User ${targetUserId} unbanned`,
    });
  } catch (error: any) {
    logger.error('Admin unban error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to unban user',
    });
  }
});

/**
 * Audit log helper function
 * Records all moderation actions for security and compliance purposes.
 */
interface AuditLogEntry {
  action: string;
  adminId: string;
  targetUserId: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

async function logModerationAction(entry: AuditLogEntry): Promise<void> {
  try {
    await db('moderation_audit_logs').insert({
      id: uuidv4(),
      action: entry.action,
      admin_id: entry.adminId,
      target_user_id: entry.targetUserId,
      details: JSON.stringify(entry.details),
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
      created_at: new Date(),
    });
  } catch (error: any) {
    // Log error but don't fail the operation - audit logging is non-critical
    logger.error('Failed to write audit log:', error);
  }
}

export default router;
