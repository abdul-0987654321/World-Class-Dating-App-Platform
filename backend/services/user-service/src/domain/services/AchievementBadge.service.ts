import { Knex } from 'knex';

/**
 * Achievement Badge Service
 * Handles all achievement badge-related operations including tracking progress,
 * awarding badges, and managing user achievement displays
 */

export interface AchievementBadge {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconUrl?: string;
  iconName: string;
  iconColor?: string;
  backgroundColor?: string;
  category: AchievementCategory;
  rarity: BadgeRarity;
  unlockType: UnlockType;
  unlockRequirements: UnlockRequirements;
  coinReward: number;
  xpReward: number;
  isHidden: boolean;
  isRepeatable: boolean;
  maxTier: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAchievementBadge {
  id: string;
  userId: string;
  badgeId: string;
  currentTier: number;
  currentProgress: number;
  targetProgress: number;
  isUnlocked: boolean;
  timesEarned: number;
  rewardClaimed: boolean;
  isDisplayed: boolean;
  unlockedAt?: Date;
  lastProgressAt?: Date;
  badge?: AchievementBadge;
}

export type AchievementCategory =
  | 'dating'
  | 'social'
  | 'profile'
  | 'engagement'
  | 'streak'
  | 'special'
  | 'collector';

export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type UnlockType =
  | 'count'
  | 'streak'
  | 'milestone'
  | 'time_based'
  | 'special_action'
  | 'collection';

export interface UnlockRequirements {
  metric?: string;
  target?: number;
  action?: string;
  conditions?: Record<string, any>;
}

export interface ProgressUpdateResult {
  badge: AchievementBadge;
  previousProgress: number;
  newProgress: number;
  justUnlocked: boolean;
  rewards?: {
    coins: number;
    xp: number;
  };
}

export class AchievementBadgeService {
  constructor(private db: Knex) {}

  /**
   * Get all available achievement badges
   */
  async getAllBadges(includeHidden: boolean = false): Promise<AchievementBadge[]> {
    const query = this.db('achievement_badges')
      .where('is_active', true)
      .orderBy('display_order', 'asc');

    if (!includeHidden) {
      query.where('is_hidden', false);
    }

    const rows = await query;
    return rows.map(this.mapToBadge);
  }

  /**
   * Get badges by category
   */
  async getBadgesByCategory(category: AchievementCategory): Promise<AchievementBadge[]> {
    const rows = await this.db('achievement_badges')
      .where({ category, is_active: true })
      .orderBy('display_order', 'asc');

    return rows.map(this.mapToBadge);
  }

  /**
   * Get user's achievement badges with progress
   */
  async getUserBadges(userId: string): Promise<UserAchievementBadge[]> {
    const rows = await this.db('user_achievement_badges as uab')
      .join('achievement_badges as ab', 'uab.badge_id', 'ab.id')
      .where('uab.user_id', userId)
      .select(
        'uab.*',
        'ab.slug',
        'ab.name',
        'ab.description',
        'ab.icon_name',
        'ab.icon_color',
        'ab.background_color',
        'ab.category',
        'ab.rarity',
        'ab.unlock_type',
        'ab.unlock_requirements',
        'ab.coin_reward',
        'ab.xp_reward',
        'ab.is_hidden',
        'ab.is_repeatable',
        'ab.max_tier',
        'ab.display_order'
      );

    return rows.map(this.mapToUserBadge);
  }

  /**
   * Get user's unlocked badges
   */
  async getUnlockedBadges(userId: string): Promise<UserAchievementBadge[]> {
    const badges = await this.getUserBadges(userId);
    return badges.filter((b) => b.isUnlocked);
  }

  /**
   * Get user's displayed badges (on profile)
   */
  async getDisplayedBadges(userId: string): Promise<UserAchievementBadge[]> {
    const badges = await this.getUserBadges(userId);
    return badges.filter((b) => b.isDisplayed && b.isUnlocked);
  }

