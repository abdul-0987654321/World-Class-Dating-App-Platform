import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../common/Button';
import {
  AUTH_COLORS,
  AUTH_TYPOGRAPHY,
  AUTH_SPACING,
  AUTH_RADIUS,
  moderateScale,
} from '../../styles/auth.styles';

interface PhoneVerificationProps {
  onVerified: (phoneNumber: string) => void;
  onSendCode: (phoneNumber: string) => Promise<void>;
  onVerifyCode: (phoneNumber: string, code: string) => Promise<boolean>;
}

type VerificationStep = 'phone' | 'code' | 'success';

const COUNTRY_CODES = [
  { code: '+1', country: 'United States/Canada', flag: '' },
  { code: '+44', country: 'United Kingdom', flag: '' },
  { code: '+91', country: 'India', flag: '' },
  { code: '+86', country: 'China', flag: '' },
  { code: '+81', country: 'Japan', flag: '' },
  { code: '+49', country: 'Germany', flag: '' },
  { code: '+33', country: 'France', flag: '' },
  { code: '+61', country: 'Australia', flag: '' },
];

export const PhoneVerification: React.FC<PhoneVerificationProps> = ({
  onVerified,
  onSendCode,
  onVerifyCode,
}) => {
  const [step, setStep] = useState<VerificationStep>('phone');
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const codeInputRefs = useRef<Array<TextInput | null>>([]);
  const successAnimation = useRef(new Animated.Value(0)).current;

  // Countdown timer for resend code
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Success animation
  useEffect(() => {
    if (step === 'success') {
      Animated.spring(successAnimation, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        onVerified(`${countryCode}${phoneNumber}`);
      }, 2000);
    }
  }, [step, successAnimation, countryCode, phoneNumber, onVerified]);

  const handleSendCode = async () => {
    if (phoneNumber.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number.');
      return;
    }

    setIsLoading(true);
    try {
      await onSendCode(`${countryCode}${phoneNumber}`);
      setStep('code');
      setResendTimer(60);
      setTimeout(() => {
        codeInputRefs.current[0]?.focus();
      }, 300);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification code. Please try again.');
      console.error('Send code error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;

    setIsLoading(true);
    try {
      await onSendCode(`${countryCode}${phoneNumber}`);
      setResendTimer(60);
      Alert.alert('Code Sent', 'A new verification code has been sent.');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
      console.error('Resend code error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const isValid = await onVerifyCode(`${countryCode}${phoneNumber}`, verificationCode);

      if (isValid) {
        setStep('success');
      } else {
        Alert.alert('Invalid Code', 'The verification code is incorrect. Please try again.');
        setCode(['', '', '', '', '', '']);
        codeInputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      Alert.alert(
        'Verification Failed',
        error.message || 'Failed to verify code. Please try again.'
      );
      console.error('Verify code error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (index === 5 && value && newCode.every((digit) => digit)) {
      handleVerifyCode();
    }
  };

  const handleCodeKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const renderPhoneInput = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title} accessibilityRole="header">
        Enter your phone number
      </Text>
      <Text style={styles.subtitle}>We'll send you a verification code to confirm it's you</Text>

      <View style={styles.phoneInputContainer}>
        <TouchableOpacity
          style={styles.countryCodeButton}
          onPress={() => setShowCountryPicker(!showCountryPicker)}
          accessibilityRole="button"
          accessibilityLabel={`Country code ${countryCode}. Tap to change`}
          accessibilityHint="Opens country code picker"
        >
          <Text style={styles.countryCodeText}>{countryCode}</Text>
          <Text
            style={styles.countryCodeArrow}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {showCountryPicker ? 'v' : '>'}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={styles.phoneInput}
          placeholder="(555) 123-4567"
          placeholderTextColor={AUTH_COLORS.text.tertiary}
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          maxLength={15}
          autoFocus
          textContentType="telephoneNumber"
          autoComplete="tel"
          accessibilityLabel="Phone number"
          accessibilityHint="Enter your phone number"
        />
      </View>

      {showCountryPicker && (
        <View
          style={styles.countryPicker}
          accessibilityRole="menu"
          accessibilityLabel="Country code selector"
        >
          <ScrollView style={styles.countryPickerScroll}>
            {COUNTRY_CODES.map((item) => (
              <TouchableOpacity
                key={item.code}
                style={styles.countryPickerItem}
                onPress={() => {
                  setCountryCode(item.code);
                  setShowCountryPicker(false);
                }}
                accessibilityRole="menuitem"
                accessibilityLabel={`${item.country}, ${item.code}`}
              >
                <Text
                  style={styles.countryFlag}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  {item.flag}
                </Text>
                <Text style={styles.countryName}>{item.country}</Text>
                <Text style={styles.countryCodeInPicker}>{item.code}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Button
        title="Send Code"
        onPress={handleSendCode}
        loading={isLoading}
        disabled={phoneNumber.length < 10 || isLoading}
        fullWidth
        style={styles.button}
        accessibilityLabel={isLoading ? 'Sending code' : 'Send Code'}
        accessibilityHint="Sends verification code to your phone"
      />

      <Text style={styles.disclaimer} accessibilityRole="text">
        By continuing, you agree to receive SMS messages. Message and data rates may apply.
      </Text>
    </View>
  );

  const renderCodeInput = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title} accessibilityRole="header">
        Enter verification code
      </Text>
      <Text style={styles.subtitle}>
        We sent a code to {countryCode} {phoneNumber}
      </Text>

      <TouchableOpacity
        onPress={() => setStep('phone')}
        style={styles.changeNumberButton}
        accessibilityRole="link"
        accessibilityLabel="Change phone number"
        accessibilityHint="Go back to enter a different phone number"
      >
        <Text style={styles.changeNumberText}>Change number</Text>
      </TouchableOpacity>

      <View
        style={styles.codeInputContainer}
        accessibilityLabel={`Verification code input. ${code.filter((d) => d).length} of 6 digits entered`}
      >
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (codeInputRefs.current[index] = ref)}
            style={[
              styles.codeInput,
              digit && styles.codeInputFilled,
              isLoading && styles.codeInputDisabled,
            ]}
            value={digit}
            onChangeText={(value) => handleCodeChange(value, index)}
            onKeyPress={({ nativeEvent }) => handleCodeKeyPress(nativeEvent.key, index)}
            keyboardType="number-pad"
            maxLength={1}
            editable={!isLoading}
            selectTextOnFocus
            accessibilityLabel={`Digit ${index + 1} of 6`}
            accessibilityHint={digit ? `Current value ${digit}` : 'Empty'}
          />
        ))}
      </View>

      <TouchableOpacity
        onPress={handleResendCode}
        disabled={resendTimer > 0 || isLoading}
        style={styles.resendButton}
        accessibilityRole="button"
        accessibilityLabel={
          resendTimer > 0 ? `Resend code available in ${resendTimer} seconds` : 'Resend code'
        }
        accessibilityState={{ disabled: resendTimer > 0 || isLoading }}
        accessibilityHint="Request a new verification code"
      >
        {resendTimer > 0 ? (
          <Text style={styles.resendTimerText}>Resend code in {resendTimer}s</Text>
        ) : (
          <Text style={styles.resendText}>Resend code</Text>
        )}
      </TouchableOpacity>

      {isLoading && (
        <View
          style={styles.loadingContainer}
          accessibilityRole="progressbar"
          accessibilityLabel="Verifying code"
        >
          <ActivityIndicator size="large" color={AUTH_COLORS.primaryDark} />
          <Text style={styles.loadingText}>Verifying...</Text>
        </View>
      )}
    </View>
  );

  const renderSuccess = () => {
    const scale = successAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const opacity = successAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <View
        style={styles.stepContainer}
        accessibilityRole="alert"
        accessibilityLabel="Phone verified successfully"
      >
        <Animated.View style={[styles.successContainer, { transform: [{ scale }], opacity }]}>
          <View
            style={styles.successCircle}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <Text style={styles.successIcon}>V</Text>
          </View>
          <Text style={styles.successTitle} accessibilityRole="header">
            Phone Verified!
          </Text>
          <Text style={styles.successSubtitle}>
            Your phone number has been successfully verified
          </Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.container}>
          {step === 'phone' && renderPhoneInput()}
          {step === 'code' && renderCodeInput()}
          {step === 'success' && renderSuccess()}
        </View>
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
  container: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
    paddingHorizontal: AUTH_SPACING.lg,
    paddingTop: AUTH_SPACING.lg,
  },
  stepContainer: {
    flex: 1,
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
    marginBottom: AUTH_SPACING.xl,
    lineHeight: AUTH_TYPOGRAPHY.fontSize.base * AUTH_TYPOGRAPHY.lineHeight.relaxed,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: AUTH_SPACING.lg,
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AUTH_SPACING.md,
    paddingVertical: AUTH_SPACING.md,
    borderWidth: 1,
    borderColor: AUTH_COLORS.border.default,
    borderRadius: AUTH_RADIUS.lg,
    marginRight: AUTH_SPACING.md,
    backgroundColor: AUTH_COLORS.surface,
    minHeight: moderateScale(52),
    minWidth: moderateScale(80),
  },
  countryCodeText: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.base,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
    color: AUTH_COLORS.text.primary,
    marginRight: AUTH_SPACING.sm,
  },
  countryCodeArrow: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.xs,
    color: AUTH_COLORS.text.secondary,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: AUTH_SPACING.md,
    paddingVertical: AUTH_SPACING.md,
    borderWidth: 1,
    borderColor: AUTH_COLORS.border.default,
    borderRadius: AUTH_RADIUS.lg,
    fontSize: AUTH_TYPOGRAPHY.fontSize.base,
    color: AUTH_COLORS.text.primary,
    minHeight: moderateScale(52),
  },
  countryPicker: {
    backgroundColor: AUTH_COLORS.background,
    borderRadius: AUTH_RADIUS.lg,
    borderWidth: 1,
    borderColor: AUTH_COLORS.border.default,
    marginBottom: AUTH_SPACING.lg,
    maxHeight: 200,
  },
  countryPickerScroll: {
    maxHeight: 200,
  },
  countryPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AUTH_SPACING.md,
    paddingVertical: AUTH_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: AUTH_COLORS.border.light,
    minHeight: moderateScale(48),
  },
  countryFlag: {
    fontSize: AUTH_TYPOGRAPHY.fontSize['2xl'],
    marginRight: AUTH_SPACING.md,
  },
  countryName: {
    flex: 1,
    fontSize: AUTH_TYPOGRAPHY.fontSize.base,
    color: AUTH_COLORS.text.primary,
  },
  countryCodeInPicker: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.base,
    color: AUTH_COLORS.text.secondary,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.medium,
  },
  button: {
    marginBottom: AUTH_SPACING.md,
  },
  disclaimer: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.sm,
    color: AUTH_COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: AUTH_TYPOGRAPHY.fontSize.sm * AUTH_TYPOGRAPHY.lineHeight.normal,
  },
  changeNumberButton: {
    minHeight: moderateScale(44),
    paddingVertical: AUTH_SPACING.sm,
    marginBottom: AUTH_SPACING.lg,
  },
  changeNumberText: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.sm,
    color: AUTH_COLORS.primaryDark,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: AUTH_SPACING.xl,
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
    color: AUTH_COLORS.text.primary,
    backgroundColor: AUTH_COLORS.surface,
  },
  codeInputFilled: {
    borderColor: AUTH_COLORS.primaryDark,
    backgroundColor: AUTH_COLORS.background,
  },
  codeInputDisabled: {
    opacity: 0.5,
  },
  resendButton: {
    paddingVertical: AUTH_SPACING.md,
    alignItems: 'center',
    minHeight: moderateScale(48),
  },
  resendText: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.base,
    color: AUTH_COLORS.primaryDark,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
  },
  resendTimerText: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.base,
    color: AUTH_COLORS.text.secondary,
  },
  loadingContainer: {
    marginTop: AUTH_SPACING.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.base,
    color: AUTH_COLORS.text.secondary,
    marginTop: AUTH_SPACING.md,
  },
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
});
