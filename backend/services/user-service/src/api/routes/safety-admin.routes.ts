/**
 * Safety Admin Routes
 * API endpoints for the safety administration dashboard
 */

import { Router, Response } from 'express';

import { adminSafetyDashboardService } from '../../services/admin-safety-dashboard.service';
import { enhancedBlockService } from '../../services/enhanced-block.service';
import { harassmentDetectionService } from '../../services/harassment-detection.service';
import { panicButtonService } from '../../services/panic-button.service';
import logger from '../../utils/logger';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication and admin/moderator role
router.use(authMiddleware);
router.use(requireRole('admin', 'moderator'));

/**
 * GET /api/safety/admin/dashboard/stats
 * Get comprehensive safety dashboard statistics
 */
router.get('/dashboard/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await adminSafetyDashboardService.getDashboardStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Failed to get dashboard stats:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get dashboard statistics',
    });
  }
});

// ===================== REPORTS =====================

/**
 * GET /api/safety/admin/reports
 * Get report moderation queue
 */
router.get('/reports', async (req: AuthRequest, res: Response) => {
  try {
    const { status, severity, reportType, limit, offset, sortBy } = req.query;

    const result = await adminSafetyDashboardService.getReportQueue({
      status: status as string,
      severity: severity as string,
      reportType: reportType as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
      sortBy: sortBy as 'priority' | 'date' | 'severity',
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to get report queue:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get report queue',
    });
  }
});

/**
 * POST /api/safety/admin/reports/:reportId/resolve
 * Resolve a report
 */
router.post('/reports/:reportId/resolve', async (req: AuthRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    const { status, actionTaken, resolution, notifyReporter } = req.body;
    const moderatorId = req.user?.userId;

    if (!moderatorId) {
      return res.status(401).json({
        success: false,
        message: 'Moderator ID required',
      });
    }

    await adminSafetyDashboardService.resolveReport(reportId, moderatorId, {
      status,
      actionTaken,
      resolution,
      notifyReporter,
    });

    return res.json({
      success: true,
      message: 'Report resolved successfully',
    });
  } catch (error: any) {
    logger.error('Failed to resolve report:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to resolve report',
    });
  }
});

// ===================== HARASSMENT DETECTION =====================

/**
 * GET /api/safety/admin/harassment/queue
 * Get harassment detection review queue
 */
router.get('/harassment/queue', async (req: AuthRequest, res: Response) => {
  try {
    const { status, minRiskScore, limit, offset } = req.query;

    const result = await adminSafetyDashboardService.getHarassmentReviewQueue({
      status: status as string,
      minRiskScore: minRiskScore ? parseFloat(minRiskScore as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to get harassment queue:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get harassment detection queue',
    });
  }
});

/**
 * POST /api/safety/admin/harassment/:detectionId/review
 * Review a harassment detection
 */
router.post('/harassment/:detectionId/review', async (req: AuthRequest, res: Response) => {
  try {
    const { detectionId } = req.params;
    const { status, action, notes } = req.body;
    const reviewerId = req.user?.userId;

    if (!reviewerId) {
      return res.status(401).json({
        success: false,
        message: 'Reviewer ID required',
      });
    }

    await harassmentDetectionService.reviewDetection(detectionId, reviewerId, {
      status,
      action,
      notes,
    });

    return res.json({
      success: true,
      message: 'Harassment detection reviewed',
    });
  } catch (error: any) {
    logger.error('Failed to review harassment detection:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to review harassment detection',
    });
  }
});

/**
 * POST /api/safety/admin/harassment/analyze
 * Analyze text for harassment (for testing/manual review)
 */
router.post('/harassment/analyze', async (req: AuthRequest, res: Response) => {
  try {
    const { content, senderId } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content is required',
      });
    }

    const result = await harassmentDetectionService.analyzeContent(
      content,
      senderId || 'test-user',
      { saveResult: false }
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to analyze content:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to analyze content',
    });
  }
});

// ===================== USERS =====================

/**
 * GET /api/safety/admin/users/:userId/safety-profile
 * Get user safety profile
 */
router.get('/users/:userId/safety-profile', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const profile = await adminSafetyDashboardService.getUserSafetyProfile(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    logger.error('Failed to get user safety profile:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user safety profile',
    });
  }
});

/**
 * GET /api/safety/admin/users/flagged
 * Get flagged users for review
 */
