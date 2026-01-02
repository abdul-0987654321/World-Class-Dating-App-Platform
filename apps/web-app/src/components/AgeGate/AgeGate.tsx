import React, { useState } from 'react';
import styled from 'styled-components';
import { FlamoralLogo } from '../Logo';

const MINIMUM_AGE = 18;

interface AgeGateProps {
  onVerified: () => void;
  onUnderage?: () => void;
}

export const AgeGate: React.FC<AgeGateProps> = ({ onVerified, onUnderage }) => {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState('');

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    if (!month || !day || !year) {
      setError('Please enter your complete date of birth');
      return;
    }

    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    const yearNum = parseInt(year);

    // Validate ranges
    if (monthNum < 1 || monthNum > 12) {
      setError('Please enter a valid month (1-12)');
      return;
    }

    if (dayNum < 1 || dayNum > 31) {
      setError('Please enter a valid day (1-31)');
      return;
    }

    const currentYear = new Date().getFullYear();
    if (yearNum < currentYear - 120 || yearNum > currentYear) {
      setError('Please enter a valid year');
      return;
    }

    // Create date object
    const birthDate = new Date(yearNum, monthNum - 1, dayNum);

    // Validate date
    if (isNaN(birthDate.getTime())) {
      setError('Please enter a valid date');
      return;
    }

    // Check if date is in the future
    if (birthDate > new Date()) {
      setError('Date of birth cannot be in the future');
      return;
    }

    // Calculate age
    const age = calculateAge(birthDate);

    if (age < MINIMUM_AGE) {
      setError(`You must be at least ${MINIMUM_AGE} years old to use Flamoral`);
      if (onUnderage) {
        setTimeout(() => onUnderage(), 3000);
      }
      return;
    }

    // Age verification passed
    // Store in localStorage to remember
    localStorage.setItem('ageVerified', 'true');
    localStorage.setItem('ageVerifiedDate', new Date().toISOString());

    onVerified();
  };

  return (
    <Overlay>
      <Modal>
        <LogoWrapper>
          <FlamoralLogo variant="primary" size="md" />
        </LogoWrapper>

        <Title>Age Verification Required</Title>
        <Subtitle>
          You must be at least {MINIMUM_AGE} years old to use Flamoral
        </Subtitle>

        <Form onSubmit={handleSubmit}>
          <Label>Enter your date of birth:</Label>

          <DateInputGroup>
            <DateInput
              type="number"
              placeholder="MM"
              min="1"
              max="12"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              maxLength={2}
            />
            <DateSeparator>/</DateSeparator>
            <DateInput
              type="number"
              placeholder="DD"
              min="1"
              max="31"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              maxLength={2}
            />
            <DateSeparator>/</DateSeparator>
            <DateInput
              type="number"
              placeholder="YYYY"
              min="1900"
              max={new Date().getFullYear()}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              maxLength={4}
              style={{ width: '100px' }}
            />
          </DateInputGroup>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <SubmitButton type="submit">
            Continue
          </SubmitButton>
        </Form>

        <PrivacyNote>
          We use your date of birth to verify your age and personalize your experience.
          By continuing, you agree to our{' '}
          <PrivacyLink href="/terms" target="_blank">Terms of Service</PrivacyLink>
          {' '}and{' '}
          <PrivacyLink href="/privacy" target="_blank">Privacy Policy</PrivacyLink>.
        </PrivacyNote>
      </Modal>
    </Overlay>
  );
};

// Styled Components

const Overlay = styled.div`
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
  padding: 3rem 2rem;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  text-align: center;

  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
  }
`;

const LogoWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: #666;
  margin: 0 0 2rem 0;
`;

const Form = styled.form`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  font-size: 1rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 1rem;
  text-align: left;
`;

const DateInputGroup = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const DateInput = styled.input`
  width: 80px;
  padding: 0.75rem;
  font-size: 1.125rem;
  font-weight: 500;
  text-align: center;
  border: 2px solid #ddd;
  border-radius: 8px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #e91e63;
  }

  &::placeholder {
    color: #999;
    font-weight: 400;
  }

  /* Remove spinner arrows */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type='number'] {
    -moz-appearance: textfield;
  }
`;

const DateSeparator = styled.span`
  font-size: 1.5rem;
  color: #666;
  font-weight: 600;
`;

const ErrorMessage = styled.div`
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  padding: 0.75rem;
  color: #c33;
  font-size: 0.9rem;
  margin-bottom: 1rem;
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 1rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #e91e63 0%, #f50057 100%);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const PrivacyNote = styled.p`
  font-size: 0.85rem;
  color: #666;
  line-height: 1.6;
  margin: 0;
`;

const PrivacyLink = styled.a`
  color: #e91e63;
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

export default AgeGate;
