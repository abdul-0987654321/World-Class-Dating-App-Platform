import React, { useState } from 'react';
import styled from 'styled-components';
import { FiHeart, FiX, FiStar, FiMapPin, FiBriefcase, FiCheckCircle } from 'react-icons/fi';
import { DiscoveryProfile } from '../services/discovery.service';
import { TierIcon, SubscriptionTier } from './subscription/SubscriptionBadge';

interface SwipeCardProps {
  profile: DiscoveryProfile;
  onLike: () => void;
  onPass: () => void;
  onSuperLike: () => void;
}

const CardContainer = styled.div.attrs({
  'data-testid': 'profile-card',
  className: 'profile-card swipe-card',
})`
  position: relative;
  width: 100%;
  max-width: 400px;
  height: 600px;
  background: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius['3xl']};
  box-shadow: ${({ theme }) => theme.shadows['2xl']};
  overflow: hidden;
  user-select: none;
`;

const PhotoContainer = styled.div<{ backgroundUrl: string }>`
  width: 100%;
  height: 70%;
  background-image: url(${({ backgroundUrl }) => backgroundUrl});
  background-size: cover;
  background-position: center;
  position: relative;
`;

const PhotoOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  padding: ${({ theme }) => theme.spacing.xl};
  color: white;
`;

const NameRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const Name = styled.h2.attrs({
  'data-testid': 'profile-name',
  className: 'profile-name',
})`
  font-size: ${({ theme }) => theme.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  margin: 0;
`;

const Age = styled.span.attrs({
  className: 'profile-age',
})`
  font-size: ${({ theme }) => theme.fontSize.xl};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
`;

const VerifiedBadge = styled(FiCheckCircle)`
  color: #4ecdc4;
  font-size: 20px;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.fontSize.sm};
  opacity: 0.9;
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const ContentContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  height: 30%;
  overflow-y: auto;
`;

const Bio = styled.p.attrs({
  className: 'profile-bio',
})`
  font-size: ${({ theme }) => theme.fontSize.md};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  line-height: 1.5;
`;

const PromptContainer = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const PromptQuestion = styled.div`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const PromptAnswer = styled.div`
  font-size: ${({ theme }) => theme.fontSize.md};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ActionButtons = styled.div`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: ${({ theme }) => theme.spacing.lg};
  z-index: 10;
`;

const ActionButton = styled.button<{ variant: 'pass' | 'superlike' | 'like' }>`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 24px;
  transition: all 0.2s;
  box-shadow: ${({ theme }) => theme.shadows.lg};

  ${({ variant, theme }) => {
    switch (variant) {
      case 'pass':
        return `
          background: ${theme.colors.white};
          color: #FF6B6B;
          &:hover {
            background: #FF6B6B;
            color: white;
            transform: scale(1.1);
          }
        `;
      case 'superlike':
        return `
          background: ${theme.colors.white};
          color: #4ECDC4;
          width: 50px;
          height: 50px;
          &:hover {
            background: #4ECDC4;
            color: white;
            transform: scale(1.1);
          }
        `;
      case 'like':
        return `
          background: ${theme.colors.white};
          color: #95E1D3;
          &:hover {
            background: #95E1D3;
            color: white;
            transform: scale(1.1);
          }
        `;
    }
  }}
`;

const PhotoDots = styled.div.attrs({
  'data-testid': 'photo-indicator',
  className: 'photo-indicators photo-dots',
})`
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
`;

const Dot = styled.div<{ active: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ active }) => (active ? 'white' : 'rgba(255, 255, 255, 0.5)')};
`;

export const SwipeCard: React.FC<SwipeCardProps> = ({ profile, onLike, onPass, onSuperLike }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const photos =
    profile.photos.length > 0
      ? profile.photos
      : [{ url: '/assets/images/default-profile.svg', is_primary: true }];
  const currentPhoto = photos[currentPhotoIndex];

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const cardWidth = e.currentTarget.offsetWidth;
    const clickX = e.nativeEvent.offsetX;

    if (clickX > cardWidth / 2) {
      // Clicked right half - next photo
      setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
    } else {
      // Clicked left half - previous photo
      setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        onPass();
        break;
      case 'ArrowRight':
        e.preventDefault();
        onLike();
        break;
      case 'ArrowUp':
        e.preventDefault();
        onSuperLike();
        break;
    }
  };

  return (
    <CardContainer
      tabIndex={0}
      role="button"
      aria-label={`Profile card for ${profile.first_name}, age ${profile.age}. Use left arrow to pass, right arrow to like, up arrow to super like.`}
      onKeyDown={handleKeyDown}
    >
      <PhotoContainer backgroundUrl={currentPhoto.url} onClick={handleCardClick}>
        {photos.length > 1 && (
          <PhotoDots>
            {photos.map((_, index) => (
              <Dot key={index} active={index === currentPhotoIndex} />
            ))}
          </PhotoDots>
        )}
        <PhotoOverlay>
          <NameRow>
            <Name>{profile.first_name}</Name>
            <Age>{profile.age}</Age>
            {profile.is_verified && <VerifiedBadge />}
            {profile.premium_tier && profile.premium_tier !== 'FREE' && (
              <TierIcon
                tier={profile.premium_tier as SubscriptionTier}
                size="sm"
                showTooltip={true}
              />
            )}
          </NameRow>
          {(profile.occupation || profile.city) && (
            <>
              {profile.occupation && (
                <InfoRow>
                  <FiBriefcase /> {profile.occupation}
                </InfoRow>
              )}
              {profile.city && (
                <InfoRow>
                  <FiMapPin /> {profile.city}
                  {profile.distance && ` • ${Math.round(profile.distance)} km away`}
                </InfoRow>
              )}
            </>
          )}
        </PhotoOverlay>
      </PhotoContainer>

      <ContentContainer>
        {profile.bio && <Bio>{profile.bio}</Bio>}
        {profile.prompts.length > 0 && (
          <PromptContainer>
            {profile.prompts.slice(0, 2).map((prompt, index) => (
              <div key={index}>
                <PromptQuestion>{prompt.question}</PromptQuestion>
                <PromptAnswer>{prompt.answer}</PromptAnswer>
              </div>
            ))}
          </PromptContainer>
        )}
      </ContentContainer>

      <ActionButtons>
        <ActionButton
          variant="pass"
          onClick={onPass}
          title="Pass"
          aria-label="Pass"
          data-action="pass"
          className="pass-button"
        >
          <FiX />
        </ActionButton>
        <ActionButton
          variant="superlike"
          onClick={onSuperLike}
          title="Super Like"
          aria-label="Super Like"
          data-action="superlike"
          className="superlike-button super-like-button"
        >
          <FiStar />
        </ActionButton>
        <ActionButton
          variant="like"
          onClick={onLike}
          title="Like"
          aria-label="Like"
          data-action="like"
          className="like-button"
        >
          <FiHeart />
        </ActionButton>
      </ActionButtons>
    </CardContainer>
  );
};
