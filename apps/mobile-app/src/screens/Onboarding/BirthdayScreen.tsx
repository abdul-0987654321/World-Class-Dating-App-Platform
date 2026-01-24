/**
 * Birthday Screen
 * Second step of onboarding - collect user's date of birth
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { OnboardingStackParamList } from './OnboardingNavigator';

type BirthdayScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Birthday'>;
type BirthdayScreenRouteProp = RouteProp<OnboardingStackParamList, 'Birthday'>;

interface Props {
  navigation: BirthdayScreenNavigationProp;
  route: BirthdayScreenRouteProp;
}

const BirthdayScreen: React.FC<Props> = ({ navigation, route }) => {
  const { name } = route.params;

  const getDefaultDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 25);
    return date;
  };

  const [date, setDate] = useState(getDefaultDate());
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [error, setError] = useState('');

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(date);
  const isValid = age >= 18 && age <= 100;

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
      const newAge = calculateAge(selectedDate);
      if (newAge < 18) {
        setError('You must be at least 18 years old');
      } else if (newAge > 100) {
        setError('Please enter a valid date of birth');
      } else {
        setError('');
      }
    }
  };

  const handleContinue = () => {
    if (!isValid) {
      setError('You must be at least 18 years old');
      return;
    }

    const birthday = date.toISOString().split('T')[0];
    navigation.navigate('Gender', { name, birthday });
  };

  const formatDate = (d: Date): string => {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);

  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <View
          style={styles.progressContainer}
          accessibilityRole="progressbar"
          accessibilityLabel="Step 2 of 12"
          accessibilityValue={{ min: 0, max: 12, now: 2 }}
        >
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '16%' }]} />
          </View>
          <Text style={styles.progressText}>2 of 12</Text>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Return to previous screen"
        >
          <Text
            style={styles.backButtonText}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            ←
          </Text>
        </TouchableOpacity>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.title} accessibilityRole="header">
            When's your birthday, {name}?
          </Text>
          <Text style={styles.subtitle}>Your age will be shown on your profile</Text>

          {Platform.OS === 'android' && (
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowPicker(true)}
              accessibilityRole="button"
              accessibilityLabel={`Birthday: ${formatDate(date)}. Tap to change`}
              accessibilityHint="Opens date picker"
            >
              <Text style={styles.dateButtonText}>{formatDate(date)}</Text>
            </TouchableOpacity>
          )}

          {showPicker && (
            <View style={styles.pickerContainer} accessibilityLabel="Date picker">
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={maxDate}
                minimumDate={minDate}
                textColor="#1A1A1A"
                accessibilityLabel="Select your birthday"
              />
            </View>
          )}

          {error ? (
            <Text
              style={styles.errorText}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              {error}
            </Text>
          ) : null}

          {isValid && (
            <View
              style={styles.ageDisplay}
              accessibilityRole="text"
              accessibilityLabel={`You're ${age} years old`}
            >
              <Text style={styles.ageText}>You're {age} years old</Text>
            </View>
          )}

          <Text style={styles.hint}>This can't be changed later. Make sure it's accurate.</Text>
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
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  progressContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D62839',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#525252', // Improved contrast
    textAlign: 'center',
  },
  backButton: {
    marginBottom: 20,
    minHeight: 44, // Minimum touch target
    minWidth: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#1A1A1A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
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
  dateButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    minHeight: 52, // Minimum touch target
  },
  dateButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#D32F2F', // Improved contrast
    marginTop: 8,
    fontWeight: '500',
  },
  ageDisplay: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  ageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E20', // Darker green for better contrast
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: '#525252', // Improved contrast
    marginTop: 24,
    lineHeight: 20,
  },
  bottomSafeArea: {
    backgroundColor: '#fff',
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    backgroundColor: '#D62839',
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

export default BirthdayScreen;
