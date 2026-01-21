import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export interface ChemistryPrediction {
  overall_chemistry: number; // 0-100
  long_term_potential: number; // 0-100
  compatibility_dimensions: {
    communication_style: number;
    life_goals_alignment: number;
    value_compatibility: number;
    personality_fit: number;
    lifestyle_match: number;
    emotional_intelligence: number;
  };
  prediction: 'excellent' | 'strong' | 'moderate' | 'weak';
  relationship_forecast: {
    first_date_success: number;
    three_month_survival: number;
    long_term_potential: number;
  };
  insights: string[];
  growth_areas: string[];
  compatibility_highlights: string[];
}

export const predictChemistry = (
  profile1: any,
  profile2: any,
  conversationData: any
): ChemistryPrediction => {
  // Communication style compatibility
  const communication_style = analyzeCommStyles(conversationData);

  // Life goals alignment
  const life_goals_alignment = compareLifeGoals(profile1, profile2);

  // Value compatibility
  const value_compatibility = compareValues(profile1, profile2);

  // Personality fit
  const personality_fit = analyzePersonalityFit(profile1, profile2);

  // Lifestyle match
  const lifestyle_match = compareLifestyles(profile1, profile2);

  // Emotional intelligence
  const emotional_intelligence = assessEQ(conversationData);

  const overall_chemistry = Math.round(
    communication_style * 0.25 +
      life_goals_alignment * 0.2 +
      value_compatibility * 0.2 +
      personality_fit * 0.15 +
      lifestyle_match * 0.1 +
      emotional_intelligence * 0.1
  );

  const long_term_potential = Math.round(
    life_goals_alignment * 0.35 +
      value_compatibility * 0.3 +
      emotional_intelligence * 0.2 +
      communication_style * 0.15
  );

  let prediction: 'excellent' | 'strong' | 'moderate' | 'weak';
  if (overall_chemistry >= 80) prediction = 'excellent';
  else if (overall_chemistry >= 65) prediction = 'strong';
  else if (overall_chemistry >= 45) prediction = 'moderate';
  else prediction = 'weak';

  const insights: string[] = [];
  const growth_areas: string[] = [];
  const compatibility_highlights: string[] = [];

  // Generate insights
  if (communication_style > 75) {
    compatibility_highlights.push('Excellent communication flow and mutual understanding');
  } else if (communication_style < 50) {
    growth_areas.push('Work on finding common communication ground');
  }

  if (life_goals_alignment > 70) {
    compatibility_highlights.push('Strong alignment on life goals and future vision');
  }

  if (value_compatibility > 75) {
    compatibility_highlights.push('Deeply aligned core values');
  }

  if (personality_fit > 70) {
    insights.push('Your personalities complement each other well');
  } else if (personality_fit < 50) {
    insights.push('Personality differences may require extra effort');
  }

  if (lifestyle_match < 50) {
    growth_areas.push('Lifestyle differences - find compromises that work for both');
  }

  // Relationship forecasts
  const first_date_success = Math.min(95, overall_chemistry + 5);
  const three_month_survival = Math.min(
    90,
    Math.round((overall_chemistry + long_term_potential) / 2)
  );
  const long_term_forecast = Math.min(85, long_term_potential);

  return {
    overall_chemistry,
    long_term_potential,
    compatibility_dimensions: {
      communication_style,
      life_goals_alignment,
      value_compatibility,
      personality_fit,
      lifestyle_match,
      emotional_intelligence,
    },
    prediction,
    relationship_forecast: {
      first_date_success,
      three_month_survival: three_month_survival,
      long_term_potential: long_term_forecast,
    },
    insights,
    growth_areas,
    compatibility_highlights,
  };
};

const analyzeCommStyles = (conversationData: any): number => {
  const { message_length_similarity, response_time_match, emoji_usage_similarity } =
    conversationData;
  return Math.round((message_length_similarity + response_time_match + emoji_usage_similarity) / 3);
};

const compareLifeGoals = (p1: any, p2: any): number => {
  let score = 60;
  if (p1.relationship_goals === p2.relationship_goals) score += 20;
  if (p1.wants_children === p2.wants_children) score += 15;
  if (Math.abs(p1.desired_relationship_timeline - p2.desired_relationship_timeline) <= 1)
    score += 5;
  return Math.min(100, score);
};

const compareValues = (p1: any, p2: any): number => {
  const sharedValues = p1.values?.filter((v: string) => p2.values?.includes(v)).length || 0;
  return Math.min(100, 60 + sharedValues * 10);
};

const analyzePersonalityFit = (p1: any, p2: any): number => {
  const introvertExtrovertBalance = Math.abs(p1.extroversion - p2.extroversion) <= 30 ? 20 : 10;
  const energyMatch = p1.energy_level === p2.energy_level ? 15 : 8;
  return 55 + introvertExtrovertBalance + energyMatch;
};

