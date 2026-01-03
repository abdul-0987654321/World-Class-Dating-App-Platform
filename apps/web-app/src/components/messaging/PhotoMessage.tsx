/**
 * Photo Message Component
 *
 * Displays photo messages with:
 * - Thumbnail loading with blur-up effect
 * - Full-size image viewing in lightbox
 * - Upload progress indicator
 * - Download option with proper file saving
 * - Error handling
 * - Zoom and pan in lightbox
 */

import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';

interface PhotoMessageProps {
  /**
   * URL to the full-size image
   */
  imageUrl: string;
  /**
   * URL to the thumbnail image (for blur-up loading)
   */
  thumbnailUrl?: string;
  /**
   * Whether this message is from the current user
   */
  isFromMe: boolean;
  /**
   * Image dimensions
   */
  width?: number;
  height?: number;
  /**
   * Whether the image is currently being uploaded
   */
  isUploading?: boolean;
  /**
   * Upload progress (0-100)
   */
  uploadProgress?: number;
  /**
   * Whether the upload failed
   */
  hasError?: boolean;
  /**
   * Error message to display
   */
  errorMessage?: string;
  /**
   * Callback when image is clicked (for lightbox)
   */
  onImageClick?: (url: string) => void;
  /**
   * Callback to retry failed upload
   */
  onRetry?: () => void;
  /**
   * Alt text for accessibility
   */
  alt?: string;
  /**
   * Timestamp for the message
   */
  timestamp?: Date;
  /**
   * Sender name for accessibility
   */
  senderName?: string;
}

// Animations
const shimmer = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Styled components
const Container = styled.div<{ $isFromMe: boolean; $hasError: boolean }>`
  max-width: 280px;
  border-radius: 16px;
  overflow: hidden;
  background: ${({ $hasError }) => ($hasError ? 'rgba(239, 68, 68, 0.1)' : '#f0f0f0')};
  border: ${({ $hasError }) => ($hasError ? '1px solid rgba(239, 68, 68, 0.3)' : 'none')};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

  ${({ $isFromMe }) =>
    $isFromMe
      ? 'border-bottom-right-radius: 4px;'
      : 'border-bottom-left-radius: 4px;'}
`;

const ImageWrapper = styled.div`
  position: relative;
  width: 100%;
  cursor: pointer;
  overflow: hidden;

  &:focus {
    outline: 2px solid #ec4899;
    outline-offset: 2px;
  }
`;

