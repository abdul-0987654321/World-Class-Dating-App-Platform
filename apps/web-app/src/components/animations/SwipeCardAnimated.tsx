/**
 * SwipeCardAnimated - High-Performance Card Swipe Component (Web)
 *
 * Features:
 * - 60fps swipe animations with Framer Motion
 * - Hardware-accelerated transforms
 * - Native-feel gesture handling
 * - < 16ms frame budget compliance
 *
 * @package @flamoral/web
 */

import React, { useCallback, useMemo, useRef, memo } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimation,
  PanInfo,
  AnimatePresence,
} from 'framer-motion';
import { SWIPE_CONFIG, ANIMATION_CONFIG } from '../../constants/animations';

// ============================================================================
// TYPES
// ============================================================================

export interface Profile {
  id: string;
  name: string;
  age: number;
  photos: Array<{ url: string; is_primary?: boolean }>;
  bio?: string;
  distance?: number;
  occupation?: string;
  verified?: boolean;
  interests?: string[];
  compatibility_score?: number;
}

export interface SwipeCardAnimatedProps {
  profile: Profile;
  onSwipeLeft: (profile: Profile) => void;
  onSwipeRight: (profile: Profile) => void;
  onSwipeUp: (profile: Profile) => void;
  onCardClick?: (profile: Profile) => void;
  isTopCard?: boolean;
  stackIndex?: number;
  dragEnabled?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CARD_WIDTH = 340;
const CARD_HEIGHT = 500;

// Animation variants for overlay badges
const overlayVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
};

// ============================================================================
// OPTIMIZED IMAGE COMPONENT
// ============================================================================

const OptimizedImage = memo(({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900">
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%]" />
      )}
      <img
        src={src}
        alt={alt}
        loading="eager"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`
          absolute inset-0 w-full h-full object-cover
          transition-opacity duration-300
          ${loaded ? 'opacity-100' : 'opacity-0'}
        `}
        style={{ willChange: 'transform' }}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <span className="text-gray-500 text-4xl">?</span>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// ============================================================================
// SWIPE CARD COMPONENT
// ============================================================================

