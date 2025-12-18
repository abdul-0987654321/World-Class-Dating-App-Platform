import { Knex } from 'knex';
import { BadgeRepository } from '../repositories/Badge.repository';
import {
  ProfileBadge,
  UserProfileBadge,
  BadgeType,
  BadgeCollection,
  UserBadgeCollection,
} from '../entities/Badge.entity';

export class BadgeService {
  private repository: BadgeRepository;

  constructor(private db: Knex) {
    this.repository = new BadgeRepository(db);
  }

  async getAllBadges(): Promise<ProfileBadge[]> {
    return this.repository.findAllBadges();
  }

  async getBadgesByType(type: BadgeType): Promise<ProfileBadge[]> {
    return this.repository.findBadgesByType(type);
  }

  async getUserBadges(user_id: string): Promise<UserProfileBadge[]> {
    return this.repository.findUserBadgesWithDetails(user_id);
  }

  async getUserEquippedBadges(user_id: string): Promise<UserProfileBadge[]> {
    return this.repository.findUserEquippedBadges(user_id);
  }

  async awardBadge(user_id: string, badgeKey: string, metadata?: any): Promise<UserProfileBadge> {
    const badge = await this.repository.findBadgeByKey(badgeKey);
    if (!badge || !badge.is_active) {
      throw new Error('Badge not found or inactive');
    }

    // Check if user already has this badge
    const existing = await this.repository.findUserBadge(user_id, badge.id);
    if (existing) {
      return existing;
    }

    // Calculate expiration
    let expiresAt = null;
    if (!badge.isPermanent && badge.durationDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + badge.durationDays);
    }

    // Award badge
    const userBadge = await this.repository.createUserBadge({
      userId: user_id,
      badgeId: badge.id,
      isEquipped: badge.isVisibleOnProfile,
      displayOrder: null,
      expiresAt: expiresAt,
      metadata: metadata || null,
    });

    // Check badge collections
    await this.checkBadgeCollections(user_id);

