/**
 * GracefulExitModal Component
 * Allows users to exit conversations kindly instead of ghosting
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useGhostPrevention } from '../../hooks/useConversationIntelligence';
import {
  conversationIntelligenceService,
  ExitTemplate,
} from '../../services/conversation-intelligence.service';

interface GracefulExitModalProps {
  conversationId: string;
  matchName: string;
  isOpen: boolean;
  onClose: () => void;
  onExitSent: (message: string) => void;
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.md};
  animation: ${fadeIn} 0.2s ease-out;
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border-radius: ${({ theme }) => theme.borderRadius['2xl']};
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  animation: ${slideUp} 0.3s ease-out;
`;

const Header = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSize.xl};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 ${({ theme }) => theme.spacing.xs};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0;
`;

const Body = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
`;

const StepIndicator = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Step = styled.div<{ $active?: boolean; $completed?: boolean }>`
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: ${({ $active, $completed, theme }) =>
    $active || $completed ? theme.colors.primary : theme.colors.border};
  transition: background 0.2s ease;
`;

const Question = styled.h3`
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 ${({ theme }) => theme.spacing.md};
`;

const OptionsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const OptionButton = styled.button<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ $selected, theme }) =>
    $selected ? 'rgba(236, 72, 153, 0.1)' : theme.colors.background};
  border: 2px solid
    ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const OptionIcon = styled.span`
  font-size: 24px;
`;

const OptionContent = styled.div`
  flex: 1;
`;

const OptionLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text};
`;

const OptionDescription = styled.div`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 2px;
`;

const MessagePreview = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const MessageLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textTertiary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MessageText = styled.p`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  line-height: 1.6;
`;

const CustomMessageInput = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-family: inherit;
  resize: vertical;
  margin-top: ${({ theme }) => theme.spacing.md};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textTertiary};
  }
`;

const FeedbackSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const FeedbackToggle = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  cursor: pointer;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: ${({ theme }) => theme.colors.primary};
`;

const FeedbackLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.text};
`;

const FeedbackHint = styled.p`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: ${({ theme }) => theme.spacing.xs} 0 0 26px;
`;

const FeedbackCategories = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-top: ${({ theme }) => theme.spacing.sm};
  padding-left: 26px;
`;

const CategoryChip = styled.button<{ $selected?: boolean }>`
  padding: 6px 12px;
  background: ${({ $selected, theme }) =>
    $selected ? 'rgba(236, 72, 153, 0.15)' : theme.colors.background};
  border: 1px solid
    ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  color: ${({ $selected, theme }) =>
    $selected ? theme.colors.primary : theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSize.xs};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'ghost' }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $variant, theme }) => {
    switch ($variant) {
      case 'primary':
        return `
          background: ${theme.colors.gradient};
          color: white;
          border: none;
          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
          }
          &:disabled {
            opacity: 0.6;
            transform: none;
            box-shadow: none;
          }
        `;
      case 'ghost':
        return `
          background: transparent;
          color: ${theme.colors.textSecondary};
          border: none;
          &:hover {
            color: ${theme.colors.text};
          }
        `;
      default:
        return `
          background: transparent;
          color: ${theme.colors.text};
          border: 1px solid ${theme.colors.border};
          &:hover {
            border-color: ${theme.colors.primary};
          }
        `;
    }
  }}
`;

const LoadingSpinner = styled.span`
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 8px;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const SuccessMessage = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const SuccessIcon = styled.div`
  font-size: 48px;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const SuccessTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSize.lg};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 ${({ theme }) => theme.spacing.sm};
`;

const SuccessDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0;
`;

type ExitReason =
  | 'not_feeling_connection'
  | 'found_someone'
  | 'taking_break'
  | 'different_intentions'
  | 'other';

interface ReasonOption {
  value: ExitReason;
  icon: string;
  label: string;
  description: string;
}

const reasonOptions: ReasonOption[] = [
  {
    value: 'not_feeling_connection',
    icon: '💫',
    label: 'Not feeling the spark',
    description: "The romantic connection isn't there",
  },
  {
    value: 'found_someone',
    icon: '❤️',
    label: 'Found someone',
    description: "I've started seeing someone else",
  },
  {
    value: 'taking_break',
    icon: '🌿',
    label: 'Taking a break',
    description: 'Stepping back from dating for now',
  },
  {
    value: 'different_intentions',
    icon: '🎯',
    label: 'Different intentions',
    description: "We're looking for different things",
  },
  {
    value: 'other',
    icon: '💭',
    label: 'Other reason',
    description: "I'll write my own message",
  },
];

const feedbackCategories = [
  'Communication style',
  'Response time',
  'Conversation depth',
  'Profile accuracy',
  'Shared interests',
  'Values alignment',
];

export const GracefulExitModal: React.FC<GracefulExitModalProps> = ({
  conversationId,
  matchName,
  isOpen,
  onClose,
  onExitSent,
}) => {
  const { initiateGracefulExit } = useGhostPrevention(conversationId);

  const [step, setStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState<ExitReason | null>(null);
  const [templates, setTemplates] = useState<ExitTemplate[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [provideFeedback, setProvideFeedback] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [finalMessage, setFinalMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      conversationIntelligenceService.getExitTemplates().then(setTemplates);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedReason && selectedReason !== 'other') {
      const template = templates.find((t) => t.reason === selectedReason);
      if (template) {
        setFinalMessage(template.template.replace('[name]', matchName));
      }
    }
  }, [selectedReason, templates, matchName]);

  const handleReasonSelect = (reason: ExitReason) => {
    setSelectedReason(reason);
  };

  const handleNext = () => {
    if (step === 1 && selectedReason) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);
    try {
      await initiateGracefulExit({
        reason: selectedReason,
        customMessage: selectedReason === 'other' ? customMessage : undefined,
        provideFeedback,
        feedbackCategories: provideFeedback ? selectedFeedback : undefined,
      });
      setIsSuccess(true);
      const message = selectedReason === 'other' ? customMessage : finalMessage;
      setTimeout(() => onExitSent(message), 2000);
    } catch (error) {
      console.error('Failed to send graceful exit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFeedbackCategory = (category: string) => {
    setSelectedFeedback((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  if (isSuccess) {
    return (
      <Overlay onClick={handleOverlayClick}>
        <Modal>
          <SuccessMessage>
            <SuccessIcon>✨</SuccessIcon>
            <SuccessTitle>Message Sent</SuccessTitle>
            <SuccessDescription>
              You chose kindness over silence. That takes courage.
            </SuccessDescription>
          </SuccessMessage>
        </Modal>
      </Overlay>
    );
  }

  return (
    <Overlay onClick={handleOverlayClick}>
      <Modal>
        <Header>
          <Title>End Conversation Gracefully</Title>
          <Subtitle>Instead of disappearing, let {matchName} know where you stand</Subtitle>
        </Header>

        <Body>
          <StepIndicator>
            <Step $active={step === 1} $completed={step > 1} />
            <Step $active={step === 2} />
          </StepIndicator>

          {step === 1 && (
            <>
              <Question>What best describes your reason?</Question>
              <OptionsGrid>
                {reasonOptions.map((option) => (
                  <OptionButton
                    key={option.value}
                    $selected={selectedReason === option.value}
                    onClick={() => handleReasonSelect(option.value)}
                  >
                    <OptionIcon>{option.icon}</OptionIcon>
                    <OptionContent>
                      <OptionLabel>{option.label}</OptionLabel>
                      <OptionDescription>{option.description}</OptionDescription>
                    </OptionContent>
                  </OptionButton>
                ))}
              </OptionsGrid>
            </>
          )}

          {step === 2 && (
            <>
              <Question>
                {selectedReason === 'other' ? 'Write your message' : 'Preview your message'}
              </Question>

              {selectedReason === 'other' ? (
                <CustomMessageInput
                  placeholder={`Hi ${matchName}, I wanted to be honest with you...`}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />
              ) : (
                <MessagePreview>
                  <MessageLabel>Message to {matchName}</MessageLabel>
                  <MessageText>{finalMessage}</MessageText>
                </MessagePreview>
              )}

              <FeedbackSection>
                <FeedbackToggle>
                  <Checkbox
                    type="checkbox"
                    checked={provideFeedback}
                    onChange={(e) => setProvideFeedback(e.target.checked)}
                  />
                  <FeedbackLabel>Provide anonymous feedback</FeedbackLabel>
                </FeedbackToggle>
                <FeedbackHint>Help them improve (they won't know it's from you)</FeedbackHint>

                {provideFeedback && (
                  <FeedbackCategories>
                    {feedbackCategories.map((category) => (
                      <CategoryChip
                        key={category}
                        $selected={selectedFeedback.includes(category)}
                        onClick={() => toggleFeedbackCategory(category)}
                      >
                        {category}
                      </CategoryChip>
                    ))}
                  </FeedbackCategories>
                )}
              </FeedbackSection>
            </>
          )}
        </Body>

        <Footer>
          {step === 1 ? (
            <>
              <Button $variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button $variant="primary" onClick={handleNext} disabled={!selectedReason}>
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button $variant="secondary" onClick={handleBack} disabled={isSubmitting}>
                Back
              </Button>
              <Button
                $variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting || (selectedReason === 'other' && !customMessage.trim())}
              >
                {isSubmitting && <LoadingSpinner />}
                Send Message
              </Button>
            </>
          )}
        </Footer>
      </Modal>
    </Overlay>
  );
};

export default GracefulExitModal;
