/**
 * Shared Auth Styles
 * Consolidated responsive styles for all authentication screens
 *
 * Design tokens and responsive utilities for:
 * - LoginScreen
 * - RegisterScreen
 * - ForgotPasswordScreen
 * - OnboardingScreen
 * - AgeGate
 * - PhoneVerification
 * - SocialLoginButtons
 */

import { StyleSheet, Dimensions, Platform } from 'react-native';

// Get screen dimensions for responsive calculations
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive breakpoints - Standard breakpoints
// Mobile: 320-480px, Tablet: 768px, Desktop: 1024px, Large: 1440px+
const BREAKPOINTS = {
  mobileMin: 320, // Minimum mobile viewport
  mobileMax: 480, // Maximum mobile viewport
  tablet: 768, // Tablet breakpoint
  desktop: 1024, // Desktop breakpoint
  large: 1440, // Large screen breakpoint
  // Legacy aliases
  small: 320,
  medium: 375,
  large: 414,
};

// Determine device size category based on standard breakpoints
const getDeviceSize = () => {
  if (SCREEN_WIDTH >= BREAKPOINTS.large) return 'large';
  if (SCREEN_WIDTH >= BREAKPOINTS.desktop) return 'desktop';
  if (SCREEN_WIDTH >= BREAKPOINTS.tablet) return 'tablet';
  if (SCREEN_WIDTH >= BREAKPOINTS.mobileMax) return 'mobileLarge';
  return 'mobile';
};

const DEVICE_SIZE = getDeviceSize();

// Device category for responsive form widths
export const DEVICE_CATEGORY = {
  isMobile: SCREEN_WIDTH < BREAKPOINTS.mobileMax,
  isTablet: SCREEN_WIDTH >= BREAKPOINTS.tablet && SCREEN_WIDTH < BREAKPOINTS.desktop,
  isDesktop: SCREEN_WIDTH >= BREAKPOINTS.desktop && SCREEN_WIDTH < BREAKPOINTS.large,
  isLarge: SCREEN_WIDTH >= BREAKPOINTS.large,
};

// Responsive scale functions
export const scale = (size: number): number => {
  const baseWidth = 375; // iPhone 11 Pro width
  return (SCREEN_WIDTH / baseWidth) * size;
};

export const verticalScale = (size: number): number => {
  const baseHeight = 812; // iPhone 11 Pro height
  return (SCREEN_HEIGHT / baseHeight) * size;
};

