import React from 'react';
import { PrivacyPreset } from '../../services/privacy.service';

interface PrivacyPresetsProps {
  presets: PrivacyPreset[];
  currentPreset?: string;
  onApplyPreset: (presetName: string) => void;
  loading?: boolean;
}

export const PrivacyPresets: React.FC<PrivacyPresetsProps> = ({
  presets,
  currentPreset,
  onApplyPreset,
  loading = false,
}) => {
  const getPresetIcon = (name: string): string => {
    switch (name) {
      case 'open':
        return '🌍';
      case 'balanced':
        return '⚖️';
      case 'private':
        return '🔒';
      default:
        return '🛡️';
    }
  };

  const getPresetColor = (name: string): string => {
    switch (name) {
      case 'open':
        return '#10b981';
      case 'balanced':
        return '#f59e0b';
      case 'private':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="privacy-presets">
      <h2>Quick Privacy Presets</h2>
      <p className="presets-description">
        Choose a preset that matches your comfort level, or customize individual settings below.
      </p>

      <div className="presets-grid">
        {presets.map((preset) => {
          const presetId = preset.id || preset.name;
          const showDistanceValue = preset.settings.showDistance ?? !preset.settings.hideDistance;

          return (
          <div
            key={presetId}
            className={`preset-card ${currentPreset === presetId ? 'active' : ''}`}
            style={{ '--preset-color': getPresetColor(presetId) } as React.CSSProperties}
          >
            <div className="preset-icon">{getPresetIcon(presetId)}</div>
            <h3 className="preset-name">{preset.name}</h3>
            <p className="preset-description">{preset.description}</p>

            <div className="preset-settings">
              <h4>Includes:</h4>
              <ul>
                {preset.settings.showAge !== undefined && (
                  <li>{preset.settings.showAge ? '✓' : '✗'} Show age</li>
                )}
                {(preset.settings.showDistance !== undefined || preset.settings.hideDistance !== undefined) && (
                  <li>{showDistanceValue ? '✓' : '✗'} Show distance</li>
                )}
                {preset.settings.hideOnlineStatus !== undefined && (
                  <li>{preset.settings.hideOnlineStatus ? '✗' : '✓'} Online status visible</li>
                )}
                {preset.settings.hideFromSearch !== undefined && (
                  <li>{preset.settings.hideFromSearch ? '✗' : '✓'} Visible in search</li>
                )}
                {preset.settings.incognitoMode !== undefined && (
                  <li>{preset.settings.incognitoMode ? '✓' : '✗'} Incognito mode</li>
                )}
              </ul>
            </div>

            <button
              className="apply-button"
              onClick={() => onApplyPreset(presetId)}
              disabled={loading || currentPreset === presetId}
            >
              {currentPreset === presetId ? 'Active' : 'Apply Preset'}
            </button>
          </div>
        );})}
      </div>

      <style>{`
        .privacy-presets {
          margin-bottom: 3rem;
        }

        .privacy-presets h2 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .presets-description {
          font-size: 1rem;
          color: #6b7280;
          margin-bottom: 1.5rem;
        }

        .presets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .preset-card {
          background: white;
          border: 3px solid #e5e7eb;
          border-radius: 16px;
          padding: 1.5rem;
          transition: all 0.3s ease;
          position: relative;
        }

        .preset-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
          border-color: var(--preset-color);
        }

        .preset-card.active {
          border-color: var(--preset-color);
          background: linear-gradient(135deg, white 0%, rgba(139, 92, 246, 0.05) 100%);
          box-shadow: 0 8px 16px rgba(139, 92, 246, 0.15);
        }

        .preset-card.active::before {
          content: '✓';
          position: absolute;
          top: -10px;
          right: -10px;
          width: 30px;
          height: 30px;
          background: var(--preset-color);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .preset-icon {
          font-size: 3rem;
          text-align: center;
          margin-bottom: 1rem;
        }

        .preset-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          text-align: center;
          margin-bottom: 0.5rem;
          text-transform: capitalize;
        }

        .preset-description {
          font-size: 0.95rem;
          color: #6b7280;
          text-align: center;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .preset-settings {
          background: #f9fafb;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .preset-settings h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #4b5563;
          margin-bottom: 0.75rem;
        }

        .preset-settings ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .preset-settings li {
          font-size: 0.875rem;
          color: #6b7280;
          padding: 0.25rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .apply-button {
          width: 100%;
          padding: 0.875rem;
          background: var(--preset-color);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .apply-button:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-2px);
        }

        .apply-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 768px) {
          .presets-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
