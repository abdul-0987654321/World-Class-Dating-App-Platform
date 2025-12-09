export interface WeeklyChallengeEntity {
  id: string;
  name: string;
  description: string;
  icon_url?: string;
  challenge_type: ChallengeType;
  target_value: number;
  requirements: Record<string, any>;
  start_date: Date;
  end_date: Date;
  is_active: boolean;
  xp_reward: number;
  coin_reward: number;
  boost_reward: number;
  super_like_reward: number;
  badge_reward_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserChallengeProgressEntity {
  id: string;
  user_id: string;
  challenge_id: string;
  current_progress: number;
  target_progress: number;
  completion_percentage: number;
  is_completed: boolean;
  completed_at?: Date;
  rewards_claimed: boolean;
  rewards_claimed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export type ChallengeType =
  | 'send_messages'
  | 'make_matches'
  | 'complete_profile'
  | 'swipe_count'
  | 'login_days'
  | 'conversation_starters'
  | 'photo_uploads';

export interface UpdateChallengeProgressDto {
  user_id: string;
  challenge_id: string;
  progress_increment?: number;
  set_progress?: number;
}

export interface ClaimChallengeRewardDto {
  user_id: string;
  challenge_id: string;
}

export interface ChallengeWithProgress extends WeeklyChallengeEntity {
  user_progress?: UserChallengeProgressEntity;
}

export interface UserChallengeResponse {
  id: string;
  challenge_id: string;
  challenge_name: string;
  challenge_description: string;
  challenge_icon_url?: string;
  challenge_type: ChallengeType;
  current_progress: number;
  target_progress: number;
  completion_percentage: number;
  is_completed: boolean;
  completed_at?: Date;
  rewards_claimed: boolean;
  start_date: Date;
  end_date: Date;
  days_remaining: number;
  rewards: {
    xp_reward: number;
    coin_reward: number;
    boost_reward: number;
    super_like_reward: number;
  };
}

// Type aliases for backwards compatibility
export type ChallengeDefinition = WeeklyChallengeEntity;
export type UserChallenge = UserChallengeProgressEntity;
export type ChallengeProgress = UserChallengeProgressEntity;
export type ChallengeStatus = 'active' | 'completed' | 'expired' | 'claimed';
export type ChallengeProgressUpdate = UpdateChallengeProgressDto;
export type ChallengeCompletionResult = {
  challenge: WeeklyChallengeEntity;
  completed: boolean;
  rewards?: {
    xp_reward: number;
    coin_reward: number;
    boost_reward: number;
    super_like_reward: number;
  };
};
