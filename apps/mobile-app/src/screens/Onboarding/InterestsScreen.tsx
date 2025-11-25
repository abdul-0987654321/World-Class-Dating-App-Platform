/**
 * Interests Screen
 * Seventh step of onboarding - select interests/hobbies
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
import { OnboardingStackParamList } from './OnboardingNavigator';

type InterestsScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Interests'>;
type InterestsScreenRouteProp = RouteProp<OnboardingStackParamList, 'Interests'>;

interface Props {
  navigation: InterestsScreenNavigationProp;
  route: InterestsScreenRouteProp;
}

interface Interest {
  id: string;
  label: string;
  emoji: string;
  category: string;
}

const INTERESTS: Interest[] = [
  // Sports & Fitness
  { id: 'gym', label: 'Gym', emoji: '💪', category: 'fitness' },
  { id: 'yoga', label: 'Yoga', emoji: '🧘', category: 'fitness' },
  { id: 'running', label: 'Running', emoji: '🏃', category: 'fitness' },
  { id: 'hiking', label: 'Hiking', emoji: '🥾', category: 'fitness' },
  { id: 'swimming', label: 'Swimming', emoji: '🏊', category: 'fitness' },
  { id: 'cycling', label: 'Cycling', emoji: '🚴', category: 'fitness' },

  // Arts & Culture
  { id: 'photography', label: 'Photography', emoji: '📷', category: 'arts' },
  { id: 'art', label: 'Art', emoji: '🎨', category: 'arts' },
  { id: 'music', label: 'Music', emoji: '🎵', category: 'arts' },
  { id: 'dancing', label: 'Dancing', emoji: '💃', category: 'arts' },
  { id: 'writing', label: 'Writing', emoji: '✍️', category: 'arts' },
  { id: 'theater', label: 'Theater', emoji: '🎭', category: 'arts' },

  // Food & Drink
  { id: 'cooking', label: 'Cooking', emoji: '👨‍🍳', category: 'food' },
  { id: 'coffee', label: 'Coffee', emoji: '☕', category: 'food' },
  { id: 'wine', label: 'Wine', emoji: '🍷', category: 'food' },
  { id: 'foodie', label: 'Foodie', emoji: '🍕', category: 'food' },
  { id: 'brunch', label: 'Brunch', emoji: '🥞', category: 'food' },
  { id: 'baking', label: 'Baking', emoji: '🧁', category: 'food' },

  // Entertainment
  { id: 'movies', label: 'Movies', emoji: '🎬', category: 'entertainment' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮', category: 'entertainment' },
  { id: 'reading', label: 'Reading', emoji: '📚', category: 'entertainment' },
  { id: 'netflix', label: 'Netflix', emoji: '📺', category: 'entertainment' },
  { id: 'podcasts', label: 'Podcasts', emoji: '🎧', category: 'entertainment' },
  { id: 'concerts', label: 'Concerts', emoji: '🎤', category: 'entertainment' },

  // Travel & Outdoors
  { id: 'travel', label: 'Travel', emoji: '✈️', category: 'travel' },
  { id: 'beach', label: 'Beach', emoji: '🏖️', category: 'travel' },
  { id: 'camping', label: 'Camping', emoji: '⛺', category: 'travel' },
  { id: 'road-trips', label: 'Road Trips', emoji: '🚗', category: 'travel' },
  { id: 'nature', label: 'Nature', emoji: '🌲', category: 'travel' },
  { id: 'surfing', label: 'Surfing', emoji: '🏄', category: 'travel' },

  // Social
  { id: 'parties', label: 'Parties', emoji: '🎉', category: 'social' },
  { id: 'volunteering', label: 'Volunteering', emoji: '🤝', category: 'social' },
  { id: 'dog-lover', label: 'Dog Lover', emoji: '🐕', category: 'social' },
  { id: 'cat-lover', label: 'Cat Lover', emoji: '🐱', category: 'social' },
  { id: 'spirituality', label: 'Spirituality', emoji: '🙏', category: 'social' },
  { id: 'astrology', label: 'Astrology', emoji: '♈', category: 'social' },
];

const MIN_INTERESTS = 5;
const MAX_INTERESTS = 15;

const InterestsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { name, birthday, gender, interestedIn, photos, location } = route.params;
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const toggleInterest = (id: string) => {
    if (selectedInterests.includes(id)) {
      setSelectedInterests(selectedInterests.filter(i => i !== id));
    } else if (selectedInterests.length < MAX_INTERESTS) {
      setSelectedInterests([...selectedInterests, id]);
    }
  };

  const handleContinue = () => {
    if (selectedInterests.length < MIN_INTERESTS) return;

    navigation.navigate('Prompts', {
      name,
      birthday,
      gender,
      interestedIn,
      photos,
      location,
      interests: selectedInterests,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '58%' }]} />
          </View>
          <Text style={styles.progressText}>7 of 12</Text>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>What are you into?</Text>
        <Text style={styles.subtitle}>
          Select at least {MIN_INTERESTS} interests to help us find your matches
        </Text>

        <View style={styles.counterContainer}>
          <Text style={[
            styles.counterText,
            selectedInterests.length >= MIN_INTERESTS && styles.counterTextValid
          ]}>
            {selectedInterests.length} / {MAX_INTERESTS} selected
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.interestsGrid}>
            {INTERESTS.map((interest) => {
              const isSelected = selectedInterests.includes(interest.id);
              return (
                <TouchableOpacity
                  key={interest.id}
                  style={[
                    styles.interestChip,
                    isSelected && styles.interestChipSelected,
                  ]}
                  onPress={() => toggleInterest(interest.id)}
                >
                  <Text style={styles.interestEmoji}>{interest.emoji}</Text>
                  <Text
                    style={[
                      styles.interestLabel,
                      isSelected && styles.interestLabelSelected,
                    ]}
                  >
                    {interest.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, selectedInterests.length < MIN_INTERESTS && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={selectedInterests.length < MIN_INTERESTS}
          >
            <Text style={[styles.buttonText, selectedInterests.length < MIN_INTERESTS && styles.buttonTextDisabled]}>
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
  scrollContent: {
    paddingBottom: 16,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  interestChipSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  interestEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  interestLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  interestLabelSelected: {
    color: '#FF6B6B',
  },
  footer: {
    paddingBottom: 24,
    paddingTop: 12,
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

export default InterestsScreen;
