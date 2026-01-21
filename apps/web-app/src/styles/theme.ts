/**
 * Theme configuration for styled-components
 * Flamoral Dark Theme — Master Prompt Specification
 * Electric Pink, Emerald Green, Midnight Blue palette
 */

export const theme = {
  colors: {
    // Primary Brand Colors — Master Prompt Specification
    primary: '#EC4899', // Electric Pink
    primaryLight: '#F472B6',
    primaryDark: '#BE185D',
    primaryHover: '#F472B6',
    secondary: '#3B82F6',
    secondaryHover: '#ffe0eb',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #7B61FF 50%, #2ED4FF 100%)',
    gradientHover: 'linear-gradient(135deg, #BE185D 0%, #EC4899 50%, #F472B6 100%)',

    // Dark Theme Surfaces — Midnight Blue base
    white: '#2d2d44', // Deep Charcoal (replaces white)
    black: '#000000',
    background: '#1a1a2e', // Midnight Blue - Darkest background
    backgroundSecondary: '#232342', // Card backgrounds
    backgroundTertiary: '#2d2d44', // Deep Charcoal - Elevated surfaces
    surface: '#232342',
    surfaceElevated: '#2d2d44',
    surfaceOverlay: 'rgba(26, 26, 46, 0.7)',

    // Text Colors for Dark Theme
    text: '#FFFFFF',
    textPrimary: '#FFFFFF',
    textSecondary: '#B5B8C5',
    textTertiary: '#8A8F9E',
    textMuted: '#6B7280',
    textLight: '#9CA3AF',

    // Border Colors
    border: 'rgba(255, 255, 255, 0.1)',
    borderSubtle: 'rgba(255, 255, 255, 0.05)',
    borderStrong: 'rgba(255, 255, 255, 0.2)',

    // Status Colors — Master Prompt Specification
    success: '#22C55E', // Emerald Green
    successLight: 'rgba(0, 217, 165, 0.1)',
    warning: '#F59E0B',
    warningLight: 'rgba(245, 158, 11, 0.1)',
    error: '#EF4444',
    errorLight: 'rgba(239, 68, 68, 0.1)',
    info: '#3B82F6',
    infoLight: 'rgba(59, 130, 246, 0.1)',

    // Accent Colors — Master Prompt Specification
    pink: '#EC4899', // Electric Pink
    coral: '#F472B6',
    softPink: '#3B82F6',
    purple: '#9333EA',
    blue: '#3B82F6',
    cyan: '#06B6D4',
    green: '#22C55E', // Emerald Green
    gold: '#D9A657',

    // Coin/Premium Colors
    coinPrimary: '#D9A657',
    coinSecondary: '#C77A45',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    '2xl': '48px',
    '3xl': '64px',
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    base: '16px',
    lg: '18px',
    xl: '24px',
    xxl: '32px',
    '2xl': '32px',
    '3xl': '48px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    '3xl': '32px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.6)',
    '2xl': '0 25px 50px rgba(0, 0, 0, 0.7)',
    glow: '0 0 20px rgba(255, 45, 117, 0.3)',
    glowStrong: '0 0 40px rgba(255, 45, 117, 0.5)',
  },
  transitions: {
    fast: '0.15s ease',
    base: '0.2s ease',
    slow: '0.3s ease',
  },
  breakpoints: {
    xs: '320px',
    sm: '576px',
    md: '768px',
    lg: '992px',
    xl: '1200px',
    xxl: '1400px',
  },
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
  },
};

export type Theme = typeof theme;

export default theme;
