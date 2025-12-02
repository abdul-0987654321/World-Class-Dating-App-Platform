import { Knex } from 'knex';
import { UserStreak, StreakMilestone, UserStreakMilestone, StreakType } from '../entities/Streak.entity';

export class StreakRepository {
  constructor(private db: Knex) {}

  async findUserStreaks(userId: string): Promise<UserStreak[]> {
    const streaks = await this.db('user_streaks').where({ user_id: userId });
    return streaks.map(this.mapToEntity);
  }

  async findUserStreakByType(userId: string, streakType: StreakType): Promise<UserStreak | null> {
    const streak = await this.db('user_streaks')
      .where({ user_id: userId, streak_type: streakType })
      .first();
    return streak ? this.mapToEntity(streak) : null;
  }

  async createUserStreak(data: any): Promise<UserStreak> {
    const [created] = await this.db('user_streaks')
      .insert({
        user_id: data.userId,
        streak_type: data.streakType,
        current_streak: data.currentStreak,
        longest_streak: data.longestStreak,
        streak_start_date: data.streakStartDate,
        last_activity_date: data.lastActivityDate,
        is_protected: data.isProtected,
        protection_count: data.protectionCount,
        streak_history: JSON.stringify(data.streakHistory),
      })
      .returning('*');
    return this.mapToEntity(created);
  }

  async updateUserStreak(streakId: string, updates: any): Promise<UserStreak> {
    const [updated] = await this.db('user_streaks')
      .where({ id: streakId })
      .update({
        current_streak: updates.currentStreak,
        longest_streak: updates.longestStreak,
        streak_start_date: updates.streakStartDate,
        last_activity_date: updates.lastActivityDate,
        is_protected: updates.isProtected,
        protection_count: updates.protectionCount,
        protection_expires_at: updates.protectionExpiresAt,
        streak_history: updates.streakHistory ? JSON.stringify(updates.streakHistory) : undefined,
        updated_at: this.db.fn.now(),
      })
      .returning('*');
    return this.mapToEntity(updated);
  }

  async findMilestonesByType(streakType: StreakType): Promise<StreakMilestone[]> {
    const milestones = await this.db('streak_milestones')
      .where({ streak_type: streakType, is_active: true })
      .orderBy('days_required', 'asc');
    return milestones.map(this.mapMilestoneToEntity);
  }

  async findUserMilestones(userId: string): Promise<UserStreakMilestone[]> {
    const milestones = await this.db('user_streak_milestones').where({ user_id: userId });
    return milestones.map(this.mapUserMilestoneToEntity);
  }

  async findUserMilestonesWithDetails(userId: string): Promise<any[]> {
    return this.db('user_streak_milestones as usm')
      .select('usm.*', 'sm.*')
      .join('streak_milestones as sm', 'usm.milestone_id', 'sm.id')
      .where({ 'usm.user_id': userId });
  }

  async createUserMilestone(data: any): Promise<UserStreakMilestone> {
    const [created] = await this.db('user_streak_milestones')
      .insert({
        user_id: data.userId,
        milestone_id: data.milestoneId,
        streak_id: data.streakId,
        streak_at_achievement: data.streakAtAchievement,
        reward_claimed: data.rewardClaimed,
      })
      .returning('*');
    return this.mapUserMilestoneToEntity(created);
  }

  async getTopStreaksByType(streakType: StreakType, limit: number): Promise<any[]> {
    return this.db('user_streaks as us')
      .select('us.*', 'u.email', 'p.display_name')
      .join('users as u', 'us.user_id', 'u.id')
      .leftJoin('profiles as p', 'u.id', 'p.user_id')
      .where({ 'us.streak_type': streakType })
      .orderBy('us.current_streak', 'desc')
      .limit(limit);
  }

  private mapToEntity(row: any): UserStreak {
    return {
      id: row.id,
      userId: row.user_id,
      streakType: row.streak_type,
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
      streakStartDate: row.streak_start_date,
      lastActivityDate: row.last_activity_date,
      isProtected: row.is_protected,
      protectionCount: row.protection_count,
      protectionExpiresAt: row.protection_expires_at,
      streakHistory: row.streak_history ? JSON.parse(row.streak_history) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapMilestoneToEntity(row: any): StreakMilestone {
    return {
      id: row.id,
      streakType: row.streak_type,
      daysRequired: row.days_required,
      title: row.title,
      description: row.description,
      coinReward: row.coin_reward,
      boostReward: row.boost_reward,
      superLikeReward: row.super_like_reward,
      bonusRewards: row.bonus_rewards ? JSON.parse(row.bonus_rewards) : null,
      badgeIcon: row.badge_icon,
      badgeColor: row.badge_color,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapUserMilestoneToEntity(row: any): UserStreakMilestone {
    return {
      id: row.id,
      userId: row.user_id,
      milestoneId: row.milestone_id,
      streakId: row.streak_id,
      streakAtAchievement: row.streak_at_achievement,
      rewardClaimed: row.reward_claimed,
      achievedAt: row.achieved_at,
      claimedAt: row.claimed_at,
    };
  }
}