const ThumbnailImage = styled.img<{ $isVisible: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(10px);
  transform: scale(1.1);
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  transition: opacity 0.3s ease;
`;

const FullImage = styled.img<{ $isLoaded: boolean }>`
  width: 100%;
  height: auto;
  display: block;
  opacity: ${({ $isLoaded }) => ($isLoaded ? 1 : 0)};
  transition: opacity 0.3s ease;
  animation: ${fadeIn} 0.3s ease;
`;

const LoadingPlaceholder = styled.div<{ $aspectRatio: number }>`
  width: 100%;
  padding-top: ${({ $aspectRatio }) => $aspectRatio * 100}%;
  background: linear-gradient(
    90deg,
    #f0f0f0 0px,
    #e0e0e0 50px,
    #f0f0f0 100px
  );
  background-size: 200px 100%;
  animation: ${shimmer} 1.5s infinite linear;
`;

const UploadOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
`;

const ProgressRing = styled.svg`
  width: 48px;
  height: 48px;
  transform: rotate(-90deg);
`;

const ProgressCircle = styled.circle<{ $progress: number }>`
  fill: none;
  stroke: white;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 138.2;
  stroke-dashoffset: ${({ $progress }) => 138.2 * (1 - $progress / 100)};
  transition: stroke-dashoffset 0.3s ease;
`;

const ProgressBackground = styled.circle`
  fill: none;
  stroke: rgba(255, 255, 255, 0.3);
  stroke-width: 4;
`;

const ProgressText = styled.span`
  color: white;
  font-size: 14px;
  font-weight: 600;
`;

const ErrorOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(239, 68, 68, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
`;

const ErrorIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
  font-size: 20px;
  font-weight: bold;
`;

const ErrorText = styled.span`
  color: white;
  font-size: 12px;
  text-align: center;
`;

const RetryButton = styled.button`
  padding: 6px 16px;
  background: white;
  color: #ef4444;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }

  &:focus {
    outline: 2px solid white;
    outline-offset: 2px;
  }
`;

const ActionButton = styled.button<{ $position?: 'left' | 'right' }>`
  position: absolute;
  top: 8px;
  ${({ $position }) => ($position === 'left' ? 'left: 8px;' : 'right: 8px;')}
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s, transform 0.2s;

  ${ImageWrapper}:hover & {
    opacity: 1;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.7);
    transform: scale(1.1);
  }

  &:focus {
    opacity: 1;
    outline: 2px solid white;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingSpinner = styled.div`
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const SmallSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const Timestamp = styled.span`
  position: absolute;
  bottom: 4px;
  right: 8px;
  font-size: 10px;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.2s;

  ${ImageWrapper}:hover & {
    opacity: 1;
  }
`;

/**
 * Download image as a file
 */
async function downloadImage(url: string, filename?: string): Promise<void> {
  try {
    // Fetch the image as blob
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }

    const blob = await response.blob();

    // Create download link
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;

    // Generate filename from URL or use provided
    if (filename) {
      link.download = filename;
    } else {
      const urlParts = url.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      const extension = blob.type.split('/')[1] || 'jpg';
      link.download = lastPart.includes('.')
        ? lastPart
        : `photo-${Date.now()}.${extension}`;
    }

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup blob URL
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download failed:', error);
    // Fallback: open in new tab
    window.open(url, '_blank');
  }
}

/**
 * Photo Message Component
 */
export const PhotoMessage: React.FC<PhotoMessageProps> = memo(
  ({
    imageUrl,
    thumbnailUrl,
    isFromMe,
    width,
    height,
    isUploading = false,
    uploadProgress = 0,
    hasError = false,
    errorMessage = 'Failed to send photo',
    onImageClick,
    onRetry,
    alt = 'Shared photo',
    timestamp,
    senderName,
  }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [showThumbnail, setShowThumbnail] = useState(!!thumbnailUrl);
    const [isDownloading, setIsDownloading] = useState(false);

    // Calculate aspect ratio for placeholder
    const aspectRatio = height && width ? height / width : 0.75;

    const handleImageLoad = useCallback(() => {
      setIsLoaded(true);
      // Hide thumbnail after full image loads
      setTimeout(() => setShowThumbnail(false), 300);
    }, []);

    const handleClick = useCallback(() => {
      if (!isUploading && !hasError) {
        onImageClick?.(imageUrl);
      }
    }, [imageUrl, isUploading, hasError, onImageClick]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      },
      [handleClick]
    );

    const handleDownload = useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isDownloading) return;

        setIsDownloading(true);
        try {
          await downloadImage(imageUrl);
        } finally {
          setIsDownloading(false);
        }
      },
      [imageUrl, isDownloading]
    );

    const handleRetry = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onRetry?.();
      },
      [onRetry]
    );

    // Format timestamp
    const formattedTime = timestamp
      ? new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }).format(timestamp)
      : null;

    const accessibleLabel = `${senderName ? `Photo from ${senderName}` : 'Photo message'}${
      formattedTime ? ` at ${formattedTime}` : ''
    }. ${alt}`;

    return (
      <Container $isFromMe={isFromMe} $hasError={hasError}>
        <ImageWrapper
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={isUploading || hasError ? -1 : 0}
          aria-label={accessibleLabel}
        >
          {/* Loading placeholder */}
          {!isLoaded && !hasError && (
            <LoadingPlaceholder $aspectRatio={aspectRatio} aria-hidden="true" />
          )}

          {/* Thumbnail for blur-up effect */}
          {thumbnailUrl && showThumbnail && (
            <ThumbnailImage
              src={thumbnailUrl}
              alt=""
              $isVisible={!isLoaded}
              aria-hidden="true"
            />
          )}

          {/* Full-size image */}
          {!hasError && (
            <FullImage
              src={imageUrl}
              alt={alt}
              onLoad={handleImageLoad}
              $isLoaded={isLoaded}
              loading="lazy"
            />
          )}

          {/* Upload progress overlay */}
          {isUploading && (
            <UploadOverlay>
              {uploadProgress > 0 ? (
                <>
                  <ProgressRing viewBox="0 0 48 48" aria-hidden="true">
                    <ProgressBackground cx="24" cy="24" r="22" />
                    <ProgressCircle cx="24" cy="24" r="22" $progress={uploadProgress} />
                  </ProgressRing>
                  <ProgressText aria-live="polite">{uploadProgress}%</ProgressText>
                </>
              ) : (
                <LoadingSpinner aria-label="Uploading" />
              )}
            </UploadOverlay>
          )}

          {/* Error overlay */}
          {hasError && (
            <ErrorOverlay role="alert">
              <ErrorIcon aria-hidden="true">!</ErrorIcon>
              <ErrorText>{errorMessage}</ErrorText>
              {onRetry && (
                <RetryButton onClick={handleRetry} aria-label="Retry upload">
                  Retry
                </RetryButton>
              )}
            </ErrorOverlay>
          )}

          {/* Download button (visible on hover) */}
          {!isUploading && !hasError && isLoaded && (
            <ActionButton
              onClick={handleDownload}
              aria-label="Download photo"
              title="Download photo"
              disabled={isDownloading}
            >
              {isDownloading ? (
                <SmallSpinner />
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              )}
            </ActionButton>
          )}

          {/* Timestamp */}
          {formattedTime && !isUploading && !hasError && isLoaded && (
            <Timestamp aria-hidden="true">{formattedTime}</Timestamp>
          )}
        </ImageWrapper>
      </Container>
    );
  }
);

