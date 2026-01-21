/**
 * Animation Constants
 * Shared configuration for animation components
 */

export const ANIMATION_CONFIG = {
  // Standard animation durations
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,

  // Easing functions
  easeOut: [0.25, 0.1, 0.25, 1],
  easeIn: [0.42, 0, 1, 1],
  easeInOut: [0.42, 0, 0.58, 1],
  spring: { type: 'spring', stiffness: 300, damping: 25 },

  // Message bubble animations
  messageBubble: {
    duration: 0.3,
    staggerDelay: 0.05,
  },

  // Micro-interactions
  microInteraction: {
    scale: 1.05,
    duration: 0.2,
  },
};

export const SWIPE_CONFIG = {
  // Swipe thresholds
  swipeThreshold: 100,
  swipeVelocityThreshold: 500,

  // Animation settings
  exitDuration: 0.3,
  returnDuration: 0.5,

  // Visual feedback
  rotationFactor: 0.1,
  opacityThreshold: 200,
};

export const CELEBRATION_CONFIG = {
  confetti: {
    particleCount: 100,
    spread: 70,
    startVelocity: 30,
    gravity: 0.5,
    decay: 0.91,
    ticks: 200,
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'],
    shapes: ['square', 'circle'] as const,
    scalar: 1,
  },
  hearts: {
    particleCount: 50,
    spread: 90,
    startVelocity: 25,
    gravity: 0.3,
    decay: 0.93,
    ticks: 150,
    colors: ['#FF6B6B', '#FF8E8E', '#FFB6B6', '#E74C3C', '#FF4757'],
    shapes: ['heart'] as const,
    scalar: 1.2,
  },
  stars: {
    particleCount: 75,
    spread: 60,
    startVelocity: 35,
    gravity: 0.4,
    decay: 0.92,
    ticks: 180,
    colors: ['#FFD700', '#FFA500', '#FFEC8B', '#F0E68C', '#FFFACD'],
    shapes: ['star'] as const,
    scalar: 1,
  },
};
