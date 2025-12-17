/**
 * Interested In Screen
 * Fourth step of onboarding - select who you're interested in
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from './OnboardingNavigator';

type InterestedInScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'InterestedIn'>;
type InterestedInScreenRouteProp = RouteProp<OnboardingStackParamList, 'InterestedIn'>;

interface Props {
  navigation: InterestedInScreenNavigationProp;
  route: InterestedInScreenRouteProp;
}

interface InterestOption {
  id: string;
  label: string;
  icon: string;
}

const INTEREST_OPTIONS: InterestOption[] = [
  { id: 'men', label: 'Men', icon: '👨' },
  { id: 'women', label: 'Women', icon: '👩' },
  { id: 'everyone', label: 'Everyone', icon: '💜' },
];

const InterestedInScreen: React.FC<Props> = ({ navigation, route }) => {
  const { name, birthday, gender } = route.params;
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const toggleInterest = (id: string) => {
    if (id === 'everyone') {
      setSelectedInterests(['everyone']);
    } else {
      const newInterests = selectedInterests.filter(i => i !== 'everyone');
      if (newInterests.includes(id)) {
        setSelectedInterests(newInterests.filter(i => i !== id));
      } else {
        setSelectedInterests([...newInterests, id]);
      }
    }
  };

  const handleContinue = () => {
    if (selectedInterests.length === 0) return;
    navigation.navigate('PhotoUpload', {
      name,
      birthday,
      gender,
      interestedIn: selectedInterests,
    });
  };

  const isSelected = (id: string) => {
    if (id === 'everyone') return selectedInterests.includes('everyone');
    return selectedInterests.includes(id) || selectedInterests.includes('everyone');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '33%' }]} />
          </View>
          <Text style={styles.progressText}>4 of 12</Text>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.questionContainer}>
          <Text style={styles.title}>Who are you interested in?</Text>
          <Text style={styles.subtitle}>
            Select one or more options
          </Text>

          <View style={styles.optionsContainer}>
            {INTEREST_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  isSelected(option.id) && styles.optionButtonSelected,
                ]}
                onPress={() => toggleInterest(option.id)}
              >
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <Text
                  style={[
                    styles.optionText,
                    isSelected(option.id) && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.hint}>
            You can change this later in settings
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, selectedInterests.length === 0 && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={selectedInterests.length === 0}
          >
            <Text style={[styles.buttonText, selectedInterests.length === 0 && styles.buttonTextDisabled]}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 28,
    color: '#1A1A1A',
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
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  optionButtonSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  optionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  optionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  optionTextSelected: {
    color: '#FF6B6B',
  },
  hint: {
    fontSize: 14,
    color: '#999',
    marginTop: 24,
    textAlign: 'center',
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

export default InterestedInScreen;
