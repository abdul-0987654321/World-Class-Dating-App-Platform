import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const USER_SERVICE_URL = import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:3001';

interface PhoneVerificationProps {
  onVerificationComplete?: () => void;
  onSkip?: () => void;
  allowSkip?: boolean;
  initialPhoneNumber?: string;
}

interface VerificationStatus {
  phoneNumber?: string;
  isVerified: boolean;
  hasPendingVerification: boolean;
  pendingCodeExpiresAt?: string;
}

export const PhoneVerification: React.FC<PhoneVerificationProps> = ({
  onVerificationComplete,
  onSkip,
  allowSkip = false,
  initialPhoneNumber = '',
}) => {
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('accessToken') || '';
  };

  // Format phone number for display
  const formatPhoneDisplay = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Load verification status on mount
  useEffect(() => {
    loadVerificationStatus();
  }, []);

  // Countdown timer for code expiration
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(expiresAt).getTime();
      const remaining = Math.floor((expires - now) / 1000);

      if (remaining <= 0) {
        setTimeRemaining(0);
        setCanResend(true);
        clearInterval(interval);
      } else {
        setTimeRemaining(remaining);
        // Allow resend after 1 minute
        setCanResend(remaining <= 540); // 9 minutes remaining = 1 minute passed
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const loadVerificationStatus = async () => {
    try {
      const response = await axios.get(`${USER_SERVICE_URL}/api/phone/status`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      if (response.data.success) {
        const status = response.data.data as VerificationStatus;
        setVerificationStatus(status);

        if (status.isVerified) {
          setSuccess('Phone number already verified!');
          if (onVerificationComplete) {
            onVerificationComplete();
          }
        } else if (status.hasPendingVerification && status.pendingCodeExpiresAt) {
          setPhoneNumber(status.phoneNumber || '');
          setExpiresAt(new Date(status.pendingCodeExpiresAt));
          setStep('verify');
        } else if (status.phoneNumber) {
          setPhoneNumber(status.phoneNumber);
        }
      }
    } catch (err: any) {
      console.error('Failed to load verification status:', err);
    }
  };

  const sendVerificationCode = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(
        `${USER_SERVICE_URL}/api/phone/send-code`,
        { phoneNumber },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      if (response.data.success) {
        setSuccess(response.data.message);
        setExpiresAt(new Date(response.data.expiresAt));
        setStep('verify');
        setCanResend(false);
      } else {
        setError(response.data.error || 'Failed to send verification code');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to send verification code'
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(
        `${USER_SERVICE_URL}/api/phone/verify-code`,
        { code: verificationCode },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      if (response.data.success) {
        setSuccess('Phone number verified successfully!');
        setTimeout(() => {
          if (onVerificationComplete) {
            onVerificationComplete();
          }
        }, 1500);
      } else {
        setError(response.data.error || 'Invalid verification code');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to verify code'
      );
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(
        `${USER_SERVICE_URL}/api/phone/resend-code`,
        { phoneNumber },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      if (response.data.success) {
        setSuccess('New verification code sent!');
        setExpiresAt(new Date(response.data.expiresAt));
        setVerificationCode('');
        setCanResend(false);
      } else {
        setError(response.data.error || 'Failed to resend code');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to resend code'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumber = () => {
    setStep('input');
    setVerificationCode('');
    setExpiresAt(null);
    setTimeRemaining(null);
    setError('');
    setSuccess('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Container>
      <Title>Phone Verification</Title>
      <Description>
        {step === 'input'
          ? 'Enter your phone number to receive a verification code'
          : 'Enter the 6-digit code sent to your phone'}
      </Description>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      {step === 'input' ? (
        <InputStep>
          <Label htmlFor="phone">Phone Number</Label>
          <PhoneInput
            id="phone"
            type="tel"
            placeholder="(555) 123-4567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={loading}
          />

          <ButtonGroup>
            <PrimaryButton onClick={sendVerificationCode} disabled={loading}>
              {loading ? 'Sending...' : 'Send Code'}
            </PrimaryButton>

            {allowSkip && onSkip && (
              <SecondaryButton onClick={onSkip} disabled={loading}>
                Skip for Now
              </SecondaryButton>
            )}
          </ButtonGroup>
        </InputStep>
      ) : (
        <VerifyStep>
          <PhoneDisplay>
            Sending code to: <strong>{formatPhoneDisplay(phoneNumber)}</strong>
          </PhoneDisplay>

          <Label htmlFor="code">Verification Code</Label>
          <CodeInput
            id="code"
            type="text"
            placeholder="000000"
            maxLength={6}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
            disabled={loading}
            autoFocus
          />

          {timeRemaining !== null && timeRemaining > 0 && (
            <TimerText>
              Code expires in <strong>{formatTime(timeRemaining)}</strong>
            </TimerText>
          )}

          {timeRemaining === 0 && (
            <ExpiredText>Code has expired. Please request a new one.</ExpiredText>
          )}

          <ButtonGroup>
            <PrimaryButton onClick={verifyCode} disabled={loading || !verificationCode || verificationCode.length !== 6}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </PrimaryButton>

            <SecondaryButton onClick={resendCode} disabled={loading || !canResend}>
              {canResend ? 'Resend Code' : 'Wait to Resend'}
            </SecondaryButton>
          </ButtonGroup>

          <ChangeNumberLink onClick={handleChangeNumber}>
            Change phone number
          </ChangeNumberLink>
        </VerifyStep>
      )}

      <InfoText>
        Standard message rates may apply. We'll never share your phone number with anyone.
      </InfoText>
    </Container>
  );
};

// Styled Components

const Container = styled.div`
  max-width: 450px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  font-size: 1.75rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 0.5rem 0;
  text-align: center;
`;

const Description = styled.p`
  font-size: 0.95rem;
  color: #666;
  margin: 0 0 1.5rem 0;
  text-align: center;
`;

const ErrorMessage = styled.div`
  padding: 0.75rem 1rem;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  color: #c33;
  font-size: 0.9rem;
  margin-bottom: 1rem;
`;

const SuccessMessage = styled.div`
  padding: 0.75rem 1rem;
  background: #efe;
  border: 1px solid #cfc;
  border-radius: 6px;
  color: #3a3;
  font-size: 0.9rem;
  margin-bottom: 1rem;
`;

const InputStep = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const VerifyStep = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
`;

const PhoneInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #007bff;
  }

  &:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
`;

const CodeInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.5rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #007bff;
  }

  &:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
`;

const PhoneDisplay = styled.div`
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-radius: 6px;
  text-align: center;
  font-size: 0.95rem;
  color: #555;
`;

const TimerText = styled.div`
  text-align: center;
  font-size: 0.9rem;
  color: #666;
`;

const ExpiredText = styled.div`
  text-align: center;
  font-size: 0.9rem;
  color: #c33;
  font-weight: 500;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const PrimaryButton = styled.button`
  width: 100%;
  padding: 0.875rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background: #007bff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: #0056b3;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled.button`
  width: 100%;
  padding: 0.875rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  color: #007bff;
  background: white;
  border: 2px solid #007bff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #f0f8ff;
  }

  &:disabled {
    color: #ccc;
    border-color: #ccc;
    cursor: not-allowed;
  }
`;

const ChangeNumberLink = styled.button`
  background: none;
  border: none;
  color: #007bff;
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 0.5rem;
  margin-top: 0.5rem;
  text-align: center;

  &:hover {
    color: #0056b3;
  }
`;

const InfoText = styled.p`
  font-size: 0.8rem;
  color: #999;
  text-align: center;
  margin: 1.5rem 0 0 0;
  line-height: 1.4;
`;

export default PhoneVerification;
