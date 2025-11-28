/**
 * Flamoral Gradient System
 * TypeScript gradient configurations for React and React Native
 */

// ============================================
// Types
// ============================================

export interface GradientStop {
  color: string;
  position: number; // 0-1
}

export interface LinearGradientConfig {
  type: 'linear';
  angle: number; // degrees
  stops: GradientStop[];
  css: string;
}

export interface RadialGradientConfig {
  type: 'radial';
  shape: 'circle' | 'ellipse';
  position: { x: string; y: string };
  stops: GradientStop[];
  css: string;
}

export interface RNGradientConfig {
  colors: string[];
  start: { x: number; y: number };
  end: { x: number; y: number };
  locations?: number[];
}

export type GradientConfig = LinearGradientConfig | RadialGradientConfig;

// ============================================
// Flamoral Brand Colors
// ============================================

export const brandColors = {
  flameRed: '#D62839',
  emberOrange: '#FF6E35',
  velvetWine: '#7A1020',
  richCharcoal: '#1A1A1A',
  emberGold: '#D9A657',
  blushCoral: '#E45C5C',
  copper: '#C77A45',
  smokeGrey: '#C4C4C4',
  softIvory: '#FFF6EE',
} as const;

// ============================================
// Primary Gradients
// ============================================

export const flamoralPrimary: LinearGradientConfig = {
  type: 'linear',
  angle: 135,
  stops: [
    { color: '#D62839', position: 0 },
    { color: '#FF6E35', position: 1 },
  ],
  css: 'linear-gradient(135deg, #D62839 0%, #FF6E35 100%)',
};

export const velvetNight: LinearGradientConfig = {
  type: 'linear',
  angle: 135,
  stops: [
    { color: '#7A1020', position: 0 },
    { color: '#1A1A1A', position: 1 },
  ],
  css: 'linear-gradient(135deg, #7A1020 0%, #1A1A1A 100%)',
};

export const blushEmber: LinearGradientConfig = {
  type: 'linear',
  angle: 135,
  stops: [
    { color: '#E45C5C', position: 0 },
    { color: '#D9A657', position: 1 },
  ],
  css: 'linear-gradient(135deg, #E45C5C 0%, #D9A657 100%)',
};

export const goldGlow: LinearGradientConfig = {
  type: 'linear',
  angle: 135,
  stops: [
    { color: '#D9A657', position: 0 },
    { color: '#C77A45', position: 1 },
  ],
  css: 'linear-gradient(135deg, #D9A657 0%, #C77A45 100%)',
};

// ============================================
// Extended Gradients
// ============================================

export const sunsetFlame: LinearGradientConfig = {
  type: 'linear',
  angle: 135,
  stops: [
    { color: '#FF6E35', position: 0 },
    { color: '#D62839', position: 0.5 },
    { color: '#7A1020', position: 1 },
  ],
  css: 'linear-gradient(135deg, #FF6E35 0%, #D62839 50%, #7A1020 100%)',
};

export const premiumDark: LinearGradientConfig = {
  type: 'linear',
  angle: 145,
  stops: [
    { color: '#2A2A2A', position: 0 },
    { color: '#1A1A1A', position: 1 },
  ],
  css: 'linear-gradient(145deg, #2A2A2A 0%, #1A1A1A 100%)',
};

export const midnightFlame: LinearGradientConfig = {
  type: 'linear',
  angle: 135,
  stops: [
    { color: '#1A1A1A', position: 0 },
    { color: '#7A1020', position: 0.5 },
    { color: '#D62839', position: 1 },
  ],
  css: 'linear-gradient(135deg, #1A1A1A 0%, #7A1020 50%, #D62839 100%)',
};

export const roseGold: LinearGradientConfig = {
  type: 'linear',
  angle: 135,
  stops: [
    { color: '#E45C5C', position: 0 },
    { color: '#D9A657', position: 0.5 },
    { color: '#C77A45', position: 1 },
  ],
  css: 'linear-gradient(135deg, #E45C5C 0%, #D9A657 50%, #C77A45 100%)',
};

