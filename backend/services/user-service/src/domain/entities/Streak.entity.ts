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

export type StreakType = 'login' | 'conversation' | 'match' | 'activity';
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
  id: string;
  days: number;
  daysRequired: number;
  title: string;
  reward_coins: number;
  reward_xp: number;
  coinReward: number;
  boostReward: number;
  superLikeReward: number;
  badge_slug?: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { id: 'streak_3', days: 3, daysRequired: 3, title: '3-Day Streak', reward_coins: 5, reward_xp: 50, coinReward: 5, boostReward: 0, superLikeReward: 0 },
  { id: 'streak_7', days: 7, daysRequired: 7, title: 'Week Warrior', reward_coins: 15, reward_xp: 150, coinReward: 15, boostReward: 0, superLikeReward: 0, badge_slug: 'week_warrior' },
  { id: 'streak_14', days: 14, daysRequired: 14, title: '2-Week Streak', reward_coins: 30, reward_xp: 300, coinReward: 30, boostReward: 1, superLikeReward: 0 },
  { id: 'streak_30', days: 30, daysRequired: 30, title: 'Month Master', reward_coins: 75, reward_xp: 750, coinReward: 75, boostReward: 1, superLikeReward: 1, badge_slug: 'month_master' },
  { id: 'streak_60', days: 60, daysRequired: 60, title: '60-Day Streak', reward_coins: 150, reward_xp: 1500, coinReward: 150, boostReward: 2, superLikeReward: 2 },
  { id: 'streak_100', days: 100, daysRequired: 100, title: '100-Day Champion', reward_coins: 300, reward_xp: 3000, coinReward: 300, boostReward: 3, superLikeReward: 3 },
  { id: 'streak_365', days: 365, daysRequired: 365, title: 'Year Legend', reward_coins: 1000, reward_xp: 10000, coinReward: 1000, boostReward: 10, superLikeReward: 10 },
];

// Type aliases for backwards compatibility
export type UserStreak = UserStreakEntity;
export type UserStreakMilestone = {
  id: string;
  user_id: string;
  streak_type: StreakType;
  milestone_level: number;
  days_required: number;
  reached_at: Date;
  title: string;
  coin_reward?: number;
  boost_reward?: number;
  super_like_reward?: number;
};
export type StreakUpdateResult = {
  streak: UserStreakEntity;
  milestone_reached?: UserStreakMilestone;
  rewards?: {
    coins?: number;
    xp?: number;
    badge?: string;
  };
};
