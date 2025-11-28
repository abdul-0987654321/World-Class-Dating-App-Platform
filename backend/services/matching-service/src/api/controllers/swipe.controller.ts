import { Request, Response } from 'express';
import swipeService from '../../domain/services/swipe.service';
import { SwipeAction } from '../../types';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('swipe-controller');

export class SwipeController {
  /**
   * Process a swipe action
   * POST /api/swipes
   */
  async swipe(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user; // From auth middleware
      const { targetUserId, action } = req.body;

      // Validate action
      if (!Object.values(SwipeAction).includes(action)) {
        res.status(400).json({
          success: false,
          error: 'Invalid swipe action',
        });
        return;
      }

      // Validate targetUserId
      if (!targetUserId) {
        res.status(400).json({
          success: false,
          error: 'Target user ID is required',
        });
        return;
      }

      // Can't swipe on yourself
      if (userId === targetUserId) {
        res.status(400).json({
          success: false,
          error: 'Cannot swipe on yourself',
        });
        return;
      }

      const result = await swipeService.processSwipe({
        userId,
        targetUserId,
        action,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Swipe action failed', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process swipe',
      });
    }
  }

  /**
   * Get users who liked me
   * GET /api/swipes/likes
   */
  async getWhoLikedMe(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      const userIds = await swipeService.getUsersWhoLikedMe(userId);

      res.status(200).json({
        success: true,
        data: {
          count: userIds.length,
          userIds,
        },
      });
    } catch (error) {
      logger.error('Failed to get likes', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve likes',
      });
    }
  }

  /**
   * Get swipe statistics
   * GET /api/swipes/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      const stats = await swipeService.getSwipeStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get stats', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve statistics',
      });
    }
  }

  /**
   * Undo last swipe (premium feature)
   * POST /api/swipes/undo
   */
  async undoSwipe(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      const success = await swipeService.undoLastSwipe(userId);

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Swipe undone successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Cannot undo swipe',
        });
      }
    } catch (error) {
      logger.error('Failed to undo swipe', error);
      res.status(500).json({
        success: false,
        error: 'Failed to undo swipe',
      });
    }
  }
}

export default new SwipeController();
