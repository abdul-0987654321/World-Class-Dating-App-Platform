import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { InterestIntentionBadgeService } from '../../domain/services/interestIntentionBadge.service';
import logger from '../../utils/logger';

export class InterestIntentionBadgeController {
  private badgeService: InterestIntentionBadgeService;

  constructor(badgeService?: InterestIntentionBadgeService) {
    this.badgeService = badgeService || new InterestIntentionBadgeService();
  }

  // ============================================
  // GET ALL AVAILABLE BADGES
  // ============================================

  async getAllInterestBadges(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const badges = await this.badgeService.getAllInterestBadges();

      return res.status(200).json({
        success: true,
        data: badges,
      });
    } catch (error: any) {
      logger.error('Get all interest badges error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch interest badges',
      });
    }
  }

  async getInterestBadgesByCategory(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { category } = req.params;
      const badges = await this.badgeService.getInterestBadgesByCategory(category);

      return res.status(200).json({
        success: true,
        data: badges,
      });
    } catch (error: any) {
      logger.error('Get interest badges by category error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch interest badges',
      });
    }
  }

  async getAllIntentionBadges(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const badges = await this.badgeService.getAllIntentionBadges();

      return res.status(200).json({
        success: true,
        data: badges,
      });
    } catch (error: any) {
      logger.error('Get all intention badges error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch intention badges',
      });
    }
  }

  // ============================================
  // GET USER'S SELECTED BADGES
  // ============================================

  async getUserBadgesProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const targetUserId = req.params.userId || userId;

      const profile = await this.badgeService.getUserBadgesProfile(targetUserId);

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      logger.error('Get user badges profile error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch user badges',
      });
    }
  }

  async getUserInterestBadges(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const targetUserId = req.params.userId || userId;

      const badges = await this.badgeService.getUserInterestBadges(targetUserId);

      return res.status(200).json({
        success: true,
        data: badges,
      });
    } catch (error: any) {
      logger.error('Get user interest badges error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch user interest badges',
      });
    }
  }

  async getUserIntentionBadges(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const targetUserId = req.params.userId || userId;

      const badges = await this.badgeService.getUserIntentionBadges(targetUserId);

      return res.status(200).json({
        success: true,
        data: badges,
      });
    } catch (error: any) {
      logger.error('Get user intention badges error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch user intention badges',
      });
    }
  }

  // ============================================
  // UPDATE USER'S SELECTED BADGES
  // ============================================

  async updateUserInterestBadges(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const badges = await this.badgeService.updateUserInterestBadges(userId, req.body);

      return res.status(200).json({
        success: true,
        message: 'Interest badges updated successfully',
        data: badges,
      });
    } catch (error: any) {
      logger.error('Update user interest badges error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update interest badges',
      });
    }
  }

  async updateUserIntentionBadges(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const badges = await this.badgeService.updateUserIntentionBadges(userId, req.body);

      return res.status(200).json({
        success: true,
        message: 'Intention badges updated successfully',
        data: badges,
      });
    } catch (error: any) {
      logger.error('Update user intention badges error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update intention badges',
      });
    }
  }

  // ============================================
  // ADD/REMOVE INDIVIDUAL BADGES
  // ============================================

  async addInterestBadge(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { badge_id } = req.body;

      await this.badgeService.addInterestBadge(userId, badge_id);

      return res.status(201).json({
        success: true,
        message: 'Interest badge added successfully',
      });
    } catch (error: any) {
      logger.error('Add interest badge error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to add interest badge',
      });
    }
  }

  async removeInterestBadge(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { badgeId } = req.params;

      await this.badgeService.removeInterestBadge(userId, badgeId);

      return res.status(200).json({
        success: true,
        message: 'Interest badge removed successfully',
      });
    } catch (error: any) {
      logger.error('Remove interest badge error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to remove interest badge',
      });
    }
  }

  async addIntentionBadge(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { badge_id, priority } = req.body;

      if (!priority || (priority !== 1 && priority !== 2)) {
        return res.status(400).json({
          success: false,
          message: 'Priority must be 1 or 2',
        });
      }

      await this.badgeService.addIntentionBadge(userId, badge_id, priority);

      return res.status(201).json({
        success: true,
        message: 'Intention badge added successfully',
      });
    } catch (error: any) {
      logger.error('Add intention badge error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to add intention badge',
      });
    }
  }

  async removeIntentionBadge(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { badgeId } = req.params;

      await this.badgeService.removeIntentionBadge(userId, badgeId);

      return res.status(200).json({
        success: true,
        message: 'Intention badge removed successfully',
      });
    } catch (error: any) {
      logger.error('Remove intention badge error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to remove intention badge',
      });
    }
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async getInterestBadgePopularity(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const stats = await this.badgeService.getInterestBadgePopularity();

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Get interest badge popularity error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch popularity statistics',
      });
    }
  }

  async getIntentionBadgeDistribution(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const stats = await this.badgeService.getIntentionBadgeDistribution();

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Get intention badge distribution error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch distribution statistics',
      });
    }
  }
}
