import { authTokenService } from '@/services/auth-token.service';
import React, { useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { Camera, Check, X, RefreshCw, Upload, Shield } from 'lucide-react';

interface PhotoVerificationProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export const PhotoVerification: React.FC<PhotoVerificationProps> = ({
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<'intro' | 'camera' | 'preview' | 'uploading' | 'result'>('intro');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<{
    status: 'approved' | 'pending' | 'rejected';
    message: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      setStep('camera');
      setError('');
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please allow camera access and try again.');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);

    // Stop camera
    stopCamera();

    // Move to preview step
    setStep('preview');
  }, [stopCamera]);

  // Handle file upload
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    // Read file
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCapturedImage(event.target.result as string);
        setStep('preview');
        setError('');
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setError('');
    startCamera();
  }, [startCamera]);

  // Submit photo
  const submitPhoto = useCallback(async () => {
    if (!capturedImage) return;

    setStep('uploading');
    setError('');

    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append('selfie', blob, 'selfie.jpg');

      // Get auth token
      const token = authTokenService.getToken();

      // Submit to API
      const apiResponse = await fetch('/api/photo-verification/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await apiResponse.json();

      if (!data.success) {
        setError(data.error || 'Failed to submit verification');
        setStep('preview');
        return;
      }

      // Show result
      setResult({
        status: data.status,
        message: data.message,
      });
      setStep('result');

      // Call onComplete after delay
      if (data.status === 'approved' && onComplete) {
        setTimeout(onComplete, 3000);
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setError('Failed to submit verification. Please try again.');
      setStep('preview');
    }
  }, [capturedImage, onComplete]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <Container>
      <Modal>
        {/* Intro Step */}
        {step === 'intro' && (
          <>
            <Header>
              <ShieldIcon>
                <Shield size={48} />
              </ShieldIcon>
              <Title>Get Verified</Title>
              <Subtitle>Verify your identity to get a verified badge and build trust</Subtitle>
            </Header>

            <Content>
              <InstructionsList>
                <InstructionItem>
                  <CheckIcon><Check size={20} /></CheckIcon>
                  <InstructionText>
                    <strong>Take a clear selfie</strong> with good lighting
                  </InstructionText>
                </InstructionItem>
                <InstructionItem>
                  <CheckIcon><Check size={20} /></CheckIcon>
                  <InstructionText>
                    <strong>Show your full face</strong> - no sunglasses or hats
                  </InstructionText>
                </InstructionItem>
                <InstructionItem>
                  <CheckIcon><Check size={20} /></CheckIcon>
                  <InstructionText>
                    <strong>Match your profile photos</strong> - we'll compare your selfie with your profile
                  </InstructionText>
                </InstructionItem>
                <InstructionItem>
                  <CheckIcon><Check size={20} /></CheckIcon>
                  <InstructionText>
                    <strong>Be yourself</strong> - no filters or heavy editing
                  </InstructionText>
                </InstructionItem>
              </InstructionsList>

              <InfoBox>
                Most verifications are approved automatically within seconds. Some may require manual review within 24 hours.
              </InfoBox>
            </Content>

            <Actions>
              <PrimaryButton onClick={startCamera}>
                <Camera size={20} />
                Take Selfie
              </PrimaryButton>
              <SecondaryButton onClick={() => fileInputRef.current?.click()}>
                <Upload size={20} />
                Upload Photo
              </SecondaryButton>
              {onCancel && (
                <TextButton onClick={onCancel}>Cancel</TextButton>
              )}
            </Actions>

            <HiddenFileInput
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
            />
          </>
        )}

        {/* Camera Step */}
        {step === 'camera' && (
          <>
            <CameraContainer>
              <Video ref={videoRef} autoPlay playsInline />
              <CameraOverlay>
                <FaceOutline />
                <CameraInstructions>
                  Position your face in the circle
                </CameraInstructions>
              </CameraOverlay>
            </CameraContainer>

            <Actions>
              <PrimaryButton onClick={capturePhoto}>
                <Camera size={20} />
                Capture
              </PrimaryButton>
              <TextButton onClick={() => { stopCamera(); setStep('intro'); }}>
                Cancel
              </TextButton>
            </Actions>

            <HiddenCanvas ref={canvasRef} />
          </>
        )}

        {/* Preview Step */}
        {step === 'preview' && (
          <>
            <PreviewContainer>
              {capturedImage && <PreviewImage src={capturedImage} alt="Preview" />}
            </PreviewContainer>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <Actions>
              <PrimaryButton onClick={submitPhoto} disabled={!!error}>
                <Check size={20} />
                Submit
              </PrimaryButton>
              <SecondaryButton onClick={retakePhoto}>
                <RefreshCw size={20} />
                Retake
              </SecondaryButton>
              <TextButton onClick={() => { setCapturedImage(null); setStep('intro'); }}>
                Cancel
              </TextButton>
            </Actions>
          </>
        )}

        {/* Uploading Step */}
        {step === 'uploading' && (
          <>
            <LoadingContainer>
              <Spinner />
              <LoadingText>Verifying your photo...</LoadingText>
              <LoadingSubtext>This may take a few moments</LoadingSubtext>
            </LoadingContainer>
          </>
        )}

        {/* Result Step */}
        {step === 'result' && result && (
          <>
            <ResultContainer>
              {result.status === 'approved' && (
                <>
                  <SuccessIcon>
                    <Check size={64} />
                  </SuccessIcon>
                  <ResultTitle>Verified!</ResultTitle>
                  <ResultMessage>{result.message}</ResultMessage>
                </>
              )}

              {result.status === 'pending' && (
                <>
                  <PendingIcon>
                    <RefreshCw size={64} />
                  </PendingIcon>
                  <ResultTitle>Under Review</ResultTitle>
                  <ResultMessage>{result.message}</ResultMessage>
                </>
              )}

              {result.status === 'rejected' && (
                <>
                  <ErrorIcon>
                    <X size={64} />
                  </ErrorIcon>
                  <ResultTitle>Verification Failed</ResultTitle>
                  <ResultMessage>{result.message}</ResultMessage>
                </>
              )}
            </ResultContainer>

            <Actions>
              <PrimaryButton onClick={onComplete || (() => setStep('intro'))}>
                Done
              </PrimaryButton>
              {result.status === 'rejected' && (
                <SecondaryButton onClick={() => setStep('intro')}>
                  Try Again
                </SecondaryButton>
              )}
            </Actions>
          </>
        )}
      </Modal>
    </Container>
  );
};

