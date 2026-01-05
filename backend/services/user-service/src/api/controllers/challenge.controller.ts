/**
 * Challenge Controller
 * Handles HTTP requests for the gamification challenge system
 */

import { Response } from 'express';

import { ChallengeService } from '../../domain/services/Challenge.service';
import db from '../../infrastructure/database/connection';
import logger from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export class ChallengeController {
  private challengeService: ChallengeService;

  constructor() {
    this.challengeService = new ChallengeService(db);
  }

  /**
   * GET /api/v1/challenges
   * Get all active challenges for the user
   */
  getActiveChallenges = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const { type } = req.query;

      // Get available challenges the user can start
      const availableChallenges = await this.challengeService.getAvailableChallenges(
        userId,
        type as any
      );

      // Get user's current active challenges
      const activeChallenges = await this.challengeService.getActiveChallenges(userId);

      // Get daily challenges
      const dailyChallenges = await this.challengeService.getDailyChallenges(userId);

      // Get weekly challenges
      const weeklyChallenges = await this.challengeService.getWeeklyChallenges(userId);

      return res.status(200).json({
        success: true,
        data: {
          available: availableChallenges,
          active: activeChallenges,
          daily: dailyChallenges,
          weekly: weeklyChallenges,
        },
      });
    } catch (error: any) {
      logger.error('Get active challenges error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get challenges',
      });
    }
  };

  /**
   * GET /api/v1/challenges/available
   * Get all available challenges the user can start
   */
  getAvailableChallenges = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const { type } = req.query;

      const challenges = await this.challengeService.getAvailableChallenges(userId, type as any);

      return res.status(200).json({
        success: true,
        data: challenges,
      });
    } catch (error: any) {
      logger.error('Get available challenges error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get available challenges',
      });
    }
  };

  /**
   * POST /api/v1/challenges/:id/start
   * Start a specific challenge
   */
  startChallenge = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.userId;
      const { id: challengeId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!challengeId) {
        return res.status(400).json({
          success: false,
          message: 'Challenge ID is required',
        });
      }

      const userChallenge = await this.challengeService.startChallenge(userId, challengeId);

      return res.status(201).json({
        success: true,
        message: 'Challenge started successfully',
        data: userChallenge,
      });
    } catch (error: any) {
      logger.error('Start challenge error:', error);

      const statusCode =
        error.message.includes('not found') || error.message.includes('inactive')
          ? 404
          : error.message.includes('already')
            ? 400
            : 500;

      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to start challenge',
      });
    }
  };

  /**
   * GET /api/v1/challenges/:id/progress
   * Get progress for a specific challenge
   */
  getChallengeProgress = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.userId;
      const { id: challengeId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!challengeId) {
        return res.status(400).json({
          success: false,
          message: 'Challenge ID is required',
        });
      }

      // Get challenge definition
      const challenge = await db('challenge_definitions').where({ id: challengeId }).first();

      if (!challenge) {
        return res.status(404).json({
          success: false,
          message: 'Challenge not found',
        });
      }

      // Get user's progress
      const userChallenge = await db('user_challenges')
        .where({ user_id: userId, challenge_id: challengeId })
        .first();

      if (!userChallenge) {
        return res.status(404).json({
          success: false,
          message: 'Challenge not started by user',
        });
      }

      // Calculate time remaining
      const now = new Date();
      const expiresAt = userChallenge.expires_at ? new Date(userChallenge.expires_at) : null;
      const timeRemaining = expiresAt ? Math.max(0, expiresAt.getTime() - now.getTime()) : null;
      const daysRemaining = timeRemaining ? Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)) : null;

      return res.status(200).json({
        success: true,
        data: {
          challenge: {
            id: challenge.id,
            key: challenge.key,
            title: challenge.title,
            description: challenge.description,
            type: challenge.type,
            category: challenge.category,
            difficulty: challenge.difficulty,
            targetValue: challenge.target_value,
            rewards: {
              coins: challenge.coin_reward,
              xp: challenge.xp_reward,
              boosts: challenge.boost_reward,
              superLikes: challenge.super_like_reward,
            },
            iconName: challenge.icon_name,
            badgeColor: challenge.badge_color,
          },
          progress: {
            id: userChallenge.id,
            status: userChallenge.status,
            currentProgress: userChallenge.progress,
            targetProgress: userChallenge.target,
            progressPercentage: userChallenge.progress_percentage,
            startedAt: userChallenge.started_at,
            completedAt: userChallenge.completed_at,
            expiresAt: userChallenge.expires_at,
            daysRemaining,
            rewardClaimed: userChallenge.reward_claimed,
            timesCompleted: userChallenge.times_completed,
          },
        },
      });
    } catch (error: any) {
      logger.error('Get challenge progress error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get challenge progress',
      });
    }
  };

  /**
   * POST /api/v1/challenges/:id/claim
   * Claim reward for a completed challenge
   */
  claimReward = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.userId;
      const { id: challengeId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!challengeId) {
        return res.status(400).json({
          success: false,
          message: 'Challenge ID is required',
        });
      }

      // Get user's challenge
      const userChallenge = await db('user_challenges')
        .where({ user_id: userId, challenge_id: challengeId })
        .first();

      if (!userChallenge) {
        return res.status(404).json({
          success: false,
          message: 'Challenge not found',
        });
      }

      if (userChallenge.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Challenge is not completed yet',
        });
      }

      if (userChallenge.reward_claimed) {
        return res.status(400).json({
          success: false,
          message: 'Reward already claimed',
        });
      }

      // Get challenge definition for rewards
      const challenge = await db('challenge_definitions').where({ id: challengeId }).first();

      if (!challenge) {
        return res.status(404).json({
          success: false,
          message: 'Challenge definition not found',
        });
      }

      // Mark reward as claimed
      await db('user_challenges').where({ id: userChallenge.id }).update({
        reward_claimed: true,
        reward_claimed_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      // Return success with rewards info
      return res.status(200).json({
        success: true,
        message: 'Reward claimed successfully',
        data: {
          challengeId: challenge.id,
          challengeTitle: challenge.title,
          rewards: {
            coins: challenge.coin_reward,
            xp: challenge.xp_reward,
            boosts: challenge.boost_reward,
            superLikes: challenge.super_like_reward,
          },
          claimedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('Claim reward error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to claim reward',
      });
    }
  };

  /**
   * GET /api/v1/challenges/daily
   * Get daily challenges with auto-generation
   */
  getDailyChallenges = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      // Auto-generate daily challenges if needed
      await this.challengeService.generateDailyChallenges(userId);

      // Get all daily challenges for user
      const dailyChallenges = await this.challengeService.getDailyChallenges(userId);

      return res.status(200).json({
        success: true,
        data: dailyChallenges,
      });
    } catch (error: any) {
      logger.error('Get daily challenges error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get daily challenges',
      });
    }
  };

  /**
   * GET /api/v1/challenges/weekly
   * Get weekly challenges
   */
  getWeeklyChallenges = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const weeklyChallenges = await this.challengeService.getWeeklyChallenges(userId);

      return res.status(200).json({
        success: true,
        data: weeklyChallenges,
      });
    } catch (error: any) {
      logger.error('Get weekly challenges error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get weekly challenges',
      });
    }
  };

  /**
   * GET /api/v1/challenges/monthly
   * Get monthly challenges
   */
  getMonthlyChallenges = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const monthlyChallenges = await this.challengeService.getMonthlyChallenges(userId);

      return res.status(200).json({
        success: true,
        data: monthlyChallenges,
      });
    } catch (error: any) {
      logger.error('Get monthly challenges error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get monthly challenges',
      });
    }
  };

  /**
   * POST /api/v1/challenges/progress (Internal API)
   * Update progress for challenges based on user actions
   */
  updateProgress = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
      const { userId, actionType, progressIncrement } = req.body;

      if (!userId || !actionType) {
        return res.status(400).json({
          success: false,
          message: 'userId and actionType are required',
        });
      }

      let result = null;

      switch (actionType) {
        case 'swipe':
          result = await this.challengeService.trackSwipe(userId);
          break;
        case 'message':
          result = await this.challengeService.trackMessage(userId);
          break;
        case 'match':
          result = await this.challengeService.trackMatch(userId);
          break;
        case 'login':
          result = await this.challengeService.trackLogin(userId);
          break;
        case 'profile_update':
          result = await this.challengeService.trackProfileUpdate(userId);
          break;
        default:
          // Generic progress update
          result = await this.challengeService.updateChallengeProgress(userId, {
            user_id: userId,
            challenge_id: req.body.challengeId || '',
            progress_increment: progressIncrement || 1,
          });
      }

      return res.status(200).json({
        success: true,
        data: {
          progressUpdated: true,
          completedChallenge: result,
        },
      });
    } catch (error: any) {
      logger.error('Update progress error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to update progress',
      });
    }
  };
}

export default new ChallengeController();
