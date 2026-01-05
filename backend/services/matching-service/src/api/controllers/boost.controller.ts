import { createLogger } from '@flamoral/backend-shared';
import { Request, Response } from 'express';

import boostService from '../../domain/services/boost.service';

const logger = createLogger('boost-controller');

export class BoostController {
  /**
   * Activate boost
   * POST /api/boosts/activate
   */
  async activateBoost(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { duration, paymentId } = req.body;

      const boost = await boostService.activateBoost({
        userId,
        duration,
        paymentId,
      });

      res.status(200).json({
        success: true,
        data: boost,
      });
    } catch (error: any) {
      logger.error('Failed to activate boost', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to activate boost',
      });
    }
  }

  /**
   * Get active boost
   * GET /api/boosts/active
   */
  async getActiveBoost(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      const boost = await boostService.getActiveBoost(userId);

      res.status(200).json({
        success: true,
        data: boost,
      });
    } catch (error) {
      logger.error('Failed to get active boost', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve boost',
      });
    }
  }

  /**
   * Get boost stats
   * GET /api/boosts/stats
   */
  async getBoostStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      const stats = await boostService.getBoostStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get boost stats', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve stats',
      });
    }
  }

  /**
   * Get boost history
   * GET /api/boosts/history
   */
  async getBoostHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const history = await boostService.getBoostHistory(userId, { limit, offset });

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Failed to get boost history', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve history',
      });
    }
  }

  /**
   * Cancel active boost
   * POST /api/boosts/cancel
   */
  async cancelBoost(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { reason } = req.body;

      const cancelled = await boostService.cancelBoost(userId, reason);

      if (cancelled) {
        res.status(200).json({
          success: true,
          message: 'Boost cancelled successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'No active boost to cancel',
        });
      }
    } catch (error) {
      logger.error('Failed to cancel boost', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel boost',
      });
    }
  }
}

export default new BoostController();
