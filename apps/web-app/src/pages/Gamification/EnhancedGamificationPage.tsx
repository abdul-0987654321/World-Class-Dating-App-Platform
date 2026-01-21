import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DailyRewardsModal } from '../../components/gamification/DailyRewardsModal';
import {
  AchievementBadgeCard,
  AchievementBadge,
} from '../../components/gamification/AchievementBadgeCard';
import { StreakDisplay, StreakData } from '../../components/gamification/StreakDisplay';
import { CoinWallet, CoinBalance, CoinTransaction } from '../../components/gamification/CoinWallet';
import { authTokenService } from '../../services/auth-token.service';
import Navigation from '../../components/Navigation';

interface GamificationDashboard {
  dailyRewards: {
    canClaim: boolean;
    currentStreak: number;
    dayInCycle: number;
    todayReward: any;
  };
  streaks: {
    login: StreakData | null;
    conversation: StreakData | null;
    match: StreakData | null;
  };
  achievements: {
    unlocked: number;
    total: number;
    progress: number;
    recentBadges: AchievementBadge[];
  };
  wallet: {
    coins: number;
    totalEarned: number;
  };
  level: {
    currentLevel: number;
    title: string;
    totalXP: number;
    xpForNextLevel: number;
    xpProgress: number;
    xpNeeded: number;
    nextLevel: any;
  };
}

type TabType = 'overview' | 'achievements' | 'streaks' | 'wallet';

interface LoadingState {
  dashboard: boolean;
  achievements: boolean;
  wallet: boolean;
}

interface ErrorState {
  dashboard: string | null;
  achievements: string | null;
  wallet: string | null;
}

