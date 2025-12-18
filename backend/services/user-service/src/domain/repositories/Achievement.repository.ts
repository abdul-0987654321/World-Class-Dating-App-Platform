import { Knex } from 'knex';
import {
  AchievementDefinition,
  UserAchievement,
  AchievementProgressLog,
  UserAchievementStats,
  UserAchievementWithDefinition,
  CreateAchievementDefinitionInput,
  UpdateAchievementDefinitionInput,
  CreateUserAchievementInput,
  UpdateUserAchievementInput,
  AchievementCategory,
  AchievementTier,
} from '../entities/Achievement.entity';

export class AchievementRepository {
  constructor(private db: Knex) {}

  // Achievement Definitions
  async findAllDefinitions(includeInactive: boolean = false): Promise<AchievementDefinition[]> {
    let query = this.db('achievement_definitions');

    if (!includeInactive) {
      query = query.where({ is_active: true });
    }

    const results = await query.orderBy('display_order', 'asc');
    return results.map(this.mapToAchievementDefinition);
  }

  async findDefinitionById(id: string): Promise<AchievementDefinition | null> {
    const result = await this.db('achievement_definitions')
      .where({ id })
      .first();

    return result ? this.mapToAchievementDefinition(result) : null;
  }

  async findDefinitionByKey(key: string): Promise<AchievementDefinition | null> {
    const result = await this.db('achievement_definitions')
      .where({ key })
      .first();

    return result ? this.mapToAchievementDefinition(result) : null;
  }

  async findDefinitionsByCategory(category: AchievementCategory): Promise<AchievementDefinition[]> {
    const results = await this.db('achievement_definitions')
      .where({ category, is_active: true })
      .orderBy('display_order', 'asc');

    return results.map(this.mapToAchievementDefinition);
  }

  async findDefinitionsByTier(tier: AchievementTier): Promise<AchievementDefinition[]> {
    const results = await this.db('achievement_definitions')
      .where({ tier, is_active: true })
      .orderBy('display_order', 'asc');

    return results.map(this.mapToAchievementDefinition);
  }

  async createDefinition(input: CreateAchievementDefinitionInput): Promise<AchievementDefinition> {
    const [result] = await this.db('achievement_definitions')
      .insert({
        key: input.key,
        name: input.name,
        description: input.description,
        category: input.category,
        tier: input.tier || 'bronze',
        points: input.points || 0,
        coin_reward: input.coinReward || 0,
        requirements: input.requirements ? JSON.stringify(input.requirements) : null,
        target_value: input.targetValue,
        icon_name: input.iconName,
        badge_color: input.badgeColor,
        is_hidden: input.isHidden || false,
        is_secret: input.isSecret || false,
        is_repeatable: input.isRepeatable || false,
        display_order: input.displayOrder || 0,
      })
      .returning('*');

    return this.mapToAchievementDefinition(result);
  }

  async updateDefinition(
    id: string,
    input: UpdateAchievementDefinitionInput
  ): Promise<AchievementDefinition> {
    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.tier !== undefined) updateData.tier = input.tier;
    if (input.points !== undefined) updateData.points = input.points;
    if (input.coinReward !== undefined) updateData.coin_reward = input.coinReward;
    if (input.requirements !== undefined) updateData.requirements = JSON.stringify(input.requirements);
    if (input.targetValue !== undefined) updateData.target_value = input.targetValue;
    if (input.iconName !== undefined) updateData.icon_name = input.iconName;
    if (input.badgeColor !== undefined) updateData.badge_color = input.badgeColor;
    if (input.isHidden !== undefined) updateData.is_hidden = input.isHidden;
    if (input.isSecret !== undefined) updateData.is_secret = input.isSecret;
    if (input.isRepeatable !== undefined) updateData.is_repeatable = input.isRepeatable;
    if (input.displayOrder !== undefined) updateData.display_order = input.displayOrder;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    const [result] = await this.db('achievement_definitions')
      .where({ id })
      .update(updateData)
      .returning('*');

