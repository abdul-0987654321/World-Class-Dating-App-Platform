import React from 'react';
import styled from 'styled-components';
import { FaCheckCircle, FaShieldAlt, FaStar, FaClock } from 'react-icons/fa';

export type VerificationLevel = 'none' | 'basic' | 'verified' | 'premium';

interface VerificationBadgeProps {
  level: VerificationLevel;
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
  verifiedDate?: string;
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  level,
  showText = true,
  size = 'medium',
  verifiedDate,
}) => {
  const getConfig = () => {
    switch (level) {
      case 'premium':
        return {
          icon: FaStar,
          color: '#fbbf24',
          bgColor: '#fef3c7',
          text: 'Premium Verified',
          description: 'ID verified with video liveness check',
        };
      case 'verified':
        return {
          icon: FaCheckCircle,
          color: '#10b981',
          bgColor: '#d1fae5',
          text: 'Verified',
          description: 'Photos verified with face matching',
        };
      case 'basic':
        return {
          icon: FaShieldAlt,
          color: '#3b82f6',
          bgColor: '#dbeafe',
          text: 'Basic',
          description: 'Photo meets quality standards',
        };
      case 'none':
      default:
        return {
          icon: FaClock,
          color: '#6b7280',
          bgColor: '#f3f4f6',
          text: 'Unverified',
          description: 'No photos verified yet',
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <TooltipContainer>
      <Badge
        $color={config.color}
        $bgColor={config.bgColor}
        $size={size}
        data-testid="verification-badge"
      >
        <Icon />
        {showText && <BadgeText $size={size}>{config.text}</BadgeText>}
      </Badge>

      <Tooltip>
        <TooltipHeader>
          <Icon style={{ color: config.color }} />
          <TooltipTitle>{config.text}</TooltipTitle>
        </TooltipHeader>
        <TooltipDescription>{config.description}</TooltipDescription>
        {verifiedDate && (
          <TooltipFooter>Verified {formatDate(verifiedDate)}</TooltipFooter>
        )}
      </Tooltip>
    </TooltipContainer>
  );
};

const TooltipContainer = styled.div`
  position: relative;
  display: inline-flex;

  &:hover > div:last-child {
    opacity: 1;
    visibility: visible;
  }
`;

const Badge = styled.div<{ $color: string; $bgColor: string; $size: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${(props) => {
    switch (props.$size) {
      case 'small':
        return '4px';
      case 'large':
        return '8px';
      default:
        return '6px';
    }
  }};
  padding: ${(props) => {
    switch (props.$size) {
      case 'small':
        return '4px 8px';
      case 'large':
        return '8px 16px';
      default:
        return '6px 12px';
    }
  }};
  background-color: ${(props) => props.$bgColor};
  color: ${(props) => props.$color};
  border-radius: 9999px;
  font-weight: 600;
  cursor: help;
  transition: all 0.2s;

  svg {
    width: ${(props) => {
      switch (props.$size) {
        case 'small':
          return '12px';
        case 'large':
          return '20px';
        default:
          return '16px';
      }
    }};
    height: ${(props) => {
      switch (props.$size) {
        case 'small':
          return '12px';
        case 'large':
          return '20px';
        default:
          return '16px';
      }
    }};
  }

  &:hover {
    transform: scale(1.05);
  }
`;

const BadgeText = styled.span<{ $size: string }>`
  font-size: ${(props) => {
    switch (props.$size) {
      case 'small':
        return '12px';
      case 'large':
        return '16px';
      default:
        return '14px';
    }
  }};
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s;
  white-space: nowrap;
  z-index: 1000;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: #1f2937;
  }
`;

const TooltipHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const TooltipTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
`;

const TooltipDescription = styled.div`
  font-size: 12px;
  color: #d1d5db;
  margin-bottom: 4px;
`;

const TooltipFooter = styled.div`
  font-size: 11px;
  color: #9ca3af;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid #374151;
`;

export default VerificationBadge;
