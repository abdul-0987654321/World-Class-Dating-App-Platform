/**
 * Additional moderation routes - to be merged into moderation.routes.ts
 * These handle reports, blocking, and moderation queue
 */

import { Router, Request, Response } from 'express';
import moderationService from '../services/moderation.service';
import { createLogger } from '../utils/logger';

const logger = createLogger('moderation-routes');
const router = Router();

/**
 * POST /api/moderation/report
 * Submit a user/content report
 * Body: { reporterId, reportedUserId?, contentId?, reportType, reason, description }
 */
router.post('/report', async (req: Request, res: Response) => {
  try {
    const { reporterId, reportedUserId, contentId, reportType, reason, description } = req.body;

    // Validate request
    if (!reporterId || !reportType || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: reporterId, reportType, reason',
      });
    }

    if (!reportedUserId && !contentId) {
      return res.status(400).json({
        success: false,
        error: 'Either reportedUserId or contentId must be provided',
      });
    }

    const report = await moderationService.createReport({
      reporterId,
      reportedUserId,
      contentId,
      reportType,
      reason,
      description,
    });

    res.json({
      success: true,
      message: 'Report submitted successfully',
      reportId: report.id,
    });
  } catch (error: any) {
    logger.error('Create report error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit report',
    });
  }
});

/**
 * GET /api/moderation/reports/:reportId
 * Get report details
 */
router.get('/reports/:reportId', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;

    const report = await moderationService.getReport(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }

    res.json({
      success: true,
      report,
    });
  } catch (error: any) {
    logger.error('Get report error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get report',
    });
  }
});

/**
 * GET /api/moderation/admin/reports
 * Get all reports (paginated)
 * Query: status, reportType, limit, offset
 */
router.get('/admin/reports', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const reportType = req.query.reportType as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await moderationService.getReports({
      status,
      reportType,
      limit,
      offset,
    });

    res.json({
      success: true,
      reports: result.reports,
      total: result.total,
      limit,
      offset,
    });
  } catch (error: any) {
    logger.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get reports',
    });
  }
});

/**
 * POST /api/moderation/admin/reports/:reportId/resolve
 * Resolve a report
 * Body: { adminId, action, notes }
 */
router.post('/admin/reports/:reportId/resolve', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { adminId, action, notes } = req.body;

    if (!adminId || !action) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: adminId, action',
      });
    }

    await moderationService.resolveReport(reportId, adminId, action, notes);

    res.json({
      success: true,
      message: 'Report resolved successfully',
    });
  } catch (error: any) {
    logger.error('Resolve report error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to resolve report',
    });
  }
});

/**
 * POST /api/moderation/block
 * Block a user
 * Body: { userId, blockedUserId }
 */
router.post('/block', async (req: Request, res: Response) => {
  try {
    const { userId, blockedUserId } = req.body;

    if (!userId || !blockedUserId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, blockedUserId',
      });
    }

    if (userId === blockedUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot block yourself',
      });
    }

    await moderationService.blockUser(userId, blockedUserId);

    res.json({
      success: true,
      message: 'User blocked successfully',
    });
  } catch (error: any) {
    logger.error('Block user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to block user',
    });
  }
});

/**
 * POST /api/moderation/unblock
 * Unblock a user
 * Body: { userId, blockedUserId }
 */
router.post('/unblock', async (req: Request, res: Response) => {
  try {
    const { userId, blockedUserId } = req.body;

    if (!userId || !blockedUserId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, blockedUserId',
      });
    }

    await moderationService.unblockUser(userId, blockedUserId);

    res.json({
      success: true,
      message: 'User unblocked successfully',
    });
  } catch (error: any) {
    logger.error('Unblock user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to unblock user',
    });
  }
});

/**
 * GET /api/moderation/user/:userId/blocks
 * Get user's blocked list
 */
router.get('/user/:userId/blocks', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const blockedUsers = await moderationService.getBlockedUsers(userId);

    res.json({
      success: true,
      blockedUsers,
      count: blockedUsers.length,
    });
  } catch (error: any) {
    logger.error('Get blocked users error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get blocked users',
    });
  }
});

/**
 * GET /api/moderation/user/:userId/is-blocked/:targetUserId
 * Check if a user is blocked
 */
router.get('/user/:userId/is-blocked/:targetUserId', async (req: Request, res: Response) => {
  try {
    const { userId, targetUserId } = req.params;

    const isBlocked = await moderationService.isUserBlocked(userId, targetUserId);

    res.json({
      success: true,
      isBlocked,
    });
  } catch (error: any) {
    logger.error('Check blocked error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check block status',
    });
  }
});

/**
 * GET /api/moderation/admin/queue
 * Get moderation queue
 * Query: status, priority, limit, offset
 */
router.get('/admin/queue', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await moderationService.getModerationQueue({
      status,
      priority,
      limit,
      offset,
    });

    res.json({
      success: true,
      queue: result.items,
      total: result.total,
      limit,
      offset,
    });
  } catch (error: any) {
    logger.error('Get moderation queue error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get moderation queue',
    });
  }
});

/**
 * POST /api/moderation/admin/queue/:queueId/review
 * Review content from moderation queue
 * Body: { moderatorId, action, notes }
 */
router.post('/admin/queue/:queueId/review', async (req: Request, res: Response) => {
  try {
    const { queueId } = req.params;
    const { moderatorId, action, notes } = req.body;

    if (!moderatorId || !action) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: moderatorId, action',
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "approve" or "reject"',
      });
    }

    await moderationService.reviewQueueItem(queueId, moderatorId, action, notes);

    res.json({
      success: true,
      message: `Content ${action}ed successfully`,
    });
  } catch (error: any) {
    logger.error('Review queue item error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to review content',
    });
  }
});

export default router;
