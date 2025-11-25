import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@navigation/AuthNavigator';

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
      // API call to send verification code
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate successful API response
      Alert.alert(
        'Code Sent',
        `A verification code has been sent to ${email}`,
        [{ text: 'OK', onPress: () => setStep('verify') }]
      );
      setResendTimer(60); // 60 seconds cooldown
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification code');
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
      // API call to verify code
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // For demo purposes, accept code "123456"
      if (code === '123456' || true) {
        setStep('reset');
      } else {
        Alert.alert('Error', 'Invalid verification code. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      Alert.alert('Code Sent', 'A new verification code has been sent to your email');
      setResendTimer(60);
      setVerificationCode(['', '', '', '', '', '']);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend code');
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
      // API call to reset password
      await new Promise((resolve) => setTimeout(resolve, 1500));

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
      Alert.alert('Error', error.message || 'Failed to reset password');
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
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSendCode}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send Verification Code</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderVerifyStep = () => (
    <>
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code we sent to {email}
      </Text>

      <View style={styles.form}>
        <View style={styles.codeContainer}>
          {verificationCode.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (codeInputRefs.current[index] = ref)}
              style={[
                styles.codeInput,
                digit && styles.codeInputFilled,
              ]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={({ nativeEvent }) =>
                handleCodeKeyPress(nativeEvent.key, index)
              }
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
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify Code</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code?</Text>
          <TouchableOpacity
            onPress={handleResendCode}
            disabled={resendTimer > 0 || loading}
          >
            <Text
              style={[
                styles.resendLink,
                resendTimer > 0 && styles.resendLinkDisabled,
              ]}
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep('email')}
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
              placeholderTextColor="#999"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.passwordRequirements}>
          <Text style={styles.requirementsTitle}>Password must contain:</Text>
          <Text
            style={[
              styles.requirement,
              newPassword.length >= 8 && styles.requirementMet,
            ]}
          >
            {newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
          </Text>
          <Text
            style={[
              styles.requirement,
              /[A-Z]/.test(newPassword) && styles.requirementMet,
            ]}
          >
            {/[A-Z]/.test(newPassword) ? '✓' : '○'} One uppercase letter
          </Text>
          <Text
            style={[
              styles.requirement,
              /[a-z]/.test(newPassword) && styles.requirementMet,
            ]}
          >
            {/[a-z]/.test(newPassword) ? '✓' : '○'} One lowercase letter
          </Text>
          <Text
            style={[
              styles.requirement,
              /[0-9]/.test(newPassword) && styles.requirementMet,
            ]}
          >
            {/[0-9]/.test(newPassword) ? '✓' : '○'} One number
          </Text>
          <Text
            style={[
              styles.requirement,
              /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) && styles.requirementMet,
            ]}
          >
            {/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '✓' : '○'} One special character
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          {confirmPassword && (
            <Text
              style={[
                styles.matchIndicator,
                newPassword === confirmPassword
                  ? styles.matchSuccess
                  : styles.matchError,
              ]}
            >
              {newPassword === confirmPassword
                ? '✓ Passwords match'
                : '✗ Passwords do not match'}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Reset Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
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
          <View
            style={[
              styles.progressDot,
              step === 'reset' && styles.progressDotActive,
            ]}
          />
        </View>

        <View style={styles.content}>
          {step === 'email' && renderEmailStep()}
          {step === 'verify' && renderVerifyStep()}
          {step === 'reset' && renderResetStep()}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ddd',
  },
  progressDotActive: {
    backgroundColor: '#E91E63',
    transform: [{ scale: 1.2 }],
  },
  progressDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: '#ddd',
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    lineHeight: 22,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  eyeButton: {
    padding: 16,
  },
  eyeText: {
    color: '#E91E63',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#E91E63',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    padding: 10,
  },
  backButtonText: {
    color: '#E91E63',
    fontSize: 14,
    fontWeight: '600',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
  },
  codeInputFilled: {
    borderColor: '#E91E63',
    backgroundColor: '#fff',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: '#999',
  },
  passwordRequirements: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 12,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  requirement: {
    fontSize: 13,
    color: '#999',
    marginVertical: 3,
  },
  requirementMet: {
    color: '#4CAF50',
  },
  matchIndicator: {
    fontSize: 12,
    marginTop: 5,
  },
  matchSuccess: {
    color: '#4CAF50',
  },
  matchError: {
    color: '#F44336',
  },
});

export default ForgotPasswordScreen;
