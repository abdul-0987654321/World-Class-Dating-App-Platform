/**
 * Flamoral Design Tokens
 * Complete design system tokens for web and mobile
 * Version 2.0 - Updated to Electric Pink + Midnight Blue theme
 *
 * Master Prompt Specification:
 * - Primary: Electric Pink (#ff2d75)
 * - Accent: Emerald Green (#00d9a5)
 * - Background: Midnight Blue (#1a1a2e)
 */

// ============================================
// COLOR TOKENS
// ============================================

export const colors = {
  // Primary Colors — Master Prompt Specification (Electric Pink Theme)
  primary: {
    electricPink: '#ff2d75',      // Primary brand color
    electricPinkDark: '#d91a5c',
    electricPinkLight: '#ff5a94',
    midnightBlue: '#1a1a2e',      // Primary background
    emeraldGreen: '#00d9a5',      // Success/accent
  },

  // Secondary Colors
  secondary: {
    violet: '#7B61FF',
    cyan: '#2ED4FF',
    blushPink: '#ffb8d1',
    gold: '#F59E0B',
  },

  // Semantic Colors
  semantic: {
    success: '#00d9a5',   // Emerald Green
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  // Neutral Palette
  neutral: {
    white: '#FFFFFF',
    black: '#000000',
    grey50: '#F2F2F7',
    grey100: '#E5E5EA',
    grey200: '#D1D1D6',
    grey300: '#C7C7CC',
    grey400: '#AEAEB2',
    grey500: '#8E8E93',
    grey600: '#636366',
    grey700: '#48484A',
    grey800: '#3A3A3C',
    grey900: '#1C1C1E',
  },

  // Theme-specific
  light: {
    background: '#FFFFFF',
    surface: '#F2F2F7',
    surfaceElevated: '#FFFFFF',
    textPrimary: '#1a1a2e',
    textSecondary: '#636366',
    textTertiary: '#8E8E93',
    border: '#D1D1D6',
    divider: '#E5E5EA',
  },

  dark: {
    background: '#1a1a2e',        // Midnight Blue
    surface: '#232342',
    surfaceElevated: '#2d2d44',   // Deep Charcoal
    textPrimary: '#FFFFFF',
    textSecondary: '#B5B8C5',
    textTertiary: '#8A8D9F',
    border: 'rgba(255, 255, 255, 0.12)',
    divider: 'rgba(255, 255, 255, 0.08)',
  },
} as const;

// ============================================
// GRADIENT TOKENS — Master Prompt Specification
// ============================================

export const gradients = {
  // Primary gradient - Electric Pink
  flamoralPrimary: {
    colors: ['#ff2d75', '#ff5a94'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    css: 'linear-gradient(135deg, #ff2d75 0%, #ff5a94 100%)',
  },

  // Aurora/Romance gradient - Multi-color signature
  flamoralRomance: {
    colors: ['#ff2d75', '#7B61FF', '#2ED4FF'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    css: 'linear-gradient(135deg, #ff2d75 0%, #7B61FF 50%, #2ED4FF 100%)',
  },

  // Dark background gradient
  midnightDeep: {
    colors: ['#1a1a2e', '#232342'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    css: 'linear-gradient(180deg, #1a1a2e 0%, #232342 100%)',
  },

  // Success gradient
  emeraldGlow: {
    colors: ['#00d9a5', '#00b890'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    css: 'linear-gradient(135deg, #00d9a5 0%, #00b890 100%)',
  },

  // Gold/Premium gradient
  goldGlow: {
    colors: ['#F59E0B', '#D97706'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    css: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  },

  // Premium dark gradient
  premiumDark: {
    colors: ['#2d2d44', '#1a1a2e'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    css: 'linear-gradient(145deg, #2d2d44 0%, #1a1a2e 100%)',
  },
} as const;

// ============================================
// SPACING TOKENS
// ============================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
  '5xl': 128,
} as const;

// ============================================
// BORDER RADIUS TOKENS
// ============================================

export const radii = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

// ============================================
// SHADOW TOKENS
// ============================================

export const shadows = {
  none: 'none',

  soft: {
    css: '0 2px 8px rgba(26, 26, 26, 0.08)',
    android: { elevation: 2 },
    ios: {
      shadowColor: '#1A1A1A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
  },

  medium: {
    css: '0 4px 16px rgba(26, 26, 26, 0.12)',
    android: { elevation: 4 },
    ios: {
      shadowColor: '#1A1A1A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
  },

  strong: {
    css: '0 8px 32px rgba(26, 26, 26, 0.16)',
    android: { elevation: 8 },
    ios: {
      shadowColor: '#1A1A1A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 32,
    },
  },

  glow: {
    css: '0 4px 24px rgba(214, 40, 57, 0.3)',
    android: { elevation: 6 },
    ios: {
      shadowColor: '#D62839',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
    },
  },

  goldGlow: {
    css: '0 4px 24px rgba(217, 166, 87, 0.3)',
    android: { elevation: 6 },
    ios: {
      shadowColor: '#D9A657',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
    },
  },
} as const;

// ============================================
// TYPOGRAPHY TOKENS
// ============================================

export const typography = {
  fonts: {
    heading: 'Playfair Display',
    headingFallback: 'Georgia, serif',
    body: 'Inter',
    bodyFallback: 'system-ui, -apple-system, sans-serif',
  },

  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  sizes: {
    h1: { size: 48, lineHeight: 1.2, letterSpacing: -0.02 },
    h2: { size: 36, lineHeight: 1.25, letterSpacing: -0.02 },
    h3: { size: 28, lineHeight: 1.3, letterSpacing: -0.01 },
    h4: { size: 24, lineHeight: 1.35, letterSpacing: -0.01 },
    h5: { size: 20, lineHeight: 1.4, letterSpacing: 0 },
    h6: { size: 18, lineHeight: 1.45, letterSpacing: 0 },
    bodyLarge: { size: 18, lineHeight: 1.6, letterSpacing: 0 },
    body: { size: 16, lineHeight: 1.6, letterSpacing: 0 },
    bodySmall: { size: 14, lineHeight: 1.5, letterSpacing: 0 },
    caption: { size: 12, lineHeight: 1.4, letterSpacing: 0.01 },
    overline: { size: 11, lineHeight: 1.3, letterSpacing: 0.1 },
  },

  // Pre-built text styles
  presets: {
    heroTitle: {
      fontFamily: 'Playfair Display',
      fontSize: 48,
      fontWeight: '700',
      lineHeight: 1.2,
      letterSpacing: -0.02,
      color: '#1A1A1A',
    },
    sectionTitle: {
      fontFamily: 'Playfair Display',
      fontSize: 28,
      fontWeight: '600',
      lineHeight: 1.3,
      letterSpacing: -0.01,
      color: '#1A1A1A',
    },
    cardTitle: {
      fontFamily: 'Inter',
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 1.4,
      letterSpacing: 0,
      color: '#1A1A1A',
    },
    bodyText: {
      fontFamily: 'Inter',
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 1.6,
      letterSpacing: 0,
      color: '#1A1A1A',
    },
    buttonText: {
      fontFamily: 'Inter',
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 1.4,
      letterSpacing: 0.02,
      color: '#FFF6EE',
    },
    captionText: {
      fontFamily: 'Inter',
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 1.4,
      letterSpacing: 0.01,
      color: '#666666',
    },
  },
} as const;

// ============================================
// ANIMATION TOKENS
// ============================================

export const animation = {
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },

  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 400,
    glacial: 600,
  },
} as const;

// ============================================
// Z-INDEX TOKENS
// ============================================

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  popover: 400,
  tooltip: 500,
  toast: 600,
  overlay: 700,
} as const;

// ============================================
// BREAKPOINT TOKENS
// ============================================

export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// ============================================
// ICON SIZES
// ============================================

export const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
} as const;

// ============================================
// BUTTON TOKENS
// ============================================

export const button = {
  sizes: {
    sm: {
      height: 36,
      paddingHorizontal: 16,
      fontSize: 14,
      iconSize: 16,
    },
    md: {
      height: 44,
      paddingHorizontal: 24,
      fontSize: 16,
      iconSize: 20,
    },
    lg: {
      height: 52,
      paddingHorizontal: 32,
      fontSize: 18,
      iconSize: 24,
    },
  },

  variants: {
    primary: {
      background: gradients.flamoralPrimary.css,
      color: colors.secondary.softIvory,
      borderColor: 'transparent',
    },
    secondary: {
      background: colors.primary.richCharcoal,
      color: colors.primary.emberGold,
      borderColor: colors.primary.emberGold,
    },
    ghost: {
      background: 'transparent',
      color: colors.primary.flameRed,
      borderColor: colors.primary.flameRed,
    },
    outline: {
      background: 'transparent',
      color: colors.primary.richCharcoal,
      borderColor: colors.secondary.smokeGrey,
    },
  },
} as const;

// ============================================
// CARD TOKENS
// ============================================

export const card = {
  variants: {
    standard: {
      background: colors.light.surface,
      borderRadius: radii.xl,
      padding: spacing.lg,
      shadow: shadows.medium.css,
    },
    premium: {
      background: gradients.premiumDark.css,
      borderRadius: radii.xl,
      padding: spacing.lg,
      borderColor: `${colors.primary.emberGold}4D`, // 30% opacity
      shadow: shadows.strong.css,
    },
    profile: {
      background: colors.light.surface,
      borderRadius: radii['2xl'],
      shadow: shadows.strong.css,
      aspectRatio: 3 / 4,
    },
  },
} as const;

// ============================================
// INPUT TOKENS
// ============================================

export const input = {
  sizes: {
    sm: {
      height: 40,
      padding: 12,
      fontSize: 14,
    },
    md: {
      height: 48,
      padding: 16,
      fontSize: 16,
    },
    lg: {
      height: 56,
      padding: 20,
      fontSize: 18,
    },
  },

  states: {
    default: {
      borderColor: colors.secondary.smokeGrey,
      background: colors.neutral.white,
    },
    focus: {
      borderColor: colors.primary.flameRed,
      shadowColor: `${colors.primary.flameRed}1A`, // 10% opacity
    },
    error: {
      borderColor: colors.semantic.error,
      shadowColor: `${colors.semantic.error}1A`,
    },
    disabled: {
      borderColor: colors.neutral.grey300,
      background: colors.neutral.grey100,
      opacity: 0.6,
    },
  },
} as const;

// ============================================
// COMBINED THEME EXPORT
// ============================================

export const flamoralTheme = {
  colors,
  gradients,
  spacing,
  radii,
  shadows,
  typography,
  animation,
  zIndex,
  breakpoints,
  iconSizes,
  button,
  card,
  input,
} as const;

export type FlamoralTheme = typeof flamoralTheme;
export type Colors = typeof colors;
export type Gradients = typeof gradients;

export default flamoralTheme;
