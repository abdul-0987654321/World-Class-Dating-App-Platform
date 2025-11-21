import React, { useState, useRef } from 'react';
import styled from 'styled-components';

interface PhotoUploadProps {
  onUpload: (file: File) => Promise<void>;
  maxSizeMB?: number;
  disabled?: boolean;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  onUpload,
  maxSizeMB = 10,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.';
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size exceeds ${maxSizeMB}MB limit.`;
    }

    return null;
  };

  const handleFile = async (file: File) => {
    setError(null);

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    try {
      await onUpload(file);
      setPreview(null); // Clear preview after successful upload
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input so same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <Container>
      <DropZone
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        isDragging={isDragging}
        disabled={disabled || isUploading}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileInput}
          style={{ display: 'none' }}
          disabled={disabled || isUploading}
        />

        {preview ? (
          <PreviewContainer>
            <PreviewImage src={preview} alt="Preview" />
            {isUploading && (
              <UploadingOverlay>
                <Spinner />
                <UploadingText>Uploading...</UploadingText>
              </UploadingOverlay>
            )}
          </PreviewContainer>
        ) : (
          <UploadPrompt>
            <UploadIcon>📸</UploadIcon>
            <UploadText>
              {isUploading
                ? 'Uploading...'
                : isDragging
                ? 'Drop your photo here'
                : 'Click to upload or drag & drop'}
            </UploadText>
            <UploadHint>JPEG, PNG, WebP, GIF (max {maxSizeMB}MB)</UploadHint>
            <UploadHint>Minimum 400x400 pixels recommended</UploadHint>
          </UploadPrompt>
        )}
      </DropZone>

      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Container>
  );
};

const Container = styled.div`
  width: 100%;
`;

const DropZone = styled.div<{ isDragging: boolean; disabled: boolean }>`
  border: 2px dashed
    ${(props) =>
      props.isDragging ? '#FF6B6B' : props.disabled ? '#ccc' : '#ddd'};
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.3s ease;
  background-color: ${(props) =>
    props.isDragging ? '#fff5f5' : props.disabled ? '#f5f5f5' : '#fafafa'};
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};

  &:hover {
    border-color: ${(props) => (props.disabled ? '#ccc' : '#FF6B6B')};
    background-color: ${(props) => (props.disabled ? '#f5f5f5' : '#fff5f5')};
  }
`;

const PreviewContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 400px;
`;

const PreviewImage = styled.img`
  width: 100%;
  height: auto;
  border-radius: 8px;
  object-fit: contain;
`;

const UploadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
`;

const Spinner = styled.div`
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const UploadingText = styled.p`
  color: white;
  margin-top: 12px;
  font-weight: 500;
`;

const UploadPrompt = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const UploadIcon = styled.div`
  font-size: 48px;
  margin-bottom: 8px;
`;

const UploadText = styled.p`
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin: 0;
`;

const UploadHint = styled.p`
  font-size: 13px;
  color: #666;
  margin: 0;
`;

const ErrorMessage = styled.div`
  margin-top: 12px;
  padding: 12px 16px;
  background-color: #fee;
  color: #c33;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
`;