const compareLifestyles = (p1: any, p2: any): number => {
  let score = 50;
  if (p1.smoking === p2.smoking) score += 15;
  if (p1.drinking === p2.drinking) score += 10;
  if (Math.abs(p1.fitness_level - p2.fitness_level) <= 1) score += 10;
  if (p1.night_owl === p2.night_owl) score += 10;
  return Math.min(100, score);
};

const assessEQ = (conversationData: any): number => {
  const { empathy_markers, emotional_sharing, active_listening } = conversationData;
  return Math.round((empathy_markers + emotional_sharing + active_listening) / 3);
};

const ChemistryPrediction: React.FC<{ prediction: ChemistryPrediction }> = ({ prediction }) => {
  const getColor = (score: number): string => {
    if (score >= 75) return '#10b981';
    if (score >= 50) return '#3b82f6';
    if (score >= 30) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <ScrollView style={styles.container}>
      <View
        style={[styles.headerCard, { backgroundColor: getColor(prediction.overall_chemistry) }]}
      >
        <Text style={styles.headerTitle}>Chemistry Prediction</Text>
        <Text style={styles.overallScore}>{prediction.overall_chemistry}%</Text>
        <Text style={styles.predictionLabel}>{prediction.prediction.toUpperCase()}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compatibility Dimensions</Text>
        {Object.entries(prediction.compatibility_dimensions).map(([key, value]) => (
          <View key={key} style={styles.dimensionRow}>
            <Text style={styles.dimensionLabel}>
              {key
                .split('_')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ')}
            </Text>
            <View style={styles.barContainer}>
              <View
                style={[styles.bar, { width: `${value}%`, backgroundColor: getColor(value) }]}
              />
            </View>
            <Text style={styles.dimensionValue}>{value}%</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Relationship Forecast</Text>
        <View style={styles.forecastGrid}>
          <View style={styles.forecastCard}>
            <Text style={styles.forecastValue}>
              {prediction.relationship_forecast.first_date_success}%
            </Text>
            <Text style={styles.forecastLabel}>First Date Success</Text>
          </View>
          <View style={styles.forecastCard}>
            <Text style={styles.forecastValue}>
              {prediction.relationship_forecast.three_month_survival}%
            </Text>
            <Text style={styles.forecastLabel}>3-Month Survival</Text>
          </View>
          <View style={styles.forecastCard}>
            <Text style={styles.forecastValue}>
              {prediction.relationship_forecast.long_term_potential}%
            </Text>
            <Text style={styles.forecastLabel}>Long-Term Potential</Text>
          </View>
        </View>
      </View>

      {prediction.compatibility_highlights.length > 0 && (
        <View style={[styles.section, styles.highlightsSection]}>
          <Text style={styles.highlightsTitle}>✨ Compatibility Highlights</Text>
          {prediction.compatibility_highlights.map((highlight, i) => (
            <Text key={i} style={styles.highlightText}>
              • {highlight}
            </Text>
          ))}
        </View>
      )}

      {prediction.growth_areas.length > 0 && (
        <View style={[styles.section, styles.growthSection]}>
          <Text style={styles.growthTitle}>🌱 Growth Areas</Text>
          {prediction.growth_areas.map((area, i) => (
            <Text key={i} style={styles.growthText}>
              • {area}
            </Text>
          ))}
        </View>
      )}

      {prediction.insights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Insights</Text>
          {prediction.insights.map((insight, i) => (
            <Text key={i} style={styles.insightText}>
              • {insight}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerCard: { padding: 24, alignItems: 'center', marginBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  overallScore: { color: '#fff', fontSize: 48, fontWeight: '700' },
  predictionLabel: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 4 },
  section: { padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  dimensionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dimensionLabel: { width: 140, fontSize: 13, color: '#374151' },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  bar: { height: '100%', borderRadius: 4 },
  dimensionValue: { width: 40, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  forecastGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  forecastCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  forecastValue: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  forecastLabel: { fontSize: 11, color: '#6b7280', textAlign: 'center' },
  highlightsSection: { backgroundColor: '#ecfdf5', borderRadius: 12 },
  highlightsTitle: { fontSize: 16, fontWeight: '600', color: '#047857', marginBottom: 12 },
  highlightText: { fontSize: 14, color: '#065f46', marginBottom: 6, lineHeight: 20 },
  growthSection: { backgroundColor: '#fef3c7', borderRadius: 12 },
  growthTitle: { fontSize: 16, fontWeight: '600', color: '#92400e', marginBottom: 12 },
  growthText: { fontSize: 14, color: '#78350f', marginBottom: 6, lineHeight: 20 },
  insightText: { fontSize: 14, color: '#374151', marginBottom: 6, lineHeight: 20 },
});

export default ChemistryPrediction;
