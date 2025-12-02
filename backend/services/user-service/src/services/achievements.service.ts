/**
 * Achievements Service
 * Handles achievement progress tracking, unlocking, and rewards
 */

import { Pool } from 'pg';
import {
  Achievement,
  CreateAchievementDTO,
  UpdateAchievementDTO,
  AchievementFilters,
  RequirementType,
} from '../domain/entities/Achievement.entity';
import {
  UserAchievement,
  UserAchievementWithDetails,
  CreateUserAchievementDTO,
  UpdateUserAchievementDTO,
  AchievementProgressUpdate,
  UserAchievementStats,
} from '../domain/entities/UserAchievement.entity';
import {
  CreateAchievementProgressEventDTO,
  AchievementProgressEvent,
} from '../domain/entities/AchievementProgressEvent.entity';

export interface AchievementUnlockResult {
  unlocked: boolean;
  achievement?: Achievement;
  rewards?: {
    coins: number;
    superLikes: number;
    boosts: number;
  };
  message: string;
}

export class AchievementsService {
  constructor(private db: Pool) {}

  /**
   * Get all achievements
   */
  async getAllAchievements(filters?: AchievementFilters): Promise<Achievement[]> {
    let query = 'SELECT * FROM achievements WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.category) {
      query += ` AND category = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    if (filters?.tier) {
      query += ` AND tier = $${paramIndex}`;
      params.push(filters.tier);
      paramIndex++;
    }

    if (filters?.isHidden !== undefined) {
      query += ` AND is_hidden = $${paramIndex}`;
      params.push(filters.isHidden);
      paramIndex++;
    }

    if (filters?.isActive !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(filters.isActive);
      paramIndex++;
    }

    query += ' ORDER BY display_order ASC, created_at ASC';

    const result = await this.db.query(query, params);
    return result.rows.map(this.mapAchievementFromDb);
  }

  /**
   * Get achievement by ID
   */
  async getAchievementById(achievementId: string): Promise<Achievement | null> {
    const result = await this.db.query('SELECT * FROM achievements WHERE id = $1', [achievementId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapAchievementFromDb(result.rows[0]);
  }

  /**
   * Get achievement by slug
   */
  async getAchievementBySlug(slug: string): Promise<Achievement | null> {
    const result = await this.db.query('SELECT * FROM achievements WHERE slug = $1', [slug]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapAchievementFromDb(result.rows[0]);
  }

  /**
   * Create new achievement (admin only)
   */
  async createAchievement(data: CreateAchievementDTO): Promise<Achievement> {
    const query = `
      INSERT INTO achievements (
        name, slug, description, category, requirement_type, requirement_value,
        reward_coins, reward_super_likes, reward_boosts, icon_name, icon_color,
        badge_image_url, tier, is_hidden, is_active, display_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      data.name,
      data.slug,
      data.description,
      data.category,
      data.requirementType,
      data.requirementValue,
      data.rewardCoins || 0,
      data.rewardSuperLikes || 0,
      data.rewardBoosts || 0,
      data.iconName,
      data.iconColor,
      data.badgeImageUrl,
      data.tier || 'bronze',
      data.isHidden || false,
      data.isActive !== false,
      data.displayOrder || 0,
    ]);

