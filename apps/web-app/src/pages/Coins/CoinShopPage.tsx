import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '../../components/Navigation';
import { authTokenService } from '../../services/auth-token.service';

interface CoinPackage {
  id: string;
  coins: number;
  price: number;
  currency: string;
  bonus: number;
  popular?: boolean;
  savings?: string;
}

interface CoinBalance {
  balance: number;
  pendingBalance: number;
}

export const CoinShopPage: React.FC = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [balance, setBalance] = useState<CoinBalance>({ balance: 0, pendingBalance: 0 });
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const defaultPackages: CoinPackage[] = [
    {
      id: 'coins_100',
      coins: 100,
      price: 4.99,
      currency: 'USD',
      bonus: 0,
    },
    {
      id: 'coins_300',
      coins: 300,
      price: 12.99,
      currency: 'USD',
      bonus: 30,
      savings: 'Save 13%',
    },
    {
      id: 'coins_500',
      coins: 500,
      price: 19.99,
      currency: 'USD',
      bonus: 75,
      popular: true,
      savings: 'Save 20%',
    },
    {
      id: 'coins_1000',
      coins: 1000,
      price: 34.99,
      currency: 'USD',
      bonus: 200,
      savings: 'Save 30%',
    },
    {
      id: 'coins_2500',
      coins: 2500,
      price: 79.99,
      currency: 'USD',
      bonus: 750,
      savings: 'Save 36%',
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = authTokenService.getToken();
      const headers: HeadersInit = { 'Authorization': `Bearer ${token}` };

      // Load packages
      const pkgRes = await fetch('/api/coins/packages', { headers });
      if (pkgRes.ok) {
        const pkgData = await pkgRes.json();
        setPackages(pkgData.data?.packages || defaultPackages);
      } else {
        setPackages(defaultPackages);
      }

      // Load balance
      const balRes = await fetch('/api/coins/balance', { headers });
      if (balRes.ok) {
        const balData = await balRes.json();
        setBalance(balData.data || { balance: 0, pendingBalance: 0 });
      }
    } catch (err) {
      console.error('Failed to load coin shop data:', err);
      setPackages(defaultPackages);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: CoinPackage) => {
    setPurchasing(pkg.id);
    try {
      const token = authTokenService.getToken();
      const res = await fetch('/api/coins/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ packageId: pkg.id }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data?.checkoutUrl) {
          window.location.href = data.data.checkoutUrl;
        } else {
          // Purchase successful
          await loadData();
          alert(`Successfully purchased ${pkg.coins + pkg.bonus} coins!`);
        }
      } else {
        alert('Purchase failed. Please try again.');
      }
    } catch (err) {
      console.error('Purchase failed:', err);
      alert('Purchase failed. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
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
      <Navigation />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Coin Shop</h1>
          <p className="text-gray-600">Purchase coins to unlock premium features and boosts</p>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl shadow-lg p-6 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm mb-1">Your Balance</p>
              <div className="flex items-center gap-3">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#F59E0B">C</text>
                </svg>
                <p className="coin-balance text-4xl font-bold" data-testid="coins">{balance.balance.toLocaleString()}</p>
              </div>
              {balance.pendingBalance > 0 && (
                <p className="text-amber-100 text-sm mt-2">
                  +{balance.pendingBalance} pending
                </p>
              )}
            </div>
            <button
              onClick={() => navigate('/coins/history')}
              className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
            >
              View History
            </button>
          </div>
        </div>

        {/* Coin Uses */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">What can you do with coins?</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-800">Super Likes</p>
                <p className="text-sm text-gray-600">Stand out with 3x the impact</p>
                <p className="text-xs text-pink-500 font-medium mt-1">1 coin each</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-800">Profile Boosts</p>
                <p className="text-sm text-gray-600">Be seen by 10x more people</p>
                <p className="text-xs text-pink-500 font-medium mt-1">5 coins each</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-800">Rewinds</p>
                <p className="text-sm text-gray-600">Undo accidental passes</p>
                <p className="text-xs text-pink-500 font-medium mt-1">2 coins each</p>
              </div>
            </div>
          </div>
        </div>

        {/* Packages Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              data-testid="coin-package"
              className={`coin-package package-card bg-white rounded-xl shadow-sm overflow-hidden ${
                pkg.popular ? 'ring-2 ring-pink-500 transform scale-105' : ''
              }`}
            >
              {pkg.popular && (
                <div className="bg-pink-500 text-white text-center py-2 text-sm font-medium">
                  Most Popular
                </div>
              )}

              <div className="p-6">
                {/* Package Header */}
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <text x="12" y="16" textAnchor="middle" fontSize="10" fill="#F59E0B">C</text>
                    </svg>
                  </div>

                  <h3 className="text-3xl font-bold text-gray-800 mb-1">
                    {(pkg.coins + pkg.bonus).toLocaleString()}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {pkg.coins.toLocaleString()} coins
                    {pkg.bonus > 0 && (
                      <span className="text-green-500 font-medium"> +{pkg.bonus} bonus</span>
                    )}
                  </p>
                </div>

                {/* Price */}
                <div className="text-center mb-6">
                  <p className="text-2xl font-bold text-pink-500">
                    {formatPrice(pkg.price, pkg.currency)}
                  </p>
                  {pkg.savings && (
                    <p className="text-sm text-green-500 font-medium mt-1">{pkg.savings}</p>
                  )}
                </div>

                {/* Purchase Button */}
                <button
                  onClick={() => handlePurchase(pkg)}
                  disabled={purchasing === pkg.id}
                  className={`w-full py-3 rounded-xl font-semibold transition ${
                    pkg.popular
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {purchasing === pkg.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Purchase'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Premium Alternative */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg p-6 text-white text-center">
          <h3 className="text-2xl font-bold mb-2">Want Unlimited Access?</h3>
          <p className="mb-4 opacity-90">
            Upgrade to Premium and get unlimited Super Likes, Boosts, and more!
          </p>
          <button
            onClick={() => navigate('/subscription')}
            className="px-6 py-3 bg-white text-pink-500 rounded-lg font-semibold hover:bg-pink-50 transition"
          >
            View Premium Plans
          </button>
        </div>

        {/* FAQ */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-800 mb-1">Do coins expire?</h4>
              <p className="text-sm text-gray-600">No, coins never expire. Use them whenever you want!</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-1">Can I get a refund?</h4>
              <p className="text-sm text-gray-600">
                Coin purchases are non-refundable. However, if you experience any issues, please contact support.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-1">How do I earn free coins?</h4>
              <p className="text-sm text-gray-600">
                You can earn free coins by completing your profile, verifying your account, and referring friends!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CoinShopPage;
