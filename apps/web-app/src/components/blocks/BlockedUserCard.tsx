import React from 'react';
import { BlockedUser } from '../../services/block.service';

interface BlockedUserCardProps {
  blockedUser: BlockedUser;
  onUnblock: (userId: string) => void;
  loading?: boolean;
}

export const BlockedUserCard: React.FC<BlockedUserCardProps> = ({
  blockedUser,
  onUnblock,
  loading = false,
}) => {
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const user = blockedUser.blockedUser;
  const displayName = user?.firstName || user?.name || 'User';
  const lastName = user?.lastName || '';
  const photoUrl = user?.profilePhoto || user?.photoUrl;
  const blockedDate = blockedUser.createdAt || blockedUser.blockedAt;
  const unblockedId = blockedUser.blockedId || blockedUser.blockedUserId;

  return (
    <div className="blocked-user-card">
      <div className="user-avatar">
        {photoUrl ? (
          <img src={photoUrl} alt={displayName} />
        ) : (
          <div className="avatar-placeholder">
            {getInitials(displayName, lastName)}
          </div>
        )}
      </div>

      <div className="user-info">
        <h3 className="user-name">
          {displayName} {lastName}
        </h3>
        <p className="blocked-date">Blocked on {formatDate(new Date(blockedDate))}</p>
        {blockedUser.reason && (
          <p className="block-reason">
            <span className="reason-label">Reason:</span> {blockedUser.reason}
          </p>
        )}
      </div>

      <div className="card-actions">
        <button
          className="unblock-button"
          onClick={() => onUnblock(unblockedId)}
          disabled={loading}
        >
          {loading ? 'Unblocking...' : 'Unblock'}
        </button>
      </div>

      <style>{`
        .blocked-user-card {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.5rem;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .blocked-user-card:hover {
          border-color: #d1d5db;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .user-avatar {
          width: 70px;
          height: 70px;
          flex-shrink: 0;
          border-radius: 50%;
          overflow: hidden;
          background: #f3f4f6;
        }

        .user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .user-info {
          flex: 1;
        }

        .user-name {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.25rem 0;
        }

        .blocked-date {
          font-size: 0.875rem;
          color: #9ca3af;
          margin: 0 0 0.5rem 0;
        }

        .block-reason {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
          line-height: 1.4;
        }

        .reason-label {
          font-weight: 600;
          color: #4b5563;
        }

        .card-actions {
          flex-shrink: 0;
        }

        .unblock-button {
          padding: 0.75rem 1.5rem;
          background: white;
          border: 2px solid #10b981;
          color: #10b981;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .unblock-button:hover:not(:disabled) {
          background: #10b981;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        .unblock-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 768px) {
          .blocked-user-card {
            flex-direction: column;
            text-align: center;
          }

          .user-avatar {
            margin: 0 auto;
          }

          .card-actions {
            width: 100%;
          }

          .unblock-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
