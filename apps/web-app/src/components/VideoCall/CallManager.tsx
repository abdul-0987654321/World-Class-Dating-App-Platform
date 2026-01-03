/**
 * Call Manager Component
 * Orchestrates video/voice call UI components
 * Manages incoming call notifications and active call modals
 */

import React, { useEffect, useCallback } from 'react';
import { useVideoCallContext } from '../../contexts/VideoCallContext';
import VideoCallModal from './VideoCallModal';
import VoiceCallScreen from './VoiceCallScreen';
import IncomingCallNotification from './IncomingCallNotification';

const CallManager: React.FC = () => {
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
    if (callState.status === 'connected' || callState.status === 'ringing' || callState.status === 'connecting') {
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

  // Calculate audio levels from streams (simplified - in production use AudioContext)
  const getAudioLevel = useCallback((stream: MediaStream | null): number => {
    if (!stream) return 0;

    // In production, use Web Audio API's AnalyserNode for accurate levels
    // This is a simplified version that returns a placeholder
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return 0;

    // Check if track is enabled and unmuted
    const track = audioTracks[0];
    if (!track.enabled || track.muted) return 0;

    // Return a random value between 0.1 and 0.5 to simulate audio activity
    // In production, this should use AnalyserNode.getByteFrequencyData()
    return Math.random() * 0.4 + 0.1;
  }, []);

  // Close modal when call ends naturally
  useEffect(() => {
    if (callState.status === 'ended' || callState.status === 'failed' ||
        callState.status === 'rejected' || callState.status === 'missed') {
      // Modal will auto-close after showing end state
      const timer = setTimeout(() => {
        setShowCallModal(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [callState.status, setShowCallModal]);

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
              audioLevel={getAudioLevel(localStream)}
              remoteAudioLevel={getAudioLevel(remoteStream)}
            />
          )}
        </>
      )}
    </>
  );
};

export default CallManager;
