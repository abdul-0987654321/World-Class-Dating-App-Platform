import React from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { BoostProduct } from '../../services/boost.service';

interface BoostCardProps {
  product: BoostProduct;
  onPurchase: (product: BoostProduct) => void;
  loading?: boolean;
}

export const BoostCard: React.FC<BoostCardProps> = ({
  product,
  onPurchase,
  loading = false,
}) => {
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  return (
    <Card className={`boost-card ${product.popular ? 'popular' : ''}`}>
      {product.popular && (
        <div className="badge-popular">
          <span>Most Popular</span>
        </div>
      )}

      <div className="boost-icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
            fill="url(#boost-gradient)"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="boost-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <h3 className="product-name">{product.name}</h3>

      {product.description && (
        <p className="product-description">{product.description}</p>
      )}

      <div className="boost-details">
        <div className="detail-item">
          <span className="detail-label">Duration</span>
          <span className="detail-value">{formatDuration(product.durationMinutes)}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Visibility</span>
          <span className="detail-value">{product.visibilityMultiplier}x</span>
        </div>
      </div>

      <div className="price">
        <div className="coin-icon-small">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill="#FFD700" />
            <circle cx="12" cy="12" r="7" fill="#FFA500" />
          </svg>
        </div>
        <span className="amount">{product.costCoins.toLocaleString()}</span>
        <span className="label">Coins</span>
      </div>

      <Button
        variant={product.popular ? 'primary' : 'outline'}
        onClick={() => onPurchase(product)}
        disabled={loading}
        fullWidth
      >
        {loading ? 'Processing...' : 'Activate Boost'}
      </Button>

      <style>{`
        .boost-card {
          position: relative;
          padding: 1.5rem;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          text-align: center;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
        }

        .boost-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
        }

        .boost-card.popular {
          border-color: #f59e0b;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          box-shadow: 0 8px 16px rgba(245, 158, 11, 0.15);
        }

        .badge-popular {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .boost-icon {
          width: 80px;
          height: 80px;
          margin: 1rem auto;
          color: #f59e0b;
        }

        .boost-icon svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 4px 8px rgba(245, 158, 11, 0.3));
        }

        .product-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .product-description {
          font-size: 0.95rem;
          color: #6b7280;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .boost-details {
          display: flex;
          justify-content: space-around;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: rgba(245, 158, 11, 0.1);
          border-radius: 12px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .detail-label {
          font-size: 0.75rem;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #f59e0b;
        }

        .price {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin: 1.5rem 0;
        }

        .coin-icon-small {
          width: 30px;
          height: 30px;
        }

        .coin-icon-small svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .price .amount {
          font-size: 2rem;
          font-weight: 800;
          color: #1f2937;
        }

        .price .label {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 600;
        }
      `}</style>
    </Card>
  );
};
