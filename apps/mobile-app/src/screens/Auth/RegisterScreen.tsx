import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput as TextInputType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@navigation/AuthNavigator';
import { useAuth } from '@hooks/useAuth';
import {
  AUTH_COLORS,
  AUTH_TYPOGRAPHY,
  AUTH_SPACING,
  AUTH_RADIUS,
  moderateScale,
} from '../../styles/auth.styles';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const RegisterScreen = ({ navigation }: Props) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male' as 'male' | 'female' | 'non-binary' | 'other',
    interestedIn: ['everyone'] as ('men' | 'women' | 'everyone')[],
  });
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Refs for field navigation
  const lastNameRef = useRef<TextInputType>(null);
  const emailRef = useRef<TextInputType>(null);
  const passwordRef = useRef<TextInputType>(null);
  const dobRef = useRef<TextInputType>(null);

  const handleRegister = async () => {
    if (!formData.email || !formData.password || !formData.firstName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await register(formData);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const renderInputField = (
    label: string,
    placeholder: string,
    field: keyof typeof formData,
    options: {
      required?: boolean;
      keyboardType?: TextInputType['props']['keyboardType'];
      autoCapitalize?: TextInputType['props']['autoCapitalize'];
      secureTextEntry?: boolean;
      autoComplete?: TextInputType['props']['autoComplete'];
      textContentType?: TextInputType['props']['textContentType'];
      returnKeyType?: TextInputType['props']['returnKeyType'];
      ref?: React.RefObject<TextInputType>;
      onSubmitEditing?: () => void;
    } = {}
  ) => {
    const labelId = `${field}Label`;
    return (
      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel} nativeID={labelId} accessibilityRole="text">
          {label}
          {options.required && ' *'}
        </Text>
        <TextInput
          ref={options.ref}
          style={[styles.input, focusedField === field && styles.inputFocused]}
          placeholder={placeholder}
          placeholderTextColor={AUTH_COLORS.text.tertiary}
          value={typeof formData[field] === 'string' ? (formData[field] as string) : ''}
          onChangeText={(text) => setFormData({ ...formData, [field]: text })}
          keyboardType={options.keyboardType}
          autoCapitalize={options.autoCapitalize ?? 'none'}
          autoCorrect={false}
          secureTextEntry={options.secureTextEntry}
          autoComplete={options.autoComplete}
          textContentType={options.textContentType}
          returnKeyType={options.returnKeyType ?? 'next'}
          onSubmitEditing={options.onSubmitEditing}
          onFocus={() => setFocusedField(field)}
          onBlur={() => setFocusedField(null)}
          accessibilityLabel={`${label}${options.required ? ', required' : ''}`}
          accessibilityLabelledBy={labelId}
          accessibilityHint={`Enter your ${label.toLowerCase()}`}
        />
      </View>
    );
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
        >
          <View style={styles.container}>
            <Text
              style={styles.title}
              accessibilityRole="header"
              accessibilityLabel="Create Account"
            >
              Create Account
            </Text>
            <Text style={styles.subtitle}>Join Flamoral today</Text>

            <View style={styles.form}>
              {renderInputField('First Name', 'Enter your first name', 'firstName', {
                required: true,
                autoCapitalize: 'words',
                autoComplete: 'given-name',
                textContentType: 'givenName',
                onSubmitEditing: () => lastNameRef.current?.focus(),
              })}

              {renderInputField('Last Name', 'Enter your last name', 'lastName', {
                ref: lastNameRef,
                autoCapitalize: 'words',
                autoComplete: 'family-name',
                textContentType: 'familyName',
                onSubmitEditing: () => emailRef.current?.focus(),
              })}

              {renderInputField('Email', 'Enter your email address', 'email', {
                required: true,
                ref: emailRef,
                keyboardType: 'email-address',
                autoComplete: 'email',
                textContentType: 'emailAddress',
                onSubmitEditing: () => passwordRef.current?.focus(),
              })}

              {renderInputField('Password', 'Create a password', 'password', {
                required: true,
                ref: passwordRef,
                secureTextEntry: true,
                autoComplete: 'new-password',
                textContentType: 'newPassword',
                onSubmitEditing: () => dobRef.current?.focus(),
              })}

              {renderInputField('Date of Birth', 'YYYY-MM-DD', 'dateOfBirth', {
                ref: dobRef,
                keyboardType: 'numbers-and-punctuation',
                returnKeyType: 'done',
                onSubmitEditing: handleRegister,
              })}
            </View>
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
          <View style={styles.fixedBottom}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={loading ? 'Creating account' : 'Sign Up'}
              accessibilityState={{ disabled: loading, busy: loading }}
              accessibilityHint="Double tap to create your account"
            >
              <Text style={styles.buttonText}>{loading ? 'Creating Account...' : 'Sign Up'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={styles.signInButton}
              accessibilityRole="link"
              accessibilityLabel="Already have an account? Sign In"
              accessibilityHint="Navigate to sign in screen"
            >
              <Text style={styles.signIn}>
                Already have an account? <Text style={styles.signInLink}>Sign In</Text>
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
    borderColor: AUTH_COLORS.primaryDark,
    borderWidth: 2,
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
  signInButton: {
    minHeight: moderateScale(48),
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: AUTH_SPACING.md,
    marginTop: AUTH_SPACING.sm,
  },
  signIn: {
    textAlign: 'center',
    color: AUTH_COLORS.text.secondary,
    fontSize: AUTH_TYPOGRAPHY.fontSize.sm,
    lineHeight: AUTH_TYPOGRAPHY.fontSize.sm * AUTH_TYPOGRAPHY.lineHeight.normal,
  },
  signInLink: {
    color: AUTH_COLORS.primaryDark,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
  },
});

export default RegisterScreen;
