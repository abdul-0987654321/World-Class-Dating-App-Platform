/**
 * Incoming Call Component
 * Displays incoming call notification with accept/reject options
 */

import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaPhone, FaPhoneSlash, FaVideo, FaTimes } from 'react-icons/fa';
import apiClient, { ApiError } from '../../services/api.client';

interface IncomingCallProps {
  callId: string;
  callerName: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
  onAccept: (callSession: CallSession) => void;
  onReject: () => void;
}

interface CallSession {
  callId: string;
  channelName: string;
  agoraToken: string;
  callType: 'audio' | 'video';
  status: string;
}

const IncomingCall: React.FC<IncomingCallProps> = ({
  callId,
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onReject,
}) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play ringtone on mount
  useEffect(() => {
    try {
      audioRef.current = new Audio('/sounds/ringtone.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(() => {
        // Autoplay may be blocked by browser
        console.log('Ringtone autoplay blocked');
      });
    } catch (err) {
      console.error('Failed to load ringtone:', err);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleAccept = async () => {
    try {
      setIsAccepting(true);
      setError(null);

      // Stop ringtone
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const response = await apiClient.post<{ success: boolean; data: CallSession }>(
        `/api/calls/${callId}/accept`
      );

      if (response.success && response.data) {
        onAccept(response.data);
      } else {
        throw new Error('Failed to accept call');
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setError('Video calls require a premium subscription');
      } else {
        setError('Failed to accept call. The caller may have hung up.');
      }
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsRejecting(true);

      // Stop ringtone
      if (audioRef.current) {
        audioRef.current.pause();
      }

      await apiClient.post(`/api/calls/${callId}/reject`);
      onReject();
    } catch (err) {
      // Even if API fails, still reject locally
      onReject();
    }
  };

  return (
    <Overlay>
      <Container>
        <PulsingBackground />

        <CallerInfo>
          <AvatarContainer>
            {callerAvatar ? (
              <Avatar src={callerAvatar} alt={callerName} />
            ) : (
              <AvatarPlaceholder>
                {callerName[0]?.toUpperCase()}
              </AvatarPlaceholder>
            )}
            <AvatarRing />
          </AvatarContainer>

          <CallerName>{callerName}</CallerName>
          <CallTypeIndicator>
            {callType === 'video' ? <FaVideo /> : <FaPhone />}
            <span>Incoming {callType} call</span>
          </CallTypeIndicator>
        </CallerInfo>

        {error && (
          <ErrorMessage>
            <FaTimes onClick={() => setError(null)} />
            <span>{error}</span>
          </ErrorMessage>
        )}

        <ActionButtons>
          <RejectButton
            onClick={handleReject}
            disabled={isAccepting || isRejecting}
            aria-label="Reject call"
          >
            <ButtonIcon $type="reject">
              <FaPhoneSlash />
            </ButtonIcon>
            <ButtonLabel>Decline</ButtonLabel>
          </RejectButton>

          <AcceptButton
            onClick={handleAccept}
            disabled={isAccepting || isRejecting}
            aria-label="Accept call"
          >
            <ButtonIcon $type="accept">
              {callType === 'video' ? <FaVideo /> : <FaPhone />}
            </ButtonIcon>
            <ButtonLabel>Accept</ButtonLabel>
          </AcceptButton>
        </ActionButtons>
      </Container>
    </Overlay>
  );
};

// Animations
const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.1;
  }
  100% {
    transform: scale(1);
    opacity: 0.3;
  }
`;

const ring = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
`;

// Styled Components
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 24px;
`;

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 400px;
  width: 100%;
`;

const PulsingBackground = styled.div`
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.3), transparent);
  animation: ${pulse} 2s ease-in-out infinite;
`;

const CallerInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 48px;
  z-index: 1;
`;

const AvatarContainer = styled.div`
  position: relative;
  margin-bottom: 24px;
`;

const Avatar = styled.img`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid white;
`;

const AvatarPlaceholder = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 48px;
  font-weight: 700;
  border: 4px solid white;
`;

const AvatarRing = styled.div`
  position: absolute;
  inset: -8px;
  border: 3px solid #10b981;
  border-radius: 50%;
  animation: ${ring} 1.5s ease-out infinite;
`;

const CallerName = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin: 0 0 8px 0;
  text-align: center;
`;

const CallTypeIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;

  svg {
    font-size: 18px;
  }
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 8px;
  color: #fca5a5;
  font-size: 14px;
  margin-bottom: 24px;
  z-index: 1;

  svg {
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
      color: white;
    }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 48px;
  z-index: 1;
`;

const ActionButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    transform: scale(1.1);
  }
`;

const RejectButton = styled(ActionButton)``;
const AcceptButton = styled(ActionButton)``;

const ButtonIcon = styled.div<{ $type: 'accept' | 'reject' }>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.$type === 'accept' ? '#10b981' : '#ef4444'};
  color: white;
  font-size: 24px;
  box-shadow: 0 4px 16px ${props =>
    props.$type === 'accept' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
  };
`;

const ButtonLabel = styled.span`
  color: white;
  font-size: 14px;
  font-weight: 500;
`;

export default IncomingCall;
