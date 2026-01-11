/**
 * Flamoral React Native Button Component
 * High contrast flame gradient buttons for mobile
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
// Note: You need to install react-native-linear-gradient or expo-linear-gradient
// import LinearGradient from 'react-native-linear-gradient';

// Fallback gradient component for when LinearGradient is not available
// Replace this with actual LinearGradient import
const LinearGradient: React.FC<{
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: ViewStyle;
  children?: React.ReactNode;
}> = ({ colors, style, children }) => (
  <View style={[style, { backgroundColor: colors[0] }]}>{children}</View>
);

// ============================================
// Types
// ============================================

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

// ============================================
// Colors
// ============================================

const colors = {
  flameRed: '#D62839',
  emberOrange: '#FF6E35',
  velvetWine: '#7A1020',
  richCharcoal: '#1A1A1A',
  emberGold: '#D9A657',
  softIvory: '#FFF6EE',
  smokeGrey: '#C4C4C4',
};

// ============================================
// Size Configurations
// ============================================

const sizeConfig = {
  sm: {
    height: 40,
    paddingHorizontal: 20,
    fontSize: 14,
    borderRadius: 8,
  },
  md: {
    height: 52,
    paddingHorizontal: 28,
    fontSize: 16,
    borderRadius: 12,
  },
  lg: {
    height: 60,
    paddingHorizontal: 36,
    fontSize: 18,
    borderRadius: 14,
  },
};

// ============================================
// Component
// ============================================

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  style,
  textStyle,
  ...props
}) => {
  const config = sizeConfig[size];
  const isDisabled = disabled || loading;

  // Get variant styles
  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      height: config.height,
      paddingHorizontal: config.paddingHorizontal,
      borderRadius: config.borderRadius,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: isDisabled ? 0.5 : 1,
    };

    if (fullWidth) {
      base.width = '100%';
    }

    switch (variant) {
      case 'secondary':
        return {
          ...base,
          backgroundColor: colors.richCharcoal,
          borderWidth: 2,
          borderColor: colors.emberGold,
        };
      case 'ghost':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: colors.flameRed,
        };
      case 'outline':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: colors.smokeGrey,
        };
      default:
        return base;
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'secondary':
        return colors.emberGold;
      case 'ghost':
        return colors.flameRed;
      case 'outline':
        return colors.richCharcoal;
      default:
        return colors.softIvory;
    }
  };

  const textColor = getTextColor();

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text
            style={[
              styles.text,
              { fontSize: config.fontSize, color: textColor },
              textStyle,
            ]}
          >
            {children}
          </Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </>
      )}
    </>
  );

  // Primary button uses gradient
  if (variant === 'primary') {
    return (
      <TouchableOpacity
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[fullWidth && { width: '100%' }, style]}
        {...props}
      >
        <LinearGradient
          colors={[colors.flameRed, colors.emberOrange]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            getContainerStyle(),
            styles.shadow,
          ]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Other variants
  return (
    <TouchableOpacity
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[getContainerStyle(), style]}
      {...props}
    >
      {content}
    </TouchableOpacity>
  );
};

// ============================================
// Convenience Components
// ============================================

export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="primary" {...props} />
);

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="secondary" {...props} />
);

export const GhostButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="ghost" {...props} />
);

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  text: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  shadow: {
    shadowColor: colors.flameRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default Button;
