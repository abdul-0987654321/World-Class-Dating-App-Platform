/**
 * Verification Badges Component
 * Display multiple verification types (photo, phone, email)
 */

import React from 'react';
import styled from 'styled-components';

interface VerificationBadgesProps {
  isPhotoVerified?: boolean;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  size?: 'small' | 'medium' | 'large';
  layout?: 'horizontal' | 'vertical' | 'stacked';
  showLabels?: boolean;
}

export const VerificationBadges: React.FC<VerificationBadgesProps> = ({
  isPhotoVerified = false,
  isPhoneVerified = false,
  isEmailVerified = false,
  size = 'medium',
  layout = 'horizontal',
  showLabels = false,
}) => {
  const badges: Array<{ type: string; icon: string; color: string; label: string }> = [];

  if (isPhotoVerified) {
    badges.push({
      type: 'photo',
      icon: '✓',
      color: '#4ECDC4',
      label: 'Photo Verified',
    });
  }

  if (isPhoneVerified) {
    badges.push({
      type: 'phone',
      icon: '📱',
      color: '#5B8DEF',
      label: 'Phone Verified',
    });
  }

  if (isEmailVerified) {
    badges.push({
      type: 'email',
      icon: '✉',
      color: '#7B68EE',
      label: 'Email Verified',
    });
  }

  if (badges.length === 0) {
    return null;
  }

  return (
    <Container layout={layout}>
      {badges.map((badge) => (
        <Badge key={badge.type} size={size} color={badge.color} title={badge.label}>
          <BadgeIcon size={size}>{badge.icon}</BadgeIcon>
          {showLabels && <BadgeLabel size={size}>{badge.label}</BadgeLabel>}
        </Badge>
      ))}
    </Container>
  );
};

// Single Badge Component
interface SingleBadgeProps {
  type: 'photo' | 'phone' | 'email';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const SingleVerificationBadge: React.FC<SingleBadgeProps> = ({
  type,
  size = 'medium',
  showLabel = false,
}) => {
  const badgeConfig = {
    photo: {
      icon: '✓',
      color: '#4ECDC4',
      label: 'Verified',
    },
    phone: {
      icon: '📱',
      color: '#5B8DEF',
      label: 'Phone',
    },
    email: {
      icon: '✉',
      color: '#7B68EE',
      label: 'Email',
    },
  };

  const config = badgeConfig[type];

  return (
    <Badge size={size} color={config.color} title={`${config.label} Verified`}>
      <BadgeIcon size={size}>{config.icon}</BadgeIcon>
      {showLabel && <BadgeLabel size={size}>{config.label}</BadgeLabel>}
    </Badge>
  );
};

// Verification Status Summary
interface VerificationSummaryProps {
  isPhotoVerified: boolean;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  className?: string;
}

export const VerificationSummary: React.FC<VerificationSummaryProps> = ({
  isPhotoVerified,
  isPhoneVerified,
  isEmailVerified,
  className,
}) => {
  const verifiedCount = [isPhotoVerified, isPhoneVerified, isEmailVerified].filter(Boolean).length;
  const totalCount = 3;
  const percentage = Math.round((verifiedCount / totalCount) * 100);

  return (
    <SummaryContainer className={className}>
      <SummaryText>
        <strong>
          {verifiedCount} of {totalCount}
        </strong>{' '}
        verifications complete
      </SummaryText>
      <ProgressBar>
        <ProgressFill percentage={percentage} />
      </ProgressBar>
      <VerificationList>
        <VerificationItem completed={isPhotoVerified}>
          <CheckIcon completed={isPhotoVerified}>{isPhotoVerified ? '✓' : '○'}</CheckIcon>
          <span>Photo Verification</span>
        </VerificationItem>
        <VerificationItem completed={isPhoneVerified}>
          <CheckIcon completed={isPhoneVerified}>{isPhoneVerified ? '✓' : '○'}</CheckIcon>
          <span>Phone Verification</span>
        </VerificationItem>
        <VerificationItem completed={isEmailVerified}>
          <CheckIcon completed={isEmailVerified}>{isEmailVerified ? '✓' : '○'}</CheckIcon>
          <span>Email Verification</span>
        </VerificationItem>
      </VerificationList>
    </SummaryContainer>
  );
};

// Styled Components
const Container = styled.div<{ layout: string }>`
  display: flex;
  flex-direction: ${(props) => (props.layout === 'vertical' ? 'column' : 'row')};
  gap: ${(props) => (props.layout === 'stacked' ? '4px' : '8px')};
  align-items: center;
`;

const Badge = styled.div<{ size: string; color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: ${(props) => {
    switch (props.size) {
      case 'small':
        return '2px 6px';
      case 'large':
        return '6px 12px';
      default:
        return '4px 8px';
    }
  }};
  background: ${(props) => props.color};
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }
`;

const BadgeIcon = styled.span<{ size: string }>`
  font-size: ${(props) => {
    switch (props.size) {
      case 'small':
        return '10px';
      case 'large':
        return '18px';
      default:
        return '14px';
    }
  }};
  color: white;
  font-weight: bold;
  line-height: 1;
`;

const BadgeLabel = styled.span<{ size: string }>`
  font-size: ${(props) => {
    switch (props.size) {
      case 'small':
        return '10px';
      case 'large':
        return '14px';
      default:
        return '12px';
    }
  }};
  color: white;
  font-weight: 600;
  white-space: nowrap;
`;

const SummaryContainer = styled.div`
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
`;

const SummaryText = styled.div`
  font-size: 14px;
  color: #333;
  margin-bottom: 12px;

  strong {
    color: #4ecdc4;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
`;

const ProgressFill = styled.div<{ percentage: number }>`
  width: ${(props) => props.percentage}%;
  height: 100%;
  background: linear-gradient(90deg, #4ecdc4, #5b8def);
  transition: width 0.3s ease;
`;

const VerificationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const VerificationItem = styled.div<{ completed: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: ${(props) => (props.completed ? '#4ECDC4' : '#999')};
  font-weight: ${(props) => (props.completed ? '600' : '400')};
`;

const CheckIcon = styled.span<{ completed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${(props) => (props.completed ? '#4ECDC4' : '#e0e0e0')};
  color: white;
  font-size: 12px;
  font-weight: bold;
`;