    return this.mapToAchievementDefinition(result);
  }

  // User Achievements
  async findUserAchievements(userId: string): Promise<UserAchievement[]> {
    const results = await this.db('user_achievements')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');

    return results.map(this.mapToUserAchievement);
  }

  async findUserAchievementWithDefinition(
    userId: string,
    achievementId: string
  ): Promise<UserAchievementWithDefinition | null> {
    const result = await this.db('user_achievements as ua')
      .join('achievement_definitions as ad', 'ua.achievement_id', 'ad.id')
      .where({
        'ua.user_id': userId,
        'ua.achievement_id': achievementId,
      })
      .select('ua.*', this.db.raw('row_to_json(ad.*) as achievement'))
      .first();

    if (!result) return null;

    return {
      ...this.mapToUserAchievement(result),
      definition: this.mapToAchievementDefinition(
        typeof result.achievement === 'string'
          ? JSON.parse(result.achievement)
          : result.achievement
      ),
    };
  }

  async findUserAchievementsWithDefinitions(
    userId: string,
    filters?: {
      isUnlocked?: boolean;
      isShowcased?: boolean;
      category?: AchievementCategory;
      tier?: AchievementTier;
    }
  ): Promise<UserAchievementWithDefinition[]> {
    let query = this.db('user_achievements as ua')
      .join('achievement_definitions as ad', 'ua.achievement_id', 'ad.id')
      .where('ua.user_id', userId)
      .where('ad.is_active', true);

    if (filters?.isUnlocked !== undefined) {
      query = query.where('ua.is_unlocked', filters.isUnlocked);
    }

    if (filters?.isShowcased !== undefined) {
      query = query.where('ua.is_showcased', filters.isShowcased);
    }

    if (filters?.category) {
      query = query.where('ad.category', filters.category);
    }

    if (filters?.tier) {
      query = query.where('ad.tier', filters.tier);
    }

    const results = await query
      .select('ua.*', this.db.raw('row_to_json(ad.*) as achievement'))
      .orderBy('ad.display_order', 'asc');

    return results.map(r => ({
      ...this.mapToUserAchievement(r),
      definition: this.mapToAchievementDefinition(
        typeof r.achievement === 'string' ? JSON.parse(r.achievement) : r.achievement
      ),
    }));
  }

  async findUserAchievementByKey(
    userId: string,
    achievementKey: string
  ): Promise<UserAchievementWithDefinition | null> {
    const result = await this.db('user_achievements as ua')
      .join('achievement_definitions as ad', 'ua.achievement_id', 'ad.id')
      .where({
        'ua.user_id': userId,
        'ad.key': achievementKey,
      })
      .select('ua.*', this.db.raw('row_to_json(ad.*) as achievement'))
      .first();

    if (!result) return null;

    return {
      ...this.mapToUserAchievement(result),
      definition: this.mapToAchievementDefinition(
        typeof result.achievement === 'string'
          ? JSON.parse(result.achievement)
          : result.achievement
      ),
    };
  }

  async createUserAchievement(input: CreateUserAchievementInput): Promise<UserAchievement> {
    const [result] = await this.db('user_achievements')
      .insert({
        user_id: input.user_id,
        achievement_id: input.achievement_id,
        target_progress: input.target_progress,
        current_progress: input.current_progress || 0,
        completion_percentage: 0,
      })
      .returning('*');

    return this.mapToUserAchievement(result);
  }

  async updateUserAchievement(
    userId: string,
    achievementId: string,
    input: UpdateUserAchievementInput
  ): Promise<UserAchievement> {
    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    if (input.current_progress !== undefined) updateData.current_progress = input.current_progress;
    if (input.target_progress !== undefined) updateData.target_progress = input.target_progress;
    if (input.is_completed !== undefined) updateData.is_completed = input.is_completed;
    if (input.completed_at !== undefined) updateData.completed_at = input.completed_at;
    if (input.current_tier !== undefined) updateData.current_tier = input.current_tier;
    if (input.times_completed !== undefined) updateData.times_completed = input.times_completed;

    const [result] = await this.db('user_achievements')
      .where({
        user_id: userId,
        achievement_id: achievementId,
      })
      .update(updateData)
      .returning('*');

    return this.mapToUserAchievement(result);
  }

  async findOrCreateUserAchievement(
    userId: string,
    achievementId: string,
    target?: number
  ): Promise<UserAchievement> {
    const existing = await this.db('user_achievements')
      .where({
        user_id: userId,
        achievement_id: achievementId,
      })
      .first();

    if (existing) {
      return this.mapToUserAchievement(existing);
    }

    return this.createUserAchievement({
      user_id: userId,
      achievement_id: achievementId,
      target_progress: target
    });
  }

  // Achievement Progress Logs
  async createProgressLog(log: Omit<AchievementProgressLog, 'id' | 'created_at'>): Promise<AchievementProgressLog> {
    const [result] = await this.db('achievement_progress_logs')
      .insert({
        user_id: log.user_id,
        achievement_id: log.achievement_id,
        progress_change: log.progress_change,
        old_progress: log.old_progress,
        new_progress: log.new_progress,
        event_type: log.event_type,
      })
      .returning('*');

    return this.mapToAchievementProgressLog(result);
  }

  async findProgressLogsByUser(
    userId: string,
    limit: number = 50
  ): Promise<AchievementProgressLog[]> {
    const results = await this.db('achievement_progress_logs')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);

    return results.map(this.mapToAchievementProgressLog);
  }

  // User Achievement Stats
  async findUserStats(userId: string): Promise<UserAchievementStats | null> {
    const result = await this.db('user_achievement_stats')
      .where({ user_id: userId })
      .first();

    return result ? this.mapToUserAchievementStats(result) : null;
  }

  async createUserStats(userId: string): Promise<UserAchievementStats> {
    const [result] = await this.db('user_achievement_stats')
      .insert({
        user_id: userId,
      })
      .returning('*');

    return this.mapToUserAchievementStats(result);
  }

  async updateUserStats(
    userId: string,
    input: Partial<UserAchievementStats>
  ): Promise<UserAchievementStats> {
    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    if (input.total_achievements !== undefined) updateData.total_achievements = input.total_achievements;
    if (input.completed_achievements !== undefined) updateData.completed_achievements = input.completed_achievements;
    if (input.in_progress_achievements !== undefined) updateData.in_progress_achievements = input.in_progress_achievements;
    if (input.total_xp_earned !== undefined) updateData.total_xp_earned = input.total_xp_earned;
    if (input.total_coins_earned !== undefined) updateData.total_coins_earned = input.total_coins_earned;

    const [result] = await this.db('user_achievement_stats')
      .where({ user_id: userId })
      .update(updateData)
      .returning('*');

    return this.mapToUserAchievementStats(result);
  }

  async findOrCreateUserStats(userId: string): Promise<UserAchievementStats> {
    let stats = await this.findUserStats(userId);
    if (!stats) {
      stats = await this.createUserStats(userId);
    }
    return stats;
  }

  async recalculateUserStats(userId: string): Promise<UserAchievementStats> {
    const unlockedAchievements = await this.db('user_achievements as ua')
      .join('achievement_definitions as ad', 'ua.achievement_id', 'ad.id')
      .where({
        'ua.user_id': userId,
        'ua.is_unlocked': true,
      })
      .select('ad.tier', 'ad.points', 'ad.is_hidden', 'ad.is_secret');

    const totalAchievements = unlockedAchievements.length;
    const totalPoints = unlockedAchievements.reduce((sum, a) => sum + a.points, 0);

    const tierCounts = {
      bronzeCount: unlockedAchievements.filter(a => a.tier === 'bronze').length,
      silverCount: unlockedAchievements.filter(a => a.tier === 'silver').length,
      goldCount: unlockedAchievements.filter(a => a.tier === 'gold').length,
      platinumCount: unlockedAchievements.filter(a => a.tier === 'platinum').length,
      diamondCount: unlockedAchievements.filter(a => a.tier === 'diamond').length,
      hiddenUnlocked: unlockedAchievements.filter(a => a.is_hidden).length,
      secretUnlocked: unlockedAchievements.filter(a => a.is_secret).length,
    };

    const totalDefinitions = await this.db('achievement_definitions')
      .where({ is_active: true })
      .count('* as count')
      .first();

    const totalCount = parseInt(totalDefinitions?.count as string) || 1;
    const completionPercentage = Math.round((totalAchievements / totalCount) * 100);

    const lastUnlocked = await this.db('user_achievements')
      .where({ user_id: userId, is_unlocked: true })
      .orderBy('unlocked_at', 'desc')
      .first();

    await this.findOrCreateUserStats(userId);

    return this.updateUserStats(userId, {
      total_achievements: totalAchievements,
      total_points: totalPoints,
      ...tierCounts,
      completion_percentage: completionPercentage,
      last_achievement_at: lastUnlocked?.unlocked_at,
    } as any);
  }

  // Leaderboard
  async getTopUsersByPoints(limit: number = 10): Promise<Array<{
    userId: string;
    totalPoints: number;
    totalAchievements: number;
  }>> {
    const results = await this.db('user_achievement_stats')
      .select('user_id', 'total_points', 'total_achievements')
      .orderBy('total_points', 'desc')
      .limit(limit);

    return results.map(r => ({
      userId: r.user_id,
      totalPoints: r.total_points,
      totalAchievements: r.total_achievements,
    }));
  }

  // Mappers
  private mapToAchievementDefinition(row: any): any {
    return {
      id: row.id,
      slug: row.key || row.achievement_slug,
      name: row.name,
      description: row.description,
      category: row.category,
      tier: row.tier,
      points: row.points,
      coinReward: row.coin_reward,
      requirements: typeof row.requirements === 'string'
        ? JSON.parse(row.requirements)
        : row.requirements,
      targetValue: row.target_value,
      iconName: row.icon_name,
      badgeColor: row.badge_color,
      isHidden: row.is_hidden,
      isSecret: row.is_secret,
      isRepeatable: row.is_repeatable,
      displayOrder: row.display_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToUserAchievement(row: any): any {
    return {
      id: row.id,
      user_id: row.user_id,
      achievement_id: row.achievement_id,
      progress: row.progress,
      target: row.target,
      progressPercentage: row.progress_percentage,
      isUnlocked: row.is_unlocked,
      unlockedAt: row.unlocked_at,
      isShowcased: row.is_showcased,
      showcaseOrder: row.showcase_order,
      notificationSent: row.notification_sent,
      timesCompleted: row.times_completed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToAchievementProgressLog(row: any): any {
    return {
      id: row.id,
      user_id: row.user_id,
      achievement_id: row.achievement_id,
      actionType: row.action_type,
      progressIncrement: row.progress_increment,
      progressAfter: row.progress_after,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata,
      createdAt: row.created_at,
    };
  }

  private mapToUserAchievementStats(row: any): any {
    return {
      total_achievements: row.total_achievements,
      totalPoints: row.total_points,
      bronzeCount: row.bronze_count,
      silverCount: row.silver_count,
      goldCount: row.gold_count,
      platinumCount: row.platinum_count,
      diamondCount: row.diamond_count,
      hiddenUnlocked: row.hidden_unlocked,
      secretUnlocked: row.secret_unlocked,
      completionPercentage: row.completion_percentage,
      lastAchievementAt: row.last_achievement_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
