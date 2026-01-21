import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionService, Subscription } from '../../services/subscription.service';

// Tier configuration with colors and icons
export const TIER_CONFIG = {
  FREE: {
    label: 'Free',
    icon: '👤',
    color: '#6B7280', // Gray
    backgroundColor: '#F3F4F6',
    textColor: '#374151',
    gradient: 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)',
    borderColor: '#9CA3AF',
    glowColor: 'rgba(107, 114, 128, 0.3)',
  },
  GOLD: {
    label: 'Gold',
    icon: '⭐',
    color: '#F59E0B', // Amber/Gold
    backgroundColor: '#FFFBEB',
    textColor: '#92400E',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #F59E0B 100%)',
    borderColor: '#FBBF24',
    glowColor: 'rgba(245, 158, 11, 0.4)',
  },
  PLATINUM: {
    label: 'Platinum',
    icon: '💎',
    color: '#8B5CF6', // Purple/Violet
    backgroundColor: '#F5F3FF',
    textColor: '#5B21B6',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 50%, #8B5CF6 100%)',
    borderColor: '#A78BFA',
    glowColor: 'rgba(139, 92, 246, 0.4)',
  },
  DIAMOND: {
    label: 'Diamond',
    icon: '👑',
    color: '#06B6D4', // Cyan/Diamond Blue
    backgroundColor: '#ECFEFF',
    textColor: '#0E7490',
    gradient:
      'linear-gradient(135deg, #06B6D4 0%, #22D3EE 25%, #67E8F9 50%, #22D3EE 75%, #06B6D4 100%)',
    borderColor: '#22D3EE',
    glowColor: 'rgba(6, 182, 212, 0.5)',
    sparkle: true,
  },
} as const;

export type SubscriptionTier = keyof typeof TIER_CONFIG;

interface SubscriptionBadgeProps {
  tier?: SubscriptionTier;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showUpgrade?: boolean;
  onClick?: () => void;
  className?: string;
}

export const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({
  tier: propTier,
  size = 'md',
  showLabel = true,
  showUpgrade = true,
  onClick,
  className = '',
}) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(!propTier);
  const navigate = useNavigate();

  useEffect(() => {
    if (!propTier) {
      fetchSubscription();
    }
  }, [propTier]);

  const fetchSubscription = async () => {
    try {
      const subscriptionData = await subscriptionService.getCurrentSubscription();
      setSubscription(subscriptionData);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate('/subscription');
    }
  };

  // Determine the tier to display
  const displayTier = propTier || (subscription?.tier?.toUpperCase() as SubscriptionTier) || 'FREE';
  const config = TIER_CONFIG[displayTier] || TIER_CONFIG.FREE;

  if (loading && !propTier) {
    return (
      <div className={`subscription-badge-skeleton ${size} ${className}`}>
        <style>{`
          .subscription-badge-skeleton {
            background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 50px;
          }
          .subscription-badge-skeleton.sm { width: 60px; height: 24px; }
          .subscription-badge-skeleton.md { width: 90px; height: 32px; }
          .subscription-badge-skeleton.lg { width: 120px; height: 40px; }
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  const sizeClasses = {
    sm: 'badge-sm',
    md: 'badge-md',
    lg: 'badge-lg',
  };

  return (
    <button
      className={`subscription-badge ${sizeClasses[size]} tier-${displayTier.toLowerCase()} ${className}`}
      onClick={handleClick}
      title={`${config.label} Member - Click to view subscription`}
      style={{
        background: config.gradient,
        boxShadow: `0 4px 15px ${config.glowColor}`,
      }}
    >
      <span className="badge-icon">{config.icon}</span>
      {showLabel && <span className="badge-label">{config.label}</span>}
      {showUpgrade && displayTier === 'FREE' && (
        <svg className="upgrade-icon" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {displayTier === 'DIAMOND' && <span className="sparkle-effect">✨</span>}

      <style>{`
        .subscription-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          color: white;
          border-radius: 50px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          cursor: pointer;
          font-weight: 700;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .subscription-badge::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          transition: left 0.5s ease;
        }

        .subscription-badge:hover::before {
          left: 100%;
        }

        .subscription-badge:hover {
          transform: translateY(-2px) scale(1.02);
        }

        .subscription-badge:active {
          transform: translateY(0) scale(0.98);
        }

        /* Size variants */
        .badge-sm {
          padding: 0.25rem 0.6rem;
          font-size: 0.75rem;
        }
        .badge-sm .badge-icon { font-size: 0.85rem; }

        .badge-md {
          padding: 0.4rem 0.9rem;
          font-size: 0.85rem;
        }
        .badge-md .badge-icon { font-size: 1.1rem; }

        .badge-lg {
          padding: 0.6rem 1.2rem;
          font-size: 1rem;
        }
        .badge-lg .badge-icon { font-size: 1.3rem; }

        .badge-icon {
          display: flex;
          align-items: center;
        }

        .badge-label {
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .upgrade-icon {
          width: 14px;
          height: 14px;
          opacity: 0.9;
          animation: bounce 2s infinite;
        }

        .sparkle-effect {
          position: absolute;
          right: -2px;
          top: -2px;
          font-size: 0.7rem;
          animation: sparkle 1.5s ease-in-out infinite;
        }

        /* Tier-specific styles */
        .tier-free {
          background: linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%) !important;
        }

        .tier-gold {
          background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #F59E0B 100%) !important;
          animation: goldShine 3s ease-in-out infinite;
        }

        .tier-platinum {
          background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 50%, #8B5CF6 100%) !important;
          animation: platinumGlow 2s ease-in-out infinite alternate;
        }

        .tier-diamond {
          background: linear-gradient(135deg, #06B6D4 0%, #22D3EE 25%, #67E8F9 50%, #22D3EE 75%, #06B6D4 100%) !important;
          animation: diamondShimmer 2s ease-in-out infinite;
          border: 2px solid rgba(255, 255, 255, 0.5);
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }

        @keyframes goldShine {
          0%, 100% { box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4); }
          50% { box-shadow: 0 4px 25px rgba(245, 158, 11, 0.6); }
        }

        @keyframes platinumGlow {
          0% { box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4); }
          100% { box-shadow: 0 4px 25px rgba(139, 92, 246, 0.6); }
        }

        @keyframes diamondShimmer {
          0%, 100% {
            box-shadow: 0 4px 20px rgba(6, 182, 212, 0.5), 0 0 30px rgba(6, 182, 212, 0.3);
          }
          50% {
            box-shadow: 0 4px 30px rgba(6, 182, 212, 0.7), 0 0 40px rgba(6, 182, 212, 0.5);
          }
        }
      `}</style>
    </button>
  );
};

// Icon-only compact badge for tight spaces (profile cards, etc.)
export const TierIcon: React.FC<{
  tier: SubscriptionTier;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}> = ({ tier, size = 'sm', showTooltip = true, className = '' }) => {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.FREE;

  const sizeMap = {
    xs: { wrapper: 18, icon: 10 },
    sm: { wrapper: 24, icon: 14 },
    md: { wrapper: 32, icon: 18 },
    lg: { wrapper: 40, icon: 24 },
  };

  const dimensions = sizeMap[size];

  return (
    <div
      className={`tier-icon tier-icon-${tier.toLowerCase()} ${className}`}
      title={showTooltip ? `${config.label} Member` : undefined}
      style={{
        width: dimensions.wrapper,
        height: dimensions.wrapper,
        background: config.gradient,
        boxShadow: `0 2px 8px ${config.glowColor}`,
        fontSize: dimensions.icon,
      }}
    >
      <span>{config.icon}</span>
      <style>{`
        .tier-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.4);
          cursor: default;
        }
        .tier-icon-diamond {
          animation: diamondPulse 2s ease-in-out infinite;
        }
        @keyframes diamondPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

