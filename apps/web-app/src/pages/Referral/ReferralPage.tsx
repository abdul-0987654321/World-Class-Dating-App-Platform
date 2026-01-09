import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authTokenService } from '../../services/auth-token.service';

interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalEarned: { coins: number; gems: number };
  currentTier: string;
  nextTier: string;
  referralsToNextTier: number;
}

interface ReferralTier {
  name: string;
  minReferrals: number;
  rewardMultiplier: number;
  bonusCoins: number;
  color: string;
}

const REFERRAL_TIERS: ReferralTier[] = [
  { name: 'Bronze', minReferrals: 0, rewardMultiplier: 1, bonusCoins: 50, color: 'from-amber-600 to-amber-700' },
  { name: 'Silver', minReferrals: 5, rewardMultiplier: 1.5, bonusCoins: 100, color: 'from-gray-400 to-gray-500' },
  { name: 'Gold', minReferrals: 15, rewardMultiplier: 2, bonusCoins: 200, color: 'from-yellow-400 to-yellow-500' },
  { name: 'Platinum', minReferrals: 30, rewardMultiplier: 2.5, bonusCoins: 350, color: 'from-purple-400 to-purple-500' },
  { name: 'Diamond', minReferrals: 50, rewardMultiplier: 3, bonusCoins: 500, color: 'from-cyan-400 to-cyan-500' },
  { name: 'Elite', minReferrals: 100, rewardMultiplier: 4, bonusCoins: 1000, color: 'from-pink-500 to-rose-500' },
  { name: 'Legend', minReferrals: 200, rewardMultiplier: 5, bonusCoins: 2500, color: 'from-red-500 to-orange-500' },
];

