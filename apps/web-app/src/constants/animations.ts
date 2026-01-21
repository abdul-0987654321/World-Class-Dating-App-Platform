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

  // Springs for various animations
  springs: {
    gentle: { stiffness: 200, damping: 20 },
    snappy: { stiffness: 400, damping: 30 },
    bouncy: { stiffness: 300, damping: 15 },
    card: { stiffness: 250, damping: 25 },
  },

  // Easings - using Framer Motion compatible format
  easings: {
    exit: [0.32, 0, 0.67, 0] as [number, number, number, number],
    enter: [0.33, 1, 0.68, 1] as [number, number, number, number],
    smooth: [0.4, 0, 0.2, 1] as [number, number, number, number],
  },

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
  SWIPE_THRESHOLD: 100,
  VELOCITY_THRESHOLD: 500,
  SUPER_LIKE_THRESHOLD: -100,

  // Animation settings
  exitDuration: 0.3,
  returnDuration: 0.5,
  SWIPE_OUT_DURATION: 300,

  // Visual feedback
  rotationFactor: 0.1,
  opacityThreshold: 200,
  MAX_ROTATION: 15,
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
  heartBurst: {
    particleCount: 40,
    spread: 100,
    startVelocity: 20,
    gravity: 0.2,
    decay: 0.94,
    ticks: 120,
    colors: ['#FF6B6B', '#FF8E8E', '#FFB6B6', '#E74C3C', '#FF4757'],
    shapes: ['heart'] as const,
    scalar: 1.5,
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
