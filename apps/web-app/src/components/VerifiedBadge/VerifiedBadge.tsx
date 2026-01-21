import React from 'react';
import styled from 'styled-components';
import { Shield, Check } from 'lucide-react';

interface VerifiedBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  className?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'medium',
  showText = false,
  className,
}) => {
  const iconSize = {
    small: 16,
    medium: 20,
    large: 24,
  }[size];

  return (
    <Container className={className} $size={size}>
      <BadgeIcon $size={size}>
        <Shield size={iconSize} fill="currentColor" />
        <CheckIcon size={iconSize * 0.6}>
          <Check strokeWidth={3} />
        </CheckIcon>
      </BadgeIcon>
      {showText && <BadgeText $size={size}>Verified</BadgeText>}
    </Container>
  );
};

// Styled Components

const Container = styled.div<{ $size: 'small' | 'medium' | 'large' }>`
  display: inline-flex;
  align-items: center;
  gap: ${(props) =>
    props.$size === 'small' ? '0.25rem' : props.$size === 'medium' ? '0.375rem' : '0.5rem'};
`;

const BadgeIcon = styled.div<{ $size: 'small' | 'medium' | 'large' }>`
  position: relative;
  color: #2196f3;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const CheckIcon = styled.div<{ size: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
`;

const BadgeText = styled.span<{ $size: 'small' | 'medium' | 'large' }>`
  font-size: ${(props) =>
    props.$size === 'small' ? '0.75rem' : props.$size === 'medium' ? '0.875rem' : '1rem'};
  font-weight: 600;
  color: #2196f3;
`;

export default VerifiedBadge;
