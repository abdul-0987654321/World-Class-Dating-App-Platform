/**
 * Name Screen
 * First step of onboarding - collect user's name
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from './OnboardingNavigator';

type NameScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Name'>;

interface Props {
  navigation: NameScreenNavigationProp;
}

const NameScreen: React.FC<Props> = ({ navigation }) => {
  const [firstName, setFirstName] = useState('');
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleContinue = () => {
    const trimmedName = firstName.trim();

    if (trimmedName.length < 2) {
      setError('Please enter at least 2 characters');
      return;
    }

    if (trimmedName.length > 30) {
      setError('Name must be less than 30 characters');
      return;
    }

    // Check for valid characters
    if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
      setError('Please use only letters');
      return;
    }

    setError('');
    navigation.navigate('Birthday', { name: trimmedName });
  };

  const isValid = firstName.trim().length >= 2;

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
          <View style={styles.content}>
            <View
              style={styles.progressContainer}
              accessibilityRole="progressbar"
              accessibilityLabel="Step 1 of 12"
              accessibilityValue={{ min: 0, max: 12, now: 1 }}
            >
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '8%' }]} />
              </View>
              <Text style={styles.progressText}>1 of 12</Text>
            </View>

            <View style={styles.questionContainer}>
              <Text style={styles.title} accessibilityRole="header">
                What's your first name?
              </Text>
              <Text style={styles.subtitle}>This is how you'll appear on Heartly</Text>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel} nativeID="nameLabel" accessibilityRole="text">
                  First name
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    isFocused && styles.inputFocused,
                    error ? styles.inputError : null,
                  ]}
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text);
                    setError('');
                  }}
                  placeholder="Your first name"
                  placeholderTextColor="#767676"
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoFocus
                  maxLength={30}
                  textContentType="givenName"
                  autoComplete="given-name"
                  returnKeyType="done"
                  onSubmitEditing={isValid ? handleContinue : undefined}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  accessibilityLabel="First name input"
                  accessibilityLabelledBy="nameLabel"
                  accessibilityHint="Enter your first name"
                />
              </View>

              {error ? (
                <Text
                  style={styles.errorText}
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                >
                  {error}
                </Text>
              ) : null}

              <Text style={styles.hint}>This can't be changed later, so make sure it's right</Text>
            </View>
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, !isValid && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={!isValid}
              accessibilityRole="button"
              accessibilityLabel="Continue"
              accessibilityState={{ disabled: !isValid }}
              accessibilityHint="Proceed to the next step"
            >
              <Text style={[styles.buttonText, !isValid && styles.buttonTextDisabled]}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  progressContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D62839', // Consistent with brand color
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#525252', // Improved contrast
    textAlign: 'center',
  },
  questionContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#525252', // Improved contrast
    marginBottom: 32,
    lineHeight: 22,
  },
  inputWrapper: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    borderBottomWidth: 2,
    borderBottomColor: '#ddd',
    paddingVertical: 12,
    minHeight: 52, // Minimum touch target
  },
  inputFocused: {
    borderBottomColor: '#D62839',
  },
  inputError: {
    borderBottomColor: '#D32F2F',
  },
  errorText: {
    fontSize: 14,
    color: '#D32F2F', // Improved contrast
    marginTop: 8,
    fontWeight: '500',
  },
  hint: {
    fontSize: 14,
    color: '#525252', // Improved contrast
    marginTop: 16,
    lineHeight: 20,
  },
  bottomSafeArea: {
    backgroundColor: '#fff',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    backgroundColor: '#D62839', // Consistent brand color
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52, // Minimum touch target
  },
  buttonDisabled: {
    backgroundColor: '#FFD4D4',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  buttonTextDisabled: {
    color: '#FFB3B3',
  },
});

export default NameScreen;
