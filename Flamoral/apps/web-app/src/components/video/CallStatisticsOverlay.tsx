/**
 * Call Statistics Overlay Component
 * Displays detailed call statistics for debugging/monitoring
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import { CallStatistics } from '../../services/agora.service';

interface CallStatisticsOverlayProps {
  stats: CallStatistics;
  onClose: () => void;
}

const CallStatisticsOverlay: React.FC<CallStatisticsOverlayProps> = ({ stats, onClose }) => {
  const formatBitrate = (bitrate: number): string => {
    if (bitrate >= 1000) {
      return `${(bitrate / 1000).toFixed(2)} Mbps`;
    }
    return `${bitrate.toFixed(0)} Kbps`;
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="call-statistics-overlay"
    >
      <div className="stats-header">
        <h3>Call Statistics</h3>
        <button className="close-button" onClick={onClose}>
          <FaTimes />
        </button>
      </div>

      <div className="stats-content">
        {/* Duration */}
        <div className="stat-item">
          <span className="stat-label">Duration:</span>
          <span className="stat-value">{formatDuration(stats.duration)}</span>
        </div>

        {/* Bitrate */}
        <div className="stat-section">
          <h4>Bitrate</h4>
          <div className="stat-item">
            <span className="stat-label">Send:</span>
            <span className="stat-value">{formatBitrate(stats.sendBitrate)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Receive:</span>
            <span className="stat-value">{formatBitrate(stats.receiveBitrate)}</span>
          </div>
        </div>

        {/* Packet Loss */}
        <div className="stat-section">
          <h4>Packet Loss</h4>
          <div className="stat-item">
            <span className="stat-label">Send:</span>
            <span className="stat-value">{stats.sendPacketLossRate.toFixed(2)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Receive:</span>
            <span className="stat-value">{stats.receivePacketLossRate.toFixed(2)}%</span>
          </div>
        </div>

        {/* Video Resolution */}
        {stats.videoSendResolution && (
          <div className="stat-section">
            <h4>Video Send Resolution</h4>
            <div className="stat-item">
              <span className="stat-value">
                {stats.videoSendResolution.width}x{stats.videoSendResolution.height}
              </span>
            </div>
          </div>
        )}

        {stats.videoReceiveResolution && (
          <div className="stat-section">
            <h4>Video Receive Resolution</h4>
            <div className="stat-item">
              <span className="stat-value">
                {stats.videoReceiveResolution.width}x{stats.videoReceiveResolution.height}
              </span>
            </div>
          </div>
        )}

        {/* Audio Bitrate */}
        <div className="stat-section">
          <h4>Audio Bitrate</h4>
          <div className="stat-item">
            <span className="stat-label">Send:</span>
            <span className="stat-value">{formatBitrate(stats.audioSendBitrate)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Receive:</span>
            <span className="stat-value">{formatBitrate(stats.audioReceiveBitrate)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CallStatisticsOverlay;
