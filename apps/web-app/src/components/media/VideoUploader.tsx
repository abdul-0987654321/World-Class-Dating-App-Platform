import React, { useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { FiVideo, FiUpload, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';

interface VideoUploaderProps {
  onUpload: (file: File) => Promise<void>;
  onCancel?: () => void;
  maxSizeInMB?: number;
  maxDurationInSeconds?: number;
  acceptedFormats?: string[];
  context?: 'profile' | 'prompt';
}

const VideoUploader: React.FC<VideoUploaderProps> = ({
  onUpload,
  onCancel,
  maxSizeInMB = 100,
  maxDurationInSeconds = 30,
  acceptedFormats = ['video/mp4', 'video/quicktime', 'video/x-m4v'],
  context = 'profile',
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [videoMetadata, setVideoMetadata] = useState<{
    duration: number;
    width: number;
    height: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const validateVideo = useCallback(
    (file: File): Promise<boolean> => {
      return new Promise((resolve) => {
        // Check file type
        if (!acceptedFormats.includes(file.type)) {
          setError(`Please upload a video in one of these formats: ${acceptedFormats.join(', ')}`);
          resolve(false);
          return;
        }

        // Check file size
        const fileSizeInMB = file.size / (1024 * 1024);
        if (fileSizeInMB > maxSizeInMB) {
          setError(
            `File size must be less than ${maxSizeInMB}MB. Your file is ${fileSizeInMB.toFixed(1)}MB.`
          );
          resolve(false);
          return;
        }

        // Check video duration
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          const duration = video.duration;

          if (duration > maxDurationInSeconds) {
            setError(
              `Video must be ${maxDurationInSeconds} seconds or less. Your video is ${Math.round(duration)}s.`
            );
            resolve(false);
            return;
          }

          setVideoMetadata({
            duration,
            width: video.videoWidth,
            height: video.videoHeight,
          });

          resolve(true);
        };

        video.onerror = () => {
          setError('Failed to load video. Please try another file.');
          resolve(false);
        };

        video.src = URL.createObjectURL(file);
      });
    },
    [acceptedFormats, maxSizeInMB, maxDurationInSeconds]
  );

  const handleFileSelect = async (file: File) => {
    setError('');
    setSelectedFile(null);
    setPreviewUrl('');
    setVideoMetadata(null);

    const isValid = await validateVideo(file);
    if (!isValid) return;

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      // Simulate upload progress (replace with actual upload logic)
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await onUpload(selectedFile);

      clearInterval(interval);
      setUploadProgress(100);

      // Reset after success
      setTimeout(() => {
        setSelectedFile(null);
        setPreviewUrl('');
        setVideoMetadata(null);
        setIsUploading(false);
        setUploadProgress(0);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setVideoMetadata(null);
    setError('');
    if (onCancel) {
      onCancel();
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Container>
      <Header>
        <Title>
          <FiVideo />
          Upload {context === 'profile' ? 'Profile Video' : 'Video Response'}
        </Title>
        <CloseButton onClick={handleCancel}>
          <FiX />
        </CloseButton>
      </Header>

      {!selectedFile ? (
        <DropZone
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          isDragging={isDragging}
        >
          <UploadIcon>
            <FiUpload size={48} />
          </UploadIcon>
          <DropText>
            Drag and drop your video here, or{' '}
            <BrowseButton onClick={() => fileInputRef.current?.click()}>browse</BrowseButton>
          </DropText>
          <Requirements>
            <li>Max duration: {maxDurationInSeconds} seconds</li>
            <li>Max size: {maxSizeInMB}MB</li>
            <li>Formats: MP4, MOV, M4V</li>
          </Requirements>
          <HiddenInput
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.join(',')}
            onChange={handleFileInput}
          />
        </DropZone>
      ) : (
        <PreviewContainer>
          <VideoPreview ref={videoRef} src={previewUrl} controls />

          {videoMetadata && (
            <MetadataContainer>
              <MetadataItem>
                <FiCheck color="#10B981" />
                Duration: {formatDuration(videoMetadata.duration)}
              </MetadataItem>
              <MetadataItem>
                <FiCheck color="#10B981" />
                Resolution: {videoMetadata.width}x{videoMetadata.height}
              </MetadataItem>
              <MetadataItem>
                <FiCheck color="#10B981" />
                Size: {(selectedFile.size / (1024 * 1024)).toFixed(1)}MB
              </MetadataItem>
            </MetadataContainer>
          )}

          {isUploading && (
            <ProgressContainer>
              <ProgressBar progress={uploadProgress} />
              <ProgressText>{uploadProgress}%</ProgressText>
            </ProgressContainer>
          )}

          <ButtonContainer>
            <SecondaryButton onClick={handleCancel} disabled={isUploading}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={handleUpload} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload Video'}
            </PrimaryButton>
          </ButtonContainer>
        </PreviewContainer>
      )}

      {error && (
        <ErrorMessage>
          <FiAlertCircle />
          {error}
        </ErrorMessage>
      )}

      <Tips>
        <TipsTitle>Tips for a great video:</TipsTitle>
        <TipsList>
          <li>Use good lighting - natural light works best</li>
          <li>Keep the video stable - use a tripod or steady surface</li>
          <li>Be yourself and let your personality shine</li>
          <li>Keep it between 15-{maxDurationInSeconds} seconds</li>
          <li>Make sure audio is clear and not too loud</li>
        </TipsList>
      </Tips>
    </Container>
  );
};

const Container = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    color: #ef4444;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: #6b7280;
  transition: color 0.2s;

  &:hover {
    color: #1f2937;
  }

  svg {
    width: 24px;
    height: 24px;
  }
`;

const DropZone = styled.div<{ isDragging: boolean }>`
  border: 2px dashed ${(props) => (props.isDragging ? '#ef4444' : '#d1d5db')};
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  background: ${(props) => (props.isDragging ? '#fef2f2' : '#f9fafb')};
  transition: all 0.2s;
  cursor: pointer;
`;

const UploadIcon = styled.div`
  color: #9ca3af;
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
`;

const DropText = styled.p`
  font-size: 16px;
  color: #6b7280;
  margin-bottom: 24px;
`;

const BrowseButton = styled.span`
  color: #ef4444;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;

  &:hover {
    color: #dc2626;
  }
`;

const Requirements = styled.ul`
  list-style: none;
  padding: 0;
  font-size: 14px;
  color: #9ca3af;

  li {
    margin: 4px 0;
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const PreviewContainer = styled.div`
  margin-bottom: 24px;
`;

const VideoPreview = styled.video`
  width: 100%;
  border-radius: 12px;
  max-height: 400px;
  background: #000;
  margin-bottom: 16px;
`;

const MetadataContainer = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const MetadataItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6b7280;
`;

const ProgressContainer = styled.div`
  margin: 16px 0;
`;

const ProgressBar = styled.div<{ progress: number }>`
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${(props) => props.progress}%;
    background: linear-gradient(90deg, #ef4444, #f97316);
    transition: width 0.3s ease;
  }
`;

const ProgressText = styled.p`
  text-align: center;
  margin-top: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background: linear-gradient(135deg, #ef4444, #f97316);
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
`;

const SecondaryButton = styled(Button)`
  background: white;
  color: #6b7280;
  border: 1px solid #d1d5db;

  &:hover:not(:disabled) {
    background: #f9fafb;
  }
`;

const ErrorMessage = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #dc2626;
  font-size: 14px;
  margin-bottom: 16px;

  svg {
    flex-shrink: 0;
  }
`;

const Tips = styled.div`
  background: #f0fdf4;
  border-radius: 8px;
  padding: 16px;
  margin-top: 24px;
`;

const TipsTitle = styled.h3`
  font-size: 14px;
  font-weight: 700;
  color: #065f46;
  margin-bottom: 8px;
`;

const TipsList = styled.ul`
  font-size: 13px;
  color: #047857;
  margin: 0;
  padding-left: 20px;

  li {
    margin: 4px 0;
  }
`;

export default VideoUploader;
