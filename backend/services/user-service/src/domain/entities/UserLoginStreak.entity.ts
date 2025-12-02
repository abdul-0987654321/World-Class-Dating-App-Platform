/**
 * User Login Streak Entity
 * Tracks each user's login streak and reward claiming status
 */

export interface UserLoginStreak {
  id: string;
  userId: string;

  // Streak tracking
  currentStreak: number;
  longestStreak: number;
  lastLoginDate?: Date;

  // Reward claiming
  currentDayInCycle: number; // 1-7
  lastClaimDate?: Date;
  canClaimToday: boolean;

  // Statistics
  totalLogins: number;
  totalRewardsClaimed: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserLoginStreakDTO {
  userId: string;
  currentStreak?: number;
  longestStreak?: number;
  currentDayInCycle?: number;
}

export interface UpdateUserLoginStreakDTO {
  currentStreak?: number;
  longestStreak?: number;
  lastLoginDate?: Date;
  currentDayInCycle?: number;
  lastClaimDate?: Date;
  canClaimToday?: boolean;
  totalLogins?: number;
  totalRewardsClaimed?: number;
}

export interface StreakCheckResult {
  streakBroken: boolean;
  newStreakValue: number;
  daysSkipped: number;
}
