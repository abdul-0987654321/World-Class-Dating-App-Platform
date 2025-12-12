/**
 * Video Call Container Component
 * Main container for video/audio calling with Agora integration
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import AgoraService, { CallOptions, NetworkQuality, CallStatistics } from '../../services/agora.service';
import CallSignalingService from '../../services/call-signaling.service';
import VideoCallControls from './VideoCallControls';
import NetworkQualityIndicator from './NetworkQualityIndicator';
import CallStatisticsOverlay from './CallStatisticsOverlay';
import {
  setCallState,
  updateCallDuration,
  setNetworkQuality,
  clearCall
} from '../../store/slices/callSlice';
import './VideoCall.css';

interface VideoCallContainerProps {
  callId: string;
  channelName: string;
  agoraToken: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  callType: 'video' | 'audio';
  isIncoming?: boolean;
  onCallEnd: () => void;
}

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || '';

const VideoCallContainer: React.FC<VideoCallContainerProps> = ({
  callId,
  channelName,
  agoraToken,
  participantId,
  participantName,
  participantAvatar,
  callType,
  isIncoming = false,
  onCallEnd,
}) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: any) => state.auth.user);

  // State
  const [agoraService] = useState(() => new AgoraService({ appId: AGORA_APP_ID }));
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [networkQuality, setNetworkQualityState] = useState<NetworkQuality | null>(null);
  const [callStats, setCallStats] = useState<CallStatistics | null>(null);
  const [connectionState, setConnectionState] = useState<string>('CONNECTING');

  // Refs
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Setup Agora event listeners
   */
  useEffect(() => {
    const handleLocalVideoTrack = (track: any) => {
      if (localVideoRef.current) {
        track.play(localVideoRef.current);
      }
    };

    const handleRemoteVideoAdded = (uid: any, track: any) => {
      if (remoteVideoRef.current) {
        track.play(remoteVideoRef.current);
      }
      setIsConnected(true);
    };

    const handleRemoteVideoRemoved = () => {
      setIsConnected(false);
    };

    const handleUserJoined = () => {
      dispatch(setCallState('connected'));
      setConnectionState('CONNECTED');
    };

    const handleUserLeft = () => {
      dispatch(setCallState('ended'));
      handleEndCall('normal');
    };

    const handleConnectionStateChange = ({ curState }: any) => {
      setConnectionState(curState);
      if (curState === 'DISCONNECTED' || curState === 'DISCONNECTING') {
        handleEndCall('failed');
      }
    };

    const handleNetworkQuality = (quality: NetworkQuality) => {
      setNetworkQualityState(quality);
      dispatch(setNetworkQuality(quality));
    };

    const handleStatistics = (stats: CallStatistics) => {
      setCallStats(stats);
    };

    const handleError = (error: any) => {
      console.error('Agora error:', error);
      handleEndCall('failed');
    };

    agoraService.on('local-video-track', handleLocalVideoTrack);
    agoraService.on('remote-video-added', handleRemoteVideoAdded);
    agoraService.on('remote-video-removed', handleRemoteVideoRemoved);
    agoraService.on('user-joined', handleUserJoined);
    agoraService.on('user-left', handleUserLeft);
    agoraService.on('connection-state-change', handleConnectionStateChange);
    agoraService.on('network-quality', handleNetworkQuality);
    agoraService.on('statistics', handleStatistics);
    agoraService.on('error', handleError);

    return () => {
      agoraService.off('local-video-track', handleLocalVideoTrack);
      agoraService.off('remote-video-added', handleRemoteVideoAdded);
      agoraService.off('remote-video-removed', handleRemoteVideoRemoved);
      agoraService.off('user-joined', handleUserJoined);
      agoraService.off('user-left', handleUserLeft);
      agoraService.off('connection-state-change', handleConnectionStateChange);
      agoraService.off('network-quality', handleNetworkQuality);
      agoraService.off('statistics', handleStatistics);
      agoraService.off('error', handleError);
    };
  }, [agoraService, dispatch]);

  /**
   * Join channel on mount
   */
  useEffect(() => {
    const joinCall = async () => {
      try {
        const options: CallOptions = {
          video: callType === 'video',
          audio: true,
          videoQuality: 'high',
          enableBeauty: true,
          enableNoiseSuppression: true,
          enableEchoCancellation: true,
        };

        await agoraService.joinChannel(
          channelName,
          agoraToken,
          parseInt(currentUser.id),
          options
        );

        dispatch(setCallState('connected'));
        startDurationTimer();

        // Enable volume indicator
        agoraService.enableAudioVolumeIndicator(200);
      } catch (error) {
        console.error('Failed to join call:', error);
        handleEndCall('failed');
      }
    };

    joinCall();

    return () => {
      stopDurationTimer();
      agoraService.leaveChannel().catch(console.error);
    };
  }, []);

  /**
   * Start duration timer
   */
  const startDurationTimer = () => {
    durationTimerRef.current = setInterval(() => {
      setCallDuration((prev) => {
        const newDuration = prev + 1;
        dispatch(updateCallDuration(newDuration));
        return newDuration;
      });
    }, 1000);
  };

  /**
   * Stop duration timer
   */
  const stopDurationTimer = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  };

  /**
   * Auto-hide controls
   */
  useEffect(() => {
    if (isConnected && showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isConnected, showControls]);

  /**
   * Show controls on interaction
   */
  const handleInteraction = useCallback(() => {
    setShowControls(true);
  }, []);

  /**
   * Toggle microphone
   */
  const handleToggleMute = useCallback(async () => {
    try {
      const enabled = await agoraService.toggleMicrophone();
      setIsMuted(!enabled);
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
    }
  }, [agoraService]);

  /**
   * Toggle camera
   */
  const handleToggleVideo = useCallback(async () => {
    try {
      const enabled = await agoraService.toggleCamera();
      setIsVideoEnabled(enabled);
    } catch (error) {
      console.error('Failed to toggle camera:', error);
    }
  }, [agoraService]);

  /**
   * Switch camera
   */
  const handleSwitchCamera = useCallback(async () => {
    try {
      await agoraService.switchCamera();
    } catch (error) {
      console.error('Failed to switch camera:', error);
    }
  }, [agoraService]);

  /**
   * Toggle screen share
   */
  const handleToggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        await agoraService.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await agoraService.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error('Failed to toggle screen share:', error);
    }
  }, [agoraService, isScreenSharing]);

  /**
   * End call
   */
  const handleEndCall = useCallback(
    async (reason: string = 'normal') => {
      try {
        stopDurationTimer();
        await agoraService.leaveChannel();
        dispatch(clearCall());
        onCallEnd();
      } catch (error) {
        console.error('Failed to end call:', error);
        onCallEnd();
      }
    },
    [agoraService, dispatch, onCallEnd]
  );

  /**
   * Format duration
   */
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-call-container" onClick={handleInteraction}>
      {/* Remote Video */}
      <div className="remote-video-area">
        {isConnected ? (
          <div ref={remoteVideoRef} className="remote-video" />
        ) : (
          <div className="remote-video-placeholder">
            {participantAvatar ? (
              <img
                src={participantAvatar}
                alt={participantName}
                className="participant-avatar"
              />
            ) : (
              <div className="participant-avatar-placeholder">
                <span>{participantName[0]?.toUpperCase()}</span>
              </div>
            )}
            <h2 className="participant-name">{participantName}</h2>
            <p className="connection-status">
              {connectionState === 'CONNECTED' ? 'Waiting for participant...' : 'Connecting...'}
            </p>
          </div>
        )}
      </div>

      {/* Local Video (PIP) */}
      {isVideoEnabled && !isScreenSharing && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="local-video-pip"
        >
          <div ref={localVideoRef} className="local-video" />
        </motion.div>
      )}

      {/* Top Bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="video-call-top-bar"
          >
            <div className="call-info">
              <span className="participant-name">{participantName}</span>
              <span className="call-duration">{formatDuration(callDuration)}</span>
            </div>
            <div className="call-indicators">
              <NetworkQualityIndicator quality={networkQuality} />
              <button
                className="stats-toggle"
                onClick={() => setShowStats(!showStats)}
                title="Show Statistics"
              >
                <span>📊</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <AnimatePresence>
        {showControls && (
          <VideoCallControls
            isMuted={isMuted}
            isVideoEnabled={isVideoEnabled}
            isScreenSharing={isScreenSharing}
            callType={callType}
            onToggleMute={handleToggleMute}
            onToggleVideo={handleToggleVideo}
            onSwitchCamera={handleSwitchCamera}
            onToggleScreenShare={handleToggleScreenShare}
            onEndCall={() => handleEndCall('normal')}
          />
        )}
      </AnimatePresence>

      {/* Statistics Overlay */}
      <AnimatePresence>
        {showStats && callStats && (
          <CallStatisticsOverlay
            stats={callStats}
            onClose={() => setShowStats(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoCallContainer;
