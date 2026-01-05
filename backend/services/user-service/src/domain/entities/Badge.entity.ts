export interface BadgeEntity {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_url?: string;
  color_code?: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  display_order: number;
  is_visible: boolean;
  is_active: boolean;
  requirements: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface UserBadgeEntity {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: Date;
  progress_value?: number;
  earned_note?: string;
  is_displayed_on_profile: boolean;
  display_position?: number;
  created_at: Date;
}

export type BadgeCategory =
  | 'profile'
  | 'activity'
  | 'milestone'
  | 'achievement'
  | 'special'
  | 'seasonal'
  | 'premium';

export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface AwardBadgeDto {
  user_id: string;
  badge_slug: string;
  progress_value?: number;
  earned_note?: string;
}

export interface UpdateBadgeDisplayDto {
  user_id: string;
  badge_id: string;
  is_displayed: boolean;
  display_position?: number;
}

export interface BadgeWithEarnedInfo extends BadgeEntity {
  is_earned: boolean;
  earned_at?: Date;
  is_displayed_on_profile?: boolean;
}

export interface UserBadgeResponse {
  id: string;
  badge_id: string;
  badge_name: string;
  badge_slug: string;
  badge_description: string;
  badge_icon_url?: string;
  badge_color_code?: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  earned_at: Date;
  progress_value?: number;
  is_displayed_on_profile: boolean;
  display_position?: number;
}

export interface BadgeProgressResponse {
  badge: BadgeEntity;
  current_progress: number;
  target_progress: number;
  completion_percentage: number;
  is_earned: boolean;
}

// Type aliases for backwards compatibility
export type ProfileBadge = {
  id: string;
  key: string;
  name: string;
  description: string;
  type: BadgeCategory;
  rarity: BadgeRarity;
  iconName: string;
  iconColor: string;
  backgroundColor: string;
  requirements: any;
  isAutoAwarded: boolean;
  isPermanent: boolean;
  durationDays: number | null;
  isVisibleOnProfile: boolean;
  displayPriority: number;
  isActive: boolean;
  is_active?: boolean;
  is_permanent?: boolean;
  duration_days?: number | null;
  is_visible?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UserProfileBadge = {
  id: string;
  userId: string;
  badgeId: string;
  isEquipped: boolean;
  displayOrder: number | null;
  earnedAt: Date;
  expiresAt: Date | null;
  metadata: any;
  is_equipped?: boolean;
  badge_id?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BadgeType = BadgeCategory;

export type BadgeCollection = {
  id: string;
  key: string;
  name: string;
  description: string;
  requiredBadgeIds: string[];
  required_badge_ids?: string[];
  coinReward: number;
  coin_reward?: number;
  xpReward: number;
  xp_reward?: number;
  bonusRewards: any;
  collectionBadgeIcon: string;
  collectionBadgeColor: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UserBadgeCollection = {
  id: string;
  userId: string;
  collectionId: string;
  isCompleted: boolean;
  is_completed?: boolean;
  completedAt: Date | null;
  rewardClaimed: boolean;
  reward_claimed?: boolean;
  createdAt: Date;
  updatedAt: Date;
};
