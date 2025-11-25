/**
 * Gamification Service
 * Handles daily rewards, streaks, achievements, quests, and spin wheel
 */

import { logger } from '../../utils/logger';
import { notificationService } from './Notification.service';

// Types
export interface UserStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string; // YYYY-MM-DD
  streakStartDate: string;
  totalLogins: number;
  isPremium: boolean;
  missedDayGracePeriodUsed: boolean;
}

export interface DailyReward {
  day: number;
  coins: number;
  gems?: number;
  superLikes?: number;
  boostMinutes?: number;
  specialReward?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  coinReward: number;
  gemReward?: number;
  requiredValue: number;
  isHidden: boolean;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface UserAchievement {
  achievementId: string;
  userId: string;
  unlockedAt: Date;
  progress: number;
  isUnlocked: boolean;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly';
  coinReward: number;
  gemReward?: number;
  requiredAction: QuestAction;
  requiredCount: number;
  expiresAt: Date;
}

export interface UserQuest {
  questId: string;
  userId: string;
  progress: number;
  isCompleted: boolean;
  completedAt?: Date;
  assignedAt: Date;
}

export interface SpinWheelSegment {
  id: string;
  name: string;
  probability: number; // 0-1
  reward: {
    type: 'coins' | 'gems' | 'superLike' | 'boost' | 'spotlight' | 'nothing';
    amount: number;
  };
  color: string;
}

export interface SpinResult {
  segmentId: string;
  reward: SpinWheelSegment['reward'];
  isJackpot: boolean;
}

export type AchievementCategory =
  | 'profile'
  | 'matching'
  | 'conversation'
  | 'social'
  | 'hidden'
  | 'premium';

export type QuestAction =
  | 'swipe'
  | 'send_message'
  | 'send_first_message'
  | 'update_photo'
  | 'use_super_like'
  | 'complete_profile'
  | 'login'
  | 'get_match'
  | 'send_gift'
  | 'video_call';

// Daily rewards configuration
const DAILY_REWARDS: DailyReward[] = [
  { day: 1, coins: 10 },
  { day: 2, coins: 15 },
  { day: 3, coins: 20, gems: 1 },
  { day: 4, coins: 25 },
  { day: 5, coins: 30, superLikes: 1 },
  { day: 6, coins: 40, gems: 2 },
  { day: 7, coins: 50, boostMinutes: 30 },
];

// Streak bonuses
const STREAK_BONUSES = {
  7: { multiplier: 2, badge: '7_day_streak', bonusCoins: 0 },
  14: { multiplier: 2, badge: '14_day_streak', bonusCoins: 100 },
  30: { multiplier: 2.5, badge: '30_day_streak', bonusCoins: 500 },
  100: { multiplier: 3, badge: '100_day_streak', bonusCoins: 2000 },
};

// Achievements configuration
const ACHIEVEMENTS: Achievement[] = [
  // Profile achievements
  {
    id: 'complete_picture',
    name: 'Complete Picture',
    description: 'Add 6 photos to your profile',
    category: 'profile',
    icon: '📸',
    coinReward: 50,
    requiredValue: 6,
    isHidden: false,
    tier: 'bronze',
  },
  {
    id: 'storyteller',
    name: 'Storyteller',
    description: 'Fill all 3 prompts',
    category: 'profile',
    icon: '📝',
    coinReward: 30,
    requiredValue: 3,
    isHidden: false,
    tier: 'bronze',
  },
  {
    id: 'verified',
    name: 'Verified',
    description: 'Complete identity verification',
    category: 'profile',
    icon: '✅',
    coinReward: 200,
    gemReward: 5,
    requiredValue: 1,
    isHidden: false,
    tier: 'gold',
  },
  {
    id: 'open_book',
    name: 'Open Book',
    description: 'Complete all profile sections',
    category: 'profile',
    icon: '📖',
    coinReward: 100,
    requiredValue: 1,
    isHidden: false,
    tier: 'silver',
  },

  // Matching achievements
  {
    id: 'first_spark',
    name: 'First Spark',
    description: 'Get your first match',
    category: 'matching',
    icon: '💕',
    coinReward: 25,
    requiredValue: 1,
    isHidden: false,
    tier: 'bronze',
  },
  {
    id: 'popular',
    name: 'Popular',
    description: 'Get 10 matches',
    category: 'matching',
    icon: '🌟',
    coinReward: 50,
    requiredValue: 10,
    isHidden: false,
    tier: 'bronze',
  },
  {
    id: 'heart_magnet',
    name: 'Heart Magnet',
    description: 'Get 50 matches',
    category: 'matching',
    icon: '🧲',
    coinReward: 150,
    gemReward: 3,
    requiredValue: 50,
    isHidden: false,
    tier: 'silver',
  },
  {
    id: 'irresistible',
    name: 'Irresistible',
    description: 'Get 100 matches',
    category: 'matching',
    icon: '💎',
    coinReward: 500,
    gemReward: 10,
    requiredValue: 100,
    isHidden: false,
    tier: 'gold',
  },

  // Conversation achievements
  {
    id: 'ice_breaker',
    name: 'Ice Breaker',
    description: 'Send your first message',
    category: 'conversation',
    icon: '🧊',
    coinReward: 20,
    requiredValue: 1,
    isHidden: false,
    tier: 'bronze',
  },
  {
    id: 'good_listener',
    name: 'Good Listener',
    description: 'Exchange 50 messages in one chat',
    category: 'conversation',
    icon: '👂',
    coinReward: 75,
    requiredValue: 50,
    isHidden: false,
    tier: 'silver',
  },
  {
    id: 'connector',
    name: 'Connector',
    description: 'Have 10 conversations with 20+ messages',
    category: 'conversation',
    icon: '🤝',
    coinReward: 200,
    gemReward: 5,
    requiredValue: 10,
    isHidden: false,
    tier: 'gold',
  },

  // Social achievements
  {
    id: 'matchmaker',
    name: 'Matchmaker',
    description: 'Refer 1 friend',
    category: 'social',
    icon: '💘',
    coinReward: 200,
    requiredValue: 1,
    isHidden: false,
    tier: 'bronze',
  },
  {
    id: 'influencer',
    name: 'Influencer',
    description: 'Refer 5 friends',
    category: 'social',
    icon: '📢',
    coinReward: 500,
    gemReward: 10,
    requiredValue: 5,
    isHidden: false,
    tier: 'silver',
  },
  {
    id: 'ambassador',
    name: 'Ambassador',
    description: 'Refer 10 friends',
    category: 'social',
    icon: '🏆',
    coinReward: 1000,
    gemReward: 25,
    requiredValue: 10,
    isHidden: false,
    tier: 'gold',
  },

  // Hidden achievements
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Active at 3 AM',
    category: 'hidden',
    icon: '🦉',
    coinReward: 25,
    requiredValue: 1,
    isHidden: true,
    tier: 'bronze',
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Active at 6 AM',
    category: 'hidden',
    icon: '🐦',
    coinReward: 25,
    requiredValue: 1,
    isHidden: true,
    tier: 'bronze',
  },
  {
    id: 'globetrotter',
    name: 'Globetrotter',
    description: 'Match with someone 1000+ km away',
    category: 'hidden',
    icon: '🌍',
    coinReward: 100,
    requiredValue: 1,
    isHidden: true,
    tier: 'silver',
  },
];

