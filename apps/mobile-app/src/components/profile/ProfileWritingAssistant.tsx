import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';

// Types
export interface ProfileAnalysis {
  currentBio: string;
  wordCount: number;
  sentimentScore: number; // 0-1 (0=negative, 0.5=neutral, 1=positive)
  appealScore: number; // 0-100
  readabilityScore: number; // 0-100
  uniquenessScore: number; // 0-100
  issues: ProfileIssue[];
  strengths: string[];
  suggestions: BioSuggestion[];
}

export interface ProfileIssue {
  type: 'length' | 'tone' | 'cliche' | 'negative' | 'vague' | 'grammar';
  severity: 'low' | 'medium' | 'high';
  message: string;
  location?: { start: number; end: number };
}

export interface BioSuggestion {
  id: string;
  category: 'opener' | 'about_me' | 'interests' | 'values' | 'humor' | 'closer';
  text: string;
  tone: 'casual' | 'thoughtful' | 'witty' | 'sincere';
  appealScore: number;
  why: string;
}

interface ProfileWritingAssistantProps {
  currentBio: string;
  userProfile?: {
    age: number;
    occupation?: string;
    interests?: string[];
    location?: string;
  };
  onBioUpdate: (newBio: string) => void;
}

const ProfileWritingAssistant: React.FC<ProfileWritingAssistantProps> = ({
  currentBio,
  userProfile,
  onBioUpdate,
}) => {
  const [bio, setBio] = useState(currentBio);
  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<BioSuggestion | null>(null);

  useEffect(() => {
    if (bio && bio.length > 10) {
      const timer = setTimeout(() => {
        analyzeBio(bio);
      }, 1000); // Debounce

      return () => clearTimeout(timer);
    }
  }, [bio]);

  const analyzeBio = async (bioText: string) => {
    setLoading(true);
    try {
      const analysisResult = await performBioAnalysis(bioText, userProfile);
      setAnalysis(analysisResult);
    } catch (error) {
      console.error('Bio analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const performBioAnalysis = async (
    bioText: string,
    userProfile?: any
  ): Promise<ProfileAnalysis> => {
    // Word count
    const wordCount = bioText.trim().split(/\s+/).length;

    // Sentiment analysis (simplified)
    const sentimentScore = calculateSentiment(bioText);

    // Detect issues
    const issues: ProfileIssue[] = [];

    // Length check
    if (wordCount < 20) {
      issues.push({
        type: 'length',
        severity: 'high',
        message:
          'Your bio is too short. Aim for at least 20-30 words to give others a sense of who you are.',
      });
    } else if (wordCount > 150) {
      issues.push({
        type: 'length',
        severity: 'medium',
        message:
          'Your bio is quite long. Consider condensing to 100-150 words for better readability.',
      });
    }

    // Cliché detection
    const cliches = [
      'partner in crime',
      'work hard play hard',
      'love to laugh',
      'live life to the fullest',
      'looking for my other half',
      'no drama',
      'good vibes only',
      'adventure seeker',
    ];

    for (const cliche of cliches) {
      if (bioText.toLowerCase().includes(cliche)) {
        issues.push({
          type: 'cliche',
          severity: 'medium',
          message: `Avoid clichés like "${cliche}". Be more specific about what makes you unique.`,
        });
      }
    }

    // Negative language detection
    const negativeWords = ['hate', "don't", 'not looking for', 'no', 'avoid'];
    let negativeCount = 0;
    for (const word of negativeWords) {
      if (bioText.toLowerCase().includes(word)) {
        negativeCount++;
      }
    }

    if (negativeCount > 2) {
      issues.push({
        type: 'negative',
        severity: 'high',
        message:
          "Your bio contains negative language. Focus on what you like and who you are, not what you don't want.",
      });
    }

    // Vagueness check
    const vaguePhrases = ['i like stuff', 'i enjoy things', "i'm fun", "i'm nice", "i'm cool"];
    for (const phrase of vaguePhrases) {
      if (bioText.toLowerCase().includes(phrase)) {
        issues.push({
          type: 'vague',
          severity: 'medium',
          message:
            'Be more specific! Instead of vague phrases, share concrete details about your interests and personality.',
        });
      }
    }

    // Calculate scores
    const appealScore = calculateAppealScore(bioText, issues);
    const readabilityScore = calculateReadabilityScore(bioText);
    const uniquenessScore = calculateUniquenessScore(bioText, cliches);

    // Identify strengths
    const strengths: string[] = [];
    if (wordCount >= 30 && wordCount <= 100) strengths.push('Good bio length');
    if (sentimentScore > 0.6) strengths.push('Positive and upbeat tone');
    if (bioText.includes('?')) strengths.push('Engaging with questions');
    if (hasSpecificDetails(bioText)) strengths.push('Includes specific details');
    if (hasHumor(bioText)) strengths.push('Shows sense of humor');

    // Generate suggestions
    const suggestions = await generateBioSuggestions(userProfile);

    return {
      currentBio: bioText,
      wordCount,
      sentimentScore,
      appealScore,
      readabilityScore,
      uniquenessScore,
      issues,
      strengths,
      suggestions,
    };
  };

  const calculateSentiment = (text: string): number => {
    // Simplified sentiment analysis
    const positiveWords = [
      'love',
      'enjoy',
      'passionate',
      'excited',
      'happy',
      'great',
      'amazing',
      'wonderful',
    ];
    const negativeWords = ['hate', 'dislike', 'boring', 'bad', 'terrible', 'awful'];

    let score = 0.5; // neutral
    const lowerText = text.toLowerCase();

    positiveWords.forEach((word) => {
      if (lowerText.includes(word)) score += 0.05;
    });

    negativeWords.forEach((word) => {
      if (lowerText.includes(word)) score -= 0.1;
    });

    return Math.max(0, Math.min(1, score));
  };

  const calculateAppealScore = (text: string, issues: ProfileIssue[]): number => {
    let score = 70;

    // Deduct for issues
    issues.forEach((issue) => {
      if (issue.severity === 'high') score -= 15;
      else if (issue.severity === 'medium') score -= 8;
      else score -= 3;
    });

    // Bonus for positive elements
    if (hasSpecificDetails(text)) score += 10;
    if (hasHumor(text)) score += 10;
    if (text.includes('?')) score += 5;

    return Math.max(0, Math.min(100, score));
  };

  const calculateReadabilityScore = (text: string): number => {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = text.trim().split(/\s+/);
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);

    // Ideal: 15-20 words per sentence
    let score = 70;
    if (avgWordsPerSentence >= 15 && avgWordsPerSentence <= 20) {
      score = 90;
    } else if (avgWordsPerSentence < 10) {
      score = 60; // Too choppy
    } else if (avgWordsPerSentence > 25) {
      score = 55; // Too long
    }

    return score;
  };

  const calculateUniquenessScore = (text: string, cliches: string[]): number => {
    let score = 85;
    cliches.forEach((cliche) => {
      if (text.toLowerCase().includes(cliche)) {
        score -= 10;
      }
    });

    return Math.max(0, score);
  };

  const hasSpecificDetails = (text: string): boolean => {
    // Check for specific nouns, places, activities
    const specificPatterns = [
      /\b(hiking|running|yoga|painting|cooking|photography|traveling|reading)\b/i,
      /\b(pizza|coffee|sushi|wine|beer|tea)\b/i,
      /\b(mountains|beach|city|forest|desert)\b/i,
    ];

    return specificPatterns.some((pattern) => pattern.test(text));
  };

  const hasHumor = (text: string): boolean => {
    // Simple humor detection
    return (
      text.includes('😂') || text.includes('😄') || text.includes('haha') || text.includes('lol')
    );
  };

  const generateBioSuggestions = async (userProfile?: any): Promise<BioSuggestion[]> => {
    const suggestions: BioSuggestion[] = [];

    // Opener suggestions
    if (userProfile?.occupation) {
      suggestions.push({
        id: '1',
        category: 'opener',
        text: `${userProfile.occupation} by day, adventure enthusiast by weekend`,
        tone: 'casual',
        appealScore: 82,
        why: 'Shows work-life balance and hints at active lifestyle',
      });
    }

    suggestions.push({
      id: '2',
      category: 'opener',
      text: "Life's too short for bad coffee and boring conversations",
      tone: 'witty',
      appealScore: 85,
      why: 'Sets a fun, engaging tone and shows you value quality interactions',
    });

    // About me suggestions
    if (userProfile?.interests && userProfile.interests.length > 0) {
      const interests = userProfile.interests.slice(0, 3).join(', ');
      suggestions.push({
        id: '3',
        category: 'about_me',
        text: `You'll find me ${interests.toLowerCase()}, or planning my next adventure`,
        tone: 'casual',
        appealScore: 78,
        why: 'Specific interests make you more relatable and memorable',
      });
    }

    // Interests suggestions
    suggestions.push({
      id: '4',
      category: 'interests',
      text: 'Currently obsessed with: perfecting my homemade pasta recipe 🍝',
      tone: 'casual',
      appealScore: 83,
      why: 'Specific current interest gives instant conversation starter',
    });

    // Values suggestions
    suggestions.push({
      id: '5',
      category: 'values',
      text: "Believer in deep conversations, spontaneous road trips, and trying that new restaurant everyone's talking about",
      tone: 'sincere',
      appealScore: 87,
      why: 'Shows your values while remaining approachable',
    });

    // Humor suggestions
    suggestions.push({
      id: '6',
      category: 'humor',
      text: 'My superpower? Making people laugh at my terrible dad jokes 😄',
      tone: 'witty',
      appealScore: 81,
      why: 'Self-deprecating humor is endearing and shows confidence',
    });

    // Closer suggestions
    suggestions.push({
      id: '7',
      category: 'closer',
      text: "Let's grab coffee and see if we can make each other laugh?",
      tone: 'casual',
      appealScore: 84,
      why: "Direct call-to-action that's low-pressure and friendly",
    });

    suggestions.push({
      id: '8',
      category: 'closer',
      text: 'Swipe right if you want to debate whether pineapple belongs on pizza 🍕',
      tone: 'witty',
      appealScore: 86,
      why: 'Playful and creates immediate conversation topic',
    });

    return suggestions;
  };

  const applySuggestion = (suggestion: BioSuggestion) => {
    const newBio = bio ? `${bio}\n\n${suggestion.text}` : suggestion.text;
    setBio(newBio);
    onBioUpdate(newBio);
    setShowSuggestions(false);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bio Writing Assistant</Text>
        <Text style={styles.subtitle}>Get AI-powered suggestions to improve your profile</Text>
      </View>

      <View style={styles.editorContainer}>
        <TextInput
          style={styles.textInput}
          value={bio}
          onChangeText={setBio}
          placeholder="Write your bio here... (e.g., I'm passionate about hiking, trying new coffee shops, and..."
          multiline
          numberOfLines={8}
          maxLength={500}
          textAlignVertical="top"
        />

        <Text style={styles.characterCount}>{bio.length} / 500 characters</Text>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#ec4899" />
          <Text style={styles.loadingText}>Analyzing your bio...</Text>
        </View>
      )}

      {analysis && (
        <View style={styles.analysisContainer}>
          <Text style={styles.sectionTitle}>Analysis</Text>

          <View style={styles.scoresGrid}>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Appeal</Text>
              <Text style={[styles.scoreValue, { color: getScoreColor(analysis.appealScore) }]}>
                {analysis.appealScore}
              </Text>
            </View>

            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Readability</Text>
              <Text
                style={[styles.scoreValue, { color: getScoreColor(analysis.readabilityScore) }]}
              >
                {analysis.readabilityScore}
              </Text>
            </View>

            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Uniqueness</Text>
              <Text style={[styles.scoreValue, { color: getScoreColor(analysis.uniquenessScore) }]}>
                {analysis.uniquenessScore}
              </Text>
            </View>
          </View>

          {analysis.strengths.length > 0 && (
            <View style={styles.strengthsContainer}>
              <Text style={styles.strengthsTitle}>✅ Strengths</Text>
              {analysis.strengths.map((strength, index) => (
                <Text key={index} style={styles.strengthText}>
                  • {strength}
                </Text>
              ))}
            </View>
          )}

          {analysis.issues.length > 0 && (
            <View style={styles.issuesContainer}>
              <Text style={styles.issuesTitle}>⚠️ Suggestions for Improvement</Text>
              {analysis.issues.map((issue, index) => (
                <View
                  key={index}
                  style={[
                    styles.issueCard,
                    {
                      borderLeftColor:
                        issue.severity === 'high'
                          ? '#ef4444'
                          : issue.severity === 'medium'
                            ? '#f59e0b'
                            : '#3b82f6',
                    },
                  ]}
                >
                  <Text style={styles.issueMessage}>{issue.message}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.suggestionsButton} onPress={() => setShowSuggestions(true)}>
        <Text style={styles.suggestionsButtonText}>💡 Get Bio Suggestions</Text>
      </TouchableOpacity>

      <Modal
        visible={showSuggestions}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSuggestions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bio Suggestions</Text>
              <TouchableOpacity onPress={() => setShowSuggestions(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.suggestionsScroll}>
              {analysis?.suggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.id}
                  style={styles.suggestionCard}
                  onPress={() => setSelectedSuggestion(suggestion)}
                >
                  <View style={styles.suggestionHeader}>
                    <Text style={styles.suggestionCategory}>
                      {suggestion.category.replace('_', ' ').toUpperCase()}
                    </Text>
                    <Text style={styles.suggestionScore}>{suggestion.appealScore}%</Text>
                  </View>

                  <Text style={styles.suggestionText}>{suggestion.text}</Text>

                  <Text style={styles.suggestionWhy}>💡 {suggestion.why}</Text>

                  <TouchableOpacity
                    style={styles.applySuggestionButton}
                    onPress={() => applySuggestion(suggestion)}
                  >
                    <Text style={styles.applySuggestionText}>Add to Bio</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  editorContainer: {
    margin: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 150,
    backgroundColor: '#fff',
  },
  characterCount: {
    marginTop: 8,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  analysisContainer: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  scoresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  strengthsContainer: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  strengthsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 12,
  },
  strengthText: {
    fontSize: 14,
    color: '#047857',
    marginBottom: 6,
    lineHeight: 20,
  },
  issuesContainer: {
    marginBottom: 16,
  },
  issuesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  issueCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  issueMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  suggestionsButton: {
    margin: 16,
    backgroundColor: '#ec4899',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  suggestionsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
  },
  suggestionsScroll: {
    padding: 16,
  },
  suggestionCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  suggestionCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  suggestionScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  suggestionText: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
    lineHeight: 24,
  },
  suggestionWhy: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 18,
  },
  applySuggestionButton: {
    backgroundColor: '#ec4899',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  applySuggestionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ProfileWritingAssistant;
