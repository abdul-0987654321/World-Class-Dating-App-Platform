/**
 * Network Quality Indicator Component
 * Displays network quality status during calls
 */

import React from 'react';
import { FaWifi } from 'react-icons/fa6';
import { NetworkQuality } from '../../services/agora.service';

interface NetworkQualityIndicatorProps {
  quality: NetworkQuality | null;
}

const NetworkQualityIndicator: React.FC<NetworkQualityIndicatorProps> = ({ quality }) => {
  if (!quality) {
    return null;
  }

  // Calculate average quality (1 = excellent, 6 = poor)
  const avgQuality = Math.max(quality.uplink, quality.downlink);

  let qualityLevel: 'excellent' | 'good' | 'fair' | 'poor';
  let qualityColor: string;
  let qualityText: string;

  if (avgQuality <= 2) {
    qualityLevel = 'excellent';
    qualityColor = '#10b981'; // green
    qualityText = 'Excellent';
  } else if (avgQuality <= 3) {
    qualityLevel = 'good';
    qualityColor = '#3b82f6'; // blue
    qualityText = 'Good';
  } else if (avgQuality <= 4) {
    qualityLevel = 'fair';
    qualityColor = '#f59e0b'; // orange
    qualityText = 'Fair';
  } else {
    qualityLevel = 'poor';
    qualityColor = '#ef4444'; // red
    qualityText = 'Poor';
  }

  return (
    <div className="network-quality-indicator" title={`Network Quality: ${qualityText}`}>
      <FaWifi style={{ color: qualityColor }} />
      <span className="quality-text" style={{ color: qualityColor }}>
        {qualityText}
      </span>
    </div>
  );
};

export default NetworkQualityIndicator;
