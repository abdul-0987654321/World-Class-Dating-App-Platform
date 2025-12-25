import { Request, Response, NextFunction } from 'express';
import swipeService from '../../domain/services/swipe.service';
import { SwipeAction } from '../../types';
import { createLogger, ApiError, MatchingErrorCode, ValidationErrorCode } from '@flamoral/backend-shared';

const logger = createLogger('swipe-controller');

export class SwipeController {
  /**
   * Process a swipe action
   * POST /api/swipes
   */
  async swipe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).user; // From auth middleware
      const { targetUserId, action } = req.body;

      // Validate action
      if (!Object.values(SwipeAction).includes(action)) {
        throw new ApiError({
          code: ValidationErrorCode.VALIDATION_FAILED,
          message: 'Invalid swipe action. Must be LIKE, PASS, or SUPER_LIKE',
          details: [{ field: 'action', message: 'Invalid swipe action' }],
        });
      }

      // Validate targetUserId
      if (!targetUserId) {
        throw new ApiError({
          code: ValidationErrorCode.FIELD_REQUIRED,
          message: 'Target user ID is required',
          details: [{ field: 'targetUserId', message: 'Required field missing' }],
        });
      }

      // Can't swipe on yourself
      if (userId === targetUserId) {
        throw new ApiError({
          code: MatchingErrorCode.SELF_ACTION_NOT_ALLOWED,
          message: 'Cannot swipe on yourself',
        });
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
      next(error);
    }
  }

  /**
   * Get users who liked me
   * GET /api/swipes/likes
   */
  async getWhoLikedMe(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      next(error);
    }
  }

  /**
   * Get swipe statistics
   * GET /api/swipes/stats
   */
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).user;

      const stats = await swipeService.getSwipeStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Undo last swipe (premium feature)
   * POST /api/swipes/undo
   */
  async undoSwipe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).user;

      const success = await swipeService.undoLastSwipe(userId);

      if (!success) {
        throw new ApiError({
          code: MatchingErrorCode.UNDO_NOT_ALLOWED,
          message: 'Cannot undo swipe. No recent swipe found or undo window expired.',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Swipe undone successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SwipeController();
