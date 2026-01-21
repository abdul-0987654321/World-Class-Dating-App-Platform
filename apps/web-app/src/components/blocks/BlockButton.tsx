import React, { useState } from 'react';

interface BlockButtonProps {
  userId: string;
  userName: string;
  onBlock: (userId: string, reason?: string) => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'text';
}

export const BlockButton: React.FC<BlockButtonProps> = ({
  userId,
  userName,
  onBlock,
  loading = false,
  variant = 'secondary',
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');

  const blockReasons = [
    'Inappropriate behavior',
    'Harassment',
    'Spam or scam',
    'Fake profile',
    'Offensive content',
    'Other',
  ];

  const handleBlockClick = () => {
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    const finalReason = selectedReason === 'Other' ? reason : selectedReason;
    onBlock(userId, finalReason || undefined);
    setShowConfirm(false);
    setReason('');
    setSelectedReason('');
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setReason('');
    setSelectedReason('');
  };

  return (
    <>
      <button className={`block-button ${variant}`} onClick={handleBlockClick} disabled={loading}>
        {loading ? 'Blocking...' : variant === 'text' ? 'Block User' : '🚫 Block'}
      </button>

      {showConfirm && (
        <div className="block-modal-overlay" onClick={handleCancel}>
          <div className="block-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Block {userName}?</h2>
              <button className="close-button" onClick={handleCancel}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <p className="warning-text">
                Blocking this user will prevent them from seeing your profile and contacting you.
                You won't see their profile either.
              </p>

              <div className="reason-section">
                <label className="reason-label">Reason for blocking (optional):</label>
                <div className="reason-options">
                  {blockReasons.map((reasonOption) => (
                    <button
                      key={reasonOption}
                      className={`reason-chip ${selectedReason === reasonOption ? 'selected' : ''}`}
                      onClick={() => setSelectedReason(reasonOption)}
                      type="button"
                    >
                      {reasonOption}
                    </button>
                  ))}
                </div>

                {selectedReason === 'Other' && (
                  <textarea
                    className="reason-textarea"
                    placeholder="Please specify the reason..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                  />
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCancel}>
                Cancel
              </button>
              <button className="btn-block" onClick={handleConfirm} disabled={loading}>
                {loading ? 'Blocking...' : 'Block User'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .block-button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 1rem;
        }

        .block-button.primary {
          background: #ef4444;
          color: white;
        }

        .block-button.primary:hover:not(:disabled) {
          background: #dc2626;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .block-button.secondary {
          background: white;
          color: #ef4444;
          border: 2px solid #ef4444;
        }

        .block-button.secondary:hover:not(:disabled) {
          background: #fef2f2;
        }

        .block-button.text {
          background: transparent;
          color: #ef4444;
          padding: 0.5rem 1rem;
        }

        .block-button.text:hover:not(:disabled) {
          background: #fef2f2;
        }

        .block-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .block-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .block-modal {
          background: white;
          border-radius: 16px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 2px solid #f3f4f6;
        }

        .modal-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 2rem;
          color: #9ca3af;
          cursor: pointer;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .close-button:hover {
          background: #f3f4f6;
          color: #1f2937;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .warning-text {
          font-size: 1rem;
          color: #6b7280;
          line-height: 1.6;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: #fef2f2;
          border-left: 4px solid #ef4444;
          border-radius: 4px;
        }

        .reason-section {
          margin-bottom: 1rem;
        }

        .reason-label {
          display: block;
          font-size: 0.95rem;
          font-weight: 600;
          color: #4b5563;
          margin-bottom: 0.75rem;
        }

        .reason-options {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .reason-chip {
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          border: 2px solid #e5e7eb;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .reason-chip:hover {
          background: #e5e7eb;
          border-color: #d1d5db;
        }

        .reason-chip.selected {
          background: #ef4444;
          border-color: #ef4444;
          color: white;
        }

        .reason-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.95rem;
          font-family: inherit;
          resize: vertical;
          transition: all 0.3s ease;
        }

        .reason-textarea:focus {
          outline: none;
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .modal-footer {
          display: flex;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 2px solid #f3f4f6;
        }

        .modal-footer button {
          flex: 1;
          padding: 0.875rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-cancel {
          background: #f3f4f6;
          color: #6b7280;
        }

        .btn-cancel:hover {
          background: #e5e7eb;
        }

        .btn-block {
          background: #ef4444;
          color: white;
        }

        .btn-block:hover:not(:disabled) {
          background: #dc2626;
        }

        .btn-block:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .block-modal {
            margin: 1rem;
          }

          .reason-options {
            flex-direction: column;
          }

          .reason-chip {
            text-align: center;
          }
        }
      `}</style>
    </>
  );
};
