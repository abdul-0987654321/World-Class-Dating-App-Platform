import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

interface AgeGateProps {
  onVerified: (birthDate: string) => void;
}

export const AgeGate: React.FC<AgeGateProps> = ({ onVerified }) => {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');

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
      Alert.alert(
        'Age Requirement',
        'You must be 18 or older to use Flamoral.',
        [{ text: 'OK' }]
      );
      return;
    }

    onVerified(birthDate);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>When's your birthday?</Text>
      <Text style={styles.subtitle}>You must be 18+ to use Flamoral</Text>

      <View style={styles.dateContainer}>
        <Input
          placeholder="MM"
          keyboardType="number-pad"
          maxLength={2}
          value={month}
          onChangeText={setMonth}
          style={styles.dateInput}
        />
        <Text style={styles.dateSeparator}>/</Text>
        <Input
          placeholder="DD"
          keyboardType="number-pad"
          maxLength={2}
          value={day}
          onChangeText={setDay}
          style={styles.dateInput}
        />
        <Text style={styles.dateSeparator}>/</Text>
        <Input
          placeholder="YYYY"
          keyboardType="number-pad"
          maxLength={4}
          value={year}
          onChangeText={setYear}
          style={styles.yearInput}
        />
      </View>

      <Button
        title="Continue"
        onPress={handleSubmit}
        fullWidth
        style={styles.button}
      />

      <Text style={styles.disclaimer}>
        Your age will be public. Your birthday will not.
      </Text>
    </View>
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

const styles = StyleSheet.create({
  container: {
    padding: 24,
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
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  dateInput: {
    flex: 1,
    textAlign: 'center',
  },
  yearInput: {
    flex: 1.5,
    textAlign: 'center',
  },
  dateSeparator: {
    fontSize: 24,
    color: '#999',
    marginHorizontal: 8,
  },
  button: {
    marginBottom: 16,
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
