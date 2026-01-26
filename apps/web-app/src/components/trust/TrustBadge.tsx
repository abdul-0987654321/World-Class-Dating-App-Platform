/**
 * Trust Badge Component
 * Displays trust level, badges, and verification status
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useTrustProfile } from '../../hooks/useTrust';
import {
  TrustLevel,
  TrustBadge as TrustBadgeType,
  TrustHighlight,
} from '../../services/trust.service';

interface TrustBadgeProps {
  userId: string;
  variant?: 'full' | 'compact' | 'mini';
  showHighlights?: boolean;
}

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Container = styled.div<{ $variant: string }>`
  display: flex;
  flex-direction: ${(props) => (props.$variant === 'mini' ? 'row' : 'column')};
  gap: ${(props) => (props.$variant === 'mini' ? '6px' : '12px')};
  align-items: ${(props) => (props.$variant === 'mini' ? 'center' : 'flex-start')};
`;

const BadgeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const LevelBadge = styled.div<{ $level: TrustLevel }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: ${(props) => {
    switch (props.$level) {
      case 'highly_trusted':
        return 'linear-gradient(135deg, #FFD700, #FFA500)';
      case 'trusted':
        return 'linear-gradient(135deg, var(--color-success), #10B981)';
      case 'established':
        return 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))';
      case 'building':
        return 'var(--color-info)';
      default:
        return 'var(--color-border)';
    }
  }};
  color: ${(props) => (props.$level === 'new' ? 'var(--color-text-secondary)' : 'white')};
`;

const VerificationIcon = styled.span<{ $verified: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 10px;
  background: ${(props) => (props.$verified ? 'var(--color-success)' : 'var(--color-border)')};
  color: ${(props) => (props.$verified ? 'white' : 'var(--color-text-secondary)')};
  cursor: help;
`;

const VerificationRow = styled.div`
  display: flex;
  gap: 6px;
`;

const BadgeIcon = styled.div<{ $type: TrustBadgeType }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  background: ${(props) => {
    switch (props.$type) {
      case 'verified_identity':
        return 'linear-gradient(135deg, #3B82F6, #1D4ED8)';
      case 'verified_photos':
        return 'linear-gradient(135deg, #8B5CF6, #6D28D9)';
      case 'community_champion':
        return 'linear-gradient(135deg, #FFD700, #F59E0B)';
      case 'trusted_member':
        return 'linear-gradient(135deg, #10B981, #059669)';
      default:
        return 'var(--color-info)';
    }
  }};
  color: white;
`;

const Highlights = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`;

const HighlightChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--color-background);
  border-radius: 16px;
  font-size: 12px;
  color: var(--color-text-secondary);
`;

const StatsRow = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
`;

const Stat = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;

  span {
    font-weight: 600;
    color: var(--color-text-primary);
  }
`;

const LoadingBadge = styled.div`
  width: 100px;
  height: 24px;
  border-radius: 12px;
  background: linear-gradient(
    90deg,
    var(--color-border) 0%,
    var(--color-surface) 50%,
    var(--color-border) 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

const LEVEL_LABELS: Record<TrustLevel, string> = {
  new: 'New Member',
  building: 'Building Trust',
  established: 'Established',
  trusted: 'Trusted',
  highly_trusted: 'Highly Trusted',
};

const BADGE_LABELS: Record<TrustBadgeType, { label: string; icon: string }> = {
  verified_identity: { label: 'ID Verified', icon: '✓' },
  verified_photos: { label: 'Photos Verified', icon: '📸' },
  trusted_member: { label: 'Trusted', icon: '⭐' },
  community_champion: { label: 'Champion', icon: '🏆' },
  long_standing_member: { label: 'Veteran', icon: '🎖️' },
};

export const TrustBadgeComponent: React.FC<TrustBadgeProps> = ({
  userId,
  variant = 'full',
  showHighlights = true,
}) => {
  const { profile, isLoading } = useTrustProfile(userId);

  if (isLoading) {
    return <LoadingBadge />;
  }

  if (!profile) {
    return null;
  }

  if (variant === 'mini') {
    return (
      <Container $variant={variant}>
        <LevelBadge $level={profile.level}>{LEVEL_LABELS[profile.level]}</LevelBadge>
        {profile.verificationStatus.photo && (
          <VerificationIcon $verified={true} title="Photos Verified">
            ✓
          </VerificationIcon>
        )}
      </Container>
    );
  }

  return (
    <Container $variant={variant}>
      <BadgeRow>
        <LevelBadge $level={profile.level}>{LEVEL_LABELS[profile.level]}</LevelBadge>
        {profile.badges.map((badge) => (
          <BadgeIcon key={badge} $type={badge}>
            {BADGE_LABELS[badge].icon} {BADGE_LABELS[badge].label}
          </BadgeIcon>
        ))}
      </BadgeRow>

      {variant === 'full' && (
        <>
          <VerificationRow>
            <VerificationIcon
              $verified={profile.verificationStatus.email}
              title={profile.verificationStatus.email ? 'Email Verified' : 'Email Not Verified'}
            >
              ✉
            </VerificationIcon>
            <VerificationIcon
              $verified={profile.verificationStatus.phone}
              title={profile.verificationStatus.phone ? 'Phone Verified' : 'Phone Not Verified'}
            >
              📱
            </VerificationIcon>
            <VerificationIcon
              $verified={profile.verificationStatus.photo}
              title={profile.verificationStatus.photo ? 'Photos Verified' : 'Photos Not Verified'}
            >
              📸
            </VerificationIcon>
            <VerificationIcon
              $verified={profile.verificationStatus.identity}
              title={profile.verificationStatus.identity ? 'ID Verified' : 'ID Not Verified'}
            >
              🪪
            </VerificationIcon>
          </VerificationRow>

          {showHighlights && profile.highlights.length > 0 && (
            <Highlights>
              {profile.highlights.map((highlight, index) => (
                <HighlightChip key={index}>
                  {highlight.iconEmoji} {highlight.label}
                </HighlightChip>
              ))}
            </Highlights>
          )}

          <StatsRow>
            <Stat>
              <span>{profile.communityStats.positiveRatings}</span> positive ratings
            </Stat>
            <Stat>
              <span>{profile.communityStats.endorsements}</span> endorsements
            </Stat>
          </StatsRow>
        </>
      )}
    </Container>
  );
};

export default TrustBadgeComponent;
