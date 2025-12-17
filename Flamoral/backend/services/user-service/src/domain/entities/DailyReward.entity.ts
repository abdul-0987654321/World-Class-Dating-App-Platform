export interface DailyReward {
  id: string;
  userId: string;
  streakCount: number;
  totalLogins: number;
  longestStreak: number;
  lastClaimDate: Date | null;
  currentStreakStart: Date | null;
  dayInCycle: number; // 1-7
  canClaimToday: boolean;
  rewardsHistory: RewardHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RewardHistoryEntry {
  date: string;
  dayNumber: number;
  rewardType: RewardType;
  amount: number;
  streakCount: number;
}

export interface DailyRewardClaim {
  id: string;
  userId: string;
  dayNumber: number;
  streakAtClaim: number;
  rewardType: RewardType;
  rewardAmount: number;
  rewardDetails: Record<string, any> | null;
  claimedAt: Date;
}

export interface RewardCalendarConfig {
  id: string;
  dayNumber: number;
  rewardType: RewardType;
  baseAmount: number;
  streakMultiplier: number;
  bonusConditions: Record<string, any> | null;
  isSpecialDay: boolean;
  description: string | null;
  iconName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type RewardType = 'coins' | 'super_likes' | 'boosts' | 'premium_trial';

export interface DailyRewardStatus {
  canClaim: boolean;
  currentStreak: number;
  longestStreak: number;
  dayInCycle: number;
  todayReward: RewardCalendarConfig | null;
  nextRewards: RewardCalendarConfig[];
  hoursUntilNextClaim: number;
  totalLoginDays: number;
}

export interface ClaimRewardResult {
  success: boolean;
  reward: {
    type: RewardType;
    amount: number;
    dayNumber: number;
    streakBonus: number;
  };
  newStreak: number;
  nextReward: RewardCalendarConfig | null;
  message: string;
}

// Input types
export interface CreateDailyRewardInput {
  userId: string;
}

export interface UpdateDailyRewardInput {
  streakCount?: number;
  totalLogins?: number;
  longestStreak?: number;
  lastClaimDate?: Date;
  currentStreakStart?: Date;
  dayInCycle?: number;
  canClaimToday?: boolean;
  rewardsHistory?: RewardHistoryEntry[];
}

// Streak calculation helpers
export function calculateStreakStatus(lastClaimDate: Date | null): {
  isStreakActive: boolean;
  isMissedDay: boolean;
  canClaimToday: boolean;
} {
  if (!lastClaimDate) {
    return {
      isStreakActive: false,
      isMissedDay: false,
      canClaimToday: true,
    };
  }

  const now = new Date();
  const lastClaim = new Date(lastClaimDate);

  // Reset time to start of day for comparison
  now.setHours(0, 0, 0, 0);
  lastClaim.setHours(0, 0, 0, 0);

  const daysDifference = Math.floor((now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60 * 24));

  return {
    isStreakActive: daysDifference === 1,
    isMissedDay: daysDifference > 1,
    canClaimToday: daysDifference >= 1,
  };
}

export function calculateNextDayInCycle(currentDay: number, streakBroken: boolean): number {
  if (streakBroken) {
    return 1;
  }
  return currentDay >= 7 ? 1 : currentDay + 1;
}

export function calculateHoursUntilNextClaim(lastClaimDate: Date | null): number {
  if (!lastClaimDate) {
    return 0;
  }

  const now = new Date();
  const nextClaimDate = new Date(lastClaimDate);
  nextClaimDate.setDate(nextClaimDate.getDate() + 1);
  nextClaimDate.setHours(0, 0, 0, 0);

  const hoursUntil = Math.max(0, Math.ceil((nextClaimDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
  return hoursUntil;
}

export function calculateRewardAmount(
  baseAmount: number,
  streakCount: number,
  streakMultiplier: number,
  isSpecialDay: boolean
): number {
  let amount = baseAmount;

  // Apply streak multiplier
  if (streakCount > 7) {
    const streakBonus = Math.floor(streakCount / 7) * streakMultiplier;
    amount += streakBonus;
  }

  // Special day bonus
  if (isSpecialDay) {
    amount = Math.floor(amount * 1.5);
  }

  return amount;
}
