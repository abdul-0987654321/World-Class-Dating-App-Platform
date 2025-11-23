import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionService, Subscription } from '../../services/subscription.service';

export const SubscriptionBadge: React.FC = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubscription();
  }, []);

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
    navigate('/subscription');
  };

  if (loading || !subscription) {
    return null;
  }

  const tierConfig = {
    free: { label: 'Free', color: '#6b7280', icon: '👤' },
    basic: { label: 'Basic', color: '#3b82f6', icon: '⭐' },
    mid: { label: 'Mid', color: '#8b5cf6', icon: '💎' },
    ultra: { label: 'Ultra', color: '#f59e0b', icon: '👑' },
  };

  const config = tierConfig[subscription.tier] || tierConfig.free;

  return (
    <button
      className="subscription-badge"
      onClick={handleClick}
      title="View subscription details"
      style={{ backgroundColor: config.color }}
    >
      <span className="badge-icon">{config.icon}</span>
      <span className="badge-label">{config.label}</span>
      {subscription.tier === 'free' && (
        <svg className="upgrade-icon" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
            clipRule="evenodd"
          />
        </svg>
      )}

      <style>{`
        .subscription-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 50px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .subscription-badge:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .subscription-badge:active {
          transform: translateY(0);
        }

        .badge-icon {
          font-size: 1.2rem;
        }

        .badge-label {
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .upgrade-icon {
          width: 16px;
          height: 16px;
          opacity: 0.9;
        }
      `}</style>
    </button>
  );
};
