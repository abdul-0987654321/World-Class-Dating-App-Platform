import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Button } from '../common/Button';

export interface UserProfile {
  id: string;
  name: string;
  bio?: string;
  interests?: string[];
  answerPrompts?: { question: string; answer: string }[];
  messages?: { text: string }[];
}

export type PersonalityTrait =
  | 'openness'
  | 'conscientiousness'
  | 'extraversion'
  | 'agreeableness'
  | 'emotional_stability';

export interface PersonalityScore {
  trait: PersonalityTrait;
  score: number; // 0-100
  description: string;
}

export interface PersonalityInsight {
  type: 'strength' | 'compatibility' | 'conversation_tip' | 'warning';
  title: string;
  description: string;
  icon: string;
}

export interface PersonalityAnalysis {
  scores: PersonalityScore[];
  insights: PersonalityInsight[];
  overallSummary: string;
  compatibilityTips: string[];
  conversationSuggestions: string[];
}

interface PersonalityInsightsProps {
  profile: UserProfile;
  onAnalyzePersonality?: (profile: UserProfile) => Promise<PersonalityAnalysis>;
  showFullAnalysis?: boolean;
}

export const PersonalityInsights: React.FC<PersonalityInsightsProps> = ({
  profile,
  onAnalyzePersonality,
  showFullAnalysis = true,
}) => {
  const [analysis, setAnalysis] = useState<PersonalityAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    analyzePersonality();
  }, [profile.id]);

  const analyzePersonality = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let result: PersonalityAnalysis;

      if (onAnalyzePersonality) {
        result = await onAnalyzePersonality(profile);
      } else {
        result = await generateDefaultAnalysis(profile);
      }

      setAnalysis(result);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze personality');
      console.error('Personality analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDefaultAnalysis = async (profile: UserProfile): Promise<PersonalityAnalysis> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate scores based on profile content
    const bioLength = profile.bio?.length || 0;
    const interestCount = profile.interests?.length || 0;
    const promptCount = profile.answerPrompts?.length || 0;

    const scores: PersonalityScore[] = [
      {
        trait: 'openness',
        score: Math.min(40 + interestCount * 8 + promptCount * 5, 95),
        description: 'Openness to new experiences and ideas',
      },
      {
        trait: 'conscientiousness',
        score: Math.min(50 + (bioLength > 100 ? 20 : 0) + promptCount * 8, 90),
        description: 'Organization and goal-orientation',
      },
      {
        trait: 'extraversion',
        score: Math.min(45 + interestCount * 6 + (bioLength > 50 ? 15 : 0), 88),
        description: 'Sociability and enthusiasm',
      },
      {
        trait: 'agreeableness',
        score: Math.min(60 + (promptCount > 2 ? 15 : 0), 92),
        description: 'Friendliness and compassion',
      },
      {
        trait: 'emotional_stability',
        score: Math.min(55 + (bioLength > 80 ? 18 : 0), 87),
        description: 'Emotional resilience and stability',
      },
    ];

    const insights: PersonalityInsight[] = [
      {
        type: 'strength',
        title: 'Highly Engaging Profile',
        description: `${profile.name} has a well-developed profile showing genuine effort in self-presentation.`,
        icon: '⭐',
      },
      {
        type: 'compatibility',
        title: 'Good Communication Potential',
        description:
          'Profile indicates someone who values meaningful conversations and connection.',
        icon: '💬',
      },
      {
        type: 'conversation_tip',
        title: 'Ask About Interests',
        description: `${profile.name} seems passionate about their interests - great conversation starters!`,
        icon: '💡',
      },
    ];

    if (interestCount > 5) {
      insights.push({
        type: 'strength',
        title: 'Diverse Interests',
        description: 'Has a wide range of interests, suggesting an open and curious personality.',
        icon: '🌟',
      });
    }

    const compatibilityTips = [
      'Share your own interests to find common ground',
      'Ask open-ended questions about their passions',
      'Be authentic and genuine in your communication',
      'Show interest in their hobbies and experiences',
    ];

    const conversationSuggestions = [
      'Ask about their favorite interest or hobby',
      'Reference something specific from their profile',
      'Share a related experience of your own',
      'Be curious and ask follow-up questions',
    ];

    return {
      scores,
      insights,
      overallSummary: `${profile.name} appears to be an ${
        scores[2].score > 60 ? 'outgoing' : 'thoughtful'
      } and ${
        scores[3].score > 70 ? 'warm' : 'genuine'
      } person who values meaningful connections. Their profile suggests someone who is ${
        scores[0].score > 65 ? 'open to new experiences' : 'grounded'
      } and ${scores[1].score > 65 ? 'thoughtful' : 'spontaneous'}.`,
      compatibilityTips,
      conversationSuggestions,
    };
  };

  const getTraitLabel = (trait: PersonalityTrait): string => {
    switch (trait) {
      case 'openness':
        return 'Openness';
      case 'conscientiousness':
        return 'Conscientiousness';
      case 'extraversion':
        return 'Extraversion';
      case 'agreeableness':
        return 'Agreeableness';
      case 'emotional_stability':
        return 'Emotional Stability';
      default:
        return trait;
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 75) return '#4CAF50';
    if (score >= 50) return '#FF9800';
    return '#2196F3';
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const renderPersonalityScores = () => {
    if (!analysis) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personality Traits</Text>
        <View style={styles.scoresContainer}>
          {analysis.scores.map((score) => (
            <View key={score.trait} style={styles.scoreCard}>
              <View style={styles.scoreHeader}>
                <Text style={styles.scoreLabel}>{getTraitLabel(score.trait)}</Text>
                <Text style={[styles.scoreValue, { color: getScoreColor(score.score) }]}>
                  {score.score}%
                </Text>
              </View>
              <View style={styles.scoreBarContainer}>
                <View
                  style={[
                    styles.scoreBarFill,
                    {
                      width: `${score.score}%`,
                      backgroundColor: getScoreColor(score.score),
                    },
                  ]}
                />
              </View>
              <Text style={styles.scoreDescription}>{score.description}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderInsights = () => {
    if (!analysis) return null;

    const groupedInsights = {
      strength: analysis.insights.filter((i) => i.type === 'strength'),
      compatibility: analysis.insights.filter((i) => i.type === 'compatibility'),
      conversation_tip: analysis.insights.filter((i) => i.type === 'conversation_tip'),
      warning: analysis.insights.filter((i) => i.type === 'warning'),
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Insights</Text>
        <View style={styles.insightsContainer}>
          {analysis.insights.map((insight, index) => (
            <View
              key={index}
              style={[styles.insightCard, insight.type === 'warning' && styles.insightCardWarning]}
            >
              <Text style={styles.insightIcon}>{insight.icon}</Text>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDescription}>{insight.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderExpandableSection = (title: string, items: string[], sectionKey: string) => {
    const isExpanded = expandedSections.has(sectionKey);

    return (
      <View style={styles.section}>
        <TouchableOpacity style={styles.expandableHeader} onPress={() => toggleSection(sectionKey)}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandableContent}>
            {items.map((item, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.listBullet}>•</Text>
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E91E63" />
          <Text style={styles.loadingTitle}>Analyzing Personality</Text>
          <Text style={styles.loadingText}>
            Using AI to understand {profile.name}'s personality traits...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Analysis Failed</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Try Again"
            onPress={analyzePersonality}
            variant="outline"
            style={styles.retryButton}
          />
        </View>
      </View>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🧠</Text>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>AI Personality Insights</Text>
          <Text style={styles.headerSubtitle}>Understanding {profile.name}'s personality</Text>
        </View>
      </View>

      {/* Overall Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Overall Summary</Text>
        <Text style={styles.summaryText}>{analysis.overallSummary}</Text>
      </View>

      {/* Personality Scores */}
      {showFullAnalysis && renderPersonalityScores()}

      {/* Key Insights */}
      {renderInsights()}

      {/* Compatibility Tips */}
      {analysis.compatibilityTips.length > 0 &&
        renderExpandableSection('Compatibility Tips', analysis.compatibilityTips, 'compatibility')}

      {/* Conversation Suggestions */}
      {analysis.conversationSuggestions.length > 0 &&
        renderExpandableSection(
          'Conversation Starters',
          analysis.conversationSuggestions,
          'conversation'
        )}

      {/* Disclaimer */}
      <View style={styles.disclaimerCard}>
        <Text style={styles.disclaimerIcon}>ℹ️</Text>
        <Text style={styles.disclaimerText}>
          This analysis is based on AI interpretation of profile content and should be used as a
          conversation guide, not a definitive personality assessment.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 32,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
  },
  headerIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  // Summary
  summaryCard: {
    backgroundColor: '#E3F2FD',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
  },
  // Sections
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  // Scores
  scoresContainer: {
    gap: 16,
  },
  scoreCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scoreBarContainer: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreDescription: {
    fontSize: 13,
    color: '#666',
  },
  // Insights
  insightsContainer: {
    gap: 12,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  insightCardWarning: {
    borderLeftColor: '#FF9800',
  },
  insightIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  // Expandable Sections
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandIcon: {
    fontSize: 14,
    color: '#999',
  },
  expandableContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  listBullet: {
    fontSize: 16,
    color: '#E91E63',
    marginRight: 12,
    marginTop: 2,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  // Disclaimer
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  disclaimerIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#E65100',
    lineHeight: 18,
  },
});
