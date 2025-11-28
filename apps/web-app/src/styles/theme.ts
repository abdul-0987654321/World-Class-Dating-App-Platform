/**
 * Theme configuration for styled-components
 */

export const theme = {
  colors: {
    primary: '#ff6b6b',
    primaryLight: '#ff8a8a',
    primaryDark: '#e55555',
    primaryHover: '#e55555',
    secondary: '#4ecdc4',
    secondaryHover: '#3dbdb4',
    gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)',
    gradientHover: 'linear-gradient(135deg, #ff5555 0%, #ff7a3f 100%)',
    white: '#ffffff',
    black: '#000000',
    text: '#333333',
    textSecondary: '#666666',
    textTertiary: '#999999',
    textLight: '#aaaaaa',
    background: '#ffffff',
    backgroundSecondary: '#f8f9fa',
    backgroundTertiary: '#f0f0f0',
    border: '#e0e0e0',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    errorLight: '#ffebee',
    info: '#2196f3',
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
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
    '2xl': '0 25px 50px rgba(0, 0, 0, 0.25)',
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
