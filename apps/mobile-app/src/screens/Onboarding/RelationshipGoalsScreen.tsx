/**
 * Relationship Goals Screen
 * Ninth step of onboarding - select relationship goal
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

type RelationshipGoalsScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'RelationshipGoals'>;
type RelationshipGoalsScreenRouteProp = RouteProp<OnboardingStackParamList, 'RelationshipGoals'>;

interface Props {
  navigation: RelationshipGoalsScreenNavigationProp;
  route: RelationshipGoalsScreenRouteProp;
}

interface GoalOption {
  id: string;
  label: string;
  description: string;
  emoji: string;
}

const RELATIONSHIP_GOALS: GoalOption[] = [
  {
    id: 'long-term',
    label: 'Long-term relationship',
    description: 'Looking for something serious and committed',
    emoji: '💕',
  },
  {
    id: 'short-term',
    label: 'Short-term relationship',
    description: 'Open to seeing where things go',
    emoji: '🌟',
  },
  {
    id: 'casual',
    label: 'Something casual',
    description: 'Not looking for anything serious right now',
    emoji: '😊',
  },
  {
    id: 'friendship',
    label: 'New friends',
    description: 'Looking to expand my social circle',
    emoji: '🤝',
  },
  {
    id: 'not-sure',
    label: 'Still figuring it out',
    description: "I'll know it when I find it",
    emoji: '🤔',
  },
];

const RelationshipGoalsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { name, birthday, gender, interestedIn, photos, location, interests, prompts } = route.params;
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const handleContinue = () => {
    if (!selectedGoal) return;

    navigation.navigate('Lifestyle', {
      name,
      birthday,
      gender,
      interestedIn,
      photos,
      location,
      interests,
      prompts,
      relationshipGoal: selectedGoal,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '75%' }]} />
          </View>
          <Text style={styles.progressText}>9 of 12</Text>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>What are you looking for?</Text>
          <Text style={styles.subtitle}>
            This helps match you with people who want the same things
          </Text>

          <View style={styles.optionsContainer}>
            {RELATIONSHIP_GOALS.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.optionCard,
                  selectedGoal === goal.id && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedGoal(goal.id)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionEmoji}>{goal.emoji}</Text>
                  <View style={styles.optionTextContainer}>
                    <Text
                      style={[
                        styles.optionLabel,
                        selectedGoal === goal.id && styles.optionLabelSelected,
                      ]}
                    >
                      {goal.label}
                    </Text>
                    <Text style={styles.optionDescription}>
                      {goal.description}
                    </Text>
                  </View>
                </View>
                {selectedGoal === goal.id && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.hint}>
            You can change this later in your profile settings
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !selectedGoal && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!selectedGoal}
          >
            <Text style={[styles.buttonText, !selectedGoal && styles.buttonTextDisabled]}>
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
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  optionCardSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#FF6B6B',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
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

export default RelationshipGoalsScreen;
