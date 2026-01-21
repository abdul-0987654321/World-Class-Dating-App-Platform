/**
 * Active Call Component
 * Displays active call UI with controls during audio/video call
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaPhone,
  FaVolumeUp,
  FaVolumeMute,
  FaExchangeAlt,
  FaExpand,
  FaCompress,
  FaDesktop,
} from 'react-icons/fa';
import apiClient from '../../services/api.client';

interface ActiveCallProps {
  callId: string;
  channelName: string;
  agoraToken: string;
  callType: 'audio' | 'video';
  participantName: string;
  participantAvatar?: string;
  isOutgoing?: boolean;
  onCallEnd: (reason: string) => void;
}

interface CallStats {
  duration: number;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  audioLevel: number;
}

const ActiveCall: React.FC<ActiveCallProps> = ({
  callId,
  channelName,
  agoraToken,
  callType,
  participantName,
  participantAvatar,
  isOutgoing = false,
  onCallEnd,
}) => {
  // State
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [duration, setDuration] = useState(0);
  const [networkQuality, setNetworkQuality] = useState<CallStats['networkQuality']>('unknown');
  const [showControls, setShowControls] = useState(true);

  // Refs
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Simulate connection (in real app, integrate with Agora SDK)
  useEffect(() => {
    const connectTimer = setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      startDurationTimer();
    }, 2000);

    return () => {
      clearTimeout(connectTimer);
      stopDurationTimer();
    };
  }, []);

  // Start duration timer
  const startDurationTimer = () => {
    durationTimerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  // Stop duration timer
  const stopDurationTimer = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-hide controls
  useEffect(() => {
    if (isConnected && showControls && callType === 'video') {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isConnected, showControls, callType]);

  // Show controls on interaction
  const handleInteraction = useCallback(() => {
    setShowControls(true);
  }, []);

  // Toggle mute
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    // In real app, toggle Agora audio track
  }, []);

  // Toggle video
  const handleToggleVideo = useCallback(() => {
    setIsVideoEnabled((prev) => !prev);
    // In real app, toggle Agora video track
  }, []);

  // Toggle speaker
  const handleToggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev);
    // In real app, toggle audio output
  }, []);

  // Switch camera
  const handleSwitchCamera = useCallback(() => {
    // In real app, switch Agora camera
  }, []);

  // Toggle fullscreen
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // End call
  const handleEndCall = useCallback(async () => {
    try {
      stopDurationTimer();
      await apiClient.post(`/api/calls/${callId}/end`);
      onCallEnd('user_ended');
    } catch (err) {
      // End locally even if API fails
      onCallEnd('user_ended');
    }
  }, [callId, onCallEnd]);

  // Get network quality color
  const getNetworkQualityColor = () => {
    switch (networkQuality) {
      case 'excellent':
        return '#10b981';
      case 'good':
        return '#22c55e';
      case 'fair':
        return '#f59e0b';
      case 'poor':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <Container ref={containerRef} onClick={handleInteraction}>
      {/* Video Area */}
      {callType === 'video' ? (
        <VideoContainer>
          {/* Remote Video */}
          <RemoteVideo ref={remoteVideoRef}>
            {isConnected ? (
              <VideoPlaceholder>
                {participantAvatar ? (
                  <PlaceholderAvatar src={participantAvatar} alt={participantName} />
                ) : (
                  <PlaceholderInitial>{participantName[0]?.toUpperCase()}</PlaceholderInitial>
                )}
                <PlaceholderText>Video will appear here</PlaceholderText>
              </VideoPlaceholder>
            ) : (
              <ConnectingOverlay>
                <PulseCircle />
                <ConnectingText>{isOutgoing ? 'Calling...' : 'Connecting...'}</ConnectingText>
              </ConnectingOverlay>
            )}
          </RemoteVideo>

          {/* Local Video (PIP) */}
          {isVideoEnabled && (
            <LocalVideoPip ref={localVideoRef}>
              <VideoPlaceholder $small>
                <PlaceholderText>You</PlaceholderText>
              </VideoPlaceholder>
            </LocalVideoPip>
          )}
        </VideoContainer>
      ) : (
        <AudioContainer>
          <AudioAvatar>
            {participantAvatar ? (
              <img src={participantAvatar} alt={participantName} />
            ) : (
              <AudioAvatarPlaceholder>{participantName[0]?.toUpperCase()}</AudioAvatarPlaceholder>
            )}
            {isSpeakerOn && <SpeakingIndicator $active={true} />}
          </AudioAvatar>
          <ParticipantName>{participantName}</ParticipantName>
          <CallStatus>
            {isConnecting
              ? isOutgoing
                ? 'Calling...'
                : 'Connecting...'
              : formatDuration(duration)}
          </CallStatus>
        </AudioContainer>
      )}

      {/* Top Bar */}
      {showControls && (
        <TopBar>
          <CallInfo>
            <ParticipantNameSmall>{participantName}</ParticipantNameSmall>
            <CallDuration>{formatDuration(duration)}</CallDuration>
          </CallInfo>
          <NetworkIndicator $color={getNetworkQualityColor()}>
            <span />
            <span />
            <span />
          </NetworkIndicator>
        </TopBar>
      )}

      {/* Controls */}
      {showControls && (
        <Controls>
          <ControlButton
            onClick={handleToggleMute}
            $active={isMuted}
            $type="toggle"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
          </ControlButton>

          {callType === 'video' && (
            <ControlButton
              onClick={handleToggleVideo}
              $active={!isVideoEnabled}
              $type="toggle"
              aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
            </ControlButton>
          )}

          <ControlButton
            onClick={handleToggleSpeaker}
            $active={!isSpeakerOn}
            $type="toggle"
            aria-label={isSpeakerOn ? 'Turn off speaker' : 'Turn on speaker'}
          >
            {isSpeakerOn ? <FaVolumeUp /> : <FaVolumeMute />}
          </ControlButton>

          {callType === 'video' && (
            <ControlButton onClick={handleSwitchCamera} $type="action" aria-label="Switch camera">
              <FaExchangeAlt />
            </ControlButton>
          )}

          <EndCallButton onClick={handleEndCall} aria-label="End call">
            <FaPhone />
          </EndCallButton>

          {callType === 'video' && (
            <ControlButton
              onClick={handleToggleFullscreen}
              $type="action"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <FaCompress /> : <FaExpand />}
            </ControlButton>
          )}
        </Controls>
      )}
    </Container>
  );
};