export const EnhancedGamificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loadingState, setLoadingState] = useState<LoadingState>({
    dashboard: true,
    achievements: true,
    wallet: true,
  });
  const [errorState, setErrorState] = useState<ErrorState>({
    dashboard: null,
    achievements: null,
    wallet: null,
  });
  const [showDailyRewardsModal, setShowDailyRewardsModal] = useState(false);
  const [dashboard, setDashboard] = useState<GamificationDashboard | null>(null);
  const [achievements, setAchievements] = useState<AchievementBadge[]>([]);
  const [coinBalance, setCoinBalance] = useState<CoinBalance | null>(null);
  const [coinTransactions, setCoinTransactions] = useState<CoinTransaction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const loading = loadingState.dashboard || loadingState.achievements || loadingState.wallet;

  useEffect(() => {
    loadDashboard();
  }, []);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const loadDashboard = useCallback(async () => {
    const token = authTokenService.getToken();
    const headers = { Authorization: `Bearer ${token}` };

    // Fetch dashboard data
    setLoadingState((prev) => ({ ...prev, dashboard: true }));
    setErrorState((prev) => ({ ...prev, dashboard: null }));

    try {
      const dashboardRes = await fetch('/api/v1/gamification/dashboard', { headers });
      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setDashboard(data.data);

        // Auto-show daily rewards if claimable
        if (data.data?.dailyRewards?.canClaim) {
          setTimeout(() => setShowDailyRewardsModal(true), 500);
        }
      } else if (dashboardRes.status === 401) {
        setErrorState((prev) => ({ ...prev, dashboard: 'Please log in to view your rewards' }));
      } else {
        // Use mock data for demo
        setDashboard(getMockDashboard());
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setDashboard(getMockDashboard());
    } finally {
      setLoadingState((prev) => ({ ...prev, dashboard: false }));
    }

    // Fetch achievements
    setLoadingState((prev) => ({ ...prev, achievements: true }));
    setErrorState((prev) => ({ ...prev, achievements: null }));

    try {
      const achievementsRes = await fetch('/api/v1/gamification/achievements', { headers });
      if (achievementsRes.ok) {
        const data = await achievementsRes.json();
        setAchievements(data.data.badges || []);
      } else {
        setAchievements(getMockAchievements());
      }
    } catch (err) {
      console.error('Failed to load achievements:', err);
      setAchievements(getMockAchievements());
    } finally {
      setLoadingState((prev) => ({ ...prev, achievements: false }));
    }

    // Fetch wallet
    setLoadingState((prev) => ({ ...prev, wallet: true }));
    setErrorState((prev) => ({ ...prev, wallet: null }));

    try {
      const walletRes = await fetch('/api/v1/gamification/wallet', { headers });
      if (walletRes.ok) {
        const data = await walletRes.json();
        setCoinBalance({
          balance: data.data.balance,
          totalEarned: data.data.totalEarned,
          totalSpent: data.data.totalSpent,
          totalPurchased: data.data.totalPurchased,
        });
        setCoinTransactions(data.data.recentTransactions || []);
      } else {
        setCoinBalance({ balance: 500, totalEarned: 750, totalSpent: 200, totalPurchased: 0 });
      }
    } catch (err) {
      console.error('Failed to load wallet:', err);
      setCoinBalance({ balance: 500, totalEarned: 750, totalSpent: 200, totalPurchased: 0 });
    } finally {
      setLoadingState((prev) => ({ ...prev, wallet: false }));
    }
  }, []);

  const getMockDashboard = (): GamificationDashboard => ({
    dailyRewards: { canClaim: true, currentStreak: 5, dayInCycle: 5, todayReward: null },
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
    wallet: { coins: 500, totalEarned: 750 },
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

  const getMockAchievements = (): AchievementBadge[] => [
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
      iconName: 'message',
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
      iconName: 'fire',
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
    {
      id: '7',
      slug: 'social_butterfly',
      name: 'Social Butterfly',
      description: 'Send 100 messages',
      iconName: 'message',
      iconColor: '#9C27B0',
      backgroundColor: '#F3E5F5',
      category: 'social',
      rarity: 'uncommon',
      coinReward: 100,
      xpReward: 200,
      isHidden: false,
      currentProgress: 45,
      targetProgress: 100,
      isUnlocked: false,
      isDisplayed: false,
    },
    {
      id: '8',
      slug: 'swipe_machine',
      name: 'Swipe Machine',
      description: 'Swipe on 100 profiles',
      iconName: 'repeat',
      iconColor: '#FF5722',
      backgroundColor: '#FBE9E7',
      category: 'engagement',
      rarity: 'common',
      coinReward: 50,
      xpReward: 100,
      isHidden: false,
      currentProgress: 100,
      targetProgress: 100,
      isUnlocked: true,
      isDisplayed: false,
      unlockedAt: '2025-12-25',
    },
  ];

  const handleProtectStreak = useCallback(
    async (streakType: string) => {
      try {
        const token = authTokenService.getToken();
        const res = await fetch('/api/v1/gamification/streaks/protect', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ streakType, durationHours: 24 }),
        });

        if (res.ok) {
          showNotification('success', `Your ${streakType} streak is now protected for 24 hours!`);
          loadDashboard();
        } else {
          const data = await res.json();
          throw new Error(data.message || 'Failed to protect streak');
        }
      } catch (err: any) {
        showNotification('error', err.message || 'Failed to protect streak');
        throw err;
      }
    },
    [loadDashboard, showNotification]
  );

  const handlePurchase = useCallback(
    async (productId: string) => {
      setPurchaseLoading(true);
      try {
        const token = authTokenService.getToken();
        const res = await fetch('/api/v1/gamification/purchase', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId, quantity: 1 }),
        });

        if (res.ok) {
          const data = await res.json();
          showNotification('success', `Successfully purchased ${productId.replace('_', ' ')}!`);
          // Update balance
          if (data.data?.newBalance) {
            setCoinBalance((prev) => (prev ? { ...prev, ...data.data.newBalance } : null));
          }
          loadDashboard();
        } else {
          const data = await res.json();
          throw new Error(data.message || 'Purchase failed');
        }
      } catch (err: any) {
        showNotification('error', err.message || 'Purchase failed. Please try again.');
        throw err;
      } finally {
        setPurchaseLoading(false);
      }
    },
    [loadDashboard, showNotification]
  );

  const handleToggleBadgeDisplay = useCallback(
    async (badgeId: string, display: boolean) => {
      try {
        const token = authTokenService.getToken();
        const res = await fetch(`/api/v1/gamification/achievements/${badgeId}/display`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ display }),
        });

        if (res.ok) {
          setAchievements((prev) =>
            prev.map((b) => (b.id === badgeId ? { ...b, isDisplayed: display } : b))
          );
          showNotification(
            'success',
            display ? 'Badge added to profile' : 'Badge removed from profile'
          );
        } else {
          const data = await res.json();
          throw new Error(data.message || 'Failed to update badge');
        }
      } catch (err: any) {
        showNotification('error', err.message || 'Failed to update badge display');
        throw err;
      }
    },
    [showNotification]
  );

  const handleRewardClaimed = useCallback(() => {
    loadDashboard();
    showNotification('success', 'Daily reward claimed!');
  }, [loadDashboard, showNotification]);

  const categories = ['all', 'dating', 'social', 'profile', 'engagement', 'streak', 'special'];
  const filteredAchievements =
    selectedCategory === 'all'
      ? achievements
      : achievements.filter((a) => a.category === selectedCategory);

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: 'var(--bg-page)' }}
      >
        <div
          className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
          style={{ borderColor: 'var(--accent-pink)' }}
        />
        <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading your rewards...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      {/* Global Notification */}
      {notification && (
        <div
          className="fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in"
          style={{
            background:
              notification.type === 'success' ? 'rgba(76,175,80,0.95)' : 'rgba(244,67,54,0.95)',
            color: 'white',
            maxWidth: '400px',
          }}
        >
          <span className="text-xl">{notification.type === 'success' ? '✓' : '⚠️'}</span>
          <p className="font-medium">{notification.message}</p>
          <button onClick={() => setNotification(null)} className="ml-auto p-1 hover:opacity-80">
            x
          </button>
        </div>
      )}

      <Navigation />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Level & XP Bar */}
        {dashboard?.level && (
          <div className="rounded-2xl p-6 mb-6" style={{ background: 'var(--accent-gradient)' }}>
            <div className="flex items-center justify-between text-white mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-3xl font-bold">{dashboard.level.currentLevel}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{dashboard.level.title}</h2>
                  <p className="text-white/80">Level {dashboard.level.currentLevel}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{dashboard.level.totalXP.toLocaleString()}</p>
                <p className="text-white/80">Total XP</p>
              </div>
            </div>
            {dashboard.level.nextLevel && (
              <div>
                <div className="flex justify-between text-sm text-white/80 mb-1">
                  <span>Level {dashboard.level.currentLevel}</span>
                  <span>
                    Level {dashboard.level.nextLevel.level}: {dashboard.level.nextLevel.title}
                  </span>
                </div>
                <div className="rounded-full h-3 bg-white/20">
                  <div
                    className="h-3 rounded-full bg-white transition-all"
                    style={{
                      width: `${Math.round((dashboard.level.xpProgress / dashboard.level.xpNeeded) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-center text-sm text-white/80 mt-2">
                  {dashboard.level.xpNeeded - dashboard.level.xpProgress} XP to next level
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setShowDailyRewardsModal(true)}
            className="p-4 rounded-xl transition hover:scale-105"
            style={{
              background: dashboard?.dailyRewards.canClaim
                ? 'linear-gradient(135deg, rgba(255,107,107,0.2) 0%, rgba(156,39,176,0.2) 100%)'
                : 'var(--surface-card)',
              border: dashboard?.dailyRewards.canClaim
                ? '2px solid var(--accent-pink)'
                : '1px solid var(--border-subtle)',
            }}
          >
            <span className="text-3xl block mb-2">
              {dashboard?.dailyRewards.canClaim ? '🎁' : '✅'}
            </span>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Daily Reward
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {dashboard?.dailyRewards.canClaim ? 'Ready to claim!' : 'Claimed today'}
            </p>
          </button>

          <div
            className="p-4 rounded-xl"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}
          >
            <span className="text-3xl block mb-2">🔥</span>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {dashboard?.streaks.login?.currentStreak || 0} Day Streak
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Best: {dashboard?.streaks.login?.longestStreak || 0}
            </p>
          </div>

          <div
            className="p-4 rounded-xl"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}
          >
            <span className="text-3xl block mb-2">🏆</span>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {dashboard?.achievements.unlocked || 0} Badges
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {dashboard?.achievements.total
                ? `${dashboard.achievements.progress}% complete`
                : 'Start earning!'}
            </p>
          </div>

          <div
            className="p-4 rounded-xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(184,134,11,0.1) 100%)',
              border: '1px solid rgba(255,215,0,0.3)',
            }}
          >
            <span className="text-3xl block mb-2">🪙</span>
            <p className="font-medium" style={{ color: 'var(--coin-primary)' }}>
              {(coinBalance?.balance || 0).toLocaleString()} Coins
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Total earned: {(coinBalance?.totalEarned || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="rounded-xl p-1 flex mb-6" style={{ background: 'var(--surface-card)' }}>
          {(['overview', 'achievements', 'streaks', 'wallet'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-3 rounded-lg font-medium capitalize transition"
              style={{
                background: activeTab === tab ? 'var(--accent-gradient)' : 'transparent',
                color: activeTab === tab ? 'white' : 'var(--text-secondary)',
              }}
            >
              {tab === 'overview' && '📊 '}
              {tab === 'achievements' && '🏆 '}
              {tab === 'streaks' && '🔥 '}
              {tab === 'wallet' && '💰 '}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Recent Achievements */}
            <div
              className="rounded-xl p-6"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Recent Achievements
                </h3>
                <button
                  onClick={() => setActiveTab('achievements')}
                  className="text-sm"
                  style={{ color: 'var(--accent-pink)' }}
                >
                  View all
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {achievements
                  .filter((a) => a.isUnlocked)
                  .slice(0, 4)
                  .map((badge) => (
                    <AchievementBadgeCard key={badge.id} badge={badge} compact />
                  ))}
              </div>
            </div>

            {/* Streak Summary */}
            <div
              className="rounded-xl p-6"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Current Streaks
                </h3>
                <button
                  onClick={() => setActiveTab('streaks')}
                  className="text-sm"
                  style={{ color: 'var(--accent-pink)' }}
                >
                  View details
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { type: 'login', icon: '🔥', label: 'Login', streak: dashboard?.streaks.login },
                  {
                    type: 'conversation',
                    icon: '💬',
                    label: 'Chat',
                    streak: dashboard?.streaks.conversation,
                  },
                  { type: 'match', icon: '💕', label: 'Match', streak: dashboard?.streaks.match },
                ].map((s) => (
                  <div
                    key={s.type}
                    className="p-4 rounded-xl text-center"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    <span className="text-3xl">{s.icon}</span>
                    <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
                      {s.streak?.currentStreak || 0}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* In Progress Achievements */}
            <div
              className="rounded-xl p-6"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                Almost There!
              </h3>
              <div className="space-y-3">
                {achievements
                  .filter((a) => !a.isUnlocked && a.currentProgress / a.targetProgress >= 0.5)
                  .slice(0, 3)
                  .map((badge) => (
                    <AchievementBadgeCard key={badge.id} badge={badge} />
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-6">
            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition"
                  style={{
                    background:
                      selectedCategory === cat ? 'var(--accent-gradient)' : 'var(--surface-card)',
                    color: selectedCategory === cat ? 'white' : 'var(--text-secondary)',
                    border: selectedCategory === cat ? 'none' : '1px solid var(--border-subtle)',
                  }}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            {/* Achievement Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              {filteredAchievements.map((badge) => (
                <AchievementBadgeCard
                  key={badge.id}
                  badge={badge}
                  onToggleDisplay={handleToggleBadgeDisplay}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'streaks' && dashboard?.streaks && (
          <StreakDisplay
            streaks={dashboard.streaks}
            onProtectStreak={handleProtectStreak}
            coinsBalance={coinBalance?.balance}
            loading={loadingState.dashboard}
            error={errorState.dashboard}
            onRetry={loadDashboard}
          />
        )}

        {activeTab === 'wallet' && coinBalance && (
          <CoinWallet
            balance={coinBalance}
            transactions={coinTransactions}
            onPurchase={handlePurchase}
            loading={loadingState.wallet || purchaseLoading}
            error={errorState.wallet}
            onRetry={loadDashboard}
          />
        )}
      </main>

      {/* Daily Rewards Modal */}
      <DailyRewardsModal
        isOpen={showDailyRewardsModal}
        onClose={() => setShowDailyRewardsModal(false)}
        onRewardClaimed={() => loadDashboard()}
      />
    </div>
  );
};

export default EnhancedGamificationPage;
