/**
 * Flamoral Location Pin Icon
 * Represents location, distance, and nearby users
 */

import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
  color?: string;
  gradientId?: string;
}

export const LocationPin: React.FC<IconProps> = ({
  size = 24,
  className,
  color,
  gradientId = 'locationGradient',
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
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill={fill}
      />
      <circle cx="12" cy="9" r="3" fill="#FFF6EE" />
    </svg>
  );
};

export default LocationPin;
