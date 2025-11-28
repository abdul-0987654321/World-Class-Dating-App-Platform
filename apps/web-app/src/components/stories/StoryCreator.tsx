import React, { useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import {
  FiX,
  FiImage,
  FiCamera,
  FiVideo,
  FiType,
  FiSmile,
  FiMapPin,
  FiMusic,
  FiChevronLeft,
  FiChevronRight,
  FiUsers,
  FiLock,
  FiGlobe,
  FiSend,
} from 'react-icons/fi';

interface StoryTemplate {
  id: string;
  name: string;
  previewUrl: string;
  category: string;
  isPremium: boolean;
}

interface StoryCreatorProps {
  onClose: () => void;
  onPublish: (story: {
    mediaType: 'photo' | 'video';
    mediaUrl: string;
    caption?: string;
    visibility: 'public' | 'matches_only' | 'close_friends';
    location?: string;
    templateId?: string;
  }) => void;
  templates: StoryTemplate[];
  isPremiumUser: boolean;
}

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 1000;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const HeaderTitle = styled.h2`
  color: white;
  font-size: 18px;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const PreviewPanel = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
`;

const PreviewContainer = styled.div<{ hasMedia: boolean }>`
  width: 100%;
  max-width: 360px;
  aspect-ratio: 9/16;
  background: ${({ hasMedia }) =>
    hasMedia ? '#000' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const UploadPrompt = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: white;
`;

const UploadIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
`;

const UploadText = styled.p`
  font-size: 16px;
  opacity: 0.9;
`;

const UploadButtons = styled.div`
  display: flex;
  gap: 12px;
`;

const UploadButton = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  color: white;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  input {
    display: none;
  }
`;

const PreviewMedia = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PreviewVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CaptionOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
`;

const CaptionText = styled.p`
  color: white;
  font-size: 16px;
  line-height: 1.4;
  word-break: break-word;
`;

const ToolsPanel = styled.div`
  width: 320px;
  background: #1a1a1a;
  padding: 24px;
  overflow-y: auto;

  @media (max-width: 768px) {
    width: 100%;
    height: auto;
    max-height: 50%;
  }
`;

const ToolSection = styled.div`
  margin-bottom: 24px;
`;

const ToolSectionTitle = styled.h3`
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
`;

const TextInput = styled.textarea`
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 12px;
  color: white;
  font-size: 14px;
  resize: none;
  min-height: 80px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    outline: none;
    border-color: #4ECDC4;
  }
`;

const VisibilityOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const VisibilityOption = styled.label<{ isSelected: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${({ isSelected }) =>
    isSelected ? 'rgba(78, 205, 196, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${({ isSelected }) =>
    isSelected ? '#4ECDC4' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ isSelected }) =>
      isSelected ? 'rgba(78, 205, 196, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
  }

  input {
    display: none;
  }
`;

const VisibilityIcon = styled.div<{ isSelected: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ isSelected }) =>
    isSelected ? 'linear-gradient(135deg, #4ECDC4, #95E1D3)' : 'rgba(255, 255, 255, 0.1)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
`;

const VisibilityInfo = styled.div`
  flex: 1;
`;

const VisibilityTitle = styled.div`
  color: white;
  font-weight: 500;
  font-size: 14px;
`;

const VisibilityDesc = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
`;

const TemplatesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

const TemplateCard = styled.div<{ isSelected: boolean; isPremium: boolean }>`
  aspect-ratio: 3/4;
  background: #333;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  border: 2px solid ${({ isSelected }) => (isSelected ? '#4ECDC4' : 'transparent')};
  opacity: ${({ isPremium }) => (isPremium ? 0.7 : 1)};
  transition: all 0.2s;

  &:hover {
    transform: scale(1.05);
  }
`;

const TemplateImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PremiumBadge = styled.div`
  position: absolute;
  top: 4px;
  right: 4px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #333;
  font-size: 8px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
`;

const LocationInput = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
`;

const LocationIcon = styled.div`
  color: #FF6B6B;
  font-size: 20px;
`;

const LocationText = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  color: white;
  font-size: 14px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    outline: none;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  gap: 12px;
`;

