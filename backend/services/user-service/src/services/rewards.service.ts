/**
 * Rewards Service
 * Handles daily login rewards, streak tracking, and reward claiming
 */

import { Pool } from 'pg';

import { RewardType } from '../domain/entities/DailyLoginReward.entity';
import {
  UserLoginStreak,
  UpdateUserLoginStreakDTO,
  StreakCheckResult,
} from '../domain/entities/UserLoginStreak.entity';
import {
  CreateUserRewardHistoryDTO,
  RewardHistoryFilters,
  UserRewardHistory,
} from '../domain/entities/UserRewardHistory.entity';

export interface DailyRewardConfig {
  dayNumber: number;
  rewardType: RewardType;
  rewardAmount: number;
  rewardDurationHours?: number;
  displayTitle: string;
  displayDescription?: string;
  iconName?: string;
}

export interface RewardClaimResult {
  success: boolean;
  reward?: {
    type: RewardType;
    amount: number;
    durationHours?: number;
    dayNumber: number;
  };
  newStreak: number;
  nextReward?: DailyRewardConfig;
  message: string;
  expiresAt?: Date;
}

export interface UserStreakStatus {
  currentStreak: number;
  longestStreak: number;
  currentDayInCycle: number;
  canClaimToday: boolean;
  lastLoginDate?: Date;
  lastClaimDate?: Date;
  totalLogins: number;
  totalRewardsClaimed: number;
  hoursUntilNextClaim: number;
  todayReward?: DailyRewardConfig;
  nextRewards: DailyRewardConfig[];
}

export class RewardsService {
  constructor(private db: Pool) {}

  /**
   * Initialize user login streak record
   */
  async initializeUserStreak(userId: string): Promise<UserLoginStreak> {
    const query = `
      INSERT INTO user_login_streaks (user_id, current_streak, longest_streak, current_day_in_cycle, can_claim_today, total_logins, total_rewards_claimed)
      VALUES ($1, 0, 0, 1, true, 0, 0)
      ON CONFLICT (user_id) DO NOTHING
      RETURNING *
    `;

    const result = await this.db.query(query, [userId]);
    return this.mapStreakFromDb(result.rows[0]);
  }

  /**
   * Get user's current streak status
   */
  async getUserStreak(userId: string): Promise<UserLoginStreak | null> {
    const query = `
      SELECT * FROM user_login_streaks WHERE user_id = $1
    `;

    const result = await this.db.query(query, [userId]);

    if (result.rows.length === 0) {
      return await this.initializeUserStreak(userId);
    }

    return this.mapStreakFromDb(result.rows[0]);
  }

