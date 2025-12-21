/**
 * Upgrade Modal Component
 * Displayed when server returns 402 Payment Required
 * This component handles upgrade prompts without client-side tier enforcement
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  message?: string;
  requiredTier?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  feature,
  message,
  requiredTier = 'GOLD',
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const featureDescriptions: { [key: string]: { title: string; description: string; icon: string } } = {
    super_like: {
      title: 'Super Like',
      description: 'Stand out from the crowd and show someone you really like them',
      icon: '(star)',
    },
    unlimited_likes: {
      title: 'Unlimited Likes',
      description: 'Like as many profiles as you want without daily limits',
      icon: '(heart)',
    },
    see_who_likes_you: {
      title: 'See Who Likes You',
      description: 'View all the people who have already liked your profile',
      icon: '(eye)',
    },
    video_call: {
      title: 'Video Calls',
      description: 'Connect face-to-face before meeting in person',
      icon: '(camera)',
    },
    advanced_filters: {
      title: 'Advanced Filters',
      description: 'Filter by education, lifestyle choices, and more',
      icon: '(filter)',
    },
    incognito_mode: {
      title: 'Incognito Mode',
      description: 'Browse profiles privately without being seen',
      icon: '(eye-off)',
    },
    read_receipts: {
      title: 'Read Receipts',
      description: 'See when your messages have been read',
      icon: '(check)',
    },
    boost: {
      title: 'Profile Boost',
      description: 'Be one of the top profiles in your area',
      icon: '(rocket)',
    },
    rewind: {
      title: 'Rewind',
      description: 'Undo your last swipe and get a second chance',
      icon: '(undo)',
    },
    default: {
      title: 'Premium Feature',
      description: message || 'This feature requires a premium subscription',
      icon: '(lock)',
    },
  };

  const featureInfo = feature && featureDescriptions[feature]
    ? featureDescriptions[feature]
    : featureDescriptions.default;

  const tierColors: { [key: string]: string } = {
    GOLD: 'from-yellow-400 to-amber-500',
    PLATINUM: 'from-purple-500 to-indigo-600',
    DIAMOND: 'from-cyan-400 to-blue-500',
    ELITE: 'from-rose-500 to-pink-600',
  };

  const tierColor = tierColors[requiredTier] || tierColors.GOLD;

  const handleUpgrade = () => {
    onClose();
    navigate('/subscription');
  };

  const handleBuyCoins = () => {
    onClose();
    navigate('/coins');
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${tierColor} p-6 text-white relative overflow-hidden`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative">
            <div className="text-4xl mb-3">{featureInfo.icon}</div>
            <h2 className="text-2xl font-bold mb-1">{featureInfo.title}</h2>
            <p className="text-white/90 text-sm">{featureInfo.description}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Message */}
          <div className="text-center mb-6">
            <p className="text-gray-600">
              {message || `Upgrade to ${requiredTier} to unlock this feature and many more!`}
            </p>
          </div>

          {/* Benefits Preview */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Premium Benefits:</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Unlimited likes and super likes</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>See who likes you</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Advanced filters and priority matches</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Video and voice calls</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleUpgrade}
              className={`w-full py-4 bg-gradient-to-r ${tierColor} text-white rounded-xl font-semibold hover:opacity-90 transition shadow-lg`}
            >
              Upgrade Now
            </button>

            <button
              onClick={handleBuyCoins}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
            >
              Buy Coins Instead
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 text-gray-500 hover:text-gray-700 transition text-sm"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
