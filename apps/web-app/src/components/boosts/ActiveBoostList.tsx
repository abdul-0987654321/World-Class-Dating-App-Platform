import React, { useEffect, useState } from 'react';
import { BoostInstance } from '../../services/boost.service';

interface ActiveBoostListProps {
  boosts: BoostInstance[];
  onCancel?: (boostId: string) => void;
  loading?: boolean;
}

export const ActiveBoostList: React.FC<ActiveBoostListProps> = ({
  boosts,
  onCancel,
  loading = false,
}) => {
  if (boosts.length === 0) {
    return (
      <div className="active-boost-list">
        <div className="empty-state">
          <div className="empty-icon">⚡</div>
          <h3>No Active Boosts</h3>
          <p>Purchase a boost to increase your profile visibility!</p>
        </div>

        <style>{`
          .active-boost-list .empty-state {
            text-align: center;
            padding: 3rem 1rem;
            background: rgba(245, 158, 11, 0.05);
            border-radius: 12px;
            border: 2px dashed #fbbf24;
          }

          .empty-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
            opacity: 0.5;
          }

          .empty-state h3 {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 0.5rem;
          }

          .empty-state p {
            font-size: 1rem;
            color: #6b7280;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="active-boost-list">
      <h2>Active Boosts</h2>
      <div className="boosts-grid">
        {boosts.map((boost) => (
          <ActiveBoostCard key={boost.id} boost={boost} onCancel={onCancel} loading={loading} />
        ))}
      </div>

      <style>{`
        .active-boost-list {
          margin-bottom: 3rem;
        }

        .active-boost-list h2 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 1.5rem;
        }

        .boosts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        @media (max-width: 768px) {
          .boosts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

interface ActiveBoostCardProps {
  boost: BoostInstance;
  onCancel?: (boostId: string) => void;
  loading?: boolean;
}

const ActiveBoostCard: React.FC<ActiveBoostCardProps> = ({ boost, onCancel, loading = false }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const endTime = boost.endTime || boost.expiresAt;
  const startTime = boost.startTime || boost.startedAt;
  const visibilityMult = boost.visibilityMultiplier || boost.multiplier || 1;
  const duration = boost.durationMinutes || 30;
  const cost = boost.coinCost || 0;
  const isActive = boost.active ?? boost.isActive;
  const productName = boost.productSku || boost.boostType || 'Boost';

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const progress = () => {
    const now = new Date().getTime();
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const total = end - start;
    const elapsed = now - start;
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  };

  return (
    <div className="active-boost-card">
      <div className="boost-header">
        <div className="boost-icon">⚡</div>
        <div className="boost-info">
          <h3>{productName}</h3>
          <span className="multiplier">{visibilityMult}x Visibility</span>
        </div>
      </div>

      <div className="progress-container">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress()}%` }} />
        </div>
        <div className="time-remaining">{timeRemaining}</div>
      </div>

      <div className="boost-stats">
        <div className="stat">
          <span className="stat-label">Duration</span>
          <span className="stat-value">{duration} min</span>
        </div>
        <div className="stat">
          <span className="stat-label">Cost</span>
          <span className="stat-value">{cost} coins</span>
        </div>
      </div>

      {onCancel && isActive && (
        <button className="cancel-button" onClick={() => onCancel(boost.id)} disabled={loading}>
          {loading ? 'Canceling...' : 'Cancel Boost'}
        </button>
      )}

      <style>{`
        .active-boost-card {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border: 2px solid #fbbf24;
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .active-boost-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(251, 191, 36, 0.2);
        }

        .boost-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .boost-icon {
          width: 50px;
          height: 50px;
          background: #f59e0b;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .boost-info h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
          text-transform: capitalize;
        }

        .multiplier {
          font-size: 0.875rem;
          color: #f59e0b;
          font-weight: 600;
        }

        .progress-container {
          margin-bottom: 1rem;
        }

        .progress-bar {
          height: 8px;
          background: #fef3c7;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
          transition: width 0.3s ease;
        }

        .time-remaining {
          text-align: center;
          font-size: 1.5rem;
          font-weight: 800;
          color: #f59e0b;
          font-variant-numeric: tabular-nums;
        }

        .boost-stats {
          display: flex;
          justify-content: space-around;
          margin-bottom: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #fbbf24;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 1rem;
          font-weight: 700;
          color: #1f2937;
        }

        .cancel-button {
          width: 100%;
          padding: 0.75rem;
          background: transparent;
          border: 2px solid #ef4444;
          color: #ef4444;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .cancel-button:hover:not(:disabled) {
          background: #ef4444;
          color: white;
        }

        .cancel-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