export const ReferralPage: React.FC = () => {
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [showCustomCodeModal, setShowCustomCodeModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 12,
    successfulReferrals: 8,
    pendingReferrals: 4,
    totalEarned: { coins: 800, gems: 40 },
    currentTier: 'Silver',
    nextTier: 'Gold',
    referralsToNextTier: 7,
  });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const token = authTokenService.getToken();
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Get referral code
      const codeRes = await fetch('/api/referrals/code', { headers });
      if (codeRes.ok) {
        const codeData = await codeRes.json();
        setReferralCode(codeData.data?.code || 'FLAMORAL-ABC123');
      } else {
        setReferralCode('FLAMORAL-ABC123');
      }

      // Get stats
      const statsRes = await fetch('/api/referrals/stats', { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.data) {
          setStats(statsData.data);
        }
      }

      // Get leaderboard
      const leaderRes = await fetch('/api/referrals/leaderboard', { headers });
      if (leaderRes.ok) {
        const leaderData = await leaderRes.json();
        setLeaderboard(leaderData.data?.leaderboard || []);
      }
    } catch (err) {
      console.error('Failed to load referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async (platform: string) => {
    const shareUrl = `https://flamoral.app/join?ref=${referralCode}`;
    const shareText = `Join me on Flamoral - the best dating app! Use my code ${referralCode} for bonus rewards!`;

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent('Join Flamoral!')}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;
        break;
    }
  };

  const handleSetCustomCode = async () => {
    if (!customCode || customCode.length < 4) return;

    try {
      const token = authTokenService.getToken();
      const res = await fetch('/api/referrals/code/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ code: customCode }),
      });

      if (res.ok) {
        setReferralCode(customCode);
        setShowCustomCodeModal(false);
        setCustomCode('');
      }
    } catch (err) {
      console.error('Failed to set custom code:', err);
    }
  };

  const getCurrentTierIndex = () => {
    return REFERRAL_TIERS.findIndex(t => t.name === stats.currentTier);
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
          <nav className="flex items-center gap-6">
            <button onClick={() => navigate('/discover')} className="text-gray-600 hover:text-pink-500">Discover</button>
            <button onClick={() => navigate('/matches')} className="text-gray-600 hover:text-pink-500">Matches</button>
            <button onClick={() => navigate('/messages')} className="text-gray-600 hover:text-pink-500">Messages</button>
            <button onClick={() => navigate('/rewards')} className="text-gray-600 hover:text-pink-500">Rewards</button>
            <button onClick={() => navigate('/referrals')} className="text-pink-500 font-medium">Referrals</button>
            <button onClick={() => navigate('/profile')} className="text-gray-600 hover:text-pink-500">Profile</button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl p-8 text-white mb-6">
          <h2 className="text-3xl font-bold mb-2">Invite Friends, Earn Rewards!</h2>
          <p className="text-pink-100 mb-6">
            Share your unique referral code and earn coins when friends join Flamoral
          </p>

          {/* Referral Code Display */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
            <p className="text-sm text-pink-100 mb-2">Your Referral Code</p>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-white rounded-lg px-6 py-4 text-2xl font-bold text-gray-800 tracking-wider text-center">
                {referralCode}
              </div>
              <button
                onClick={handleCopyCode}
                className="px-6 py-4 bg-white rounded-lg text-pink-500 font-medium hover:bg-pink-50 transition"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={() => setShowCustomCodeModal(true)}
                className="px-6 py-4 bg-pink-600 rounded-lg text-white font-medium hover:bg-pink-700 transition"
              >
                Customize
              </button>
            </div>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Share Your Code</h3>
          <div className="grid grid-cols-4 gap-4">
            <button
              onClick={() => handleShare('whatsapp')}
              className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition"
            >
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <span className="text-sm text-gray-600">WhatsApp</span>
            </button>
            <button
              onClick={() => handleShare('twitter')}
              className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition"
            >
              <div className="w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </div>
              <span className="text-sm text-gray-600">Twitter</span>
            </button>
            <button
              onClick={() => handleShare('facebook')}
              className="flex flex-col items-center gap-2 p-4 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition"
            >
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <span className="text-sm text-gray-600">Facebook</span>
            </button>
            <button
              onClick={() => handleShare('email')}
              className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
            >
              <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm text-gray-600">Email</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-pink-500">{stats.totalReferrals}</p>
            <p className="text-sm text-gray-500">Total Referrals</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-green-500">{stats.successfulReferrals}</p>
            <p className="text-sm text-gray-500">Successful</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-yellow-500">{stats.pendingReferrals}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-purple-500">{stats.totalEarned.coins}</p>
            <p className="text-sm text-gray-500">Coins Earned</p>
          </div>
        </div>

        {/* Tier Progress */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Referral Tier Progress</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${REFERRAL_TIERS[getCurrentTierIndex()]?.color || 'from-gray-400 to-gray-500'} flex items-center justify-center`}>
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl font-bold text-gray-800">{stats.currentTier}</span>
                <span className="text-sm text-gray-500">
                  {stats.referralsToNextTier > 0 ? `${stats.referralsToNextTier} more to ${stats.nextTier}` : 'Max tier reached!'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`bg-gradient-to-r ${REFERRAL_TIERS[getCurrentTierIndex()]?.color || 'from-gray-400 to-gray-500'} h-3 rounded-full transition-all duration-500`}
                  style={{
                    width: stats.referralsToNextTier > 0
                      ? `${((stats.successfulReferrals - REFERRAL_TIERS[getCurrentTierIndex()]?.minReferrals || 0) /
                        (REFERRAL_TIERS[getCurrentTierIndex() + 1]?.minReferrals - REFERRAL_TIERS[getCurrentTierIndex()]?.minReferrals || 1)) * 100}%`
                      : '100%'
                  }}
                />
              </div>
            </div>
          </div>

          {/* All Tiers */}
          <div className="grid grid-cols-7 gap-2 mt-6">
            {REFERRAL_TIERS.map((tier, idx) => (
              <div
                key={tier.name}
                className={`p-3 rounded-lg text-center ${idx <= getCurrentTierIndex() ? 'bg-gradient-to-br ' + tier.color + ' text-white' : 'bg-gray-100 text-gray-400'}`}
              >
                <p className="text-xs font-medium">{tier.name}</p>
                <p className="text-lg font-bold">{tier.minReferrals}+</p>
                <p className="text-xs">{tier.rewardMultiplier}x rewards</p>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">How It Works</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-pink-500">1</span>
              </div>
              <h4 className="font-medium text-gray-800 mb-1">Share Your Code</h4>
              <p className="text-sm text-gray-500">Send your unique referral code to friends</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-purple-500">2</span>
              </div>
              <h4 className="font-medium text-gray-800 mb-1">Friends Join</h4>
              <p className="text-sm text-gray-500">They sign up using your code</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-green-500">3</span>
              </div>
              <h4 className="font-medium text-gray-800 mb-1">Both Earn Rewards</h4>
              <p className="text-sm text-gray-500">You both get bonus coins!</p>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Referrers This Month</h3>
            <div className="space-y-3">
              {leaderboard.slice(0, 10).map((user, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    idx === 0 ? 'bg-yellow-400 text-white' :
                    idx === 1 ? 'bg-gray-400 text-white' :
                    idx === 2 ? 'bg-amber-600 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <img
                    src={user.photo || `https://ui-avatars.com/api/?name=${user.name}`}
                    alt={user.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <span className="flex-1 font-medium text-gray-800">{user.name}</span>
                  <span className="text-pink-500 font-bold">{user.referrals} referrals</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Custom Code Modal */}
      {showCustomCodeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Customize Your Code</h3>
            <p className="text-gray-500 mb-4">Create a memorable referral code (4-12 characters, letters and numbers only)</p>
            <input
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))}
              placeholder="MYCODE123"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCustomCodeModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSetCustomCode}
                disabled={customCode.length < 4}
                className="flex-1 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition disabled:opacity-50"
              >
                Set Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralPage;
