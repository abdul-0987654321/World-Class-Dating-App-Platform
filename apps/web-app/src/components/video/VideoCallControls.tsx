/**
 * Video Call Controls Component
 * Control buttons for video/audio calls
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaPhoneSlash,
  FaDesktop,
  FaCameraRotate,
} from 'react-icons/fa6';

interface VideoCallControlsProps {
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  callType: 'video' | 'audio';
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
}

const VideoCallControls: React.FC<VideoCallControlsProps> = ({
  isMuted,
  isVideoEnabled,
  isScreenSharing,
  callType,
  onToggleMute,
  onToggleVideo,
  onSwitchCamera,
  onToggleScreenShare,
  onEndCall,
}) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="video-call-controls"
    >
      <div className="controls-wrapper">
        {/* Mute/Unmute */}
        <button
          className={`control-button ${isMuted ? 'active danger' : ''}`}
          onClick={onToggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          <div className="icon-wrapper">{isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}</div>
          <span className="control-label">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        {/* Video Toggle (only for video calls) */}
        {callType === 'video' && (
          <button
            className={`control-button ${!isVideoEnabled ? 'active danger' : ''}`}
            onClick={onToggleVideo}
            title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
          >
            <div className="icon-wrapper">{isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}</div>
            <span className="control-label">{isVideoEnabled ? 'Stop Video' : 'Start Video'}</span>
          </button>
        )}

        {/* End Call */}
        <button className="control-button end-call" onClick={onEndCall} title="End Call">
          <div className="icon-wrapper">
            <FaPhoneSlash />
          </div>
          <span className="control-label">End Call</span>
        </button>

        {/* Switch Camera (only for video calls) */}
        {callType === 'video' && isVideoEnabled && (
          <button className="control-button" onClick={onSwitchCamera} title="Switch Camera">
            <div className="icon-wrapper">
              <FaCameraRotate />
            </div>
            <span className="control-label">Flip</span>
          </button>
        )}

        {/* Screen Share (only for video calls) */}
        {callType === 'video' && (
          <button
            className={`control-button ${isScreenSharing ? 'active primary' : ''}`}
            onClick={onToggleScreenShare}
            title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
          >
            <div className="icon-wrapper">
              <FaDesktop />
            </div>
            <span className="control-label">{isScreenSharing ? 'Stop Share' : 'Share'}</span>
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default VideoCallControls;
