import { Response } from 'express';

import { BoostService } from '../../domain/services/boost.service';
import logger from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export class BoostController {
  private boostService: BoostService;

  constructor(boostService?: BoostService) {
    this.boostService = boostService || new BoostService();
  }

  async getProducts(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const products = await this.boostService.getAvailableBoosts();

      return res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error: any) {
      logger.error('Get boost products error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get boost products',
      });
    }
  }

  async purchaseWithCoins(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { productSku } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!productSku) {
        return res.status(400).json({
          success: false,
          message: 'Product SKU is required',
        });
      }

      const result = await this.boostService.purchaseBoostWithCoins(userId, productSku);

      return res.status(200).json({
        success: true,
        message: 'Boost purchased and activated successfully',
        data: result,
      });
    } catch (error: any) {
      logger.error('Purchase boost error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to purchase boost',
      });
    }
  }

  async getActiveBoost(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const boost = await this.boostService.getActiveBoost(userId);

      return res.status(200).json({
        success: true,
        data: boost,
      });
    } catch (error: any) {
      logger.error('Get active boost error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get active boost',
      });
    }
  }

  async getHistory(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { limit } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const limitNum = limit ? parseInt(limit as string) : 20;
      const history = await this.boostService.getUserBoostHistory(userId, limitNum);

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      logger.error('Get boost history error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get boost history',
      });
    }
  }

  async getStats(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const stats = await this.boostService.getUserBoostStats(userId);

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Get boost stats error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get boost stats',
      });
    }
  }

  async cancelBoost(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const result = await this.boostService.cancelBoost(userId);

      return res.status(200).json({
        success: true,
        message: 'Boost canceled successfully',
        data: result,
      });
    } catch (error: any) {
      logger.error('Cancel boost error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to cancel boost',
      });
    }
  }
}

export default new BoostController();
