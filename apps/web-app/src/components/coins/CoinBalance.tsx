import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { coinService, CoinBalance as CoinBalanceType } from '../../services/coin.service';

export const CoinBalance: React.FC = () => {
  const [balance, setBalance] = useState<CoinBalanceType | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBalance();

    // Poll balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchBalance = async () => {
    try {
      const balanceData = await coinService.getBalance();
      setBalance(balanceData);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch coin balance:', err);
      setLoading(false);
    }
  };

  const handleClick = () => {
    navigate('/coins');
  };

  if (loading) {
    return (
      <div className="coin-balance loading">
        <div className="coin-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill="#FFD700" />
          </svg>
        </div>
        <span>...</span>
      </div>
    );
  }

  return (
    <button className="coin-balance" onClick={handleClick} title="Buy more coins">
      <div className="coin-icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" fill="#FFD700" />
          <circle cx="12" cy="12" r="7" fill="#FFA500" />
        </svg>
      </div>
      <span className="balance-amount">
        {(balance?.balance ?? balance?.coins ?? 0).toLocaleString()}
      </span>
      <svg className="plus-icon" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
          clipRule="evenodd"
        />
      </svg>

      <style>{`
        .coin-balance {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 50px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
        }

        .coin-balance:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
        }

        .coin-balance:active {
          transform: translateY(0);
        }

        .coin-balance.loading {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .coin-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .coin-icon svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        }

        .balance-amount {
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .plus-icon {
          width: 16px;
          height: 16px;
          opacity: 0.8;
        }
      `}</style>
    </button>
  );
};
