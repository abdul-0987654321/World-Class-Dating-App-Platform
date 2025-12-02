import { Request, Response, NextFunction } from 'express';
import { getDbConnection } from '../../infrastructure/database/connection';
import { ExperienceService } from '../../domain/services/Experience.service';
import { StreakService } from '../../domain/services/Streak.service';
import { ChallengeService } from '../../domain/services/Challenge.service';
import { BadgeService } from '../../domain/services/Badge.service';
import { AchievementService } from '../../domain/services/Achievement.service';

/**
 * Unified Gamification Controller
 * Handles all gamification features: XP, Levels, Streaks, Challenges, Badges, Achievements
 */
export class GamificationController {
  private experienceService: ExperienceService;
  private streakService: StreakService;
  private challengeService: ChallengeService;
  private badgeService: BadgeService;
  private achievementService: AchievementService;

  constructor() {
    const db = getDbConnection();
    this.experienceService = new ExperienceService(db);
    this.streakService = new StreakService(db);
    this.challengeService = new ChallengeService(db);
    this.badgeService = new BadgeService(db);
    this.achievementService = new AchievementService(db);
  }

  // ============ OVERVIEW ============
  getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      // Get all gamification data
      const [experience, streaks, challenges, badges, achievements] = await Promise.all([
        this.experienceService.getUserExperience(userId),
        this.streakService.getUserStreaks(userId),
        this.challengeService.getActiveChallenges(userId),
        this.badgeService.getUserEquippedBadges(userId),
        this.achievementService.getUserAchievements(userId),
      ]);

      res.status(200).json({
        success: true,
        data: {
          experience,
          streaks,
          challenges,
          badges,
          achievements: achievements.filter(a => a.isUnlocked),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // ============ EXPERIENCE / LEVELS ============
  getUserExperience = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const experience = await this.experienceService.getUserExperience(userId);

      res.status(200).json({
        success: true,
        data: experience,
      });
    } catch (error) {
      next(error);
    }
  };

  getXPTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const transactions = await this.experienceService.getXPTransactions(userId, limit, offset);

      res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      next(error);
    }
  };

  getLevelDefinitions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const levels = await this.experienceService.getLevelDefinitions();

      res.status(200).json({
        success: true,
        data: levels,
      });
    } catch (error) {
      next(error);
    }
  };

  getXPLeaderboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await this.experienceService.getXPLeaderboard(limit);

      res.status(200).json({
        success: true,
        data: leaderboard,
      });
    } catch (error) {
      next(error);
    }
  };

  // ============ STREAKS ============
  getUserStreaks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const streaks = await this.streakService.getUserStreaks(userId);

      res.status(200).json({
        success: true,
        data: streaks,
      });
    } catch (error) {
      next(error);
    }
  };

  protectStreak = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { streakType, durationHours } = req.body;

      const updatedStreak = await this.streakService.protectStreak(
        userId,
        streakType,
        durationHours || 24
      );

      res.status(200).json({
        success: true,
        message: 'Streak protected',
        data: updatedStreak,
      });
    } catch (error) {
      next(error);
    }
  };

  getStreakLeaderboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const streakType = (req.query.type as any) || 'login';
      const limit = parseInt(req.query.limit as string) || 10;

      const leaderboard = await this.streakService.getStreakLeaderboard(streakType, limit);

      res.status(200).json({
        success: true,
        data: leaderboard,
      });
    } catch (error) {
      next(error);
    }
  };

  // ============ CHALLENGES ============
  getActiveChallenges = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const challenges = await this.challengeService.getActiveChallenges(userId);

      res.status(200).json({
        success: true,
        data: challenges,
      });
    } catch (error) {
      next(error);
    }
  };

  getAvailableChallenges = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const type = req.query.type as any;
      const challenges = await this.challengeService.getAvailableChallenges(userId, type);

      res.status(200).json({
        success: true,
        data: challenges,
      });
    } catch (error) {
      next(error);
    }
  };

  startChallenge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { challengeId } = req.body;

      const userChallenge = await this.challengeService.startChallenge(userId, challengeId);

      res.status(201).json({
        success: true,
        message: 'Challenge started',
        data: userChallenge,
      });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('already started')) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  };

  // ============ BADGES ============
  getAllBadges = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const badges = await this.badgeService.getAllBadges();

      res.status(200).json({
        success: true,
        data: badges,
      });
    } catch (error) {
      next(error);
    }
  };

  getUserBadges = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const badges = await this.badgeService.getUserBadges(userId);

      res.status(200).json({
        success: true,
        data: badges,
      });
    } catch (error) {
      next(error);
    }
  };

  equipBadge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { badgeId } = req.params;
      const { equipped } = req.body;

      const badge = await this.badgeService.equipBadge(userId, badgeId, equipped);

      res.status(200).json({
        success: true,
        message: equipped ? 'Badge equipped' : 'Badge unequipped',
        data: badge,
      });
    } catch (error: any) {
      if (error.message.includes('not have') || error.message.includes('Maximum')) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  };

  // ============ WEBHOOKS (Internal Use) ============
  trackAction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, actionType, metadata } = req.body;

      // Track in all systems
      const results: any = {
        experience: null,
        achievements: null,
        challenges: null,
        streaks: null,
        badges: null,
      };

      // Track XP
      try {
        results.experience = await this.experienceService.awardXP(userId, actionType, 1.0, metadata);
      } catch (error) {
        // Continue if XP tracking fails
      }

      // Track achievements
      if (actionType === 'SWIPE') {
        await this.achievementService.trackSwipe(userId, metadata.totalSwipes);
      } else if (actionType === 'MATCH') {
        await this.achievementService.trackMatch(userId, metadata.totalMatches, metadata.isSuperLike);
      } else if (actionType === 'SEND_MESSAGE') {
        await this.achievementService.trackMessage(userId, metadata.totalMessages, metadata.responseTime);
      }

      // Track challenges
      if (actionType === 'SWIPE') {
        results.challenges = await this.challengeService.trackSwipe(userId);
      } else if (actionType === 'MATCH') {
        results.challenges = await this.challengeService.trackMatch(userId);
      } else if (actionType === 'SEND_MESSAGE') {
        results.challenges = await this.challengeService.trackMessage(userId);
      } else if (actionType === 'DAILY_LOGIN') {
        results.challenges = await this.challengeService.trackLogin(userId);
      }

      // Track streaks
      if (actionType === 'DAILY_LOGIN') {
        results.streaks = await this.streakService.updateLoginStreak(userId);
      } else if (actionType === 'SEND_MESSAGE') {
        results.streaks = await this.streakService.updateConversationStreak(userId);
      } else if (actionType === 'MATCH') {
        results.streaks = await this.streakService.updateMatchStreak(userId);
      }

      // Auto-award badges
      results.badges = await this.badgeService.autoAwardBadges(userId);

      res.status(200).json({
        success: true,
        message: 'Action tracked',
        data: results,
      });
    } catch (error) {
      next(error);
    }
  };
}
