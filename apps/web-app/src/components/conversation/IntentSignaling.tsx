/**
 * IntentSignaling Component
 * Allows users to signal their dating intent (Ready Mode)
 */

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useIntent } from '../../hooks/useConversationIntelligence';
import { UserIntent, IntentOption } from '../../services/conversation-intelligence.service';

interface IntentSignalingProps {
  conversationId?: string;
  compact?: boolean;
  onIntentChange?: (intent: UserIntent) => void;
}

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(236, 72, 153, 0); }
`;

const Container = styled.div<{ $compact?: boolean }>`
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  padding: ${({ theme, $compact }) => ($compact ? theme.spacing.md : theme.spacing.lg)};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.fontSize.lg};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const TitleIcon = styled.span`
  font-size: 20px;
`;

const CurrentIntentBadge = styled.div<{ $intent: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  background: ${({ $intent }) => {
    switch ($intent) {
      case 'ready_to_meet':
        return 'rgba(0, 217, 165, 0.15)';
      case 'open_to_meeting':
        return 'rgba(236, 72, 153, 0.15)';
      case 'getting_to_know':
        return 'rgba(59, 130, 246, 0.15)';
      default:
        return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: ${({ $intent }) => {
    switch ($intent) {
      case 'ready_to_meet':
        return '#00d9a5';
      case 'open_to_meeting':
        return '#EC4899';
      case 'getting_to_know':
        return '#3b82f6';
      default:
        return '#9ca3af';
    }
  }};
`;

const IntentDot = styled.span<{ $intent: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $intent }) => {
    switch ($intent) {
      case 'ready_to_meet':
        return '#00d9a5';
      case 'open_to_meeting':
        return '#EC4899';
      case 'getting_to_know':
        return '#3b82f6';
      default:
        return '#9ca3af';
    }
  }};
  animation: ${({ $intent }) =>
    $intent === 'ready_to_meet' || $intent === 'open_to_meeting'
      ? `${pulse} 2s ease-in-out infinite`
      : 'none'};
`;

const Description = styled.p`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0 0 ${({ theme }) => theme.spacing.md};
`;

const IntentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing.sm};

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const IntentCard = styled.button<{ $selected?: boolean; $intent: string }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ $selected, theme }) =>
    $selected ? 'rgba(236, 72, 153, 0.1)' : theme.colors.background};
  border: 2px solid
    ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-2px);
  }

  ${({ $selected }) =>
    $selected &&
    `
    &::before {
      content: '✓';
      position: absolute;
      top: 8px;
      right: 8px;
      width: 20px;
      height: 20px;
      background: linear-gradient(135deg, #EC4899 0%, #7B61FF 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: bold;
    }
  `}
`;

const IntentIcon = styled.span`
  font-size: 28px;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const IntentLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 4px;
`;

const IntentDescription = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.4;
`;

const DetailsSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const DetailsTitle = styled.h4`
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 ${({ theme }) => theme.spacing.sm};
`;

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const Input = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSize.sm};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textTertiary};
  }
`;

const DateTypeChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const DateTypeChip = styled.button<{ $selected?: boolean }>`
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

const SaveButton = styled.button`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.gradient};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: white;
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: ${({ theme }) => theme.spacing.md};

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    transform: none;
    box-shadow: none;
    cursor: not-allowed;
  }
`;

const MatchInfo = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(0, 217, 165, 0.1);
  border: 1px solid rgba(0, 217, 165, 0.3);
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const MatchTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: #00d9a5;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MatchText = styled.p`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const LoadingSpinner = styled.div`
  width: 24px;
  height: 24px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const intentIcons: Record<string, string> = {
  exploring: '🧭',
  getting_to_know: '💬',
  open_to_meeting: '📅',
  ready_to_meet: '❤️',
};

const dateTypeOptions = ['Coffee', 'Dinner', 'Drinks', 'Walk', 'Activity', 'Video call'];

