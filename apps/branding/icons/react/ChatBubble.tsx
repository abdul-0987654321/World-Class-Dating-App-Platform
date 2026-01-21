/**
 * Flamoral Chat Bubble Icon
 * Represents messaging and conversations
 */

import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
  color?: string;
  gradientId?: string;
}

export const ChatBubble: React.FC<IconProps> = ({
  size = 24,
  className,
  color,
  gradientId = 'chatGradient',
}) => {
  const fill = color || `url(#${gradientId})`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D62839" />
          <stop offset="100%" stopColor="#FF6E35" />
        </linearGradient>
      </defs>
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill={fill} />
      <circle cx="8" cy="10" r="1.5" fill="#FFF6EE" />
      <circle cx="12" cy="10" r="1.5" fill="#FFF6EE" />
      <circle cx="16" cy="10" r="1.5" fill="#FFF6EE" />
    </svg>
  );
};

export default ChatBubble;
