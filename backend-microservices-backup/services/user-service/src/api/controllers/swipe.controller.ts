import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SwipeService } from '../../domain/services/swipe.service';
import logger from '../../utils/logger';

export class SwipeController {
  private swipeService: SwipeService;

  constructor(swipeService?: SwipeService) {
    this.swipeService = swipeService || new SwipeService();
  }

  async like(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { target_user_id } = req.body;
      const isPremium = false; // TODO: Implement premium subscription check

      if (!target_user_id) {
        return res.status(400).json({
          success: false,
          message: 'target_user_id is required',
        });
      }

      const result = await this.swipeService.like(userId, target_user_id, isPremium);

      return res.status(200).json({
        success: true,
        message: result.is_match ? 'It\'s a match!' : 'Like sent',
        data: result,
      });
    } catch (error: any) {
      logger.error('Like error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to like user',
      });
    }
  }

  async pass(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { target_user_id } = req.body;

      if (!target_user_id) {
        return res.status(400).json({
          success: false,
          message: 'target_user_id is required',
        });
      }

      const result = await this.swipeService.pass(userId, target_user_id);

      return res.status(200).json({
        success: true,
        message: 'Passed',
        data: result,
      });
    } catch (error: any) {
      logger.error('Pass error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to pass user',
      });
    }
  }

  async superLike(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { target_user_id } = req.body;

      if (!target_user_id) {
        return res.status(400).json({
          success: false,
          message: 'target_user_id is required',
        });
      }

      const result = await this.swipeService.superLike(userId, target_user_id);

      return res.status(200).json({
        success: true,
        message: result.is_match ? 'It\'s a match!' : 'Super Like sent',
        data: result,
      });
    } catch (error: any) {
      logger.error('Super Like error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to super like user',
      });
    }
  }

  async getLikesReceived(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 50;

      const likes = await this.swipeService.getLikesReceived(userId, limit);

      return res.status(200).json({
        success: true,
        data: likes,
      });
    } catch (error: any) {
      logger.error('Get likes received error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve likes',
      });
    }
  }

  async getSuperLikesReceived(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;

      const superLikes = await this.swipeService.getSuperLikesReceived(userId);

      return res.status(200).json({
        success: true,
        data: superLikes,
      });
    } catch (error: any) {
      logger.error('Get super likes received error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve super likes',
      });
    }
  }

  async getSwipeStats(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;

      const stats = await this.swipeService.getSwipeStats(userId);

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Get swipe stats error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve swipe stats',
      });
    }
  }
}
