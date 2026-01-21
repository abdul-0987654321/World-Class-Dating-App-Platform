/**
 * useAchievements Hook
 * Hook for managing achievements state and unlock animations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Animated } from 'react-native';
import { useAuth } from './useAuth';

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

export interface AchievementCategory {
  id: string;
  label: string;
  icon: string;
  count: number;
  unlockedCount: number;
}

export interface AchievementStats {
  totalAchievements: number;
  unlockedAchievements: number;
  progressPercentage: number;
  totalCoinsEarned: number;
  totalXpEarned: number;
  rareUnlocked: number;
  epicUnlocked: number;
  legendaryUnlocked: number;
}

interface UseAchievementsReturn {
  achievements: Achievement[];
  categories: AchievementCategory[];
  stats: AchievementStats;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  selectedCategory: string;
  newlyUnlocked: Achievement | null;
  unlockAnimation: Animated.Value;
  setSelectedCategory: (category: string) => void;
  refresh: () => Promise<void>;
  toggleBadgeDisplay: (achievementId: string, display: boolean) => Promise<boolean>;
  dismissUnlockAnimation: () => void;
  getFilteredAchievements: () => Achievement[];
  getProgressPercentage: (achievement: Achievement) => number;
  getRarityColor: (rarity: string) => string;
}

const API_BASE_URL = 'https://api.flamoral.com';

const RARITY_COLORS = {
  common: '#95A5A6',
  uncommon: '#27AE60',
  rare: '#3498DB',
  epic: '#9B59B6',
  legendary: '#F39C12',
};

export const useAchievements = (): UseAchievementsReturn => {
  const { token } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement | null>(null);
  const unlockAnimation = useRef(new Animated.Value(0)).current;

  const getHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token]
  );

  const getMockAchievements = (): Achievement[] => [
    {
      id: '1',
      slug: 'first_match',
      name: 'First Spark',
      description: 'Get your first match',
      iconName: 'heart',
      iconColor: '#E91E63',
      backgroundColor: '#FCE4EC',
      category: 'dating',
      rarity: 'common',
      coinReward: 50,
      xpReward: 100,
      isHidden: false,
      currentProgress: 1,
      targetProgress: 1,
      isUnlocked: true,
      isDisplayed: true,
      unlockedAt: '2025-12-15',
    },
    {
      id: '2',
      slug: 'matchmaker_bronze',
      name: 'Matchmaker Bronze',
      description: 'Get 10 matches',
      iconName: 'heart',
      iconColor: '#CD7F32',
      backgroundColor: '#FFF3E0',
      category: 'dating',
      rarity: 'uncommon',
      coinReward: 100,
      xpReward: 250,
      isHidden: false,
      currentProgress: 7,
      targetProgress: 10,
      isUnlocked: false,
      isDisplayed: false,
    },
    {
      id: '3',
      slug: 'conversation_starter',
      name: 'Conversation Starter',
      description: 'Send 10 messages',
      iconName: 'message-circle',
      iconColor: '#2196F3',
      backgroundColor: '#E3F2FD',
      category: 'social',
      rarity: 'common',
      coinReward: 25,
      xpReward: 50,
      isHidden: false,
      currentProgress: 10,
      targetProgress: 10,
      isUnlocked: true,
      isDisplayed: false,
      unlockedAt: '2025-12-20',
    },
    {
      id: '4',
      slug: 'week_warrior',
      name: 'Week Warrior',
      description: '7-day login streak',
      iconName: 'zap',
      iconColor: '#FF5722',
      backgroundColor: '#FBE9E7',
      category: 'streak',
      rarity: 'uncommon',
      coinReward: 75,
      xpReward: 150,
      isHidden: false,
      currentProgress: 7,
      targetProgress: 7,
      isUnlocked: true,
      isDisplayed: true,
      unlockedAt: '2025-12-22',
    },
    {
      id: '5',
      slug: 'profile_pro',
      name: 'Profile Pro',
      description: 'Complete your profile 100%',
      iconName: 'user',
      iconColor: '#4CAF50',
      backgroundColor: '#E8F5E9',
      category: 'profile',
      rarity: 'uncommon',
      coinReward: 150,
      xpReward: 300,
      isHidden: false,
      currentProgress: 85,
      targetProgress: 100,
      isUnlocked: false,
      isDisplayed: false,
    },
    {
      id: '6',
      slug: 'early_bird',
      name: 'Early Bird',
      description: 'Log in before 7 AM for 5 days',
      iconName: 'sunrise',
      iconColor: '#FF9800',
      backgroundColor: '#FFF3E0',
      category: 'special',
      rarity: 'rare',
      coinReward: 100,
      xpReward: 200,
      isHidden: true,
      currentProgress: 2,
      targetProgress: 5,
      isUnlocked: false,
      isDisplayed: false,
    },
  ];

  const loadAchievements = useCallback(async () => {
    try {
      setError(null);
      if (!token) {
        setAchievements(getMockAchievements());
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/gamification/achievements`, {
        headers: getHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setAchievements(data.data.badges || getMockAchievements());
      } else {
        setAchievements(getMockAchievements());
      }
    } catch (err) {
      console.error('Failed to load achievements:', err);
      setAchievements(getMockAchievements());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, getHeaders]);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadAchievements();
  }, [loadAchievements]);

  const toggleBadgeDisplay = useCallback(
    async (achievementId: string, display: boolean): Promise<boolean> => {
      if (!token) return false;

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/gamification/achievements/${achievementId}/display`,
          {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ display }),
          }
        );

        if (response.ok) {
          setAchievements((prev) =>
            prev.map((a) => (a.id === achievementId ? { ...a, isDisplayed: display } : a))
          );
          return true;
        }
        return false;
      } catch (err) {
        console.error('Failed to toggle badge display:', err);
        return false;
      }
    },
    [token, getHeaders]
  );

  const dismissUnlockAnimation = useCallback(() => {
    Animated.timing(unlockAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setNewlyUnlocked(null);
    });
  }, [unlockAnimation]);

  const categories: AchievementCategory[] = [
    {
      id: 'all',
      label: 'All',
      icon: 'grid',
      count: achievements.length,
      unlockedCount: achievements.filter((a) => a.isUnlocked).length,
    },
    {
      id: 'dating',
      label: 'Dating',
      icon: 'heart',
      count: achievements.filter((a) => a.category === 'dating').length,
      unlockedCount: achievements.filter((a) => a.category === 'dating' && a.isUnlocked).length,
    },
    {
      id: 'social',
      label: 'Social',
      icon: 'users',
      count: achievements.filter((a) => a.category === 'social').length,
      unlockedCount: achievements.filter((a) => a.category === 'social' && a.isUnlocked).length,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: 'user',
      count: achievements.filter((a) => a.category === 'profile').length,
      unlockedCount: achievements.filter((a) => a.category === 'profile' && a.isUnlocked).length,
    },
    {
      id: 'streak',
      label: 'Streak',
      icon: 'zap',
      count: achievements.filter((a) => a.category === 'streak').length,
      unlockedCount: achievements.filter((a) => a.category === 'streak' && a.isUnlocked).length,
    },
  ];

  const stats: AchievementStats = {
    totalAchievements: achievements.length,
    unlockedAchievements: achievements.filter((a) => a.isUnlocked).length,
    progressPercentage:
      achievements.length > 0
        ? Math.round((achievements.filter((a) => a.isUnlocked).length / achievements.length) * 100)
        : 0,
    totalCoinsEarned: achievements
      .filter((a) => a.isUnlocked)
      .reduce((sum, a) => sum + a.coinReward, 0),
    totalXpEarned: achievements.filter((a) => a.isUnlocked).reduce((sum, a) => sum + a.xpReward, 0),
    rareUnlocked: achievements.filter((a) => a.isUnlocked && a.rarity === 'rare').length,
    epicUnlocked: achievements.filter((a) => a.isUnlocked && a.rarity === 'epic').length,
    legendaryUnlocked: achievements.filter((a) => a.isUnlocked && a.rarity === 'legendary').length,
  };

  const getFilteredAchievements = useCallback(() => {
    if (selectedCategory === 'all') return achievements;
    return achievements.filter((a) => a.category === selectedCategory);
  }, [achievements, selectedCategory]);

  const getProgressPercentage = useCallback((achievement: Achievement) => {
    return Math.min((achievement.currentProgress / achievement.targetProgress) * 100, 100);
  }, []);

  const getRarityColor = useCallback((rarity: string) => {
    return RARITY_COLORS[rarity as keyof typeof RARITY_COLORS] || RARITY_COLORS.common;
  }, []);

  return {
    achievements,
    categories,
    stats,
    loading,
    error,
    refreshing,
    selectedCategory,
    newlyUnlocked,
    unlockAnimation,
    setSelectedCategory,
    refresh,
    toggleBadgeDisplay,
    dismissUnlockAnimation,
    getFilteredAchievements,
    getProgressPercentage,
    getRarityColor,
  };
};

export default useAchievements;