// Daily quests pool
const DAILY_QUESTS_POOL: Omit<Quest, 'id' | 'expiresAt'>[] = [
  {
    name: 'Swipe Session',
    description: 'Swipe 20 profiles',
    type: 'daily',
    coinReward: 30,
    requiredAction: 'swipe',
    requiredCount: 20,
  },
  {
    name: 'Conversation Starter',
    description: 'Send 5 messages',
    type: 'daily',
    coinReward: 25,
    requiredAction: 'send_message',
    requiredCount: 5,
  },
  {
    name: 'Photo Day',
    description: 'Update a photo',
    type: 'daily',
    coinReward: 20,
    requiredAction: 'update_photo',
    requiredCount: 1,
  },
  {
    name: 'Super Fan',
    description: 'Use a Super Like',
    type: 'daily',
    coinReward: 20,
    requiredAction: 'use_super_like',
    requiredCount: 1,
  },
  {
    name: 'Social Butterfly',
    description: 'Send first message to a new match',
    type: 'daily',
    coinReward: 35,
    requiredAction: 'send_first_message',
    requiredCount: 1,
  },
];

// Weekly quests
const WEEKLY_QUESTS_POOL: Omit<Quest, 'id' | 'expiresAt'>[] = [
  {
    name: 'Active Dater',
    description: 'Log in 5 days',
    type: 'weekly',
    coinReward: 100,
    requiredAction: 'login',
    requiredCount: 5,
  },
  {
    name: 'Great Conversationalist',
    description: '3 conversations with 20+ messages',
    type: 'weekly',
    coinReward: 150,
    requiredAction: 'send_message',
    requiredCount: 60, // Approximation
  },
  {
    name: 'Popular Choice',
    description: 'Get 5 new matches',
    type: 'weekly',
    coinReward: 200,
    requiredAction: 'get_match',
    requiredCount: 5,
  },
  {
    name: 'Profile Perfectionist',
    description: 'Make 3 profile updates',
    type: 'weekly',
    coinReward: 75,
    requiredAction: 'update_photo',
    requiredCount: 3,
  },
];

