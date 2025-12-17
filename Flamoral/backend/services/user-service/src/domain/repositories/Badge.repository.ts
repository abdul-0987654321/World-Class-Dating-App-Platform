import { Knex } from 'knex';
import { ProfileBadge, UserProfileBadge, BadgeType, BadgeCollection, UserBadgeCollection } from '../entities/Badge.entity';

export class BadgeRepository {
  constructor(private db: Knex) {}

  async findAllBadges(): Promise<ProfileBadge[]> {
    const badges = await this.db('profile_badges').where({ is_active: true }).orderBy('display_priority', 'desc');
    return badges.map(this.mapBadgeToEntity);
  }

  async findBadgesByType(type: BadgeType): Promise<ProfileBadge[]> {
    const badges = await this.db('profile_badges').where({ type, is_active: true });
    return badges.map(this.mapBadgeToEntity);
  }

  async findBadgeByKey(key: string): Promise<ProfileBadge | null> {
    const badge = await this.db('profile_badges').where({ key, is_active: true }).first();
    return badge ? this.mapBadgeToEntity(badge) : null;
  }

  async findAutoAwardBadges(): Promise<ProfileBadge[]> {
    const badges = await this.db('profile_badges').where({ is_auto_awarded: true, is_active: true });
    return badges.map(this.mapBadgeToEntity);
  }

  async findUserBadges(userId: string): Promise<UserProfileBadge[]> {
    const badges = await this.db('user_profile_badges').where({ user_id: userId });
    return badges.map(this.mapUserBadgeToEntity);
  }

  async findUserBadgesWithDetails(userId: string): Promise<UserProfileBadge[]> {
    const badges = await this.db('user_profile_badges as upb')
      .select('upb.*', 'pb.*')
      .join('profile_badges as pb', 'upb.badge_id', 'pb.id')
      .where({ 'upb.user_id': userId })
      .orderBy('upb.display_order', 'asc');
    return badges.map(this.mapUserBadgeToEntity);
  }

  async findUserEquippedBadges(userId: string): Promise<UserProfileBadge[]> {
    const badges = await this.db('user_profile_badges as upb')
      .select('upb.*', 'pb.*')
      .join('profile_badges as pb', 'upb.badge_id', 'pb.id')
      .where({ 'upb.user_id': userId, 'upb.is_equipped': true })
      .orderBy('upb.display_order', 'asc');
    return badges.map(this.mapUserBadgeToEntity);
  }

  async findUserBadge(userId: string, badgeId: string): Promise<UserProfileBadge | null> {
    const badge = await this.db('user_profile_badges')
      .where({ user_id: userId, badge_id: badgeId })
      .first();
    return badge ? this.mapUserBadgeToEntity(badge) : null;
  }

  async createUserBadge(data: any): Promise<UserProfileBadge> {
    const [created] = await this.db('user_profile_badges')
      .insert({
        user_id: data.userId,
        badge_id: data.badgeId,
        is_equipped: data.isEquipped,
        display_order: data.displayOrder,
        expires_at: data.expiresAt,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      })
      .returning('*');
    return this.mapUserBadgeToEntity(created);
  }

  async updateUserBadge(userBadgeId: string, updates: any): Promise<UserProfileBadge> {
    const [updated] = await this.db('user_profile_badges')
      .where({ id: userBadgeId })
      .update({
        is_equipped: updates.isEquipped,
        display_order: updates.displayOrder,
        updated_at: this.db.fn.now(),
      })
      .returning('*');
    return this.mapUserBadgeToEntity(updated);
  }

  async deleteUserBadge(userBadgeId: string): Promise<void> {
    await this.db('user_profile_badges').where({ id: userBadgeId }).delete();
  }

  async findExpiredBadges(): Promise<UserProfileBadge[]> {
    const now = new Date();
    const badges = await this.db('user_profile_badges')
      .where('expires_at', '<', now)
      .whereNotNull('expires_at');
    return badges.map(this.mapUserBadgeToEntity);
  }

  async findAllCollections(): Promise<BadgeCollection[]> {
    const collections = await this.db('badge_collections').where({ is_active: true });
    return collections.map(this.mapCollectionToEntity);
  }

  async findUserCollection(userId: string, collectionId: string): Promise<UserBadgeCollection | null> {
    const collection = await this.db('user_badge_collections')
      .where({ user_id: userId, collection_id: collectionId })
      .first();
    return collection ? this.mapUserCollectionToEntity(collection) : null;
  }

  async findUserCollectionsWithDetails(userId: string): Promise<UserBadgeCollection[]> {
    const collections = await this.db('user_badge_collections as ubc')
      .select('ubc.*', 'bc.*')
      .join('badge_collections as bc', 'ubc.collection_id', 'bc.id')
      .where({ 'ubc.user_id': userId });
    return collections.map(this.mapUserCollectionToEntity);
  }

  async createUserCollection(data: any): Promise<UserBadgeCollection> {
    const [created] = await this.db('user_badge_collections')
      .insert({
        user_id: data.userId,
        collection_id: data.collectionId,
        is_completed: data.isCompleted,
        completed_at: data.completedAt,
        reward_claimed: data.rewardClaimed,
      })
      .returning('*');
    return this.mapUserCollectionToEntity(created);
  }

  async updateUserCollection(userCollectionId: string, updates: any): Promise<UserBadgeCollection> {
    const [updated] = await this.db('user_badge_collections')
      .where({ id: userCollectionId })
      .update({
        is_completed: updates.isCompleted,
        completed_at: updates.completedAt,
        reward_claimed: updates.rewardClaimed,
        updated_at: this.db.fn.now(),
      })
      .returning('*');
    return this.mapUserCollectionToEntity(updated);
  }

  private mapBadgeToEntity(row: any): ProfileBadge {
    return {
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description,
      type: row.type,
      rarity: row.rarity,
      iconName: row.icon_name,
      iconColor: row.icon_color,
      backgroundColor: row.background_color,
      requirements: row.requirements ? JSON.parse(row.requirements) : null,
      isAutoAwarded: row.is_auto_awarded,
      isPermanent: row.is_permanent,
      durationDays: row.duration_days,
      isVisibleOnProfile: row.is_visible_on_profile,
      displayPriority: row.display_priority,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapUserBadgeToEntity(row: any): UserProfileBadge {
    return {
      id: row.id,
      userId: row.user_id,
      badgeId: row.badge_id,
      isEquipped: row.is_equipped,
      displayOrder: row.display_order,
      earnedAt: row.earned_at,
      expiresAt: row.expires_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapCollectionToEntity(row: any): BadgeCollection {
    return {
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description,
      requiredBadgeIds: row.required_badge_ids ? JSON.parse(row.required_badge_ids) : [],
      coinReward: row.coin_reward,
      xpReward: row.xp_reward,
      bonusRewards: row.bonus_rewards ? JSON.parse(row.bonus_rewards) : null,
      collectionBadgeIcon: row.collection_badge_icon,
      collectionBadgeColor: row.collection_badge_color,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapUserCollectionToEntity(row: any): UserBadgeCollection {
    return {
      id: row.id,
      userId: row.user_id,
      collectionId: row.collection_id,
      isCompleted: row.is_completed,
      completedAt: row.completed_at,
      rewardClaimed: row.reward_claimed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
