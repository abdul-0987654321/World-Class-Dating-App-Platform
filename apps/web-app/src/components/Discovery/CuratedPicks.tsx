/**
 * Curated Picks Component
 * Displays daily curated profile selections
 */

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  FiStar,
  FiClock,
  FiZap,
  FiUserPlus,
  FiActivity,
  FiHeart,
  FiChevronRight,
  FiRefreshCw,
  FiAlertCircle,
} from 'react-icons/fi';
import { CuratedPick } from '../../services/curated-picks.service';

export interface CuratedPicksProps {
  picks: CuratedPick[];
  expiresAt: string;
  tier: string;
  onPickClick: (pick: CuratedPick) => void;
  onLike: (userId: string, pickId: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const Container = styled.div`
  padding: 16px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    color: #ffd700;
  }
`;

const Subtitle = styled.p`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin: 4px 0 0 0;
`;

const ExpiryBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 107, 107, 0.2);
  border-radius: 20px;
  font-size: 12px;
  color: #ff6b6b;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const PicksGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const PickCard = styled.div<{ category: string }>`
  display: flex;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  animation: ${fadeInUp} 0.4s ease-out;

  ${({ category }) => {
    switch (category) {
      case 'top_pick':
        return `
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 107, 107, 0.1) 100%);
          border-color: rgba(255, 215, 0, 0.3);
        `;
      default:
        return '';
    }
  }}

  &:hover {
    transform: translateX(4px);
    border-color: rgba(255, 107, 107, 0.3);
  }
`;

const PickPhoto = styled.div`
  position: relative;
  width: 100px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CategoryBadge = styled.div<{ category: string }>`
  position: absolute;
  top: 6px;
  left: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);

  svg {
    width: 14px;
    height: 14px;
    color: ${({ category }) => {
      switch (category) {
        case 'top_pick':
          return '#FFD700';
        case 'high_compatibility':
          return '#FF6B6B';
        case 'new_user':
          return '#4ECDC4';
        case 'recently_active':
          return '#95E1D3';
        case 'mutual_interest':
          return '#A78BFA';
        default:
          return 'white';
      }
    }};
  }
`;

const PickInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
`;

const PickName = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin: 0 0 4px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PickAge = styled.span`
  font-weight: 400;
  opacity: 0.8;
`;

const PickLocation = styled.p`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 8px 0;
`;

const ReasonsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const ReasonTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(255, 107, 107, 0.15);
  border-radius: 12px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);

  svg {
    width: 10px;
    height: 10px;
    color: #ff6b6b;
  }
`;

const PickActions = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
`;

const LikeButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 20px rgba(255, 107, 107, 0.4);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const ViewButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const LoadingCard = styled.div`
  display: flex;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;

  .photo-skeleton {
    width: 100px;
    height: 120px;
    border-radius: 12px;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.05) 0%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0.05) 100%
    );
    background-size: 200% 100%;
    animation: ${shimmer} 1.5s infinite;
  }

  .info-skeleton {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;

    .line {
      height: 16px;
      border-radius: 4px;
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.05) 0%,
        rgba(255, 255, 255, 0.1) 50%,
        rgba(255, 255, 255, 0.05) 100%
      );
      background-size: 200% 100%;
      animation: ${shimmer} 1.5s infinite;

      &.short {
        width: 60%;
      }
      &.medium {
        width: 80%;
      }
      &.long {
        width: 100%;
      }
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.6);

  svg {
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
    opacity: 0.4;
  }

  h3 {
    font-size: 18px;
    margin-bottom: 8px;
    color: white;
  }

  p {
    font-size: 14px;
  }
`;

const ErrorState = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 107, 107, 0.15);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 12px;
  color: #ff6b6b;
  font-size: 14px;

  svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .message {
    flex: 1;
  }

  button {
    padding: 8px 16px;
    background: rgba(255, 107, 107, 0.2);
    border: 1px solid rgba(255, 107, 107, 0.3);
    border-radius: 8px;
    color: #ff6b6b;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 107, 107, 0.3);
    }
  }
`;

const CompatibilityScore = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  margin-left: auto;
`;

const VerifiedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: #4ecdc4;
  border-radius: 50%;
  margin-left: 4px;

  &::after {
    content: '';
    width: 6px;
    height: 3px;
    border-left: 2px solid white;
    border-bottom: 2px solid white;
    transform: rotate(-45deg) translateY(-1px);
  }
`;

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'top_pick':
      return <FiStar />;
    case 'high_compatibility':
      return <FiZap />;
    case 'new_user':
      return <FiUserPlus />;
    case 'recently_active':
      return <FiActivity />;
    case 'mutual_interest':
      return <FiHeart />;
    default:
      return <FiStar />;
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'top_pick':
      return 'Top Pick';
    case 'high_compatibility':
      return 'High Match';
    case 'new_user':
      return 'New Member';
    case 'recently_active':
      return 'Active Now';
    case 'mutual_interest':
      return 'Common Interests';
    default:
      return 'Pick';
  }
};

