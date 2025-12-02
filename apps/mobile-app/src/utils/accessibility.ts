import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Accessibility utilities for WCAG 2.1 compliance
 */

export const announceForAccessibility = (message: string): void => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    AccessibilityInfo.announceForAccessibility(message);
  }
};

export const isScreenReaderEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch (error) {
    console.error('Failed to check screen reader status:', error);
    return false;
  }
};

export const isBoldTextEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isBoldTextEnabled();
  } catch (error) {
    console.error('Failed to check bold text status:', error);
    return false;
  }
};

export const isGrayscaleEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isGrayscaleEnabled();
  } catch (error) {
    console.error('Failed to check grayscale status:', error);
    return false;
  }
};

export const isReduceMotionEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch (error) {
    console.error('Failed to check reduce motion status:', error);
    return false;
  }
};

/**
 * Check color contrast ratio (WCAG 2.1 AA requires 4.5:1 for normal text)
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Calculate relative luminance
    const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
};

export const meetsWCAGAA = (color1: string, color2: string): boolean => {
  return getContrastRatio(color1, color2) >= 4.5;
};

export const meetsWCAGAAA = (color1: string, color2: string): boolean => {
  return getContrastRatio(color1, color2) >= 7;
};

/**
 * Dynamic font sizing based on accessibility settings
 */
export const getFontSize = (baseSize: number, scale: number = 1): number => {
  return baseSize * scale;
};

/**
 * Touch target size helpers (WCAG requires minimum 44x44 points)
 */
export const MINIMUM_TOUCH_TARGET_SIZE = 44;

export const getTouchTargetSize = (
  size: number,
  enforceMinimum: boolean = true
): number => {
  return enforceMinimum
    ? Math.max(size, MINIMUM_TOUCH_TARGET_SIZE)
    : size;
};

/**
 * Accessibility labels helper
 */
export const createAccessibilityLabel = (
  label: string,
  hint?: string,
  value?: string
): { accessibilityLabel: string; accessibilityHint?: string } => {
  const result: any = {
    accessibilityLabel: label,
  };

  if (hint) {
    result.accessibilityHint = hint;
  }

  if (value) {
    result.accessibilityValue = { text: value };
  }

  return result;
};

/**
 * Focus management
 */
export const setAccessibilityFocus = (reactTag: number): void => {
  AccessibilityInfo.setAccessibilityFocus(reactTag);
};

/**
 * Keyboard navigation helpers
 */
export const isKeyboardNavigationEnabled = async (): Promise<boolean> => {
  // iOS and Android handle this differently
  if (Platform.OS === 'ios') {
    return await AccessibilityInfo.isScreenReaderEnabled();
  }
  return false;
};

export default {
  announceForAccessibility,
  isScreenReaderEnabled,
  isBoldTextEnabled,
  isGrayscaleEnabled,
  isReduceMotionEnabled,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  getFontSize,
  getTouchTargetSize,
  createAccessibilityLabel,
  setAccessibilityFocus,
  isKeyboardNavigationEnabled,
  MINIMUM_TOUCH_TARGET_SIZE,
};
