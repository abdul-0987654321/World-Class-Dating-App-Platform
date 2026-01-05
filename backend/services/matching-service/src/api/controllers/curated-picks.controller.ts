/**
 * Curated Picks Controller
 * Handles daily curated picks API endpoints
 */

import { createLogger } from '@flamoral/backend-shared';
import { Request, Response } from 'express';

import curatedPicksService from '../../domain/services/curated-picks.service';

const logger = createLogger('curated-picks-controller');

export class CuratedPicksController {
  /**
   * Get daily curated picks
   * GET /api/v1/discovery/curated-picks
   */
  async getDailyPicks(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      logger.info(`Getting daily picks for user ${userId}`);

      const result = await curatedPicksService.getDailyPicks(userId);

      res.status(200).json({
        success: true,
        data: {
          picks: result.picks,
          generated_at: result.generatedAt,
          expires_at: result.expiresAt,
          remaining_picks: result.remainingPicks,
          tier: result.tier,
        },
      });
    } catch (error) {
      logger.error('Failed to get daily picks', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve daily picks',
        code: 'CURATED_PICKS_ERROR',
        correlation_id: (req as any).correlationId || 'unknown',
      });
    }
  }

  /**
   * Mark a pick as viewed
   * POST /api/v1/discovery/curated-picks/:pickId/view
   */
  async markPickViewed(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { pickId } = req.params;

      await curatedPicksService.markPickViewed(userId, pickId);

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to mark pick as viewed', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update pick status',
        code: 'PICK_UPDATE_ERROR',
        correlation_id: (req as any).correlationId || 'unknown',
      });
    }
  }

  /**
   * Mark a pick as acted upon
   * POST /api/v1/discovery/curated-picks/:pickId/action
   */
  async markPickActedUpon(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { pickId } = req.params;

      await curatedPicksService.markPickActedUpon(userId, pickId);

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to mark pick as acted upon', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update pick status',
        code: 'PICK_UPDATE_ERROR',
        correlation_id: (req as any).correlationId || 'unknown',
      });
    }
  }

  /**
   * Regenerate daily picks (premium feature)
   * POST /api/v1/discovery/curated-picks/regenerate
   */
  async regeneratePicks(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      // Get user tier - only premium/elite can regenerate
      const status = await curatedPicksService.getDailyPicks(userId);

      if (!['premium', 'elite'].includes(status.tier)) {
        res.status(402).json({
          success: false,
          error: 'Regenerating picks requires Premium subscription',
          code: 'TIER_NOT_SUFFICIENT',
          required_plan: 'premium',
          current_plan: status.tier,
        });
        return;
      }

      // Clear existing picks and regenerate
      // This is handled internally by the service
      const result = await curatedPicksService.getDailyPicks(userId);

      res.status(200).json({
        success: true,
        data: {
          picks: result.picks,
          generated_at: result.generatedAt,
          expires_at: result.expiresAt,
          remaining_picks: result.remainingPicks,
          tier: result.tier,
        },
      });
    } catch (error) {
      logger.error('Failed to regenerate picks', error);
      res.status(500).json({
        success: false,
        error: 'Failed to regenerate picks',
        code: 'REGENERATE_ERROR',
        correlation_id: (req as any).correlationId || 'unknown',
      });
    }
  }
}

export default new CuratedPicksController();
