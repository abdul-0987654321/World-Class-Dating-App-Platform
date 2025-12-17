import db from '../../infrastructure/database/connection';
import {
  InterestBadge,
  IntentionBadge,
  UserInterestBadge,
  UserIntentionBadge,
  UserInterestBadgeResponse,
  UserIntentionBadgeResponse,
  InterestBadgePopularity,
  IntentionBadgeDistribution,
} from '../entities/InterestIntentionBadge.entity';

export class InterestIntentionBadgeRepository {
  private interestBadgesTable = 'interest_badges';
  private intentionBadgesTable = 'intention_badges';
  private userInterestBadgesTable = 'user_interest_badges';
  private userIntentionBadgesTable = 'user_intention_badges';

  // ============================================
  // INTEREST BADGES - Master List
  // ============================================

  async getAllInterestBadges(): Promise<InterestBadge[]> {
    return db(this.interestBadgesTable)
      .where({ is_active: true })
      .orderBy('display_order', 'asc');
  }

  async getInterestBadgesByCategory(category: string): Promise<InterestBadge[]> {
    return db(this.interestBadgesTable)
      .where({ category, is_active: true })
      .orderBy('display_order', 'asc');
  }

  async getInterestBadgeById(badgeId: string): Promise<InterestBadge | null> {
    const badge = await db(this.interestBadgesTable)
      .where({ id: badgeId })
      .first();
    return badge || null;
  }

  // ============================================
  // INTENTION BADGES - Master List
  // ============================================

  async getAllIntentionBadges(): Promise<IntentionBadge[]> {
    return db(this.intentionBadgesTable)
      .where({ is_active: true })
      .orderBy('display_order', 'asc');
  }

  async getIntentionBadgeById(badgeId: string): Promise<IntentionBadge | null> {
    const badge = await db(this.intentionBadgesTable)
      .where({ id: badgeId })
      .first();
    return badge || null;
  }

  // ============================================
  // USER INTEREST BADGES
  // ============================================

  async getUserInterestBadges(userId: string): Promise<UserInterestBadgeResponse[]> {
    return db(this.userInterestBadgesTable)
      .join(
        this.interestBadgesTable,
        `${this.userInterestBadgesTable}.badge_id`,
        '=',
        `${this.interestBadgesTable}.id`
      )
      .where(`${this.userInterestBadgesTable}.user_id`, userId)
      .where(`${this.interestBadgesTable}.is_active`, true)
      .select(
        `${this.interestBadgesTable}.id`,
        `${this.interestBadgesTable}.name`,
        `${this.interestBadgesTable}.slug`,
        `${this.interestBadgesTable}.icon`,
        `${this.interestBadgesTable}.category`,
        `${this.userInterestBadgesTable}.selected_at`
      )
      .orderBy(`${this.interestBadgesTable}.display_order`, 'asc');
  }

  async setUserInterestBadges(userId: string, badgeIds: string[]): Promise<void> {
    await db.transaction(async (trx) => {
      // Remove all existing badges for this user
      await trx(this.userInterestBadgesTable)
        .where({ user_id: userId })
        .delete();

      // Insert new badges
      if (badgeIds.length > 0) {
        const insertData = badgeIds.map((badgeId) => ({
          user_id: userId,
          badge_id: badgeId,
        }));

        await trx(this.userInterestBadgesTable).insert(insertData);
      }
    });
  }

  async addUserInterestBadge(userId: string, badgeId: string): Promise<UserInterestBadge> {
    const [badge] = await db(this.userInterestBadgesTable)
      .insert({
        user_id: userId,
        badge_id: badgeId,
      })
      .returning('*');

    return badge;
  }

  async removeUserInterestBadge(userId: string, badgeId: string): Promise<void> {
    await db(this.userInterestBadgesTable)
      .where({ user_id: userId, badge_id: badgeId })
      .delete();
  }

  // ============================================
  // USER INTENTION BADGES
  // ============================================

  async getUserIntentionBadges(userId: string): Promise<UserIntentionBadgeResponse[]> {
    return db(this.userIntentionBadgesTable)
      .join(
        this.intentionBadgesTable,
        `${this.userIntentionBadgesTable}.badge_id`,
        '=',
        `${this.intentionBadgesTable}.id`
      )
      .where(`${this.userIntentionBadgesTable}.user_id`, userId)
      .where(`${this.intentionBadgesTable}.is_active`, true)
      .select(
        `${this.intentionBadgesTable}.id`,
        `${this.intentionBadgesTable}.name`,
        `${this.intentionBadgesTable}.slug`,
        `${this.intentionBadgesTable}.icon`,
        `${this.intentionBadgesTable}.description`,
        `${this.userIntentionBadgesTable}.priority`,
        `${this.userIntentionBadgesTable}.selected_at`
      )
      .orderBy(`${this.userIntentionBadgesTable}.priority`, 'asc');
  }

