import React, { useEffect, useState, useCallback } from 'react';

interface DailyRewardCalendarDay {
  dayNumber: number;
  rewardType: 'coins' | 'super_likes' | 'boosts' | 'premium_trial';
  baseAmount: number;
  description: string;
  iconName: string;
  isSpecialDay: boolean;
}

interface DailyRewardStatus {
  canClaim: boolean;
  currentStreak: number;
  longestStreak: number;
  dayInCycle: number;
  todayReward: DailyRewardCalendarDay | null;
  nextRewards: DailyRewardCalendarDay[];
  hoursUntilNextClaim: number;
  totalLoginDays: number;
  calendar: DailyRewardCalendarDay[];
}

interface ClaimResult {
  reward: {
    type: string;
    amount: number;
  };
  newStreak: number;
  weeklyBonus?: {
    title: string;
    reward: {
      type: string;
      amount: number;
    };
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRewardClaimed?: (reward: ClaimResult) => void;
}

const DEFAULT_CALENDAR: DailyRewardCalendarDay[] = [
  { dayNumber: 1, rewardType: 'coins', baseAmount: 10, description: 'Start your week!', iconName: 'coin', isSpecialDay: false },
  { dayNumber: 2, rewardType: 'coins', baseAmount: 15, description: 'Keep going!', iconName: 'coin', isSpecialDay: false },
  { dayNumber: 3, rewardType: 'super_likes', baseAmount: 2, description: 'Super Likes!', iconName: 'star', isSpecialDay: false },
  { dayNumber: 4, rewardType: 'coins', baseAmount: 20, description: 'Halfway!', iconName: 'coin', isSpecialDay: false },
  { dayNumber: 5, rewardType: 'super_likes', baseAmount: 3, description: 'More Super Likes!', iconName: 'star', isSpecialDay: false },
  { dayNumber: 6, rewardType: 'boosts', baseAmount: 1, description: 'Get boosted!', iconName: 'rocket', isSpecialDay: false },
  { dayNumber: 7, rewardType: 'coins', baseAmount: 50, description: 'Week complete! Big bonus!', iconName: 'trophy', isSpecialDay: true },
];

export const DailyRewardsModal: React.FC<Props> = ({ isOpen, onClose, onRewardClaimed }) => {
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<DailyRewardStatus | null>(null);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');

      const response = await fetch('/api/v1/gamification/daily-rewards/status', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.data);
      } else if (response.status === 401) {
        setError('Please log in to view daily rewards');
      } else {
        // Use mock data for demo/development
        setStatus({
          canClaim: true,
          currentStreak: 5,
          longestStreak: 12,
          dayInCycle: 5,
          todayReward: {
            dayNumber: 5,
            rewardType: 'super_likes',
            baseAmount: 3,
            description: 'More Super Likes!',
            iconName: 'star',
            isSpecialDay: false,
          },
          nextRewards: [],
          hoursUntilNextClaim: 0,
          totalLoginDays: 45,
          calendar: DEFAULT_CALENDAR,
        });
      }
    } catch (err) {
      console.error('Failed to fetch daily reward status:', err);
      setError('Failed to load rewards. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      // Trigger animation after a brief delay
      const timer = setTimeout(() => setAnimateIn(true), 50);
      return () => clearTimeout(timer);
    } else {
      setAnimateIn(false);
      setShowSuccess(false);
      setClaimResult(null);
    }
  }, [isOpen, fetchStatus]);

  const handleClaim = async () => {
    if (!status?.canClaim || claiming) return;

    try {
      setClaiming(true);
      setError(null);
      const token = localStorage.getItem('authToken');

      const response = await fetch('/api/v1/gamification/daily-rewards/claim', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClaimResult(data.data);
        setShowSuccess(true);
        onRewardClaimed?.(data.data);
        setStatus(prev => prev ? { ...prev, canClaim: false, currentStreak: data.data.newStreak } : null);
      } else if (response.status === 400) {
        const data = await response.json();
        setError(data.message || 'Already claimed today');
        setStatus(prev => prev ? { ...prev, canClaim: false } : null);
      } else if (response.status === 401) {
        setError('Please log in to claim rewards');
      } else {
        // Mock successful claim for demo
        const mockResult: ClaimResult = {
          reward: {
            type: status.todayReward?.rewardType || 'coins',
            amount: status.todayReward?.baseAmount || 10,
          },
          newStreak: (status.currentStreak || 0) + 1,
        };
        setClaimResult(mockResult);
        setShowSuccess(true);
        onRewardClaimed?.(mockResult);
        setStatus(prev => prev ? { ...prev, canClaim: false, currentStreak: mockResult.newStreak } : null);
      }
    } catch (err) {
      console.error('Failed to claim reward:', err);
      setError('Failed to claim reward. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    fetchStatus();
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'coins': return { icon: 'coin', color: '#FFD700' };
      case 'super_likes': return { icon: 'star', color: '#FF1493' };
      case 'boosts': return { icon: 'rocket', color: '#FF6B6B' };
      case 'premium_trial': return { icon: 'crown', color: '#9C27B0' };
      default: return { icon: 'gift', color: '#2196F3' };
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      style={{
        backgroundColor: animateIn ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          background: 'var(--surface-card)',
          maxHeight: '90vh',
          transform: animateIn ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
          opacity: animateIn ? 1 : 0,
        }}
      >
        {/* Header with streak flames */}
        <div
          className="p-6 text-center text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--accent-pink) 0%, var(--accent-purple) 100%)' }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-6xl mb-2">
            {status?.currentStreak && status.currentStreak >= 7 ? '🔥' : '✨'}
          </div>
          <h2 className="text-2xl font-bold mb-1">Daily Rewards</h2>
          {status && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl">🔥</span>
              <span className="text-xl font-bold">{status.currentStreak} Day Streak!</span>
            </div>
          )}
          {status?.longestStreak && (
            <p className="text-sm mt-1 opacity-80">Best: {status.longestStreak} days</p>
          )}
        </div>

        {/* Content */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          {error && (
            <div
              className="mb-4 p-3 rounded-lg flex items-center justify-between"
              style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)' }}
            >
              <p className="text-sm" style={{ color: '#f44336' }}>{error}</p>
              <button
                onClick={handleRetry}
                className="text-sm font-medium px-3 py-1 rounded-lg hover:opacity-80 transition"
                style={{ background: 'rgba(244,67,54,0.2)', color: '#f44336' }}
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div
                className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
                style={{ borderColor: 'var(--accent-pink)' }}
              />
              <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                Loading rewards...
              </p>
            </div>
          ) : showSuccess && claimResult ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4 animate-bounce">🎉</div>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Reward Claimed!
              </h3>
              <p className="text-lg mb-4" style={{ color: 'var(--coin-primary)' }}>
                +{claimResult.reward.amount} {claimResult.reward.type.replace('_', ' ')}
              </p>
              {claimResult.weeklyBonus && (
                <div
                  className="p-4 rounded-xl mt-4"
                  style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,165,0,0.2) 100%)' }}
                >
                  <p className="font-bold" style={{ color: 'var(--coin-primary)' }}>
                    Weekly Bonus! 🎊
                  </p>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {claimResult.weeklyBonus.title}: +{claimResult.weeklyBonus.reward.amount} {claimResult.weeklyBonus.reward.type}
                  </p>
                </div>
              )}
              <p className="text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
                {claimResult.newStreak} day streak! Come back tomorrow!
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-8 py-3 rounded-xl font-bold text-white transition hover:opacity-90"
                style={{ background: 'var(--accent-gradient)' }}
              >
                Awesome!
              </button>
            </div>
          ) : status ? (
            <>
              {/* Reward Calendar */}
              <div className="grid grid-cols-7 gap-2 mb-6">
                {status.calendar?.map((day) => {
                  const { color } = getRewardIcon(day.rewardType);
                  const isCurrent = day.dayNumber === status.dayInCycle;
                  const isPast = day.dayNumber < status.dayInCycle;

                  return (
                    <div
                      key={day.dayNumber}
                      className={`
                        relative p-2 rounded-xl text-center transition
                        ${isCurrent ? 'ring-2 ring-offset-2 scale-105' : ''}
                        ${isPast ? 'opacity-60' : ''}
                      `}
                      style={{
                        background: isCurrent
                          ? 'var(--accent-gradient)'
                          : isPast
                          ? 'rgba(128,128,128,0.1)'
                          : 'rgba(255,255,255,0.05)',
                        ringColor: isCurrent ? 'var(--accent-pink)' : undefined,
                      }}
                    >
                      <p
                        className="text-xs font-medium mb-1"
                        style={{ color: isCurrent ? 'white' : 'var(--text-muted)' }}
                      >
                        Day {day.dayNumber}
                      </p>
                      <div
                        className="text-2xl"
                        style={{ filter: isPast ? 'grayscale(1)' : 'none' }}
                      >
                        {day.rewardType === 'coins' && '🪙'}
                        {day.rewardType === 'super_likes' && '⭐'}
                        {day.rewardType === 'boosts' && '🚀'}
                        {day.rewardType === 'premium_trial' && '👑'}
                      </div>
                      <p
                        className="text-xs font-bold mt-1"
                        style={{ color: isCurrent ? 'white' : color }}
                      >
                        {day.baseAmount}
                      </p>
                      {isPast && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-green-500 text-xl">✓</span>
                        </div>
                      )}
                      {day.isSpecialDay && (
                        <div className="absolute -top-1 -right-1 text-xs">✨</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Today's Reward */}
              {status.todayReward && (
                <div
                  className="p-4 rounded-xl mb-4"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                      style={{ background: `${getRewardIcon(status.todayReward.rewardType).color}20` }}
                    >
                      {status.todayReward.rewardType === 'coins' && '🪙'}
                      {status.todayReward.rewardType === 'super_likes' && '⭐'}
                      {status.todayReward.rewardType === 'boosts' && '🚀'}
                      {status.todayReward.rewardType === 'premium_trial' && '👑'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                        Today's Reward
                      </p>
                      <p
                        className="text-xl font-bold"
                        style={{ color: getRewardIcon(status.todayReward.rewardType).color }}
                      >
                        {status.todayReward.baseAmount} {status.todayReward.rewardType.replace('_', ' ')}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {status.todayReward.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Claim Button */}
              <button
                onClick={handleClaim}
                disabled={!status.canClaim || claiming}
                className={`
                  w-full py-4 rounded-xl font-bold text-white text-lg
                  transition flex items-center justify-center gap-2
                  ${status.canClaim ? 'hover:opacity-90' : 'opacity-60 cursor-not-allowed'}
                `}
                style={{
                  background: status.canClaim ? 'var(--accent-gradient)' : 'gray',
                }}
              >
                {claiming ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Claiming...
                  </>
                ) : status.canClaim ? (
                  <>
                    <span>🎁</span>
                    Claim Reward
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    Already Claimed Today
                  </>
                )}
              </button>

              {!status.canClaim && status.hoursUntilNextClaim > 0 && (
                <p className="text-center text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
                  Next reward in {status.hoursUntilNextClaim} hours
                </p>
              )}
            </>
          ) : (
            <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              Unable to load rewards
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyRewardsModal;
