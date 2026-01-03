import React, { useState, useCallback } from 'react';

export interface CoinTransaction {
  id: string;
  amount: number;
  type: 'earned' | 'spent' | 'purchased';
  source: string;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

export interface CoinBalance {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  totalPurchased: number;
}

interface EarningMethod {
  type: string;
  name: string;
  description: string;
  coins: number;
  dailyLimit?: number;
}

interface PurchaseItem {
  icon: string;
  label: string;
  coins: number;
  id: string;
  description?: string;
}

interface Props {
  balance: CoinBalance;
  transactions: CoinTransaction[];
  earningMethods?: EarningMethod[];
  onPurchase?: (productId: string) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const transactionIcons: Record<string, { icon: string; color: string }> = {
  daily_login: { icon: '📅', color: '#4CAF50' },
  daily_reward_claim: { icon: '🎁', color: '#FFD700' },
  match_made: { icon: '💕', color: '#E91E63' },
  message_sent: { icon: '💬', color: '#2196F3' },
  streak_milestone: { icon: '🔥', color: '#FF5722' },
  achievement: { icon: '🏆', color: '#9C27B0' },
  referral: { icon: '👥', color: '#00BCD4' },
  purchase: { icon: '💳', color: '#4CAF50' },
  boost_purchase: { icon: '🚀', color: '#FF6B6B' },
  super_like_purchase: { icon: '⭐', color: '#FF1493' },
  streak_protection: { icon: '🛡️', color: '#4CAF50' },
  weekly_bonus: { icon: '🎊', color: '#FFD700' },
};

const PURCHASE_ITEMS: PurchaseItem[] = [
  { icon: '⭐', label: 'Super Like', coins: 50, id: 'super_like', description: 'Stand out to someone special' },
  { icon: '🚀', label: 'Boost', coins: 100, id: 'boost', description: 'Be seen by more people for 30 mins' },
  { icon: '↩️', label: 'Rewind', coins: 25, id: 'rewind', description: 'Undo your last swipe' },
  { icon: '👀', label: 'See Likes', coins: 200, id: 'see_likes', description: 'See who likes you' },
];

export const CoinWallet: React.FC<Props> = ({
  balance,
  transactions,
  earningMethods = [],
  onPurchase,
  loading = false,
  error = null,
  onRetry,
}) => {
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [confirmPurchase, setConfirmPurchase] = useState<PurchaseItem | null>(null);
  const [animateBalance, setAnimateBalance] = useState(false);

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }, []);

  const handlePurchaseClick = useCallback((item: PurchaseItem) => {
    if (balance.balance < item.coins) {
      setPurchaseError(`Not enough coins. You need ${item.coins - balance.balance} more coins.`);
      setTimeout(() => setPurchaseError(null), 3000);
      return;
    }
    setConfirmPurchase(item);
  }, [balance.balance]);

  const handleConfirmPurchase = useCallback(async () => {
    if (!confirmPurchase || !onPurchase) return;

    setPurchasingId(confirmPurchase.id);
    setPurchaseError(null);
    setConfirmPurchase(null);

    try {
      await onPurchase(confirmPurchase.id);
      setPurchaseSuccess(`Successfully purchased ${confirmPurchase.label}!`);
      setAnimateBalance(true);
      setTimeout(() => {
        setPurchaseSuccess(null);
        setAnimateBalance(false);
      }, 3000);
    } catch (err) {
      setPurchaseError(`Failed to purchase ${confirmPurchase.label}. Please try again.`);
      setTimeout(() => setPurchaseError(null), 3000);
    } finally {
      setPurchasingId(null);
    }
  }, [confirmPurchase, onPurchase]);