export const SwipeCardAnimated = memo<SwipeCardAnimatedProps>(
  ({
    profile,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onCardClick,
    isTopCard = true,
    stackIndex = 0,
    dragEnabled = true,
  }) => {
    const controls = useAnimation();
    const constraintsRef = useRef<HTMLDivElement>(null);

    // Motion values for smooth animations
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Derived transforms - calculated on GPU
    const rotate = useTransform(
      x,
      [-CARD_WIDTH, 0, CARD_WIDTH],
      [-SWIPE_CONFIG.MAX_ROTATION, 0, SWIPE_CONFIG.MAX_ROTATION]
    );

    const likeOpacity = useTransform(x, [0, SWIPE_CONFIG.SWIPE_THRESHOLD / 2], [0, 1]);

    const nopeOpacity = useTransform(x, [-SWIPE_CONFIG.SWIPE_THRESHOLD / 2, 0], [1, 0]);

    const superLikeOpacity = useTransform(y, [SWIPE_CONFIG.SUPER_LIKE_THRESHOLD, 0], [1, 0]);

    // Card scale for stack effect
    const scale = useMemo(() => 1 - stackIndex * 0.05, [stackIndex]);

    // Card Y offset for stack effect
    const stackY = useMemo(() => stackIndex * -10, [stackIndex]);

    // Handle drag end - determine swipe direction
    const handleDragEnd = useCallback(
      async (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const { offset, velocity } = info;

        // Check for super like (swipe up)
        if (
          offset.y < SWIPE_CONFIG.SUPER_LIKE_THRESHOLD &&
          Math.abs(offset.x) < Math.abs(offset.y)
        ) {
          await controls.start({
            y: -window.innerHeight,
            opacity: 0,
            transition: {
              duration: SWIPE_CONFIG.SWIPE_OUT_DURATION / 1000,
              ease: ANIMATION_CONFIG.easings.exit,
            },
          });
          onSwipeUp(profile);
          return;
        }

        // Check for velocity-based swipe
        if (Math.abs(velocity.x) > SWIPE_CONFIG.VELOCITY_THRESHOLD) {
          const direction = velocity.x > 0 ? 1 : -1;
          await controls.start({
            x: direction * window.innerWidth * 1.5,
            opacity: 0,
            transition: {
              duration: SWIPE_CONFIG.SWIPE_OUT_DURATION / 1000,
              ease: ANIMATION_CONFIG.easings.exit,
            },
          });
          if (direction > 0) {
            onSwipeRight(profile);
          } else {
            onSwipeLeft(profile);
          }
          return;
        }

        // Check for position-based swipe
        if (Math.abs(offset.x) > SWIPE_CONFIG.SWIPE_THRESHOLD) {
          const direction = offset.x > 0 ? 1 : -1;
          await controls.start({
            x: direction * window.innerWidth * 1.5,
            opacity: 0,
            transition: {
              duration: SWIPE_CONFIG.SWIPE_OUT_DURATION / 1000,
              ease: ANIMATION_CONFIG.easings.exit,
            },
          });
          if (direction > 0) {
            onSwipeRight(profile);
          } else {
            onSwipeLeft(profile);
          }
          return;
        }

        // Snap back to center
        controls.start({
          x: 0,
          y: 0,
          transition: {
            type: 'spring',
            ...ANIMATION_CONFIG.springs.gentle,
          },
        });
      },
      [controls, onSwipeLeft, onSwipeRight, onSwipeUp, profile]
    );

    // Programmatic swipe functions (for button clicks)
    const triggerSwipe = useCallback(
      async (direction: 'left' | 'right' | 'up') => {
        const animations: Record<string, object> = {
          left: { x: -window.innerWidth * 1.5, opacity: 0 },
          right: { x: window.innerWidth * 1.5, opacity: 0 },
          up: { y: -window.innerHeight, opacity: 0 },
        };

        await controls.start({
          ...animations[direction],
          transition: {
            duration: SWIPE_CONFIG.SWIPE_OUT_DURATION / 1000,
            ease: ANIMATION_CONFIG.easings.exit,
          },
        });

        if (direction === 'left') onSwipeLeft(profile);
        else if (direction === 'right') onSwipeRight(profile);
        else onSwipeUp(profile);
      },
      [controls, onSwipeLeft, onSwipeRight, onSwipeUp, profile]
    );

    const primaryPhoto = profile.photos.find((p) => p.is_primary)?.url || profile.photos[0]?.url;

    return (
      <motion.div
        ref={constraintsRef}
        className="absolute inset-0 flex items-center justify-center"
        style={{ zIndex: 100 - stackIndex }}
      >
        <motion.div
          className="relative cursor-grab active:cursor-grabbing"
          style={{
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            x: isTopCard ? x : 0,
            y: isTopCard ? y : stackY,
            rotate: isTopCard ? rotate : 0,
            scale,
            willChange: 'transform',
          }}
          animate={controls}
          drag={isTopCard && dragEnabled}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.9}
          onDragEnd={handleDragEnd}
          whileTap={{ cursor: 'grabbing' }}
          onClick={() => onCardClick?.(profile)}
          initial={{ opacity: 0, scale: 0.8 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{
            type: 'spring',
            ...ANIMATION_CONFIG.springs.card,
          }}
        >
          {/* Card Container */}
          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-gray-900 shadow-2xl">
            {/* Profile Image */}
            <OptimizedImage
              src={primaryPhoto || 'https://via.placeholder.com/400'}
              alt={`${profile.name}'s photo`}
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

            {/* LIKE Badge */}
            <motion.div
              className="absolute top-16 left-6 z-20"
              style={{ opacity: likeOpacity }}
              variants={overlayVariants}
            >
              <div className="px-6 py-3 border-4 border-green-500 rounded-lg bg-white/90 transform -rotate-12">
                <span className="text-green-500 text-3xl font-bold tracking-wider">LIKE</span>
              </div>
            </motion.div>

            {/* NOPE Badge */}
            <motion.div
              className="absolute top-16 right-6 z-20"
              style={{ opacity: nopeOpacity }}
              variants={overlayVariants}
            >
              <div className="px-6 py-3 border-4 border-red-500 rounded-lg bg-white/90 transform rotate-12">
                <span className="text-red-500 text-3xl font-bold tracking-wider">NOPE</span>
              </div>
            </motion.div>

            {/* SUPER LIKE Badge */}
            <motion.div
              className="absolute top-24 left-1/2 -translate-x-1/2 z-20"
              style={{ opacity: superLikeOpacity }}
              variants={overlayVariants}
            >
              <div className="px-6 py-3 border-4 border-blue-500 rounded-lg bg-white/95">
                <span className="text-blue-500 text-2xl font-bold tracking-wider">SUPER LIKE</span>
              </div>
            </motion.div>

            {/* Profile Info */}
            <div className="absolute bottom-20 left-0 right-0 p-5">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-white text-2xl font-bold">
                  {profile.name}, {profile.age}
                </h2>
                {profile.verified && (
                  <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  </span>
                )}
              </div>

              {profile.occupation && (
                <p className="text-white/80 text-sm mb-1">{profile.occupation}</p>
              )}

              {profile.distance !== undefined && (
                <p className="text-white/60 text-sm">{Math.round(profile.distance)} km away</p>
              )}

              {profile.bio && (
                <p className="text-white/70 text-sm mt-2 line-clamp-2">{profile.bio}</p>
              )}

              {/* Interests */}
              {profile.interests && profile.interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {profile.interests.slice(0, 3).map((interest) => (
                    <span
                      key={interest}
                      className="px-3 py-1 bg-white/20 rounded-full text-white text-xs backdrop-blur-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerSwipe('left');
                }}
                className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-red-500 hover:scale-110 transition-transform active:scale-95"
                aria-label="Pass"
              >
                <svg
                  className="w-7 h-7 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerSwipe('up');
                }}
                className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-blue-500 hover:scale-110 transition-transform active:scale-95"
                aria-label="Super Like"
              >
                <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerSwipe('right');
                }}
                className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-green-500 hover:scale-110 transition-transform active:scale-95"
                aria-label="Like"
              >
                <svg className="w-7 h-7 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }
);

