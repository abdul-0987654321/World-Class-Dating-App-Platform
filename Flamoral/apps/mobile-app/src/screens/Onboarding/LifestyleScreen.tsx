/**
 * Lifestyle Screen
 * Tenth step of onboarding - select lifestyle preferences
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList, OnboardingProfileData } from './OnboardingNavigator';

type LifestyleScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Lifestyle'>;
type LifestyleScreenRouteProp = RouteProp<OnboardingStackParamList, 'Lifestyle'>;

interface Props {
  navigation: LifestyleScreenNavigationProp;
  route: LifestyleScreenRouteProp;
}

interface LifestyleCategory {
  id: keyof Lifestyle;
  title: string;
  emoji: string;
  options: { id: string; label: string }[];
}

interface Lifestyle {
  smoking: string;
  drinking: string;
  exercise: string;
  diet: string;
  pets: string;
}

const LIFESTYLE_CATEGORIES: LifestyleCategory[] = [
  {
    id: 'smoking',
    title: 'Smoking',
    emoji: '🚬',
    options: [
      { id: 'never', label: 'Never' },
      { id: 'socially', label: 'Socially' },
      { id: 'regularly', label: 'Regularly' },
      { id: 'trying-to-quit', label: 'Trying to quit' },
    ],
  },
  {
    id: 'drinking',
    title: 'Drinking',
    emoji: '🍷',
    options: [
      { id: 'never', label: 'Never' },
      { id: 'socially', label: 'Socially' },
      { id: 'regularly', label: 'Regularly' },
      { id: 'sober', label: 'Sober' },
    ],
  },
  {
    id: 'exercise',
    title: 'Exercise',
    emoji: '💪',
    options: [
      { id: 'never', label: 'Never' },
      { id: 'sometimes', label: 'Sometimes' },
      { id: 'often', label: 'Often' },
      { id: 'daily', label: 'Daily' },
    ],
  },
  {
    id: 'diet',
    title: 'Diet',
    emoji: '🥗',
    options: [
      { id: 'omnivore', label: 'Omnivore' },
      { id: 'vegetarian', label: 'Vegetarian' },
      { id: 'vegan', label: 'Vegan' },
      { id: 'other', label: 'Other' },
    ],
  },
  {
    id: 'pets',
    title: 'Pets',
    emoji: '🐾',
    options: [
      { id: 'none', label: 'No pets' },
      { id: 'dog', label: 'Dog' },
      { id: 'cat', label: 'Cat' },
      { id: 'other', label: 'Other pets' },
    ],
  },
];

const LifestyleScreen: React.FC<Props> = ({ navigation, route }) => {
  const { name, birthday, gender, interestedIn, photos, location, interests, prompts, relationshipGoal } = route.params;

  const [lifestyle, setLifestyle] = useState<Lifestyle>({
    smoking: '',
    drinking: '',
    exercise: '',
    diet: '',
    pets: '',
  });

  const [expandedCategory, setExpandedCategory] = useState<string | null>('smoking');

  const selectOption = (category: keyof Lifestyle, optionId: string) => {
    setLifestyle({ ...lifestyle, [category]: optionId });

    // Auto-expand next category
    const currentIndex = LIFESTYLE_CATEGORIES.findIndex(c => c.id === category);
    if (currentIndex < LIFESTYLE_CATEGORIES.length - 1) {
      setExpandedCategory(LIFESTYLE_CATEGORIES[currentIndex + 1].id);
    } else {
      setExpandedCategory(null);
    }
  };

  const completedCount = Object.values(lifestyle).filter(v => v !== '').length;
  const isComplete = completedCount >= 3; // Require at least 3

  const handleContinue = () => {
    const profileData: OnboardingProfileData = {
      name,
      birthday,
      gender,
      interestedIn,
      photos,
      location,
      interests,
      prompts,
      relationshipGoal,
      lifestyle,
    };

    navigation.navigate('NotificationPermission', { profileData });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '83%' }]} />
          </View>
          <Text style={styles.progressText}>10 of 12</Text>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Your lifestyle</Text>
        <Text style={styles.subtitle}>
          Help others understand your lifestyle (optional but recommended)
        </Text>

        <View style={styles.counterContainer}>
          <Text style={[styles.counterText, isComplete && styles.counterTextValid]}>
            {completedCount} / {LIFESTYLE_CATEGORIES.length} answered
          </Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {LIFESTYLE_CATEGORIES.map((category) => {
            const isExpanded = expandedCategory === category.id;
            const selectedOption = lifestyle[category.id];
            const selectedLabel = category.options.find(o => o.id === selectedOption)?.label;

            return (
              <View key={category.id} style={styles.categoryContainer}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => setExpandedCategory(isExpanded ? null : category.id)}
                >
                  <View style={styles.categoryTitleContainer}>
                    <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                    <Text style={styles.categoryTitle}>{category.title}</Text>
                  </View>
                  {selectedLabel && !isExpanded && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>{selectedLabel}</Text>
                    </View>
                  )}
                  <Text style={styles.expandIcon}>{isExpanded ? '−' : '+'}</Text>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.optionsContainer}>
                    {category.options.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.optionButton,
                          selectedOption === option.id && styles.optionButtonSelected,
                        ]}
                        onPress={() => selectOption(category.id, option.id)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            selectedOption === option.id && styles.optionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleContinue}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, !isComplete && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!isComplete}
          >
            <Text style={[styles.buttonText, !isComplete && styles.buttonTextDisabled]}>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  counterContainer: {
    marginBottom: 16,
  },
  counterText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  counterTextValid: {
    color: '#4CAF50',
  },
  scrollView: {
    flex: 1,
  },
  categoryContainer: {
    marginBottom: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  selectedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  selectedBadgeText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  expandIcon: {
    fontSize: 24,
    color: '#999',
    fontWeight: '300',
  },
  optionsContainer: {
    padding: 12,
    paddingTop: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  optionButtonSelected: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FF6B6B',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  optionTextSelected: {
    color: '#FF6B6B',
  },
  footer: {
    paddingBottom: 24,
    paddingTop: 12,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
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

export default LifestyleScreen;
