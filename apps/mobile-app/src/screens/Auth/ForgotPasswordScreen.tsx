import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
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
import { API_BASE_URL } from '../../services/config';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

type Step = 'email' | 'verify' | 'reset';

const ForgotPasswordScreen = ({ navigation }: Props) => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const codeInputRefs = useRef<(TextInput | null)[]>([]);

  // Timer for resend code
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): { valid: boolean; message: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain an uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain a lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain a number' };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, message: 'Password must contain a special character' };
    }
    return { valid: true, message: '' };
  };

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      // API call to send password reset link
      await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      // Always show success for security (don't reveal if email exists)
      Alert.alert(
        'Reset Link Sent',
        `If an account exists with ${email}, a password reset link has been sent. Please check your email and click the link to reset your password.`,
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      // Still show success message for security - prevents email enumeration
      Alert.alert(
        'Reset Link Sent',
        `If an account exists with ${email}, a password reset link has been sent. Please check your email.`,
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (text: string, index: number) => {
    // Only allow numbers
    if (text && !/^\d+$/.test(text)) return;

    const newCode = [...verificationCode];
    newCode[index] = text;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (text && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyPress = (key: string, index: number) => {
    // Handle backspace
    if (key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    try {
      // API call to verify reset code
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-reset-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.message?.toLowerCase().includes('expired')) {
          Alert.alert(
            'Code Expired',
            'Your verification code has expired. Please request a new one.'
          );
          return;
        }
        throw new Error(data.message || 'Invalid verification code');
      }

      setStep('reset');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    try {
      // API call to resend password reset code
      await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      Alert.alert('Code Sent', 'A new verification code has been sent to your email');
      setResendTimer(60);
      setVerificationCode(['', '', '', '', '', '']);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      Alert.alert('Error', passwordValidation.message);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // API call to reset password with verification code
      const code = verificationCode.join('');
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code,
          newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.message?.toLowerCase().includes('expired')) {
          Alert.alert(
            'Session Expired',
            'Your reset session has expired. Please start the process again.',
            [{ text: 'OK', onPress: () => setStep('email') }]
          );
          return;
        }
        throw new Error(data.message || 'Failed to reset password');
      }

      Alert.alert(
        'Success',
        'Your password has been reset successfully. Please log in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <>
      <Text style={styles.title}>Forgot Password?</Text>
      <Text style={styles.subtitle}>
        Enter your email address and we'll send you a verification code to reset your password.
      </Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={AUTH_COLORS.text.tertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSendCode}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color={AUTH_COLORS.text.inverse} />
          ) : (
            <Text style={styles.buttonText}>Send Verification Code</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderVerifyStep = () => (
    <>
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code we sent to {email}</Text>

      <View style={styles.form}>
        <View style={styles.codeContainer}>
          {verificationCode.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (codeInputRefs.current[index] = ref)}
              style={[styles.codeInput, digit && styles.codeInputFilled]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={({ nativeEvent }) => handleCodeKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerifyCode}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color={AUTH_COLORS.text.inverse} />
          ) : (
            <Text style={styles.buttonText}>Verify Code</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code?</Text>
          <TouchableOpacity
            onPress={handleResendCode}
            disabled={resendTimer > 0 || loading}
            activeOpacity={0.7}
          >
            <Text style={[styles.resendLink, resendTimer > 0 && styles.resendLinkDisabled]}>
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep('email')}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>Change Email</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderResetStep = () => (
    <>
      <Text style={styles.title}>Create New Password</Text>
      <Text style={styles.subtitle}>
        Your new password must be different from previously used passwords.
      </Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>New Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter new password"
              placeholderTextColor={AUTH_COLORS.text.tertiary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.passwordRequirements}>
          <Text style={styles.requirementsTitle}>Password must contain:</Text>
          <Text style={[styles.requirement, newPassword.length >= 8 && styles.requirementMet]}>
            {newPassword.length >= 8 ? 'V' : 'o'} At least 8 characters
          </Text>
          <Text style={[styles.requirement, /[A-Z]/.test(newPassword) && styles.requirementMet]}>
            {/[A-Z]/.test(newPassword) ? 'V' : 'o'} One uppercase letter
          </Text>
          <Text style={[styles.requirement, /[a-z]/.test(newPassword) && styles.requirementMet]}>
            {/[a-z]/.test(newPassword) ? 'V' : 'o'} One lowercase letter
          </Text>
          <Text style={[styles.requirement, /[0-9]/.test(newPassword) && styles.requirementMet]}>
            {/[0-9]/.test(newPassword) ? 'V' : 'o'} One number
          </Text>
          <Text
            style={[
              styles.requirement,
              /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) && styles.requirementMet,
            ]}
          >
            {/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'V' : 'o'} One special character
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor={AUTH_COLORS.text.tertiary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
          />
          {confirmPassword && (
            <Text
              style={[
                styles.matchIndicator,
                newPassword === confirmPassword ? styles.matchSuccess : styles.matchError,
              ]}
            >
              {newPassword === confirmPassword ? 'V Passwords match' : 'X Passwords do not match'}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleResetPassword}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color={AUTH_COLORS.text.inverse} />
          ) : (
            <Text style={styles.buttonText}>Reset Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressDot,
              step === 'email' && styles.progressDotActive,
              (step === 'verify' || step === 'reset') && styles.progressDotCompleted,
            ]}
          />
          <View style={styles.progressLine} />
          <View
            style={[
              styles.progressDot,
              step === 'verify' && styles.progressDotActive,
              step === 'reset' && styles.progressDotCompleted,
            ]}
          />
          <View style={styles.progressLine} />
          <View style={[styles.progressDot, step === 'reset' && styles.progressDotActive]} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {step === 'email' && renderEmailStep()}
            {step === 'verify' && renderVerifyStep()}
            {step === 'reset' && renderResetStep()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Styles using shared design tokens for consistency
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AUTH_SPACING.md,
    paddingTop: AUTH_SPACING.md,
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
  content: {
    flex: 1,
    paddingHorizontal: AUTH_SPACING.lg,
    paddingVertical: AUTH_SPACING.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: AUTH_TYPOGRAPHY.fontSize['3xl'],
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
  inputContainer: {
    gap: AUTH_SPACING.sm,
  },
  inputLabel: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.sm,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
    color: AUTH_COLORS.text.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: AUTH_COLORS.border.default,
    borderRadius: AUTH_RADIUS.lg,
    paddingVertical: AUTH_SPACING.md,
    paddingHorizontal: AUTH_SPACING.md,
    fontSize: AUTH_TYPOGRAPHY.fontSize.base,
    backgroundColor: AUTH_COLORS.surface,
    color: AUTH_COLORS.text.primary,
    minHeight: moderateScale(52),
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AUTH_COLORS.border.default,
    borderRadius: AUTH_RADIUS.lg,
    backgroundColor: AUTH_COLORS.surface,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: AUTH_SPACING.md,
    paddingHorizontal: AUTH_SPACING.md,
    fontSize: AUTH_TYPOGRAPHY.fontSize.base,
    color: AUTH_COLORS.text.primary,
  },
  eyeButton: {
    padding: AUTH_SPACING.md,
    minWidth: moderateScale(44),
    minHeight: moderateScale(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeText: {
    color: AUTH_COLORS.primary,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
    fontSize: AUTH_TYPOGRAPHY.fontSize.sm,
  },
  button: {
    backgroundColor: AUTH_COLORS.primary,
    paddingVertical: AUTH_SPACING.md,
    paddingHorizontal: AUTH_SPACING.lg,
    borderRadius: AUTH_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: AUTH_SPACING.sm,
    minHeight: moderateScale(52),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: AUTH_COLORS.text.inverse,
    fontSize: AUTH_TYPOGRAPHY.fontSize.base,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
  },
  backButton: {
    alignItems: 'center',
    padding: AUTH_SPACING.sm,
    minHeight: moderateScale(44),
    justifyContent: 'center',
  },
  backButtonText: {
    color: AUTH_COLORS.primary,
    fontSize: AUTH_TYPOGRAPHY.fontSize.sm,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: AUTH_SPACING.md,
  },
  codeInput: {
    width: moderateScale(48),
    height: moderateScale(56),
    borderWidth: 2,
    borderColor: AUTH_COLORS.border.default,
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
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: AUTH_SPACING.xs,
  },
  resendText: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.sm,
    color: AUTH_COLORS.text.secondary,
  },
  resendLink: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.sm,
    color: AUTH_COLORS.primary,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
  },
  resendLinkDisabled: {
    color: AUTH_COLORS.text.tertiary,
  },
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
});

export default ForgotPasswordScreen;
