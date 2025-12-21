/**
 * Verification Upload Component
 * Handles document and selfie upload for verification
 */

import React, { useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { FaCamera, FaUpload, FaCheckCircle, FaTimesCircle, FaSpinner, FaRedo } from 'react-icons/fa';
import apiClient, { ApiError } from '../../services/api.client';

type UploadType = 'selfie' | 'document' | 'id_front' | 'id_back';
type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface VerificationUploadProps {
  type: UploadType;
  onSuccess: (result: VerificationResult) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  referencePhotoUrl?: string;
}

interface VerificationResult {
  success: boolean;
  verificationId: string;
  status: 'pending' | 'verified' | 'rejected';
  confidence?: number;
  message?: string;
}

const VerificationUpload: React.FC<VerificationUploadProps> = ({
  type,
  onSuccess,
  onError,
  onCancel,
  referencePhotoUrl,
}) => {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const getTypeConfig = () => {
    switch (type) {
      case 'selfie':
        return {
          title: 'Take a Selfie',
          description: 'Take a clear photo of your face for verification',
          accept: 'image/*',
          capture: 'user' as const,
          icon: FaCamera,
        };
      case 'document':
        return {
          title: 'Upload Document',
          description: 'Upload a clear photo of your verification document',
          accept: 'image/*,.pdf',
          capture: undefined,
          icon: FaUpload,
        };
      case 'id_front':
        return {
          title: 'ID Front Side',
          description: 'Upload the front of your government-issued ID',
          accept: 'image/*',
          capture: 'environment' as const,
          icon: FaUpload,
        };
      case 'id_back':
        return {
          title: 'ID Back Side',
          description: 'Upload the back of your government-issued ID',
          accept: 'image/*',
          capture: 'environment' as const,
          icon: FaUpload,
        };
      default:
        return {
          title: 'Upload Photo',
          description: 'Upload a photo for verification',
          accept: 'image/*',
          capture: undefined,
          icon: FaUpload,
        };
    }
  };

  const config = getTypeConfig();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setErrorMessage('Please select an image or PDF file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: type === 'selfie' ? 'user' : 'environment' },
      });
      setStream(mediaStream);
      setIsCameraMode(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setErrorMessage('Unable to access camera. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraMode(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (context) {
        // Flip horizontally for selfie mode
        if (type === 'selfie') {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }
        context.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `${type}-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setSelectedFile(file);
            setPreviewUrl(canvas.toDataURL('image/jpeg'));
          }
        }, 'image/jpeg', 0.9);
      }

      stopCamera();
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setStatus('uploading');
      setProgress(0);
      setErrorMessage(null);

      // Create form data
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', type);
      if (referencePhotoUrl) {
        formData.append('referencePhotoUrl', referencePhotoUrl);
      }

      // Upload to verification endpoint
      const response = await fetch('/api/verification/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 402) {
          throw new Error('This feature requires a premium subscription');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Upload failed');
      }

      setStatus('processing');
      setProgress(50);

      const uploadResult = await response.json();
      const verificationId = uploadResult.data?.verificationId || uploadResult.verificationId;

      // Poll for verification result
      const result = await pollVerificationStatus(verificationId);

      setStatus('success');
      setProgress(100);
      onSuccess(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setErrorMessage(message);
      setStatus('error');
      if (onError) {
        onError(message);
      }
    }
  };

  const pollVerificationStatus = async (verificationId: string): Promise<VerificationResult> => {
    const maxAttempts = 30;
    const pollInterval = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      try {
        const response = await apiClient.get<{ success: boolean; data: VerificationResult }>(
          `/api/verification/${verificationId}/status`
        );

        const result = response.data;
        setProgress(50 + Math.min(attempt * 2, 45));

        if (result.status !== 'pending') {
          return result;
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }

    // Timeout - return pending status
    return {
      success: true,
      verificationId,
      status: 'pending',
      message: 'Verification is still processing. You will be notified when complete.',
    };
  };

  const handleReset = () => {
    setStatus('idle');
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage(null);
    setProgress(0);
    stopCamera();
  };

  const renderCameraView = () => (
    <CameraContainer>
      <Video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        $mirror={type === 'selfie'}
      />
      <CameraOverlay>
        {type === 'selfie' && <FaceGuide />}
        <CameraControls>
          <CameraButton onClick={stopCamera} $variant="cancel">
            Cancel
          </CameraButton>
          <CaptureButton onClick={capturePhoto}>
            <div />
          </CaptureButton>
          <div style={{ width: 80 }} /> {/* Spacer */}
        </CameraControls>
      </CameraOverlay>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </CameraContainer>
  );

  const renderUploadArea = () => (
    <>
      {!previewUrl ? (
        <UploadArea onClick={() => fileInputRef.current?.click()}>
          <UploadIcon>
            <config.icon />
          </UploadIcon>
          <UploadText>{config.description}</UploadText>
          <UploadHint>Click to select or drag and drop</UploadHint>
          <input
            ref={fileInputRef}
            type="file"
            accept={config.accept}
            capture={config.capture}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </UploadArea>
      ) : (
        <PreviewContainer>
          <PreviewImage src={previewUrl} alt="Preview" />
          <PreviewActions>
            <ActionButton onClick={handleReset} $variant="secondary">
              <FaRedo /> Change
            </ActionButton>
            <ActionButton onClick={handleUpload} $variant="primary">
              <FaUpload /> Verify
            </ActionButton>
          </PreviewActions>
        </PreviewContainer>
      )}

      {type === 'selfie' && !previewUrl && (
        <OrDivider>
          <span>or</span>
        </OrDivider>
      )}

      {type === 'selfie' && !previewUrl && (
        <CameraStartButton onClick={startCamera}>
          <FaCamera /> Use Camera
        </CameraStartButton>
      )}
    </>
  );

  const renderProcessing = () => (
    <ProcessingContainer>
      <SpinnerIcon>
        <FaSpinner className="spin" />
      </SpinnerIcon>
      <ProcessingTitle>
        {status === 'uploading' ? 'Uploading...' : 'Processing...'}
      </ProcessingTitle>
      <ProcessingDescription>
        {status === 'uploading'
          ? 'Uploading your photo securely'
          : 'Verifying your photo. This may take a moment.'}
      </ProcessingDescription>
      <ProgressBar>
        <ProgressFill $progress={progress} />
      </ProgressBar>
    </ProcessingContainer>
  );

  const renderSuccess = () => (
    <ResultContainer>
      <ResultIcon $success>
        <FaCheckCircle />
      </ResultIcon>
      <ResultTitle $success>Verification Submitted</ResultTitle>
      <ResultDescription>
        Your verification is being processed. You will be notified once it's complete.
      </ResultDescription>
    </ResultContainer>
  );

  const renderError = () => (
    <ResultContainer>
      <ResultIcon>
        <FaTimesCircle />
      </ResultIcon>
      <ResultTitle>Verification Failed</ResultTitle>
      <ResultDescription>{errorMessage}</ResultDescription>
      <ActionButton onClick={handleReset} $variant="primary">
        Try Again
      </ActionButton>
    </ResultContainer>
  );

  return (
    <Container>
      <Header>
        <Title>{config.title}</Title>
        {onCancel && status === 'idle' && (
          <CancelButton onClick={onCancel}>Cancel</CancelButton>
        )}
      </Header>

      {isCameraMode && renderCameraView()}

      {!isCameraMode && status === 'idle' && renderUploadArea()}
      {(status === 'uploading' || status === 'processing') && renderProcessing()}
      {status === 'success' && renderSuccess()}
      {status === 'error' && renderError()}

      {errorMessage && status === 'idle' && (
        <ErrorMessage>
          <FaTimesCircle />
          <span>{errorMessage}</span>
        </ErrorMessage>
      )}

      <Tips>
        <TipsTitle>Tips for best results:</TipsTitle>
        <TipsList>
          {type === 'selfie' && (
            <>
              <li>Face the camera directly</li>
              <li>Ensure good lighting on your face</li>
              <li>Remove sunglasses and hats</li>
              <li>Keep a neutral expression</li>
            </>
          )}
          {(type === 'id_front' || type === 'id_back' || type === 'document') && (
            <>
              <li>Place document on a flat, contrasting surface</li>
              <li>Ensure all text is readable</li>
              <li>Avoid glare and shadows</li>
              <li>Include all corners of the document</li>
            </>
          )}
        </TipsList>
      </Tips>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 500px;
  margin: 0 auto;
  padding: 24px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0;
`;

const CancelButton = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    color: #111827;
  }
`;

const UploadArea = styled.div`
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #f9fafb;

  &:hover {
    border-color: #3b82f6;
    background-color: #eff6ff;
  }
`;

const UploadIcon = styled.div`
  font-size: 48px;
  color: #3b82f6;
  margin-bottom: 16px;
`;

const UploadText = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
`;

const UploadHint = styled.div`
  font-size: 14px;
  color: #6b7280;
`;

const PreviewContainer = styled.div`
  border-radius: 12px;
  overflow: hidden;
  background-color: #f9fafb;
`;

const PreviewImage = styled.img`
  width: 100%;
  max-height: 400px;
  object-fit: contain;
`;

const PreviewActions = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px;
`;

const ActionButton = styled.button<{ $variant: 'primary' | 'secondary' }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  background-color: ${props => props.$variant === 'primary' ? '#3b82f6' : 'white'};
  color: ${props => props.$variant === 'primary' ? 'white' : '#374151'};
  border: ${props => props.$variant === 'primary' ? 'none' : '1px solid #d1d5db'};

  &:hover {
    background-color: ${props => props.$variant === 'primary' ? '#2563eb' : '#f9fafb'};
  }
`;

const OrDivider = styled.div`
  display: flex;
  align-items: center;
  margin: 24px 0;
  color: #9ca3af;
  font-size: 14px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background-color: #e5e7eb;
  }

  span {
    padding: 0 16px;
  }
`;

const CameraStartButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background-color: #111827;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #374151;
  }
`;

const CameraContainer = styled.div`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background-color: #000;
`;

const Video = styled.video<{ $mirror?: boolean }>`
  width: 100%;
  display: block;
  transform: ${props => props.$mirror ? 'scaleX(-1)' : 'none'};
`;

const CameraOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
`;

const FaceGuide = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;

  &::before {
    content: '';
    width: 200px;
    height: 260px;
    border: 3px solid rgba(255, 255, 255, 0.5);
    border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  }
`;

const CameraControls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
`;

const CameraButton = styled.button<{ $variant?: 'cancel' }>`
  padding: 12px 24px;
  background-color: ${props => props.$variant === 'cancel' ? 'rgba(0, 0, 0, 0.5)' : '#3b82f6'};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
`;

const CaptureButton = styled.button`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background-color: white;
  border: 4px solid rgba(255, 255, 255, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  div {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background-color: white;
    transition: all 0.2s;
  }

  &:hover div {
    transform: scale(0.9);
  }

  &:active div {
    transform: scale(0.8);
    background-color: #ef4444;
  }
`;

const ProcessingContainer = styled.div`
  text-align: center;
  padding: 48px 24px;
`;

const SpinnerIcon = styled.div`
  font-size: 48px;
  color: #3b82f6;
  margin-bottom: 24px;

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ProcessingTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
`;

const ProcessingDescription = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 24px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${props => props.$progress}%;
  background: linear-gradient(90deg, #3b82f6, #10b981);
  transition: width 0.3s;
`;

const ResultContainer = styled.div`
  text-align: center;
  padding: 48px 24px;
`;

const ResultIcon = styled.div<{ $success?: boolean }>`
  font-size: 64px;
  color: ${props => props.$success ? '#10b981' : '#ef4444'};
  margin-bottom: 24px;
`;

const ResultTitle = styled.h3<{ $success?: boolean }>`
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.$success ? '#10b981' : '#ef4444'};
  margin-bottom: 12px;
`;

const ResultDescription = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 24px;
  line-height: 1.5;
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 16px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  font-size: 14px;

  svg {
    flex-shrink: 0;
  }
`;

const Tips = styled.div`
  margin-top: 24px;
  padding: 16px;
  background-color: #f9fafb;
  border-radius: 8px;
`;

const TipsTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
`;

const TipsList = styled.ul`
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.6;
`;

export default VerificationUpload;
