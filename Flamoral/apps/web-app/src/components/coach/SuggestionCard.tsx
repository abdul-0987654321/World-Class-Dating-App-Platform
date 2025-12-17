import React, { useState } from 'react';
import styled from 'styled-components';

interface SuggestionCardProps {
  suggestions: string[];
  onSelect?: (suggestion: string) => void;
  onDismiss?: () => void;
  type?: 'icebreaker' | 'response' | 'date';
  context?: string[];
}

const Card = styled.div`
  background: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  padding: ${({ theme }) => theme.spacing.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.primary};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h3`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.fontSize.lg};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ theme }) => theme.colors.primary};
  margin: 0;

  svg {
    width: 24px;
    height: 24px;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.xs};
  transition: color ${({ theme }) => theme.transitions.base};

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  margin-left: ${({ theme }) => theme.spacing.sm};

  svg {
    width: 12px;
    height: 12px;
  }
`;

const ContextList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ContextTag = styled.span`
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSize.xs};
`;

const SuggestionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const SuggestionItem = styled.div<{ $selected: boolean }>`
  background: ${({ theme, $selected }) =>
    $selected ? theme.colors.primaryLight : theme.colors.backgroundSecondary};
  border: 2px solid ${({ theme, $selected }) =>
    $selected ? theme.colors.primary : 'transparent'};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.md};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.base};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateX(4px);
  }
`;

const SuggestionText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSize.md};
  line-height: 1.6;
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme, $variant }) =>
    $variant === 'primary' ? theme.colors.gradient : theme.colors.backgroundTertiary};
  color: ${({ theme, $variant }) =>
    $variant === 'primary' ? 'white' : theme.colors.text};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.base};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const titles = {
  icebreaker: 'Icebreaker Suggestions',
  response: 'Reply Suggestions',
  date: 'Date Ideas',
};

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestions,
  onSelect,
  onDismiss,
  type = 'response',
  context = [],
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
  };

  const handleUse = () => {
    if (selectedIndex !== null && onSelect) {
      onSelect(suggestions[selectedIndex]);
    }
  };

  return (
    <Card>
      <Header>
        <Title>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          {titles[type]}
          <Badge>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            AI Powered
          </Badge>
        </Title>
        {onDismiss && (
          <CloseButton onClick={onDismiss}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </CloseButton>
        )}
      </Header>

      {context.length > 0 && (
        <ContextList>
          {context.map((item, idx) => (
            <ContextTag key={idx}>{item}</ContextTag>
          ))}
        </ContextList>
      )}

      <SuggestionList>
        {suggestions.map((suggestion, index) => (
          <SuggestionItem
            key={index}
            $selected={selectedIndex === index}
            onClick={() => handleSelect(index)}
          >
            <SuggestionText>{suggestion}</SuggestionText>
          </SuggestionItem>
        ))}
      </SuggestionList>

      <Actions>
        <ActionButton $variant="primary" onClick={handleUse} disabled={selectedIndex === null}>
          Use This
        </ActionButton>
        <ActionButton onClick={onDismiss}>Dismiss</ActionButton>
      </Actions>
    </Card>
  );
};
