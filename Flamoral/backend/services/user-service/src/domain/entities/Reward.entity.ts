export interface RewardHistoryEntity {
  id: string;
  user_id: string;
  reward_type: RewardType;
  reward_name: string;
  description?: string;
  coins_granted: number;
  boosts_granted: number;
  super_likes_granted: number;
  xp_granted: number;
  badge_granted_id?: string;
  reference_type?: string;
  reference_id?: string;
  granted_at: Date;
}

export type RewardType =
  | 'daily_login'
  | 'streak_bonus'
  | 'achievement'
  | 'challenge'
  | 'level_up'
  | 'milestone'
  | 'special_event'
  | 'referral'
  | 'profile_completion';

export interface GrantRewardDto {
  user_id: string;
  reward_type: RewardType;
  reward_name: string;
  description?: string;
  coins?: number;
  boosts?: number;
  super_likes?: number;
  xp?: number;
  badge_slug?: string;
  reference_type?: string;
  reference_id?: string;
}

export interface RewardSummary {
  total_coins_earned: number;
  total_boosts_earned: number;
  total_super_likes_earned: number;
  total_xp_earned: number;
  total_badges_earned: number;
  rewards_by_type: Record<RewardType, number>;
}

export interface RewardHistoryResponse {
  id: string;
  reward_type: RewardType;
  reward_name: string;
  description?: string;
  coins_granted: number;
  boosts_granted: number;
  super_likes_granted: number;
  xp_granted: number;
  badge_granted?: {
    id: string;
    name: string;
    slug: string;
    icon_url?: string;
  };
  granted_at: Date;
}
