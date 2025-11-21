import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { CoinService } from '../../domain/services/coin.service';
import logger from '../../utils/logger';

export class CoinController {
  private coinService: CoinService;

  constructor(coinService?: CoinService) {
    this.coinService = coinService || new CoinService();
  }

  /**
   * Get user's coin balance
   */
  async getBalance(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const coin = await this.coinService.getBalance(userId);

      return res.status(200).json({
        success: true,
        data: coin,
      });
    } catch (error: any) {
      logger.error('Get balance error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get balance',
      });
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { limit, offset, type, startDate, endDate } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const options: any = {};
      if (limit) options.limit = parseInt(limit as string);
      if (offset) options.offset = parseInt(offset as string);
      if (type) options.type = type as string;
      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);

      const transactions = await this.coinService.getTransactionHistory(userId, options);

      return res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error: any) {
      logger.error('Get transaction history error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get transaction history',
      });
    }
  }

  /**
   * Get transaction summary
   */
  async getTransactionSummary(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const summary = await this.coinService.getTransactionSummary(userId);

      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      logger.error('Get transaction summary error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get transaction summary',
      });
    }
  }

  /**
   * Get available coin products
   */
  async getProducts(_req: AuthRequest, res: Response): Promise<Response> {
    try {
      const products = await this.coinService.getAvailableProducts();

      return res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error: any) {
      logger.error('Get products error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get products',
      });
    }
  }

  /**
   * Purchase coins (called by payment service webhook)
   */
  async purchaseCoins(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { productSku, stripePaymentId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!productSku || !stripePaymentId) {
        return res.status(400).json({
          success: false,
          message: 'Product SKU and Stripe payment ID are required',
        });
      }

      const result = await this.coinService.purchaseCoins(userId, productSku, stripePaymentId);

      return res.status(200).json({
        success: true,
        message: 'Coins purchased successfully',
        data: result,
      });
    } catch (error: any) {
      logger.error('Purchase coins error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to purchase coins',
      });
    }
  }

  /**
   * Spend coins on an action
   */
  async spendCoins(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { amount, reason, referenceId, referenceType } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!amount || !reason) {
        return res.status(400).json({
          success: false,
          message: 'Amount and reason are required',
        });
      }

      const result = await this.coinService.spendCoins(
        userId,
        amount,
        reason,
        referenceId,
        referenceType
      );

      return res.status(200).json({
        success: true,
        message: 'Coins spent successfully',
        data: result,
      });
    } catch (error: any) {
      logger.error('Spend coins error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to spend coins',
      });
    }
  }

  /**
   * Claim daily reward
   */
  async claimDailyReward(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const result = await this.coinService.grantDailyReward(userId);

      if (!result) {
        return res.status(400).json({
          success: false,
          message: 'Daily reward already claimed today',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Daily reward claimed successfully',
        data: result,
      });
    } catch (error: any) {
      logger.error('Claim daily reward error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to claim daily reward',
      });
    }
  }
}

export default new CoinController();
