/**
 * PhotoGallery Component
 *
 * SECURITY NOTE: The isAdmin prop should ONLY be passed from components
 * that have already verified admin status via the useAdminAuth hook or
 * RequireAdmin component. Never derive isAdmin from localStorage or
 * client-side state. This prop is for UI display only - sensitive actions
 * are protected by backend authorization.
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import PhotoWithModerationStatus, { PhotoModerationInfo } from './PhotoWithModerationStatus';
import { FaPlus, FaTimes, FaArrowLeft, FaArrowRight } from 'react-icons/fa';

interface PhotoGalleryProps {
  photos: PhotoModerationInfo[];
  maxPhotos?: number;
  onAddPhoto?: () => void;
  onDeletePhoto?: (photoId: string) => void;
  onPhotoClick?: (photo: PhotoModerationInfo) => void;
  isAdmin?: boolean;
  editable?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  maxPhotos = 6,
  onAddPhoto,
  onDeletePhoto,
  onPhotoClick,
  isAdmin = false,
  editable = false,
  size = 'medium',
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handlePhotoClick = (photo: PhotoModerationInfo, index: number) => {
    if (onPhotoClick) {
      onPhotoClick(photo);
    } else {
      setLightboxIndex(index);
      setLightboxOpen(true);
    }
  };

  const handlePrevious = () => {
    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = () => {
    setLightboxIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Escape') setLightboxOpen(false);
  };

  const canAddMore = photos.length < maxPhotos;
  const currentPhoto = lightboxOpen ? photos[lightboxIndex] : null;

  return (
    <>
      <Container>
        <Header>
          <h3>Photos</h3>
          <PhotoCount>
            {photos.length} / {maxPhotos}
          </PhotoCount>
        </Header>

        <Gallery $size={size}>
          {photos.map((photo, index) => (
            <PhotoWrapper key={photo.id}>
              <PhotoWithModerationStatus
                photo={photo}
                showStatusBadge={true}
                showDetailsOnHover={isAdmin}
                size={size}
                onClick={() => handlePhotoClick(photo, index)}
                isAdmin={isAdmin}
              />

              {editable && onDeletePhoto && (
                <DeleteButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePhoto(photo.id);
                  }}
                  title="Delete photo"
                >
                  <FaTimes />
                </DeleteButton>
              )}

              {index === 0 && <PrimaryBadge>Primary</PrimaryBadge>}
            </PhotoWrapper>
          ))}

          {editable && canAddMore && onAddPhoto && (
            <AddPhotoButton onClick={onAddPhoto}>
              <FaPlus />
              <span>Add Photo</span>
            </AddPhotoButton>
          )}
        </Gallery>

        {photos.length === 0 && (
          <EmptyState>
            <EmptyIcon>📷</EmptyIcon>
            <EmptyText>No photos yet</EmptyText>
            {editable && onAddPhoto && (
              <AddFirstPhotoButton onClick={onAddPhoto}>
                <FaPlus /> Add Your First Photo
              </AddFirstPhotoButton>
            )}
          </EmptyState>
        )}
      </Container>

      {/* Lightbox */}
      {lightboxOpen && currentPhoto && (
        <Lightbox onClick={() => setLightboxOpen(false)} onKeyDown={handleKeyDown} tabIndex={0}>
          <LightboxContent onClick={(e) => e.stopPropagation()}>
            <LightboxHeader>
              <LightboxTitle>
                Photo {lightboxIndex + 1} of {photos.length}
              </LightboxTitle>
              <LightboxClose onClick={() => setLightboxOpen(false)}>
                <FaTimes />
              </LightboxClose>
            </LightboxHeader>

            <LightboxImageContainer>
              {lightboxIndex > 0 && (
                <NavButton $position="left" onClick={handlePrevious}>
                  <FaArrowLeft />
                </NavButton>
              )}

              <LightboxImage
                src={currentPhoto.url}
                alt="Full size photo"
                $blur={
                  !isAdmin &&
                  (currentPhoto.moderationStatus === 'rejected' ||
                    currentPhoto.moderationStatus === 'flagged')
                }
              />

              {lightboxIndex < photos.length - 1 && (
                <NavButton $position="right" onClick={handleNext}>
                  <FaArrowRight />
                </NavButton>
              )}
            </LightboxImageContainer>

            {currentPhoto.moderationStatus && (
              <LightboxModerationInfo>
                <PhotoWithModerationStatus
                  photo={currentPhoto}
                  showStatusBadge={true}
                  showDetailsOnHover={false}
                  size="small"
                  isAdmin={isAdmin}
                />

                {isAdmin && (
                  <ModerationDetails>
                    {currentPhoto.riskScore !== undefined && (
                      <DetailItem>
                        Risk Score: <strong>{(currentPhoto.riskScore * 100).toFixed(0)}%</strong>
                      </DetailItem>
                    )}
                    {currentPhoto.violations && currentPhoto.violations.length > 0 && (
                      <DetailItem>
                        Violations: <strong>{currentPhoto.violations.join(', ')}</strong>
                      </DetailItem>
                    )}
                  </ModerationDetails>
                )}
              </LightboxModerationInfo>
            )}
          </LightboxContent>
        </Lightbox>
      )}
    </>
  );
};