PhotoMessage.displayName = 'PhotoMessage';

/**
 * Photo Lightbox for viewing full-size images
 */
interface PhotoLightboxProps {
  imageUrl: string;
  onClose: () => void;
  alt?: string;
  onDownload?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const LightboxOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${fadeIn} 0.2s ease;
`;

const LightboxContent = styled.div`
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LightboxImageContainer = styled.div<{ $isZoomed: boolean }>`
  overflow: ${({ $isZoomed }) => ($isZoomed ? 'auto' : 'hidden')};
  max-width: 90vw;
  max-height: 90vh;
  cursor: ${({ $isZoomed }) => ($isZoomed ? 'move' : 'zoom-in')};
`;

const LightboxImage = styled.img<{ $isZoomed: boolean }>`
  max-width: ${({ $isZoomed }) => ($isZoomed ? 'none' : '90vw')};
  max-height: ${({ $isZoomed }) => ($isZoomed ? 'none' : '90vh')};
  width: ${({ $isZoomed }) => ($isZoomed ? 'auto' : 'auto')};
  object-fit: contain;
  animation: ${scaleIn} 0.3s ease;
  transform-origin: center;
  transition: transform 0.2s ease;
`;

const LightboxToolbar = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  animation: ${slideUp} 0.3s ease;
`;

const LightboxButton = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }

  &:focus {
    outline: 2px solid white;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const NavigationButton = styled(LightboxButton)<{ $direction: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${({ $direction }) => ($direction === 'left' ? 'left: 16px;' : 'right: 16px;')}

  &:hover {
    transform: translateY(-50%) scale(1.1);
  }
`;

const ZoomIndicator = styled.div`
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  animation: ${fadeIn} 0.2s ease;
`;

export const PhotoLightbox: React.FC<PhotoLightboxProps> = memo(
  ({
    imageUrl,
    onClose,
    alt = 'Full size photo',
    onDownload,
    onPrevious,
    onNext,
    hasPrevious = false,
    hasNext = false,
  }) => {
    const [isZoomed, setIsZoomed] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showZoomIndicator, setShowZoomIndicator] = useState(false);
    const imageContainerRef = useRef<HTMLDivElement>(null);

    // Close on Escape key
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        switch (e.key) {
          case 'Escape':
            if (isZoomed) {
              setIsZoomed(false);
            } else {
              onClose();
            }
            break;
          case 'ArrowLeft':
            if (hasPrevious && onPrevious) {
              onPrevious();
            }
            break;
          case 'ArrowRight':
            if (hasNext && onNext) {
              onNext();
            }
            break;
          case '+':
          case '=':
            if (!isZoomed) {
              setIsZoomed(true);
              setShowZoomIndicator(true);
              setTimeout(() => setShowZoomIndicator(false), 1500);
            }
            break;
          case '-':
            if (isZoomed) {
              setIsZoomed(false);
            }
            break;
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when lightbox is open
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }, [onClose, isZoomed, hasPrevious, hasNext, onPrevious, onNext]);

