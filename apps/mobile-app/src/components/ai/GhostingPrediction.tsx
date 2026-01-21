import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface GhostingRiskAssessment {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-100
  warning_signs: string[];
  preventive_actions: string[];
  confidence: number;
}

export const analyzeGhostingRisk = (
  conversationHistory: any[],
  lastMessageTimestamp: Date,
  responsePatterns: any
): GhostingRiskAssessment => {
  const hoursSinceLastMessage = (Date.now() - lastMessageTimestamp.getTime()) / (1000 * 60 * 60);

  let probability = 0;
  const warning_signs: string[] = [];

  // Time-based risk
  if (hoursSinceLastMessage > 72) {
    probability += 40;
    warning_signs.push('No response for 3+ days');
  } else if (hoursSinceLastMessage > 48) {
    probability += 25;
    warning_signs.push('No response for 2+ days');
  } else if (hoursSinceLastMessage > 24) {
    probability += 10;
  }

  // Response pattern changes
  if (responsePatterns.declining_response_length) {
    probability += 15;
    warning_signs.push('Responses getting shorter');
  }

  if (responsePatterns.increasing_response_time) {
    probability += 15;
    warning_signs.push('Taking longer to respond');
  }

  if (responsePatterns.one_word_replies > 3) {
    probability += 20;
    warning_signs.push('Multiple one-word replies');
  }

  // Conversation engagement
  if (!responsePatterns.asks_questions) {
    probability += 10;
    warning_signs.push('Not asking questions back');
  }

  const preventive_actions: string[] = [];

  if (probability > 30) {
    preventive_actions.push('Send a light, no-pressure message');
    preventive_actions.push("Give them space - don't double text");
    preventive_actions.push('If no response in 3-5 days, consider moving on');
  }

  const risk_level =
    probability >= 75
      ? 'critical'
      : probability >= 50
        ? 'high'
        : probability >= 25
          ? 'medium'
          : 'low';

  return {
    risk_level,
    probability: Math.min(100, probability),
    warning_signs,
    preventive_actions,
    confidence: 0.82,
  };
};

const GhostingPrediction: React.FC<{ assessment: GhostingRiskAssessment }> = ({ assessment }) => {
  const getColor = () => {
    switch (assessment.risk_level) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f59e0b';
      case 'medium':
        return '#3b82f6';
      default:
        return '#10b981';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.riskBadge, { backgroundColor: getColor() }]}>
        <Text style={styles.riskText}>{assessment.risk_level.toUpperCase()} RISK</Text>
        <Text style={styles.probabilityText}>{assessment.probability}%</Text>
      </View>

      {assessment.warning_signs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Warning Signs:</Text>
          {assessment.warning_signs.map((sign, i) => (
            <Text key={i} style={styles.listItem}>
              • {sign}
            </Text>
          ))}
        </View>
      )}

      {assessment.preventive_actions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 What to Do:</Text>
          {assessment.preventive_actions.map((action, i) => (
            <Text key={i} style={styles.listItem}>
              • {action}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff', borderRadius: 12 },
  riskBadge: { padding: 16, borderRadius: 12, marginBottom: 16, alignItems: 'center' },
  riskText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  probabilityText: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 4 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  listItem: { fontSize: 14, color: '#374151', marginBottom: 4 },
});

export default GhostingPrediction;
