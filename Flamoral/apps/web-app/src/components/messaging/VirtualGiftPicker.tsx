/**
 * Virtual Gift Picker Component
 * WeChat-style virtual gifts for in-chat monetization
 */

import React, { useState, useEffect, useRef } from 'react';
import { coinService, CoinBalance } from '../../services';

export interface VirtualGift {
  id: string;
  name: string;
  emoji: string;
  price: number;
  animation?: string;
  category: 'basic' | 'premium' | 'luxury';
  description: string;
}

interface VirtualGiftPickerProps {
  onSelect: (gift: VirtualGift) => void;
  onClose: () => void;
  isOpen: boolean;
  recipientName: string;
}

// Virtual gifts catalog - WeChat/dating app style
const GIFT_CATALOG: VirtualGift[] = [
  // Basic gifts (free or low cost)
  { id: 'rose', name: 'Rose', emoji: '🌹', price: 5, category: 'basic', description: 'A classic romantic gesture' },
  { id: 'heart', name: 'Heart', emoji: '❤️', price: 5, category: 'basic', description: 'Show your love' },
  { id: 'kiss', name: 'Kiss', emoji: '💋', price: 10, category: 'basic', description: 'Blow them a kiss' },
  { id: 'hug', name: 'Hug', emoji: '🤗', price: 10, category: 'basic', description: 'Virtual warm hug' },
  { id: 'flowers', name: 'Flowers', emoji: '💐', price: 15, category: 'basic', description: 'A beautiful bouquet' },
  { id: 'chocolate', name: 'Chocolate', emoji: '🍫', price: 15, category: 'basic', description: 'Sweet treat' },

  // Premium gifts
  { id: 'teddy', name: 'Teddy Bear', emoji: '🧸', price: 50, category: 'premium', description: 'Cute and cuddly' },
  { id: 'perfume', name: 'Perfume', emoji: '🧴', price: 75, category: 'premium', description: 'Fragrant luxury' },
  { id: 'wine', name: 'Wine', emoji: '🍷', price: 100, category: 'premium', description: 'Cheers to us!' },
  { id: 'ring', name: 'Ring', emoji: '💍', price: 150, category: 'premium', description: 'A promise of commitment' },
  { id: 'fireworks', name: 'Fireworks', emoji: '🎆', price: 200, category: 'premium', description: 'Celebrate your connection' },

  // Luxury gifts
  { id: 'crown', name: 'Crown', emoji: '👑', price: 500, category: 'luxury', description: 'For royalty' },
  { id: 'diamond', name: 'Diamond', emoji: '💎', price: 750, category: 'luxury', description: 'Rare and precious' },
  { id: 'castle', name: 'Castle', emoji: '🏰', price: 1000, category: 'luxury', description: 'A fairy tale gift' },
  { id: 'rocket', name: 'Rocket', emoji: '🚀', price: 1500, category: 'luxury', description: 'Out of this world!' },
  { id: 'yacht', name: 'Yacht', emoji: '🛥️', price: 2000, category: 'luxury', description: 'Ultimate luxury' },
];

export const VirtualGiftPicker: React.FC<VirtualGiftPickerProps> = ({
  onSelect,
  onClose,
  isOpen,
  recipientName,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'basic' | 'premium' | 'luxury'>('basic');
  const [balance, setBalance] = useState<CoinBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedGift, setSelectedGift] = useState<VirtualGift | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch coin balance
  useEffect(() => {
    if (isOpen) {
      fetchBalance();
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const fetchBalance = async () => {
    setLoading(true);
    try {
      const bal = await coinService.getBalance();
      setBalance(bal);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendGift = async () => {
    if (!selectedGift || !balance) return;

    if (balance.coins < selectedGift.price) {
      // Show upgrade prompt
      alert('Not enough coins! Visit the shop to buy more.');
      return;
    }

    setSending(true);
    try {
      // This would call the API to send the gift
      onSelect(selectedGift);
      onClose();
    } catch (err) {
      console.error('Failed to send gift:', err);
    } finally {
      setSending(false);
    }
  };

  const filteredGifts = GIFT_CATALOG.filter((gift) => gift.category === selectedCategory);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 mb-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-pink-500 to-purple-600">
        <div className="flex items-center justify-between text-white">
          <div>
            <h3 className="font-semibold">Send a Gift</h3>
            <p className="text-sm text-white/80">to {recipientName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/80">Your Balance</p>
            <p className="font-bold text-lg">
              {loading ? '...' : balance?.coins || 0} coins
            </p>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-gray-100">
        {(['basic', 'premium', 'luxury'] as const).map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'text-pink-600 border-b-2 border-pink-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {category === 'basic' && '💝 Basic'}
            {category === 'premium' && '✨ Premium'}
            {category === 'luxury' && '👑 Luxury'}
          </button>
        ))}
      </div>

      {/* Gift Grid */}
      <div className="p-3 max-h-64 overflow-y-auto">
        <div className="grid grid-cols-3 gap-2">
          {filteredGifts.map((gift) => (
            <button
              key={gift.id}
              onClick={() => setSelectedGift(gift)}
              disabled={!!(balance && balance.coins < gift.price)}
              className={`p-3 rounded-xl border-2 transition-all ${
                selectedGift?.id === gift.id
                  ? 'border-pink-500 bg-pink-50'
                  : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
              } ${
                balance && balance.coins < gift.price
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              <div className="text-3xl mb-1">{gift.emoji}</div>
              <div className="text-xs font-medium text-gray-700">{gift.name}</div>
              <div className="text-xs text-pink-600 font-semibold">{gift.price} coins</div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Gift Preview */}
      {selectedGift && (
        <div className="p-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{selectedGift.emoji}</div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{selectedGift.name}</p>
              <p className="text-xs text-gray-500">{selectedGift.description}</p>
            </div>
            <button
              onClick={handleSendGift}
              disabled={sending || !!(balance && balance.coins < selectedGift.price)}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : `Send (${selectedGift.price})`}
            </button>
          </div>
        </div>
      )}

      {/* Buy More Coins Link */}
      <div className="p-2 text-center border-t border-gray-100">
        <button className="text-sm text-pink-600 hover:text-pink-700 font-medium">
          Need more coins? Visit the shop
        </button>
      </div>
    </div>
  );
};

// Display component for showing a gift in chat
interface GiftMessageProps {
  gift: VirtualGift;
  senderName: string;
  isFromMe: boolean;
}

export const GiftMessage: React.FC<GiftMessageProps> = ({ gift, senderName, isFromMe }) => {
  return (
    <div className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`p-4 rounded-2xl text-center ${
          isFromMe
            ? 'bg-gradient-to-r from-pink-500 to-purple-600'
            : 'bg-gradient-to-r from-purple-500 to-pink-500'
        }`}
      >
        <div className="text-5xl mb-2 animate-bounce">{gift.emoji}</div>
        <p className="text-white font-semibold">{gift.name}</p>
        <p className="text-white/80 text-xs mt-1">
          {isFromMe ? `You sent a gift` : `${senderName} sent a gift`}
        </p>
      </div>
    </div>
  );
};

export default VirtualGiftPicker;