export const moderateScale = (size: number, factor = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

// Responsive container width - ensures forms don't overflow
export const getResponsiveContainerWidth = (): number | string => {
  if (SCREEN_WIDTH >= BREAKPOINTS.large) {
    return 576; // 36rem equivalent - large screens
  }
  if (SCREEN_WIDTH >= BREAKPOINTS.desktop) {
    return 512; // 32rem equivalent - desktop
  }
  if (SCREEN_WIDTH >= BREAKPOINTS.tablet) {
    return 448; // 28rem equivalent - tablet
  }
  // Mobile - use percentage to prevent overflow
  return '100%';
};

// Responsive horizontal padding - prevents content from touching edges
export const getResponsivePadding = (): number => {
  if (SCREEN_WIDTH >= BREAKPOINTS.large) {
    return moderateScale(32); // 2rem
  }
  if (SCREEN_WIDTH >= BREAKPOINTS.desktop) {
    return moderateScale(28); // 1.75rem
  }
  if (SCREEN_WIDTH >= BREAKPOINTS.tablet) {
    return moderateScale(24); // 1.5rem
  }
  if (SCREEN_WIDTH >= BREAKPOINTS.mobileMax) {
    return moderateScale(20); // 1.25rem
  }
  return moderateScale(16); // 1rem - minimum for small mobile
};

// Responsive font scale multiplier
export const getFontScaleMultiplier = (): number => {
  if (SCREEN_WIDTH >= BREAKPOINTS.large) return 1.1;
  if (SCREEN_WIDTH >= BREAKPOINTS.desktop) return 1.05;
  if (SCREEN_WIDTH >= BREAKPOINTS.tablet) return 1;
  if (SCREEN_WIDTH < BREAKPOINTS.mobileMin + 40) return 0.9; // Very small screens
  return 1;
};

// Color Palette - Brand Colors
export const AUTH_COLORS = {
  // Primary Brand Colors
  primary: '#E91E63',
  primaryDark: '#D62839',
  primaryLight: '#FF6B6B',

  // Secondary Colors
  secondary: '#9C27B0',

  // Status Colors
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',

  // Neutral Colors
  background: '#FFFFFF',
  surface: '#F9F9F9',
  text: {
    primary: '#333333',
    secondary: '#666666',
    tertiary: '#999999',
    inverse: '#FFFFFF',
  },

  // Border Colors
  border: {
    default: '#DDDDDD',
    light: '#E0E0E0',
    focus: '#E91E63',
    error: '#F44336',
  },

  // Social Login Colors
  social: {
    google: '#FFFFFF',
    apple: '#000000',
    facebook: '#1877F2',
  },
};

// Typography Scale
export const AUTH_TYPOGRAPHY = {
  // Font sizes - responsive
  fontSize: {
    xs: moderateScale(12),
    sm: moderateScale(14),
    base: moderateScale(16),
    lg: moderateScale(18),
    xl: moderateScale(20),
    '2xl': moderateScale(24),
    '3xl': moderateScale(28),
    '4xl': moderateScale(32),
    '5xl': moderateScale(48),
  },

  // Font weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing Scale - responsive
export const AUTH_SPACING = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(16),
  lg: moderateScale(24),
  xl: moderateScale(32),
  '2xl': moderateScale(40),
  '3xl': moderateScale(48),
  '4xl': moderateScale(64),
};

// Border Radius Scale
export const AUTH_RADIUS = {
  sm: moderateScale(4),
  md: moderateScale(8),
  lg: moderateScale(12),
  xl: moderateScale(16),
  '2xl': moderateScale(24),
  full: 9999,
};

// Shadow definitions
export const AUTH_SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

// Shared Auth Styles
export const authStyles = StyleSheet.create({
  // Layout containers
  container: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
  },

  scrollContainer: {
    flexGrow: 1,
  },

  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: AUTH_SPACING.lg,
  },

  content: {
    flex: 1,
    paddingHorizontal: AUTH_SPACING.lg,
    paddingVertical: AUTH_SPACING.xl,
  },

  // Form elements
  form: {
    gap: AUTH_SPACING.md,
  },

  inputContainer: {
    gap: AUTH_SPACING.sm,
  },

  // Titles and text
  title: {
    fontSize: AUTH_TYPOGRAPHY.fontSize['3xl'],
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.bold,
    color: AUTH_COLORS.text.primary,
    marginBottom: AUTH_SPACING.sm,
  },

  subtitle: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.base,
    color: AUTH_COLORS.text.secondary,
    marginBottom: AUTH_SPACING.xl,
    lineHeight: AUTH_TYPOGRAPHY.fontSize.base * AUTH_TYPOGRAPHY.lineHeight.relaxed,
  },

  label: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.sm,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
    color: AUTH_COLORS.text.primary,
  },

  // Input styles
  input: {
    borderWidth: 1,
    borderColor: AUTH_COLORS.border.default,
    borderRadius: AUTH_RADIUS.lg,
    paddingVertical: AUTH_SPACING.md,
    paddingHorizontal: AUTH_SPACING.md,
    fontSize: AUTH_TYPOGRAPHY.fontSize.base,
    backgroundColor: AUTH_COLORS.surface,
    color: AUTH_COLORS.text.primary,
  },

  inputFocused: {
    borderColor: AUTH_COLORS.border.focus,
    borderWidth: 2,
  },

  inputError: {
    borderColor: AUTH_COLORS.border.error,
  },

  // Button styles
  button: {
    backgroundColor: AUTH_COLORS.primary,
    paddingVertical: AUTH_SPACING.md,
    paddingHorizontal: AUTH_SPACING.lg,
    borderRadius: AUTH_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: AUTH_COLORS.primary,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: AUTH_COLORS.text.inverse,
    fontSize: AUTH_TYPOGRAPHY.fontSize.base,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
  },

  buttonTextSecondary: {
    color: AUTH_COLORS.primaryDark,
  },

  // Link styles
  link: {
    color: AUTH_COLORS.primary,
    fontSize: AUTH_TYPOGRAPHY.fontSize.sm,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
  },

  linkText: {
    textAlign: 'center',
    color: AUTH_COLORS.text.secondary,
    fontSize: AUTH_TYPOGRAPHY.fontSize.sm,
  },

  // Error styles
  errorText: {
    color: AUTH_COLORS.error,
    fontSize: AUTH_TYPOGRAPHY.fontSize.xs,
    marginTop: AUTH_SPACING.xs,
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: AUTH_SPACING.lg,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: AUTH_COLORS.border.default,
  },

  dividerText: {
    marginHorizontal: AUTH_SPACING.md,
    color: AUTH_COLORS.text.secondary,
    fontSize: AUTH_TYPOGRAPHY.fontSize.sm,
  },

  // Social login buttons container
  socialButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: AUTH_SPACING.md,
  },

  socialButton: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AUTH_COLORS.border.default,
    ...AUTH_SHADOWS.md,
  },

  // Verification code input
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: AUTH_SPACING.lg,
  },

  codeInput: {
    width: moderateScale(48),
    height: moderateScale(56),
    borderWidth: 2,
    borderColor: AUTH_COLORS.border.light,
    borderRadius: AUTH_RADIUS.lg,
    fontSize: AUTH_TYPOGRAPHY.fontSize['2xl'],
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.bold,
    textAlign: 'center',
    backgroundColor: AUTH_COLORS.surface,
    color: AUTH_COLORS.text.primary,
  },

  codeInputFilled: {
    borderColor: AUTH_COLORS.primary,
    backgroundColor: AUTH_COLORS.background,
  },

  // Progress indicator
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AUTH_SPACING.lg,
  },

  progressDot: {
    width: moderateScale(12),
    height: moderateScale(12),
    borderRadius: moderateScale(6),
    backgroundColor: AUTH_COLORS.border.default,
  },

  progressDotActive: {
    backgroundColor: AUTH_COLORS.primary,
    transform: [{ scale: 1.2 }],
  },

  progressDotCompleted: {
    backgroundColor: AUTH_COLORS.success,
  },

  progressLine: {
    width: moderateScale(40),
    height: 2,
    backgroundColor: AUTH_COLORS.border.default,
    marginHorizontal: AUTH_SPACING.sm,
  },

  // Disclaimer text
  disclaimer: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.xs,
    color: AUTH_COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: AUTH_TYPOGRAPHY.fontSize.xs * AUTH_TYPOGRAPHY.lineHeight.relaxed,
  },

  // Password requirements
  passwordRequirements: {
    backgroundColor: AUTH_COLORS.surface,
    padding: AUTH_SPACING.md,
    borderRadius: AUTH_RADIUS.lg,
  },

  requirementsTitle: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.sm,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
    color: AUTH_COLORS.text.primary,
    marginBottom: AUTH_SPACING.sm,
  },

  requirement: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.xs,
    color: AUTH_COLORS.text.tertiary,
    marginVertical: 3,
  },

  requirementMet: {
    color: AUTH_COLORS.success,
  },

  // Success state
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  successCircle: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    backgroundColor: AUTH_COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AUTH_SPACING.xl,
  },

  successIcon: {
    fontSize: moderateScale(64),
    color: AUTH_COLORS.text.inverse,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.bold,
  },

  successTitle: {
    fontSize: AUTH_TYPOGRAPHY.fontSize['3xl'],
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.bold,
    color: AUTH_COLORS.text.primary,
    marginBottom: AUTH_SPACING.md,
  },

  successSubtitle: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.base,
    color: AUTH_COLORS.text.secondary,
    textAlign: 'center',
  },

  // Loading state
  loadingContainer: {
    marginTop: AUTH_SPACING.xl,
    alignItems: 'center',
  },

  loadingText: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.base,
    color: AUTH_COLORS.text.secondary,
    marginTop: AUTH_SPACING.md,
  },

  // Match indicator (password confirmation)
  matchIndicator: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.xs,
    marginTop: AUTH_SPACING.xs,
  },

  matchSuccess: {
    color: AUTH_COLORS.success,
  },

  matchError: {
    color: AUTH_COLORS.error,
  },

  // Logo styles
  logo: {
    fontSize: AUTH_TYPOGRAPHY.fontSize['5xl'],
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.bold,
    color: AUTH_COLORS.primaryDark,
    marginBottom: AUTH_SPACING.sm,
  },

  tagline: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.lg,
    color: AUTH_COLORS.text.secondary,
    marginBottom: AUTH_SPACING['2xl'],
  },

  // Terms text
  terms: {
    marginTop: AUTH_SPACING.xl,
    fontSize: AUTH_TYPOGRAPHY.fontSize.xs,
    color: AUTH_COLORS.text.tertiary,
    textAlign: 'center',
  },
});

