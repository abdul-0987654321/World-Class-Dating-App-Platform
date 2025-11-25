/**
 * Gamification API Routes
 * Daily rewards, streaks, achievements, quests, spin wheel
 */

import { Router, Request, Response, NextFunction } from 'express';
import { gamificationService } from '../../services/core/Gamification.service';
import { logger } from '../../utils/logger';

const router = Router();

// Middleware to extract user ID (in production, from JWT)
const getUserId = (req: Request): string => {
  return (req as any).user?.id || req.headers['x-user-id'] as string || 'demo_user';
};

/**
 * @swagger
 * /api/gamification/daily-reward:
 *   post:
 *     summary: Claim daily login reward
 *     tags: [Gamification]
 *     responses:
 *       200:
 *         description: Daily reward claimed successfully
 */
router.post('/daily-reward', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const result = await gamificationService.claimDailyReward(userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Daily reward already claimed today', code: 'ALREADY_CLAIMED' }
      });
    }

    res.json({
      success: true,
      data: {
        reward: result.reward,
        streak: result.streakInfo,
        streakBonus: result.streakBonus,
        totalCoinsAwarded: result.totalCoinsAwarded,
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/gamification/streak:
 *   get:
 *     summary: Get user's streak information
 *     tags: [Gamification]
 */
router.get('/streak', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const streak = await gamificationService.getStreakInfo(userId);

    res.json({
      success: true,
      data: streak
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/gamification/achievements:
 *   get:
 *     summary: Get user's achievements
 *     tags: [Gamification]
 */
router.get('/achievements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const achievements = await gamificationService.getUserAchievements(userId);

    res.json({
      success: true,
      data: achievements
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/gamification/achievements/{achievementId}/progress:
 *   post:
 *     summary: Track progress towards an achievement
 *     tags: [Gamification]
 */
router.post('/achievements/:achievementId/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { achievementId } = req.params;
    const { increment = 1 } = req.body;

    const result = await gamificationService.trackAchievementProgress(userId, achievementId, increment);

    res.json({
      success: true,
      data: {
        unlocked: result.unlocked,
        achievement: result.achievement,
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/gamification/quests/daily:
 *   get:
 *     summary: Get user's daily quests
 *     tags: [Gamification]
 */
router.get('/quests/daily', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const quests = await gamificationService.getDailyQuests(userId);

    res.json({
      success: true,
      data: quests
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/gamification/quests/weekly:
 *   get:
 *     summary: Get user's weekly quests
 *     tags: [Gamification]
 */
router.get('/quests/weekly', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const quests = await gamificationService.getWeeklyQuests(userId);

    res.json({
      success: true,
      data: quests
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/gamification/quests/progress:
 *   post:
 *     summary: Update quest progress
 *     tags: [Gamification]
 */
router.post('/quests/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { action, increment = 1 } = req.body;

    const results = await gamificationService.updateQuestProgress(userId, action, increment);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/gamification/spin-wheel:
 *   get:
 *     summary: Get spin wheel configuration
 *     tags: [Gamification]
 */
router.get('/spin-wheel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const segments = gamificationService.getSpinWheelSegments();

    res.json({
      success: true,
      data: { segments }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/gamification/spin-wheel/spin:
 *   post:
 *     summary: Spin the wheel
 *     tags: [Gamification]
 */
router.post('/spin-wheel/spin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const result = await gamificationService.spinWheel(userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error, code: 'SPIN_FAILED' }
      });
    }

    res.json({
      success: true,
      data: {
        result: result.result,
        spinsRemaining: result.spinsRemaining,
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/gamification/balance:
 *   get:
 *     summary: Get user's coin and gem balance
 *     tags: [Gamification]
 */
router.get('/balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const [coins, gems] = await Promise.all([
      gamificationService.getCoinBalance(userId),
      gamificationService.getGemBalance(userId),
    ]);

    res.json({
      success: true,
      data: { coins, gems }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
