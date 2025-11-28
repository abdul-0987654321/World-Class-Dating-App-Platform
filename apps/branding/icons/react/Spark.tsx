/**
 * Flamoral Spark Icon
 * Represents matches, connections, and special moments
 */

import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
  color?: string;
  gradientId?: string;
}

export const Spark: React.FC<IconProps> = ({
  size = 24,
  className,
  color,
  gradientId = 'sparkGradient',
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
      <path
        d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
        fill={fill}
      />
      <circle cx="12" cy="12" r="2" fill="#FFF6EE" />
    </svg>
  );
};

export default Spark;
