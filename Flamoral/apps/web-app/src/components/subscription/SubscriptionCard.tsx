import React from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';

export interface SubscriptionPlan {
  tier: 'free' | 'basic' | 'mid' | 'ultra';
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
  priceId: string;
}

interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  currentTier?: string;
  onSelect: (plan: SubscriptionPlan) => void;
  disabled?: boolean;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  plan,
  currentTier,
  onSelect,
  disabled = false,
}) => {
  const isCurrent = currentTier === plan.tier;
  const isDowngrade = currentTier && getTierLevel(currentTier) > getTierLevel(plan.tier);

  return (
    <Card
      className={`subscription-card ${plan.popular ? 'popular' : ''} ${isCurrent ? 'current' : ''}`}
    >
      {plan.popular && (
        <div className="badge-popular">
          <span>Most Popular</span>
        </div>
      )}

      <div className="subscription-header">
        <h3 className="subscription-name">{plan.name}</h3>
        <div className="subscription-price">
          <span className="price-amount">${plan.price}</span>
          <span className="price-interval">/{plan.interval}</span>
        </div>
      </div>

      <ul className="subscription-features">
        {plan.features.map((feature, index) => (
          <li key={index} className="feature-item">
            <svg
              className="feature-icon"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="subscription-action">
        {isCurrent ? (
          <Button variant="outline" disabled fullWidth>
            Current Plan
          </Button>
        ) : (
          <Button
            variant={plan.popular ? 'primary' : 'outline'}
            onClick={() => onSelect(plan)}
            disabled={disabled}
            fullWidth
          >
            {isDowngrade ? 'Downgrade' : plan.tier === 'free' ? 'Get Started' : 'Upgrade'}
          </Button>
        )}
      </div>

      <style>{`
        .subscription-card {
          position: relative;
          padding: 2rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.3s ease;
          background: white;
        }

        .subscription-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
        }

        .subscription-card.popular {
          border-color: #8b5cf6;
          box-shadow: 0 8px 16px rgba(139, 92, 246, 0.2);
        }

        .subscription-card.current {
          border-color: #10b981;
          background: #f0fdf4;
        }

        .badge-popular {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .subscription-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .subscription-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .subscription-price {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 0.25rem;
        }

        .price-amount {
          font-size: 2.5rem;
          font-weight: 800;
          color: #8b5cf6;
        }

        .price-interval {
          font-size: 1rem;
          color: #6b7280;
        }

        .subscription-features {
          list-style: none;
          padding: 0;
          margin: 0 0 2rem 0;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.95rem;
          color: #4b5563;
        }

        .feature-item:last-child {
          border-bottom: none;
        }

        .feature-icon {
          width: 20px;
          height: 20px;
          color: #10b981;
          flex-shrink: 0;
        }

        .subscription-action {
          margin-top: auto;
        }
      `}</style>
    </Card>
  );
};

function getTierLevel(tier: string): number {
  const levels: Record<string, number> = {
    free: 0,
    basic: 1,
    mid: 2,
    ultra: 3,
  };
  return levels[tier] || 0;
}
