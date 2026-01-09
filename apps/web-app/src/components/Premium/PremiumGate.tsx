/**
 * PremiumGate Component
 *
 * SECURITY NOTES:
 * 1. This component fetches subscription tier from the server API.
 * 2. The tier check here is for UI/UX purposes only - to show upgrade prompts.
 * 3. The backend ALWAYS enforces subscription-gated features.
 * 4. Never trust client-side subscription state for authorization decisions.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Canonical subscription tier type (matches backend)
export type SubscriptionTier = 'free' | 'basic' | 'plus' | 'premium' | 'premium_plus' | 'elite';

// Legacy tier name mapping for backwards compatibility
const LEGACY_TIER_MAP: Record<string, SubscriptionTier> = {
  FREE: 'free',
  GOLD: 'basic',
  PLATINUM: 'plus',
  DIAMOND: 'premium',
  ELITE: 'elite',
};

// Display names for tiers (user-facing)
export const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  free: 'Free',
  basic: 'Basic',
  plus: 'Plus',
  premium: 'Premium',
  premium_plus: 'Premium+',
  elite: 'Elite',
};

// Tier hierarchy for comparison
const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  free: 0,
  basic: 1,
  plus: 2,
  premium: 3,
  premium_plus: 4,
  elite: 5,
};

// Normalize tier name to canonical format
function normalizeTier(tier: string | undefined): SubscriptionTier {
  if (!tier) return 'free';
  const lower = tier.toLowerCase();
  if (lower in TIER_HIERARCHY) return lower as SubscriptionTier;
  return LEGACY_TIER_MAP[tier.toUpperCase()] || 'free';
}


/**
 * Hook to fetch subscription tier from server
 * SECURITY: Always fetches from server, never trusts client-side storage
 */
const useSubscriptionTier = () => {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch('/api/v1/subscription/status', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          setTier(normalizeTier(data.tier || data.subscriptionTier || data.data?.tier));
        } else {
          setTier('free');
        }
      } catch (err) {
        console.error('Subscription fetch error:', err);
        setTier('free');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  return { tier, isLoading };
};

interface PremiumGateProps {
  feature: string;
  requiredTier?: SubscriptionTier;
  children?: React.ReactNode;
  onUnlock?: () => void;
  customMessage?: string;
  showFeaturePreview?: boolean;
}

