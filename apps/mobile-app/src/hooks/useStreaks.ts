/**
 * useStreaks Hook
 * Hook for managing streak data and calendar view
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Animated } from 'react-native';
import { useAuth } from './useAuth';

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

export interface StreakCalendarDay {
  date: string;
  dayOfWeek: number;
  dayOfMonth: number;
  hasActivity: boolean;
  isToday: boolean;
  isFuture: boolean;
  streakCount: number;
}

export interface StreakMilestone {
  days: number;
  name: string;
  reward: { coins?: number; gems?: number; superLikes?: number; boosts?: number };
  isAchieved: boolean;
  icon: string;
}

export interface StreakStats {
  totalLoginDays: number;
  currentLoginStreak: number;
  longestLoginStreak: number;
  currentConversationStreak: number;
  longestConversationStreak: number;
  currentMatchStreak: number;
  longestMatchStreak: number;
  streakProtectionsUsed: number;
}

interface UseStreaksReturn {
  streaks: { login: Streak | null; conversation: Streak | null; match: Streak | null };
  calendar: StreakCalendarDay[];
  milestones: StreakMilestone[];
  stats: StreakStats;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  protecting: boolean;
  selectedMonth: Date;
  fireAnimation: Animated.Value;
  refresh: () => Promise<void>;
  protectStreak: (streakType: string, durationHours?: number) => Promise<boolean>;
  setSelectedMonth: (date: Date) => void;
  getStreakLevel: (currentStreak: number) => { level: string; color: string; icon: string };
  getNextMilestone: (currentStreak: number) => StreakMilestone | null;
  getDaysUntilMilestone: (currentStreak: number) => number;
  getCalendarForMonth: (year: number, month: number) => StreakCalendarDay[];
}

const MILESTONES: StreakMilestone[] = [
  { days: 3, name: 'Getting Started', reward: { coins: 10 }, isAchieved: false, icon: 'flame' },
  { days: 7, name: 'Week Warrior', reward: { coins: 25, gems: 1 }, isAchieved: false, icon: 'zap' },
  {
    days: 14,
    name: 'Two Week Titan',
    reward: { coins: 50, gems: 2 },
    isAchieved: false,
    icon: 'award',
  },
  {
    days: 30,
    name: 'Monthly Master',
    reward: { coins: 100, gems: 5, superLikes: 1 },
    isAchieved: false,
    icon: 'trophy',
  },
];

export const useStreaks = (): UseStreaksReturn => {
  const { token } = useAuth();
  const [streaks, setStreaks] = useState<{
    login: Streak | null;
    conversation: Streak | null;
    match: Streak | null;
  }>({ login: null, conversation: null, match: null });
  const [calendar, setCalendar] = useState<StreakCalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [protecting, setProtecting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const fireAnimation = useRef(new Animated.Value(0)).current;

  const getMockStreaks = () => ({
    login: {
      id: '1',
      userId: 'u1',
      streakType: 'login' as const,
      currentStreak: 12,
      longestStreak: 18,
      streakStartDate: '',
      lastActivityDate: '',
      isProtected: false,
    },
    conversation: {
      id: '2',
      userId: 'u1',
      streakType: 'conversation' as const,
      currentStreak: 5,
      longestStreak: 14,
      streakStartDate: '',
      lastActivityDate: '',
      isProtected: false,
    },
    match: {
      id: '3',
      userId: 'u1',
      streakType: 'match' as const,
      currentStreak: 3,
      longestStreak: 7,
      streakStartDate: '',
      lastActivityDate: '',
      isProtected: true,
      protectionExpiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    },
  });

  const loadStreaks = useCallback(async () => {
    try {
      setError(null);
      setStreaks(getMockStreaks());
    } catch (err) {
      console.error('Failed to load streaks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStreaks();
    Animated.loop(
      Animated.sequence([
        Animated.timing(fireAnimation, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(fireAnimation, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [loadStreaks, fireAnimation]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadStreaks();
  }, [loadStreaks]);

  const protectStreak = useCallback(
    async (streakType: string, durationHours: number = 24): Promise<boolean> => {
      setProtecting(true);
      await loadStreaks();
      setProtecting(false);
      return true;
    },
    [loadStreaks]
  );

  const getStreakLevel = useCallback((currentStreak: number) => {
    if (currentStreak >= 365) return { level: 'Legendary', color: '#9B59B6', icon: 'crown' };
    if (currentStreak >= 100) return { level: 'Master', color: '#E74C3C', icon: 'trophy' };
    if (currentStreak >= 30) return { level: 'Champion', color: '#F39C12', icon: 'award' };
    if (currentStreak >= 7) return { level: 'Active', color: '#3498DB', icon: 'zap' };
    return { level: 'Beginner', color: '#95A5A6', icon: 'flame' };
  }, []);

  const getNextMilestone = useCallback((currentStreak: number) => {
    return MILESTONES.find((m) => m.days > currentStreak) || null;
  }, []);

  const getDaysUntilMilestone = useCallback(
    (currentStreak: number) => {
      const next = getNextMilestone(currentStreak);
      return next ? next.days - currentStreak : 0;
    },
    [getNextMilestone]
  );

  const getCalendarForMonth = useCallback((year: number, month: number): StreakCalendarDay[] => {
    const days: StreakCalendarDay[] = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push({
        date: '',
        dayOfWeek: i,
        dayOfMonth: 0,
        hasActivity: false,
        isToday: false,
        isFuture: false,
        streakCount: 0,
      });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push({
        date: date.toISOString(),
        dayOfWeek: date.getDay(),
        dayOfMonth: day,
        hasActivity: day <= today.getDate() && month === today.getMonth(),
        isToday: date.toDateString() === today.toDateString(),
        isFuture: date > today,
        streakCount: 0,
      });
    }

    return days;
  }, []);

  const milestones = MILESTONES.map((m) => ({
    ...m,
    isAchieved: streaks.login ? streaks.login.currentStreak >= m.days : false,
  }));

  const stats: StreakStats = {
    totalLoginDays: streaks.login?.currentStreak || 0,
    currentLoginStreak: streaks.login?.currentStreak || 0,
    longestLoginStreak: streaks.login?.longestStreak || 0,
    currentConversationStreak: streaks.conversation?.currentStreak || 0,
    longestConversationStreak: streaks.conversation?.longestStreak || 0,
    currentMatchStreak: streaks.match?.currentStreak || 0,
    longestMatchStreak: streaks.match?.longestStreak || 0,
    streakProtectionsUsed: 0,
  };

  return {
    streaks,
    calendar,
    milestones,
    stats,
    loading,
    error,
    refreshing,
    protecting,
    selectedMonth,
    fireAnimation,
    refresh,
    protectStreak,
    setSelectedMonth,
    getStreakLevel,
    getNextMilestone,
    getDaysUntilMilestone,
    getCalendarForMonth,
  };
};

export default useStreaks;
