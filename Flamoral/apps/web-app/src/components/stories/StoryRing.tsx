import React from 'react';
import styled, { keyframes } from 'styled-components';

interface StoryRingProps {
  userId: string;
  avatarUrl: string;
  displayName: string;
  hasUnviewedStories: boolean;
  isCloseFriend?: boolean;
  storyCount: number;
  onClick: () => void;
  size?: 'small' | 'medium' | 'large';
  showAddButton?: boolean;
  isOwnProfile?: boolean;
}

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const ringGradient = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const getSizeValues = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return { ring: 56, avatar: 48, border: 2, font: 10 };
    case 'medium':
      return { ring: 72, avatar: 64, border: 3, font: 12 };
    case 'large':
      return { ring: 96, avatar: 84, border: 4, font: 14 };
  }
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }
`;

const RingContainer = styled.div<{
  hasUnviewed: boolean;
  isCloseFriend: boolean;
  size: number;
  borderWidth: number;
}>`
  width: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
  border-radius: 50%;
  padding: ${({ borderWidth }) => borderWidth}px;
  background: ${({ hasUnviewed, isCloseFriend }) => {
    if (!hasUnviewed) return '#E0E0E0';
    if (isCloseFriend) return 'linear-gradient(135deg, #00C853, #4CAF50, #8BC34A)';
    return 'linear-gradient(135deg, #FF6B6B, #FF8E53, #FFD93D, #95E1D3, #4ECDC4)';
  }};
  background-size: 300% 300%;
  animation: ${({ hasUnviewed }) => (hasUnviewed ? ringGradient : 'none')} 3s ease infinite;
  position: relative;
`;

const AvatarContainer = styled.div<{ size: number }>`
  width: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
  border-radius: 50%;
  overflow: hidden;
  background: white;
  padding: 2px;
`;

const Avatar = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
`;

const PlaceholderAvatar = styled.div<{ size: number }>`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: ${({ size }) => size * 0.4}px;
`;

const AddButton = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4ECDC4, #95E1D3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  font-weight: bold;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const Username = styled.span<{ fontSize: number }>`
  font-size: ${({ fontSize }) => fontSize}px;
  color: ${({ theme }) => theme.colors?.text || '#333'};
  max-width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
`;

const StoryCount = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  background: #FF6B6B;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
  min-width: 16px;
  text-align: center;
`;

export const StoryRing: React.FC<StoryRingProps> = ({
  userId,
  avatarUrl,
  displayName,
  hasUnviewedStories,
  isCloseFriend = false,
  storyCount,
  onClick,
  size = 'medium',
  showAddButton = false,
  isOwnProfile = false,
}) => {
  const sizeValues = getSizeValues(size);
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Container onClick={onClick}>
      <RingContainer
        hasUnviewed={hasUnviewedStories}
        isCloseFriend={isCloseFriend}
        size={sizeValues.ring}
        borderWidth={sizeValues.border}
      >
        <AvatarContainer size={sizeValues.avatar}>
          {avatarUrl ? (
            <Avatar src={avatarUrl} alt={displayName} />
          ) : (
            <PlaceholderAvatar size={sizeValues.avatar}>{initials}</PlaceholderAvatar>
          )}
        </AvatarContainer>
        {showAddButton && (
          <AddButton>+</AddButton>
        )}
        {storyCount > 1 && hasUnviewedStories && (
          <StoryCount>{storyCount}</StoryCount>
        )}
      </RingContainer>
      <Username fontSize={sizeValues.font}>
        {isOwnProfile ? 'Your Story' : displayName.split(' ')[0]}
      </Username>
    </Container>
  );
};

export default StoryRing;
