import React from 'react';
import styled from 'styled-components';
import { FaCheckCircle, FaExclamationTriangle, FaBan, FaHourglass } from 'react-icons/fa';

interface ModerationStatusBadgeProps {
  status: 'approved' | 'pending' | 'flagged' | 'rejected';
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const ModerationStatusBadge: React.FC<ModerationStatusBadgeProps> = ({
  status,
  size = 'medium',
  showText = true,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'approved':
        return {
          icon: FaCheckCircle,
          color: '#10b981',
          text: 'Approved',
          bgColor: '#d1fae5',
        };
      case 'pending':
        return {
          icon: FaHourglass,
          color: '#f59e0b',
          text: 'Pending Review',
          bgColor: '#fef3c7',
        };
      case 'flagged':
        return {
          icon: FaExclamationTriangle,
          color: '#f59e0b',
          text: 'Flagged',
          bgColor: '#fef3c7',
        };
      case 'rejected':
        return {
          icon: FaBan,
          color: '#ef4444',
          text: 'Rejected',
          bgColor: '#fee2e2',
        };
      default:
        return {
          icon: FaHourglass,
          color: '#6b7280',
          text: 'Unknown',
          bgColor: '#f3f4f6',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge $size={size} $color={config.color} $bgColor={config.bgColor}>
      <Icon />
      {showText && <span>{config.text}</span>}
    </Badge>
  );
};

const Badge = styled.div<{ $size: string; $color: string; $bgColor: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${(props) => (props.$size === 'small' ? '4px' : '6px')};
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
  font-weight: 600;

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
`;

export default ModerationStatusBadge;
