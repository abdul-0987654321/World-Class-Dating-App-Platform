/**
 * Prompts Screen
 * Eighth step of onboarding - answer profile prompts
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from './OnboardingNavigator';

type PromptsScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Prompts'>;
type PromptsScreenRouteProp = RouteProp<OnboardingStackParamList, 'Prompts'>;

interface Props {
  navigation: PromptsScreenNavigationProp;
  route: PromptsScreenRouteProp;
}

interface Prompt {
  id: string;
  text: string;
  placeholder: string;
}

const PROMPTS: Prompt[] = [
  {
    id: 'ideal-sunday',
    text: 'My ideal Sunday looks like...',
    placeholder: 'Sleeping in, brunch with friends, evening walk in the park...',
  },
  {
    id: 'looking-for',
    text: "I'm looking for someone who...",
    placeholder: 'Loves to laugh, enjoys deep conversations, adventurous...',
  },
  {
    id: 'passionate-about',
    text: "I'm passionate about...",
    placeholder: 'Music, traveling, cooking, helping others...',
  },
  {
    id: 'fun-fact',
    text: 'A fun fact about me...',
    placeholder: 'I can speak 3 languages, I once skydived...',
  },
  {
    id: 'best-quality',
    text: 'My best quality is...',
    placeholder: 'My sense of humor, my empathy, my cooking skills...',
  },
  {
    id: 'perfect-date',
    text: 'My perfect first date would be...',
    placeholder: 'Coffee and a walk, a museum visit, dinner at a cozy restaurant...',
  },
  {
    id: 'deal-breaker',
    text: 'The way to my heart is...',
    placeholder: 'Making me laugh, thoughtful gestures, good food...',
  },
  {
    id: 'unpopular-opinion',
    text: 'An unpopular opinion I have...',
    placeholder: 'Pineapple belongs on pizza, mornings are the best...',
  },
];

const MIN_PROMPTS = 3;
const MAX_PROMPTS = 3;
const MIN_ANSWER_LENGTH = 20;
const MAX_ANSWER_LENGTH = 250;

const PromptsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { name, birthday, gender, interestedIn, photos, location, interests } = route.params;
  const [selectedPrompts, setSelectedPrompts] = useState<{ promptId: string; answer: string }[]>(
    []
  );
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');

  const getAnswer = (promptId: string) => {
    return selectedPrompts.find((p) => p.promptId === promptId)?.answer || '';
  };

  const selectPrompt = (promptId: string) => {
    const existingAnswer = getAnswer(promptId);
    setActivePrompt(promptId);
    setCurrentAnswer(existingAnswer);
  };

  const saveAnswer = () => {
    if (!activePrompt || currentAnswer.trim().length < MIN_ANSWER_LENGTH) return;

    const existing = selectedPrompts.filter((p) => p.promptId !== activePrompt);
    setSelectedPrompts([...existing, { promptId: activePrompt, answer: currentAnswer.trim() }]);
    setActivePrompt(null);
    setCurrentAnswer('');
  };

  const removePrompt = (promptId: string) => {
    setSelectedPrompts(selectedPrompts.filter((p) => p.promptId !== promptId));
  };

  const handleContinue = () => {
    if (selectedPrompts.length < MIN_PROMPTS) return;

    navigation.navigate('RelationshipGoals', {
      name,
      birthday,
      gender,
      interestedIn,
      photos,
      location,
      interests,
      prompts: selectedPrompts,
    });
  };

  const answeredPromptIds = selectedPrompts.map((p) => p.promptId);
  const canAddMore = selectedPrompts.length < MAX_PROMPTS;

  if (activePrompt) {
    const prompt = PROMPTS.find((p) => p.id === activePrompt)!;
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setActivePrompt(null);
              setCurrentAnswer('');
            }}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.promptText}>{prompt.text}</Text>

          <TextInput
            style={styles.answerInput}
            value={currentAnswer}
            onChangeText={setCurrentAnswer}
            placeholder={prompt.placeholder}
            placeholderTextColor="#999"
            multiline
            maxLength={MAX_ANSWER_LENGTH}
            autoFocus
          />

          <View style={styles.charCountContainer}>
            <Text
              style={[
                styles.charCount,
                currentAnswer.length < MIN_ANSWER_LENGTH && styles.charCountWarning,
              ]}
            >
              {currentAnswer.length} / {MAX_ANSWER_LENGTH}
            </Text>
            {currentAnswer.length < MIN_ANSWER_LENGTH && (
              <Text style={styles.minCharsText}>Minimum {MIN_ANSWER_LENGTH} characters</Text>
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.button,
                currentAnswer.trim().length < MIN_ANSWER_LENGTH && styles.buttonDisabled,
              ]}
              onPress={saveAnswer}
              disabled={currentAnswer.trim().length < MIN_ANSWER_LENGTH}
            >
              <Text
                style={[
                  styles.buttonText,
                  currentAnswer.trim().length < MIN_ANSWER_LENGTH && styles.buttonTextDisabled,
                ]}
              >
                Save Answer
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '67%' }]} />
          </View>
          <Text style={styles.progressText}>8 of 12</Text>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Tell us about yourself</Text>
        <Text style={styles.subtitle}>Answer {MIN_PROMPTS} prompts to show your personality</Text>

        <View style={styles.counterContainer}>
          <Text
            style={[
              styles.counterText,
              selectedPrompts.length >= MIN_PROMPTS && styles.counterTextValid,
            ]}
          >
            {selectedPrompts.length} / {MAX_PROMPTS} prompts answered
          </Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Show selected prompts first */}
          {selectedPrompts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your answers</Text>
              {selectedPrompts.map((item) => {
                const prompt = PROMPTS.find((p) => p.id === item.promptId)!;
                return (
                  <View key={item.promptId} style={styles.answeredCard}>
                    <Text style={styles.answeredPrompt}>{prompt.text}</Text>
                    <Text style={styles.answeredText}>{item.answer}</Text>
                    <View style={styles.answeredActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => selectPrompt(item.promptId)}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removePrompt(item.promptId)}
                      >
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Show available prompts */}
          {canAddMore && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Choose a prompt</Text>
              {PROMPTS.filter((p) => !answeredPromptIds.includes(p.id)).map((prompt) => (
                <TouchableOpacity
                  key={prompt.id}
                  style={styles.promptCard}
                  onPress={() => selectPrompt(prompt.id)}
                >
                  <Text style={styles.promptCardText}>{prompt.text}</Text>
                  <Text style={styles.promptArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, selectedPrompts.length < MIN_PROMPTS && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={selectedPrompts.length < MIN_PROMPTS}
          >
            <Text
              style={[
                styles.buttonText,
                selectedPrompts.length < MIN_PROMPTS && styles.buttonTextDisabled,
              ]}
            >
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
    fontSize: 18,
    color: '#1A1A1A',
    fontWeight: '500',
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    marginBottom: 10,
  },
  promptCardText: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  promptArrow: {
    fontSize: 18,
    color: '#FF6B6B',
    marginLeft: 8,
  },
  answeredCard: {
    padding: 16,
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    marginBottom: 12,
  },
  answeredPrompt: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
    marginBottom: 8,
  },
  answeredText: {
    fontSize: 16,
    color: '#1A1A1A',
    lineHeight: 22,
  },
  answeredActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#FF6B6B',
    borderRadius: 16,
  },
  editButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  removeButtonText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  promptText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 24,
    marginTop: 20,
  },
  answerInput: {
    flex: 1,
    fontSize: 18,
    color: '#1A1A1A',
    textAlignVertical: 'top',
    lineHeight: 26,
  },
  charCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  charCount: {
    fontSize: 14,
    color: '#999',
  },
  charCountWarning: {
    color: '#FF6B6B',
  },
  minCharsText: {
    fontSize: 12,
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

export default PromptsScreen;
