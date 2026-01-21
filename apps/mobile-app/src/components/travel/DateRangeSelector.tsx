import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

interface DateRangeSelectorProps {
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  minimumDate?: Date;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minimumDate = new Date(),
}) => {
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }

    if (selectedDate) {
      setTempStartDate(selectedDate);
      if (Platform.OS === 'android') {
        onStartDateChange(selectedDate);
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }

    if (selectedDate) {
      setTempEndDate(selectedDate);
      if (Platform.OS === 'android') {
        onEndDateChange(selectedDate);
      }
    }
  };

  const confirmStartDate = () => {
    onStartDateChange(tempStartDate);
    setShowStartPicker(false);
  };

  const confirmEndDate = () => {
    onEndDateChange(tempEndDate);
    setShowEndPicker(false);
  };

  const renderIOSModal = (
    visible: boolean,
    onClose: () => void,
    onConfirm: () => void,
    date: Date,
    onChange: (event: any, date?: Date) => void,
    title: string
  ) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onConfirm}>
              <Text style={styles.modalConfirmText}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            onChange={onChange}
            minimumDate={minimumDate}
            textColor="#333"
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Travel Dates</Text>

      <View style={styles.dateContainer}>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
          <Icon name="calendar-start" size={20} color="#FF6B6B" />
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateLabel}>Check-in</Text>
            <Text style={styles.dateValue}>{format(startDate, 'MMM dd, yyyy')}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.dateArrow}>
          <Icon name="arrow-right" size={24} color="#ccc" />
        </View>

        <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
          <Icon name="calendar-end" size={20} color="#FF6B6B" />
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateLabel}>Check-out</Text>
            <Text style={styles.dateValue}>{format(endDate, 'MMM dd, yyyy')}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {Platform.OS === 'ios' ? (
        <>
          {renderIOSModal(
            showStartPicker,
            () => setShowStartPicker(false),
            confirmStartDate,
            tempStartDate,
            handleStartDateChange,
            'Select Check-in Date'
          )}
          {renderIOSModal(
            showEndPicker,
            () => setShowEndPicker(false),
            confirmEndDate,
            tempEndDate,
            handleEndDateChange,
            'Select Check-out Date'
          )}
        </>
      ) : (
        <>
          {showStartPicker && (
            <DateTimePicker
              value={tempStartDate}
              mode="date"
              display="default"
              onChange={handleStartDateChange}
              minimumDate={minimumDate}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={tempEndDate}
              mode="date"
              display="default"
              onChange={handleEndDateChange}
              minimumDate={startDate}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dateArrow: {
    paddingHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#999',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
});
