import { Request, Response } from 'express';
import recommendationService from '../../domain/services/recommendation.service';
import { createLogger } from '@connectsphere/shared';

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

      const recommendations = await recommendationService.getRecommendations({
        userId,
        limit: limit ? parseInt(limit as string, 10) : 20,
        offset: offset ? parseInt(offset as string, 10) : 0,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      });

      res.status(200).json({
        success: true,
        data: {
          count: recommendations.length,
          recommendations,
        },
      });
    } catch (error) {
      logger.error('Failed to get recommendations', error);
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
      const { userId } = (req as any).user;
      const { limit } = req.query;

      const topMatches = await recommendationService.getTopMatches(
        userId,
        limit ? parseInt(limit as string, 10) : 10
      );

      res.status(200).json({
        success: true,
        data: {
          count: topMatches.length,
          topMatches,
        },
      });
    } catch (error) {
      logger.error('Failed to get top matches', error);
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
