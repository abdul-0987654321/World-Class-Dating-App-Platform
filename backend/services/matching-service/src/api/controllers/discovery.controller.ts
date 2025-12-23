import { Request, Response } from 'express';
import discoveryService from '../../domain/services/discovery.service';
import { SwipeAction } from '../../types';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('discovery-controller');

/**
 * Discovery Controller
 * Handles discovery feed, likes, passes, and super-likes
 * Implements API contract from openapi.yaml
 */
export class DiscoveryController {
  /**
   * Get discovery feed candidates
   * GET /api/v1/discovery/feed
   *
   * CRITICAL INVARIANT: Feed MUST NOT return empty when eligible users exist
   * Response format matches DiscoveryFeedResponse from openapi.yaml:
   * {
   *   items: [{ user_id, profile_preview, reasons }],
   *   next_cursor: string | null
   * }
   */
  async getFeed(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const limit = parseInt(req.query.limit as string) || 20;
      const cursor = req.query.cursor as string | undefined;

      logger.info(`Getting discovery feed for user ${userId}, limit: ${limit}`);

      const result = await discoveryService.getDiscoveryFeed({
        userId,
        limit,
        cursor,
      });

      // Log when feed returns empty for debugging (critical invariant)
      if (result.items.length === 0) {
        logger.warn(`Discovery feed returned empty for user ${userId}`, {
          userId,
          candidatesExist: result.candidatesExist,
          reason: result.emptyReason,
        });
      }

      res.status(200).json({
        success: true,
        data: {
          items: result.items,
          next_cursor: result.next_cursor,
          // Include metadata for debugging empty feeds
          ...(result.items.length === 0 && {
            message: result.emptyReason || 'No candidates available',
          }),
        },
      });
    } catch (error) {
      logger.error('Failed to get discovery feed', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve discovery feed',
        code: 'DISCOVERY_FEED_ERROR',
        correlation_id: (req as any).correlationId || 'unknown',
      });
    }
  }

  /**
   * Like a user
   * POST /api/v1/discovery/like
   *
   * Daily caps enforced server-side:
   * - Free: 50 likes/day
   * - Plus: 100 likes/day
   * - Premium: unlimited
   */
  async like(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { target_user_id } = req.body;

      if (!target_user_id) {
        res.status(400).json({
          success: false,
          error: 'target_user_id is required',
          code: 'MISSING_TARGET_USER',
          correlation_id: (req as any).correlationId || 'unknown',
        });
        return;
      }

      if (userId === target_user_id) {
        res.status(400).json({
          success: false,
          error: 'Cannot like yourself',
          code: 'SELF_LIKE_NOT_ALLOWED',
          correlation_id: (req as any).correlationId || 'unknown',
        });
        return;
      }

      const result = await discoveryService.processLike({
        userId,
        targetUserId: target_user_id,
      });

      if (!result.success) {
        const statusCode = result.code === 'DAILY_LIMIT_EXCEEDED' ? 429 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code,
          correlation_id: (req as any).correlationId || 'unknown',
          ...(result.code === 'DAILY_LIMIT_EXCEEDED' && {
            required_plan: result.requiredPlan,
            current_plan: result.currentPlan,
          }),
        });
        return;
      }

      // Response matches LikeResponse from openapi.yaml
      res.status(200).json({
        success: true,
        data: {
          liked: true,
          match_created: result.matchCreated,
          match: result.match || null,
        },
      });
    } catch (error) {
      logger.error('Failed to process like', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process like',
        code: 'LIKE_ERROR',
        correlation_id: (req as any).correlationId || 'unknown',
      });
    }
  }

  /**
   * Pass on a user
   * POST /api/v1/discovery/pass
   */
  async pass(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { target_user_id } = req.body;

      if (!target_user_id) {
        res.status(400).json({
          success: false,
          error: 'target_user_id is required',
          code: 'MISSING_TARGET_USER',
          correlation_id: (req as any).correlationId || 'unknown',
        });
        return;
      }

      if (userId === target_user_id) {
        res.status(400).json({
          success: false,
          error: 'Cannot pass on yourself',
          code: 'SELF_PASS_NOT_ALLOWED',
          correlation_id: (req as any).correlationId || 'unknown',
        });
        return;
      }

      await discoveryService.processPass({
        userId,
        targetUserId: target_user_id,
      });

      // Response is 204 No Content per openapi.yaml
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to process pass', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process pass',
        code: 'PASS_ERROR',
        correlation_id: (req as any).correlationId || 'unknown',
      });
    }
  }

  /**
   * Super-like a user
   * POST /api/v1/discovery/super-like
   *
   * Tier enforced - Plus/Premium only
   */
  async superLike(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { target_user_id, message } = req.body;

      if (!target_user_id) {
        res.status(400).json({
          success: false,
          error: 'target_user_id is required',
          code: 'MISSING_TARGET_USER',
          correlation_id: (req as any).correlationId || 'unknown',
        });
        return;
      }

      if (userId === target_user_id) {
        res.status(400).json({
          success: false,
          error: 'Cannot super-like yourself',
          code: 'SELF_SUPERLIKE_NOT_ALLOWED',
          correlation_id: (req as any).correlationId || 'unknown',
        });
        return;
      }

      const result = await discoveryService.processSuperLike({
        userId,
        targetUserId: target_user_id,
        message,
      });

      if (!result.success) {
        // 402 Payment Required if tier not sufficient
        const statusCode = result.code === 'TIER_NOT_SUFFICIENT' ? 402 :
                          result.code === 'DAILY_LIMIT_EXCEEDED' ? 429 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code,
          correlation_id: (req as any).correlationId || 'unknown',
          required_plan: result.requiredPlan,
          current_plan: result.currentPlan,
        });
        return;
      }

      // Response matches SuperLikeResponse from openapi.yaml
      res.status(200).json({
        success: true,
        data: {
          super_liked: true,
        },
      });
    } catch (error) {
      logger.error('Failed to process super-like', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process super-like',
        code: 'SUPERLIKE_ERROR',
        correlation_id: (req as any).correlationId || 'unknown',
      });
    }
  }

  /**
   * Get discovery stats
   * GET /api/v1/discovery/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      const stats = await discoveryService.getDiscoveryStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get discovery stats', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve discovery stats',
        code: 'STATS_ERROR',
        correlation_id: (req as any).correlationId || 'unknown',
      });
    }
  }
}

export default new DiscoveryController();
