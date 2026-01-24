import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
  AccessibilityState,
} from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const getSpinnerColor = () => {
    if (variant === 'outline' || variant === 'ghost') return '#D62839';
    return '#fff';
  };

  // Build accessibility state
  const accessibilityState: AccessibilityState = {
    disabled: disabled || loading,
    busy: loading,
  };

  // Determine accessible label
  const getAccessibilityLabel = () => {
    if (accessibilityLabel) return accessibilityLabel;
    if (loading) return `${title}, loading`;
    return title;
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
    >
      {loading ? (
        <ActivityIndicator color={getSpinnerColor()} accessibilityLabel="Loading" />
      ) : (
        <View style={styles.buttonContent}>
          {icon && iconPosition === 'left' && (
            <Text
              style={[styles.icon, styles.iconLeft]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {icon}
            </Text>
          )}
          <Text
            style={[styles.text, styles[`${variant}Text`], styles[`${size}Text`], textStyle]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Text
              style={[styles.icon, styles.iconRight]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {icon}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 44, // Minimum touch target (44pt iOS guideline)
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Variants - Using darker shades for better contrast
  primary: {
    backgroundColor: '#D62839', // Darker pink for better contrast (was #E91E63)
  },
  secondary: {
    backgroundColor: '#7B1FA2', // Darker purple for better contrast (was #9C27B0)
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#D62839',
  },
  danger: {
    backgroundColor: '#D32F2F', // Darker red for better contrast (was #F44336)
  },
  success: {
    backgroundColor: '#388E3C', // Darker green for better contrast (was #4CAF50)
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  // Sizes - Ensuring minimum 44pt touch targets
  small: {
    paddingVertical: 10, // Increased for touch target (was 8)
    paddingHorizontal: 16,
    minHeight: 44,
  },
  medium: {
    paddingVertical: 14, // Increased for touch target (was 12)
    paddingHorizontal: 24,
    minHeight: 48,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 52,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  // Text styles
  text: {
    fontWeight: '600',
  },
  primaryText: {
    color: '#fff',
  },
  secondaryText: {
    color: '#fff',
  },
  outlineText: {
    color: '#D62839',
  },
  dangerText: {
    color: '#fff',
  },
  successText: {
    color: '#fff',
  },
  ghostText: {
    color: '#D62839',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  // Icon styles
  icon: {
    fontSize: 18,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