  /**
   * Get user's complete streak status with rewards info
   */
  async getUserStreakStatus(userId: string): Promise<UserStreakStatus> {
    const streak = await this.getUserStreak(userId);

    if (!streak) {
      throw new Error('Failed to initialize user streak');
    }

    // Get today's reward config
    const todayReward = await this.getRewardConfig(streak.currentDayInCycle);

    // Get next 7 days of rewards
    const nextRewards = await this.getNextRewards(streak.currentDayInCycle);

    // Calculate hours until next claim
    const hoursUntilNextClaim = this.calculateHoursUntilNextClaim(streak.lastClaimDate);

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      currentDayInCycle: streak.currentDayInCycle,
      canClaimToday: streak.canClaimToday,
      lastLoginDate: streak.lastLoginDate,
      lastClaimDate: streak.lastClaimDate,
      totalLogins: streak.totalLogins,
      totalRewardsClaimed: streak.totalRewardsClaimed,
      hoursUntilNextClaim,
      todayReward,
      nextRewards,
    };
  }

  /**
   * Update user login and check streak status
   */
  async recordLogin(userId: string): Promise<StreakCheckResult> {
    const streak = await this.getUserStreak(userId);

    if (!streak) {
      throw new Error('Failed to initialize user streak');
    }

    const now = new Date();
    const today = this.getDateOnly(now);

    // Check if already logged in today
    if (
      streak.lastLoginDate &&
      this.getDateOnly(streak.lastLoginDate).getTime() === today.getTime()
    ) {
      return {
        streakBroken: false,
        newStreakValue: streak.currentStreak,
        daysSkipped: 0,
      };
    }

    // Calculate streak status
    const streakCheck = this.checkStreakStatus(streak.lastLoginDate);

    let newStreak = streak.currentStreak;
    let newDayInCycle = streak.currentDayInCycle;

    if (streakCheck.streakBroken) {
      // Reset streak and cycle
      newStreak = 1;
      newDayInCycle = 1;
    } else {
      // Continue streak
      newStreak = streak.currentStreak + 1;
      newDayInCycle = streak.currentDayInCycle;
    }

    // Update longest streak if necessary
    const newLongestStreak = Math.max(newStreak, streak.longestStreak);

    // Update database
    await this.updateUserStreak(userId, {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastLoginDate: now,
      totalLogins: streak.totalLogins + 1,
      canClaimToday: true,
    });

    return {
      streakBroken: streakCheck.streakBroken,
      newStreakValue: newStreak,
      daysSkipped: streakCheck.daysSkipped,
    };
  }

  /**
   * Claim daily reward
   */
  async claimDailyReward(userId: string): Promise<RewardClaimResult> {
    const streak = await this.getUserStreak(userId);

    if (!streak) {
      return {
        success: false,
        newStreak: 0,
        message: 'User streak not found',
      };
    }

    // Check if user can claim today
    if (!streak.canClaimToday) {
      const hoursUntil = this.calculateHoursUntilNextClaim(streak.lastClaimDate);
      return {
        success: false,
        newStreak: streak.currentStreak,
        message: `Cannot claim reward yet. Please wait ${hoursUntil} hours.`,
      };
    }

    // Check if already claimed today
    if (streak.lastClaimDate && this.isToday(streak.lastClaimDate)) {
      return {
        success: false,
        newStreak: streak.currentStreak,
        message: 'Reward already claimed today',
      };
    }

    // Get reward configuration for current day in cycle
    const rewardConfig = await this.getRewardConfig(streak.currentDayInCycle);

    if (!rewardConfig) {
      return {
        success: false,
        newStreak: streak.currentStreak,
        message: 'Reward configuration not found',
      };
    }

    const now = new Date();
    let expiresAt: Date | undefined;

    // Calculate expiration for time-limited rewards
    if (rewardConfig.rewardDurationHours) {
      expiresAt = new Date(now.getTime() + rewardConfig.rewardDurationHours * 60 * 60 * 1000);
    }

    // Grant reward based on type
    await this.grantReward(
      userId,
      rewardConfig.rewardType,
      rewardConfig.rewardAmount,
      rewardConfig.rewardDurationHours
    );

    // Save reward history
    await this.saveRewardHistory({
      userId,
      rewardType: rewardConfig.rewardType,
      rewardAmount: rewardConfig.rewardAmount,
      rewardDurationHours: rewardConfig.rewardDurationHours,
      dayInCycle: streak.currentDayInCycle,
      streakAtClaim: streak.currentStreak,
      expiresAt,
    });

    // Calculate next day in cycle
    const nextDayInCycle = streak.currentDayInCycle >= 7 ? 1 : streak.currentDayInCycle + 1;

    // Update streak record
    await this.updateUserStreak(userId, {
      currentDayInCycle: nextDayInCycle,
      lastClaimDate: now,
      canClaimToday: false,
      totalRewardsClaimed: streak.totalRewardsClaimed + 1,
    });

    // Get next reward config
    const nextReward = await this.getRewardConfig(nextDayInCycle);

    return {
      success: true,
      reward: {
        type: rewardConfig.rewardType,
        amount: rewardConfig.rewardAmount,
        durationHours: rewardConfig.rewardDurationHours,
        dayNumber: streak.currentDayInCycle,
      },
      newStreak: streak.currentStreak,
      nextReward,
      message: 'Reward claimed successfully!',
      expiresAt,
    };
  }

  /**
   * Get reward configuration for a specific day
   */
  async getRewardConfig(dayNumber: number): Promise<DailyRewardConfig | null> {
    const query = `
      SELECT day_number, reward_type, reward_amount, reward_duration_hours,
             display_title, display_description, icon_name
      FROM daily_login_rewards
      WHERE day_number = $1 AND is_active = true
    `;

    const result = await this.db.query(query, [dayNumber]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      dayNumber: result.rows[0].day_number,
      rewardType: result.rows[0].reward_type,
      rewardAmount: result.rows[0].reward_amount,
      rewardDurationHours: result.rows[0].reward_duration_hours,
      displayTitle: result.rows[0].display_title,
      displayDescription: result.rows[0].display_description,
      iconName: result.rows[0].icon_name,
    };
  }

  /**
   * Get next rewards in cycle
   */
  async getNextRewards(currentDay: number): Promise<DailyRewardConfig[]> {
    const rewards: DailyRewardConfig[] = [];

    for (let i = 1; i <= 7; i++) {
      const day = ((currentDay + i - 1) % 7) + 1;
      const config = await this.getRewardConfig(day);
      if (config) {
        rewards.push(config);
      }
    }

    return rewards;
  }

  /**
   * Get user's reward history
   */
  async getUserRewardHistory(filters: RewardHistoryFilters): Promise<UserRewardHistory[]> {
    let query = `
      SELECT * FROM user_reward_history
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.userId) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(filters.userId);
      paramIndex++;
    }

    if (filters.rewardType) {
      query += ` AND reward_type = $${paramIndex}`;
      params.push(filters.rewardType);
      paramIndex++;
    }

    if (filters.startDate) {
      query += ` AND claimed_at >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      query += ` AND claimed_at <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    query += ` ORDER BY claimed_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    const result = await this.db.query(query, params);
    return result.rows.map(this.mapRewardHistoryFromDb);
  }

  /**
   * Grant reward to user based on type
   */
  private async grantReward(
    userId: string,
    rewardType: RewardType,
    amount: number,
    durationHours?: number
  ): Promise<void> {
    switch (rewardType) {
      case 'coins':
        await this.grantCoins(userId, amount);
        break;
      case 'super_likes':
        await this.grantSuperLikes(userId, amount);
        break;
      case 'boosts':
        await this.grantBoost(userId, durationHours || 1);
        break;
      case 'premium_trial':
        await this.grantPremiumTrial(userId, durationHours || 24);
        break;
    }
  }

  /**
   * Grant coins to user
   */
  private async grantCoins(userId: string, amount: number): Promise<void> {
    // Update coin balance
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

    // Log transaction
    await this.db.query(
      `
      INSERT INTO coin_transactions (user_id, amount, transaction_type, description, balance_after)
      VALUES ($1, $2, 'reward', 'Daily login reward',
        (SELECT balance FROM coin_balances WHERE user_id = $1))
      `,
      [userId, amount]
    );
  }

  /**
   * Grant super likes to user
   */
  private async grantSuperLikes(userId: string, amount: number): Promise<void> {
    // Assuming there's a super_likes balance table or column
    // This is a placeholder - adjust based on actual schema
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
   * Grant boost to user
   */
  private async grantBoost(userId: string, durationHours: number): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

    await this.db.query(
      `
      INSERT INTO boosts (user_id, boost_type, started_at, expires_at)
      VALUES ($1, 'profile_boost', $2, $3)
      `,
      [userId, now, expiresAt]
    );
  }

  /**
   * Grant premium trial to user
   */
  private async grantPremiumTrial(userId: string, durationHours: number): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

    await this.db.query(
      `
      UPDATE users
      SET subscription_tier = 'premium',
          subscription_expires_at = $2
      WHERE id = $1 AND (subscription_expires_at IS NULL OR subscription_expires_at < $2)
      `,
      [userId, expiresAt]
    );
  }

  /**
   * Save reward history
   */
  private async saveRewardHistory(data: CreateUserRewardHistoryDTO): Promise<void> {
    await this.db.query(
      `
      INSERT INTO user_reward_history
        (user_id, reward_type, reward_amount, reward_duration_hours, day_in_cycle, streak_at_claim, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        data.userId,
        data.rewardType,
        data.rewardAmount,
        data.rewardDurationHours,
        data.dayInCycle,
        data.streakAtClaim,
        data.expiresAt,
      ]
    );
  }

  /**
   * Update user streak
   */
  private async updateUserStreak(userId: string, updates: UpdateUserLoginStreakDTO): Promise<void> {
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.currentStreak !== undefined) {
      setClauses.push(`current_streak = $${paramIndex}`);
      params.push(updates.currentStreak);
      paramIndex++;
    }

    if (updates.longestStreak !== undefined) {
      setClauses.push(`longest_streak = $${paramIndex}`);
      params.push(updates.longestStreak);
      paramIndex++;
    }

    if (updates.lastLoginDate !== undefined) {
      setClauses.push(`last_login_date = $${paramIndex}`);
      params.push(updates.lastLoginDate);
      paramIndex++;
    }

    if (updates.currentDayInCycle !== undefined) {
      setClauses.push(`current_day_in_cycle = $${paramIndex}`);
      params.push(updates.currentDayInCycle);
      paramIndex++;
    }

    if (updates.lastClaimDate !== undefined) {
      setClauses.push(`last_claim_date = $${paramIndex}`);
      params.push(updates.lastClaimDate);
      paramIndex++;
    }

    if (updates.canClaimToday !== undefined) {
      setClauses.push(`can_claim_today = $${paramIndex}`);
      params.push(updates.canClaimToday);
      paramIndex++;
    }

    if (updates.totalLogins !== undefined) {
      setClauses.push(`total_logins = $${paramIndex}`);
      params.push(updates.totalLogins);
      paramIndex++;
    }

    if (updates.totalRewardsClaimed !== undefined) {
      setClauses.push(`total_rewards_claimed = $${paramIndex}`);
      params.push(updates.totalRewardsClaimed);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return;
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(userId);

    const query = `
      UPDATE user_login_streaks
      SET ${setClauses.join(', ')}
      WHERE user_id = $${paramIndex}
    `;

    await this.db.query(query, params);
  }

  /**
   * Check streak status based on last login date
   */
  private checkStreakStatus(lastLoginDate?: Date): { streakBroken: boolean; daysSkipped: number } {
    if (!lastLoginDate) {
      return { streakBroken: false, daysSkipped: 0 };
    }

    const now = new Date();
    const lastLogin = new Date(lastLoginDate);

    const nowDate = this.getDateOnly(now);
    const lastLoginDateOnly = this.getDateOnly(lastLogin);

    const daysDiff = Math.floor(
      (nowDate.getTime() - lastLoginDateOnly.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      streakBroken: daysDiff > 1,
      daysSkipped: Math.max(0, daysDiff - 1),
    };
  }

  /**
   * Calculate hours until next claim is available
   */
  private calculateHoursUntilNextClaim(lastClaimDate?: Date): number {
    if (!lastClaimDate) {
      return 0;
    }

    const now = new Date();
    const tomorrow = new Date(lastClaimDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const hoursUntil = Math.max(
      0,
      Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60))
    );
    return hoursUntil;
  }

  /**
   * Get date without time component
   */
  private getDateOnly(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Check if date is today
   */
  private isToday(date: Date): boolean {
    const today = this.getDateOnly(new Date());
    const checkDate = this.getDateOnly(date);
    return today.getTime() === checkDate.getTime();
  }

  /**
   * Map database row to UserLoginStreak entity
   */
  private mapStreakFromDb(row: any): UserLoginStreak {
    return {
      id: row.id,
      userId: row.user_id,
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
      lastLoginDate: row.last_login_date,
      currentDayInCycle: row.current_day_in_cycle,
      lastClaimDate: row.last_claim_date,
      canClaimToday: row.can_claim_today,
      totalLogins: row.total_logins,
      totalRewardsClaimed: row.total_rewards_claimed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to UserRewardHistory entity
   */
  private mapRewardHistoryFromDb(row: any): UserRewardHistory {
    return {
      id: row.id,
      userId: row.user_id,
      rewardType: row.reward_type,
      rewardAmount: row.reward_amount,
      rewardDurationHours: row.reward_duration_hours,
      dayInCycle: row.day_in_cycle,
      streakAtClaim: row.streak_at_claim,
      claimedAt: row.claimed_at,
      expiresAt: row.expires_at,
    };
  }
}
