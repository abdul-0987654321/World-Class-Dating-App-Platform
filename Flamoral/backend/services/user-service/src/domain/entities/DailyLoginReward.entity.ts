/**
 * Daily Login Reward Entity
 * Represents a reward configuration for a specific day in the 7-day cycle
 */

export type RewardType = 'coins' | 'super_likes' | 'boosts' | 'premium_trial';

export interface DailyLoginReward {
  id: number;
  dayNumber: number; // 1-7
  rewardType: RewardType;
  rewardAmount: number;
  rewardDurationHours?: number; // For boosts and premium trials
  displayTitle: string;
  displayDescription?: string;
  iconName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDailyLoginRewardDTO {
  dayNumber: number;
  rewardType: RewardType;
  rewardAmount: number;
  rewardDurationHours?: number;
  displayTitle: string;
  displayDescription?: string;
  iconName?: string;
  isActive?: boolean;
}

export interface UpdateDailyLoginRewardDTO {
  rewardType?: RewardType;
  rewardAmount?: number;
  rewardDurationHours?: number;
  displayTitle?: string;
  displayDescription?: string;
  iconName?: string;
  isActive?: boolean;
}