    const handleOverlayClick = useCallback(
      (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      },
      [onClose]
    );

    const handleImageClick = useCallback(() => {
      setIsZoomed((prev) => !prev);
      setShowZoomIndicator(true);
      setTimeout(() => setShowZoomIndicator(false), 1500);
    }, []);

    const handleDownload = useCallback(async () => {
      if (isDownloading) return;
      setIsDownloading(true);
      try {
        if (onDownload) {
          onDownload();
        } else {
          await downloadImage(imageUrl);
        }
      } finally {
        setIsDownloading(false);
      }
    }, [imageUrl, isDownloading, onDownload]);

    return (
      <LightboxOverlay
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-label="Image viewer"
      >
        <LightboxContent>
          <LightboxImageContainer
            ref={imageContainerRef}
            $isZoomed={isZoomed}
            onClick={handleImageClick}
          >
            <LightboxImage
              src={imageUrl}
              alt={alt}
              $isZoomed={isZoomed}
              draggable={false}
            />
          </LightboxImageContainer>

          {/* Navigation buttons */}
          {hasPrevious && onPrevious && (
            <NavigationButton
              $direction="left"
              onClick={(e) => {
                e.stopPropagation();
                onPrevious();
              }}
              aria-label="Previous image"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </NavigationButton>
          )}

          {hasNext && onNext && (
            <NavigationButton
              $direction="right"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              aria-label="Next image"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </NavigationButton>
          )}
        </LightboxContent>

        {/* Toolbar */}
        <LightboxToolbar>
          {/* Zoom button */}
          <LightboxButton
            onClick={(e) => {
              e.stopPropagation();
              handleImageClick();
            }}
            aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
            title={isZoomed ? 'Zoom out' : 'Zoom in'}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              {isZoomed ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                />
              )}
            </svg>
          </LightboxButton>

          {/* Download button */}
          <LightboxButton
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            aria-label="Download image"
            title="Download image"
            disabled={isDownloading}
          >
            {isDownloading ? (
              <SmallSpinner />
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            )}
          </LightboxButton>

          {/* Close button */}
          <LightboxButton
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close"
            title="Close (Esc)"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </LightboxButton>
        </LightboxToolbar>

        {/* Zoom indicator */}
        {showZoomIndicator && (
          <ZoomIndicator aria-live="polite">
            {isZoomed ? 'Zoomed in - Click to zoom out' : 'Zoomed out - Click to zoom in'}
          </ZoomIndicator>
        )}
      </LightboxOverlay>
    );
  }
);

PhotoLightbox.displayName = 'PhotoLightbox';

export default PhotoMessage;
