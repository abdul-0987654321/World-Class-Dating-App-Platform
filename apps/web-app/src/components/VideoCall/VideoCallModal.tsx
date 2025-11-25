/**
 * Video Call Modal
 * Web component for video calling
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VideoCallClient, CallState, CallStatus } from '@heartly/video-sdk';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  isIncoming?: boolean;
  callId?: string;
  offer?: RTCSessionDescriptionInit;
  videoCallClient: VideoCallClient | null;
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
  videoCallClient,
}) => {
  const [callState, setCallState] = useState<CallStatus>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Setup video call client event listeners
  useEffect(() => {
    if (!videoCallClient) return;

    const handleStateChange = (state: CallState) => {
      setCallState(state.status);
    };

    const handleLocalStream = (stream: MediaStream) => {
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    };

    const handleRemoteStream = (stream: MediaStream) => {
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    const handleCallEnded = ({ reason, duration }: { reason: string; duration: number }) => {
      setCallDuration(duration);
      setTimeout(onClose, 2000);
    };

    videoCallClient.on('state-change', handleStateChange);
    videoCallClient.on('local-stream', handleLocalStream);
    videoCallClient.on('remote-stream', handleRemoteStream);
    videoCallClient.on('call-ended', handleCallEnded);

    return () => {
      videoCallClient.off('state-change', handleStateChange);
      videoCallClient.off('local-stream', handleLocalStream);
      videoCallClient.off('remote-stream', handleRemoteStream);
      videoCallClient.off('call-ended', handleCallEnded);
    };
  }, [videoCallClient, onClose]);

  // Duration timer
  useEffect(() => {
    if (callState === 'connected') {
      durationInterval.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [callState]);

  // Auto-hide controls
  useEffect(() => {
    if (callState === 'connected' && showControls) {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }

    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [callState, showControls]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartCall = useCallback(async () => {
    if (!videoCallClient) return;
    try {
      await videoCallClient.startCall(participantId, participantName, {
        video: true,
        audio: true,
      });
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  }, [videoCallClient, participantId, participantName]);

  const handleAcceptCall = useCallback(async () => {
    if (!videoCallClient || !callId || !offer) return;
    try {
      await videoCallClient.acceptCall(callId, participantId, offer, {
        video: true,
        audio: true,
      });
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  }, [videoCallClient, callId, participantId, offer]);

  const handleRejectCall = useCallback(() => {
    if (!videoCallClient || !callId) return;
    videoCallClient.rejectCall(callId, participantId);
    onClose();
  }, [videoCallClient, callId, participantId, onClose]);

  const handleEndCall = useCallback(() => {
    if (!videoCallClient) return;
    videoCallClient.endCall();
  }, [videoCallClient]);

  const toggleMute = useCallback(() => {
    if (!videoCallClient) return;
    const newMuted = videoCallClient.toggleAudio();
    setIsMuted(newMuted);
  }, [videoCallClient]);

  const toggleVideo = useCallback(() => {
    if (!videoCallClient) return;
    const newEnabled = videoCallClient.toggleVideo();
    setIsVideoEnabled(newEnabled);
  }, [videoCallClient]);

  const toggleScreenShare = useCallback(async () => {
    if (!videoCallClient) return;
    try {
      if (isScreenSharing) {
        await videoCallClient.stopScreenShare();
      } else {
        await videoCallClient.startScreenShare();
      }
      setIsScreenSharing(!isScreenSharing);
    } catch (error) {
      console.error('Screen share error:', error);
    }
  }, [videoCallClient, isScreenSharing]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
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
                  <img
                    src={participantAvatar}
                    alt={participantName}
                    className="w-32 h-32 rounded-full mx-auto mb-6 border-4 border-white"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-pink-500 flex items-center justify-center mx-auto mb-6 border-4 border-white">
                    <span className="text-5xl font-bold text-white">
                      {participantName[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <h2 className="text-2xl font-bold text-white mb-2">{participantName}</h2>
                <p className="text-gray-400">
                  {callState === 'idle' && 'Ready to call'}
                  {callState === 'ringing' && (isIncoming ? 'Incoming call...' : 'Calling...')}
                  {callState === 'connecting' && 'Connecting...'}
                  {callState === 'connected' && formatDuration(callDuration)}
                  {callState === 'ended' && 'Call ended'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video PIP */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-4 right-4 w-48 h-64 rounded-xl overflow-hidden border-2 border-white shadow-lg"
        >
          {isVideoEnabled && localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <span className="text-4xl">📷</span>
            </div>
          )}
        </motion.div>

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
                  <span className="text-white text-xl">←</span>
                </button>

                <div className="text-center">
                  <p className="text-white font-semibold">{participantName}</p>
                  {callState === 'connected' && (
                    <p className="text-white/70 text-sm">{formatDuration(callDuration)}</p>
                  )}
                </div>

                <div className="w-12" /> {/* Spacer */}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Controls */}
        {callState === 'idle' && (
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex justify-center gap-4">
              <button
                onClick={handleStartCall}
                className="flex items-center gap-2 px-8 py-4 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-semibold transition"
              >
                <span className="text-2xl">📹</span>
                Video Call
              </button>
              <button
                onClick={() => {
                  setIsVideoEnabled(false);
                  handleStartCall();
                }}
                className="flex items-center gap-2 px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold transition"
              >
                <span className="text-2xl">📞</span>
                Audio Call
              </button>
            </div>
          </div>
        )}

        {callState === 'ringing' && isIncoming && (
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex justify-center gap-16">
              <button
                onClick={handleRejectCall}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition">
                  <span className="text-2xl text-white">✕</span>
                </div>
                <span className="text-white mt-2">Decline</span>
              </button>
              <button
                onClick={handleAcceptCall}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition">
                  <span className="text-2xl">📞</span>
                </div>
                <span className="text-white mt-2">Accept</span>
              </button>
            </div>
          </div>
        )}

        {callState === 'ringing' && !isIncoming && (
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex justify-center">
              <button
                onClick={handleEndCall}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition">
                  <span className="text-2xl text-white">✕</span>
                </div>
                <span className="text-white mt-2">Cancel</span>
              </button>
            </div>
          </div>
        )}

        {callState === 'connected' && showControls && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/60 to-transparent"
          >
            <div className="flex justify-center gap-4">
              <button
                onClick={toggleMute}
                className={`flex flex-col items-center p-4 rounded-xl transition ${
                  isMuted ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <span className="text-2xl">{isMuted ? '🔇' : '🎤'}</span>
                <span className="text-white text-sm mt-1">
                  {isMuted ? 'Unmute' : 'Mute'}
                </span>
              </button>

              <button
                onClick={toggleVideo}
                className={`flex flex-col items-center p-4 rounded-xl transition ${
                  !isVideoEnabled ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <span className="text-2xl">{isVideoEnabled ? '📹' : '📷'}</span>
                <span className="text-white text-sm mt-1">
                  {isVideoEnabled ? 'Stop Video' : 'Start Video'}
                </span>
              </button>

              <button
                onClick={handleEndCall}
                className="flex flex-col items-center p-4 bg-red-500 hover:bg-red-600 rounded-xl transition"
              >
                <span className="text-2xl">📞</span>
                <span className="text-white text-sm mt-1">End</span>
              </button>

              <button
                onClick={toggleScreenShare}
                className={`flex flex-col items-center p-4 rounded-xl transition ${
                  isScreenSharing ? 'bg-blue-500' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <span className="text-2xl">🖥️</span>
                <span className="text-white text-sm mt-1">
                  {isScreenSharing ? 'Stop Share' : 'Share Screen'}
                </span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Click to show controls */}
        {callState === 'connected' && !showControls && (
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setShowControls(true)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoCallModal;
