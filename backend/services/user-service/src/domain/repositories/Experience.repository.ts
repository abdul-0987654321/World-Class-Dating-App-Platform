import { Knex } from 'knex';

import {
  UserExperience,
  XPTransaction,
  LevelDefinition,
  XPSource,
} from '../entities/Experience.entity';

export class ExperienceRepository {
  constructor(private db: Knex) {}

  async findOrCreateUserExperience(userId: string): Promise<UserExperience> {
    const existing = await this.db('user_experience').where({ user_id: userId }).first();

    if (existing) {
      return this.mapToEntity(existing);
    }

    const [created] = await this.db('user_experience')
      .insert({
        user_id: userId,
        total_xp: 0,
        current_level: 1,
        current_level_xp: 0,
        xp_to_next_level: 100,
        level_progress_percentage: 0,
        level_history: JSON.stringify([]),
      })
      .returning('*');

    return this.mapToEntity(created);
  }

  async updateUserExperience(
    userId: string,
    updates: Partial<UserExperience>
  ): Promise<UserExperience> {
    const [updated] = await this.db('user_experience')
      .where({ user_id: userId })
      .update({
        total_xp: updates.totalXp,
        current_level: updates.currentLevel,
        current_level_xp: updates.currentLevelXp,
        xp_to_next_level: updates.xpToNextLevel,
        level_progress_percentage: updates.levelProgressPercentage,
        last_xp_earned_at: updates.lastXpEarnedAt,
        last_level_up_at: updates.lastLevelUpAt,
        level_history: updates.levelHistory ? JSON.stringify(updates.levelHistory) : undefined,
        updated_at: this.db.fn.now(),
      })
      .returning('*');

    return this.mapToEntity(updated);
  }

  async createXPTransaction(data: any): Promise<XPTransaction> {
    const [transaction] = await this.db('xp_transactions')
      .insert({
        user_id: data.userId,
        amount: data.amount,
        type: data.type,
        source: data.source,
        description: data.description,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        level_before: data.levelBefore,
        level_after: data.levelAfter,
        total_xp_after: data.totalXpAfter,
      })
      .returning('*');

    return this.mapTransactionToEntity(transaction);
  }

  async findUserTransactions(
    userId: string,
    limit: number,
    offset: number
  ): Promise<XPTransaction[]> {
    const transactions = await this.db('xp_transactions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return transactions.map(this.mapTransactionToEntity);
  }

  async findLevelByNumber(level: number): Promise<LevelDefinition | null> {
    const levelDef = await this.db('level_definitions').where({ level }).first();
    return levelDef ? this.mapLevelToEntity(levelDef) : null;
  }

  async findAllLevels(): Promise<LevelDefinition[]> {
    const levels = await this.db('level_definitions').orderBy('level', 'asc');
    return levels.map(this.mapLevelToEntity);
  }

  async findXPSourceByKey(actionKey: string): Promise<XPSource | null> {
    const source = await this.db('xp_sources')
      .where({ action_key: actionKey, is_active: true })
      .first();
    return source ? this.mapSourceToEntity(source) : null;
  }

  async findAllXPSources(): Promise<XPSource[]> {
    const sources = await this.db('xp_sources').where({ is_active: true });
    return sources.map(this.mapSourceToEntity);
  }

  async countTodayTransactionsBySource(userId: string, source: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.db('xp_transactions')
      .where({
        user_id: userId,
        source,
      })
      .where('created_at', '>=', today)
      .count('* as count')
      .first();

    return result ? Number(result.count) : 0;
  }

  async findLastTransactionBySource(userId: string, source: string): Promise<XPTransaction | null> {
    const transaction = await this.db('xp_transactions')
      .where({ user_id: userId, source })
      .orderBy('created_at', 'desc')
      .first();

    return transaction ? this.mapTransactionToEntity(transaction) : null;
  }

  async createLevelUnlock(data: any): Promise<any> {
    const [unlock] = await this.db('user_level_unlocks')
      .insert({
        user_id: data.userId,
        level_id: data.levelId,
        level: data.level,
        reward_claimed: data.rewardClaimed,
      })
      .returning('*');

    return unlock;
  }

  async findUserLevelUnlocks(userId: string): Promise<any[]> {
    return this.db('user_level_unlocks').where({ user_id: userId }).orderBy('level', 'desc');
  }

  async getTopUsersByXP(limit: number): Promise<any[]> {
    return this.db('user_experience as ue')
      .select('ue.*', 'u.email', 'p.display_name')
      .join('users as u', 'ue.user_id', 'u.id')
      .leftJoin('profiles as p', 'u.id', 'p.user_id')
      .orderBy('ue.total_xp', 'desc')
      .limit(limit);
  }

  async getTopUsersByLevel(limit: number): Promise<any[]> {
    return this.db('user_experience as ue')
      .select('ue.*', 'u.email', 'p.display_name')
      .join('users as u', 'ue.user_id', 'u.id')
      .leftJoin('profiles as p', 'u.id', 'p.user_id')
      .orderBy('ue.current_level', 'desc')
      .orderBy('ue.current_level_xp', 'desc')
      .limit(limit);
  }

  private mapToEntity(row: any): UserExperience {
    return {
      id: row.id,
      userId: row.user_id,
      totalXp: row.total_xp,
      currentLevel: row.current_level,
      currentLevelXp: row.current_level_xp,
      xpToNextLevel: row.xp_to_next_level,
      levelProgressPercentage: row.level_progress_percentage,
      lastXpEarnedAt: row.last_xp_earned_at,
      lastLevelUpAt: row.last_level_up_at,
      levelHistory: row.level_history ? JSON.parse(row.level_history) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapTransactionToEntity(row: any): XPTransaction {
    return {
      id: row.id,
      userId: row.user_id,
      amount: row.amount,
      type: row.type,
      source: row.source,
      description: row.description,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      levelBefore: row.level_before,
      levelAfter: row.level_after,
      totalXpAfter: row.total_xp_after,
      createdAt: row.created_at,
    };
  }

  private mapLevelToEntity(row: any): LevelDefinition {
    return {
      id: row.id,
      level: row.level,
      title: row.title,
      description: row.description,
      xpRequired: row.xp_required,
      xpForThisLevel: row.xp_for_this_level,
      coinReward: row.coin_reward,
      boostReward: row.boost_reward,
      superLikeReward: row.super_like_reward,
      unlocks: row.unlocks ? JSON.parse(row.unlocks) : null,
      badgeIcon: row.badge_icon,
      badgeColor: row.badge_color,
      tier: row.tier,
      isMilestone: row.is_milestone,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapSourceToEntity(row: any): XPSource {
    return {
      id: row.id,
      actionKey: row.action_key,
      actionName: row.action_name,
      description: row.description,
      category: row.category,
      baseXp: row.base_xp,
      maxDailyCount: row.max_daily_count,
      cooldownMinutes: row.cooldown_minutes,
      isRepeatable: row.is_repeatable,
      multiplier: row.multiplier,
      bonusConditions: row.bonus_conditions ? JSON.parse(row.bonus_conditions) : null,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
