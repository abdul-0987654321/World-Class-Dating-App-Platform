import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput as TextInputType,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import {
  AUTH_COLORS,
  AUTH_TYPOGRAPHY,
  AUTH_SPACING,
  AUTH_RADIUS,
  moderateScale,
} from '../../styles/auth.styles';

interface AgeGateProps {
  onVerified: (birthDate: string) => void;
}

export const AgeGate: React.FC<AgeGateProps> = ({ onVerified }) => {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');

  const dayRef = useRef<TextInputType>(null);
  const yearRef = useRef<TextInputType>(null);

  const handleMonthChange = (text: string) => {
    setMonth(text);
    if (text.length === 2) {
      dayRef.current?.focus();
    }
  };

  const handleDayChange = (text: string) => {
    setDay(text);
    if (text.length === 2) {
      yearRef.current?.focus();
    }
  };

  const handleSubmit = () => {
    if (!month || !day || !year) {
      Alert.alert('Error', 'Please enter your complete date of birth');
      return;
    }

    const paddedMonth = month.padStart(2, '0');
    const paddedDay = day.padStart(2, '0');
    const birthDate = year + '-' + paddedMonth + '-' + paddedDay;
    const age = calculateAge(new Date(birthDate));

    if (age < 18) {
      Alert.alert('Age Requirement', 'You must be 18 or older to use Flamoral.', [{ text: 'OK' }]);
      return;
    }

    onVerified(birthDate);
  };

  const isComplete = month.length >= 1 && day.length >= 1 && year.length === 4;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.container}>
          <Text style={styles.title} accessibilityRole="header">
            When's your birthday?
          </Text>
          <Text style={styles.subtitle}>You must be 18+ to use Flamoral</Text>

          <View
            style={styles.dateContainer}
            accessibilityRole="group"
            accessibilityLabel="Date of birth entry"
          >
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel} nativeID="monthLabel">
                Month
              </Text>
              <Input
                placeholder="MM"
                keyboardType="number-pad"
                maxLength={2}
                value={month}
                onChangeText={handleMonthChange}
                style={styles.dateInput}
                returnKeyType="next"
                accessibilityLabel="Month"
                accessibilityLabelledBy="monthLabel"
                accessibilityHint="Enter birth month as 2 digits"
              />
            </View>
            <Text
              style={styles.dateSeparator}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              /
            </Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel} nativeID="dayLabel">
                Day
              </Text>
              <Input
                ref={dayRef}
                placeholder="DD"
                keyboardType="number-pad"
                maxLength={2}
                value={day}
                onChangeText={handleDayChange}
                style={styles.dateInput}
                returnKeyType="next"
                accessibilityLabel="Day"
                accessibilityLabelledBy="dayLabel"
                accessibilityHint="Enter birth day as 2 digits"
              />
            </View>
            <Text
              style={styles.dateSeparator}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              /
            </Text>
            <View style={[styles.inputWrapper, styles.yearWrapper]}>
              <Text style={styles.inputLabel} nativeID="yearLabel">
                Year
              </Text>
              <Input
                ref={yearRef}
                placeholder="YYYY"
                keyboardType="number-pad"
                maxLength={4}
                value={year}
                onChangeText={setYear}
                style={styles.yearInput}
                returnKeyType="done"
                onSubmitEditing={isComplete ? handleSubmit : undefined}
                accessibilityLabel="Year"
                accessibilityLabelledBy="yearLabel"
                accessibilityHint="Enter birth year as 4 digits"
              />
            </View>
          </View>

          <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
            <View style={styles.footer}>
              <Button
                title="Continue"
                onPress={handleSubmit}
                fullWidth
                style={styles.button}
                disabled={!isComplete}
                accessibilityLabel="Continue"
                accessibilityHint="Verify your age and continue"
              />

              <Text style={styles.disclaimer} accessibilityRole="text">
                Your age will be public. Your birthday will not.
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

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
    padding: AUTH_SPACING.lg,
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
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: AUTH_SPACING.xl,
  },
  inputWrapper: {
    flex: 1,
  },
  yearWrapper: {
    flex: 1.5,
  },
  inputLabel: {
    fontSize: AUTH_TYPOGRAPHY.fontSize.xs,
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.semibold,
    color: AUTH_COLORS.text.secondary,
    marginBottom: AUTH_SPACING.xs,
    textAlign: 'center',
  },
  dateInput: {
    textAlign: 'center',
    minHeight: moderateScale(52),
  },
  yearInput: {
    textAlign: 'center',
    minHeight: moderateScale(52),
  },
  dateSeparator: {
    fontSize: AUTH_TYPOGRAPHY.fontSize['2xl'],
    color: AUTH_COLORS.text.secondary,
    marginHorizontal: AUTH_SPACING.sm,
    marginBottom: moderateScale(20),
  },
  bottomSafeArea: {
    marginTop: 'auto',
  },
  footer: {
    paddingTop: AUTH_SPACING.md,
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
});