const Container = styled.div`
  width: 100%;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: #111827;
  }
`;

const PhotoCount = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  background: #f3f4f6;
  padding: 6px 12px;
  border-radius: 9999px;
`;

const Gallery = styled.div<{ $size: string }>`
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(
      ${(props) => {
        switch (props.$size) {
          case 'small':
            return '120px';
          case 'large':
            return '300px';
          default:
            return '200px';
        }
      }},
      1fr
    )
  );
  gap: 16px;
`;

const PhotoWrapper = styled.div`
  position: relative;
`;

const DeleteButton = styled.button`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #ef4444;
  color: white;
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  &:hover {
    background: #dc2626;
    transform: scale(1.1);
  }
`;

const PrimaryBadge = styled.div`
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: #3b82f6;
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  z-index: 5;
`;

const AddPhotoButton = styled.button`
  width: 100%;
  aspect-ratio: 1;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #6b7280;

  &:hover {
    border-color: #3b82f6;
    background: #eff6ff;
    color: #3b82f6;
  }

  svg {
    font-size: 32px;
  }

  span {
    font-size: 14px;
    font-weight: 600;
  }
`;

const EmptyState = styled.div`
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 16px;
  padding: 48px 24px;
  text-align: center;
  color: #6b7280;
`;

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
`;

const EmptyText = styled.p`
  font-size: 16px;
  margin: 0 0 24px 0;
`;

const AddFirstPhotoButton = styled.button`
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;

  &:hover {
    background: #2563eb;
  }
`;

const Lightbox = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const LightboxContent = styled.div`
  max-width: 1200px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
`;

const LightboxHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  color: white;
`;

const LightboxTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
`;

const LightboxClose = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 32px;
  cursor: pointer;
  padding: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.7;
  }
`;

const LightboxImageContainer = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
`;

const LightboxImage = styled.img<{ $blur: boolean }>`
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 8px;
  filter: ${(props) => (props.$blur ? 'blur(20px)' : 'none')};
`;

const NavButton = styled.button<{ $position: 'left' | 'right' }>`
  position: absolute;
  ${(props) => (props.$position === 'left' ? 'left: 0;' : 'right: 0;')}
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  color: #111827;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: white;
    transform: translateY(-50%) scale(1.1);
  }
`;

const LightboxModerationInfo = styled.div`
  margin-top: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ModerationDetails = styled.div`
  color: white;
  font-size: 14px;
  display: flex;
  gap: 16px;
`;

const DetailItem = styled.div`
  strong {
    font-weight: 700;
  }
`;

export default PhotoGallery;
