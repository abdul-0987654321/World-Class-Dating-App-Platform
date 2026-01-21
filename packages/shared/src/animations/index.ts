/**
 * Flamoral Animation System
 *
 * Zero-blocking, 60fps animation architecture for dating app platform.
 * Designed for native-feel interactions with < 16ms frame budget.
 *
 * @package @flamoral/shared/animations
 */

// ============================================================================
// ANIMATION CONSTANTS & TIMING
// ============================================================================

export const ANIMATION_CONFIG = {
  // Frame budget for 60fps (in milliseconds)
  FRAME_BUDGET: 16.67,

  // Spring configurations - tuned for native feel
  springs: {
    // Snappy interactions (likes, buttons)
    snappy: {
      damping: 15,
      stiffness: 400,
      mass: 0.8,
    },
    // Smooth transitions (modals, overlays)
    smooth: {
      damping: 20,
      stiffness: 200,
      mass: 1,
    },
    // Bouncy celebrations (matches, achievements)
    bouncy: {
      damping: 8,
      stiffness: 100,
      mass: 1,
    },
    // Card physics (swiping)
    card: {
      damping: 18,
      stiffness: 350,
      mass: 0.5,
    },
    // Gentle return (snap back)
    gentle: {
      damping: 25,
      stiffness: 150,
      mass: 1.2,
    },
  },

  // Easing curves (for timing-based animations)
  easings: {
    // Standard easing for most animations
    default: [0.22, 1, 0.36, 1] as const,
    // Enter/appear animations
    enter: [0, 0, 0.2, 1] as const,
    // Exit/disappear animations
    exit: [0.4, 0, 1, 1] as const,
    // Emphasized motion
    emphasized: [0.2, 0, 0, 1] as const,
    // Decelerate
    decelerate: [0, 0.55, 0.45, 1] as const,
    // Accelerate
    accelerate: [0.55, 0, 1, 0.45] as const,
  },

  // Duration presets (in seconds)
  durations: {
    instant: 0.1,
    fast: 0.15,
    normal: 0.25,
    slow: 0.4,
    slower: 0.6,
  },

  // Stagger delays for lists
  stagger: {
    fast: 0.03,
    normal: 0.05,
    slow: 0.08,
  },
} as const;

// ============================================================================
// SWIPE CARD ANIMATION CONFIGURATION
// ============================================================================

export const SWIPE_CONFIG = {
  // Thresholds
  SWIPE_THRESHOLD: 120, // pixels to trigger swipe action
  SUPER_LIKE_THRESHOLD: -100, // negative Y for super like
  VELOCITY_THRESHOLD: 500, // velocity to trigger swipe regardless of position

  // Card behavior
  ROTATION_MULTIPLIER: 0.1, // degrees per pixel of X movement
  MAX_ROTATION: 15, // max rotation degrees
  OVERLAY_OPACITY_MULTIPLIER: 0.01, // opacity per pixel of movement

  // Animation timing
  SWIPE_OUT_DURATION: 250, // ms
  RETURN_SPRING: ANIMATION_CONFIG.springs.gentle,
  SWIPE_SPRING: ANIMATION_CONFIG.springs.card,

  // Card dimensions (will be calculated dynamically)
  DEFAULT_CARD_WIDTH: 320,
  CARD_ASPECT_RATIO: 1.5,
} as const;

// ============================================================================
// GESTURE CONFIGURATION
// ============================================================================

export const GESTURE_CONFIG = {
  // Pan gesture
  pan: {
    activeOffsetX: [-10, 10],
    activeOffsetY: [-10, 10],
    failOffsetX: [-50, 50],
    failOffsetY: [-50, 50],
  },

  // Pinch gesture (for photo zoom)
  pinch: {
    minScale: 1,
    maxScale: 4,
    snapBackScale: 1,
  },

  // Tap gesture
  tap: {
    maxDuration: 250,
    maxDistance: 10,
    numberOfTaps: 1,
  },

  // Double tap
  doubleTap: {
    maxDelay: 300,
    maxDistance: 20,
  },

  // Long press
  longPress: {
    minDuration: 500,
    maxDistance: 10,
  },
} as const;

// ============================================================================
// PARTICLE & CELEBRATION CONFIGURATIONS
// ============================================================================

export const CELEBRATION_CONFIG = {
  // Confetti settings
  confetti: {
    particleCount: 50,
    spread: 70,
    startVelocity: 30,
    decay: 0.91,
    gravity: 1,
    colors: ['#E91E63', '#FF4081', '#F50057', '#C51162', '#FF80AB'],
    shapes: ['square', 'circle'] as const,
    scalar: 1,
    ticks: 200,
  },

  // Heart burst for matches
  heartBurst: {
    particleCount: 20,
    spread: 360,
    startVelocity: 25,
    gravity: 0.5,
    colors: ['#E91E63', '#FF4081', '#FF1744'],
    shapes: ['heart'] as const,
    scalar: 2,
  },

  // Star shower for super likes
  starShower: {
    particleCount: 30,
    spread: 180,
    startVelocity: 35,
    gravity: 0.8,
    colors: ['#2196F3', '#42A5F5', '#64B5F6', '#90CAF9'],
    shapes: ['star'] as const,
    scalar: 1.5,
  },

  // Boost animation
  boost: {
    particleCount: 40,
    origin: { y: 1 },
    spread: 60,
    startVelocity: 45,
    gravity: 1.2,
    colors: ['#9C27B0', '#AB47BC', '#BA68C8', '#CE93D8'],
  },
} as const;

// ============================================================================
// ANIMATION PRESETS (Framer Motion Compatible)
// ============================================================================

