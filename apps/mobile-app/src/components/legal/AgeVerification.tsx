import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';

interface AgeVerificationProps {
  visible: boolean;
  onVerified: (birthdate: Date) => void;
  onCancel: () => void;
}

const AgeVerification: React.FC<AgeVerificationProps> = ({ visible, onVerified, onCancel }) => {
  const [birthdate, setBirthdate] = useState<Date>(
    new Date(2000, 0, 1) // Default to Jan 1, 2000
  );
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const calculateAge = (date: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }

    return age;
  };

  const isEligible = calculateAge(birthdate) >= 18;

  const handleConfirm = () => {
    if (isEligible) {
      onVerified(birthdate);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (selectedDate) {
      setBirthdate(selectedDate);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Icon name="shield-checkmark" size={48} color="#FF6B6B" />
            <Text style={styles.title}>Age Verification Required</Text>
            <Text style={styles.subtitle}>You must be 18 years or older to use Flamoral</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>Select Your Birthdate</Text>

            {Platform.OS === 'android' && !showPicker && (
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowPicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Select birthdate"
              >
                <Text style={styles.dateButtonText}>{birthdate.toLocaleDateString()}</Text>
                <Icon name="calendar-outline" size={24} color="#FF6B6B" />
              </TouchableOpacity>
            )}

            {(Platform.OS === 'ios' || showPicker) && (
              <DateTimePicker
                value={birthdate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1924, 0, 1)}
              />
            )}

            <View
              style={[styles.ageIndicator, isEligible ? styles.ageEligible : styles.ageIneligible]}
            >
              <Icon
                name={isEligible ? 'checkmark-circle' : 'alert-circle'}
                size={20}
                color={isEligible ? '#34C759' : '#FF3B30'}
              />
              <Text style={[styles.ageText, { color: isEligible ? '#34C759' : '#FF3B30' }]}>
                Age: {calculateAge(birthdate)} years old
              </Text>
            </View>

            {!isEligible && (
              <View style={styles.warningBox}>
                <Icon name="information-circle" size={20} color="#FF9500" />
                <Text style={styles.warningText}>You must be 18 or older to continue</Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, !isEligible && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={!isEligible}
              accessibilityRole="button"
              accessibilityLabel="Confirm age"
              accessibilityState={{ disabled: !isEligible }}
            >
              <Text style={[styles.confirmButtonText, !isEligible && styles.buttonTextDisabled]}>
                Confirm
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            By continuing, you agree to our Terms of Service and confirm that you are 18 years or
            older.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000',
  },
  ageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  ageEligible: {
    backgroundColor: '#E8F5E9',
  },
  ageIneligible: {
    backgroundColor: '#FFEBEE',
  },
  ageText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#FF9500',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  confirmButton: {
    backgroundColor: '#FF6B6B',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  buttonTextDisabled: {
    color: '#8E8E93',
  },
  disclaimer: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
});

export default AgeVerification;
