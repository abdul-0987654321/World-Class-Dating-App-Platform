import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaCheckCircle, FaExclamationTriangle, FaBan, FaHourglass, FaEye } from 'react-icons/fa';
import ModerationStatusBadge from '../Moderation/ModerationStatusBadge';

export interface PhotoModerationInfo {
  id: string;
  url: string;
  moderationStatus: 'approved' | 'pending' | 'flagged' | 'rejected';
  riskScore?: number;
  violations?: string[];
  moderatedAt?: string;
  reviewedAt?: string;
  reviewerNotes?: string;
}

interface PhotoWithModerationStatusProps {
  photo: PhotoModerationInfo;
  showStatusBadge?: boolean;
  showDetailsOnHover?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: (photo: PhotoModerationInfo) => void;
  isAdmin?: boolean;
}

const PhotoWithModerationStatus: React.FC<PhotoWithModerationStatusProps> = ({
  photo,
  showStatusBadge = true,
  showDetailsOnHover = false,
  size = 'medium',
  onClick,
  isAdmin = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick(photo);
    } else if (isAdmin && showDetailsOnHover) {
      setShowDetails(!showDetails);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'flagged':
        return '#f59e0b';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const shouldBlurPhoto = () => {
    // Blur rejected or flagged photos for non-admin users
    if (isAdmin) return false;
    return photo.moderationStatus === 'rejected' || photo.moderationStatus === 'flagged';
  };

  return (
    <PhotoContainer
      $size={size}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      $clickable={!!onClick || (isAdmin && showDetailsOnHover)}
    >
      <PhotoImage
        src={photo.url}
        alt="User photo"
        $blur={shouldBlurPhoto()}
        $size={size}
      />

      {/* Status Badge Overlay */}
      {showStatusBadge && (
        <StatusBadgeOverlay $position={size === 'small' ? 'top-right' : 'top-left'}>
          <ModerationStatusBadge
            status={photo.moderationStatus}
            size={size === 'small' ? 'small' : 'medium'}
            showText={size !== 'small'}
          />
        </StatusBadgeOverlay>
      )}

      {/* Rejected/Flagged Warning Overlay */}
      {shouldBlurPhoto() && (
        <WarningOverlay>
          {photo.moderationStatus === 'rejected' ? (
            <>
              <WarningIcon>
                <FaBan />
              </WarningIcon>
              <WarningText>Content Rejected</WarningText>
            </>
          ) : (
            <>
              <WarningIcon>
                <FaExclamationTriangle />
              </WarningIcon>
              <WarningText>Flagged for Review</WarningText>
            </>
          )}
        </WarningOverlay>
      )}

      {/* Admin Details on Hover */}
      {isAdmin && showDetailsOnHover && (isHovered || showDetails) && (
        <DetailsOverlay>
          <DetailsContent onClick={(e) => e.stopPropagation()}>
            <DetailsHeader>
              <h4>Moderation Details</h4>
              <CloseButton onClick={() => setShowDetails(false)}>×</CloseButton>
            </DetailsHeader>

            <DetailRow>
              <DetailLabel>Status:</DetailLabel>
              <DetailValue>
                <ModerationStatusBadge status={photo.moderationStatus} size="small" />
              </DetailValue>
            </DetailRow>

            {photo.riskScore !== undefined && (
              <DetailRow>
                <DetailLabel>Risk Score:</DetailLabel>
                <DetailValue>
                  <RiskScore $score={photo.riskScore}>
                    {(photo.riskScore * 100).toFixed(0)}%
                  </RiskScore>
                </DetailValue>
              </DetailRow>
            )}

            {photo.violations && photo.violations.length > 0 && (
              <DetailRow>
                <DetailLabel>Violations:</DetailLabel>
                <ViolationsList>
                  {photo.violations.map((violation, idx) => (
                    <ViolationTag key={idx}>{violation.replace(/_/g, ' ')}</ViolationTag>
                  ))}
                </ViolationsList>
              </DetailRow>
            )}

            {photo.moderatedAt && (
              <DetailRow>
                <DetailLabel>Moderated:</DetailLabel>
                <DetailValue>{new Date(photo.moderatedAt).toLocaleString()}</DetailValue>
              </DetailRow>
            )}

            {photo.reviewedAt && (
              <DetailRow>
                <DetailLabel>Reviewed:</DetailLabel>
                <DetailValue>{new Date(photo.reviewedAt).toLocaleString()}</DetailValue>
              </DetailRow>
            )}

            {photo.reviewerNotes && (
              <DetailRow>
                <DetailLabel>Notes:</DetailLabel>
                <DetailValue>{photo.reviewerNotes}</DetailValue>
              </DetailRow>
            )}

            <ViewFullDetailsButton onClick={() => onClick?.(photo)}>
              <FaEye /> View Full Details
            </ViewFullDetailsButton>
          </DetailsContent>
        </DetailsOverlay>
      )}

      {/* Pending Status Animation */}
      {photo.moderationStatus === 'pending' && (
        <PendingIndicator>
          <FaHourglass />
        </PendingIndicator>
      )}
    </PhotoContainer>
  );
};

const PhotoContainer = styled.div<{ $size: string; $clickable: boolean }>`
  position: relative;
  width: ${(props) => {
    switch (props.$size) {
      case 'small':
        return '120px';
      case 'large':
        return '400px';
      default:
        return '200px';
    }
  }};
  height: ${(props) => {
    switch (props.$size) {
      case 'small':
        return '120px';
      case 'large':
        return '400px';
      default:
        return '200px';
    }
  }};
  border-radius: 12px;
  overflow: hidden;
  cursor: ${(props) => (props.$clickable ? 'pointer' : 'default')};
  transition: transform 0.2s ease;

  &:hover {
    transform: ${(props) => (props.$clickable ? 'scale(1.02)' : 'none')};
  }
`;

const PhotoImage = styled.img<{ $blur: boolean; $size: string }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: ${(props) => (props.$blur ? 'blur(20px)' : 'none')};
  transition: filter 0.3s ease;
`;

const StatusBadgeOverlay = styled.div<{ $position: string }>`
  position: absolute;
  ${(props) =>
    props.$position === 'top-right'
      ? 'top: 8px; right: 8px;'
      : 'top: 8px; left: 8px;'}
  z-index: 2;
`;

const WarningOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 1;
`;

const WarningIcon = styled.div`
  font-size: 48px;
  margin-bottom: 8px;
`;

const WarningText = styled.div`
  font-size: 16px;
  font-weight: 600;
  text-align: center;
`;

const DetailsOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  padding: 16px;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const DetailsContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 16px;
  max-width: 100%;
  max-height: 100%;
  overflow-y: auto;
  color: #111827;
`;

const DetailsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;

  h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 28px;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;

  &:hover {
    color: #111827;
  }
`;

const DetailRow = styled.div`
  margin-bottom: 12px;

  &:last-of-type {
    margin-bottom: 16px;
  }
`;

const DetailLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const DetailValue = styled.div`
  font-size: 14px;
  color: #111827;
`;

const RiskScore = styled.span<{ $score: number }>`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 700;
  background: ${(props) => {
    if (props.$score >= 0.9) return '#fee2e2';
    if (props.$score >= 0.7) return '#fef3c7';
    if (props.$score >= 0.5) return '#dbeafe';
    return '#d1fae5';
  }};
  color: ${(props) => {
    if (props.$score >= 0.9) return '#991b1b';
    if (props.$score >= 0.7) return '#92400e';
    if (props.$score >= 0.5) return '#1e40af';
    return '#065f46';
  }};
`;

const ViolationsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const ViolationTag = styled.span`
  display: inline-block;
  padding: 4px 8px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
`;

const ViewFullDetailsButton = styled.button`
  width: 100%;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s;

  &:hover {
    background: #2563eb;
  }

  svg {
    font-size: 16px;
  }
`;

const PendingIndicator = styled.div`
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  background: rgba(245, 158, 11, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  animation: pulse 2s ease-in-out infinite;
  z-index: 2;

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

export default PhotoWithModerationStatus;