// Spin wheel configuration
const SPIN_WHEEL_SEGMENTS: SpinWheelSegment[] = [
  { id: '1', name: '5 Coins', probability: 0.25, reward: { type: 'coins', amount: 5 }, color: '#FFD700' },
  { id: '2', name: '10 Coins', probability: 0.20, reward: { type: 'coins', amount: 10 }, color: '#FFA500' },
  { id: '3', name: '25 Coins', probability: 0.15, reward: { type: 'coins', amount: 25 }, color: '#FF6347' },
  { id: '4', name: '50 Coins', probability: 0.08, reward: { type: 'coins', amount: 50 }, color: '#FF4500' },
  { id: '5', name: '1 Super Like', probability: 0.10, reward: { type: 'superLike', amount: 1 }, color: '#9400D3' },
  { id: '6', name: '15min Boost', probability: 0.08, reward: { type: 'boost', amount: 15 }, color: '#00CED1' },
  { id: '7', name: '1 Gem', probability: 0.05, reward: { type: 'gems', amount: 1 }, color: '#00FF7F' },
  { id: '8', name: '5 Gems', probability: 0.02, reward: { type: 'gems', amount: 5 }, color: '#32CD32' },
  { id: '9', name: '30min Spotlight', probability: 0.02, reward: { type: 'spotlight', amount: 30 }, color: '#1E90FF' },
  { id: '10', name: 'Try Again', probability: 0.05, reward: { type: 'nothing', amount: 0 }, color: '#808080' },
];

class GamificationService {
  private userStreaks: Map<string, UserStreak> = new Map();
  private userAchievements: Map<string, UserAchievement[]> = new Map();
  private userQuests: Map<string, UserQuest[]> = new Map();
  private userSpins: Map<string, { lastSpinDate: string; spinsToday: number }> = new Map();
  private userCoins: Map<string, number> = new Map();
  private userGems: Map<string, number> = new Map();

  /**
   * Claim daily login reward
   */
  async claimDailyReward(userId: string): Promise<{
    success: boolean;
    reward?: DailyReward;
    streakInfo?: UserStreak;
    streakBonus?: typeof STREAK_BONUSES[keyof typeof STREAK_BONUSES];
    totalCoinsAwarded?: number;
  }> {
    const today = this.getTodayDate();
    let streak = this.userStreaks.get(userId);

    if (!streak) {
      streak = this.initializeStreak(userId);
    }

    // Check if already claimed today
    if (streak.lastLoginDate === today) {
      return { success: false };
    }

    const yesterday = this.getYesterdayDate();
    const isConsecutive = streak.lastLoginDate === yesterday;

    // Check for grace period (premium users only)
    const dayBeforeYesterday = this.getDayBeforeYesterdayDate();
    const canUseGracePeriod = streak.isPremium &&
      !streak.missedDayGracePeriodUsed &&
      streak.lastLoginDate === dayBeforeYesterday;

    if (isConsecutive || canUseGracePeriod) {
      streak.currentStreak++;
      if (canUseGracePeriod) {
        streak.missedDayGracePeriodUsed = true;
        logger.info(`User ${userId} used grace period to maintain streak`);
      }
    } else {
      // Reset streak
      streak.currentStreak = 1;
      streak.streakStartDate = today;
      streak.missedDayGracePeriodUsed = false;
    }

    // Update longest streak
    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }

    streak.lastLoginDate = today;
    streak.totalLogins++;

    // Calculate reward day (1-7 cycle)
    const rewardDay = ((streak.currentStreak - 1) % 7) + 1;
    const reward = DAILY_REWARDS.find(r => r.day === rewardDay)!;

