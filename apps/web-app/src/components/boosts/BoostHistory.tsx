import React from 'react';
import { BoostInstance } from '../../services/boost.service';

interface BoostHistoryProps {
  boosts: BoostInstance[];
  total: number;
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const BoostHistory: React.FC<BoostHistoryProps> = ({
  boosts,
  total,
  loading = false,
  onLoadMore,
  hasMore = false,
}) => {
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  if (boosts.length === 0 && !loading) {
    return (
      <div className="boost-history">
        <h2>Boost History</h2>
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Boost History</h3>
          <p>Your boost history will appear here once you activate a boost.</p>
        </div>

        <style>{`
          .boost-history {
            margin-top: 3rem;
          }

          .boost-history h2 {
            font-size: 1.75rem;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 1.5rem;
          }

          .empty-state {
            text-align: center;
            padding: 3rem 1rem;
            background: #f9fafb;
            border-radius: 12px;
            border: 2px dashed #e5e7eb;
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
    <div className="boost-history">
      <div className="history-header">
        <h2>Boost History</h2>
        <span className="total-count">{total} total boosts</span>
      </div>

      <div className="history-list">
        {boosts.map((boost) => {
          const isActive = boost.active ?? boost.isActive;
          const productName = boost.productSku || boost.boostType || 'Boost';
          const duration = boost.durationMinutes || 30;
          const visibility = boost.visibilityMultiplier || boost.multiplier || 1;
          const cost = boost.coinCost || 0;
          const startTime = boost.startTime || boost.startedAt;
          const endTime = boost.endTime || boost.expiresAt;

          return (
            <div key={boost.id} className={`history-item ${isActive ? 'active' : ''}`}>
              <div className="item-icon">{isActive ? '⚡' : '✓'}</div>
              <div className="item-details">
                <div className="item-header">
                  <h3 className="item-title">{productName}</h3>
                  <span className={`status-badge ${isActive ? 'active' : 'completed'}`}>
                    {isActive ? 'Active' : 'Completed'}
                  </span>
                </div>
                <div className="item-info">
                  <span className="info-item">
                    <svg className="info-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {formatDuration(duration)}
                  </span>
                  <span className="info-item">
                    <svg className="info-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                    </svg>
                    {visibility}x visibility
                  </span>
                  <span className="info-item coin-cost">
                    <svg className="info-icon" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" fill="#FFD700" />
                    </svg>
                    {cost} coins
                  </span>
                </div>
                <div className="item-date">
                  {formatDate(new Date(startTime))} - {formatDate(new Date(endTime))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="loading-more">
          <div className="spinner"></div>
          <span>Loading more...</span>
        </div>
      )}

      {hasMore && !loading && onLoadMore && (
        <button className="load-more-button" onClick={onLoadMore}>
          Load More
        </button>
      )}

      <style>{`
        .boost-history {
          margin-top: 3rem;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .history-header h2 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .total-count {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 600;
          background: #f3f4f6;
          padding: 0.5rem 1rem;
          border-radius: 20px;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .history-item {
          display: flex;
          gap: 1rem;
          padding: 1.5rem;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .history-item:hover {
          border-color: #d1d5db;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .history-item.active {
          border-color: #fbbf24;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        }

        .item-icon {
          width: 50px;
          height: 50px;
          background: #f3f4f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .history-item.active .item-icon {
          background: #f59e0b;
        }

        .item-details {
          flex: 1;
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .item-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
          text-transform: capitalize;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-badge.active {
          background: #f59e0b;
          color: white;
        }

        .status-badge.completed {
          background: #10b981;
          color: white;
        }

        .item-info {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        .info-item.coin-cost {
          color: #f59e0b;
          font-weight: 600;
        }

        .info-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        .item-date {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .loading-more {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 2rem;
          color: #6b7280;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e5e7eb;
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .load-more-button {
          width: 100%;
          padding: 1rem;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 1rem;
        }

        .load-more-button:hover {
          border-color: #8b5cf6;
          color: #8b5cf6;
          background: #f5f3ff;
        }

        @media (max-width: 768px) {
          .history-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .item-info {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};
