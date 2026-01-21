import React from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { CoinProduct } from '../../services/coin.service';

interface CoinShopCardProps {
  product: CoinProduct;
  onPurchase: (product: CoinProduct) => void;
  loading?: boolean;
}

export const CoinShopCard: React.FC<CoinShopCardProps> = ({
  product,
  onPurchase,
  loading = false,
}) => {
  // Handle property aliases
  const coinAmount = product.amount || product.coins || 0;
  const bonusAmount = product.bonus || product.bonusCoins || 0;
  const isPopular = product.popular || product.bestValue || false;

  const bonusPercentage = bonusAmount > 0 ? Math.round((bonusAmount / coinAmount) * 100) : 0;

  return (
    <Card className={`coin-shop-card ${isPopular ? 'popular' : ''}`}>
      {product.popular && (
        <div className="badge-popular">
          <span>Best Value</span>
        </div>
      )}

      {bonusPercentage > 0 && <div className="badge-bonus">+{bonusPercentage}% Bonus</div>}

      <div className="coin-icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" fill="#FFD700" />
          <circle cx="12" cy="12" r="7" fill="#FFA500" />
          <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
            C
          </text>
        </svg>
      </div>

      <h3 className="product-name">{product.name}</h3>

      <div className="coin-amount">
        <span className="amount">{coinAmount.toLocaleString()}</span>
        <span className="label">Coins</span>
      </div>

      {bonusAmount > 0 && <div className="bonus-coins">+ {bonusAmount.toLocaleString()} Bonus</div>}

      <div className="price">
        <span className="currency">$</span>
        <span className="amount">{product.price.toFixed(2)}</span>
      </div>

      <div className="value-info">
        <span>
          ${((product.price / (coinAmount + bonusAmount)) * 100).toFixed(2)} per 100 coins
        </span>
      </div>

      <Button
        variant={isPopular ? 'primary' : 'outline'}
        onClick={() => onPurchase(product)}
        disabled={loading}
        fullWidth
      >
        {loading ? 'Processing...' : 'Purchase'}
      </Button>

      <style>{`
        .coin-shop-card {
          position: relative;
          padding: 1.5rem;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          text-align: center;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
        }

        .coin-shop-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
        }

        .coin-shop-card.popular {
          border-color: #8b5cf6;
          background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
          box-shadow: 0 8px 16px rgba(139, 92, 246, 0.15);
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

        .badge-bonus {
          position: absolute;
          top: 12px;
          right: 12px;
          background: #10b981;
          color: white;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .coin-icon {
          width: 80px;
          height: 80px;
          margin: 1rem auto;
        }

        .coin-icon svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 4px 8px rgba(255, 215, 0, 0.3));
        }

        .product-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 1rem;
        }

        .coin-amount {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .coin-amount .amount {
          font-size: 2rem;
          font-weight: 800;
          color: #FFA500;
        }

        .coin-amount .label {
          font-size: 0.875rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .bonus-coins {
          font-size: 0.875rem;
          font-weight: 600;
          color: #10b981;
          margin-bottom: 1rem;
        }

        .price {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 0.25rem;
          margin: 1rem 0 0.5rem 0;
        }

        .price .currency {
          font-size: 1.25rem;
          font-weight: 700;
          color: #6b7280;
        }

        .price .amount {
          font-size: 2rem;
          font-weight: 800;
          color: #1f2937;
        }

        .value-info {
          font-size: 0.75rem;
          color: #9ca3af;
          margin-bottom: 1.5rem;
        }
      `}</style>
    </Card>
  );
};
