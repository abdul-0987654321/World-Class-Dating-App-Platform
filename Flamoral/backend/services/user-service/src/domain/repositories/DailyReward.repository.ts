import { Knex } from 'knex';
import {
  DailyReward,
  DailyRewardClaim,
  RewardCalendarConfig,
  CreateDailyRewardInput,
  UpdateDailyRewardInput,
  RewardType,
} from '../entities/DailyReward.entity';

export class DailyRewardRepository {
  constructor(private db: Knex) {}

  // Daily Rewards
  async findByUserId(userId: string): Promise<DailyReward | null> {
    const result = await this.db('daily_rewards')
      .where({ user_id: userId })
      .first();

    return result ? this.mapToDailyReward(result) : null;
  }

  async create(input: CreateDailyRewardInput): Promise<DailyReward> {
    const [result] = await this.db('daily_rewards')
      .insert({
        user_id: input.userId,
        streak_count: 0,
        total_logins: 0,
        longest_streak: 0,
        day_in_cycle: 1,
        can_claim_today: true,
        rewards_history: JSON.stringify([]),
      })
      .returning('*');

    return this.mapToDailyReward(result);
  }

  async update(userId: string, input: UpdateDailyRewardInput): Promise<DailyReward> {
    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    if (input.streakCount !== undefined) updateData.streak_count = input.streakCount;
    if (input.totalLogins !== undefined) updateData.total_logins = input.totalLogins;
    if (input.longestStreak !== undefined) updateData.longest_streak = input.longestStreak;
    if (input.lastClaimDate !== undefined) updateData.last_claim_date = input.lastClaimDate;
    if (input.currentStreakStart !== undefined) updateData.current_streak_start = input.currentStreakStart;
    if (input.dayInCycle !== undefined) updateData.day_in_cycle = input.dayInCycle;
    if (input.canClaimToday !== undefined) updateData.can_claim_today = input.canClaimToday;
    if (input.rewardsHistory !== undefined) updateData.rewards_history = JSON.stringify(input.rewardsHistory);

    const [result] = await this.db('daily_rewards')
      .where({ user_id: userId })
      .update(updateData)
      .returning('*');

    return this.mapToDailyReward(result);
  }

  async findOrCreate(userId: string): Promise<DailyReward> {
    let reward = await this.findByUserId(userId);
    if (!reward) {
      reward = await this.create({ userId });
    }
    return reward;
  }

  // Daily Reward Claims
  async createClaim(claim: Omit<DailyRewardClaim, 'id' | 'claimedAt'>): Promise<DailyRewardClaim> {
    const [result] = await this.db('daily_reward_claims')
      .insert({
        user_id: claim.userId,
        day_number: claim.dayNumber,
        streak_at_claim: claim.streakAtClaim,
        reward_type: claim.rewardType,
        reward_amount: claim.rewardAmount,
        reward_details: claim.rewardDetails ? JSON.stringify(claim.rewardDetails) : null,
      })
      .returning('*');

    return this.mapToDailyRewardClaim(result);
  }

  async findClaimsByUserId(
    userId: string,
    limit: number = 30
  ): Promise<DailyRewardClaim[]> {
    const results = await this.db('daily_reward_claims')
      .where({ user_id: userId })
      .orderBy('claimed_at', 'desc')
      .limit(limit);

    return results.map(this.mapToDailyRewardClaim);
  }

  async getClaimsCountByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const result = await this.db('daily_reward_claims')
      .where({ user_id: userId })
      .whereBetween('claimed_at', [startDate, endDate])
      .count('* as count')
      .first();

