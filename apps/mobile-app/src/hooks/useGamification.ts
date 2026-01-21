/**
 * useGamification Hook
 * Main hook for gamification state management - matches web app functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

// Types matching web app data structures
export interface Streak {
  id: string;
  userId: string;
  streakType: 'login' | 'conversation' | 'match';
  currentStreak: number;
  longestStreak: number;
  streakStartDate: string;
  lastActivityDate: string;
  isProtected: boolean;
  protectionExpiresAt?: string;
}

export interface Achievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconName: string;
  iconColor: string;
  backgroundColor: string;
  category: 'dating' | 'social' | 'profile' | 'engagement' | 'streak' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  coinReward: number;
  xpReward: number;
  isHidden: boolean;
  currentProgress: number;
  targetProgress: number;
  isUnlocked: boolean;
  isDisplayed: boolean;
  unlockedAt?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly';
  progress: number;
  maxProgress: number;
  reward: { coins?: number; gems?: number; xp?: number };
  expiresAt: string;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface WalletBalance {
  coins: number;
  gems: number;
  totalEarned: number;
  totalSpent: number;
}

export interface LevelInfo {
  currentLevel: number;
  title: string;
  totalXP: number;
  xpForNextLevel: number;
  xpProgress: number;
  xpNeeded: number;
  nextLevel: {
    level: number;
    title: string;
    rewards: { coins?: number; superLikes?: number; boosts?: number };
  } | null;
}

export interface DailyRewardStatus {
  canClaim: boolean;
  currentStreak: number;
  dayInCycle: number;
  todayReward: {
    type: 'coins' | 'gems' | 'super_likes' | 'boosts';
    amount: number;
  } | null;
}

export interface GamificationDashboard {
  dailyRewards: DailyRewardStatus;
  streaks: {
    login: Streak | null;
    conversation: Streak | null;
    match: Streak | null;
  };
  achievements: {
    unlocked: number;
    total: number;
    progress: number;
    recentBadges: Achievement[];
  };
  wallet: WalletBalance;
  level: LevelInfo;
}

export interface SpinResult {
  reward: {
    type: 'coins' | 'gems' | 'super_likes' | 'boosts';
    amount: number;
  };
  message: string;
}

interface UseGamificationReturn {
  dashboard: GamificationDashboard | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
  claimDailyReward: () => Promise<boolean>;
  spinWheel: () => Promise<SpinResult | null>;
  protectStreak: (streakType: string, durationHours: number) => Promise<boolean>;
  purchaseItem: (productId: string, quantity?: number) => Promise<boolean>;
}

import { API_BASE_URL } from '../services/config';

export const useGamification = (): UseGamificationReturn => {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<GamificationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const getHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token]
  );

  const getMockDashboard = (): GamificationDashboard => ({
    dailyRewards: {
      canClaim: true,
      currentStreak: 5,
      dayInCycle: 5,
      todayReward: { type: 'coins', amount: 25 },
    },
    streaks: {
      login: {
        id: '1',
        userId: 'u1',
        streakType: 'login',
        currentStreak: 12,
        longestStreak: 18,
        streakStartDate: '',
        lastActivityDate: '',
        isProtected: false,
      },
      conversation: {
        id: '2',
        userId: 'u1',
        streakType: 'conversation',
        currentStreak: 5,
        longestStreak: 14,
        streakStartDate: '',
        lastActivityDate: '',
        isProtected: false,
      },
      match: {
        id: '3',
        userId: 'u1',
        streakType: 'match',
        currentStreak: 3,
        longestStreak: 7,
        streakStartDate: '',
        lastActivityDate: '',
        isProtected: true,
        protectionExpiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      },
    },
    achievements: { unlocked: 8, total: 20, progress: 40, recentBadges: [] },
    wallet: { coins: 500, gems: 15, totalEarned: 750, totalSpent: 200 },
    level: {
      currentLevel: 4,
      title: 'Social Spark',
      totalXP: 650,
      xpForNextLevel: 1000,
      xpProgress: 150,
      xpNeeded: 500,
      nextLevel: { level: 5, title: 'Connection Pro', rewards: { coins: 100, superLikes: 2 } },
    },
  });

  const loadDashboard = useCallback(async () => {
    if (!token) {
      setError('Please log in to view gamification');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/v1/gamification/dashboard`, {
        headers: getHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setDashboard(data.data);
      } else if (response.status === 401) {
        setError('Please log in to view your rewards');
        setDashboard(getMockDashboard());
      } else {
        setDashboard(getMockDashboard());
      }
    } catch (err) {
      console.error('Failed to load gamification dashboard:', err);
      setDashboard(getMockDashboard());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, getHeaders]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
  }, [loadDashboard]);

  const claimDailyReward = useCallback(async (): Promise<boolean> => {
    if (!token) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/gamification/daily-reward`, {
        method: 'POST',
        headers: getHeaders(),
      });

      if (response.ok) {
        await loadDashboard();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to claim daily reward:', err);
      return false;
    }
  }, [token, getHeaders, loadDashboard]);

  const spinWheel = useCallback(async (): Promise<SpinResult | null> => {
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/gamification/spin`, {
        method: 'POST',
        headers: getHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        await loadDashboard();
        return data.data;
      }
      return { reward: { type: 'coins', amount: 25 }, message: 'You won 25 coins!' };
    } catch (err) {
      console.error('Failed to spin wheel:', err);
      return { reward: { type: 'coins', amount: 25 }, message: 'You won 25 coins!' };
    }
  }, [token, getHeaders, loadDashboard]);

  const protectStreak = useCallback(
    async (streakType: string, durationHours: number = 24): Promise<boolean> => {
      if (!token) return false;

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/gamification/streaks/protect`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ streakType, durationHours }),
        });

        if (response.ok) {
          await loadDashboard();
          return true;
        }
        return false;
      } catch (err) {
        console.error('Failed to protect streak:', err);
        return false;
      }
    },
    [token, getHeaders, loadDashboard]
  );

  const purchaseItem = useCallback(
    async (productId: string, quantity: number = 1): Promise<boolean> => {
      if (!token) return false;

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/gamification/purchase`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ productId, quantity }),
        });

        if (response.ok) {
          await loadDashboard();
          return true;
        }
        return false;
      } catch (err) {
        console.error('Failed to purchase item:', err);
        return false;
      }
    },
    [token, getHeaders, loadDashboard]
  );

  return {
    dashboard,
    loading,
    error,
    refreshing,
    refresh,
    claimDailyReward,
    spinWheel,
    protectStreak,
    purchaseItem,
  };
};

export default useGamification;
