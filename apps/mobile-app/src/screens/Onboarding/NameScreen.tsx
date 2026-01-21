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
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from './OnboardingNavigator';

type NameScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Name'>;

interface Props {
  navigation: NameScreenNavigationProp;
}

const NameScreen: React.FC<Props> = ({ navigation }) => {
  const [firstName, setFirstName] = useState('');
  const [error, setError] = useState('');

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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '8%' }]} />
          </View>
          <Text style={styles.progressText}>1 of 12</Text>
        </View>

        <View style={styles.questionContainer}>
          <Text style={styles.title}>What's your first name?</Text>
          <Text style={styles.subtitle}>This is how you'll appear on Heartly</Text>

          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={firstName}
            onChangeText={(text) => {
              setFirstName(text);
              setError('');
            }}
            placeholder="Your first name"
            placeholderTextColor="#999"
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            maxLength={30}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.hint}>This can't be changed later, so make sure it's right</Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!isValid}
          >
            <Text style={[styles.buttonText, !isValid && styles.buttonTextDisabled]}>Continue</Text>
          </TouchableOpacity>
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
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#999',
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
    color: '#666',
    marginBottom: 32,
  },
  input: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
    paddingVertical: 12,
    marginBottom: 8,
  },
  inputError: {
    borderBottomColor: '#FF4444',
  },
  errorText: {
    fontSize: 14,
    color: '#FF4444',
    marginTop: 4,
  },
  hint: {
    fontSize: 14,
    color: '#999',
    marginTop: 16,
  },
  footer: {
    paddingBottom: 24,
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
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
