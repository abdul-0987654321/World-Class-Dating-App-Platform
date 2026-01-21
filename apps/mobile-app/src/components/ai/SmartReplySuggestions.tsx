import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

export interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
}

export interface SmartReply {
  id: string;
  text: string;
  tone: 'friendly' | 'flirty' | 'witty' | 'casual' | 'thoughtful';
  confidence: number;
}

interface SmartReplySuggestionsProps {
  conversationHistory: Message[];
  currentUserId: string;
  onGenerateReplies?: (messages: Message[]) => Promise<SmartReply[]>;
  onSelectReply: (reply: SmartReply) => void;
  maxSuggestions?: number;
  autoGenerate?: boolean;
}

export const SmartReplySuggestions: React.FC<SmartReplySuggestionsProps> = ({
  conversationHistory,
  currentUserId,
  onGenerateReplies,
  onSelectReply,
  maxSuggestions = 3,
  autoGenerate = true,
}) => {
  const [replies, setReplies] = useState<SmartReply[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (autoGenerate && shouldShowSuggestions()) {
      generateReplies();
    }
  }, [conversationHistory]);

  const shouldShowSuggestions = (): boolean => {
    if (conversationHistory.length === 0) return false;

    // Only show if last message is from the other person
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    return lastMessage.senderId !== currentUserId;
  };

  const generateReplies = async () => {
    setIsLoading(true);

    try {
      let generatedReplies: SmartReply[];

      if (onGenerateReplies) {
        generatedReplies = await onGenerateReplies(conversationHistory);
      } else {
        generatedReplies = await generateDefaultReplies(conversationHistory);
      }

      setReplies(generatedReplies.slice(0, maxSuggestions));
      setIsVisible(true);
    } catch (error) {
      console.error('Reply generation error:', error);
      setReplies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDefaultReplies = async (messages: Message[]): Promise<SmartReply[]> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (messages.length === 0) return [];

    const lastMessage = messages[messages.length - 1];
    const messageText = lastMessage.text.toLowerCase();
    const replies: SmartReply[] = [];

    // Question detection
    if (
      messageText.includes('?') ||
      messageText.startsWith('what') ||
      messageText.startsWith('how') ||
      messageText.startsWith('when') ||
      messageText.startsWith('where') ||
      messageText.startsWith('why')
    ) {
      replies.push({
        id: 'reply_1',
        text: "That's a great question! Let me think...",
        tone: 'thoughtful',
        confidence: 0.8,
      });
    }

    // Greeting detection
    if (
      messageText.includes('hi') ||
      messageText.includes('hello') ||
      messageText.includes('hey')
    ) {
      replies.push({
        id: 'reply_2',
        text: "Hey! How's your day going? 😊",
        tone: 'friendly',
        confidence: 0.9,
      });
    }

    // Compliment detection
    if (
      messageText.includes('nice') ||
      messageText.includes('cool') ||
      messageText.includes('great') ||
      messageText.includes('awesome')
    ) {
      replies.push({
        id: 'reply_3',
        text: 'Thanks! That means a lot 😊',
        tone: 'friendly',
        confidence: 0.85,
      });
    }

    // Plans/meetup detection
    if (
      messageText.includes('meet') ||
      messageText.includes('hang') ||
      messageText.includes('coffee') ||
      messageText.includes('dinner')
    ) {
      replies.push({
        id: 'reply_4',
        text: "I'd love to! When works best for you?",
        tone: 'casual',
        confidence: 0.88,
      });
    }

    // Flirty detection
    if (
      messageText.includes('cute') ||
      messageText.includes('handsome') ||
      messageText.includes('beautiful') ||
      messageText.includes('gorgeous')
    ) {
      replies.push({
        id: 'reply_5',
        text: "Well aren't you sweet! 😏",
        tone: 'flirty',
        confidence: 0.75,
      });
    }

    // Generic fallbacks
    replies.push(
      {
        id: 'generic_1',
        text: "Haha that's interesting! Tell me more",
        tone: 'casual',
        confidence: 0.7,
      },
      {
        id: 'generic_2',
        text: 'I love that! What made you think of it?',
        tone: 'thoughtful',
        confidence: 0.72,
      },
      {
        id: 'generic_3',
        text: "No way! That's so cool 😄",
        tone: 'friendly',
        confidence: 0.68,
      },
      {
        id: 'witty_1',
        text: 'Plot twist incoming... 😏',
        tone: 'witty',
        confidence: 0.65,
      }
    );

    // Return top suggestions sorted by confidence
    return replies.sort((a, b) => b.confidence - a.confidence);
  };

  const getToneColor = (tone: SmartReply['tone']): string => {
    switch (tone) {
      case 'friendly':
        return '#4CAF50';
      case 'flirty':
        return '#E91E63';
      case 'witty':
        return '#9C27B0';
      case 'casual':
        return '#2196F3';
      case 'thoughtful':
        return '#FF9800';
      default:
        return '#666';
    }
  };

  const getToneIcon = (tone: SmartReply['tone']): string => {
    switch (tone) {
      case 'friendly':
        return '😊';
      case 'flirty':
        return '😏';
      case 'witty':
        return '🎯';
      case 'casual':
        return '😎';
      case 'thoughtful':
        return '💭';
      default:
        return '💬';
    }
  };

  const handleSelectReply = (reply: SmartReply) => {
    onSelectReply(reply);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!shouldShowSuggestions() || (!isLoading && !isVisible)) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#E91E63" />
          <Text style={styles.loadingText}>Generating smart replies...</Text>
        </View>
      </View>
    );
  }

  if (replies.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>✨</Text>
          <Text style={styles.headerTitle}>Smart Replies</Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
          <Text style={styles.dismissButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.repliesScroll}
      >
        {replies.map((reply) => (
          <TouchableOpacity
            key={reply.id}
            style={styles.replyCard}
            onPress={() => handleSelectReply(reply)}
            activeOpacity={0.7}
          >
            <View style={styles.replyHeader}>
              <View style={[styles.toneBadge, { backgroundColor: getToneColor(reply.tone) }]}>
                <Text style={styles.toneIcon}>{getToneIcon(reply.tone)}</Text>
                <Text style={styles.toneLabel}>
                  {reply.tone.charAt(0).toUpperCase() + reply.tone.slice(1)}
                </Text>
              </View>
              <View style={styles.confidenceContainer}>
                <View
                  style={[
                    styles.confidenceDot,
                    {
                      backgroundColor:
                        reply.confidence >= 0.8
                          ? '#4CAF50'
                          : reply.confidence >= 0.6
                            ? '#FF9800'
                            : '#999',
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={styles.replyText}>{reply.text}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.regenerateCard} onPress={generateReplies}>
          <Text style={styles.regenerateIcon}>🔄</Text>
          <Text style={styles.regenerateText}>More</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Tap a suggestion to use it, or type your own message
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingVertical: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dismissButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonText: {
    fontSize: 14,
    color: '#999',
  },
  repliesScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  replyCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 12,
    minWidth: 200,
    maxWidth: 280,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  toneIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  toneLabel: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  replyText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  regenerateCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E91E63',
    borderStyle: 'dashed',
  },
  regenerateIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  regenerateText: {
    fontSize: 12,
    color: '#E91E63',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  footerText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
});
