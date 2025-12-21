/**
 * Call Request Component
 * Allows users to initiate audio/video calls with matches
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { FaPhone, FaVideo, FaSpinner, FaTimes } from 'react-icons/fa';
import apiClient, { ApiError } from '../../services/api.client';

interface CallRequestProps {
  matchId: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  onCallInitiated: (callSession: CallSession) => void;
  onError?: (error: string) => void;
  onUpgradeRequired?: () => void;
}

interface CallSession {
  callId: string;
  channelName: string;
  agoraToken: string;
  callType: 'audio' | 'video';
  status: 'initiating' | 'ringing' | 'connected' | 'ended';
}

const CallRequest: React.FC<CallRequestProps> = ({
  matchId,
  recipientId,
  recipientName,
  recipientAvatar,
  onCallInitiated,
  onError,
  onUpgradeRequired,
}) => {
  const [isInitiating, setIsInitiating] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initiateCall = useCallback(async (type: 'audio' | 'video') => {
    try {
      setIsInitiating(true);
      setCallType(type);
      setError(null);

      const response = await apiClient.post<{ success: boolean; data: CallSession }>(
        '/api/calls/initiate',
        {
          matchId,
          recipientId,
          callType: type,
        }
      );

      if (response.success && response.data) {
        onCallInitiated(response.data);
      } else {
        throw new Error('Failed to initiate call');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 402) {
          // Subscription required
          if (onUpgradeRequired) {
            onUpgradeRequired();
          } else {
            setError('Video calls require a premium subscription');
          }
        } else if (err.status === 403) {
          setError('You cannot call this user');
        } else if (err.status === 409) {
          setError('User is currently in another call');
        } else {
          setError(err.message || 'Failed to initiate call');
        }
      } else {
        setError('Failed to initiate call. Please try again.');
      }

      if (onError) {
        onError(err instanceof Error ? err.message : 'Call failed');
      }
    } finally {
      setIsInitiating(false);
      setCallType(null);
    }
  }, [matchId, recipientId, onCallInitiated, onError, onUpgradeRequired]);

  const handleAudioCall = () => initiateCall('audio');
  const handleVideoCall = () => initiateCall('video');

  return (
    <Container>
      <RecipientInfo>
        {recipientAvatar ? (
          <Avatar src={recipientAvatar} alt={recipientName} />
        ) : (
          <AvatarPlaceholder>
            {recipientName[0]?.toUpperCase()}
          </AvatarPlaceholder>
        )}
        <RecipientName>{recipientName}</RecipientName>
      </RecipientInfo>

      <CallButtons>
        <CallButton
          onClick={handleAudioCall}
          disabled={isInitiating}
          $type="audio"
          aria-label="Start audio call"
        >
          {isInitiating && callType === 'audio' ? (
            <FaSpinner className="spin" />
          ) : (
            <FaPhone />
          )}
          <span>Audio Call</span>
        </CallButton>

        <CallButton
          onClick={handleVideoCall}
          disabled={isInitiating}
          $type="video"
          aria-label="Start video call"
        >
          {isInitiating && callType === 'video' ? (
            <FaSpinner className="spin" />
          ) : (
            <FaVideo />
          )}
          <span>Video Call</span>
        </CallButton>
      </CallButtons>

      {error && (
        <ErrorMessage>
          <FaTimes onClick={() => setError(null)} />
          <span>{error}</span>
        </ErrorMessage>
      )}

      <InfoText>
        Calls are end-to-end encrypted for your privacy.
      </InfoText>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  padding: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  margin: 0 auto;
`;

const RecipientInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
`;

const Avatar = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 12px;
`;

const AvatarPlaceholder = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 12px;
`;

const RecipientName = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
`;

const CallButtons = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
`;

const CallButton = styled.button<{ $type: 'audio' | 'video' }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 600;

  background-color: ${props => props.$type === 'video' ? '#3b82f6' : '#10b981'};
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props =>
      props.$type === 'video' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(16, 185, 129, 0.4)'
    };
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  svg {
    font-size: 24px;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  font-size: 14px;
  margin-bottom: 16px;

  svg {
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
      color: #7f1d1d;
    }
  }
`;

const InfoText = styled.div`
  text-align: center;
  font-size: 12px;
  color: #6b7280;
`;

export default CallRequest;