router.get('/users/flagged', async (req: AuthRequest, res: Response) => {
  try {
    const { limit, offset } = req.query;

    const result = await adminSafetyDashboardService.getFlaggedUsers({
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to get flagged users:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get flagged users',
    });
  }
});

/**
 * POST /api/safety/admin/users/:userId/action
 * Take action on a user (warn, suspend, ban, etc.)
 */
router.post('/users/:userId/action', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { type, reason, duration, notifyUser } = req.body;
    const moderatorId = req.user?.userId;

    if (!moderatorId) {
      return res.status(401).json({
        success: false,
        message: 'Moderator ID required',
      });
    }

    if (!type || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Action type and reason are required',
      });
    }

    await adminSafetyDashboardService.takeUserAction(userId, moderatorId, {
      type,
      reason,
      duration,
      notifyUser,
    });

    return res.json({
      success: true,
      message: `User ${type} action taken successfully`,
    });
  } catch (error: any) {
    logger.error('Failed to take user action:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to take action on user',
    });
  }
});

/**
 * GET /api/safety/admin/users/:userId/harassment-history
 * Get user harassment history
 */
router.get('/users/:userId/harassment-history', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit, onlyFlagged } = req.query;

    const history = await harassmentDetectionService.getUserHarassmentHistory(userId, {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      onlyFlagged: onlyFlagged === 'true',
    });

    return res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    logger.error('Failed to get user harassment history:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get harassment history',
    });
  }
});

/**
 * GET /api/safety/admin/users/:userId/block-history
 * Get user block history
 */
router.get('/users/:userId/block-history', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit, as: role } = req.query;

    const history = await enhancedBlockService.getBlockAuditHistory(userId, {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      as: role as 'blocker' | 'blocked' | 'both',
    });

    return res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    logger.error('Failed to get user block history:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get block history',
    });
  }
});

// ===================== BLOCKS =====================

/**
 * GET /api/safety/admin/blocks/statistics
 * Get block statistics
 */
router.get('/blocks/statistics', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await enhancedBlockService.getBlockStatistics();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Failed to get block statistics:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get block statistics',
    });
  }
});

/**
 * POST /api/safety/admin/blocks/force
 * Admin force block (block user A for user B)
 */
router.post('/blocks/force', async (req: AuthRequest, res: Response) => {
  try {
    const { blockerId, blockedId, reason } = req.body;
    const adminId = req.user?.userId;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Admin ID required',
      });
    }

    if (!blockerId || !blockedId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Blocker ID, blocked ID, and reason are required',
      });
    }

    const result = await enhancedBlockService.adminForceBlock(
      adminId,
      blockerId,
      blockedId,
      reason
    );

    return res.json({
      success: true,
      message: 'Block applied successfully',
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to force block:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to apply block',
    });
  }
});

// ===================== PANIC EVENTS =====================

/**
 * GET /api/safety/admin/panic/active
 * Get all active panic events
 */
router.get('/panic/active', async (req: AuthRequest, res: Response) => {
  try {
    const events = await panicButtonService.getAllActivePanicEvents();

    return res.json({
      success: true,
      data: events,
    });
  } catch (error: any) {
    logger.error('Failed to get active panic events:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get active panic events',
    });
  }
});

/**
 * GET /api/safety/admin/panic/statistics
 * Get panic event statistics
 */
router.get('/panic/statistics', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await panicButtonService.getPanicStatistics();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Failed to get panic statistics:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get panic statistics',
    });
  }
});

/**
 * POST /api/safety/admin/panic/:panicEventId/escalate
 * Escalate a panic event
 */
router.post('/panic/:panicEventId/escalate', async (req: AuthRequest, res: Response) => {
  try {
    const { panicEventId } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.userId;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Escalation reason is required',
      });
    }

    const event = await panicButtonService.escalatePanic(panicEventId, reason, adminId);

    return res.json({
      success: true,
      message: 'Panic event escalated',
      data: event,
    });
  } catch (error: any) {
    logger.error('Failed to escalate panic event:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to escalate panic event',
    });
  }
});

// ===================== MODERATOR ACTIONS =====================

/**
 * GET /api/safety/admin/actions/history
 * Get moderator action history
 */
router.get('/actions/history', async (req: AuthRequest, res: Response) => {
  try {
    const { moderatorId, targetUserId, actionType, limit, offset } = req.query;

    const result = await adminSafetyDashboardService.getModeratorActionHistory({
      moderatorId: moderatorId as string,
      targetUserId: targetUserId as string,
      actionType: actionType as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to get moderator action history:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get action history',
    });
  }
});

export default router;