    // Check for streak bonus
    const streakMilestones = Object.keys(STREAK_BONUSES).map(Number).sort((a, b) => b - a);
    let streakBonus = null;
    for (const milestone of streakMilestones) {
      if (streak.currentStreak >= milestone && streak.currentStreak % milestone === 0) {
        streakBonus = STREAK_BONUSES[milestone as keyof typeof STREAK_BONUSES];
        break;
      }
    }

    // Calculate total coins with multiplier
    let totalCoins = reward.coins;
    if (streakBonus) {
      totalCoins = Math.floor(totalCoins * streakBonus.multiplier) + streakBonus.bonusCoins;
    }

    // Award rewards
    await this.addCoins(userId, totalCoins);
    if (reward.gems) {
      await this.addGems(userId, reward.gems);
    }

    this.userStreaks.set(userId, streak);

    logger.info(`User ${userId} claimed daily reward: ${totalCoins} coins (day ${rewardDay}, streak ${streak.currentStreak})`);

    // Check for streak achievements
    await this.checkStreakAchievements(userId, streak.currentStreak);

    return {
      success: true,
      reward,
      streakInfo: streak,
      streakBonus: streakBonus || undefined,
      totalCoinsAwarded: totalCoins,
    };
  }

  /**
   * Get user's streak info
   */
  async getStreakInfo(userId: string): Promise<UserStreak> {
    let streak = this.userStreaks.get(userId);
    if (!streak) {
      streak = this.initializeStreak(userId);
      this.userStreaks.set(userId, streak);
    }
    return streak;
  }

  /**
   * Track progress towards an achievement
   */
  async trackAchievementProgress(
    userId: string,
    achievementId: string,
    progressIncrement: number = 1
  ): Promise<{ unlocked: boolean; achievement?: Achievement }> {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) {
      logger.warn(`Achievement not found: ${achievementId}`);
      return { unlocked: false };
    }

    const userAchievements = this.userAchievements.get(userId) || [];
    let userAchievement = userAchievements.find(ua => ua.achievementId === achievementId);

    if (!userAchievement) {
      userAchievement = {
        achievementId,
        userId,
        unlockedAt: new Date(),
        progress: 0,
        isUnlocked: false,
      };
      userAchievements.push(userAchievement);
    }

    if (userAchievement.isUnlocked) {
      return { unlocked: false }; // Already unlocked
    }

    userAchievement.progress += progressIncrement;

    if (userAchievement.progress >= achievement.requiredValue) {
      userAchievement.isUnlocked = true;
      userAchievement.unlockedAt = new Date();

      // Award rewards
      await this.addCoins(userId, achievement.coinReward);
      if (achievement.gemReward) {
        await this.addGems(userId, achievement.gemReward);
      }

      logger.info(`User ${userId} unlocked achievement: ${achievement.name}`);

      // Send notification
      await notificationService.sendAchievementNotification(userId, achievement.name);

      this.userAchievements.set(userId, userAchievements);
      return { unlocked: true, achievement };
    }

    this.userAchievements.set(userId, userAchievements);
    return { unlocked: false };
  }

  /**
   * Get user's achievements
   */
  async getUserAchievements(userId: string): Promise<{
    unlocked: Array<{ achievement: Achievement; userAchievement: UserAchievement }>;
    inProgress: Array<{ achievement: Achievement; userAchievement: UserAchievement }>;
    locked: Achievement[];
  }> {
    const userAchievements = this.userAchievements.get(userId) || [];

    const unlocked: Array<{ achievement: Achievement; userAchievement: UserAchievement }> = [];
    const inProgress: Array<{ achievement: Achievement; userAchievement: UserAchievement }> = [];
    const locked: Achievement[] = [];

    for (const achievement of ACHIEVEMENTS) {
      // Skip hidden achievements that haven't been started
      const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);

      if (userAchievement?.isUnlocked) {
        unlocked.push({ achievement, userAchievement });
      } else if (userAchievement && userAchievement.progress > 0) {
        inProgress.push({ achievement, userAchievement });
      } else if (!achievement.isHidden) {
        locked.push(achievement);
      }
    }

    return { unlocked, inProgress, locked };
  }

  /**
   * Get or assign daily quests
   */
  async getDailyQuests(userId: string): Promise<UserQuest[]> {
    const today = this.getTodayDate();
    let userQuests = this.userQuests.get(userId) || [];

    // Filter to today's quests
    const todayQuests = userQuests.filter(
      uq => uq.assignedAt.toISOString().split('T')[0] === today &&
            DAILY_QUESTS_POOL.some(q => `daily_${q.name.toLowerCase().replace(/\s+/g, '_')}` === uq.questId)
    );

    if (todayQuests.length === 0) {
      // Assign new daily quests (3 random)
      const shuffled = [...DAILY_QUESTS_POOL].sort(() => Math.random() - 0.5);
      const selectedQuests = shuffled.slice(0, 3);

      const newQuests: UserQuest[] = selectedQuests.map(quest => ({
        questId: `daily_${quest.name.toLowerCase().replace(/\s+/g, '_')}_${today}`,
        userId,
        progress: 0,
        isCompleted: false,
        assignedAt: new Date(),
      }));

      userQuests = [...userQuests, ...newQuests];
      this.userQuests.set(userId, userQuests);

      return newQuests;
    }

    return todayQuests;
  }

  /**
   * Get weekly quests
   */
  async getWeeklyQuests(userId: string): Promise<UserQuest[]> {
    const weekStart = this.getWeekStartDate();
    let userQuests = this.userQuests.get(userId) || [];

    const weeklyQuests = userQuests.filter(
      uq => uq.assignedAt >= new Date(weekStart) &&
            WEEKLY_QUESTS_POOL.some(q => `weekly_${q.name.toLowerCase().replace(/\s+/g, '_')}` === uq.questId.split('_').slice(0, -1).join('_'))
    );

    if (weeklyQuests.length === 0) {
      // Assign new weekly quests
      const newQuests: UserQuest[] = WEEKLY_QUESTS_POOL.map(quest => ({
        questId: `weekly_${quest.name.toLowerCase().replace(/\s+/g, '_')}_${weekStart}`,
        userId,
        progress: 0,
        isCompleted: false,
        assignedAt: new Date(),
      }));

      userQuests = [...userQuests, ...newQuests];
      this.userQuests.set(userId, userQuests);

      return newQuests;
    }

    return weeklyQuests;
  }

  /**
   * Update quest progress
   */
  async updateQuestProgress(
    userId: string,
    action: QuestAction,
    progressIncrement: number = 1
  ): Promise<Array<{ quest: Quest; completed: boolean; coinsAwarded?: number }>> {
    const userQuests = this.userQuests.get(userId) || [];
    const results: Array<{ quest: Quest; completed: boolean; coinsAwarded?: number }> = [];

    for (const userQuest of userQuests) {
      if (userQuest.isCompleted) continue;

      // Find matching quest from pool
      const allQuests = [...DAILY_QUESTS_POOL, ...WEEKLY_QUESTS_POOL];
      const quest = allQuests.find(q =>
        userQuest.questId.includes(q.name.toLowerCase().replace(/\s+/g, '_')) &&
        q.requiredAction === action
      );

      if (quest) {
        userQuest.progress += progressIncrement;

        if (userQuest.progress >= quest.requiredCount && !userQuest.isCompleted) {
          userQuest.isCompleted = true;
          userQuest.completedAt = new Date();

          // Award rewards
          await this.addCoins(userId, quest.coinReward);
          if (quest.gemReward) {
            await this.addGems(userId, quest.gemReward);
          }

          logger.info(`User ${userId} completed quest: ${quest.name}`);

          results.push({
            quest: { ...quest, id: userQuest.questId, expiresAt: new Date() },
            completed: true,
            coinsAwarded: quest.coinReward,
          });
        } else {
          results.push({
            quest: { ...quest, id: userQuest.questId, expiresAt: new Date() },
            completed: false,
          });
        }
      }
    }

    this.userQuests.set(userId, userQuests);
    return results;
  }

  /**
   * Spin the wheel
   */
  async spinWheel(userId: string): Promise<{
    success: boolean;
    result?: SpinResult;
    error?: string;
    spinsRemaining?: number;
  }> {
    const today = this.getTodayDate();
    let spinData = this.userSpins.get(userId);

    if (!spinData || spinData.lastSpinDate !== today) {
      spinData = { lastSpinDate: today, spinsToday: 0 };
    }

    // Check if free spin available
    const maxFreeSpins = 1;
    if (spinData.spinsToday >= maxFreeSpins) {
      // Check if user has coins for paid spin (25 coins)
      const userCoins = this.userCoins.get(userId) || 0;
      if (userCoins < 25) {
        return { success: false, error: 'No free spins remaining. Additional spins cost 25 coins.' };
      }
      await this.deductCoins(userId, 25);
    }

    spinData.spinsToday++;
    this.userSpins.set(userId, spinData);

    // Perform weighted random selection
    const random = Math.random();
    let cumulative = 0;
    let selectedSegment = SPIN_WHEEL_SEGMENTS[0];

    for (const segment of SPIN_WHEEL_SEGMENTS) {
      cumulative += segment.probability;
      if (random <= cumulative) {
        selectedSegment = segment;
        break;
      }
    }

    // Award reward
    switch (selectedSegment.reward.type) {
      case 'coins':
        await this.addCoins(userId, selectedSegment.reward.amount);
        break;
      case 'gems':
        await this.addGems(userId, selectedSegment.reward.amount);
        break;
      case 'superLike':
      case 'boost':
      case 'spotlight':
        // These would be handled by separate inventory system
        logger.info(`User ${userId} won ${selectedSegment.reward.amount} ${selectedSegment.reward.type}`);
        break;
    }

    const result: SpinResult = {
      segmentId: selectedSegment.id,
      reward: selectedSegment.reward,
      isJackpot: selectedSegment.reward.type === 'gems' && selectedSegment.reward.amount >= 5,
    };

    logger.info(`User ${userId} spun wheel and got: ${selectedSegment.name}`);

    return {
      success: true,
      result,
      spinsRemaining: Math.max(0, maxFreeSpins - spinData.spinsToday),
    };
  }

  /**
   * Get spin wheel configuration
   */
  getSpinWheelSegments(): SpinWheelSegment[] {
    return SPIN_WHEEL_SEGMENTS;
  }

  /**
   * Get user's coin balance
   */
  async getCoinBalance(userId: string): Promise<number> {
    return this.userCoins.get(userId) || 0;
  }

  /**
   * Get user's gem balance
   */
  async getGemBalance(userId: string): Promise<number> {
    return this.userGems.get(userId) || 0;
  }

  /**
   * Add coins to user
   */
  async addCoins(userId: string, amount: number): Promise<number> {
    const current = this.userCoins.get(userId) || 0;
    const newBalance = current + amount;
    this.userCoins.set(userId, newBalance);
    logger.debug(`Added ${amount} coins to user ${userId}, new balance: ${newBalance}`);
    return newBalance;
  }

  /**
   * Deduct coins from user
   */
  async deductCoins(userId: string, amount: number): Promise<{ success: boolean; balance: number }> {
    const current = this.userCoins.get(userId) || 0;
    if (current < amount) {
      return { success: false, balance: current };
    }
    const newBalance = current - amount;
    this.userCoins.set(userId, newBalance);
    logger.debug(`Deducted ${amount} coins from user ${userId}, new balance: ${newBalance}`);
    return { success: true, balance: newBalance };
  }

  /**
   * Add gems to user
   */
  async addGems(userId: string, amount: number): Promise<number> {
    const current = this.userGems.get(userId) || 0;
    const newBalance = current + amount;
    this.userGems.set(userId, newBalance);
    logger.debug(`Added ${amount} gems to user ${userId}, new balance: ${newBalance}`);
    return newBalance;
  }

  // Private helper methods

  private initializeStreak(userId: string): UserStreak {
    return {
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastLoginDate: '',
      streakStartDate: '',
      totalLogins: 0,
      isPremium: false,
      missedDayGracePeriodUsed: false,
    };
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  private getDayBeforeYesterdayDate(): string {
    const dayBefore = new Date();
    dayBefore.setDate(dayBefore.getDate() - 2);
    return dayBefore.toISOString().split('T')[0];
  }

  private getWeekStartDate(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    return weekStart.toISOString().split('T')[0];
  }

  private async checkStreakAchievements(userId: string, currentStreak: number): Promise<void> {
    // Check for streak-related achievements
    if (currentStreak === 7) {
      await this.trackAchievementProgress(userId, '7_day_streak', 1);
    }
    if (currentStreak === 30) {
      await this.trackAchievementProgress(userId, '30_day_streak', 1);
    }
    if (currentStreak === 100) {
      await this.trackAchievementProgress(userId, '100_day_streak', 1);
    }
  }
}

export const gamificationService = new GamificationService();
