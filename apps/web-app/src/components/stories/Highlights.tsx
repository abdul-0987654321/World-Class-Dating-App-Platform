import React, { useState } from 'react';
import styled from 'styled-components';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiMoreVertical,
  FiImage,
} from 'react-icons/fi';

interface Highlight {
  id: string;
  title: string;
  coverImageUrl?: string;
  emoji?: string;
  storyCount: number;
  viewCount: number;
}

interface Story {
  id: string;
  userId: string;
  mediaType: 'photo' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  createdAt: string;
}

interface HighlightsProps {
  highlights: Highlight[];
  isOwnProfile: boolean;
  onCreateHighlight: () => void;
  onViewHighlight: (highlightId: string) => void;
  onEditHighlight: (highlightId: string) => void;
  onDeleteHighlight: (highlightId: string) => void;
  onAddStoryToHighlight: (highlightId: string, storyId: string) => void;
}

const Container = styled.div`
  padding: 16px 0;
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors?.text || '#333'};
  margin-bottom: 12px;
  padding: 0 16px;
`;

const HighlightsScroll = styled.div`
  display: flex;
  gap: 16px;
  padding: 0 16px;
  overflow-x: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const HighlightItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  min-width: 80px;
`;

const HighlightCover = styled.div<{ imageUrl?: string }>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${({ imageUrl }) =>
    imageUrl ? `url(${imageUrl})` : 'linear-gradient(135deg, #f0f0f0, #e0e0e0)'};
  background-size: cover;
  background-position: center;
  border: 2px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }
`;

const EmojiIcon = styled.span`
  font-size: 28px;
`;

const HighlightTitle = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors?.text || '#333'};
  text-align: center;
  max-width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AddHighlightButton = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  min-width: 80px;
`;

const AddHighlightCover = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 2px dashed #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  transition: all 0.2s;

  &:hover {
    border-color: #4ECDC4;
    background: rgba(78, 205, 196, 0.1);
  }
`;

const AddIcon = styled.div`
  font-size: 24px;
  color: #666;
`;

const MenuButton = styled.button`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  border: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;

  ${HighlightCover}:hover & {
    opacity: 1;
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px 0;
  min-width: 140px;
  z-index: 100;
`;

const MenuItem = styled.button`
  width: 100%;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: #f5f5f5;
  }

  &.danger {
    color: #FF6B6B;
  }
`;

const StoryCount = styled.span`
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: #4ECDC4;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  border: 2px solid white;
`;

// Create Highlight Modal
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 400px;
`;

const ModalTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 24px;
  text-align: center;
`;

const CoverSelector = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
`;

const CoverPreview = styled.div<{ imageUrl?: string }>`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: ${({ imageUrl }) =>
    imageUrl ? `url(${imageUrl})` : '#f0f0f0'};
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  border: 3px solid #e0e0e0;

  &:hover {
    border-color: #4ECDC4;
  }
`;

const CoverIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  position: absolute;
  bottom: 0;
  right: 0;
  border: 2px solid #e0e0e0;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #4ECDC4;
  }
