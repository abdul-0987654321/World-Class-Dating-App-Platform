/**
 * Verification Start Component
 * Entry point for starting the user verification flow
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaShieldAlt, FaCamera, FaIdCard, FaCheckCircle, FaArrowRight } from 'react-icons/fa';
import apiClient, { ApiError } from '../../services/api.client';

interface VerificationStartProps {
  userId: string;
  onStartPhotoVerification: () => void;
  onStartIdVerification?: () => void;
}

interface VerificationStatus {
  photoVerification: {
    status: 'none' | 'pending' | 'verified' | 'rejected';
    verifiedAt?: string;
  };
  idVerification: {
    status: 'none' | 'pending' | 'verified' | 'rejected';
    verifiedAt?: string;
  };
  overallLevel: 'none' | 'basic' | 'verified' | 'premium';
}

const VerificationStart: React.FC<VerificationStartProps> = ({
  userId,
  onStartPhotoVerification,
  onStartIdVerification,
}) => {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVerificationStatus();
  }, [userId]);

  const fetchVerificationStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<{ success: boolean; data: VerificationStatus }>(
        `/api/verification/status`
      );

      setStatus(response.data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        // Feature requires upgrade - handle gracefully
        setError('Verification requires a premium subscription');
      } else {
        setError('Failed to load verification status');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingState>Loading verification options...</LoadingState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorState>{error}</ErrorState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderIcon>
          <FaShieldAlt />
        </HeaderIcon>
        <HeaderText>
          <Title>Get Verified</Title>
          <Subtitle>Verify your profile to build trust and get more matches</Subtitle>
        </HeaderText>
      </Header>

      <BenefitsList>
        <BenefitItem>
          <FaCheckCircle />
          <span>Verified profiles get 3x more matches</span>
        </BenefitItem>
        <BenefitItem>
          <FaCheckCircle />
          <span>Build trust with potential matches</span>
        </BenefitItem>
        <BenefitItem>
          <FaCheckCircle />
          <span>Get a verified badge on your profile</span>
        </BenefitItem>
        <BenefitItem>
          <FaCheckCircle />
          <span>Priority in search and discovery</span>
        </BenefitItem>
      </BenefitsList>

      <VerificationOptions>
        <VerificationOption
          onClick={onStartPhotoVerification}
          $completed={status?.photoVerification.status === 'verified'}
          $pending={status?.photoVerification.status === 'pending'}
        >
          <OptionIcon $completed={status?.photoVerification.status === 'verified'}>
            <FaCamera />
          </OptionIcon>
          <OptionContent>
            <OptionTitle>Photo Verification</OptionTitle>
            <OptionDescription>Verify your photos with selfie matching</OptionDescription>
            {status?.photoVerification.status === 'verified' && (
              <OptionStatus $verified>Verified</OptionStatus>
            )}
            {status?.photoVerification.status === 'pending' && (
              <OptionStatus $pending>Pending Review</OptionStatus>
            )}
            {status?.photoVerification.status === 'rejected' && (
              <OptionStatus $rejected>Rejected - Try Again</OptionStatus>
            )}
          </OptionContent>
          <OptionArrow>
            <FaArrowRight />
          </OptionArrow>
        </VerificationOption>

        {onStartIdVerification && (
          <VerificationOption
            onClick={onStartIdVerification}
            $completed={status?.idVerification.status === 'verified'}
            $pending={status?.idVerification.status === 'pending'}
          >
            <OptionIcon $completed={status?.idVerification.status === 'verified'}>
              <FaIdCard />
            </OptionIcon>
            <OptionContent>
              <OptionTitle>ID Verification</OptionTitle>
              <OptionDescription>Verify your identity with government ID</OptionDescription>
              {status?.idVerification.status === 'verified' && (
                <OptionStatus $verified>Verified</OptionStatus>
              )}
              {status?.idVerification.status === 'pending' && (
                <OptionStatus $pending>Pending Review</OptionStatus>
              )}
              {status?.idVerification.status === 'rejected' && (
                <OptionStatus $rejected>Rejected - Try Again</OptionStatus>
              )}
              <PremiumBadge>Premium</PremiumBadge>
            </OptionContent>
            <OptionArrow>
              <FaArrowRight />
            </OptionArrow>
          </VerificationOption>
        )}
      </VerificationOptions>

      <InfoNote>
        <strong>Privacy First:</strong> Your verification photos and documents are securely
        processed and never shared with other users or third parties.
      </InfoNote>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 48px;
  color: #6b7280;
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 48px;
  color: #ef4444;
  background-color: #fef2f2;
  border-radius: 8px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
`;

const HeaderIcon = styled.div`
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
`;

const HeaderText = styled.div`
  flex: 1;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px 0;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: #6b7280;
  margin: 0;
`;

const BenefitsList = styled.div`
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
`;

const BenefitItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  font-size: 14px;
  color: #166534;

  svg {
    color: #22c55e;
    flex-shrink: 0;
  }
`;

const VerificationOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
`;

const VerificationOption = styled.div<{ $completed?: boolean; $pending?: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background-color: ${(props) =>
    props.$completed ? '#f0fdf4' : props.$pending ? '#fffbeb' : 'white'};
  border: 1px solid
    ${(props) => (props.$completed ? '#bbf7d0' : props.$pending ? '#fde68a' : '#e5e7eb')};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const OptionIcon = styled.div<{ $completed?: boolean }>`
  width: 48px;
  height: 48px;
  background-color: ${(props) => (props.$completed ? '#22c55e' : '#3b82f6')};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  flex-shrink: 0;
`;

const OptionContent = styled.div`
  flex: 1;
`;

const OptionTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
`;

const OptionDescription = styled.div`
  font-size: 14px;
  color: #6b7280;
`;

const OptionStatus = styled.div<{ $verified?: boolean; $pending?: boolean; $rejected?: boolean }>`
  display: inline-block;
  margin-top: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background-color: ${(props) =>
    props.$verified
      ? '#dcfce7'
      : props.$pending
        ? '#fef3c7'
        : props.$rejected
          ? '#fee2e2'
          : '#f3f4f6'};
  color: ${(props) =>
    props.$verified
      ? '#166534'
      : props.$pending
        ? '#92400e'
        : props.$rejected
          ? '#991b1b'
          : '#6b7280'};
`;

const PremiumBadge = styled.span`
  display: inline-block;
  margin-left: 8px;
  padding: 4px 8px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
`;

const OptionArrow = styled.div`
  color: #9ca3af;
  font-size: 16px;
`;

const InfoNote = styled.div`
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;

  strong {
    color: #374151;
  }
`;

export default VerificationStart;
