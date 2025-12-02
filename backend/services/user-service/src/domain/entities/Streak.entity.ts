export interface UserStreakEntity {
  id: string;
  user_id: string;
  login_streak: number;
  longest_login_streak: number;
  last_login_date?: Date;
  streak_started_at?: Date;
  conversation_streak: number;
  longest_conversation_streak: number;
  last_conversation_date?: Date;
  match_streak: number;
  longest_match_streak: number;
  last_match_date?: Date;
  streak_freezes_available: number;
  last_freeze_used_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface StreakHistoryEntity {
  id: string;
  user_id: string;
  streak_type: StreakType;
  streak_count: number;
  action: StreakAction;
  is_milestone: boolean;
  milestone_level?: number;
  created_at: Date;
}

export type StreakType = 'login' | 'conversation' | 'match';
export type StreakAction = 'increased' | 'broken' | 'frozen';

export interface UpdateStreakDto {
  user_id: string;
  streak_type: StreakType;
  increment?: boolean;
}

export interface UseStreakFreezeDto {
  user_id: string;
  streak_type: StreakType;
}

export interface UserStreakResponse {
  id: string;
  user_id: string;
  login_streak: number;
  longest_login_streak: number;
  last_login_date?: Date;
  streak_started_at?: Date;
  days_until_break: number;
  conversation_streak: number;
  longest_conversation_streak: number;
  match_streak: number;
  longest_match_streak: number;
  streak_freezes_available: number;
  next_milestone?: {
    type: StreakType;
    current: number;
    target: number;
    days_remaining: number;
  };
}

export interface StreakMilestone {
  days: number;
  reward_coins: number;
  reward_xp: number;
  badge_slug?: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, reward_coins: 5, reward_xp: 50 },
  { days: 7, reward_coins: 15, reward_xp: 150, badge_slug: 'week_warrior' },
  { days: 14, reward_coins: 30, reward_xp: 300 },
  { days: 30, reward_coins: 75, reward_xp: 750, badge_slug: 'month_master' },
  { days: 60, reward_coins: 150, reward_xp: 1500 },
  { days: 100, reward_coins: 300, reward_xp: 3000 },
  { days: 365, reward_coins: 1000, reward_xp: 10000 },
];
