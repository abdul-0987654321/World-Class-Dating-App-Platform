import { Request, Response } from 'express';
import recommendationService from '../../domain/services/recommendation.service';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('recommendation-controller');

export class RecommendationController {
  /**
   * Get personalized recommendations
   * GET /api/recommendations
   */
  async getRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { limit, offset, ...filters } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Validate limit and offset
      const parsedLimit = limit ? parseInt(limit as string, 10) : 20;
      const parsedOffset = offset ? parseInt(offset as string, 10) : 0;

      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        res.status(400).json({
          success: false,
          error: 'Limit must be between 1 and 100',
        });
        return;
      }

      if (isNaN(parsedOffset) || parsedOffset < 0) {
        res.status(400).json({
          success: false,
          error: 'Offset must be a non-negative number',
        });
        return;
      }

      const recommendations = await recommendationService.getRecommendations({
        userId,
        limit: parsedLimit,
        offset: parsedOffset,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      });

      res.status(200).json({
        success: true,
        data: {
          count: recommendations.length,
          recommendations,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get recommendations', error);

      // Handle user service errors
      if (error.message && error.message.includes('user profile')) {
        res.status(404).json({
          success: false,
          error: 'User profile not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve recommendations',
      });
    }
  }

  /**
   * Get top matches (premium feature)
   * GET /api/recommendations/top
   */
  async getTopMatches(req: Request, res: Response): Promise<void> {
    try {
      const { userId, isPremium } = (req as any).user;
      const { limit } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Check premium status
      if (!isPremium) {
        res.status(403).json({
          success: false,
          error: 'Top Matches is a Premium feature',
          premiumRequired: true,
        });
        return;
      }

      const parsedLimit = limit ? parseInt(limit as string, 10) : 10;

      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
        res.status(400).json({
          success: false,
          error: 'Limit must be between 1 and 50',
        });
        return;
      }

      const topMatches = await recommendationService.getTopMatches(userId, parsedLimit);

      res.status(200).json({
        success: true,
        data: {
          count: topMatches.length,
          topMatches,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get top matches', error);

      if (error.message && error.message.includes('user profile')) {
        res.status(404).json({
          success: false,
          error: 'User profile not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve top matches',
      });
    }
  }

  /**
   * Refresh recommendations
   * POST /api/recommendations/refresh
   */
  async refreshRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      await recommendationService.refreshRecommendations(userId);

      res.status(200).json({
        success: true,
        message: 'Recommendations refreshed successfully',
      });
    } catch (error) {
      logger.error('Failed to refresh recommendations', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh recommendations',
      });
    }
  }
}

export default new RecommendationController();