  const handleCancelPurchase = useCallback(() => {
    setConfirmPurchase(null);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div
          className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
          style={{ borderColor: 'var(--coin-primary)' }}
        />
        <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading wallet...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <span className="text-4xl mb-4">💳</span>
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
    <div className="space-y-6">
      {/* Success/Error Notifications */}
      {purchaseSuccess && (
        <div
          className="p-3 rounded-lg flex items-center gap-2 animate-pulse"
          style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)' }}
        >
          <span className="text-xl">✅</span>
          <p className="text-sm font-medium" style={{ color: '#4CAF50' }}>{purchaseSuccess}</p>
        </div>
      )}

      {purchaseError && (
        <div
          className="p-3 rounded-lg flex items-center gap-2"
          style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)' }}
        >
          <span className="text-xl">⚠️</span>
          <p className="text-sm font-medium" style={{ color: '#f44336' }}>{purchaseError}</p>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmPurchase && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={handleCancelPurchase}
        >
          <div
            className="p-6 rounded-2xl max-w-sm w-full"
            style={{ background: 'var(--surface-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <span className="text-5xl">{confirmPurchase.icon}</span>
              <h3 className="text-xl font-bold mt-3" style={{ color: 'var(--text-primary)' }}>
                Confirm Purchase
              </h3>
              <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
                {confirmPurchase.description}
              </p>
            </div>
            <div
              className="p-4 rounded-xl mb-4"
              style={{ background: 'rgba(255,215,0,0.1)' }}
            >
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>{confirmPurchase.label}</span>
                <span className="font-bold" style={{ color: 'var(--coin-primary)' }}>
                  {confirmPurchase.coins} 🪙
                </span>
              </div>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span style={{ color: 'var(--text-muted)' }}>Your balance after</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {(balance.balance - confirmPurchase.coins).toLocaleString()} 🪙
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelPurchase}
                className="flex-1 py-3 rounded-xl font-medium transition hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPurchase}
                className="flex-1 py-3 rounded-xl font-medium text-white transition hover:opacity-90"
                style={{ background: 'var(--accent-gradient)' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Card */}
      <div
        className={`p-6 rounded-2xl text-white transition-all duration-300 ${animateBalance ? 'scale-105' : ''}`}
        style={{
          background: 'linear-gradient(135deg, var(--coin-primary) 0%, #B8860B 100%)',
          boxShadow: animateBalance ? '0 0 30px rgba(255,215,0,0.5)' : 'none',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm opacity-80">Your Balance</p>
            <div className="flex items-center gap-2">
              <span className={`text-4xl ${animateBalance ? 'animate-bounce' : ''}`}>🪙</span>
              <span className="text-4xl font-bold">{balance.balance.toLocaleString()}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-80">Coins</p>
            <p className="text-lg font-bold">Available</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
          <div className="text-center">
            <p className="text-xs opacity-80">Total Earned</p>
            <p className="text-lg font-bold">{balance.totalEarned.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs opacity-80">Total Spent</p>
            <p className="text-lg font-bold">{balance.totalSpent.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs opacity-80">Purchased</p>
            <p className="text-lg font-bold">{balance.totalPurchased.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3">
        {PURCHASE_ITEMS.map((item) => {
          const canAfford = balance.balance >= item.coins;
          const isPurchasing = purchasingId === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handlePurchaseClick(item)}
              disabled={!canAfford || isPurchasing}
              className={`
                p-3 rounded-xl text-center transition-all duration-200 relative overflow-hidden
                ${canAfford && !isPurchasing ? 'hover:scale-105 hover:shadow-lg' : 'opacity-50 cursor-not-allowed'}
              `}
              style={{
                background: 'var(--surface-card)',
                border: `1px solid ${canAfford ? 'var(--border-subtle)' : 'transparent'}`,
              }}
            >
              {isPurchasing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                </div>
              )}
              <span className="text-2xl">{item.icon}</span>
              <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-primary)' }}>
                {item.label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: canAfford ? 'var(--coin-primary)' : '#f44336' }}>
                {item.coins} 🪙
              </p>
            </button>
          );
        })}
      </div>

      {/* Ways to Earn */}
      <div
        className="p-4 rounded-xl"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}
      >
        <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span>💰</span>
          Ways to Earn Coins
        </h3>
        <div className="space-y-2">
          {earningMethods.length > 0 ? (
            earningMethods.slice(0, 6).map((method, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {transactionIcons[method.type]?.icon || '🪙'}
                  </span>
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {method.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {method.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold" style={{ color: 'var(--coin-primary)' }}>
                    +{method.coins} 🪙
                  </p>
                  {method.dailyLimit && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {method.dailyLimit}x/day
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-2">
              {[
                { icon: '📅', name: 'Daily Login', desc: 'Log in each day', coins: 5 },
                { icon: '🎁', name: 'Claim Daily Reward', desc: 'Visit the rewards page', coins: 10 },
                { icon: '💕', name: 'Get a Match', desc: 'When you match with someone', coins: 3 },
                { icon: '💬', name: 'Send Messages', desc: 'Engage with your matches', coins: 1 },
                { icon: '🔥', name: 'Streak Milestones', desc: 'Maintain your streaks', coins: 25 },
                { icon: '🏆', name: 'Unlock Achievements', desc: 'Complete achievements', coins: 10 },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        {item.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold" style={{ color: 'var(--coin-primary)' }}>
                    +{item.coins} 🪙
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div
        className="p-4 rounded-xl"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}
      >
        <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span>📜</span>
          Recent Transactions
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {transactions.length > 0 ? (
            transactions.map((tx) => {
              const { icon, color } = transactionIcons[tx.source] || { icon: '🪙', color: 'var(--coin-primary)' };
              const isPositive = tx.type === 'earned' || tx.type === 'purchased';

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        {tx.description}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className="font-bold"
                      style={{ color: isPositive ? '#4CAF50' : '#f44336' }}
                    >
                      {isPositive ? '+' : '-'}{Math.abs(tx.amount)} 🪙
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Bal: {tx.balanceAfter}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
              No transactions yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoinWallet;
