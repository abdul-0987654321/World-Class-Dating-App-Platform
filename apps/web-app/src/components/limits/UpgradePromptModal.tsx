import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FiX, FiStar, FiZap } from 'react-icons/fi';
import { Button } from '@components/common';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius['2xl']};
  padding: ${({ theme }) => theme.spacing['2xl']};
  max-width: 500px;
  width: 100%;
  position: relative;
  box-shadow: ${({ theme }) => theme.shadows.xl};
`;

const CloseButton = styled.button`
  position: absolute;
  top: ${({ theme }) => theme.spacing.lg};
  right: ${({ theme }) => theme.spacing.lg};
  background: none;
  border: none;
  font-size: ${({ theme }) => theme.fontSize.xl};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.xs};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.backgroundSecondary};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const IconContainer = styled.div<{ variant: 'limit' | 'premium' }>`
  width: 64px;
  height: 64px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ variant, theme }) =>
    variant === 'limit'
      ? `linear-gradient(135deg, ${theme.colors.warning}, ${theme.colors.error})`
      : `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${({ theme }) => theme.spacing.lg};
  font-size: 32px;
  color: white;
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Message = styled.p`
  font-size: ${({ theme }) => theme.fontSize.base};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  line-height: 1.6;
`;

const FeaturesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: ${({ theme }) => theme.spacing.xl} 0;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.sm} 0;
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.text};

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }

  svg {
    color: ${({ theme }) => theme.colors.success};
    flex-shrink: 0;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'limit' | 'premium';
  title?: string;
  message?: string;
  features?: string[];
}

export const UpgradePromptModal: React.FC<UpgradePromptModalProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  features,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const defaultTitles = {
    limit: "You've Reached Your Daily Limit",
    premium: 'Unlock Premium Features',
  };

  const defaultMessages = {
    limit:
      "Don't let limits hold you back! Upgrade to Premium for unlimited likes, swipes, and more.",
    premium: 'Get access to exclusive premium features and find your perfect match faster.',
  };

  const defaultFeatures = {
    limit: [
      'Unlimited likes and swipes',
      'Unlimited super likes',
      'Unlimited rewinds',
      'See who liked you',
      'Advanced filters',
      'Read receipts',
      'Priority support',
    ],
    premium: [
      'See who liked you',
      'Advanced filters',
      'Read receipts',
      'Incognito mode',
      'Profile boosts',
      'Priority support',
    ],
  };

  const displayTitle = title || defaultTitles[type];
  const displayMessage = message || defaultMessages[type];
  const displayFeatures = features || defaultFeatures[type];

  const handleUpgrade = () => {
    navigate('/subscription');
    onClose();
  };

  const handleBuyCoins = () => {
    navigate('/coins');
    onClose();
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>
          <FiX />
        </CloseButton>

        <IconContainer variant={type}>{type === 'limit' ? <FiZap /> : <FiStar />}</IconContainer>

        <Title>{displayTitle}</Title>
        <Message>{displayMessage}</Message>

        <FeaturesList>
          {displayFeatures.map((feature, index) => (
            <FeatureItem key={index}>
              <FiStar />
              {feature}
            </FeatureItem>
          ))}
        </FeaturesList>

        <ButtonGroup>
          <Button variant="primary" size="lg" onClick={handleUpgrade}>
            Upgrade to Premium
          </Button>
          {type === 'limit' && (
            <Button variant="outline" size="lg" onClick={handleBuyCoins}>
              Buy Coins Instead
            </Button>
          )}
          <Button variant="ghost" size="md" onClick={onClose}>
            Maybe Later
          </Button>
        </ButtonGroup>
      </Modal>
    </Overlay>
  );
};