// Full tier display card for subscription pages
export const TierCard: React.FC<{
  tier: SubscriptionTier;
  price?: string;
  features?: string[];
  isCurrentTier?: boolean;
  onSelect?: () => void;
}> = ({ tier, price, features = [], isCurrentTier = false, onSelect }) => {
  const config = TIER_CONFIG[tier];

  return (
    <div
      className={`tier-card tier-card-${tier.toLowerCase()} ${isCurrentTier ? 'current' : ''}`}
      onClick={onSelect}
      style={{
        borderColor: config.borderColor,
        backgroundColor: config.backgroundColor,
      }}
    >
      <div className="tier-card-header" style={{ background: config.gradient }}>
        <span className="tier-card-icon">{config.icon}</span>
        <h3 className="tier-card-name">{config.label}</h3>
        {isCurrentTier && <span className="current-badge">Current Plan</span>}
      </div>

      {price && (
        <div className="tier-card-price" style={{ color: config.color }}>
          {price}
        </div>
      )}

      {features.length > 0 && (
        <ul className="tier-card-features">
          {features.map((feature, index) => (
            <li key={index} style={{ color: config.textColor }}>
              <span className="feature-check" style={{ color: config.color }}>
                ✓
              </span>
              {feature}
            </li>
          ))}
        </ul>
      )}

      {!isCurrentTier && onSelect && (
        <button
          className="tier-card-button"
          style={{ background: config.gradient }}
          onClick={onSelect}
        >
          {tier === 'FREE' ? 'Downgrade' : 'Upgrade'}
        </button>
      )}

      <style>{`
        .tier-card {
          border: 3px solid;
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s ease;
          cursor: pointer;
          max-width: 300px;
        }

        .tier-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        }

        .tier-card.current {
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
        }

        .tier-card-header {
          padding: 1.5rem;
          text-align: center;
          color: white;
          position: relative;
        }

        .tier-card-icon {
          font-size: 2.5rem;
          display: block;
          margin-bottom: 0.5rem;
        }

        .tier-card-name {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .current-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(255, 255, 255, 0.9);
          color: #333;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .tier-card-price {
          font-size: 2rem;
          font-weight: 800;
          text-align: center;
          padding: 1rem;
        }

        .tier-card-features {
          list-style: none;
          padding: 0 1.5rem 1.5rem;
          margin: 0;
        }

        .tier-card-features li {
          padding: 0.5rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .feature-check {
          font-weight: bold;
          font-size: 1rem;
        }

        .tier-card-button {
          display: block;
          width: calc(100% - 3rem);
          margin: 0 1.5rem 1.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tier-card-button:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .tier-card-diamond .tier-card-header {
          animation: diamondHeaderShimmer 3s ease-in-out infinite;
        }

        @keyframes diamondHeaderShimmer {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.1); }
        }
      `}</style>
    </div>
  );
};
