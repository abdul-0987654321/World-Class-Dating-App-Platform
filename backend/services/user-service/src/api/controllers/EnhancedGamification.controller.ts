import { Request, Response, NextFunction } from 'express';

import { AchievementBadgeService } from '../../domain/services/AchievementBadge.service';
import { BadgeService } from '../../domain/services/Badge.service';
import { CoinService } from '../../domain/services/coin.service';
import { DailyRewardService } from '../../domain/services/DailyReward.service';
import { StreakService } from '../../domain/services/Streak.service';
import { getDbConnection } from '../../infrastructure/database/connection';

/**
 * Enhanced Gamification Controller
 * Unified endpoint for all gamification features:
 * - Daily Login Rewards
 * - Achievement Badges
 * - Streak Counters
 * - Virtual Currency (Coins)
 * - XP and Levels
 */
export class EnhancedGamificationController {
  private dailyRewardService: DailyRewardService;
  private streakService: StreakService;
  private badgeService: BadgeService;
  private achievementBadgeService: AchievementBadgeService;
  private coinService: CoinService;
  private db: any;

  constructor() {
    this.db = getDbConnection();
    this.dailyRewardService = new DailyRewardService(this.db);
    this.streakService = new StreakService(this.db);
    this.badgeService = new BadgeService(this.db);
    this.achievementBadgeService = new AchievementBadgeService(this.db);
    this.coinService = new CoinService();
  }

  // =============================================
  // UNIFIED DASHBOARD
  // =============================================

  /**
   * Get complete gamification dashboard
   */
  getGamificationDashboard = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const [dailyRewardStatus, streaks, achievementStats, recentBadges, coinBalance, level] =
        await Promise.all([
          this.dailyRewardService.getDailyRewardStatus(userId),
          this.streakService.getUserStreaks(userId),
          this.achievementBadgeService.getUserAchievementStats(userId),
          this.achievementBadgeService.getUnlockedBadges(userId),
          this.coinService.getBalance(userId),
          this.getUserLevel(userId),
        ]);