const getTimeRemaining = (expiresAt: string) => {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins}m left`;
  }
  return `${diffHours}h left`;
};

export const CuratedPicks: React.FC<CuratedPicksProps> = ({
  picks,
  expiresAt,
  tier,
  onPickClick,
  onLike,
  onRefresh,
  loading = false,
  error = null,
}) => {
  const [likeLoading, setLikeLoading] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const handleLike = async (e: React.MouseEvent, userId: string, pickId: string) => {
    e.stopPropagation();
    if (likeLoading.has(userId)) return;

    setLikeLoading((prev) => new Set(prev).add(userId));
    try {
      await onLike(userId, pickId);
    } catch (error) {
      console.error('Failed to like:', error);
    } finally {
      setLikeLoading((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('Failed to refresh picks:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const canRefresh = ['premium', 'elite'].includes(tier);

  return (
    <Container>
      <Header>
        <HeaderLeft>
          <div>
            <Title>
              <FiStar />
              Today's Picks
            </Title>
            <Subtitle>Curated just for you</Subtitle>
          </div>
          <ExpiryBadge>
            <FiClock />
            {getTimeRemaining(expiresAt)}
          </ExpiryBadge>
        </HeaderLeft>

        {canRefresh && onRefresh && (
          <RefreshButton onClick={handleRefresh} disabled={loading || refreshing}>
            <FiRefreshCw style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </RefreshButton>
        )}
      </Header>

      {error && (
        <ErrorState>
          <FiAlertCircle />
          <span className="message">{error}</span>
          {onRefresh && <button onClick={handleRefresh}>Retry</button>}
        </ErrorState>
      )}

      <PicksGrid>
        {loading ? (
          <>
            <LoadingCard>
              <div className="photo-skeleton" />
              <div className="info-skeleton">
                <div className="line medium" />
                <div className="line short" />
                <div className="line long" />
              </div>
            </LoadingCard>
            <LoadingCard>
              <div className="photo-skeleton" />
              <div className="info-skeleton">
                <div className="line medium" />
                <div className="line short" />
                <div className="line long" />
              </div>
            </LoadingCard>
          </>
        ) : picks.length === 0 ? (
          <EmptyState>
            <FiStar />
            <h3>No picks yet</h3>
            <p>Your daily curated picks will appear here</p>
          </EmptyState>
        ) : (
          picks.map((pick, index) => (
            <PickCard
              key={pick.pickId}
              category={pick.category}
              onClick={() => onPickClick(pick)}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <PickPhoto>
                <img
                  src={
                    pick.profile.photos[0] || 'https://via.placeholder.com/100x120?text=No+Photo'
                  }
                  alt={pick.profile.displayName}
                  loading="lazy"
                />
                <CategoryBadge category={pick.category}>
                  {getCategoryIcon(pick.category)}
                </CategoryBadge>
              </PickPhoto>

              <PickInfo>
                <PickName>
                  {pick.profile.displayName}
                  <PickAge>{pick.profile.age}</PickAge>
                  {pick.profile.verified && <VerifiedBadge title="Verified" />}
                  {pick.profile.compatibilityScore >= 80 && (
                    <CompatibilityScore>
                      <FiHeart style={{ width: 10, height: 10 }} />
                      {pick.profile.compatibilityScore}%
                    </CompatibilityScore>
                  )}
                </PickName>
                {pick.profile.city && <PickLocation>{pick.profile.city}</PickLocation>}
                <ReasonsList>
                  {pick.reasons.slice(0, 3).map((reason, i) => (
                    <ReasonTag key={i}>
                      <FiZap />
                      {reason}
                    </ReasonTag>
                  ))}
                </ReasonsList>
              </PickInfo>

              <PickActions>
                <LikeButton
                  onClick={(e) => handleLike(e, pick.userId, pick.pickId)}
                  disabled={likeLoading.has(pick.userId)}
                  title="Like"
                >
                  <FiHeart />
                </LikeButton>
                <ViewButton title="View Profile">
                  <FiChevronRight />
                </ViewButton>
              </PickActions>
            </PickCard>
          ))
        )}
      </PicksGrid>
    </Container>
  );
};

export default CuratedPicks;