const CancelButton = styled.button`
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 24px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const PublishButton = styled.button`
  padding: 12px 32px;
  background: linear-gradient(135deg, #4ECDC4, #95E1D3);
  border: none;
  border-radius: 24px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 20px rgba(78, 205, 196, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const CharacterCount = styled.span`
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  text-align: right;
  display: block;
  margin-top: 4px;
`;

type Visibility = 'public' | 'matches_only' | 'close_friends';

const visibilityOptions = [
  {
    value: 'public' as Visibility,
    icon: FiGlobe,
    title: 'Everyone',
    desc: 'Anyone who views your profile can see this story',
  },
  {
    value: 'matches_only' as Visibility,
    icon: FiUsers,
    title: 'Matches Only',
    desc: 'Only people you\'ve matched with can see this',
  },
  {
    value: 'close_friends' as Visibility,
    icon: FiLock,
    title: 'Close Friends',
    desc: 'Only your close friends list can see this',
  },
];

const MAX_CAPTION_LENGTH = 200;

export const StoryCreator: React.FC<StoryCreatorProps> = ({
  onClose,
  onPublish,
  templates,
  isPremiumUser,
}) => {
  const [mediaType, setMediaType] = useState<'photo' | 'video' | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [location, setLocation] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setMediaType(type);
    setMediaUrl(url);
  }, []);

  const handlePublish = () => {
    if (!mediaUrl || !mediaType) return;

    onPublish({
      mediaType,
      mediaUrl,
      caption: caption.trim() || undefined,
      visibility,
      location: location.trim() || undefined,
      templateId: selectedTemplate || undefined,
    });
  };

  const handleTemplateSelect = (template: StoryTemplate) => {
    if (template.isPremium && !isPremiumUser) {
      // Show premium upgrade modal
      return;
    }
    setSelectedTemplate(template.id);
  };

  return (
    <Container>
      <Header>
        <CloseButton onClick={onClose}>
          <FiX />
        </CloseButton>
        <HeaderTitle>Create Story</HeaderTitle>
        <div style={{ width: 40 }} /> {/* Spacer for alignment */}
      </Header>

      <MainContent>
        <PreviewPanel>
          <PreviewContainer hasMedia={!!mediaUrl}>
            {!mediaUrl ? (
              <UploadPrompt>
                <UploadIcon>
                  <FiCamera />
                </UploadIcon>
                <UploadText>Add a photo or video</UploadText>
                <UploadButtons>
                  <UploadButton>
                    <FiImage /> Photo
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'photo')}
                    />
                  </UploadButton>
                  <UploadButton>
                    <FiVideo /> Video
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleFileSelect(e, 'video')}
                    />
                  </UploadButton>
                </UploadButtons>
              </UploadPrompt>
            ) : mediaType === 'photo' ? (
              <PreviewMedia src={mediaUrl} alt="Story preview" />
            ) : (
              <PreviewVideo src={mediaUrl} autoPlay loop muted playsInline />
            )}

            {mediaUrl && caption && (
              <CaptionOverlay>
                <CaptionText>{caption}</CaptionText>
              </CaptionOverlay>
            )}
          </PreviewContainer>
        </PreviewPanel>

        <ToolsPanel>
          <ToolSection>
            <ToolSectionTitle>Caption</ToolSectionTitle>
            <TextInput
              placeholder="Write something about your story..."
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION_LENGTH))}
            />
            <CharacterCount>
              {caption.length}/{MAX_CAPTION_LENGTH}
            </CharacterCount>
          </ToolSection>

          <ToolSection>
            <ToolSectionTitle>Who can see this?</ToolSectionTitle>
            <VisibilityOptions>
              {visibilityOptions.map((option) => (
                <VisibilityOption
                  key={option.value}
                  isSelected={visibility === option.value}
                  onClick={() => setVisibility(option.value)}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={option.value}
                    checked={visibility === option.value}
                    onChange={() => setVisibility(option.value)}
                  />
                  <VisibilityIcon isSelected={visibility === option.value}>
                    <option.icon />
                  </VisibilityIcon>
                  <VisibilityInfo>
                    <VisibilityTitle>{option.title}</VisibilityTitle>
                    <VisibilityDesc>{option.desc}</VisibilityDesc>
                  </VisibilityInfo>
                </VisibilityOption>
              ))}
            </VisibilityOptions>
          </ToolSection>

          <ToolSection>
            <ToolSectionTitle>Location</ToolSectionTitle>
            <LocationInput>
              <LocationIcon>
                <FiMapPin />
              </LocationIcon>
              <LocationText
                placeholder="Add location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </LocationInput>
          </ToolSection>

          {templates.length > 0 && (
            <ToolSection>
              <ToolSectionTitle>Templates</ToolSectionTitle>
              <TemplatesGrid>
                {templates.slice(0, 6).map((template) => (
                  <TemplateCard
                    key={template.id}
                    isSelected={selectedTemplate === template.id}
                    isPremium={template.isPremium && !isPremiumUser}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <TemplateImage
                      src={template.previewUrl}
                      alt={template.name}
                    />
                    {template.isPremium && !isPremiumUser && (
                      <PremiumBadge>PRO</PremiumBadge>
                    )}
                  </TemplateCard>
                ))}
              </TemplatesGrid>
            </ToolSection>
          )}
        </ToolsPanel>
      </MainContent>

      <Footer>
        <CancelButton onClick={onClose}>Cancel</CancelButton>
        <PublishButton onClick={handlePublish} disabled={!mediaUrl}>
          <FiSend /> Share Story
        </PublishButton>
      </Footer>
    </Container>
  );
};

export default StoryCreator;