// ============================================
// React Native Configurations
// ============================================

export const rnGradients = {
  flamoralPrimary: {
    colors: ['#D62839', '#FF6E35'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    locations: [0, 1],
  } as RNGradientConfig,

  velvetNight: {
    colors: ['#7A1020', '#1A1A1A'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    locations: [0, 1],
  } as RNGradientConfig,

  blushEmber: {
    colors: ['#E45C5C', '#D9A657'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    locations: [0, 1],
  } as RNGradientConfig,

  goldGlow: {
    colors: ['#D9A657', '#C77A45'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    locations: [0, 1],
  } as RNGradientConfig,

  sunsetFlame: {
    colors: ['#FF6E35', '#D62839', '#7A1020'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    locations: [0, 0.5, 1],
  } as RNGradientConfig,

  premiumDark: {
    colors: ['#2A2A2A', '#1A1A1A'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    locations: [0, 1],
  } as RNGradientConfig,

  imageOverlay: {
    colors: ['transparent', 'rgba(26, 26, 26, 0.4)', 'rgba(26, 26, 26, 0.9)'],
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
    locations: [0, 0.6, 1],
  } as RNGradientConfig,
} as const;

// ============================================
// Gradient Presets Collection
// ============================================

export const gradients = {
  // Primary
  flamoralPrimary,
  velvetNight,
  blushEmber,
  goldGlow,

  // Extended
  sunsetFlame,
  premiumDark,
  midnightFlame,
  roseGold,
} as const;

export type GradientName = keyof typeof gradients;

// ============================================
// Helper Functions
// ============================================

/**
 * Get gradient CSS string by name
 */
export function getGradientCSS(name: GradientName): string {
  return gradients[name].css;
}

/**
 * Get React Native gradient config by name
 */
export function getRNGradient(name: keyof typeof rnGradients): RNGradientConfig {
  return rnGradients[name];
}

/**
 * Create gradient with custom angle
 */
export function withAngle(
  gradient: LinearGradientConfig,
  angle: number
): LinearGradientConfig {
  const stopsCSS = gradient.stops
    .map((s) => `${s.color} ${s.position * 100}%`)
    .join(', ');

  return {
    ...gradient,
    angle,
    css: `linear-gradient(${angle}deg, ${stopsCSS})`,
  };
}

/**
 * Create gradient with opacity applied to all colors
 */
export function withOpacity(
  gradient: LinearGradientConfig,
  opacity: number
): LinearGradientConfig {
  const newStops = gradient.stops.map((stop) => {
    const hex = stop.color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return {
      ...stop,
      color: `rgba(${r}, ${g}, ${b}, ${opacity})`,
    };
  });

  const stopsCSS = newStops
    .map((s) => `${s.color} ${s.position * 100}%`)
    .join(', ');

  return {
    ...gradient,
    stops: newStops,
    css: `linear-gradient(${gradient.angle}deg, ${stopsCSS})`,
  };
}

/**
 * Convert angle to React Native start/end points
 */
export function angleToRN(angle: number): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const radians = (angle * Math.PI) / 180;
  return {
    start: {
      x: 0.5 - Math.cos(radians) * 0.5,
      y: 0.5 - Math.sin(radians) * 0.5,
    },
    end: {
      x: 0.5 + Math.cos(radians) * 0.5,
      y: 0.5 + Math.sin(radians) * 0.5,
    },
  };
}

/**
 * Convert linear gradient config to RN format
 */
export function toRNGradient(gradient: LinearGradientConfig): RNGradientConfig {
  const { start, end } = angleToRN(gradient.angle);
  return {
    colors: gradient.stops.map((s) => s.color),
    start,
    end,
    locations: gradient.stops.map((s) => s.position),
  };
}

export default gradients;