// Styled Components

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
`;

const Modal = styled.div`
  background: white;
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const Header = styled.div`
  text-align: center;
  padding: 2rem 2rem 1rem;
`;

const ShieldIcon = styled.div`
  color: #e91e63;
  margin-bottom: 1rem;
`;

const Title = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: #666;
  margin: 0;
`;

const Content = styled.div`
  padding: 1rem 2rem;
`;

const InstructionsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem 0;
`;

const InstructionItem = styled.li`
  display: flex;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const CheckIcon = styled.div`
  color: #4caf50;
  margin-right: 0.75rem;
  flex-shrink: 0;
`;

const InstructionText = styled.div`
  font-size: 0.95rem;
  color: #333;
  line-height: 1.5;
`;

const InfoBox = styled.div`
  background: #f0f7ff;
  border: 1px solid #90caf9;
  border-radius: 8px;
  padding: 1rem;
  font-size: 0.9rem;
  color: #1976d2;
  line-height: 1.5;
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 2rem 2rem;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background: linear-gradient(135deg, #e91e63 0%, #f50057 100%);
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
  }
`;

const SecondaryButton = styled(Button)`
  background: white;
  color: #e91e63;
  border: 2px solid #e91e63;

  &:hover:not(:disabled) {
    background: #fce4ec;
  }
`;

const TextButton = styled.button`
  background: none;
  border: none;
  color: #666;
  font-size: 0.95rem;
  padding: 0.5rem;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #e91e63;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const CameraContainer = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #000;
  border-radius: 16px 16px 0 0;
  overflow: hidden;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CameraOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const FaceOutline = styled.div`
  width: 280px;
  height: 280px;
  border: 3px solid #e91e63;
  border-radius: 50%;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
`;

const CameraInstructions = styled.div`
  color: white;
  font-size: 1rem;
  font-weight: 600;
  margin-top: 1.5rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
`;

const HiddenCanvas = styled.canvas`
  display: none;
`;

const PreviewContainer = styled.div`
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #f5f5f5;
  border-radius: 16px 16px 0 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ErrorMessage = styled.div`
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 2rem;
  color: #c33;
  font-size: 0.9rem;
  text-align: center;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
`;

const Spinner = styled.div`
  width: 64px;
  height: 64px;
  border: 4px solid #f0f0f0;
  border-top: 4px solid #e91e63;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin-top: 1.5rem;
`;

const LoadingSubtext = styled.div`
  font-size: 0.95rem;
  color: #666;
  margin-top: 0.5rem;
`;

const ResultContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
`;

const SuccessIcon = styled.div`
  color: #4caf50;
  margin-bottom: 1rem;
`;

const PendingIcon = styled.div`
  color: #ff9800;
  margin-bottom: 1rem;
`;

const ErrorIcon = styled.div`
  color: #f44336;
  margin-bottom: 1rem;
`;

const ResultTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 0.5rem 0;
`;

const ResultMessage = styled.p`
  font-size: 1rem;
  color: #666;
  text-align: center;
  line-height: 1.6;
  margin: 0;
`;

export default PhotoVerification;
