import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Button } from '../common/Button';

export interface UserProfile {
  id: string;
  name: string;
  bio?: string;
  interests?: string[];
  occupation?: string;
  photos?: { url: string }[];
  answerPrompts?: { question: string; answer: string }[];
}

export interface ConversationStarter {
  id: string;
  text: string;
  type: 'question' | 'comment' | 'compliment' | 'playful';
  confidence: number; // 0-1 score
  reasoning?: string;
}

interface ConversationStarterGeneratorProps {
  profile: UserProfile;
  onGenerateStarters?: (profile: UserProfile) => Promise<ConversationStarter[]>;
  onSelectStarter: (starter: ConversationStarter) => void;
  maxSuggestions?: number;
}

export const ConversationStarterGenerator: React.FC<
  ConversationStarterGeneratorProps
> = ({
  profile,
  onGenerateStarters,
  onSelectStarter,
  maxSuggestions = 5,
}) => {
  const [starters, setStarters] = useState<ConversationStarter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    generateStarters();
  }, [profile.id]);

  const generateStarters = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let generatedStarters: ConversationStarter[];

      if (onGenerateStarters) {
        // Use custom generation function if provided
        generatedStarters = await onGenerateStarters(profile);
      } else {
        // Use built-in generation logic
        generatedStarters = await generateDefaultStarters(profile);
      }

      setStarters(generatedStarters.slice(0, maxSuggestions));
    } catch (err: any) {
      setError(err.message || 'Failed to generate conversation starters');
      console.error('Starter generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDefaultStarters = async (
    profile: UserProfile
  ): Promise<ConversationStarter[]> => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const starters: ConversationStarter[] = [];

    // Generate based on interests
    if (profile.interests && profile.interests.length > 0) {
      const randomInterest =
        profile.interests[Math.floor(Math.random() * profile.interests.length)];
      starters.push({
        id: 'interest_1',
        text: `I noticed you're into ${randomInterest}! What got you interested in that?`,
        type: 'question',
        confidence: 0.85,
        reasoning: `Based on shared interest: ${randomInterest}`,
      });
    }

    // Generate based on bio
    if (profile.bio && profile.bio.length > 20) {
      starters.push({
        id: 'bio_1',
        text: `Your bio caught my attention! ${profile.name}, what's been the highlight of your week?`,
        type: 'question',
        confidence: 0.75,
        reasoning: 'Generic friendly opener based on profile engagement',
      });
    }

    // Generate based on occupation
    if (profile.occupation) {
      starters.push({
        id: 'occupation_1',
        text: `${profile.occupation} sounds interesting! What's the best part about what you do?`,
        type: 'question',
        confidence: 0.8,
        reasoning: `Referencing occupation: ${profile.occupation}`,
      });
    }

    // Generate based on prompts
    if (profile.answerPrompts && profile.answerPrompts.length > 0) {
      const randomPrompt =
        profile.answerPrompts[
          Math.floor(Math.random() * profile.answerPrompts.length)
        ];
      starters.push({
        id: 'prompt_1',
        text: `I loved your answer about "${randomPrompt.question}"! Tell me more about that?`,
        type: 'comment',
        confidence: 0.9,
        reasoning: `Referenced prompt answer`,
      });
    }

    // Always include some safe generic options
    starters.push(
      {
        id: 'generic_1',
        text: `Hey ${profile.name}! What's been making you smile lately?`,
        type: 'question',
        confidence: 0.7,
        reasoning: 'Positive and friendly generic opener',
      },
      {
        id: 'generic_2',
        text: `Hi ${profile.name}! If you could travel anywhere right now, where would you go?`,
        type: 'question',
        confidence: 0.72,
        reasoning: 'Engaging travel-related question',
      },
      {
        id: 'playful_1',
        text: `${profile.name}! Quick question: pineapple on pizza - yay or nay? 🍕`,
        type: 'playful',
        confidence: 0.65,
        reasoning: 'Light-hearted icebreaker',
      }
    );

    // Sort by confidence and return
    return starters.sort((a, b) => b.confidence - a.confidence);
  };

  const getTypeIcon = (type: ConversationStarter['type']): string => {
    switch (type) {
      case 'question':
        return '❓';
      case 'comment':
        return '💬';
      case 'compliment':
        return '💫';
      case 'playful':
        return '😄';
      default:
        return '💭';
    }
  };

  const getTypeLabel = (type: ConversationStarter['type']): string => {
    switch (type) {
      case 'question':
        return 'Question';
      case 'comment':
        return 'Comment';
      case 'compliment':
        return 'Compliment';
      case 'playful':
        return 'Playful';
      default:
        return 'Suggestion';
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#4CAF50';
    if (confidence >= 0.6) return '#FF9800';
    return '#999';
  };

  const renderStarter = (starter: ConversationStarter) => (
    <TouchableOpacity
      key={starter.id}
      style={styles.starterCard}
      onPress={() => onSelectStarter(starter)}
      activeOpacity={0.7}
    >
      <View style={styles.starterHeader}>
        <View style={styles.starterType}>
          <Text style={styles.starterTypeIcon}>{getTypeIcon(starter.type)}</Text>
          <Text style={styles.starterTypeLabel}>{getTypeLabel(starter.type)}</Text>
        </View>
        <View style={styles.confidenceBadge}>
          <View
            style={[
              styles.confidenceDot,
              { backgroundColor: getConfidenceColor(starter.confidence) },
            ]}
          />
          <Text style={styles.confidenceText}>
            {Math.round(starter.confidence * 100)}%
          </Text>
        </View>
      </View>

      <Text style={styles.starterText}>{starter.text}</Text>

      {isExpanded && starter.reasoning && (
        <View style={styles.reasoningContainer}>
          <Text style={styles.reasoningLabel}>Why this works:</Text>
          <Text style={styles.reasoningText}>{starter.reasoning}</Text>
        </View>
      )}

      <View style={styles.starterActions}>
        <Text style={styles.useButton}>Use this →</Text>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E91E63" />
          <Text style={styles.loadingText}>
            Analyzing {profile.name}'s profile...
          </Text>
          <Text style={styles.loadingSubtext}>
            Creating personalized conversation starters
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Try Again"
            onPress={generateStarters}
            variant="outline"
            style={styles.retryButton}
          />
        </View>
      );
    }

    if (starters.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💭</Text>
          <Text style={styles.emptyTitle}>No suggestions yet</Text>
          <Text style={styles.emptyText}>
            Generate conversation starters based on {profile.name}'s profile
          </Text>
          <Button
            title="Generate Starters"
            onPress={generateStarters}
            style={styles.generateButton}
          />
        </View>
      );
    }

    return (
      <View style={styles.startersContainer}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerIcon}>✨</Text>
            <View>
              <Text style={styles.headerTitle}>AI-Generated Starters</Text>
              <Text style={styles.headerSubtitle}>
                {starters.length} personalized suggestions
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setIsExpanded(!isExpanded)}
            style={styles.expandButton}
          >
            <Text style={styles.expandButtonText}>
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.startersList}
          showsVerticalScrollIndicator={false}
        >
          {starters.map(renderStarter)}

          <Button
            title="Generate New Starters"
            onPress={generateStarters}
            variant="outline"
            icon="🔄"
            fullWidth
            style={styles.regenerateButton}
          />

          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>
              These starters are tailored to {profile.name}'s interests and
              profile. Choose one that feels natural to you!
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  return <View style={styles.container}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  generateButton: {
    paddingHorizontal: 32,
  },
  // Content
  startersContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  expandButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  expandButtonText: {
    fontSize: 12,
    color: '#E91E63',
    fontWeight: '500',
  },
  startersList: {
    flex: 1,
    padding: 16,
  },
  starterCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  starterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  starterType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starterTypeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  starterTypeLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  confidenceText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  starterText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
    marginBottom: 12,
  },
  reasoningContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  reasoningLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    marginBottom: 4,
  },
  reasoningText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  starterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  useButton: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '600',
  },
  regenerateButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  tipIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 20,
  },
});
