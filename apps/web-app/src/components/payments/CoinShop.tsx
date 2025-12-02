/**
 * CoinShop Component
 * Purchase coins and boosts with multiple payment providers
 */

import React, { useState, useEffect } from 'react';
import { PaymentCheckout } from './PaymentCheckout';

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  type: 'coins' | 'boost' | 'super_like';
  price: number;
  currency: string;
  coinAmount?: number;
  boostCount?: number;
  boostDurationMinutes?: number;
  isFeatured?: boolean;
}

interface Wallet {
  coins: number;
  gems: number;
  bonusCoins: number;
}

export const CoinShop: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'coins' | 'boosts' | 'super_likes'>('coins');
  const [showCheckout, setShowCheckout] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      // Load products
      const productsRes = await fetch('/api/payments/products', { headers });
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
      }

      // Load wallet
      const walletRes = await fetch('/api/payments/wallet', { headers });
      if (walletRes.ok) {
        const data = await walletRes.json();
        setWallet(data.wallet);
      }
    } catch (err) {
      console.error('Failed to load shop data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = (product: Product) => {
    setSelectedProduct(product);
    setShowCheckout(true);
  };

  const handlePurchaseSuccess = (result: any) => {
    console.log('Purchase successful:', result);
    setPurchaseSuccess(true);
    setShowCheckout(false);
    setSelectedProduct(null);
    // Reload wallet
    loadData();
    // Show success message for 3 seconds
    setTimeout(() => setPurchaseSuccess(false), 3000);
  };

  const handlePurchaseError = (error: string) => {
    console.error('Purchase failed:', error);
    alert(`Purchase failed: ${error}`);
  };

  const filteredProducts = products.filter((p) => {
    if (activeTab === 'coins') return p.type === 'coins';
    if (activeTab === 'boosts') return p.type === 'boost';
    if (activeTab === 'super_likes') return p.type === 'super_like';
    return false;
  });

  const getCoinIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#FFD700" />
      <circle cx="12" cy="12" r="8" fill="#FFC107" />
      <text x="12" y="16" textAnchor="middle" fill="#996600" fontSize="10" fontWeight="bold">C</text>
    </svg>
  );

  const getBoostIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path fill="#9333EA" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );

  const getSuperLikeIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path fill="#3B82F6" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Success Message */}
      {purchaseSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Purchase successful! Your coins have been added.
        </div>
      )}

      {/* Wallet Display */}
      <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl p-6 text-white mb-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-yellow-100 text-sm">Your Balance</p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                {getCoinIcon()}
                <span className="text-3xl font-bold">{wallet?.coins || 0}</span>
                <span className="text-yellow-100">Coins</span>
              </div>
              {(wallet?.gems || 0) > 0 && (
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-2xl">💎</span>
                  <span className="text-2xl font-bold">{wallet?.gems || 0}</span>
                  <span className="text-yellow-100">Gems</span>
                </div>
              )}
            </div>
            {(wallet?.bonusCoins || 0) > 0 && (
              <p className="text-yellow-100 text-sm mt-1">
                + {wallet?.bonusCoins || 0} bonus coins
              </p>
            )}
          </div>
          <div className="text-right">
            <button
              onClick={() => window.location.href = '/wallet/history'}
              className="text-yellow-100 hover:text-white text-sm underline"
            >
              View History
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('coins')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition ${
            activeTab === 'coins'
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {getCoinIcon()}
          Coins
        </button>
        <button
          onClick={() => setActiveTab('boosts')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition ${
            activeTab === 'boosts'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {getBoostIcon()}
          Boosts
        </button>
        <button
          onClick={() => setActiveTab('super_likes')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition ${
            activeTab === 'super_likes'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {getSuperLikeIcon()}
          Super Likes
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className={`bg-white rounded-2xl shadow-sm overflow-hidden ${
              product.isFeatured ? 'ring-2 ring-purple-500' : ''
            }`}
          >
            {product.isFeatured && (
              <div className="bg-purple-500 text-white text-center py-1 text-xs font-medium">
                Best Value
              </div>
            )}
            <div className="p-6">
              {/* Product Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-full flex items-center justify-center">
                  {product.type === 'coins' && (
                    <div className="relative">
                      <span className="text-4xl">🪙</span>
                      {product.coinAmount && product.coinAmount >= 500 && (
                        <span className="absolute -top-2 -right-2 text-2xl">✨</span>
                      )}
                    </div>
                  )}
                  {product.type === 'boost' && (
                    <span className="text-4xl">⚡</span>
                  )}
                  {product.type === 'super_like' && (
                    <span className="text-4xl">⭐</span>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <h3 className="text-xl font-bold text-gray-800 text-center mb-1">
                {product.name}
              </h3>
              {product.description && (
                <p className="text-gray-500 text-sm text-center mb-3">
                  {product.description}
                </p>
              )}

              {/* Amount */}
              {product.type === 'coins' && product.coinAmount && (
                <div className="flex items-center justify-center gap-1 text-yellow-600 mb-3">
                  {getCoinIcon()}
                  <span className="font-bold">{product.coinAmount}</span>
                </div>
              )}
              {product.type === 'boost' && (
                <div className="text-center text-purple-600 mb-3">
                  <span className="font-bold">{product.boostCount}x</span>
                  <span className="text-sm ml-1">
                    ({product.boostDurationMinutes} min each)
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="text-center mb-4">
                <span className="text-2xl font-bold text-gray-800">
                  ${(product.price / 100).toFixed(2)}
                </span>
                {product.type === 'coins' && product.coinAmount && (
                  <span className="text-gray-500 text-sm block">
                    ${((product.price / 100) / product.coinAmount * 100).toFixed(2)} per 100
                  </span>
                )}
              </div>

              {/* Buy Button */}
              <button
                onClick={() => handlePurchase(product)}
                className={`w-full py-3 rounded-xl font-medium transition ${
                  product.type === 'coins'
                    ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white hover:opacity-90'
                    : product.type === 'boost'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:opacity-90'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:opacity-90'
                }`}
              >
                Purchase
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No {activeTab.replace('_', ' ')} available at the moment.</p>
        </div>
      )}

      {/* What Can You Do With Coins */}
      {activeTab === 'coins' && (
        <div className="mt-8 bg-gray-50 rounded-2xl p-6">
          <h3 className="font-bold text-gray-800 mb-4">What can you do with Coins?</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <p className="font-medium text-gray-800">Boosts</p>
                <p className="text-sm text-gray-500">Get more visibility</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⭐</span>
              <div>
                <p className="font-medium text-gray-800">Super Likes</p>
                <p className="text-sm text-gray-500">Stand out from the crowd</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <div>
                <p className="font-medium text-gray-800">Gifts</p>
                <p className="text-sm text-gray-500">Send virtual gifts</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">💬</span>
              <div>
                <p className="font-medium text-gray-800">Message First</p>
                <p className="text-sm text-gray-500">Skip the queue</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <PaymentCheckout
            product={{
              id: selectedProduct.id,
              name: selectedProduct.name,
              description: selectedProduct.description,
              price: selectedProduct.price,
              currency: selectedProduct.currency,
              type: selectedProduct.type,
            }}
            onSuccess={handlePurchaseSuccess}
            onCancel={() => {
              setShowCheckout(false);
              setSelectedProduct(null);
            }}
            onError={handlePurchaseError}
          />
        </div>
      )}
    </div>
  );
};

export default CoinShop;
