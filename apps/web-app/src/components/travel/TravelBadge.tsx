import React from 'react';
import { Plane, MapPin } from 'lucide-react';

interface TravelBadgeProps {
  city: string;
  country?: string;
  daysUntilArrival?: number;
  daysRemaining?: number;
  isActive: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const TravelBadge: React.FC<TravelBadgeProps> = ({
  city,
  country,
  daysUntilArrival,
  daysRemaining,
  isActive,
  size = 'medium',
  className = '',
}) => {
  const getDisplayText = () => {
    if (isActive) {
      if (daysRemaining !== undefined && daysRemaining > 0) {
        return `In ${city} for ${daysRemaining} more ${daysRemaining === 1 ? 'day' : 'days'}`;
      }
      return `Currently in ${city}`;
    } else if (daysUntilArrival !== undefined && daysUntilArrival > 0) {
      return `Traveling to ${city} in ${daysUntilArrival} ${
        daysUntilArrival === 1 ? 'day' : 'days'
      }`;
    }
    return `Traveling to ${city}`;
  };

  const Icon = isActive ? MapPin : Plane;

  const sizeClasses = {
    small: 'px-2.5 py-1 text-xs',
    medium: 'px-3 py-1.5 text-sm',
    large: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-5 h-5',
  };

  return (
    <div
      className={`inline-flex items-center space-x-2 bg-red-50 text-red-700 rounded-full font-semibold ${sizeClasses[size]} ${className}`}
    >
      <Icon className={iconSizes[size]} />
      <span>{getDisplayText()}</span>
    </div>
  );
};