// Animations
const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
`;

// Styled Components
const Container = styled.div`
  position: fixed;
  inset: 0;
  background: #111827;
  display: flex;
  flex-direction: column;
  z-index: 9999;
`;

const VideoContainer = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const RemoteVideo = styled.div`
  position: absolute;
  inset: 0;
  background: #1f2937;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LocalVideoPip = styled.div`
  position: absolute;
  bottom: 120px;
  right: 16px;
  width: 120px;
  height: 160px;
  border-radius: 12px;
  overflow: hidden;
  background: #374151;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const VideoPlaceholder = styled.div<{ $small?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${(props) => (props.$small ? '4px' : '16px')};
  color: white;
  width: 100%;
  height: 100%;
`;

const PlaceholderAvatar = styled.img`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
`;

const PlaceholderInitial = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 700;
`;

const PlaceholderText = styled.span`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
`;

const ConnectingOverlay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
`;

const PulseCircle = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #3b82f6;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid #3b82f6;
    animation: ${pulse} 1.5s ease-out infinite;
  }
`;

const ConnectingText = styled.span`
  font-size: 18px;
  color: white;
`;

const AudioContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
`;

const AudioAvatar = styled.div`
  position: relative;

  img {
    width: 160px;
    height: 160px;
    border-radius: 50%;
    object-fit: cover;
  }
`;

const AudioAvatarPlaceholder = styled.div`
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 64px;
  font-weight: 700;
`;

const SpeakingIndicator = styled.div<{ $active: boolean }>`
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 3px solid #10b981;
  opacity: ${(props) => (props.$active ? 1 : 0)};
  transition: opacity 0.2s;
`;

const ParticipantName = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin: 0;
`;

const CallStatus = styled.div`
  font-size: 18px;
  color: rgba(255, 255, 255, 0.8);
`;

const TopBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), transparent);
`;

const CallInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ParticipantNameSmall = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: white;
`;

const CallDuration = styled.span`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
`;

const NetworkIndicator = styled.div<{ $color: string }>`
  display: flex;
  gap: 2px;
  align-items: flex-end;

  span {
    width: 4px;
    background: ${(props) => props.$color};
    border-radius: 2px;

    &:nth-child(1) {
      height: 8px;
    }
    &:nth-child(2) {
      height: 12px;
    }
    &:nth-child(3) {
      height: 16px;
    }
  }
`;

const Controls = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent);
`;

const ControlButton = styled.button<{ $active?: boolean; $type: 'toggle' | 'action' }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 20px;

  background: ${(props) => (props.$active ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.2)')};
  color: ${(props) => (props.$active ? '#ef4444' : 'white')};

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const EndCallButton = styled.button`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  background: #ef4444;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 24px;
  margin: 0 16px;

  svg {
    transform: rotate(135deg);
  }

  &:hover {
    background: #dc2626;
    transform: scale(1.1);
  }
`;

export default ActiveCall;
