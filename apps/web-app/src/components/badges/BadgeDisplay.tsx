import React from 'react';
import { Smile, Heart, Users, Sparkles, HelpCircle, Lock, Gem } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  slug: string;
  icon: string;
  category?: string;
  description?: string;
  priority?: 1 | 2;
}

interface BadgeDisplayProps {
  badges: Badge[];
  type: 'interest' | 'intention';
  showCount?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const iconMap: Record<string, React.ComponentType<any>> = {
  smile: Smile,
  heart: Heart,
  'heart-circle': Heart,
  users: Users,
  sparkles: Sparkles,
  question: HelpCircle,
  lock: Lock,
  rings: Gem,
};

const getIconComponent = (iconName: string) => {
  const IconComponent = iconMap[iconName] || Smile;
  return IconComponent;
};

const sizeClasses = {
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-3 py-1.5',
  lg: 'text-base px-4 py-2',
};

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  badges,
  type,
  showCount = 10,
  className = '',
  size = 'md',
}) => {
  const displayBadges = badges.slice(0, showCount);
  const remainingCount = badges.length - showCount;

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {displayBadges.map((badge) => {
        const Icon = getIconComponent(badge.icon);

        return (
          <div
            key={badge.id}
            className={`
              inline-flex items-center gap-1.5 rounded-full font-medium
              ${
                type === 'interest'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
              }
              ${sizeClasses[size]}
              transition-colors hover:opacity-80
            `}
            title={badge.description || badge.name}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{badge.name}</span>
            {type === 'intention' && badge.priority === 1 && (
              <span className="text-xs opacity-75">★</span>
            )}
          </div>
        );
      })}

      {remainingCount > 0 && (
        <div
          className={`
            inline-flex items-center rounded-full font-medium
            bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400
            ${sizeClasses[size]}
          `}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export default BadgeDisplay;
