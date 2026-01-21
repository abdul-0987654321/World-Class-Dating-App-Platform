import { authTokenService } from '@/services/auth-token.service';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FaCheckCircle, FaTimesCircle, FaClock, FaUpload, FaShieldAlt } from 'react-icons/fa';
import VerificationBadge, { VerificationLevel } from './VerificationBadge';

interface VerificationStatusProps {
  userId: string;
  onStartVerification?: () => void;
}

interface UserVerificationStats {
  verified: number;
  pending: number;
  failed: number;
  total: number;
  verificationLevel: VerificationLevel;
  isVerified: boolean;
}

interface PhotoStatus {
  id: string;
  url: string;
  verified: boolean;
  status: 'verified' | 'pending' | 'failed' | 'none';
  confidence?: number;
  qualityScore?: number;
  failureReason?: string;
  verifiedAt?: string;
}

const VerificationStatus: React.FC<VerificationStatusProps> = ({ userId, onStartVerification }) => {
  const [stats, setStats] = useState<UserVerificationStats | null>(null);
  const [photos, setPhotos] = useState<PhotoStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user verification stats
  useEffect(() => {
    fetchVerificationStats();
  }, [userId]);

  const fetchVerificationStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/verification/user/${userId}/stats`, {
        headers: {
          ...authTokenService.getAuthorizationHeader(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch verification stats');
      }

      const data = await response.json();
      setStats(data.stats);

      // Fetch photo statuses
      await fetchPhotoStatuses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verification status');
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotoStatuses = async () => {
    try {
      const response = await fetch(`/api/media/user/${userId}`, {
        headers: {
          ...authTokenService.getAuthorizationHeader(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }

      const data = await response.json();
      setPhotos(data.photos || []);
    } catch (err) {
      console.error('Failed to fetch photo statuses:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <FaCheckCircle color="#10b981" size={20} />;
      case 'failed':
        return <FaTimesCircle color="#ef4444" size={20} />;
      case 'pending':
        return <FaClock color="#f59e0b" size={20} />;
      default:
        return <FaClock color="#9ca3af" size={20} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'failed':
        return 'Verification Failed';
      case 'pending':
        return 'Pending Verification';
      default:
        return 'Not Verified';
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>Loading verification status...</LoadingSpinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorMessage>
          <FaTimesCircle />
          <span>{error}</span>
        </ErrorMessage>
      </Container>
    );
  }

  if (!stats) {
    return null;
  }

  const progressPercentage = stats.total > 0 ? (stats.verified / stats.total) * 100 : 0;

  return (
    <Container>
      <Header>
        <HeaderTitle>
          <FaShieldAlt size={24} />
          <span>Verification Status</span>
        </HeaderTitle>
        <VerificationBadge level={stats.verificationLevel} showText={true} size="medium" />
      </Header>

      <StatsGrid>
        <StatCard>
          <StatValue>{stats.verified}</StatValue>
          <StatLabel>Verified Photos</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue $warning={stats.pending > 0}>{stats.pending}</StatValue>
          <StatLabel>Pending</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue $error={stats.failed > 0}>{stats.failed}</StatValue>
          <StatLabel>Failed</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.total}</StatValue>
          <StatLabel>Total Photos</StatLabel>
        </StatCard>
      </StatsGrid>

      <ProgressSection>
        <ProgressHeader>
          <ProgressLabel>Verification Progress</ProgressLabel>
          <ProgressPercentage>{Math.round(progressPercentage)}%</ProgressPercentage>
        </ProgressHeader>
        <ProgressBar>
          <ProgressFill $percentage={progressPercentage} />
        </ProgressBar>
      </ProgressSection>

      {stats.verificationLevel === 'none' && (
        <InfoBanner>
          <BannerIcon>
            <FaShieldAlt />
          </BannerIcon>
          <BannerContent>
            <BannerTitle>Get Verified</BannerTitle>
            <BannerText>
              Verify your photos to increase trust and get more matches. Verified profiles get 3x
              more views!
            </BannerText>
          </BannerContent>
          {onStartVerification && (
            <BannerButton onClick={onStartVerification}>
              <FaUpload />
              <span>Start Verification</span>
            </BannerButton>
          )}
        </InfoBanner>
      )}

      {stats.verificationLevel === 'basic' && (
        <InfoBanner $warning>
          <BannerIcon>
            <FaShieldAlt />
          </BannerIcon>
          <BannerContent>
            <BannerTitle>Upgrade to Verified</BannerTitle>
            <BannerText>
              Add more verified photos with face matching to unlock the full verified badge and
              premium features.
            </BannerText>
          </BannerContent>
          {onStartVerification && (
            <BannerButton onClick={onStartVerification}>
              <FaUpload />
              <span>Upload More Photos</span>
            </BannerButton>
          )}
        </InfoBanner>
      )}

      {stats.failed > 0 && (
        <InfoBanner $error>
          <BannerIcon>
            <FaTimesCircle />
          </BannerIcon>
          <BannerContent>
            <BannerTitle>Some Photos Failed Verification</BannerTitle>
            <BannerText>
              {stats.failed} photo{stats.failed > 1 ? 's' : ''} didn't meet our quality standards.
              Review and re-upload.
            </BannerText>
          </BannerContent>
        </InfoBanner>
      )}

      {photos.length > 0 && (
        <PhotosSection>
          <SectionTitle>Your Photos</SectionTitle>
          <PhotosGrid>
            {photos.map((photo) => (
              <PhotoCard key={photo.id}>
                <PhotoImage src={photo.url} alt="Profile photo" />
                <PhotoOverlay>
                  <StatusBadge $status={photo.status}>
                    {getStatusIcon(photo.status)}
                    <span>{getStatusText(photo.status)}</span>
                  </StatusBadge>
                  {photo.verified && photo.confidence && (
                    <ConfidenceBadge>
                      {Math.round(photo.confidence * 100)}% confidence
                    </ConfidenceBadge>
                  )}
                  {photo.status === 'failed' && photo.failureReason && (
                    <FailureReason>{photo.failureReason}</FailureReason>
                  )}
                </PhotoOverlay>
                {photo.verifiedAt && (
                  <PhotoFooter>
                    Verified {new Date(photo.verifiedAt).toLocaleDateString()}
                  </PhotoFooter>
                )}
              </PhotoCard>
            ))}
          </PhotosGrid>
        </PhotosSection>
      )}

      <BenefitsSection>
        <SectionTitle>Benefits of Verification</SectionTitle>
        <BenefitsList>
          <BenefitItem>
            <BenefitIcon>
              <FaCheckCircle color="#10b981" />
            </BenefitIcon>
            <BenefitText>
              <BenefitTitle>Increased Trust</BenefitTitle>
              <BenefitDescription>
                Verified profiles are trusted by other users and get more matches
              </BenefitDescription>
            </BenefitText>
          </BenefitItem>
          <BenefitItem>
            <BenefitIcon>
              <FaCheckCircle color="#10b981" />
            </BenefitIcon>
            <BenefitText>
              <BenefitTitle>Higher Visibility</BenefitTitle>
              <BenefitDescription>
                Verified profiles appear higher in search results and recommendations
              </BenefitDescription>
            </BenefitText>
          </BenefitItem>
          <BenefitItem>
            <BenefitIcon>
              <FaCheckCircle color="#10b981" />
            </BenefitIcon>
            <BenefitText>
              <BenefitTitle>Premium Features</BenefitTitle>
              <BenefitDescription>
                Unlock premium features like advanced filters and priority messaging
              </BenefitDescription>
            </BenefitText>
          </BenefitItem>
          <BenefitItem>
            <BenefitIcon>
              <FaCheckCircle color="#10b981" />
            </BenefitIcon>
            <BenefitText>
              <BenefitTitle>Safety & Security</BenefitTitle>
              <BenefitDescription>
                Help keep the community safe by proving you're a real person
              </BenefitDescription>
            </BenefitText>
          </BenefitItem>
        </BenefitsList>
      </BenefitsSection>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
`;

const HeaderTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 24px;
  font-weight: 700;
  color: #111827;

  svg {
    color: #3b82f6;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
`;

const StatCard = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
`;

const StatValue = styled.div<{ $warning?: boolean; $error?: boolean }>`
  font-size: 32px;
  font-weight: 700;
  color: ${(props) => (props.$error ? '#ef4444' : props.$warning ? '#f59e0b' : '#111827')};
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #6b7280;
`;

const ProgressSection = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const ProgressLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111827;
`;

const ProgressPercentage = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #3b82f6;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $percentage: number }>`
  height: 100%;
  width: ${(props) => props.$percentage}%;
  background: linear-gradient(to right, #3b82f6, #10b981);
  transition: width 0.5s ease;
`;

const InfoBanner = styled.div<{ $warning?: boolean; $error?: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  background-color: ${(props) =>
    props.$error ? '#fef2f2' : props.$warning ? '#fffbeb' : '#eff6ff'};
  border: 1px solid
    ${(props) => (props.$error ? '#fecaca' : props.$warning ? '#fde68a' : '#bfdbfe')};
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
`;

const BannerIcon = styled.div`
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #3b82f6;
`;

const BannerContent = styled.div`
  flex: 1;
`;

const BannerTitle = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 4px;
`;

const BannerText = styled.p`
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
  margin: 0;
`;

const BannerButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background-color: #2563eb;
  }
`;

const PhotosSection = styled.div`
  margin-bottom: 32px;
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 16px;
`;

const PhotosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
`;

const PhotoCard = styled.div`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  border: 1px solid #e5e7eb;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const PhotoImage = styled.img`
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
`;

const PhotoOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const StatusBadge = styled.div<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: rgba(255, 255, 255, 0.95);
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  align-self: flex-start;
  color: ${(props) => {
    switch (props.$status) {
      case 'verified':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      case 'pending':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  }};
`;

const ConfidenceBadge = styled.div`
  display: inline-flex;
  background-color: rgba(16, 185, 129, 0.95);
  color: white;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  align-self: flex-start;
`;

const FailureReason = styled.div`
  background-color: rgba(239, 68, 68, 0.95);
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 1.4;
`;

const PhotoFooter = styled.div`
  padding: 8px 12px;
  background-color: #f9fafb;
  font-size: 12px;
  color: #6b7280;
  text-align: center;
`;

const BenefitsSection = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
`;

const BenefitsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const BenefitItem = styled.div`
  display: flex;
  gap: 16px;
`;

const BenefitIcon = styled.div`
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const BenefitText = styled.div`
  flex: 1;
`;

const BenefitTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
`;

const BenefitDescription = styled.div`
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 48px;
  color: #6b7280;
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 16px;
  color: #991b1b;
`;

export default VerificationStatus;
