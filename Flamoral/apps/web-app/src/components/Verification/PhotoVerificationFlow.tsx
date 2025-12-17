import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaCamera, FaInfoCircle } from 'react-icons/fa';

interface PhotoVerificationFlowProps {
  userId: string;
  referencePhotoUrl?: string;
  onVerificationComplete?: (result: VerificationResult) => void;
  onCancel?: () => void;
}

interface VerificationResult {
  success: boolean;
  verified: boolean;
  confidence: number;
  details: {
    faceDetected: boolean;
    faceCount: number;
    qualityScore: number;
    matchScore?: number;
  };
  liveness?: {
    isLive: boolean;
    confidence: number;
  };
  duplicate?: {
    isDuplicate: boolean;
    matchingUserIds: string[];
  };
  failureReason?: string;
}

type VerificationStep = 'upload' | 'processing' | 'result';
type VerificationStatus = 'idle' | 'uploading' | 'verifying' | 'success' | 'failed';

const PhotoVerificationFlow: React.FC<PhotoVerificationFlowProps> = ({
  userId,
  referencePhotoUrl,
  onVerificationComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<VerificationStep>('upload');
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Upload photo to storage
  const uploadPhoto = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('type', 'verification');

    const response = await fetch('/api/media/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload photo');
    }

    const data = await response.json();
    return data.url;
  };

  // Verify photo with backend
  const verifyPhoto = async (imageUrl: string, mediaId: string): Promise<VerificationResult> => {
    const response = await fetch(`/api/verification/comprehensive/${mediaId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        userId,
        imageUrl,
        referencePhotoUrl,
      }),
    });

    if (!response.ok) {
      throw new Error('Verification failed');
    }

    const data = await response.json();
    return data.result;
  };

  // Handle verification process
  const handleVerify = async () => {
    if (!selectedFile) return;

    try {
      setStatus('uploading');
      setStep('processing');
      setError(null);

      // Upload photo
      const imageUrl = await uploadPhoto(selectedFile);

      // Extract media ID from response (simplified - actual implementation may vary)
      const mediaId = imageUrl.split('/').pop()?.split('.')[0] || '';

      setStatus('verifying');

      // Verify photo
      const result = await verifyPhoto(imageUrl, mediaId);

      setVerificationResult(result);
      setStatus(result.verified ? 'success' : 'failed');
      setStep('result');

      // Notify parent component
      if (onVerificationComplete) {
        onVerificationComplete(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setStatus('failed');
      setStep('result');
    }
  };

  // Reset flow
  const handleReset = () => {
    setStep('upload');
    setStatus('idle');
    setSelectedFile(null);
    setPreviewUrl(null);
    setVerificationResult(null);
    setError(null);
  };

  // Render quality tips
  const renderQualityTips = () => (
    <TipsContainer>
      <TipsHeader>
        <FaInfoCircle />
        <span>Photo Quality Tips</span>
      </TipsHeader>
      <TipsList>
        <TipItem>✓ Face clearly visible and well-lit</TipItem>
        <TipItem>✓ No sunglasses or face coverings</TipItem>
        <TipItem>✓ Only one person in photo</TipItem>
        <TipItem>✓ Recent photo (not old or edited)</TipItem>
        <TipItem>✓ No screenshots or photos of photos</TipItem>
      </TipsList>
    </TipsContainer>
  );

  // Render upload step
  const renderUploadStep = () => (
    <>
      <StepTitle>Upload Photo for Verification</StepTitle>
      <StepDescription>
        Upload a clear photo of yourself. We'll verify it meets our quality standards
        {referencePhotoUrl && ' and matches your profile photo'}.
      </StepDescription>

      {!previewUrl ? (
        <UploadArea>
          <UploadLabel htmlFor="photo-upload">
            <FaCamera size={48} />
            <UploadText>Click to select photo</UploadText>
            <UploadSubtext>or drag and drop</UploadSubtext>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </UploadLabel>
        </UploadArea>
      ) : (
        <PreviewContainer>
          <PreviewImage src={previewUrl} alt="Preview" />
          <PreviewActions>
            <ActionButton onClick={() => {
              setSelectedFile(null);
              setPreviewUrl(null);
            }}>
              Change Photo
            </ActionButton>
            <PrimaryButton onClick={handleVerify}>
              Verify Photo
            </PrimaryButton>
          </PreviewActions>
        </PreviewContainer>
      )}

      {renderQualityTips()}

      {error && (
        <ErrorMessage>
          <FaTimesCircle />
          <span>{error}</span>
        </ErrorMessage>
      )}
    </>
  );

  // Render processing step
  const renderProcessingStep = () => (
    <ProcessingContainer>
      <SpinnerIcon>
        <FaSpinner className="spin" size={64} />
      </SpinnerIcon>
      <ProcessingTitle>
        {status === 'uploading' ? 'Uploading photo...' : 'Verifying photo...'}
      </ProcessingTitle>
      <ProcessingDescription>
        {status === 'uploading'
          ? 'Please wait while we upload your photo'
          : 'Our AI is analyzing your photo for quality and authenticity'}
      </ProcessingDescription>
      <ProcessingSteps>
        <ProcessingStep $completed={status !== 'uploading'}>
          {status === 'uploading' ? <FaSpinner className="spin" /> : <FaCheckCircle />}
          <span>Uploading photo</span>
        </ProcessingStep>
        <ProcessingStep $completed={status === 'verifying'}>
          {status === 'verifying' ? <FaSpinner className="spin" /> :
           status === 'success' || status === 'failed' ? <FaCheckCircle /> : null}
          <span>Detecting face</span>
        </ProcessingStep>
        <ProcessingStep $completed={status === 'verifying'}>
          {status === 'verifying' ? <FaSpinner className="spin" /> :
           status === 'success' || status === 'failed' ? <FaCheckCircle /> : null}
          <span>Checking quality</span>
        </ProcessingStep>
        {referencePhotoUrl && (
          <ProcessingStep $completed={status === 'verifying'}>
            {status === 'verifying' ? <FaSpinner className="spin" /> :
             status === 'success' || status === 'failed' ? <FaCheckCircle /> : null}
            <span>Matching face</span>
          </ProcessingStep>
        )}
      </ProcessingSteps>
    </ProcessingContainer>
  );

  // Render result step
  const renderResultStep = () => {
    if (!verificationResult && !error) return null;

    const isSuccess = status === 'success' && verificationResult?.verified;

    return (
      <ResultContainer>
        <ResultIcon $success={isSuccess}>
          {isSuccess ? <FaCheckCircle size={64} /> : <FaTimesCircle size={64} />}
        </ResultIcon>

        <ResultTitle $success={isSuccess}>
          {isSuccess ? 'Verification Successful!' : 'Verification Failed'}
        </ResultTitle>

        {isSuccess ? (
          <>
            <ResultDescription>
              Your photo has been verified and meets our quality standards.
            </ResultDescription>

            {verificationResult && (
              <ResultDetails>
                <DetailItem>
                  <DetailLabel>Confidence Score:</DetailLabel>
                  <DetailValue>{Math.round(verificationResult.confidence * 100)}%</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Quality Score:</DetailLabel>
                  <DetailValue>{Math.round(verificationResult.details.qualityScore * 100)}%</DetailValue>
                </DetailItem>
                {verificationResult.details.matchScore !== undefined && (
                  <DetailItem>
                    <DetailLabel>Face Match Score:</DetailLabel>
                    <DetailValue>{Math.round(verificationResult.details.matchScore * 100)}%</DetailValue>
                  </DetailItem>
                )}
                {verificationResult.liveness && (
                  <DetailItem>
                    <DetailLabel>Liveness Check:</DetailLabel>
                    <DetailValue $success={verificationResult.liveness.isLive}>
                      {verificationResult.liveness.isLive ? 'Passed' : 'Failed'}
                    </DetailValue>
                  </DetailItem>
                )}
              </ResultDetails>
            )}
          </>
        ) : (
          <>
            <ResultDescription>
              {verificationResult?.failureReason || error || 'Unable to verify this photo.'}
            </ResultDescription>

            {verificationResult && !verificationResult.details.faceDetected && (
              <FailureReason>
                <strong>Issue:</strong> No face detected in the photo.
                <br />
                <strong>Solution:</strong> Ensure your face is clearly visible and well-lit.
              </FailureReason>
            )}

            {verificationResult && verificationResult.details.faceCount > 1 && (
              <FailureReason>
                <strong>Issue:</strong> Multiple faces detected.
                <br />
                <strong>Solution:</strong> Upload a photo with only yourself in it.
              </FailureReason>
            )}

            {verificationResult && verificationResult.details.qualityScore < 0.5 && (
              <FailureReason>
                <strong>Issue:</strong> Photo quality too low.
                <br />
                <strong>Solution:</strong> Use a clearer photo with good lighting.
              </FailureReason>
            )}

            {verificationResult?.liveness && !verificationResult.liveness.isLive && (
              <FailureReason>
                <strong>Issue:</strong> Photo appears to be a screenshot or printout.
                <br />
                <strong>Solution:</strong> Upload a real photo taken with a camera.
              </FailureReason>
            )}

            {verificationResult?.duplicate?.isDuplicate && (
              <FailureReason>
                <strong>Issue:</strong> This photo is already associated with another account.
                <br />
                <strong>Solution:</strong> Use a unique photo for your profile.
              </FailureReason>
            )}
          </>
        )}

        <ResultActions>
          {isSuccess ? (
            <PrimaryButton onClick={onCancel}>Done</PrimaryButton>
          ) : (
            <>
              <ActionButton onClick={handleReset}>Try Again</ActionButton>
              <ActionButton onClick={onCancel}>Cancel</ActionButton>
            </>
          )}
        </ResultActions>
      </ResultContainer>
    );
  };

  return (
    <Container>
      <Header>
        <ProgressBar>
          <ProgressStep $active={step === 'upload'} $completed={step !== 'upload'}>1</ProgressStep>
          <ProgressLine $completed={step !== 'upload'} />
          <ProgressStep $active={step === 'processing'} $completed={step === 'result'}>2</ProgressStep>
          <ProgressLine $completed={step === 'result'} />
          <ProgressStep $active={step === 'result'} $completed={false}>3</ProgressStep>
        </ProgressBar>
      </Header>

      <Content>
        {step === 'upload' && renderUploadStep()}
        {step === 'processing' && renderProcessingStep()}
        {step === 'result' && renderResultStep()}
      </Content>

      {step === 'upload' && onCancel && (
        <Footer>
          <CancelButton onClick={onCancel}>Cancel</CancelButton>
        </Footer>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const ProgressBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
`;

const ProgressStep = styled.div<{ $active: boolean; $completed: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  background-color: ${props =>
    props.$completed ? '#10b981' :
    props.$active ? '#3b82f6' :
    '#e5e7eb'};
  color: ${props => props.$active || props.$completed ? 'white' : '#6b7280'};
  transition: all 0.3s;
`;

const ProgressLine = styled.div<{ $completed: boolean }>`
  flex: 1;
  height: 2px;
  background-color: ${props => props.$completed ? '#10b981' : '#e5e7eb'};
  transition: all 0.3s;
`;

const Content = styled.div`
  min-height: 400px;
`;

const StepTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #111827;
`;

const StepDescription = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 24px;
  line-height: 1.5;
`;

const UploadArea = styled.div`
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 48px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #3b82f6;
    background-color: #f9fafb;
  }
`;

const UploadLabel = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  color: #6b7280;
`;

const UploadText = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
`;

const UploadSubtext = styled.div`
  font-size: 14px;
  color: #9ca3af;
`;

const PreviewContainer = styled.div`
  margin-bottom: 24px;
`;

const PreviewImage = styled.img`
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  border-radius: 12px;
  margin-bottom: 16px;
`;

const PreviewActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;

const TipsContainer = styled.div`
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 16px;
  margin-top: 24px;
`;

const TipsHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #1e40af;
  margin-bottom: 12px;

  svg {
    color: #3b82f6;
  }
`;

const TipsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const TipItem = styled.li`
  font-size: 14px;
  color: #1e3a8a;
  padding: 4px 0;
`;

const ProcessingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
`;

const SpinnerIcon = styled.div`
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
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
`;

const ProcessingDescription = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 32px;
  text-align: center;
`;

const ProcessingSteps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 300px;
`;

const ProcessingStep = styled.div<{ $completed: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: ${props => props.$completed ? '#10b981' : '#6b7280'};

  svg {
    width: 20px;
    height: 20px;
  }

  .spin {
    animation: spin 1s linear infinite;
  }
`;

const ResultContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
`;

const ResultIcon = styled.div<{ $success: boolean }>`
  color: ${props => props.$success ? '#10b981' : '#ef4444'};
  margin-bottom: 24px;
`;

const ResultTitle = styled.h3<{ $success: boolean }>`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.$success ? '#10b981' : '#ef4444'};
  margin-bottom: 12px;
`;

const ResultDescription = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 24px;
  text-align: center;
  max-width: 400px;
`;

const ResultDetails = styled.div`
  background-color: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  width: 100%;
  margin-bottom: 24px;
`;

const DetailItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;

  &:last-child {
    border-bottom: none;
  }
`;

const DetailLabel = styled.span`
  font-size: 14px;
  color: #6b7280;
`;

const DetailValue = styled.span<{ $success?: boolean }>`
  font-size: 14px;
  font-weight: 600;
  color: ${props =>
    props.$success === undefined ? '#111827' :
    props.$success ? '#10b981' : '#ef4444'};
`;

const FailureReason = styled.div`
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  font-size: 14px;
  color: #991b1b;
  text-align: left;
  width: 100%;
  line-height: 1.6;

  strong {
    color: #7f1d1d;
  }
`;

const ResultActions = styled.div`
  display: flex;
  gap: 12px;
`;

const PrimaryButton = styled.button`
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #2563eb;
  }

  &:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }
`;

const ActionButton = styled.button`
  background-color: white;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #f9fafb;
    border-color: #9ca3af;
  }
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 12px 16px;
  color: #991b1b;
  font-size: 14px;
  margin-top: 16px;

  svg {
    flex-shrink: 0;
  }
`;

const Footer = styled.div`
  margin-top: 24px;
  text-align: center;
`;

const CancelButton = styled.button`
  background-color: transparent;
  color: #6b7280;
  border: none;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #111827;
  }
`;

export default PhotoVerificationFlow;
