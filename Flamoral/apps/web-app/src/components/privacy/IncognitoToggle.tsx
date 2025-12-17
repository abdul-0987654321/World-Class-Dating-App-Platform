import React, { useState } from 'react';
import { IncognitoSession } from '../../services/privacy.service';

interface IncognitoToggleProps {
  session: IncognitoSession | null;
  onToggle: (enabled: boolean, durationMinutes?: number) => void;
  loading?: boolean;
}

export const IncognitoToggle: React.FC<IncognitoToggleProps> = ({
  session,
  onToggle,
  loading = false,
}) => {
  const [showDurationSelector, setShowDurationSelector] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(60);

  const isActive = session?.enabled || false;

  const handleToggle = () => {
    if (isActive) {
      // Disable incognito
      onToggle(false);
      setShowDurationSelector(false);
    } else {
      // Show duration selector
      setShowDurationSelector(true);
    }
  };

  const handleActivate = () => {
    onToggle(true, selectedDuration);
    setShowDurationSelector(false);
  };

  const formatTimeRemaining = (): string => {
    if (!session || !session.enabled) return '';

    const now = new Date().getTime();
    const end = new Date(session.endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  const durationOptions = [
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 240, label: '4 hours' },
    { value: 480, label: '8 hours' },
    { value: 1440, label: '24 hours' },
  ];

  return (
    <div className="incognito-toggle">
      <div className="toggle-header">
        <div className="toggle-info">
          <div className="toggle-icon">🕵️</div>
          <div className="toggle-text">
            <h3>Incognito Mode</h3>
            <p>Browse profiles without being seen. Only people you like will see your profile.</p>
          </div>
        </div>
        <button
          className={`toggle-switch ${isActive ? 'active' : ''}`}
          onClick={handleToggle}
          disabled={loading}
        >
          <div className="toggle-slider"></div>
        </button>
      </div>

      {isActive && session && (
        <div className="active-session">
          <div className="session-info">
            <div className="session-icon">✓</div>
            <div className="session-details">
              <span className="session-status">Incognito Mode Active</span>
              <span className="session-time">{formatTimeRemaining()}</span>
            </div>
          </div>
          <div className="session-progress">
            <div
              className="session-progress-bar"
              style={{
                width: `${
                  ((new Date().getTime() - new Date(session.startTime).getTime()) /
                    (new Date(session.endTime).getTime() - new Date(session.startTime).getTime())) *
                  100
                }%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {showDurationSelector && !isActive && (
        <div className="duration-selector">
          <h4>How long would you like to stay incognito?</h4>
          <div className="duration-options">
            {durationOptions.map((option) => (
              <button
                key={option.value}
                className={`duration-option ${selectedDuration === option.value ? 'selected' : ''}`}
                onClick={() => setSelectedDuration(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="duration-actions">
            <button className="btn-cancel" onClick={() => setShowDurationSelector(false)}>
              Cancel
            </button>
            <button className="btn-activate" onClick={handleActivate} disabled={loading}>
              {loading ? 'Activating...' : 'Activate'}
            </button>
          </div>
        </div>
      )}

      {isActive && (
        <div className="incognito-benefits">
          <h4>Active Benefits:</h4>
          <ul>
            <li>✓ Your profile is hidden from discovery</li>
            <li>✓ Only people you like can see you</li>
            <li>✓ Browse freely without leaving footprints</li>
            <li>✓ Your likes and matches still work normally</li>
          </ul>
        </div>
      )}

      <style>{`
        .incognito-toggle {
          background: linear-gradient(135deg, #312e81 0%, #1e1b4b 100%);
          color: white;
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .toggle-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .toggle-info {
          display: flex;
          gap: 1rem;
          flex: 1;
        }

        .toggle-icon {
          font-size: 3rem;
          flex-shrink: 0;
        }

        .toggle-text h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
        }

        .toggle-text p {
          font-size: 0.95rem;
          opacity: 0.9;
          margin: 0;
          line-height: 1.5;
        }

        .toggle-switch {
          width: 60px;
          height: 34px;
          background: rgba(255, 255, 255, 0.3);
          border: none;
          border-radius: 34px;
          position: relative;
          cursor: pointer;
          transition: background 0.3s ease;
          flex-shrink: 0;
        }

        .toggle-switch:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.4);
        }

        .toggle-switch.active {
          background: #10b981;
        }

        .toggle-switch:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toggle-slider {
          width: 26px;
          height: 26px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 4px;
          left: 4px;
          transition: transform 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-switch.active .toggle-slider {
          transform: translateX(26px);
        }

        .active-session {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .session-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .session-icon {
          width: 40px;
          height: 40px;
          background: #10b981;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .session-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .session-status {
          font-weight: 600;
          font-size: 1rem;
        }

        .session-time {
          font-size: 0.875rem;
          opacity: 0.8;
        }

        .session-progress {
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          overflow: hidden;
        }

        .session-progress-bar {
          height: 100%;
          background: #10b981;
          transition: width 1s linear;
        }

        .duration-selector {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
        }

        .duration-selector h4 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 1rem 0;
        }

        .duration-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .duration-option {
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .duration-option:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.4);
        }

        .duration-option.selected {
          background: #10b981;
          border-color: #10b981;
        }

        .duration-actions {
          display: flex;
          gap: 0.75rem;
        }

        .duration-actions button {
          flex: 1;
          padding: 0.875rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-cancel {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .btn-cancel:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .btn-activate {
          background: #10b981;
          color: white;
        }

        .btn-activate:hover:not(:disabled) {
          background: #059669;
        }

        .btn-activate:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .incognito-benefits {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background: rgba(16, 185, 129, 0.1);
          border: 2px solid rgba(16, 185, 129, 0.3);
          border-radius: 12px;
        }

        .incognito-benefits h4 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 1rem 0;
        }

        .incognito-benefits ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .incognito-benefits li {
          padding: 0.5rem 0;
          font-size: 0.95rem;
          opacity: 0.95;
        }

        @media (max-width: 768px) {
          .toggle-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .toggle-switch {
            align-self: flex-end;
          }

          .duration-options {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
};
