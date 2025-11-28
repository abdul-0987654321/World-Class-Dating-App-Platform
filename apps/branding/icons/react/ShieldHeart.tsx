/**
 * Flamoral Shield Heart Icon
 * Represents safety, trust, and profile verification
 */

import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
  color?: string;
  gradientId?: string;
}

export const ShieldHeart: React.FC<IconProps> = ({
  size = 24,
  className,
  color,
  gradientId = 'shieldGradient',
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
          <stop offset="0%" stopColor="#7A1020" />
          <stop offset="100%" stopColor="#D62839" />
        </linearGradient>
      </defs>
      <path
        d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
        fill={fill}
      />
      <path
        d="M12 17l-0.9-0.8C8.8 14.2 7 12.6 7 10.7c0-1.5 1.2-2.7 2.7-2.7 0.8 0 1.7 0.4 2.3 1 0.6-0.6 1.4-1 2.3-1 1.5 0 2.7 1.2 2.7 2.7 0 1.9-1.8 3.5-4.1 5.5L12 17z"
        fill="#FFF6EE"
      />
    </svg>
  );
};

export default ShieldHeart;