    return userBadge;
  }

  async equipBadge(user_id: string, badge_id: string, equipped: boolean): Promise<UserProfileBadge> {
    const userBadge = await this.repository.findUserBadge(user_id, badge_id);
    if (!userBadge) {
      throw new Error('User does not have this badge');
    }

    // Limit to max 5 equipped badges
    if (equipped) {
      const equippedBadges = await this.repository.findUserEquippedBadges(user_id);
      if (equippedBadges.length >= 5 && !userBadge.isEquipped) {
        throw new Error('Maximum 5 badges can be equipped');
      }
    }

    return this.repository.updateUserBadge(userBadge.id, {
      isEquipped: equipped,
    });
  }

  async reorderBadges(user_id: string, badge_order: { badge_id: string; order: number }[]): Promise<void> {
    for (const { badge_id, order } of badge_order) {
      const userBadge = await this.repository.findUserBadge(user_id, badge_id);
      if (userBadge) {
        await this.repository.updateUserBadge(userBadge.id, {
          displayOrder: order,
        });
      }
    }
  }

  async removeExpiredBadges(): Promise<number> {
    const expiredBadges = await this.repository.findExpiredBadges();
    let count = 0;

    for (const userBadge of expiredBadges) {
      await this.repository.deleteUserBadge(userBadge.id);
      count++;
    }

    return count;
  }

  async autoAwardBadges(user_id: string): Promise<UserProfileBadge[]> {
    const awarded: UserProfileBadge[] = [];
    const autoAwardBadges = await this.repository.findAutoAwardBadges();

    for (const badge of autoAwardBadges) {
      // Check if user already has this badge
      const existing = await this.repository.findUserBadge(user_id, badge.id);
      if (existing) continue;

      // Check requirements
      const meetsRequirements = await this.checkBadgeRequirements(user_id, badge);
      if (meetsRequirements) {
        try {
          const userBadge = await this.awardBadge(user_id, badge.key);
          awarded.push(userBadge);
        } catch (error) {
          // Skip if error
        }
      }
    }

    return awarded;
  }

  private async checkBadgeRequirements(user_id: string, badge: ProfileBadge): Promise<boolean> {
    if (!badge.requirements) return false;

    const requirements = badge.requirements as any;

    // Check verification requirements
    if (requirements.verification) {
      // Would check verification status from database
      // Simplified for now
      return true;
    }

    // Check user stats requirements
    if (requirements.total_matches) {
      const matchCount = await this.db('matches')
        .where({ user1_id: user_id })
        .orWhere({ user2_id: user_id })
        .count('* as count')
        .first();

      if (requirements.total_matches.min && matchCount && Number(matchCount.count) < requirements.total_matches.min) {
        return false;
      }
    }

    if (requirements.total_messages) {
      const messageCount = await this.db('messages')
        .where({ sender_id: user_id })
        .count('* as count')
        .first();

      if (requirements.total_messages.min && messageCount && Number(messageCount.count) < requirements.total_messages.min) {
        return false;
      }
    }

    if (requirements.login_streak) {
      const streak = await this.db('user_streaks')
        .where({ user_id: user_id, streak_type: 'login' })
        .first();

      if (requirements.login_streak.min && (!streak || streak.current_streak < requirements.login_streak.min)) {
        return false;
      }
    }

    return true;
  }

  async getBadgeCollections(): Promise<BadgeCollection[]> {
    return this.repository.findAllCollections();
  }

  async getUserBadgeCollections(user_id: string): Promise<UserBadgeCollection[]> {
    return this.repository.findUserCollectionsWithDetails(user_id);
  }

  private async checkBadgeCollections(user_id: string): Promise<void> {
    const collections = await this.repository.findAllCollections();
    const userBadges = await this.repository.findUserBadges(user_id);
    const userBadgeIds = new Set(userBadges.map(ub => ub.badgeId));

    for (const collection of collections) {
      const requiredBadgeIds = collection.requiredBadgeIds as string[];
      const hasAllBadges = requiredBadgeIds.every(id => userBadgeIds.has(id));

      if (hasAllBadges) {
        // Check if user already has this collection
        const existing = await this.repository.findUserCollection(user_id, collection.id);
        if (!existing) {
          // Award collection
          await this.repository.createUserCollection({
            userId: user_id,
            collectionId: collection.id,
            isCompleted: true,
            completedAt: new Date(),
            rewardClaimed: false,
          });

          // Award collection rewards
          if (collection.coinReward > 0) {
            await this.awardCoins(this.db, user_id, collection.coinReward, `Badge Collection: ${collection.name}`);
          }
          if (collection.xpReward > 0) {
            await this.awardXP(this.db, user_id, collection.xpReward);
          }
        } else if (!existing.isCompleted) {
          // Update to completed
          await this.repository.updateUserCollection(existing.id, {
            isCompleted: true,
            completedAt: new Date(),
          });

          // Award rewards
          if (!existing.rewardClaimed) {
            if (collection.coinReward > 0) {
              await this.awardCoins(this.db, user_id, collection.coinReward, `Badge Collection: ${collection.name}`);
            }
            if (collection.xpReward > 0) {
              await this.awardXP(this.db, user_id, collection.xpReward);
            }
            await this.repository.updateUserCollection(existing.id, {
              rewardClaimed: true,
            });
          }
        }
      }
    }
  }

  private async awardCoins(db: Knex, user_id: string, amount: number, reason: string): Promise<void> {
    const existingCoins = await db('coins').where({ user_id: user_id }).first();
    if (existingCoins) {
      await db('coins')
        .where({ user_id: user_id })
        .increment('balance', amount)
        .increment('total_earned', amount)
        .update({ updated_at: db.fn.now() });
    } else {
      await db('coins').insert({
        user_id: user_id,
        balance: amount,
        total_earned: amount,
        total_spent: 0,
        total_purchased: 0,
      });
    }
    await db('coin_transactions').insert({
      user_id: user_id,
      amount,
      type: 'earned',
      source: 'badge_collection',
      description: reason,
      balance_after: existingCoins ? existingCoins.balance + amount : amount,
    });
  }

  private async awardXP(db: Knex, user_id: string, amount: number): Promise<void> {
    const userExp = await db('user_experience').where({ user_id: user_id }).first();
    if (userExp) {
      await db('user_experience')
        .where({ user_id: user_id })
        .increment('total_xp', amount)
        .update({ updated_at: db.fn.now() });
    }
  }
}
