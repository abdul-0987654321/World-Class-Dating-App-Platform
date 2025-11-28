/**
 * Flamoral Crown Premium Icon
 * Represents premium/VIP status and subscriptions
 */

import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
  color?: string;
  gradientId?: string;
}

export const CrownPremium: React.FC<IconProps> = ({
  size = 24,
  className,
  color,
  gradientId = 'crownGradient',
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
          <stop offset="100%" stopColor="#C77A45" />
        </linearGradient>
      </defs>
      <path d="M3 18h18v2H3v-2z" fill={fill} />
      <path d="M5 18L3 7l5 4 4-6 4 6 5-4-2 11H5z" fill={fill} />
      <circle cx="12" cy="5" r="1.5" fill="#FFF6EE" />
      <circle cx="8" cy="11" r="1" fill="#FFF6EE" opacity="0.8" />
      <circle cx="16" cy="11" r="1" fill="#FFF6EE" opacity="0.8" />
    </svg>
  );
};

export default CrownPremium;
