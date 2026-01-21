import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export interface MeetingReadiness {
  is_ready: boolean;
  readiness_score: number; // 0-100
  factors: {
    conversation_depth: number;
    mutual_interest: number;
    engagement_level: number;
    time_invested: number;
  };
  recommendation: string;
  suggested_timing: 'now' | 'soon' | 'wait' | 'not_yet';
  ideal_approach: string;
}

export const assessMeetingReadiness = (
  messageCount: number,
  daysActive: number,
  conversationQuality: number,
  mutualEngagement: boolean
): MeetingReadiness => {
  const conversation_depth = Math.min(100, (messageCount / 30) * 100);
  const time_invested = Math.min(100, (daysActive / 7) * 100);
  const engagement_level = conversationQuality;
  const mutual_interest = mutualEngagement ? 85 : 45;

  const readiness_score = Math.round(
    conversation_depth * 0.3 +
      mutual_interest * 0.3 +
      engagement_level * 0.25 +
      time_invested * 0.15
  );

  const is_ready = readiness_score >= 65;

  let suggested_timing: 'now' | 'soon' | 'wait' | 'not_yet' = 'not_yet';
  let recommendation = '';
  let ideal_approach = '';

  if (readiness_score >= 75) {
    suggested_timing = 'now';
    recommendation =
      'Perfect time to suggest meeting! The connection is strong and both of you are engaged.';
    ideal_approach =
      '"I\'ve really enjoyed our conversations! Would you like to grab coffee this weekend?"';
  } else if (readiness_score >= 60) {
    suggested_timing = 'soon';
    recommendation = 'Almost there! Have 1-2 more quality conversations, then suggest meeting.';
    ideal_approach = 'Build a bit more rapport, then casually suggest meeting up.';
  } else if (readiness_score >= 40) {
    suggested_timing = 'wait';
    recommendation =
      'Keep building connection through messaging. Look for signs of mutual interest.';
    ideal_approach = 'Share more about yourself and show genuine interest in them.';
  } else {
    suggested_timing = 'not_yet';
    recommendation = "Focus on having meaningful conversations first. Don't rush to meet.";
    ideal_approach = 'Ask open-ended questions and find common ground.';
  }

  return {
    is_ready,
    readiness_score,
    factors: { conversation_depth, mutual_interest, engagement_level, time_invested },
    recommendation,
    suggested_timing,
    ideal_approach,
  };
};

const MeetingReadinessDetector: React.FC<{
  readiness: MeetingReadiness;
  onAskOut?: () => void;
}> = ({ readiness, onAskOut }) => {
  const getColor = () => {
    if (readiness.readiness_score >= 75) return '#10b981';
    if (readiness.readiness_score >= 60) return '#3b82f6';
    if (readiness.readiness_score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Meeting Readiness</Text>
        <View style={[styles.scoreBadge, { backgroundColor: getColor() }]}>
          <Text style={styles.scoreText}>{readiness.readiness_score}</Text>
        </View>
      </View>

      <View style={styles.factorsGrid}>
        {Object.entries(readiness.factors).map(([key, value]) => (
          <View key={key} style={styles.factorCard}>
            <Text style={styles.factorLabel}>{key.replace(/_/g, ' ')}</Text>
            <View style={styles.barContainer}>
              <View style={[styles.bar, { width: `${value}%`, backgroundColor: getColor() }]} />
            </View>
            <Text style={styles.factorValue}>{Math.round(value)}%</Text>
          </View>
        ))}
      </View>

      <View style={[styles.recommendationCard, { borderLeftColor: getColor() }]}>
        <Text style={styles.recommendationTitle}>💡 Recommendation:</Text>
        <Text style={styles.recommendationText}>{readiness.recommendation}</Text>
      </View>

      {readiness.is_ready && (
        <View style={styles.approachCard}>
          <Text style={styles.approachTitle}>Suggested Approach:</Text>
          <Text style={styles.approachText}>{readiness.ideal_approach}</Text>
          {onAskOut && (
            <TouchableOpacity style={styles.actionButton} onPress={onAskOut}>
              <Text style={styles.actionButtonText}>Use This Approach</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff', borderRadius: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700' },
  scoreBadge: { padding: 8, borderRadius: 20, minWidth: 50, alignItems: 'center' },
  scoreText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  factorsGrid: { marginBottom: 20 },
  factorCard: { marginBottom: 16 },
  factorLabel: { fontSize: 13, color: '#6b7280', marginBottom: 6, textTransform: 'capitalize' },
  barContainer: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 4 },
  bar: { height: '100%', borderRadius: 4 },
  factorValue: { fontSize: 12, color: '#374151', fontWeight: '600' },
  recommendationCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  recommendationTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  recommendationText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  approachCard: { backgroundColor: '#ecfdf5', padding: 16, borderRadius: 12 },
  approachTitle: { fontSize: 15, fontWeight: '600', color: '#047857', marginBottom: 8 },
  approachText: { fontSize: 14, color: '#065f46', fontStyle: 'italic', marginBottom: 12 },
  actionButton: { backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default MeetingReadinessDetector;