export const PremiumGate: React.FC<PremiumGateProps> = ({
  feature,
  requiredTier = 'basic',
  children,
  onUnlock,
  customMessage,
  showFeaturePreview = false,
}) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(true);

  // SECURITY: Fetch subscription tier from server API, not client storage
  const { tier: currentTier, isLoading } = useSubscriptionTier();

  // Show loading state while fetching subscription from server
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  const hasAccess = TIER_HIERARCHY[currentTier] >= TIER_HIERARCHY[requiredTier];

  if (hasAccess) {
    if (onUnlock) {
      onUnlock();
    }
    return <>{children}</>;
  }

  const featureDescriptions: { [key: string]: { title: string; description: string; icon: string } } = {
    super_like: {
      title: 'Super Like',
      description: 'Stand out from the crowd and show someone you really like them with a Super Like',
      icon: '⭐',
    },
    unlimited_likes: {
      title: 'Unlimited Likes',
      description: 'Like as many profiles as you want without daily limits',
      icon: '❤️',
    },
    see_who_likes_you: {
      title: 'See Who Likes You',
      description: 'View all the people who have already liked your profile',
      icon: '👀',
    },
    rewind: {
      title: 'Rewind',
      description: 'Undo your last swipe and get a second chance',
      icon: '⏮️',
    },
    boost: {
      title: 'Profile Boost',
      description: 'Be one of the top profiles in your area for 30 minutes',
      icon: '🚀',
    },
    advanced_filters: {
      title: 'Advanced Filters',
      description: 'Filter by education, lifestyle choices, and more',
      icon: '🎯',
    },
    read_receipts: {
      title: 'Read Receipts',
      description: 'See when your messages have been read',
      icon: '✓',
    },
    incognito_mode: {
      title: 'Incognito Mode',
      description: 'Browse profiles privately without being seen',
      icon: '🕶️',
    },
    video_call: {
      title: 'Video Calls',
      description: 'Connect face-to-face before meeting in person',
      icon: '📹',
    },
    priority_likes: {
      title: 'Priority Likes',
      description: 'Your likes appear at the front of their queue',
      icon: '⚡',
    },
  };

  const featureInfo = featureDescriptions[feature] || {
    title: feature,
    description: customMessage || 'This feature requires a premium subscription',
    icon: '🔒',
  };

  const tierColors: Record<SubscriptionTier, string> = {
    free: 'from-gray-400 to-gray-500',
    basic: 'from-yellow-400 to-amber-500',
    plus: 'from-purple-500 to-indigo-600',
    premium: 'from-cyan-400 to-blue-500',
    premium_plus: 'from-emerald-500 to-teal-600',
    elite: 'from-rose-500 to-pink-600',
  };

  const tierBenefits: Record<SubscriptionTier, string[]> = {
    free: [
      '50 daily swipes',
      '1 Super Like/day',
      'Basic messaging',
    ],
    basic: [
      'Unlimited likes',
      'See who likes you',
      'Advanced filters',
      '5 Super Likes/day',
      '1 Boost/week',
      'Rewind feature',
    ],
    plus: [
      'Everything in Basic',
      'Message before matching',
      'Priority in Discovery',
      '10 Super Likes/day',
      '3 Boosts/week',
      'Read receipts',
      'Incognito mode',
    ],
    premium: [
      'Everything in Plus',
      'Exclusive events',
      'Verified badge',
      'Unlimited Super Likes',
      'Unlimited Boosts',
      'AI matchmaking insights',
      'Video call priority',
    ],
    premium_plus: [
      'Everything in Premium',
      'Passport (swipe anywhere)',
      'Priority support',
      'Early access to features',
    ],
    elite: [
      'Everything in Premium+',
      'VIP matchmaking service',
      'Profile by experts',
      'Dedicated relationship coach',
      'Exclusive VIP events',
      'Background-checked matches',
      'Luxury date planning',
    ],
  };

  if (!showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-in">
        {/* Header with Gradient */}
        <div className={`bg-gradient-to-r ${tierColors[requiredTier]} p-6 text-white relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>

          <button
            onClick={() => setShowModal(false)}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative">
            <div className="text-5xl mb-3">{featureInfo.icon}</div>
            <h2 className="text-2xl font-bold mb-1">{featureInfo.title}</h2>
            <p className="text-white/90 text-sm">{featureInfo.description}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Required Tier Badge */}
          <div className="flex items-center justify-center mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${tierColors[requiredTier]} text-white rounded-full font-semibold`}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>Requires {TIER_DISPLAY_NAMES[requiredTier]}</span>
            </div>
          </div>

          {/* Feature Preview */}
          {showFeaturePreview && children && (
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white z-10"></div>
              <div className="blur-sm pointer-events-none opacity-50">
                {children}
              </div>
            </div>
          )}

          {/* Benefits */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Unlock with {TIER_DISPLAY_NAMES[requiredTier]}:</h3>
            <div className="space-y-2">
              {tierBenefits[requiredTier].slice(0, 4).map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {benefit}
                </div>
              ))}
              {tierBenefits[requiredTier].length > 4 && (
                <p className="text-sm text-pink-500 font-medium pl-7">
                  +{tierBenefits[requiredTier].length - 4} more benefits
                </p>
              )}
            </div>
          </div>

          {/* Special Offer */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800">30-Day Money-Back Guarantee</p>
                <p className="text-xs text-green-700 mt-1">Try risk-free. Cancel anytime.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => {
                setShowModal(false);
                navigate('/subscription');
              }}
              className={`w-full py-4 bg-gradient-to-r ${tierColors[requiredTier]} text-white rounded-xl font-semibold hover:opacity-90 transition shadow-lg`}
            >
              Upgrade to {TIER_DISPLAY_NAMES[requiredTier]}
            </button>

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
            >
              Maybe Later
            </button>
          </div>

          {/* Alternative Option */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Or{' '}
              <button
                onClick={() => {
                  setShowModal(false);
                  navigate('/coins');
                }}
                className="text-pink-500 hover:text-pink-600 font-medium"
              >
                buy coins
              </button>
              {' '}for one-time use
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumGate;
