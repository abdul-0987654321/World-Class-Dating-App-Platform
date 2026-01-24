/**
 * Gender Screen
 * Third step of onboarding - select gender identity
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <View
          style={styles.progressContainer}
          accessibilityRole="progressbar"
          accessibilityLabel="Step 3 of 12"
          accessibilityValue={{ min: 0, max: 12, now: 3 }}
        >
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '25%' }]} />
          </View>
          <Text style={styles.progressText}>3 of 12</Text>
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
            What's your gender?
          </Text>
          <Text style={styles.subtitle}>This helps us show you to the right people</Text>

          <View
            style={styles.optionsContainer}
            accessibilityRole="radiogroup"
            accessibilityLabel="Gender options"
          >
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  selectedGender === option.id && styles.optionButtonSelected,
                ]}
                onPress={() => setSelectedGender(option.id)}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: selectedGender === option.id }}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedGender === option.id && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {selectedGender === option.id && (
                  <Text
                    style={styles.checkmark}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  >
                    ✓
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.toggleContainer}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleLabel} nativeID="showProfileLabel">
                Show on my profile
              </Text>
              <Text style={styles.toggleDescription}>Your gender will be visible to others</Text>
            </View>
            <Switch
              value={showOnProfile}
              onValueChange={setShowOnProfile}
              trackColor={{ false: '#E5E5E5', true: '#D62839' }}
              thumbColor="#fff"
              ios_backgroundColor="#E5E5E5"
              accessibilityLabel="Show gender on profile"
              accessibilityRole="switch"
              accessibilityState={{ checked: showOnProfile }}
              accessibilityHint="Toggle to show or hide your gender on your profile"
            />
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, !selectedGender && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={!selectedGender}
              accessibilityRole="button"
              accessibilityLabel="Continue"
              accessibilityState={{ disabled: !selectedGender }}
              accessibilityHint="Proceed to the next step"
            >
              <Text style={[styles.buttonText, !selectedGender && styles.buttonTextDisabled]}>
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
    marginBottom: 24,
    lineHeight: 22,
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
    minHeight: 56, // Ensures good touch target
  },
  optionButtonSelected: {
    borderColor: '#D62839',
    backgroundColor: '#FFF5F5',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  optionTextSelected: {
    color: '#D62839',
  },
  checkmark: {
    fontSize: 20,
    color: '#D62839',
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
    color: '#525252', // Improved contrast
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

export default GenderScreen;