  async setUserIntentionBadges(
    userId: string,
    badges: Array<{ badge_id: string; priority: 1 | 2 }>
  ): Promise<void> {
    if (badges.length > 2) {
      throw new Error('User can only have a maximum of 2 intention badges');
    }

    // Validate unique priorities
    const priorities = badges.map((b) => b.priority);
    if (priorities.length !== new Set(priorities).size) {
      throw new Error('Each intention badge must have a unique priority');
    }

    await db.transaction(async (trx) => {
      // Remove all existing badges for this user
      await trx(this.userIntentionBadgesTable)
        .where({ user_id: userId })
        .delete();

      // Insert new badges
      if (badges.length > 0) {
        const insertData = badges.map((badge) => ({
          user_id: userId,
          badge_id: badge.badge_id,
          priority: badge.priority,
        }));

        await trx(this.userIntentionBadgesTable).insert(insertData);
      }
    });
  }

  async addUserIntentionBadge(
    userId: string,
    badgeId: string,
    priority: 1 | 2
  ): Promise<UserIntentionBadge> {
    // Check if user already has 2 badges
    const existingCount = await db(this.userIntentionBadgesTable)
      .where({ user_id: userId })
      .count('* as count')
      .first();

    if (existingCount && parseInt(existingCount.count as string) >= 2) {
      throw new Error('User can only have a maximum of 2 intention badges');
    }

    const [badge] = await db(this.userIntentionBadgesTable)
      .insert({
        user_id: userId,
        badge_id: badgeId,
        priority,
      })
      .returning('*');

    return badge;
  }

  async removeUserIntentionBadge(userId: string, badgeId: string): Promise<void> {
    await db(this.userIntentionBadgesTable)
      .where({ user_id: userId, badge_id: badgeId })
      .delete();
  }

  async updateUserIntentionBadgePriority(
    userId: string,
    badgeId: string,
    priority: 1 | 2
  ): Promise<void> {
    await db(this.userIntentionBadgesTable)
      .where({ user_id: userId, badge_id: badgeId })
      .update({ priority, updated_at: db.fn.now() });
  }

  // ============================================
  // ANALYTICS & STATISTICS
  // ============================================

  async getInterestBadgePopularity(): Promise<InterestBadgePopularity[]> {
    return db.raw(`
      SELECT * FROM v_interest_badge_popularity
      ORDER BY user_count DESC
    `).then((result) => result.rows);
  }

  async getIntentionBadgeDistribution(): Promise<IntentionBadgeDistribution[]> {
    return db.raw(`
      SELECT * FROM v_intention_badge_distribution
      ORDER BY user_count DESC
    `).then((result) => result.rows);
  }

  // ============================================
  // MATCHING HELPERS
  // ============================================

  async countSharedInterestBadges(userId1: string, userId2: string): Promise<number> {
    const result = await db.raw(
      'SELECT count_shared_interest_badges(?, ?) as count',
      [userId1, userId2]
    );
    return parseInt(result.rows[0].count);
  }

  async checkIntentionCompatibility(userId1: string, userId2: string): Promise<boolean> {
    const result = await db.raw(
      'SELECT check_intention_compatibility(?, ?) as compatible',
      [userId1, userId2]
    );
    return result.rows[0].compatible;
  }

  // Get users by interest badge
  async getUsersByInterestBadge(badgeId: string, limit = 100): Promise<string[]> {
    const users = await db(this.userInterestBadgesTable)
      .where({ badge_id: badgeId })
      .limit(limit)
      .pluck('user_id');

    return users;
  }

  // Get users by intention badge
  async getUsersByIntentionBadge(badgeId: string, limit = 100): Promise<string[]> {
    const users = await db(this.userIntentionBadgesTable)
      .where({ badge_id: badgeId })
      .limit(limit)
      .pluck('user_id');

    return users;
  }

  // Find users with specific interest badges (intersection)
  async findUsersByInterestBadges(badgeIds: string[], limit = 100): Promise<string[]> {
    if (badgeIds.length === 0) return [];

    const users = await db(this.userInterestBadgesTable)
      .whereIn('badge_id', badgeIds)
      .groupBy('user_id')
      .havingRaw('COUNT(DISTINCT badge_id) = ?', [badgeIds.length])
      .limit(limit)
      .pluck('user_id');

    return users;
  }

  // Find users with any of the specified interest badges (union)
  async findUsersByAnyInterestBadges(badgeIds: string[], limit = 100): Promise<string[]> {
    if (badgeIds.length === 0) return [];

    const users = await db(this.userInterestBadgesTable)
      .whereIn('badge_id', badgeIds)
      .distinct('user_id')
      .limit(limit)
      .pluck('user_id');

    return users;
  }
}
