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

  async getUserBadges(userId: string): Promise<UserProfileBadge[]> {
    return this.repository.findUserBadgesWithDetails(userId);
  }

  async getUserEquippedBadges(userId: string): Promise<UserProfileBadge[]> {
    return this.repository.findUserEquippedBadges(userId);
  }

  async awardBadge(userId: string, badgeKey: string, metadata?: any): Promise<UserProfileBadge> {
    const badge = await this.repository.findBadgeByKey(badgeKey);
    if (!badge || !badge.isActive) {
      throw new Error('Badge not found or inactive');
    }

    // Check if user already has this badge
    const existing = await this.repository.findUserBadge(userId, badge.id);
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
      userId,
      badgeId: badge.id,
      isEquipped: badge.isVisibleOnProfile,
      displayOrder: null,
      expiresAt,
      metadata: metadata || null,
    });

    // Check badge collections
    await this.checkBadgeCollections(userId);

    return userBadge;
  }

  async equipBadge(userId: string, badgeId: string, equipped: boolean): Promise<UserProfileBadge> {
    const userBadge = await this.repository.findUserBadge(userId, badgeId);
    if (!userBadge) {
      throw new Error('User does not have this badge');
    }

    // Limit to max 5 equipped badges
    if (equipped) {
      const equippedBadges = await this.repository.findUserEquippedBadges(userId);
      if (equippedBadges.length >= 5 && !userBadge.isEquipped) {
        throw new Error('Maximum 5 badges can be equipped');
      }
    }

    return this.repository.updateUserBadge(userBadge.id, {
      isEquipped: equipped,
    });
  }

  async reorderBadges(userId: string, badgeOrder: { badgeId: string; order: number }[]): Promise<void> {
    for (const { badgeId, order } of badgeOrder) {
      const userBadge = await this.repository.findUserBadge(userId, badgeId);
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

  async autoAwardBadges(userId: string): Promise<UserProfileBadge[]> {
    const awarded: UserProfileBadge[] = [];
    const autoAwardBadges = await this.repository.findAutoAwardBadges();

    for (const badge of autoAwardBadges) {
      // Check if user already has this badge
      const existing = await this.repository.findUserBadge(userId, badge.id);
      if (existing) continue;

      // Check requirements
      const meetsRequirements = await this.checkBadgeRequirements(userId, badge);
      if (meetsRequirements) {
        try {
          const userBadge = await this.awardBadge(userId, badge.key);
          awarded.push(userBadge);
        } catch (error) {
          // Skip if error
        }
      }
    }

    return awarded;
  }

  private async checkBadgeRequirements(userId: string, badge: ProfileBadge): Promise<boolean> {
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
        .where({ user1_id: userId })
        .orWhere({ user2_id: userId })
        .count('* as count')
        .first();

      if (requirements.total_matches.min && matchCount && Number(matchCount.count) < requirements.total_matches.min) {
        return false;
      }
    }

    if (requirements.total_messages) {
      const messageCount = await this.db('messages')
        .where({ sender_id: userId })
        .count('* as count')
        .first();

      if (requirements.total_messages.min && messageCount && Number(messageCount.count) < requirements.total_messages.min) {
        return false;
      }
    }

    if (requirements.login_streak) {
      const streak = await this.db('user_streaks')
        .where({ user_id: userId, streak_type: 'login' })
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

  async getUserBadgeCollections(userId: string): Promise<UserBadgeCollection[]> {
    return this.repository.findUserCollectionsWithDetails(userId);
  }

  private async checkBadgeCollections(userId: string): Promise<void> {
    const collections = await this.repository.findAllCollections();
    const userBadges = await this.repository.findUserBadges(userId);
    const userBadgeIds = new Set(userBadges.map(ub => ub.badgeId));

    for (const collection of collections) {
      const requiredBadgeIds = collection.requiredBadgeIds as string[];
      const hasAllBadges = requiredBadgeIds.every(id => userBadgeIds.has(id));

      if (hasAllBadges) {
        // Check if user already has this collection
        const existing = await this.repository.findUserCollection(userId, collection.id);
        if (!existing) {
          // Award collection
          await this.repository.createUserCollection({
            userId,
            collectionId: collection.id,
            isCompleted: true,
            completedAt: new Date(),
            rewardClaimed: false,
          });

          // Award collection rewards
          if (collection.coinReward > 0) {
            await this.awardCoins(this.db, userId, collection.coinReward, `Badge Collection: ${collection.name}`);
          }
          if (collection.xpReward > 0) {
            await this.awardXP(this.db, userId, collection.xpReward);
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
              await this.awardCoins(this.db, userId, collection.coinReward, `Badge Collection: ${collection.name}`);
            }
            if (collection.xpReward > 0) {
              await this.awardXP(this.db, userId, collection.xpReward);
            }
            await this.repository.updateUserCollection(existing.id, {
              rewardClaimed: true,
            });
          }
        }
      }
    }
  }

  private async awardCoins(db: Knex, userId: string, amount: number, reason: string): Promise<void> {
    const existingCoins = await db('coins').where({ user_id: userId }).first();
    if (existingCoins) {
      await db('coins')
        .where({ user_id: userId })
        .increment('balance', amount)
        .increment('total_earned', amount)
        .update({ updated_at: db.fn.now() });
    } else {
      await db('coins').insert({
        user_id: userId,
        balance: amount,
        total_earned: amount,
        total_spent: 0,
        total_purchased: 0,
      });
    }
    await db('coin_transactions').insert({
      user_id: userId,
      amount,
      type: 'earned',
      source: 'badge_collection',
      description: reason,
      balance_after: existingCoins ? existingCoins.balance + amount : amount,
    });
  }

  private async awardXP(db: Knex, userId: string, amount: number): Promise<void> {
    const userExp = await db('user_experience').where({ user_id: userId }).first();
    if (userExp) {
      await db('user_experience')
        .where({ user_id: userId })
        .increment('total_xp', amount)
        .update({ updated_at: db.fn.now() });
    }
  }
}
