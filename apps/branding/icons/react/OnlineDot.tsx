/**
 * Flamoral Online Dot Icon
 * Represents online/active status
 */

import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
  color?: string;
}

export const OnlineDot: React.FC<IconProps> = ({ size = 24, className, color }) => {
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
        <radialGradient id="onlineGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="100%" stopColor="#22C55E" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="12" cy="12" r="6" fill={color || 'url(#onlineGradient)'} filter="url(#glow)" />
      <circle cx="12" cy="12" r="3" fill="#FFF6EE" opacity="0.5" />
    </svg>
  );
};

export default OnlineDot;