      res.status(200).json({
        success: true,
        data: {
          dailyRewards: {
            canClaim: dailyRewardStatus.canClaim,
            currentStreak: dailyRewardStatus.currentStreak,
            dayInCycle: dailyRewardStatus.dayInCycle,
            todayReward: dailyRewardStatus.todayReward,
          },
          streaks: {
            login: streaks.find((s) => s.streakType === 'login') || null,
            conversation: streaks.find((s) => s.streakType === 'conversation') || null,
            match: streaks.find((s) => s.streakType === 'match') || null,
          },
          achievements: {
            unlocked: achievementStats.unlockedBadges,
            total: achievementStats.totalBadges,
            progress: achievementStats.totalProgress,
            recentBadges: recentBadges.slice(0, 5),
          },
          wallet: {
            coins: coinBalance?.balance || 0,
            totalEarned: coinBalance?.totalEarned || 0,
          },
          level: level,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // =============================================
  // DAILY LOGIN REWARDS
  // =============================================

  /**
   * Get daily reward status
   */
  getDailyRewardStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const status = await this.dailyRewardService.getDailyRewardStatus(userId);
      const calendar = await this.dailyRewardService.getRewardCalendar();

      res.status(200).json({
        success: true,
        data: {
          ...status,
          calendar,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Claim daily reward
   */
  claimDailyReward = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const result = await this.dailyRewardService.claimDailyReward(userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
        });
        return;
      }

      // Also update login streak
      await this.streakService.updateLoginStreak(userId);

      // Track achievement progress
      await this.achievementBadgeService.updateProgress(userId, 'daily_reward_streak', 1);

      // Check for weekly bonus
      const weeklyBonus = await this.checkWeeklyBonus(userId, result.newStreak);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          reward: result.reward,
          newStreak: result.newStreak,
          nextReward: result.nextReward,
          weeklyBonus: weeklyBonus,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check and claim weekly bonus
   */
  private async checkWeeklyBonus(userId: string, currentStreak: number): Promise<any> {
    const weekNumber = Math.floor(currentStreak / 7);
    if (weekNumber < 1) return null;

    // Check if already claimed
    const claimed = await this.db('user_weekly_bonus_claims')
      .where({ user_id: userId, week_number: weekNumber })
      .first();

    if (claimed) return null;

    // Get weekly bonus config
    const bonus = await this.db('weekly_bonus_rewards')
      .where({ week_number: weekNumber, is_active: true })
      .first();

    if (!bonus) return null;

    // Award bonus
    if (bonus.reward_type === 'coins' && bonus.reward_amount > 0) {
      await this.coinService.awardCoins(
        userId,
        bonus.reward_amount,
        `Weekly Streak Bonus: Week ${weekNumber}`,
        undefined,
        'weekly_bonus'
      );
    }

    // Record claim
    await this.db('user_weekly_bonus_claims').insert({
      user_id: userId,
      week_number: weekNumber,
      streak_at_claim: currentStreak,
      rewards_claimed: JSON.stringify({
        type: bonus.reward_type,
        amount: bonus.reward_amount,
      }),
    });

    return {
      weekNumber,
      title: bonus.title,
      description: bonus.description,
      reward: {
        type: bonus.reward_type,
        amount: bonus.reward_amount,
      },
    };
  }

  // =============================================
  // ACHIEVEMENT BADGES
  // =============================================

  /**
   * Get all achievement badges with user progress
   */
  getAchievementBadges = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const category = req.query.category as string;
      const includeHidden = req.query.includeHidden === 'true';

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      // Initialize user badges if needed
      await this.achievementBadgeService.initializeUserBadges(userId);

      let userBadges = await this.achievementBadgeService.getUserBadges(userId);

      if (category) {
        userBadges = userBadges.filter((b) => b.badge?.category === category);
      }

      if (!includeHidden) {
        userBadges = userBadges.filter((b) => !b.badge?.isHidden || b.isUnlocked);
      }

      const stats = await this.achievementBadgeService.getUserAchievementStats(userId);

      res.status(200).json({
        success: true,
        data: {
          badges: userBadges,
          stats: stats,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get unlocked badges
   */
  getUnlockedBadges = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const badges = await this.achievementBadgeService.getUnlockedBadges(userId);

      res.status(200).json({
        success: true,
        data: badges,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Toggle badge display on profile
   */
  toggleBadgeDisplay = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { badgeId } = req.params;
      const { display } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      await this.achievementBadgeService.toggleBadgeDisplay(userId, badgeId, display);

      res.status(200).json({
        success: true,
        message: display ? 'Badge added to profile' : 'Badge removed from profile',
      });
    } catch (error: any) {
      if (error.message.includes('Maximum') || error.message.includes('Cannot')) {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  };

  // =============================================
  // STREAK COUNTERS
  // =============================================

  /**
   * Get all user streaks
   */
  getStreaks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const streaks = await this.streakService.getUserStreaks(userId);
      const milestones = await this.streakService.getUserMilestones(userId);

      res.status(200).json({
        success: true,
        data: {
          streaks,
          milestones,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get streak leaderboard
   */
  getStreakLeaderboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const type = (req.query.type as any) || 'login';
      const limit = parseInt(req.query.limit as string) || 10;

      const leaderboard = await this.streakService.getStreakLeaderboard(type, limit);

      res.status(200).json({
        success: true,
        data: leaderboard,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Protect a streak with coins
   */
  protectStreak = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { streakType, durationHours } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const protectionCost = 50; // Coins required
      const coinBalance = await this.coinService.getBalance(userId);

      if (!coinBalance || coinBalance.balance < protectionCost) {
        res.status(400).json({
          success: false,
          message: 'Insufficient coins. Streak protection costs 50 coins.',
        });
        return;
      }

      // Spend coins
      await this.coinService.spendCoins(
        userId,
        protectionCost,
        `Streak protection (${streakType})`,
        undefined,
        'streak_protection'
      );

      // Protect streak
      const updatedStreak = await this.streakService.protectStreak(
        userId,
        streakType,
        durationHours || 24
      );

      res.status(200).json({
        success: true,
        message: `Your ${streakType} streak is protected for ${durationHours || 24} hours`,
        data: updatedStreak,
      });
    } catch (error) {
      next(error);
    }
  };

  // =============================================
  // COINS & VIRTUAL CURRENCY
  // =============================================

  /**
   * Get coin balance and history
   */
  getCoinWallet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const balance = await this.coinService.getBalance(userId);
      const transactions = await this.coinService.getTransactionHistory(userId, { limit: 20 });
      const summary = await this.coinService.getTransactionSummary(userId);

      res.status(200).json({
        success: true,
        data: {
          balance: balance?.balance || 0,
          totalEarned: balance?.totalEarned || 0,
          totalSpent: balance?.totalSpent || 0,
          totalPurchased: balance?.totalPurchased || 0,
          recentTransactions: transactions,
          summary,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get coin shop products
   */
  getCoinShop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const products = await this.coinService.getAvailableProducts();
      const earnableEvents = await this.getCoinEarningEvents();

      res.status(200).json({
        success: true,
        data: {
          purchaseProducts: products,
          earningMethods: earnableEvents,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get ways to earn coins
   */
  private async getCoinEarningEvents(): Promise<any[]> {
    const events = await this.db('coin_earning_events')
      .where('is_active', true)
      .orderBy('base_coins', 'desc');

    return events.map((e: any) => ({
      type: e.event_type,
      name: e.event_name,
      description: e.description,
      coins: e.base_coins,
      dailyLimit: e.daily_limit,
    }));
  }

  // =============================================
  // XP & LEVELS
  // =============================================

  /**
   * Get user level info
   */
  private async getUserLevel(userId: string): Promise<any> {
    const userExp = await this.db('user_experience').where({ user_id: userId }).first();
    const totalXP = userExp?.total_xp || 0;

    const levels = await this.db('gamification_levels')
      .where('is_active', true)
      .orderBy('level', 'asc');

    let currentLevel = levels[0];
    let nextLevel = levels[1];

    for (let i = 0; i < levels.length; i++) {
      if (totalXP >= levels[i].xp_required) {
        currentLevel = levels[i];
        nextLevel = levels[i + 1] || null;
      }
    }

    return {
      currentLevel: currentLevel?.level || 1,
      title: currentLevel?.title || 'Newcomer',
      totalXP,
      xpForNextLevel: nextLevel?.xp_required || totalXP,
      xpProgress: nextLevel ? totalXP - currentLevel.xp_required : 0,
      xpNeeded: nextLevel ? nextLevel.xp_required - currentLevel.xp_required : 0,
      nextLevel: nextLevel
        ? {
            level: nextLevel.level,
            title: nextLevel.title,
            rewards: {
              coins: nextLevel.coin_reward,
              superLikes: nextLevel.super_likes_reward,
              boosts: nextLevel.boosts_reward,
            },
          }
        : null,
    };
  }

  /**
   * Get level info
   */
  getLevelInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const levelInfo = await this.getUserLevel(userId);
      const allLevels = await this.db('gamification_levels')
        .where('is_active', true)
        .orderBy('level', 'asc');

      res.status(200).json({
        success: true,
        data: {
          current: levelInfo,
          allLevels: allLevels.map((l: any) => ({
            level: l.level,
            title: l.title,
            xpRequired: l.xp_required,
            rewards: {
              coins: l.coin_reward,
              superLikes: l.super_likes_reward,
              boosts: l.boosts_reward,
            },
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // =============================================
  // ACTION TRACKING (Internal)
  // =============================================

  /**
   * Track user action for gamification progress
   */
  trackAction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, action, metadata } = req.body;

      const results: any = {
        achievements: [],
        streaks: null,
        coins: null,
      };

      // Map action to metric for achievements
      const actionMetricMap: Record<string, string> = {
        match_made: 'matches',
        message_sent: 'messages_sent',
        swipe: 'swipes',
        super_like_used: 'super_likes_used',
        boost_used: 'boosts_used',
        photo_uploaded: 'photos_uploaded',
        quick_response: 'quick_responses',
      };

      const metric = actionMetricMap[action];
      if (metric) {
        results.achievements = await this.achievementBadgeService.updateProgress(
          userId,
          metric,
          metadata?.count || 1
        );
      }

      // Special action triggers
      if (action === 'photo_verification_complete') {
        const specialResults = await this.achievementBadgeService.triggerSpecialAction(
          userId,
          'photo_verification_complete'
        );
        results.achievements.push(...specialResults);
      }

      // Update streaks
      if (action === 'daily_login') {
        results.streaks = await this.streakService.updateLoginStreak(userId);
      } else if (action === 'message_sent') {
        results.streaks = await this.streakService.updateConversationStreak(userId);
      } else if (action === 'match_made') {
        results.streaks = await this.streakService.updateMatchStreak(userId);
      }

      // Award coins for certain actions
      const coinEarningEvent = await this.db('coin_earning_events')
        .where({ event_type: action, is_active: true })
        .first();

      if (coinEarningEvent) {
        // Check daily limit
        const todayEarnings = await this.db('user_coin_earnings')
          .where({ user_id: userId, event_id: coinEarningEvent.id })
          .whereRaw('DATE(earned_at) = CURRENT_DATE')
          .count('* as count')
          .first();

        const dailyCount = Number(todayEarnings?.count || 0);

        if (!coinEarningEvent.daily_limit || dailyCount < coinEarningEvent.daily_limit) {
          const coinsToAward = Math.floor(
            coinEarningEvent.base_coins *
              (1 + Math.random() * (coinEarningEvent.multiplier_max - 1))
          );

          await this.coinService.awardCoins(
            userId,
            coinsToAward,
            coinEarningEvent.event_name,
            undefined,
            action
          );

          // Log earning
          await this.db('user_coin_earnings').insert({
            user_id: userId,
            event_id: coinEarningEvent.id,
            coins_earned: coinsToAward,
            source: action,
            metadata: metadata ? JSON.stringify(metadata) : null,
          });

          results.coins = {
            earned: coinsToAward,
            reason: coinEarningEvent.event_name,
          };
        }
      }

      res.status(200).json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  };
}
