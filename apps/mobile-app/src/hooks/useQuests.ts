/**
 * useQuests Hook
 * Hook for managing daily and weekly quests with progress tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly';
  progress: number;
  maxProgress: number;
  reward: {
    coins?: number;
    gems?: number;
    xp?: number;
    superLikes?: number;
    boosts?: number;
  };
  expiresAt: string;
  isCompleted: boolean;
  isClaimed: boolean;
  category: 'swipe' | 'chat' | 'profile' | 'match' | 'social' | 'activity';
  iconName: string;
}

export interface QuestStats {
  dailyCompleted: number;
  dailyTotal: number;
  weeklyCompleted: number;
  weeklyTotal: number;
  totalRewardsEarned: {
    coins: number;
    gems: number;
    xp: number;
  };
}

interface UseQuestsReturn {
  dailyQuests: Quest[];
  weeklyQuests: Quest[];
  stats: QuestStats;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  claiming: boolean;
  refresh: () => Promise<void>;
  claimQuest: (questId: string) => Promise<boolean>;
  getTimeRemaining: (expiresAt: string) => string;
  getProgressPercentage: (quest: Quest) => number;
  getQuestIcon: (category: string) => string;
}

const API_BASE_URL = 'https://api.flamoral.com';

export const useQuests = (): UseQuestsReturn => {
  const { token } = useAuth();
  const [dailyQuests, setDailyQuests] = useState<Quest[]>([]);
  const [weeklyQuests, setWeeklyQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const getHeaders = useCallback(() => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const getMockQuests = (): Quest[] => [
    { id: 'd1', title: 'Daily Swiper', description: 'Swipe on 20 profiles today', type: 'daily', progress: 12, maxProgress: 20, reward: { coins: 25 }, expiresAt: new Date(Date.now() + 8 * 3600000).toISOString(), isCompleted: false, isClaimed: false, category: 'swipe', iconName: 'refresh-cw' },
    { id: 'd2', title: 'Chat Champion', description: 'Send 5 messages today', type: 'daily', progress: 3, maxProgress: 5, reward: { coins: 15 }, expiresAt: new Date(Date.now() + 8 * 3600000).toISOString(), isCompleted: false, isClaimed: false, category: 'chat', iconName: 'message-circle' },
    { id: 'd3', title: 'Profile Viewer', description: 'View 10 full profiles', type: 'daily', progress: 10, maxProgress: 10, reward: { coins: 20 }, expiresAt: new Date(Date.now() + 8 * 3600000).toISOString(), isCompleted: true, isClaimed: false, category: 'profile', iconName: 'eye' },
    { id: 'w1', title: 'Weekly Matcher', description: 'Get 5 new matches this week', type: 'weekly', progress: 2, maxProgress: 5, reward: { gems: 5, xp: 200 }, expiresAt: new Date(Date.now() + 5 * 24 * 3600000).toISOString(), isCompleted: false, isClaimed: false, category: 'match', iconName: 'heart' },
    { id: 'w2', title: 'Photo Updater', description: 'Update your photos this week', type: 'weekly', progress: 0, maxProgress: 1, reward: { coins: 50 }, expiresAt: new Date(Date.now() + 5 * 24 * 3600000).toISOString(), isCompleted: false, isClaimed: false, category: 'profile', iconName: 'camera' },
  ];

  const loadQuests = useCallback(async () => {
    try {
      setError(null);
      const mockQuests = getMockQuests();
      setDailyQuests(mockQuests.filter(q => q.type === 'daily'));
      setWeeklyQuests(mockQuests.filter(q => q.type === 'weekly'));
    } catch (err) {
      console.error('Failed to load quests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadQuests();
  }, [loadQuests]);

  const claimQuest = useCallback(async (questId: string): Promise<boolean> => {
    const updateQuest = (quests: Quest[]) =>
      quests.map(q => q.id === questId ? { ...q, isClaimed: true } : q);
    setDailyQuests(prev => updateQuest(prev));
    setWeeklyQuests(prev => updateQuest(prev));
    return true;
  }, []);

  const getTimeRemaining = useCallback((expiresAt: string): string => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  }, []);

  const getProgressPercentage = useCallback((quest: Quest): number => {
    return Math.min((quest.progress / quest.maxProgress) * 100, 100);
  }, []);

  const getQuestIcon = useCallback((category: string): string => {
    const iconMap: Record<string, string> = {
      swipe: 'refresh-cw',
      chat: 'message-circle',
      profile: 'user',
      match: 'heart',
      social: 'users',
      activity: 'activity',
    };
    return iconMap[category] || 'target';
  }, []);

  const allQuests = [...dailyQuests, ...weeklyQuests];
  const stats: QuestStats = {
    dailyCompleted: dailyQuests.filter(q => q.isCompleted).length,
    dailyTotal: dailyQuests.length,
    weeklyCompleted: weeklyQuests.filter(q => q.isCompleted).length,
    weeklyTotal: weeklyQuests.length,
    totalRewardsEarned: {
      coins: allQuests.filter(q => q.isClaimed).reduce((sum, q) => sum + (q.reward.coins || 0), 0),
      gems: allQuests.filter(q => q.isClaimed).reduce((sum, q) => sum + (q.reward.gems || 0), 0),
      xp: allQuests.filter(q => q.isClaimed).reduce((sum, q) => sum + (q.reward.xp || 0), 0),
    },
  };

  return {
    dailyQuests,
    weeklyQuests,
    stats,
    loading,
    error,
    refreshing,
    claiming,
    refresh,
    claimQuest,
    getTimeRemaining,
    getProgressPercentage,
    getQuestIcon,
  };
};

export default useQuests;
