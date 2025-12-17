/**
 * Flamoral Lightning Icon
 * Represents boosts, super likes, and instant features
 */

import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
  color?: string;
  gradientId?: string;
}

export const Lightning: React.FC<IconProps> = ({
  size = 24,
  className,
  color,
  gradientId = 'lightningGradient',
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
          <stop offset="0%" stopColor="#D9A657" />
          <stop offset="100%" stopColor="#FF6E35" />
        </linearGradient>
      </defs>
      <path d="M7 2v11h3v9l7-12h-4l4-8H7z" fill={fill} />
      <path d="M11 8h2v4h-2z" fill="#FFF6EE" opacity="0.5" />
    </svg>
  );
};

export default Lightning;
