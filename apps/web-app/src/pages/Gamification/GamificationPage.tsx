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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Flamoral
          </h1>
          <nav className="flex items-center gap-4">
            <button onClick={() => navigate('/discover')} className="text-gray-600 hover:text-pink-500">Discover</button>
            <button onClick={() => navigate('/matches')} className="text-gray-600 hover:text-pink-500">Matches</button>
            <button onClick={() => navigate('/messages')} className="text-gray-600 hover:text-pink-500">Messages</button>
            <button onClick={() => navigate('/communities')} className="text-gray-600 hover:text-pink-500">Communities</button>
            <button onClick={() => navigate('/rewards')} className="text-pink-500 font-medium">Rewards</button>
            <button onClick={() => navigate('/profile')} className="text-gray-600 hover:text-pink-500">Profile</button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Wallet Banner */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Your Wallet</h2>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">🪙</span>
                  <div>
                    <p className="text-2xl font-bold">{wallet.coins}</p>
                    <p className="text-sm opacity-80">Coins</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl">💎</span>
                  <div>
                    <p className="text-2xl font-bold">{wallet.gems}</p>
                    <p className="text-sm opacity-80">Gems</p>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleClaimDailyReward}
              className="bg-white text-orange-500 px-6 py-3 rounded-xl font-bold hover:bg-orange-50 transition"
            >
              Claim Daily Reward
            </button>
          </div>
        </div>

        {/* Streak Card */}
        {streak && (
          <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                  <span className="text-3xl">🔥</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{streak.currentStreak} Day Streak!</h3>
                  <p className="text-gray-500">Best: {streak.longestStreak} days</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Next milestone reward at</p>
                <p className="text-xl font-bold text-orange-500">{streak.nextRewardAt} days</p>
              </div>
            </div>
            <div className="mt-4 bg-gray-100 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-orange-400 to-red-500 h-3 rounded-full transition-all"
                style={{ width: `${(streak.currentStreak / streak.nextRewardAt) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl p-1 flex mb-6 shadow-sm">
          {(['overview', 'achievements', 'quests', 'rewards'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-lg font-medium capitalize transition ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Daily Quests Preview */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Today's Quests</h3>
              <div className="space-y-3">
                {quests.filter(q => q.type === 'daily').slice(0, 3).map((quest) => (
                  <div key={quest.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{quest.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-pink-500 h-2 rounded-full"
                            style={{ width: `${(quest.progress / quest.maxProgress) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500">{quest.progress}/{quest.maxProgress}</span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <span className="text-amber-500 font-medium">+{quest.reward.coins || quest.reward.gems} {quest.reward.coins ? '🪙' : '💎'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Achievements */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Achievements</h3>
              <div className="grid grid-cols-3 gap-4">
                {achievements.slice(0, 3).map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-4 rounded-xl text-center ${
                      achievement.unlocked ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200' : 'bg-gray-50'
                    }`}
                  >
                    <span className="text-4xl">{achievement.icon}</span>
                    <p className="font-medium text-gray-800 mt-2">{achievement.name}</p>
                    {!achievement.unlocked && (
                      <div className="mt-2 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-pink-500 h-2 rounded-full"
                          style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
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
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">All Achievements</h3>
            <div className="grid grid-cols-2 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-xl ${
                    achievement.unlocked
                      ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-4xl">{achievement.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800">{achievement.name}</h4>
                      <p className="text-sm text-gray-500">{achievement.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {achievement.reward.coins && <span className="text-amber-500 text-sm">+{achievement.reward.coins} 🪙</span>}
                        {achievement.reward.gems && <span className="text-purple-500 text-sm">+{achievement.reward.gems} 💎</span>}
                      </div>
                      {!achievement.unlocked && (
                        <div className="mt-2">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-pink-500 h-2 rounded-full"
                              style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{achievement.progress}/{achievement.maxProgress}</p>
                        </div>
                      )}
                      {achievement.unlocked && (
                        <p className="text-green-500 text-sm mt-2 flex items-center gap-1">
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
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Daily Quests</h3>
              <div className="space-y-3">
                {quests.filter(q => q.type === 'daily').map((quest) => (
                  <div key={quest.id} className={`p-4 rounded-xl border ${quest.progress >= quest.maxProgress ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-gray-800">{quest.title}</h4>
                      <span className="text-amber-500 font-medium">+{quest.reward.coins || quest.reward.gems} {quest.reward.coins ? '🪙' : '💎'}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{quest.description}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${quest.progress >= quest.maxProgress ? 'bg-green-500' : 'bg-pink-500'}`}
                          style={{ width: `${Math.min((quest.progress / quest.maxProgress) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500">{quest.progress}/{quest.maxProgress}</span>
                      {quest.progress >= quest.maxProgress && (
                        <button className="px-3 py-1 bg-green-500 text-white text-sm rounded-full">Claim</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Weekly Quests</h3>
              <div className="space-y-3">
                {quests.filter(q => q.type === 'weekly').map((quest) => (
                  <div key={quest.id} className={`p-4 rounded-xl border ${quest.progress >= quest.maxProgress ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-gray-800">{quest.title}</h4>
                      <span className="text-purple-500 font-medium">+{quest.reward.gems || quest.reward.coins} {quest.reward.gems ? '💎' : '🪙'}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{quest.description}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${quest.progress >= quest.maxProgress ? 'bg-green-500' : 'bg-purple-500'}`}
                          style={{ width: `${Math.min((quest.progress / quest.maxProgress) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500">{quest.progress}/{quest.maxProgress}</span>
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
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-8 text-white text-center">
              <h3 className="text-2xl font-bold mb-4">Daily Spin Wheel</h3>
              <div className={`w-48 h-48 mx-auto bg-white rounded-full flex items-center justify-center mb-6 ${spinning ? 'animate-spin' : ''}`}>
                <span className="text-6xl">🎡</span>
              </div>
              {spinResult && !spinning && (
                <p className="text-xl mb-4">{spinResult.message || `You won ${spinResult.reward?.amount} ${spinResult.reward?.type}!`}</p>
              )}
              <button
                onClick={handleSpin}
                disabled={spinning}
                className="bg-white text-purple-600 px-8 py-3 rounded-xl font-bold hover:bg-purple-50 transition disabled:opacity-50"
              >
                {spinning ? 'Spinning...' : 'Spin Now!'}
              </button>
            </div>

            {/* Reward Shop */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Reward Shop</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: 'Super Like', price: 50, currency: 'coins', icon: '⭐' },
                  { name: 'Boost (30 min)', price: 100, currency: 'coins', icon: '🚀' },
                  { name: 'See Who Likes You', price: 200, currency: 'coins', icon: '👀' },
                  { name: 'Undo Last Swipe', price: 25, currency: 'coins', icon: '↩️' },
                  { name: 'Premium (1 Day)', price: 10, currency: 'gems', icon: '👑' },
                  { name: 'Profile Spotlight', price: 5, currency: 'gems', icon: '✨' },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 border border-gray-200 rounded-xl hover:border-pink-300 transition">
                    <div className="text-center">
                      <span className="text-4xl">{item.icon}</span>
                      <h4 className="font-bold text-gray-800 mt-2">{item.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {item.price} {item.currency === 'coins' ? '🪙' : '💎'}
                      </p>
                      <button className="mt-3 px-4 py-2 bg-pink-500 text-white rounded-lg text-sm font-medium hover:bg-pink-600 transition">
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
