/**
 * Rewind Controller
 *
 * Handles HTTP requests for the Swipe Rewind feature.
 */

import { Request, Response, NextFunction } from 'express';
import rewindService from '../../domain/services/rewind.service';
import { createLogger, ApiError, MatchingErrorCode } from '@flamoral/backend-shared';

const logger = createLogger('rewind-controller');

export class RewindController {
  /**
   * Rewind last swipe
   * POST /api/v1/swipes/rewind
   *
   * Undoes the user's last swipe and returns the profile to the discovery feed.
   */
  async rewind(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).user;

      // userId should always exist due to authenticate middleware
      // This is a defensive check
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Get subscription tier from request headers or user data
      // In production, this would be fetched from user-service
      const subscriptionTier = (req as any).user?.subscriptionTier;

      const result = await rewindService.rewind(userId, subscriptionTier);

      if (!result.success) {
        throw new ApiError({
          code: MatchingErrorCode.REWIND_NOT_ALLOWED,
          message: result.error || 'Cannot rewind swipe',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          message: 'Swipe rewound successfully',
          rewoundSwipe: {
            id: result.rewoundSwipe?.id,
            targetUserId: result.rewoundSwipe?.targetUserId,
            action: result.rewoundSwipe?.action,
            hadMatch: result.rewoundSwipe?.resultedInMatch,
            createdAt: result.rewoundSwipe?.createdAt,
          },
          targetProfile: result.targetProfile,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if user can rewind
   * GET /api/v1/swipes/rewind/status
   *
   * Returns whether the user can rewind and their quota.
   */
  async getRewindStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).user;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const subscriptionTier = (req as any).user?.subscriptionTier;
      const result = await rewindService.canRewind(userId, subscriptionTier);

      res.status(200).json({
        success: true,
        data: {
          canRewind: result.canRewind,
          reason: result.reason,
          quota: result.quota,
          lastSwipe: result.lastSwipe
            ? {
                id: result.lastSwipe.id,
                targetUserId: result.lastSwipe.targetUserId,
                action: result.lastSwipe.action,
                createdAt: result.lastSwipe.createdAt,
              }
            : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rewind quota
   * GET /api/v1/swipes/rewind/quota
   *
   * Returns the user's rewind quota and usage.
   */
  async getQuota(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).user;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const quota = await rewindService.getRewindQuota(userId);

      res.status(200).json({
        success: true,
        data: {
          dailyLimit: quota.dailyLimit,
          usedToday: quota.usedToday,
          remainingToday: quota.isUnlimited ? 'unlimited' : quota.remainingToday,
          isUnlimited: quota.isUnlimited,
          subscriptionTier: quota.subscriptionTier,
          nextResetAt: quota.nextResetAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rewind history
   * GET /api/v1/swipes/rewind/history
   *
   * Returns the user's rewind history.
   */
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).user;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const history = await rewindService.getRewindHistory(userId, { limit, offset });

      res.status(200).json({
        success: true,
        data: {
          history,
          pagination: {
            limit,
            offset,
            hasMore: history.length === limit,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rewindable swipes
   * GET /api/v1/swipes/rewind/available
   *
   * Returns swipes that can still be rewound.
   */
  async getRewindableSwipes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).user;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 5;
      const swipes = await rewindService.getRewindableSwipes(userId, limit);

      res.status(200).json({
        success: true,
        data: {
          swipes: swipes.map((swipe) => ({
            id: swipe.id,
            targetUserId: swipe.targetUserId,
            action: swipe.action,
            createdAt: swipe.createdAt,
            hadMatch: swipe.resultedInMatch,
          })),
          count: swipes.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rewind usage statistics
   * GET /api/v1/swipes/rewind/stats
   *
   * Returns rewind usage statistics.
   */
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).user;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const [dailyStats, weeklyStats, monthlyStats] = await Promise.all([
        rewindService.getRewindCount(userId, 'day'),
        rewindService.getRewindCount(userId, 'week'),
        rewindService.getRewindCount(userId, 'month'),
      ]);

      res.status(200).json({
        success: true,
        data: {
          daily: dailyStats,
          weekly: weeklyStats,
          monthly: monthlyStats,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new RewindController();
