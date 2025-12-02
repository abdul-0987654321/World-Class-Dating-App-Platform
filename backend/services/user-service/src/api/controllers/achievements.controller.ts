/**
 * Achievements Controller
 * Handles HTTP requests for achievements system
 */

import { Request, Response } from 'express';
import { AchievementsService } from '../../services/achievements.service';
import { Pool } from 'pg';
import { AchievementCategory, AchievementTier } from '../../domain/entities/Achievement.entity';

export class AchievementsController {
  private achievementsService: AchievementsService;

  constructor(dbPool: Pool) {
    this.achievementsService = new AchievementsService(dbPool);
  }

  /**
   * GET /api/achievements
   * Get all available achievements
   */
  getAllAchievements = async (req: Request, res: Response): Promise<void> => {
    try {
      const { category, tier, includeHidden = 'false' } = req.query;

      const filters: any = {
        isActive: true,
      };

      if (category) {
        filters.category = category as AchievementCategory;
      }

      if (tier) {
        filters.tier = tier as AchievementTier;
      }

      if (includeHidden === 'false') {
        filters.isHidden = false;
      }

      const achievements = await this.achievementsService.getAllAchievements(filters);

      res.status(200).json({
        success: true,
        data: achievements,
      });
    } catch (error) {
      console.error('Error getting achievements:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get achievements',
      });
    }
  };

  /**
   * GET /api/achievements/:id
   * Get achievement by ID
   */
  getAchievementById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const achievement = await this.achievementsService.getAchievementById(id);

      if (!achievement) {
        res.status(404).json({
          success: false,
          error: 'Achievement not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: achievement,
      });
    } catch (error) {
      console.error('Error getting achievement:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get achievement',
      });
    }
  };

  /**
   * GET /api/achievements/user/me
   * Get current user's achievements with progress
   */
  getUserAchievements = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { includeHidden = 'false' } = req.query;

      const achievements = await this.achievementsService.getUserAchievements(
        userId,
        includeHidden === 'true'
      );

      res.status(200).json({
        success: true,
        data: achievements,
      });
    } catch (error) {
      console.error('Error getting user achievements:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user achievements',
      });
    }
  };

  /**
   * GET /api/achievements/user/me/unlocked
   * Get current user's unlocked achievements
   */
  getUnlockedAchievements = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const achievements = await this.achievementsService.getUnlockedAchievements(userId);

      res.status(200).json({
        success: true,
        data: achievements,
      });
    } catch (error) {
      console.error('Error getting unlocked achievements:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get unlocked achievements',
      });
    }
  };

  /**
   * GET /api/achievements/user/me/showcase
   * Get current user's showcased achievements
   */
  getShowcaseAchievements = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const achievements = await this.achievementsService.getShowcaseAchievements(userId);

      res.status(200).json({
        success: true,
        data: achievements,
      });
    } catch (error) {
      console.error('Error getting showcase achievements:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get showcase achievements',
      });
    }
  };

  /**
   * GET /api/achievements/user/:userId/showcase
   * Get another user's showcased achievements
   */
  getOtherUserShowcase = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      const achievements = await this.achievementsService.getShowcaseAchievements(userId);

      res.status(200).json({
        success: true,
        data: achievements,
      });
    } catch (error) {
      console.error('Error getting user showcase:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user showcase',
      });
    }
  };

  /**
   * PUT /api/achievements/:achievementId/showcase
   * Toggle achievement showcase on profile
   */
  toggleShowcase = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { achievementId } = req.params;
      const { show } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (typeof show !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'Field "show" must be a boolean',
        });
        return;
      }

      const success = await this.achievementsService.toggleAchievementShowcase(
        userId,
        achievementId,
        show
      );

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Achievement not found or not unlocked',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: show
          ? 'Achievement added to showcase'
          : 'Achievement removed from showcase',
      });
    } catch (error: any) {
      console.error('Error toggling showcase:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to toggle showcase',
      });
    }
  };

  /**
   * GET /api/achievements/user/me/stats
   * Get current user's achievement statistics
   */
  getAchievementStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const stats = await this.achievementsService.getUserAchievementStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error getting achievement stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get achievement stats',
      });
    }
  };

  /**
   * POST /api/achievements/progress
   * Update achievement progress (Internal API)
   */
  updateProgress = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, requirementType, incrementValue, absoluteValue } = req.body;

      if (!userId || !requirementType) {
        res.status(400).json({
          success: false,
          error: 'userId and requirementType are required',
        });
        return;
      }

      const unlockResults = await this.achievementsService.updateProgress({
        userId,
        requirementType,
        incrementValue,
        absoluteValue,
      });

      res.status(200).json({
        success: true,
        data: {
          progressUpdated: true,
          newUnlocks: unlockResults.filter((r) => r.unlocked),
        },
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update progress',
      });
    }
  };

  /**
   * POST /api/achievements/initialize/:userId
   * Initialize achievements for a new user (Internal API)
   */
  initializeUserAchievements = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      await this.achievementsService.initializeUserAchievements(userId);

      res.status(201).json({
        success: true,
        message: 'User achievements initialized',
      });
    } catch (error) {
      console.error('Error initializing achievements:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize achievements',
      });
    }
  };

  /**
   * POST /api/achievements (Admin only)
   * Create a new achievement
   */
  createAchievement = async (req: Request, res: Response): Promise<void> => {
    try {
      const achievementData = req.body;

      const achievement = await this.achievementsService.createAchievement(achievementData);

      res.status(201).json({
        success: true,
        data: achievement,
      });
    } catch (error) {
      console.error('Error creating achievement:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create achievement',
      });
    }
  };

  /**
   * PUT /api/achievements/:id (Admin only)
   * Update an achievement
   */
  updateAchievement = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const achievement = await this.achievementsService.updateAchievement(id, updates);

      if (!achievement) {
        res.status(404).json({
          success: false,
          error: 'Achievement not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: achievement,
      });
    } catch (error) {
      console.error('Error updating achievement:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update achievement',
      });
    }
  };
}
