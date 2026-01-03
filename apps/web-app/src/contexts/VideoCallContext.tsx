/**
 * Video Call Context
 * React context for managing video/voice call state across the app
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useVideoCall, CallState, CallType, IncomingCall, CallStats } from '../hooks/useVideoCall';

interface VideoCallContextValue {
  // State
  callState: CallState;
  incomingCall: IncomingCall | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callStats: CallStats | null;
  isConnected: boolean;
  showCallModal: boolean;
  showIncomingCallNotification: boolean;

  // Actions
  initiateCall: (recipientId: string, recipientName: string, recipientAvatar: string | undefined, callType: CallType) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  rejectIncomingCall: (reason?: string) => void;
  endCurrentCall: (reason?: string) => void;
  toggleMute: () => boolean;
  toggleVideo: () => boolean;
  switchCamera: () => Promise<void>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  setShowCallModal: (show: boolean) => void;
  dismissIncomingCallNotification: () => void;
}

const VideoCallContext = createContext<VideoCallContextValue | null>(null);

interface VideoCallProviderProps {
  children: ReactNode;
  serverUrl: string;
  token: string;
  userId: string;
  userName: string;
  userAvatar?: string;
}

export function VideoCallProvider({
  children,
  serverUrl,
  token,
  userId,
  userName,
  userAvatar,
}: VideoCallProviderProps) {
  const [showCallModal, setShowCallModal] = useState(false);
  const [showIncomingCallNotification, setShowIncomingCallNotification] = useState(false);
  const [pendingCall, setPendingCall] = useState<{
    recipientId: string;
    recipientName: string;
    recipientAvatar?: string;
    callType: CallType;
  } | null>(null);

  const handleIncomingCall = useCallback((call: IncomingCall) => {
    setShowIncomingCallNotification(true);
    // Play ringtone
    playRingtone();
  }, []);

  const handleCallEnded = useCallback((reason: string, duration: number) => {
    stopRingtone();
    setShowIncomingCallNotification(false);

    // Keep modal open briefly to show call ended state
    if (showCallModal) {
      setTimeout(() => {
        setShowCallModal(false);
      }, 2000);
    }
  }, [showCallModal]);

  const handleError = useCallback((error: Error) => {
    console.error('Video call error:', error);
    stopRingtone();
    // Could show a toast notification here
  }, []);

  const {
    callState,
    incomingCall,
    localStream,
    remoteStream,
    callStats,
    isConnected,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    startScreenShare,
    stopScreenShare,
  } = useVideoCall({
    serverUrl,
    token,
    userId,
    userName,
    userAvatar,
    onIncomingCall: handleIncomingCall,
    onCallEnded: handleCallEnded,
    onError: handleError,
  });

  // Ringtone management
  const ringtoneRef = React.useRef<HTMLAudioElement | null>(null);

  const playRingtone = useCallback(() => {
    try {
      if (!ringtoneRef.current) {
        ringtoneRef.current = new Audio('/sounds/ringtone.mp3');
        ringtoneRef.current.loop = true;
      }
      ringtoneRef.current.play().catch(() => {});
    } catch (error) {
      console.error('Failed to play ringtone:', error);
    }
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRingtone();
    };
  }, [stopRingtone]);

  // Handle call state changes
  useEffect(() => {
    if (callState.status === 'connected') {
      stopRingtone();
    }
  }, [callState.status, stopRingtone]);

  const initiateCall = useCallback(async (
    recipientId: string,
    recipientName: string,
    recipientAvatar: string | undefined,
    callType: CallType
  ) => {
    setPendingCall({ recipientId, recipientName, recipientAvatar, callType });
    setShowCallModal(true);

    try {
      await startCall(recipientId, recipientName, callType);
    } catch (error) {
      console.error('Failed to initiate call:', error);
      setShowCallModal(false);
      setPendingCall(null);
      throw error;
    }
  }, [startCall]);

  const acceptIncomingCall = useCallback(async () => {
    stopRingtone();
    setShowIncomingCallNotification(false);
    setShowCallModal(true);
    await acceptCall();
  }, [acceptCall, stopRingtone]);

  const rejectIncomingCall = useCallback((reason?: string) => {
    stopRingtone();
    setShowIncomingCallNotification(false);
    rejectCall(reason);
  }, [rejectCall, stopRingtone]);

  const endCurrentCall = useCallback((reason?: string) => {
    stopRingtone();
    endCall(reason);
  }, [endCall, stopRingtone]);

  const dismissIncomingCallNotification = useCallback(() => {
    stopRingtone();
    setShowIncomingCallNotification(false);
    if (incomingCall) {
      rejectCall('ignored');
    }
  }, [incomingCall, rejectCall, stopRingtone]);

  const value: VideoCallContextValue = {
    callState,
    incomingCall,
    localStream,
    remoteStream,
    callStats,
    isConnected,
    showCallModal,
    showIncomingCallNotification,
    initiateCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endCurrentCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    startScreenShare,
    stopScreenShare,
    setShowCallModal,
    dismissIncomingCallNotification,
  };

  return (
    <VideoCallContext.Provider value={value}>
      {children}
    </VideoCallContext.Provider>
  );
}

export function useVideoCallContext(): VideoCallContextValue {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error('useVideoCallContext must be used within a VideoCallProvider');
  }
  return context;
}

export default VideoCallContext;
