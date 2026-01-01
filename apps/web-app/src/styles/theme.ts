/**
 * Theme configuration for styled-components
 * Flamoral Dark Theme - Rose Red, Coral, Soft Pink palette
 */

export const theme = {
  colors: {
    // Primary Brand Colors - Flamoral Flame-Floral palette
    primary: '#E63946',      // Rose Red
    primaryLight: '#FF6B6B', // Coral
    primaryDark: '#C1121F',  // Deep Rose
    primaryHover: '#FF6B6B',
    secondary: '#FFB4B4',    // Soft Pink
    secondaryHover: '#FFDDD2',
    gradient: 'linear-gradient(135deg, #E63946 0%, #FF6B6B 50%, #FFB4B4 100%)',
    gradientHover: 'linear-gradient(135deg, #C1121F 0%, #E63946 50%, #FF6B6B 100%)',

    // Dark Theme Surfaces
    white: '#1A1D24',        // Dark surface (replaces white)
    black: '#000000',
    background: '#0B0B0F',   // Darkest background
    backgroundSecondary: '#111318', // Card backgrounds
    backgroundTertiary: '#1A1D24',  // Elevated surfaces
    surface: '#111318',
    surfaceElevated: '#1A1D24',
    surfaceOverlay: 'rgba(0, 0, 0, 0.7)',

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

    // Status Colors
    success: '#10B981',
    successLight: 'rgba(16, 185, 129, 0.1)',
    warning: '#F59E0B',
    warningLight: 'rgba(245, 158, 11, 0.1)',
    error: '#EF4444',
    errorLight: 'rgba(239, 68, 68, 0.1)',
    info: '#3B82F6',
    infoLight: 'rgba(59, 130, 246, 0.1)',

    // Accent Colors
    pink: '#E63946',
    coral: '#FF6B6B',
    softPink: '#FFB4B4',
    purple: '#9333EA',
    blue: '#3B82F6',
    cyan: '#06B6D4',
    green: '#10B981',
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
    glow: '0 0 20px rgba(230, 57, 70, 0.3)',
    glowStrong: '0 0 40px rgba(230, 57, 70, 0.5)',
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
