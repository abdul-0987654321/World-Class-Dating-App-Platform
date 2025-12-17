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

export type BadgeRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

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
export type ProfileBadge = BadgeEntity;
export type UserProfileBadge = UserBadgeEntity;
export type BadgeType = BadgeCategory;
export type BadgeCollection = {
  user_id: string;
  badges: BadgeEntity[];
  total_count: number;
};
export type UserBadgeCollection = {
  user_id: string;
  badges: UserBadgeEntity[];
  total_count: number;
};
