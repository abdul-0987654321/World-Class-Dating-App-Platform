/**
 * Call Manager Component
 * Orchestrates video/voice call UI components
 * Manages incoming call notifications and active call modals
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { useVideoCallContext } from '../../contexts/VideoCallContext';
import VideoCallModal from './VideoCallModal';
import VoiceCallScreen from './VoiceCallScreen';
import IncomingCallNotification from './IncomingCallNotification';

// Interface for caching audio analyser resources per stream
interface AudioAnalyserCache {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
  dataArray: Uint8Array;
  streamId: string;
}

const CallManager: React.FC = () => {
  // Cache for audio analysers to avoid recreating on every call
  const localAnalyserRef = useRef<AudioAnalyserCache | null>(null);
  const remoteAnalyserRef = useRef<AudioAnalyserCache | null>(null);

  const {
    callState,
    incomingCall,
    localStream,
    remoteStream,
    callStats,
    showCallModal,
    showIncomingCallNotification,
    acceptIncomingCall,
    rejectIncomingCall,
    endCurrentCall,
    toggleMute,
    toggleVideo,
    setShowCallModal,
  } = useVideoCallContext();

  // Handle accepting call from notification
  const handleAcceptCall = useCallback(async () => {
    try {
      await acceptIncomingCall();
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  }, [acceptIncomingCall]);

  // Handle rejecting call from notification
  const handleRejectCall = useCallback(() => {
    rejectIncomingCall('rejected');
  }, [rejectIncomingCall]);

  // Handle ending current call
  const handleEndCall = useCallback(() => {
    endCurrentCall('user_ended');
  }, [endCurrentCall]);

  // Handle closing call modal
  const handleCloseModal = useCallback(() => {
    if (
      callState.status === 'connected' ||
      callState.status === 'ringing' ||
      callState.status === 'connecting'
    ) {
      // If call is active, end it
      handleEndCall();
    } else {
      setShowCallModal(false);
    }
  }, [callState.status, handleEndCall, setShowCallModal]);

  // Handle toggling mute
  const handleToggleMute = useCallback(() => {
    toggleMute();
  }, [toggleMute]);

  // Handle switching to video call from voice call
  const handleSwitchToVideo = useCallback(() => {
    toggleVideo();
  }, [toggleVideo]);

  // Get participant info
  const getParticipantName = useCallback(() => {
    return callState.remoteParticipant?.name || incomingCall?.callerName || 'Unknown';
  }, [callState.remoteParticipant, incomingCall]);

  const getParticipantAvatar = useCallback(() => {
    return callState.remoteParticipant?.avatarUrl || incomingCall?.callerAvatar;
  }, [callState.remoteParticipant, incomingCall]);

  const getParticipantId = useCallback(() => {
    return callState.remoteParticipant?.id || incomingCall?.callerId || '';
  }, [callState.remoteParticipant, incomingCall]);

  // Determine if this is a video or voice call
  const isVideoCall = callState.callType === 'video' || incomingCall?.callType === 'video';

  // Calculate network quality from call stats
  const getNetworkQuality = useCallback((): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (!callStats) return 'good';

    const { jitter, roundTripTime, packetsLost } = callStats;

    if (roundTripTime < 100 && jitter < 30 && packetsLost < 10) {
      return 'excellent';
    } else if (roundTripTime < 200 && jitter < 50 && packetsLost < 50) {
      return 'good';
    } else if (roundTripTime < 400 && jitter < 100) {
      return 'fair';
    } else {
      return 'poor';
    }
  }, [callStats]);

  // Get voice call status from call state
  const getVoiceCallStatus = useCallback((): 'ringing' | 'connecting' | 'connected' | 'ended' => {
    switch (callState.status) {
      case 'idle':
      case 'initiating':
      case 'ringing':
        return 'ringing';
      case 'connecting':
      case 'reconnecting':
        return 'connecting';
      case 'connected':
        return 'connected';
      case 'ended':
      case 'failed':
      case 'rejected':
      case 'busy':
      case 'missed':
      default:
        return 'ended';
    }
  }, [callState.status]);

  // Helper to create or get cached audio analyser for a stream
  const getOrCreateAnalyser = useCallback(
    (
      stream: MediaStream,
      cacheRef: React.MutableRefObject<AudioAnalyserCache | null>
    ): AudioAnalyserCache | null => {
      // Check if we already have a valid analyser for this stream
      const streamId = stream.id;
      const cached = cacheRef.current;

      if (cached && cached.streamId === streamId) {
        // Verify the audio context is still usable
        if (cached.audioContext.state !== 'closed') {
          return cached;
        }
        // Context was closed, need to recreate
        cacheRef.current = null;
      }

      // Clean up old analyser if stream changed
      if (cached && cached.streamId !== streamId) {
        try {
          cached.source.disconnect();
          if (cached.audioContext.state !== 'closed') {
            cached.audioContext.close();
          }
        } catch {
          // Ignore cleanup errors
        }
        cacheRef.current = null;
      }

      // Create new analyser for this stream
      try {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const newCache: AudioAnalyserCache = {
          audioContext,
          analyser,
          source,
          dataArray,
          streamId,
        };

        cacheRef.current = newCache;
        return newCache;
      } catch {
        // Failed to create audio context or analyser
        return null;
      }
    },
    []
  );

  // Calculate audio levels from streams using Web Audio API AnalyserNode
  const getAudioLevel = useCallback(
    (stream: MediaStream | null, isLocal: boolean = true): number => {
      if (!stream) return 0;

      // Check if stream has audio tracks
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return 0;

      // Check if track is enabled and unmuted
      const track = audioTracks[0];
      if (!track.enabled || track.muted) return 0;

      // Get or create the appropriate analyser
      const cacheRef = isLocal ? localAnalyserRef : remoteAnalyserRef;
      const analyserCache = getOrCreateAnalyser(stream, cacheRef);

      if (!analyserCache) return 0;

      // Resume audio context if suspended (required for some browsers)
      if (analyserCache.audioContext.state === 'suspended') {
        analyserCache.audioContext.resume();
      }

      // Get frequency data
      analyserCache.analyser.getByteFrequencyData(analyserCache.dataArray);

      // Calculate average level from frequency data
      let sum = 0;
      const dataArray = analyserCache.dataArray;
      const length = dataArray.length;

      for (let i = 0; i < length; i++) {
        sum += dataArray[i];
      }

      const average = sum / length;

      // Normalize to 0-1 range (byte data is 0-255)
      return average / 255;
    },
    [getOrCreateAnalyser]
  );

  // Close modal when call ends naturally
  useEffect(() => {
    if (
      callState.status === 'ended' ||
      callState.status === 'failed' ||
      callState.status === 'rejected' ||
      callState.status === 'missed'
    ) {
      // Modal will auto-close after showing end state
      const timer = setTimeout(() => {
        setShowCallModal(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [callState.status, setShowCallModal]);

  // Cleanup audio analysers when component unmounts or streams change
  useEffect(() => {
    return () => {
      // Cleanup local analyser
      if (localAnalyserRef.current) {
        try {
          localAnalyserRef.current.source.disconnect();
          if (localAnalyserRef.current.audioContext.state !== 'closed') {
            localAnalyserRef.current.audioContext.close();
          }
        } catch {
          // Ignore cleanup errors
        }
        localAnalyserRef.current = null;
      }

      // Cleanup remote analyser
      if (remoteAnalyserRef.current) {
        try {
          remoteAnalyserRef.current.source.disconnect();
          if (remoteAnalyserRef.current.audioContext.state !== 'closed') {
            remoteAnalyserRef.current.audioContext.close();
          }
        } catch {
          // Ignore cleanup errors
        }
        remoteAnalyserRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {/* Incoming Call Notification (toast style) */}
      <IncomingCallNotification
        isVisible={showIncomingCallNotification && !showCallModal}
        callerName={incomingCall?.callerName || ''}
        callerAvatar={incomingCall?.callerAvatar}
        isVideoCall={incomingCall?.callType === 'video'}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />

      {/* Active Call UI */}
      {showCallModal && (
        <>
          {isVideoCall ? (
            <VideoCallModal
              isOpen={showCallModal}
              onClose={handleCloseModal}
              participantId={getParticipantId()}
              participantName={getParticipantName()}
              participantAvatar={getParticipantAvatar()}
              isIncoming={!!incomingCall && callState.status === 'ringing'}
              callId={callState.callId || incomingCall?.callId}
              offer={incomingCall?.sdp}
            />
          ) : (
            <VoiceCallScreen
              callId={callState.callId || ''}
              participantName={getParticipantName()}
              participantAvatar={getParticipantAvatar()}
              isMuted={callState.localParticipant?.isMuted || false}
              isRemoteMuted={callState.remoteParticipant?.isMuted || false}
              duration={callState.duration}
              status={getVoiceCallStatus()}
              networkQuality={getNetworkQuality()}
              onToggleMute={handleToggleMute}
              onEndCall={handleEndCall}
              onSwitchToVideo={handleSwitchToVideo}
              audioLevel={getAudioLevel(localStream, true)}
              remoteAudioLevel={getAudioLevel(remoteStream, false)}
            />
          )}
        </>
      )}
    </>
  );
};

export default CallManager;