// Responsive layout helpers - supports standard breakpoints
export const getResponsiveValue = <T>(values: {
  mobile?: T;
  mobileLarge?: T;
  tablet?: T;
  desktop?: T;
  large?: T;
  // Legacy aliases
  small?: T;
  medium?: T;
  default: T;
}): T => {
  const { mobile, mobileLarge, tablet, desktop, large, small, medium } = values;

  switch (DEVICE_SIZE) {
    case 'large':
      return large ?? desktop ?? tablet ?? values.default;
    case 'desktop':
      return desktop ?? tablet ?? values.default;
    case 'tablet':
      return tablet ?? mobileLarge ?? values.default;
    case 'mobileLarge':
      return mobileLarge ?? mobile ?? medium ?? values.default;
    case 'mobile':
      return mobile ?? small ?? values.default;
    default:
      return values.default;
  }
};

// Get responsive form max-width based on viewport
export const getFormMaxWidth = (): number | undefined => {
  // Only constrain width on tablet and larger - mobile uses full width with padding
  if (SCREEN_WIDTH >= BREAKPOINTS.large) return 576; // 36rem
  if (SCREEN_WIDTH >= BREAKPOINTS.desktop) return 512; // 32rem
  if (SCREEN_WIDTH >= BREAKPOINTS.tablet) return 448; // 28rem
  return undefined; // Full width on mobile
};

// Ensure input fields never overflow viewport
export const getInputMaxWidth = (): number => {
  const padding = getResponsivePadding() * 2;
  return Math.min(SCREEN_WIDTH - padding, 560); // Never exceed 35rem
};

// Platform-specific adjustments
export const platformSelect = <T>(options: { ios?: T; android?: T; default: T }): T => {
  if (Platform.OS === 'ios' && options.ios !== undefined) return options.ios;
  if (Platform.OS === 'android' && options.android !== undefined) return options.android;
  return options.default;
};

// Safe area insets helper
export const getSafeAreaPadding = () => {
  return platformSelect({
    ios: { top: 44, bottom: 34 },
    android: { top: 24, bottom: 0 },
    default: { top: 0, bottom: 0 },
  });
};

export default authStyles;
