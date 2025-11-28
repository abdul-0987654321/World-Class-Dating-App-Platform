import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiHeart,
  FiSend,
  FiMoreVertical,
  FiFlag,
  FiEyeOff,
  FiPause,
  FiPlay,
  FiVolume2,
  FiVolumeX,
} from 'react-icons/fi';

interface Story {
  id: string;
  userId: string;
  mediaType: 'photo' | 'video';
  mediaUrl: string;
  caption?: string;
  durationSeconds: number;
  createdAt: string;
  viewCount: number;
  reactions: { type: string; count: number }[];
}

interface StoryUser {
  id: string;
  displayName: string;
  avatarUrl: string;
  isVerified: boolean;
}

interface StoryViewerProps {
  stories: Story[];
  user: StoryUser;
  initialStoryIndex?: number;
  onClose: () => void;
  onReact: (storyId: string, reactionType: string) => void;
  onReply: (storyId: string, message: string) => void;
  onView: (storyId: string, duration: number, completed: boolean) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNextUser?: boolean;
  hasPreviousUser?: boolean;
}

const progressAnimation = keyframes`
  from { width: 0%; }
  to { width: 100%; }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${fadeIn} 0.2s ease;
`;

const StoryContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 420px;
  height: 100%;
  max-height: 750px;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    max-width: 100%;
    max-height: 100%;
    border-radius: 0;
  }
`;

const ProgressBarContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 4px;
  padding: 12px 8px;
  z-index: 20;
`;

const ProgressBar = styled.div<{ isActive: boolean; isComplete: boolean }>`
  flex: 1;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ duration: number; isPaused: boolean }>`
  height: 100%;
  background: white;
  width: 0%;
  animation: ${progressAnimation} ${({ duration }) => duration}s linear forwards;
  animation-play-state: ${({ isPaused }) => (isPaused ? 'paused' : 'running')};
`;

const ProgressComplete = styled.div`
  height: 100%;
  background: white;
  width: 100%;
`;

const Header = styled.div`
  position: absolute;
  top: 24px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  z-index: 10;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Avatar = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const Username = styled.span`
  color: white;
  font-weight: 600;
  font-size: 14px;
`;

const TimeAgo = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const IconButton = styled.button`
  background: transparent;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.9;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

const MediaContainer = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const StoryImage = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

const StoryVideo = styled.video`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

const Caption = styled.div`
  position: absolute;
  bottom: 80px;
  left: 0;
  right: 0;
  padding: 20px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  color: white;
  font-size: 14px;
  line-height: 1.4;
`;

const TouchZones = styled.div`
  position: absolute;
  top: 60px;
  left: 0;
  right: 0;
  bottom: 80px;
  display: flex;
`;

const TouchZone = styled.div`
  flex: 1;
  cursor: pointer;
`;

const NavigationButton = styled.button<{ position: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${({ position }) => (position === 'left' ? 'left: -60px;' : 'right: -60px;')}
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const Footer = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
`;

const ReplyInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 14px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
  }
`;

const ReactionButton = styled.button<{ isActive?: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: ${({ isActive }) =>
    isActive ? 'rgba(255, 107, 107, 0.8)' : 'rgba(255, 255, 255, 0.1)'};
  color: ${({ isActive }) => (isActive ? 'white' : 'rgba(255, 255, 255, 0.9)')};
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 107, 107, 0.6);
    transform: scale(1.1);
  }
`;

const SendButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #4ECDC4, #95E1D3);
  color: white;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MoreMenu = styled.div`
  position: absolute;
  top: 70px;
  right: 12px;
  background: rgba(30, 30, 30, 0.95);
  border-radius: 12px;
  padding: 8px 0;
  min-width: 180px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  z-index: 30;
`;

const MenuItem = styled.button`
  width: 100%;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: transparent;
  border: none;
  color: white;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  svg {
    font-size: 18px;
  }
`;

const ViewCount = styled.div`
  position: absolute;
  bottom: 80px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
