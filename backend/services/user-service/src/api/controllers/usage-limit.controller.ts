import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UsageLimitService } from '../../domain/services/usage-limit.service';
import logger from '../../utils/logger';

export class UsageLimitController {
  private usageLimitService: UsageLimitService;

  constructor(usageLimitService?: UsageLimitService) {
    this.usageLimitService = usageLimitService || new UsageLimitService();
  }

  async getUserLimits(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const limits = await this.usageLimitService.getUserLimits(userId);

      return res.status(200).json({
        success: true,
        data: limits,
      });
    } catch (error: any) {
      logger.error('Get user limits error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get usage limits',
      });
    }
  }

  async checkLimit(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { resourceType } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const result = await this.usageLimitService.canPerformAction(
        userId,
        resourceType as any
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Check limit error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to check limit',
      });
    }
  }

  async getResourceUsage(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { resourceType } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const usage = await this.usageLimitService.getResourceUsage(
        userId,
        resourceType as any
      );

      return res.status(200).json({
        success: true,
        data: usage,
      });
    } catch (error: any) {
      logger.error('Get resource usage error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get resource usage',
      });
    }
  }
}

export default new UsageLimitController();
