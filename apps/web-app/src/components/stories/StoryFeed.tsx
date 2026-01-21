import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { FiChevronLeft, FiChevronRight, FiPlus } from 'react-icons/fi';
import { StoryRing } from './StoryRing';
import { StoryViewer } from './StoryViewer';

interface UserStoryRing {
  userId: string;
  displayName: string;
  avatarUrl: string;
  isVerified: boolean;
  hasUnviewedStories: boolean;
  storyCount: number;
  latestStoryAt: string;
  isCloseFriend: boolean;
  isMatch: boolean;
}

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

interface StoryFeedProps {
  storyRings: UserStoryRing[];
  currentUserId: string;
  currentUserAvatar: string;
  currentUserName: string;
  hasOwnStories: boolean;
  onAddStory: () => void;
  onViewUserStories: (userId: string) => Promise<Story[]>;
  onReactToStory: (storyId: string, reactionType: string) => void;
  onReplyToStory: (storyId: string, message: string) => void;
  onRecordStoryView: (storyId: string, duration: number, completed: boolean) => void;
}

const Container = styled.div`
  position: relative;
  width: 100%;
  padding: 16px 0;
  background: ${({ theme }) => theme.colors?.background || '#fff'};
`;

const ScrollContainer = styled.div`
  display: flex;
  gap: 12px;
  padding: 0 48px;
  overflow-x: auto;
  scroll-behavior: smooth;
  -ms-overflow-style: none;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const ScrollButton = styled.button<{ position: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${({ position }) => (position === 'left' ? 'left: 8px;' : 'right: 8px;')}
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: white;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;

  &:hover {
    background: #f5f5f5;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    opacity: 0;
    pointer-events: none;
  }
`;

const AddStoryButton = styled.div`
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

const AddStoryRing = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 2px dashed #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #f5f5f5;
`;

const AvatarPreview = styled.img`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  opacity: 0.5;
`;

const AddIcon = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4ecdc4, #95e1d3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const AddStoryLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors?.textSecondary || '#666'};
`;

const Divider = styled.div`
  width: 1px;
  height: 48px;
  background: #e0e0e0;
  margin: 0 8px;
  align-self: center;
`;

export const StoryFeed: React.FC<StoryFeedProps> = ({
  storyRings,
  currentUserId,
  currentUserAvatar,
  currentUserName,
  hasOwnStories,
  onAddStory,
  onViewUserStories,
  onReactToStory,
  onReplyToStory,
  onRecordStoryView,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserStoryRing | null>(null);
  const [selectedStories, setSelectedStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const checkScrollPosition = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    checkScrollPosition();
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', checkScrollPosition);
      window.addEventListener('resize', checkScrollPosition);
    }
    return () => {
      if (scrollEl) {
        scrollEl.removeEventListener('scroll', checkScrollPosition);
      }
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [storyRings]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleUserClick = async (user: UserStoryRing) => {
    if (user.userId === currentUserId && !hasOwnStories) {
      onAddStory();
      return;
    }

    setIsLoading(true);
    try {
      const stories = await onViewUserStories(user.userId);
      setSelectedStories(stories);
      setSelectedUser(user);
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseViewer = () => {
    setSelectedUser(null);
    setSelectedStories([]);
  };

  const getCurrentUserIndex = () => {
    return storyRings.findIndex((ring) => ring.userId === selectedUser?.userId);
  };

  const handleNextUser = async () => {
    const currentIdx = getCurrentUserIndex();
    if (currentIdx < storyRings.length - 1) {
      const nextUser = storyRings[currentIdx + 1];
      const stories = await onViewUserStories(nextUser.userId);
      setSelectedStories(stories);
      setSelectedUser(nextUser);
    }
  };

  const handlePreviousUser = async () => {
    const currentIdx = getCurrentUserIndex();
    if (currentIdx > 0) {
      const prevUser = storyRings[currentIdx - 1];
      const stories = await onViewUserStories(prevUser.userId);
      setSelectedStories(stories);
      setSelectedUser(prevUser);
    }
  };

  // Sort story rings: unviewed first, then by latest story time
  const sortedRings = [...storyRings].sort((a, b) => {
    if (a.hasUnviewedStories !== b.hasUnviewedStories) {
      return a.hasUnviewedStories ? -1 : 1;
    }
    return new Date(b.latestStoryAt).getTime() - new Date(a.latestStoryAt).getTime();
  });

  return (
    <Container>
      <ScrollButton position="left" onClick={() => scroll('left')} disabled={!canScrollLeft}>
        <FiChevronLeft />
      </ScrollButton>

      <ScrollContainer ref={scrollRef}>
        {/* Add Story / Own Story */}
        {hasOwnStories ? (
          <StoryRing
            userId={currentUserId}
            avatarUrl={currentUserAvatar}
            displayName={currentUserName}
            hasUnviewedStories={false}
            storyCount={0}
            onClick={() =>
              handleUserClick({
                userId: currentUserId,
                displayName: currentUserName,
                avatarUrl: currentUserAvatar,
                isVerified: false,
                hasUnviewedStories: false,
                storyCount: 1,
                latestStoryAt: new Date().toISOString(),
                isCloseFriend: false,
                isMatch: false,
              })
            }
            showAddButton={true}
            isOwnProfile={true}
          />
        ) : (
          <AddStoryButton onClick={onAddStory}>
            <AddStoryRing>
              <AvatarPreview src={currentUserAvatar} alt="Add story" />
              <AddIcon>
                <FiPlus />
              </AddIcon>
            </AddStoryRing>
            <AddStoryLabel>Add Story</AddStoryLabel>
          </AddStoryButton>
        )}

        {sortedRings.length > 0 && <Divider />}

        {/* Other users' stories */}
        {sortedRings.map((ring) => (
          <StoryRing
            key={ring.userId}
            userId={ring.userId}
            avatarUrl={ring.avatarUrl}
            displayName={ring.displayName}
            hasUnviewedStories={ring.hasUnviewedStories}
            isCloseFriend={ring.isCloseFriend}
            storyCount={ring.storyCount}
            onClick={() => handleUserClick(ring)}
          />
        ))}
      </ScrollContainer>

      <ScrollButton position="right" onClick={() => scroll('right')} disabled={!canScrollRight}>
        <FiChevronRight />
      </ScrollButton>

      {/* Story Viewer Modal */}
      {selectedUser && selectedStories.length > 0 && (
        <StoryViewer
          stories={selectedStories}
          user={{
            id: selectedUser.userId,
            displayName: selectedUser.displayName,
            avatarUrl: selectedUser.avatarUrl,
            isVerified: selectedUser.isVerified,
          }}
          onClose={handleCloseViewer}
          onReact={onReactToStory}
          onReply={onReplyToStory}
          onView={onRecordStoryView}
          onNext={handleNextUser}
          onPrevious={handlePreviousUser}
          hasNextUser={getCurrentUserIndex() < storyRings.length - 1}
          hasPreviousUser={getCurrentUserIndex() > 0}
        />
      )}
    </Container>
  );
};

export default StoryFeed;