export const animationPresets = {
  // Fade animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: {
      duration: ANIMATION_CONFIG.durations.normal,
      ease: ANIMATION_CONFIG.easings.default,
    },
  },

  fadeUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: {
      duration: ANIMATION_CONFIG.durations.normal,
      ease: ANIMATION_CONFIG.easings.default,
    },
  },

  fadeDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: {
      duration: ANIMATION_CONFIG.durations.normal,
      ease: ANIMATION_CONFIG.easings.default,
    },
  },

  // Scale animations
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: {
      type: 'spring',
      ...ANIMATION_CONFIG.springs.snappy,
    },
  },

  popIn: {
    initial: { opacity: 0, scale: 0 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.5 },
    transition: {
      type: 'spring',
      ...ANIMATION_CONFIG.springs.bouncy,
    },
  },

  // Slide animations
  slideInRight: {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
    transition: {
      type: 'spring',
      ...ANIMATION_CONFIG.springs.smooth,
    },
  },

  slideInLeft: {
    initial: { opacity: 0, x: -100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 100 },
    transition: {
      type: 'spring',
      ...ANIMATION_CONFIG.springs.smooth,
    },
  },

  slideInBottom: {
    initial: { opacity: 0, y: 100 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 100 },
    transition: {
      type: 'spring',
      ...ANIMATION_CONFIG.springs.smooth,
    },
  },

  // Modal animations
  modalOverlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: {
      duration: ANIMATION_CONFIG.durations.fast,
    },
  },

  modalContent: {
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 10 },
    transition: {
      type: 'spring',
      ...ANIMATION_CONFIG.springs.snappy,
    },
  },

  // Card animations
  cardEnter: {
    initial: { opacity: 0, scale: 0.8, y: 50 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: {
      type: 'spring',
      ...ANIMATION_CONFIG.springs.card,
    },
  },

  cardStack: (index: number) => ({
    initial: {
      scale: 1 - index * 0.05,
      y: index * -10,
      opacity: index < 3 ? 1 : 0,
    },
    animate: {
      scale: 1 - index * 0.05,
      y: index * -10,
      opacity: index < 3 ? 1 : 0,
    },
    transition: {
      type: 'spring',
      ...ANIMATION_CONFIG.springs.smooth,
    },
  }),

  // Message bubble animations
  messageBubble: {
    initial: { opacity: 0, scale: 0.8, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: {
      type: 'spring',
      damping: 20,
      stiffness: 300,
    },
  },

  // Like/reaction animations
  heartPulse: {
    animate: {
      scale: [1, 1.2, 1],
      transition: {
        duration: 0.3,
        times: [0, 0.5, 1],
        ease: 'easeInOut',
      },
    },
  },

  // Skeleton shimmer
  shimmer: {
    animate: {
      backgroundPosition: ['200% 0', '-200% 0'],
    },
    transition: {
      duration: 1.5,
      ease: 'linear',
      repeat: Infinity,
    },
  },
} as const;

// ============================================================================
// STAGGER CONTAINER VARIANTS
// ============================================================================

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: ANIMATION_CONFIG.stagger.normal,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: ANIMATION_CONFIG.stagger.fast,
      staggerDirection: -1,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      ...ANIMATION_CONFIG.springs.snappy,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: ANIMATION_CONFIG.durations.fast,
    },
  },
};

// ============================================================================
// REDUCED MOTION HELPERS
// ============================================================================

export const getReducedMotionVariants = (variants: Record<string, any>) => {
  return {
    ...variants,
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: {
      duration: ANIMATION_CONFIG.durations.instant,
    },
  };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clamp a value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

/**
 * Linear interpolation
 */
export const lerp = (start: number, end: number, progress: number): number => {
  'worklet';
  return start + (end - start) * progress;
};

/**
 * Map a value from one range to another
 */
export const mapRange = (
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number,
  clampOutput = true
): number => {
  'worklet';
  const result = outputMin + ((value - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin);
  if (clampOutput) {
    return clamp(result, Math.min(outputMin, outputMax), Math.max(outputMin, outputMax));
  }
  return result;
};

/**
 * Calculate card rotation based on X position
 */
export const calculateCardRotation = (translateX: number, screenWidth: number): number => {
  'worklet';
  const rotation = translateX * SWIPE_CONFIG.ROTATION_MULTIPLIER;
  return clamp(rotation, -SWIPE_CONFIG.MAX_ROTATION, SWIPE_CONFIG.MAX_ROTATION);
};

/**
 * Calculate overlay opacity based on swipe progress
 */
export const calculateOverlayOpacity = (
  translateX: number,
  threshold: number
): { like: number; nope: number } => {
  'worklet';
  const progress = Math.abs(translateX) / threshold;
  const opacity = clamp(progress, 0, 1);

  return {
    like: translateX > 0 ? opacity : 0,
    nope: translateX < 0 ? opacity : 0,
  };
};

/**
 * Determine swipe direction based on velocity and position
 */
export const determineSwipeDirection = (
  translateX: number,
  translateY: number,
  velocityX: number,
  velocityY: number
): 'left' | 'right' | 'up' | null => {
  'worklet';

  // Check for super like (upward swipe)
  if (
    translateY < SWIPE_CONFIG.SUPER_LIKE_THRESHOLD &&
    Math.abs(translateX) < Math.abs(translateY)
  ) {
    return 'up';
  }

  // Check velocity-based swipe
  if (Math.abs(velocityX) > SWIPE_CONFIG.VELOCITY_THRESHOLD) {
    return velocityX > 0 ? 'right' : 'left';
  }

  // Check position-based swipe
  if (Math.abs(translateX) > SWIPE_CONFIG.SWIPE_THRESHOLD) {
    return translateX > 0 ? 'right' : 'left';
  }

  return null;
};

export type SwipeDirection = 'left' | 'right' | 'up' | null;
export type AnimationPreset = keyof typeof animationPresets;
