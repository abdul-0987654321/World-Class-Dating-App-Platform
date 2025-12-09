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

// Alias for backwards compatibility
export type Achievement = AchievementEntity;

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

// DTOs for creating and updating achievements
export interface CreateAchievementDTO {
  name: string;
  slug: string;
  description: string;
  icon_url?: string;
  type: AchievementType;
  is_progressive?: boolean;
  target_value?: number;
  current_tier?: number;
  xp_reward: number;
  coin_reward: number;
  badge_reward_id?: string;
  is_hidden?: boolean;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdateAchievementDTO {
  name?: string;
  description?: string;
  icon_url?: string;
  type?: AchievementType;
  is_progressive?: boolean;
  target_value?: number;
  current_tier?: number;
  xp_reward?: number;
  coin_reward?: number;
  badge_reward_id?: string;
  is_hidden?: boolean;
  display_order?: number;
  is_active?: boolean;
}

export interface AchievementFilters {
  type?: AchievementType;
  is_active?: boolean;
  is_hidden?: boolean;
  is_progressive?: boolean;
}

export type RequirementType =
  | 'count'
  | 'threshold'
  | 'streak'
  | 'completion'
  | 'milestone';

// Additional type aliases for backwards compatibility
export type AchievementDefinition = AchievementEntity;
export type UserAchievement = UserAchievementEntity;
export type AchievementProgressLog = {
  id: string;
  user_id: string;
  achievement_id: string;
  progress_change: number;
  old_progress: number;
  new_progress: number;
  event_type: string;
  created_at: Date;
};
export type UserAchievementStats = {
  total_achievements: number;
  completed_achievements: number;
  in_progress_achievements: number;
  total_xp_earned: number;
  total_coins_earned: number;
};
export type UserAchievementWithDefinition = UserAchievementEntity & {
  definition: AchievementEntity;
};
export type CreateAchievementDefinitionInput = CreateAchievementDTO;
export type UpdateAchievementDefinitionInput = UpdateAchievementDTO;
export type CreateUserAchievementInput = {
  user_id: string;
  achievement_id: string;
  current_progress?: number;
  target_progress: number;
};
export type UpdateUserAchievementInput = {
  current_progress?: number;
  target_progress?: number;
  is_completed?: boolean;
  completed_at?: Date;
  current_tier?: number;
  times_completed?: number;
};
export type AchievementCategory =
  | 'engagement'
  | 'social'
  | 'profile'
  | 'premium'
  | 'special';
export type AchievementTier =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond';
export type AchievementProgressUpdate = UpdateAchievementProgressDto;
export type AchievementUnlockResult = {
  unlocked: boolean;
  achievement?: AchievementEntity;
  rewards?: {
    xp_granted: number;
    coins_granted: number;
    badge_granted?: string;
  };
};
export type AchievementShowcase = {
  user_id: string;
  achievement_ids: string[];
};

// Helper functions
export const calculateProgressPercentage = (current: number, target: number): number => {
  if (target === 0) return 100;
  return Math.min(100, Math.round((current / target) * 100));
};

export const isAchievementComplete = (current: number, target: number): boolean => {
  return current >= target;
};