    return parseInt(result?.count as string) || 0;
  }

  // Reward Calendar Config
  async getRewardCalendar(): Promise<RewardCalendarConfig[]> {
    const results = await this.db('reward_calendar_config')
      .where({ is_active: true })
      .orderBy('day_number', 'asc');

    return results.map(this.mapToRewardCalendarConfig);
  }

  async getRewardForDay(dayNumber: number): Promise<RewardCalendarConfig | null> {
    const result = await this.db('reward_calendar_config')
      .where({ day_number: dayNumber, is_active: true })
      .first();

    return result ? this.mapToRewardCalendarConfig(result) : null;
  }

  async updateRewardConfig(
    dayNumber: number,
    update: Partial<RewardCalendarConfig>
  ): Promise<RewardCalendarConfig> {
    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    if (update.rewardType !== undefined) updateData.reward_type = update.rewardType;
    if (update.baseAmount !== undefined) updateData.base_amount = update.baseAmount;
    if (update.streakMultiplier !== undefined) updateData.streak_multiplier = update.streakMultiplier;
    if (update.bonusConditions !== undefined) updateData.bonus_conditions = JSON.stringify(update.bonusConditions);
    if (update.isSpecialDay !== undefined) updateData.is_special_day = update.isSpecialDay;
    if (update.description !== undefined) updateData.description = update.description;
    if (update.iconName !== undefined) updateData.icon_name = update.iconName;
    if (update.isActive !== undefined) updateData.is_active = update.isActive;

    const [result] = await this.db('reward_calendar_config')
      .where({ day_number: dayNumber })
      .update(updateData)
      .returning('*');

    return this.mapToRewardCalendarConfig(result);
  }

  // Statistics
  async getUserRewardStats(userId: string): Promise<{
    totalClaims: number;
    totalCoinsEarned: number;
    totalSuperLikesEarned: number;
    totalBoostsEarned: number;
    currentStreak: number;
    longestStreak: number;
  }> {
    const reward = await this.findByUserId(userId);

    const stats = await this.db('daily_reward_claims')
      .where({ user_id: userId })
      .select(
        this.db.raw("COUNT(*) as total_claims"),
        this.db.raw("SUM(CASE WHEN reward_type = 'coins' THEN reward_amount ELSE 0 END) as total_coins"),
        this.db.raw("SUM(CASE WHEN reward_type = 'super_likes' THEN reward_amount ELSE 0 END) as total_super_likes"),
        this.db.raw("SUM(CASE WHEN reward_type = 'boosts' THEN reward_amount ELSE 0 END) as total_boosts")
      )
      .first();

    return {
      totalClaims: parseInt(stats?.total_claims as string) || 0,
      totalCoinsEarned: parseInt(stats?.total_coins as string) || 0,
      totalSuperLikesEarned: parseInt(stats?.total_super_likes as string) || 0,
      totalBoostsEarned: parseInt(stats?.total_boosts as string) || 0,
      currentStreak: reward?.streakCount || 0,
      longestStreak: reward?.longestStreak || 0,
    };
  }

  async getTopStreakUsers(limit: number = 10): Promise<Array<{
    userId: string;
    streakCount: number;
    totalLogins: number;
  }>> {
    const results = await this.db('daily_rewards')
      .select('user_id', 'streak_count', 'total_logins')
      .orderBy('streak_count', 'desc')
      .limit(limit);

    return results.map(r => ({
      userId: r.user_id,
      streakCount: r.streak_count,
      totalLogins: r.total_logins,
    }));
  }

  // Mappers
  private mapToDailyReward(row: any): DailyReward {
    return {
      id: row.id,
      userId: row.user_id,
      streakCount: row.streak_count,
      totalLogins: row.total_logins,
      longestStreak: row.longest_streak,
      lastClaimDate: row.last_claim_date,
      currentStreakStart: row.current_streak_start,
      dayInCycle: row.day_in_cycle,
      canClaimToday: row.can_claim_today,
      rewardsHistory: typeof row.rewards_history === 'string'
        ? JSON.parse(row.rewards_history)
        : row.rewards_history || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToDailyRewardClaim(row: any): DailyRewardClaim {
    return {
      id: row.id,
      userId: row.user_id,
      dayNumber: row.day_number,
      streakAtClaim: row.streak_at_claim,
      rewardType: row.reward_type as RewardType,
      rewardAmount: row.reward_amount,
      rewardDetails: typeof row.reward_details === 'string'
        ? JSON.parse(row.reward_details)
        : row.reward_details,
      claimedAt: row.claimed_at,
    };
  }

  private mapToRewardCalendarConfig(row: any): RewardCalendarConfig {
    return {
      id: row.id,
      dayNumber: row.day_number,
      rewardType: row.reward_type as RewardType,
      baseAmount: row.base_amount,
      streakMultiplier: row.streak_multiplier,
      bonusConditions: typeof row.bonus_conditions === 'string'
        ? JSON.parse(row.bonus_conditions)
        : row.bonus_conditions,
      isSpecialDay: row.is_special_day,
      description: row.description,
      iconName: row.icon_name,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
