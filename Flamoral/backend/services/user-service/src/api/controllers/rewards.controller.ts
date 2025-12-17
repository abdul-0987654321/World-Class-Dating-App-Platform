/**
 * Rewards Controller
 * Handles HTTP requests for daily login rewards and streaks
 */

import { Request, Response } from 'express';
import { RewardsService } from '../../services/rewards.service';
import { Pool } from 'pg';

export class RewardsController {
  private rewardsService: RewardsService;

  constructor(dbPool: Pool) {
    this.rewardsService = new RewardsService(dbPool);
  }

  /**
   * GET /api/rewards/streak
   * Get user's current streak status
   */
  getStreakStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const streakStatus = await this.rewardsService.getUserStreakStatus(userId);

      res.status(200).json({
        success: true,
        data: streakStatus,
      });
    } catch (error) {
      console.error('Error getting streak status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get streak status',
      });
    }
  };

  /**
   * POST /api/rewards/login
   * Record user login and update streak
   */
  recordLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const streakResult = await this.rewardsService.recordLogin(userId);

      res.status(200).json({
        success: true,
        data: {
          streakBroken: streakResult.streakBroken,
          currentStreak: streakResult.newStreakValue,
          daysSkipped: streakResult.daysSkipped,
          message: streakResult.streakBroken
            ? 'Streak was broken. Starting fresh!'
            : `Great! Your streak is now ${streakResult.newStreakValue} days!`,
        },
      });
    } catch (error) {
      console.error('Error recording login:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record login',
      });
    }
  };

  /**
   * POST /api/rewards/claim
   * Claim daily reward
   */
  claimDailyReward = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const claimResult = await this.rewardsService.claimDailyReward(userId);

      if (!claimResult.success) {
        res.status(400).json({
          success: false,
          message: claimResult.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: claimResult.message,
        data: {
          reward: claimResult.reward,
          currentStreak: claimResult.newStreak,
          nextReward: claimResult.nextReward,
          expiresAt: claimResult.expiresAt,
        },
      });
    } catch (error) {
      console.error('Error claiming daily reward:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to claim reward',
      });
    }
  };

  /**
   * GET /api/rewards/calendar
   * Get the 7-day reward calendar
   */
  getRewardCalendar = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const streakStatus = await this.rewardsService.getUserStreakStatus(userId);

      // Get all 7 days of rewards
      const calendar = [];
      for (let day = 1; day <= 7; day++) {
        const reward = await this.rewardsService.getRewardConfig(day);
        if (reward) {
          calendar.push({
            ...reward,
            isCurrent: day === streakStatus.currentDayInCycle,
            isCompleted: day < streakStatus.currentDayInCycle,
          });
        }
      }

      res.status(200).json({
        success: true,
        data: {
          calendar,
          currentStreak: streakStatus.currentStreak,
          currentDayInCycle: streakStatus.currentDayInCycle,
          canClaimToday: streakStatus.canClaimToday,
          hoursUntilNextClaim: streakStatus.hoursUntilNextClaim,
        },
      });
    } catch (error) {
      console.error('Error getting reward calendar:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get reward calendar',
      });
    }
  };

  /**
   * GET /api/rewards/history
   * Get user's reward claim history
   */
  getRewardHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { limit = 50, offset = 0, rewardType } = req.query;

      const history = await this.rewardsService.getUserRewardHistory({
        userId,
        limit: Number(limit),
        offset: Number(offset),
        rewardType: rewardType as any,
      });

      res.status(200).json({
        success: true,
        data: {
          history,
          pagination: {
            limit: Number(limit),
            offset: Number(offset),
            total: history.length,
          },
        },
      });
    } catch (error) {
      console.error('Error getting reward history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get reward history',
      });
    }
  };

  /**
   * GET /api/rewards/stats
   * Get user's reward statistics
   */
  getRewardStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const streak = await this.rewardsService.getUserStreak(userId);

      if (!streak) {
        res.status(404).json({
          success: false,
          error: 'Streak not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          totalLogins: streak.totalLogins,
          totalRewardsClaimed: streak.totalRewardsClaimed,
          lastLoginDate: streak.lastLoginDate,
          lastClaimDate: streak.lastClaimDate,
        },
      });
    } catch (error) {
      console.error('Error getting reward stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get reward stats',
      });
    }
  };
}
