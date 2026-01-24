import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@navigation/AuthNavigator';
import {
  AUTH_COLORS,
  AUTH_TYPOGRAPHY,
  AUTH_SPACING,
  AUTH_RADIUS,
  moderateScale,
} from '../../styles/auth.styles';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const OnboardingScreen = ({ navigation }: Props) => {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.heroSection}>
          <Text style={styles.logo} accessibilityRole="header" accessibilityLabel="Flamoral">
            Flamoral
          </Text>
          <Text style={styles.tagline}>Where Passion Meets Connection</Text>
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={() => navigation.navigate('Register')}
              accessibilityRole="button"
              accessibilityLabel="Create Account"
              accessibilityHint="Navigate to create a new account"
              activeOpacity={0.7}
            >
              <Text style={styles.buttonPrimaryText}>Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={() => navigation.navigate('Login')}
              accessibilityRole="button"
              accessibilityLabel="Sign In"
              accessibilityHint="Navigate to sign in with existing account"
              activeOpacity={0.7}
            >
              <Text style={styles.buttonSecondaryText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <Text
            style={styles.terms}
            accessibilityRole="text"
            accessibilityLabel="By continuing, you agree to our Terms of Service and Privacy Policy"
          >
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Styles using shared design tokens for consistency
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: AUTH_SPACING.lg,
    paddingVertical: AUTH_SPACING.xl,
    backgroundColor: AUTH_COLORS.background,
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: AUTH_TYPOGRAPHY.fontSize['5xl'],
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.bold,
    color: AUTH_COLORS.primaryDark,
    marginBottom: AUTH_SPACING.sm,
  },
  tagline: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.lg,
    color: AUTH_COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: AUTH_TYPOGRAPHY.fontSize.lg * AUTH_TYPOGRAPHY.lineHeight.relaxed,
  },
  bottomSection: {
    width: '100%',
    paddingBottom: AUTH_SPACING.sm,
  },
  buttonContainer: {
    width: '100%',
    gap: AUTH_SPACING.md,
  },
  buttonPrimary: {
    backgroundColor: AUTH_COLORS.primaryDark,
    paddingVertical: AUTH_SPACING.md,
    paddingHorizontal: AUTH_SPACING.lg,
    borderRadius: AUTH_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: moderateScale(52),
  },
  buttonPrimaryText: {
    color: AUTH_COLORS.text.inverse,
    fontSize: AUTH_TYPOGRAPHY.fontSize.lg,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: AUTH_COLORS.primaryDark,
    paddingVertical: AUTH_SPACING.md,
    paddingHorizontal: AUTH_SPACING.lg,
    borderRadius: AUTH_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: moderateScale(52),
  },
  buttonSecondaryText: {
    color: AUTH_COLORS.primaryDark,
    fontSize: AUTH_TYPOGRAPHY.fontSize.lg,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
  },
  terms: {
    marginTop: AUTH_SPACING.lg,
    fontSize: AUTH_TYPOGRAPHY.fontSize.xs,
    color: AUTH_COLORS.text.secondary,
    textAlign: 'center',
    paddingHorizontal: AUTH_SPACING.lg,
    lineHeight: AUTH_TYPOGRAPHY.fontSize.xs * AUTH_TYPOGRAPHY.lineHeight.relaxed,
  },
});

export default OnboardingScreen;
