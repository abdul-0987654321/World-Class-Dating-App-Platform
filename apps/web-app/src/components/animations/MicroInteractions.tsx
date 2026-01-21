/**
 * MicroInteractions - Small, delightful animation components
 *
 * Features:
 * - Like button with heart burst
 * - Super Like star animation
 * - Boost rocket animation
 * - Notification badges
 * - Loading states
 * - Skeleton loaders with shimmer
 *
 * @package @flamoral/web
 */

import React, { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence, Variants, useAnimation } from 'framer-motion';
import { ANIMATION_CONFIG } from '@flamoral/shared/animations';

// ============================================================================
// LIKE BUTTON WITH HEART BURST
// ============================================================================

export interface LikeButtonProps {
  isLiked: boolean;
  onToggle: (liked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  count?: number;
  disabled?: boolean;
}

const heartVariants: Variants = {
  unliked: {
    scale: 1,
    fill: 'transparent',
    stroke: '#9ca3af',
  },
  liked: {
    scale: [1, 1.3, 1],
    fill: '#e91e63',
    stroke: '#e91e63',
    transition: {
      scale: {
        times: [0, 0.4, 1],
        duration: 0.4,
        ease: 'easeOut',
      },
    },
  },
};

const burstVariants: Variants = {
  initial: { scale: 0, opacity: 1 },
  animate: {
    scale: [0, 1.5, 2],
    opacity: [1, 0.5, 0],
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

export const LikeButton = memo<LikeButtonProps>(
  ({ isLiked, onToggle, size = 'md', showCount = false, count = 0, disabled = false }) => {
    const [showBurst, setShowBurst] = useState(false);

    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
    };

    const iconSizes = {
      sm: 'w-5 h-5',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
    };

    const handleClick = useCallback(() => {
      if (disabled) return;

      if (!isLiked) {
        setShowBurst(true);
        setTimeout(() => setShowBurst(false), 500);
      }

      onToggle(!isLiked);
    }, [disabled, isLiked, onToggle]);

    return (
      <motion.button
        onClick={handleClick}
        disabled={disabled}
        className={`
        relative flex items-center justify-center
        ${sizeClasses[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
        whileHover={!disabled ? { scale: 1.1 } : {}}
        whileTap={!disabled ? { scale: 0.9 } : {}}
      >
        {/* Burst effect */}
        <AnimatePresence>
          {showBurst && (
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-pink-500"
              variants={burstVariants}
              initial="initial"
              animate="animate"
              exit="initial"
            />
          )}
        </AnimatePresence>

        {/* Heart icon */}
        <motion.svg
          className={iconSizes[size]}
          viewBox="0 0 24 24"
          variants={heartVariants}
          animate={isLiked ? 'liked' : 'unliked'}
          strokeWidth={2}
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </motion.svg>

        {/* Count */}
        {showCount && count > 0 && (
          <motion.span
            className="absolute -right-2 -top-1 text-xs font-medium text-gray-600"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            key={count}
          >
            {count}
          </motion.span>
        )}
      </motion.button>
    );
  }
);

LikeButton.displayName = 'LikeButton';

// ============================================================================
// SUPER LIKE BUTTON
// ============================================================================

export interface SuperLikeButtonProps {
  onSuperLike: () => void;
  remaining?: number;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const starVariants: Variants = {
  idle: { scale: 1, rotate: 0 },
  active: {
    scale: [1, 1.5, 1.2, 1],
    rotate: [0, 15, -15, 0],
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

export const SuperLikeButton = memo<SuperLikeButtonProps>(
  ({ onSuperLike, remaining, disabled = false, size = 'md' }) => {
    const controls = useAnimation();
    const [particles, setParticles] = useState<{ id: number; angle: number }[]>([]);

    const sizeClasses = {
      sm: 'w-12 h-12',
      md: 'w-16 h-16',
      lg: 'w-20 h-20',
    };

    const iconSizes = {
      sm: 'w-6 h-6',
      md: 'w-8 h-8',
      lg: 'w-10 h-10',
    };

    const handleClick = useCallback(async () => {
      if (disabled || (remaining !== undefined && remaining <= 0)) return;

      // Create particle burst
      const newParticles = Array.from({ length: 8 }, (_, i) => ({
        id: Date.now() + i,
        angle: (i * 360) / 8,
      }));
      setParticles(newParticles);

      await controls.start('active');
      controls.start('idle');
      onSuperLike();

      setTimeout(() => setParticles([]), 600);
    }, [disabled, remaining, controls, onSuperLike]);

    return (
      <motion.button
        onClick={handleClick}
        disabled={disabled || (remaining !== undefined && remaining <= 0)}
        className={`
        relative flex items-center justify-center rounded-full
        ${sizeClasses[size]}
        ${
          disabled || (remaining !== undefined && remaining <= 0)
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-lg hover:shadow-xl'
        }
        transition-shadow
      `}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
      >
        {/* Particle burst */}
        <AnimatePresence>
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-3 h-3"
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos((particle.angle * Math.PI) / 180) * 40,
                y: Math.sin((particle.angle * Math.PI) / 180) * 40,
                opacity: 0,
                scale: 0,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <svg
                className="w-full h-full text-yellow-400"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Star icon */}
        <motion.svg
          className={iconSizes[size]}
          viewBox="0 0 24 24"
          fill="currentColor"
          variants={starVariants}
          animate={controls}
          initial="idle"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </motion.svg>

        {/* Remaining count */}
        {remaining !== undefined && (
          <span className="absolute -bottom-2 -right-2 w-6 h-6 bg-white rounded-full text-xs font-bold text-blue-600 flex items-center justify-center shadow">
            {remaining}
          </span>
        )}
      </motion.button>
    );
  }
);

SuperLikeButton.displayName = 'SuperLikeButton';

// ============================================================================
// BOOST BUTTON
// ============================================================================

export interface BoostButtonProps {
  onBoost: () => void;
  isActive?: boolean;
  timeRemaining?: number; // in seconds
  disabled?: boolean;
}

const rocketVariants: Variants = {
  idle: { y: 0, rotate: 0 },
  boost: {
    y: [0, -10, -5],
    rotate: [0, -5, 5, 0],
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

export const BoostButton = memo<BoostButtonProps>(
  ({ onBoost, isActive = false, timeRemaining, disabled = false }) => {
    const controls = useAnimation();
    const [flames, setFlames] = useState(false);

    const handleClick = useCallback(async () => {
      if (disabled || isActive) return;

      setFlames(true);
      await controls.start('boost');
      onBoost();

      setTimeout(() => setFlames(false), 1000);
    }, [disabled, isActive, controls, onBoost]);

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <motion.button
        onClick={handleClick}
        disabled={disabled || isActive}
        className={`
        relative flex flex-col items-center justify-center px-6 py-3 rounded-xl
        ${
          isActive
            ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white'
            : disabled
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-lg hover:shadow-xl'
        }
        transition-all
      `}
        whileHover={!disabled && !isActive ? { scale: 1.02 } : {}}
        whileTap={!disabled && !isActive ? { scale: 0.98 } : {}}
      >
        {/* Flame effect */}
        <AnimatePresence>
          {flames && (
            <motion.div
              className="absolute -bottom-4 left-1/2 -translate-x-1/2"
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0 }}
            >
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-6 bg-gradient-to-t from-orange-500 via-yellow-400 to-transparent rounded-full"
                    animate={{
                      height: [24, 16, 24],
                      opacity: [1, 0.7, 1],
                    }}
                    transition={{
                      duration: 0.3,
                      repeat: 3,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rocket icon */}
        <motion.div
          variants={rocketVariants}
          animate={controls}
          initial="idle"
          className="text-2xl mb-1"
        >
          <span role="img" aria-label="rocket">
            &#128640;
          </span>
        </motion.div>

        {/* Label */}
        <span className="font-semibold text-sm">{isActive ? 'Boosted!' : 'Boost'}</span>

        {/* Timer */}
        {isActive && timeRemaining !== undefined && (
          <motion.span
            className="text-xs mt-1 opacity-80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
          >
            {formatTime(timeRemaining)}
          </motion.span>
        )}
      </motion.button>
    );
  }
);

BoostButton.displayName = 'BoostButton';

// ============================================================================
// NOTIFICATION BADGE
// ============================================================================

export interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  pulse?: boolean;
  children: React.ReactNode;
}

export const NotificationBadge = memo<NotificationBadgeProps>(
  ({ count, maxCount = 99, pulse = false, children }) => {
    const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

    return (
      <div className="relative inline-flex">
        {children}

        <AnimatePresence>
          {count > 0 && (
            <motion.span
              className={`
              absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5
              flex items-center justify-center
              bg-pink-500 text-white text-xs font-bold rounded-full
              ${pulse ? 'animate-pulse' : ''}
            `}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              key={count}
              transition={{
                type: 'spring',
                damping: 15,
                stiffness: 300,
              }}
            >
              {displayCount}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

NotificationBadge.displayName = 'NotificationBadge';

// ============================================================================
// SKELETON LOADER WITH SHIMMER
// ============================================================================

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export const Skeleton = memo<SkeletonProps>(
  ({ width = '100%', height = 20, borderRadius = 4, className = '' }) => {
    return (
      <motion.div
        className={`relative overflow-hidden bg-gray-200 ${className}`}
        style={{
          width,
          height,
          borderRadius,
        }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </motion.div>
    );
  }
);

Skeleton.displayName = 'Skeleton';

// ============================================================================
// PROFILE CARD SKELETON
// ============================================================================

export const ProfileCardSkeleton = memo(() => {
  return (
    <div className="w-[340px] h-[500px] rounded-2xl overflow-hidden bg-white shadow-lg">
      <Skeleton width="100%" height={350} borderRadius={0} />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton width={150} height={24} />
          <Skeleton width={24} height={24} borderRadius={12} />
        </div>
        <Skeleton width={120} height={16} />
        <Skeleton width="90%" height={16} />
        <div className="flex gap-2 mt-4">
          <Skeleton width={80} height={28} borderRadius={14} />
          <Skeleton width={80} height={28} borderRadius={14} />
          <Skeleton width={80} height={28} borderRadius={14} />
        </div>
      </div>
    </div>
  );
});

ProfileCardSkeleton.displayName = 'ProfileCardSkeleton';

// ============================================================================
// CONVERSATION LIST SKELETON
// ============================================================================

export const ConversationSkeleton = memo(() => {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-gray-100">
      <Skeleton width={56} height={56} borderRadius={28} />
      <div className="flex-1 space-y-2">
        <Skeleton width={120} height={16} />
        <Skeleton width="80%" height={14} />
      </div>
      <Skeleton width={40} height={12} />
    </div>
  );
});

ConversationSkeleton.displayName = 'ConversationSkeleton';

// ============================================================================
// LOADING SPINNER
// ============================================================================

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export const LoadingSpinner = memo<LoadingSpinnerProps>(({ size = 'md', color = '#e91e63' }) => {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <motion.div
      className={`${sizes[size]} relative`}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
          opacity="0.2"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
          strokeDashoffset="23.55"
        />
      </svg>
    </motion.div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

export default {
  LikeButton,
  SuperLikeButton,
  BoostButton,
  NotificationBadge,
  Skeleton,
  ProfileCardSkeleton,
  ConversationSkeleton,
  LoadingSpinner,
};
