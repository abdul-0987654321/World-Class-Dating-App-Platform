import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput as TextInputType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@navigation/AuthNavigator';
import { useAuth } from '@hooks/useAuth';
import SocialLoginButtons from '@components/auth/SocialLoginButtons';
import {
  AUTH_COLORS,
  AUTH_TYPOGRAPHY,
  AUTH_SPACING,
  AUTH_RADIUS,
  moderateScale,
} from '../../styles/auth.styles';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: Props) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const passwordInputRef = useRef<TextInputType>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login({ email, password });
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.container}>
            <Text style={styles.title} accessibilityRole="header" accessibilityLabel="Welcome Back">
              Welcome Back
            </Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>

            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel} nativeID="emailLabel" accessibilityRole="text">
                  Email
                </Text>
                <TextInput
                  style={[styles.input, emailFocused && styles.inputFocused]}
                  placeholder="Enter your email"
                  placeholderTextColor={AUTH_COLORS.text.tertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  accessibilityLabel="Email input field"
                  accessibilityLabelledBy="emailLabel"
                  accessibilityHint="Enter your email address to sign in"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel} nativeID="passwordLabel" accessibilityRole="text">
                  Password
                </Text>
                <TextInput
                  ref={passwordInputRef}
                  style={[styles.input, passwordFocused && styles.inputFocused]}
                  placeholder="Enter your password"
                  placeholderTextColor={AUTH_COLORS.text.tertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  accessibilityLabel="Password input field"
                  accessibilityLabelledBy="passwordLabel"
                  accessibilityHint="Enter your password to sign in"
                />
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotPasswordButton}
                accessibilityRole="link"
                accessibilityLabel="Forgot Password"
                accessibilityHint="Navigate to password recovery"
              >
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <SocialLoginButtons
              onSuccess={(isNewUser, needsProfileSetup) => {
                if (needsProfileSetup) {
                  Alert.alert('Welcome!', 'Please complete your profile to continue');
                }
              }}
              onError={(error) => {
                console.error('Social login error:', error);
              }}
            />
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
          <View style={styles.fixedBottom}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={loading ? 'Signing in' : 'Sign In'}
              accessibilityState={{ disabled: loading, busy: loading }}
              accessibilityHint="Double tap to sign in to your account"
            >
              <Text style={styles.buttonText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              style={styles.signUpButton}
              accessibilityRole="link"
              accessibilityLabel="Don't have an account? Sign Up"
              accessibilityHint="Navigate to create a new account"
            >
              <Text style={styles.signUp}>
                Don't have an account? <Text style={styles.signUpLink}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Styles using shared design tokens for consistency
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: AUTH_SPACING.lg,
    paddingTop: AUTH_SPACING.lg,
    paddingBottom: AUTH_SPACING.md,
    backgroundColor: AUTH_COLORS.background,
  },
  title: {
    fontSize: AUTH_TYPOGRAPHY.fontSize['4xl'],
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.bold,
    color: AUTH_COLORS.text.primary,
    marginBottom: AUTH_SPACING.sm,
  },
  subtitle: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.base,
    color: AUTH_COLORS.text.secondary,
    marginBottom: AUTH_SPACING.lg,
    lineHeight: AUTH_TYPOGRAPHY.fontSize.base * AUTH_TYPOGRAPHY.lineHeight.relaxed,
  },
  form: {
    gap: AUTH_SPACING.md,
  },
  inputWrapper: {
    gap: AUTH_SPACING.xs,
  },
  inputLabel: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.sm,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
    color: AUTH_COLORS.text.primary,
    marginBottom: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: AUTH_COLORS.border.default,
    borderRadius: AUTH_RADIUS.md,
    paddingVertical: AUTH_SPACING.md,
    paddingHorizontal: AUTH_SPACING.md,
    fontSize: AUTH_TYPOGRAPHY.fontSize.base,
    color: AUTH_COLORS.text.primary,
    backgroundColor: AUTH_COLORS.background,
    minHeight: moderateScale(52),
  },
  inputFocused: {
    borderColor: AUTH_COLORS.primaryLight,
    borderWidth: 2,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    minHeight: moderateScale(44),
    minWidth: moderateScale(44),
    justifyContent: 'center',
    paddingVertical: AUTH_SPACING.sm,
    paddingHorizontal: AUTH_SPACING.xs,
  },
  forgotPassword: {
    color: AUTH_COLORS.primaryDark,
    fontSize: AUTH_TYPOGRAPHY.fontSize.sm,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.medium,
  },
  bottomSafeArea: {
    backgroundColor: AUTH_COLORS.background,
  },
  fixedBottom: {
    paddingHorizontal: AUTH_SPACING.lg,
    paddingTop: AUTH_SPACING.md,
    paddingBottom: AUTH_SPACING.sm,
    backgroundColor: AUTH_COLORS.background,
    borderTopWidth: 1,
    borderTopColor: AUTH_COLORS.border.light,
  },
  button: {
    backgroundColor: AUTH_COLORS.primaryDark,
    paddingVertical: AUTH_SPACING.md,
    paddingHorizontal: AUTH_SPACING.lg,
    borderRadius: AUTH_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: moderateScale(52),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: AUTH_COLORS.text.inverse,
    fontSize: AUTH_TYPOGRAPHY.fontSize.lg,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
  },
  signUpButton: {
    minHeight: moderateScale(48),
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: AUTH_SPACING.md,
    marginTop: AUTH_SPACING.sm,
  },
  signUp: {
    textAlign: 'center',
    color: AUTH_COLORS.text.secondary,
    fontSize: AUTH_TYPOGRAPHY.fontSize.sm,
    lineHeight: AUTH_TYPOGRAPHY.fontSize.sm * AUTH_TYPOGRAPHY.lineHeight.normal,
  },
  signUpLink: {
    color: AUTH_COLORS.primaryDark,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
  },
});

export default LoginScreen;
