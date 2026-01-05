import { Request, Response, NextFunction } from 'express';

import { DailyRewardService } from '../../domain/services/DailyReward.service';
import { getDbConnection } from '../../infrastructure/database/connection';

export class DailyRewardController {
  private service: DailyRewardService;

  constructor() {
    const db = getDbConnection();
    this.service = new DailyRewardService(db);
  }

  getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const status = await this.service.getDailyRewardStatus(userId);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  };

  claimReward = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const result = await this.service.claimDailyReward(userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
          data: {
            currentStreak: result.newStreak,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          reward: result.reward,
          newStreak: result.newStreak,
          nextReward: result.nextReward,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getCalendar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const calendar = await this.service.getRewardCalendar();

      res.status(200).json({
        success: true,
        data: calendar,
      });
    } catch (error) {
      next(error);
    }
  };

  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const stats = await this.service.getUserRewardStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string) || 30;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const history = await this.service.getRewardHistory(userId, limit);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  };

  getLeaderboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const leaderboard = await this.service.getTopStreakUsers(limit);

      res.status(200).json({
        success: true,
        data: leaderboard,
      });
    } catch (error) {
      next(error);
    }
  };

  updateCalendar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { dayNumber } = req.params;
      const updateData = req.body;

      // Admin-only endpoint - should add admin middleware
      const updatedConfig = await this.service.updateRewardCalendar(
        parseInt(dayNumber),
        updateData
      );

      res.status(200).json({
        success: true,
        data: updatedConfig,
      });
    } catch (error) {
      next(error);
    }
  };
}
