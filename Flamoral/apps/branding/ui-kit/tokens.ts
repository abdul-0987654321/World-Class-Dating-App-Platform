/**
 * Flamoral Design Tokens
 * Complete design system tokens for web and mobile
 * Version 1.0
 */

// ============================================
// COLOR TOKENS
// ============================================

export const colors = {
  // Primary Colors
  primary: {
    flameRed: '#D62839',
    emberOrange: '#FF6E35',
    velvetWine: '#7A1020',
    richCharcoal: '#1A1A1A',
    emberGold: '#D9A657',
  },

  // Secondary Colors
  secondary: {
    blushCoral: '#E45C5C',
    copper: '#C77A45',
    smokeGrey: '#C4C4C4',
    softIvory: '#FFF6EE',
  },

  // Semantic Colors
  semantic: {
    success: '#2ECC71',
    warning: '#F39C12',
    error: '#E74C3C',
    info: '#3498DB',
  },

  // Neutral Palette
  neutral: {
    white: '#FFFFFF',
    black: '#000000',
    grey50: '#FAFAFA',
    grey100: '#F5F5F5',
    grey200: '#EEEEEE',
    grey300: '#E0E0E0',
    grey400: '#BDBDBD',
    grey500: '#9E9E9E',
    grey600: '#757575',
    grey700: '#616161',
    grey800: '#424242',
    grey900: '#212121',
  },

  // Theme-specific
  light: {
    background: '#FFF6EE',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    textPrimary: '#1A1A1A',
    textSecondary: '#666666',
    textTertiary: '#999999',
    border: '#E0E0E0',
    divider: '#EEEEEE',
  },

  dark: {
    background: '#1A1A1A',
    surface: '#2A2A2A',
    surfaceElevated: '#3A3A3A',
    textPrimary: '#FFF6EE',
    textSecondary: '#AAAAAA',
    textTertiary: '#777777',
    border: '#4A4A4A',
    divider: '#3A3A3A',
  },
} as const;

// ============================================
// GRADIENT TOKENS
// ============================================

export const gradients = {
  flamoralPrimary: {
    colors: ['#D62839', '#FF6E35'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    css: 'linear-gradient(135deg, #D62839 0%, #FF6E35 100%)',
  },

  velvetNight: {
    colors: ['#7A1020', '#1A1A1A'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    css: 'linear-gradient(135deg, #7A1020 0%, #1A1A1A 100%)',
  },

  blushEmber: {
    colors: ['#E45C5C', '#D9A657'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    css: 'linear-gradient(135deg, #E45C5C 0%, #D9A657 100%)',
  },

  goldGlow: {
    colors: ['#D9A657', '#C77A45'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    css: 'linear-gradient(135deg, #D9A657 0%, #C77A45 100%)',
  },

  premiumDark: {
    colors: ['#2A2A2A', '#1A1A1A'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    css: 'linear-gradient(145deg, #2A2A2A 0%, #1A1A1A 100%)',
  },

  sunsetFlame: {
    colors: ['#FF6E35', '#D62839', '#7A1020'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    css: 'linear-gradient(135deg, #FF6E35 0%, #D62839 50%, #7A1020 100%)',
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
