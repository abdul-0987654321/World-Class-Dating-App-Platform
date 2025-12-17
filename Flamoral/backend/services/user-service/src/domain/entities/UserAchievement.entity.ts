/**
 * User Achievement Entity
 * Tracks which achievements users have unlocked
 */

import { Achievement } from './Achievement.entity';

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;

  // Progress tracking
  currentProgress: number;
  requiredProgress: number;
  isUnlocked: boolean;

  // Metadata
  unlockedAt?: Date;
  shownOnProfile: boolean;
  notificationSent: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface UserAchievementWithDetails extends UserAchievement {
  achievement: Achievement;
}

export interface CreateUserAchievementDTO {
  userId: string;
  achievementId: string;
  currentProgress?: number;
  requiredProgress: number;
}

export interface UpdateUserAchievementDTO {
  currentProgress?: number;
  isUnlocked?: boolean;
  unlockedAt?: Date;
  shownOnProfile?: boolean;
  notificationSent?: boolean;
}

export interface AchievementProgressUpdate {
  userId: string;
  requirementType: string;
  incrementValue?: number;
  absoluteValue?: number;
}

export interface UserAchievementStats {
  totalAchievements: number;
  unlockedAchievements: number;
  completionPercentage: number;
  totalRewardsEarned: {
    coins: number;
    superLikes: number;
    boosts: number;
  };
}
