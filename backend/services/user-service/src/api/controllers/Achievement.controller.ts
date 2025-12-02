import { Request, Response, NextFunction } from 'express';
import { AchievementService } from '../../domain/services/Achievement.service';
import { getDbConnection } from '../../infrastructure/database/connection';

export class AchievementController {
  private service: AchievementService;

  constructor() {
    const db = getDbConnection();
    this.service = new AchievementService(db);
  }

  getAllAchievements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const achievements = await this.service.getAllAchievements();

      res.status(200).json({
        success: true,
        data: achievements,
      });
    } catch (error) {
      next(error);
    }
  };

  getUserAchievements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const achievements = await this.service.getUserAchievements(userId);

      res.status(200).json({
        success: true,
        data: achievements,
      });
    } catch (error) {
      next(error);
    }
  };

  getUserAchievementsByCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { category } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const achievements = await this.service.getUserAchievementsByCategory(
        userId,
        category
      );

      res.status(200).json({
        success: true,
        data: achievements,
      });
    } catch (error) {
      next(error);
    }
  };

  getUnlockedAchievements = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const achievements = await this.service.getUnlockedAchievements(userId);

      res.status(200).json({
        success: true,
        data: achievements,
      });
    } catch (error) {
      next(error);
    }
  };

  getShowcase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user?.id;

      // Allow users to view their own showcase or others'
      const targetUserId = userId || requestingUserId;

      if (!targetUserId) {
        res.status(400).json({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      const showcase = await this.service.getShowcasedAchievements(targetUserId);

      res.status(200).json({
        success: true,
        data: showcase,
      });
    } catch (error) {
      next(error);
    }
  };

  toggleShowcase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { achievementId } = req.params;
      const { showcase, order } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const achievement = await this.service.toggleShowcase(
        userId,
        achievementId,
        showcase,
        order
      );

      res.status(200).json({
        success: true,
        message: showcase
          ? 'Achievement added to showcase'
          : 'Achievement removed from showcase',
        data: achievement,
      });
    } catch (error: any) {
      if (error.message === 'Achievement not unlocked') {
        res.status(403).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message === 'Maximum 3 achievements can be showcased') {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }

      next(error);
    }
  };

  getUserStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user?.id;

      const targetUserId = userId || requestingUserId;

      if (!targetUserId) {
        res.status(400).json({
          success: false,
          message: 'User ID required',
        });
        return;
      }

      const stats = await this.service.getUserStats(targetUserId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  getLeaderboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const leaderboard = await this.service.getAchievementLeaderboard(limit);

      res.status(200).json({
        success: true,
        data: leaderboard,
      });
    } catch (error) {
      next(error);
    }
  };

  // Webhook endpoints for tracking (called internally by other services)
  trackProfileCompletion = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId, completionPercentage } = req.body;

      await this.service.trackProfileCompletion(userId, completionPercentage);

      res.status(200).json({
        success: true,
        message: 'Profile completion tracked',
      });
    } catch (error) {
      next(error);
    }
  };

  trackPhotoUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, totalPhotos } = req.body;

      await this.service.trackPhotoUpload(userId, totalPhotos);

      res.status(200).json({
        success: true,
        message: 'Photo upload tracked',
      });
    } catch (error) {
      next(error);
    }
  };

  trackVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, verificationType } = req.body;

      if (verificationType === 'phone') {
        await this.service.trackPhoneVerification(userId);
      } else if (verificationType === 'photo') {
        await this.service.trackPhotoVerification(userId);
      }

      res.status(200).json({
        success: true,
        message: 'Verification tracked',
      });
    } catch (error) {
      next(error);
    }
  };

  trackMatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, totalMatches, isSuperLike } = req.body;

      await this.service.trackMatch(userId, totalMatches, isSuperLike);

      res.status(200).json({
        success: true,
        message: 'Match tracked',
      });
    } catch (error) {
      next(error);
    }
  };

  trackMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, totalMessages, responseTime } = req.body;

      await this.service.trackMessage(userId, totalMessages, responseTime);

      res.status(200).json({
        success: true,
        message: 'Message tracked',
      });
    } catch (error) {
      next(error);
    }
  };

  trackSwipe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, totalSwipes } = req.body;

      await this.service.trackSwipe(userId, totalSwipes);

      res.status(200).json({
        success: true,
        message: 'Swipe tracked',
      });
    } catch (error) {
      next(error);
    }
  };

  trackLoginStreak = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, streakDays } = req.body;

      await this.service.trackLoginStreak(userId, streakDays);

      res.status(200).json({
        success: true,
        message: 'Login streak tracked',
      });
    } catch (error) {
      next(error);
    }
  };

  trackSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.body;

      await this.service.trackSubscription(userId);

      res.status(200).json({
        success: true,
        message: 'Subscription tracked',
      });
    } catch (error) {
      next(error);
    }
  };

  trackReferral = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, totalReferrals } = req.body;

      await this.service.trackReferral(userId, totalReferrals);

      res.status(200).json({
        success: true,
        message: 'Referral tracked',
      });
    } catch (error) {
      next(error);
    }
  };
}
