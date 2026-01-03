/**
 * Typing Indicator Component
 *
 * Displays a visual indicator when one or more users are typing in a conversation.
 * Features animated dots and optional user names.
 */

import React, { memo } from 'react';
import styled, { keyframes } from 'styled-components';

interface TypingIndicatorProps {
  /**
   * Names of users currently typing.
   * If names are not available, pass an array with undefined values.
   */
  typingUsers: Array<{
    userId: string;
    userName?: string;
  }>;
  /**
   * Whether to show user names in the indicator text.
   * If false, shows generic "typing..." text.
   */
  showNames?: boolean;
  /**
   * Visual variant of the indicator.
   * - 'bubble': Shows as a chat bubble (for message list)
   * - 'inline': Shows as inline text (for input area)
   */
  variant?: 'bubble' | 'inline';
  /**
   * Custom class name for styling.
   */
  className?: string;
}

// Keyframe animations
const bounce = keyframes`
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Styled components
const Container = styled.div<{ $variant: 'bubble' | 'inline' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  animation: ${fadeIn} 0.2s ease-out;

  ${({ $variant }) =>
    $variant === 'bubble'
      ? `
    padding: 12px 16px;
    background: #f0f0f0;
    border-radius: 18px 18px 18px 4px;
    max-width: fit-content;
    margin-left: 8px;
    margin-bottom: 4px;
  `
      : `
    padding: 4px 0;
    color: #666;
    font-size: 13px;
  `}
`;

const DotsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  height: 20px;
`;

const Dot = styled.span<{ $delay: number }>`
  width: 6px;
  height: 6px;
  background: #888;
  border-radius: 50%;
  animation: ${bounce} 1.4s infinite;
  animation-delay: ${({ $delay }) => $delay}ms;
`;

const Text = styled.span`
  color: #666;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
`;

const Avatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: white;
  font-weight: 600;
  flex-shrink: 0;
`;

/**
 * Format the typing text based on users
 */
function getTypingText(
  typingUsers: TypingIndicatorProps['typingUsers'],
  showNames: boolean
): string {
  if (!showNames || typingUsers.length === 0) {
    return '';
  }

  const names = typingUsers
    .map((u) => u.userName || 'Someone')
    .filter(Boolean);

  if (names.length === 1) {
    return `${names[0]} is typing`;
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing`;
  }

  return `${names[0]} and ${names.length - 1} others are typing`;
}

/**
 * Get initials from a user name
 */
function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Typing Indicator Component
 *
 * Displays animated dots and optional text when users are typing.
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = memo(
  ({ typingUsers, showNames = true, variant = 'bubble', className }) => {
    if (typingUsers.length === 0) {
      return null;
    }

    const text = getTypingText(typingUsers, showNames);

    return (
      <Container $variant={variant} className={className} role="status" aria-live="polite">
        {variant === 'bubble' && typingUsers.length === 1 && (
          <Avatar aria-hidden="true">
            {getInitials(typingUsers[0].userName)}
          </Avatar>
        )}

        <DotsContainer aria-label="Typing indicator">
          <Dot $delay={0} />
          <Dot $delay={200} />
          <Dot $delay={400} />
        </DotsContainer>

        {text && <Text>{text}</Text>}
      </Container>
    );
  }
);

TypingIndicator.displayName = 'TypingIndicator';

/**
 * Inline Typing Indicator for message input area
 */
export const InlineTypingIndicator: React.FC<{
  typingUsers: TypingIndicatorProps['typingUsers'];
  className?: string;
}> = memo(({ typingUsers, className }) => {
  if (typingUsers.length === 0) {
    return null;
  }

  return (
    <TypingIndicator
      typingUsers={typingUsers}
      showNames={true}
      variant="inline"
      className={className}
    />
  );
});

InlineTypingIndicator.displayName = 'InlineTypingIndicator';

/**
 * Conversation List Typing Indicator
 * Shows in the conversation preview when someone is typing
 */
const ConversationTypingContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: #ec4899;
  font-size: 13px;
  font-style: italic;
`;

const SmallDot = styled.span<{ $delay: number }>`
  width: 4px;
  height: 4px;
  background: #ec4899;
  border-radius: 50%;
  animation: ${bounce} 1.4s infinite;
  animation-delay: ${({ $delay }) => $delay}ms;
`;

export const ConversationTypingIndicator: React.FC<{
  userName?: string;
  className?: string;
}> = memo(({ userName, className }) => {
  return (
    <ConversationTypingContainer className={className}>
      <SmallDot $delay={0} />
      <SmallDot $delay={200} />
      <SmallDot $delay={400} />
      <span>{userName ? `${userName} is typing` : 'Typing'}</span>
    </ConversationTypingContainer>
  );
});

ConversationTypingIndicator.displayName = 'ConversationTypingIndicator';

export default TypingIndicator;
