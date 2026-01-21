import React, { useState, useCallback, useEffect } from 'react';

export interface StreakData {
  id: string;
  userId: string;
  streakType: 'login' | 'conversation' | 'match' | 'activity';
  currentStreak: number;
  longestStreak: number;
  streakStartDate: string;
  lastActivityDate: string;
  isProtected: boolean;
  protectionExpiresAt?: string;
}

interface StreakMilestone {
  days: number;
  title: string;
  reward: {
    coins?: number;
    superLikes?: number;
    boosts?: number;
  };
  achieved: boolean;
}

interface Props {
  streaks: {
    login: StreakData | null;
    conversation: StreakData | null;
    match: StreakData | null;
  };
  onProtectStreak?: (streakType: string) => Promise<void> | void;
  coinsBalance?: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const streakIcons: Record<string, { icon: string; color: string; label: string }> = {
  login: { icon: '🔥', color: '#FF5722', label: 'Login Streak' },
  conversation: { icon: '💬', color: '#2196F3', label: 'Chat Streak' },
  match: { icon: '💕', color: '#E91E63', label: 'Match Streak' },
  activity: { icon: '⚡', color: '#FF9800', label: 'Activity Streak' },
};

const defaultMilestones: StreakMilestone[] = [
  { days: 3, title: '3 Days', reward: { coins: 20 }, achieved: false },
  { days: 7, title: 'Week Warrior', reward: { coins: 50, superLikes: 1 }, achieved: false },
  { days: 14, title: 'Two Weeks', reward: { coins: 100, superLikes: 2 }, achieved: false },
  { days: 30, title: 'Month Master', reward: { coins: 250, boosts: 1 }, achieved: false },
  { days: 100, title: 'Century Club', reward: { coins: 1000, boosts: 3 }, achieved: false },
];

export const StreakDisplay: React.FC<Props> = ({
  streaks,
  onProtectStreak,
  coinsBalance = 0,
  loading = false,
  error = null,
  onRetry,
}) => {
  const protectionCost = 50;
  const canAffordProtection = coinsBalance >= protectionCost;

  const [protectingType, setProtectingType] = useState<string | null>(null);
  const [protectionError, setProtectionError] = useState<string | null>(null);
  const [protectionSuccess, setProtectionSuccess] = useState<string | null>(null);
  const [animatedStreaks, setAnimatedStreaks] = useState<Set<string>>(new Set());
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Animate streaks on mount if they have values
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    ['login', 'conversation', 'match'].forEach((type, index) => {
      const streak = streaks[type as keyof typeof streaks];
      if (streak && streak.currentStreak > 0) {
        const timer = setTimeout(() => {
          setAnimatedStreaks((prev) => new Set([...prev, type]));
        }, index * 200);
        timers.push(timer);
      }
    });
    return () => timers.forEach((t) => clearTimeout(t));
  }, [streaks]);

  const handleProtectStreak = useCallback(
    async (streakType: string) => {
      if (!onProtectStreak || protectingType) return;

      if (!canAffordProtection) {
        setProtectionError(`Not enough coins. You need ${protectionCost} coins.`);
        setTimeout(() => setProtectionError(null), 3000);
        return;
      }

      setProtectingType(streakType);
      setProtectionError(null);

      try {
        await onProtectStreak(streakType);
        setProtectionSuccess(`Your ${streakType} streak is now protected for 24 hours!`);
        setTimeout(() => setProtectionSuccess(null), 3000);
      } catch (err) {
        setProtectionError('Failed to protect streak. Please try again.');
        setTimeout(() => setProtectionError(null), 3000);
      } finally {
        setProtectingType(null);
      }
    },
    [onProtectStreak, protectingType, canAffordProtection, protectionCost]
  );

  const formatTimeRemaining = useCallback((expiresAt: string): string => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();

    if (diffMs <= 0) return 'Expired';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  }, []);

  const getStreakStatus = useCallback(
    (streak: StreakData | null): 'active' | 'at_risk' | 'protected' | 'inactive' => {
      if (!streak) return 'inactive';
      if (streak.isProtected) return 'protected';

      const lastActivity = new Date(streak.lastActivityDate);
      const now = new Date();
      const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

      if (hoursSinceActivity > 20 && hoursSinceActivity < 24) return 'at_risk';
      if (hoursSinceActivity >= 24) return 'inactive';
      return 'active';
    },
    []
  );

  const getStreakLevel = (count: number): { level: string; color: string } => {
    if (count >= 100) return { level: 'Legendary', color: '#FFD700' };
    if (count >= 30) return { level: 'Master', color: '#9C27B0' };
    if (count >= 14) return { level: 'Champion', color: '#2196F3' };
    if (count >= 7) return { level: 'Warrior', color: '#4CAF50' };
    if (count >= 3) return { level: 'Rising', color: '#FF9800' };
    return { level: 'Starter', color: '#757575' };
  };

  const getMilestones = (currentStreak: number): StreakMilestone[] => {
    return defaultMilestones.map((m) => ({
      ...m,
      achieved: currentStreak >= m.days,
    }));
  };

  const renderStreakCard = (type: string, streak: StreakData | null) => {
    const { icon, color, label } = streakIcons[type];
    const current = streak?.currentStreak || 0;
    const longest = streak?.longestStreak || 0;
    const { level, color: levelColor } = getStreakLevel(current);
    const milestones = getMilestones(current);
    const nextMilestone = milestones.find((m) => !m.achieved);
    const progressToNext = nextMilestone ? Math.round((current / nextMilestone.days) * 100) : 100;
    const status = getStreakStatus(streak);
    const isAnimated = animatedStreaks.has(type);
    const isExpanded = expandedCard === type;
    const isProtecting = protectingType === type;

    const statusColors = {
      active: '#4CAF50',
      at_risk: '#FF9800',
      protected: '#2196F3',
      inactive: '#757575',
    };

    const statusLabels = {
      active: 'Active',
      at_risk: 'At Risk!',
      protected: 'Protected',
      inactive: 'Inactive',
    };

    return (
      <div
        key={type}
        className={`relative p-4 rounded-xl transition-all duration-300 cursor-pointer ${isAnimated ? 'animate-fade-in' : ''}`}
        style={{
          background: 'var(--surface-card)',
          border: `1px solid ${status === 'at_risk' ? '#FF9800' : 'var(--border-subtle)'}`,
          boxShadow: status === 'at_risk' ? '0 0 20px rgba(255,152,0,0.3)' : 'none',
          transform: isExpanded ? 'scale(1.02)' : 'scale(1)',
        }}
        onClick={() => setExpandedCard(isExpanded ? null : type)}
      >
        {/* Status indicator */}
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: `${statusColors[status]}20`, color: statusColors[status] }}
        >
          {statusLabels[status]}
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-transform duration-300 ${current >= 7 ? 'animate-pulse' : ''}`}
              style={{
                background: `${color}20`,
                transform: isAnimated ? 'scale(1)' : 'scale(0.8)',
              }}
            >
              {icon}
            </div>
            <div>
              <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {label}
              </h3>
              <p className="text-sm font-medium" style={{ color: levelColor }}>
                {level}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p
              className="text-3xl font-bold transition-all duration-500"
              style={{
                color,
                transform: isAnimated ? 'scale(1)' : 'scale(0.5)',
                opacity: isAnimated ? 1 : 0,
              }}
            >
              {current}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Best: {longest}
            </p>
          </div>
        </div>

        {/* At risk warning */}
        {status === 'at_risk' && (
          <div
            className="flex items-center gap-2 p-2 rounded-lg mb-3 text-sm animate-pulse"
            style={{ background: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.3)' }}
          >
            <span className="text-lg">⚠️</span>
            <span style={{ color: '#FF9800' }}>
              Your streak is at risk! Complete an activity soon to maintain it.
            </span>
          </div>
        )}

        {/* Progress to next milestone */}
        {nextMilestone && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span style={{ color: 'var(--text-muted)' }}>Next: {nextMilestone.title}</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {current}/{nextMilestone.days} days
              </span>
            </div>
            <div
              className="rounded-full h-2 overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <div
                className="h-2 rounded-full transition-all duration-1000 relative"
                style={{
                  width: isAnimated ? `${Math.min(progressToNext, 100)}%` : '0%',
                  background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
                }}
              >
                {/* Shimmer effect */}
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                    animation: 'shimmer 2s infinite',
                  }}
                />
              </div>
            </div>
            <div
              className="flex items-center gap-2 mt-2 text-xs flex-wrap"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>Rewards:</span>
              {nextMilestone.reward.coins && (
                <span
                  className="flex items-center gap-0.5"
                  style={{ color: 'var(--coin-primary)' }}
                >
                  +{nextMilestone.reward.coins} 🪙
                </span>
              )}
              {nextMilestone.reward.superLikes && (
                <span className="flex items-center gap-0.5" style={{ color: '#FF1493' }}>
                  +{nextMilestone.reward.superLikes} ⭐
                </span>
              )}
              {nextMilestone.reward.boosts && (
                <span className="flex items-center gap-0.5" style={{ color: '#FF6B6B' }}>
                  +{nextMilestone.reward.boosts} 🚀
                </span>
              )}
            </div>
          </div>
        )}

        {/* Protection status */}
        {streak?.isProtected && streak.protectionExpiresAt && (
          <div
            className="flex items-center gap-2 p-2 rounded-lg mb-3 text-sm"
            style={{ background: 'rgba(33,150,243,0.1)', border: '1px solid rgba(33,150,243,0.3)' }}
          >
            <span className="text-lg">🛡️</span>
            <span style={{ color: '#2196F3' }}>
              {formatTimeRemaining(streak.protectionExpiresAt)}
            </span>
          </div>
        )}

        {/* Protect button */}
        {onProtectStreak && streak && !streak.isProtected && current >= 3 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleProtectStreak(type);
            }}
            disabled={!canAffordProtection || isProtecting}
            className={`
              w-full py-2 rounded-lg text-sm font-medium transition-all duration-200
              flex items-center justify-center gap-2
              ${canAffordProtection && !isProtecting ? 'hover:opacity-90 hover:scale-105' : 'opacity-50 cursor-not-allowed'}
            `}
            style={{
              background: canAffordProtection ? 'rgba(76,175,80,0.2)' : 'rgba(128,128,128,0.1)',
              color: canAffordProtection ? '#4CAF50' : 'var(--text-muted)',
              border: `1px solid ${canAffordProtection ? '#4CAF50' : 'transparent'}`,
            }}
          >
            {isProtecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                Protecting...
              </>
            ) : (
              <>
                <span>🛡️</span>
                Protect Streak ({protectionCost} 🪙)
              </>
            )}
          </button>
        )}

        {/* Milestones - expandable */}
        <div
          className={`mt-4 transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-80'}`}
        >
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
            Milestones
          </p>
          <div className="flex gap-2">
            {milestones.slice(0, 5).map((m, idx) => (
              <div
                key={idx}
                className={`
                  flex-1 p-2 rounded-lg text-center transition-all duration-300
                  ${m.achieved ? 'ring-2 ring-green-500' : ''}
                `}
                style={{
                  background: m.achieved ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.05)',
                  transform: isExpanded && m.achieved ? 'scale(1.1)' : 'scale(1)',
                }}
                title={`${m.title}: ${Object.entries(m.reward)
                  .map(([k, v]) => `${v} ${k}`)
                  .join(', ')}`}
              >
                <p className={`text-lg ${m.achieved && isExpanded ? 'animate-bounce' : ''}`}>
                  {m.achieved ? '✅' : '🔒'}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: m.achieved ? '#4CAF50' : 'var(--text-muted)' }}
                >
                  {m.days}d
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div
          className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
          style={{ borderColor: 'var(--accent-pink)' }}
        />
        <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading streaks...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <span className="text-4xl mb-4">🔥</span>
        <p className="text-center mb-4" style={{ color: 'var(--text-muted)' }}>
          {error}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-lg font-medium hover:opacity-80 transition"
            style={{ background: 'var(--accent-gradient)', color: 'white' }}
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Success/Error Notifications */}
      {protectionSuccess && (
        <div
          className="p-3 rounded-lg flex items-center gap-2 animate-pulse"
          style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)' }}
        >
          <span className="text-xl">🛡️</span>
          <p className="text-sm font-medium" style={{ color: '#4CAF50' }}>
            {protectionSuccess}
          </p>
        </div>
      )}

      {protectionError && (
        <div
          className="p-3 rounded-lg flex items-center gap-2"
          style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)' }}
        >
          <span className="text-xl">⚠️</span>
          <p className="text-sm font-medium" style={{ color: '#f44336' }}>
            {protectionError}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Your Streaks
        </h2>
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <span>🛡️ Protection: {protectionCost} 🪙</span>
          {coinsBalance !== undefined && (
            <span
              className="px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,215,0,0.1)', color: 'var(--coin-primary)' }}
            >
              Balance: {coinsBalance} 🪙
            </span>
          )}
        </div>
      </div>

      {/* Streak Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {renderStreakCard('login', streaks.login)}
        {renderStreakCard('conversation', streaks.conversation)}
        {renderStreakCard('match', streaks.match)}
      </div>

      {/* Tips */}
      <div
        className="p-4 rounded-xl"
        style={{ background: 'rgba(33,150,243,0.1)', border: '1px solid rgba(33,150,243,0.2)' }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Streak Tips
            </p>
            <ul className="text-sm mt-1 space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <li>Log in daily to maintain your login streak</li>
              <li>Send at least one message to keep your chat streak</li>
              <li>Get matches to build your match streak</li>
              <li>Use streak protection if you might miss a day</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default StreakDisplay;
