/**
 * Enhanced Block Routes
 * Extended blocking functionality with audit logging and bulk operations
 */

import { Router, Response } from 'express';

import { enhancedBlockService } from '../../services/enhanced-block.service';
import logger from '../../utils/logger';
import { AuthRequest, authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/v1/blocks/enhanced/:blockedId
 * Block a user with enhanced tracking
 */
router.post('/enhanced/:blockedId', async (req: AuthRequest, res: Response) => {
  try {
    const blockerId = req.user?.userId;
    const { blockedId } = req.params;
    const { reason, autoUnmatch } = req.body;

    if (!blockerId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const result = await enhancedBlockService.blockUserEnhanced(blockerId, blockedId, {
      reason,
      source: 'manual',
      autoUnmatch,
    });

    return res.status(201).json({
      success: true,
      message: 'User blocked successfully',
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to block user:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to block user',
    });
  }
});

/**
 * DELETE /api/v1/blocks/enhanced/:blockedId
 * Unblock a user with tracking
 */
router.delete('/enhanced/:blockedId', async (req: AuthRequest, res: Response) => {
  try {
    const blockerId = req.user?.userId;
    const { blockedId } = req.params;

    if (!blockerId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    await enhancedBlockService.unblockUserEnhanced(blockerId, blockedId);

    return res.json({
      success: true,
      message: 'User unblocked successfully',
    });
  } catch (error: any) {
    logger.error('Failed to unblock user:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to unblock user',
    });
  }
});

/**
 * POST /api/v1/blocks/report/:blockedId
 * Block and report a user in one action
 */
router.post('/report/:blockedId', async (req: AuthRequest, res: Response) => {
  try {
    const blockerId = req.user?.userId;
    const { blockedId } = req.params;
    const { reportType, description, severity, evidenceUrls } = req.body;

    if (!blockerId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!reportType) {
      return res.status(400).json({
        success: false,
        message: 'Report type is required',
      });
    }

    const result = await enhancedBlockService.blockAndReport(blockerId, blockedId, {
      reportType,
      description,
      severity,
      evidenceUrls,
    });

    return res.status(201).json({
      success: true,
      message: 'User blocked and reported successfully',
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to block and report:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to block and report user',
    });
  }
});

/**
 * POST /api/v1/blocks/unmatch/:matchedUserId
 * Unmatch and block a user
 */
router.post('/unmatch/:matchedUserId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { matchedUserId } = req.params;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const result = await enhancedBlockService.unmatchAndBlock(userId, matchedUserId, reason);

    return res.status(201).json({
      success: true,
      message: 'User unmatched and blocked successfully',
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to unmatch and block:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to unmatch and block user',
    });
  }
});

/**
 * POST /api/v1/blocks/bulk
 * Bulk block multiple users
 */
router.post('/bulk', async (req: AuthRequest, res: Response) => {
  try {
    const blockerId = req.user?.userId;
    const { userIds, reason } = req.body;

    if (!blockerId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required',
      });
    }

    if (userIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 50 users can be blocked at once',
      });
    }

    const result = await enhancedBlockService.bulkBlock(blockerId, userIds, reason || 'Bulk block');

    return res.status(201).json({
      success: true,
      message: `Blocked ${result.totalBlocked} users`,
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to bulk block:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to bulk block users',
    });
  }
});

/**
 * GET /api/v1/blocks/history
 * Get block audit history for the current user
 */
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { limit, as: role } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const history = await enhancedBlockService.getBlockAuditHistory(userId, {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      as: role as 'blocker' | 'blocked' | 'both',
    });

    return res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    logger.error('Failed to get block history:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get block history',
    });
  }
});

export default router;
