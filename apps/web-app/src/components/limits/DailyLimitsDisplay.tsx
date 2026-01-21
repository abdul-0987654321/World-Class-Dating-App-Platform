import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FiHeart, FiStar, FiRotateCcw } from 'react-icons/fi';
import { usageLimitService, UserLimits } from '../../services/usage-limit.service';

const Container = styled.div`
  background: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.md};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const LimitsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
`;

const LimitItem = styled.div<{ isNearLimit: boolean; isReached: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ isReached, isNearLimit, theme }) =>
    isReached
      ? theme.colors.error + '10'
      : isNearLimit
        ? theme.colors.warning + '10'
        : theme.colors.backgroundSecondary};
  border: 1px solid
    ${({ isReached, isNearLimit, theme }) =>
      isReached ? theme.colors.error : isNearLimit ? theme.colors.warning : 'transparent'};
`;

const LimitIcon = styled.div<{ isReached: boolean }>`
  font-size: ${({ theme }) => theme.fontSize.lg};
  color: ${({ isReached, theme }) => (isReached ? theme.colors.error : theme.colors.primary)};
`;

const LimitContent = styled.div`
  flex: 1;
`;

const LimitLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 2px;
`;

const LimitValue = styled.div<{ isReached: boolean }>`
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ isReached, theme }) => (isReached ? theme.colors.error : theme.colors.text)};
`;

const UnlimitedBadge = styled.span`
  background: ${({ theme }) => theme.colors.success};
  color: white;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
`;

const ResetTime = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: ${({ theme }) => theme.spacing.sm};
  text-align: center;
`;

const LoadingText = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: ${({ theme }) => theme.spacing.md};
`;

interface DailyLimitsDisplayProps {
  onLimitReached?: (type: string) => void;
}

export const DailyLimitsDisplay: React.FC<DailyLimitsDisplayProps> = ({ onLimitReached }) => {
  const [limits, setLimits] = useState<UserLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLimits();
  }, []);

  const loadLimits = async () => {
    try {
      const data = await usageLimitService.getUserLimits();
      setLimits(data);

      // Check if any limits are reached and notify parent
      if (onLimitReached) {
        Object.entries(data).forEach(([type, info]) => {
          if (info?.isReached) {
            onLimitReached(type);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'likes':
        return <FiHeart />;
      case 'super_likes':
        return <FiStar />;
      case 'rewinds':
        return <FiRotateCcw />;
      default:
        return <FiHeart />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'likes':
        return 'Likes';
      case 'super_likes':
        return 'Super Likes';
      case 'rewinds':
        return 'Rewinds';
      case 'swipes':
        return 'Swipes';
      default:
        return type;
    }
  };

  const formatResetTime = (resetAt: Date) => {
    const now = new Date();
    const reset = new Date(resetAt);
    const diff = reset.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `Resets in ${hours}h ${minutes}m`;
    }
    return `Resets in ${minutes}m`;
  };

  if (loading) {
    return (
      <Container>
        <LoadingText>Loading limits...</LoadingText>
      </Container>
    );
  }

  if (!limits || Object.keys(limits).length === 0) {
    return (
      <Container>
        <Title>Your Limits</Title>
        <UnlimitedBadge>✨ Unlimited - Premium User</UnlimitedBadge>
      </Container>
    );
  }

  // Find the earliest reset time
  const resetTimes = Object.values(limits)
    .map((limit) => limit?.resetAt)
    .filter(Boolean) as Date[];
  const nextReset =
    resetTimes.length > 0 ? new Date(Math.min(...resetTimes.map((d) => d.getTime()))) : null;

  return (
    <Container>
      <Title>Daily Limits</Title>
      <LimitsGrid>
        {Object.entries(limits).map(([type, info]) => {
          if (!info) return null;

          const isNearLimit = info.remaining <= Math.ceil(info.limit * 0.2); // 20% or less
          const isReached = info.isReached;

          return (
            <LimitItem key={type} isNearLimit={isNearLimit} isReached={isReached}>
              <LimitIcon isReached={isReached}>{getIcon(type)}</LimitIcon>
              <LimitContent>
                <LimitLabel>{getLabel(type)}</LimitLabel>
                <LimitValue isReached={isReached}>
                  {info.remaining} / {info.limit}
                </LimitValue>
              </LimitContent>
            </LimitItem>
          );
        })}
      </LimitsGrid>
      {nextReset && <ResetTime>{formatResetTime(nextReset)}</ResetTime>}
    </Container>
  );
};
