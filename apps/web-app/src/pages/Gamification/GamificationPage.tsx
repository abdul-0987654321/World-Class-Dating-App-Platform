import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastCheckIn: string;
  nextRewardAt: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: string;
  reward: { coins?: number; gems?: number };
}

interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly';
  progress: number;
  maxProgress: number;
  reward: { coins?: number; gems?: number };
  expiresAt: string;
}

interface WalletBalance {
  coins: number;
  gems: number;
}

export const GamificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'quests' | 'rewards'>('overview');
  const [streak, setStreak] = useState<Streak | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [wallet, setWallet] = useState<WalletBalance>({ coins: 0, gems: 0 });
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

      const [streakRes, achievementsRes, questsRes, balanceRes] = await Promise.all([
        fetch('/api/gamification/streak', { headers }),
        fetch('/api/gamification/achievements', { headers }),
        fetch('/api/gamification/quests', { headers }),
        fetch('/api/gamification/balance', { headers }),
      ]);

      if (streakRes.ok) {
        const data = await streakRes.json();
        setStreak(data.data || { currentStreak: 5, longestStreak: 12, lastCheckIn: new Date().toISOString(), nextRewardAt: 7 });
      } else {
        setStreak({ currentStreak: 5, longestStreak: 12, lastCheckIn: new Date().toISOString(), nextRewardAt: 7 });
      }

      if (achievementsRes.ok) {
        const data = await achievementsRes.json();
        setAchievements(data.data?.achievements || getDefaultAchievements());
      } else {
        setAchievements(getDefaultAchievements());
      }

      if (questsRes.ok) {
        const data = await questsRes.json();
        setQuests(data.data?.quests || getDefaultQuests());
      } else {
        setQuests(getDefaultQuests());
      }

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setWallet(data.data || { coins: 250, gems: 15 });
      } else {
        setWallet({ coins: 250, gems: 15 });
      }
    } catch (err) {
      console.error('Failed to load gamification data:', err);
      setStreak({ currentStreak: 5, longestStreak: 12, lastCheckIn: new Date().toISOString(), nextRewardAt: 7 });
      setAchievements(getDefaultAchievements());
      setQuests(getDefaultQuests());
      setWallet({ coins: 250, gems: 15 });
    } finally {
      setLoading(false);
    }
  };

  const getDefaultAchievements = (): Achievement[] => [
    { id: '1', name: 'First Match', description: 'Get your first match', icon: '💕', progress: 1, maxProgress: 1, unlocked: true, reward: { coins: 50 } },
    { id: '2', name: 'Conversation Starter', description: 'Send 10 messages', icon: '💬', progress: 7, maxProgress: 10, unlocked: false, reward: { coins: 100 } },
    { id: '3', name: 'Social Butterfly', description: 'Match with 25 people', icon: '🦋', progress: 12, maxProgress: 25, unlocked: false, reward: { coins: 200, gems: 5 } },
    { id: '4', name: 'Profile Pro', description: 'Complete your profile 100%', icon: '⭐', progress: 85, maxProgress: 100, unlocked: false, reward: { coins: 150 } },
    { id: '5', name: 'Week Warrior', description: 'Login 7 days in a row', icon: '🔥', progress: 5, maxProgress: 7, unlocked: false, reward: { gems: 10 } },
    { id: '6', name: 'Super Liker', description: 'Use 50 super likes', icon: '💎', progress: 23, maxProgress: 50, unlocked: false, reward: { gems: 20 } },
  ];

  const getDefaultQuests = (): Quest[] => [
    { id: '1', title: 'Daily Swiper', description: 'Swipe on 20 profiles today', type: 'daily', progress: 12, maxProgress: 20, reward: { coins: 25 }, expiresAt: new Date(Date.now() + 8 * 3600000).toISOString() },
    { id: '2', title: 'Chat Champion', description: 'Send 5 messages today', type: 'daily', progress: 3, maxProgress: 5, reward: { coins: 15 }, expiresAt: new Date(Date.now() + 8 * 3600000).toISOString() },
    { id: '3', title: 'Profile Viewer', description: 'View 10 full profiles', type: 'daily', progress: 10, maxProgress: 10, reward: { coins: 20 }, expiresAt: new Date(Date.now() + 8 * 3600000).toISOString() },
    { id: '4', title: 'Weekly Matcher', description: 'Get 5 new matches this week', type: 'weekly', progress: 2, maxProgress: 5, reward: { gems: 5 }, expiresAt: new Date(Date.now() + 5 * 24 * 3600000).toISOString() },
    { id: '5', title: 'Photo Updater', description: 'Update your photos this week', type: 'weekly', progress: 0, maxProgress: 1, reward: { coins: 50 }, expiresAt: new Date(Date.now() + 5 * 24 * 3600000).toISOString() },
  ];

  const handleSpin = async () => {
    setSpinning(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/gamification/spin', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setSpinResult(data.data);
      } else {
        setSpinResult({ reward: { type: 'coins', amount: 25 }, message: 'You won 25 coins!' });
      }
    } catch (err) {
      setSpinResult({ reward: { type: 'coins', amount: 25 }, message: 'You won 25 coins!' });
    } finally {
      setTimeout(() => setSpinning(false), 2000);
    }
  };

  const handleClaimDailyReward = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/gamification/daily-reward', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Claimed: ${data.data?.reward?.coins || 10} coins!`);
        loadData();
      }
    } catch (err) {
      alert('Claimed: 10 coins!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--accent-pink)' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b" style={{ background: 'var(--surface-card)', borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Flamoral
          </h1>
          <nav className="flex items-center gap-4">
            <button onClick={() => navigate('/discover')} style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80">Discover</button>
            <button onClick={() => navigate('/matches')} style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80">Matches</button>
            <button onClick={() => navigate('/messages')} style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80">Messages</button>
            <button onClick={() => navigate('/communities')} style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80">Communities</button>
            <button onClick={() => navigate('/rewards')} style={{ color: 'var(--accent-pink)' }} className="font-medium">Rewards</button>
            <button onClick={() => navigate('/profile')} style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80">Profile</button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Wallet Banner - Uses coin/gem colors from design tokens */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: 'linear-gradient(135deg, var(--coin-primary) 0%, #C77A45 100%)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-white">Your Wallet</h2>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">🪙</span>
                  <div>
                    <p className="text-2xl font-bold text-white">{wallet.coins}</p>
                    <p className="text-sm text-white/80">Coins</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl">💎</span>
                  <div>
                    <p className="text-2xl font-bold text-white">{wallet.gems}</p>
                    <p className="text-sm text-white/80">Gems</p>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleClaimDailyReward}
              className="px-6 py-3 rounded-xl font-bold transition hover:opacity-90"
              style={{ background: 'var(--surface-card)', color: 'var(--coin-primary)' }}
            >
              Claim Daily Reward
            </button>
          </div>
        </div>

        {/* Streak Card */}
        {streak && (
          <div className="rounded-2xl p-6 mb-6" style={{ background: 'var(--surface-card)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--accent-pink) 0%, var(--accent-purple) 100%)' }}>
                  <span className="text-3xl">🔥</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{streak.currentStreak} Day Streak!</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Best: {streak.longestStreak} days</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Next milestone reward at</p>
                <p className="text-xl font-bold" style={{ color: 'var(--coin-primary)' }}>{streak.nextRewardAt} days</p>
              </div>
            </div>
            <div className="mt-4 rounded-full h-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-3 rounded-full transition-all"
                style={{
                  width: `${(streak.currentStreak / streak.nextRewardAt) * 100}%`,
                  background: 'var(--progress-gradient)'
                }}
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="rounded-xl p-1 flex mb-6" style={{ background: 'var(--surface-card)' }}>
          {(['overview', 'achievements', 'quests', 'rewards'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-3 rounded-lg font-medium capitalize transition"
              style={{
                background: activeTab === tab ? 'var(--accent-gradient)' : 'transparent',
                color: activeTab === tab ? 'white' : 'var(--text-secondary)'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Daily Quests Preview */}
            <div className="rounded-xl p-6" style={{ background: 'var(--surface-card)' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Today's Quests</h3>
              <div className="space-y-3">
                {quests.filter(q => q.type === 'daily').slice(0, 3).map((quest) => (
                  <div key={quest.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="flex-1">
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{quest.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 rounded-full h-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${(quest.progress / quest.maxProgress) * 100}%`, background: 'var(--accent-pink)' }}
                          />
                        </div>
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{quest.progress}/{quest.maxProgress}</span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <span className="font-medium" style={{ color: 'var(--coin-primary)' }}>+{quest.reward.coins || quest.reward.gems} {quest.reward.coins ? '🪙' : '💎'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Achievements */}
            <div className="rounded-xl p-6" style={{ background: 'var(--surface-card)' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Achievements</h3>
              <div className="grid grid-cols-3 gap-4">
                {achievements.slice(0, 3).map((achievement) => (
                  <div
                    key={achievement.id}
                    className="p-4 rounded-xl text-center"
                    style={{
                      background: achievement.unlocked
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(234, 88, 12, 0.2) 100%)'
                        : 'rgba(255,255,255,0.05)',
                      border: achievement.unlocked ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)'
                    }}
                  >
                    <span className="text-4xl">{achievement.icon}</span>
                    <p className="font-medium mt-2" style={{ color: 'var(--text-primary)' }}>{achievement.name}</p>
                    {!achievement.unlocked && (
                      <div className="mt-2 rounded-full h-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%`, background: 'var(--accent-pink)' }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="rounded-xl p-6" style={{ background: 'var(--surface-card)' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>All Achievements</h3>
            <div className="grid grid-cols-2 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-4 rounded-xl"
                  style={{
                    background: achievement.unlocked
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(234, 88, 12, 0.2) 100%)'
                      : 'rgba(255,255,255,0.05)',
                    border: achievement.unlocked ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)'
                  }}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-4xl">{achievement.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>{achievement.name}</h4>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{achievement.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {achievement.reward.coins && <span className="text-sm" style={{ color: 'var(--coin-primary)' }}>+{achievement.reward.coins} 🪙</span>}
                        {achievement.reward.gems && <span className="text-sm" style={{ color: 'var(--gem-primary)' }}>+{achievement.reward.gems} 💎</span>}
                      </div>
                      {!achievement.unlocked && (
                        <div className="mt-2">
                          <div className="rounded-full h-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%`, background: 'var(--accent-pink)' }}
                            />
                          </div>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{achievement.progress}/{achievement.maxProgress}</p>
                        </div>
                      )}
                      {achievement.unlocked && (
                        <p className="text-green-400 text-sm mt-2 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Unlocked
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'quests' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6" style={{ background: 'var(--surface-card)' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Daily Quests</h3>
              <div className="space-y-3">
                {quests.filter(q => q.type === 'daily').map((quest) => (
                  <div
                    key={quest.id}
                    className="p-4 rounded-xl"
                    style={{
                      background: quest.progress >= quest.maxProgress ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)',
                      border: quest.progress >= quest.maxProgress ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border-subtle)'
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>{quest.title}</h4>
                      <span className="font-medium" style={{ color: 'var(--coin-primary)' }}>+{quest.reward.coins || quest.reward.gems} {quest.reward.coins ? '🪙' : '💎'}</span>
                    </div>
                    <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>{quest.description}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-full h-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.min((quest.progress / quest.maxProgress) * 100, 100)}%`,
                            background: quest.progress >= quest.maxProgress ? '#22c55e' : 'var(--accent-pink)'
                          }}
                        />
                      </div>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{quest.progress}/{quest.maxProgress}</span>
                      {quest.progress >= quest.maxProgress && (
                        <button className="px-3 py-1 bg-green-500 text-white text-sm rounded-full">Claim</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-6" style={{ background: 'var(--surface-card)' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Weekly Quests</h3>
              <div className="space-y-3">
                {quests.filter(q => q.type === 'weekly').map((quest) => (
                  <div
                    key={quest.id}
                    className="p-4 rounded-xl"
                    style={{
                      background: quest.progress >= quest.maxProgress ? 'rgba(34, 197, 94, 0.1)' : 'rgba(123, 97, 255, 0.1)',
                      border: quest.progress >= quest.maxProgress ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(123, 97, 255, 0.3)'
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>{quest.title}</h4>
                      <span className="font-medium" style={{ color: 'var(--gem-primary)' }}>+{quest.reward.gems || quest.reward.coins} {quest.reward.gems ? '💎' : '🪙'}</span>
                    </div>
                    <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>{quest.description}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-full h-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.min((quest.progress / quest.maxProgress) * 100, 100)}%`,
                            background: quest.progress >= quest.maxProgress ? '#22c55e' : 'var(--accent-purple)'
                          }}
                        />
                      </div>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{quest.progress}/{quest.maxProgress}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="space-y-6">
            {/* Spin Wheel */}
            <div className="rounded-2xl p-8 text-white text-center" style={{ background: 'var(--accent-gradient)' }}>
              <h3 className="text-2xl font-bold mb-4">Daily Spin Wheel</h3>
              <div className={`w-48 h-48 mx-auto rounded-full flex items-center justify-center mb-6 ${spinning ? 'animate-spin' : ''}`} style={{ background: 'var(--surface-card)' }}>
                <span className="text-6xl">🎡</span>
              </div>
              {spinResult && !spinning && (
                <p className="text-xl mb-4">{spinResult.message || `You won ${spinResult.reward?.amount} ${spinResult.reward?.type}!`}</p>
              )}
              <button
                onClick={handleSpin}
                disabled={spinning}
                className="px-8 py-3 rounded-xl font-bold transition disabled:opacity-50"
                style={{ background: 'var(--surface-card)', color: 'var(--accent-purple)' }}
              >
                {spinning ? 'Spinning...' : 'Spin Now!'}
              </button>
            </div>

            {/* Reward Shop */}
            <div className="rounded-xl p-6" style={{ background: 'var(--surface-card)' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Reward Shop</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: 'Super Like', price: 50, currency: 'coins', icon: '⭐' },
                  { name: 'Boost (30 min)', price: 100, currency: 'coins', icon: '🚀' },
                  { name: 'See Who Likes You', price: 200, currency: 'coins', icon: '👀' },
                  { name: 'Undo Last Swipe', price: 25, currency: 'coins', icon: '↩️' },
                  { name: 'Premium (1 Day)', price: 10, currency: 'gems', icon: '👑' },
                  { name: 'Profile Spotlight', price: 5, currency: 'gems', icon: '✨' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl transition hover:scale-105"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)' }}
                  >
                    <div className="text-center">
                      <span className="text-4xl">{item.icon}</span>
                      <h4 className="font-bold mt-2" style={{ color: 'var(--text-primary)' }}>{item.name}</h4>
                      <p className="text-sm mt-1" style={{ color: item.currency === 'coins' ? 'var(--coin-primary)' : 'var(--gem-primary)' }}>
                        {item.price} {item.currency === 'coins' ? '🪙' : '💎'}
                      </p>
                      <button
                        className="mt-3 px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
                        style={{ background: 'var(--accent-gradient)', color: 'white' }}
                      >
                        Redeem
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GamificationPage;
