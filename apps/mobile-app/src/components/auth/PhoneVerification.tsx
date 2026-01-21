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
} from 'react-native';
import { Button } from '../common/Button';

interface PhoneVerificationProps {
  onVerified: (phoneNumber: string) => void;
  onSendCode: (phoneNumber: string) => Promise<void>;
  onVerifyCode: (phoneNumber: string, code: string) => Promise<boolean>;
}

type VerificationStep = 'phone' | 'code' | 'success';

const COUNTRY_CODES = [
  { code: '+1', country: 'US/CA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+86', country: 'CN', flag: '🇨🇳' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
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
      <Text style={styles.title}>Enter your phone number</Text>
      <Text style={styles.subtitle}>We'll send you a verification code to confirm it's you</Text>

      <View style={styles.phoneInputContainer}>
        <TouchableOpacity
          style={styles.countryCodeButton}
          onPress={() => setShowCountryPicker(!showCountryPicker)}
        >
          <Text style={styles.countryCodeText}>{countryCode}</Text>
          <Text style={styles.countryCodeArrow}>▼</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.phoneInput}
          placeholder="(555) 123-4567"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          maxLength={15}
          autoFocus
        />
      </View>

      {showCountryPicker && (
        <View style={styles.countryPicker}>
          {COUNTRY_CODES.map((item) => (
            <TouchableOpacity
              key={item.code}
              style={styles.countryPickerItem}
              onPress={() => {
                setCountryCode(item.code);
                setShowCountryPicker(false);
              }}
            >
              <Text style={styles.countryFlag}>{item.flag}</Text>
              <Text style={styles.countryName}>{item.country}</Text>
              <Text style={styles.countryCodeInPicker}>{item.code}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Button
        title="Send Code"
        onPress={handleSendCode}
        loading={isLoading}
        disabled={phoneNumber.length < 10 || isLoading}
        fullWidth
        style={styles.button}
      />

      <Text style={styles.disclaimer}>
        By continuing, you agree to receive SMS messages. Message and data rates may apply.
      </Text>
    </View>
  );

  const renderCodeInput = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Enter verification code</Text>
      <Text style={styles.subtitle}>
        We sent a code to {countryCode} {phoneNumber}
      </Text>

      <TouchableOpacity onPress={() => setStep('phone')}>
        <Text style={styles.changeNumberText}>Change number</Text>
      </TouchableOpacity>

      <View style={styles.codeInputContainer}>
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
          />
        ))}
      </View>

      <TouchableOpacity
        onPress={handleResendCode}
        disabled={resendTimer > 0 || isLoading}
        style={styles.resendButton}
      >
        {resendTimer > 0 ? (
          <Text style={styles.resendTimerText}>Resend code in {resendTimer}s</Text>
        ) : (
          <Text style={styles.resendText}>Resend code</Text>
        )}
      </TouchableOpacity>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E91E63" />
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
      <View style={styles.stepContainer}>
        <Animated.View style={[styles.successContainer, { transform: [{ scale }], opacity }]}>
          <View style={styles.successCircle}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Phone Verified!</Text>
          <Text style={styles.successSubtitle}>
            Your phone number has been successfully verified
          </Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {step === 'phone' && renderPhoneInput()}
      {step === 'code' && renderCodeInput()}
      {step === 'success' && renderSuccess()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  stepContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    lineHeight: 22,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#F5F5F5',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  countryCodeArrow: {
    fontSize: 10,
    color: '#999',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    fontSize: 16,
    color: '#333',
  },
  countryPicker: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 24,
    maxHeight: 200,
  },
  countryPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  countryCodeInPicker: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  button: {
    marginBottom: 16,
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  changeNumberText: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '600',
    marginBottom: 32,
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    backgroundColor: '#F5F5F5',
  },
  codeInputFilled: {
    borderColor: '#E91E63',
    backgroundColor: '#FFF',
  },
  codeInputDisabled: {
    opacity: 0.5,
  },
  resendButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 16,
    color: '#E91E63',
    fontWeight: '600',
  },
  resendTimerText: {
    fontSize: 16,
    color: '#999',
  },
  loadingContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  successIcon: {
    fontSize: 64,
    color: '#FFF',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
