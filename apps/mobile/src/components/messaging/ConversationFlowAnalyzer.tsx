import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export interface ConversationHealth {
  overall_score: number; // 0-100
  engagement_level: 'high' | 'medium' | 'low' | 'declining';
  momentum: 'building' | 'stable' | 'slowing' | 'stalled';
  balance_score: number; // 0-100 (message balance between users)
  response_quality: 'excellent' | 'good' | 'fair' | 'poor';
  red_flags: string[];
  green_flags: string[];
  recommendations: string[];
  next_best_action: string;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
}

interface ConversationFlowAnalyzerProps {
  matchId: string;
  messages: Message[];
  currentUserId: string;
  onActionSuggestion?: (action: string) => void;
}

const ConversationFlowAnalyzer: React.FC<ConversationFlowAnalyzerProps> = ({
  matchId,
  messages,
  currentUserId,
  onActionSuggestion,
}) => {
  const [health, setHealth] = useState<ConversationHealth | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (messages.length > 0) {
      analyzeConversation();
    }
  }, [messages]);

  const analyzeConversation = () => {
    // Calculate message statistics
    const userMessages = messages.filter(m => m.senderId === currentUserId);
    const partnerMessages = messages.filter(m => m.senderId !== currentUserId);

    // Balance score
    const balance_score = calculateBalanceScore(userMessages.length, partnerMessages.length);

    // Engagement level
    const engagement_level = calculateEngagement(messages);

    // Momentum
    const momentum = calculateMomentum(messages);

    // Response quality
    const response_quality = calculateResponseQuality(messages, currentUserId);

    // Detect flags
    const red_flags = detectRedFlags(messages, currentUserId);
    const green_flags = detectGreenFlags(messages, currentUserId);

    // Overall score
    const overall_score = calculateOverallScore({
      balance_score,
      engagement_level,
      momentum,
      response_quality,
      red_flags_count: red_flags.length,
      green_flags_count: green_flags.length,
    });

    // Generate recommendations
    const recommendations = generateRecommendations({
      balance_score,
      engagement_level,
      momentum,
      response_quality,
      red_flags,
      green_flags,
    });

    // Next best action
    const next_best_action = determineNextBestAction({
      momentum,
      engagement_level,
      lastMessage: messages[messages.length - 1],
      currentUserId,
    });

    setHealth({
      overall_score,
      engagement_level,
      momentum,
      balance_score,
      response_quality,
      red_flags,
      green_flags,
      recommendations,
      next_best_action,
    });
  };

  const calculateBalanceScore = (userCount: number, partnerCount: number): number => {
    if (userCount === 0 || partnerCount === 0) return 0;
    const ratio = Math.min(userCount, partnerCount) / Math.max(userCount, partnerCount);
    return Math.round(ratio * 100);
  };

  const calculateEngagement = (messages: Message[]): 'high' | 'medium' | 'low' | 'declining' => {
    if (messages.length < 5) return 'low';

    const avgMessageLength = messages.reduce((sum, m) => sum + m.text.length, 0) / messages.length;
    const hasQuestions = messages.some(m => m.text.includes('?'));

    // Check recent trend
    const recentMessages = messages.slice(-10);
    const olderMessages = messages.slice(Math.max(0, messages.length - 20), -10);

    const recentAvg = recentMessages.reduce((sum, m) => sum + m.text.length, 0) / recentMessages.length;
    const olderAvg = olderMessages.length > 0
      ? olderMessages.reduce((sum, m) => sum + m.text.length, 0) / olderMessages.length
      : recentAvg;

    if (recentAvg < olderAvg * 0.7) return 'declining';
    if (avgMessageLength > 100 && hasQuestions) return 'high';
    if (avgMessageLength > 50) return 'medium';
    return 'low';
  };

  const calculateMomentum = (messages: Message[]): 'building' | 'stable' | 'slowing' | 'stalled' => {
    if (messages.length < 3) return 'building';

    const now = new Date().getTime();
    const lastMessage = messages[messages.length - 1].timestamp.getTime();
    const hoursSinceLastMessage = (now - lastMessage) / (1000 * 60 * 60);

    if (hoursSinceLastMessage > 48) return 'stalled';
    if (hoursSinceLastMessage > 24) return 'slowing';

    // Check message frequency trend
    const recentGaps = messages.slice(-5).map((m, i, arr) => {
      if (i === 0) return 0;
      return m.timestamp.getTime() - arr[i - 1].timestamp.getTime();
    });

    const avgGap = recentGaps.reduce((sum, g) => sum + g, 0) / recentGaps.length;

    if (avgGap < 1000 * 60 * 30) return 'building'; // < 30 min average
    if (avgGap < 1000 * 60 * 60 * 3) return 'stable'; // < 3 hours
    return 'slowing';
  };

  const calculateResponseQuality = (
    messages: Message[],
    userId: string
  ): 'excellent' | 'good' | 'fair' | 'poor' => {
    const partnerMessages = messages.filter(m => m.senderId !== userId);

    if (partnerMessages.length === 0) return 'poor';

    const avgLength = partnerMessages.reduce((sum, m) => sum + m.text.length, 0) / partnerMessages.length;
    const hasQuestions = partnerMessages.some(m => m.text.includes('?'));
    const oneWordReplies = partnerMessages.filter(m => m.text.split(' ').length <= 2).length;
    const oneWordRatio = oneWordReplies / partnerMessages.length;

    if (avgLength > 80 && hasQuestions && oneWordRatio < 0.2) return 'excellent';
    if (avgLength > 50 && oneWordRatio < 0.4) return 'good';
    if (avgLength > 20 && oneWordRatio < 0.6) return 'fair';
    return 'poor';
  };

  const detectRedFlags = (messages: Message[], userId: string): string[] => {
    const flags: string[] = [];

    const userMessages = messages.filter(m => m.senderId === userId);
    const partnerMessages = messages.filter(m => m.senderId !== userId);

    // One-sided conversation
    if (userMessages.length > partnerMessages.length * 2) {
      flags.push('You\'re sending significantly more messages');
    }

    // Short responses
    const partnerAvgLength = partnerMessages.length > 0
      ? partnerMessages.reduce((sum, m) => sum + m.text.length, 0) / partnerMessages.length
      : 0;

    if (partnerAvgLength < 20 && partnerMessages.length > 5) {
      flags.push('They\'re giving very short responses');
    }

    // No questions from partner
    const partnerQuestions = partnerMessages.filter(m => m.text.includes('?')).length;
    if (partnerQuestions === 0 && partnerMessages.length > 10) {
      flags.push('They haven\'t asked you any questions');
    }

    // Conversation stalled
    if (messages.length > 0) {
      const hoursSinceLastMessage = (new Date().getTime() - messages[messages.length - 1].timestamp.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastMessage > 48) {
        flags.push('Conversation has been inactive for 2+ days');
      }
    }

    return flags;
  };

  const detectGreenFlags = (messages: Message[], userId: string): string[] => {
    const flags: string[] = [];

    const partnerMessages = messages.filter(m => m.senderId !== userId);

    // Asks questions
    const questionCount = partnerMessages.filter(m => m.text.includes('?')).length;
    if (questionCount >= 3) {
      flags.push('They\'re actively asking you questions');
    }

    // Thoughtful responses
    const avgLength = partnerMessages.length > 0
      ? partnerMessages.reduce((sum, m) => sum + m.text.length, 0) / partnerMessages.length
      : 0;

    if (avgLength > 80) {
      flags.push('They\'re giving detailed, thoughtful responses');
    }

    // Quick responses
    const responseGaps = messages.slice(1).map((m, i) => {
      const prevMessage = messages[i];
      if (prevMessage.senderId !== m.senderId) {
        return m.timestamp.getTime() - prevMessage.timestamp.getTime();
      }
      return null;
    }).filter(g => g !== null);

    const avgResponseTime = responseGaps.length > 0
      ? responseGaps.reduce((sum: number, g) => sum + (g as number), 0) / responseGaps.length
      : Infinity;

    if (avgResponseTime < 1000 * 60 * 30) { // < 30 min
      flags.push('They respond quickly (within 30 minutes)');
    }

    // Uses emojis/shows emotion
    const hasEmojis = partnerMessages.some(m => /[\u{1F600}-\u{1F64F}]/u.test(m.text));
    if (hasEmojis) {
      flags.push('They use emojis and show personality');
    }

    return flags;
  };

  const calculateOverallScore = (params: {
    balance_score: number;
    engagement_level: string;
    momentum: string;
    response_quality: string;
    red_flags_count: number;
    green_flags_count: number;
  }): number => {
    let score = 50; // Base score

    // Balance contribution
    score += (params.balance_score - 50) * 0.3;

    // Engagement contribution
    const engagementScores = { high: 25, medium: 15, low: 5, declining: -10 };
    score += engagementScores[params.engagement_level as keyof typeof engagementScores];

    // Momentum contribution
    const momentumScores = { building: 20, stable: 10, slowing: 0, stalled: -20 };
    score += momentumScores[params.momentum as keyof typeof momentumScores];

    // Response quality contribution
    const qualityScores = { excellent: 20, good: 10, fair: 0, poor: -15 };
    score += qualityScores[params.response_quality as keyof typeof qualityScores];

    // Flags impact
    score -= params.red_flags_count * 10;
    score += params.green_flags_count * 8;

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const generateRecommendations = (params: any): string[] => {
    const recs: string[] = [];

    if (params.balance_score < 50) {
      recs.push('Wait for them to respond before sending more messages');
    }

    if (params.engagement_level === 'low' || params.engagement_level === 'declining') {
      recs.push('Ask more open-ended questions to spark conversation');
      recs.push('Share interesting stories or experiences');
    }

    if (params.momentum === 'slowing' || params.momentum === 'stalled') {
      recs.push('Send a light, no-pressure message to re-engage');
      recs.push('Consider suggesting a phone call or video chat');
    }

    if (params.response_quality === 'poor') {
      recs.push('They may not be interested - consider moving on');
    }

    if (params.green_flags.length >= 3) {
      recs.push('Great conversation! Consider asking them out');
    }

    return recs;
  };

  const determineNextBestAction = (params: {
    momentum: string;
    engagement_level: string;
    lastMessage: Message;
    currentUserId: string;
  }): string => {
    const isYourTurn = params.lastMessage.senderId !== params.currentUserId;

    if (!isYourTurn) {
      return 'Wait for their response before sending another message';
    }

    if (params.momentum === 'building' && params.engagement_level === 'high') {
      return 'Suggest meeting up for a date!';
    }

    if (params.momentum === 'stalled') {
      return 'Send a casual "just thinking of you" message to re-engage';
    }

    if (params.engagement_level === 'declining') {
      return 'Ask an interesting question about their interests';
    }

    return 'Keep the conversation flowing with a follow-up question';
  };

  const getScoreColor = (score: number): string => {
    if (score >= 75) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  if (!health) {
    return <View style={styles.container}><Text>Analyzing conversation...</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Conversation Health</Text>
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreValue, { color: getScoreColor(health.overall_score) }]}>
            {health.overall_score}
          </Text>
          <Text style={styles.scoreLabel}>/ 100</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Engagement</Text>
          <Text style={styles.metricValue}>{health.engagement_level}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Momentum</Text>
          <Text style={styles.metricValue}>{health.momentum}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Balance</Text>
          <Text style={styles.metricValue}>{health.balance_score}%</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Quality</Text>
          <Text style={styles.metricValue}>{health.response_quality}</Text>
        </View>
      </View>

      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>💡 Next Best Action</Text>
        <Text style={styles.actionText}>{health.next_best_action}</Text>
        {onActionSuggestion && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onActionSuggestion(health.next_best_action)}
          >
            <Text style={styles.actionButtonText}>Apply Suggestion</Text>
          </TouchableOpacity>
        )}
      </View>

      {health.green_flags.length > 0 && (
        <View style={styles.flagsSection}>
          <Text style={styles.flagsTitle}>✅ Green Flags</Text>
          {health.green_flags.map((flag, index) => (
            <Text key={index} style={styles.greenFlag}>• {flag}</Text>
          ))}
        </View>
      )}

      {health.red_flags.length > 0 && (
        <View style={styles.flagsSection}>
          <Text style={styles.flagsTitle}>⚠️ Red Flags</Text>
          {health.red_flags.map((flag, index) => (
            <Text key={index} style={styles.redFlag}>• {flag}</Text>
          ))}
        </View>
      )}

      {health.recommendations.length > 0 && (
        <View style={styles.recommendationsSection}>
          <Text style={styles.recommendationsTitle}>📋 Recommendations</Text>
          {health.recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendationCard}>
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.detailsToggle}
        onPress={() => setShowDetails(!showDetails)}
      >
        <Text style={styles.detailsToggleText}>
          {showDetails ? 'Hide' : 'Show'} Analysis Details
        </Text>
      </TouchableOpacity>

      {showDetails && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsText}>
            Messages analyzed: {messages.length}{'\n'}
            Your messages: {messages.filter(m => m.senderId === currentUserId).length}{'\n'}
            Their messages: {messages.filter(m => m.senderId !== currentUserId).length}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  actionCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 15,
    color: '#0c4a6e',
    lineHeight: 22,
  },
  actionButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  flagsSection: {
    marginBottom: 20,
  },
  flagsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  greenFlag: {
    fontSize: 14,
    color: '#059669',
    marginBottom: 6,
    lineHeight: 20,
  },
  redFlag: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 6,
    lineHeight: 20,
  },
  recommendationsSection: {
    marginBottom: 20,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  recommendationCard: {
    backgroundColor: '#fef3f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#9f1239',
    lineHeight: 20,
  },
  detailsToggle: {
    padding: 12,
    alignItems: 'center',
  },
  detailsToggleText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  detailsContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  detailsText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
});

export default ConversationFlowAnalyzer;
