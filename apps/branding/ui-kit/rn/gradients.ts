/**
 * Flamoral React Native Gradient Configurations
 * Use with react-native-linear-gradient or expo-linear-gradient
 */

export interface GradientConfig {
  colors: string[];
  start: { x: number; y: number };
  end: { x: number; y: number };
  locations?: number[];
}

// ============================================
// Primary Gradients
// ============================================

export const flamoralPrimary: GradientConfig = {
  colors: ['#D62839', '#FF6E35'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
  locations: [0, 1],
};

export const velvetNight: GradientConfig = {
  colors: ['#7A1020', '#1A1A1A'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
  locations: [0, 1],
};

export const blushEmber: GradientConfig = {
  colors: ['#E45C5C', '#D9A657'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
  locations: [0, 1],
};

export const goldGlow: GradientConfig = {
  colors: ['#D9A657', '#C77A45'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
  locations: [0, 1],
};

// ============================================
// Extended Gradients
// ============================================

export const sunsetFlame: GradientConfig = {
  colors: ['#FF6E35', '#D62839', '#7A1020'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
  locations: [0, 0.5, 1],
};

export const premiumDark: GradientConfig = {
  colors: ['#2A2A2A', '#1A1A1A'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
  locations: [0, 1],
};

export const midnightFlame: GradientConfig = {
  colors: ['#1A1A1A', '#7A1020', '#D62839'],
  start: { x: 0, y: 1 },
  end: { x: 1, y: 0 },
  locations: [0, 0.5, 1],
};

export const roseGold: GradientConfig = {
  colors: ['#E45C5C', '#D9A657', '#C77A45'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
  locations: [0, 0.5, 1],
};

export const charcoalElevated: GradientConfig = {
  colors: ['#3A3A3A', '#2A2A2A', '#1A1A1A'],
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
  locations: [0, 0.5, 1],
};

// ============================================
// Directional Variants
// ============================================

export const flamoralHorizontal: GradientConfig = {
  colors: ['#D62839', '#FF6E35'],
  start: { x: 0, y: 0.5 },
  end: { x: 1, y: 0.5 },
  locations: [0, 1],
};

export const flamoralVertical: GradientConfig = {
  colors: ['#D62839', '#FF6E35'],
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
  locations: [0, 1],
};

export const flamoralRadial: GradientConfig = {
  colors: ['#FF6E35', '#D62839', '#7A1020'],
  start: { x: 0.5, y: 0.5 },
  end: { x: 1, y: 1 },
  locations: [0, 0.5, 1],
};

// ============================================
// Overlay Gradients (for images)
// ============================================

export const imageOverlayBottom: GradientConfig = {
  colors: ['transparent', 'rgba(26, 26, 26, 0.4)', 'rgba(26, 26, 26, 0.9)'],
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
  locations: [0, 0.6, 1],
};

export const imageOverlayFull: GradientConfig = {
  colors: ['rgba(26, 26, 26, 0.3)', 'rgba(26, 26, 26, 0.5)', 'rgba(26, 26, 26, 0.8)'],
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
  locations: [0, 0.5, 1],
};

export const premiumOverlay: GradientConfig = {
  colors: ['rgba(122, 16, 32, 0.2)', 'rgba(26, 26, 26, 0.7)'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
  locations: [0, 1],
};

// ============================================
// Gradient Presets Object
// ============================================

export const gradientPresets = {
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
  charcoalElevated,

  // Directional
  flamoralHorizontal,
  flamoralVertical,
  flamoralRadial,

  // Overlays
  imageOverlayBottom,
  imageOverlayFull,
  premiumOverlay,
} as const;

export type GradientPresetName = keyof typeof gradientPresets;

// ============================================
// Helper Functions
// ============================================

/**
 * Get gradient config by name
 */
export function getGradient(name: GradientPresetName): GradientConfig {
  return gradientPresets[name];
}

/**
 * Create custom gradient with opacity
 */
export function withOpacity(gradient: GradientConfig, opacity: number): GradientConfig {
  return {
    ...gradient,
    colors: gradient.colors.map((color) => {
      if (color.startsWith('rgba')) return color;
      if (color === 'transparent') return color;

      // Convert hex to rgba
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }),
  };
}

/**
 * Reverse gradient direction
 */
export function reverseGradient(gradient: GradientConfig): GradientConfig {
  return {
    ...gradient,
    colors: [...gradient.colors].reverse(),
    locations: gradient.locations ? gradient.locations.map((l) => 1 - l).reverse() : undefined,
  };
}

export default gradientPresets;
