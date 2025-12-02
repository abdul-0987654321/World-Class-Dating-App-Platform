export interface UserXPEntity {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  xp_to_next_level: number;
  lifetime_xp_earned: number;
  highest_level_reached: number;
  created_at: Date;
  updated_at: Date;
}

export interface XPTransactionEntity {
  id: string;
  user_id: string;
  xp_amount: number;
  level_before: number;
  level_after: number;
  total_xp_after: number;
  activity_type: XPActivityType;
  description?: string;
  reference_type?: string;
  reference_id?: string;
  created_at: Date;
}

export type XPActivityType =
  | 'profile_complete'
  | 'photo_upload'
  | 'profile_update'
  | 'daily_login'
  | 'send_message'
  | 'receive_message'
  | 'match_made'
  | 'super_like_sent'
  | 'conversation_starter'
  | 'response_received'
  | 'date_scheduled'
  | 'profile_verified'
  | 'streak_milestone'
  | 'challenge_completed'
  | 'achievement_unlocked';

export interface GrantXPDto {
  user_id: string;
  xp_amount: number;
  activity_type: XPActivityType;
  description?: string;
  reference_type?: string;
  reference_id?: string;
}

export interface UserXPResponse {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  xp_to_next_level: number;
  progress_percentage: number;
  lifetime_xp_earned: number;
  highest_level_reached: number;
}

export interface XPRewardConfig {
  profile_complete: number;
  photo_upload: number;
  profile_update: number;
  daily_login: number;
  send_message: number;
  receive_message: number;
  match_made: number;
  super_like_sent: number;
  conversation_starter: number;
  response_received: number;
  date_scheduled: number;
  profile_verified: number;
}

export const DEFAULT_XP_REWARDS: XPRewardConfig = {
  profile_complete: 100,
  photo_upload: 10,
  profile_update: 5,
  daily_login: 20,
  send_message: 2,
  receive_message: 1,
  match_made: 50,
  super_like_sent: 3,
  conversation_starter: 15,
  response_received: 10,
  date_scheduled: 100,
  profile_verified: 200,
};
