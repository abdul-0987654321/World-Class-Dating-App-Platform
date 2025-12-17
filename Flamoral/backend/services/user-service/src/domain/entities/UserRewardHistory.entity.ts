/**
 * User Reward History Entity
 * Historical record of all rewards claimed by users
 */

import { RewardType } from './DailyLoginReward.entity';

export interface UserRewardHistory {
  id: string;
  userId: string;

  rewardType: RewardType;
  rewardAmount: number;
  rewardDurationHours?: number;

  dayInCycle?: number;
  streakAtClaim?: number;

  claimedAt: Date;
  expiresAt?: Date; // For time-limited rewards like boosts
}

export interface CreateUserRewardHistoryDTO {
  userId: string;
  rewardType: RewardType;
  rewardAmount: number;
  rewardDurationHours?: number;
  dayInCycle?: number;
  streakAtClaim?: number;
  expiresAt?: Date;
}

export interface RewardHistoryFilters {
  userId?: string;
  rewardType?: RewardType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}
