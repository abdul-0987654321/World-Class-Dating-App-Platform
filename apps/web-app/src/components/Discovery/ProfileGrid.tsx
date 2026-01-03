/**
 * Profile Grid Component
 * Alternative grid view for discovery (vs swipe cards)
 * Displays multiple profiles in a responsive grid layout
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { FiHeart, FiX, FiStar, FiMapPin, FiCheck, FiGrid, FiLayers, FiZap } from 'react-icons/fi';
import { DiscoveryProfile } from '../../services/discovery.service';

interface ProfileGridProps {
  profiles: DiscoveryProfile[];
  onLike: (userId: string) => Promise<void>;
  onPass: (userId: string) => Promise<void>;
  onSuperLike: (userId: string) => Promise<void>;
  onProfileClick: (profile: DiscoveryProfile) => void;
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  columns?: 2 | 3 | 4;
}

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const GridContainer = styled.div<{ columns: number }>`
  display: grid;
  grid-template-columns: repeat(${props => props.columns}, 1fr);
  gap: 16px;
  padding: 16px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 12px;
  }

  @media (max-width: 480px) {
    gap: 8px;
    padding: 8px;
  }
`;

const ProfileCard = styled.div`
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  animation: ${fadeIn} 0.3s ease-out;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 107, 107, 0.3);
  }
`;

const PhotoContainer = styled.div`
  position: relative;
  aspect-ratio: 3/4;
  overflow: hidden;
`;

const ProfilePhoto = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;

  ${ProfileCard}:hover & {
    transform: scale(1.05);
  }
`;

const PhotoOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: 60px 12px 12px;
`;

const ProfileInfo = styled.div`
  color: white;
`;

const NameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
`;

const Name = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0;

  @media (max-width: 480px) {
    font-size: 14px;
  }
`;

const Age = styled.span`
  font-size: 16px;
  opacity: 0.9;

  @media (max-width: 480px) {
    font-size: 14px;
  }
`;

const VerifiedBadge = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: #4ECDC4;
  border-radius: 50%;

  svg {
    width: 12px;
    height: 12px;
    color: white;
  }
`;

const LocationRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  opacity: 0.8;

  svg {
    width: 12px;
    height: 12px;
  }
`;

const CompatibilityBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;

  svg {
    width: 10px;
    height: 10px;
  }
`;

const OnlineBadge = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  width: 10px;
  height: 10px;
  background: #4ECDC4;
  border-radius: 50%;
  border: 2px solid white;
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  opacity: 0;
  transition: opacity 0.2s ease;

  ${ProfileCard}:hover & {
    opacity: 1;
  }

  @media (max-width: 768px) {
    opacity: 1;
    padding: 8px;
    gap: 6px;
  }
`;

const ActionButton = styled.button<{ variant: 'pass' | 'superlike' | 'like' }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  @media (max-width: 480px) {
    width: 36px;
    height: 36px;
  }

  ${({ variant }) => {
    switch (variant) {
      case 'pass':
        return `
          background: rgba(255, 255, 255, 0.2);
          color: #FF6B6B;
          &:hover {
            background: #FF6B6B;
            color: white;
            transform: scale(1.1);
          }
        `;
      case 'superlike':
        return `
          background: rgba(255, 255, 255, 0.2);
          color: #4ECDC4;
          &:hover {
            background: #4ECDC4;
            color: white;
            transform: scale(1.1);
          }
        `;
      case 'like':
        return `
          background: rgba(255, 255, 255, 0.2);
          color: #FF6B6B;
          &:hover {
            background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%);
            color: white;
            transform: scale(1.1);
          }
        `;
    }
  }}

  svg {
    width: 18px;
    height: 18px;

    @media (max-width: 480px) {
      width: 16px;
      height: 16px;
    }
  }
`;

const LoadingCard = styled.div`
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  aspect-ratio: 3/4;
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.5; }
  }
`;

const LoadMoreButton = styled.button`
  grid-column: 1 / -1;
  padding: 16px 32px;
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(78, 205, 196, 0.2) 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    background: linear-gradient(135deg, rgba(255, 107, 107, 0.3) 0%, rgba(78, 205, 196, 0.3) 100%);
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.7);

  svg {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  h3 {
    font-size: 20px;
    margin-bottom: 8px;
  }

  p {
    font-size: 14px;
    opacity: 0.7;
  }
`;

export const ProfileGrid: React.FC<ProfileGridProps> = ({
  profiles,
  onLike,
  onPass,
  onSuperLike,
  onProfileClick,
  loading = false,
  onLoadMore,
  hasMore = false,
  columns = 2,
}) => {
  const [actionLoadingIds, setActionLoadingIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const handleAction = useCallback(async (
    userId: string,
    action: 'like' | 'pass' | 'superlike',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    if (actionLoadingIds.has(userId)) return;

    setActionLoadingIds(prev => new Set(prev).add(userId));

    try {
      switch (action) {
        case 'like':
          await onLike(userId);
          break;
        case 'pass':
          await onPass(userId);
          break;
        case 'superlike':
          await onSuperLike(userId);
          break;
      }

      // Hide the card after action
      setHiddenIds(prev => new Set(prev).add(userId));
    } catch (error) {
      console.error(`${action} failed:`, error);
    } finally {
      setActionLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [onLike, onPass, onSuperLike, actionLoadingIds]);

  const visibleProfiles = profiles.filter(p => !hiddenIds.has(p.user_id));

  if (!loading && visibleProfiles.length === 0) {
    return (
      <GridContainer columns={columns}>
        <EmptyState>
          <FiGrid />
          <h3>No profiles to show</h3>
          <p>Check back later for new matches or adjust your filters</p>
        </EmptyState>
      </GridContainer>
    );
  }

  return (
    <GridContainer columns={columns}>
      {visibleProfiles.map((profile) => (
        <ProfileCard
          key={profile.user_id}
          onClick={() => onProfileClick(profile)}
        >
          <PhotoContainer>
            <ProfilePhoto
              src={profile.photos[0]?.url || 'https://via.placeholder.com/400x600?text=No+Photo'}
              alt={profile.first_name}
              loading="lazy"
            />

            {profile.compatibility_score && profile.compatibility_score >= 80 && (
              <CompatibilityBadge>
                <FiZap />
                {Math.round(profile.compatibility_score)}%
              </CompatibilityBadge>
            )}

            <PhotoOverlay>
              <ProfileInfo>
                <NameRow>
                  <Name>{profile.first_name}</Name>
                  <Age>{profile.age}</Age>
                  {profile.is_verified && (
                    <VerifiedBadge>
                      <FiCheck />
                    </VerifiedBadge>
                  )}
                </NameRow>
                {profile.city && (
                  <LocationRow>
                    <FiMapPin />
                    {profile.city}
                    {profile.distance && ` - ${Math.round(profile.distance)}km`}
                  </LocationRow>
                )}
              </ProfileInfo>
            </PhotoOverlay>
          </PhotoContainer>

          <ActionButtons>
            <ActionButton
              variant="pass"
              onClick={(e) => handleAction(profile.user_id, 'pass', e)}
              disabled={actionLoadingIds.has(profile.user_id)}
              title="Pass"
            >
              <FiX />
            </ActionButton>
            <ActionButton
              variant="superlike"
              onClick={(e) => handleAction(profile.user_id, 'superlike', e)}
              disabled={actionLoadingIds.has(profile.user_id)}
              title="Super Like"
            >
              <FiStar />
            </ActionButton>
            <ActionButton
              variant="like"
              onClick={(e) => handleAction(profile.user_id, 'like', e)}
              disabled={actionLoadingIds.has(profile.user_id)}
              title="Like"
            >
              <FiHeart />
            </ActionButton>
          </ActionButtons>
        </ProfileCard>
      ))}

      {loading && (
        <>
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </>
      )}

      {hasMore && onLoadMore && !loading && (
        <LoadMoreButton onClick={onLoadMore}>
          <FiLayers />
          Load More Profiles
        </LoadMoreButton>
      )}
    </GridContainer>
  );
};

export default ProfileGrid;