`;

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({
  stories,
  user,
  initialStoryIndex = 0,
  onClose,
  onReact,
  onReply,
  onView,
  onNext,
  onPrevious,
  hasNextUser = false,
  hasPreviousUser = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [hasReacted, setHasReacted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewStartTime = useRef<number>(Date.now());

  const currentStory = stories[currentIndex];

  const handleViewComplete = useCallback(() => {
    const duration = (Date.now() - viewStartTime.current) / 1000;
    onView(currentStory.id, duration, true);
  }, [currentStory?.id, onView]);

  const goToNextStory = useCallback(() => {
    handleViewComplete();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      viewStartTime.current = Date.now();
    } else if (hasNextUser && onNext) {
      onNext();
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, hasNextUser, onNext, onClose, handleViewComplete]);

  const goToPreviousStory = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      viewStartTime.current = Date.now();
    } else if (hasPreviousUser && onPrevious) {
      onPrevious();
    }
  }, [currentIndex, hasPreviousUser, onPrevious]);

  // Auto-advance for photos
  useEffect(() => {
    if (!currentStory || isPaused) return;
    if (currentStory.mediaType === 'video') return;

    const timer = setTimeout(() => {
      goToNextStory();
    }, currentStory.durationSeconds * 1000);

    return () => clearTimeout(timer);
  }, [currentIndex, isPaused, currentStory, goToNextStory]);

  // Video ended handler
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => goToNextStory();
    video.addEventListener('ended', handleEnded);

    return () => video.removeEventListener('ended', handleEnded);
  }, [goToNextStory]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPreviousStory();
          break;
        case 'ArrowRight':
          goToNextStory();
          break;
        case ' ':
          e.preventDefault();
          setIsPaused((prev) => !prev);
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextStory, goToPreviousStory, onClose]);

  const handleReact = () => {
    onReact(currentStory.id, 'heart');
    setHasReacted(true);
    setTimeout(() => setHasReacted(false), 1000);
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    onReply(currentStory.id, replyText);
    setReplyText('');
  };

  const handleTouchZoneClick = (side: 'left' | 'right') => {
    if (side === 'left') {
      goToPreviousStory();
    } else {
      goToNextStory();
    }
  };

  const handleLongPress = () => {
    setIsPaused(true);
  };

  const handleLongPressEnd = () => {
    setIsPaused(false);
  };

  if (!currentStory) return null;

  return (
    <Container onClick={(e) => e.target === e.currentTarget && onClose()}>
      {hasPreviousUser && (
        <NavigationButton position="left" onClick={onPrevious}>
          <FiChevronLeft />
        </NavigationButton>
      )}

      <StoryContainer>
        <ProgressBarContainer>
          {stories.map((story, index) => (
            <ProgressBar
              key={story.id}
              isActive={index === currentIndex}
              isComplete={index < currentIndex}
            >
              {index < currentIndex ? (
                <ProgressComplete />
              ) : index === currentIndex ? (
                <ProgressFill
                  duration={story.durationSeconds}
                  isPaused={isPaused}
                />
              ) : null}
            </ProgressBar>
          ))}
        </ProgressBarContainer>

        <Header>
          <UserInfo>
            <Avatar src={user.avatarUrl} alt={user.displayName} />
            <UserDetails>
              <Username>{user.displayName}</Username>
              <TimeAgo>{formatTimeAgo(currentStory.createdAt)}</TimeAgo>
            </UserDetails>
          </UserInfo>
          <HeaderActions>
            {currentStory.mediaType === 'video' && (
              <IconButton onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? <FiVolumeX /> : <FiVolume2 />}
              </IconButton>
            )}
            <IconButton onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? <FiPlay /> : <FiPause />}
            </IconButton>
            <IconButton onClick={() => setShowMenu(!showMenu)}>
              <FiMoreVertical />
            </IconButton>
            <IconButton onClick={onClose}>
              <FiX />
            </IconButton>
          </HeaderActions>
        </Header>

        {showMenu && (
          <MoreMenu>
            <MenuItem onClick={() => setShowMenu(false)}>
              <FiFlag /> Report Story
            </MenuItem>
            <MenuItem onClick={() => setShowMenu(false)}>
              <FiEyeOff /> Mute this person
            </MenuItem>
          </MoreMenu>
        )}

        <MediaContainer>
          {currentStory.mediaType === 'photo' ? (
            <StoryImage src={currentStory.mediaUrl} alt="" />
          ) : (
            <StoryVideo
              ref={videoRef}
              src={currentStory.mediaUrl}
              autoPlay
              muted={isMuted}
              playsInline
            />
          )}

          <TouchZones>
            <TouchZone
              onClick={() => handleTouchZoneClick('left')}
              onMouseDown={handleLongPress}
              onMouseUp={handleLongPressEnd}
              onTouchStart={handleLongPress}
              onTouchEnd={handleLongPressEnd}
            />
            <TouchZone
              onClick={() => handleTouchZoneClick('right')}
              onMouseDown={handleLongPress}
              onMouseUp={handleLongPressEnd}
              onTouchStart={handleLongPress}
              onTouchEnd={handleLongPressEnd}
            />
          </TouchZones>
        </MediaContainer>

        {currentStory.caption && (
          <Caption>{currentStory.caption}</Caption>
        )}

        <ViewCount>
          <span>{currentStory.viewCount} views</span>
        </ViewCount>

        <Footer>
          <ReplyInput
            placeholder={`Reply to ${user.displayName}...`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
          />
          <ReactionButton isActive={hasReacted} onClick={handleReact}>
            <FiHeart />
          </ReactionButton>
          <SendButton onClick={handleSendReply} disabled={!replyText.trim()}>
            <FiSend />
          </SendButton>
        </Footer>
      </StoryContainer>

      {hasNextUser && (
        <NavigationButton position="right" onClick={onNext}>
          <FiChevronRight />
        </NavigationButton>
      )}
    </Container>
  );
};

export default StoryViewer;