`;

const EmojiPicker = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const EmojiButton = styled.button<{ isSelected: boolean }>`
  font-size: 24px;
  padding: 8px;
  background: ${({ isSelected }) => (isSelected ? 'rgba(78, 205, 196, 0.2)' : 'transparent')};
  border: 2px solid ${({ isSelected }) => (isSelected ? '#4ECDC4' : 'transparent')};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f5f5f5;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`;

const ModalButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  ${({ variant }) =>
    variant === 'primary'
      ? `
      background: linear-gradient(135deg, #4ECDC4, #95E1D3);
      border: none;
      color: white;

      &:hover {
        box-shadow: 0 4px 12px rgba(78, 205, 196, 0.4);
      }
    `
      : `
      background: white;
      border: 1px solid #e0e0e0;
      color: #333;

      &:hover {
        background: #f5f5f5;
      }
    `}
`;

const defaultEmojis = ['🔥', '💕', '🎉', '✨', '🌟', '💫', '🎭', '🎨', '🏋️', '🍕', '🌴', '📸'];

export const Highlights: React.FC<HighlightsProps> = ({
  highlights,
  isOwnProfile,
  onCreateHighlight,
  onViewHighlight,
  onEditHighlight,
  onDeleteHighlight,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHighlight, setNewHighlight] = useState({
    title: '',
    emoji: '✨',
    coverImageUrl: '',
  });

  const handleMenuClick = (e: React.MouseEvent, highlightId: string) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === highlightId ? null : highlightId);
  };

  const handleCreateHighlight = () => {
    // In real implementation, call API
    setShowCreateModal(false);
    setNewHighlight({ title: '', emoji: '✨', coverImageUrl: '' });
    onCreateHighlight();
  };

  return (
    <Container>
      <SectionTitle>Highlights</SectionTitle>
      <HighlightsScroll>
        {isOwnProfile && (
          <AddHighlightButton onClick={() => setShowCreateModal(true)}>
            <AddHighlightCover>
              <AddIcon>
                <FiPlus />
              </AddIcon>
            </AddHighlightCover>
            <HighlightTitle>New</HighlightTitle>
          </AddHighlightButton>
        )}

        {highlights.map((highlight) => (
          <HighlightItem
            key={highlight.id}
            onClick={() => onViewHighlight(highlight.id)}
          >
            <HighlightCover imageUrl={highlight.coverImageUrl}>
              {!highlight.coverImageUrl && highlight.emoji && (
                <EmojiIcon>{highlight.emoji}</EmojiIcon>
              )}
              {highlight.storyCount > 0 && (
                <StoryCount>{highlight.storyCount}</StoryCount>
              )}
              {isOwnProfile && (
                <MenuButton onClick={(e) => handleMenuClick(e, highlight.id)}>
                  <FiMoreVertical />
                </MenuButton>
              )}
              {activeMenu === highlight.id && (
                <DropdownMenu onClick={(e) => e.stopPropagation()}>
                  <MenuItem onClick={() => onEditHighlight(highlight.id)}>
                    <FiEdit2 /> Edit
                  </MenuItem>
                  <MenuItem
                    className="danger"
                    onClick={() => {
                      onDeleteHighlight(highlight.id);
                      setActiveMenu(null);
                    }}
                  >
                    <FiTrash2 /> Delete
                  </MenuItem>
                </DropdownMenu>
              )}
            </HighlightCover>
            <HighlightTitle>{highlight.title}</HighlightTitle>
          </HighlightItem>
        ))}
      </HighlightsScroll>

      {/* Create Highlight Modal */}
      {showCreateModal && (
        <ModalOverlay onClick={() => setShowCreateModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>New Highlight</ModalTitle>

            <CoverSelector>
              <CoverPreview imageUrl={newHighlight.coverImageUrl}>
                {!newHighlight.coverImageUrl && (
                  <EmojiIcon style={{ fontSize: '40px' }}>
                    {newHighlight.emoji}
                  </EmojiIcon>
                )}
                <CoverIcon>
                  <FiImage />
                </CoverIcon>
              </CoverPreview>
            </CoverSelector>

            <FormGroup>
              <Label>Title</Label>
              <Input
                placeholder="Add a title..."
                value={newHighlight.title}
                onChange={(e) =>
                  setNewHighlight({ ...newHighlight, title: e.target.value })
                }
                maxLength={20}
              />
            </FormGroup>

            <FormGroup>
              <Label>Icon</Label>
              <EmojiPicker>
                {defaultEmojis.map((emoji) => (
                  <EmojiButton
                    key={emoji}
                    isSelected={newHighlight.emoji === emoji}
                    onClick={() =>
                      setNewHighlight({ ...newHighlight, emoji })
                    }
                  >
                    {emoji}
                  </EmojiButton>
                ))}
              </EmojiPicker>
            </FormGroup>

            <ModalActions>
              <ModalButton onClick={() => setShowCreateModal(false)}>
                Cancel
              </ModalButton>
              <ModalButton
                variant="primary"
                onClick={handleCreateHighlight}
                disabled={!newHighlight.title.trim()}
              >
                Create
              </ModalButton>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
};

export default Highlights;