    return this.mapAchievementFromDb(result.rows[0]);
  }

  /**
   * Update achievement (admin only)
   */
  async updateAchievement(achievementId: string, updates: UpdateAchievementDTO): Promise<Achievement | null> {
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.name) {
      setClauses.push(`name = $${paramIndex}`);
      params.push(updates.name);
      paramIndex++;
    }

    if (updates.description) {
      setClauses.push(`description = $${paramIndex}`);
      params.push(updates.description);
      paramIndex++;
    }

    if (updates.category) {
      setClauses.push(`category = $${paramIndex}`);
      params.push(updates.category);
      paramIndex++;
    }

    if (updates.requirementValue !== undefined) {
      setClauses.push(`requirement_value = $${paramIndex}`);
      params.push(updates.requirementValue);
      paramIndex++;
    }

    if (updates.rewardCoins !== undefined) {
      setClauses.push(`reward_coins = $${paramIndex}`);
      params.push(updates.rewardCoins);
      paramIndex++;
    }

    if (updates.rewardSuperLikes !== undefined) {
      setClauses.push(`reward_super_likes = $${paramIndex}`);
      params.push(updates.rewardSuperLikes);
      paramIndex++;
    }

    if (updates.rewardBoosts !== undefined) {
      setClauses.push(`reward_boosts = $${paramIndex}`);
      params.push(updates.rewardBoosts);
      paramIndex++;
    }

    if (updates.iconName) {
      setClauses.push(`icon_name = $${paramIndex}`);
      params.push(updates.iconName);
      paramIndex++;
    }

    if (updates.iconColor) {
      setClauses.push(`icon_color = $${paramIndex}`);
      params.push(updates.iconColor);
      paramIndex++;
    }

    if (updates.badgeImageUrl) {
      setClauses.push(`badge_image_url = $${paramIndex}`);
      params.push(updates.badgeImageUrl);
      paramIndex++;
    }

    if (updates.tier) {
      setClauses.push(`tier = $${paramIndex}`);
      params.push(updates.tier);
      paramIndex++;
    }

    if (updates.isHidden !== undefined) {
      setClauses.push(`is_hidden = $${paramIndex}`);
      params.push(updates.isHidden);
      paramIndex++;
    }

    if (updates.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex}`);
      params.push(updates.isActive);
      paramIndex++;
    }

    if (updates.displayOrder !== undefined) {
      setClauses.push(`display_order = $${paramIndex}`);
      params.push(updates.displayOrder);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return await this.getAchievementById(achievementId);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(achievementId);

    const query = `
      UPDATE achievements
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapAchievementFromDb(result.rows[0]);
  }

  /**
   * Initialize achievements for a new user
   */
  async initializeUserAchievements(userId: string): Promise<void> {
    // Get all active achievements
    const achievements = await this.getAllAchievements({ isActive: true });

    // Create user achievement records
    for (const achievement of achievements) {
      await this.createUserAchievement({
        userId,
        achievementId: achievement.id,
        currentProgress: 0,
        requiredProgress: achievement.requirementValue,
      });
    }
  }

  /**
   * Get user's achievements with details
   */
  async getUserAchievements(userId: string, includeHidden = false): Promise<UserAchievementWithDetails[]> {
    const query = `
      SELECT
        ua.*,
        a.name, a.slug, a.description, a.category, a.requirement_type, a.requirement_value,
        a.reward_coins, a.reward_super_likes, a.reward_boosts,
        a.icon_name, a.icon_color, a.badge_image_url, a.tier, a.is_hidden, a.display_order
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1
        AND a.is_active = true
        ${includeHidden ? '' : 'AND a.is_hidden = false'}
      ORDER BY a.display_order ASC, a.created_at ASC
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows.map((row) => this.mapUserAchievementWithDetailsFromDb(row));
  }

  /**
   * Get user's unlocked achievements
   */
  async getUnlockedAchievements(userId: string): Promise<UserAchievementWithDetails[]> {
    const query = `
      SELECT
        ua.*,
        a.name, a.slug, a.description, a.category, a.requirement_type, a.requirement_value,
        a.reward_coins, a.reward_super_likes, a.reward_boosts,
        a.icon_name, a.icon_color, a.badge_image_url, a.tier, a.is_hidden, a.display_order
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1 AND ua.is_unlocked = true
      ORDER BY ua.unlocked_at DESC
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows.map((row) => this.mapUserAchievementWithDetailsFromDb(row));
  }

  /**
   * Get user's showcased achievements
   */
  async getShowcaseAchievements(userId: string): Promise<UserAchievementWithDetails[]> {
    const query = `
      SELECT
        ua.*,
        a.name, a.slug, a.description, a.category, a.requirement_type, a.requirement_value,
        a.reward_coins, a.reward_super_likes, a.reward_boosts,
        a.icon_name, a.icon_color, a.badge_image_url, a.tier, a.is_hidden, a.display_order
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1 AND ua.shown_on_profile = true AND ua.is_unlocked = true
      ORDER BY ua.unlocked_at DESC
      LIMIT 5
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows.map((row) => this.mapUserAchievementWithDetailsFromDb(row));
  }

  /**
   * Toggle achievement showcase on profile
   */
  async toggleAchievementShowcase(userId: string, achievementId: string, show: boolean): Promise<boolean> {
    // Check current showcase count
    if (show) {
      const countResult = await this.db.query(
        'SELECT COUNT(*) as count FROM user_achievements WHERE user_id = $1 AND shown_on_profile = true',
        [userId]
      );

      const currentCount = parseInt(countResult.rows[0].count);
      if (currentCount >= 5) {
        throw new Error('Maximum of 5 achievements can be showcased');
      }
    }

    const result = await this.db.query(
      `
      UPDATE user_achievements
      SET shown_on_profile = $3, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND achievement_id = $2 AND is_unlocked = true
      RETURNING shown_on_profile
      `,
      [userId, achievementId, show]
    );

    return result.rows.length > 0;
  }

  /**
   * Get user achievement statistics
   */
  async getUserAchievementStats(userId: string): Promise<UserAchievementStats> {
    const query = `
      SELECT
        COUNT(DISTINCT a.id) as total_achievements,
        COUNT(DISTINCT CASE WHEN ua.is_unlocked THEN ua.achievement_id END) as unlocked_achievements,
        SUM(CASE WHEN ua.is_unlocked THEN a.reward_coins ELSE 0 END) as total_coins,
        SUM(CASE WHEN ua.is_unlocked THEN a.reward_super_likes ELSE 0 END) as total_super_likes,
        SUM(CASE WHEN ua.is_unlocked THEN a.reward_boosts ELSE 0 END) as total_boosts
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
      WHERE a.is_active = true AND a.is_hidden = false
    `;

    const result = await this.db.query(query, [userId]);
    const row = result.rows[0];

    const totalAchievements = parseInt(row.total_achievements) || 0;
    const unlockedAchievements = parseInt(row.unlocked_achievements) || 0;
    const completionPercentage =
      totalAchievements > 0 ? Math.round((unlockedAchievements / totalAchievements) * 100) : 0;

    return {
      totalAchievements,
      unlockedAchievements,
      completionPercentage,
      totalRewardsEarned: {
        coins: parseInt(row.total_coins) || 0,
        superLikes: parseInt(row.total_super_likes) || 0,
        boosts: parseInt(row.total_boosts) || 0,
      },
    };
  }

  /**
   * Update achievement progress
   */
  async updateProgress(update: AchievementProgressUpdate): Promise<AchievementUnlockResult[]> {
    // Log the progress event
    await this.logProgressEvent({
      userId: update.userId,
      eventType: update.requirementType,
      eventValue: update.incrementValue || update.absoluteValue || 1,
    });

    // Get all achievements matching this requirement type
    const achievements = await this.db.query(
      `
      SELECT a.*, ua.id as user_achievement_id, ua.current_progress, ua.is_unlocked
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
      WHERE a.requirement_type = $2 AND a.is_active = true AND (ua.is_unlocked = false OR ua.is_unlocked IS NULL)
      `,
      [update.userId, update.requirementType]
    );

    const unlockResults: AchievementUnlockResult[] = [];

    for (const row of achievements.rows) {
      const achievement = this.mapAchievementFromDb(row);
      let newProgress: number;

      if (update.absoluteValue !== undefined) {
        newProgress = update.absoluteValue;
      } else {
        const currentProgress = row.current_progress || 0;
        newProgress = currentProgress + (update.incrementValue || 1);
      }

      // Update progress
      if (row.user_achievement_id) {
        await this.updateUserAchievement(row.user_achievement_id, {
          currentProgress: newProgress,
        });
      } else {
        // Create user achievement if it doesn't exist
        await this.createUserAchievement({
          userId: update.userId,
          achievementId: achievement.id,
          currentProgress: newProgress,
          requiredProgress: achievement.requirementValue,
        });
      }

      // Check if achievement is now unlocked
      if (newProgress >= achievement.requirementValue && !row.is_unlocked) {
        const unlockResult = await this.unlockAchievement(update.userId, achievement.id);
        unlockResults.push(unlockResult);
      }
    }

    return unlockResults;
  }

  /**
   * Unlock an achievement and grant rewards
   */
  private async unlockAchievement(userId: string, achievementId: string): Promise<AchievementUnlockResult> {
    const achievement = await this.getAchievementById(achievementId);

    if (!achievement) {
      return {
        unlocked: false,
        message: 'Achievement not found',
      };
    }

    // Update user achievement status
    await this.db.query(
      `
      UPDATE user_achievements
      SET is_unlocked = true, unlocked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND achievement_id = $2
      `,
      [userId, achievementId]
    );

    // Grant rewards
    const rewards = {
      coins: achievement.rewardCoins,
      superLikes: achievement.rewardSuperLikes,
      boosts: achievement.rewardBoosts,
    };

    if (rewards.coins > 0) {
      await this.grantCoins(userId, rewards.coins);
    }

    if (rewards.superLikes > 0) {
      await this.grantSuperLikes(userId, rewards.superLikes);
    }

    if (rewards.boosts > 0) {
      await this.grantBoosts(userId, rewards.boosts);
    }

    return {
      unlocked: true,
      achievement,
      rewards,
      message: `Achievement unlocked: ${achievement.name}!`,
    };
  }

  /**
   * Create user achievement record
   */
  private async createUserAchievement(data: CreateUserAchievementDTO): Promise<UserAchievement> {
    const query = `
      INSERT INTO user_achievements (user_id, achievement_id, current_progress, required_progress)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, achievement_id) DO NOTHING
      RETURNING *
    `;

    const result = await this.db.query(query, [
      data.userId,
      data.achievementId,
      data.currentProgress || 0,
      data.requiredProgress,
    ]);

    return this.mapUserAchievementFromDb(result.rows[0]);
  }

  /**
   * Update user achievement
   */
  private async updateUserAchievement(userAchievementId: string, updates: UpdateUserAchievementDTO): Promise<void> {
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.currentProgress !== undefined) {
      setClauses.push(`current_progress = $${paramIndex}`);
      params.push(updates.currentProgress);
      paramIndex++;
    }

    if (updates.isUnlocked !== undefined) {
      setClauses.push(`is_unlocked = $${paramIndex}`);
      params.push(updates.isUnlocked);
      paramIndex++;
    }

    if (updates.unlockedAt !== undefined) {
      setClauses.push(`unlocked_at = $${paramIndex}`);
      params.push(updates.unlockedAt);
      paramIndex++;
    }

    if (updates.shownOnProfile !== undefined) {
      setClauses.push(`shown_on_profile = $${paramIndex}`);
      params.push(updates.shownOnProfile);
      paramIndex++;
    }

    if (updates.notificationSent !== undefined) {
      setClauses.push(`notification_sent = $${paramIndex}`);
      params.push(updates.notificationSent);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return;
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(userAchievementId);

    const query = `
      UPDATE user_achievements
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await this.db.query(query, params);
  }

  /**
   * Log progress event
   */
  private async logProgressEvent(data: CreateAchievementProgressEventDTO): Promise<AchievementProgressEvent> {
    const query = `
      INSERT INTO achievement_progress_events (user_id, event_type, event_value, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      data.userId,
      data.eventType,
      data.eventValue || 1,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]);

    return this.mapProgressEventFromDb(result.rows[0]);
  }

  /**
   * Grant coins to user
   */
  private async grantCoins(userId: string, amount: number): Promise<void> {
    await this.db.query(
      `
      INSERT INTO coin_balances (user_id, balance, lifetime_earned)
      VALUES ($1, $2, $2)
      ON CONFLICT (user_id)
      DO UPDATE SET
        balance = coin_balances.balance + $2,
        lifetime_earned = coin_balances.lifetime_earned + $2,
        updated_at = CURRENT_TIMESTAMP
      `,
      [userId, amount]
    );

    await this.db.query(
      `
      INSERT INTO coin_transactions (user_id, amount, transaction_type, description, balance_after)
      VALUES ($1, $2, 'reward', 'Achievement reward',
        (SELECT balance FROM coin_balances WHERE user_id = $1))
      `,
      [userId, amount]
    );
  }

  /**
   * Grant super likes to user
   */
  private async grantSuperLikes(userId: string, amount: number): Promise<void> {
    await this.db.query(
      `
      UPDATE users
      SET super_likes_balance = COALESCE(super_likes_balance, 0) + $2
      WHERE id = $1
      `,
      [userId, amount]
    );
  }

  /**
   * Grant boosts to user
   */
  private async grantBoosts(userId: string, amount: number): Promise<void> {
    await this.db.query(
      `
      UPDATE users
      SET boosts_balance = COALESCE(boosts_balance, 0) + $2
      WHERE id = $1
      `,
      [userId, amount]
    );
  }

  /**
   * Map database row to Achievement entity
   */
  private mapAchievementFromDb(row: any): Achievement {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      category: row.category,
      requirementType: row.requirement_type,
      requirementValue: row.requirement_value,
      rewardCoins: row.reward_coins,
      rewardSuperLikes: row.reward_super_likes,
      rewardBoosts: row.reward_boosts,
      iconName: row.icon_name,
      iconColor: row.icon_color,
      badgeImageUrl: row.badge_image_url,
      tier: row.tier,
      isHidden: row.is_hidden,
      isActive: row.is_active,
      displayOrder: row.display_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to UserAchievement entity
   */
  private mapUserAchievementFromDb(row: any): UserAchievement {
    return {
      id: row.id,
      userId: row.user_id,
      achievementId: row.achievement_id,
      currentProgress: row.current_progress,
      requiredProgress: row.required_progress,
      isUnlocked: row.is_unlocked,
      unlockedAt: row.unlocked_at,
      shownOnProfile: row.shown_on_profile,
      notificationSent: row.notification_sent,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to UserAchievementWithDetails entity
   */
  private mapUserAchievementWithDetailsFromDb(row: any): UserAchievementWithDetails {
    return {
      id: row.id,
      userId: row.user_id,
      achievementId: row.achievement_id,
      currentProgress: row.current_progress,
      requiredProgress: row.required_progress,
      isUnlocked: row.is_unlocked,
      unlockedAt: row.unlocked_at,
      shownOnProfile: row.shown_on_profile,
      notificationSent: row.notification_sent,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      achievement: {
        id: row.achievement_id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        category: row.category,
        requirementType: row.requirement_type,
        requirementValue: row.requirement_value,
        rewardCoins: row.reward_coins,
        rewardSuperLikes: row.reward_super_likes,
        rewardBoosts: row.reward_boosts,
        iconName: row.icon_name,
        iconColor: row.icon_color,
        badgeImageUrl: row.badge_image_url,
        tier: row.tier,
        isHidden: row.is_hidden,
        isActive: row.is_active,
        displayOrder: row.display_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    };
  }

  /**
   * Map database row to AchievementProgressEvent entity
   */
  private mapProgressEventFromDb(row: any): AchievementProgressEvent {
    return {
      id: row.id,
      userId: row.user_id,
      eventType: row.event_type,
      eventValue: row.event_value,
      metadata: row.metadata,
      createdAt: row.created_at,
    };
  }
}
