/**
 * Flamoral Ticket Icon
 * Represents events, speed dating tickets, and special access
 */

import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
  color?: string;
  gradientId?: string;
}

export const Ticket: React.FC<IconProps> = ({
  size = 24,
  className,
  color,
  gradientId = 'ticketGradient',
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
          <stop offset="100%" stopColor="#7A1020" />
        </linearGradient>
      </defs>
      <path
        d="M22 10V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2z"
        fill={fill}
      />
      <path d="M10 7v2h4V7h-4zm0 4v2h4v-2h-4zm0 4v2h4v-2h-4z" fill="#FFF6EE" opacity="0.7" />
    </svg>
  );
};

export default Ticket;
