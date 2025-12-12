import { Request, Response } from 'express';
import profileInsightsService from '../../domain/services/profile-insights.service';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('insights-controller');

export class InsightsController {
  /**
   * Get profile insights
   * GET /api/insights
   */
  async getProfileInsights(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const period = (req.query.period as any) || 'week';

      const insights = await profileInsightsService.getProfileInsights(userId, period);

      res.status(200).json({
        success: true,
        data: insights,
      });
    } catch (error) {
      logger.error('Failed to get profile insights', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve insights',
      });
    }
  }

  /**
   * Get who viewed me
   * GET /api/insights/views
   */
  async getWhoViewedMe(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const period = (req.query.period as string) || 'week';

      const views = await profileInsightsService.getWhoViewedMe(userId, {
        limit,
        offset,
        period,
      });

      res.status(200).json({
        success: true,
        data: views,
      });
    } catch (error) {
      logger.error('Failed to get who viewed me', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve views',
      });
    }
  }

  /**
   * Get who liked you
   * GET /api/insights/likes
   */
  async getWhoLikedYou(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const unmatchedOnly = req.query.unmatchedOnly === 'true';

      const likes = await profileInsightsService.getWhoLikedYou(userId, {
        limit,
        offset,
        unmatchedOnly,
      });

      res.status(200).json({
        success: true,
        data: likes,
      });
    } catch (error) {
      logger.error('Failed to get who liked you', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve likes',
      });
    }
  }

  /**
   * Get who liked you count
   * GET /api/insights/likes/count
   */
  async getWhoLikedYouCount(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      const count = await profileInsightsService.getWhoLikedYouCount(userId);

      res.status(200).json({
        success: true,
        data: { count },
      });
    } catch (error) {
      logger.error('Failed to get likes count', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve count',
      });
    }
  }

  /**
   * Track profile view (internal)
   * POST /api/insights/track-view
   */
  async trackProfileView(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { viewedUserId, source, duration } = req.body;

      await profileInsightsService.trackProfileView({
        viewerId: userId,
        viewedUserId,
        source,
        duration,
      });

      res.status(200).json({
        success: true,
        message: 'View tracked',
      });
    } catch (error) {
      logger.error('Failed to track view', error);
      // Don't fail the request for tracking errors
      res.status(200).json({
        success: true,
        message: 'Request processed',
      });
    }
  }
}

export default new InsightsController();
