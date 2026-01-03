/**
 * Video Call Modal
 * Web component for video calling using WebRTC via context
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoCallContext } from '../../contexts/VideoCallContext';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  isIncoming?: boolean;
  callId?: string;
  offer?: RTCSessionDescriptionInit;
}

const VideoCallModal: React.FC<VideoCallModalProps> = ({
  isOpen,
  onClose,
  participantId,
  participantName,
  participantAvatar,
  isIncoming = false,
  callId,
  offer,
}) => {
  const {
    callState,
    localStream,
    remoteStream,
    callStats,
    acceptIncomingCall,
    rejectIncomingCall,
    endCurrentCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useVideoCallContext();

  const [showControls, setShowControls] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localVideoMirrored, setLocalVideoMirrored] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set up local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Set up remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Auto-hide controls when connected
  useEffect(() => {
    if (callState.status === 'connected' && showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [callState.status, showControls]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAcceptCall = useCallback(async () => {
    try {
      await acceptIncomingCall();
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  }, [acceptIncomingCall]);

  const handleRejectCall = useCallback(() => {
    rejectIncomingCall('rejected');
    onClose();
  }, [rejectIncomingCall, onClose]);

  const handleEndCall = useCallback(() => {
    endCurrentCall('user_ended');
  }, [endCurrentCall]);

  const handleToggleMute = useCallback(() => {
    toggleMute();
  }, [toggleMute]);

  const handleToggleVideo = useCallback(() => {
    toggleVideo();
  }, [toggleVideo]);

  const handleToggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        await stopScreenShare();
        setIsScreenSharing(false);
        setLocalVideoMirrored(true);
      } else {
        await startScreenShare();
        setIsScreenSharing(true);
        setLocalVideoMirrored(false);
      }
    } catch (error) {
      console.error('Screen share error:', error);
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  const handleShowControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  }, []);

  const getNetworkQualityIndicator = useCallback(() => {
    if (!callStats) return { bars: 4, color: 'text-green-400', label: 'Good' };

    const { jitter, roundTripTime, packetsLost } = callStats;

    // Simple quality calculation
    if (roundTripTime < 100 && jitter < 30 && packetsLost < 10) {
      return { bars: 4, color: 'text-green-400', label: 'Excellent' };
    } else if (roundTripTime < 200 && jitter < 50 && packetsLost < 50) {
      return { bars: 3, color: 'text-green-400', label: 'Good' };
    } else if (roundTripTime < 400 && jitter < 100) {
      return { bars: 2, color: 'text-yellow-400', label: 'Fair' };
    } else {
      return { bars: 1, color: 'text-red-400', label: 'Poor' };
    }
  }, [callStats]);

  const getStatusText = useCallback((): string => {
    switch (callState.status) {
      case 'idle':
        return 'Ready to call';
      case 'initiating':
        return 'Starting call...';
      case 'ringing':
        return isIncoming ? 'Incoming call...' : 'Calling...';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return formatDuration(callState.duration);
      case 'reconnecting':
        return 'Reconnecting...';
      case 'ended':
        return 'Call ended';
      case 'failed':
        return callState.error || 'Call failed';
      case 'rejected':
        return 'Call declined';
      case 'busy':
        return 'User is busy';
      case 'missed':
        return 'Missed call';
      default:
        return '';
    }
  }, [callState, isIncoming]);

  const isMuted = callState.localParticipant?.isMuted ?? false;
  const isVideoEnabled = callState.localParticipant?.isVideoEnabled ?? true;
  const networkQuality = getNetworkQualityIndicator();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
        onClick={handleShowControls}
      >
        {/* Remote Video */}
        <div className="absolute inset-0 bg-gray-900">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                {participantAvatar ? (
                  <motion.img
                    src={participantAvatar}
                    alt={participantName}
                    className="w-32 h-32 rounded-full mx-auto mb-6 border-4 border-white/30"
                    animate={callState.status === 'ringing' ? {
                      scale: [1, 1.05, 1],
                      borderColor: ['rgba(255,255,255,0.3)', 'rgba(236,72,153,0.6)', 'rgba(255,255,255,0.3)'],
                    } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                ) : (
                  <motion.div
                    className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mx-auto mb-6 border-4 border-white/30"
                    animate={callState.status === 'ringing' ? {
                      scale: [1, 1.05, 1],
                    } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <span className="text-5xl font-bold text-white">
                      {participantName[0]?.toUpperCase()}
                    </span>
                  </motion.div>
                )}
                <h2 className="text-2xl font-bold text-white mb-2">{participantName}</h2>
                <p className="text-gray-400">{getStatusText()}</p>

                {/* Connection quality indicator when connected */}
                {callState.status === 'connected' && (
                  <div className={`mt-4 flex items-center justify-center gap-2 ${networkQuality.color}`}>
                    <svg viewBox="0 0 24 24" className="w-5 h-5">
                      <path fill="currentColor" d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2c-3.87-3.87-10.14-3.87-14 0z"/>
                    </svg>
                    <span className="text-sm">{networkQuality.label}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Local Video PIP */}
        {isVideoEnabled && localStream && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            className="absolute top-20 right-4 w-32 h-44 md:w-48 md:h-64 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg cursor-move"
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${localVideoMirrored ? 'transform scale-x-[-1]' : ''}`}
            />
            {isMuted && (
              <div className="absolute bottom-2 left-2 bg-red-500 rounded-full p-1">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white">
                  <path fill="currentColor" d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                </svg>
              </div>
            )}
          </motion.div>
        )}

        {/* Top Bar */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent"
            >
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                <button
                  onClick={onClose}
                  className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-white">
                    <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                  </svg>
                </button>

                <div className="text-center">
                  <p className="text-white font-semibold">{participantName}</p>
                  {callState.status === 'connected' && (
                    <p className="text-white/70 text-sm">{formatDuration(callState.duration)}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {callState.status === 'connected' && (
                    <div className={`flex items-center gap-1 ${networkQuality.color}`}>
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 rounded-full ${i < networkQuality.bars ? 'bg-current' : 'bg-white/30'}`}
                          style={{ height: `${(i + 1) * 4}px` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Incoming Call UI */}
        {callState.status === 'ringing' && isIncoming && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent"
          >
            <div className="flex justify-center gap-16">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRejectCall}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition shadow-lg shadow-red-500/30">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-white">
                    <path fill="currentColor" d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                  </svg>
                </div>
                <span className="text-white mt-3 font-medium">Decline</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAcceptCall}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition shadow-lg shadow-green-500/30">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-white">
                    <path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                  </svg>
                </div>
                <span className="text-white mt-3 font-medium">Accept</span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Outgoing Ringing UI */}
        {callState.status === 'ringing' && !isIncoming && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent"
          >
            <div className="flex justify-center">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEndCall}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition shadow-lg shadow-red-500/30">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-white">
                    <path fill="currentColor" d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                  </svg>
                </div>
                <span className="text-white mt-3 font-medium">Cancel</span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Connected Call Controls */}
        {(callState.status === 'connected' || callState.status === 'connecting' || callState.status === 'reconnecting') && showControls && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent"
          >
            <div className="flex justify-center gap-4 md:gap-6">
              {/* Mute Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleToggleMute}
                className={`flex flex-col items-center p-4 rounded-2xl transition ${
                  isMuted ? 'bg-red-500/80' : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-white">
                  {isMuted ? (
                    <path fill="currentColor" d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                  ) : (
                    <path fill="currentColor" d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                  )}
                </svg>
                <span className="text-white text-sm mt-2">
                  {isMuted ? 'Unmute' : 'Mute'}
                </span>
              </motion.button>

              {/* Video Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleToggleVideo}
                className={`flex flex-col items-center p-4 rounded-2xl transition ${
                  !isVideoEnabled ? 'bg-red-500/80' : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-white">
                  {isVideoEnabled ? (
                    <path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                  ) : (
                    <path fill="currentColor" d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
                  )}
                </svg>
                <span className="text-white text-sm mt-2">
                  {isVideoEnabled ? 'Stop Video' : 'Start Video'}
                </span>
              </motion.button>

              {/* End Call Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEndCall}
                className="flex flex-col items-center p-4 bg-red-500 hover:bg-red-600 rounded-2xl transition shadow-lg shadow-red-500/30"
              >
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-white">
                  <path fill="currentColor" d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                </svg>
                <span className="text-white text-sm mt-2">End</span>
              </motion.button>

              {/* Screen Share Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleToggleScreenShare}
                className={`flex flex-col items-center p-4 rounded-2xl transition ${
                  isScreenSharing ? 'bg-blue-500' : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-white">
                  <path fill="currentColor" d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
                </svg>
                <span className="text-white text-sm mt-2">
                  {isScreenSharing ? 'Stop Share' : 'Share'}
                </span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Call Ended Overlay */}
        {(callState.status === 'ended' || callState.status === 'failed' || callState.status === 'rejected' || callState.status === 'missed') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-red-400">
                  <path fill="currentColor" d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {callState.status === 'ended' && 'Call Ended'}
                {callState.status === 'failed' && 'Call Failed'}
                {callState.status === 'rejected' && 'Call Declined'}
                {callState.status === 'missed' && 'No Answer'}
              </h3>
              {callState.duration > 0 && (
                <p className="text-gray-400 mb-6">
                  Duration: {formatDuration(callState.duration)}
                </p>
              )}
              {callState.error && (
                <p className="text-red-400 text-sm mb-6">{callState.error}</p>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoCallModal;
