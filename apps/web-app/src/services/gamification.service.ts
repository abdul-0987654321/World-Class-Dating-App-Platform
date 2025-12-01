/**
 * Gamification Service
 * Handles all gamification-related API calls including streaks, achievements, quests, and rewards
 */

import { apiClient } from './api.client';

// Types
export interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastCheckIn: string;
  nextRewardAt: number;
  streakMultiplier: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: string;
  reward: {
    coins?: number;
    gems?: number;
    badge?: string;
  };
  category: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  progress: number;
  maxProgress: number;
  reward: {
    coins?: number;
    gems?: number;
    xp?: number;
  };
  expiresAt: string;
  completed: boolean;
  claimed: boolean;
}

export interface WalletBalance {
  coins: number;
  gems: number;
  xp: number;
  level: number;
}

export interface SpinWheelResult {
  reward: {
    type: 'coins' | 'gems' | 'boost' | 'super_like' | 'nothing';
    amount: number;
  };
  message: string;
  nextSpinAvailable: string;
}

export interface DailyReward {
  day: number;
  reward: {
    coins?: number;
    gems?: number;
    boost?: number;
    superLike?: number;
  };
  claimed: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  photoUrl: string;
  score: number;
  level: number;
}

// Service
class GamificationService {
  private baseUrl = '/api/gamification';

  async getStreak(): Promise<Streak> {
    const response = await apiClient.get<{ data: Streak }>(`${this.baseUrl}/streak`);
    return response.data;
  }

  async checkIn(): Promise<{ streak: Streak; reward?: { coins: number } }> {
    const response = await apiClient.post<{ data: { streak: Streak; reward?: { coins: number } } }>(`${this.baseUrl}/check-in`);
    return response.data;
  }

  async getAchievements(): Promise<Achievement[]> {
    const response = await apiClient.get<{ data: { achievements: Achievement[] } }>(`${this.baseUrl}/achievements`);
    return response.data.achievements;
  }

  async claimAchievement(achievementId: string): Promise<{ success: boolean; reward: { coins?: number; gems?: number } }> {
    const response = await apiClient.post<{ data: { success: boolean; reward: { coins?: number; gems?: number } } }>(
      `${this.baseUrl}/achievements/${achievementId}/claim`
    );
    return response.data;
  }

  async getQuests(): Promise<{ daily: Quest[]; weekly: Quest[]; special: Quest[] }> {
    const response = await apiClient.get<{ data: { quests: Quest[] } }>(`${this.baseUrl}/quests`);
    const quests = response.data.quests;
    return {
      daily: quests.filter(q => q.type === 'daily'),
      weekly: quests.filter(q => q.type === 'weekly'),
      special: quests.filter(q => q.type === 'special'),
    };
  }

  async claimQuestReward(questId: string): Promise<{ success: boolean; reward: { coins?: number; gems?: number; xp?: number } }> {
    const response = await apiClient.post<{ data: { success: boolean; reward: { coins?: number; gems?: number; xp?: number } } }>(
      `${this.baseUrl}/quests/${questId}/claim`
    );
    return response.data;
  }

  async getWalletBalance(): Promise<WalletBalance> {
    const response = await apiClient.get<{ data: WalletBalance }>(`${this.baseUrl}/balance`);
    return response.data;
  }

  async spinWheel(): Promise<SpinWheelResult> {
    const response = await apiClient.post<{ data: SpinWheelResult }>(`${this.baseUrl}/spin`);
    return response.data;
  }

  async canSpin(): Promise<{ canSpin: boolean; nextSpinAvailable?: string }> {
    const response = await apiClient.get<{ data: { canSpin: boolean; nextSpinAvailable?: string } }>(`${this.baseUrl}/spin/status`);
    return response.data;
  }

  async getDailyRewards(): Promise<DailyReward[]> {
    const response = await apiClient.get<{ data: { rewards: DailyReward[] } }>(`${this.baseUrl}/daily-rewards`);
    return response.data.rewards;
  }

  async claimDailyReward(): Promise<{ success: boolean; reward: { coins?: number; gems?: number } }> {
    const response = await apiClient.post<{ data: { success: boolean; reward: { coins?: number; gems?: number } } }>(
      `${this.baseUrl}/daily-reward`
    );
    return response.data;
  }

  async getLeaderboard(type: 'weekly' | 'monthly' | 'all_time' = 'weekly'): Promise<LeaderboardEntry[]> {
    const response = await apiClient.get<{ data: { leaderboard: LeaderboardEntry[] } }>(`${this.baseUrl}/leaderboard?type=${type}`);
    return response.data.leaderboard;
  }

  async purchaseWithCoins(itemType: string, quantity: number = 1): Promise<{ success: boolean; newBalance: WalletBalance }> {
    const response = await apiClient.post<{ data: { success: boolean; newBalance: WalletBalance } }>(
      `${this.baseUrl}/purchase`,
      { itemType, quantity }
    );
    return response.data;
  }

  async purchaseWithGems(itemType: string, quantity: number = 1): Promise<{ success: boolean; newBalance: WalletBalance }> {
    const response = await apiClient.post<{ data: { success: boolean; newBalance: WalletBalance } }>(
      `${this.baseUrl}/purchase-gems`,
      { itemType, quantity }
    );
    return response.data;
  }
}

export const gamificationService = new GamificationService();