export const IntentSignaling: React.FC<IntentSignalingProps> = ({
  conversationId,
  compact = false,
  onIntentChange,
}) => {
  const { intent, intentOptions, isLoading, updateIntent } = useIntent(conversationId);

  const [selectedIntent, setSelectedIntent] = useState<UserIntent['intent'] | null>(null);
  const [availableTimeframe, setAvailableTimeframe] = useState('');
  const [preferredDateTypes, setPreferredDateTypes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Initialize from existing intent
  React.useEffect(() => {
    if (intent) {
      setSelectedIntent(intent.intent);
      setAvailableTimeframe(intent.availableTimeframe || '');
      setPreferredDateTypes(intent.preferredDateTypes || []);
    }
  }, [intent]);

  const handleIntentSelect = (intentValue: UserIntent['intent']) => {
    setSelectedIntent(intentValue);
    if (intentValue === 'open_to_meeting' || intentValue === 'ready_to_meet') {
      setShowDetails(true);
    } else {
      setShowDetails(false);
    }
  };

  const toggleDateType = (dateType: string) => {
    setPreferredDateTypes((prev) =>
      prev.includes(dateType) ? prev.filter((d) => d !== dateType) : [...prev, dateType]
    );
  };

  const handleSave = async () => {
    if (!selectedIntent) return;

    setIsSaving(true);
    try {
      const result = await updateIntent({
        conversationId,
        intent: selectedIntent,
        availableTimeframe: availableTimeframe || undefined,
        preferredDateTypes: preferredDateTypes.length > 0 ? preferredDateTypes : undefined,
      });
      onIntentChange?.(result);
    } catch (error) {
      console.error('Failed to update intent:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    selectedIntent !== intent?.intent ||
    availableTimeframe !== (intent?.availableTimeframe || '') ||
    JSON.stringify(preferredDateTypes.sort()) !==
      JSON.stringify((intent?.preferredDateTypes || []).sort());

  if (isLoading) {
    return (
      <Container $compact={compact}>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </Container>
    );
  }

  return (
    <Container $compact={compact}>
      <Header>
        <Title>
          <TitleIcon>🎯</TitleIcon>
          Ready Mode
        </Title>
        {intent && (
          <CurrentIntentBadge $intent={intent.intent}>
            <IntentDot $intent={intent.intent} />
            {intentOptions.find((o) => o.value === intent.intent)?.label || intent.intent}
          </CurrentIntentBadge>
        )}
      </Header>

      {!compact && (
        <Description>
          Let matches know what you're looking for. This helps set expectations and find compatible
          connections.
        </Description>
      )}

      <IntentGrid>
        {intentOptions.map((option) => (
          <IntentCard
            key={option.value}
            $selected={selectedIntent === option.value}
            $intent={option.value}
            onClick={() => handleIntentSelect(option.value as UserIntent['intent'])}
          >
            <IntentIcon>{intentIcons[option.value] || '💭'}</IntentIcon>
            <IntentLabel>{option.label}</IntentLabel>
            {!compact && <IntentDescription>{option.description}</IntentDescription>}
          </IntentCard>
        ))}
      </IntentGrid>

      {!compact &&
        showDetails &&
        (selectedIntent === 'open_to_meeting' || selectedIntent === 'ready_to_meet') && (
          <DetailsSection>
            <DetailsTitle>Share more details</DetailsTitle>

            <FormGroup>
              <Label>When are you available?</Label>
              <Input
                type="text"
                placeholder="e.g., This weekend, Next week, Flexible"
                value={availableTimeframe}
                onChange={(e) => setAvailableTimeframe(e.target.value)}
              />
            </FormGroup>

            <FormGroup>
              <Label>What kind of date sounds good?</Label>
              <DateTypeChips>
                {dateTypeOptions.map((dateType) => (
                  <DateTypeChip
                    key={dateType}
                    $selected={preferredDateTypes.includes(dateType)}
                    onClick={() => toggleDateType(dateType)}
                  >
                    {dateType}
                  </DateTypeChip>
                ))}
              </DateTypeChips>
            </FormGroup>
          </DetailsSection>
        )}

      {hasChanges && (
        <SaveButton onClick={handleSave} disabled={isSaving || !selectedIntent}>
          {isSaving ? 'Saving...' : 'Update Intent'}
        </SaveButton>
      )}

      {intent?.intent === 'ready_to_meet' && !compact && (
        <MatchInfo>
          <MatchTitle>
            <span>✨</span>
            You're in Ready Mode!
          </MatchTitle>
          <MatchText>
            Matches with similar intent will be highlighted. We'll also suggest conversation topics
            to help move things forward.
          </MatchText>
        </MatchInfo>
      )}
    </Container>
  );
};

export default IntentSignaling;
