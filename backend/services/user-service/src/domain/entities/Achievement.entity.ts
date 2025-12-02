export interface AchievementEntity {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_url?: string;
  type: AchievementType;
  is_progressive: boolean;
  target_value?: number;
  current_tier: number;
  xp_reward: number;
  coin_reward: number;
  badge_reward_id?: string;
  is_hidden: boolean;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserAchievementEntity {
  id: string;
  user_id: string;
  achievement_id: string;
  current_progress: number;
  target_progress: number;
  is_completed: boolean;
  completed_at?: Date;
  current_tier: number;
  times_completed: number;
  completion_notified: boolean;
  created_at: Date;
  updated_at: Date;
}

export type AchievementType =
  | 'match_count'
  | 'message_count'
  | 'login_streak'
  | 'profile_completion'
  | 'social'
  | 'premium'
  | 'special';

export interface UpdateAchievementProgressDto {
  user_id: string;
  achievement_slug: string;
  progress_increment?: number;
  set_progress?: number;
}

export interface AchievementWithProgress extends AchievementEntity {
  user_progress?: UserAchievementEntity;
  completion_percentage: number;
  is_unlocked: boolean;
}

export interface AchievementCompletedResponse {
  achievement: AchievementEntity;
  rewards: {
    xp_granted: number;
    coins_granted: number;
    badge_granted?: string;
  };
  completion_time: Date;
}

export interface UserAchievementResponse {
  id: string;
  achievement_id: string;
  achievement_name: string;
  achievement_slug: string;
  achievement_description: string;
  achievement_icon_url?: string;
  type: AchievementType;
  current_progress: number;
  target_progress: number;
  completion_percentage: number;
  is_completed: boolean;
  completed_at?: Date;
  current_tier: number;
  times_completed: number;
  xp_reward: number;
  coin_reward: number;
}