  /**
   * Initialize user achievement tracking for all badges
   */
  async initializeUserBadges(userId: string): Promise<void> {
    const allBadges = await this.getAllBadges(true);
    const existingBadges = await this.getUserBadges(userId);
    const existingBadgeIds = new Set(existingBadges.map((b) => b.badgeId));

    const toInsert = allBadges
      .filter((badge) => !existingBadgeIds.has(badge.id))
      .map((badge) => ({
        user_id: userId,
        badge_id: badge.id,
        current_tier: 1,
        current_progress: 0,
        target_progress: this.getTargetProgress(badge),
        is_unlocked: false,
        times_earned: 0,
        reward_claimed: false,
        is_displayed: false,
      }));

    if (toInsert.length > 0) {
      await this.db('user_achievement_badges').insert(toInsert);
    }
  }

  /**
   * Update progress for a specific metric
   */
  async updateProgress(
    userId: string,
    metric: string,
    value: number,
    increment: boolean = true
  ): Promise<ProgressUpdateResult[]> {
    const results: ProgressUpdateResult[] = [];

    // Find all badges that track this metric
    const badges = await this.db('achievement_badges')
      .where('is_active', true)
      .whereRaw("unlock_requirements->>'metric' = ?", [metric]);

    for (const badgeRow of badges) {
      const badge = this.mapToBadge(badgeRow);
      const result = await this.updateBadgeProgress(userId, badge, value, increment);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Update progress for a specific badge
   */
  private async updateBadgeProgress(
    userId: string,
    badge: AchievementBadge,
    value: number,
    increment: boolean
  ): Promise<ProgressUpdateResult | null> {
    // Get or create user badge
    let userBadge = await this.db('user_achievement_badges')
      .where({ user_id: userId, badge_id: badge.id })
      .first();

    if (!userBadge) {
      // Create user badge tracking
      const [created] = await this.db('user_achievement_badges')
        .insert({
          user_id: userId,
          badge_id: badge.id,
          current_tier: 1,
          current_progress: 0,
          target_progress: this.getTargetProgress(badge),
          is_unlocked: false,
          times_earned: 0,
          reward_claimed: false,
          is_displayed: false,
        })
        .returning('*');
      userBadge = created;
    }

    // Skip if already unlocked and not repeatable
    if (userBadge.is_unlocked && !badge.isRepeatable) {
      return null;
    }

    const previousProgress = userBadge.current_progress;
    const newProgress = increment ? previousProgress + value : value;

    // Update progress
    await this.db('user_achievement_badges').where('id', userBadge.id).update({
      current_progress: newProgress,
      last_progress_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    });

    // Check if unlocked
    const justUnlocked = !userBadge.is_unlocked && newProgress >= userBadge.target_progress;

    if (justUnlocked) {
      await this.unlockBadge(userId, badge.id);
    }

    return {
      badge,
      previousProgress,
      newProgress,
      justUnlocked,
      rewards: justUnlocked ? { coins: badge.coinReward, xp: badge.xpReward } : undefined,
    };
  }

  /**
   * Unlock a badge for a user
   */
  async unlockBadge(userId: string, badgeId: string): Promise<UserAchievementBadge> {
    const badge = await this.db('achievement_badges').where('id', badgeId).first();
    if (!badge) {
      throw new Error('Badge not found');
    }

    // Update user badge
    const [updated] = await this.db('user_achievement_badges')
      .where({ user_id: userId, badge_id: badgeId })
      .update({
        is_unlocked: true,
        unlocked_at: this.db.fn.now(),
        times_earned: this.db.raw('times_earned + 1'),
        updated_at: this.db.fn.now(),
      })
      .returning('*');

    // Award rewards
    if (badge.coin_reward > 0) {
      await this.awardCoins(userId, badge.coin_reward, `Achievement: ${badge.name}`);
    }

    if (badge.xp_reward > 0) {
      await this.awardXP(userId, badge.xp_reward);
    }

    // Update gamification summary
    await this.updateGamificationSummary(userId, {
      achievements_unlocked: this.db.raw('COALESCE(achievements_unlocked, 0) + 1'),
      badges_earned: this.db.raw('COALESCE(badges_earned, 0) + 1'),
    });

    return this.mapToUserBadge({
      ...updated,
      ...badge,
    });
  }

  /**
   * Trigger a special action achievement check
   */
  async triggerSpecialAction(userId: string, action: string): Promise<ProgressUpdateResult[]> {
    const results: ProgressUpdateResult[] = [];

    // Find badges that require this action
    const badges = await this.db('achievement_badges')
      .where('is_active', true)
      .where('unlock_type', 'special_action')
      .whereRaw("unlock_requirements->>'action' = ?", [action]);

    for (const badgeRow of badges) {
      const badge = this.mapToBadge(badgeRow);

      // Check if already unlocked
      const userBadge = await this.db('user_achievement_badges')
        .where({ user_id: userId, badge_id: badge.id })
        .first();

      if (!userBadge?.is_unlocked) {
        const unlockedBadge = await this.unlockBadge(userId, badge.id);
        results.push({
          badge,
          previousProgress: 0,
          newProgress: 1,
          justUnlocked: true,
          rewards: { coins: badge.coinReward, xp: badge.xpReward },
        });
      }
    }

    return results;
  }

  /**
   * Toggle badge display on profile
   */
  async toggleBadgeDisplay(userId: string, badgeId: string, display: boolean): Promise<void> {
    const userBadge = await this.db('user_achievement_badges')
      .where({ user_id: userId, badge_id: badgeId })
      .first();

    if (!userBadge) {
      throw new Error('Badge not found');
    }

    if (!userBadge.is_unlocked) {
      throw new Error('Cannot display a locked badge');
    }

    // Limit to 5 displayed badges
    if (display) {
      const displayedCount = await this.db('user_achievement_badges')
        .where({ user_id: userId, is_displayed: true })
        .count('* as count')
        .first();

      if (Number(displayedCount?.count || 0) >= 5) {
        throw new Error('Maximum 5 badges can be displayed');
      }
    }

    await this.db('user_achievement_badges').where('id', userBadge.id).update({
      is_displayed: display,
      updated_at: this.db.fn.now(),
    });
  }

  /**
   * Claim rewards for an unlocked badge
   */
  async claimBadgeReward(userId: string, badgeId: string): Promise<{ coins: number; xp: number }> {
    const userBadge = await this.db('user_achievement_badges')
      .where({ user_id: userId, badge_id: badgeId })
      .first();

    if (!userBadge) {
      throw new Error('Badge not found');
    }

    if (!userBadge.is_unlocked) {
      throw new Error('Badge not unlocked');
    }

    if (userBadge.reward_claimed) {
      throw new Error('Reward already claimed');
    }

    const badge = await this.db('achievement_badges').where('id', badgeId).first();

    await this.db('user_achievement_badges').where('id', userBadge.id).update({
      reward_claimed: true,
      updated_at: this.db.fn.now(),
    });

    return {
      coins: badge.coin_reward,
      xp: badge.xp_reward,
    };
  }

  /**
   * Get achievement statistics for a user
   */
  async getUserAchievementStats(userId: string): Promise<{
    totalBadges: number;
    unlockedBadges: number;
    totalProgress: number;
    totalCoinsEarned: number;
    totalXPEarned: number;
    rarityCounts: Record<BadgeRarity, number>;
    categoryCounts: Record<AchievementCategory, number>;
  }> {
    const userBadges = await this.getUserBadges(userId);
    const allBadges = await this.getAllBadges(true);

    const unlocked = userBadges.filter((b) => b.isUnlocked);

    const rarityCounts: Record<BadgeRarity, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    };

    const categoryCounts: Record<AchievementCategory, number> = {
      dating: 0,
      social: 0,
      profile: 0,
      engagement: 0,
      streak: 0,
      special: 0,
      collector: 0,
    };

    let totalCoinsEarned = 0;
    let totalXPEarned = 0;

    for (const badge of unlocked) {
      if (badge.badge) {
        rarityCounts[badge.badge.rarity]++;
        categoryCounts[badge.badge.category]++;
        totalCoinsEarned += badge.badge.coinReward;
        totalXPEarned += badge.badge.xpReward;
      }
    }

    return {
      totalBadges: allBadges.length,
      unlockedBadges: unlocked.length,
      totalProgress: Math.round((unlocked.length / allBadges.length) * 100),
      totalCoinsEarned,
      totalXPEarned,
      rarityCounts,
      categoryCounts,
    };
  }

  // Helper methods

  private getTargetProgress(badge: AchievementBadge): number {
    return badge.unlockRequirements.target || 1;
  }

  private async awardCoins(userId: string, amount: number, reason: string): Promise<void> {
    const existing = await this.db('coins').where({ user_id: userId }).first();

    if (existing) {
      await this.db('coins')
        .where({ user_id: userId })
        .increment('balance', amount)
        .increment('total_earned', amount)
        .update({ updated_at: this.db.fn.now() });
    } else {
      await this.db('coins').insert({
        user_id: userId,
        balance: amount,
        total_earned: amount,
        total_spent: 0,
        total_purchased: 0,
      });
    }

    await this.db('coin_transactions').insert({
      user_id: userId,
      amount,
      type: 'earned',
      source: 'achievement',
      description: reason,
      balance_after: existing ? existing.balance + amount : amount,
    });
  }

  private async awardXP(userId: string, amount: number): Promise<void> {
    const existing = await this.db('user_experience').where({ user_id: userId }).first();

    if (existing) {
      await this.db('user_experience')
        .where({ user_id: userId })
        .increment('total_xp', amount)
        .update({ updated_at: this.db.fn.now() });
    } else {
      await this.db('user_experience').insert({
        user_id: userId,
        total_xp: amount,
        current_level: 1,
      });
    }
  }

  private async updateGamificationSummary(
    userId: string,
    updates: Record<string, any>
  ): Promise<void> {
    const existing = await this.db('user_gamification_summary').where({ user_id: userId }).first();

    if (existing) {
      await this.db('user_gamification_summary')
        .where({ user_id: userId })
        .update({
          ...updates,
          updated_at: this.db.fn.now(),
        });
    }
  }

  private mapToBadge(row: any): AchievementBadge {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      iconUrl: row.icon_url,
      iconName: row.icon_name,
      iconColor: row.icon_color,
      backgroundColor: row.background_color,
      category: row.category,
      rarity: row.rarity,
      unlockType: row.unlock_type,
      unlockRequirements:
        typeof row.unlock_requirements === 'string'
          ? JSON.parse(row.unlock_requirements)
          : row.unlock_requirements || {},
      coinReward: row.coin_reward || 0,
      xpReward: row.xp_reward || 0,
      isHidden: row.is_hidden,
      isRepeatable: row.is_repeatable,
      maxTier: row.max_tier || 1,
      displayOrder: row.display_order || 0,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToUserBadge(row: any): UserAchievementBadge {
    return {
      id: row.id,
      userId: row.user_id,
      badgeId: row.badge_id,
      currentTier: row.current_tier,
      currentProgress: row.current_progress,
      targetProgress: row.target_progress,
      isUnlocked: row.is_unlocked,
      timesEarned: row.times_earned,
      rewardClaimed: row.reward_claimed,
      isDisplayed: row.is_displayed,
      unlockedAt: row.unlocked_at,
      lastProgressAt: row.last_progress_at,
      badge: row.slug ? this.mapToBadge(row) : undefined,
    };
  }
}
