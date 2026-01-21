/**
 * Gender Screen
 * Third step of onboarding - select gender identity
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from './OnboardingNavigator';

type GenderScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Gender'>;
type GenderScreenRouteProp = RouteProp<OnboardingStackParamList, 'Gender'>;

interface Props {
  navigation: GenderScreenNavigationProp;
  route: GenderScreenRouteProp;
}

interface GenderOption {
  id: string;
  label: string;
  description?: string;
}

const GENDER_OPTIONS: GenderOption[] = [
  { id: 'man', label: 'Man' },
  { id: 'woman', label: 'Woman' },
  { id: 'non-binary', label: 'Non-binary' },
  { id: 'transgender-man', label: 'Transgender Man' },
  { id: 'transgender-woman', label: 'Transgender Woman' },
  { id: 'other', label: 'Other' },
  { id: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const GenderScreen: React.FC<Props> = ({ navigation, route }) => {
  const { name, birthday } = route.params;
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [showOnProfile, setShowOnProfile] = useState(true);

  const handleContinue = () => {
    if (!selectedGender) return;
    navigation.navigate('InterestedIn', { name, birthday, gender: selectedGender });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '25%' }]} />
          </View>
          <Text style={styles.progressText}>3 of 12</Text>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>What's your gender?</Text>
          <Text style={styles.subtitle}>This helps us show you to the right people</Text>

          <View style={styles.optionsContainer}>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  selectedGender === option.id && styles.optionButtonSelected,
                ]}
                onPress={() => setSelectedGender(option.id)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedGender === option.id && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {selectedGender === option.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.toggleContainer}
            onPress={() => setShowOnProfile(!showOnProfile)}
          >
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleLabel}>Show on my profile</Text>
              <Text style={styles.toggleDescription}>Your gender will be visible to others</Text>
            </View>
            <View style={[styles.toggle, showOnProfile && styles.toggleActive]}>
              <View style={[styles.toggleKnob, showOnProfile && styles.toggleKnobActive]} />
            </View>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !selectedGender && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!selectedGender}
          >
            <Text style={[styles.buttonText, !selectedGender && styles.buttonTextDisabled]}>
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
  scrollView: {
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
    marginBottom: 24,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    marginBottom: 12,
  },
  optionButtonSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  optionTextSelected: {
    color: '#FF6B6B',
  },
  checkmark: {
    fontSize: 20,
    color: '#FF6B6B',
    fontWeight: '700',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    marginTop: 8,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
    color: '#666',
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E5E5',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#FF6B6B',
  },
  toggleKnob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
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

export default GenderScreen;