SwipeCardAnimated.displayName = 'SwipeCardAnimated';

// ============================================================================
// SWIPE DECK COMPONENT
// ============================================================================

export interface SwipeDeckProps {
  profiles: Profile[];
  onSwipeLeft: (profile: Profile) => void;
  onSwipeRight: (profile: Profile) => void;
  onSwipeUp: (profile: Profile) => void;
  onProfileClick?: (profile: Profile) => void;
  onEmpty?: () => void;
}

export const SwipeDeck = memo<SwipeDeckProps>(
  ({ profiles, onSwipeLeft, onSwipeRight, onSwipeUp, onProfileClick, onEmpty }) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);

    const handleSwipe = useCallback(
      (direction: 'left' | 'right' | 'up', profile: Profile) => {
        if (direction === 'left') onSwipeLeft(profile);
        else if (direction === 'right') onSwipeRight(profile);
        else onSwipeUp(profile);

        setCurrentIndex((prev) => {
          const next = prev + 1;
          if (next >= profiles.length) {
            onEmpty?.();
          }
          return next;
        });
      },
      [onSwipeLeft, onSwipeRight, onSwipeUp, onEmpty, profiles.length]
    );

    const visibleProfiles = useMemo(
      () => profiles.slice(currentIndex, currentIndex + 3),
      [profiles, currentIndex]
    );

    if (visibleProfiles.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <p className="text-xl mb-2">No more profiles</p>
            <p className="text-sm">Check back later for new matches!</p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full overflow-hidden">
        <AnimatePresence mode="popLayout">
          {visibleProfiles.map((profile, index) => (
            <SwipeCardAnimated
              key={profile.id}
              profile={profile}
              isTopCard={index === 0}
              stackIndex={index}
              onSwipeLeft={(p) => handleSwipe('left', p)}
              onSwipeRight={(p) => handleSwipe('right', p)}
              onSwipeUp={(p) => handleSwipe('up', p)}
              onCardClick={onProfileClick}
            />
          ))}
        </AnimatePresence>
      </div>
    );
  }
);

SwipeDeck.displayName = 'SwipeDeck';

export default SwipeCardAnimated;
